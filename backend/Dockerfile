FROM python:3.13-slim

WORKDIR /app
COPY pyproject.toml alembic.ini ./
COPY app ./app
COPY alembic ./alembic
RUN pip install --no-cache-dir .

# The database lives on a volume, so rebuilding the image never touches it.
ENV DATABASE_URL=sqlite:////data/la_bodita.db
VOLUME /data
EXPOSE 8000

# Only Caddy reaches this port, so it may set the client address: the RSVP
# lookup's rate limit has to count each guest, not the proxy.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips '*'"]
