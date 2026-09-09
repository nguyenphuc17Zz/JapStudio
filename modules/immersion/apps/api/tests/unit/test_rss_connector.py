from app.connectors.rss_connector import RSSConnector

SAMPLE_RSS_2_XML = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>NHK ニュース</title>
    <link>https://www3.nhk.or.jp</link>
    <description>NHK News Sample Feed</description>
    <item>
      <title>日本の桜が開花しました</title>
      <link>https://www3.nhk.or.jp/news/article1.html</link>
      <guid>nhk_news_001</guid>
      <description>気象庁は東京で桜が開花したと発表しました。</description>
      <pubDate>Mon, 20 Mar 2026 10:00:00 +0900</pubDate>
      <category>季節</category>
      <category>天気</category>
    </item>
  </channel>
</rss>
"""

SAMPLE_ATOM_XML = """<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Qiita Trending</title>
  <link href="https://qiita.com"/>
  <updated>2026-03-20T12:00:00Z</updated>
  <entry>
    <id>tag:qiita.com,2026:post-123</id>
    <title>FastAPIとNext.jsで構築する実践的アプリ</title>
    <link href="https://qiita.com/articles/post-123"/>
    <summary>この記事ではモダンな日本語学習プラットフォームの構築方法を紹介します。</summary>
    <published>2026-03-20T11:00:00Z</published>
  </entry>
</feed>
"""


def test_rss_xml_parsing():
    connector = RSSConnector()
    items = connector._parse_xml_items(SAMPLE_RSS_2_XML, source_id=1)
    assert len(items) == 1
    assert items[0].title == "日本の桜が開花しました"
    assert items[0].url == "https://www3.nhk.or.jp/news/article1.html"
    assert items[0].external_id == "nhk_news_001"
    assert "気象庁" in items[0].summary
    assert "季節" in items[0].tags
    assert "天気" in items[0].tags


def test_atom_xml_parsing():
    connector = RSSConnector()
    items = connector._parse_xml_items(SAMPLE_ATOM_XML, source_id=2)
    assert len(items) == 1
    assert "FastAPI" in items[0].title
    assert items[0].url == "https://qiita.com/articles/post-123"
    assert "モダンな日本語学習" in items[0].summary


def test_malformed_xml_graceful_recovery():
    connector = RSSConnector()
    items = connector._parse_xml_items("<<<NOT XML>>>", source_id=3)
    assert items == []
