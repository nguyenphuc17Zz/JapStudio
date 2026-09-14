"""Interpret seed pools — 30 curated VI prompts (12 word + 9 sentence + 9 situation).

50/50 workplace + daily life (Tet, office, family, travel).
Small explicit seed only; infinite variety via dynamic_generator.py (AI).
Each item carries expected_ja_keywords so fidelity checks cost zero tokens.
"""

from __future__ import annotations

from typing import Any

WORD_SEEDS: list[dict[str, Any]] = [
    {"prompt_vi": "xin nghỉ phép", "expected_ja_keywords": ["休暇", "取る"], "reference_ja": "休暇を取ります",
     "topic": "workplace", "relation": "business_polite"},
    {"prompt_vi": "nộp báo cáo", "expected_ja_keywords": ["報告", "提出"], "reference_ja": "報告書を提出します",
     "topic": "workplace", "relation": "business_polite"},
    {"prompt_vi": "họp khẩn", "expected_ja_keywords": ["緊急", "会議"], "reference_ja": "緊急会議があります",
     "topic": "workplace", "relation": "business_polite"},
    {"prompt_vi": "deadline trễ", "expected_ja_keywords": ["納期", "遅れる"], "reference_ja": "納期が遅れています",
     "topic": "workplace", "relation": "business_polite"},
    {"prompt_vi": "tăng ca", "expected_ja_keywords": ["残業"], "reference_ja": "残業します",
     "topic": "workplace", "relation": "business_polite"},
    {"prompt_vi": "đi công tác", "expected_ja_keywords": ["出張"], "reference_ja": "出張に行きます",
     "topic": "workplace", "relation": "business_polite"},
    {"prompt_vi": "Tết Nguyên Đán", "expected_ja_keywords": ["テト", "旧正月"], "reference_ja": "テト(旧正月)です",
     "topic": "tet_holiday", "relation": "casual_friend"},
    {"prompt_vi": "bánh chưng", "expected_ja_keywords": ["バインチュン", "ちまき"], "reference_ja": "バインチュンというちまきです",
     "topic": "tet_holiday", "relation": "casual_friend"},
    {"prompt_vi": "lì xì", "expected_ja_keywords": ["お年玉"], "reference_ja": "お年玉です",
     "topic": "tet_holiday", "relation": "casual_friend"},
    {"prompt_vi": "đón giao thừa", "expected_ja_keywords": ["大晦日", "迎える"], "reference_ja": "大晦日を迎えます",
     "topic": "tet_holiday", "relation": "casual_friend"},
    {"prompt_vi": "kẹt xe giờ cao điểm", "expected_ja_keywords": ["渋滞", "ラッシュ"], "reference_ja": "ラッシュの渋滞です",
     "topic": "daily_life", "relation": "casual_friend"},
    {"prompt_vi": "quán ăn vỉa hè", "expected_ja_keywords": ["屋台"], "reference_ja": "屋台です",
     "topic": "daily_life", "relation": "casual_friend"},
]

