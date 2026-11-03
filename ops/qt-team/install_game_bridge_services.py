"""Owner request 22 Oct 2026 (approved in chat): keep QT Gamer's two app bridges running on the VPS.

Installs qt-game-level-bridge.service and qt-game-art-bridge.service on the host (units from bridge_units.py). Each runs its bridge
(copied by deploy_game_bridges.py) inside the Hermes container as uid 10000 and restarts on failure; a restart lets the job in hand
finish first. The app's `game_levels` control still gates level making; stopping a service (`systemctl disable --now <name>`) stops
that bridge.
"""
import sys
import bridge_units
import setup

if __name__ == '__main__':
    # Optional arguments name the services to (re)start; the others are installed and stopped.
    start = sys.argv[1:] or list(bridge_units.GAME)
    unknown = set(start) - set(bridge_units.GAME)
    if unknown:
        sys.exit('unknown service: ' + ', '.join(sorted(unknown)))
    print(setup.helper.remote(bridge_units.install(bridge_units.GAME, enable=bridge_units.GAME, restart=start,
                                                   stop=[s for s in bridge_units.GAME if s not in start])))
