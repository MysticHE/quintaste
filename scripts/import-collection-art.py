"""Imports the chosen QT Gamer drawings for Collection (avatar borders, badges and gifts) into the app.

Run with any Python that has OpenCV:  python -I scripts/import-collection-art.py --source <QT Gamer folder>
The QT Gamer folder is the working copy whose runs/ holds the drawings (for example HA/companion-api/ops/qt-team/gamer).
Without --source it rebuilds the lit copies and src/config/collection-art.ts from the images already in assets/collection.

Writes assets/collection/<id>.webp (512 px on the long side, transparent), assets/collection/<id>-lit.webp (the same item
with its own highlights brightened and colours deepened: the app sweeps it across the item as light, so the shine is the
item's own colour, never a white film; owner, 1 Nov 2026), assets/collection/provenance.json (run, variant, prompt and
hashes) and src/config/collection-art.ts (the images, each border's photo hole, the edge points where the app's star glints
appear and each item's highlight colour for them). Owner picks, 1 Nov 2026: docs/COLLECTION_PLAN.md.
"""
import argparse, colorsys, hashlib, json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
# App id: (run, QT Gamer asset id, variant)
PICKS = {
    "border-sprout": ("avatar-borders", "border-sprout", 1),
    "border-bamboo": ("avatar-borders", "border-bamboo", 1),
    "border-lotus-pond": ("avatar-borders", "border-lotus-pond", 2),
    "border-mochi": ("avatar-borders", "border-mochi", 1),
    "border-golden-lotus": ("avatar-borders", "border-golden-lotus", 1),
    "badge-tea-for-two": ("badges-v2", "badge-first-dinner", 1),
    "badge-good-company": ("badges-v2", "badge-good-company", 1),
    "badge-explorer": ("badges-v2", "badge-explorer", 1),
    "badge-home-cook": ("badges-v2", "badge-home-cook", 1),
    "badge-lotus-legend": ("badges-v2", "badge-lotus-legend", 2),
    "gift-rose": ("gift-items", "item-rose", 1),
    "gift-lotus": ("gift-items", "item-lotus", 1),
    "gift-bouquet": ("gift-items", "item-bouquet", 1),
    "gift-mochi": ("gift-items", "item-mochi", 1),
    "gift-golden-lotus": ("gift-items", "item-golden-lotus", 1),
}
SIZE = 512
LIT_SIZE = 384


