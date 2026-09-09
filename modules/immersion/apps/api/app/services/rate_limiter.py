import asyncio
import time
from typing import Dict
from urllib.parse import urlparse
from app.core.logging import get_logger

logger = get_logger("services.rate_limiter")


class RateLimiterService:
    """Manages concurrency limits and spacing across 3 layers:
    1. Global Worker Concurrency (max active jobs)
    2. Per-Host Concurrency (max concurrent requests to same domain)
    3. Per-Source Spacing (minimum interval between consecutive fetches)
    """

    MAX_GLOBAL_CONCURRENT_JOBS = 5
    MAX_PER_HOST_CONCURRENCY = 2
    MIN_SOURCE_SPACING_SECONDS = 3.0

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RateLimiterService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._global_semaphore = asyncio.Semaphore(self.MAX_GLOBAL_CONCURRENT_JOBS)
        self._host_semaphores: Dict[str, asyncio.Semaphore] = {}
        self._source_last_fetched: Dict[int, float] = {}
        self._lock = asyncio.Lock()
        self._initialized = True

    @classmethod
    def get_instance(cls) -> "RateLimiterService":
        return cls()

    async def acquire_global_slot(self):
        """Acquires a global worker execution slot."""
        await self._global_semaphore.acquire()

    def release_global_slot(self):
        """Releases a global worker execution slot."""
        self._global_semaphore.release()

    async def acquire_host_slot(self, url: str):
        """Acquires a concurrency slot for a specific domain host."""
        host = self._extract_host(url)
        async with self._lock:
            if host not in self._host_semaphores:
                self._host_semaphores[host] = asyncio.Semaphore(self.MAX_PER_HOST_CONCURRENCY)
            sem = self._host_semaphores[host]
        await sem.acquire()

    def release_host_slot(self, url: str):
        """Releases a concurrency slot for a specific domain host."""
        host = self._extract_host(url)
        sem = self._host_semaphores.get(host)
        if sem:
            sem.release()

    async def throttle_source_spacing(self, source_id: int):
        """Enforces a mandatory quiet period between back-to-back fetches on the same source."""
        now = time.time()
        async with self._lock:
            last_time = self._source_last_fetched.get(source_id, 0.0)
            elapsed = now - last_time
            if elapsed < self.MIN_SOURCE_SPACING_SECONDS:
                wait_time = self.MIN_SOURCE_SPACING_SECONDS - elapsed
            else:
                wait_time = 0.0
            self._source_last_fetched[source_id] = now + wait_time

        if wait_time > 0:
            logger.debug(f"Throttling source #{source_id} for {wait_time:.2f}s to respect spacing limits.")
            await asyncio.sleep(wait_time)

    def _extract_host(self, url: str) -> str:
        if not url:
            return "unknown"
        try:
            return urlparse(url).netloc.lower() or "unknown"
        except Exception:
            return "unknown"


rate_limiter = RateLimiterService.get_instance()
