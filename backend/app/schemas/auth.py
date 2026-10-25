from pydantic import BaseModel, ConfigDict


class SignedInUser(BaseModel):
    """Who the planner is open for: shown, with sign-out, in the top bar."""

    model_config = ConfigDict(from_attributes=True)

    email: str
    display_name: str


class Person(BaseModel):
    """One of the couple, as the planner names them: whose paper it is, who it is for."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
