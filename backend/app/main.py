from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import guests, households, rsvp, weddings
from app.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
