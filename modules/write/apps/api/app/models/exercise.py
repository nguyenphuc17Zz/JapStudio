from __future__ import annotations

import enum

from sqlalchemy import JSON, Boolean, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class ExerciseType(str, enum.Enum):
    SENTENCE_TRANSLATION = "sentence_translation"
    MULTI_SENTENCE_TRANSLATION = "multi_sentence_translation"
    PARAGRAPH_TRANSLATION = "paragraph_translation"
    FREE_WRITING = "free_writing"
    REGISTER_CHALLENGE = "register_challenge"
    SCENARIO_RESPONSE = "scenario_response"
    EMAIL_WRITING = "email_writing"
    CHAT_WRITING = "chat_writing"
    REPORT_WRITING = "report_writing"
    TICKET_WRITING = "ticket_writing"
    OPINION_WRITING = "opinion_writing"


class TargetLength(str, enum.Enum):
    SHORT_SENTENCE = "short_sentence"
    SENTENCE = "sentence"
    MULTI_SENTENCE = "multi_sentence"
    PARAGRAPH = "paragraph"
    LONG_WRITING = "long_writing"


class Register(str, enum.Enum):
    CASUAL = "casual"
    POLITE = "polite"
    BUSINESS = "business"
    MIXED = "mixed"


class JlptLevel(str, enum.Enum):
    N5 = "N5"
    N4 = "N4"
    N3 = "N3"
    N2 = "N2"
    N1 = "N1"


class ExerciseStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"


class Exercise(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "exercises"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    exercise_type: Mapped[ExerciseType] = mapped_column(
        Enum(ExerciseType, native_enum=False, length=32), nullable=False
    )
    topic: Mapped[str] = mapped_column(String(100), nullable=False)
    subtopic: Mapped[str | None] = mapped_column(String(100), nullable=True)
    context: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_vi: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_vi_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    target_length: Mapped[TargetLength] = mapped_column(
        Enum(TargetLength, native_enum=False, length=32), nullable=False
    )
    register: Mapped[Register] = mapped_column(
        Enum(Register, native_enum=False, length=32), nullable=False
    )
    jlpt_level: Mapped[JlptLevel] = mapped_column(
        Enum(JlptLevel, native_enum=False, length=8), nullable=False
    )
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    grammar_complexity: Mapped[int] = mapped_column(Integer, nullable=False)
    vocabulary_complexity: Mapped[int] = mapped_column(Integer, nullable=False)
    context_complexity: Mapped[int] = mapped_column(Integer, nullable=False)
    naturalness_target: Mapped[int] = mapped_column(Integer, nullable=False)
    generation_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    scenario_id: Mapped[str | None] = mapped_column(
        ForeignKey("writing_scenarios.id", ondelete="SET NULL"), index=True, nullable=True
    )
    objective_id: Mapped[str | None] = mapped_column(
        ForeignKey("learning_objectives.id", ondelete="SET NULL"), index=True, nullable=True
    )
    status: Mapped[ExerciseStatus] = mapped_column(
        Enum(ExerciseStatus, native_enum=False, length=32),
        default=ExerciseStatus.PENDING,
        nullable=False,
    )

    user: Mapped[User | None] = relationship(back_populates="exercises")
    attempts: Mapped[list["ExerciseAttempt"]] = relationship(
        back_populates="exercise", cascade="all, delete-orphan"
    )


class AttemptStatus(str, enum.Enum):
    SUBMITTED = "submitted"


class ExerciseAttempt(UUIDMixin, TimestampMixin, Base):
    """One immutable submission of an answer to an exercise.

    Only the learning-mode state (hints_revealed_count, revealed) ever changes
    after creation; answer_text and the evaluation are never overwritten.
    """

    __tablename__ = "exercise_attempts"
    __table_args__ = (
        UniqueConstraint("exercise_id", "attempt_number", name="uq_exercise_attempt_number"),
    )

    exercise_id: Mapped[str] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, native_enum=False, length=32),
        default=AttemptStatus.SUBMITTED,
        nullable=False,
    )
    hints_revealed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    revealed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    exercise: Mapped[Exercise] = relationship(back_populates="attempts")
    feedback: Mapped[WritingFeedback | None] = relationship(
        back_populates="attempt", uselist=False, cascade="all, delete-orphan"
    )


class WritingFeedback(UUIDMixin, TimestampMixin, Base):
    """Persisted AI evaluation for one attempt.

    The full structured payload lives in ``evaluation`` (JSON); the scalar
    score columns are kept queryable for future analytics. Never contains
    credentials or raw provider responses.
    """

    __tablename__ = "writing_feedback"

    attempt_id: Mapped[str] = mapped_column(
        ForeignKey("exercise_attempts.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    evaluation: Mapped[dict] = mapped_column(JSON, nullable=False)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    semantic_score: Mapped[int] = mapped_column(Integer, nullable=False)
    grammar_score: Mapped[int] = mapped_column(Integer, nullable=False)
    vocabulary_score: Mapped[int] = mapped_column(Integer, nullable=False)
    naturalness_score: Mapped[int] = mapped_column(Integer, nullable=False)
    context_fit_score: Mapped[int] = mapped_column(Integer, nullable=False)
    register_fit_score: Mapped[int] = mapped_column(Integer, nullable=False)
    evaluation_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    attempt: Mapped[ExerciseAttempt] = relationship(back_populates="feedback")
