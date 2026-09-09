"""Structured AI schemas for Japanese cultural & gamification features."""

from pydantic import BaseModel, Field


class HankoSuggestionOption(BaseModel):
    """A suggested Kanji option for a personalized Hanko seal."""

    kanji: str = Field(description="1 or 2 Kanji characters for the seal", min_length=1, max_length=2)
    reading: str = Field(description="Onyomi / Kunyomi reading in Hiragana and Romaji")
    meaning_vi: str = Field(description="Sino-Vietnamese meaning and interpretation")
    seal_style: str = Field(description="Recommended seal style (e.g. Tensho-tai, Kointai, Inso-tai)")
    philosophy: str = Field(description="Inspirational philosophy or motto associated with this character")


class HankoSuggestionResponse(BaseModel):
    """Output for Hanko suggestion."""

    name_input: str
    options: list[HankoSuggestionOption] = Field(min_length=1, max_length=5)
    overall_advice: str = Field(description="Master seal carver's advice for the learner's writing journey")


class HaikuGenerateRequest(BaseModel):
    """Input parameters for generating a contextual Haiku."""

    season: str | None = Field(default=None, description="Season (Xuân, Hạ, Thu, Đông, or specific month)")
    theme: str | None = Field(default=None, description="Theme or mood (e.g., Tĩnh lặng, Đêm trăng, Bút đạo, Bình minh)")
    streak_days: int | None = Field(default=None, description="Current study streak to weave into the poem")


class HaikuGenerateResponse(BaseModel):
    """Output structured Haiku poem."""

    season: str = Field(description="Season category (e.g. 🌸 Xuân, 🍃 Hạ, 🍁 Thu, ❄️ Đông)")
    kigo: str = Field(description="Seasonal word (Kigo) in Japanese and Vietnamese")
    lines_jp: list[str] = Field(description="3 lines in Japanese (5-7-5 syllable structure)", min_length=3, max_length=3)
    lines_reading: list[str] = Field(description="Hiragana & Romaji reading for each of the 3 lines", min_length=3, max_length=3)
    translation_vi: str = Field(description="Poetic translation in Vietnamese (rhymed)")
    explanation: str = Field(description="Literary commentary explaining the imagery and Zen / Wabi-Sabi philosophy")
    author_jp: str = Field(default="AI 芭蕉 (AI Bashō)")
    author_vi: str = Field(default="Họa bút thi nhân AI")


class OmikujiDrawRequest(BaseModel):
    """Optional parameters for Shinto Omikuji fortune draw."""

    clan_id: str | None = None
    study_focus: str | None = None


class OmikujiFortuneResponse(BaseModel):
    """Authentic Shinto Omikuji fortune."""

    rank: str = Field(description="Fortune rank: 大吉, 中吉, 小吉, 吉, or 末吉")
    rank_vi: str = Field(description="Vietnamese translation of rank (Đại Cát, Trung Cát, etc.)")
    buff: str = Field(description="EXP buff or benefit (e.g. +20% EXP luyện tập hôm nay)")
    exp_buff_percent: int = Field(default=10, description="EXP bonus percentage (10 to 30)")
    color: str = Field(description="HEX color associated with this fortune rank")

    waka_jp: str = Field(description="Sacred oracle poem in Japanese (Waka / Tanko)")
    waka_reading: str = Field(description="Reading of the oracle poem in Hiragana/Romaji")
    waka_vi: str = Field(description="Poetic Vietnamese translation of the oracle poem")

    writing_advice: str = Field(description="Bút Đạo (Writing advice for today)")
    grammar_advice: str = Field(description="Học Nghiệp / Ngữ Pháp (Grammar focus advice)")
    vocab_advice: str = Field(description="Ngữ Vựng (Vocabulary memorization advice)")
    streak_advice: str = Field(description="Nhẫn Nại / Tâm Thế (Mindset and persistence advice)")

    lucky_kanji: str = Field(description="Lucky Kanji character of the day")
    lucky_kanji_reading: str = Field(description="Hiragana and Romaji reading of lucky Kanji")
    lucky_kanji_meaning: str = Field(description="Meaning and usage of lucky Kanji")
    lucky_grammar: str = Field(description="Lucky Japanese grammar pattern for writing practice")
    lucky_color: str = Field(description="Lucky color in Japanese aesthetics")


class KotowazaGenerateRequest(BaseModel):
    """Request for generating / retrieving a Japanese proverb."""

    category: str | None = Field(default=None, description="Category: persistence, wisdom, nature, everyday, learning")
    jlpt_level: str | None = Field(default=None, description="Optional target JLPT level")


class KotowazaResponse(BaseModel):
    """A Japanese proverb (Kotowaza) or four-character idiom (Yojijukugo)."""

    expression_jp: str = Field(description="Japanese proverb / Yojijukugo in Kanji & Kana")
    reading: str = Field(description="Hiragana and Romaji reading")
    meaning_literal: str = Field(description="Literal translation into Vietnamese")
    vietnamese_equivalent: str = Field(description="Equivalent Vietnamese proverb / idiom")
    origin_story: str = Field(description="Historical or cultural background story in Japan/Asia")
    example_sentence_jp: str = Field(description="Natural Japanese example sentence demonstrating usage")
    example_sentence_vi: str = Field(description="Vietnamese translation of the example sentence")
    practice_prompt: str = Field(description="A short writing practice prompt using this proverb")
    is_yojijukugo: bool = Field(default=False, description="True if this is a 4-character idiom")


class KitsuneChatMessage(BaseModel):
    """A message in the multi-turn Kitsune conversation."""

    role: str = Field(description="Role: 'user' or 'assistant'")
    content: str = Field(description="Content of the message")
    timestamp: str | None = Field(default=None, description="Optional ISO timestamp")


class KitsuneDialogueRequest(BaseModel):
    """Input context for Kitsune companion speech."""

    streak: int = 0
    today_completed_count: int = 0
    current_clan: str = "sakura"
    user_mood: str | None = None
    page_context: str | None = None


class KitsuneDialogueResponse(BaseModel):
    """Interactive Kitsune companion dialogue."""

    mood: str = Field(description="Kitsune expression: happy, curious, thoughtful, encouraging, proud, meditative")
    message_vi: str = Field(description="Friendly, witty Vietnamese dialogue from Kitsune")
    message_jp: str = Field(description="Short Japanese catchphrase or sentence from Kitsune")
    action_tip: str = Field(description="Actionable tip or suggestion for today's practice")


class KitsuneChatRequest(BaseModel):
    """Request payload for multi-turn chat with Inari Kitsune."""

    messages: list[KitsuneChatMessage] = Field(description="Chat history so far", min_length=1)
    clan_id: str = Field(default="sakura", description="Active Clan: sakura, ryu, tsuki, raijin")
    page_context: str | None = Field(default=None, description="Current page context (e.g., practice, canvas, dashboard)")
    streak: int = Field(default=0, description="User's streak days")
    provider: str | None = Field(default=None, description="AI provider override")
    model: str | None = Field(default=None, description="AI model override")


class KitsuneChatResponse(BaseModel):
    """Response payload for multi-turn chat with Inari Kitsune."""

    reply: str = Field(description="Kitsune's full conversational reply in Vietnamese with Japanese nuance")
    mood: str = Field(default="happy", description="Mood: happy, curious, encouraging, thoughtful, proud, mystical")
    japanese_phrase: str | None = Field(default=None, description="Key Japanese proverb, vocabulary, or phrase mentioned")
    suggested_chips: list[str] = Field(default_factory=list, description="2-4 contextual follow-up chips or quick questions")

