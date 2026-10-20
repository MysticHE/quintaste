"""Supervised Veg Kitchen pilot (owner, 20 Oct 2026). Operator-run only; never installed as a cron job, and the 24-hour
Hermes schedule is not changed. The regular Round also works through the queue (workflow.Round.veg_kitchen, one wave per
round); this entry point is for supervised batches of never-tried places.

Takes the first N never-tried candidates from state/veg-kitchen/queue.json and, inside the shared run lock, works through them
in rounds bounded by night_window.limits() (about 55 minutes each): Explorer workers of four candidates, QT Manager review,
Manager-reviewed publication and the Telegram digest (sent by the reporter after each verified publication). Writes
state/veg-kitchen/pilot-report.json. Scheduled ticks that find the lock busy do nothing, so regular Explorer work pauses
while the pilot runs. It is the Mixed Kitchen pilot loop (run_veg_options_pilot.py) with the Veg Kitchen task.

    python -X utf8 run_veg_kitchen_pilot.py --places 50 [--hours 4] [--wait-minutes 70]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_veg_options_pilot as pilot
import veg_kitchen as vk


def run(places, hours, wait_minutes):
    pilot.pilot(places, hours, wait_minutes, task=vk)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--places', type=int, default=50)
    parser.add_argument('--hours', type=float, default=4.0)
    parser.add_argument('--wait-minutes', type=float, default=70.0)
    args = parser.parse_args()
    run(args.places, args.hours, args.wait_minutes)
