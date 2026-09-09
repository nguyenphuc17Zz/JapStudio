"""Development and testing mock fixtures.
Every item is explicitly labeled [MOCK] to prevent confusion with production data.
"""

MOCK_RSS_XML = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>[MOCK] NHK Easy News Fixture</title>
    <link>https://mock.japstudio.local/nhk</link>
    <description>[MOCK] Sample RSS feed for testing connector normalization</description>
    <item>
      <title>[MOCK] 富士山の初冠雪が観測されました</title>
      <link>https://mock.japstudio.local/nhk/article-01</link>
      <guid>mock_guid_001</guid>
      <description>[MOCK] 甲府地方気象台は、富士山で今年初めて雪が積もる「初冠雪」を観測したと発表しました。</description>
      <pubDate>Mon, 08 Sep 2026 10:00:00 +0900</pubDate>
      <category>天気</category>
      <category>自然</category>
    </item>
  </channel>
</rss>
"""

MOCK_ATOM_XML = """<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>[MOCK] Qiita Trending Dev Posts</title>
  <link href="https://mock.japstudio.local/qiita"/>
  <updated>2026-09-08T12:00:00Z</updated>
  <entry>
    <id>tag:mock.local,2026:post-001</id>
    <title>[MOCK] FastAPIとNext.jsで作る日本語学習アーキテクチャ</title>
    <link href="https://mock.japstudio.local/qiita/post-001"/>
    <summary>[MOCK] 本記事ではモジュール分離型モノレポにおけるUniversal Connector設計を解説します。</summary>
    <published>2026-09-08T11:00:00Z</published>
    <author>
      <name>[MOCK] Kensuke Tanaka</name>
    </author>
  </entry>
</feed>
"""

MOCK_SITEMAP_XML = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://mock.japstudio.local/news/shinkansen-new-route</loc>
    <lastmod>2026-09-08T09:30:00+09:00</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://mock.japstudio.local/news/tokyo-autumn-festival</loc>
    <lastmod>2026-09-08T08:00:00+09:00</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
"""

MOCK_API_JSON = {
    "status": "success",
    "data": {
        "page": 1,
        "next_cursor": "cur_mock_9921",
        "items": [
            {
                "id": "mock_api_item_01",
                "title": "[MOCK] 日本の伝統工芸と現代デザインの融合",
                "content": "[MOCK] 金継ぎや漆器などの伝統技術が、現代の生活雑貨や建築デザインに再評価されています。",
                "url": "https://mock.japstudio.local/api/articles/01",
                "published_at": "2026-09-08T14:00:00Z",
                "author": "Suzuki Ichiro",
            }
        ],
    },
}

MOCK_WEB_HTML = """<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>[MOCK] 日本語イマージョン学習ガイド</title>
  <meta property="og:title" content="[MOCK] 日本語イマージョン学習ガイド">
  <meta property="og:description" content="[MOCK] 本物の日本語コンテンツを毎日読むことで自然な読解力を身につける方法。">
  <meta property="og:image" content="https://mock.japstudio.local/images/cover.jpg">
  <link rel="canonical" href="https://mock.japstudio.local/guide">
  <link rel="alternate" type="application/rss+xml" title="RSS" href="https://mock.japstudio.local/rss.xml">
</head>
<body>
  <article>
    <h1>[MOCK] 日本語イマージョン学習ガイド</h1>
    <p>[MOCK] 語彙や文法を丸暗記するのではなく、実際のニュースやエッセイに触れることが上達の鍵です。</p>
  </article>
</body>
</html>
"""
