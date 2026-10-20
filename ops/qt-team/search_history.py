"""Bounded query memory for provider-executed native search (advisory, not a proxy)."""
import datetime as dt
import hashlib
import json
import re


def remember(root, events, role):
    file = root / 'state/search-history.json'
    rows = json.loads(file.read_text()) if file.exists() else {}
    at = dt.datetime.now(dt.timezone.utc)
    def queries(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key in ('query', 'q', 'queries'):
                    for text in item if isinstance(item, list) else [item]:
                        if isinstance(text, str): yield text
                elif isinstance(item, (dict, list)): yield from queries(item)
        elif isinstance(value, list):
            for item in value: yield from queries(item)
    for event in events:
        if event.get('name') != 'web_search': continue
        for query in queries(event.get('input', {})):
            normalized = re.sub(r'\s+', ' ', query.strip().casefold())[:500]
            key = hashlib.sha256(normalized.encode()).hexdigest()
            rows[key] = {'query': normalized, 'role': role, 'searchedAt': at.isoformat()}
    cutoff = (at - dt.timedelta(days=30)).isoformat()
    rows = dict(sorted(((k,v) for k,v in rows.items() if v['searchedAt'] >= cutoff), key=lambda p: p[1]['searchedAt'])[-600:])
    from workflow import write
    write(file, rows)


def context(root):
    file = root / 'state/search-history.json'
    if not file.exists(): return ''
    rows = list(json.loads(file.read_text()).values())[-20:]
    return '\nShared recent search history: reuse captured evidence and avoid repeating these queries unless a due recheck or changed evidence requires it. Native provider search cannot be intercepted.\n' + json.dumps(rows, ensure_ascii=False)
