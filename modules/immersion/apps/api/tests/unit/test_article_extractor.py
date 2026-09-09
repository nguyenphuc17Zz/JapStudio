import pytest
from app.services.article_extractor import ArticleExtractor, ExtractedArticle

SAMPLE_HTML = """
<!DOCTYPE html>
<html>
<head>
  <title>スタイリストのおすすめギフト | キナリノ</title>
  <meta property="og:title" content="スタイリストのおすすめギフト" />
  <meta property="og:description" content="キナリノモールで人気のおすすめギフトを厳選してご紹介します。" />
  <meta property="og:image" content="https://example.com/cover.jpg" />
  <meta name="author" content="山田太郎" />
</head>
<body>
  <header><nav>Home | Categories | Contact</nav></header>
  <div class="ad-banner">広告バナー</div>
  <main>
    <h1>スタイリストのおすすめギフト</h1>
    <div class="article-body">
      <p>おしゃれな人は、キナリノモールで何を買う？スタイリストさんが厳選してご紹介します。</p>
      <h2>予算に合わせた選び方</h2>
      <p>日常使いする消耗品や、ちょっと贅沢なお菓子などが喜ばれる定番アイテムです。</p>
      <p>相手の好みが分からないときは、日持ちするフリーズドライのスープやお茶漬けもおすすめです。</p>
    </div>
  </main>
  <footer>Copyright 2026</footer>
</body>
</html>
"""

def test_article_extractor_standard():
    res = ArticleExtractor.extract(SAMPLE_HTML, "https://example.com/article/1")
    assert isinstance(res, ExtractedArticle)
    assert res.title == "スタイリストのおすすめギフト"
    assert res.author == "山田太郎"
    assert res.image_url == "https://example.com/cover.jpg"
    assert "キナリノモールで何を買う？" in res.content
    assert "予算に合わせた選び方" in res.content
    assert "日持ちするフリーズドライ" in res.content
    assert "Home | Categories" not in res.content
    assert "広告バナー" not in res.content
    assert res.paragraphs_count >= 3
    assert res.char_count > 100


def test_article_extractor_with_custom_selector():
    res = ArticleExtractor.extract(
        SAMPLE_HTML,
        "https://example.com/article/1",
        config={"content_selector": ".article-body"}
    )
    assert "キナリノモールで何を買う？" in res.content
    assert res.paragraphs_count >= 3


MULTIPAGE_HTML_P1 = """
<html><head><meta property="og:title" content="未来都市の理由" /></head>
<body><main><article class="article">
<section class="article-body">
<div class="article-lead">リード文の概要です。</div>
<div class="image-area"><img src="https://cdn.example/a1.jpg" alt="視察の様子" />
<div class="caption">座談会で演説する氏</div><div class="source">写真＝新華社</div></div>
<h4>見出し1</h4><p>本文パラグラフ1です。内容が続く。</p>
<a href="/articles/-/1?page=2">次ページ</a>
</section></article></main></body></html>
"""

MULTIPAGE_HTML_P2 = """
<html><body><!-- padding comment to exceed fetch guard: 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 -->
<main><article class="article">
<section class="article-body">
<h4>見出し2</h4><p>本文パラグラフ2です。続きの内容。さらに詳しい解説がここに続く文章です。追加の説明文で長さを確保する。もう一文追加して内容を充実させる。</p>
<p>追加パラグラフ3です。雄安新区の現状についてさらに掘り下げて解説する文章が続く。読者の理解を深めるための補足情報もここに記載する。</p>
<div class="image-area"><img src="https://cdn.example/a2.jpg" />
<div class="caption">駅の様子</div></div>
</section></article></main></body></html>
"""


def test_inline_images_extracted_with_caption():
    res = ArticleExtractor.extract(MULTIPAGE_HTML_P1, "https://president.jp/articles/-/1")
    assert len(res.images) >= 1
    assert res.images[0].url == "https://cdn.example/a1.jpg"
    assert "座談会" in (res.images[0].caption or "")
    assert "新華社" in (res.images[0].credit or "")


