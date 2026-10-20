"""PDF menus for the QT evidence cache (owner, 19 Oct 2026). The extract provider cannot read PDFs
(HTTP 422), and many merchant menus are a single scanned page with no text layer. This fetches the PDF
through the guard proxy, keeps its text layer when it has one, and otherwise transcribes each page image
with the vision model. Transcriptions are labelled as such and cached per PDF hash, so the same file is
read once.
"""
from __future__ import annotations

import asyncio
import hashlib
import io
import json
import pathlib
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path('/opt/data/qt-team')
sys.path.insert(0, str(ROOT / 'vendor'))
MAX_PDF_BYTES = 20 * 1024 * 1024
MAX_PAGES = 4
MIN_TEXT = 200          # characters; less means a scanned PDF
MAX_SIDE = 3600         # pixels; menus need full detail for small prices
TRANSCRIBED = '[Transcribed by the vision model from the PDF page image; the PDF has no text layer.]'
PROMPT = ('Transcribe this menu page exactly as printed, in reading order, section by section. Put each dish on one '
          'line: its name (with any sub-line such as "with condensed milk"), description, then price(s) as printed. For price '
          'columns (such as Hot/Iced), write the column headers once on their own line and on each dish line only the prices '
          'in column order, with - for an empty cell. Put small badges or icons (such as AF, VG, spicy) in square brackets at the '
          'very end of the line, after the price, never inside the name. Copy names, '
          'numbers and symbols exactly; do not add, guess, translate, correct or summarise. Write [unclear] for any '
          'text you cannot read. Output only the transcription.')


def looks_like_pdf(url, error=''):
    path = urllib.parse.urlsplit(str(url)).path.lower()
    return path.endswith('.pdf') or '422' in str(error) or 'unprocessable' in str(error).lower()


def _fetch(url):
    from cover_photos import GUARD, USER_AGENT
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({'https': GUARD, 'http': GUARD}))
    request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept': 'application/pdf'})
    with opener.open(request, timeout=60) as response:
        data = response.read(MAX_PDF_BYTES + 1)
    if len(data) > MAX_PDF_BYTES:
        raise ValueError('PDF larger than 20 MB')
    if not data.startswith(b'%PDF'):
        raise ValueError('not a PDF')
    return data


def _page_jpegs(reader):
    from PIL import Image
    for page in list(reader.pages)[:MAX_PAGES]:
        images = sorted(page.images, key=lambda im: im.image.width * im.image.height if im.image else 0, reverse=True)
        if not images or images[0].image is None:
            continue
        picture = images[0].image.convert('RGB')
        if max(picture.size) > MAX_SIDE:
            picture.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        buffer = io.BytesIO()
        picture.save(buffer, 'JPEG', quality=88)
        yield buffer.getvalue()


def ledger_vision():
    """One usage-ledger row (kind 'vision') per vision call. PDF pages and image menus (image_capture.py) share
    this, so every transcription is counted; a failed write refuses the call rather than spending unrecorded."""
    import workflow
    workflow.reserve(workflow.read(workflow.ROOT / 'policy.json', {}), 'vision')


def _transcribe(jpeg, name, prompt=PROMPT):
    from tools.vision_tools import vision_analyze_tool
    ledger_vision()
    folder = ROOT / 'state/pdf-pages'
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / (name + '.jpg')
    path.write_bytes(jpeg)
    try:
        result = json.loads(asyncio.run(vision_analyze_tool(str(path), prompt)))
    finally:
        path.unlink(missing_ok=True)
    if not result.get('success') or not str(result.get('analysis', '')).strip():
        raise ValueError('vision transcription failed: ' + str(result.get('error') or result.get('analysis'))[:120])
    return str(result['analysis']).strip()


def _read(data, digest):
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(data))
    pages = len(reader.pages)
    text = '\n\n'.join((page.extract_text() or '').strip() for page in list(reader.pages)[:MAX_PAGES]).strip()
    if len(text) >= MIN_TEXT:
        return {'text': text, 'method': 'pdf-text', 'pages': pages}
    parts = [_transcribe(jpeg, digest + '-' + str(index)) for index, jpeg in enumerate(_page_jpegs(reader))]
    if not parts:
        raise ValueError('PDF has neither text nor page images')
    return {'text': TRANSCRIBED + '\n\n' + '\n\n'.join(parts), 'method': 'vision-transcription', 'pages': pages}


def capture(url):
    """A Firecrawl-shaped extract row for a PDF, or None when the URL is not a readable PDF."""
    try:
        data = _fetch(url)
    except Exception:
        return None
    digest = hashlib.sha256(data).hexdigest()
    cache = ROOT / 'state/pdf-text' / (digest + '.json')
    if cache.is_file():
        stored = json.loads(cache.read_text(encoding='utf-8'))
    else:
        try:
            stored = _read(data, digest)
        except Exception as exc:
            return {'url': url, 'error': 'PDF could not be read: ' + str(exc)[:160]}
        cache.parent.mkdir(parents=True, exist_ok=True)
        temp = cache.with_suffix('.tmp')
        temp.write_text(json.dumps(stored, ensure_ascii=False), encoding='utf-8')
        temp.replace(cache)
    name = urllib.parse.unquote(urllib.parse.urlsplit(url).path.rsplit('/', 1)[-1])
    return {'url': url, 'title': name, 'content': stored['text'], 'raw_content': stored['text'],
            'metadata': {'qtPdf': stored['method'], 'pages': stored['pages'], 'pdfSha256': digest}}
