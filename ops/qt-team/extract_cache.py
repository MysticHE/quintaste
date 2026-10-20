"""QT-only extraction adapter: public URLs, bounded shared cache and dated receipts."""
import asyncio
import datetime as dt
import fcntl
import hashlib
import json
import os
import pathlib
import sys
import time

sys.path.insert(0, '/opt/data/qt-team')
from workflow import public_url
from plugins.web._common import BaseWebSearchProvider
from plugins.web.firecrawl.provider import FirecrawlWebSearchProvider

CACHE = pathlib.Path('/opt/data/qt-team/state/source-cache')
MAX_BYTES = 1024 * 1024 * 1024
MAX_ENTRIES = 4000
KEEP_SECONDS = 72 * 3600


class QTExtract(BaseWebSearchProvider):
    NAME = 'qt-evidence'
    DISPLAY_NAME = 'QT evidence cache (Firecrawl)'

    def is_available(self):
        return True

    def supports_search(self):
        return False

    def supports_extract(self):
        return True

    async def extract(self, urls, **kwargs):
        return await asyncio.to_thread(self._extract, urls, kwargs)

    def _extract(self, urls, kwargs):
        CACHE.mkdir(exist_ok=True)
        results = []
        # One source fetch at a time across the new profiles AND across concurrent Hermes workers (Mixed Kitchen
        # runs several at once): this file lock covers every cache read, write, log append and eviction below.
        # Holds are short; all network transport timeouts remain owned by the upstream provider.
        with (CACHE / '.lock').open('a+') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            for url in list(dict.fromkeys(urls))[:6]:
                if not public_url(url):
                    results.append({'url': url, 'error': 'Not an allowed public research URL'})
                    continue
                key = hashlib.sha256(url.encode()).hexdigest()
                path = CACHE / (key + '.json')
                stored = json.loads(path.read_text()) if path.exists() else None
                ttl = 30 * 86400 if stored and stored.get('blocked') else 86400
                reused = bool(stored and time.time() - stored['fetchedEpoch'] < ttl)
                if not reused:
                    row = fetch(url, kwargs)
                    text =str(row.get('content') or row.get('raw_content') or '')
                    if len(text.encode()) > 240000:
                        text = text[:60000]
                        row['content'] = row['raw_content'] = text
                        row['qtTruncated'] = True
                    error = str(row.get('error', ''))
                    stored = {'url': url, 'fetchedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
                              'fetchedEpoch': time.time(), 'sha256': hashlib.sha256(text.encode()).hexdigest(),
                              'blocked': any(x in error.lower() for x in ['403', 'forbidden', 'robots', 'blocked']),
                              'result': row}
                    temp = path.with_suffix('.%d.tmp' % os.getpid())  # atomic replace; readers never see a partial file
                    temp.write_text(json.dumps(stored, ensure_ascii=False));temp.replace(path)
                row = dict(stored['result'])
                row['qtEvidence'] = {'fetchedAt': stored['fetchedAt'], 'sha256': stored['sha256'], 'cacheHit': reused,
                                     'note': 'A cache read is not a fresh merchant verification.'}
                results.append(row)
                log_path = CACHE / 'requests.jsonl'
                if log_path.exists() and log_path.stat().st_size > 8 * 1024 * 1024:
                    log_path.replace(CACHE / 'requests.previous.jsonl')
                with log_path.open('a') as log:
                    log.write(json.dumps({'at': dt.datetime.now(dt.timezone.utc).isoformat(), 'url': url,
                                          'cacheHit': reused, 'sourceSha256': stored['sha256'],
                                          'blocked': stored['blocked'], 'success': bool(row.get('content')) and not row.get('error')}) + '\n')
            files = sorted(CACHE.glob('*.json'), key=lambda p: p.stat().st_mtime)
            total = sum(p.stat().st_size for p in files)
            count = len(files)
            evictable = [f for f in files if time.time() - f.stat().st_mtime > KEEP_SECONDS]
            while evictable and (count > MAX_ENTRIES or total > MAX_BYTES):
                old = evictable.pop(0)
                if len(old.stem) == 64 and old.parent == CACHE and not old.is_symlink():
                    total -= old.stat().st_size; count -= 1; old.unlink()
        return results