def test_pagination_discovery_president_style():
    urls = ArticleExtractor.discover_pagination_urls(MULTIPAGE_HTML_P1, "https://president.jp/articles/-/1")
    assert any("page=2" in u for u in urls)


@pytest.mark.asyncio
async def test_extract_multipage_merges_pages_and_images():
    async def fake_fetch(url: str):
        if "page=2" in url:
            return MULTIPAGE_HTML_P2
        return None

    res = await ArticleExtractor.extract_multipage(
        MULTIPAGE_HTML_P1, "https://president.jp/articles/-/1", fake_fetch
    )
    assert res.pages_fetched >= 2
    assert "パラグラフ1" in res.content
    assert "パラグラフ2" in res.content
    urls = [im.url for im in res.images]
    assert "https://cdn.example/a1.jpg" in urls
    assert "https://cdn.example/a2.jpg" in urls


def test_normalize_image_url_dedupes_resized_variants():
    a = "https://president.ismcdn.jp/mwimgs/a/1/670wm/img_a1.jpg"
    b = "https://president.ismcdn.jp/mwimgs/a/1/1340wm/img_a1.jpg"
    assert ArticleExtractor.normalize_image_url(a) == ArticleExtractor.normalize_image_url(b)
    merged = ArticleExtractor.merge_image_lists([{"url": a}], [{"url": b}])
    assert len(merged) == 1
    assert merged[0]["url"] == b  # new (larger srcset best) wins


def test_merge_replace_on_full_drops_old_junk():
    junk = [{"url": "https://example.com/footer.png"}]
    fresh = [{"url": "https://cdn.example/a1.jpg"}]
    assert len(ArticleExtractor.merge_image_lists(junk, fresh)) == 2
    replaced = ArticleExtractor.merge_image_lists(junk, fresh, replace_on_full=True)
    assert replaced == fresh


WALL_HTML_JP = """
<html><head><title>アクセス確認</title></head>
<body><!-- padding 0123456789 0123456789 0123456789 0123456789 0123456789 -->
<main><div class="wall">
<p>アクセス確認のためのページです。しばらくお待ちください。自動的に移動します。</p>
</div></main></body></html>
"""

WALL_HTML_CF = """
<html><head><title>Just a moment...</title></head>
<body><!-- padding 0123456789 0123456789 0123456789 0123456789 0123456789 -->
<div>Verifying you are human. This may take a few seconds.</div>
<script>var __cf_chl_opt = {};</script>
</body></html>
"""


def test_detect_bot_wall_jp_access_check():
    is_wall, reason = ArticleExtractor.detect_bot_wall("アクセス確認", WALL_HTML_JP, "短い本文")
    assert is_wall is True
    res = ArticleExtractor.extract(WALL_HTML_JP, "https://www.nikkei.com/")
    assert res.is_bot_wall is True
    assert res.wall_reason is not None


def test_detect_bot_wall_cloudflare():
    is_wall, reason = ArticleExtractor.detect_bot_wall("Just a moment...", WALL_HTML_CF, "")
    assert is_wall is True
    res = ArticleExtractor.extract(WALL_HTML_CF, "https://example.com/")
    assert res.is_bot_wall is True


def test_no_false_positive_on_normal_article():
    is_wall, _ = ArticleExtractor.detect_bot_wall(
        "スタイリストのおすすめギフト", SAMPLE_HTML, "キナリノモールで何を買う？"
    )
    assert is_wall is False
    res = ArticleExtractor.extract(SAMPLE_HTML, "https://example.com/article/1")
    assert res.is_bot_wall is False


@pytest.mark.asyncio
async def test_multipage_stops_at_wall_first_page():
    async def should_not_be_called(url: str):
        raise AssertionError("must not probe sub-pages of a wall")

    res = await ArticleExtractor.extract_multipage(
        WALL_HTML_JP, "https://www.nikkei.com/", should_not_be_called
    )
    assert res.is_bot_wall is True
