from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Guest, Household, Wedding

GUESTS_URL = "/api/weddings/{wedding_id}/guests"
TEMPLATE_HEADER = "first_name,last_name,is_child,gender,relationship_type,side,phone,email,household"


def preview(client: TestClient, wedding_id: int, content: str | bytes):
    """Upload a CSV the way the browser does: as a multipart file field."""
    body = content.encode("utf-8") if isinstance(content, str) else content
    return client.post(
        f"{GUESTS_URL.format(wedding_id=wedding_id)}/import/preview",
        files={"file": ("guests.csv", body, "text/csv")},
    )


def csv_of(*rows: str) -> str:
    return "\n".join((TEMPLATE_HEADER, *rows)) + "\n"


def count_guests(db_session: Session) -> int:
    return db_session.scalar(select(func.count()).select_from(Guest))


def test_given_the_guest_list_when_the_template_is_downloaded_then_it_is_a_csv_of_the_template_headers(
    client: TestClient, wedding: Wedding
):
    response = client.get(f"{GUESTS_URL.format(wedding_id=wedding.id)}/import/template")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    assert response.text.strip() == TEMPLATE_HEADER


def test_given_an_unknown_wedding_when_the_template_is_downloaded_then_it_is_not_found(
    client: TestClient,
):
    response = client.get(f"{GUESTS_URL.format(wedding_id=404)}/import/template")

    assert response.status_code == 404


def test_given_a_full_row_when_the_file_is_previewed_then_the_guest_is_parsed_but_not_saved(
    client: TestClient, db_session: Session, wedding: Wedding
):
    content = csv_of(
        "Lucia,Mendoza,true,female,friends,venezuela,+58 412 555 0134,lucia@example.com,Familia Mendoza"
    )

    response = preview(client, wedding.id, content)

    assert response.status_code == 200
    assert response.json()["rows"] == [
        {
            "row_number": 2,
            "guest": {
                "first_name": "Lucia",
                "last_name": "Mendoza",
                "is_child": True,
                "gender": "female",
                "relationship_type": "friends",
                "side": "venezuela",
                "rsvp_status": "pending",
                "phone": "+58 412 555 0134",
                "email": "lucia@example.com",
                "household": "Familia Mendoza",
            },
            "errors": [],
        }
    ]
    assert count_guests(db_session) == 0


def test_given_a_row_with_only_names_when_the_file_is_previewed_then_every_other_field_is_empty(
    client: TestClient, wedding: Wedding
):
    response = preview(client, wedding.id, csv_of("Maria,Rossi,,,,,,"))

    guest = response.json()["rows"][0]["guest"]
    assert guest["is_child"] is False
    assert guest["gender"] is None
    assert guest["relationship_type"] is None
    assert guest["side"] is None
    assert guest["phone"] is None
    assert guest["email"] is None


def test_given_a_file_with_only_the_name_columns_when_it_is_previewed_then_the_rows_still_parse(
    client: TestClient, wedding: Wedding
):
    response = preview(client, wedding.id, "first_name,last_name\nMaria,Rossi\n")

    assert response.status_code == 200
    assert response.json()["rows"][0]["guest"]["first_name"] == "Maria"


def test_given_values_typed_the_way_a_person_would_when_previewed_then_they_are_normalised(
    client: TestClient, wedding: Wedding
):
    """Spreadsheets capitalise things; " Italy " still means italy."""
    content = "First_Name , Last_Name,Side,Relationship_Type,Is_Child\n Maria , Rossi , Italy ,FAMILY,Yes\n"

    response = preview(client, wedding.id, content)

    row = response.json()["rows"][0]
    assert row["errors"] == []
    assert row["guest"]["first_name"] == "Maria"
    assert row["guest"]["side"] == "italy"
    assert row["guest"]["relationship_type"] == "family"
    assert row["guest"]["is_child"] is True


def test_given_rows_with_mistakes_when_previewed_then_each_bad_row_reports_its_own_errors(
    client: TestClient, wedding: Wedding
):
    content = csv_of(
        "Maria,Rossi,,,,,,",
        ",Mendoza,,,,,,",
        "Carlos,Mendoza,maybe,,cousins,france,,",
    )

    response = preview(client, wedding.id, content)

    rows = response.json()["rows"]
    assert [row["row_number"] for row in rows] == [2, 3, 4]
    assert rows[0]["errors"] == []
    assert rows[1]["guest"] is None
    assert rows[1]["errors"] == [{"field": "first_name", "code": "missing"}]
    assert rows[2]["guest"] is None
    assert rows[2]["errors"] == [
        {"field": "is_child", "code": "invalid"},
        {"field": "relationship_type", "code": "invalid"},
        {"field": "side", "code": "invalid"},
    ]


