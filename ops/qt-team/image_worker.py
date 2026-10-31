"""One controlled call to Hermes's existing image tool, never an SDK/key bypass."""
import hashlib
import json
import os
import pathlib
import sys

# Hermes owns provider authentication, model selection and image transport.
sys.path.insert(0, '/opt/hermes')
os.environ['HERMES_HOME'] = '/opt/data/profiles/qt-gamer'  # QT Gamer draws the pictures (owner, 30 Oct 2026); same image engine
from tools.image_generation_tool import _handle_image_generate
from PIL import Image

root = pathlib.Path('/opt/data/qt-team')
request_path = pathlib.Path(sys.argv[1]).resolve()
if not request_path.is_relative_to(root / 'images') or request_path.name != 'request.json':
    raise SystemExit('Invalid image request path')
request = json.loads(request_path.read_text())
arguments = {'prompt': request['prompt'], 'aspect_ratio': '4:3'}
reference = None
if request.get('kind') == 'venue-enhancement':
    registry_path = root / 'approved-references/registry.json'
    registry = json.loads(registry_path.read_text())
    reference = next((r for r in registry['entries'] if r['venueId'] == request.get('venueId') and r['sha256'] == request.get('referenceSha256')), None)
    if not reference or reference.get('status') != 'approved' or not reference.get('rightsApprovalId') or not reference.get('identityEvidence'):
        raise SystemExit('No approved exact-branch reference; retain existing cover/hold')
    source_file = root / 'approved-references' / (reference['sha256'] + '.jpg')
    if source_file.is_symlink() or not source_file.is_file() or source_file.stat().st_size > 2_000_000 or hashlib.sha256(source_file.read_bytes()).hexdigest() != reference['sha256']:
        raise SystemExit('Approved reference integrity failure')
    arguments['image_url'] = str(source_file)
elif request.get('kind') == 'ai-recipe-step' and request.get('reference'):
    # A member's AI recipe (recipe_drawing_bridge.py): the video frame QT Gamer recreates as a clean photo (owner, 31 Oct 2026).
    frame = (request_path.parent / request['reference']).resolve()
    if frame.parent != request_path.parent or frame.is_symlink() or not frame.is_file() or frame.stat().st_size > 2_000_000:
        raise SystemExit('Invalid reference frame')
    with Image.open(frame) as check:
        check.verify()
    arguments['image_url'] = str(frame)
result = _handle_image_generate(arguments)
if isinstance(result, str):
    result = json.loads(result)
if not result.get('success'):
    (request_path.parent / 'failure.json').write_text(json.dumps({'status': 'failed', 'errorType': result.get('error_type'), 'error': str(result.get('error', ''))[:400]}))
    raise SystemExit('Hermes image provider returned failure; no automatic retry')
source = pathlib.Path(result['image']).resolve()
allowed = pathlib.Path('/opt/data/profiles/qt-gamer/cache').resolve()
if not source.is_relative_to(allowed) or not source.is_file() or source.stat().st_size > 25 * 1024 * 1024:
    raise SystemExit('Image result is outside the profile cache or too large')
original_hash = hashlib.sha256(source.read_bytes()).hexdigest()
with Image.open(source) as image:
    if image.format not in ('PNG', 'JPEG', 'WEBP'):
        raise SystemExit('Unexpected image format')
    image.load()
    image = image.convert('RGB')
    step = request.get('step')  # a recipe step photo (owner, 22 Oct 2026): smaller, so a cover and 8 steps fit one publication
    output = request_path.parent / 'candidate.jpg'
    if request.get('kind') == 'ai-recipe-step':
        # One mobile size for every AI-recipe step picture (owner, 31 Oct 2026): 4:3, 1200 x 900, centre-cropped.
        width, height = image.size
        if width * 3 > height * 4:
            cut = (width - height * 4 // 3) // 2
            image = image.crop((cut, 0, cut + height * 4 // 3, height))
        else:
            cut = (height - width * 3 // 4) // 2
            image = image.crop((0, cut, width, cut + width * 3 // 4))
        image = image.resize((1200, 900), Image.LANCZOS)
        for quality in (86, 80, 72):
            image.save(output, format='JPEG', quality=quality, optimize=True)
            if output.stat().st_size <= 450 * 1024:
                break
    else:
        image.thumbnail((640, 640) if step else (960, 960))
        image.save(output, format='JPEG', quality=80 if step else 86, optimize=True)
    dimensions = image.size
if output.stat().st_size > 512 * 1024:
    raise SystemExit('Image exceeds application asset limit')
metadata = {'status': 'generated-awaiting-visual-review', 'recipeId': request.get('recipeId'), 'venueId': request.get('venueId'),
            'provider': result.get('provider'), 'model': result.get('model'),
            'prompt': request['prompt'], 'placeId': request.get('placeId'),
            'sourceKind': 'approved-reference-enhancement' if reference else 'place-dish-illustration' if request.get('kind') == 'place-illustration'
            else 'ai-recipe-step-from-video-frame' if request.get('kind') == 'ai-recipe-step' and request.get('reference')
            else 'original-generated-recipe-step-illustration' if step else 'original-generated-recipe-illustration',
            'step': step, 'stepKey': request.get('stepKey'),
            'recipeSources': request.get('sources', []), 'originalSha256': original_hash,
            'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'bytes': output.stat().st_size,
            'width': dimensions[0], 'height': dimensions[1], 'publication': 'not-published',
            'requestHash': request['requestHash']}
if reference:
    metadata.update(referenceSha256=reference['sha256'], rightsApprovalId=reference['rightsApprovalId'], reference=reference)
(request_path.parent / 'result.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2))
print(json.dumps({k: metadata[k] for k in ('status', 'recipeId', 'provider', 'model', 'bytes', 'width', 'height', 'sha256')}))
