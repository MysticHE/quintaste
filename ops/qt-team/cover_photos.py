"""Missing venue covers (owner, 18 Oct 2026): Explorer finds a real photo of the exact branch that
QuinTaste may reuse, the owner approves it with one tap on Telegram, then the image worker enhances it
and QT Manager reviews the pixels before it publishes as the cover.

Rights are checked here, not trusted from the model: an open licence that allows commercial reuse and
modification (CC0, Public Domain Mark, CC BY, CC BY-SA), or a page that explicitly grants reuse, and the
stored page capture must show the licence, the branch and the image file. Downloads go only through the
egress guard. Nothing reaches the app without the owner's tap and Manager's pixel review.

Mixed Kitchen places (owner, 19 Oct 2026) and Veg Kitchen places (ids vk-, 20 Oct 2026) get covers the same way: a live place
of kind "place" without a photo is a candidate after the catalogue venues (which every user sees), and its cover publishes as a
place update carrying "photo" (publisher.cover_candidates). Registry entries keep the item id under "venueId" with kind "place".
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import re
import time
import unicodedata
from pathlib import Path
from urllib.parse import unquote, urlsplit

try:
    import fcntl
except ImportError:  # Windows development copies; the VPS always has fcntl
    fcntl = None

ROOT = Path(os.environ.get('QT_TEAM_ROOT', '/opt/data/qt-team'))
OWNER_APPROVAL = re.compile(r'^owner-telegram-[a-f0-9]{24}$')
# Owner, 20 Oct 2026: "the image generated don't need my approval moving forward, just publish it live after [QT Manager's] approval".
# Drawings carry this standing approval instead of a Telegram tap; QT Manager's visual review is still required before publication.
STANDING_APPROVAL = 'owner-standing-illustrations-20261020'
STANDING_BY = 'owner-standing-rule'
SEARCH_EVERY = 86400
OWNER_WAIT = 14 * 86400
GUARD = 'http://127.0.0.1:3128'
USER_AGENT = 'QuinTasteBot/1.0 (+https://quintaste.srv1902914.hstgr.cloud)'
MAX_DOWNLOAD = 12 * 1024 * 1024
MAX_REFERENCE = 1_900_000  # image_worker and qt_review_image accept references up to 2,000,000 bytes
MIN_SIZE = (640, 400)
LICENCE = re.compile(r'^(CC0 1\.0|Public Domain Mark 1\.0|CC BY(-SA)? (1\.0|2\.0|2\.5|3\.0|4\.0)( [A-Z]{2,3})?)$')
LICENCE_URL = re.compile(r'^https://creativecommons\.org/(licenses/(by|by-sa)/(1\.0|2\.0|2\.5|3\.0|4\.0)(/[a-z]{2})?|publicdomain/(zero|mark)/1\.0)/?(deed\.[a-z-]+)?$')
RESTRICTED = ('by-nc', 'by-nd', 'noncommercial', 'non-commercial', 'noderivatives', 'no derivatives', 'all rights reserved')
PERMISSION_WORDS = ('permission', 'free to use', 'may use', 'may be used', 'reuse', 're-use', 'royalty-free', 'royalty free')
# Owner rule: never Google, delivery-app or social-media photos, whatever the page claims about reuse.
BLOCKED_HOSTS = ('google.', 'googleusercontent.com', 'gstatic.com', 'ggpht.com', 'foodpanda.', 'grab.com', 'grabfood', 'deliveroo.',
                 'gojek.', 'shopee.', 'oddle.', 'facebook.', 'fbcdn.net', 'fb.com', 'instagram.', 'cdninstagram.com', 'tiktok',
                 'twitter.', 'twimg.com', 'x.com', 'threads.net', 'xiaohongshu', 'xhscdn', 'lemon8', 'youtube.', 'ytimg.com',
                 'pinterest.', 'pinimg.com', 'tripadvisor.', 'burpple.', 'yelp.', 'chope.', 'quandoo.', 'linktr.ee', 'wa.me')
GENERIC = {'vegetarian', 'vegan', 'food', 'foods', 'restaurant', 'cafe', 'kitchen', 'house', 'singapore', 'stall',
           'the', 'and', 'branch', 'outlet', 'eatery', 'delight', 'delights', 'shop', 'centre', 'center'}


def refs(root):
    return root / 'approved-references'


def searches_file(root):
    return root / 'state/cover-search.json'


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def read(path, default=None):
    return json.loads(path.read_text(encoding='utf-8')) if path.is_file() else default


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temp.replace(path)


class Registry:
    """The reference registry under an exclusive lock (the workflow and the Telegram listener both write it)."""
    def __init__(self, root):
        self.folder = refs(root)

    def __enter__(self):
        self.folder.mkdir(parents=True, exist_ok=True)
        self.lock = (self.folder / 'registry.lock').open('a+')
        if fcntl:
            fcntl.flock(self.lock, fcntl.LOCK_EX)
        self.data = read(self.folder / 'registry.json', {'version': 1, 'entries': []})
        return self

    def save(self):
        write(self.folder / 'registry.json', self.data)

    def __exit__(self, *exc):
        self.lock.close()


def entries(root):
    return read(refs(root) / 'registry.json', {'entries': []})['entries']


def owner_entry(entry):
    return OWNER_APPROVAL.match(entry.get('rightsApprovalId') or '') is not None or standing_entry(entry)


def standing_entry(entry):
    return (entry.get('basis') == 'illustration' and entry.get('rightsApprovalId') == STANDING_APPROVAL
            and entry.get('approvedBy') == STANDING_BY)


def proposal_hash(reference_sha, image_sha):
    import publisher
    return publisher.sha({'cover': reference_sha, 'image': image_sha})


def enhancement(root, entry):
    """The generated enhancement result for an approved reference (or the drawn illustration itself), if its bytes are intact."""
    if entry.get('basis') == 'illustration':
        result = root / 'images' / str(entry.get('requestHash')) / 'result.json'
        info, file = read(result, {}), result.parent / 'candidate.jpg'
        if info.get('sha256') == entry['sha256'] and file.is_file() and hashlib.sha256(file.read_bytes()).hexdigest() == entry['sha256']:
            return dict(info, file=str(file))
        return None
    for result in sorted((root / 'images').glob('*/result.json')):
        info = read(result, {})
        if info.get('venueId') == entry['venueId'] and info.get('referenceSha256') == entry['sha256']:
            file = result.parent / 'candidate.jpg'
            if file.is_file() and hashlib.sha256(file.read_bytes()).hexdigest() == info.get('sha256'):
                return dict(info, file=str(file))
    return None


def settle(root, live=None):
    """Retire photos that can no longer become the cover, so Explorer searches again: the owner did not
    answer within 14 days, reverted the published cover, Manager held the enhancement, or enhancement kept failing."""
    if not any(e.get('status') in ('pending-owner', 'approved') and (e.get('status') == 'pending-owner' or owner_entry(e)) for e in entries(root)):
        return
    import publisher
    reverted = {r['proposalHash'] for r in (live or publisher.request('GET', '/control/state')).get('reverts', [])
                if r.get('kind') in ('venue', 'place') and r.get('proposalHash')}
    outcomes = read(root / 'state/publication-outcomes.json', {})
    with Registry(root) as reg:
        changed = False
        for entry in reg.data['entries']:
            if entry.get('status') == 'pending-owner' and time.time() - dt.datetime.fromisoformat(entry['proposedAt']).timestamp() > OWNER_WAIT:
                entry.update(status='expired', closedAt=now()); changed = True
            if entry.get('status') != 'approved' or not owner_entry(entry):
                continue
            image = enhancement(root, entry)
            key = proposal_hash(entry['sha256'], image['sha256']) if image else None
            reason = ('owner-reverted' if key and key in reverted else
                      'manager-held' if key and outcomes.get(key, {}).get('decision') == 'hold' else
                      'enhancement-failed' if not image and entry.get('enhancementFailed') else None)
            if reason:
                entry.update(status=reason, closedAt=now()); changed = True
        if changed:
            reg.save()


def place_targets(live):
    """Live Mixed Kitchen places without a photo, in the shape the search uses for a venue."""
    rows = []
    for record in (live or {}).get('records', []):
        data = record.get('data') or {}
        if record.get('kind') != 'place' or data.get('photo') or not data.get('name'):
            continue
        address = str(data.get('address', ''))
        if data.get('postalCode') and data['postalCode'] not in address:
            address += ', Singapore ' + data['postalCode']
        rows.append({'venueId': record['id'], 'kind': 'place', 'name': data['name'], 'branch': data.get('branch') or '',
                     'address': address, 'sourceUrls': list(data.get('sourceUrls', []))})
    return rows


def due(root, baseline, live=None):
    """The first item without a cover that has no open candidate and was not searched in the last day: catalogue
    venues first (every user sees them; permanently closed ones are skipped), then live Mixed Kitchen places."""
    open_items = {e['venueId'] for e in entries(root) if e.get('status') in ('pending-owner', 'approved')}
    searched = read(searches_file(root), {})
    closed = {v['id'] for v in (live or {}).get('venues', []) if (v.get('data') or {}).get('closed')}
    for venue in [v for v in baseline['venues'] if v['venueId'] not in closed] + place_targets(live):
        if venue.get('hasCover') or venue['venueId'] in open_items:
            continue
        last = searched.get(venue['venueId'], {}).get('at')
        if last and time.time() - dt.datetime.fromisoformat(last).timestamp() < SEARCH_EVERY:
            continue
        return venue
    return None


def prompt(venue, rejected):
    known = [u for u in venue.get('sourceUrls', []) if not re.search(r'\.(jpe?g|png|webp)(\?|$)', u, re.I)][:6]
    branch = ('\nBranch: ' + venue['branch']) if venue.get('branch') else ''
    kind = ('a Veg Kitchen place (a fully vegetarian or vegan restaurant; the photo may show its storefront, signage, interior '
            'or the plant-based food served there)' if str(venue['venueId']).startswith('vk-') else
            'a Mixed Kitchen place (not a vegetarian kitchen; the photo may show its storefront, signage or interior, '
            'never a meat or seafood dish)') if venue.get('kind') == 'place' else 'venue branch'
    return (
        'Current UTC: ' + now() + '. Task: find ONE real photograph of this exact QuinTaste ' + kind + ' that QuinTaste is '
        'allowed to reuse, to fill its missing cover photo.\nVenue: ' + venue['name'] + branch + '\nAddress: ' + venue['address'] +
        '\nKnown pages (for identity only): ' + json.dumps(known) +
        '\nPreviously rejected (never propose again): ' + json.dumps(rejected[-20:]) +
        '\nAcceptable rights ONLY: (a) an open licence allowing commercial reuse and modification: CC0, Public Domain Mark, '
        'CC BY or CC BY-SA (any version). NOT NC or ND, not "all rights reserved". Usually a Wikimedia Commons, Flickr or '
        'Openverse file page. (b) A page by the merchant or photographer that explicitly says others may reuse the photo; '
        'quote that exact sentence. Merchant websites, social media, delivery apps, review sites and Google Maps are '
        'copyrighted by default: never propose them unless (b) applies.\n'
        'The photo must show THIS branch (storefront, signage, interior or food served there), and the page must identify the '
        'branch by name and location. web_extract the page that states the licence so its text is stored; the coordinator '
        're-checks every field against that stored page and rejects anything it cannot find there. Never invent URLs or licences. '
        'Google Maps may help identify the branch, but its photos are never reusable. Read-only browsing.\n'
        'Return ONLY JSON: {"role":"qt-explorer","venueId":"' + venue['venueId'] + '","candidates":[{"imageUrl":"direct https '
        'URL of the image file","pageUrl":"https page you web_extracted that states the licence","basis":"open-licence"|'
        '"stated-permission","license":"e.g. CC BY-SA 4.0","licenseUrl":"https://creativecommons.org/... or null",'
        '"author":"photographer or owner as credited","capturedAt":"YYYY-MM-DD or null","identityQuote":"<=25 words quoted '
        'from the page identifying this branch","permissionQuote":"exact reuse sentence or null"}],"notes":"what you '
        'searched"}. At most 3 candidates, best first. An empty candidates list is a valid answer.')


def _norm(text):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', str(text)).casefold()).strip()


def _capture(root, url):
    stored = read(root / 'state/source-cache' / (hashlib.sha256(url.encode()).hexdigest() + '.json'))
    if not stored or stored.get('blocked') or not stored.get('result', {}).get('content'):
        return None
    if time.time() - stored['fetchedEpoch'] > 35 * 86400:
        return None
    return _norm(unquote(stored['result']['content']))


def _image_name(url):
    name = unquote(urlsplit(url).path.rsplit('/', 1)[-1])
    return _norm(re.sub(r'^\d+px-', '', name)).replace(' ', '_')


def blocked_host(host):
    """'google.' blocks google.com, google.com.sg and maps.google.com; 'fbcdn.net' that domain and its subdomains;
    a bare fragment such as 'tiktok' any host containing it."""
    host = host.lower()
    for b in BLOCKED_HOSTS:
        if b.endswith('.'):
            if host.startswith(b) or '.' + b in host:
                return True
        elif '.' in b:
            if host == b or host.endswith('.' + b):
                return True
        elif b in host:
            return True
    return False


def check(root, candidate, venue):
    """Deterministic rights, branch and image checks against the stored page. Returns a problem or None."""
    from workflow import public_url
    if not isinstance(candidate, dict):
        return 'not an object'
    image_url, page_url = candidate.get('imageUrl'), candidate.get('pageUrl')
    if not (public_url(image_url) and public_url(page_url)):
        return 'image and page must be public https URLs'
    if any(blocked_host(urlsplit(u).hostname or '') for u in (image_url, page_url)):
        return 'Google, delivery-app and social-media photos are never reused'
    author, license_ = candidate.get('author'), candidate.get('license')
    if not (isinstance(author, str) and 0 < len(author.strip()) <= 180):
        return 'missing photographer credit'
    captured = candidate.get('capturedAt')
    if captured is not None and not (isinstance(captured, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', captured) and captured <= dt.date.today().isoformat()):
        return 'invalid capture date'
    page = _capture(root, page_url)
    if page is None:
        return 'page not stored by web_extract (or blocked/stale)'
    quote = candidate.get('identityQuote')
    if not (isinstance(quote, str) and _norm(quote) and _norm(quote) in page):
        return 'branch quote not found on the stored page'
    postal = re.findall(r'\b(\d{6})\b', venue['address'])
    words = [w for w in re.findall(r'[a-z0-9]+', _norm(venue['name'])) if len(w) >= 4 and w not in GENERIC]
    if not ((postal and postal[-1] in page) or (words and all(w in page for w in words))):
        return 'page does not identify this branch'
    if _image_name(image_url) not in page.replace(' ', '_'):
        return 'image file is not on the stored page'
    if candidate.get('basis') == 'open-licence':
        url = candidate.get('licenseUrl') or ''
        if not (isinstance(license_, str) and LICENCE.match(license_) and LICENCE_URL.match(url)):
            return 'licence is not CC0, Public Domain Mark, CC BY or CC BY-SA'
        family = 'zero' if license_.startswith('CC0') else 'mark' if license_.startswith('Public') else 'by-sa' if '-SA' in license_ else 'by'
        if f'/{family}/' not in url:
            return 'licence name and licence link disagree'
        path = urlsplit(url).path.strip('/')
        if path.casefold() not in page and _norm(license_) not in page:
            return 'licence not shown on the stored page'
        if any(word in page for word in RESTRICTED):
            return 'page also shows a restrictive licence'
    elif candidate.get('basis') == 'stated-permission':
        permission = candidate.get('permissionQuote')
        if not (isinstance(permission, str) and len(permission) <= 400 and _norm(permission) in page
                and any(word in _norm(permission) for word in PERMISSION_WORDS)):
            return 'reuse permission sentence not found on the stored page'
        candidate['license'], candidate['licenseUrl'] = 'Used with stated permission', page_url
    else:
        return 'unsupported rights basis'
    return None


def download(url):
    """Fetch through the egress guard (it refuses private targets after DNS), bounded and decoded."""
    import io
    import urllib.request
    from PIL import Image, ImageOps
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({'https': GUARD, 'http': GUARD}))
    request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept': 'image/jpeg,image/png,image/webp'})
    with opener.open(request, timeout=30) as response:
        if not response.headers.get('Content-Type', '').startswith('image/'):
            raise ValueError('not an image response')
        raw = response.read(MAX_DOWNLOAD + 1)
    if len(raw) > MAX_DOWNLOAD:
        raise ValueError('image larger than 12 MB')
    Image.MAX_IMAGE_PIXELS = 60_000_000
    with Image.open(io.BytesIO(raw)) as image:
        if image.format not in ('JPEG', 'PNG', 'WEBP'):
            raise ValueError('unsupported image format')
        image = ImageOps.exif_transpose(image).convert('RGB')
    if image.width < MIN_SIZE[0] or image.height < MIN_SIZE[1]:
        raise ValueError(f'image too small ({image.width}x{image.height})')
    image.thumbnail((1600, 1600))
    for quality in (88, 80, 72, 64):
        out = io.BytesIO()
        image.save(out, format='JPEG', quality=quality, optimize=True)
        if out.tell() <= MAX_REFERENCE:
            return out.getvalue(), image.size
    raise ValueError('image cannot be reduced to the reference size limit')


def search(root, baseline, folder, policy, live=None, seconds=None):
    """One Explorer call for one venue or Mixed Kitchen place; registers the first candidate that passes every check."""
    from workflow import run_model
    venue = due(root, baseline, live)
    if venue is None:
        return None
    searches = read(searches_file(root), {})
    history = searches.get(venue['venueId'], {})
    rejected = history.get('rejectedUrls', []) + [e['photo']['sourceUrl'] for e in entries(root)
                                                  if e['venueId'] == venue['venueId'] and e.get('status') not in ('pending-owner', 'approved')]
    history['at'] = now()
    searches[venue['venueId']] = history
    write(searches_file(root), searches)  # one search per venue per day, even if the call fails
    result, _ = run_model('qt-explorer', prompt(venue, rejected), folder, policy, seconds=min(900, policy.get('workerSeconds', 900), seconds or 900))
    if result.get('venueId') != venue['venueId'] or not isinstance(result.get('candidates'), list):
        raise ValueError('Cover search returned the wrong venue or no candidate list')
    problems = []
    known_shas = {e['sha256'] for e in entries(root)}
    for candidate in result['candidates'][:3]:
        problem = check(root, candidate, venue)
        if problem is None and candidate['pageUrl'] in rejected:
            problem = 'previously rejected'
        if problem is None:
            try:
                blob, size = download(candidate['imageUrl'])
            except Exception as exc:
                problem = 'download failed: ' + str(exc)[:120]
        if problem:
            problems.append({'pageUrl': str(candidate.get('pageUrl'))[:300] if isinstance(candidate, dict) else None, 'problem': problem})
            continue
        sha = hashlib.sha256(blob).hexdigest()
        if sha in known_shas:
            problems.append({'pageUrl': candidate['pageUrl'], 'problem': 'same image already handled'})
            continue
        target = refs(root) / (sha + '.jpg')
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            temp = target.with_suffix('.tmp')
            temp.write_bytes(blob)
            temp.replace(target)
        entry = {'venueId': venue['venueId'], 'kind': venue.get('kind', 'venue'), 'name': venue['name'], 'address': venue['address'], 'sha256': sha,
                 'status': 'pending-owner', 'basis': candidate['basis'], 'imageUrl': candidate['imageUrl'],
                 'identityEvidence': candidate['identityQuote'][:400] + ' (' + candidate['pageUrl'] + ')',
                 'permissionQuote': candidate.get('permissionQuote'), 'width': size[0], 'height': size[1], 'proposedAt': now(),
                 'photo': {'author': candidate['author'].strip(), 'sourceUrl': candidate['pageUrl'], 'license': candidate['license'],
                           'licenseUrl': candidate['licenseUrl'], 'capturedAt': candidate.get('capturedAt')}}
        with Registry(root) as reg:
            reg.data['entries'].append(entry)
            reg.save()
        history.update(result='awaiting-owner', problems=problems)
        write(searches_file(root), dict(read(searches_file(root), {}), **{venue['venueId']: history}))
        return {'status': 'awaiting-owner-approval', 'venueId': venue['venueId'], 'sha256': sha}
    history.update(result='none-usable', problems=problems)
    write(searches_file(root), dict(read(searches_file(root), {}), **{venue['venueId']: history}))
    return {'status': 'no-usable-photo', 'venueId': venue['venueId'], 'checked': len(problems)}


def decide(root, venue_id, sha, approved, token):
    """The owner's tap. Returns 'approved', 'rejected' or 'stale'."""
    with Registry(root) as reg:
        entry = next((e for e in reg.data['entries'] if e['venueId'] == venue_id and e['sha256'] == sha), None)
        if entry is None or entry.get('status') != 'pending-owner':
            return 'stale'
        if approved:
            entry.update(status='approved', rightsApprovalId='owner-telegram-' + token, approvedBy='telegram-owner', approvedAt=now())
        else:
            entry.update(status='owner-rejected', closedAt=now())
        reg.save()
    if approved and entry.get('basis') == 'illustration':
        import cover_publish  # a drawing is final: QT Manager checks it and it goes live right away (owner, 20 Oct 2026)
        cover_publish.request(root, venue_id)
    if not approved and entry.get('basis') != 'illustration':
        searches = read(searches_file(root), {})
        history = searches.setdefault(venue_id, {})
        history['rejectedUrls'] = (history.get('rejectedUrls', []) + [entry['photo']['sourceUrl']])[-50:]
        write(searches_file(root), searches)
    return 'approved' if approved else 'rejected'


