from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]
    app: str
    version: str
    environment: str
    timestamp: datetime
    database: Literal["ok", "unchecked"] = "unchecked"
