from typing import List, Dict, Any
from app.schemas.source import PresetSourceItem, PresetCategoryGroup, DEFAULT_CAPABILITY_STATES

DEFAULT_PRESETS: List[PresetSourceItem] = [
    # -------------------------------------------------------------
    # 1. Japanese News
    # -------------------------------------------------------------
    PresetSourceItem(
        key="nhk-news-easy",
        name="NHK News Web Easy",
        source_type="NEWS",
        connector_type="RSS",
        content_roles=["LEARNER", "NEWS", "FORMAL"],
        categories=["News", "Society", "Learners"],
        priority=9,
        feed_url="https://nhkeasier.com/feed/",
        base_url="https://nhkeasier.com/",
        description="Tin tức tiếng Nhật đơn giản có Furigana của đài truyền hình NHK dành cho người học tiếng Nhật.",
        icon_url="https://www3.nhk.or.jp/favicon.ico",
        sync_interval_minutes=120,
        config_json={
            "level": "easy",
            "target_audience": "learners",
        },
        capabilities={**DEFAULT_CAPABILITY_STATES, "has_furigana": "AVAILABLE", "has_full_text": "AVAILABLE", "supports_polling": "AVAILABLE"},
    ),
    PresetSourceItem(
        key="nhk-general-news",
        name="NHK 総合ニュース (Chính thống)",
        source_type="NEWS",
        connector_type="RSS",
        content_roles=["NEWS", "FORMAL", "POLITICS"],
        categories=["News", "Politics", "Society"],
        priority=8,
        feed_url="https://www.nhk.or.jp/rss/news/cat0.xml",
        base_url="https://www3.nhk.or.jp/news/",
        description="Bản tin thời sự tổng hợp chính thống chuẩn Nhật ngữ từ đài truyền hình quốc gia NHK.",
        icon_url="https://www.nhk.or.jp/favicon.ico",
        sync_interval_minutes=60,
        config_json={"level": "native"},
        capabilities={**DEFAULT_CAPABILITY_STATES, "has_full_text": "AVAILABLE", "supports_polling": "AVAILABLE"},
    ),
    PresetSourceItem(
        key="asahi-shimbun",
        name="朝日新聞デジタル (Asahi Shimbun)",
        source_type="NEWS",
        connector_type="RSS",
        content_roles=["NEWS", "FORMAL", "POLITICS", "BUSINESS"],
        categories=["News", "Economy", "Society"],
        priority=7,
        feed_url="https://rss.asahi.com/rss/asahi/newsheadlines.rdf",
        base_url="https://www.asahi.com/",
        description="Điểm tin thời sự và xã hội Nhật Bản từ một trong những nhật báo uy tín hàng đầu.",
        icon_url="https://www.asahi.com/favicon.ico",
        sync_interval_minutes=60,
        capabilities={**DEFAULT_CAPABILITY_STATES, "has_full_text": "PARTIAL", "supports_polling": "AVAILABLE"},
    ),
    PresetSourceItem(
        key="mainichi-flash",
        name="毎日新聞 速報ニュース (Mainichi)",
        source_type="NEWS",
        connector_type="RSS",
        content_roles=["NEWS", "FORMAL", "BREAKING"],
        categories=["News", "Society"],
        priority=7,
        feed_url="https://mainichi.jp/rss/etc/mainichi-flash.rss",
        base_url="https://mainichi.jp/",
        description="Tin nhanh cập nhật liên tục 24/7 từ báo Mainichi Shimbun.",
        icon_url="https://mainichi.jp/favicon.ico",
        sync_interval_minutes=60,
        capabilities={**DEFAULT_CAPABILITY_STATES, "has_full_text": "PARTIAL", "supports_polling": "AVAILABLE"},
    ),

    # -------------------------------------------------------------
    # 2. Tech & Developer
    # -------------------------------------------------------------
    PresetSourceItem(
        key="qiita-trending",
        name="Qiita トレンド (Qiita Tech Feed)",
        source_type="BLOG",
        connector_type="ATOM",
        content_roles=["TECHNICAL", "CASUAL", "TUTORIAL"],
        categories=["Technology", "Programming", "AI"],
        priority=8,
        feed_url="https://qiita.com/popular-items/feed",
        base_url="https://qiita.com",
        description="Các bài viết kỹ thuật, lập trình và AI xu hướng từ cộng đồng IT lớn nhất Nhật Bản.",
        icon_url="https://cdn.qiita.com/assets/favicons/public/favicon-32x32-b4ea93f7704e5152521a084e23099639.png",
        sync_interval_minutes=180,
        capabilities={**DEFAULT_CAPABILITY_STATES, "has_full_text": "AVAILABLE", "supports_polling": "AVAILABLE"},
    ),
    PresetSourceItem(
        key="zenn-trending",
        name="Zenn 記事フィード (Zenn Dev)",
        source_type="BLOG",
        connector_type="RSS",
        content_roles=["TECHNICAL", "BUSINESS"],
        categories=["Technology", "Cloud", "Development"],
        priority=8,
        feed_url="https://zenn.dev/feed",
        base_url="https://zenn.dev",
        description="Nền tảng chia sẻ kiến thức công nghệ hiện đại, chất lượng cao dành cho kỹ sư Nhật.",
        icon_url="https://zenn.dev/favicon.ico",
        sync_interval_minutes=180,
        capabilities={**DEFAULT_CAPABILITY_STATES, "has_full_text": "AVAILABLE", "supports_polling": "AVAILABLE"},
    ),
    PresetSourceItem(
        key="hatena-it",
        name="はてなブックマーク - テクノロジー",
        source_type="FORUM",
        connector_type="RSS",
        content_roles=["TECHNICAL", "CASUAL", "OPINION"],
        categories=["Technology", "Community", "Trends"],
        priority=6,
        feed_url="https://b.hatena.ne.jp/hotentry/it.rss",
        base_url="https://b.hatena.ne.jp",
        description="Tổng hợp các chủ đề công nghệ được cộng đồng lập trình viên Nhật bookmark nhiều nhất.",
        icon_url="https://b.hatena.ne.jp/favicon.ico",
        sync_interval_minutes=120,
        capabilities={**DEFAULT_CAPABILITY_STATES, "has_full_text": "PARTIAL", "supports_polling": "AVAILABLE"},
    ),

    # -------------------------------------------------------------
    # 3. Social & Community
    # -------------------------------------------------------------
    PresetSourceItem(
        key="reddit-learn-japanese",
        name="Reddit r/LearnJapanese",
        source_type="SOCIAL",
        connector_type="REDDIT",
        content_roles=["CASUAL", "LEARNER", "COMMUNITY"],
        categories=["Social", "Community", "Learners"],
        priority=5,
        base_url="https://reddit.com/r/LearnJapanese",
        feed_url="https://www.reddit.com/r/LearnJapanese/hot.json",
        description="Cộng đồng thảo luận học tiếng Nhật lớn nhất thế giới trên Reddit.",
        icon_url="https://www.redditstatic.com/shreddit/assets/favicon/192x192.png",
        sync_interval_minutes=180,
        config_json={"subreddit": "LearnJapanese", "listing": "hot"},
        capabilities={**DEFAULT_CAPABILITY_STATES, "supports_threading": "AVAILABLE", "supports_polling": "AVAILABLE"},
    ),
    PresetSourceItem(
        key="reddit-newsokur",
        name="Reddit r/newsokur (Cộng đồng tin Nhật)",
        source_type="SOCIAL",
        connector_type="REDDIT",
        content_roles=["CASUAL", "NEWS", "SLANG"],
        categories=["Social", "Community", "News"],
        priority=5,
        base_url="https://reddit.com/r/newsokur",
        feed_url="https://www.reddit.com/r/newsokur/hot.json",
        description="Người bản xứ Nhật Bản thảo luận trực tiếp về thời sự, chính trị và cuộc sống.",
        icon_url="https://www.redditstatic.com/shreddit/assets/favicon/192x192.png",
        sync_interval_minutes=180,
        config_json={"subreddit": "newsokur", "listing": "hot"},
        capabilities={**DEFAULT_CAPABILITY_STATES, "supports_threading": "AVAILABLE", "supports_polling": "AVAILABLE"},
    ),
    PresetSourceItem(
        key="x-japanese-vocab",
        name="X / Twitter - Japanese Daily Insights",
        source_type="SOCIAL",
        connector_type="X",
        content_roles=["CASUAL", "LEARNER", "SLANG"],
        categories=["Social", "Microblogging"],
        priority=4,
        base_url="https://x.com",
        description="Theo dõi bài viết và từ vựng thông dụng từ các kênh chia sẻ tiếng Nhật trên X.",
        sync_interval_minutes=240,
        config_json={"query_or_username": "japanese_learning", "lang": "ja"},
        capabilities={**DEFAULT_CAPABILITY_STATES, "supports_polling": "AVAILABLE"},
    ),
    PresetSourceItem(
        key="threads-japan-life",
        name="Threads - Cuộc sống & Ngôn ngữ Nhật",
        source_type="SOCIAL",
        connector_type="THREADS",
        content_roles=["CASUAL", "CULTURE", "LIFESTYLE"],
        categories=["Social", "Lifestyle"],
        priority=4,
        base_url="https://threads.net",
        description="Bài viết chia sẻ câu chuyện hàng ngày từ các tác giả nội dung tại Tokyo & Osaka.",
        sync_interval_minutes=240,
        config_json={"creator_id": "tokyo_life"},
        capabilities={**DEFAULT_CAPABILITY_STATES, "supports_polling": "AVAILABLE"},
    ),

    # -------------------------------------------------------------
    # 4. Culture & Lifestyle
    # -------------------------------------------------------------
    PresetSourceItem(
        key="note-lifestyle",
        name="note (ノート) - Tản văn & Đời sống Nhật",
        source_type="BLOG",
        connector_type="RSS",
        content_roles=["CASUAL", "CULTURE", "LIFESTYLE"],
        categories=["Culture", "Lifestyle", "Essays"],
        priority=6,
        base_url="https://note.com",
        feed_url="https://note.com/categories/lifestyle/rss",
        description="Tản văn, truyện ngắn và chia sẻ phong cách sống tự do của giới trẻ Nhật Bản.",
        icon_url="https://note.com/favicon.ico",
        sync_interval_minutes=240,
        capabilities={**DEFAULT_CAPABILITY_STATES, "has_full_text": "AVAILABLE", "supports_polling": "AVAILABLE"},
    ),
    PresetSourceItem(
        key="matcha-japan",
        name="MATCHA - Japan Travel Magazine",
        source_type="BLOG",
        connector_type="RSS",
        content_roles=["CULTURE", "TRAVEL", "FOOD"],
        categories=["Culture", "Travel", "Food"],
        priority=6,
        base_url="https://matcha-jp.com",
        feed_url="https://matcha-jp.com/jp/feed/",
        description="Tạp chí du lịch, ẩm thực và văn hóa truyền thống Nhật Bản có bản tiếng Nhật bản xứ.",
        icon_url="https://matcha-jp.com/favicon.ico",
        sync_interval_minutes=360,
        capabilities={**DEFAULT_CAPABILITY_STATES, "has_full_text": "AVAILABLE", "supports_polling": "AVAILABLE"},
    ),
    PresetSourceItem(
        key="tabelog-gourmet",
        name="Tabelog 食べログ - Văn hóa Ẩm thực",
        source_type="WEB",
        connector_type="WEB",
        content_roles=["CULTURE", "FOOD", "CASUAL"],
        categories=["Culture", "Food", "Reviews"],
        priority=5,
        base_url="https://magazine.tabelog.com/",
        description="Cẩm nang ẩm thực, đánh giá nhà hàng và văn hóa đồ ăn Nhật Bản.",
        icon_url="https://tabelog.com/favicon.ico",
        sync_interval_minutes=720,
        config_json={"category": "gourmet_magazine", "referer": "https://www.google.co.jp/"},
        capabilities={**DEFAULT_CAPABILITY_STATES, "has_full_text": "PARTIAL", "supports_scraping": "AVAILABLE"},
    ),
]


def get_presets_grouped() -> List[PresetCategoryGroup]:
    """Groups predefined presets by category."""
    categories_meta = {
        "news": ("Tin tức & Thời sự", "Các nguồn báo chí, truyền hình uy tín tại Nhật Bản", ["News", "news"]),
        "tech": ("Công nghệ & IT Nhật Bản", "Blog kỹ thuật, lập trình và trí tuệ nhân tạo từ kỹ sư Nhật", ["Technology", "tech"]),
        "social": ("Cộng đồng & Mạng xã hội", "Thảo luận, chia sẻ tự nhiên từ người học và người bản xứ", ["Social", "social"]),
        "culture": ("Văn hóa & Đời sống", "Tản văn, du lịch, phong cách sống và ẩm thực Nhật Bản", ["Culture", "culture"]),
    }

    result: List[PresetCategoryGroup] = []
    for cat_id, (label, desc, match_tags) in categories_meta.items():
        items = [
            p for p in DEFAULT_PRESETS
            if any(m.lower() in [c.lower() for c in (p.categories or [])] for m in match_tags)
        ]
        if items:
            result.append(
                PresetCategoryGroup(
                    category=cat_id,
                    label=label,
                    description=desc,
                    items=items,
                )
            )
    return result