def enhance(root, policy):
    """Enhance one owner-approved reference whose venue still lacks a cover."""
    from venue_images import enhance_reference
    for entry in entries(root):
        if (entry.get('status') != 'approved' or not owner_entry(entry) or entry.get('enhancementFailed')
                or entry.get('basis') == 'illustration' or enhancement(root, entry)):
            continue  # an illustration is already the final image
        outcome = enhance_reference(entry, [{'url': entry['photo']['sourceUrl']}], policy)
        if outcome['status'] == 'retry-waiting':
            continue
        if outcome['status'] == 'failed-final':
            with Registry(root) as reg:
                for e in reg.data['entries']:
                    if e['sha256'] == entry['sha256'] and e['venueId'] == entry['venueId']:
                        e['enhancementFailed'] = now()
                reg.save()
        return dict(outcome, venueId=entry['venueId'])
    return None


def publishable(root, live):
    """Approved, enhanced owner photos for venues and live Mixed Kitchen places that still have no cover."""
    covered = {('venue', v['id']) for v in live['venues'] if v['data'].get('photo')}
    covered |= {('place', r['id']) for r in live.get('records', []) if r.get('kind') == 'place' and (r.get('data') or {}).get('photo')}
    places = {r['id'] for r in live.get('records', []) if r.get('kind') == 'place'}
    rows = []
    for entry in entries(root):
        kind = entry.get('kind', 'venue')
        if (entry.get('status') != 'approved' or not owner_entry(entry) or (kind, entry['venueId']) in covered
                or (kind == 'place' and entry['venueId'] not in places)):
            continue
        image = enhancement(root, entry)
        if image:
            rows.append({'entry': entry, 'image': image,
                         'source': {'url': entry['photo']['sourceUrl'], 'checkedAt': entry['approvedAt'][:10],
                                    'evidence': entry['identityEvidence'][:1200]}})
    return rows


