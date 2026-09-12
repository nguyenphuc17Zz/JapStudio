from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import logger
from app.shared.errors.exceptions import AppBaseException


def format_error_response(code: str, message: str, details: dict | None = None) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        }
    }


def _add_cors_headers(request: Request, response: JSONResponse) -> JSONResponse:
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
    return response


def register_error_handlers(app: FastAPI) -> None:
    """Registers standard JSON error response handlers for FastAPI."""

    @app.exception_handler(AppBaseException)
    async def app_base_exception_handler(request: Request, exc: AppBaseException) -> JSONResponse:
        logger.warning(f"Domain exception on {request.method} {request.url.path}: {exc.code} - {exc.message}")
        resp = JSONResponse(
            status_code=exc.status_code,
            content=format_error_response(code=exc.code, message=exc.message, details=exc.details),
        )
        return _add_cors_headers(request, resp)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        logger.info(f"Validation error on {request.method} {request.url.path}: {exc.errors()}")
        formatted_errors = []
        for err in exc.errors():
            loc = ".".join(str(part) for part in err.get("loc", []))
            formatted_errors.append({
                "field": loc,
                "msg": err.get("msg", "Invalid value"),
                "type": err.get("type", "value_error"),
            })
        resp = JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=format_error_response(
                code="VALIDATION_ERROR",
                message="Request validation failed",
                details={"errors": formatted_errors},
            ),
        )
        return _add_cors_headers(request, resp)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        resp = JSONResponse(
            status_code=exc.status_code,
            content=format_error_response(
                code=f"HTTP_{exc.status_code}",
                message=str(exc.detail),
            ),
        )
        return _add_cors_headers(request, resp)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled exception on {request.method} {request.url.path}: {exc!s}")
        resp = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=format_error_response(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected internal server error occurred",
            ),
        )
        return _add_cors_headers(request, resp)
