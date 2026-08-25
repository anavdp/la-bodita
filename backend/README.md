# Backend

FastAPI + SQLAlchemy + SQLite, with Alembic migrations.

## Layout

```
app/config.py     Settings (env-driven, DATABASE_URL)
app/database.py   Engine, session factory, get_session dependency, declarative Base
app/main.py       FastAPI app
alembic/          Migration environment (env.py reads app settings + Base.metadata)
tests/            pytest suite
```

## Setup

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
cp .env.example .env
```

## Commands

Run the API (http://127.0.0.1:8000, docs at `/docs`):

```bash
cd backend && .venv/bin/uvicorn app.main:app --reload
```

Run the tests (coverage gate at 85% is built into `addopts`):

```bash
cd backend && .venv/bin/python -m pytest
```

Apply migrations:

```bash
cd backend && .venv/bin/alembic upgrade head
```

Create a migration from model changes:

```bash
cd backend && .venv/bin/alembic revision --autogenerate -m "describe the change"
```

## Notes

- `alembic.ini` deliberately leaves `sqlalchemy.url` blank — `alembic/env.py`
  fills it from `DATABASE_URL` so the URL is defined in exactly one place.
- Migrations run with `render_as_batch=True` because SQLite cannot `ALTER`
  most things in place.
- The schema itself is not defined yet; it lands in one migration via issue #25.
