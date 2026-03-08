import time
from datetime import UTC, datetime

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .api import api_router
from .config import get_settings
from .errors import ApiError
from .observability import RequestLoggingMiddleware, configure_observability_logger
from .schemas import ErrorBody, ErrorEnvelope
from .security import (
    InMemoryRateLimitStore,
    RateLimitMiddleware,
    RequestSizeLimitMiddleware,
    TrustedHostGuardMiddleware,
    build_error_response,
    sanitize_validation_errors,
)


def _get_request_id_from_scope(request: Request) -> str | None:
    request_id = request.scope.get("lunar_request_id")
    if request_id is None:
        return None
    return str(request_id)


def create_app() -> FastAPI:
    settings = get_settings()
    request_logger = configure_observability_logger(settings.log_level)
    started_at_utc = datetime.now(tz=UTC)
    started_at_utc_text = started_at_utc.isoformat(timespec="seconds").replace("+00:00", "Z")
    started_at_monotonic = time.monotonic()

    app = FastAPI(
        title=settings.app_name,
        version=settings.api_version,
    )
    app.state.request_logger = request_logger
    app.state.started_at_utc = started_at_utc_text

    rate_limit_store = InMemoryRateLimitStore(
        max_requests=settings.rate_limit_max_requests,
        window_seconds=settings.rate_limit_window_seconds,
    )
    app.add_middleware(
        RateLimitMiddleware,
        store=rate_limit_store,
        protected_path_prefixes=["/api/v1/"],
    )
    app.add_middleware(
        TrustedHostGuardMiddleware,
        allowed_hosts=settings.trusted_hosts,
    )
    app.add_middleware(
        RequestSizeLimitMiddleware,
        max_body_bytes=settings.max_request_body_bytes,
    )
    app.add_middleware(
        RequestLoggingMiddleware,
        logger=request_logger,
    )
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str | float]:
        uptime_seconds = round(time.monotonic() - started_at_monotonic, 3)
        return {
            "status": "ok",
            "app_name": settings.app_name,
            "environment": settings.app_env,
            "version": settings.api_version,
            "started_at_utc": started_at_utc_text,
            "uptime_seconds": uptime_seconds,
        }

    @app.exception_handler(ApiError)
    async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
        request_logger.warning(
            "Handled API error response.",
            extra={
                "event": "api_error",
                "request_id": _get_request_id_from_scope(request),
                "method": request.method,
                "path": request.url.path,
                "status_code": exc.status_code,
                "error_code": exc.code,
            },
        )
        payload = ErrorEnvelope(
            error=ErrorBody(code=exc.code, message=exc.message, details=exc.details),
        )
        return JSONResponse(status_code=exc.status_code, content=payload.model_dump(mode="json"))

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        request_logger.warning(
            "Handled HTTP exception response.",
            extra={
                "event": "http_exception",
                "request_id": _get_request_id_from_scope(request),
                "method": request.method,
                "path": request.url.path,
                "status_code": exc.status_code,
            },
        )
        if exc.status_code == 404:
            return build_error_response(
                status_code=404,
                code="not_found",
                message="Resource not found.",
            )

        if exc.status_code == 405:
            return build_error_response(
                status_code=405,
                code="method_not_allowed",
                message="Method not allowed.",
            )

        return build_error_response(
            status_code=exc.status_code,
            code="http_error",
            message="Request could not be processed.",
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_error_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        request_logger.warning(
            "Handled request validation error.",
            extra={
                "event": "request_validation_error",
                "request_id": _get_request_id_from_scope(request),
                "method": request.method,
                "path": request.url.path,
                "status_code": 422,
                "error_code": "validation_error",
            },
        )
        payload = ErrorEnvelope(
            error=ErrorBody(
                code="validation_error",
                message="Request validation failed.",
                details=sanitize_validation_errors(exc.errors()),
            )
        )
        return JSONResponse(status_code=422, content=payload.model_dump(mode="json"))

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        request_logger.exception(
            "Unhandled exception while serving request.",
            extra={
                "event": "unhandled_exception",
                "request_id": _get_request_id_from_scope(request),
                "method": request.method,
                "path": request.url.path,
                "status_code": 500,
                "error_code": "internal_server_error",
            },
        )
        return build_error_response(
            status_code=500,
            code="internal_server_error",
            message="An unexpected error occurred.",
        )

    return app


app = create_app()
