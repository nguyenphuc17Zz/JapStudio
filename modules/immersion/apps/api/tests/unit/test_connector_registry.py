import pytest
from app.connectors.registry import ConnectorRegistry, ConnectorNotFoundException
from app.connectors.rss_connector import RSSConnector
from app.connectors.api_connector import GenericAPIConnector
from app.connectors.reddit_connector import RedditConnector
from app.connectors import register_default_connectors


def test_registry_registration_and_lookup():
    register_default_connectors()
    assert ConnectorRegistry.is_registered("rss") is True
    assert ConnectorRegistry.is_registered("api") is True
    assert ConnectorRegistry.is_registered("reddit") is True
    assert ConnectorRegistry.is_registered("x") is True
    assert ConnectorRegistry.is_registered("threads") is True
    assert ConnectorRegistry.is_registered("html") is True

    rss_instance = ConnectorRegistry.get("rss")
    assert isinstance(rss_instance, RSSConnector)
    assert rss_instance.source_type == "rss"


def test_unregistered_connector_raises():
    with pytest.raises(ConnectorNotFoundException):
        ConnectorRegistry.get("non_existent_type")


def test_list_connectors_meta():
    register_default_connectors()
    meta_list = ConnectorRegistry.list_connectors()
    types = [m.source_type for m in meta_list]
    assert "rss" in types
    assert "api" in types
    assert "reddit" in types