def fetch(url, kwargs):
    """One source row: Google Maps pages in the guarded browser, PDFs and images read directly (the provider cannot read
    either; owner, 19-20 Oct 2026), everything else through the extract provider; a menu page whose dishes are only in
    pictures also gets those pictures transcribed (image_capture.enrich)."""
    import maps_capture
    import pdf_capture
    try:
        import image_capture  # owner, 20 Oct 2026; until it is installed PDFs and pages behave exactly as before
    except Exception:  # a missing or broken image module must never stop web_extract
        image_capture = None
    if maps_capture.is_maps(url):
        return maps_capture.capture(url)
    tried = pdf_capture.looks_like_pdf(url)
    pdf_row = pdf_capture.capture(url) if tried else None
    if pdf_row and not pdf_row.get('error'):
        return pdf_row
    image_row = image_capture.capture(url) if image_capture and image_capture.looks_like_image(url) else None
    if image_row and not image_row.get('error'):
        return image_row
    extracted = asyncio.run(FirecrawlWebSearchProvider().extract([url], **kwargs))
    row = extracted[0] if isinstance(extracted, list) and extracted else {'url': url, 'error': 'No source content returned'}
    failed = bool(row.get('error') or not row.get('content'))
    if failed and not tried and pdf_capture.looks_like_pdf(url, row.get('error', '')):
        pdf_row = pdf_capture.capture(url)
    if failed and not (pdf_row or image_row) and image_capture and image_capture.looks_like_image(url, row.get('error', '')):
        image_row = image_capture.capture(url)
    if failed:
        return pdf_row or image_row or row
    return image_capture.enrich(url, row) if image_capture else row


def register(ctx):
    ctx.register_web_search_provider(QTExtract())
    ctx.register_tool(name='qt_review_image', toolset='qt_team', schema={
        'name':'qt_review_image',
        'description':'Inspect an existing QT generated candidate or its approved reference by request hash. Read-only, no generation or arbitrary files.',
        'parameters':{'type':'object','properties':{'requestHash':{'type':'string'},'reference':{'type':'boolean'}},'required':['requestHash'],'additionalProperties':False}
    }, handler=review_image, is_async=True)
    ctx.register_tool(name='qt_team_status', toolset='qt_team', schema={
        'name':'qt_team_status',
        'description':'Read the latest QT team execution, review queue and schedule summary. Read-only; no model/provider calls or publication.',
        'parameters':{'type':'object','properties':{},'additionalProperties':False}
    }, handler=lambda args, **kwargs: team_status())


def team_status():
    root = pathlib.Path('/opt/data/qt-team')
    report_path = root/'state/latest-report.json'
    report = json.loads(report_path.read_text()) if report_path.exists() else {'status':'initial-run-in-progress'}
    jobs_path = pathlib.Path('/opt/data/profiles/qt-manager/cron/jobs.json')
    jobs = json.loads(jobs_path.read_text()).get('jobs',[]) if jobs_path.exists() else []
    return json.dumps({'latestReport':report,
                       'outboxPackages':len(list((root/'outbox').glob('*.json'))),
                       'generatedImages':len(list((root/'images').glob('*/result.json'))),
                       'jobs':[{k:j.get(k) for k in ['name','enabled','last_status','next_run_at']} for j in jobs],
                       'automaticAppPublication':json.loads((root/'policy.json').read_text()).get('automaticProductionWrites',False),
                       'publication':json.loads((root/'state/latest-publication.json').read_text()) if (root/'state/latest-publication.json').exists() else None,
                       'productionDatabaseAccess':False},ensure_ascii=False)


async def review_image(args, **kwargs):
    import re
    request_hash=args.get('requestHash','')
    if not re.fullmatch('[a-f0-9]{64}',request_hash):return json.dumps({'error':'Invalid request hash'})
    root=pathlib.Path('/opt/data/qt-team')
    folder=root/'images'/request_hash
    result=folder/'result.json'
    if not result.is_file():return json.dumps({'error':'No generated candidate'})
    metadata=json.loads(result.read_text())
    target=folder/'candidate.jpg'
    if args.get('reference'):
        reference=metadata.get('referenceSha256','')
        if not re.fullmatch('[a-f0-9]{64}',reference):return json.dumps({'error':'No approved reference'})
        target=root/'approved-references'/(reference+'.jpg')
        expected=reference
    else:expected=metadata['sha256']
    if target.is_symlink() or not target.is_file() or target.stat().st_size>2_000_000 or hashlib.sha256(target.read_bytes()).hexdigest()!=expected:return json.dumps({'error':'Image integrity check failed'})
    from tools.vision_tools import _handle_vision_analyze
    result = await _handle_vision_analyze({'image_url':str(target),'question':'Inspect this exact QT image for source fidelity, food composition, presentation, artefacts and misleading claims. It is a reference.' if args.get('reference') else 'Inspect this exact QT generated candidate against the publication brief. Do not infer ingredients, rights or branch identity from appearance alone.'},**kwargs)
    if isinstance(result,dict) and result.get('_multimodal') and any(c.get('type')=='image_url' for c in result.get('content',[])):
        receipt={'sha256':expected,'deliveredPixels':True,'at':dt.datetime.now(dt.timezone.utc).isoformat()}
        (folder/('inspection-reference.json' if args.get('reference') else 'inspection-candidate.json')).write_text(json.dumps(receipt))
    return result
