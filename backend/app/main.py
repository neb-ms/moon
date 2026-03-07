from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .api import api_router
from .config import get_settings
from .errors import ApiError
from .schemas import ErrorBody, ErrorEnvelope


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.api_version,
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

    @app.exception_handler(RequestValidationError)
    async def request_validation_error_handler(
        _: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        payload = ErrorEnvelope(
            error=ErrorBody(
                code="validation_error",
                message="Request validation failed.",
                details=exc.errors(),
            )
        )
        return JSONResponse(status_code=422, content=payload.model_dump(mode="json"))

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
        payload = ErrorEnvelope(
            error=ErrorBody(
                code="internal_server_error",
                message="An unexpected error occurred.",
                details=None,
            )
        )
        return JSONResponse(status_code=500, content=payload.model_dump(mode="json"))

    return app


app = create_app()
