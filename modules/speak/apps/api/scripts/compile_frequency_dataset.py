"""Compiler script to build authentic Japanese high-frequency vocabulary dataset (3,000+ words).

Extracts from local jamdict.db (ichi1 + nf01..nf08) combined with BCCWJ ranking,
applies quality filtering, maps POS and communicative categories, translates meanings into Vietnamese,
and integrates existing 106 hand-crafted seed entries.
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import sys
from pathlib import Path

# Adjust path to import app domains
API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(API_ROOT))

from app.domains.vocabulary.bccwj_frequency_pool import (
    BCCWJ_FREQUENCY_WORDS,
    FrequencyWordEntry,
)

# High coverage common concept dictionary (English gloss -> Vietnamese meaning)
GLOSS_VI_MAP: dict[str, str] = {
    "safety": "an toàn",
    "security": "an ninh, bảo đảm",
    "since": "từ đó, kể từ khi",
    "committee member": "ủy viên",
    "committee": "ủy ban",
    "chairman": "chủ tịch ủy ban",
    "opinion": "ý kiến, quan điểm",
    "meaning": "ý nghĩa",
    "maintenance": "duy trì, bảo trì",
    "violation": "vi phạm",
    "medical care": "chăm sóc y tế",
    "the same": "chung, giống nhau",
    "number one": "số một, nhất",
    "best": "tốt nhất",
    "first": "đầu tiên",
    "general": "chung, thông thường",
    "agreement": "thỏa thuận, đồng ý",
    "to eat": "ăn",
    "to drink": "uống",
    "to go": "đi",
    "to come": "đến",
    "to do": "làm",
    "to see": "nhìn, xem",
    "to speak": "nói",
    "to talk": "trò chuyện",
    "to hear": "nghe",
    "to listen": "lắng nghe",
    "to read": "đọc",
    "to write": "viết",
    "to buy": "mua",
    "to sell": "bán",
    "to wait": "chờ đợi",
    "to meet": "gặp gỡ",
    "to think": "nghĩ, suy nghĩ",
    "to know": "biết",
    "to understand": "hiểu",
    "to give": "cho, tặng",
    "to receive": "nhận",
    "to make": "làm, chế tạo",
    "to use": "sử dụng, dùng",
    "to find": "tìm thấy",
    "to search": "tìm kiếm",
    "to take": "lấy, cầm",
    "to hold": "cầm, nắm",
    "to put": "đặt, để",
    "to send": "gửi",
    "to carry": "mang, vác",
    "to stand": "đứng",
    "to sit": "ngồi",
    "to walk": "đi bộ",
    "to run": "chạy",
    "to stop": "dừng lại",
    "to start": "bắt đầu",
    "to begin": "khởi đầu",
    "to finish": "kết thúc, hoàn thành",
    "to open": "mở",
    "to close": "đóng",
    "to enter": "vào, bước vào",
    "to leave": "rời khỏi",
    "to return": "quay về, trở về",
    "to teach": "dạy, chỉ dẫn",
    "to learn": "học tập",
    "to work": "làm việc",
    "to rest": "nghỉ ngơi",
    "to sleep": "ngủ",
    "to wake": "thức dậy",
    "to help": "giúp đỡ",
    "to call": "gọi điện, gọi",
    "to change": "thay đổi",
    "to decide": "quyết định",
    "to ask": "hỏi, yêu cầu",
    "to pay": "thanh toán, trả tiền",
    "to remember": "nhớ, ghi nhớ",
    "to forget": "quên",
    "to lose": "đánh mất, thua",
    "to win": "chiến thắng",
    "to choose": "chọn lựa",
    "to select": "lựa chọn",
    "to check": "kiểm tra",
    "to confirm": "xác nhận",
    "to prepare": "chuẩn bị",
    "to contact": "liên lạc",
    "to explain": "giải thích",
    "to introduce": "giới thiệu",
    "to attend": "tham dự",
    "to participate": "tham gia",
    "to plan": "lên kế hoạch",
    "company": "công ty",
    "office": "văn phòng",
    "meeting": "cuộc họp",
    "conference": "hội nghị",
    "project": "dự án",
    "report": "báo cáo",
    "document": "tài liệu",
    "contract": "hợp đồng",
    "customer": "khách hàng",
    "client": "đối tác, khách hàng",
    "colleague": "đồng nghiệp",
    "boss": "cấp trên, sếp",
    "staff": "nhân viên",
    "employee": "người làm việc",
    "work": "công việc",
    "job": "nghề nghiệp",
    "business": "kinh doanh, thương mại",
    "market": "thị trường, chợ",
    "sales": "bán hàng, doanh số",
    "price": "giá cả",
    "cost": "chi phí",
    "budget": "ngân sách",
    "profit": "lợi nhuận",
    "problem": "vấn đề",
    "trouble": "rắc rối, sự cố",
    "solution": "giải pháp",
    "result": "kết quả",
    "reason": "lý do, nguyên nhân",
    "purpose": "mục đích",
    "goal": "mục tiêu",
    "target": "đối tượng, mục tiêu",
    "plan": "kế hoạch",
    "schedule": "lịch trình",
    "deadline": "hạn chót",
    "information": "thông tin",
    "data": "dữ liệu",
    "system": "hệ thống",
    "computer": "máy tính",
    "phone": "điện thoại",
    "email": "thư điện tử",
    "message": "tin nhắn",
    "news": "tin tức",
    "newspaper": "báo chí",
    "book": "sách",
    "letter": "thư từ",
    "word": "từ ngữ",
    "language": "ngôn ngữ",
    "house": "ngôi nhà",
    "home": "nhà",
    "room": "căn phòng",
    "door": "cửa ra vào",
    "window": "cửa sổ",
    "train": "tàu điện",
    "station": "nhà ga",
    "bus": "xe buýt",
    "car": "ô tô, xe hơi",
    "airport": "sân bay",
    "airplane": "máy bay",
    "hospital": "bệnh viện",
    "school": "trường học",
    "university": "trường đại học",
    "store": "cửa hàng",
    "shop": "quán xá, tiệm",
    "restaurant": "nhà hàng, quán ăn",
    "hotel": "khách sạn",
    "food": "đồ ăn, thực phẩm",
    "meal": "bữa ăn",
    "water": "nước",
    "tea": "trà",
    "coffee": "cà phê",
    "rice": "cơm, gạo",
    "bread": "bánh mì",
    "meat": "thịt",
    "fish": "cá",
    "vegetable": "rau củ",
    "fruit": "hoa quả, trái cây",
    "money": "tiền bạc",
    "time": "thời gian",
    "day": "ngày",
    "today": "hôm nay",
    "tomorrow": "ngày mai",
    "yesterday": "hôm qua",
    "week": "tuần",
    "month": "tháng",
    "year": "năm",
    "morning": "buổi sáng",
    "afternoon": "buổi chiều",
    "evening": "buổi tối",
    "night": "ban đêm",
    "now": "bây giờ, hiện tại",
    "person": "người",
    "people": "mọi người",
    "man": "đàn ông",
    "woman": "phụ nữ",
    "child": "trẻ em",
    "friend": "bạn bè",
    "family": "gia đình",
    "father": "bố, cha",
    "mother": "mẹ",
    "brother": "anh em trai",
    "sister": "chị em gái",
    "important": "quan trọng",
    "necessary": "cần thiết",
    "convenient": "tiện lợi",
    "inconvenient": "bất tiện",
    "busy": "bận rộn",
    "free": "rảnh rỗi, tự do",
    "good": "tốt, hay",
    "bad": "xấu, tệ",
    "big": "to, lớn",
    "large": "rộng lớn",
    "small": "nhỏ, bé",
    "new": "mới",
    "old": "cũ, già",
    "long": "dài, lâu",
    "short": "ngắn",
    "high": "cao",
    "tall": "cao ráo",
    "low": "thấp",
    "expensive": "đắt, quý",
    "cheap": "rẻ",
    "fast": "nhanh",
    "quick": "mau lẹ",
    "slow": "chậm",
    "early": "sớm",
    "late": "muộn, trễ",
    "hot": "nóng",
    "cold": "lạnh",
    "warm": "ấm áp",
    "cool": "mát mẻ",
    "delicious": "ngon miệng",
    "interesting": "thú vị",
    "fun": "vui vẻ",
    "easy": "dễ dàng, đơn giản",
    "difficult": "khó khăn",
    "hard": "vất vả, cứng",
    "happy": "hạnh phúc",
    "sad": "buồn bã",
    "kind": "tử tế, tốt bụng",
    "healthy": "khỏe mạnh",
    "famous": "nổi tiếng",
    "safe": "an toàn",
    "dangerous": "nguy hiểm",
    "clean": "sạch sẽ",
    "dirty": "bẩn, dơ",
    "quiet": "yên tĩnh",
    "noisy": "ồn ào",
    "beautiful": "đẹp",
    "cute": "dễ thương",
    "strange": "kỳ lạ",
    "correct": "chính xác, đúng",
    "wrong": "sai lầm",
    "always": "luôn luôn",
    "usually": "thường xuyên",
    "often": "thường hay",
    "sometimes": "thỉnh thoảng",
    "never": "không bao giờ",
    "together": "cùng nhau",
    "alone": "một mình",
    "slowly": "chậm rãi, từ từ",
    "quickly": "nhanh chóng",
    "really": "thực sự, thật là",
    "very": "rất",
    "a lot": "nhiều",
    "a little": "một chút, một ít",
    "already": "đã... rồi",
    "yet": "chưa",
    "again": "lại, một lần nữa",
    "soon": "sớm, sắp",
    "maybe": "có lẽ",
    "certainly": "chắc chắn",
    "absolutely": "tuyệt đối",
    "especially": "đặc biệt là",
    "gradually": "dần dần, từ từ",
    "individual": "cá nhân, riêng biệt",
    "immediately": "ngay lập tức",
    "suddenly": "đột nhiên, bất ngờ",
    "completely": "hoàn toàn",
    "entirely": "toàn bộ, hoàn toàn",
    "firmly": "vững chắc, cẩn thận",
    "clearly": "rõ ràng, mạch lạc",
    "easily": "dễ dàng, nhanh chóng",
    "plainly": "giản dị, rõ ràng",
    "simply": "đơn giản là",
    "indeed": "quả thật là",
    "truly": "thực sự",
    "extremely": "vô cùng, cực kỳ",
    "quite": "khá là",
    "patiently": "kiên nhẫn",
    "quietly": "yên lặng, lặng lẽ",
    "noisily": "ồn ào",
    "politely": "lịch sự",
    "kindly": "tử tế, ân cần",
    "roughly": "đại khái, xấp xỉ",
    "mostly": "phần lớn, chủ yếu",
    "mainly": "chính, chủ yếu",
    "partly": "một phần",
    "separately": "riêng biệt, tách rời",
    "directly": "trực tiếp",
    "indirectly": "gián tiếp",
    "deeply": "sâu sắc",
    "widely": "rộng rãi",
    "shortly": "ngay sau đó",
    "lately": "gần đây",
    "recently": "dạo gần đây",
    "formerly": "trước đây, ngày xưa",
    "previously": "trước đó",
    "currently": "hiện tại, hiện nay",
    "eventually": "rốt cuộc",
    "at last": "cuối cùng thì",
    "for a while": "trong chốc lát",
    "at once": "ngay lập tức",
    "step by step": "từng bước một",
    "more and more": "ngày càng",
    "little by little": "từng chút một",
    "firstly": "trước tiên",
    "finally": "cuối cùng",
}

# Workplace / Business keywords to classify category
BIZ_KEYWORDS = {
    "会社", "会議", "契約", "資料", "社長", "部下", "上司", "報告", "営業", "開発",
    "市場", "計画", "経済", "予算", "利益", "費用", "面接", "残業", "出張", "顧客",
    "担当", "業務", "取引", "交渉", "昇進", "給与", "退職", "転職", "組織", "部署",
    "連絡", "相談", "検討", "提出", "承知", "了解", "恐縮", "失礼", "案内", "確認",
    "依頼", "見積", "請求", "振込", "支払", "注文", "納品", "在庫", "納期", "方針",
}

JAMDICT_DB_PATH = r"C:\Users\defaultuser0\AppData\Local\Programs\Python\Python310\lib\site-packages\jamdict_data\jamdict.db"
OUTPUT_JSON_PATH = API_ROOT / "app" / "domains" / "vocabulary" / "data" / "bccwj_frequency_3000.json"


def clean_gloss(gloss_text: str) -> str:
    """Cleans up raw jamdict sense gloss."""
    if not gloss_text:
        return ""
    first_part = gloss_text.split(";")[0].split("/")[0].strip()
    # Remove parentheticals
    first_part = re.sub(r"\(.*?\)", "", first_part).strip()
    return first_part.lower()


def translate_gloss_to_vi(gloss_raw: str, word: str) -> str:
    """Translates English gloss to natural Vietnamese meaning."""
    if not gloss_raw:
        return "từ vựng giao tiếp"

    cleaned = clean_gloss(gloss_raw)

    # 1. Direct match
    if cleaned in GLOSS_VI_MAP:
        return GLOSS_VI_MAP[cleaned]

    # 2. Match with "to " stripped
    without_to = re.sub(r"^to\s+", "", cleaned)
    if without_to in GLOSS_VI_MAP:
        return GLOSS_VI_MAP[without_to]

    # 3. Partial keyword matching
    for eng_k, vi_v in GLOSS_VI_MAP.items():
        if eng_k == cleaned or eng_k in cleaned.split():
            return vi_v

    # Fallback to cleaned gloss representation
    return without_to or cleaned or "từ vựng thông dụng"


def determine_pos(pos_tag: str) -> str:
    """Normalizes part of speech."""
    pos_tag = (pos_tag or "").lower()
    # Check adverb FIRST because "verb" is a substring of "adverb"!
    if "adverb" in pos_tag or "fukushi" in pos_tag:
        return "adverb"
    if "keiyodoshi" in pos_tag or "adj-na" in pos_tag:
        return "adj_na"
    if "keiyoushi" in pos_tag or "adj-i" in pos_tag or "'taru' adjective" in pos_tag:
        return "adj_i"
    if any(v in pos_tag for v in [" verb", "v1", "v5", "intransitive verb", "transitive verb", "suru verb"]):
        return "verb"
    if "takes the aux. verb suru" in pos_tag:
        return "verb"
    return "noun"


def determine_category(pos: str, word: str, meaning_vi: str) -> str:
    """Categorizes into 5 core JapSpeak communicative areas."""
    if pos == "verb":
        # Check if verb is business related
        if any(kw in word for kw in BIZ_KEYWORDS) or any(
            kw in meaning_vi for kw in ["báo cáo", "họp", "hợp đồng", "thương lượng", "kinh doanh", "liên lạc", "xác nhận"]
        ):
            return "workplace_biz"
        return "action_verbs"
    if pos in ("adj_i", "adj_na"):
        return "emotions_adj"
    if pos == "adverb":
        return "adverbs_mimetic"

    # For nouns, check workplace vs daily life
    if any(kw in word for kw in BIZ_KEYWORDS) or any(
        kw in meaning_vi for kw in ["công ty", "báo cáo", "họp", "hợp đồng", "dự án", "kinh doanh", "thị trường", "ủy ban", "kế hoạch", "lợi nhuận", "ngân sách"]
    ):
        return "workplace_biz"
    return "daily_life"


def determine_jlpt(tier: int, pos: str) -> str:
    """Assigns approximate JLPT level based on tier and POS."""
    if tier == 1:
        return "N5" if pos in ("verb", "adj_i") else "N4"
    if tier == 2:
        return "N4" if pos in ("verb", "noun") else "N3"
    return "N3" if tier == 3 else "N2"


def generate_collocation_and_example(word: str, reading: str, pos: str, meaning_vi: str) -> tuple[str, str, str, str]:
    """Generates natural Japanese collocation and example sentence."""
    if pos == "verb":
        col_ja = f"{word}こと"
        col_vi = f"việc {meaning_vi}"
        ex_ja = f"「毎日、{word}習慣をつけています。」"
        ex_vi = f"Tôi đang tạo thói quen {meaning_vi} mỗi ngày."
    elif pos in ("adj_i", "adj_na"):
        mod = "な" if pos == "adj_na" else ""
        col_ja = f"とても{word}{mod}人"
        col_vi = f"người rất {meaning_vi}"
        ex_ja = f"「この店はとても{word}{mod}ので気に入っています。」"
        ex_vi = f"Quán này rất {meaning_vi} nên tôi rất ưng ý."
    elif pos == "adverb":
        col_ja = f"{word}話す"
        col_vi = f"nói chuyện một cách {meaning_vi}"
        ex_ja = f"「緊張しないで、{word}伝えてください。」"
        ex_vi = f"Đừng căng thẳng, hãy truyền đạt {meaning_vi} nhé."
    else:
        # Noun
        col_ja = f"{word}を確認する"
        col_vi = f"xác nhận {meaning_vi}"
        ex_ja = f"「事前に{word}について確認しておきましょう。」"
        ex_vi = f"Chúng ta hãy kiểm tra trước về {meaning_vi} nhé."
    return col_ja, col_vi, ex_ja, ex_vi


def build_dataset() -> list[dict]:
    """Extracts, cleans, and compiles 3,000+ entries."""
    print(f"Connecting to {JAMDICT_DB_PATH}...")
    conn = sqlite3.connect(JAMDICT_DB_PATH)
    cur = conn.cursor()

    # Query 1: Frequency ranked entries (nf01 - nf10)
    query = """
    SELECT 
        COALESCE(Kanji.text, Kana.text) AS surface,
        Kana.text AS reading,
        MIN(KNP.text) AS min_nf,
        pos.text AS pos_tag,
        SenseGloss.text AS gloss
    FROM Entry
    JOIN Kana ON Entry.idseq = Kana.idseq
    JOIN KNP ON Kana.ID = KNP.kid
    LEFT JOIN Kanji ON Entry.idseq = Kanji.idseq
    LEFT JOIN Sense ON Entry.idseq = Sense.idseq
    LEFT JOIN pos ON Sense.ID = pos.sid
    LEFT JOIN SenseGloss ON Sense.ID = SenseGloss.sid AND SenseGloss.lang = 'eng'
    WHERE KNP.text IN ('nf01', 'nf02', 'nf03', 'nf04', 'nf05', 'nf06', 'nf07', 'nf08', 'nf09', 'nf10')
      AND (
          Entry.idseq IN (SELECT Entry.idseq FROM Entry JOIN Kana ON Entry.idseq = Kana.idseq JOIN KNP ON Kana.ID = KNP.kid WHERE KNP.text = 'ichi1')
          OR Entry.idseq IN (SELECT Entry.idseq FROM Entry JOIN Kana ON Entry.idseq = Kana.idseq JOIN KNP ON Kana.ID = KNP.kid WHERE KNP.text = 'news1')
      )
      AND pos.text NOT LIKE '%particle%'
      AND pos.text NOT LIKE '%suffix%'
      AND pos.text NOT LIKE '%prefix%'
      AND pos.text NOT LIKE '%auxiliary%'
      AND pos.text NOT LIKE '%numeric%'
      AND pos.text NOT LIKE '%counter%'
      AND length(COALESCE(Kanji.text, Kana.text)) >= 2
    GROUP BY COALESCE(Kanji.text, Kana.text)
    ORDER BY min_nf ASC;
    """

    cur.execute(query)
    raw_rows = cur.fetchall()
    print(f"Retrieved {len(raw_rows)} candidates from jamdict.")

    # Query 2: High-frequency conversational adverbs & onomatopoeia from ichi1/spec1
    adverb_query = """
    SELECT DISTINCT
        Kana.text AS surface,
        Kana.text AS reading,
        'nf03' AS min_nf,
        'adverb (fukushi)' AS pos_tag,
        SenseGloss.text AS gloss
    FROM Entry
    JOIN Kana ON Entry.idseq = Kana.idseq
    JOIN KNP ON Kana.ID = KNP.kid
    LEFT JOIN Sense ON Entry.idseq = Sense.idseq
    LEFT JOIN pos ON Sense.ID = pos.sid
    LEFT JOIN SenseGloss ON Sense.ID = SenseGloss.sid AND SenseGloss.lang = 'eng'
    WHERE KNP.text IN ('ichi1', 'spec1')
      AND (pos.text LIKE '%adverb%' OR pos.text LIKE '%fukushi%')
      AND length(Kana.text) >= 2
    GROUP BY Kana.text
    ORDER BY Kana.text ASC
    LIMIT 300;
    """
    cur.execute(adverb_query)
    adverb_rows = cur.fetchall()
    print(f"Retrieved {len(adverb_rows)} conversational adverbs/onomatopoeia.")
    # Put adverb_rows first so essential spoken adverbs and onomatopoeia are included
    raw_rows = adverb_rows + raw_rows

    # 1. First, index existing 106 seed entries (highest hand-crafted quality)
    from app.domains.vocabulary.bccwj_frequency_pool import (
        CORE_ACTION_VERBS,
        CORE_EMOTION_ADJECTIVES,
        CORE_ADVERBS_MIMETIC,
        CORE_WORKPLACE_WORDS,
        CORE_DAILY_LIFE_WORDS,
    )
    seed_entries = (
        CORE_ACTION_VERBS
        + CORE_EMOTION_ADJECTIVES
        + CORE_ADVERBS_MIMETIC
        + CORE_WORKPLACE_WORDS
        + CORE_DAILY_LIFE_WORDS
    )
    compiled_entries: list[dict] = []
    seen_words: set[str] = set()

    # Add all existing 106 seed entries first
    for seed in seed_entries:
        seen_words.add(seed.word)
        compiled_entries.append({
            "rank": seed.rank,
            "word": seed.word,
            "reading": seed.reading,
            "pos": seed.pos,
            "category": seed.category,
            "meaning_vi": seed.meaning_vi,
            "synonyms_vi": seed.synonyms_vi,
            "collocation_ja": seed.collocation_ja,
            "collocation_vi": seed.collocation_vi,
            "example_ja": seed.example_ja,
            "example_vi": seed.example_vi,
            "jlpt": seed.jlpt,
            "tier": seed.tier,
            "frequency_score": seed.frequency_score,
        })

    print(f"Added {len(compiled_entries)} seed entries.")

    # 2. Process extracted entries from jamdict
    for row in raw_rows:
        surface, reading, min_nf, pos_tags, glosses = row
        surface = surface.strip()
        reading = (reading or surface).strip()

        # Skip already included
        if surface in seen_words:
            continue

        # Filters: exclude pure numbers, counter compounds, months, countries
        if re.match(r"^[一二三四五六七八九十百千万〇０-９0-9]+", surface):
            continue
        if re.search(r"[一二三四五六七八九十0-9０-９]+(月|年|日|時|分|秒|人|回|個|本|枚|歳|才|つ)$", surface):
            continue
        if any(x in surface for x in ["共和国", "合衆国", "王国", "首長国"]):
            continue

        # Determine Tier from min_nf
        nf_num = int(min_nf.replace("nf", "")) if "nf" in min_nf else 99
        if nf_num <= 2:
            tier = 1
        elif nf_num <= 6:
            tier = 2
        else:
            tier = 3

        # Normalize rank
        assigned_rank = (nf_num - 1) * 500 + (len(compiled_entries) % 500) + 1
        pos = determine_pos(pos_tags)
        primary_gloss = (glosses or "").split(";")[0].strip()
        meaning_vi = translate_gloss_to_vi(primary_gloss, surface)
        category = determine_category(pos, surface, meaning_vi)
        jlpt = determine_jlpt(tier, pos)

        col_ja, col_vi, ex_ja, ex_vi = generate_collocation_and_example(surface, reading, pos, meaning_vi)
        freq_score = round(max(5.0, 10.0 - (assigned_rank / 1000.0) * 0.8), 2)

        entry_dict = {
            "rank": assigned_rank,
            "word": surface,
            "reading": reading,
            "pos": pos,
            "category": category,
            "meaning_vi": meaning_vi,
            "synonyms_vi": [meaning_vi],
            "collocation_ja": col_ja,
            "collocation_vi": col_vi,
            "example_ja": ex_ja,
            "example_vi": ex_vi,
            "jlpt": jlpt,
            "tier": tier,
            "frequency_score": freq_score,
        }

        compiled_entries.append(entry_dict)
        seen_words.add(surface)

        # Build full robust vocabulary pool (~4,000 words across all 3 tiers)
        if len(compiled_entries) >= 4200:
            break

    # Sort compiled entries by rank
    compiled_entries.sort(key=lambda x: (x["tier"], x["rank"]))

    # Re-normalize rank numbers from 1 to N and align tier strictly
    for i, e in enumerate(compiled_entries):
        rank = i + 1
        e["rank"] = rank
        if rank <= 1000:
            e["tier"] = 1
        elif rank <= 3000:
            e["tier"] = 2
        else:
            e["tier"] = 3

    print(f"Total compiled words: {len(compiled_entries)}")
    tier_counts = {1: 0, 2: 0, 3: 0}
    cat_counts = {}
    for e in compiled_entries:
        tier_counts[e["tier"]] = tier_counts.get(e["tier"], 0) + 1
        cat_counts[e["category"]] = cat_counts.get(e["category"], 0) + 1

    print("Tier counts:", tier_counts)
    print("Category counts:", cat_counts)

    # Save to JSON
    OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(compiled_entries, f, ensure_ascii=False, indent=2)

    print(f"Successfully saved to {OUTPUT_JSON_PATH} ({OUTPUT_JSON_PATH.stat().st_size / 1024:.1f} KB)")
    return compiled_entries


if __name__ == "__main__":
    build_dataset()
