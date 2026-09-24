from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration from environment variables (see the root .env.example)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = Field(default="development", alias="APP_ENV")
    # Shared secret the web app sends in X-Internal-Api-Key for internal endpoints.
    internal_api_key: SecretStr = Field(alias="FORECAST_INTERNAL_API_KEY")
    database_url: SecretStr | None = Field(default=None, alias="FORECAST_DATABASE_URL")
    entsoe_api_token: SecretStr | None = Field(default=None, alias="ENTSOE_API_TOKEN")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
