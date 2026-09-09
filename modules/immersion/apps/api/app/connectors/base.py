from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List, Tuple
from app.schemas.connector import (
    ConnectorMeta,
    ConnectorFetchResult,
    TestConnectionResult,
    HealthCheckResult,
    RawContentItem,
    ConnectorWarning,
    ConnectorError,
)
from app.schemas.source import STANDARD_CAPABILITIES, DEFAULT_CAPABILITY_STATES


from app.core.http_client import DEFAULT_BROWSER_HEADERS


class ContentSourceConnector(ABC):
    """Universal Abstract Base Class for all Japanese Content Ingestion Connectors.
    Core ingestion layers strictly interact with this interface and standard DTOs.
    """

    connector_type: str = ""
    name: str = ""
    description: str = ""
    is_production_ready: bool = True
    supported_auth: List[str] = ["none"]
    required_config_fields: List[str] = []
    optional_config_fields: List[str] = []
    default_headers: Dict[str, str] = dict(DEFAULT_BROWSER_HEADERS)
    default_capabilities: Dict[str, str] = {
        cap: "UNKNOWN" for cap in STANDARD_CAPABILITIES
    }

    @abstractmethod
    def validate_config(
        self, config: Dict[str, Any], headers: Dict[str, str]
    ) -> Tuple[bool, str]:
        """Validates connector-specific configuration and headers without performing network I/O."""
        pass

    @abstractmethod
    async def test_connection(
        self,
        source: Any, # ContentSource model instance
        decrypted_secret: Optional[str] = None
    ) -> TestConnectionResult:
        """Pings or tests the endpoint and returns connection diagnostics and sample data."""
        pass

    @abstractmethod
    async def fetch(
        self,
        source: Any, # ContentSource model instance
        decrypted_secret: Optional[str] = None,
        limit: int = 50,
        cursor: Optional[str] = None,
    ) -> ConnectorFetchResult:
        """Fetches raw Japanese content items and normalizes them into standard RawContentItem."""
        pass

    @abstractmethod
    async def health_check(
        self,
        source: Any, # ContentSource model instance
        decrypted_secret: Optional[str] = None
    ) -> HealthCheckResult:
        """Lightweight health check probe."""
        pass

    def get_capabilities(self) -> Dict[str, str]:
        """Returns baseline capability profile supported by this connector."""
        caps = dict(DEFAULT_CAPABILITY_STATES)
        caps.update(self.default_capabilities)
        return caps

    async def detect_capabilities(self, source: Any) -> Dict[str, str]:
        """Optionally introspects or tests the live endpoint to refine capability states."""
        return self.get_capabilities()

    @property
    def source_type(self) -> str:
        """Backwards compatibility alias for connector_type."""
        if self.connector_type == "REST_API":
            return "api"
        return self.connector_type.lower()

    def get_meta(self) -> ConnectorMeta:
        """Returns connector capability metadata for registry listing."""
        return ConnectorMeta(
            connector_type=self.connector_type,
            name=self.name,
            description=self.description,
            is_production_ready=self.is_production_ready,
            supported_auth=self.supported_auth,
            required_config_fields=self.required_config_fields,
            optional_config_fields=self.optional_config_fields,
            default_capabilities=self.get_capabilities(),
            default_headers=self.default_headers,
        )


# Backward compatibility aliases
FetchResult = ConnectorFetchResult
TestResult = TestConnectionResult
HealthResult = HealthCheckResult
StandardRawItem = RawContentItem