def caption(entry):
    if entry.get('basis') == 'illustration':
        kitchen = 'Veg Kitchen' if str(entry['venueId']).startswith('vk-') else 'Mixed Kitchen'
        return '\n'.join([kitchen + ' cover illustration for your approval', entry['name'], entry['address'],
                          'Drawn from its menu: ' + ', '.join(entry.get('dishes', [])),
                          'Not a photo of the place; the app credits it as a QuinTaste illustration.',
                          'Approve: QT Manager checks it, then it goes live as the cover. Reject: QT draws a different one next time '
                          '(up to ' + str(ILLUSTRATION_TRIES) + ' tries).'])[:1024]
    p = entry['photo']
    title = (('Veg Kitchen' if str(entry['venueId']).startswith('vk-') else 'Mixed Kitchen') + ' cover photo for your approval'
             if entry.get('kind') == 'place' else 'Cover photo for your approval')
    lines = [title, entry['name'], entry['address'],
             'Licence: ' + p['license'] + ' · by ' + p['author'],
             'Why this branch: ' + entry['identityEvidence']]
    if entry.get('permissionQuote'):
        lines.append('Permission: "' + entry['permissionQuote'][:200] + '"')
    lines.append('Approve: it is enhanced, QT Manager checks it, then it goes live as the cover with this credit. Reject: Explorer looks for another photo.')
    return '\n'.join(lines)[:1024]


