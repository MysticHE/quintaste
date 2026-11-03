"""Owner request 3 Nov 2026 (docs/AI_FOOD_LIBRARY_PLAN.md, Phase E): a second bridge just for the quick lane, so swap asks and Snap a
dish / My ingredients recipes never wait behind a long video. It runs the same ai_recipes_bridge.py (installed by deploy_videomaker.py)
as `--name qt-quick --lanes quick`, inside the Hermes container as uid 10000, like qt-ai-recipes-bridge.service.

The units come from bridge_units.py: each stops its own leftover copies before it starts (stopping the docker exec client leaves the
process inside the container running; five old copies were found on 3 Nov), and the bridge finishes the task in hand on that
signal, so restarting is safe at any time. This writes both recipe units, enables both and restarts both, so running it again also
loads new bridge code. Run after deploy_videomaker.py has put the lane-aware bridge in place. `systemctl disable --now
qt-ai-quick-bridge.service` stops the quick bridge; the main bridge still serves the quick lane when it is idle.
"""
import bridge_units
import setup

if __name__ == '__main__':
    print(setup.helper.remote(bridge_units.install(bridge_units.RECIPES, enable=bridge_units.RECIPES)))
