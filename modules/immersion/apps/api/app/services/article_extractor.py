import re
from typing import Dict, Any, Optional, List
import lxml.html
from urllib.parse import urljoin
from pydantic import BaseModel

from app.core.logging import get_logger

logger = get_logger("services.article_extractor")


class ExtractedImage(BaseModel):
    url: str
    caption: Optional[str] = None
    credit: Optional[str] = None
    position: int = 0  # index of nearest text block (for inline rendering)


class ExtractedArticle(BaseModel):
    title: Optional[str] = None
    content: str
    excerpt: Optional[str] = None
    author: Optional[str] = None
    image_url: Optional[str] = None
    images: List[ExtractedImage] = []
    pages_fetched: int = 1
    char_count: int = 0
    paragraphs_count: int = 0
    # Bot-wall / challenge page detection (Cloudflare, Imperva, access checks).
    # When True, the HTML is a bot wall — NEVER persist this as article content.
    is_bot_wall: bool = False
    wall_reason: Optional[str] = None


class ArticleExtractor:
    """Intelligent Japanese HTML article extractor.
    Strips noise, identifies semantic article containers, extracts structured paragraphs,
    follows ?page=N pagination, and captures titles, authors, cover + inline images.
    """

    @staticmethod
    def normalize_image_url(url: str) -> str:
        """Canonicalizes image URLs so resized variants dedupe (President ismcdn
        serves the same photo as /mwimgs/a/b/670wm/..., /1340wm/..., /1200wm/...)."""
        try:
            return re.sub(r"(/mwimgs/[^/]+/[^/]+/)[^/]+/", r"\1", url.strip())
        except Exception:
            return url

    @staticmethod
    def merge_image_lists(
        existing: List[Any],
        new_images: List[Any],
        replace_on_full: bool = False,
    ) -> List[Any]:
        """Merges image dict lists, deduping by normalized URL (new wins).

        replace_on_full: when a multipage full extract succeeded, the old list
        may be junk from a previously broken single-page extract (e.g. footer
        thumbnails) — replace it instead of merging.
        """
        def _to_dict(im: Any) -> Optional[Dict[str, Any]]:
            try:
                d = im.model_dump() if hasattr(im, "model_dump") else dict(im)
                if d.get("url"):
                    return d
            except Exception:
                pass
            return None

        fresh = [d for d in (_to_dict(im) for im in (new_images or [])) if d]
        if replace_on_full and fresh:
            base: List[Dict[str, Any]] = []
        else:
            base = [d for d in (_to_dict(im) for im in (existing or [])) if d]
        index: Dict[str, int] = {}
        for i, d in enumerate(base):
            try:
                index.setdefault(ArticleExtractor.normalize_image_url(d["url"]), i)
            except Exception:
                pass
        for d in fresh:
            try:
                key = ArticleExtractor.normalize_image_url(d["url"])
            except Exception:
                continue
            if key in index:
                base[index[key]] = d  # new (larger srcset best) wins
            else:
                index[key] = len(base)
                base.append(d)
        return base

    # NOTE: never use a bare contains(@class,'ad-') — it matches layout wrappers
    # like President JP's `l-contents__inner --ad-gate` and deletes the whole
    # article. Only match explicit leaf ad-slot classes/ids.
    NOISE_XPATH = (
        "//script | //style | //nav | //footer | //header | //aside | //noscript | //iframe | //svg | "
        "//rt | //rp | "
        "//*[starts-with(@id, 'div-gpt-ad')] | "
        "//*[contains(@class, 'ad-rectangle') or contains(@class, 'ad-below-rectangle') or "
        "contains(@class, 'ad-billboard') or contains(@class, 'area-billboard') or "
        "contains(@class, 'advertisement') or "
        "contains(@class, 'sns') or contains(@class, 'share') or contains(@class, 'social') or "
        "contains(@class, 'banner') or contains(@class, 'recommend') or contains(@class, 'ranking') or "
        "contains(@class, 'breadcrumb') or contains(@class, 'comment-list') or contains(@class, 'popup')]"
    )

    SEMANTIC_CANDIDATES = [
        "//article",
        "//main",
        "//*[@itemprop='articleBody']",
        "//*[contains(@class, 'article-body') or contains(@class, 'article__body') or contains(@class, 'article_body')]",
        "//*[contains(@class, 'entry-content') or contains(@class, 'post-content')]",
        "//*[contains(@class, 'l-content-box') or contains(@class, 'p-article')]",
    ]

    MAX_FALLBACK_CHARS = 50000
    MAX_PAGINATION_PAGES = 8

    # Bot-wall / JS-challenge fingerprints. Title hits are decisive on their own;
    # HTML markers count only together with short/empty article text (to avoid
    # false positives on legit articles that merely mention these words).
    BOT_WALL_TITLE_PATTERNS = [
        "アクセス確認",
        "アクセスが拒否",
        "just a moment",
        "attention required",
        "checking your browser",
        "verify you are human",
        "please verify",
        "access denied",
        "forbidden",
        "セキュリティチェック",
        "認証が必要です",
        "captcha",
    ]
    BOT_WALL_HTML_MARKERS = [
        "__cf_chl",
        "cf-mitigated",
        "challenges.cloudflare.com",
        "incapsula",
        "_imperva",
        "imperva",
        "perimeterx",
        "px-captcha",
        "datadome",
        "captcha-delivery",
        "enable javascript to",
        "javascript を有効",
        "please enable javascript",
    ]
    BOT_WALL_FIX_HINT = (
        "Trang web trả về trang kiểm tra bot (bot-wall) thay vì nội dung thật. "
        "Cách xử lý: 1) Thêm cookie phiên duyệt 'cf_clearance' vào config_json['cookie']; "
        "2) Bật extraction_mode='browser' cho nguồn này để dùng trình duyệt thật; "
        "3) Hoặc chuyển sang nguồn RSS chính chủ nếu có."
    )

    @classmethod
    def extract(
        cls,
        html_text: str,
        page_url: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> ExtractedArticle:
        config = config or {}
        try:
            doc = lxml.html.fromstring(html_text)
        except Exception as err:
            logger.warning(f"Failed to parse HTML for {page_url}: {err}")
            return ExtractedArticle(content="", char_count=0, paragraphs_count=0)

        # 1. Metadata discovery (before dropping tags)
        title = cls._extract_title(doc, html_text, page_url, config.get("title_selector"))
        author = cls._extract_author(doc, html_text, config.get("author_selector"))
        image_url = cls._extract_image(doc, html_text, page_url)
        og_excerpt = cls._extract_og_excerpt(html_text)

        # 2. Locate article container FIRST so noise removal can never delete
        # an ancestor wrapper of the real content (e.g. President JP embeds the
        # article inside `l-contents__inner --ad-gate`).
        content_selector = config.get("content_selector")
        container = None
        if content_selector:
            try:
                nodes = (
                    doc.xpath(content_selector)
                    if content_selector.startswith("/")
                    else doc.cssselect(content_selector)
                )
                if nodes:
                    container = nodes[0]
            except Exception as e:
                logger.warning(f"Custom selector {content_selector} failed: {e}")

        if container is None:
            for sel in cls.SEMANTIC_CANDIDATES:
                try:
                    nodes = doc.xpath(sel)
                    if nodes:
                        container = nodes[0]
                        break
                except Exception:
                    pass

        # 3. Drop noise elements, but never the container or its ancestors
        try:
            protected = set(container.iterancestors()) if container is not None else set()
            if container is not None:
                protected.add(container)
        except Exception:
            protected = set()
        for tag in doc.xpath(cls.NOISE_XPATH):
            try:
                if any(tag is p for p in protected):
                    continue
                tag.drop_tree()
            except Exception:
                pass

        root_node = container if container is not None else (doc.body if doc.body is not None else doc)

        # 4. Extract structured paragraphs & headings
        blocks: List[str] = []
        seen = set()

        # XPath to query heading and paragraph nodes
        nodes = root_node.xpath(
            ".//h1 | .//h2 | .//h3 | .//h4 | .//p | "
            ".//*[contains(@class, 'text') or contains(@class, 'comment') or contains(@class, 'lead') or contains(@class, 'desc')]"
        )

        for n in nodes:
            txt = " ".join(n.text_content().split())
            min_len = 4 if getattr(n, "tag", "") in ("h1", "h2", "h3", "h4") else 10
            if len(txt) >= min_len and txt not in seen:
                # Discard title repeat
                if title and txt == title:
                    continue
                seen.add(txt)
                blocks.append(txt)

        # 4. Extract structured paragraphs & headings
        blocks: List[str] = []
        seen = set()

        # XPath to query heading and paragraph nodes (incl. President JP lead/caption blocks)
        nodes = root_node.xpath(
            ".//h1 | .//h2 | .//h3 | .//h4 | .//p | "
            ".//*[contains(@class, 'text') or contains(@class, 'comment') or contains(@class, 'lead') or contains(@class, 'desc') or contains(@class, 'caption')]"
        )

        for n in nodes:
            txt = " ".join(n.text_content().split())
            min_len = 4 if getattr(n, "tag", "") in ("h1", "h2", "h3", "h4") else 10
            if len(txt) >= min_len and txt not in seen:
                # Discard title repeat
                if title and txt == title:
                    continue
                seen.add(txt)
                blocks.append(txt)

        # Inline images with captions (hotlink original URLs)
        images = cls._extract_inline_images(doc, root_node, page_url, len(blocks))

        # Fallback if no structured blocks found: raw body text
        if not blocks:
            raw_text = " ".join(root_node.text_content().split())
            if len(raw_text) > 30:
                blocks.append(raw_text[: cls.MAX_FALLBACK_CHARS])

        full_content = "\n\n".join(blocks).strip()
        excerpt = og_excerpt or (blocks[0] if blocks else None)
        if excerpt and len(excerpt) > 300:
            excerpt = excerpt[:297] + "..."

        is_wall, wall_reason = cls.detect_bot_wall(title, html_text, full_content)

        return ExtractedArticle(
            title=title,
            content=full_content,
            excerpt=excerpt,
            author=author,
            image_url=image_url,
            images=images,
            pages_fetched=1,
            char_count=len(full_content),
            paragraphs_count=len(blocks),
            is_bot_wall=is_wall,
            wall_reason=wall_reason,
        )

    @classmethod
    def _pick_best_src(cls, img_el) -> Optional[str]:
        """Picks the largest URL from srcset when available, else src/data-src."""
        srcset = img_el.get("srcset") or img_el.get("data-srcset")
        if srcset:
            best_url: Optional[str] = None
            best_w = -1
            for part in srcset.split(","):
                part = part.strip()
                if not part:
                    continue
                tokens = part.split()
                url = tokens[0]
                w = 0
                if len(tokens) > 1:
                    m = re.match(r"(\d+)", tokens[1])
                    if m:
                        try:
                            w = int(m.group(1))
                        except ValueError:
                            w = 0
                if w >= best_w:
                    best_w = w
                    best_url = url
            if best_url:
                return best_url
        return img_el.get("src") or img_el.get("data-src") or img_el.get("data-original")

    @classmethod
    def _extract_inline_images(
        cls,
        doc: lxml.html.HtmlElement,
        root_node: lxml.html.HtmlElement,
        page_url: str,
        position_hint: int = 0,
    ) -> List[ExtractedImage]:
        """Collects article body images with caption/credit in document order."""
        images: List[ExtractedImage] = []
        seen_urls = set()
        try:
            img_nodes = root_node.xpath(".//img")
        except Exception:
            return images
        for img in img_nodes:
            try:
                src = cls._pick_best_src(img)
            except Exception:
                continue
            if not src or src.startswith("data:"):
                continue
            slow = src.lower()
            if any(ign in slow for ign in ["icon", "logo", "avatar", "1x1", "pixel", "spinner", "sprite", "noimage"]):
                continue
            # Skip tiny avatars/thumbnails declared via width/height attributes
            is_tiny = False
            for dim_attr in (img.get("width"), img.get("height")):
                try:
                    if dim_attr and str(dim_attr).isdigit() and int(str(dim_attr)) <= 64:
                        is_tiny = True
                        break
                except Exception:
                    pass
            if is_tiny:
                continue
            # Skip author/profile blocks (articleInfo, author, thum, profile)
            try:
                ancestor_classes = " ".join(
                    (a.get("class") or "") for a in img.iterancestors()
                ).lower()
                if any(k in ancestor_classes for k in ["author", "articleinfo", "thum", "profile", "avatar"]):
                    continue
            except Exception:
                pass
            full_url = urljoin(page_url, src.strip())
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)
            caption: Optional[str] = None
            credit: Optional[str] = None
            try:
                parent = img.getparent()
                depth = 0
                while parent is not None and depth < 4:
                    # caption + credit candidates inside the same figure/image-area block
                    if caption is None:
                        cap_nodes = parent.xpath(
                            ".//*[contains(@class, 'caption') or contains(@class, 'figcaption') or self::figcaption]"
                        )
                        for c in cap_nodes:
                            t = " ".join(c.text_content().split())
                            if len(t) >= 4:
                                caption = t[:500]
                                break
                    if credit is None:
                        cred_nodes = parent.xpath(
                            ".//*[contains(@class, 'source') or contains(@class, 'credit')]"
                        )
                        for c in cred_nodes:
                            t = " ".join(c.text_content().split())
                            if t and len(t) <= 200:
                                credit = t
                                break
                    if caption is not None and credit is not None:
                        break
                    parent = parent.getparent()
                    depth += 1
                alt = (img.get("alt") or "").strip()
                if not caption and alt and len(alt) >= 4 and "img_" not in alt:
                    caption = " ".join(alt.split())[:500]
            except Exception:
                pass
            images.append(
                ExtractedImage(
                    url=full_url, caption=caption, credit=credit, position=position_hint
                )
            )
        return images

    @classmethod
    def detect_bot_wall(
        cls,
        title: Optional[str],
        html_text: str,
        content: str = "",
    ) -> tuple[bool, Optional[str]]:
        """Detects bot-wall / JS-challenge pages. Returns (is_wall, reason)."""
        try:
            t = (title or "").lower()
            for pat in cls.BOT_WALL_TITLE_PATTERNS:
                if pat in t:
                    return True, f"wall-title:{pat}"
            h = (html_text or "").lower()
            if h:
                for marker in cls.BOT_WALL_HTML_MARKERS:
                    if marker in h and len(content or "") < 500:
                        return True, f"wall-marker:{marker}"
        except Exception:
            pass
        return False, None

    @classmethod
    def discover_pagination_urls(
        cls,
        html_text: str,
        page_url: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """Discovers same-article pagination URLs (generic ?page=N + next-page links)."""
        config = config or {}
        found: List[str] = []
        seen = {page_url.rstrip("/")}
        try:
            doc = lxml.html.fromstring(html_text)
        except Exception:
            return found
        candidates: List[str] = []
        try:
            for a in doc.xpath("//a[@href]"):
                href = (a.get("href") or "").strip()
                text = " ".join(a.text_content().split())
                rel = (a.get("rel") or "").lower()
                if not href or href.startswith("#") or href.startswith("javascript:") or href.startswith("mailto:"):
                    continue
                full = urljoin(page_url, href)
                # same-article guard: same path prefix (handles /articles/-/118603?page=2)
                try:
                    from urllib.parse import urlparse

                    p_base = urlparse(page_url)
                    p_full = urlparse(full)
                    if p_full.netloc != p_base.netloc:
                        continue
                    base_path = p_base.path.rstrip("/")
                    full_path = p_full.path.rstrip("/")
                    if full_path != base_path and not full_path.startswith(base_path + "/"):
                        # allow only ?page= query on the exact same path
                        if not (full_path == base_path):
                            continue
                except Exception:
                    continue
                is_page_param = bool(re.search(r"[?&]page=\d+", full))
                is_next_text = text in ("次ページ", "次のページ", "次へ", "Next", ">", "»") or "次ページ" in text
                is_rel_next = "next" in rel
                if is_page_param or is_next_text or is_rel_next:
                    candidates.append(full)
        except Exception:
            pass
        # explicit ?page=N sequence probe — ONLY when a pagination hint exists
        # (or known multipage hosts like president.jp), to avoid N extra
        # requests for every single-page article.
        m = re.search(r"[?&]page=(\d+)", page_url)
        start_page = int(m.group(1)) if m else 1
        base_clean = re.sub(r"[?&]page=\d+", "", page_url).rstrip("?&")
        sep = "&" if "?" in base_clean else "?"
        max_pages = int(config.get("max_pages", cls.MAX_PAGINATION_PAGES) or cls.MAX_PAGINATION_PAGES)
        max_pages = max(1, min(max_pages, 10))
        has_hint = len(candidates) > 0
        try:
            from urllib.parse import urlparse as _up

            _host = _up(page_url).netloc.lower()
            if "president.jp" in _host:
                has_hint = True
        except Exception:
            pass
        if has_hint:
            for n in range(start_page + 1, start_page + max_pages):
                probe = f"{base_clean}{sep}page={n}"
                if probe.rstrip("/") not in seen and probe not in candidates:
                    candidates.append(probe)
        # order: explicit candidates first, then probes; dedupe
        ordered: List[str] = []
        for u in candidates:
            key = u.rstrip("/")
            if key not in seen:
                seen.add(key)
                ordered.append(u)
            if len(ordered) >= max_pages:
                break
        return ordered[:max_pages]

    @classmethod
    async def extract_multipage(
        cls,
        first_html: str,
        page_url: str,
        fetch_html,
        config: Optional[Dict[str, Any]] = None,
    ) -> ExtractedArticle:
        """Merges page 1..N into one full-text article + combined inline images.

        fetch_html: async callable (url) -> html string | None. Each sub-page is
        SSRF-validated by the caller. Stops on empty/duplicate content.
        """
        config = config or {}
        first = cls.extract(first_html, page_url, config=config)
        if first.is_bot_wall:
            # Listing/article page itself is a bot wall — do not probe sub-pages.
            return first
        page_urls = cls.discover_pagination_urls(first_html, page_url, config=config)
        if not page_urls:
            return first
        blocks: List[str] = [first.content] if first.content else []
        seen_blocks = set(blocks)
        images: List[ExtractedImage] = list(first.images or [])
        seen_img = {im.url for im in images}
        title = first.title
        author = first.author
        excerpt = first.excerpt
        image_url = first.image_url
        pages_fetched = 1
        for sub_url in page_urls:
            try:
                sub_html = await fetch_html(sub_url)
            except Exception as e:
                logger.debug(f"Multipage fetch skipped {sub_url}: {e}")
                break
            if not sub_html or len(sub_html) < 200:
                break
            try:
                sub = cls.extract(sub_html, sub_url, config=config)
            except Exception:
                break
            if getattr(sub, "is_bot_wall", False):
                # sub-page hit a bot wall (session expired mid-crawl) — stop probing.
                logger.debug(f"Multipage stopped at {sub_url}: bot wall ({sub.wall_reason})")
                break
            if not sub.content or sub.content in seen_blocks:
                # duplicate or login wall — stop probing further pages
                if not sub.content:
                    break
                continue
            # guard: sub-page with a totally different real title is likely unrelated.
            # (Skip the check when the sub-page title is just the URL fallback.)
            sub_title_is_real = bool(sub.title and sub.title != sub_url)
            if sub_title_is_real and title and sub.title != title and len(sub.content) < 200:
                break
            seen_blocks.add(sub.content)
            blocks.append(sub.content)
            pages_fetched += 1
            if not image_url and sub.image_url:
                image_url = sub.image_url
            for im in sub.images or []:
                if im.url not in seen_img:
                    seen_img.add(im.url)
                    images.append(im)
            # stop if content starts repeating (pagination loop)
            if pages_fetched >= int(config.get("max_pages", cls.MAX_PAGINATION_PAGES) or 1):
                break
        full_content = "\n\n".join(b for b in blocks if b).strip()
        # re-assign image positions spread across merged blocks
        total_blocks = max(len(blocks), 1)
        for idx, im in enumerate(images):
            try:
                im.position = int(idx * total_blocks / max(len(images), 1))
            except Exception:
                pass
        return ExtractedArticle(
            title=title,
            content=full_content,
            excerpt=excerpt,
            author=author or first.author,
            image_url=image_url,
            images=images,
            pages_fetched=pages_fetched,
            char_count=len(full_content),
            paragraphs_count=len(blocks),
            is_bot_wall=False,
            wall_reason=None,
        )

    @classmethod
    def _extract_title(
        cls,
        doc: lxml.html.HtmlElement,
        html_text: str,
        page_url: str,
        title_selector: Optional[str] = None,
    ) -> str:
        if title_selector:
            try:
                nodes = doc.xpath(title_selector) if title_selector.startswith("/") else doc.cssselect(title_selector)
                if nodes and nodes[0].text_content().strip():
                    return " ".join(nodes[0].text_content().split())
            except Exception:
                pass

        # OpenGraph title
        og_match = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', html_text, re.IGNORECASE)
        if og_match and og_match.group(1).strip():
            return og_match.group(1).strip()

        # <h1>
        h1 = doc.xpath("//h1")
        if h1 and h1[0].text_content().strip():
            return " ".join(h1[0].text_content().split())

        # <title> tag
        title_tag = doc.xpath("//title")
        if title_tag and title_tag[0].text_content().strip():
            raw = " ".join(title_tag[0].text_content().split())
            # Strip site name suffix like " | キナリノ" or " - 毎日新聞"
            cleaned = re.split(r"\s*[\|\-–—]\s*", raw)[0].strip()
            return cleaned or raw

        return page_url

    @classmethod
    def _extract_author(
        cls,
        doc: lxml.html.HtmlElement,
        html_text: str,
        author_selector: Optional[str] = None,
    ) -> Optional[str]:
        if author_selector:
            try:
                nodes = doc.xpath(author_selector) if author_selector.startswith("/") else doc.cssselect(author_selector)
                if nodes and nodes[0].text_content().strip():
                    return " ".join(nodes[0].text_content().split())
            except Exception:
                pass

        author_meta = re.search(r'<meta[^>]+name=["\']author["\'][^>]+content=["\']([^"\']+)["\']', html_text, re.IGNORECASE)
        if author_meta and author_meta.group(1).strip():
            return author_meta.group(1).strip()

        rel_author = doc.xpath("//*[@rel='author'] | //*[contains(@class, 'author')]")
        if rel_author:
            t = " ".join(rel_author[0].text_content().split())
            if 0 < len(t) <= 50:
                return t

        return None

    @classmethod
    def _extract_image(
        cls,
        doc: lxml.html.HtmlElement,
        html_text: str,
        page_url: str,
    ) -> Optional[str]:
        og_img = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html_text, re.IGNORECASE)
        if og_img and og_img.group(1).strip():
            return urljoin(page_url, og_img.group(1).strip())

        imgs = doc.xpath("//article//img | //main//img | //img")
        for img in imgs:
            src = img.get("src") or img.get("data-src") or img.get("data-original")
            if src and not src.startswith("data:") and not any(ign in src.lower() for ign in ["icon", "logo", "avatar", "1x1"]):
                return urljoin(page_url, src)

        return None

    @classmethod
    def _extract_og_excerpt(cls, html_text: str) -> Optional[str]:
        og_desc = re.search(r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']', html_text, re.IGNORECASE)
        if og_desc and og_desc.group(1).strip():
            return og_desc.group(1).strip()
        meta_desc = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']', html_text, re.IGNORECASE)
        if meta_desc and meta_desc.group(1).strip():
            return meta_desc.group(1).strip()
        return None
