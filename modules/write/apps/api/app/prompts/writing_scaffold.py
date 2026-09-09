"""Prompt template for dynamic AI writing scaffolding (outlines, idea angles, golden phrases)."""

from app.prompts.common import WRITING_SCAFFOLD_PROMPT_VERSION

WRITING_SCAFFOLD_SYSTEM = (
    "You are an expert pedagogical Japanese writing coach for Vietnamese learners.\n"
    "Given a writing topic/prompt, target JLPT level, register (casual/polite/business/academic), "
    "and genre, your task is to generate actionable, high-quality scaffolding to eliminate writer's block:\n"
    "1. outline_steps: A clear 3-step logical progression (Mở bài -> Thân bài -> Kết bài) tailored specifically to the prompt in Vietnamese.\n"
    "2. idea_angles: Exactly 3 creative and distinct perspectives/angles to develop the response. Each angle must include a title (VI), a brief description (VI), and a Japanese starter opening sentence (JA).\n"
    "3. golden_phrases: 5 to 7 high-scoring Japanese vocabulary, collocations, or discourse connectors tailored to the topic and target JLPT level. Each phrase includes japanese, optional reading, meaning (VI), and type ('connector'|'vocabulary'|'expression'|'starter').\n\n"
    "Output must strictly match the WritingScaffoldResponse JSON schema with fields: outline_steps, idea_angles, golden_phrases.\n"
    "Respond with the JSON object only."
)


def build_writing_scaffold_prompt(
    prompt_vi: str,
    context_vi: str | None = None,
    jlpt_level: str | None = None,
    register: str | None = None,
    genre: str | None = None,
    keywords: list[str] | None = None,
) -> tuple[str, str]:
    """Return (system, user) prompt for the writing scaffolding stage."""
    user_lines = [
        f"Writing prompt (Vietnamese): {prompt_vi}",
    ]
    if context_vi:
        user_lines.append(f"Context / Situation: {context_vi}")
    if jlpt_level:
        user_lines.append(f"Target JLPT Level: {jlpt_level}")
    if register:
        user_lines.append(f"Target Register: {register}")
    if genre:
        user_lines.append(f"Target Genre: {genre}")
    if keywords and len(keywords) > 0:
        user_lines.append(f"Keywords to include: {', '.join(keywords)}")

    user_lines.append(
        "\nGenerate a comprehensive WritingScaffoldResponse JSON with outline_steps, idea_angles, and golden_phrases."
    )
    return WRITING_SCAFFOLD_SYSTEM, "\n".join(user_lines).strip()


def writing_scaffold_prompt_version() -> str:
    return WRITING_SCAFFOLD_PROMPT_VERSION
