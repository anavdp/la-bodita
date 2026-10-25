"""Where uploaded documents live: a private Google Cloud Storage bucket, not the Pi's SD card.

The planner never hands out the bucket itself. Files go in through the API, and
each download is a signed link that works for a few minutes only.

On the Pi, to check the bucket and its key are set up right:

    docker compose exec backend python -m app.storage check
"""

import argparse
import io
import uuid
from datetime import timedelta
from typing import BinaryIO
from urllib.parse import quote

from google.api_core.exceptions import Forbidden, NotFound
from google.cloud.storage import Client

from app.config import Settings, settings

# Long enough to open a passport scan on a phone, short enough that a forwarded link goes dead.
DOWNLOAD_LINK_LIFETIME = timedelta(minutes=5)


class StorageNotConfigured(RuntimeError):
    """The bucket or its key is missing from the settings."""


class DocumentStorage:
    def __init__(self, bucket):
        self.bucket = bucket

    @classmethod
    def from_settings(cls, config: Settings) -> "DocumentStorage":
        if not config.documents_bucket:
            raise StorageNotConfigured("Documents aren't set up: DOCUMENTS_BUCKET is empty in .env.")
        if not config.documents_key_file:
            raise StorageNotConfigured("Documents aren't set up: DOCUMENTS_KEY_FILE is empty in .env.")
        try:
            client = Client.from_service_account_json(config.documents_key_file)
        except FileNotFoundError as error:
            raise StorageNotConfigured(
                f"Documents aren't set up: the key file {config.documents_key_file} isn't there."
            ) from error
        return cls(client.bucket(config.documents_bucket))

    @property
    def bucket_name(self) -> str:
        return self.bucket.name

    def new_key(self, wedding_id: int) -> str:
        """A random name under the wedding: the real file name stays in the database, out of links."""
        return f"weddings/{wedding_id}/documents/{uuid.uuid4().hex}"

    def save(self, key: str, data: BinaryIO, content_type: str) -> None:
        # Generation 0 means "only if nothing is there yet": a file is never overwritten.
        self.bucket.blob(key).upload_from_file(data, content_type=content_type, if_generation_match=0)

    def download_url(self, key: str, filename: str) -> str:
        return self.bucket.blob(key).generate_signed_url(
            version="v4",
            method="GET",
            expiration=DOWNLOAD_LINK_LIFETIME,
            response_disposition=f"inline; filename*=UTF-8''{quote(filename)}",
        )

    def delete(self, key: str) -> None:
        try:
            self.bucket.blob(key).delete()
        except NotFound:
            pass


def check(storage: DocumentStorage) -> str:
    """Save a small file, make a download link for it and delete it, as the planner will."""
    key = f"la-bodita-check/{uuid.uuid4().hex}"
    try:
        storage.save(key, io.BytesIO(b"La Bodita storage check\n"), "text/plain")
        storage.download_url(key, "check.txt")
        storage.delete(key)
    except Forbidden as error:
        raise SystemExit(
            f"The key can't write to {storage.bucket_name}: give its service account the "
            f"Storage Object User role on the bucket. ({error})"
        ) from error
    except NotFound as error:
        raise SystemExit(f"Bucket {storage.bucket_name} not found: check DOCUMENTS_BUCKET. ({error})") from error
    return f"Bucket {storage.bucket_name}: saved a test file, made a download link and deleted it. All good."


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.storage")
    parser.add_argument("command", choices=["check"])
    parser.parse_args(argv)
    try:
        storage = DocumentStorage.from_settings(settings)
    except StorageNotConfigured as error:
        raise SystemExit(str(error)) from error
    print(check(storage))


if __name__ == "__main__":  # pragma: no cover
    main()
