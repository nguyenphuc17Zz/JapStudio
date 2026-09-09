from typing import Dict, List, Type, Optional
from app.connectors.base import ContentSourceConnector
from app.schemas.connector import ConnectorMeta
from app.core.logging import get_logger

logger = get_logger("connectors.registry")


class ConnectorNotFoundException(Exception):
    """Raised when an unregistered connector type is requested."""
    pass


class ConnectorRegistry:
    """Central singleton registry and factory for all universal content connectors."""

    _instances: Dict[str, ContentSourceConnector] = {}

    # Alias synonyms to ensure backward compatibility and ergonomic lookup
    _ALIASES: Dict[str, str] = {
        "api": "REST_API",
        "json": "JSON_API",
        "html": "WEB",
        "web": "WEB",
        "rss": "RSS",
        "atom": "ATOM",
        "sitemap": "SITEMAP",
        "reddit": "REDDIT",
        "x": "X",
        "threads": "THREADS",
        "graphql": "GRAPHQL",
        "custom": "CUSTOM",
    }

    @classmethod
    def normalize_type(cls, connector_type: str) -> str:
        """Normalizes connector key to canonical uppercase name."""
        if not connector_type:
            return "RSS"
        key = connector_type.strip().lower()
        return cls._ALIASES.get(key, connector_type.strip().upper())

    @classmethod
    def register(cls, connector_cls: Type[ContentSourceConnector]) -> None:
        """Registers a connector class by instantiating its singleton."""
        instance = connector_cls()
        raw_type = getattr(instance, "connector_type", None) or getattr(instance, "source_type", None)
        canonical_key = cls.normalize_type(raw_type)
        if not canonical_key:
            raise ValueError(f"Connector {connector_cls.__name__} must define a valid connector_type.")
        cls._instances[canonical_key] = instance
        logger.info(f"Registered connector: {canonical_key} ({getattr(instance, 'name', canonical_key)})")

    @classmethod
    def get(cls, connector_type: str) -> ContentSourceConnector:
        """Retrieves registered connector instance by type."""
        canonical_key = cls.normalize_type(connector_type)
        connector = cls._instances.get(canonical_key)
        if not connector:
            raise ConnectorNotFoundException(
                f"No connector registered for type '{connector_type}' (canonical: '{canonical_key}'). "
                f"Available types: {list(cls._instances.keys())}"
            )
        return connector

    @classmethod
    def has(cls, connector_type: str) -> bool:
        """Checks if a connector type is registered."""
        canonical_key = cls.normalize_type(connector_type)
        return canonical_key in cls._instances

    # Backward compatibility alias
    is_registered = has

    @classmethod
    def list(cls) -> List[ConnectorMeta]:
        """Returns metadata list of all registered connectors."""
        return [connector.get_meta() for connector in cls._instances.values()]

    # Backward compatibility alias
    list_connectors = list

    @classmethod
    def clear(cls) -> None:
        """Clears registered connectors (mainly for testing)."""
        cls._instances.clear()


# Singleton instance / class alias
connector_registry = ConnectorRegistry

