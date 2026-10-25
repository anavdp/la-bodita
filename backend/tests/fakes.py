"""A stand-in for a Google Cloud Storage bucket, so no test reaches Google."""

from google.api_core.exceptions import NotFound


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
