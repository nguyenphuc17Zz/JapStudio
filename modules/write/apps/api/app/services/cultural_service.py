"""Cultural features service: Hanko, Haiku, Omikuji, Kotowaza, Kitsune."""

import logging
import random

from app.core.config import Settings, get_settings
from app.prompts.cultural_prompts import (
    HAIKU_SYSTEM_PROMPT,
    HANKO_SYSTEM_PROMPT,
    KITSUNE_CHAT_SYSTEM_PROMPT,
    KITSUNE_SYSTEM_PROMPT,
    KOTOWAZA_SYSTEM_PROMPT,
    OMIKUJI_SYSTEM_PROMPT,
)
from app.schemas.cultural_ai import (
    HaikuGenerateRequest,
    HaikuGenerateResponse,
    HankoSuggestionOption,
    HankoSuggestionResponse,
    KitsuneChatRequest,
    KitsuneChatResponse,
    KitsuneDialogueRequest,
    KitsuneDialogueResponse,
    KotowazaGenerateRequest,
    KotowazaResponse,
    OmikujiDrawRequest,
    OmikujiFortuneResponse,
)
from app.services.ai_service import AIService

logger = logging.getLogger("app.culture")


class CulturalService:
    """Service providing AI-powered dynamic Japanese cultural features."""

    def __init__(self, ai_service: AIService, settings: Settings | None = None) -> None:
        self._ai = ai_service
        self._settings = settings or get_settings()

    async def suggest_hanko(
        self,
        name_input: str = "",
        *,
        provider: str | None = None,
        model: str | None = None,
    ) -> HankoSuggestionResponse:
        """Suggest personalized or spontaneous artistic Kanji options for a Hanko seal."""
        name_clean = name_input.strip() if name_input else ""
        if name_clean and name_clean.lower() not in ["ngẫu nhiên", "random", "tùy duyên"]:
            user_prompt = (
                f"Please suggest 2-3 elegant Kanji characters for a personal Hanko seal for the name/phrase: '{name_clean}'.\n"
                "Analyze the Sino-Vietnamese roots, phonetic fit, and poetic symbolism."
            )
            display_name = name_clean
        else:
            artistic_motifs = [
                "Bút Đạo & Khí Phách (Thư Pháp)", "Tĩnh Lặng & Thiền Định (Wabi-Sabi)",
                "Ánh Sáng & Tương Lai (Quang Minh)", "Trí Tuệ & Uyên Bác (Minh Triết)",
                "Ý Chí Bất Khuất (Tùng Bách, Long Mã)", "Thanh Nhã & Thơ Ca (Phong Nhã)"
            ]
            chosen_motif = random.choice(artistic_motifs)
            user_prompt = (
                f"Please suggest 2-3 exceptionally elegant, profound, and artistic Kanji characters for a personal Japanese Hanko seal "
                f"created spontaneously for a calligraphy master. Motif focus: '{chosen_motif}'.\n"
                "Choose magnificent characters like 龍, 雅, 澄, 桜, 鳳, 碧, 蓮, 魁, 筆, 悠, 創 with rich philosophy."
            )
            display_name = "Tùy Duyên Khắc Dấu"

        try:
            result, _ = await self._ai.generate_structured(
                user_prompt,
                HankoSuggestionResponse,
                system=HANKO_SYSTEM_PROMPT,
                provider=provider,
                model=model,
            )
            return result  # type: ignore[return-value]
        except Exception:
            logger.exception("AI Hanko suggestion failed, falling back to artistic default")
            hanko_fallback_pool = [
                HankoSuggestionOption(
                    kanji="筆",
                    reading="ひつ (Hitsu)",
                    reading_romaji="Hitsu",
                    meaning_vi="Ngọn Bút Tâm Huyết · Biểu tượng của người luyện viết",
                    seal_style="Tensho-tai · Triện thư cổ",
                    philosophy="Tâm tĩnh bút sắc, nét chữ tỏ lòng người.",
                ),
                HankoSuggestionOption(
                    kanji="雅",
                    reading="みやび (Miyabi)",
                    reading_romaji="Miyabi",
                    meaning_vi="Thanh Nhã · Nét đẹp tao nhã của văn phong",
                    seal_style="Kointai · Cổ ấn thể",
                    philosophy="Nét văn thanh tao, vạn sự hanh thông.",
                ),
                HankoSuggestionOption(
                    kanji="澄",
                    reading="すみ (Sumi / Chō)",
                    reading_romaji="Sumi",
                    meaning_vi="Trong Trẻo & Tinh Khiết · Nét chữ trong sáng tựa dòng suối",
                    seal_style="Inso-tai · Ấn tướng thư",
                    philosophy="Lòng trong như ngọc, chữ sáng tựa sao.",
                ),
            ]
            return HankoSuggestionResponse(
                name_input=display_name,
                options=random.sample(hanko_fallback_pool, 2),
                overall_advice="Hãy chọn con dấu thể hiện ý chí kiên định và tâm thế an nhiên trên con đường luyện viết tiếng Nhật.",
            )

    async def generate_haiku(
        self,
        req: HaikuGenerateRequest | None = None,
        *,
        provider: str | None = None,
        model: str | None = None,
    ) -> HaikuGenerateResponse:
        """Generate a contextual 5-7-5 Haiku with season and Vietnamese translation."""
        season = req.season if req and req.season and "ngẫu hứng" not in req.season.lower() else random.choice(["🌸 Xuân", "🍃 Hạ", "🍁 Thu", "❄️ Đông"])
        themes_pool = [
            "Tĩnh lặng thiền định", "Ánh trăng soi bóng nước", "Bút đạo mài mực", 
            "Gió thoảng qua rặng tre", "Tách trà nghi ngút khói", "Tiếng chuông chùa xa xăm",
            "Cánh hoa anh đào rơi", "Mưa rào mùa hạ", "Lá đỏ Momiji", "Tuyết phủ mái đền",
            "Ngọn núi sương mù", "Tiếng ve sầu chiều muộn", "Hương hoa mận đầu mùa"
        ]
        theme = req.theme if req and req.theme and "ngẫu hứng" not in req.theme.lower() else random.choice(themes_pool)
        streak = req.streak_days if req and req.streak_days is not None else 0

        user_prompt = (
            f"Compose an original, vivid Japanese Haiku (5-7-5) with these details:\n"
            f"- Season: {season}\n"
            f"- Theme / Mood: {theme}\n"
            f"- Learner streak: {streak} days of dedicated writing practice.\n"
            "Include 5-7-5 lines, Kigo word, Hiragana reading, rhymed Vietnamese poetic translation, and philosophical commentary.\n"
            "Make the imagery unique, fresh, and deeply poetic (avoid cliché)."
        )

        try:
            result, _ = await self._ai.generate_structured(
                user_prompt,
                HaikuGenerateResponse,
                system=HAIKU_SYSTEM_PROMPT,
                provider=provider,
                model=model,
            )
            return result  # type: ignore[return-value]
        except Exception:
            logger.exception("AI Haiku generation failed, falling back to classic Haiku")
            haiku_fallbacks = [
                HaikuGenerateResponse(
                    season="🌸 Xuân",
                    kigo="蛙 (Kawazu - Ếch xuân)",
                    lines_jp=["古池や", "蛙飛び込む", "水の音"],
                    lines_reading=["ふるいけや (Furuike ya)", "かわずとびこむ (Kawazu tobikomu)", "みずのおと (Mizu no oto)"],
                    translation_vi="Ao xưa phẳng lặng như gương,\nMột chú ếch nhảy, tiếng nước buông nhẹ nhàng.",
                    explanation="Khoảnh khắc tĩnh lặng tuyệt đối của thiền định bị phá vỡ bởi một giọt âm thanh sống động, mở ra sự thức tỉnh.",
                    author_jp="松尾芭蕉 (Matsuo Bashō)",
                    author_vi="Bậc thầy thi ca Basho",
                ),
                HaikuGenerateResponse(
                    season="🍁 Thu",
                    kigo="月 (Tsuki - Trăng thu)",
                    lines_jp=["名月や", "池をめぐりて", "夜もすがら"],
                    lines_reading=["めいげつや (Meigetsu ya)", "いけをめぐりて (Ike o megurite)", "よもすがら (Yomosugara)"],
                    translation_vi="Trăng rằm vằng vặc trời thu,\nBên hồ dạo bước ngắm trăng suốt đêm.",
                    explanation="Vẻ đẹp mê đắm của vầng trăng mùa thu khiến người lữ khách quên cả giấc ngủ để chiêm ngưỡng.",
                    author_jp="松尾芭蕉 (Matsuo Bashō)",
                    author_vi="Bậc thầy thi ca Basho",
                ),
            ]
            return random.choice(haiku_fallbacks)

    async def draw_omikuji(
        self,
        req: OmikujiDrawRequest | None = None,
        *,
        provider: str | None = None,
        model: str | None = None,
    ) -> OmikujiFortuneResponse:
        """Draw an authentic AI Shinto Omikuji fortune."""
        ranks = ["大吉", "中吉", "小吉", "吉", "末吉"]
        weights = [0.30, 0.35, 0.20, 0.10, 0.05]
        selected_rank = random.choices(ranks, weights=weights)[0]

        clan = req.clan_id if req and req.clan_id else "sakura"
        focus_pool = [
            "bút đạo và liên kết câu", "ngữ pháp kính ngữ Keigo", "từ vựng biểu cảm thiên nhiên",
            "tốc độ viết và phản xạ", "cấu trúc luận điểm chặt chẽ", "nét chữ thanh tao"
        ]
        focus = req.study_focus if req and req.study_focus else random.choice(focus_pool)

        user_prompt = (
            f"Draw a sacred Shinto Omikuji fortune for a Japanese writing learner:\n"
            f"- Assigned Rank: {selected_rank}\n"
            f"- Scribe Clan: {clan}\n"
            f"- Focus: {focus}\n"
            "Provide the sacred oracle poem (Waka), Vietnamese poetic translation, specific writing advice (Writing, Grammar, Vocab, Persistence), Lucky Kanji, and Lucky Grammar."
        )

        try:
            result, _ = await self._ai.generate_structured(
                user_prompt,
                OmikujiFortuneResponse,
                system=OMIKUJI_SYSTEM_PROMPT,
                provider=provider,
                model=model,
            )
            return result  # type: ignore[return-value]
        except Exception:
            logger.exception("AI Omikuji draw failed, falling back to safe oracle")
            return OmikujiFortuneResponse(
                rank="大吉",
                rank_vi="Đại Cát · Rất May Mắn",
                buff="+20% EXP luyện tập hôm nay 🌟",
                exp_buff_percent=20,
                color="#fbbf24",
                waka_jp="雲晴れて 月の光の さやけきに 心の筆も 澄み渡りけり",
                waka_reading="くもはれて つきのひかりの さやけきに こころのふでも すみわたりけり",
                waka_vi="Mây tan trăng rọi sáng ngời,\nNgọn bút trong trẻo lòng người an yên.",
                writing_advice="Hôm nay tâm trí sáng tỏ, hãy thử sức viết những câu văn dài và biểu cảm phong phú.",
                grammar_advice="Tập trung vào liên kết câu tự nhiên (〜て、〜ながら).",
                vocab_advice="Ghi nhớ 3 từ vựng mới về cảm xúc và trạng thái thiên nhiên.",
                streak_advice="Giữ vững ngọn lửa kiên trì, từng nét bút sẽ đưa bạn đến đỉnh cao.",
                lucky_kanji="光",
                lucky_kanji_reading="ひかり (Hikari)",
                lucky_kanji_meaning="Ánh sáng, tương lai tươi sáng",
                lucky_grammar="〜はずだ (Chắc chắn là)",
                lucky_color="Vàng Hoàng Kim (金箔)",
            )

    async def get_kotowaza(
        self,
        req: KotowazaGenerateRequest | None = None,
        *,
        provider: str | None = None,
        model: str | None = None,
    ) -> KotowazaResponse:
        """Get or generate an inspiring Japanese Kotowaza / Yojijukugo."""
        categories = ["kiên trì", "học tập", "trí tuệ", "đời sống", "thiên nhiên", "tình bạn", "nghệ thuật", "thành công", "khiêm tốn"]
        cat_input = req.category if req and req.category and req.category.lower() not in ["all", "tất cả", "tự do", "ngẫu nhiên"] else None
        category = cat_input or random.choice(categories)
        jlpt = req.jlpt_level if req and req.jlpt_level and req.jlpt_level.lower() != "all" else random.choice(["N4-N3", "N3-N2", "N2-N1"])

        user_prompt = (
            f"Generate a culturally meaningful Japanese proverb (Kotowaza) or four-character idiom (Yojijukugo):\n"
            f"- Category focus: {category}\n"
            f"- Target Level: {jlpt}\n"
            "Provide Japanese expression, reading, literal meaning, Vietnamese equivalent proverb, historical background story, natural example sentence, and a short practice challenge.\n"
            "Ensure rich variety and profound cultural depth."
        )

        try:
            result, _ = await self._ai.generate_structured(
                user_prompt,
                KotowazaResponse,
                system=KOTOWAZA_SYSTEM_PROMPT,
                provider=provider,
                model=model,
            )
            return result  # type: ignore[return-value]
        except Exception:
            logger.exception("AI Kotowaza generation failed, falling back to classic proverb")
            kotowaza_fallback_pool = [
                KotowazaResponse(
                    expression_jp="猿も木から落ちる",
                    reading="さるもきからおちる (Saru mo ki kara ochiru)",
                    meaning_literal="Khỉ dù giỏi leo trèo cũng có khi ngã khỏi cây.",
                    vietnamese_equivalent="Nhân vô thập toàn (Thánh nhân cũng có khi nhầm / Giỏi đến mấy cũng có sơ suất).",
                    origin_story="Bắt nguồn từ quan sát thiên nhiên của người Nhật: loài khỉ vốn sinh ra trên cây nhưng vẫn có lúc sẩy chân. Dùng để an ủi và nhắc nhở rằng ai cũng có thể mắc lỗi.",
                    example_sentence_jp="ベテランの先生でも書き間違えることはあるよ。猿も木から落ちるだね。",
                    example_sentence_vi="Dù là giáo viên kỳ cựu thì cũng có lúc viết nhầm mà. Đúng là khỉ cũng có lúc ngã cây.",
                    practice_prompt="Hãy viết 1 câu tiếng Nhật an ủi một người bạn vừa làm bài chưa như ý.",
                    is_yojijukugo=False,
                ),
                KotowazaResponse(
                    expression_jp="石の上にも三年",
                    reading="いしのうえにもさんねん (Ishi no ue ni mo sannen)",
                    meaning_literal="Ngồi trên tảng đá lạnh 3 năm thì đá cũng ấm lên.",
                    vietnamese_equivalent="Có công mài sắt, có ngày nên kim.",
                    origin_story="Bắt nguồn từ câu chuyện thiền định kiên trì của các thiền sư, tượng trưng cho đức tính bền bỉ vượt qua gian khổ.",
                    example_sentence_jp="日本語の勉強は大変だけど、石の上にも三年だよ。",
                    example_sentence_vi="Học tiếng Nhật tuy vất vả nhưng kiên trì rồi cũng sẽ thành tài.",
                    practice_prompt="Hãy viết 1 câu chia sẻ về quá trình bạn kiên trì theo đuổi một mục tiêu.",
                    is_yojijukugo=False,
                ),
            ]
            return random.choice(kotowaza_fallback_pool)

    async def get_kitsune_dialogue(
        self,
        req: KitsuneDialogueRequest | None = None,
        *,
        provider: str | None = None,
        model: str | None = None,
    ) -> KitsuneDialogueResponse:
        """Get dynamic Kitsune companion dialogue."""
        streak = req.streak if req else 0
        completed = req.today_completed_count if req else 0
        clan = req.current_clan if req else "sakura"
        page = req.page_context if req and req.page_context else "dashboard"

        clan_vibes = {
            "sakura": "🌸 Hoa Anh Đào - Nhẹ nhàng, thi vị, Wabi-sabi",
            "ryu": "🐉 Thanh Long - Uy dũng, kỷ luật Samurai, tiến thủ",
            "tsuki": "🌙 Nguyệt Dạ - Trầm mặc, thiền định, sâu sắc",
            "raijin": "⚡ Lôi Thần - Tinh nghịch, chớp nhoáng, hóm hỉnh",
        }

        user_prompt = (
            f"Generate a spontaneous, authentic dialogue from Inari Kitsune:\n"
            f"- Scribe Clan: {clan} ({clan_vibes.get(clan, 'Hồ ly thần')})\n"
            f"- Streak: {streak} days\n"
            f"- Completed today: {completed} exercises\n"
            f"- Current Page Context: {page}\n"
            "Provide mood (happy/curious/encouraging/proud/thoughtful), friendly Vietnamese dialogue with Japanese charm, short Japanese phrase, and practical writing tip."
        )

        try:
            result, _ = await self._ai.generate_structured(
                user_prompt,
                KitsuneDialogueResponse,
                system=KITSUNE_SYSTEM_PROMPT,
                provider=provider,
                model=model,
            )
            return result  # type: ignore[return-value]
        except Exception:
            logger.exception("AI Kitsune dialogue failed, falling back to clan-themed default")
            clan_fallbacks = {
                "sakura": KitsuneDialogueResponse(
                    mood="happy",
                    message_vi="Chào bạn hiền! Từng nét bút hôm nay như cánh hoa anh đào đầu mùa, hãy cùng ta mài mực tĩnh tâm nhé! 🌸",
                    message_jp="花鳥風月、心静かに書こうコン！",
                    action_tip="Thử viết 1 câu miêu tả cảm xúc thanh thản với ngữ pháp 〜てみる.",
                ),
                "ryu": KitsuneDialogueResponse(
                    mood="encouraging",
                    message_vi="Đồng môn Long Môn! Ngòi bút là thanh kiếm, ý tứ là thần thái! Hôm nay quyết tâm chinh phục bài tập hóc búa nhất chứ? 🐉",
                    message_jp="不撓不屈の精神で挑もうコン！",
                    action_tip="Luyện viết đoạn văn lập luận với cấu trúc 〜べきだ hoặc 〜に違いない.",
                ),
                "tsuki": KitsuneDialogueResponse(
                    mood="thoughtful",
                    message_vi="Chào hiền đệ dưới ánh trăng. Tâm tĩnh thì nét chữ sáng, hãy lắng nghe âm vang của từng từ vựng cổ xưa nhé. 🌙",
                    message_jp="明鏡止水、心澄ませて書こうコン。",
                    action_tip="Thử dùng một từ láy tượng thanh tượng hình (Giongo/Gitaigo) để câu văn thêm chiều sâu.",
                ),
                "raijin": KitsuneDialogueResponse(
                    mood="proud",
                    message_vi="Haha Lôi Thần xuất kích! Nhanh như chớp, sắc như tia sét, hôm nay ta cùng nhau phá vỡ kỷ lục luyện viết nào! ⚡",
                    message_jp="電光石火、バリバリ書くコン！",
                    action_tip="Thử thách bấm giờ viết 3 câu hoàn chỉnh trong vòng 2 phút!",
                ),
            }
            return clan_fallbacks.get(clan, clan_fallbacks["sakura"])

    async def chat_kitsune(
        self,
        req: KitsuneChatRequest,
    ) -> KitsuneChatResponse:
        """Interactive multi-turn AI chat with Inari Kitsune."""
        clan = req.clan_id or "sakura"
        page = req.page_context or "general"
        streak = req.streak or 0

        # Build conversation summary/dialogue for structured prompt
        conv_text = "\n".join([f"{m.role.upper()}: {m.content}" for m in req.messages[-6:]])

        user_prompt = (
            f"Active Clan: {clan.upper()}\n"
            f"User Streak: {streak} days\n"
            f"Current Studio Context: {page}\n\n"
            f"Conversation history:\n{conv_text}\n\n"
            f"Please respond as Inari Kitsune according to your clan persona and calligraphy wisdom. "
            f"Include reply, mood, a relevant japanese_phrase, and 2-4 suggested_chips for follow-up."
        )

        try:
            result, _ = await self._ai.generate_structured(
                user_prompt,
                KitsuneChatResponse,
                system=KITSUNE_CHAT_SYSTEM_PROMPT,
                provider=req.provider,
                model=req.model,
            )
            return result  # type: ignore[return-value]
        except Exception:
            logger.exception("AI Kitsune chat failed, falling back to intelligent conversational default")
            last_msg = req.messages[-1].content.lower() if req.messages else ""
            if "đố" in last_msg or "kanji" in last_msg or "chữ hán" in last_msg:
                return KitsuneChatResponse(
                    reply="Ta có một câu đố chữ Hán thú vị cho bạn đây! 🦊✨\n\n"
                          "Chữ gì gồm bộ **Mộc (木 - Cây)** đứng cạnh bộ **Tử (子 - Đứa trẻ)**?\n"
                          "👉 Gợi ý: Đây là một loại quả mùa hè rất ngọt và cũng là họ rất phổ biến ở Đông Á!",
                    mood="curious",
                    japanese_phrase="李 (すもも / 李 - Quả mận)",
                    suggested_chips=["Đáp án là chữ Lý (李)!", "Cho ta câu đố khác", "Giải thích chiết tự chữ này"],
                )
            elif "ngữ pháp" in last_msg or "phân biệt" in last_msg:
                return KitsuneChatResponse(
                    reply="Về ngữ pháp, bí quyết của Bút Đạo là nắm rõ sắc thái biểu cảm! 📖\n\n"
                          "- **〜わけではない**: Phủ định một phần ('Không hẳn là / không phải lúc nào cũng...').\n"
                          "- **〜とは限らない**: Nhấn mạnh tính không tuyệt đối ('Không chắc chắn 100%...').\n\n"
                          "Bạn muốn thử đặt một câu với mẫu nào trước?",
                    mood="thoughtful",
                    japanese_phrase="文法の微妙なニュアンス (Sắc thái ngữ pháp)",
                    suggested_chips=["Cho ví dụ 〜わけではない", "Cho ví dụ 〜とは限らない", "Thử thách đặt câu"],
                )
            else:
                return KitsuneChatResponse(
                    reply=f"Tiểu hồ ly luôn ở đây cùng bạn trên con đường rèn bút! 🦊\n"
                          f"Hôm nay bạn đang muốn hỏi về ngữ pháp, tìm ý tưởng viết văn hay muốn ta đố vui chữ Hán?",
                    mood="happy",
                    japanese_phrase="継続は力なり (Kiên trì chính là sức mạnh)",
                    suggested_chips=["Gợi ý mở bài văn", "Đố vui chữ Hán", "Phân biệt ngữ pháp khó", "Bói quẻ hôm nay ⛩️"],
                )

