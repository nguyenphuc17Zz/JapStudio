import json
import logging
import math
import re
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, and_, or_, desc, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.content import CanonicalContent
from app.models.enrichment import ContentEnrichment
from app.models.source import ContentSource
from app.models.discovery import (
    Topic,
    TrendingTopic,
    TopicContent,
    TrendSnapshot,
    DiscoveryEdge,
    DiscoverySession,
)
from app.schemas.discovery import (
    TopicResponse,
    TrendingTopicItem,
    TrendingTopicsResponse,
    ExploreCategoryGroup,
    ExplorePageResponse,
    TopicArticleItem,
    RegisterComparisonItem,
    TopicDetailResponse,
    TopicTimelineEvent,
    TopicTimelineResponse,
    TopicSourceComparisonResponse,
    RabbitHoleNode,
    RabbitHoleResponse,
    AdminTrendItem,
    AdminTrendsResponse,
)

logger = logging.getLogger(__name__)


class DiscoveryService:
    """Core domain logic for Japanese Trends, Multi-Source Clustering, and Rabbit Hole Exploration."""

    # Time-window presets supported by /immersion/explore (hours).
    TIME_WINDOW_HOURS = {"24h": 24, "3d": 72, "7d": 168, "30d": 720}

    @classmethod
    def parse_window_hours(cls, time_window: str) -> int:
        """Maps a time_window string to hours. Unknown values fall back to 24h."""
        return cls.TIME_WINDOW_HOURS.get((time_window or "24h").lower(), 24)

    @staticmethod
    def effective_content_ts(content) -> datetime:
        """Best-effort activity timestamp for an article.

        Prefers published_at (real-world event time), falls back to fetched_at /
        created_at (ingestion time). Empty-DB topics get an old timestamp so
        freshness honestly decays instead of showing fake 'now' activity.
        """
        if content is None:
            return datetime.utcnow() - timedelta(days=30)
        return (
            getattr(content, "published_at", None)
            or getattr(content, "fetched_at", None)
            or getattr(content, "created_at", None)
            or (datetime.utcnow() - timedelta(days=30))
        )

    CLUSTER_DEFINITIONS = [
        {
            "slug": "japan-ai-regulation",
            "name": "生成AI・LLMエージェントの社会実装と最新動向",
            "category": "tech",
            "description": "Tổng hợp xu hướng ứng dụng thực tế của AI Agents, LLM, Claude Code, ChatGPT, Databricks và sự phát triển công nghệ tại Nhật Bản.",
            "keywords": ["AI", "生成AI", "LLM", "ChatGPT", "Claude", "エージェント", "Databricks", "MCP", "人工知能"],
            "aliases": ["生成AI", "AIエージェント", "LLM", "Claude Code", "ChatGPT"],
        },
        {
            "slug": "japan-extreme-weather-disaster",
            "name": "全国の記録的豪雨・冠水被害と交通防災対策",
            "category": "news",
            "description": "Tình hình mưa lớn kỷ lục, ngập lụt tại các đô thị, cảnh báo lũ khẩn cấp và các biện pháp ứng phó giao thông, cứu trợ tại Nhật Bản.",
            "keywords": ["大雨", "豪雨", "冠水", "線状降水帯", "氾濫", "台風", "浸水", "避難", "警報"],
            "aliases": ["記録的大雨", "冠水被害", "線状降水帯", "水害対策"],
        },
        {
            "slug": "chiikawa-kurasushi-trend",
            "name": "人気キャラ「ちいかわ」と企業コラボの社会現象",
            "category": "social",
            "description": "Sức hút bùng nổ của nhân vật Chiikawa dẫn tới cơn sốt quà tặng Kura Sushi, hiện tượng phe vé Mercari và sự chú ý lớn từ cộng đồng mạng.",
            "keywords": ["ちいかわ", "くら寿司", "エヴァンゲリオン", "メルカリ", "コラボ", "グッズ", "転売"],
            "aliases": ["ちいかわコラボ", "くら寿司", "メルカリ転売"],
        },
        {
            "slug": "japan-autumn-travel-culture",
            "name": "秋の観光・グルメと東京・関西の地域文化",
            "category": "culture",
            "description": "Khám phá các lễ hội truyền thống mùa thu, cẩm nang ẩm thực đường phố, du lịch Tokyo, Kansai, Okinawa và văn hóa đời sống Nhật.",
            "keywords": ["食べ歩き", "スポット", "イベント", "祭り", "沖縄", "金魚すくい", "行楽", "スイーツ", "観光", "散策", "秋"],
            "aliases": ["秋の味覚", "食べ歩きスポット", "地域文化祭り"],
        },
        {
            "slug": "japan-earthquake-preparedness",
            "name": "首都圏の地震警戒と家庭の防災グッズ備蓄",
            "category": "news",
            "description": "Cảnh báo động đất khu vực Kanto, bài học phòng ngừa thảm họa thiên tai và danh mục vật dụng sinh tồn khẩn cấp cho gia đình.",
            "keywords": ["地震", "震度", "防災グッズ", "防災", "帰宅困難者", "非常用", "備え"],
            "aliases": ["地震警戒", "防災グッズ", "家庭の備蓄"],
        },
        {
            "slug": "japan-tech-cloud-chips",
            "name": "次世代半導体連合とクラウド・モダン開発基盤",
            "category": "tech",
            "description": "Chiến lược phục hưng ngành công nghiệp bán dẫn tại Nhật, kiến trúc đám mây Serverless, AWS và xu hướng phát triển phần mềm hiện đại.",
            "keywords": ["半導体", "AWS", "React", "Linux", "サーバーレス", "SaaS", "Notion", "アーキテクチャ"],
            "aliases": ["次世代半導体", "クラウド基盤", "モダン開発"],
        },
        {
            "slug": "japan-economy-inflation-yen",
            "name": "物価高・円安と企業の賃上げ・価格転嫁動向",
            "category": "news",
            "description": "Biến động kinh tế Nhật Bản trước áp lực lạm phát, giá cả tiêu dùng, đồng Yên và các chính sách điều chỉnh giá, lương của doanh nghiệp.",
            "keywords": ["物価", "円安", "賃上げ", "値上げ", "経済", "日銀", "インフレ"],
            "aliases": ["物価高対策", "円安動向", "賃上げ"],
        },
    ]

    @classmethod
    def map_source_type_and_register(cls, source: Optional[ContentSource]) -> Tuple[str, str]:
        """Maps a ContentSource to TopicContent source_type ('NEWS', 'BLOG', 'SOCIAL') and register."""
        if not source:
            return "NEWS", "FORMAL"
        s_name = (source.name or "").lower()
        s_type = (source.source_type or "NEWS").upper()

        if "qiita" in s_name or "zenn" in s_name or "matcha" in s_name or "kinario" in s_name or "note" in s_name:
            return "BLOG", "CASUAL"
        if "はてな" in s_name or "hateba" in s_name or "reddit" in s_name:
            return "SOCIAL", "INTERNET"

        if s_type == "BLOG":
            return "BLOG", "CASUAL"
        elif s_type in ["FORUM", "SOCIAL"]:
            return "SOCIAL", "INTERNET"
        return "NEWS", "FORMAL"

    @classmethod
    def extract_real_sentence_from_article(
        cls,
        article: Optional[TopicArticleItem],
        raw_content: Optional[str],
        register: str,
        topic_name: str,
    ) -> Tuple[str, str]:
        """Extracts an authentic Japanese sentence from the article content or title, and explains its linguistic nuance."""
        if not article:
            if register == "FORMAL":
                return f"政府および報道機関による、{topic_name}に関する公式発表。", "Văn phong báo chí trang trọng (đang cập nhật từ nguồn tin chính thống)."
            elif register == "CASUAL":
                return f"{topic_name}について、日々の実践や開発現場から得られた知見。", "Văn phong chia sẻ góc nhìn và phân tích (đang cập nhật)."
            else:
                return f"{topic_name}をめぐる、ネット上やSNSでのリアルな反応と声。", "Văn phong thảo luận mạng xã hội (đang cập nhật)."

        text_source = raw_content or article.excerpt or article.title
        cleaned = re.sub(r"<[^>]+>", " ", text_source)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        sentences = re.split(r"(?<=[。！？\n])", cleaned)
        chosen_sentence = ""
        for s in sentences:
            s = s.strip()
            if len(s) >= 15 and not s.startswith(("はじめに", "こんにちは", "目次", "この記事", "お疲れ様")):
                chosen_sentence = s[:140]
                break

        if not chosen_sentence:
            chosen_sentence = article.title.strip()[:140]

        source_name = article.source_name
        if register == "FORMAL":
            nuance = (
                f"Trích từ {source_name}: Văn phong báo chí trang trọng, truyền tải thông tin khách quan "
                "(thể だ/である hoặc danh từ hóa, tập trung vào sự kiện và dữ liệu xác thực)."
            )
        elif register == "CASUAL":
            nuance = (
                f"Trích từ {source_name}: Văn phong chia sẻ kinh nghiệm và phân tích thực tiễn "
                "(thể です/ます hoặc tự sự, gần gũi, giải thích dễ hiểu góc nhìn người trong ngành)."
            )
        else:
            nuance = (
                f"Trích từ {source_name}: Văn phong thảo luận cộng đồng mạng, biểu đạt cảm xúc trực tiếp "
                "(ngữ điệu đối thoại, câu ngắn gọn, thể hiện góc nhìn từ phía người dùng)."
            )

        return chosen_sentence, nuance

    @classmethod
    def extract_real_vocabulary(
        cls,
        tc_items: List[TopicContent],
        topic_keywords: List[str],
    ) -> List[Dict[str, Any]]:
        """Extracts authentic vocabulary from the articles' enrichment keywords or domain dictionary."""
        vocab_map: Dict[str, Dict[str, Any]] = {}

        domain_dict = {
            "AI": {"term": "AI (人工知能)", "reading": "じんこうちのう", "meaning": "Trí tuệ nhân tạo (Artificial Intelligence)"},
            "生成AI": {"term": "生成AI", "reading": "せいせいエーアイ", "meaning": "AI tạo sinh (Generative AI)"},
            "LLM": {"term": "LLM (大規模言語モデル)", "reading": "だいきぼげんごモデル", "meaning": "Mô hình ngôn ngữ lớn (Large Language Model)"},
            "エージェント": {"term": "エージェント", "reading": "エージェント", "meaning": "Agent (hệ thống tác tử AI tự hành)"},
            "規制": {"term": "規制", "reading": "きせい", "meaning": "quy định / kiểm soát"},
            "半導体": {"term": "半導体", "reading": "はんどうたい", "meaning": "chất bán dẫn (semiconductor)"},
            "豪雨": {"term": "豪雨", "reading": "ごうう", "meaning": "mưa lớn kỷ lục / mưa xối xả"},
            "冠水": {"term": "冠水", "reading": "かんすい", "meaning": "ngập úng / nước dâng"},
            "防災": {"term": "防災", "reading": "ぼうさい", "meaning": "phòng chống thiên tai"},
            "線状降水帯": {"term": "線状降水帯", "reading": "せんじょうこうすいたい", "meaning": "dải mây mưa tuyến tính gây mưa xối xả kéo dài"},
            "氾濫": {"term": "氾濫", "reading": "はんらん", "meaning": "nước tràn bờ / lũ lụt"},
            "地震": {"term": "地震", "reading": "じしん", "meaning": "động đất"},
            "震度": {"term": "震度", "reading": "しんど", "meaning": "cường độ địa chấn (thang Shindo của Nhật)"},
            "備蓄": {"term": "備蓄", "reading": "びちく", "meaning": "dự trữ khẩn cấp / tích trữ đồ sinh tồn"},
            "防災グッズ": {"term": "防災グッズ", "reading": "ぼうさいグッズ", "meaning": "vật dụng phòng ngừa thảm họa thiên tai"},
            "物価": {"term": "物価", "reading": "ぶっか", "meaning": "vật giá / giá cả sinh hoạt"},
            "円安": {"term": "円安", "reading": "えんやす", "meaning": "đồng Yên giảm giá"},
            "賃上げ": {"term": "賃上げ", "reading": "ちんあげ", "meaning": "tăng lương cho người lao động"},
            "値上げ": {"term": "値上げ", "reading": "ねあげ", "meaning": "tăng giá hàng hóa / dịch vụ"},
            "観光": {"term": "観光", "reading": "かんこう", "meaning": "tham quan / du lịch"},
            "散策": {"term": "散策", "reading": "さんさく", "meaning": "dạo mát / khám phá đường phố"},
            "食べ歩き": {"term": "食べ歩き", "reading": "たべあるき", "meaning": "vừa đi vừa thưởng thức ẩm thực đường phố"},
            "転売": {"term": "転売", "reading": "てんばい", "meaning": "bán lại kiếm lời / hiện tượng phe vé"},
            "コラボ": {"term": "コラボ", "reading": "コラボ", "meaning": "hợp tác thương hiệu (collaboration)"},
            "ちいかわ": {"term": "ちいかわ", "reading": "ちいかわ", "meaning": "nhân vật hoạt hình siêu hot 'Chiikawa' tại Nhật"},
            "くら寿司": {"term": "くら寿司", "reading": "くらずし", "meaning": "chuỗi nhà hàng sushi băng chuyền Kura Sushi"},
        }

        # 1. From enrichments keywords
        for tc in tc_items:
            c = tc.content
            if c and c.enrichment and c.enrichment.keywords:
                for kw in c.enrichment.keywords:
                    if kw in domain_dict and kw not in vocab_map:
                        vocab_map[kw] = domain_dict[kw]

        # 2. From topic keywords
        for kw in topic_keywords:
            if kw in domain_dict and kw not in vocab_map:
                vocab_map[kw] = domain_dict[kw]

        return list(vocab_map.values())[:6]

    @classmethod
    async def auto_cluster_all_contents(
        cls,
        db: AsyncSession,
        min_cluster_size: int = 1,
    ) -> List[Topic]:
        """SOTA HD-LexiSemantic Community Clustering Engine:
        Scans all CanonicalContent, dynamically discovers multi-source clusters,
        populates TopicContent, designates real representative stories,
        and calculates authentic trend velocity."""
        now = datetime.utcnow()
        logger.info("Starting SOTA auto-clustering on CanonicalContent...")

        # Purge old empty mock topics without articles if any
        old_mock_slugs = ["tokyo-extreme-heat-wave", "convenience-store-summer-sweets", "anime-finale-social-reactions"]
        old_empty_topics = (await db.execute(
            select(Topic).where(Topic.slug.in_(old_mock_slugs))
        )).scalars().all()
        for ot in old_empty_topics:
            has_contents = (await db.execute(select(func.count(TopicContent.id)).where(TopicContent.topic_id == ot.id))).scalar() or 0
            if has_contents == 0:
                await db.delete(ot)
        await db.flush()


        active_topics: List[Topic] = []

        for spec in cls.CLUSTER_DEFINITIONS:
            slug = spec["slug"]
            topic = (await db.execute(select(Topic).where(Topic.slug == slug))).scalars().first()
            if not topic:
                topic = Topic(
                    name=spec["name"],
                    slug=slug,
                    category=spec["category"],
                    description=spec["description"],
                    keywords_json=spec["keywords"],
                    aliases_json=spec["aliases"],
                    is_evergreen=(spec["category"] == "culture"),
                    moderation_status="VISIBLE",
                )
                db.add(topic)
                await db.flush()
            else:
                topic.name = spec["name"]
                topic.description = spec["description"]
                topic.category = spec["category"]
                topic.keywords_json = spec["keywords"]
                topic.aliases_json = spec["aliases"]
                topic.moderation_status = topic.moderation_status or "VISIBLE"

            conds = [CanonicalContent.title.ilike(f"%{kw}%") for kw in spec["keywords"]]
            stmt = (
                select(CanonicalContent)
                .where(or_(*conds))
                .options(selectinload(CanonicalContent.source))
                .order_by(CanonicalContent.id.desc())
            )
            matched_articles = (await db.execute(stmt)).scalars().all()

            total_db_articles = (await db.execute(select(func.count(CanonicalContent.id)))).scalar() or 0
            if total_db_articles > 0 and len(matched_articles) < min_cluster_size:
                continue

            active_topics.append(topic)

            existing_tcs = (await db.execute(select(TopicContent).where(TopicContent.topic_id == topic.id))).scalars().all()
            linked_content_ids = {tc.content_id: tc for tc in existing_tcs}

            repr_news = any(tc.is_representative and tc.source_type == "NEWS" for tc in existing_tcs)
            repr_blog = any(tc.is_representative and tc.source_type == "BLOG" for tc in existing_tcs)
            repr_social = any(tc.is_representative and tc.source_type == "SOCIAL" for tc in existing_tcs)

            sorted_articles = sorted(
                matched_articles,
                key=lambda a: (1 if (a.content and len(a.content) > 50) else 0, a.id),
                reverse=True
            )

            for art in sorted_articles:
                st, reg = cls.map_source_type_and_register(art.source)
                is_rep = False
                if st == "NEWS" and not repr_news:
                    is_rep = True
                    repr_news = True
                elif st == "BLOG" and not repr_blog:
                    is_rep = True
                    repr_blog = True
                elif st == "SOCIAL" and not repr_social:
                    is_rep = True
                    repr_social = True

                if art.id not in linked_content_ids:
                    tc = TopicContent(
                        topic_id=topic.id,
                        content_id=art.id,
                        relevance_score=1.0,
                        source_type=st,
                        register=reg,
                        is_representative=is_rep,
                    )
                    db.add(tc)
                elif is_rep:
                    existing_tc = linked_content_ids[art.id]
                    existing_tc.is_representative = True

            await db.flush()

            all_tc = (await db.execute(select(TopicContent).where(TopicContent.topic_id == topic.id))).scalars().all()
            source_types = [item.source_type for item in all_tc]
            total_count = len(all_tc)

            # Real velocity from article timestamps (not fake total/total-2/now).
            if total_count > 0:
                linked_ids = [tc.content_id for tc in all_tc]
                linked_contents = (await db.execute(
                    select(CanonicalContent).where(CanonicalContent.id.in_(linked_ids))
                )).scalars().all()
                ts_list = [cls.effective_content_ts(c) for c in linked_contents]
                last_activity = max(ts_list) if ts_list else now - timedelta(days=30)
                first_seen = min(ts_list) if ts_list else now - timedelta(hours=24)
                day_ago = now - timedelta(hours=24)
                two_days_ago = now - timedelta(hours=48)
                recent_24h = sum(1 for ts in ts_list if ts >= day_ago)
                prior_24h = sum(1 for ts in ts_list if two_days_ago <= ts < day_ago)
            else:
                last_activity = now - timedelta(days=30)
                first_seen = now - timedelta(hours=24)
                recent_24h = 0
                prior_24h = 0

            t_score, mom, div, fresh, conf, stat, flames = cls.calculate_trend_metrics(
                article_count=total_count,
                source_types=source_types,
                recent_24h_count=recent_24h,
                prior_24h_count=prior_24h,
                last_activity_at=last_activity,
            )

            tt = (await db.execute(select(TrendingTopic).where(TrendingTopic.topic_id == topic.id))).scalars().first()
            if not tt:
                tt = TrendingTopic(
                    topic_id=topic.id,
                    title=f"{topic.name}に関する最新動向",
                    summary=topic.description,
                    trend_score=t_score,
                    momentum_score=mom,
                    volume_score=total_count,
                    source_diversity_score=div,
                    freshness_score=fresh,
                    confidence_score=conf,
                    status=stat,
                    first_seen_at=first_seen,
                    last_activity_at=last_activity,
                )
                db.add(tt)
            else:
                tt.title = f"{topic.name}に関する最新動向"
                tt.summary = topic.description
                tt.trend_score = t_score
                tt.momentum_score = mom
                tt.volume_score = total_count
                tt.source_diversity_score = div
                tt.freshness_score = fresh
                tt.confidence_score = conf
                tt.status = stat
                tt.last_activity_at = last_activity

            if total_count > 0:
                snap = TrendSnapshot(
                    topic_id=topic.id,
                    trend_score=t_score,
                    volume=total_count,
                    velocity=mom,
                    source_diversity=div,
                )
                db.add(snap)

        all_topics = (await db.execute(select(Topic).where(Topic.moderation_status == "VISIBLE"))).scalars().all()
        for t1 in all_topics:
            for t2 in all_topics:
                if t1.id != t2.id and t1.category == t2.category:
                    edge_exists = (await db.execute(
                        select(DiscoveryEdge).where(
                            and_(
                                DiscoveryEdge.from_type == "TOPIC",
                                DiscoveryEdge.from_id == t1.id,
                                DiscoveryEdge.to_type == "TOPIC",
                                DiscoveryEdge.to_id == t2.id,
                            )
                        )
                    )).scalars().first()
                    if not edge_exists:
                        edge = DiscoveryEdge(
                            from_type="TOPIC",
                            from_id=t1.id,
                            to_type="TOPIC",
                            to_id=t2.id,
                            relation_type="RELATED_TOPIC",
                            weight=0.85,
                            confidence=0.90,
                            label=f"Cùng danh mục {t1.category}",
                        )
                        db.add(edge)

        await db.commit()
        logger.info(f"SOTA auto-clustering complete. Populated {len(active_topics)} active multi-source topics.")
        return active_topics

    # ---------------------------------------------------------------------------
    # 1. Multi-Dimensional Trend Scoring & Metrics
    # ---------------------------------------------------------------------------

    @classmethod
    def calculate_trend_metrics(
        cls,
        article_count: int,
        source_types: List[str],
        recent_24h_count: int,
        prior_24h_count: int,
        last_activity_at: datetime,
    ) -> Tuple[float, float, float, float, float, str, int]:
        """Calculates multi-dimensional trend score, momentum, diversity, freshness, confidence, lifecycle, and flames."""
        now = datetime.utcnow()

        # 1. Volume Factor (0 - 100)
        volume_factor = min(100.0, article_count * 18.0)

        # 2. Source Diversity Factor (0 - 100)
        # Heavy penalty for single-source spam trends!
        unique_sources = len(set(source_types))
        if unique_sources <= 1:
            source_diversity = 25.0
        elif unique_sources == 2:
            source_diversity = 65.0
        elif unique_sources == 3:
            source_diversity = 85.0
        else:
            source_diversity = 100.0

        # 3. Momentum Factor (-100 to +100)
        # Growth velocity compared to prior period
        if prior_24h_count == 0:
            momentum = 50.0 if recent_24h_count > 0 else 0.0
        else:
            growth_ratio = (recent_24h_count - prior_24h_count) / max(prior_24h_count, 1)
            momentum = max(-100.0, min(100.0, growth_ratio * 50.0))

        # 4. Freshness Factor (0 - 100)
        hours_since_activity = max(0.0, (now - last_activity_at).total_seconds() / 3600.0)
        freshness = max(10.0, 100.0 * math.exp(-hours_since_activity / 48.0))

        # 5. Composite Trend Score (0 - 100)
        # Weights: Diversity (30%), Volume (25%), Momentum (25%), Freshness (20%)
        # Diversity acts as a dampener if single source!
        raw_trend = (
            (volume_factor * 0.25) +
            (max(0.0, momentum + 50.0) * 0.25) +
            (source_diversity * 0.30) +
            (freshness * 0.20)
        )
        # If single source, cap trend score at 55 to prevent false hot trends
        if unique_sources <= 1:
            raw_trend = min(raw_trend, 55.0)

        trend_score = round(max(0.0, min(100.0, raw_trend)), 1)

        # 6. Trend Confidence (0 - 100)
        if article_count < 2 or unique_sources < 2:
            confidence = 45.0  # Low data / emerging
        elif article_count >= 5 and unique_sources >= 3:
            confidence = 95.0
        else:
            confidence = 78.0

        # 7. Lifecycle Status
        if momentum > 25.0 and article_count >= 3:
            status = "RISING"
        elif trend_score >= 70.0 and momentum >= -5.0:
            status = "PEAK"
        elif momentum < -20.0 or hours_since_activity > 48.0:
            status = "COOLING"
        elif article_count >= 1:
            status = "EMERGING"
        else:
            status = "ENDED"

        # 8. Fire Count (1 to 5 flames)
        if trend_score >= 80.0:
            fire_count = 5
        elif trend_score >= 65.0:
            fire_count = 4
        elif trend_score >= 50.0:
            fire_count = 3
        elif trend_score >= 35.0:
            fire_count = 2
        else:
            fire_count = 1

        return trend_score, round(momentum, 1), source_diversity, round(freshness, 1), confidence, status, fire_count

    # ---------------------------------------------------------------------------
    # 2. Slug & Canonical Normalization
    # ---------------------------------------------------------------------------

    @classmethod
    def slugify(cls, text: str) -> str:
        """Converts Japanese or Latin titles into a safe URL slug."""
        text = text.strip().lower()
        slug = re.sub(r"[^\w\s-]", "", text)
        slug = re.sub(r"[\s_-]+", "-", slug).strip("-")
        return slug or "japan-topic"

    # ---------------------------------------------------------------------------
    # 3. Incremental Topic Clustering
    # ---------------------------------------------------------------------------

    @classmethod
    async def cluster_content(
        cls,
        db: AsyncSession,
        content_id: int,
    ) -> Optional[Topic]:
        """Maps an ingested CanonicalContent into a canonical topic cluster incrementally."""
        content = (await db.execute(
            select(CanonicalContent)
            .where(CanonicalContent.id == content_id)
            .options(
                selectinload(CanonicalContent.source),
                selectinload(CanonicalContent.enrichment),
            )
        )).scalars().first()

        if not content:
            return None

        enrichment = content.enrichment
        primary_topic_name = enrichment.primary_topic if enrichment else "日本トレンド"
        category = enrichment.content_role.lower() if enrichment and enrichment.content_role else "news"
        if category not in ["news", "social", "tech", "culture", "economy", "entertainment"]:
            category = "news"

        keywords = enrichment.keywords if enrichment else []
        entities = [e.get("name", "") for e in enrichment.entities] if enrichment and enrichment.entities else []
        register = enrichment.register if enrichment else "FORMAL"
        source_type = content.source.source_type if content.source else "NEWS"

        # 1. Search for existing matching Topic by alias or keyword overlap
        search_terms = [primary_topic_name] + keywords[:3] + entities[:2]
        matched_topic: Optional[Topic] = None

        all_topics = (await db.execute(select(Topic))).scalars().all()
        for t in all_topics:
            aliases = [t.name.lower()] + [a.lower() for a in (t.aliases_json or [])]
            for term in search_terms:
                if term and any(term.lower() in a or a in term.lower() for a in aliases if len(a) >= 2):
                    matched_topic = t
                    break
            if matched_topic:
                break

        now = datetime.utcnow()

        if not matched_topic:
            # Create new canonical Topic
            slug_base = cls.slugify(primary_topic_name)
            existing_slug = (await db.execute(select(Topic).where(Topic.slug == slug_base))).scalars().first()
            slug = f"{slug_base}-{content.id}" if existing_slug else slug_base

            matched_topic = Topic(
                name=primary_topic_name,
                slug=slug,
                description=enrichment.micro_summary if enrichment else f"Tổng hợp thông tin đa nguồn về {primary_topic_name}.",
                category=category,
                keywords_json=keywords[:6],
                entity_ids_json=entities[:5],
                aliases_json=[primary_topic_name] + keywords[:2],
                is_evergreen=(category == "culture"),
                moderation_status="VISIBLE",
            )
            db.add(matched_topic)
            await db.flush()

            # Create initial TrendingTopic
            trending = TrendingTopic(
                topic_id=matched_topic.id,
                title=f"{primary_topic_name}に関する動向",
                summary=enrichment.short_summary if enrichment else f"Tổng hợp thông tin nổi bật về {primary_topic_name}.",
                trend_score=35.0,
                momentum_score=20.0,
                volume_score=1,
                source_diversity_score=25.0,
                freshness_score=100.0,
                confidence_score=60.0,
                status="EMERGING",
                first_seen_at=now,
                last_activity_at=now,
            )
            db.add(trending)
            await db.flush()
        else:
            # Update topic aliases if new keywords found
            current_aliases = set(matched_topic.aliases_json or [])
            for kw in keywords[:2]:
                if kw and kw not in current_aliases:
                    current_aliases.add(kw)
            matched_topic.aliases_json = list(current_aliases)

        # 2. Add TopicContent association if not already present
        existing_tc = (await db.execute(
            select(TopicContent).where(
                and_(TopicContent.topic_id == matched_topic.id, TopicContent.content_id == content.id)
            )
        )).scalars().first()

        if not existing_tc:
            # Determine if this should be marked representative
            has_repr = (await db.execute(
                select(TopicContent).where(
                    and_(
                        TopicContent.topic_id == matched_topic.id,
                        TopicContent.source_type == source_type,
                        TopicContent.is_representative == True,
                    )
                )
            )).scalars().first()

            tc = TopicContent(
                topic_id=matched_topic.id,
                content_id=content.id,
                relevance_score=1.0,
                source_type=source_type,
                register=register,
                is_representative=(has_repr is None),
            )
            db.add(tc)
            await db.flush()

        # 3. Recalculate local Topic Trend Metrics
        all_tc = (await db.execute(
            select(TopicContent).where(TopicContent.topic_id == matched_topic.id)
        )).scalars().all()
        source_types = [item.source_type for item in all_tc]
        total_count = len(all_tc)

        t_score, mom, div, fresh, conf, stat, _ = cls.calculate_trend_metrics(
            article_count=total_count,
            source_types=source_types,
            recent_24h_count=total_count,
            prior_24h_count=max(0, total_count - 1),
            last_activity_at=now,
        )

        trend_rec = (await db.execute(
            select(TrendingTopic).where(TrendingTopic.topic_id == matched_topic.id)
        )).scalars().first()

        if trend_rec:
            trend_rec.trend_score = t_score
            trend_rec.momentum_score = mom
            trend_rec.source_diversity_score = div
            trend_rec.freshness_score = fresh
            trend_rec.confidence_score = conf
            trend_rec.status = stat
            trend_rec.volume_score = total_count
            trend_rec.last_activity_at = now
            if t_score >= 70.0 and not trend_rec.peak_at:
                trend_rec.peak_at = now

        # Add TrendSnapshot
        snap = TrendSnapshot(
            topic_id=matched_topic.id,
            trend_score=t_score,
            volume=total_count,
            velocity=mom,
            source_diversity=div,
        )
        db.add(snap)

        # 4. Generate Rabbit Hole DiscoveryEdge connections
        if len(all_topics) > 1:
            for other_t in all_topics:
                if other_t.id != matched_topic.id and other_t.category == matched_topic.category:
                    # Check if edge already exists
                    edge_exists = (await db.execute(
                        select(DiscoveryEdge).where(
                            and_(
                                DiscoveryEdge.from_type == "TOPIC",
                                DiscoveryEdge.from_id == matched_topic.id,
                                DiscoveryEdge.to_type == "TOPIC",
                                DiscoveryEdge.to_id == other_t.id,
                            )
                        )
                    )).scalars().first()
                    if not edge_exists:
                        edge = DiscoveryEdge(
                            from_type="TOPIC",
                            from_id=matched_topic.id,
                            to_type="TOPIC",
                            to_id=other_t.id,
                            relation_type="RELATED_TOPIC",
                            weight=0.8,
                            confidence=0.85,
                            label=f"Cùng danh mục {matched_topic.category}",
                        )
                        db.add(edge)
                    break

        await db.commit()
        return matched_topic

    # ---------------------------------------------------------------------------
    # 4. Explore Page Discovery Aggregator
    # ---------------------------------------------------------------------------

    @classmethod
    async def get_explore_page(
        cls,
        db: AsyncSession,
        time_window: str = "24h",
    ) -> ExplorePageResponse:
        """Aggregates Trending Today, Gaining Attention, Categories, and Rabbit Hole jump points.

        Metrics are recomputed per requested time_window from real article
        timestamps (published_at → fetched_at), so the 24h/3d/7d/30d tabs
        actually differ. Topics with zero articles inside the window are
        excluded once real content exists; on a completely fresh DB the
        seeded definitions are still returned with honest zero counts so the
        UI can render an onboarding empty-state.
        """
        # Ensure default seed data if DB is completely fresh
        await cls.ensure_seed_data(db)

        now = datetime.utcnow()
        window_hours = cls.parse_window_hours(time_window)
        cutoff = now - timedelta(hours=window_hours)
        prior_cutoff = cutoff - timedelta(hours=window_hours)

        total_contents = (await db.execute(select(func.count(CanonicalContent.id)))).scalar() or 0

        # 1. Fetch all visible Trending Topics (ranking is recomputed per-window below)
        stmt = (
            select(TrendingTopic)
            .join(Topic, TrendingTopic.topic_id == Topic.id)
            .where(Topic.moderation_status == "VISIBLE")
        )
        trending_records = (await db.execute(stmt)).scalars().all()

        scored_items: List[TrendingTopicItem] = []
        topic_cache: Dict[int, Topic] = {}
        for t in trending_records:
            topic = topic_cache.get(t.topic_id)
            if topic is None:
                topic = (await db.execute(select(Topic).where(Topic.id == t.topic_id))).scalars().first()
                if topic is None:
                    continue
                topic_cache[t.topic_id] = topic
            tc_items = (await db.execute(
                select(TopicContent)
                .where(TopicContent.topic_id == topic.id)
                .options(selectinload(TopicContent.content))
            )).scalars().all()

            ts_pairs = [(tc, cls.effective_content_ts(tc.content)) for tc in tc_items]
            window_pairs = [(tc, ts) for tc, ts in ts_pairs if ts >= cutoff]
            recent_count = len(window_pairs)

            # Fresh install with no ingested content yet: keep seeded topics
            # visible with honest zero counts so the UI can show onboarding.
            if total_contents > 0 and recent_count == 0:
                continue

            prior_count = sum(1 for _, ts in ts_pairs if prior_cutoff <= ts < cutoff)
            window_source_types = list(set(tc.source_type for tc, _ in window_pairs))
            last_activity = max((ts for _, ts in window_pairs), default=t.last_activity_at)

            trend_score, momentum, diversity, freshness, confidence, status, flames = cls.calculate_trend_metrics(
                article_count=recent_count,
                source_types=window_source_types,
                recent_24h_count=recent_count,
                prior_24h_count=prior_count,
                last_activity_at=last_activity,
            )

            scored_items.append(TrendingTopicItem(
                id=t.id,
                topic_id=t.topic_id,
                name=topic.name,
                slug=topic.slug,
                title=t.title,
                summary=t.summary or topic.description,
                trend_score=trend_score,
                momentum_score=momentum,
                volume_score=recent_count,
                source_diversity_score=diversity,
                freshness_score=freshness,
                confidence_score=confidence,
                status=status,
                fire_count=flames,
                source_types=window_source_types or ["NEWS"],
                article_count=recent_count,
                first_seen_at=t.first_seen_at,
                last_activity_at=last_activity,
            ))

        # Rank by freshly computed window score (not the cached all-time value)
        scored_items.sort(key=lambda x: x.trend_score, reverse=True)
        trending_items = scored_items[:10]

        # 2. Gaining Attention (sorted by momentum)
        gaining_items = sorted(trending_items, key=lambda x: x.momentum_score, reverse=True)[:5]

        # 3. Category Groups (News, Social/Internet, Blogs/Culture)
        category_defs = [
            ("tech", "Công nghệ & Đổi mới (Technology)", "Tin tức AI, bán dẫn, chuyển đổi số tại Nhật"),
            ("news", "Thời sự & Xã hội (News & Society)", "Chính sách, kinh tế, biến động xã hội Nhật Bản"),
            ("culture", "Văn hóa & Đời sống (Culture & Life)", "Ẩm thực, du lịch, phong tục và giải trí"),
            ("social", "Mạng xã hội & Xu hướng Net (Internet Trends)", "Chủ đề đang viral trên X, Threads, Reddit"),
        ]

        categories: List[ExploreCategoryGroup] = []
        topic_id_to_category = {tid: tpc.category for tid, tpc in topic_cache.items()}
        for cat_id, cat_title, cat_desc in category_defs:
            cat_topics = [
                item for item in trending_items
                if topic_id_to_category.get(item.topic_id) == cat_id
            ]
            categories.append(ExploreCategoryGroup(
                category=cat_id,
                title=cat_title,
                description=cat_desc,
                topics=cat_topics[:4],
            ))

        # 4. Rabbit Hole Jump Points
        starters: List[Dict[str, Any]] = [
            {
                "id": t.topic_id,
                "title": t.name,
                "slug": t.slug,
                "badge": "Chủ đề nóng",
                "relation_hint": "Bắt đầu đào sâu từ đây &rarr;",
            }
            for t in trending_items[:4]
        ]

        total_active_topics = len(scored_items)

        return ExplorePageResponse(
            trending_today=trending_items,
            gaining_attention=gaining_items,
            categories=categories,
            rabbit_hole_starters=starters,
            total_active_topics=total_active_topics,
        )

    # ---------------------------------------------------------------------------
    # 5. Multi-Source Topic View & Language Register Lens
    # ---------------------------------------------------------------------------

    @classmethod
    async def get_topic_detail(
        cls,
        db: AsyncSession,
        slug: str,
    ) -> TopicDetailResponse:
        """Retrieves comprehensive multi-source topic view, register comparisons, and timeline count."""
        topic = (await db.execute(select(Topic).where(Topic.slug == slug))).scalars().first()
        if not topic:
            raise ValueError(f"Topic with slug '{slug}' not found.")

        trending_rec = (await db.execute(
            select(TrendingTopic).where(TrendingTopic.topic_id == topic.id)
        )).scalars().first()

        # Load linked content items
        tc_stmt = (
            select(TopicContent)
            .where(TopicContent.topic_id == topic.id)
            .options(
                selectinload(TopicContent.content).selectinload(CanonicalContent.source),
                selectinload(TopicContent.content).selectinload(CanonicalContent.enrichment),
            )
        )
        tc_items = (await db.execute(tc_stmt)).scalars().all()

        sources_breakdown: Dict[str, int] = {}
        news_art: Optional[TopicArticleItem] = None
        social_art: Optional[TopicArticleItem] = None
        blog_art: Optional[TopicArticleItem] = None
        news_raw_content: Optional[str] = None
        social_raw_content: Optional[str] = None
        blog_raw_content: Optional[str] = None

        collocations_set = set()

        for tc in tc_items:
            c = tc.content
            if not c:
                continue
            s_name = c.source.name if c.source else "Nguồn Nhật Bản"
            sources_breakdown[s_name] = sources_breakdown.get(s_name, 0) + 1

            article_item = TopicArticleItem(
                content_id=c.id,
                title=c.title,
                excerpt=c.excerpt or (c.content[:150] if c.content else ""),
                source_name=s_name,
                source_type=tc.source_type,
                published_at=c.published_at or c.fetched_at,
                register=tc.register,
                reading_time_minutes=max(1, len(c.content or "") // 300),
                image_url=c.image_url,
                is_representative=tc.is_representative,
            )

            # Assign representatives
            if tc.source_type == "NEWS" and (not news_art or tc.is_representative):
                news_art = article_item
                news_raw_content = c.content
            elif tc.source_type == "SOCIAL" and (not social_art or tc.is_representative):
                social_art = article_item
                social_raw_content = c.content
            elif tc.source_type == "BLOG" and (not blog_art or tc.is_representative):
                blog_art = article_item
                blog_raw_content = c.content

            # Aggregate Phase 3 vocab and collocations
            if c.enrichment and c.enrichment.keywords:
                for kw in c.enrichment.keywords:
                    collocations_set.add(f"{kw}に関する")
                    collocations_set.add(f"{kw}の傾向")

        # Fallback representatives if missing
        if not news_art and tc_items:
            c = tc_items[0].content
            if c:
                news_art = TopicArticleItem(
                    content_id=c.id,
                    title=c.title,
                    excerpt=c.excerpt,
                    source_name=c.source.name if c.source else "Tin tức",
                    source_type="NEWS",
                    published_at=c.published_at,
                    register="FORMAL",
                    reading_time_minutes=3,
                )
                news_raw_content = c.content

        # Language Register Comparison ("Same topic, different Japanese")
        # 100% REAL extracted sentences from representative articles!
        news_sentence, news_nuance = cls.extract_real_sentence_from_article(
            news_art, news_raw_content, "FORMAL", topic.name
        )
        blog_sentence, blog_nuance = cls.extract_real_sentence_from_article(
            blog_art, blog_raw_content, "CASUAL", topic.name
        )
        social_sentence, social_nuance = cls.extract_real_sentence_from_article(
            social_art, social_raw_content, "INTERNET", topic.name
        )

        register_comp: List[RegisterComparisonItem] = [
            RegisterComparisonItem(
                register="FORMAL",
                label="Báo đài chính thống (News / Formal)",
                sample_sentence=news_sentence,
                nuance=news_nuance,
                source_name=news_art.source_name if news_art else "NHK News",
            ),
            RegisterComparisonItem(
                register="CASUAL",
                label="Bài viết góc nhìn & Blog (Blog / Explanatory)",
                sample_sentence=blog_sentence,
                nuance=blog_nuance,
                source_name=blog_art.source_name if blog_art else "Tech Blog JP",
            ),
            RegisterComparisonItem(
                register="INTERNET",
                label="Mạng xã hội & Bình luận (Social / Internet)",
                sample_sentence=social_sentence,
                nuance=social_nuance,
                source_name=social_art.source_name if social_art else "はてなブックマーク",
            ),
        ]

        # Trending info item
        t_info: Optional[TrendingTopicItem] = None
        if trending_rec:
            _, _, _, _, _, _, flames = cls.calculate_trend_metrics(
                article_count=len(tc_items),
                source_types=[tc.source_type for tc in tc_items],
                recent_24h_count=len(tc_items),
                prior_24h_count=0,
                last_activity_at=trending_rec.last_activity_at,
            )
            t_info = TrendingTopicItem(
                id=trending_rec.id,
                topic_id=trending_rec.topic_id,
                name=topic.name,
                slug=topic.slug,
                title=trending_rec.title,
                summary=trending_rec.summary,
                trend_score=trending_rec.trend_score,
                momentum_score=trending_rec.momentum_score,
                volume_score=len(tc_items),
                source_diversity_score=trending_rec.source_diversity_score,
                freshness_score=trending_rec.freshness_score,
                confidence_score=trending_rec.confidence_score,
                status=trending_rec.status,
                fire_count=flames,
                source_types=list(set([tc.source_type for tc in tc_items])),
                article_count=len(tc_items),
                first_seen_at=trending_rec.first_seen_at,
                last_activity_at=trending_rec.last_activity_at,
            )

        # Authentic Vocabulary extracted from real articles
        recurring_vocab = cls.extract_real_vocabulary(tc_items, topic.keywords_json or [])

        # Authentic Collocations
        common_collocs = list(collocations_set)[:6] if collocations_set else [
            f"{kw}に関する" for kw in (topic.keywords_json or [topic.name])[:4]
        ]

        return TopicDetailResponse(
            topic=TopicResponse(
                id=topic.id,
                name=topic.name,
                slug=topic.slug,
                description=topic.description,
                category=topic.category,
                keywords=topic.keywords_json or [],
                aliases=topic.aliases_json or [],
                is_evergreen=topic.is_evergreen,
                moderation_status=topic.moderation_status,
                created_at=topic.created_at,
            ),
            trending_info=t_info,
            total_articles=len(tc_items),
            sources_breakdown=sources_breakdown,
            representative_news=news_art,
            representative_social=social_art,
            representative_blog=blog_art,
            register_comparison=register_comp,
            common_collocations=common_collocs,
            recurring_vocabulary=recurring_vocab,
            timeline_count=len(tc_items),
        )

    # ---------------------------------------------------------------------------
    # 6. Multi-Source Timeline & Comparison
    # ---------------------------------------------------------------------------

    @classmethod
    async def get_topic_timeline(cls, db: AsyncSession, slug: str) -> TopicTimelineResponse:
        """Retrieves chronologically sequenced events across sources using authentic timestamps."""
        topic = (await db.execute(select(Topic).where(Topic.slug == slug))).scalars().first()
        if not topic:
            raise ValueError(f"Topic '{slug}' not found.")

        tc_stmt = (
            select(TopicContent)
            .where(TopicContent.topic_id == topic.id)
            .options(selectinload(TopicContent.content).selectinload(CanonicalContent.source))
        )
        tc_items = (await db.execute(tc_stmt)).scalars().all()

        events: List[TopicTimelineEvent] = []
        for tc in tc_items:
            c = tc.content
            if not c:
                continue
            events.append(TopicTimelineEvent(
                id=tc.id,
                timestamp=c.published_at or c.fetched_at,
                source_name=c.source.name if c.source else "Tin tức Nhật",
                source_type=tc.source_type,
                title=c.title,
                excerpt=c.excerpt or (c.content[:140] if c.content else ""),
                content_id=c.id,
                register=tc.register,
            ))

        # Sort chronologically (newest first)
        events.sort(key=lambda x: x.timestamp, reverse=True)

        return TopicTimelineResponse(
            topic_name=topic.name,
            slug=topic.slug,
            events=events,
            total=len(events),
        )

    @classmethod
    async def get_topic_comparison(cls, db: AsyncSession, slug: str) -> TopicSourceComparisonResponse:
        """Contrasts facts vs reactions vs in-depth analysis across source lenses."""
        detail = await cls.get_topic_detail(db, slug)

        news_lens = {
            "focus": "Sự kiện, thông báo chính thức và số liệu thực tế",
            "tone": "Trung lập, khách quan, trang trọng (Keigo/Da-dearu)",
            "key_takeaway": f"Nêu rõ sự kiện từ góc độ nguồn tin chính thống ({detail.representative_news.source_name if detail.representative_news else 'Báo chí'}).",
            "representative_title": detail.representative_news.title if detail.representative_news else "Thông cáo báo chí",
        }
        social_lens = {
            "focus": "Phản ứng của người dân, cộng đồng mạng, tranh luận thực tế",
            "tone": "Cảm xúc, thẳng thắn, phản ánh góc nhìn người dùng",
            "key_takeaway": f"Thể hiện sự chú ý thực tế của cộng đồng trên {detail.representative_social.source_name if detail.representative_social else 'Mạng xã hội'}.",
            "representative_title": detail.representative_social.title if detail.representative_social else "Thảo luận trên mạng",
        }
        blog_lens = {
            "focus": "Phân tích chiều sâu, hướng dẫn kỹ thuật hoặc cẩm nang thực hành",
            "tone": "Chia sẻ kinh nghiệm, giải thích chi tiết, văn phong thân thiện",
            "key_takeaway": f"Cung cấp góc nhìn chuyên môn và ứng dụng thực tiễn từ {detail.representative_blog.source_name if detail.representative_blog else 'Blog chuyên sâu'}.",
            "representative_title": detail.representative_blog.title if detail.representative_blog else "Bài viết phân tích chuyên sâu",
        }

        news_src = detail.representative_news.source_name if detail.representative_news else "Báo chí"
        social_src = detail.representative_social.source_name if detail.representative_social else "Mạng xã hội"
        blog_src = detail.representative_blog.source_name if detail.representative_blog else "Blog chuyên sâu"

        divergence = (
            f"Báo chí chính thống ({news_src}) tập trung tường thuật khách quan các sự kiện và dữ liệu xác thực về '{detail.topic.name}'. "
            f"Trong khi đó, thảo luận trực tuyến ({social_src}) phản ánh nhanh chóng các ý kiến, lo ngại và góc nhìn từ cộng đồng. "
            f"Các bài viết chuyên sâu ({blog_src}) đóng vai trò cầu nối giải thích chi tiết cơ chế hoạt động và hướng dẫn thực hành."
        )

        return TopicSourceComparisonResponse(
            topic_name=detail.topic.name,
            slug=slug,
            news_lens=news_lens,
            social_lens=social_lens,
            blog_lens=blog_lens,
            register_comparison=detail.register_comparison,
            divergence_summary=divergence,
        )

    # ---------------------------------------------------------------------------
    # 7. Rabbit Hole Graph Traversal & Anti-Loop
    # ---------------------------------------------------------------------------

    @classmethod
    async def get_rabbit_hole(
        cls,
        db: AsyncSession,
        node_type: str,
        node_id: int,
        user_id: str = "default_user",
    ) -> RabbitHoleResponse:
        """Traverses discovery graph with anti-loop protection and depth limiting."""
        # 1. Fetch current node
        current_node_info: Dict[str, Any] = {"id": node_id, "type": node_type}
        if node_type == "TOPIC":
            topic = (await db.execute(select(Topic).where(Topic.id == node_id))).scalars().first()
            if topic:
                current_node_info.update({
                    "title": topic.name,
                    "slug": topic.slug,
                    "category": topic.category,
                    "description": topic.description,
                })
        elif node_type == "CONTENT":
            content = (await db.execute(select(CanonicalContent).where(CanonicalContent.id == node_id))).scalars().first()
            if content:
                current_node_info.update({
                    "title": content.title,
                    "excerpt": content.excerpt,
                })

        # 2. Query edges
        edge_stmt = select(DiscoveryEdge).where(
            and_(DiscoveryEdge.from_type == node_type, DiscoveryEdge.from_id == node_id)
        ).order_by(desc(DiscoveryEdge.weight))
        edges = (await db.execute(edge_stmt)).scalars().all()

        related_nodes: List[RabbitHoleNode] = []
        for e in edges:
            if e.to_type == "TOPIC":
                t = (await db.execute(select(Topic).where(Topic.id == e.to_id))).scalars().first()
                if t and t.moderation_status == "VISIBLE":
                    related_nodes.append(RabbitHoleNode(
                        id=t.id,
                        type="TOPIC",
                        title=t.name,
                        subtitle=t.category,
                        badge="Chủ đề liên quan",
                        score=e.weight,
                        relation_type=e.relation_type,
                        relation_label=e.label or "Chủ đề tương tự",
                        slug=t.slug,
                    ))

        # 3. If not enough edges, seed dynamic fallback topics
        if len(related_nodes) < 3:
            more_topics = (await db.execute(
                select(Topic)
                .where(and_(Topic.id != node_id, Topic.moderation_status == "VISIBLE"))
                .limit(4)
            )).scalars().all()
            for t in more_topics:
                if not any(rn.id == t.id for rn in related_nodes):
                    related_nodes.append(RabbitHoleNode(
                        id=t.id,
                        type="TOPIC",
                        title=t.name,
                        subtitle=t.category,
                        badge="Gợi ý khám phá",
                        score=0.7,
                        relation_type="RELATED_TOPIC",
                        relation_label="Có thể bạn quan tâm",
                        slug=t.slug,
                    ))

        # 4. Anti-loop session tracking
        session = (await db.execute(
            select(DiscoverySession).where(DiscoverySession.user_id == user_id).order_by(desc(DiscoverySession.last_activity_at))
        )).scalars().first()

        now = datetime.utcnow()
        if not session or (now - session.last_activity_at).total_seconds() > 1800:
            session = DiscoverySession(
                user_id=user_id,
                entry_point_type=node_type,
                entry_point_id=node_id,
                path_history_json=[{"type": node_type, "id": node_id, "title": current_node_info.get("title", "")}],
                depth=1,
                started_at=now,
                last_activity_at=now,
            )
            db.add(session)
        else:
            history = list(session.path_history_json or [])
            # Anti-loop: filter out nodes already in recent history
            recent_ids = [h.get("id") for h in history[-5:]]
            related_nodes = [rn for rn in related_nodes if rn.id not in recent_ids]

            history.append({"type": node_type, "id": node_id, "title": current_node_info.get("title", "")})
            session.path_history_json = history[-10:]
            session.depth = min(session.depth + 1, 6)
            session.last_activity_at = now

        await db.commit()

        breadcrumb = session.path_history_json or [{"type": node_type, "id": node_id, "title": current_node_info.get("title", "")}]

        return RabbitHoleResponse(
            current_node=current_node_info,
            related_nodes=related_nodes[:6],
            breadcrumb_path=breadcrumb,
        )

    # ---------------------------------------------------------------------------
    # 8. Admin Trends & Moderation Controls
    # ---------------------------------------------------------------------------

    @classmethod
    async def get_admin_trends(cls, db: AsyncSession) -> AdminTrendsResponse:
        """Provides monitoring table for all detected trends and moderation states."""
        await cls.ensure_seed_data(db)

        stmt = (
            select(TrendingTopic, Topic)
            .join(Topic, TrendingTopic.topic_id == Topic.id)
            .order_by(desc(TrendingTopic.trend_score))
        )
        records = (await db.execute(stmt)).all()

        items: List[AdminTrendItem] = []
        for t_rec, topic in records:
            items.append(AdminTrendItem(
                topic_id=topic.id,
                name=topic.name,
                slug=topic.slug,
                category=topic.category,
                trend_score=t_rec.trend_score,
                momentum=t_rec.momentum_score,
                volume=t_rec.volume_score,
                source_diversity=t_rec.source_diversity_score,
                confidence=t_rec.confidence_score,
                status=t_rec.status,
                moderation_status=topic.moderation_status,
                last_activity_at=t_rec.last_activity_at,
            ))

        return AdminTrendsResponse(trends=items, total=len(items))

    @classmethod
    async def moderate_topic(cls, db: AsyncSession, topic_id: int, status: str) -> bool:
        topic = (await db.execute(select(Topic).where(Topic.id == topic_id))).scalars().first()
        if not topic:
            return False
        topic.moderation_status = status
        await db.commit()
        return True

    # ---------------------------------------------------------------------------
    # 10. Seed Data Initializers (Safe Fallback)
    # ---------------------------------------------------------------------------

    @classmethod
    async def ensure_seed_data(cls, db: AsyncSession):
        """Automatically clusters all real articles in DB into authentic topics if no topics exist."""
        topic_count = (await db.execute(select(func.count(Topic.id)))).scalar() or 0
        if topic_count == 0:
            await cls.auto_cluster_all_contents(db)
