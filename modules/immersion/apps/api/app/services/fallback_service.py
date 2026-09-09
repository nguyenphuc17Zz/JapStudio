from datetime import datetime
from typing import Optional, List, Dict, Any
from app.models.source import ContentSource
from app.connectors.registry import ConnectorRegistry
from app.schemas.connector import ConnectorFetchResult, ConnectorWarning
from app.core.logging import get_logger

logger = get_logger("services.fallback")


class FallbackService:
    """Orchestrates fallback connector execution when primary fetch fails or returns empty."""

    @classmethod
    async def execute_with_fallback(
        cls,
        source: ContentSource,
        decrypted_secret: Optional[str] = None,
        limit: int = 50,
    ) -> ConnectorFetchResult:
        """Attempts primary connector fetch, falling back down fallback_chain if defined."""
        primary_type = source.connector_type or source.source_type
        primary_connector = ConnectorRegistry.get(primary_type)

        primary_result = await primary_connector.fetch(source, decrypted_secret=decrypted_secret, limit=limit)
        if primary_result.success and primary_result.items:
            return primary_result

        fallback_chain = source.fallback_chain or []
        if not fallback_chain:
            return primary_result

        logger.warning(
            f"Primary connector {primary_type} for source '{source.name}' yielded no items or error: "
            f"{primary_result.error_message}. Evaluating fallback chain: {fallback_chain}"
        )

        for fb_type in fallback_chain:
            if not ConnectorRegistry.is_registered(fb_type):
                logger.warning(f"Fallback connector '{fb_type}' is not registered, skipping.")
                continue

            try:
                fb_connector = ConnectorRegistry.get(fb_type)
                fb_result = await fb_connector.fetch(source, decrypted_secret=decrypted_secret, limit=limit)
                if fb_result.success and fb_result.items:
                    logger.info(f"Fallback {fb_type} succeeded for source '{source.name}' with {len(fb_result.items)} items.")
                    fb_result.warnings.append(
                        ConnectorWarning(
                            code="FALLBACK_USED",
                            message=f"Primary connector {primary_type} failed ({primary_result.error_message}). "
                                    f"Successfully retrieved content via fallback connector {fb_type}.",
                            details={"primary": primary_type, "fallback": fb_type},
                        )
                    )
                    return fb_result
            except Exception as e:
                logger.error(f"Fallback {fb_type} failed for source '{source.name}': {e}")

        # If all fallbacks failed, return original primary result with warning
        primary_result.warnings.append(
            ConnectorWarning(
                code="FALLBACK_EXHAUSTED",
                message=f"All fallbacks in chain {fallback_chain} were attempted and failed.",
                details={"fallback_chain": fallback_chain},
            )
        )
        return primary_result
