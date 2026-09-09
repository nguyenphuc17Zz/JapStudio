from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.quiz import ReadingQuiz, ReadingQuizQuestion, QuizAttempt
from app.schemas.quiz import (
    ReadingQuizResponse,
    ReadingQuizDetailResponse,
    QuizAttemptResponse,
    StartQuizAttemptRequest,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    CompleteQuizResponse,
    QuizAdminStatsResponse,
)
from app.services.quiz_service import QuizService

router = APIRouter(prefix="/immersion", tags=["AI Quiz & Reading Comprehension Engine"])


@router.post("/content/{id}/quiz/generate", response_model=ReadingQuizResponse)
async def generate_quiz(
    id: int,
    force_regenerate: bool = Query(False, description="Force AI regeneration even if cached quiz exists"),
    model_provider: Optional[str] = Query(None, description="Optional specific AI provider:model"),
    db: AsyncSession = Depends(get_db),
):
    """Generates an AI reading comprehension quiz grounded in the article or returns cached quiz."""
    try:
        quiz = await QuizService.get_or_create_quiz(
            db=db,
            content_id=id,
            force_regenerate=force_regenerate,
            model_provider=model_provider,
        )
        return QuizService.serialize_quiz_for_client(quiz)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/content/{id}/quiz", response_model=ReadingQuizResponse)
async def get_content_quiz(
    id: int,
    model_provider: Optional[str] = Query(None, description="Optional specific AI provider:model"),
    db: AsyncSession = Depends(get_db),
):
    """Fetches the ready quiz for an article without leaking answers."""
    try:
        quiz = await QuizService.get_or_create_quiz(
            db=db,
            content_id=id,
            force_regenerate=False,
            model_provider=model_provider,
        )
        return QuizService.serialize_quiz_for_client(quiz)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/quizzes/admin/stats", response_model=QuizAdminStatsResponse)
async def get_quiz_admin_stats(
    db: AsyncSession = Depends(get_db),
):
    """Returns platform-level quiz analytics and health metrics for the Admin Dashboard."""
    return await QuizService.get_admin_stats(db=db)


@router.get("/quizzes/{id}", response_model=ReadingQuizResponse)
async def get_quiz_by_id(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Retrieves a quiz by ID."""
    stmt = (
        select(ReadingQuiz)
        .where(ReadingQuiz.id == id)
        .options(
            selectinload(ReadingQuiz.questions).selectinload(ReadingQuizQuestion.options)
        )
    )
    quiz = (await db.execute(stmt)).scalars().first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return QuizService.serialize_quiz_for_client(quiz)


@router.post("/quizzes/{id}/attempts", response_model=QuizAttemptResponse)
async def start_quiz_attempt(
    id: int,
    payload: StartQuizAttemptRequest = StartQuizAttemptRequest(),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Starts a new test attempt or resumes an in-progress attempt for the user."""
    try:
        attempt = await QuizService.start_attempt(
            db=db,
            user_id=x_user_id,
            quiz_id=id,
            mode=payload.mode,
        )
        return attempt
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/attempts/{id}", response_model=QuizAttemptResponse)
async def get_attempt_status(
    id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Returns the current state of an ongoing quiz attempt."""
    stmt = select(QuizAttempt).where(QuizAttempt.id == id, QuizAttempt.user_id == x_user_id)
    attempt = (await db.execute(stmt)).scalars().first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    return attempt


@router.post("/attempts/{id}/answers", response_model=SubmitAnswerResponse)
async def submit_quiz_answer(
    id: int,
    payload: SubmitAnswerRequest,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Submits an answer for server-side evaluation (0 AI cost, immediate feedback)."""
    try:
        return await QuizService.submit_answer(
            db=db,
            user_id=x_user_id,
            attempt_id=id,
            req=payload,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/attempts/{id}/complete", response_model=CompleteQuizResponse)
async def complete_quiz_attempt(
    id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Finalizes an attempt and generates skill radar, metacognition patterns, and bridge review."""
    try:
        return await QuizService.complete_attempt(
            db=db,
            user_id=x_user_id,
            attempt_id=id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/attempts/{id}/results", response_model=CompleteQuizResponse)
async def get_quiz_attempt_results(
    id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Fetches detailed review and assessment results for a completed attempt."""
    try:
        return await QuizService.complete_attempt(
            db=db,
            user_id=x_user_id,
            attempt_id=id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
