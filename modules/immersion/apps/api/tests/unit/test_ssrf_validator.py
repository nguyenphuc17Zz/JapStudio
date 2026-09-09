import pytest
from app.core.ssrf_validator import SSRFValidator, SSRFSecurityException


def test_ssrf_blocks_private_ipv4():
    blocked_urls = [
        "http://127.0.0.1:8080/secret",
        "http://localhost/admin",
        "http://10.0.0.1/internal",
        "http://192.168.1.1/router",
        "http://172.16.5.4/data",
        "http://169.254.169.254/latest/meta-data/",
    ]
    for url in blocked_urls:
        with pytest.raises(SSRFSecurityException):
            SSRFValidator.validate_url(url)


def test_ssrf_blocks_invalid_schemes():
    invalid_schemes = [
        "file:///etc/passwd",
        "ftp://example.com/file",
        "gopher://example.com",
        "javascript:alert(1)",
        "data:text/html,<html>",
    ]
    for url in invalid_schemes:
        with pytest.raises(SSRFSecurityException):
            SSRFValidator.validate_url(url)


def test_ssrf_blocks_loopback_ipv6():
    with pytest.raises(SSRFSecurityException):
        SSRFValidator.validate_url("http://[::1]:8000/api")


def test_ssrf_allows_valid_public_domains():
    valid_urls = [
        "https://www3.nhk.or.jp/news/easy/",
        "https://qiita.com/popular-items/feed",
        "https://zenn.dev/feed",
    ]
    for url in valid_urls:
        is_valid, msg = SSRFValidator.validate_url(url)
        assert is_valid is True
        assert msg == "URL is safe"
