from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    String,
    Integer,
    Float,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
    JSON,
    Index,
    UniqueConstraint,
    func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ReadingQuiz(Base):
    """Stores AI-generated or curated reading comprehension quizzes for an article."""
    __tablename__ = "reading_quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    quiz_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    generator_version: Mapped[str] = mapped_column(String(50), default="v1.0", nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(50), default="reading_quiz_v1", nullable=False)

    # EASY, STANDARD, CHALLENGING
    difficulty: Mapped[str] = mapped_column(String(30), default="STANDARD", nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    estimated_time_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    # DRAFT, READY, INVALID, ARCHIVED
    status: Mapped[str] = mapped_column(String(30), default="READY", nullable=False, index=True)
    quality_score: Mapped[float] = mapped_column(Float, default=90.0, nullable=False)

    # Blueprint storing targets: skills distribution, section coverage
    blueprint_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent")
    questions: Mapped[List["ReadingQuizQuestion"]] = relationship(
        "ReadingQuizQuestion",
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="ReadingQuizQuestion.question_index"
    )
    attempts: Mapped[List["QuizAttempt"]] = relationship(
        "QuizAttempt",
        back_populates="quiz",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_reading_quizzes_content_status", "content_id", "status"),
    )


class ReadingQuizQuestion(Base):
    """An individual question within a reading quiz."""
    __tablename__ = "reading_quiz_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quiz_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("reading_quizzes.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    question_index: Mapped[int] = mapped_column(Integer, nullable=False)

    # MULTIPLE_CHOICE, TRUE_FALSE, MULTI_SELECT, ORDERING, MATCHING, FREE_RESPONSE
    question_type: Mapped[str] = mapped_column(String(50), default="MULTIPLE_CHOICE", nullable=False)

    # DETAIL, MAIN_IDEA, INFERENCE, VOCABULARY, GRAMMAR, SENTENCE_COMPREHENSION, AUTHOR_INTENTION, CONTEXT, STRUCTURE, SUMMARY
    skill_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_vi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    explanation_vi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # EASY, STANDARD, CHALLENGING
    difficulty: Mapped[str] = mapped_column(String(30), default="STANDARD", nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    # IRT 2PL calibration (cold-started from the static difficulty label,
    # refined by the calibration job as real answers accumulate).
    irt_a: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    irt_b: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    irt_n: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Grounding references
    source_sentence_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    source_section_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    source_scope: Mapped[str] = mapped_column(String(30), default="SENTENCE", nullable=False)  # SENTENCE, SECTION, ARTICLE

    hints_json: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    quiz: Mapped["ReadingQuiz"] = relationship("ReadingQuiz", back_populates="questions")
    options: Mapped[List["QuizQuestionOption"]] = relationship(
        "QuizQuestionOption",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuizQuestionOption.option_index"
    )
    answers: Mapped[List["QuizAnswer"]] = relationship(
        "QuizAnswer",
        back_populates="question",
        cascade="all, delete-orphan"
    )


class QuizQuestionOption(Base):
    """Answer options for multiple choice or multi-select questions."""
    __tablename__ = "quiz_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("reading_quiz_questions.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    text_vi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    question: Mapped["ReadingQuizQuestion"] = relationship("ReadingQuizQuestion", back_populates="options")


class QuizAttempt(Base):
    """A user's attempt at a reading comprehension quiz."""
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    quiz_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("reading_quizzes.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Detailed breakdown
    skill_scores_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    confidence_pattern_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    misconceptions_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    # IN_PROGRESS, COMPLETED, ABANDONED
    completion_status: Mapped[str] = mapped_column(String(30), default="IN_PROGRESS", nullable=False, index=True)

    # RELAXED, FOCUS, CHALLENGE
    mode: Mapped[str] = mapped_column(String(30), default="RELAXED", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    quiz: Mapped["ReadingQuiz"] = relationship("ReadingQuiz", back_populates="attempts")
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent")
    answers: Mapped[List["QuizAnswer"]] = relationship(
        "QuizAnswer",
        back_populates="attempt",
        cascade="all, delete-orphan",
        order_by="QuizAnswer.answered_at"
    )

    __table_args__ = (
        Index("ix_quiz_attempts_user_content", "user_id", "content_id"),
        Index("ix_quiz_attempts_status", "user_id", "completion_status"),
    )


class QuizAnswer(Base):
    """User's answer to a single question during an attempt."""
    __tablename__ = "quiz_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attempt_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("quiz_attempts.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    question_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("reading_quiz_questions.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    selected_option_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("quiz_question_options.id", ondelete="SET NULL"),
        nullable=True
    )
    selected_option_ids_json: Mapped[List[int]] = mapped_column(JSON, default=list, nullable=False)
    answer_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    points_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # HIGH, MEDIUM, LOW
    confidence: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    response_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    hints_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # NEGATION_CONFUSION, GRAMMAR_MISREAD, SIMILAR_VOCAB, INFERENCE_OVERREACH, DETAIL_OVERLOOK
    misconception_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    answered_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    attempt: Mapped["QuizAttempt"] = relationship("QuizAttempt", back_populates="answers")
    question: Mapped["ReadingQuizQuestion"] = relationship("ReadingQuizQuestion", back_populates="answers")
    selected_option: Mapped[Optional["QuizQuestionOption"]] = relationship("QuizQuestionOption")

    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question_answer"),
    )


class LearnerAbility(Base):
    """Online IRT ability estimate per user (global + per-skill thetas)."""
    __tablename__ = "learner_ability"

    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    theta: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    se: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    # {"MAIN_IDEA": {"theta": 0.2, "n": 12}, ...}
    skill_thetas_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    answers_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
