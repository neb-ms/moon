from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .api import api_router
from .config import get_settings
from .errors import ApiError
from .schemas import ErrorBody, ErrorEnvelope
from .security import (
    InMemoryRateLimitStore,
    RateLimitMiddleware,
    RequestSizeLimitMiddleware,
    TrustedHostGuardMiddleware,
    build_error_response,
    sanitize_validation_errors,
)


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.api_version,
    )
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
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {
            "status": "ok",
            "app_name": settings.app_name,
            "environment": settings.app_env,
            "version": settings.api_version,
        }

    @app.exception_handler(ApiError)
    async def api_error_handler(_: Request, exc: ApiError) -> JSONResponse:
        payload = ErrorEnvelope(
            error=ErrorBody(code=exc.code, message=exc.message, details=exc.details),
        )
        return JSONResponse(status_code=exc.status_code, content=payload.model_dump(mode="json"))

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
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
        _: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        payload = ErrorEnvelope(
            error=ErrorBody(
                code="validation_error",
                message="Request validation failed.",
                details=sanitize_validation_errors(exc.errors()),
            )
        )
        return JSONResponse(status_code=422, content=payload.model_dump(mode="json"))

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
        return build_error_response(
            status_code=500,
            code="internal_server_error",
            message="An unexpected error occurred.",
        )

    return app


app = create_app()
