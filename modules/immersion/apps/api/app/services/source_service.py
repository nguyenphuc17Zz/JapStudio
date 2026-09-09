import re
import uuid
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy import select, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.source import ContentSource, SourceCredential, SourceActivityLog
from app.schemas.source import (
    SourceCreate,
    SourceUpdate,
    SourceResponse,
    SourceCredentialResponse,
    SourceStats,
    BulkActionRequest,
    BulkActionResult,
    PresetSourceItem,
    DEFAULT_CAPABILITY_STATES,
)
from app.presets.default_presets import DEFAULT_PRESETS
from app.core.security import encrypt_value, decrypt_value, mask_secret
from app.connectors.registry import ConnectorRegistry
from app.core.logging import get_logger

logger = get_logger("services.source")


def slugify(text: str) -> str:
    """Generates URL-friendly slug from title or key."""
    text = text.strip().lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-") or f"source-{int(datetime.utcnow().timestamp())}"


class SourceService:
    """Service handling CRUD, credentials, presets, capabilities, and metrics for Content Sources."""

    @staticmethod
    def _to_response_dto(source: ContentSource) -> SourceResponse:
        """Converts ORM model to safe SourceResponse DTO with masked secret."""
        cred_response = None
        if source.credential:
            plain_secret = decrypt_value(source.credential.encrypted_secret) if source.credential.encrypted_secret else None
            cred_response = SourceCredentialResponse(
                auth_type=source.credential.auth_type,
                masked_secret=mask_secret(plain_secret) if plain_secret else None,
                key_name=source.credential.key_name,
                extra_config_json=source.credential.extra_config_json or {},
                updated_at=source.credential.updated_at,
            )

        return SourceResponse(
            id=source.id,
            name=source.name,
            slug=source.slug,
            source_type=source.source_type,
            connector_type=source.connector_type or source.source_type,
            content_roles=source.content_roles or [],
            categories=source.categories or ([source.category] if source.category else []),
            priority=source.priority or 5,
            category=source.category,
            base_url=source.base_url,
            feed_url=source.feed_url,
            canonical_url=source.canonical_url,
            external_identifier=source.external_identifier,
            description=source.description,
            icon_url=source.icon_url,
            status=source.status,
            enabled=getattr(source, "enabled", True),
            health_status=(source.health_status or "unknown").lower(),
            sync_interval_minutes=source.sync_interval_minutes,
            config_json=source.config_json or {},
            headers_json=source.headers_json or {},
            capabilities=source.capabilities or DEFAULT_CAPABILITY_STATES.copy(),
            fallback_chain=source.fallback_chain or [],
            is_syncing=source.is_syncing or False,
            last_synced_at=source.last_synced_at,
            last_successful_sync_at=source.last_successful_sync_at,
            last_sync_duration_ms=source.last_sync_duration_ms,
            consecutive_failure_count=source.consecutive_failure_count or 0,
            last_error_message=source.last_error_message,
            items_fetched_total=source.items_fetched_total or (source.items_total_count or 0),
            items_total_count=source.items_fetched_total or (source.items_total_count or 0),
            items_fetched_today=source.items_fetched_today or 0,
            items_failed_total=source.items_failed_total or 0,
            items_rejected_total=source.items_rejected_total or 0,
            credential_reference=source.credential_reference,
            created_at=source.created_at,
            updated_at=source.updated_at,
            credential=cred_response,
        )

    @classmethod
    async def get_all(
        cls,
        db: AsyncSession,
        category: Optional[str] = None,
        source_type: Optional[str] = None,
        connector_type: Optional[str] = None,
        learning_role: Optional[str] = None,
        status: Optional[str] = None,
        health_status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[SourceResponse]:
        """Queries sources with multi-dimensional filtering."""
        query = select(ContentSource).options(selectinload(ContentSource.credential)).order_by(ContentSource.priority.desc(), ContentSource.created_at.desc())

        if category:
            query = query.where(ContentSource.category.ilike(f"%{category}%"))
        if source_type:
            query = query.where(ContentSource.source_type == source_type.upper())
        if connector_type:
            query = query.where(ContentSource.connector_type == connector_type.upper())
        if status:
            query = query.where(ContentSource.status == status.lower())
        if health_status:
            query = query.where(ContentSource.health_status == health_status.upper())
        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.where(
                (ContentSource.name.ilike(search_pattern))
                | (ContentSource.description.ilike(search_pattern))
                | (ContentSource.feed_url.ilike(search_pattern))
                | (ContentSource.base_url.ilike(search_pattern))
            )

        result = await db.execute(query)
        sources = result.scalars().all()

        # In-memory filter for learning_role within JSON list if specified
        if learning_role:
            target_role = learning_role.upper()
            sources = [s for s in sources if target_role in [r.upper() for r in (s.content_roles or [])]]

        return [cls._to_response_dto(s) for s in sources]

    @classmethod
    async def get_by_id(cls, db: AsyncSession, source_id: int) -> Optional[ContentSource]:
        """Retrieves raw ContentSource model instance with credential."""
        query = select(ContentSource).options(selectinload(ContentSource.credential)).where(ContentSource.id == source_id)
        result = await db.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_dto_by_id(cls, db: AsyncSession, source_id: int) -> Optional[SourceResponse]:
        """Retrieves single source as DTO."""
        source = await cls.get_by_id(db, source_id)
        return cls._to_response_dto(source) if source else None

    @classmethod
    async def create_source(cls, db: AsyncSession, data: SourceCreate) -> SourceResponse:
        """Creates new ContentSource and optional credential."""
        connector_key = data.connector_type or data.source_type
        if not ConnectorRegistry.is_registered(connector_key):
            raise ValueError(f"Unsupported connector type '{connector_key}'")

        connector = ConnectorRegistry.get(connector_key)
        is_valid, err_msg = connector.validate_config(data.config_json, data.headers_json)
        if not is_valid:
            raise ValueError(f"Invalid configuration for {connector_key}: {err_msg}")

        slug = data.slug or slugify(data.name)
        existing = await db.execute(select(ContentSource).where(ContentSource.slug == slug))
        if existing.scalars().first():
            slug = f"{slug}-{int(datetime.utcnow().timestamp())}"

        # Initialize capabilities: merge default states, connector defaults, and user overrides
        caps = connector.get_capabilities()
        if data.capabilities:
            caps.update(data.capabilities)

        # Prepare normalized categories
        cats = data.categories or ([data.category] if data.category else ["News"])
        primary_cat = cats[0] if cats else (data.category or "News")

        source = ContentSource(
            name=data.name,
            slug=slug,
            source_type=data.source_type.upper(),
            connector_type=connector_key.upper(),
            content_roles=[r.upper() for r in (data.content_roles or ["NEWS"])],
            categories=cats,
            priority=data.priority,
            category=primary_cat,
            base_url=data.base_url,
            feed_url=data.feed_url,
            canonical_url=data.canonical_url,
            external_identifier=data.external_identifier,
            description=data.description,
            icon_url=data.icon_url,
            status="active",
            health_status="UNKNOWN",
            sync_interval_minutes=data.sync_interval_minutes,
            config_json=data.config_json or {},
            headers_json=data.headers_json or {},
            capabilities=caps,
            fallback_chain=data.fallback_chain or [],
            credential_reference=data.credential_reference,
        )
        db.add(source)
        await db.flush()

        if data.credential and data.credential.auth_type != "none":
            enc_secret = encrypt_value(data.credential.secret) if data.credential.secret else None
            cred = SourceCredential(
                source_id=source.id,
                auth_type=data.credential.auth_type,
                encrypted_secret=enc_secret,
                key_name=data.credential.key_name,
                extra_config_json=data.credential.extra_config_json or {},
            )
            db.add(cred)
            source.credential = cred

        log = SourceActivityLog(
            request_id=str(uuid.uuid4()),
            source_id=source.id,
            event_type="create",
            connector_type=connector_key.upper(),
            status="SUCCESS",
            message=f"Source '{source.name}' registered with connector '{connector_key}'",
            metadata_json={"priority": source.priority, "roles": source.content_roles},
        )
        db.add(log)
        await db.commit()
        await db.refresh(source)
        return cls._to_response_dto(source)

    @classmethod
    async def update_source(cls, db: AsyncSession, source_id: int, data: SourceUpdate) -> Optional[SourceResponse]:
        """Updates an existing source and its credentials."""
        source = await cls.get_by_id(db, source_id)
        if not source:
            return None

        update_dict = data.model_dump(exclude_unset=True)
        credential_data = update_dict.pop("credential", None)

        # Normalize enums/lists if updated
        if "source_type" in update_dict and update_dict["source_type"]:
            update_dict["source_type"] = update_dict["source_type"].upper()
        if "connector_type" in update_dict and update_dict["connector_type"]:
            update_dict["connector_type"] = update_dict["connector_type"].upper()
        if "content_roles" in update_dict and update_dict["content_roles"]:
            update_dict["content_roles"] = [r.upper() for r in update_dict["content_roles"]]

        for key, val in update_dict.items():
            if val is not None:
                setattr(source, key, val)

        if credential_data is not None:
            if credential_data.get("auth_type") == "none":
                if source.credential:
                    await db.delete(source.credential)
                    source.credential = None
            else:
                raw_secret = credential_data.get("secret")
                enc_secret = encrypt_value(raw_secret) if raw_secret else (source.credential.encrypted_secret if source.credential else None)
                if not source.credential:
                    cred = SourceCredential(
                        source_id=source.id,
                        auth_type=credential_data.get("auth_type", "api_key"),
                        encrypted_secret=enc_secret,
                        key_name=credential_data.get("key_name"),
                        extra_config_json=credential_data.get("extra_config_json", {}),
                    )
                    db.add(cred)
                    source.credential = cred
                else:
                    source.credential.auth_type = credential_data.get("auth_type", source.credential.auth_type)
                    if raw_secret:
                        source.credential.encrypted_secret = enc_secret
                    if "key_name" in credential_data:
                        source.credential.key_name = credential_data["key_name"]
                    if "extra_config_json" in credential_data:
                        source.credential.extra_config_json = credential_data["extra_config_json"]

        log = SourceActivityLog(
            request_id=str(uuid.uuid4()),
            source_id=source.id,
            event_type="config_update",
            connector_type=source.connector_type or source.source_type,
            status="SUCCESS",
            message="Source configuration updated",
            metadata_json={"updated_fields": list(update_dict.keys())},
        )
        db.add(log)
        await db.commit()
        await db.refresh(source)
        return cls._to_response_dto(source)

    @classmethod
    async def update_capabilities(
        cls, db: AsyncSession, source_id: int, capabilities: Dict[str, str]
    ) -> Optional[SourceResponse]:
        """Explicitly sets or updates the capability matrix for a source."""
        source = await cls.get_by_id(db, source_id)
        if not source:
            return None

        current = dict(source.capabilities or DEFAULT_CAPABILITY_STATES)
        current.update(capabilities)
        source.capabilities = current

        log = SourceActivityLog(
            request_id=str(uuid.uuid4()),
            source_id=source.id,
            event_type="capabilities_update",
            connector_type=source.connector_type or source.source_type,
            status="SUCCESS",
            message=f"Updated {len(capabilities)} capability states",
            metadata_json={"capabilities": capabilities},
        )
        db.add(log)
        await db.commit()
        await db.refresh(source)
        return cls._to_response_dto(source)

    @classmethod
    async def delete_source(cls, db: AsyncSession, source_id: int) -> bool:
        """Deletes a source and its cascading associations."""
        source = await cls.get_by_id(db, source_id)
        if not source:
            return False
        await db.delete(source)
        await db.commit()
        return True

    @classmethod
    async def get_stats(cls, db: AsyncSession) -> SourceStats:
        """Calculates aggregated metrics across all sources."""
        result = await db.execute(select(ContentSource))
        sources = result.scalars().all()

        stats = SourceStats()
        stats.total_sources = len(sources)

        for s in sources:
            if s.status == "active":
                stats.active_sources += 1
            elif s.status == "paused":
                stats.paused_sources += 1
            elif s.status == "error":
                stats.error_sources += 1

            h_status = (s.health_status or "UNKNOWN").upper()
            if h_status in ("HEALTHY", "UP"):
                stats.healthy_sources += 1
            elif h_status in ("WARNING", "DEGRADED"):
                stats.warning_sources += 1
            elif h_status in ("DOWN", "ERROR"):
                stats.down_sources += 1

            stats.total_items += (s.items_fetched_total or s.items_total_count or 0)
            stats.items_today += (s.items_fetched_today or 0)

            # Dimensions
            s_type = (s.source_type or "OTHER").upper()
            stats.by_source_type[s_type] = stats.by_source_type.get(s_type, 0) + 1

            c_type = (s.connector_type or s.source_type or "OTHER").upper()
            stats.by_connector_type[c_type] = stats.by_connector_type.get(c_type, 0) + 1

            for role in (s.content_roles or []):
                role_upper = role.upper()
                stats.by_role[role_upper] = stats.by_role.get(role_upper, 0) + 1

            for cat in (s.categories or ([s.category] if s.category else ["Other"])):
                stats.by_category[cat] = stats.by_category.get(cat, 0) + 1

        return stats

    @classmethod
    async def execute_bulk_action(cls, db: AsyncSession, req: BulkActionRequest) -> BulkActionResult:
        """Applies bulk state transitions or operations on selected sources."""
        action = req.action.lower()
        affected = 0
        failed = 0
        errors = []

        for source_id in req.source_ids:
            try:
                source = await cls.get_by_id(db, source_id)
                if not source:
                    failed += 1
                    errors.append(f"Source ID {source_id} not found")
                    continue

                if action == "activate":
                    source.status = "active"
                    affected += 1
                elif action == "pause":
                    source.status = "paused"
                    affected += 1
                elif action == "delete":
                    await db.delete(source)
                    affected += 1
                else:
                    errors.append(f"Action '{action}' not supported in bulk endpoint")
                    break

            except Exception as e:
                failed += 1
                errors.append(f"Source ID {source_id}: {str(e)}")

        await db.commit()
        return BulkActionResult(
            action=action,
            affected_count=affected,
            failed_count=failed,
            message=f"Bulk {action} completed on {affected} items.",
            errors=errors,
        )

    @classmethod
    async def install_presets(cls, db: AsyncSession, preset_keys: List[str]) -> Tuple[int, List[str]]:
        """Installs selected presets from DEFAULT_PRESETS into database."""
        installed = 0
        skipped = []
        preset_map = {p.key: p for p in DEFAULT_PRESETS}

        # Deduplicate keys while preserving order
        deduped_keys = list(dict.fromkeys(preset_keys))

        # Query all existing slugs from DB once to avoid repeated queries and catch in-memory duplicates
        existing_result = await db.execute(select(ContentSource.slug))
        existing_slugs = set(existing_result.scalars().all())

        for key in deduped_keys:
            preset = preset_map.get(key)
            if not preset:
                skipped.append(f"Preset key '{key}' not found")
                continue

            slug = preset.key
            if slug in existing_slugs:
                skipped.append(f"Preset '{preset.name}' already installed (slug: {slug})")
                continue

            # Merge preset capabilities with connector default
            caps = preset.capabilities or DEFAULT_CAPABILITY_STATES.copy()

            source = ContentSource(
                name=preset.name,
                slug=slug,
                source_type=preset.source_type.upper(),
                connector_type=preset.connector_type.upper(),
                content_roles=preset.content_roles or ["NEWS"],
                categories=preset.categories or ["News"],
                priority=preset.priority or 5,
                category=preset.categories[0] if preset.categories else "News",
                base_url=preset.base_url,
                feed_url=preset.feed_url,
                description=preset.description,
                icon_url=preset.icon_url,
                status="active",
                health_status="UNKNOWN",
                sync_interval_minutes=preset.sync_interval_minutes,
                config_json=preset.config_json,
                headers_json=preset.headers_json,
                capabilities=caps,
            )
            db.add(source)
            existing_slugs.add(slug)
            installed += 1

        if installed > 0:
            await db.commit()
        return installed, skipped

    @classmethod
    async def export_sources_json(cls, db: AsyncSession) -> Dict[str, Any]:
        """Exports all sources configuration (excluding secret credentials) as JSON."""
        sources = await cls.get_all(db)
        data = []
        for s in sources:
            source_dict = s.model_dump()
            if source_dict.get("credential"):
                source_dict["credential"].pop("masked_secret", None)
            data.append(source_dict)
        return {
            "version": "2.0",
            "exported_at": datetime.utcnow().isoformat(),
            "sources": data,
        }

    @classmethod
    async def import_sources_json(cls, db: AsyncSession, payload: Dict[str, Any]) -> Tuple[int, List[str]]:
        """Imports sources configuration from exported JSON."""
        sources_data = payload.get("sources", [])
        imported = 0
        errors = []

        for item in sources_data:
            try:
                name = item.get("name")
                source_type = (item.get("source_type") or "NEWS").upper()
                connector_type = (item.get("connector_type") or source_type).upper()
                categories = item.get("categories") or [item.get("category", "News")]
                if not name:
                    errors.append("Skipped entry missing name")
                    continue

                slug = item.get("slug") or slugify(name)
                existing = await db.execute(select(ContentSource).where(ContentSource.slug == slug))
                if existing.scalars().first():
                    slug = f"{slug}-{int(datetime.utcnow().timestamp())}"

                source = ContentSource(
                    name=name,
                    slug=slug,
                    source_type=source_type,
                    connector_type=connector_type,
                    content_roles=item.get("content_roles", ["NEWS"]),
                    categories=categories,
                    priority=item.get("priority", 5),
                    category=categories[0] if categories else "News",
                    base_url=item.get("base_url"),
                    feed_url=item.get("feed_url"),
                    canonical_url=item.get("canonical_url"),
                    external_identifier=item.get("external_identifier"),
                    description=item.get("description"),
                    icon_url=item.get("icon_url"),
                    status=item.get("status", "active"),
                    health_status="UNKNOWN",
                    sync_interval_minutes=item.get("sync_interval_minutes", 60),
                    config_json=item.get("config_json", {}),
                    headers_json=item.get("headers_json", {}),
                    capabilities=item.get("capabilities", DEFAULT_CAPABILITY_STATES.copy()),
                    fallback_chain=item.get("fallback_chain", []),
                )
                db.add(source)
                imported += 1
            except Exception as e:
                errors.append(f"Import failed for {item.get('name')}: {str(e)}")

        await db.commit()
        return imported, errors
