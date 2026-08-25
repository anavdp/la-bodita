from app.config import Settings


def test_given_no_environment_overrides_when_settings_are_built_then_sqlite_is_the_default(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)

    settings = Settings(_env_file=None)

    assert settings.database_url == "sqlite:///./la_bodita.db"


def test_given_a_database_url_in_the_environment_when_settings_are_built_then_it_wins(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./custom.db")

    settings = Settings(_env_file=None)

    assert settings.database_url == "sqlite:///./custom.db"
