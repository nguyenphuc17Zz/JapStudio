"""Single source for Popular Topics & Practice Modes — also used to seed DB if needed."""

POPULAR_TOPICS = [
    {"id": "food", "label": "Ẩm thực & Quán ăn", "icon": "🍜", "topic": "Ẩm thực & Đặt bàn nhà hàng Nhật Bản", "jlptLevel": "N4", "register": "polite", "difficulty": 4},
    {"id": "travel", "label": "Du lịch & Khách sạn", "icon": "✈️", "topic": "Du lịch Kyoto & Hỏi đường, thủ tục khách sạn", "jlptLevel": "N4", "register": "polite", "difficulty": 5},
    {"id": "business", "label": "Công sở & Email xin phép", "icon": "💼", "topic": "Email công sở xin nghỉ phép và bàn giao công việc", "jlptLevel": "N3", "register": "business", "difficulty": 7},
    {"id": "anime", "label": "Anime & Văn hóa Nhật", "icon": "🎌", "topic": "Bình luận cảm nhận về phim anime và văn hóa Otaku", "jlptLevel": "N3", "register": "casual", "difficulty": 6},
    {"id": "daily", "label": "Đời sống & Mua sắm", "icon": "🛒", "topic": "Mua sắm tại siêu thị và đời sống sinh hoạt ở Tokyo", "jlptLevel": "N4", "register": "casual", "difficulty": 4},
    {"id": "friendship", "label": "Giao lưu & Hẹn hò", "icon": "💬", "topic": "Trò chuyện kết bạn, rủ đi cà phê cuối tuần", "jlptLevel": "N4", "register": "casual", "difficulty": 4},
    {"id": "tech", "label": "Công nghệ & AI", "icon": "🤖", "topic": "Thảo luận xu hướng công nghệ trí tuệ nhân tạo tương lai", "jlptLevel": "N2", "register": "business", "difficulty": 8},
]

PRACTICE_MODES = [
    {"id": "recommended", "label": "AI gợi ý", "kanji": "推", "badge": "Tối ưu", "icon": "🌟", "desc": "Phân tích điểm yếu & lộ trình học cá nhân", "accentColor": "var(--nihon-yamabuki)"},
    {"id": "custom", "label": "Tùy chỉnh", "kanji": "創", "badge": "Linh hoạt", "icon": "⚡", "desc": "Tự chọn chủ đề, cấp độ JLPT & ngữ điệu", "accentColor": "var(--nihon-kikyo)"},
    {"id": "random", "label": "Ngẫu nhiên", "kanji": "遊", "badge": "Siêu tốc", "icon": "🎲", "desc": "AI sinh câu ngẫu nhiên làm bạn bất ngờ", "accentColor": "var(--nihon-moegi)"},
    {"id": "challenge", "label": "Thử thách", "kanji": "戦", "badge": "+XP Bonus", "icon": "⚔️", "desc": "Thử thách khắc phục lỗi sai & săn điểm XP", "accentColor": "var(--nihon-shu)"},
    {"id": "scenario", "label": "Tình huống", "kanji": "境", "badge": "Thực chiến", "icon": "💼", "desc": "Viết email, chat công sở & hội thoại thực tế", "accentColor": "var(--nihon-ruri)"},
]
