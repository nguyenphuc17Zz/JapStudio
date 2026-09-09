from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.connectors.registry import ConnectorRegistry
from app.schemas.connector import ConnectorMeta, TestConnectionResponse
from app.models.source import ContentSource

router = APIRouter()


class AdHocTestRequest(BaseModel):
    source_type: str
    feed_url: Optional[str] = None
    base_url: Optional[str] = None
    config_json: Dict[str, Any] = {}
    headers_json: Dict[str, str] = {}
    auth_type: str = "none"
    secret: Optional[str] = None
    key_name: Optional[str] = None


@router.get("", response_model=List[ConnectorMeta])
async def list_connectors():
    """Lists all registered connectors and their configuration schemas."""
    return ConnectorRegistry.list_connectors()


@router.post("/test-adhoc", response_model=TestConnectionResponse)
async def test_adhoc_connection(payload: AdHocTestRequest):
    """Tests a connector endpoint prior to creating or persisting a source."""
    if not ConnectorRegistry.is_registered(payload.source_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown connector source_type '{payload.source_type}'",
        )

    connector = ConnectorRegistry.get(payload.source_type)

    # Validate config
    is_valid, err_msg = connector.validate_config(payload.config_json, payload.headers_json)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    # Ephemeral source mock object
    class EphemeralSource:
        feed_url = payload.feed_url
        base_url = payload.base_url
        config_json = payload.config_json
        headers_json = payload.headers_json
        credential = None

    ephemeral = EphemeralSource()
    res = await connector.test_connection(ephemeral, decrypted_secret=payload.secret)
    return TestConnectionResponse(
        success=res.success,
        status_code=res.status_code,
        response_time_ms=res.response_time_ms,
        message=res.message,
        sample_items_count=res.sample_items_count,
        sample_preview=res.sample_preview,
        error_details=res.error_details,
    )
