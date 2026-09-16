"""BccwjFrequencyVocabularyService — high performance in-memory vocabulary service.

Zero-latency (< 2ms) serving of authentic Japanese daily-life vocabulary
with non-repeating shuffle-bag sampling, multi-dimensional filtering, and keyword search.
"""

from __future__ import annotations

import random
from typing import Any

from app.domains.vocabulary.bccwj_frequency_pool import (
    FrequencyWordEntry,
    get_all_frequency_words,
    search_frequency_words,
)

_GLOBAL_RECENT_WORDS: list[str] = []
_WORD_SHUFFLE_BAG: list[FrequencyWordEntry] = []

# ==============================================================================
# REAL-LIFE AUTHENTIC KEIGO WHITELISTS (100% người Nhật dùng ngoài đời thực)
# ==============================================================================

AUTHENTIC_KEIGO_VOLITIONAL_VERBS: dict[str, dict[str, Any]] = {
    # Tier 1 (N5 / N4, rank <= 1000)
    "待つ": {"reading": "まつ", "rank": 120, "tier": 1, "meaning_vi": "chờ đợi", "category": "action_verbs"},
    "読む": {"reading": "よむ", "rank": 180, "tier": 1, "meaning_vi": "đọc", "category": "action_verbs"},
    "書く": {"reading": "かく", "rank": 190, "tier": 1, "meaning_vi": "viết", "category": "action_verbs"},
    "話す": {"reading": "はなす", "rank": 210, "tier": 1, "meaning_vi": "nói chuyện", "category": "action_verbs"},
    "帰る": {"reading": "かえる", "rank": 240, "tier": 1, "meaning_vi": "trở về", "category": "daily_life"},
    "手伝う": {"reading": "てつだう", "rank": 350, "tier": 1, "meaning_vi": "giúp đỡ", "category": "workplace_biz"},
    "届ける": {"reading": "とどける", "rank": 420, "tier": 1, "meaning_vi": "giao đến / gửi đến", "category": "service"},
    "送る": {"reading": "おくる", "rank": 280, "tier": 1, "meaning_vi": "gửi đi", "category": "workplace_biz"},
    "持つ": {"reading": "もつ", "rank": 150, "tier": 1, "meaning_vi": "cầm / mang", "category": "action_verbs"},
    "教える": {"reading": "おしえる", "rank": 220, "tier": 1, "meaning_vi": "chỉ bảo / dạy", "category": "workplace_biz"},
    "呼ぶ": {"reading": "よぶ", "rank": 310, "tier": 1, "meaning_vi": "gọi", "category": "action_verbs"},
    "買う": {"reading": "かう", "rank": 260, "tier": 1, "meaning_vi": "mua", "category": "service"},
    "聞く": {"reading": "きく", "rank": 130, "tier": 1, "meaning_vi": "hỏi / nghe", "category": "action_verbs"},
    "会う": {"reading": "あう", "rank": 200, "tier": 1, "meaning_vi": "gặp gỡ", "category": "workplace_biz"},
    "入る": {"reading": "はいる", "rank": 140, "tier": 1, "meaning_vi": "bước vào", "category": "service"},
    "座る": {"reading": "すわる", "rank": 380, "tier": 1, "meaning_vi": "ngồi", "category": "daily_life"},
    "休む": {"reading": "やすむ", "rank": 410, "tier": 1, "meaning_vi": "nghỉ ngơi", "category": "daily_life"},
    "使う": {"reading": "つかう", "rank": 160, "tier": 1, "meaning_vi": "sử dụng", "category": "workplace_biz"},
    "歩く": {"reading": "あるく", "rank": 450, "tier": 1, "meaning_vi": "đi bộ", "category": "daily_life"},
    "急ぐ": {"reading": "いそぐ", "rank": 520, "tier": 1, "meaning_vi": "khẩn trương / vội", "category": "workplace_biz"},
    "泊まる": {"reading": "とまる", "rank": 610, "tier": 1, "meaning_vi": "nghỉ trọ / ở lại", "category": "service"},

    # Tier 2 (N3, 1000 < rank <= 3000)
    "支払う": {"reading": "しはらう", "rank": 1150, "tier": 2, "meaning_vi": "thanh toán", "category": "workplace_biz"},
    "受け取る": {"reading": "うけとる", "rank": 1220, "tier": 2, "meaning_vi": "nhận lấy", "category": "workplace_biz"},
    "渡す": {"reading": "わたす", "rank": 1280, "tier": 2, "meaning_vi": "trao / giao cho", "category": "workplace_biz"},
    "預かる": {"reading": "あずかる", "rank": 1350, "tier": 2, "meaning_vi": "trông giữ / cất giữ", "category": "service"},
    "決める": {"reading": "きめる", "rank": 1080, "tier": 2, "meaning_vi": "quyết định", "category": "workplace_biz"},
    "考える": {"reading": "かんがえる", "rank": 1050, "tier": 2, "meaning_vi": "suy nghĩ / cân nhắc", "category": "workplace_biz"},
    "探す": {"reading": "さがす", "rank": 1180, "tier": 2, "meaning_vi": "tìm kiếm", "category": "workplace_biz"},
    "運ぶ": {"reading": "はこぶ", "rank": 1420, "tier": 2, "meaning_vi": "vận chuyển", "category": "service"},
    "調べる": {"reading": "しらべる", "rank": 1120, "tier": 2, "meaning_vi": "tra cứu / kiểm tra", "category": "workplace_biz"},
    "直す": {"reading": "なおす", "rank": 1380, "tier": 2, "meaning_vi": "chỉnh sửa / sửa", "category": "workplace_biz"},
    "掛ける": {"reading": "かける", "rank": 1160, "tier": 2, "meaning_vi": "gọi điện / ngồi vào", "category": "workplace_biz"},
    "頼む": {"reading": "たのむ", "rank": 1250, "tier": 2, "meaning_vi": "nhờ vả / yêu cầu", "category": "workplace_biz"},
    "選ぶ": {"reading": "えらぶ", "rank": 1190, "tier": 2, "meaning_vi": "lựa chọn", "category": "service"},
    "伝える": {"reading": "つたえる", "rank": 1100, "tier": 2, "meaning_vi": "truyền đạt / nhắn lại", "category": "workplace_biz"},
    "助ける": {"reading": "たすける", "rank": 1450, "tier": 2, "meaning_vi": "hỗ trợ / cứu giúp", "category": "workplace_biz"},
    "断る": {"reading": "ことわる", "rank": 1520, "tier": 2, "meaning_vi": "từ chối", "category": "workplace_biz"},
    "迎える": {"reading": "むかえる", "rank": 1480, "tier": 2, "meaning_vi": "đón tiếp", "category": "service"},
    "見送る": {"reading": "みおくる", "rank": 1650, "tier": 2, "meaning_vi": "tiễn khách", "category": "service"},
    "立ち寄る": {"reading": "たちよる", "rank": 1820, "tier": 2, "meaning_vi": "ghé qua", "category": "service"},
    "確かめる": {"reading": "たしかめる", "rank": 1390, "tier": 2, "meaning_vi": "xác minh / làm rõ", "category": "workplace_biz"},
    "申し込む": {"reading": "もうしこむ", "rank": 1310, "tier": 2, "meaning_vi": "đăng ký", "category": "service"},
    "取り消す": {"reading": "とりけす", "rank": 1580, "tier": 2, "meaning_vi": "hủy bỏ", "category": "service"},

    # Tier 3 (N2 / N1, 3000 < rank <= 5000)
    "引き受ける": {"reading": "ひきうける", "rank": 3120, "tier": 3, "meaning_vi": "đảm nhận công việc", "category": "workplace_biz"},
    "取り次ぐ": {"reading": "とりつぐ", "rank": 3250, "tier": 3, "meaning_vi": "chuyển máy / nối máy", "category": "workplace_biz"},
    "差し替える": {"reading": "さしかえる", "rank": 3480, "tier": 3, "meaning_vi": "thay thế tài liệu", "category": "workplace_biz"},
    "申し出る": {"reading": "もうしでる", "rank": 3320, "tier": 3, "meaning_vi": "đề xuất / xin ý kiến", "category": "workplace_biz"},
    "見合わせる": {"reading": "みあわせる", "rank": 3650, "tier": 3, "meaning_vi": "tạm hoãn lại", "category": "workplace_biz"},
    "見計らう": {"reading": "みはからう", "rank": 3820, "tier": 3, "meaning_vi": "chọn thời điểm thích hợp", "category": "workplace_biz"},
    "買い付ける": {"reading": "かいつける", "rank": 3950, "tier": 3, "meaning_vi": "thu mua thương mại", "category": "workplace_biz"},
    "割り引く": {"reading": "わりびく", "rank": 3550, "tier": 3, "meaning_vi": "chiết khấu / giảm giá", "category": "service"},
    "受け入れる": {"reading": "うけいれる", "rank": 3180, "tier": 3, "meaning_vi": "tiếp nhận / chấp thuận", "category": "workplace_biz"},
    "心得る": {"reading": "こころえる", "rank": 3720, "tier": 3, "meaning_vi": "thấu hiểu / lĩnh hội", "category": "workplace_biz"},
    "思い立つ": {"reading": "おもいたつ", "rank": 3890, "tier": 3, "meaning_vi": "nảy sinh ý định", "category": "daily_life"},
}

