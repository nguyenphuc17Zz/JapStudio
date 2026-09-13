"""Pitch exercise factory — small composable pools, not giant DB, provider-driven where possible."""

from __future__ import annotations

import random
from typing import Any

from app.domains.pitch.resource_provider import get_pitch_provider
from app.domains.vocabulary.frequency_service import get_frequency_vocabulary_service

# Comprehensive pitch & phonetic pools (25+ real-world Japanese words/pairs)
MINIMAL_PAIRS_EXAMPLE = [
    {"a": "雨", "b": "飴", "reading": "あめ", "a_accent": "atamadaka", "b_accent": "heiban", "meaning_a": "Cơn mưa", "meaning_b": "Viên kẹo"},
    {"a": "箸", "b": "橋", "reading": "はし", "a_accent": "atamadaka", "b_accent": "odaka", "meaning_a": "Đôi đũa", "meaning_b": "Cây cầu"},
    {"a": "酒", "b": "鮭", "reading": "さけ", "a_accent": "heiban", "b_accent": "atamadaka", "meaning_a": "Rượu sake", "meaning_b": "Cá hồi"},
    {"a": "柿", "b": "牡蠣", "reading": "かき", "a_accent": "heiban", "b_accent": "atamadaka", "meaning_a": "Quả hồng", "meaning_b": "Con hàu"},
    {"a": "白", "b": "城", "reading": "しろ", "a_accent": "atamadaka", "b_accent": "heiban", "meaning_a": "Màu trắng", "meaning_b": "Lâu đài"},
    {"a": "雲", "b": "蜘蛛", "reading": "くも", "a_accent": "atamadaka", "b_accent": "heiban", "meaning_a": "Đám mây", "meaning_b": "Con nhện"},
    {"a": "今", "b": "居間", "reading": "いま", "a_accent": "atamadaka", "b_accent": "heiban", "meaning_a": "Bây giờ", "meaning_b": "Phòng khách"},
    {"a": "花", "b": "鼻", "reading": "はな", "a_accent": "odaka", "b_accent": "heiban", "meaning_a": "Bông hoa", "meaning_b": "Cái mũi"},
    {"a": "神", "b": "紙", "reading": "かみ", "a_accent": "atamadaka", "b_accent": "odaka", "meaning_a": "Thần linh", "meaning_b": "Tờ giấy"},
    {"a": "秋", "b": "空き", "reading": "あき", "a_accent": "atamadaka", "b_accent": "heiban", "meaning_a": "Mùa thu", "meaning_b": "Chỗ trống"},
    {"a": "昼", "b": "蛭", "reading": "ひる", "a_accent": "odaka", "b_accent": "atamadaka", "meaning_a": "Buổi trưa", "meaning_b": "Con đỉa"},
    {"a": "線", "b": "栓", "reading": "せん", "a_accent": "atamadaka", "b_accent": "heiban", "meaning_a": "Tuyến đường", "meaning_b": "Nút chai"},
    {"a": "猫", "b": "根子", "reading": "ねこ", "a_accent": "atamadaka", "b_accent": "heiban", "meaning_a": "Con mèo", "meaning_b": "Gốc rễ"},
    {"a": "春", "b": "張る", "reading": "はる", "a_accent": "atamadaka", "b_accent": "heiban", "meaning_a": "Mùa xuân", "meaning_b": "Kéo căng"},
    {"a": "冬", "b": "拭ゆ", "reading": "ふゆ", "a_accent": "odaka", "b_accent": "heiban", "meaning_a": "Mùa đông", "meaning_b": "Lau chùi"},
    {"a": "海", "b": "膿", "reading": "うみ", "a_accent": "atamadaka", "b_accent": "heiban", "meaning_a": "Biển cả", "meaning_b": "Mủ vết thương"},
    {"a": "山", "b": "止む", "reading": "やま", "a_accent": "odaka", "b_accent": "heiban", "meaning_a": "Ngọn núi", "meaning_b": "Ngừng lại"},
    {"a": "川", "b": "皮", "reading": "かわ", "a_accent": "odaka", "b_accent": "heiban", "meaning_a": "Dòng sông", "meaning_b": "Lớp da"},
    {"a": "足", "b": "葦", "reading": "あし", "a_accent": "odaka", "b_accent": "heiban", "meaning_a": "Bàn chân", "meaning_b": "Cây lau sậy"},
    {"a": "目", "b": "芽", "reading": "め", "a_accent": "atamadaka", "b_accent": "heiban", "meaning_a": "Đôi mắt", "meaning_b": "Mầm cây"},
    {"a": "手", "b": "照る", "reading": "て", "a_accent": "atamadaka", "b_accent": "heiban", "meaning_a": "Bàn tay", "meaning_b": "Chiếu sáng"},
    {"a": "歯", "b": "葉", "reading": "は", "a_accent": "atamadaka", "b_accent": "heiban", "meaning_a": "Răng", "meaning_b": "Lá cây"},
    {"a": "木", "b": "気", "reading": "き", "a_accent": "atamadaka", "b_accent": "heiban", "meaning_a": "Cây cối", "meaning_b": "Tâm trạng"},
]

