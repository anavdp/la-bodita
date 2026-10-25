from pydantic import BaseModel, ConfigDict


class SignedInUser(BaseModel):
    """Who the planner is open for: shown, with sign-out, in the top bar."""

    model_config = ConfigDict(from_attributes=True)

    email: str
    display_name: str