def summary_line(root, baseline_venues, live=None):
    missing = sum(not v.get('hasCover') for v in baseline_venues)
    targets = place_targets(live)
    kitchen = sum(str(t['venueId']).startswith('vk-') for t in targets)
    places = len(targets) - kitchen
    waiting = sum(e.get('status') == 'pending-owner' for e in entries(root))
    mixed = (f' and {places} Mixed Kitchen place(s)' if places else '') + (f' and {kitchen} Veg Kitchen place(s)' if kitchen else '')
    return (f'Cover photos: {missing} venue(s){mixed} without one; {waiting} cover(s) waiting for your approval.\n'
            if missing or targets or waiting else '')


# ---------------------------------------------------------------- dish illustrations (owner, 20 Oct 2026)
# Almost no Veg Kitchen or Mixed Kitchen place has a photo QuinTaste may reuse (16 of 16 searches found none), so the owner chose
# illustrations of each place's own published dishes. Never a venue's cover, never a picture of the shopfront, never published
# without the owner's tap and QT Manager's pixel review, and always credited as an illustration.
ILLUSTRATION_CREDIT = 'QuinTaste illustration'
ILLUSTRATION_EVERY = 6 * 3600   # at most one new drawing per place in this time (after a rejection)
ILLUSTRATION_TRIES = 3          # owner rejections before a place keeps its placeholder
# Owner, 20 Oct 2026: keep the look of the first drawing (Daily Green, Ang Mo Kio): realistic, photo-like food on a wooden table.
# Do not change these styles or the prompt wording without the owner.
ILLUSTRATION_STYLES = ('soft watercolour', 'warm gouache', 'clean flat vector-style')


