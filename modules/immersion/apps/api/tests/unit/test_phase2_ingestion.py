import pytest
from datetime import datetime, timedelta
from app.services.normalizer import NormalizationService
from app.services.deduplicator import DeduplicationService
from app.services.circuit_breaker import CircuitBreakerService
from app.models.content import CanonicalContent
from app.models.ingestion import SourceSyncState


def test_canonicalize_url():
    # 1. Strips tracking params
    raw_url = "https://www.nhk.or.jp/news/article.html?utm_source=twitter&utm_medium=social&article_id=12345&fbclid=abcdef#comments"
    canonical = NormalizationService.canonicalize_url(raw_url)
    assert "utm_source" not in canonical
    assert "fbclid" not in canonical
    assert "#comments" not in canonical
    assert "article_id=12345" in canonical
    assert canonical.startswith("https://www.nhk.or.jp/news/article.html")

    # 2. Removes trailing slash on root / clean path
    assert NormalizationService.canonicalize_url("http://EXAMPLE.com/path/") == "http://example.com/path"
    assert NormalizationService.canonicalize_url("http://example.com:80/path") == "http://example.com/path"
    assert NormalizationService.canonicalize_url("https://example.com:443/") == "https://example.com/"


def test_clean_text():
    dirty = "   \n\n  ニュースのタイトルです。  \r\n\r\n\r\n   詳細な本文です。\u00a0\u00a0\n\n\n\n"
    cleaned = NormalizationService.clean_text(dirty)
    assert cleaned == "ニュースのタイトルです。\n\n詳細な本文です。"


def test_detect_japanese_presence():
    # Japanese Kanji + Kana
    has_ja, status = NormalizationService.detect_japanese_presence("富士山の初雪", "本日、富士山頂で初雪が観測されました。")
    assert has_ja is True
    assert status == "JA"

    # Hiragana only
    has_ja, status = NormalizationService.detect_japanese_presence("こんにちは", None)
    assert has_ja is True
    assert status == "JA"

    # Katakana only
    has_ja, status = NormalizationService.detect_japanese_presence("コンピューター", None)
    assert has_ja is True
    assert status == "JA"

    # Pure English
    has_ja, status = NormalizationService.detect_japanese_presence("Breaking News: Tech earnings", "Apple reported quarterly earnings today.")
    assert has_ja is False
    assert status == "NON_JA"

    # Empty
    has_ja, status = NormalizationService.detect_japanese_presence("", None)
    assert has_ja is False
    assert status == "UNKNOWN"


def test_sanitize_html():
    malicious = """
    <p>安全な段落です。<script>alert('xss')</script><a href="https://example.com" onclick="steal()">リンク</a></p>
    <iframe src="http://evil.com"></iframe>
    <ruby>漢字<rt>かんじ</rt></ruby>
    """
    sanitized = NormalizationService.sanitize_html(malicious)
    assert "<script>" not in sanitized
    assert "alert('xss')" not in sanitized
    assert "<iframe>" not in sanitized
    assert "onclick=" not in sanitized
    assert "<p>安全な段落です。" in sanitized
    assert "<ruby>漢字<rt>かんじ</rt></ruby>" in sanitized


def test_validate_size_limits():
    valid, err = NormalizationService.validate_size_limits("正常なタイトル", "正常な本文")
    assert valid is True
    assert err is None

    empty, err = NormalizationService.validate_size_limits("   ", "本文")
    assert empty is False
    assert err == "EMPTY_TITLE"

    long_title, err = NormalizationService.validate_size_limits("あ" * 600, "本文")
    assert long_title is False
    assert err == "TITLE_TOO_LONG"


def test_content_hash_deterministic():
    hash1 = DeduplicationService.compute_content_hash("東京の天気", "明日は晴れでしょう。")
    hash2 = DeduplicationService.compute_content_hash("東京の天気", "明日は晴れでしょう。")
    hash3 = DeduplicationService.compute_content_hash("東京の天気", "明日は雨でしょう。")

    assert hash1 == hash2
    assert hash1 != hash3
    assert len(hash1) == 64 # SHA-256 hex


def test_deduplication_decision_logic():
    # 1. No existing record -> CREATE
    action, _ = DeduplicationService.decide_action(None, "hash_001")
    assert action == "CREATE"

    # 2. Existing with identical hash and no newer date -> DUPLICATE
    existing = CanonicalContent(
        id=1,
        source_id=1,
        canonical_url="https://nhk.or.jp/1",
        title="テスト",
        content_hash="hash_001",
        updated_at_source=datetime(2026, 9, 8, 10, 0, 0)
    )
    action, target = DeduplicationService.decide_action(existing, "hash_001", datetime(2026, 9, 8, 10, 0, 0))
    assert action == "DUPLICATE"
    assert target.id == 1

    # 3. Existing with changed content hash -> UPDATE
    action, target = DeduplicationService.decide_action(existing, "hash_002", datetime(2026, 9, 8, 10, 0, 0))
    assert action == "UPDATE"
    assert target.id == 1

    # 4. Existing with same hash but newer updated date -> UPDATE
    action, target = DeduplicationService.decide_action(existing, "hash_001", datetime(2026, 9, 8, 12, 0, 0))
    assert action == "UPDATE"


def test_circuit_breaker_transitions():
    state = SourceSyncState(source_id=1)

    # Initially CLOSED
    can_run, state_name = CircuitBreakerService.can_execute(state)
    assert can_run is True
    assert state_name == "CLOSED"

    # Simulate 9 transient failures -> remains CLOSED
    for _ in range(9):
        CircuitBreakerService.record_failure(state, is_permanent=False)
    assert state.circuit_state == "CLOSED"
    assert state.consecutive_failures == 9

    # 10th failure -> trips OPEN
    CircuitBreakerService.record_failure(state, is_permanent=False)
    assert state.circuit_state == "OPEN"
    assert state.circuit_opened_at is not None

    # Immediate check -> blocked
    can_run, msg = CircuitBreakerService.can_execute(state)
    assert can_run is False
    assert "CIRCUIT_OPEN" in msg

    # Fast forward past 30 minute cooldown
    state.circuit_opened_at = datetime.utcnow() - timedelta(minutes=35)
    can_run, state_name = CircuitBreakerService.can_execute(state)
    assert can_run is True
    assert state_name == "HALF_OPEN"
    assert state.circuit_state == "HALF_OPEN"

    # Success in HALF_OPEN resets to CLOSED
    CircuitBreakerService.record_success(state)
    assert state.circuit_state == "CLOSED"
    assert state.consecutive_failures == 0
