#!/usr/bin/env python3
"""Host-side keeper for the Hermes browser (owner-approved 18 Oct 2026).

Re-applies the egress policy, Chromium and the Bot Desktop packages whenever the Hermes container is
recreated (for example by the guarded auto-updater). The managed policy is written BEFORE Chromium
is installed, so a fresh container never runs an unguarded Chromium. Idempotent; run by
hermes-browser-ensure.timer.
"""
import subprocess
import sys

CONTAINER = 'hermes-agent-yril-hermes-agent-1'
POLICY_SRC = '/opt/data/qt-team/browser-policy.json'
# Debian Chromium reads /etc/chromium; full Google Chrome builds read /etc/opt/chrome. The image's bundled
# chrome-headless-shell ignores managed policies (verified 18 Oct), so it must never be the configured browser.
POLICY_DIRS = ('/etc/chromium/policies/managed', '/etc/opt/chrome/policies/managed')
PACKAGES = ('chromium tigervnc-standalone-server xfce4-panel xfwm4 xfdesktop4 xfce4-settings xfce4-terminal '
            'dbus-x11 x11-xserver-utils x11-utils x11-xkb-utils xauth fonts-dejavu-core')
SCRIPT = f"""set -e
for dir in {' '.join(POLICY_DIRS)}; do
  mkdir -p "$dir"
  cmp -s {POLICY_SRC} "$dir/qt-browser-guard.json" || install -m 0644 {POLICY_SRC} "$dir/qt-browser-guard.json"
done
if command -v chromium >/dev/null && command -v Xvnc >/dev/null; then echo present; exit 0; fi
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq --no-install-recommends {PACKAGES} >/dev/null
echo installed
"""


def main():
    running = subprocess.run(['docker', 'inspect', '-f', '{{.State.Running}}', CONTAINER],
                             capture_output=True, text=True)
    if running.stdout.strip() != 'true':
        print('Hermes container not running; nothing to do')
        return 0
    result = subprocess.run(['docker', 'exec', '-u', 'root', CONTAINER, 'sh', '-c', SCRIPT],
                            capture_output=True, text=True, timeout=900)
    print((result.stdout + result.stderr).strip()[-800:])
    return result.returncode


if __name__ == '__main__':
    sys.exit(main())
