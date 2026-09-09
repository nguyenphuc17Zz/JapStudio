"""Timezone-aware day boundary helpers (Phase 7).

Timestamps are stored in UTC; day boundaries (streak days, daily goals,
missions) are computed in the configured application timezone
(``TIMEZONE_NAME``, default ``Asia/Ho_Chi_Minh``).
"""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from app.core.config import Settings, get_settings


def app_timezone(settings: Settings | None = None) -> ZoneInfo:
    resolved = settings or get_settings()
    return ZoneInfo(resolved.timezone_name)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def day_key(dt: datetime | None = None, settings: Settings | None = None) -> date:
    """The calendar day (in the app timezone) that ``dt`` falls on."""
    resolved = dt or now_utc()
    if resolved.tzinfo is None:
        resolved = resolved.replace(tzinfo=timezone.utc)
    return resolved.astimezone(app_timezone(settings)).date()


def utc_from_local_day(day: date, settings: Settings | None = None) -> datetime:
    """A UTC timestamp that falls on ``day`` in the app timezone (12:00 local).

    Used by tests to simulate streak/goal boundaries without changing the
    clock: ``record_activity(now=utc_from_local_day(target_date))``.
    """
    tz = app_timezone(settings)
    local_midday = datetime(day.year, day.month, day.day, 12, 0, tzinfo=tz)
    return local_midday.astimezone(timezone.utc)