def test_given_a_value_longer_than_a_guest_can_hold_when_previewed_then_the_row_is_rejected(
    client: TestClient, wedding: Wedding
):
    response = preview(client, wedding.id, csv_of(f"{'M' * 101},Rossi,,,,,,"))

    assert response.json()["rows"][0]["errors"] == [{"field": "first_name", "code": "too_long"}]


def test_given_blank_lines_when_previewed_then_they_are_skipped_but_row_numbers_match_the_sheet(
    client: TestClient, wedding: Wedding
):
    content = csv_of("Maria,Rossi,,,,,,", ",,,,,,,", "", "Carlos,Mendoza,,,,,,")

    response = preview(client, wedding.id, content)

    rows = response.json()["rows"]
    assert [(row["row_number"], row["guest"]["first_name"]) for row in rows] == [
        (2, "Maria"),
        (5, "Carlos"),
    ]


def test_given_a_file_saved_by_excel_when_previewed_then_the_byte_order_mark_is_ignored(
    client: TestClient, wedding: Wedding
):
    content = "﻿" + csv_of("José,Pérez,,,,,,")

    response = preview(client, wedding.id, content.encode("utf-8"))

    assert response.status_code == 200
    assert response.json()["rows"][0]["guest"]["first_name"] == "José"


def test_given_a_file_without_the_name_columns_when_previewed_then_it_is_rejected_as_a_whole(
    client: TestClient, wedding: Wedding
):
    response = preview(client, wedding.id, "name,side\nMaria Rossi,italy\n")

    assert response.status_code == 422
    assert response.json()["detail"] == "csv_missing_columns"


def test_given_an_empty_file_when_previewed_then_it_is_rejected_as_missing_its_columns(
    client: TestClient, wedding: Wedding
):
    response = preview(client, wedding.id, "")

    assert response.status_code == 422
    assert response.json()["detail"] == "csv_missing_columns"


def test_given_a_file_that_is_not_utf8_text_when_previewed_then_it_is_rejected(
    client: TestClient, wedding: Wedding
):
    response = preview(client, wedding.id, b"\xff\xfe\x00\x00binary")

    assert response.status_code == 422
    assert response.json()["detail"] == "csv_not_utf8"


