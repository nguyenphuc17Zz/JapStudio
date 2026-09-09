"""Lightweight AI cost intelligence (Phase 11).

Estimates are exactly that — estimates. Providers rarely expose billing-accurate
pricing; we only aggregate what the provider metadata lets us track and always
mark the result as estimated.
"""

from dataclasses import dataclass

from app.providers.ai.base import AIUsage

# USD per 1M tokens, rough public list prices as of implementation time.
# Used only when the provider metadata does not carry pricing and the task
# profile is known; everything stays clearly labeled "estimated".
_DEFAULT_PRICES_PER_1M: dict[str, tuple[float, float]] = {
    "gemini": (0.10, 0.40),
    "groq": (0.30, 0.79),
    "ollama": (0.0, 0.0),
    "fake": (0.0, 0.0),
}


@dataclass(frozen=True)
class CostEstimate:
    input_tokens: int | None
    output_tokens: int | None
    total_tokens: int | None
    estimated_cost_usd: float | None
    estimated: bool = True


_dynamic_prices_cache: dict[str, tuple[float, float]] | None = None


def set_dynamic_prices_cache(prices: dict[str, tuple[float, float]]) -> None:
    global _dynamic_prices_cache
    _dynamic_prices_cache = prices


async def get_dynamic_prices(session) -> dict[str, tuple[float, float]]:
    """Try DB provider_pricing, fallback to defaults. Also updates in-memory cache."""
    global _dynamic_prices_cache
    try:
        from sqlalchemy import select

        from app.models.meta import ProviderPricing

        rows = (await session.execute(select(ProviderPricing))).scalars().all()
        if rows:
            _dynamic_prices_cache = {r.provider: (r.input_price_per_1m, r.output_price_per_1m) for r in rows}
            return _dynamic_prices_cache
    except Exception:
        pass
    return _dynamic_prices_cache or _DEFAULT_PRICES_PER_1M


def _get_effective_prices(prices_per_1m: dict[str, tuple[float, float]] | None) -> dict[str, tuple[float, float]]:
    if prices_per_1m is not None:
        return prices_per_1m
    return _dynamic_prices_cache or _DEFAULT_PRICES_PER_1M


def estimate_cost(
    usage: AIUsage | None,
    *,
    provider: str | None = None,
    prices_per_1m: dict[str, tuple[float, float]] | None = None,
) -> CostEstimate:
    """Estimate cost from provider usage metadata.

    ``estimated_cost_usd`` is None when usage is unknown or the provider is
    not priced; it is never fabricated from made-up token counts.
    """
    if usage is None:
        return CostEstimate(None, None, None, None)
    input_tokens = usage.input_tokens
    output_tokens = usage.output_tokens
    total = usage.total_tokens
    if input_tokens is None and output_tokens is None and total is None:
        return CostEstimate(None, None, None, None)
    if total is None:
        total = (input_tokens or 0) + (output_tokens or 0)

    prices = _get_effective_prices(prices_per_1m)
    input_price, output_price = prices.get(provider or "", (None, None))  # type: ignore[misc]
    if input_price is None or output_price is None:
        return CostEstimate(input_tokens, output_tokens, total, None)
    cost = (input_tokens or 0) / 1_000_000 * input_price + (
        output_tokens or 0
    ) / 1_000_000 * output_price
    return CostEstimate(input_tokens, output_tokens, total, round(cost, 6))