SENTENCE_SEEDS: list[dict[str, Any]] = [
    {"prompt_vi": "Sáng nay tàu trễ nên tôi muộn giờ làm.", "expected_ja_keywords": ["今朝", "電車", "遅れる", "遅刻"],
     "reference_ja": "今朝電車が遅れちゃって、会社に遅刻しちゃった。", "topic": "daily_life", "relation": "casual_friend"},
    {"prompt_vi": "Cuối tuần này bạn có rảnh không? Đi ăn ramen nhé.", "expected_ja_keywords": ["週末", "暇", "ラーメン"],
     "reference_ja": "今週末暇？ラーメン食べに行こうよ。", "topic": "daily_life", "relation": "casual_friend"},
    {"prompt_vi": "Phim hôm qua xem với bạn hay lắm, muốn xem lại.", "expected_ja_keywords": ["昨日", "映画", "友達", "面白い"],
     "reference_ja": "昨日友達と見た映画がめっちゃ面白くて、また見たいな。", "topic": "daily_life", "relation": "casual_friend"},
    {"prompt_vi": "Nếu rẻ thì mua, đắt quá thì thôi.", "expected_ja_keywords": ["安い", "買う", "高い"],
     "reference_ja": "安かったら買うけど、高かったらやめとく。", "topic": "daily_life", "relation": "casual_friend"},
    {"prompt_vi": "Tôi đã kiểm tra tài liệu, ngày mai sẽ nộp.", "expected_ja_keywords": ["資料", "確認", "明日", "提出"],
     "reference_ja": "資料を確認しましたので、明日提出いたします。", "topic": "workplace", "relation": "business_polite"},
    {"prompt_vi": "Tiến độ trễ 3 ngày, thành thật xin lỗi.", "expected_ja_keywords": ["納期", "遅延", "申し訳"],
     "reference_ja": "納期が3日遅れる見込みで、誠に申し訳ございません。", "topic": "workplace", "relation": "business_polite"},
    {"prompt_vi": "Cuộc họp tuần sau vào chiều thứ Ba có được không?", "expected_ja_keywords": ["来週", "会議", "火曜", "午後"],
     "reference_ja": "来週の会議は火曜の午後でよろしいでしょうか。", "topic": "workplace", "relation": "business_polite"},
    {"prompt_vi": "Mẹ tôi nấu phở ngon lắm, hôm nào mời bạn qua ăn.", "expected_ja_keywords": ["母", "フォー", "美味しい", "招待"],
     "reference_ja": "うちの母のフォーがめっちゃ美味しいから、今度食べにおいでよ。", "topic": "family", "relation": "casual_friend"},
    {"prompt_vi": "Tết này công ty nghỉ từ 28 đến mùng 5.", "expected_ja_keywords": ["テト", "休み", "28日", "5日"],
     "reference_ja": "今年のテト休暇は28日から5日までです。", "topic": "tet_holiday", "relation": "business_polite"},
]

SITUATION_SEEDS: list[dict[str, Any]] = [
    {"prompt_vi": "Sếp Nhật hỏi: Tết này nghỉ mấy ngày? Hãy giải thích lịch nghỉ Tết của công ty.",
     "expected_ja_keywords": ["テト", "休暇", "から", "まで"], "reference_ja": "今年のテト休暇は28日から5日までとなります。",
     "topic": "tet_holiday", "relation": "business_polite"},
    {"prompt_vi": "Khách Nhật hỏi bánh chưng là gì? Hãy giải thích ngắn gọn.",
     "expected_ja_keywords": ["バインチュン", "ちまき", "もち米"], "reference_ja": "バインチュンはもち米のちまきで、テトに食べます。",
     "topic": "tet_holiday", "relation": "business_polite"},
    {"prompt_vi": "Xin sếp cho nghỉ phép 2 ngày tuần sau vì việc gia đình.",
     "expected_ja_keywords": ["休暇", "申請", "家庭", "事情"], "reference_ja": "家庭の事情で来週2日ほど休暇をいただけないでしょうか。",
     "topic": "workplace", "relation": "business_polite"},
    {"prompt_vi": "Báo với sếp là deadline trễ 2 ngày và đưa hướng xử lý.",
     "expected_ja_keywords": ["納期", "遅延", "対応", "申し訳"], "reference_ja": "納期が2日遅れる見込みです。対応策としては〜。申し訳ございません。",
     "topic": "workplace", "relation": "business_polite"},
    {"prompt_vi": "Mời đồng nghiệp Nhật cuối tuần đi ăn quán vỉa hè Việt Nam.",
     "expected_ja_keywords": ["週末", "屋台", "行こう"], "reference_ja": "週末、ベトナムの屋台に食べに行こうよ。",
     "topic": "daily_life", "relation": "casual_friend"},
    {"prompt_vi": "Giải thích cho bạn Nhật vì sao đường Sài Gòn hay kẹt xe.",
     "expected_ja_keywords": ["バイク", "多い", "渋滞"], "reference_ja": "サイゴンはバイクが多すぎて、よく渋滞するんだよ。",
     "topic": "daily_life", "relation": "casual_friend"},
    {"prompt_vi": "Rủ bạn Nhật về quê ăn Tết, mô tả không khí.",
     "expected_ja_keywords": ["田舎", "テト", "賑やか"], "reference_ja": "テトに田舎に帰ろうよ、めっちゃ賑やかだよ。",
     "topic": "tet_holiday", "relation": "casual_friend"},
    {"prompt_vi": "Hỏi đường ra ga trung tâm khi đi du lịch Tokyo.",
     "expected_ja_keywords": ["駅", "行き方", "教えて"], "reference_ja": "すみません、中央駅への行き方を教えていただけますか。",
     "topic": "travel", "relation": "business_polite"},
    {"prompt_vi": "Khen món ăn vợ đồng nghiệp Nhật nấu trong bữa tiệc.",
     "expected_ja_keywords": ["美味しい", "ごちそう", "ありがとう"], "reference_ja": "めっちゃ美味しいです！ごちそうさまでした。",
     "topic": "daily_life", "relation": "casual_friend"},
]

