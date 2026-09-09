import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app")


class AppError(Exception):
    """Base application error with a stable HTTP status and machine-readable code."""

    status_code = 500
    code = "internal_error"

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        code: str | None = None,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ValidationError(AppError):
    status_code = 400
    code = "validation_error"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class ProviderError(AppError):
    status_code = 502
    code = "provider_error"


class ExerciseGenerationError(AppError):
    status_code = 502
    code = "exercise_generation_error"


class ExerciseDuplicateError(AppError):
    status_code = 409
    code = "duplicate_exercise"


class EvaluationError(AppError):
    status_code = 502
    code = "evaluation_error"


class VocabularyExtractionError(AppError):
    status_code = 502
    code = "vocabulary_extraction_error"


class ScenarioGenerationError(AppError):
    status_code = 502
    code = "scenario_generation_error"


class ScenarioEvaluationError(AppError):
    status_code = 502
    code = "scenario_evaluation_error"


class SimulationError(AppError):
    status_code = 502
    code = "simulation_error"


class AdaptiveLearningError(AppError):
    status_code = 502
    code = "adaptive_learning_error"


def _error_payload(status_code: int, code: str, message: str, details: Any = None) -> dict:
    payload = {"error": {"code": code, "message": message}}
    if details is not None:
        payload["error"]["details"] = details
    return payload


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_payload(exc.status_code, exc.code, exc.message, exc.details),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_payload(exc.status_code, "http_error", str(exc.detail)),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = []
    for error in exc.errors():
        clean = {k: error[k] for k in ("loc", "msg", "type") if k in error}
        if "ctx" in error and isinstance(error["ctx"], dict):
            ctx = {k: v for k, v in error["ctx"].items() if k != "error"}
            if ctx:
                clean["ctx"] = ctx
        errors.append(clean)
    return JSONResponse(
        status_code=422,
        content=_error_payload(422, "validation_error", "Request validation failed", errors),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=_error_payload(500, "internal_error", "An unexpected error occurred"),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
