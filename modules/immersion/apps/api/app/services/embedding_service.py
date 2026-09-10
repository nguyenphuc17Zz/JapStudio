import logging
from pathlib import Path
from typing import List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def resolve_model_dir() -> Path:
    """Resolves the local embedding-model folder to an absolute path.

    Relative values resolve against the API working directory (same base as
    `./immersion.db`). The folder is created on demand; weights are never
    committed (see `models/.gitignore`).
    """
    raw = (settings.EMBEDDING_MODEL_DIR or "./models").strip() or "./models"
    path = Path(raw)
    if not path.is_absolute():
        path = Path.cwd() / path
    path.mkdir(parents=True, exist_ok=True)
    return path


def dir_size_mb(path: Path) -> float:
    try:
        return sum(f.stat().st_size for f in path.rglob("*") if f.is_file()) / (1024 * 1024)
    except Exception:
        return 0.0


class EmbeddingService:
    """Local multilingual embedding gateway for topic discovery.

    Lazy-loads `intfloat/multilingual-e5-small` via fastembed (ONNX, no
    torch) with weights cached in `models/`. Every failure mode — missing
    dependency, missing weights, disabled flag — degrades to `None` so
    callers transparently fall back to the keyword path.
    """

    def __init__(self) -> None:
        self._model: Optional[object] = None
        self._load_attempted = False

    @property
    def is_enabled(self) -> bool:
        return bool(settings.EMBEDDING_CLUSTERING_ENABLED)

    @property
    def model_name(self) -> str:
        return settings.EMBEDDING_MODEL_NAME

    def _load(self) -> Optional[object]:
        if self._load_attempted:
            return self._model
        self._load_attempted = True
        if not self.is_enabled:
            return None
        try:
            from fastembed import TextEmbedding
        except Exception as e:
            logger.warning(f"Embedding model unavailable (fastembed not installed: {e}). Using keyword fallback.")
            return None
        try:
            model_dir = resolve_model_dir()
            self._model = TextEmbedding(
                model_name=self.model_name,
                cache_dir=str(model_dir),
            )
            logger.info(
                f"Embedding model '{self.model_name}' ready "
                f"(dir={model_dir}, {dir_size_mb(model_dir):.0f}MB)."
            )
        except Exception as e:
            logger.warning(f"Embedding model failed to load ({e}). Using keyword fallback.")
            self._model = None
        return self._model

    def reset(self) -> None:
        """Forgets the loaded model (tests / model swap)."""
        self._model = None
        self._load_attempted = False

    def embed(self, texts: List[str]) -> Optional[List[List[float]]]:
        """Embeds passages, or returns None when unavailable/disabled.

        Callers must treat None as 'use the keyword path'.
        """
        cleaned = [(t or "").strip() for t in (texts or [])]
        if not any(cleaned):
            return None
        model = self._load()
        if model is None:
            return None
        try:
            vectors = list(model.embed([f"passage: {t}" for t in cleaned]))
            return [[float(x) for x in v] for v in vectors]
        except Exception as e:
            logger.warning(f"Embedding inference failed ({e}). Using keyword fallback.")
            return None


embedding_service = EmbeddingService()
