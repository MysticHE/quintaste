"""SFA food alerts for Mint (QT Safety): the feed, each notice page's product details, and a batch check for a sealed pack.

Pages are read from SFA's own site only. Product details come from "Label: value" lines (one product per group, as SFA lays
out most notices) and from tables whose first row names the columns. A notice whose details sit only in a picture keeps its
text and says so. Dates are read day first, as SFA writes them.
"""
from __future__ import annotations

import datetime as dt
from html.parser import HTMLParser
import re
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

FEED = 'https://www.sfa.gov.sg/rss/annual-listing-food-alerts'
SITE = 'https://www.sfa.gov.sg/'
SGT = ZoneInfo('Asia/Singapore')
FEED_BYTES, PAGE_BYTES = 2_000_000, 1_500_000
TEXT_CHARS = 1500           # notice text kept for the model, after the product details
MAX_PRODUCTS, VALUE_CHARS = 20, 120

# What SFA calls each detail, as written on its pages (lower case, without punctuation).
LABELS = {
    'product': ('product', 'products', 'product name', 'product names', 'name of product', 'product description'),
    'brand': ('brand', 'brands', 'brand name'),
    'size': ('pack size', 'packing size', 'packaging size', 'package size', 'net weight', 'net wt', 'net content', 'net contents',
             'size', 'weight', 'volume', 'packing'),
    'batch': ('lot', 'lots', 'lot no', 'lot number', 'lot numbers', 'lot code', 'batch', 'batches', 'batch no', 'batch number',
              'batch numbers', 'batch code', 'batch/lot', 'lot/batch', 'batch/lot number', 'lot/batch number', 'production code'),
    'expiry': ('best before', 'best before date', 'best before dates', 'best before end', 'bbe', 'best by', 'expiry', 'expiry date',
               'expiry dates', 'expiration date', 'exp date', 'use by', 'use by date', 'date of expiry', 'date of minimum durability'),
    'origin': ('origin', 'country of origin'),
}
FIELD = {name: key for key, names in LABELS.items() for name in names}
LABEL_LINE = re.compile(r'^([A-Za-z][A-Za-z ./()#-]{0,40}?)\s*:\s*(.*)$')
BREAKS = {'br', 'p', 'div', 'li', 'tr', 'table', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol'}
MONTHS = {m: i for i, m in enumerate(('jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'), 1)}
MONTH = r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?'


def notices(raw: bytes) -> list:
    """The feed's items: id (guid), title, notice url and time (SGT). Only links to SFA's own site are kept; letters such as é in
    a link are percent-encoded, so the page can be read and admin accepts the link."""
    import xml.etree.ElementTree as ET
    out = []
    for item in ET.fromstring(raw.decode('utf-8-sig')).iter('item'):
        title = ' '.join((item.findtext('title') or '').split())
        link = urllib.parse.quote((item.findtext('link') or '').strip(), safe=':/?#=&%-._~')
        guid = (item.findtext('guid') or link).strip()
        try:
            at = dt.datetime.strptime((item.findtext('pubDate') or '').strip(), '%d %b %Y %I:%M %p').replace(tzinfo=SGT)
        except ValueError:
            at = None
        if title and guid and link.startswith(SITE):
            out.append({'id': guid[:80], 'title': title[:300], 'url': link[:400], 'at': at})
    return out


class _SameSite(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not newurl.startswith(SITE):
            raise ValueError('SFA redirected off its own site')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(url: str) -> bytes:
    """The feed or one notice page, from SFA's own site only, with a size cap."""
    if not url.startswith(SITE):
        raise ValueError('Not an SFA page')
    limit = FEED_BYTES if url == FEED else PAGE_BYTES
    request = urllib.request.Request(url, headers={'User-Agent': 'QuinTaste QT Safety'})
    with urllib.request.build_opener(_SameSite).open(request, timeout=20) as response:
        if not response.geturl().startswith(SITE):
            raise ValueError('SFA redirected off its own site')
        raw = response.read(limit + 1)
    if len(raw) > limit:
        raise ValueError('Oversized SFA page')
    return raw


class _Body(HTMLParser):
    """Plain text with line breaks where the page breaks lines, the table rows as lists of cells, and how many pictures."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.rows, self.row, self.cell, self.images, self.skip = [], [], None, None, 0, 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1
        elif tag == 'img':
            self.images += 1
        elif tag == 'tr':
            self.row = []
        elif tag in ('td', 'th'):
            self.cell = []
        if tag in BREAKS:
            self.parts.append('\n')

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip = max(0, self.skip - 1)
        elif tag in ('td', 'th') and self.cell is not None:
            if self.row is not None:
                self.row.append(' '.join(''.join(self.cell).split()))
            self.cell = None
        elif tag == 'tr' and self.row is not None:
            self.rows.append(self.row)
            self.row = None
        if tag in BREAKS or tag in ('td', 'th'):
            self.parts.append('\n')

    def handle_data(self, data):
        if self.skip:
            return
        data = re.sub(r'\s+', ' ', data)
        self.parts.append(data)
        if self.cell is not None:
            self.cell.append(data)


def _label(text: str) -> str | None:
    name = ' '.join(re.sub(r'[^a-z/ ]', ' ', text.lower().replace('(s)', '').replace('-', ' ')).split())
    return FIELD.get(name)


def _from_lines(lines: list) -> list:
    """Groups of "Label: value" lines; a value may sit on the next line. A new group starts at a product name or a repeated label."""
    products, current, waiting = [], {}, None
    for line in lines:
        match = LABEL_LINE.match(line)
        key = _label(match.group(1)) if match else None
        if match and key is None and waiting != 'product':
            waiting = None  # another label ("Importer: …"), so the detail waiting for a value has none; product names may hold a colon
            continue
        if key is None:
            if waiting and line:
                current[waiting], waiting = line[:VALUE_CHARS], None
            continue
        if current and (key == 'product' or key in current):
            products.append(current)
            current = {}
        value = match.group(2).strip()
        if value:
            current[key], waiting = value[:VALUE_CHARS], None
        else:
            waiting = key
    if current:
        products.append(current)
    return products


def _from_tables(rows: list) -> list:
    """Rows under a header row that names at least two different details (other columns, such as S/N, are left out), or
    two-cell rows of a detail and its value."""
    products, header, pairs = [], None, []
    for row in rows:
        keys = [_label(cell.rstrip(': ')) for cell in row]
        named = [k for k in keys if k]
        if len(named) >= 2 and len(set(named)) == len(named):
            header = keys
            continue
        if header and len(row) == len(header):
            product = {k: v[:VALUE_CHARS] for k, v in zip(header, row) if k and v}
            if product:
                products.append(product)
            continue
        header = None
        if len(row) == 2 and keys[0] and row[1]:
            pairs.append(row[0].rstrip(': ') + ': ' + row[1])
    return products or _from_lines(pairs)


def details(raw: bytes) -> dict:
    """The notice's product details (product, brand, size, batch, expiry, origin), its text and whether details are in a picture.
    ValueError when the page has no notice body."""
    page = raw.decode('utf-8', 'replace')
    start = page.find('data-placeholder-label="Content"')
    end = page.find('<!--Content-->', start) if start >= 0 else -1
    if start < 0 or end < 0:
        start, end = page.find('<main'), page.find('</main>')
    if start < 0 or end <= start:
        raise ValueError('No notice body on the page')
    body = _Body()
    body.feed(page[start:end] if page[start] == '<' else page[page.find('>', start) + 1:end])
    text = ''.join(body.parts).split('Issued by the Singapore Food Agency')[0]
    lines = [' '.join(line.split()) for line in text.splitlines()]
    products = [p for p in (_from_tables(body.rows) or _from_lines(lines)) if set(p) - {'origin'}][:MAX_PRODUCTS]
    out = {'products': products, 'text': re.sub(r'\n{2,}', '\n', '\n'.join(lines)).strip()[:TEXT_CHARS]}
    if not products and body.images:
        out['detailsInImage'] = True
    return out


def dates(value: str) -> list:
    """Dates in a detail, day first: 'YYYY-MM-DD', or 'YYYY-MM' when only the month is given."""
    found, text = set(), value.lower()

    def add(year, month, day=None):
        year = int(year) + (2000 if len(str(year)) == 2 else 0)
        try:
            found.add(dt.date(year, int(month), int(day)).isoformat() if day else dt.date(year, int(month), 1).isoformat()[:7])
        except ValueError:
            pass

    def take(pattern, use):
        nonlocal text
        for m in re.finditer(pattern, text):
            use(m)
        text = re.sub(pattern, ' ', text)

    take(r'\b(\d{4})-(\d{1,2})-(\d{1,2})\b', lambda m: add(m[1], m[2], m[3]))
    take(r'\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b', lambda m: add(m[3], m[2], m[1]))
    take(r'\b(\d{1,2})(?:st|nd|rd|th)?\s+' + MONTH + r',?\s+(\d{4}|\d{2})\b', lambda m: add(m[3], MONTHS[m[2]], m[1]))
    take(r'\b' + MONTH + r'\s+(\d{1,2}),?\s+(\d{4})\b', lambda m: add(m[3], MONTHS[m[1]], m[2]))
    take(r'\b' + MONTH + r'\s+(\d{4})\b', lambda m: add(m[2], MONTHS[m[1]]))
    take(r'\b(\d{1,2})[./-](\d{4})\b', lambda m: add(m[2], m[1]))
    return sorted(found)


def _code(value: str) -> str:
    return re.sub(r'[^A-Z0-9]', '', value.upper())


def batch_check(item: dict, products: list) -> str:
    """Whether a sealed pack is the batch the notice names: 'match' (its lot or date mark is in the notice, or the notice covers
    every batch), 'differs' (every product in the notice gives a lot or date and none is the pack's) or 'unknown'."""
    lot, mark = _code(str(item.get('lot') or '')), str(item.get('date_mark') or '')[:10]
    if not products:
        return 'unknown'
    open_product = False
    for product in products:
        checks = []
        for key in ('batch', 'expiry'):
            if re.search(r'\ball\b', product.get(key, ''), re.I):
                return 'match'
        if product.get('batch') and lot:
            codes = [_code(c) for c in re.split(r'[,;&]|\band\b', product['batch'], flags=re.I)]
            checks.append(any(c and (c == lot or (min(len(c), len(lot)) >= 5 and (c in lot or lot in c))) for c in codes))
        found = dates(product.get('expiry', ''))
        if found and mark:
            checks.append(any(mark == d or mark[:7] == d for d in found))
        if any(checks):
            return 'match'
        open_product = open_product or not checks
    return 'unknown' if open_product else 'differs'


def summary(page: dict) -> str:
    """One line for the staff case: each product with its size, lot and date, as the notice gives them."""
    parts = []
    for p in page.get('products', [])[:6]:
        bits = [p.get('brand', ''), p.get('product', '')]
        bits += [p.get('size', ''), 'lot ' + p['batch'] if p.get('batch') else '', 'date mark ' + p['expiry'] if p.get('expiry') else '']
        parts.append(' · '.join(b for b in bits if b))
    return '; '.join(parts)[:600]