MORA_PAIRS_EXAMPLE = [
    {"short": "おじさん", "long": "おじいさん", "type": "Trường âm (長音)", "short_meaning": "Chú / Bác", "long_meaning": "Ông cụ"},
    {"short": "おばさん", "long": "おばあさん", "type": "Trường âm (長音)", "short_meaning": "Cô / Dì", "long_meaning": "Bà cụ"},
    {"short": "きて", "long": "きって", "type": "Âm ngắt (促音)", "short_meaning": "Hãy đến", "long_meaning": "Con tem"},
    {"short": "さか", "long": "さっか", "type": "Âm ngắt (促音)", "short_meaning": "Con dốc", "long_meaning": "Nhà văn"},
    {"short": "ビル", "long": "ビール", "type": "Trường âm (長音)", "short_meaning": "Tòa nhà", "long_meaning": "Bia"},
    {"short": "ゆき", "long": "ゆうき", "type": "Trường âm (長音)", "short_meaning": "Tuyết", "long_meaning": "Dũng khí"},
    {"short": "とり", "long": "とおり", "type": "Trường âm (長音)", "short_meaning": "Con chim", "long_meaning": "Con đường"},
    {"short": "ここ", "long": "こうこう", "type": "Trường âm (長音)", "short_meaning": "Ở đây", "long_meaning": "Trường cấp 3"},
    {"short": "とる", "long": "とおる", "type": "Trường âm (長音)", "short_meaning": "Cầm / Lấy", "long_meaning": "Đi ngang qua"},
    {"short": "へや", "long": "へいや", "type": "Trường âm (長音)", "short_meaning": "Căn phòng", "long_meaning": "Đồng bằng"},
    {"short": "すし", "long": "すうし", "type": "Trường âm (長音)", "short_meaning": "Món sushi", "long_meaning": "Từ chỉ số lượng"},
    {"short": "せき", "long": "せっき", "type": "Âm ngắt (促音)", "short_meaning": "Cơn ho / Chỗ ngồi", "long_meaning": "Thời đồ đá"},
    {"short": "まき", "long": "まっき", "type": "Âm ngắt (促音)", "short_meaning": "Củi đốt", "long_meaning": "Giai đoạn cuối"},
    {"short": "かこ", "long": "かっこ", "type": "Âm ngắt (促音)", "short_meaning": "Quá khứ", "long_meaning": "Dấu ngoặc đơn"},
    {"short": "いけん", "long": "いっけん", "type": "Âm ngắt (促音)", "short_meaning": "Ý kiến", "long_meaning": "Một căn nhà"},
    {"short": "はけん", "long": "はっけん", "type": "Âm ngắt (促音)", "short_meaning": "Phái cử (Haken)", "long_meaning": "Phát hiện"},
    {"short": "ぶか", "long": "ぶっか", "type": "Âm ngắt (促音)", "short_meaning": "Cấp dưới", "long_meaning": "Vật giá"},
    {"short": "きそ", "long": "きっそう", "type": "Âm ngắt (促音)", "short_meaning": "Cơ sở", "long_meaning": "Tin vui"},
]

