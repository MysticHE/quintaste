# QT Gamer: game art pipeline

Generates Rush Hour sprites in one consistent style through Hermes's own ChatGPT image provider (`openai-codex`, gpt-image-2): the same subscription and route as the other QT bots, with no API key.

Status: built and tested locally only. Not deployed to the VPS.

## Files

- `style.json`: the style guide. Base style, one prompt template per kind (ingredient, packaged, dish, character, prop), chroma backgrounds, negatives, output size and quality checks.
- `assets.json`: the asset list. Adding an ingredient means adding one entry.
- `references/style-reference.webp`: the owner's concept art (18 October 2026). It is sent as a style reference with every request.
- `generate.py`: runs in Hermes's Python and writes `runs/<run>/<asset>/raw-<n>.png` plus `request-<n>.json` provenance (prompt, tier, the style board's hash, each extra reference with its hash, timing). Kind `photo` (merchandise mockups) always gets a full-frame real-photo prompt with no style board and no cut-out background, whatever its manifest entry says.
- This folder is the source. A working copy elsewhere (for example `HA/companion-api/ops/qt-team/gamer`) gets `generate.py`, `process.py` and `style.json` copied from here before a run.
- `process.py`: runs in any Python with OpenCV and writes `sprite-<n>.webp`, `report.json` and `contact-sheet.png` for each run.
- `../roles/qt-gamer.md`: the role prompt for the future Hermes profile.

## Run locally (Windows)

1. Sign in once with `hermes auth add openai-codex` (device login).
2. Generate:

   ```
   "%LOCALAPPDATA%\hermes\tools\python-3.14.7+20260901-win32-x64\python.exe" -I generate.py --run test1 --only ginger,pasteA --variants 2
   ```

   `--dry-run` prints the prompts without generating. `--tier` is one of `gpt-image-2-low`, `gpt-image-2-medium` or `gpt-image-2-high` (the default).
3. Process with `python process.py --run test1`, then open `runs/test1/contact-sheet.png`.

## Home skins: the right screen size (from 19 October 2026)

Café home skins ship in two sizes (`style.json` → `homeSkin`):

- **Portrait room, 1024×1536 (2:3, `"aspect": "portrait"`, kind `diorama`).** Paint this first. It fixes the playable layout: the app's hotspots, counter, cook, companion and decor spots are placed in its coordinates, and phones show it edge to edge.
- **Wide room, 2304×1536 (3:2).** The same room continued to the left and right, with the portrait room pixel-exact in the middle. Tablets, desktops and landscape screens show it, so there are no empty side bars.

Make the wide room with `widen.py` and the `widen` kind:

```
python -I widen.py prep --skin runs/home/skin-sunny/raw-1.png --name sunny      # references/widen-sunny.png canvas
<Hermes Python> generate.py --run widen --manifest concepts-widen.json --variants 2
python -I widen.py composite --skin runs/home/skin-sunny/raw-1.png --run widen --id skin-sunny-wide
```

`composite` finds the room in the repaint, scales it to 2304×1536, matches the colour along both edges and cuts each seam where the repaint agrees with the original, so nothing is ghosted. `wide-report.json` records the match, colour shift and seam difference; check the doorways and shelves at the seams by eye too, because a repaint can repeat an object next to the seam. The app importer (`scripts/import-game-art.py`) takes the best passing variant unless one is pinned, and imports it 1280 px high.

A new skin needs both sizes before it ships; without a wide version the app falls back to a blurred copy of the room at the sides.

## How the background removal works

Each subject is generated on a flat chroma colour chosen not to appear in it: magenta by default, cyan for red subjects, green for grey or coral characters. Only background connected to the image border is removed, so matching colours inside the subject survive. Soft edges are unmixed from the background colour, so no coloured halo is left.

## Checks (`style.json` → `checks`)

Each variant passes only if:

- the background is flat;
- the subject doesn't touch the frame (characters may touch the bottom);
- the subject covers 8–72% of the frame;
- almost no chroma colour is left on the subject;
- it is at most three separate pieces.

Failures are listed in `report.json` and on the contact sheet.
