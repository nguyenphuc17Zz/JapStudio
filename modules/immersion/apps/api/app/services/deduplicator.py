import hashlib
import uuid
from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.content import CanonicalContent


class DeduplicationService:
    """Multi-level deduplication engine implementing:
    Level 1: (source_id, external_id)
    Level 2: (source_id, canonical_url)
    Level 3: (source_id, content_hash)
    Level 4: Cross-source duplicate grouping (duplicate_group_id)
    """

    @staticmethod
    def compute_content_hash(title: str, content: Optional[str]) -> str:
        """Computes a deterministic SHA-256 fingerprint from normalized title and content."""
        payload = f"{(title or '').strip()}\n{(content or '').strip()}".encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    @staticmethod
    async def find_existing(
        session: AsyncSession,
        source_id: int,
        external_id: Optional[str],
        canonical_url: str,
        content_hash: str
    ) -> Optional[CanonicalContent]:
        """Checks for existing canonical record in order of specificity."""
        # Level 1: external_id matching within same source
        if external_id and external_id.strip():
            stmt = select(CanonicalContent).where(
                and_(
                    CanonicalContent.source_id == source_id,
                    CanonicalContent.external_id == external_id.strip()
                )
            ).limit(1)
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if existing:
                return existing

        # Level 2: canonical_url matching within same source
        stmt = select(CanonicalContent).where(
            and_(
                CanonicalContent.source_id == source_id,
                CanonicalContent.canonical_url == canonical_url
            )
        ).limit(1)
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        # Level 3: exact content_hash matching within same source
        stmt = select(CanonicalContent).where(
            and_(
                CanonicalContent.source_id == source_id,
                CanonicalContent.content_hash == content_hash
            )
        ).limit(1)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def resolve_duplicate_group(
        session: AsyncSession,
        canonical_url: str,
        content_hash: str
    ) -> Optional[str]:
        """Discovers cross-source duplicates and returns a shared duplicate_group_id."""
        stmt = select(CanonicalContent).where(
            or_(
                CanonicalContent.canonical_url == canonical_url,
                CanonicalContent.content_hash == content_hash
            )
        ).limit(1)
        res = await session.execute(stmt)
        cross_source_match = res.scalar_one_or_none()

        if cross_source_match:
            if cross_source_match.duplicate_group_id:
                return cross_source_match.duplicate_group_id
            # Upgrade existing match to group owner
            new_group_id = f"grp_{cross_source_match.content_hash[:16]}"
            cross_source_match.duplicate_group_id = new_group_id
            return new_group_id

        return None

    @staticmethod
    def decide_action(
        existing: Optional[CanonicalContent],
        new_hash: str,
        new_updated_at: Optional[datetime] = None
    ) -> Tuple[str, Optional[CanonicalContent]]:
        """Determines whether an item should be CREATED, UPDATED, or SKIPPED as DUPLICATE.
        Returns: ('CREATE' | 'UPDATE' | 'DUPLICATE', existing_record)
        """
        if not existing:
            return "CREATE", None

        # Content hash is identical: check if publication updated timestamp changed
        if existing.content_hash == new_hash:
            if (
                new_updated_at
                and existing.updated_at_source
                and new_updated_at > existing.updated_at_source
            ):
                return "UPDATE", existing
            return "DUPLICATE", existing

        # Content hash changed (author modified or updated body): trigger UPDATE
        return "UPDATE", existing
