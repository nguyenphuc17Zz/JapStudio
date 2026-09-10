import sys
import pytest

from app.core.config import settings
from app.services import embedding_service as emb_module
from app.services.embedding_service import (
    EmbeddingService,
    embedding_service,
    resolve_model_dir,
)


def test_resolve_model_dir_uses_tmp_override(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "EMBEDDING_MODEL_DIR", str(tmp_path / "mymodels"))
    resolved = resolve_model_dir()
    assert resolved.is_absolute()
    assert resolved.exists()
    assert resolved.name == "mymodels"


def test_embed_returns_none_when_disabled(monkeypatch):
    monkeypatch.setattr(settings, "EMBEDDING_CLUSTERING_ENABLED", False)
    svc = EmbeddingService()
    assert svc.embed(["テスト"]) is None


def test_embed_returns_none_when_fastembed_missing(monkeypatch):
    monkeypatch.setattr(settings, "EMBEDDING_CLUSTERING_ENABLED", True)
    monkeypatch.setitem(sys.modules, "fastembed", None)
    svc = EmbeddingService()
    assert svc.embed(["テスト"]) is None


def test_embed_empty_input_returns_none():
    assert embedding_service.embed([]) is None
    assert embedding_service.embed(["   "]) is None


def test_global_singleton_respects_reset():
    embedding_service.reset()
    assert embedding_service._model is None
    assert embedding_service._load_attempted is False
