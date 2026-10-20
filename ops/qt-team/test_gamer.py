import json
import pathlib
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / 'gamer'))

from PIL import Image, ImageDraw  # noqa: E402

import gamer  # noqa: E402
import process_lite  # noqa: E402

STYLE = json.loads((HERE / 'gamer' / 'style.json').read_text(encoding='utf-8'))


def synthetic(path):
    """A cream jug with a handle loop on flat magenta: the loop's inside is an enclosed pocket."""
    img = Image.new('RGB', (400, 400), (255, 0, 255))
    d = ImageDraw.Draw(img)
    d.ellipse((90, 120, 270, 320), fill=(236, 214, 170))
    d.ellipse((230, 160, 330, 260), outline=(236, 214, 170), width=18)
    img.save(path)


class ProcessLite(unittest.TestCase):
    def test_cut_out_removes_border_and_enclosed_background(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw = pathlib.Path(tmp) / 'raw.png'
            synthetic(raw)
            report, sprite = process_lite.process(raw, {'chroma': 'magenta', 'kind': 'prop'}, STYLE)
            self.assertTrue(report['ok'], report)
            self.assertEqual(report['spill'], 0)
            full = process_lite.key_out(Image.open(raw).convert('RGB'), (255, 0, 255))
            self.assertEqual(full.getpixel((5, 5))[3], 0)        # border background
            self.assertEqual(full.getpixel((280, 210))[3], 0)    # inside the handle loop
            self.assertEqual(full.getpixel((180, 220))[3], 255)  # the jug body

    def test_scene_passes_through(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw = pathlib.Path(tmp) / 'raw.png'
            Image.new('RGB', (300, 200), (200, 180, 150)).save(raw)
            report, image = process_lite.process(raw, {'chroma': None, 'kind': 'scene'}, STYLE)
            self.assertTrue(report['ok'] and report['scene'])
            self.assertEqual(image.size, (300, 200))


class OwnerDecision(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        (self.root / 'gamer').mkdir()
        (self.root / 'gamer' / 'assets.json').write_text(json.dumps({'assets': [
            {'id': 'ginger', 'kind': 'ingredient', 'subject': 'ginger', 'status': 'todo'},
            {'id': 'garlic', 'kind': 'ingredient', 'subject': 'garlic', 'status': 'todo'}]}))
        self.hash = 'a' * 64
        folder = self.root / 'images' / self.hash
        folder.mkdir(parents=True)
        Image.new('RGBA', (20, 20), (200, 150, 90, 255)).save(folder / 'sprite.webp', 'WEBP')
        Image.new('RGB', (20, 20), (246, 234, 217)).save(folder / 'candidate.jpg', 'JPEG')
        import hashlib
        meta = {'assetId': 'ginger', 'variant': 1, 'assetKind': 'ingredient', 'subject': 'ginger', 'prompt': 'p', 'provider': 'openai-codex',
                'model': 'gpt-image-2-high', 'tier': 'gpt-image-2-high', 'styleReferenceSha256': 'b' * 64, 'rawSha256': 'c' * 64,
                'spriteSha256': hashlib.sha256((folder / 'sprite.webp').read_bytes()).hexdigest(), 'requestHash': self.hash}
        (folder / 'result.json').write_text(json.dumps(meta))
        gamer.save(self.root, {'assets': {'ginger': {'status': 'awaiting-owner', 'chosen': self.hash, 'managerReason': 'Clean.'}}})

    def tearDown(self):
        self.tmp.cleanup()

    def test_todo_skips_assets_with_state(self):
        self.assertEqual([a['id'] for a in gamer.todo(self.root)], ['garlic'])

    def test_approve_copies_sprite_once(self):
        self.assertEqual(gamer.decide(self.root, 'ginger', self.hash, True, 'tok'), 'approved')
        self.assertTrue((self.root / 'gamer' / 'approved' / 'ginger.webp').is_file())
        provenance = json.loads((self.root / 'gamer' / 'approved' / 'ginger.json').read_text())
        self.assertEqual(provenance['ownerActionId'], 'owner-game-tok')
        self.assertEqual(gamer.decide(self.root, 'ginger', self.hash, True, 'tok'), 'stale')

    def test_reject_and_wrong_hash(self):
        self.assertEqual(gamer.decide(self.root, 'ginger', 'f' * 64, True, 'tok'), 'stale')
        self.assertEqual(gamer.decide(self.root, 'ginger', self.hash, False, 'tok'), 'rejected')
        self.assertFalse((self.root / 'gamer' / 'approved' / 'ginger.webp').exists())

    def test_telegram_card_sent_once(self):
        import telegram_controls
        import telegram_reporter as t
        old = t.ROOT, t.STATE
        t.ROOT, t.STATE = self.root, self.root / 'state' / 'telegram'
        try:
            state = {'deliveries': {}}
            telegram_controls.gamer_requests(state)
            telegram_controls.gamer_requests(state)
            self.assertEqual(list(state['deliveries']), ['game:' + self.hash])
            buttons = state['deliveries']['game:' + self.hash]['buttons'][0]
            self.assertTrue(buttons[0]['callback_data'].startswith('game-ok:'))
            token = buttons[0]['callback_data'].split(':')[1]
            self.assertEqual(state['moderation'][token]['mode'], 'game')
        finally:
            t.ROOT, t.STATE = old


if __name__ == '__main__':
    unittest.main()
