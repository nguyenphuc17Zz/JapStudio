from fastapi import APIRouter, Depends, Query, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.discovery import (
    ExplorePageResponse,
    TrendingTopicsResponse,
    TopicResponse,
    TopicDetailResponse,
    TopicTimelineResponse,
    TopicSourceComparisonResponse,
    RabbitHoleResponse,
    AdminTrendsResponse,
    ModerateTopicRequest,
)
from app.services.discovery_service import DiscoveryService

router = APIRouter(tags=["Japanese Trends & Multi-Source Discovery"])


# ---------------------------------------------------------------------------
# 1. Discovery Home & Explore
# ---------------------------------------------------------------------------

@router.get("/immersion/explore", response_model=ExplorePageResponse)
async def get_explore_page(
    time_window: str = Query("24h", description="Time window for trends: 24h, 3d, 7d, 30d"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves discovery home with Trending Today, categories, and Rabbit Hole start points."""
    return await DiscoveryService.get_explore_page(db=db, time_window=time_window)


@router.get("/immersion/trending", response_model=TrendingTopicsResponse)
async def get_trending_topics(
    time_window: str = Query("24h", description="Time window: 24h, 3d, 7d, 30d"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves paginated trending topics with multi-source diversity and velocity metrics."""
    page_res = await DiscoveryService.get_explore_page(db=db, time_window=time_window)
    items = page_res.trending_today[:limit]
    return TrendingTopicsResponse(items=items, total=len(items), time_window=time_window)


# ---------------------------------------------------------------------------
# 2. Multi-Source Topic View
# ---------------------------------------------------------------------------

@router.get("/immersion/topics/{slug}", response_model=TopicDetailResponse)
async def get_topic_detail(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieves comprehensive multi-source topic view, register comparisons, and timeline."""
    try:
        return await DiscoveryService.get_topic_detail(db=db, slug=slug)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/immersion/topics/{slug}/timeline", response_model=TopicTimelineResponse)
async def get_topic_timeline(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieves chronologically sequenced events across sources with authentic timestamps."""
    try:
        return await DiscoveryService.get_topic_timeline(db=db, slug=slug)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/immersion/topics/{slug}/compare", response_model=TopicSourceComparisonResponse)
async def get_topic_comparison(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Contrasts facts vs reactions vs in-depth analysis across news, social, and blog lenses."""
    try:
        return await DiscoveryService.get_topic_comparison(db=db, slug=slug)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ---------------------------------------------------------------------------
# 3. Rabbit Hole Exploration Engine
# ---------------------------------------------------------------------------

@router.get("/immersion/rabbit-hole/{node_type}/{node_id}", response_model=RabbitHoleResponse)
async def get_rabbit_hole(
    node_type: str,
    node_id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Traverses discovery graph for Rabbit Hole recommendations with anti-loop protection."""
    return await DiscoveryService.get_rabbit_hole(
        db=db,
        node_type=node_type.upper(),
        node_id=node_id,
        user_id=x_user_id,
    )


# ---------------------------------------------------------------------------
# 4. Admin Trends & Moderation Controls
# ---------------------------------------------------------------------------

@router.get("/immersion/admin/trends", response_model=AdminTrendsResponse)
async def get_admin_trends(
    db: AsyncSession = Depends(get_db),
):
    """Provides monitoring table for all detected trends and moderation states."""
    return await DiscoveryService.get_admin_trends(db=db)


@router.post("/immersion/admin/topics/{topic_id}/moderate")
async def moderate_topic(
    topic_id: int,
    payload: ModerateTopicRequest,
    db: AsyncSession = Depends(get_db),
):
    """Updates topic moderation status (VISIBLE, HIDDEN, REVIEW_REQUIRED)."""
    success = await DiscoveryService.moderate_topic(db=db, topic_id=topic_id, status=payload.moderation_status)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Topic {topic_id} not found")
    return {"success": True, "topic_id": topic_id, "new_status": payload.moderation_status}


@router.post("/immersion/admin/cluster/content/{content_id}")
async def trigger_content_clustering(
    content_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Triggers incremental topic clustering for a content item."""
    topic = await DiscoveryService.cluster_content(db=db, content_id=content_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Content {content_id} not found")
    return {"success": True, "topic_id": topic.id, "topic_name": topic.name, "slug": topic.slug}


@router.post("/immersion/topics/auto-cluster")
async def trigger_auto_clustering(
    db: AsyncSession = Depends(get_db),
):
    """Triggers SOTA multi-source topic discovery and community clustering across all canonical contents."""
    topics = await DiscoveryService.auto_cluster_all_contents(db=db)
    return {
        "success": True,
        "message": f"Successfully clustered real articles into {len(topics)} multi-source topics.",
        "topics": [{"id": t.id, "slug": t.slug, "name": t.name, "category": t.category} for t in topics]
    }