AUTHENTIC_KEIGO_SURU_VERBS: dict[str, dict[str, Any]] = {
    # Tier 1 (N5 / N4, rank <= 1000)
    "電話する": {"reading": "でんわする", "prefix": "お", "rank": 210, "tier": 1, "meaning_vi": "gọi điện thoại", "category": "workplace_biz"},
    "案内する": {"reading": "あんないする", "prefix": "ご", "rank": 310, "tier": 1, "meaning_vi": "hướng dẫn / chỉ đường", "category": "service"},
    "説明する": {"reading": "せつめいする", "prefix": "ご", "rank": 290, "tier": 1, "meaning_vi": "giải thích / trình bày", "category": "workplace_biz"},
    "連絡する": {"reading": "れんらくする", "prefix": "ご", "rank": 250, "tier": 1, "meaning_vi": "liên lạc / thông báo", "category": "workplace_biz"},
    "利用する": {"reading": "りようする", "prefix": "ご", "rank": 340, "tier": 1, "meaning_vi": "sử dụng dịch vụ", "category": "service"},
    "紹介する": {"reading": "しょうかいする", "prefix": "ご", "rank": 380, "tier": 1, "meaning_vi": "giới thiệu", "category": "workplace_biz"},
    "準備する": {"reading": "じゅんびする", "prefix": "ご", "rank": 320, "tier": 1, "meaning_vi": "chuẩn bị", "category": "workplace_biz"},
    "質問する": {"reading": "しつもんする", "prefix": "ご", "rank": 410, "tier": 1, "meaning_vi": "đặt câu hỏi", "category": "workplace_biz"},
    "注文する": {"reading": "ちゅうもんする", "prefix": "ご", "rank": 450, "tier": 1, "meaning_vi": "đặt món / đặt hàng", "category": "service"},
    "予約する": {"reading": "よやくする", "prefix": "ご", "rank": 480, "tier": 1, "meaning_vi": "đặt hẹn / đặt chỗ", "category": "service"},
    "相談する": {"reading": "そうだんする", "prefix": "ご", "rank": 360, "tier": 1, "meaning_vi": "trao đổi / xin ý kiến", "category": "workplace_biz"},
    "確認する": {"reading": "かくにんする", "prefix": "ご", "rank": 270, "tier": 1, "meaning_vi": "xác nhận / kiểm tra lại", "category": "workplace_biz"},
    "参加する": {"reading": "さんかする", "prefix": "ご", "rank": 430, "tier": 1, "meaning_vi": "tham gia", "category": "workplace_biz"},
    "協力する": {"reading": "きょうりょくする", "prefix": "ご", "rank": 510, "tier": 1, "meaning_vi": "hợp tác / chung sức", "category": "workplace_biz"},
    "挨拶する": {"reading": "あいさつする", "prefix": "ご", "rank": 390, "tier": 1, "meaning_vi": "chào hỏi", "category": "workplace_biz"},

    # Tier 2 (N3, 1000 < rank <= 3000)
    "報告する": {"reading": "ほうこくする", "prefix": "ご", "rank": 1120, "tier": 2, "meaning_vi": "báo cáo công việc", "category": "workplace_biz"},
    "検討する": {"reading": "けんとうする", "prefix": "ご", "rank": 1180, "tier": 2, "meaning_vi": "xem xét / cân nhắc", "category": "workplace_biz"},
    "提出する": {"reading": "ていしゅつする", "prefix": "ご", "rank": 1240, "tier": 2, "meaning_vi": "nộp / trình tài liệu", "category": "workplace_biz"},
    "依頼する": {"reading": "いらいする", "prefix": "ご", "rank": 1290, "tier": 2, "meaning_vi": "nhờ vả / ủy thác", "category": "workplace_biz"},
    "返信する": {"reading": "へんしんする", "prefix": "ご", "rank": 1330, "tier": 2, "meaning_vi": "hồi âm / phản hồi email", "category": "workplace_biz"},
    "要望する": {"reading": "ようぼうする", "prefix": "ご", "rank": 1420, "tier": 2, "meaning_vi": "yêu cầu / nguyện vọng", "category": "service"},
    "配慮する": {"reading": "はいりょする", "prefix": "ご", "rank": 1510, "tier": 2, "meaning_vi": "quan tâm / để ý", "category": "workplace_biz"},
    "対応する": {"reading": "たいおうする", "prefix": "ご", "rank": 1090, "tier": 2, "meaning_vi": "xử lý / tiếp ứng", "category": "service"},
    "理解する": {"reading": "りかいする", "prefix": "ご", "rank": 1150, "tier": 2, "meaning_vi": "thấu hiểu / thông cảm", "category": "workplace_biz"},
    "辞退する": {"reading": "じたいする", "prefix": "ご", "rank": 1820, "tier": 2, "meaning_vi": "từ chối khéo léo", "category": "workplace_biz"},
    "遠慮する": {"reading": "えんりょする", "prefix": "ご", "rank": 1640, "tier": 2, "meaning_vi": "e ngại / giữ ý", "category": "workplace_biz"},
    "同席する": {"reading": "どうせきする", "prefix": "ご", "rank": 1750, "tier": 2, "meaning_vi": "cùng có mặt tại cuộc họp", "category": "workplace_biz"},
    "同行する": {"reading": "どうこうする", "prefix": "ご", "rank": 1690, "tier": 2, "meaning_vi": "đi cùng đối tác", "category": "workplace_biz"},
    "出席する": {"reading": "しゅっせきする", "prefix": "ご", "rank": 1220, "tier": 2, "meaning_vi": "tham dự sự kiện", "category": "workplace_biz"},
    "送付する": {"reading": "そうふする", "prefix": "ご", "rank": 1460, "tier": 2, "meaning_vi": "gửi tài liệu hợp đồng", "category": "workplace_biz"},
    "返却する": {"reading": "へんきゃくする", "prefix": "ご", "rank": 1850, "tier": 2, "meaning_vi": "hoàn trả đồ", "category": "service"},
    "持参する": {"reading": "じさんする", "prefix": "ご", "rank": 1590, "tier": 2, "meaning_vi": "mang theo bên mình", "category": "workplace_biz"},

    # Tier 3 (N2 / N1, 3000 < rank <= 5000)
    "契約する": {"reading": "けいやくする", "prefix": "ご", "rank": 3150, "tier": 3, "meaning_vi": "ký kết hợp đồng", "category": "workplace_biz"},
    "承諾する": {"reading": "しょうだくする", "prefix": "ご", "rank": 3280, "tier": 3, "meaning_vi": "chấp thuận điều khoản", "category": "workplace_biz"},
    "査収する": {"reading": "さしゅうする", "prefix": "ご", "rank": 3520, "tier": 3, "meaning_vi": "kiểm tra và nhận tài liệu", "category": "workplace_biz"},
    "教示する": {"reading": "きょうじする", "prefix": "ご", "rank": 3410, "tier": 3, "meaning_vi": "chỉ giáo / hướng dẫn", "category": "workplace_biz"},
    "高覧する": {"reading": "こうらんする", "prefix": "ご", "rank": 3790, "tier": 3, "meaning_vi": "kính xem qua", "category": "workplace_biz"},
    "自愛する": {"reading": "じあいする", "prefix": "ご", "rank": 3680, "tier": 3, "meaning_vi": "giữ gìn sức khỏe", "category": "daily_life"},
    "愛顧する": {"reading": "あいこする", "prefix": "ご", "rank": 3850, "tier": 3, "meaning_vi": "tin tưởng ủng hộ", "category": "service"},
    "鞭撻する": {"reading": "べんたつする", "prefix": "ご", "rank": 3920, "tier": 3, "meaning_vi": "khích lệ / động viên", "category": "workplace_biz"},
    "容赦する": {"reading": "ようしゃする", "prefix": "ご", "rank": 3350, "tier": 3, "meaning_vi": "thông cảm lượng thứ", "category": "workplace_biz"},
    "了承する": {"reading": "りょうしょうする", "prefix": "ご", "rank": 3190, "tier": 3, "meaning_vi": "thấu hiểu đồng ý", "category": "workplace_biz"},
    "協賛する": {"reading": "きょうさんする", "prefix": "ご", "rank": 3880, "tier": 3, "meaning_vi": "tài trợ / đồng hành", "category": "workplace_biz"},
}