# Owner, 20 Oct 2026: at ice-cream, dessert, drink and bakery places the menu names are often flavours ("Earl Grey Banana Bread" is a
# gelato), and a drawing of the namesake food was held by QT Manager. The place name or menu sections decide the kind of shop.
SHOP_KINDS = (
    ('dessert', re.compile(r'gelat|ice[- ]?cream|sorbet|soft[- ]?serve|\bscoops?\b|\bkones?\b|popsicle|frozen yog|froyo|\bdessert', re.I),
     'This is an ice-cream and dessert shop, so the menu names are flavours, not dishes: show each as a scoop of plant-based ice cream '
     'or gelato in a cup or cone, coloured and garnished to suggest its flavour. Never draw the food a flavour is named after (a flavour '
     'called "Banana Bread" is ice cream, not a loaf of bread). Cups and cones on a plain wooden table seen from slightly above'),
    ('drinks', re.compile(r'bubble tea|\bboba\b|milk tea|\bjuices?\b|smoothie|\bteas?\s+(?:bar|house|shop)', re.I),
     'This is a drinks shop, so the menu names are drinks: show each as a drink in a clear glass or cup, coloured to suggest its '
     'flavour. Never draw the food a drink is named after. Glasses on a plain wooden table seen from slightly above'),
    ('bakery', re.compile(r'bakery|bakehouse|patisserie|boulangerie|\bpastr', re.I),
     'This is a bakery, so show the items as baked goods on plates or a wooden board, seen from slightly above'),
)