# Vietglish pitfall detectors (deterministic, policy <300 lines)
# Each: (flag_id, hint_vi, test_fn)
VIETGLISH_RULES: list[dict[str, Any]] = [
    {"id": "watashi_overuse", "hint": "Lạm dụng 私は — spoken Japanese thường lược chủ ngữ"},
    {"id": "svo_carryover", "hint": "Trật tự SVO kiểu Việt — Nhật là SOV (を/に trước động từ)"},
    {"id": "missing_particle", "hint": "Thiếu trợ từ は/が/を/に/で"},
    {"id": "desu_overuse_casual", "hint": "です/ます với bạn bè nghe xa cách — dùng thể thường + よ/ね"},
    {"id": "literal_roi_ma_thi", "hint": "Dịch逐字 rồi/mà/thì — Nhật dùng て/ので/relative clause"},
]

_WATASHI_RE_HELP = "watashi"


def detect_vietglish(transcript: str, relation: str | None) -> list[str]:
    """Deterministic Vietglish flags. Conservative: only flag clear patterns."""
    import re

    flags: list[str] = []
    t = transcript or ""
    if not t:
        return flags
    if t.count("私") >= 2 or t.count("わたし") >= 2:
        flags.append("watashi_overuse")
    # SVO carryover: を/に object AFTER the main verb (verb before object with no second clause)
    # Heuristic: sentence ends with noun-ish after verb without nominalizer
    if re.search(r"(食べます|見ます|行きます|します|です)\s*[a-zA-Z\u4e00-\u9fff]+$", t):
        flags.append("svo_carryover")
    # Missing particle: long sentence with no core particles at all
    if len(t) >= 10 and not any(p in t for p in ("は", "が", "を", "に", "で", "へ", "と", "も")):
        flags.append("missing_particle")
    if relation == "casual_friend" and ("です" in t or "ます" in t) and not any(
        m in t for m in ("てる", "ちゃう", "じゃん", "だよ", "だね", "なんだ", "よ", "ね")
    ):
        flags.append("desu_overuse_casual")
    # Literal Vietnamese fillers transliterated
    if any(w in t for w in ("ロイ", "ティ", "マー")):
        flags.append("literal_roi_ma_thi")
    return flags


def _kw_hit(transcript: str, kw: str) -> bool:
    """Substring match + 2-char stem + verb-conjugation stem (取る matches 取り)."""
    import re

    if not kw:
        return False
    if kw in transcript:
        return True
    if len(kw) > 2 and kw[:2] in transcript:
        return True
    # Verb conjugation: stem must be followed by kana (取 + り in 取り)
    if len(kw) >= 2 and kw[-1] in "うくすつぬぶむる":
        if re.search(re.escape(kw[:-1]) + r"[ぁ-んァ-ン]", transcript):
            return True
    return False


def fidelity_of(transcript: str, expected_keywords: list[str]) -> tuple[list[str], list[str], list[dict[str, Any]]]:
    """Returns (hit, missing, fidelity_map[{idea_vi, hit, evidence}])."""
    hit, missing, fmap = [], [], []
    for kw in expected_keywords or []:
        found = _kw_hit(transcript, kw)
        (hit if found else missing).append(kw)
        fmap.append({"idea_vi": kw, "hit": found, "evidence": f"found '{kw}'" if found else f"missing '{kw}'"})
    return hit, missing, fmap


def get_seed_pool(sub_mode: str) -> list[dict[str, Any]]:
    if sub_mode == "interpret_sentence":
        return SENTENCE_SEEDS
    if sub_mode == "interpret_situation":
        return SITUATION_SEEDS
    return WORD_SEEDS
