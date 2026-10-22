"""How the creator's own photos look, in words (owner, 22 Oct 2026). Before QuinTaste draws a recipe's cover and step
photos, the vision model looks at the photos the recipe page itself publishes (its schema.org Recipe image, and a
HowToStep image where the creator tagged one) and describes only the food: colours, textures, shapes, doneness and
what it sits in. That description steers the drawing, so it looks like the real dish; every picture is still drawn
fresh, and the creator's photo is never copied, edited, stored or sent to the image model.

Bounds: the same guarded fetch as image menus (public https, robots.txt, one fetch per host at a time, 8 MB), one
'vision' ledger row per photo read, at most one dish photo and MAX_STEP_PHOTOS step photos per recipe, and each
description cached by photo URL. Descriptions are untrusted page content: lines addressed to an AI are removed and
they only ever reach the image prompt. Every failure is non-fatal; the drawing then uses the recipe text alone.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import time

import image_capture
import pdf_capture

PROMPT = ('Describe only how the food in this photo looks, in at most 70 words of plain English: its colours, textures, '
          'the shape and size of the pieces, how cooked or browned it is and what it sits in or on (pan, pot, plate, bowl)'
          '. Describe the main food only: leave out garnishes, wedges, herb sprigs, side dishes, dips and props. Say what '
          'stage the food is at (for example raw batter, frying in oil, plated). Do not mention '
          'people, hands, text, logos, watermarks, brands, the photographer or the website. Output only the description.')
VERSION = 2  # in the cache key: v1 descriptions named garnishes (22 Oct 2026: a lime wedge on the chipotle rice cover)
MAX_STEP_PHOTOS = 8
MAX_WORDS = 90
MATCH = 0.3  # share of a step's words that must appear in the creator's step for its photo to apply
SHARED = 2   # and at least this many words in common, so "Serve warm." never borrows another step's photo
RETRY_SECONDS = 86400  # a photo that could not be read is tried again after a day, not every round
WORD = re.compile(r'[a-z]{3,}')
COMMON = frozenset('the and add with into until then for from over about each all your are its this that them they '
                   'out off use using well minutes minute large small medium little more some together'.split())


def urls(value):
    """The URLs of a schema.org image value: a string, an ImageObject, or a list of either (first is the main one)."""
    items = value if isinstance(value, list) else [value]
    found = []
    for item in items:
        url = item.get('url') or item.get('contentUrl') if isinstance(item, dict) else item
        if isinstance(url, str) and url.startswith('https://') and url not in found:
            found.append(url)
    return found


def source_steps(instructions):
    """(text, photo url or None) for each HowToStep, sections flattened, in the page's order."""
    out = []
    for item in instructions if isinstance(instructions, list) else [instructions]:
        if isinstance(item, dict) and item.get('@type') == 'HowToSection':
            out += source_steps(item.get('itemListElement') or [])
        elif isinstance(item, dict):
            photo = urls(item.get('image'))
            out.append((str(item.get('text') or item.get('name') or ''), photo[0] if photo else None))
    return out


def words(text):
    return {w for w in WORD.findall(str(text).lower()) if w not in COMMON}


def match(instruction, steps, position=None):
    """The creator's step photo that shows this step: the step sharing most of its words (at least MATCH of them and
    SHARED in all), ties going to the creator step at the same point of the method (position 0-1), else None."""
    mine = words(instruction)
    best, rank = None, None
    for index, (text, photo) in enumerate(steps):
        shared = len(mine & words(text))
        if not photo or not mine or shared < SHARED or shared / len(mine) < MATCH:
            continue
        distance = abs(position - index / max(1, len(steps) - 1)) if position is not None else 0
        if rank is None or (shared / len(mine), -distance) > rank:
            best, rank = photo, (shared / len(mine), -distance)
    return best


def describe(root, url, clock=time.time):
    """The vision model's description of one photo, cached by URL; None when it cannot be read."""
    cache = root / 'state/recipe-looks' / (hashlib.sha256(f'v{VERSION} {url}'.encode()).hexdigest() + '.json')
    try:
        stored = json.loads(cache.read_text(encoding='utf-8'))
        if stored.get('text'):
            return stored['text']
        if stored.get('failed') and clock() - stored.get('at', 0) < RETRY_SECONDS:
            return None
    except (OSError, ValueError, TypeError):
        pass
    def failed(reason):
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps({'url': url, 'failed': reason[:160], 'at': clock()}), encoding='utf-8')
    try:
        got = image_capture._fetch(url, image_capture.IMAGE_ACCEPT, image_capture.MAX_IMAGE_BYTES, clock)
        if got['type'] not in image_capture.IMAGE_TYPES and got['type'] not in image_capture.OCTET_TYPES:
            failed('not an image')
            return None
        jpeg, _, _ = image_capture._prepare(got['body'])
        raw = pdf_capture._transcribe(jpeg, 'look-' + hashlib.sha256(got['body']).hexdigest(), PROMPT)
    except Exception as exc:  # an unreadable photo, robots.txt, a spent budget: the drawing uses the recipe text alone
        failed(type(exc).__name__ + ': ' + str(exc))
        return None
    text, _ = image_capture.sanitize(raw)
    text = ' '.join(text.replace(image_capture.REMOVED, ' ').split()[:MAX_WORDS])
    if not text or text == image_capture.NO_TEXT:
        failed('no description')
        return None
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps({'url': url, 'text': text, 'describedAt': dt.datetime.now(dt.timezone.utc).isoformat()}), encoding='utf-8')
    return text


def looks(root, source_url, recipe, read=describe):
    """{'dish': description or None, 'steps': {step number: description}} for a recipe from its source page's photos."""
    import recipe_quality
    try:
        page = recipe_quality.fetch(root, source_url).get('recipe') or {}
    except Exception:
        return {'dish': None, 'steps': {}}
    dish = urls(page.get('image'))
    found = {'dish': read(root, dish[0]) if dish else None, 'steps': {}}
    creator = source_steps(page.get('recipeInstructions') or [])
    seen = {}
    ours = recipe.get('steps') or []
    for number, step in enumerate(ours, 1):
        photo = match(step.get('instruction', ''), creator, (number - 1) / max(1, len(ours) - 1))
        if not photo or (photo not in seen and len(seen) >= MAX_STEP_PHOTOS):
            continue
        if photo not in seen:
            seen[photo] = read(root, photo)
        if seen[photo]:
            found['steps'][number] = seen[photo]
    return found
