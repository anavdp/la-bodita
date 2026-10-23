from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "La Bodita API"
    database_url: str = "sqlite:///./la_bodita.db"
    # The UI is served from its own origin in development (Vite) and from the
    # Pi's Tailscale host in production, so the allowed origins are configuration.
    cors_allow_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    # On for the process the internet reaches: it serves the guest RSVP routes only.
    guest_only: bool = False

    # Sign-in. Google proves who someone is; only emails in user_account get in.
    # The client comes from Google Cloud Console and the secret only ever lives
    # in the environment (.env), never in code.
    google_client_id: str = ""
    google_client_secret: str = ""
    # Where the planner is opened, and where its API is reached. The same address
    # on the Pi (Caddy sends /api on to the backend); two ports in development.
    planner_url: str = "http://localhost:5173"
    api_url: str = "http://localhost:8000"


settings = Settings()