def shop_kind(data):
    """(kind, drawing guidance) from the place name or its menu sections; None for an ordinary kitchen."""
    sections = ' '.join(str(i.get('category') or '') for i in (data.get('menu') or {}).get('items', []))
    for kind, pattern, guidance in SHOP_KINDS:
        if pattern.search(str(data.get('name') or '')) or pattern.search(sections):
            return kind, guidance
    return None


def illustration_prompt(data, attempt=0):
    items = (data.get('menu') or {}).get('items', [])
    dishes = [i['name'] for i in items if i.get('name')][:3]
    vegan = data.get('venueDiet') == 'Vegan'
    style = ILLUSTRATION_STYLES[attempt % len(ILLUSTRATION_STYLES)]
    kind = shop_kind(data)
    return ('A ' + style + ' illustration (clearly an illustration, not a photograph) for a food app cover, 4:3 landscape. '
            'Show these items from one Singapore ' + ('vegan' if vegan else 'vegetarian') + ' menu: ' + '; '.join(dishes) + '. '
            + (kind[1] if kind else 'Plates or bowls on a plain wooden table seen from slightly above') +
            ', soft daylight, appetising colours, calm empty space '
            'along the bottom edge. Every item is plant-based' + (', with no egg, dairy or honey' if vegan else '') +
            '; dishes named after meat or seafood are plant-based versions. No meat, fish or seafood. No text, letters, numbers, '
            'menus, signs, logos, brand names, packaging, people, hands or shopfronts.'
            + (' Use a different composition from earlier drawings.' if attempt else ''))


