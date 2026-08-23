"""
Application configuration, loaded from environment variables.

No connection secrets are hard-coded anywhere in this codebase -- the
CognoDB (Bolt) URI, username and password are read from the environment
at startup. Locally that means a `.env` file (see `.env.example` in the
repo root); in production it means the platform's environment variable
settings (e.g. Render's dashboard).
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # CognoDB / Neo4j-compatible Bolt connection
    cognodb_uri: str
    cognodb_user: str = "cognodb"
    cognodb_password: str

    # CORS
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
