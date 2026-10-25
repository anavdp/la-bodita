from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    auth,
    budget_lines,
    calendar_events,
    categories,
    documents,
    guests,
    households,
    items,
    paper_requests,
    requirements,
    rsvp,
    weddings,
)
from app.auth import require_user
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
        # Every planner route needs a signed-in user; only sign-in itself is open.
        signed_in = [Depends(require_user)]
        planner_routers = (
            weddings,
            guests,
            households,
            categories,
            items,
            requirements,
            budget_lines,
            calendar_events,
            documents,
            paper_requests,
        )
        for planner_router in planner_routers:
            app.include_router(planner_router.router, dependencies=signed_in)
        app.include_router(auth.router)
    app.include_router(rsvp.router)

    @app.get("/")
    def read_root() -> dict[str, str]:
        return {"name": settings.app_name}

    @app.get("/health")
    def read_health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app(guest_only=settings.guest_only)
