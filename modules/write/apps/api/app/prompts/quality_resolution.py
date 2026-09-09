"""Resolver prompt: quality_resolution:v1 (Phase 11).

The resolver receives ONLY the original task description, the primary AI
output, the verifier output and the deterministic check results. It must
decide between them without inventing any information.
"""

QUALITY_RESOLUTION_PROMPT_VERSION = "quality_resolution:v1"

RESOLVER_RULES = (
    "You are an AI quality resolver. Decide between a primary output and a "
    "verifier output for an AI task.\n"
    "STRICT RULES:\n"
    "- Use ONLY the information provided below. Never invent facts, scores or "
    "content that are not present in the inputs.\n"
    "- If the primary output passes all deterministic checks and the verifier "
    "accepted it, return accept.\n"
    "- If the verifier found concrete errors and the deterministic checks "
    "agree with the verifier, return reject (or revise when a corrected "
    "result is derivable from the verifier output alone).\n"
    "- If the disagreement is a matter of style or the verifier gives no "
    "specific reason, prefer the primary output (accept).\n"
    "- corrected_result may only contain values taken verbatim from the "
    "verifier output; otherwise it must be null.\n"
    "- reason must be a short, specific explanation of the decision.\n"
)


def build_resolution_prompt(
    *,
    task: str,
    primary_output: dict,
    verifier_output: dict,
    deterministic_checks: list[str],
) -> tuple[str, str]:
    system = RESOLVER_RULES
    checks = "\n".join(f"- {check}" for check in deterministic_checks) or "- none"
    user = (
        f"Task: {task}\n\n"
        "Primary output:\n"
        f"{primary_output}\n\n"
        "Verifier output:\n"
        f"{verifier_output}\n\n"
        "Deterministic checks:\n"
        f"{checks}\n\n"
        "Decide: accept, reject or revise."
    )
    return system, user
