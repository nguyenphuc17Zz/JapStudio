import re
from typing import Optional, Tuple, List, Dict, Any
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode


TRACKING_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "fbclid",
    "gclid",
    "ref",
    "ref_src",
    "source",
    "igshid",
    "mc_eid",
    "_ga",
    "_gl",
}

# Regex to detect Japanese Kana (Hiragana, Katakana) or CJK Unified Ideographs (Kanji)
JAPANESE_CHAR_REGEX = re.compile(r"[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]")

# Regex to strip dangerous script, style, iframe, object tags
DANGEROUS_TAGS_REGEX = re.compile(
    r"<(script|style|iframe|object|embed)[^>]*>.*?</\1>",
    re.IGNORECASE | re.DOTALL
)
DANGEROUS_ATTRIBUTES_REGEX = re.compile(
    r"\s*(on\w+|javascript:)\s*=\s*(['\"]).*?\2",
    re.IGNORECASE
)


class NormalizationService:
    """Production normalization service for canonicalizing URLs, cleaning text,
    sanitizing HTML, and detecting Japanese linguistic markers.
    """

    @staticmethod
    def canonicalize_url(url: str) -> str:
        """Standardizes URL scheme, host, removes tracking query parameters,
        and normalizes trailing slashes safely.
        """
        if not url:
            return ""

        url = url.strip()
        parsed = urlparse(url)

        # Standardize scheme and host to lowercase
        scheme = parsed.scheme.lower() or "https"
        netloc = parsed.netloc.lower()

        # Remove default ports (80 for http, 443 for https)
        if ":" in netloc:
            host, port = netloc.split(":", 1)
            if (scheme == "http" and port == "80") or (scheme == "https" and port == "443"):
                netloc = host

        # Normalize path: collapse duplicate slashes
        path = re.sub(r"/+", "/", parsed.path)
        if len(path) > 1 and path.endswith("/"):
            path = path[:-1]
        elif not path:
            path = "/"

        # Filter out tracking query parameters without destroying resource identity
        query_pairs = parse_qsl(parsed.query, keep_blank_values=False)
        filtered_query = [
            (k, v) for k, v in query_pairs
            if k.lower() not in TRACKING_PARAMS
        ]
        # Sort deterministically for idempotent matching
        filtered_query.sort(key=lambda x: x[0])
        new_query = urlencode(filtered_query)

        # Fragments are stripped for canonical article uniqueness
        return urlunparse((scheme, netloc, path, parsed.params, new_query, ""))

    @staticmethod
    def clean_text(text: Optional[str]) -> Optional[str]:
        """Trims whitespace, normalizes Unicode spaces, and cleans excessive newlines."""
        if not text:
            return None

        # Normalize line endings
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        # Replace non-breaking spaces with standard space
        text = text.replace("\u00a0", " ")

        # Clean line by line
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
        # Collapse multiple empty lines to max 1 empty line (standard \n\n paragraph separation)
        cleaned_lines = []
        consecutive_empty = 0
        for line in lines:
            if not line:
                consecutive_empty += 1
                if consecutive_empty <= 1:
                    cleaned_lines.append("")
            else:
                consecutive_empty = 0
                cleaned_lines.append(line)

        result = "\n".join(cleaned_lines).strip()
        return result or None

    @staticmethod
    def detect_japanese_presence(
        title: Optional[str],
        content: Optional[str]
    ) -> Tuple[bool, str]:
        """Detects whether title or content contains Japanese characters (Kana/Kanji).
        Returns: (has_japanese: bool, language_status: 'JA' | 'NON_JA' | 'UNKNOWN')
        """
        combined = f"{title or ''} {content or ''}".strip()
        if not combined:
            return False, "UNKNOWN"

        if JAPANESE_CHAR_REGEX.search(combined):
            return True, "JA"

        # Has content but no Kana/Kanji detected
        return False, "NON_JA"

    @staticmethod
    def has_html_tags(text: Optional[str]) -> bool:
        """Returns True if the string appears to contain HTML tags."""
        if not text:
            return False
        return bool(re.search(r"<[a-zA-Z\/][^>]*>", text))

    @classmethod
    def strip_html_to_plain(cls, html_str: Optional[str]) -> str:
        """Fast, robust stripping of HTML markup to plain text.
        Removes ruby annotations (<rt>, <rp>) first to preserve kanji,
        converts breaks/paragraphs to newlines, and unescapes entities.
        """
        if not html_str:
            return ""
        import html as html_module

        # 1. Remove script, style, audio, video, iframe
        text = DANGEROUS_TAGS_REGEX.sub("", html_str)
        text = re.sub(r"<(audio|video|noscript|nav|footer)[^>]*>.*?</\1>", "", text, flags=re.IGNORECASE | re.DOTALL)

        # 2. Remove <rt> and <rp> tags (furigana readings) so kanji is not concatenated with kana
        text = re.sub(r"<rt[^>]*>.*?</rt>", "", text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r"<rp[^>]*>.*?</rp>", "", text, flags=re.IGNORECASE | re.DOTALL)

        # 3. Replace block and break tags with newlines
        text = re.sub(r"<(p|br|div|h[1-6]|li|tr)[^>]*>", "\n", text, flags=re.IGNORECASE)

        # 4. Remove all remaining tags
        text = re.sub(r"<[^>]+>", "", text)

        # 5. Decode HTML entities
        text = html_module.unescape(text)

        # 6. Normalize whitespace
        return cls.clean_text(text) or ""

    @classmethod
    def clean_html_content(
        cls,
        raw_html: Optional[str],
        base_url: Optional[str] = None,
    ) -> Tuple[Optional[str], Optional[str], Optional[str], List[Dict[str, Any]]]:
        """
        Parses raw HTML and returns:
        (clean_text, cover_image_url, audio_url, images_list)
        """
        if not raw_html:
            return None, None, None, []

        import html as html_module
        from urllib.parse import urljoin

        cover_image: Optional[str] = None
        audio_url: Optional[str] = None
        images: List[Dict[str, Any]] = []

        # 1. Extract audio URL (<audio src="..."> or <source src="...">)
        audio_match = re.search(r'<audio[^>]+src=["\']([^"\']+)["\']', raw_html, re.IGNORECASE)
        if not audio_match:
            audio_match = re.search(r'<audio[^>]*>.*?<source[^>]+src=["\']([^"\']+)["\']', raw_html, re.IGNORECASE | re.DOTALL)
        if audio_match:
            audio_url = audio_match.group(1).strip()
            if base_url and not audio_url.startswith(("http://", "https://")):
                audio_url = urljoin(base_url, audio_url)

        # 2. Extract image URLs (<img ...>)
        img_matches = re.finditer(r'<img\s+[^>]*src=["\']([^"\']+)["\'][^>]*>', raw_html, re.IGNORECASE)
        for im in img_matches:
            tag_str = im.group(0)
            src = im.group(1).strip()
            if not src or src.startswith("data:"):
                continue
            if base_url and not src.startswith(("http://", "https://")):
                src = urljoin(base_url, src)

            # Extract alt / title as caption
            alt_match = re.search(r'alt=["\']([^"\']*)["\']', tag_str, re.IGNORECASE)
            caption = alt_match.group(1).strip() if alt_match else None

            if not cover_image and not src.endswith(".ico"):
                cover_image = src

            images.append({"url": src, "caption": caption, "position": len(images)})

        # 3. Strip boilerplate footers (e.g. NHK Easier footer links: Original / Permalink)
        processed_html = raw_html
        processed_html = re.sub(
            r'<ul[^>]*>\s*<li[^>]*><a[^>]+href=["\'][^"\']+nhk\.or\.jp[^"\']*["\'][^>]*>.*?</ul>',
            '',
            processed_html,
            flags=re.IGNORECASE | re.DOTALL
        )
        processed_html = re.sub(
            r'<ul[^>]*>\s*<li[^>]*><a[^>]+href=["\'][^"\']+nhkeasier\.com[^"\']*["\'][^>]*>.*?</ul>',
            '',
            processed_html,
            flags=re.IGNORECASE | re.DOTALL
        )

        # 4. Convert HTML into clean Japanese text
        clean_text = cls.strip_html_to_plain(processed_html)

        return clean_text or None, cover_image, audio_url, images

    @staticmethod
    def sanitize_html(html_str: Optional[str]) -> Optional[str]:
        """Removes script, iframe, and dangerous event handlers from HTML content."""
        if not html_str:
            return None

        sanitized = DANGEROUS_TAGS_REGEX.sub("", html_str)
        sanitized = DANGEROUS_ATTRIBUTES_REGEX.sub("", sanitized)
        return sanitized.strip() or None

    @staticmethod
    def validate_size_limits(
        title: Optional[str],
        content: Optional[str],
        max_title_chars: int = 500,
        max_content_chars: int = 500000
    ) -> Tuple[bool, Optional[str]]:
        """Validates that title and content conform to ingestion size boundaries."""
        if not title or not title.strip():
            return False, "EMPTY_TITLE"

        if len(title.strip()) > max_title_chars:
            return False, "TITLE_TOO_LONG"

        if content and len(content) > max_content_chars:
            return False, "CONTENT_TOO_LARGE"

        return True, None

