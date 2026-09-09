import asyncio
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger

logger = get_logger("db.retry")

_LOCKED_MARKERS = ("database is locked", "database table is locked")

# Serializes COMMIT moments across asyncio tasks in this process. SQLite has a
# single writer; without this, two tasks committing at the same instant collide
# even when each transaction is short. (Does NOT replace short transactions:
# a RESERVED lock held across network I/O still blocks everyone.)
_COMMIT_LOCK = asyncio.Lock()


def is_lock_error(exc: BaseException) -> bool:
    """True when exc is a SQLite lock-contention error worth special handling."""
    return isinstance(exc, OperationalError) and any(
        marker in str(exc).lower() for marker in _LOCKED_MARKERS
    )


async def locked_commit(session: AsyncSession) -> None:
    """Commits while holding the process-wide commit lock.

    NOTE: must only wrap SHORT, network-free transaction tails. Never hold
    across HTTP/AI calls. On lock errors the exception propagates (callers
    decide: user-facing endpoints surface it, job workers mark transient).
    Retrying commit-after-rollback generically would SILENTLY LOSE data
    (rollback expunges flushed objects), so this helper deliberately retries
    nothing — it only prevents same-process commit collisions.
    """
    async with _COMMIT_LOCK:
        await session.commit()
