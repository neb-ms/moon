from fastapi import FastAPI

from .config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.api_version,
    )

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {
            "status": "ok",
            "app_name": settings.app_name,
            "environment": settings.app_env,
            "version": settings.api_version,
        }

    return app


app = create_app()
