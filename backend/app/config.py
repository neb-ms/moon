from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  app_name: str = "Project Lunar API"
  app_env: Literal["development", "test", "production"] = "development"
  api_version: str = "0.1.0"
  log_level: str = "INFO"
  cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

  model_config = SettingsConfigDict(
    env_file=".env",
    env_file_encoding="utf-8",
    env_prefix="LUNAR_",
    case_sensitive=False,
    extra="ignore",
  )


@lru_cache
def get_settings() -> Settings:
  return Settings()
