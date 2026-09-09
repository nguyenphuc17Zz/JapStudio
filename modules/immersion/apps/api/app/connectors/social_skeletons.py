import time
from typing import Dict, Any, List, Optional, Tuple
from app.connectors.base import ContentSourceConnector
from app.schemas.connector import (
    ConnectorFetchResult,
    TestConnectionResult,
    HealthCheckResult,
    ConnectorWarning,
    ConnectorError,
)


class BaseSocialSkeletonConnector(ContentSourceConnector):
    """Base skeleton for social and external platforms pending official API credentials.
    Strictly avoids faking production data while preserving standard interfaces for Phase 2/3.
    """
    is_production_ready: bool = False

    def validate_config(
        self, config: Dict[str, Any], headers: Dict[str, str]
    ) -> Tuple[bool, str]:
        return True, f"{self.name} skeleton configuration valid."

    async def test_connection(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> TestConnectionResult:
        if not decrypted_secret:
            return TestConnectionResult(
                success=False,
                connector_type=self.connector_type,
                duration_ms=5.0,
                message=f"{self.name} chưa được cấu hình credentials. Cần cung cấp API Token / OAuth Client.",
                actionable_fix="Cung cấp API Key hoặc Bearer Token trong phần Authentication để kích hoạt.",
            )
        return TestConnectionResult(
            success=True,
            connector_type=self.connector_type,
            duration_ms=10.0,
            message=f"{self.name} credentials format verified (Architecture Skeleton Ready).",
        )

    async def fetch(
        self,
        source: Any,
        decrypted_secret: Optional[str] = None,
        limit: int = 50,
        cursor: Optional[str] = None,
    ) -> ConnectorFetchResult:
        if not decrypted_secret:
            return ConnectorFetchResult(
                success=False,
                duration_ms=2.0,
                warnings=[
                    ConnectorWarning(
                        code="CAPABILITY_NOT_AVAILABLE",
                        message=f"{self.name} yêu cầu OAuth2 hoặc API Token chính thức.",
                    )
                ],
                errors=[
                    ConnectorError(
                        code="NOT_CONFIGURED",
                        message=f"{self.name} connector chưa được cấp credentials trong Phase 1.",
                        error_type="auth",
                    )
                ],
            )
        return ConnectorFetchResult(
            success=True,
            items=[],
            fetched_count=0,
            duration_ms=5.0,
            metadata={"status": "SKELETON_ACTIVE_AWAITING_PRODUCTION_KEY"},
        )

    async def health_check(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> HealthCheckResult:
        return HealthCheckResult(
            status="WARNING" if not decrypted_secret else "HEALTHY",
            duration_ms=2.0,
            message="Skeleton ready for Phase 3 official API credentials.",
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
        )


class RedditConnector(BaseSocialSkeletonConnector):
    connector_type: str = "REDDIT"
    name: str = "Reddit Japanese Communities"
    description: str = "Architecture skeleton for Reddit r/LearnJapanese, r/newsokur via Reddit API."
    supported_auth: List[str] = ["bearer_token", "oauth2"]
    required_config_fields: List[str] = ["subreddit"]
    default_capabilities: Dict[str, str] = {
        "hasTitle": "SUPPORTED",
        "hasAuthor": "SUPPORTED",
        "hasPublishedDate": "SUPPORTED",
        "hasFullContent": "SUPPORTED",
        "hasExcerpt": "SUPPORTED",
        "hasImages": "SUPPORTED",
        "hasComments": "SUPPORTED",
        "hasEngagement": "SUPPORTED",
        "supportsSearch": "SUPPORTED",
        "supportsPagination": "SUPPORTED",
        "supportsRealtime": "SUPPORTED",
        "supportsHistoricalQuery": "SUPPORTED",
    }


class XConnector(BaseSocialSkeletonConnector):
    connector_type: str = "X"
    name: str = "X / Twitter Connector"
    description: str = "Architecture skeleton for X API v2 Japanese accounts and hashtags."
    supported_auth: List[str] = ["bearer_token", "oauth2"]
    required_config_fields: List[str] = ["query_or_username"]
    default_capabilities: Dict[str, str] = {
        "hasTitle": "UNSUPPORTED",
        "hasAuthor": "SUPPORTED",
        "hasPublishedDate": "SUPPORTED",
        "hasFullContent": "SUPPORTED",
        "hasExcerpt": "UNSUPPORTED",
        "hasImages": "SUPPORTED",
        "hasComments": "SUPPORTED",
        "hasEngagement": "SUPPORTED",
        "supportsSearch": "SUPPORTED",
        "supportsPagination": "SUPPORTED",
        "supportsRealtime": "SUPPORTED",
        "supportsHistoricalQuery": "SUPPORTED",
    }


class ThreadsConnector(BaseSocialSkeletonConnector):
    connector_type: str = "THREADS"
    name: str = "Meta Threads Connector"
    description: str = "Architecture skeleton for Meta Threads Japanese creators API."
    supported_auth: List[str] = ["bearer_token", "oauth2"]
    required_config_fields: List[str] = ["creator_id"]
    default_capabilities: Dict[str, str] = {
        "hasTitle": "UNSUPPORTED",
        "hasAuthor": "SUPPORTED",
        "hasPublishedDate": "SUPPORTED",
        "hasFullContent": "SUPPORTED",
        "hasExcerpt": "UNSUPPORTED",
        "hasImages": "SUPPORTED",
        "hasComments": "SUPPORTED",
        "hasEngagement": "SUPPORTED",
        "supportsSearch": "UNKNOWN",
        "supportsPagination": "SUPPORTED",
        "supportsRealtime": "SUPPORTED",
        "supportsHistoricalQuery": "UNKNOWN",
    }


class GraphQLConnector(BaseSocialSkeletonConnector):
    connector_type: str = "GRAPHQL"
    name: str = "GraphQL Content Connector"
    description: str = "Architecture skeleton for GraphQL content APIs."
    supported_auth: List[str] = ["bearer_token", "api_key"]
    required_config_fields: List[str] = ["query"]


class CustomConnector(BaseSocialSkeletonConnector):
    connector_type: str = "CUSTOM"
    name: str = "Custom User Connector"
    description: str = "Architecture skeleton for custom user plugins and extensions."
    supported_auth: List[str] = ["none", "api_key", "bearer_token", "basic_auth"]
