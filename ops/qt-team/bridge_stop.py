"""Graceful stop for the long-running app bridges (3 Nov 2026), shared by ai_recipes_bridge.py, game_level_bridge.py and
game_art_bridge.py.

Their host services (bridge_units.py) send SIGTERM before every start and on stop. A bridge then finishes the job in hand, claims
nothing more and exits, so a restart never cuts a member's work off. A bridge still busy `deadline` seconds after the signal (a hung
download or model run) exits anyway, so a restart can always clear it; its job then waits out the app's claim limit like any lost
claim.
"""
from __future__ import annotations
import os
import signal
import threading

STOP = threading.Event()


def on_sigterm(deadline: int) -> None:
    """Turns SIGTERM into STOP, with a hard exit `deadline` seconds after the first signal."""
    def stop(*_):
        if STOP.is_set():
            return
        STOP.set()
        timer = threading.Timer(deadline, os._exit, (1,))
        timer.daemon = True
        timer.start()
    signal.signal(signal.SIGTERM, stop)
