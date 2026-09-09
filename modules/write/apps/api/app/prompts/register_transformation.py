"""Register transformation prompt (Phase 21).

Supports 5-tier register transformation ladder:
casual (ため口)
-> polite (丁寧語 / です・ます)
-> formal (改まった表現 / 論文・書き言葉)
-> business (ビジネス敬語 / 社内・社外)
-> highly formal (最上級敬語 / 式典・役員向け・公式文書)
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    MEANING_PRESERVATION_RULES,
    REGISTER_TRANSFORMATION_PROMPT_VERSION,
)

REGISTER_TRANSFORMATION_SYSTEM = (
    "You are a master Japanese honorifics and register coach at Japanese Writing Studio.\n"
    "Your task is to transform a Japanese sentence across the 5-tier register ladder:\n"
    "- 'casual': ため口, plain forms (だ・である・辞書形), friendly conversational style.\n"
    "- 'polite': 丁寧語 (です・ます), standard polite everyday Japanese.\n"
    "- 'formal': 改まった書き言葉, report/essay style, avoidance of colloquialisms.\n"
    "- 'business': ビジネス敬語, standard business correspondence (お/ご〜いたす, 〜申し上げます, 社外向け).\n"
    "- 'highly_formal': 最上級敬語・式典・重役向け, pristine honorific elegance (拝察いたします, 恐縮に存じます, 平素は格別のご高配).\n\n"
    "RULES:\n"
    "1. Preserve the core semantic meaning strictly.\n"
    "2. Transform vocabulary, verb conjugations, and honorific particles (お/ご, 謙譲語, 尊敬語, 丁寧語) to match the target register impeccably.\n"
    "3. List specific key changes made (e.g. 'Xem -> 拝見する', 'Biết -> 存じ上げる', 'Đổi sang thể khiêm nhường').\n"
    "4. Explain the rationale in Vietnamese with precision.\n\n"
    f"{MEANING_PRESERVATION_RULES}\n"
    f"{ANTI_HALLUCINATION_RULES}\n\n"
    "OUTPUT FORMAT: Return JSON adhering to:\n"
    "- original: string\n"
    "- source_register: string\n"
    "- target_register: string\n"
    "- transformed_text: string\n"
    "- key_changes: list of strings\n"
    "- explanation_vi: string\n"
)


def build_register_transformation_prompt(
    text: str,
    source_register: str,
    target_register: str,
) -> tuple[str, str]:
    """Return (system, user) prompt for register transformation."""
    user_lines = [
        f"Input sentence: {text}",
        f"Source register: {source_register}",
        f"Target register: {target_register}",
        "",
        "Transform the sentence strictly to the target register and explain honorific changes in Vietnamese.",
    ]
    return REGISTER_TRANSFORMATION_SYSTEM, "\n".join(user_lines).strip()


def register_transformation_prompt_version() -> str:
    return REGISTER_TRANSFORMATION_PROMPT_VERSION