def illustration_target(root, live):
    """The next live place without a cover that may get a drawing: Veg Kitchen first, nothing open for it in the registry, fewer
    than ILLUSTRATION_TRIES rejected drawings and none in the last ILLUSTRATION_EVERY. Returns (target, live record, attempt)."""
    records = {r['id']: r for r in (live or {}).get('records', []) if r.get('kind') == 'place'}
    rows = entries(root)
    # A drawing QT Manager has already reviewed while the place still has no photo was held (the record or its pixels): it is a used
    # try, not an open one, so a new one is drawn. A published drawing would have given the place a photo and taken it off the list.
    outcomes = {**read(root / 'state/publication-outcomes.json', {}), **read(root / 'state/pending-publication-outcomes.json', {})}
    held = lambda e: e.get('basis') == 'illustration' and proposal_hash(e['sha256'], e['sha256']) in outcomes
    targets = sorted(place_targets(live), key=lambda t: not str(t['venueId']).startswith('vk-'))
    for target in targets:
        mine = [e for e in rows if e['venueId'] == target['venueId']]
        drawings = [e for e in mine if e.get('basis') == 'illustration']
        record = records.get(target['venueId'])
        if (any(e.get('status') in ('pending-owner', 'approved') and not held(e) for e in mine) or len(drawings) >= ILLUSTRATION_TRIES
                or not record or not ((record.get('data') or {}).get('menu') or {}).get('items')):
            continue
        last = max((e.get('proposedAt') or '' for e in drawings), default='')
        if last and time.time() - dt.datetime.fromisoformat(last).timestamp() < ILLUSTRATION_EVERY:
            continue
        return target, record, len(drawings)
    return None


