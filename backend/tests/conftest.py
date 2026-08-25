import os

# Set before any `app` import so the module-level engine never binds to the dev database.
os.environ.setdefault("DATABASE_URL", "sqlite://")
