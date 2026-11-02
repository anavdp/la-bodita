"""How the API fails: every error answers JSON with a `code` the planner can act
on and a short `request_id`, and an unexpected one logs its traceback under that
same id, so a screenshot of the planner can be matched to the log line. Nothing
technical (traceback, SQL, exception text) is ever sent to the browser."""

import logging
import secrets

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.datastructures import MutableHeaders
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = logging.getLogger("app.errors")

REQUEST_ID_HEADER = "X-Request-ID"

# One word per status, so the planner never has to parse a detail sentence.
CODES_BY_STATUS = {
    400: "bad_request",
    401: "signed_out",
    403: "forbidden",
    404: "not_found",
    405: "not_allowed",
    409: "conflict",
    413: "too_large",
    422: "invalid",
    429: "too_many_requests",
    503: "unavailable",
}


def code_for(status_code: int) -> str:
    if status_code >= 500:
        return CODES_BY_STATUS.get(status_code, "internal_error")
    return CODES_BY_STATUS.get(status_code, "error")


def new_request_id() -> str:
    """Eight hex characters: short enough to read off a phone screen."""
    return secrets.token_hex(4)


def request_id_of(request: Request) -> str:
    return getattr(request.state, "request_id", "")


def error_body(detail: object, code: str, request_id: str) -> dict[str, object]:
    return {"detail": detail, "code": code, "request_id": request_id}


class RequestReferenceMiddleware:
    """Gives each request its id, stamps it on the answer, and turns a crash into
    a JSON 500. It sits inside the CORS middleware, so even a crash carries the
    CORS headers the browser needs before it lets the planner read the body."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = new_request_id()
        scope.setdefault("state", {})["request_id"] = request_id
        response_started = False

        async def send_with_reference(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
                MutableHeaders(scope=message).append(REQUEST_ID_HEADER, request_id)
            await send(message)

        try:
            await self.app(scope, receive, send_with_reference)
        except Exception:
            logger.exception("Unhandled error [request %s] %s %s", request_id, scope["method"], scope["path"])
            if response_started:
                # Half an answer is already on its way; nothing sensible to add.
                raise
            response = JSONResponse(
                error_body("Something went wrong on our side.", "internal_error", request_id),
                status_code=500,
            )
            await response(scope, receive, send_with_reference)


async def answer_http_error(request: Request, error: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        error_body(error.detail, code_for(error.status_code), request_id_of(request)),
        status_code=error.status_code,
        headers=error.headers,
    )


async def answer_validation_error(request: Request, error: RequestValidationError) -> JSONResponse:
    # The field-by-field list stays as FastAPI shapes it; forms already read it.
    return JSONResponse(
        error_body(jsonable_encoder(error.errors()), "invalid", request_id_of(request)),
        status_code=422,
    )


def configure_logging() -> None:
    """Uvicorn sets up only its own loggers; without a handler here an app error
    would reach the terminal bare, without its level or logger name."""
    app_logger = logging.getLogger("app")
    if not app_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(levelname)s:     %(name)s %(message)s"))
        app_logger.addHandler(handler)
    app_logger.setLevel(logging.INFO)


def install_error_handling(app: FastAPI) -> None:
    """Called before the CORS middleware is added, so CORS wraps it."""
    configure_logging()
    app.add_middleware(RequestReferenceMiddleware)
    app.add_exception_handler(StarletteHTTPException, answer_http_error)
    app.add_exception_handler(RequestValidationError, answer_validation_error)