def test_given_a_file_far_bigger_than_any_guest_list_when_previewed_then_it_is_rejected(
    client: TestClient, wedding: Wedding
):
    row = "Maria,Rossi,,,,,,\n"
    oversized = csv_of() + row * (1_048_576 // len(row) + 1)

    response = preview(client, wedding.id, oversized)

    assert response.status_code == 422
    assert response.json()["detail"] == "csv_too_large"


def test_given_an_unknown_wedding_when_a_file_is_previewed_then_it_is_not_found(client: TestClient):
    response = preview(client, 404, csv_of("Maria,Rossi,,,,,,"))

    assert response.status_code == 404


def test_given_previewed_guests_when_the_import_is_confirmed_then_they_are_all_created_in_one_go(
    client: TestClient, db_session: Session, wedding: Wedding
):
    guests = [
        {"first_name": "Maria", "last_name": "Rossi"},
        {"first_name": "Carlos", "last_name": "Mendoza", "side": "venezuela", "is_child": True},
    ]

    response = client.post(f"{GUESTS_URL.format(wedding_id=wedding.id)}/bulk", json=guests)

    assert response.status_code == 201
    created = response.json()
    assert [guest["first_name"] for guest in created] == ["Maria", "Carlos"]
    assert all(guest["wedding_id"] == wedding.id for guest in created)
    assert all(guest["rsvp_status"] == "pending" for guest in created)
    assert created[1]["side"] == "venezuela"
    assert count_guests(db_session) == 2


def test_given_an_existing_guest_when_the_same_name_is_imported_then_a_duplicate_is_created(
    client: TestClient, db_session: Session, wedding: Wedding
):
    """Import is create-only: no matching against who is already on the list."""
    db_session.add(Guest(wedding_id=wedding.id, first_name="Maria", last_name="Rossi"))
    db_session.commit()

    client.post(
        f"{GUESTS_URL.format(wedding_id=wedding.id)}/bulk",
        json=[{"first_name": "Maria", "last_name": "Rossi"}],
    )

    assert count_guests(db_session) == 2


def test_given_nothing_to_import_when_the_import_is_confirmed_then_it_is_rejected(
    client: TestClient, wedding: Wedding
):
    response = client.post(f"{GUESTS_URL.format(wedding_id=wedding.id)}/bulk", json=[])

    assert response.status_code == 422


def test_given_an_invalid_guest_in_the_batch_when_the_import_is_confirmed_then_nothing_is_created(
    client: TestClient, db_session: Session, wedding: Wedding
):
    response = client.post(
        f"{GUESTS_URL.format(wedding_id=wedding.id)}/bulk",
        json=[{"first_name": "Maria", "last_name": "Rossi"}, {"first_name": "Carlos"}],
    )

    assert response.status_code == 422
    assert count_guests(db_session) == 0


def test_given_an_unknown_wedding_when_the_import_is_confirmed_then_it_is_not_found(
    client: TestClient,
):
    response = client.post(
        f"{GUESTS_URL.format(wedding_id=404)}/bulk",
        json=[{"first_name": "Maria", "last_name": "Rossi"}],
    )

    assert response.status_code == 404


def test_given_a_household_longer_than_it_can_hold_when_previewed_then_the_row_is_rejected(
    client: TestClient, wedding: Wedding
):
    response = preview(client, wedding.id, csv_of(f"Maria,Rossi,,,,,,,{'R' * 101}"))

    assert response.json()["rows"][0]["errors"] == [{"field": "household", "code": "too_long"}]


def test_given_rows_sharing_a_household_when_the_import_is_confirmed_then_they_land_in_one_household(
    client: TestClient, db_session: Session, wedding: Wedding
):
    guests = [
        {"first_name": "Maria", "last_name": "Rossi", "household": "Rossi"},
        {"first_name": "Paolo", "last_name": "Rossi", "household": " rossi "},
        {"first_name": "Lucia", "last_name": "Mendoza", "household": "Mendoza"},
        {"first_name": "Carlos", "last_name": "Mendoza"},
        {"first_name": "Ana", "last_name": "Perez"},
    ]

    response = client.post(f"{GUESTS_URL.format(wedding_id=wedding.id)}/bulk", json=guests)

    assert response.status_code == 201
    household_of = {guest["first_name"]: guest["household_id"] for guest in response.json()}
    assert household_of["Maria"] == household_of["Paolo"]
    assert len(set(household_of.values())) == 4
    names = db_session.scalars(select(Household.name).order_by(Household.id)).all()
    assert names == ["Rossi", "Mendoza", "Carlos Mendoza", "Ana Perez"]


def test_given_a_household_name_already_on_the_list_when_imported_then_a_new_household_is_created(
    client: TestClient, db_session: Session, wedding: Wedding
):
    """Create-only, like the guests themselves: nothing is matched against the existing list."""
    db_session.add(Household(wedding_id=wedding.id, name="Rossi"))
    db_session.commit()

    client.post(
        f"{GUESTS_URL.format(wedding_id=wedding.id)}/bulk",
        json=[{"first_name": "Maria", "last_name": "Rossi", "household": "Rossi"}],
    )

    assert db_session.scalar(select(func.count()).select_from(Household)) == 2


def test_given_relationships_typed_with_spaces_or_dashes_when_previewed_then_they_match_the_vocabulary(
    client: TestClient, wedding: Wedding
):
    """A spreadsheet says "Plus one"; the API says plus_one."""
    content = csv_of(
        "Maria,Rossi,,,Plus One,,,,",
        "Lucia,Mendoza,,,bride friends,,,,",
        "Carlos,Mendoza,,,groom-friends,,,,",
        "Ana,Perez,,,GROOM_FRIENDS,,,,",
    )

    response = preview(client, wedding.id, content)

    rows = response.json()["rows"]
    assert [row["errors"] for row in rows] == [[], [], [], []]
    assert [row["guest"]["relationship_type"] for row in rows] == [
        "plus_one",
        "bride_friends",
        "groom_friends",
        "groom_friends",
    ]


def test_given_the_united_states_spelled_out_when_previewed_then_it_reads_as_the_usa_side(
    client: TestClient, wedding: Wedding
):
    content = csv_of("Sarah,Rizzo,,,,USA,,,", "Sol,Hidalgo,,,,United States,,,", "Karina,Avendaño,,,,us,,,")

    response = preview(client, wedding.id, content)

    assert [row["guest"]["side"] for row in response.json()["rows"]] == ["usa", "usa", "usa"]
