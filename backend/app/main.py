from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import guests, households, rsvp, weddings
from app.config import settings


def create_app(guest_only: bool = False) -> FastAPI:
    """The full planner API, or - for the process the internet reaches - only the
    guest RSVP routes, so the planner's routes do not exist there to be found."""
    # The interactive docs would list every route, so the public process has none.
    docs = {"docs_url": None, "redoc_url": None, "openapi_url": None} if guest_only else {}
    app = FastAPI(title=settings.app_name, **docs)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    if not guest_only:
        app.include_router(weddings.router)
        app.include_router(guests.router)
        app.include_router(households.router)
    app.include_router(rsvp.router)

    @app.get("/")
    def read_root() -> dict[str, str]:
        return {"name": settings.app_name}

    @app.get("/health")
    def read_health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app(guest_only=settings.guest_only)