def illustrate(root, policy, live):
    """Draw one cover illustration for the next eligible place and send it to the owner (as a pending registry entry)."""
    from venue_images import run_request
    found = illustration_target(root, live)
    if not found:
        return None
    target, record, attempt = found
    data = record['data']
    request = {'kind': 'place-illustration', 'placeId': target['venueId'], 'attempt': attempt,
               'prompt': illustration_prompt(data, attempt), 'sources': [{'url': data['menu']['sourceUrl']}]}
    outcome = run_request(request, policy)
    if outcome['status'] != 'generated-awaiting-visual-review':
        return dict(outcome, venueId=target['venueId'])
    folder = root / 'images' / outcome['requestHash']
    info, file = read(folder / 'result.json', {}), folder / 'candidate.jpg'
    sha = info.get('sha256')
    if not (sha and file.is_file() and hashlib.sha256(file.read_bytes()).hexdigest() == sha):
        return {'status': 'failed-illustration-integrity', 'venueId': target['venueId']}
    refs(root).mkdir(parents=True, exist_ok=True)
    copy = refs(root) / (sha + '.jpg')
    if not copy.exists():
        copy.write_bytes(file.read_bytes())  # the registry's copy of the drawing (approved by the owner's standing rule)
    dishes = [i['name'] for i in data['menu']['items'] if i.get('name')][:3]
    entry = {'venueId': target['venueId'], 'kind': 'place', 'name': target['name'], 'address': target['address'], 'sha256': sha,
             'status': 'approved', 'rightsApprovalId': STANDING_APPROVAL, 'approvedBy': STANDING_BY, 'approvedAt': now(),
             'basis': 'illustration', 'requestHash': outcome['requestHash'], 'dishes': dishes,
             'identityEvidence': "Illustration drawn from this place's published menu: " + '; '.join(dishes) + ' (' + data['menu']['sourceUrl'] + ')',
             'width': info.get('width'), 'height': info.get('height'), 'proposedAt': now(),
             'photo': {'author': ILLUSTRATION_CREDIT, 'sourceUrl': data['menu']['sourceUrl'], 'license': ILLUSTRATION_CREDIT,
                       'licenseUrl': None, 'capturedAt': None}}
    with Registry(root) as reg:
        if not any(e['sha256'] == sha and e['venueId'] == entry['venueId'] for e in reg.data['entries']):
            reg.data['entries'].append(entry)
            reg.save()
    import cover_publish  # no owner tap needed (standing approval): QT Manager reviews it and it goes live
    cover_publish.request(root, target['venueId'])
    return {'status': 'approved-for-manager-review', 'venueId': target['venueId'], 'sha256': sha, 'kind': 'illustration'}
