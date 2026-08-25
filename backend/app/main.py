from fastapi import FastAPI

from app.config import settings

app = FastAPI(title=settings.app_name)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"name": settings.app_name}


@app.get("/health")
def read_health() -> dict[str, str]:
    return {"status": "ok"}
