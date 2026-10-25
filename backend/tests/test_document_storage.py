"""Uploaded files live in a private Google Cloud Storage bucket, never on the Pi's SD card."""

import io
from datetime import timedelta

import pytest
from google.api_core.exceptions import Forbidden, NotFound

from app.config import Settings
from app.storage import DocumentStorage, StorageNotConfigured, check, main


class FakeBlob:
    def __init__(self, bucket: "FakeBucket", name: str):
        self.bucket = bucket
        self.name = name

    def upload_from_file(self, data, content_type, if_generation_match):
        if self.bucket.refuse is not None:
            raise self.bucket.refuse
        if if_generation_match == 0 and self.name in self.bucket.objects:
            raise AssertionError("an existing object would have been overwritten")
        self.bucket.objects[self.name] = (data.read(), content_type)

    def generate_signed_url(self, **options):
        self.bucket.signed.append((self.name, options))
        return f"https://storage.googleapis.com/{self.bucket.name}/{self.name}?X-Goog-Signature=abc"

    def delete(self):
        if self.name not in self.bucket.objects:
            raise NotFound("gone")
        del self.bucket.objects[self.name]


class FakeBucket:
    def __init__(self, name: str = "la-bodita-documents"):
        self.name = name
        self.objects: dict[str, tuple[bytes, str]] = {}
        self.signed: list[tuple[str, dict]] = []
        self.refuse: Exception | None = None

    def blob(self, name: str) -> FakeBlob:
        return FakeBlob(self, name)


@pytest.fixture
def bucket() -> FakeBucket:
    return FakeBucket()


@pytest.fixture
def storage(bucket: FakeBucket) -> DocumentStorage:
    return DocumentStorage(bucket)


def test_given_a_wedding_when_a_key_is_made_then_it_is_random_and_carries_no_file_name(storage: DocumentStorage):
    first = storage.new_key(wedding_id=7)
    second = storage.new_key(wedding_id=7)

    assert first.startswith("weddings/7/documents/")
    assert first != second
    # A name like "passport-vicky.jpg" would show up in links and bucket listings.
    assert "." not in first.rsplit("/", 1)[1]


def test_given_a_file_when_it_is_saved_then_the_bucket_holds_its_bytes_and_type(
    storage: DocumentStorage, bucket: FakeBucket
):
    storage.save("weddings/1/documents/abc", io.BytesIO(b"%PDF-1.7"), "application/pdf")

    assert bucket.objects["weddings/1/documents/abc"] == (b"%PDF-1.7", "application/pdf")


def test_given_a_saved_file_when_a_link_is_asked_for_then_it_is_signed_short_lived_and_names_the_file(
    storage: DocumentStorage, bucket: FakeBucket
):
    url = storage.download_url("weddings/1/documents/abc", "Partida de nacimiento.pdf")

    assert url.startswith("https://storage.googleapis.com/la-bodita-documents/weddings/1/documents/abc?")
    [(name, options)] = bucket.signed
    assert name == "weddings/1/documents/abc"
    assert options["version"] == "v4"
    assert options["method"] == "GET"
    assert options["expiration"] == timedelta(minutes=5)
    assert options["response_disposition"] == "inline; filename*=UTF-8''Partida%20de%20nacimiento.pdf"


def test_given_a_saved_file_when_it_is_deleted_then_the_bucket_no_longer_has_it(
    storage: DocumentStorage, bucket: FakeBucket
):
    storage.save("weddings/1/documents/abc", io.BytesIO(b"x"), "image/jpeg")

    storage.delete("weddings/1/documents/abc")

    assert bucket.objects == {}


def test_given_a_file_already_gone_when_it_is_deleted_then_nothing_fails(storage: DocumentStorage):
    storage.delete("weddings/1/documents/missing")


def test_given_no_bucket_in_the_settings_when_storage_is_asked_for_then_it_says_it_is_not_set_up():
    with pytest.raises(StorageNotConfigured, match="DOCUMENTS_BUCKET"):
        DocumentStorage.from_settings(Settings(_env_file=None, documents_bucket=""))


def test_given_a_bucket_and_a_key_file_when_storage_is_built_then_it_signs_in_with_that_key(monkeypatch):
    used = {}

    class FakeClient:
        @classmethod
        def from_service_account_json(cls, path):
            used["key"] = path
            return cls()

        def bucket(self, name):
            used["bucket"] = name
            return FakeBucket(name)

    monkeypatch.setattr("app.storage.Client", FakeClient)

    storage = DocumentStorage.from_settings(
        Settings(_env_file=None, documents_bucket="our-papers", documents_key_file="/run/secrets/gcs-key.json")
    )

    assert used == {"key": "/run/secrets/gcs-key.json", "bucket": "our-papers"}
    assert storage.bucket_name == "our-papers"


def test_given_a_bucket_without_a_key_file_when_storage_is_built_then_it_says_the_key_is_missing():
    with pytest.raises(StorageNotConfigured, match="DOCUMENTS_KEY_FILE"):
        DocumentStorage.from_settings(Settings(_env_file=None, documents_bucket="our-papers", documents_key_file=""))


def test_given_a_working_bucket_when_it_is_checked_then_a_test_file_is_saved_linked_and_removed(
    storage: DocumentStorage, bucket: FakeBucket
):
    report = check(storage)

    assert "la-bodita-documents" in report
    assert bucket.objects == {}
    [(name, _)] = bucket.signed
    assert name.startswith("la-bodita-check/")


def test_given_a_key_without_access_when_the_bucket_is_checked_then_it_says_which_role_is_missing(
    storage: DocumentStorage, bucket: FakeBucket
):
    bucket.refuse = Forbidden("no access")

    with pytest.raises(SystemExit, match="Storage Object User"):
        check(storage)


def test_given_a_misspelt_bucket_when_it_is_checked_then_it_says_the_bucket_was_not_found(
    storage: DocumentStorage, bucket: FakeBucket
):
    bucket.refuse = NotFound("no such bucket")

    with pytest.raises(SystemExit, match="la-bodita-documents.*not found"):
        check(storage)


def test_given_the_check_command_when_storage_is_not_set_up_then_it_explains_what_to_set(monkeypatch):
    monkeypatch.setattr("app.storage.settings", Settings(_env_file=None, documents_bucket=""))

    with pytest.raises(SystemExit, match="DOCUMENTS_BUCKET"):
        main(["check"])


def test_given_the_check_command_when_the_bucket_works_then_it_prints_the_report(monkeypatch, capsys):
    monkeypatch.setattr("app.storage.DocumentStorage.from_settings", classmethod(lambda cls, _: cls(FakeBucket())))

    main(["check"])

    assert "All good" in capsys.readouterr().out


def test_given_a_key_file_that_is_not_there_when_storage_is_built_then_it_names_the_missing_file(tmp_path):
    missing = tmp_path / "gcs-key.json"

    with pytest.raises(StorageNotConfigured, match="gcs-key.json"):
        DocumentStorage.from_settings(
            Settings(_env_file=None, documents_bucket="our-papers", documents_key_file=str(missing))
        )