DEVOICING_EXAMPLE = [
    {"word": "です", "reading": "です", "devoiced": "す", "meaning": "Là (trợ từ kết thúc)"},
    {"word": "ました", "reading": "ました", "devoiced": "し", "meaning": "Đã (quá khứ lịch sự)"},
    {"word": "すきです", "reading": "すきです", "devoiced": "す", "meaning": "Tôi thích"},
    {"word": "つき", "reading": "つき", "devoiced": "つ", "meaning": "Mặt trăng"},
    {"word": "ききます", "reading": "ききます", "devoiced": "き", "meaning": "Nghe / Hỏi"},
    {"word": "ふたつ", "reading": "ふたつ", "devoiced": "ふ", "meaning": "Hai cái"},
    {"word": "しちがつ", "reading": "しちがつ", "devoiced": "し", "meaning": "Tháng 7"},
    {"word": "くさ", "reading": "くさ", "devoiced": "く", "meaning": "Cỏ dại"},
    {"word": "たくさん", "reading": "たくさん", "devoiced": "く", "meaning": "Nhiều"},
    {"word": "した", "reading": "した", "devoiced": "し", "meaning": "Bên dưới"},
    {"word": "くつ", "reading": "くつ", "devoiced": "く", "meaning": "Đôi giày"},
    {"word": "ふく", "reading": "ふく", "devoiced": "ふ", "meaning": "Quần áo"},
    {"word": "きせつ", "reading": "きせつ", "devoiced": "き", "meaning": "Mùa trong năm"},
    {"word": "しけん", "reading": "しけん", "devoiced": "し", "meaning": "Kỳ thi"},
    {"word": "すいぞくかん", "reading": "すいぞくかん", "devoiced": "く", "meaning": "Thủy cung"},
    {"word": "ちかてつ", "reading": "ちかてつ", "devoiced": "ち", "meaning": "Tàu điện ngầm"},
    {"word": "きく", "reading": "きく", "devoiced": "き", "meaning": "Nghe"},
    {"word": "ふね", "reading": "ふね", "devoiced": "ふ", "meaning": "Con thuyền"},
    {"word": "たいせつ", "reading": "たいせつ", "devoiced": "つ", "meaning": "Quan trọng"},
]

CONTOUR_WORDS = [
    {"word": "日本語", "reading": "にほんご", "type": "平板型 [0]", "pattern": ["L", "H", "H", "H"], "meaning": "Tiếng Nhật"},
    {"word": "ありがとう", "reading": "ありがとう", "type": "中高型 [2]", "pattern": ["L", "H", "L", "L", "L"], "meaning": "Cảm ơn"},
    {"word": "はじめまして", "reading": "はじめまして", "type": "中高型 [4]", "pattern": ["L", "H", "H", "H", "L", "L"], "meaning": "Rất vui được gặp bạn"},
    {"word": "すし", "reading": "すし", "type": "頭高型 [1]", "pattern": ["H", "L"], "meaning": "Món sushi"},
    {"word": "ねこ", "reading": "ねこ", "type": "頭高型 [1]", "pattern": ["H", "L"], "meaning": "Con mèo"},
    {"word": "やま", "reading": "やま", "type": "尾高型 [2]", "pattern": ["L", "H"], "meaning": "Ngọn núi"},
    {"word": "東京", "reading": "とうきょう", "type": "平板型 [0]", "pattern": ["L", "H", "H", "H"], "meaning": "Tokyo"},
    {"word": "先生", "reading": "せんせい", "type": "中高型 [3]", "pattern": ["L", "H", "H", "L"], "meaning": "Thầy cô giáo"},
    {"word": "本", "reading": "ほん", "type": "頭高型 [1]", "pattern": ["H", "L"], "meaning": "Quyển sách"},
    {"word": "友達", "reading": "ともだち", "type": "平板型 [0]", "pattern": ["L", "H", "H", "H"], "meaning": "Bạn bè"},
    {"word": "飛行機", "reading": "ひこうき", "type": "中高型 [2]", "pattern": ["L", "H", "L", "L"], "meaning": "Máy bay"},
    {"word": "電話", "reading": "でんわ", "type": "平板型 [0]", "pattern": ["L", "H", "H"], "meaning": "Điện thoại"},
    {"word": "大学生", "reading": "だいがくせい", "type": "平板型 [0]", "pattern": ["L", "H", "H", "H", "H"], "meaning": "Sinh viên đại học"},
    {"word": "雨", "reading": "あめ", "type": "頭高型 [1]", "pattern": ["H", "L"], "meaning": "Cơn mưa"},
    {"word": "飴", "reading": "あめ", "type": "平板型 [0]", "pattern": ["L", "H"], "meaning": "Viên kẹo"},
]

