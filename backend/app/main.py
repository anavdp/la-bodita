from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

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
from app.database import engine
from app.errors import REQUEST_ID_HEADER, install_error_handling
from app.schema_check import warn_if_schema_out_of_step


@asynccontextmanager
async def check_database_on_start(app: FastAPI) -> AsyncIterator[None]:
    warn_if_schema_out_of_step(engine)
    yield


def create_app(guest_only: bool = False) -> FastAPI:
    """The full planner API, or - for the process the internet reaches - only the
    guest RSVP routes, so the planner's routes do not exist there to be found."""
    # The interactive docs would list every route, so the public process has none.
    docs = {"docs_url": None, "redoc_url": None, "openapi_url": None} if guest_only else {}
    app = FastAPI(title=settings.app_name, lifespan=check_database_on_start, **docs)

    # Before CORS, so CORS ends up outermost and its headers reach even a crash.
    install_error_handling(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[REQUEST_ID_HEADER],
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
