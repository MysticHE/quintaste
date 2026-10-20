"""QT Gamer sprite cut-out and checks using Pillow only (the bot container has no NumPy or OpenCV).

process(raw_path, meta, style) -> (report, sprite_rgba | None)
- Removes the flat chroma background where it connects to the border, plus enclosed pockets of
  near-pure chroma (inside a jug handle, between leaves); the prompt keeps that colour off the subject.
- Unmixes soft edges from the background colour, trims, resizes and checks the result.
preview(sprite, path) writes a cream-backed JPEG for QT Manager and the owner.
"""
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageMath, ImageStat

T_IN, T_OUT, T_POCKET = 40, 100, 45
CREAM = (246, 234, 217)


def _hex(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _math(expr, **images):
    return ImageMath.lambda_eval(expr, **images)  # Pillow 10.3+; container has 12.3


def _border(img, width=6):
    w, h = img.size
    strips = [img.crop((0, 0, w, width)), img.crop((0, h - width, w, h)), img.crop((0, 0, width, h)), img.crop((w - width, 0, w, h))]
    pixels = [p for s in strips for p in (s.get_flattened_data() if hasattr(s, 'get_flattened_data') else s.getdata())]
    median = tuple(sorted(p[c] for p in pixels)[len(pixels) // 2] for c in range(3))
    std = sum(sum(ImageStat.Stat(s).stddev) / 3 for s in strips) / 4
    return median, std


def _count(mask):
    return mask.histogram()[255]


def key_out(img, bg):
    """RGBA cut-out of an RGB image on a flat colour bg (3-tuple)."""
    w, h = img.size
    solid = Image.new('RGB', img.size, bg)
    r, g, b = ImageChops.difference(img, solid).split()
    dist = ImageChops.lighter(ImageChops.lighter(r, g), b)  # max channel difference, 0-255
    # Border-connected background at quarter resolution (Pillow's flood fill is pure Python).
    small = dist.resize((max(1, w // 4), max(1, h // 4)), Image.BOX)
    cand = small.point(lambda v: 255 if v < T_OUT else 0)
    sw, sh = cand.size
    px = cand.load()
    for x, y in [(x, 0) for x in range(sw)] + [(x, sh - 1) for x in range(sw)] + [(0, y) for y in range(sh)] + [(sw - 1, y) for y in range(sh)]:
        if px[x, y] == 255:
            ImageDraw.floodfill(cand, (x, y), 128)
    region = cand.point(lambda v: 255 if v == 128 else 0)
    pockets = small.point(lambda v: 255 if v < T_POCKET else 0)
    region = ImageChops.lighter(region, pockets)
    region = region.resize((w, h), Image.NEAREST).filter(ImageFilter.MaxFilter(9))
    ramp = dist.point(lambda v: 0 if v <= T_IN else 255 if v >= T_OUT else int((v - T_IN) * 255 / (T_OUT - T_IN)))
    alpha = Image.composite(ramp, Image.new('L', img.size, 255), region)
    alpha = ImageChops.multiply(alpha, alpha.filter(ImageFilter.MinFilter(3)).point(lambda v: min(255, v + 90)))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))
    # Unmix the background colour from soft edges: c = (observed - (1 - a) * bg) / a.
    channels = []
    for ch, bc in zip(img.split(), bg):
        f = _math(lambda a: (a['c'] * 255 - (255 - a['al']) * bc) / a['max'](a['al'], 1), c=ch.convert('F'), al=alpha.convert('F'))
        channels.append(f.convert('L'))  # F -> L clamps to 0-255
    unmixed = Image.merge('RGB', channels)
    soft = alpha.point(lambda v: 255 if v < 250 else 0)
    rgb = Image.composite(unmixed, img, soft)
    out = rgb.convert('RGBA')
    out.putalpha(alpha)
    return out


def spill_ratio(sprite, bg):
    hsv = sprite.convert('RGB').convert('HSV')
    bh = Image.new('RGB', (1, 1), bg).convert('HSV').getpixel((0, 0))[0]
    hue, sat, val = hsv.split()
    near_hue = hue.point(lambda v: 255 if min(abs(v - bh), 256 - abs(v - bh)) < 12 else 0)
    vivid = ImageChops.multiply(sat.point(lambda v: 255 if v > 170 else 0), val.point(lambda v: 255 if v > 170 else 0))
    opaque = sprite.getchannel('A').point(lambda v: 255 if v > 230 else 0)
    spill = ImageChops.multiply(ImageChops.multiply(near_hue, vivid), opaque)
    total = _count(opaque)
    return _count(spill) / total if total else 1.0


def process(raw_path, meta, style):
    img = Image.open(raw_path).convert('RGB')
    w, h = img.size
    if meta.get('chroma') is None:
        img.thumbnail((style['output'].get('sceneMaxSide', 1400),) * 2, Image.LANCZOS)
        return {'ok': True, 'issues': [], 'scene': True, 'size': list(img.size)}, img.convert('RGBA')
    chroma = _hex(style['chroma'][meta['chroma']])
    checks = style['checks']
    bg, std = _border(img)
    issues = []
    if std > checks['borderStdMax']:
        issues.append('background not flat (std %.1f)' % std)
    if sum((a - b) ** 2 for a, b in zip(bg, chroma)) ** 0.5 > 90:
        issues.append('background colour differs from requested chroma')
    sprite = key_out(img, bg)
    alpha = sprite.getchannel('A')
    box = alpha.point(lambda v: 255 if v > 25 else 0).getbbox()
    if not box:
        return {'ok': False, 'issues': ['nothing left after cut-out']}, None
    x0, y0, x1, y1 = box
    m = checks['edgeMarginMinPx']
    touches = [n for n, c in (('top', y0 < m), ('bottom', y1 > h - m), ('left', x0 < m), ('right', x1 > w - m)) if c]
    if touches and meta['kind'] != 'character':
        issues.append('subject touches the ' + '/'.join(touches) + ' edge')
    if meta['kind'] == 'character' and 'top' in touches:
        issues.append('hair touches the top edge')
    coverage = _count(alpha.point(lambda v: 255 if v > 128 else 0)) / float(w * h)
    if not checks['coverageMin'] <= coverage <= checks['coverageMax']:
        issues.append('subject size off (%d%% of frame)' % round(coverage * 100))
    sprite = sprite.crop(box)
    spill = spill_ratio(sprite, chroma)
    if spill > checks['spillMaxRatio']:
        issues.append('background colour on the subject (%.1f%%)' % (spill * 100))
    sprite.thumbnail((style['output']['maxSide'],) * 2, Image.LANCZOS)
    return {'ok': not issues, 'issues': issues, 'coverage': round(coverage, 3), 'borderStd': round(std, 1),
            'spill': round(spill, 4), 'size': list(sprite.size)}, sprite


def preview(sprite, path, side=768):
    canvas = Image.new('RGB', (side, side), CREAM)
    s = sprite.copy()
    s.thumbnail((int(side * 0.86),) * 2, Image.LANCZOS)
    canvas.paste(s, ((side - s.width) // 2, (side - s.height) // 2), s if s.mode == 'RGBA' else None)
    canvas.save(path, 'JPEG', quality=88, optimize=True)
