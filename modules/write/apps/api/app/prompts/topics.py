"""Seed topic taxonomy for the exercise planner.

These categories are guidance for the AI planner, not a fixed question bank.
The planner may freely invent topics, subtopics and variations beyond this
seed list; the taxonomy only anchors what is relevant for the learner.
"""

TOPIC_CATEGORIES = [
    "Daily Life",
    "Family",
    "Friends",
    "Relationships",
    "Food",
    "Shopping",
    "Travel",
    "Transportation",
    "Hobbies",
    "Entertainment",
    "Study",
    "Work",
    "Office",
    "IT",
    "Programming",
    "BRSE",
    "Meetings",
    "Customers",
    "Emails",
    "Chat",
    "Business",
    "Technology",
    "News",
    "Society",
    "Japanese Culture",
    "Opinions",
    "Abstract Topics",
]

TOPIC_VARIATION_EXAMPLES = {
    "Work": [
        "deadline",
        "overtime",
        "mistake",
        "meeting",
        "customer request",
        "requirement change",
        "coworker communication",
    ],
}


def format_topic_taxonomy() -> str:
    """Render the seed taxonomy plus a variation example for the planner."""
    lines = [
        "Known topic categories (you may also invent new ones):",
        ", ".join(TOPIC_CATEGORIES),
        "",
        "Example of topic variations under one category:",
    ]
    for category, variations in TOPIC_VARIATION_EXAMPLES.items():
        lines.append(f"{category} -> {', '.join(variations)}")
    return "\n".join(lines)
