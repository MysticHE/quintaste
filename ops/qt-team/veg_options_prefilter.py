"""Free triage for the Mixed Kitchen queue (owner, 19 Oct 2026): reorder candidates so QT Explorer reaches the places whose
own website already shows vegetarian/vegan labels first. Runs locally, no model calls. A hit is a lead, never proof: the
code checks and QT Manager still verify every dish from a stored capture.

    python -X utf8 veg_options_prefilter.py <queue.json> <out.json> [--workers 12]

Tier 0: two or more label hits on the website or its /menu page (most hits first).
Tier 1: no usable website signal (no site, a social/delivery page, or unreachable): left for Explorer's own search.
Tier 2: website reachable but shows no label: deferred, never dropped.
Original triage order (priority, normal, low) is kept inside each tier.
"""
import concurrent.futures as cf
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

SOCIAL = re.compile(r'(^|\.)(facebook|instagram|tiktok|linktr\.ee|wa\.me|whatsapp|google|foodpanda|grab|deliveroo|shopee|carousell)\.')
LABEL = re.compile(r'(?i)\(\s*v(?:g|eg)?\s*\)|\[\s*v(?:g|eg)?\s*\]|\bvegetarian\b|\bvegan\b|plant[- ]based|素|斋')
PATHS = ('', '/menu', '/menus')
AGENT = 'QuinTaste research (+https://quintaste.com)'


def site_hits(website):
    """(reachable, label hits) over the homepage and the common menu paths; one visit per page."""
    reached, hits = False, 0
    for path in PATHS:
        try:
            req = urllib.request.Request(urllib.parse.urljoin(website, path), headers={'User-Agent': AGENT, 'Accept': 'text/html'})
            with urllib.request.urlopen(req, timeout=12) as response:
                if 'html' not in response.headers.get('content-type', ''):
                    continue
                text = re.sub(r'<[^>]+>', ' ', response.read(1_500_000).decode('utf-8', 'replace'))
        except Exception:
            continue
        reached = True
        hits += len(LABEL.findall(text))
    return reached, hits


def usable(website):
    if not isinstance(website, str) or not website.startswith('https://'):
        return False
    return not SOCIAL.search(urllib.parse.urlsplit(website).netloc.lower())


def tier(row, result):
    if result is None:
        return 1
    reached, hits = result
    return 0 if hits >= 2 else 2 if reached else 1


def run(queue_path, out_path, workers=12):
    data = json.loads(Path(queue_path).read_text(encoding='utf-8'))
    rows = data['candidates']
    todo = [r for r in rows if usable(r.get('website'))]
    results = {}
    with cf.ThreadPoolExecutor(workers) as pool:
        for row, result in zip(todo, pool.map(lambda r: site_hits(r['website']), todo)):
            results[row['candidateId']] = result
    order = {r['candidateId']: i for i, r in enumerate(rows)}
    ranked = sorted(rows, key=lambda r: (tier(r, results.get(r['candidateId'])), -(results.get(r['candidateId']) or (0, 0))[1], order[r['candidateId']]))
    for row in ranked:
        result = results.get(row['candidateId'])
        row['siteLabelHits'] = result[1] if result else None
        row['siteTier'] = tier(row, result)
    data['candidates'] = ranked
    Path(out_path).write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    counts = {t: sum(r['siteTier'] == t for r in ranked) for t in (0, 1, 2)}
    return {'candidates': len(ranked), 'websitesChecked': len(todo), 'tier0Promising': counts[0], 'tier1Unknown': counts[1], 'tier2Deferred': counts[2]}


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    workers = int(sys.argv[sys.argv.index('--workers') + 1]) if '--workers' in sys.argv else 12
    print(json.dumps(run(sys.argv[1], sys.argv[2], workers)))
