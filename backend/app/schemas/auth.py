from pydantic import BaseModel, ConfigDict

from app.schemas.guest import RequiredText


class SignedInUser(BaseModel):
    """Who the planner is open for: shown, with sign-out, in the top bar."""

    model_config = ConfigDict(from_attributes=True)

    email: str
    display_name: str


class SignedInUserUpdate(BaseModel):
    """What you may change about yourself: only your name. The email is the Google
    sign-in and the allow-list key, so it is refused here rather than ignored."""

    model_config = ConfigDict(extra="forbid")

    display_name: RequiredText


class Person(BaseModel):
    """One of the couple, as the planner names them: whose paper it is, who it is for."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
