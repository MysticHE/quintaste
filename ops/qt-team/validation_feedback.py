"""Deterministic self-correction: the evidence check's own results are fed back to the worker.

Unlike learning.py (Manager-approved procedures from a fixed catalogue), these are system facts:
which 'verified' claims the code-level evidence check had to hold, and why. They reach the same
role's next prompt automatically, with no model call or approval, and expire after 14 days.
"""
import datetime as dt
import json

FILE = 'state/validation-feedback.jsonl'
KEEP_DAYS = 14
MAX_LINES = 400
SHOWN = 3
CAUSES = {
    'source-differs': 'cited a different outlet of an outlet-selected storefront',
    'source-not-cited': 'did not cite the page the result relies on',
    'no-stored-capture': 'had no usable stored capture of the cited page (web_extract it; a browser view alone is not evidence)',
    'name-not-in-capture': 'dish name not found in the stored capture',
    'price-format': 'price was not an explicit SGD amount or valid range',
    'no-sgd-in-capture': 'stored capture shows no explicit SGD prices',
    'price-not-in-capture': 'price not shown next to the dish in the stored capture',
    'alternative-unconfirmed': 'cited a page not confirmed as this branch (different listing, no branch postal code)',
}


def _rows(root):
    path = root / FILE
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding='utf-8').splitlines():
        try:
            rows.append(json.loads(line))
        except ValueError:
            continue
    return rows


def note(root, role, per_venue):
    """Append one line per venue whose claims were held by the evidence check."""
    entries = [{'at': dt.datetime.now(dt.timezone.utc).isoformat(), 'role': role, 'venue': venue, 'held': counts}
               for venue, counts in per_venue.items() if counts]
    if not entries:
        return
    path = root / FILE
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = (_rows(root) + entries)[-MAX_LINES:]
    temp = path.with_name(path.name + '.tmp')
    temp.write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows), encoding='utf-8')
    temp.replace(path)


def context(root, role):
    """Prompt block with this role's most recent evidence-check holds, or ''."""
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=KEEP_DAYS)
    recent = []
    for r in _rows(root):
        try:
            if isinstance(r, dict) and r.get('role') == role and isinstance(r.get('held'), dict) and dt.datetime.fromisoformat(r['at']) >= cutoff:
                recent.append(r)
        except (KeyError, TypeError, ValueError):
            continue
    recent = recent[-SHOWN:]
    if not recent:
        return ''
    lines = []
    for row in recent:
        causes = '; '.join(f"{n} {CAUSES.get(code, code)}" for code, n in sorted(row['held'].items(), key=lambda kv: -kv[1]))
        lines.append(f"- {row['at'][:16]} UTC, {row['venue']}: {sum(row['held'].values())} 'verified' claims were held: {causes}.")
    return ('\n\nAutomatic evidence-check results from your recent runs (system facts, not opinions):\n' + '\n'.join(lines) +
            '\nOnly mark a dish verified when the stored web_extract capture of a cited page for the same branch shows the '
            'exact dish name with its explicit SGD price. If the recorded source is incomplete, find and web_extract another '
            'current source for the branch; otherwise hold the dish with the cause. A browser view alone cannot verify it.\n')
