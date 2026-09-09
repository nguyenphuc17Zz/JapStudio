from datetime import datetime, timedelta
from typing import Optional, Tuple
from app.models.ingestion import SourceSyncState


class CircuitBreakerService:
    """Circuit breaker pattern to protect faulty external endpoints and avoid retry storms.
    - Consecutive failures >= 5: Degraded Warning
    - Consecutive failures >= 10: Circuit OPEN (suspended for cooldown)
    - After cooldown (30 min): HALF_OPEN (allows 1 probe sync)
    - Success in HALF_OPEN resets to CLOSED
    """

    FAILURE_THRESHOLD_OPEN = 10
    COOLDOWN_MINUTES = 30

    @classmethod
    def can_execute(cls, state: Optional[SourceSyncState]) -> Tuple[bool, str]:
        """Evaluates whether an ingestion job may proceed against this source."""
        if not state:
            return True, "CLOSED"

        if state.circuit_state == "CLOSED":
            return True, "CLOSED"

        if state.circuit_state == "OPEN":
            if state.circuit_opened_at:
                cooldown_delta = datetime.utcnow() - state.circuit_opened_at
                if cooldown_delta >= timedelta(minutes=cls.COOLDOWN_MINUTES):
                    state.circuit_state = "HALF_OPEN"
                    return True, "HALF_OPEN"
                remaining_sec = int((timedelta(minutes=cls.COOLDOWN_MINUTES) - cooldown_delta).total_seconds())
                return False, f"CIRCUIT_OPEN (Cooldown remaining: {remaining_sec}s)"
            # If opened_at is missing, allow half-open recovery probe
            state.circuit_state = "HALF_OPEN"
            return True, "HALF_OPEN"

        if state.circuit_state == "HALF_OPEN":
            # Allow single probe run
            return True, "HALF_OPEN"

        return True, "CLOSED"

    @classmethod
    def record_success(cls, state: SourceSyncState) -> None:
        """Resets failure streak and closes circuit upon successful sync."""
        state.consecutive_failures = 0
        state.circuit_state = "CLOSED"
        state.circuit_opened_at = None
        state.last_success_at = datetime.utcnow()

    @classmethod
    def record_failure(
        cls,
        state: SourceSyncState,
        is_permanent: bool = False
    ) -> None:
        """Increments failure streak and trips circuit if threshold reached."""
        state.consecutive_failures = (state.consecutive_failures or 0) + 1
        if is_permanent or state.consecutive_failures >= cls.FAILURE_THRESHOLD_OPEN:
            state.circuit_state = "OPEN"
            state.circuit_opened_at = datetime.utcnow()