_PITCH_MINIMAL_QUEUE: list[dict[str, Any]] = []
_PITCH_MORA_QUEUE: list[dict[str, Any]] = []
_PITCH_DEVOICING_QUEUE: list[dict[str, Any]] = []
_PITCH_CONTOUR_QUEUE: list[dict[str, Any]] = []

TIMER_DEFAULTS = {
    "pitch_minimal_pair": 4000,
    "mora_length": 5000,
    "vowel_devoicing": 5000,
    "pitch_contour": 6000,
    "pitch_recognition": 4000,
}


def _get_next_pitch_minimal() -> dict[str, Any]:
    global _PITCH_MINIMAL_QUEUE
    if not _PITCH_MINIMAL_QUEUE:
        _PITCH_MINIMAL_QUEUE = random.sample(MINIMAL_PAIRS_EXAMPLE, len(MINIMAL_PAIRS_EXAMPLE))
    return _PITCH_MINIMAL_QUEUE.pop(0)


def _get_next_pitch_mora() -> dict[str, Any]:
    global _PITCH_MORA_QUEUE
    if not _PITCH_MORA_QUEUE:
        _PITCH_MORA_QUEUE = random.sample(MORA_PAIRS_EXAMPLE, len(MORA_PAIRS_EXAMPLE))
    return _PITCH_MORA_QUEUE.pop(0)


def _get_next_pitch_devoicing() -> dict[str, Any]:
    global _PITCH_DEVOICING_QUEUE
    if not _PITCH_DEVOICING_QUEUE:
        _PITCH_DEVOICING_QUEUE = random.sample(DEVOICING_EXAMPLE, len(DEVOICING_EXAMPLE))
    return _PITCH_DEVOICING_QUEUE.pop(0)


def _get_next_pitch_contour() -> dict[str, Any]:
    global _PITCH_CONTOUR_QUEUE
    if not _PITCH_CONTOUR_QUEUE:
        _PITCH_CONTOUR_QUEUE = random.sample(CONTOUR_WORDS, len(CONTOUR_WORDS))
    return _PITCH_CONTOUR_QUEUE.pop(0)


def compute_pitch_mora_helpers(
    reading: str,
    pitch_pattern: list[str],
    downstep_index: int = 0,
) -> tuple[list[dict[str, Any]], str]:
    """Splits Hiragana reading into mora breakdown and produces visual pitch notation."""
    moras: list[str] = []
    i = 0
    sokuon_small = set("ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ")
    while i < len(reading):
        ch = reading[i]
        if i + 1 < len(reading) and reading[i + 1] in sokuon_small:
            moras.append(ch + reading[i + 1])
            i += 2
        else:
            moras.append(ch)
            i += 1

    breakdown: list[dict[str, Any]] = []
    notation_parts: list[str] = []
    for idx, m in enumerate(moras):
        level = pitch_pattern[idx] if idx < len(pitch_pattern) else ("H" if idx > 0 else "L")
        is_downstep = (idx + 1 == downstep_index) if downstep_index > 0 else False
        breakdown.append({
            "mora": m,
            "level": level,
            "index": idx + 1,
            "is_downstep": is_downstep,
        })
        if is_downstep:
            notation_parts.append(f"[{m}]＼")
        elif level == "H":
            notation_parts.append(f"[{m}]")
        else:
            notation_parts.append(m)

    return breakdown, "".join(notation_parts)