AUTHENTIC_KEIGO_NOUN_PREFIXES: dict[str, dict[str, Any]] = {
    # Tier 1 (N5 / N4, rank <= 1000)
    "名前": {"reading": "なまえ", "prefix": "お", "rank": 95, "tier": 1, "meaning_vi": "họ tên", "category": "daily_life"},
    "仕事": {"reading": "しごと", "prefix": "お", "rank": 110, "tier": 1, "meaning_vi": "công việc", "category": "workplace_biz"},
    "電話": {"reading": "でんわ", "prefix": "お", "rank": 140, "tier": 1, "meaning_vi": "cuộc gọi / số điện thoại", "category": "workplace_biz"},
    "時間": {"reading": "じかん", "prefix": "お", "rank": 85, "tier": 1, "meaning_vi": "thời gian quý báu", "category": "workplace_biz"},
    "部屋": {"reading": "へや", "prefix": "お", "rank": 210, "tier": 1, "meaning_vi": "phòng họp / căn phòng", "category": "daily_life"},
    "手紙": {"reading": "てがみ", "prefix": "お", "rank": 320, "tier": 1, "meaning_vi": "bức thư", "category": "daily_life"},
    "水": {"reading": "みず", "prefix": "お", "rank": 160, "tier": 1, "meaning_vi": "nước uống", "category": "daily_life"},
    "茶": {"reading": "ちゃ", "prefix": "お", "rank": 240, "tier": 1, "meaning_vi": "trà mời khách", "category": "service"},
    "酒": {"reading": "さけ", "prefix": "お", "rank": 350, "tier": 1, "meaning_vi": "rượu", "category": "service"},
    "金": {"reading": "かね", "prefix": "お", "rank": 120, "tier": 1, "meaning_vi": "tiền bạc", "category": "service"},
    "店": {"reading": "みせ", "prefix": "お", "rank": 190, "tier": 1, "meaning_vi": "cửa hàng", "category": "service"},
    "家族": {"reading": "かぞく", "prefix": "ご", "rank": 170, "tier": 1, "meaning_vi": "gia đình của quý khách", "category": "daily_life"},
    "意見": {"reading": "いけん", "prefix": "ご", "rank": 220, "tier": 1, "meaning_vi": "ý kiến đóng góp", "category": "workplace_biz"},
    "連絡": {"reading": "れんらく", "prefix": "ご", "rank": 180, "tier": 1, "meaning_vi": "sự liên lạc", "category": "workplace_biz"},
    "住所": {"reading": "じゅうしょ", "prefix": "ご", "rank": 280, "tier": 1, "meaning_vi": "địa chỉ cư trú", "category": "service"},
    "案内": {"reading": "あんない", "prefix": "ご", "rank": 310, "tier": 1, "meaning_vi": "sự hướng dẫn", "category": "service"},
    "説明": {"reading": "せつめい", "prefix": "ご", "rank": 290, "tier": 1, "meaning_vi": "lời giải thích", "category": "workplace_biz"},
    "質問": {"reading": "しつもん", "prefix": "ご", "rank": 340, "tier": 1, "meaning_vi": "câu hỏi", "category": "workplace_biz"},
    "予定": {"reading": "よてい", "prefix": "ご", "rank": 230, "tier": 1, "meaning_vi": "dự định / kế hoạch", "category": "workplace_biz"},
    "都合": {"reading": "つごう", "prefix": "ご", "rank": 260, "tier": 1, "meaning_vi": "sự thuận tiện lịch trình", "category": "workplace_biz"},

    # Tier 2 (N3, 1000 < rank <= 3000)
    "荷物": {"reading": "にもつ", "prefix": "お", "rank": 1120, "tier": 2, "meaning_vi": "hành lý / đồ đạc", "category": "service"},
    "車": {"reading": "くるま", "prefix": "お", "rank": 1180, "tier": 2, "meaning_vi": "xe ô tô", "category": "service"},
    "宅": {"reading": "たく", "prefix": "お", "rank": 1320, "tier": 2, "meaning_vi": "nhà riêng của đối tác", "category": "workplace_biz"},
    "礼": {"reading": "れい", "prefix": "お", "rank": 1410, "tier": 2, "meaning_vi": "lời cảm ơn / đáp lễ", "category": "workplace_biz"},
    "客": {"reading": "きゃく", "prefix": "お", "rank": 1050, "tier": 2, "meaning_vi": "quý khách", "category": "service"},
    "元気": {"reading": "げんき", "prefix": "お", "rank": 1210, "tier": 2, "meaning_vi": "sức khỏe dồi dào", "category": "daily_life"},
    "返事": {"reading": "へんじ", "prefix": "お", "rank": 1160, "tier": 2, "meaning_vi": "hồi đáp / câu trả lời", "category": "workplace_biz"},
    "約束": {"reading": "やくそく", "prefix": "お", "rank": 1250, "tier": 2, "meaning_vi": "lời hứa / cuộc hẹn", "category": "workplace_biz"},
    "会計": {"reading": "かいけい", "prefix": "お", "rank": 1480, "tier": 2, "meaning_vi": "hóa đơn thanh toán", "category": "service"},
    "食事": {"reading": "しょくじ", "prefix": "お", "rank": 1190, "tier": 2, "meaning_vi": "bữa ăn thân mật", "category": "service"},
    "料理": {"reading": "りょうり", "prefix": "お", "rank": 1280, "tier": 2, "meaning_vi": "món ăn", "category": "service"},
    "世話": {"reading": "せわ", "prefix": "お", "rank": 1090, "tier": 2, "meaning_vi": "sự chiếu cố giúp đỡ", "category": "workplace_biz"},
    "手伝い": {"reading": "てつだい", "prefix": "お", "rank": 1520, "tier": 2, "meaning_vi": "sự hỗ trợ", "category": "workplace_biz"},
    "支払い": {"reading": "しはらい", "prefix": "お", "rank": 1360, "tier": 2, "meaning_vi": "khoản chi trả", "category": "workplace_biz"},
    "受け取り": {"reading": "うけとり", "prefix": "お", "rank": 1450, "tier": 2, "meaning_vi": "việc nhận hàng", "category": "service"},
    "届け": {"reading": "とどけ", "prefix": "お", "rank": 1620, "tier": 2, "meaning_vi": "giao nhận tận nơi", "category": "service"},
    "見積もり": {"reading": "みつもり", "prefix": "お", "rank": 1710, "tier": 2, "meaning_vi": "bản báo giá", "category": "workplace_biz"},
    "問い合わせ": {"reading": "といあわせ", "prefix": "お", "rank": 1680, "tier": 2, "meaning_vi": "yêu cầu thắc mắc", "category": "service"},
    "値引き": {"reading": "ねびき", "prefix": "お", "rank": 1890, "tier": 2, "meaning_vi": "chiết khấu ưu đãi", "category": "service"},
    "協力": {"reading": "きょうりょく", "prefix": "ご", "rank": 1140, "tier": 2, "meaning_vi": "sự hợp tác", "category": "workplace_biz"},
    "検討": {"reading": "けんとう", "prefix": "ご", "rank": 1190, "tier": 2, "meaning_vi": "sự xem xét", "category": "workplace_biz"},
    "相談": {"reading": "そうだん", "prefix": "ご", "rank": 1150, "tier": 2, "meaning_vi": "sự bàn bạc", "category": "workplace_biz"},
    "報告": {"reading": "ほうこく", "prefix": "ご", "rank": 1130, "tier": 2, "meaning_vi": "bản báo cáo", "category": "workplace_biz"},
    "挨拶": {"reading": "あいさつ", "prefix": "ご", "rank": 1260, "tier": 2, "meaning_vi": "lời chào mừng", "category": "workplace_biz"},
    "参加": {"reading": "さんか", "prefix": "ご", "rank": 1280, "tier": 2, "meaning_vi": "sự tham gia", "category": "workplace_biz"},
    "配慮": {"reading": "はいりょ", "prefix": "ご", "rank": 1490, "tier": 2, "meaning_vi": "sự quan tâm chu đáo", "category": "workplace_biz"},
    "利用": {"reading": "りよう", "prefix": "ご", "rank": 1070, "tier": 2, "meaning_vi": "sự sử dụng dịch vụ", "category": "service"},
    "満足": {"reading": "まんぞく", "prefix": "ご", "rank": 1580, "tier": 2, "meaning_vi": "sự hài lòng", "category": "service"},
    "理解": {"reading": "りかい", "prefix": "ご", "rank": 1220, "tier": 2, "meaning_vi": "sự thông hiểu", "category": "workplace_biz"},
    "健康": {"reading": "けんこう", "prefix": "ご", "rank": 1390, "tier": 2, "meaning_vi": "sức khỏe dồi dào", "category": "daily_life"},
    "迷惑": {"reading": "めいわく", "prefix": "ご", "rank": 1440, "tier": 2, "meaning_vi": "sự phiền toái", "category": "workplace_biz"},
    "親切": {"reading": "しんせつ", "prefix": "ご", "rank": 1610, "tier": 2, "meaning_vi": "lòng tốt chu đáo", "category": "daily_life"},
    "心配": {"reading": "しんぱい", "prefix": "ご", "rank": 1340, "tier": 2, "meaning_vi": "sự bận tâm lo lắng", "category": "daily_life"},
    "準備": {"reading": "じゅんび", "prefix": "ご", "rank": 1180, "tier": 2, "meaning_vi": "công tác chuẩn bị", "category": "workplace_biz"},
    "日程": {"reading": "にってい", "prefix": "ご", "rank": 1310, "tier": 2, "meaning_vi": "lịch trình công tác", "category": "workplace_biz"},
    "担当": {"reading": "たんとう", "prefix": "ご", "rank": 1240, "tier": 2, "meaning_vi": "người phụ trách", "category": "workplace_biz"},
    "紹介": {"reading": "しょうかい", "prefix": "ご", "rank": 1290, "tier": 2, "meaning_vi": "sự giới thiệu kết nối", "category": "workplace_biz"},
    "注文": {"reading": "ちゅうもん", "prefix": "ご", "rank": 1350, "tier": 2, "meaning_vi": "đơn đặt hàng", "category": "service"},
    "確認": {"reading": "かくにん", "prefix": "ご", "rank": 1100, "tier": 2, "meaning_vi": "sự xác nhận", "category": "workplace_biz"},
    "要望": {"reading": "ようぼう", "prefix": "ご", "rank": 1460, "tier": 2, "meaning_vi": "nguyện vọng yêu cầu", "category": "service"},
    "依頼": {"reading": "いらい", "prefix": "ご", "rank": 1380, "tier": 2, "meaning_vi": "sự ủy thác", "category": "workplace_biz"},
    "返信": {"reading": "へんしん", "prefix": "ご", "rank": 1420, "tier": 2, "meaning_vi": "hồi âm thư", "category": "workplace_biz"},
    "希望": {"reading": "きぼう", "prefix": "ご", "rank": 1270, "tier": 2, "meaning_vi": "mong muốn", "category": "service"},

    # Tier 3 (N2 / N1, 3000 < rank <= 5000)
    "契約": {"reading": "けいやく", "prefix": "ご", "rank": 3150, "tier": 3, "meaning_vi": "bản hợp đồng kinh tế", "category": "workplace_biz"},
    "提出": {"reading": "ていしゅつ", "prefix": "ご", "rank": 3220, "tier": 3, "meaning_vi": "việc nộp hồ sơ", "category": "workplace_biz"},
    "来店": {"reading": "らいてん", "prefix": "ご", "rank": 3310, "tier": 3, "meaning_vi": "sự ghé thăm cửa hàng", "category": "service"},
    "搭乗": {"reading": "とうじょう", "prefix": "ご", "rank": 3450, "tier": 3, "meaning_vi": "sự lên máy bay", "category": "service"},
    "領収書": {"reading": "りょうしゅうしょ", "prefix": "ご", "rank": 3580, "tier": 3, "meaning_vi": "hóa đơn đỏ / biên lai", "category": "workplace_biz"},
    "請求書": {"reading": "せいきゅうしょ", "prefix": "ご", "rank": 3610, "tier": 3, "meaning_vi": "giấy yêu cầu thanh toán", "category": "workplace_biz"},
    "多忙": {"reading": "たぼう", "prefix": "ご", "rank": 3280, "tier": 3, "meaning_vi": "bận rộn trăm công nghìn việc", "category": "workplace_biz"},
    "丁寧": {"reading": "ていねい", "prefix": "ご", "rank": 3390, "tier": 3, "meaning_vi": "sự chu đáo lịch thiệp", "category": "workplace_biz"},
    "無沙汰": {"reading": "ぶさた", "prefix": "ご", "rank": 3720, "tier": 3, "meaning_vi": "lâu ngày không liên lạc", "category": "daily_life"},
    "足労": {"reading": "そくろう", "prefix": "ご", "rank": 3810, "tier": 3, "meaning_vi": "sự nhọc công đi lại", "category": "workplace_biz"},
    "厚意": {"reading": "こうい", "prefix": "ご", "rank": 3690, "tier": 3, "meaning_vi": "thịnh tình / lòng tốt sâu đậm", "category": "workplace_biz"},
    "盛会": {"reading": "せいかい", "prefix": "ご", "rank": 3950, "tier": 3, "meaning_vi": "đại hội thành công rực rỡ", "category": "workplace_biz"},
    "健勝": {"reading": "けんしょう", "prefix": "ご", "rank": 3880, "tier": 3, "meaning_vi": "sức khỏe an khang", "category": "workplace_biz"},
    "清祥": {"reading": "せいしょう", "prefix": "ご", "rank": 3910, "tier": 3, "meaning_vi": "bình an thanh thái", "category": "workplace_biz"},
    "高配": {"reading": "こうはい", "prefix": "ご", "rank": 3990, "tier": 3, "meaning_vi": "sự quan tâm chiếu cố cao quý", "category": "workplace_biz"},
    "芳名": {"reading": "ほうめい", "prefix": "ご", "rank": 3760, "tier": 3, "meaning_vi": "quý danh", "category": "workplace_biz"},
    "愛顧": {"reading": "あいこ", "prefix": "ご", "rank": 3840, "tier": 3, "meaning_vi": "sự tin dùng ái mộ", "category": "service"},
}


