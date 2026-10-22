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
          'the shape and size of the pieces, how cooked or browned it is, what it sits in or on (pan, pot, plate, bowl) '
          'and any garnish. Say what stage the food is at (for example raw batter, frying in oil, plated). Do not mention '
          'people, hands, text, logos, watermarks, brands, the photographer or the website. Output only the description.')
MAX_STEP_PHOTOS = 8
MAX_WORDS = 90
MATCH = 0.3  # share of a step's words that must appear in the creator's step for its photo to apply
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


def match(instruction, steps):
    """The creator's step photo that shows this step: the step sharing most of its words, else None."""
    mine = words(instruction)
    best, score = None, 0.0
    for text, photo in steps:
        if photo and mine:
            share = len(mine & words(text)) / len(mine)
            if share > score:
                best, score = photo, share
    return best if score >= MATCH else None


def describe(root, url, clock=time.time):
    """The vision model's description of one photo, cached by URL; None when it cannot be read."""
    cache = root / 'state/recipe-looks' / (hashlib.sha256(url.encode()).hexdigest() + '.json')
    try:
        stored = json.loads(cache.read_text(encoding='utf-8'))
        if stored.get('text'):
            return stored['text']
    except (OSError, ValueError):
        pass
    try:
        got = image_capture._fetch(url, image_capture.IMAGE_ACCEPT, image_capture.MAX_IMAGE_BYTES, clock)
        if got['type'] not in image_capture.IMAGE_TYPES and got['type'] not in image_capture.OCTET_TYPES:
            return None
        jpeg, _, _ = image_capture._prepare(got['body'])
        raw = pdf_capture._transcribe(jpeg, 'look-' + hashlib.sha256(got['body']).hexdigest(), PROMPT)
    except Exception:
        return None  # an unreadable photo, robots.txt, a spent budget: the drawing uses the recipe text alone
    text, _ = image_capture.sanitize(raw)
    text = ' '.join(text.replace(image_capture.REMOVED, ' ').split()[:MAX_WORDS])
    if not text or text == image_capture.NO_TEXT:
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
    for number, step in enumerate(recipe.get('steps') or [], 1):
        photo = match(step.get('instruction', ''), creator)
        if not photo or (photo not in seen and len(seen) >= MAX_STEP_PHOTOS):
            continue
        if photo not in seen:
            seen[photo] = read(root, photo)
        if seen[photo]:
            found['steps'][number] = seen[photo]
    return found
