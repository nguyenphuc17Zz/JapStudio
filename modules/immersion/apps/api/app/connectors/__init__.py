from app.connectors.registry import ConnectorRegistry
from app.connectors.rss_connector import RSSConnector
from app.connectors.atom_connector import AtomConnector
from app.connectors.rest_api_connector import RestApiConnector
from app.connectors.sitemap_connector import SitemapConnector
from app.connectors.web_connector import WebConnector
from app.connectors.social_skeletons import (
    RedditConnector,
    XConnector,
    ThreadsConnector,
    GraphQLConnector,
    CustomConnector,
)


def register_default_connectors() -> None:
    """Registers all production and skeleton connectors into the ConnectorRegistry."""
    # Production-ready
    ConnectorRegistry.register(RSSConnector)
    ConnectorRegistry.register(AtomConnector)
    ConnectorRegistry.register(RestApiConnector)
    ConnectorRegistry.register(SitemapConnector)
    ConnectorRegistry.register(WebConnector)

    # Skeletons
    ConnectorRegistry.register(RedditConnector)
    ConnectorRegistry.register(XConnector)
    ConnectorRegistry.register(ThreadsConnector)
    ConnectorRegistry.register(GraphQLConnector)
    ConnectorRegistry.register(CustomConnector)


__all__ = [
    "ConnectorRegistry",
    "register_default_connectors",
    "RSSConnector",
    "AtomConnector",
    "RestApiConnector",
    "SitemapConnector",
    "WebConnector",
    "RedditConnector",
    "XConnector",
    "ThreadsConnector",
    "GraphQLConnector",
    "CustomConnector",
]