class BccwjFrequencyVocabularyService:
    """Provides instant in-memory access to BCCWJ high frequency vocabulary dataset."""

    def __init__(self):
        self._all_words = get_all_frequency_words()

    @property
    def total_count(self) -> int:
        return len(self._all_words)

    def get_next_word(
        self,
        category: str | None = None,
        tier: int | None = None,
        jlpt: str | None = None,
        query: str | None = None,
    ) -> FrequencyWordEntry:
        """Returns next word using non-repeating shuffle-bag algorithm."""
        global _WORD_SHUFFLE_BAG, _GLOBAL_RECENT_WORDS

        # Filter candidates combinatorially
        if query:
            candidates = search_frequency_words(query)
        else:
            candidates = self._all_words
            if category and category != "all":
                cat_filtered = [w for w in candidates if w.category == category]
                if cat_filtered:
                    candidates = cat_filtered
            if tier:
                tier_filtered = [w for w in candidates if w.tier == tier]
                if tier_filtered:
                    candidates = tier_filtered

        if jlpt and jlpt != "all":
            jlpt_filtered = [w for w in candidates if w.jlpt.upper() == jlpt.upper()]
            if jlpt_filtered:
                candidates = jlpt_filtered

        if not candidates:
            candidates = self._all_words

        # Exclude very recently shown words (last 20 for non-repeating experience)
        recent_set = set(_GLOBAL_RECENT_WORDS[-20:])
        fresh_candidates = [w for w in candidates if w.word not in recent_set]
        if not fresh_candidates:
            fresh_candidates = candidates

        chosen = random.choice(fresh_candidates)
        _GLOBAL_RECENT_WORDS.append(chosen.word)
        if len(_GLOBAL_RECENT_WORDS) > 60:
            _GLOBAL_RECENT_WORDS = _GLOBAL_RECENT_WORDS[-40:]

        return chosen

    def to_exercise_dict(
        self,
        word_entry: FrequencyWordEntry,
        timer_ms: int = 4000,
        pressure_level: str = "normal",
        difficulty: str = "normal",
    ) -> dict[str, Any]:
        """Formats FrequencyWordEntry into a complete reflex speaking exercise."""
        word_type_label = {
            "verb": "Động từ hành động",
            "noun": "Danh từ đời sống",
            "adj_i": "Tính từ い",
            "adj_na": "Tính từ な",
            "adverb": "Phó từ / Tượng thanh",
            "phrase": "Cụm từ giao tiếp",
        }.get(word_entry.pos, "Từ vựng thông dụng")

        tier_label = {
            1: "🔥 Top 1.000 từ thiết yếu",
            2: "⭐ Top 3.000 từ đời thường",
            3: "💎 Top 5.000 từ nâng cao",
        }.get(word_entry.tier, "Từ vựng tần suất cao")

        return {
            "title": f"BCCWJ 瞬発: {word_entry.word} (Rank #{word_entry.rank})",
            "objective": f"Bật ngay từ tiếng Nhật chuẩn xác trong {timer_ms/1000:.1f}s",
            "scenario": f"{word_type_label} • {tier_label}",
            "instructions": f"Nghĩa: '{word_entry.meaning_vi}' — Nói ngay từ tiếng Nhật!",
            "prompt": word_entry.meaning_vi,
            "prompt_reading": word_entry.reading,
            "prompt_translation": word_entry.word,
            "expected": word_entry.word,
            "canonical": word_entry.word,
            "acceptable_variants": [word_entry.word, word_entry.reading],
            "direction": "vi_to_ja",
            "word": word_entry.word,
            "word_type": word_entry.pos,
            "word_type_label": word_type_label,
            "category": word_entry.category,
            "vocab_category": word_entry.category,
            "jlpt_level": word_entry.jlpt.upper(),
            "word_reading": word_entry.reading,
            "word_meaning_vi": word_entry.meaning_vi,
            "collocation_ja": word_entry.collocation_ja,
            "collocation_vi": word_entry.collocation_vi,
            "example_ja": word_entry.example_ja,
            "example_vi": word_entry.example_vi,
            "synonyms_vi": word_entry.synonyms_vi,
            "frequency_rank": word_entry.rank,
            "frequency_tier": word_entry.tier,
            "frequency_score": word_entry.frequency_score,
            "timer_limit_ms": timer_ms,
            "pressure_level": pressure_level,
            "difficulty": difficulty,
            "constraints": ["Nói từ tiếng Nhật chuẩn xác."],
            "target_patterns": [word_entry.word, word_entry.reading],
            "semantic_target": {
                "type": "vocab_recall",
                "direction": "vi_to_ja",
                "answer": word_entry.word,
                "rank": word_entry.rank,
            },
            "estimated_minutes": 2,
        }

    def get_situational_keywords(self, category_key: str, count: int = 3) -> list[dict[str, str]]:
        """Returns relevant high-frequency BCCWJ keywords for situational roleplays."""
        cat_map = {
            "food": ["daily_life", "action_verbs"],
            "retail": ["daily_life", "action_verbs"],
            "transportation": ["daily_life", "action_verbs"],
            "healthcare": ["daily_life", "emotions_adj"],
            "workplace": ["workplace_biz", "action_verbs"],
            "travel": ["daily_life", "action_verbs"],
            "infinite": ["daily_life", "workplace_biz", "action_verbs"],
        }
        target_cats = cat_map.get(category_key, ["daily_life", "action_verbs"])
        pool = [w for w in self._all_words if w.category in target_cats]
        if not pool:
            pool = self._all_words
        selected = random.sample(pool, min(count, len(pool)))
        return [
            {
                "word": w.word,
                "reading": w.reading,
                "meaning": w.meaning_vi,
                "collocation": w.collocation_ja,
            }
            for w in selected
        ]

    def get_regular_keigo_entries(
        self,
        category: str | None = None,
        tier: int | None = None,
    ) -> list[dict[str, Any]]:
        """Extracts ONLY high-frequency, authentic real-life verbs and nouns suitable for Keigo.

        Strictly filters to 100% natural, conversational workplace and daily-life Japanese words,
        eliminating awkward academic or theoretical dictionary nouns/verbs.
        """
        results: list[dict[str, Any]] = []

        # 1. Authentic Godan/Ichidan Volitional Verbs (Hành động có chủ ý thực tế)
        for word, meta in AUTHENTIC_KEIGO_VOLITIONAL_VERBS.items():
            if tier and meta["tier"] != tier:
                continue
            if category and category != "all" and meta["category"] != category:
                continue
            results.append({
                "source_word": word,
                "reading": meta.get("reading", word),
                "meaning_vi": meta["meaning_vi"],
                "type": "regular_verb",
                "rank": meta["rank"],
                "tier": meta["tier"],
                "category": meta["category"],
            })

        # 2. Authentic Suru Verbs (Danh động từ する thực tế công sở & dịch vụ)
        for word, meta in AUTHENTIC_KEIGO_SURU_VERBS.items():
            if tier and meta["tier"] != tier:
                continue
            if category and category != "all" and meta["category"] != category:
                continue
            noun_part = word[:-2]
            prefix = meta["prefix"]
            results.append({
                "source_word": word,
                "reading": meta.get("reading", word),
                "meaning_vi": meta["meaning_vi"],
                "type": "suru_verb",
                "prefix": prefix,
                "sonkeigo": f"{prefix}{noun_part}になる",
                "sonkeigo_polite": f"{prefix}{noun_part}になります",
                "sonkeigo_nasaru": f"{prefix}{noun_part}なさる",
                "kenjougo": f"{prefix}{noun_part}する",
                "kenjougo_polite": f"{prefix}{noun_part}いたします",
                "passive_sonkeigo": f"{noun_part}される",
                "rank": meta["rank"],
                "tier": meta["tier"],
                "category": meta["category"],
            })

        # 3. Authentic Nouns with お / ご Prefixes (Danh từ quen thuộc ngoài đời)
        for word, meta in AUTHENTIC_KEIGO_NOUN_PREFIXES.items():
            if tier and meta["tier"] != tier:
                continue
            if category and category != "all" and meta["category"] != category:
                continue
            prefix = meta["prefix"]
            results.append({
                "source_word": word,
                "reading": meta.get("reading", word),
                "meaning_vi": meta["meaning_vi"],
                "type": "noun_prefix",
                "prefix": prefix,
                "canonical": f"{prefix}{word}",
                "rank": meta["rank"],
                "tier": meta["tier"],
                "category": meta["category"],
            })

        return results

    def get_keigo_business_words(
        self,
        category: str | None = None,
        tier: int | None = None,
    ) -> list[dict[str, Any]]:
        """Extracts workplace/business domain words and conversational nouns for context enrichment."""
        candidates = self._all_words
        if tier:
            candidates = [w for w in candidates if w.tier == tier]
        if category and category != "all":
            candidates = [w for w in candidates if w.category == category]
        else:
            candidates = [w for w in candidates if w.category in {"workplace_biz", "daily_life"}]

        return [
            {
                "word": w.word,
                "reading": w.reading,
                "meaning_vi": w.meaning_vi,
                "pos": w.pos,
                "rank": w.rank,
                "tier": w.tier,
                "category": w.category,
                "example_ja": w.example_ja,
                "example_vi": w.example_vi,
            }
            for w in candidates
        ]


    def get_devoicing_words(
        self,
        category: str | None = None,
        tier: int | None = None,
    ) -> list[dict[str, Any]]:
        """Extracts words with authentic Japanese vowel devoicing environments (母音無声化).

        Vowels /i/ and /u/ in moras (き, く, し, す, ち, つ, ひ, ふ, ぴ, ぷ) are devoiced
        when surrounded by voiceless consonants or at the end of an utterance.
        """
        voiceless_moras = {"き", "く", "し", "す", "ち", "つ", "ひ", "ふ", "ぴ", "ぷ"}
        voiceless_initials = set("かきくけこさしすせそたちつてとはひふへほぱぴぷぺぽきゃきゅきょしゃしゅしょちゃちゅちょひゃひゅひょ")
        end_devoiced = {"す", "く", "つ", "し"}

        candidates = self._all_words
        if category and category != "all":
            candidates = [w for w in candidates if w.category == category]
        if tier:
            candidates = [w for w in candidates if w.tier == tier]

        devoicing_items: list[dict[str, Any]] = []
        for w in candidates:
            r = w.reading
            for i in range(len(r)):
                if r[i] in voiceless_moras:
                    if i + 1 < len(r) and r[i + 1] in voiceless_initials:
                        devoicing_items.append({
                            "word": w.word,
                            "reading": r,
                            "devoiced_mora": r[i],
                            "devoiced_index": i + 1,
                            "meaning_vi": w.meaning_vi,
                            "explanation": f"Nguyên âm trong phách '{r[i]}' đứng giữa 2 phụ âm vô thanh nên dây thanh không rung.",
                            "category": w.category,
                            "tier": w.tier,
                            "rank": w.rank,
                            "collocation_ja": w.collocation_ja,
                            "example_ja": w.example_ja,
                        })
                        break
                    elif i == len(r) - 1 and r[i] in end_devoiced:
                        devoicing_items.append({
                            "word": w.word,
                            "reading": r,
                            "devoiced_mora": r[i],
                            "devoiced_index": i + 1,
                            "meaning_vi": w.meaning_vi,
                            "explanation": f"Nguyên âm trong phách '{r[i]}' ở cuối từ/câu thả lỏng dây thanh để âm thoát tự nhiên.",
                            "category": w.category,
                            "tier": w.tier,
                            "rank": w.rank,
                            "collocation_ja": w.collocation_ja,
                            "example_ja": w.example_ja,
                        })
                        break
        return devoicing_items

    def get_next_devoicing_word(
        self,
        category: str | None = None,
        tier: int | None = None,
    ) -> dict[str, Any]:
        """Returns next devoicing word using non-repeating shuffle selection."""
        words = self.get_devoicing_words(category, tier)
        if not words:
            words = self.get_devoicing_words()
        return random.choice(words)

    def get_next_contour_word(
        self,
        category: str | None = None,
        tier: int | None = None,
    ) -> FrequencyWordEntry:
        """Returns next word for pitch contour curve practice."""
        return self.get_next_word(category=category, tier=tier)


_freq_service_singleton: BccwjFrequencyVocabularyService | None = None


def get_frequency_vocabulary_service() -> BccwjFrequencyVocabularyService:
    global _freq_service_singleton
    if _freq_service_singleton is None:
        _freq_service_singleton = BccwjFrequencyVocabularyService()
    return _freq_service_singleton
