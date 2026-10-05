"""A small in-memory rate limit, for the one endpoint a stranger can hammer.

Kept in process memory on purpose: the app runs as a single process on the Pi,
and losing the counters on a restart only means a fresh minute for everyone.
"""

import time
from collections import defaultdict, deque


class SlidingWindowRateLimit:
    """At most `max_calls` per client in any `window_seconds`-long stretch."""

    def __init__(self, max_calls: int, window_seconds: float) -> None:
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._calls: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, client: str, now: float | None = None) -> bool:
        """Count this call and say whether it is within the limit; a refused call is not counted."""
        now = time.monotonic() if now is None else now
        calls = self._calls[client]
        while calls and calls[0] <= now - self.window_seconds:
            calls.popleft()
        if len(calls) >= self.max_calls:
            return False
        calls.append(now)
        return True

    def reset(self) -> None:
        self._calls.clear()
