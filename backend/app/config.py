from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "La Bodita API"
    database_url: str = "sqlite:///./la_bodita.db"
    # The UI is served from its own origin in development (Vite) and from the
    # Pi's Tailscale host in production, so the allowed origins are configuration.
    cors_allow_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()