def format_accent_label(accent_type: str | None, drop_location: int | None = 0) -> str:
    acc = (accent_type or "").lower()
    if acc == "heiban":
        return "平板型 [0]"
    elif acc == "atamadaka":
        return "頭高型 [1]"
    elif acc == "nakadaka":
        return f"中高型 [{drop_location or 2}]"
    elif acc == "odaka":
        return f"尾高型 [{drop_location or 'N'}]"
    return "平板型 [0]"


class PitchExerciseFactory:
    def __init__(self):
        self.provider = get_pitch_provider()
        self.freq_service = get_frequency_vocabulary_service()

    def generate_minimal_pair(self, difficulty: str = "normal", pressure_level: str = "normal", **kwargs) -> dict[str, Any]:
        pair = _get_next_pitch_minimal()
        a_entry = self.provider.lookup(pair["a"])
        b_entry = self.provider.lookup(pair["b"])
        return {
            "title": f"Minimal Pair: {pair['a']} vs {pair['b']}",
            "objective": f"Phân biệt {pair['a']} ({pair['a_accent']}) vs {pair['b']} ({pair['b_accent']}) cùng đọc {pair['reading']}",
            "scenario": f"Nghe {pair['a']} và {pair['b']} — cùng đọc {pair['reading']} nhưng cao độ khác nhau.",
            "instructions": "Nghe A/B, chọn đúng theo nghĩa, hoặc nói lại với cao độ đúng. Chú ý relative pitch, không phải Hz tuyệt đối.",
            "prompt": f"{pair['a']} / {pair['b']}",
            "pair": pair,
            "reading": pair["reading"],
            "a_accent": a_entry.pattern if a_entry else [],
            "b_accent": b_entry.pattern if b_entry else [],
            "canonical": pair["a"],
            "accepted": [pair["a"], pair["b"]],
            "alternatives": [],
            "resource_source": a_entry.source if a_entry else "unknown",
            "timer_limit_ms": TIMER_DEFAULTS["pitch_minimal_pair"],
            "difficulty": difficulty,
            "pressure_level": pressure_level,
            "constraints": ["Chú ý cao độ tương đối, không so Hz tuyệt đối"],
            "target_patterns": [pair["a"], pair["b"]],
            "estimated_minutes": 4,
        }

    def generate_mora_length(self, difficulty: str = "normal", pressure_level: str = "normal", **kwargs) -> dict[str, Any]:
        pair = _get_next_pitch_mora()
        prov = self.provider
        short_mora = prov.get_mora(pair["short"])
        long_mora = prov.get_mora(pair["long"])
        return {
            "title": f"Mora Length: {pair['short']} vs {pair['long']}",
            "objective": f"Phân biệt độ dài mora {pair['type']}",
            "scenario": f"Cặp từ khác số mora: {pair['short']} ({len(short_mora)} mora) vs {pair['long']} ({len(long_mora)} mora)",
            "instructions": "Nghe và nói đúng số mora, giữ timing đều, không kéo/dừng sai.",
            "prompt": f"{pair['short']} / {pair['long']}",
            "pair": pair,
            "short_mora": short_mora,
            "long_mora": long_mora,
            "canonical": pair["long"],
            "accepted": [pair["short"], pair["long"]],
            "alternatives": [],
            "timer_limit_ms": TIMER_DEFAULTS["mora_length"],
            "difficulty": difficulty,
            "pressure_level": pressure_level,
            "constraints": ["Chuẩn hóa theo speech rate, không so ms tuyệt đối"],
            "target_patterns": [pair["short"], pair["long"]],
            "estimated_minutes": 4,
        }

    def generate_devoicing(
        self,
        difficulty: str = "normal",
        pressure_level: str = "normal",
        tier: int | None = None,
        category: str | None = None,
        **kwargs,
    ) -> dict[str, Any]:
        dev_entry = None
        try:
            dev_entry = self.freq_service.get_next_devoicing_word(category=category, tier=tier)
        except Exception:
            pass

        if dev_entry:
            word = dev_entry["word"]
            reading = dev_entry["reading"]
            devoiced = dev_entry["devoiced_mora"]
            meaning = dev_entry["meaning_vi"]
            expl = dev_entry["explanation"]
            rank = dev_entry.get("rank")
            tier_num = dev_entry.get("tier")
            vocab_cat = dev_entry.get("category")
        else:
            item = _get_next_pitch_devoicing()
            word = item["word"]
            reading = item.get("reading", word)
            devoiced = item["devoiced"]
            meaning = item.get("meaning", "Từ có nguyên âm vô thanh")
            expl = f"Nguyên âm trong phách '{devoiced}' thả lỏng dây thanh để âm thoát tự nhiên."
            rank = None
            tier_num = None
            vocab_cat = None

        entry = self.provider.lookup(word)
        pattern = entry.pattern if entry and entry.pattern else ["L"] + ["H"] * max(1, len(reading) - 1)
        mora_breakdown, downstep_notation = compute_pitch_mora_helpers(reading, pattern, 0)

        rank_badge = f" (Rank #{rank})" if rank else ""
        return {
            "title": f"Devoicing: {word}{rank_badge}",
            "objective": f"Luyện vô thanh hóa phách '{devoiced}' trong từ '{word}' ({meaning})",
            "scenario": f"Từ {word} ({reading}) • {expl}",
            "instructions": f"Nói tự nhiên, thả lỏng dây thanh ở âm '{devoiced}'. Nghĩa: {meaning}",
            "prompt": word,
            "reading": reading,
            "canonical": word,
            "accepted": [word, reading],
            "acceptable_variants": [word, reading],
            "translation": meaning,
            "devoicing_env": True,
            "pitch_pattern": pattern,
            "pattern": pattern,
            "downstep_index": 0,
            "downstep_notation": downstep_notation,
            "mora_breakdown": mora_breakdown,
            "devoicing_info": {
                "devoiced_mora": devoiced,
                "explanation": expl,
                "meaning": meaning,
                "rank": rank,
                "tier": tier_num,
            },
            "pitfall_vi": f"Tránh phát âm rõ ràng nguyên âm ở âm '{devoiced}'. Hãy thả lỏng thanh quản để âm gió xì ra tự nhiên.",
            "frequency_rank": rank,
            "frequency_tier": tier_num,
            "vocab_category": vocab_cat,
            "timer_limit_ms": TIMER_DEFAULTS["vowel_devoicing"],
            "difficulty": difficulty,
            "pressure_level": pressure_level,
            "constraints": ["Tập trung vào energy/voicing, không cố gượng ép"],
            "target_patterns": [word],
            "estimated_minutes": 4,
        }

    def generate_contour(
        self,
        difficulty: str = "normal",
        pressure_level: str = "normal",
        tier: int | None = None,
        category: str | None = None,
        **kwargs,
    ) -> dict[str, Any]:
        word_entry = None
        try:
            word_entry = self.freq_service.get_next_contour_word(category=category, tier=tier)
        except Exception:
            pass

        if word_entry:
            word = word_entry.word
            reading = word_entry.reading
            meaning = word_entry.meaning_vi
            rank = word_entry.rank
            tier_num = word_entry.tier
            vocab_cat = word_entry.category
            collocation = word_entry.collocation_ja
            example = word_entry.example_ja
        else:
            item = _get_next_pitch_contour()
            word = item["word"]
            reading = item.get("reading", word)
            meaning = item.get("meaning", "Từ vựng tiếng Nhật")
            rank = None
            tier_num = None
            vocab_cat = None
            collocation = ""
            example = ""

        entry = self.provider.lookup(word)
        if entry:
            pattern = entry.pattern or ["L", "H"]
            mora_count = entry.mora_count or max(1, len(reading))
            acc_type_val = entry.accent_type.value if hasattr(entry.accent_type, "value") else str(entry.accent_type)
            drop_loc = entry.drop_location
            source = entry.source
        else:
            pattern = ["L", "H"]
            mora_count = max(1, len(reading))
            acc_type_val = "heiban"
            drop_loc = None
            source = "default"

        acc_type_label = format_accent_label(acc_type_val, drop_loc)
        mora_breakdown, downstep_notation = compute_pitch_mora_helpers(reading, pattern, drop_loc or 0)

        rank_badge = f" (Rank #{rank})" if rank else ""
        return {
            "title": f"Pitch Contour: {word}{rank_badge}",
            "objective": f"Tập đường cao độ {acc_type_label} cho '{word}' ({mora_count} phách)",
            "scenario": f"Từ vựng: {word} ({reading}) — {acc_type_label} ({meaning})",
            "instructions": f"Theo dõi đường cao độ ({'-'.join(pattern)}) và phát âm chuẩn: '{word}'",
            "prompt": word,
            "reading": reading,
            "canonical": word,
            "accepted": [word, reading],
            "acceptable_variants": [word, reading],
            "translation": meaning,
            "mora_count": mora_count,
            "pitch_pattern": pattern,
            "pattern": pattern,
            "accent_type": acc_type_label,
            "drop_location": drop_loc,
            "downstep_index": drop_loc or 0,
            "downstep_notation": downstep_notation,
            "mora_breakdown": mora_breakdown,
            "pitfall_vi": f"Quy tắc cao độ Tokyo: Phách thứ 1 và thứ 2 luôn lệch cao độ (L-H hoặc H-L). Hãy chú ý nấc hạ giọng ở phách {drop_loc if drop_loc else 'không hạ (Heiban)'}.",
            "contour_info": {
                "accent_type": acc_type_label,
                "pattern": pattern,
                "drop_position": drop_loc or 0,
                "meaning": meaning,
                "rank": rank,
                "tier": tier_num,
                "collocation": collocation,
                "example": example,
            },
            "frequency_rank": rank,
            "frequency_tier": tier_num,
            "vocab_category": vocab_cat,
            "resource_source": source,
            "timer_limit_ms": TIMER_DEFAULTS["pitch_contour"],
            "difficulty": difficulty,
            "pressure_level": pressure_level,
            "constraints": ["Lên xuống cao độ rõ ràng theo từng phách"],
            "target_patterns": [word],
            "estimated_minutes": 4,
        }

    def generate_recognition(
        self,
        difficulty: str = "normal",
        pressure_level: str = "normal",
        tier: int | None = None,
        category: str | None = None,
        **kwargs,
    ) -> dict[str, Any]:
        use_bccwj = (tier is not None or category is not None or random.random() < 0.5)
        if use_bccwj:
            try:
                word_entry = self.freq_service.get_next_contour_word(category=category, tier=tier)
                entry = self.provider.lookup(word_entry.word)
                pattern = entry.pattern if entry else ["L", "H"]
                acc_type_val = entry.accent_type.value if entry and hasattr(entry.accent_type, "value") else "heiban"
                acc_type_label = format_accent_label(acc_type_val, entry.drop_location if entry else 0)
                mora_breakdown, downstep_notation = compute_pitch_mora_helpers(word_entry.reading, pattern, entry.drop_location if entry else 0)

                quiz_options = [
                    {
                        "option_id": "A",
                        "key": "A",
                        "word": word_entry.word,
                        "meaning": word_entry.meaning_vi,
                        "accent_type": acc_type_label,
                        "is_correct": True,
                    },
                    {
                        "option_id": "B",
                        "key": "B",
                        "word": f"{word_entry.word} (Đối lập)",
                        "meaning": f"Kiểu cao độ đảo ngược: {'-'.join(['H' if p=='L' else 'L' for p in pattern])}",
                        "accent_type": "頭高型 [1]" if "平板" in acc_type_label else "平板型 [0]",
                        "is_correct": False,
                    }
                ]
                return {
                    "title": f"Recognition: {word_entry.reading}",
                    "objective": f"Nghe và nhận biết cao độ chuẩn của '{word_entry.word}' ({acc_type_label})",
                    "scenario": f"Từ vựng: {word_entry.word} ({word_entry.reading}) — {word_entry.meaning_vi}",
                    "instructions": "Nghe phát âm và chọn đáp án có cao độ và nghĩa chính xác nhất.",
                    "prompt": word_entry.word,
                    "reading": word_entry.reading,
                    "canonical": word_entry.word,
                    "accepted": [word_entry.word],
                    "acceptable_variants": [word_entry.word, word_entry.reading],
                    "translation": word_entry.meaning_vi,
                    "pitch_pattern": pattern,
                    "mora_breakdown": mora_breakdown,
                    "downstep_notation": downstep_notation,
                    "quiz_options": quiz_options,
                    "recognition_info": {
                        "word": word_entry.word,
                        "reading": word_entry.reading,
                        "correct_accent": acc_type_label,
                        "meaning": word_entry.meaning_vi,
                        "rank": word_entry.rank,
                        "tier": word_entry.tier,
                    },
                    "frequency_rank": word_entry.rank,
                    "frequency_tier": word_entry.tier,
                    "vocab_category": word_entry.category,
                    "timer_limit_ms": TIMER_DEFAULTS["pitch_recognition"],
                    "difficulty": difficulty,
                    "pressure_level": pressure_level,
                    "constraints": ["Chọn đúng cao độ"],
                    "target_patterns": [word_entry.word],
                    "estimated_minutes": 3,
                }
            except Exception:
                pass

        pair = _get_next_pitch_minimal()
        correct = random.choice([pair["a"], pair["b"]])
        incorrect = pair["b"] if correct == pair["a"] else pair["a"]
        corr_accent = pair["a_accent"] if correct == pair["a"] else pair["b_accent"]
        incorr_accent = pair["b_accent"] if correct == pair["a"] else pair["a_accent"]
        corr_meaning = pair["meaning_a"] if correct == pair["a"] else pair["meaning_b"]
        incorr_meaning = pair["meaning_b"] if correct == pair["a"] else pair["meaning_a"]

        return {
            "title": f"Recognition: {pair['reading']}",
            "objective": f"Nghe và chọn đúng từ {pair['a']}/{pair['b']}",
            "scenario": f"Nghe một trong hai: {pair['a']} vs {pair['b']} (cùng đọc {pair['reading']})",
            "instructions": "Nghe A/B và chọn đáp án đúng, không cần ghi âm ở bước này.",
            "prompt": f"{pair['a']} vs {pair['b']}",
            "pair": pair,
            "correct": correct,
            "canonical": correct,
            "accepted": [correct],
            "acceptable_variants": [correct],
            "alternatives": [pair["a"], pair["b"]],
            "quiz_options": [
                {"option_id": "A", "key": "A", "word": correct, "meaning": corr_meaning, "accent_type": corr_accent, "is_correct": True},
                {"option_id": "B", "key": "B", "word": incorrect, "meaning": incorr_meaning, "accent_type": incorr_accent, "is_correct": False},
            ],
            "timer_limit_ms": TIMER_DEFAULTS["pitch_recognition"],
            "difficulty": difficulty,
            "pressure_level": pressure_level,
            "constraints": ["Chọn đúng cao độ"],
            "target_patterns": [correct],
            "estimated_minutes": 3,
        }

    def generate(self, sub_mode: str, **kwargs) -> dict[str, Any]:
        if sub_mode == "pitch_minimal_pair":
            return self.generate_minimal_pair(**kwargs)
        if sub_mode == "mora_length":
            return self.generate_mora_length(**kwargs)
        if sub_mode == "vowel_devoicing":
            return self.generate_devoicing(**kwargs)
        if sub_mode == "pitch_contour":
            return self.generate_contour(**kwargs)
        if sub_mode == "pitch_recognition":
            return self.generate_recognition(**kwargs)
        return self.generate_minimal_pair(**kwargs)