def fit(img):
    """Pads to a square (so every item lines up in the app's square tiles) and scales to SIZE."""
    h, w = img.shape[:2]
    side = max(h, w)
    out = np.zeros((side, side, 4), np.uint8)
    out[(side - h) // 2:(side - h) // 2 + h, (side - w) // 2:(side - w) // 2 + w] = img
    return cv2.resize(out, (SIZE, SIZE), interpolation=cv2.INTER_AREA)


def hole(img):
    """A border's transparent centre as [left, top, size] in percent of the square: centred on its widest row."""
    a = img[:, :, 3]
    _, lab = cv2.connectedComponents((a < 40).astype(np.uint8), connectivity=4)
    mask = lab == lab[SIZE // 2, SIZE // 2]
    best, row, mid = 0, SIZE // 2, SIZE / 2
    for y in range(SIZE):
        xs = np.nonzero(mask[y])[0]
        if len(xs) and xs.max() - xs.min() + 1 > best:
            best, row, mid = xs.max() - xs.min() + 1, y, (xs.max() + xs.min()) / 2
    d = best * 1.04
    return [round((mid - d / 2) / SIZE * 100, 2), round((row - d / 2) / SIZE * 100, 2), round(d / SIZE * 100, 2)]


def glints(img, count=14):
    """Points on the outer edge's upper half, where light would catch, as [x, y] fractions."""
    a = (img[:, :, 3] > 140).astype(np.uint8)
    contours, _ = cv2.findContours(a, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    edge = max(contours, key=cv2.contourArea)[:, 0, :]
    cy = np.nonzero(a)[0].mean()
    top = edge[edge[:, 1] < cy]
    pick = top[np.linspace(0, len(top) - 1, count).astype(int)] if len(top) >= count else edge[::max(1, len(edge) // count)]
    return [[round(float(x) / SIZE, 3), round(float(y) / SIZE, 3)] for x, y in pick]


def lit(img):
    """The item lit up in its own colours: highlights lifted (gamma on value), colours deepened, transparency unchanged."""
    hsv = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.22, 0, 255)
    hsv[:, :, 2] = np.clip(255 * (hsv[:, :, 2] / 255) ** 0.55 * 1.08, 0, 255)
    out = img.copy()
    out[:, :, :3] = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    return out


def tone(img):
    """The item's highlight colour (the brightest well-coloured pixels), lifted a little, as #rrggbb, for its star glints."""
    hsv = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2HSV)
    solid = img[:, :, 3] > 200
    coloured = solid & (hsv[:, :, 1] > 70)
    pick = coloured if coloured.sum() > 200 else solid
    v = hsv[:, :, 2][pick]
    bright = pick & (hsv[:, :, 2] >= np.percentile(v, 85))
    b, g, r = (img[:, :, :3][bright].mean(axis=0) * 0.7 + 255 * 0.3).astype(int)
    return f"#{r:02x}{g:02x}{b:02x}"


def spark(hex_tone):
    """A paler version of the same hue (lighter, less saturated, never pure white) for the glint's core."""
    r, g, b = (int(hex_tone[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    r, g, b = colorsys.hsv_to_rgb(h, s * 0.5, 1.0)
    return "#" + "".join(f"{round(c * 255):02x}" for c in (r, g, b))


def write_art(out):
    """Lit copies and src/config/collection-art.ts from the images in assets/collection."""
    entries = []
    for app_id in PICKS:
        img = cv2.imread(str(out / f"{app_id}.webp"), cv2.IMREAD_UNCHANGED)
        # The lit copy is only seen through a moving band, so a smaller, lighter file is enough.
        cv2.imwrite(str(out / f"{app_id}-lit.webp"), cv2.resize(lit(img), (LIT_SIZE, LIT_SIZE), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_WEBP_QUALITY, 80])
        extra = f", hole: {json.dumps(hole(img))}" if app_id.startswith("border-") else ""
        entries.append(f'  "{app_id}": {{ image: require("../../assets/collection/{app_id}.webp"), lit: require("../../assets/collection/{app_id}-lit.webp"), '
                       f'tone: "{tone(img)}", spark: "{spark(tone(img))}", glints: {json.dumps(glints(img))}{extra} }},')
    ts = ("// Generated by scripts/import-collection-art.py from the owner's QT Gamer picks (1 Nov 2026). Do not edit by hand.\n"
          "// lit: the item lit in its own colours, swept across it as light; tone: its highlight colour (star glints); spark: a\n"
          "// paler version of the same hue for the glint's core;\n"
          "// hole: a border's photo opening [left, top, size] in percent of the square image; glints: edge points [x, y] in fractions.\n"
          "export type CollectionArt = { image: number; lit: number; tone: string; spark: string; glints: [number, number][]; hole?: [number, number, number] };\n"
          "export const COLLECTION_ART: Record<string, CollectionArt> = {\n" + "\n".join(entries) + "\n};\n")
    (ROOT / "src" / "config" / "collection-art.ts").write_text(ts, encoding="utf-8", newline="\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source")
    source = parser.parse_args().source
    out = ROOT / "assets" / "collection"
    out.mkdir(parents=True, exist_ok=True)
    if source:
        runs, provenance = Path(source) / "runs", {}
        for app_id, (run, asset, variant) in PICKS.items():
            folder = runs / run / asset
            img = fit(cv2.imread(str(folder / f"sprite-{variant}.webp"), cv2.IMREAD_UNCHANGED))
            target = out / f"{app_id}.webp"
            cv2.imwrite(str(target), img, [cv2.IMWRITE_WEBP_QUALITY, 92])
            request = json.loads((folder / f"request-{variant}.json").read_text(encoding="utf-8"))
            provenance[app_id] = {"run": run, "asset": asset, "variant": variant, "prompt": request.get("prompt"), "tier": request.get("tier"),
                                  "sha256": hashlib.sha256(target.read_bytes()).hexdigest()}
        (out / "provenance.json").write_text(json.dumps(provenance, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_art(out)
    print(f"{'imported' if source else 'rebuilt'} {len(PICKS)} items in {out}")


if __name__ == "__main__":
    main()
