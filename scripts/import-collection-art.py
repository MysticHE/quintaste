"""Imports the chosen QT Gamer drawings for Collection (avatar borders, badges and gifts) into the app.

Run with any Python that has OpenCV:  python -I scripts/import-collection-art.py --source <QT Gamer folder>
The QT Gamer folder is the working copy whose runs/ holds the drawings (for example HA/companion-api/ops/qt-team/gamer).
Without --source it rebuilds the lit copies and src/config/collection-art.ts from the images already in assets/collection.

Writes assets/collection/<id>.webp (512 px on the long side, transparent), assets/collection/<id>-lit.webp (the same item
with its own highlights brightened and colours deepened: the app sweeps it across the item as light, so the shine is the
item's own colour, never a white film; owner, 1 Nov 2026), <id>-core.webp (the parts that glow from within),
<id>-bloom.webp (their light, spreading a little past them) and, for borders, <id>-hot.webp (the metal glowing hot, for
the light that runs round the ring), assets/collection/provenance.json (run, variant, prompt and hashes) and
src/config/collection-art.ts (the images, effect level, highlight colours, glint and gem points, and each border's photo
hole and ring path). Owner picks, 1 Nov 2026: docs/COLLECTION_PLAN.md.
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
LAYER_QUALITY = 86


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


def hot(img):
    """A border's metal glowing hot in its own colours (much brighter, colour kept): the light that runs round the ring."""
    hsv = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 0.9, 0, 255)
    hsv[:, :, 2] = np.clip(255 * (hsv[:, :, 2] / 255) ** 0.34 * 1.1, 0, 255)
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


# Which parts of each item glow from within (OpenCV hue ranges, 0-180), or "bright" for its brightest metal, and how rich
# its effects are (1 common/bronze/little ... 4 legend/mythic/signature). Owner, 1 Nov 2026: effects grow with rarity.
EMISSIVE = {
    "border-sprout": [(28, 55)], "border-bamboo": [(38, 72)], "border-lotus-pond": [(158, 180), (0, 6)], "border-mochi": "bright",
    "border-golden-lotus": ["bright", (125, 165)], "badge-tea-for-two": "bright", "badge-good-company": [(168, 180), (0, 8), (100, 120)],
    "badge-explorer": [(95, 125)], "badge-home-cook": "bright", "badge-lotus-legend": [(125, 170)], "gift-rose": [(168, 180), (0, 8)],
    "gift-lotus": [(150, 180)], "gift-bouquet": [(165, 180), (0, 8)], "gift-mochi": [(165, 180), (0, 6)], "gift-golden-lotus": "bright",
}
LEVEL = {"border-sprout": 1, "border-bamboo": 2, "border-lotus-pond": 2, "border-mochi": 3, "border-golden-lotus": 4,
         "badge-tea-for-two": 1, "badge-good-company": 2, "badge-explorer": 3, "badge-home-cook": 3, "badge-lotus-legend": 4,
         "gift-rose": 1, "gift-lotus": 2, "gift-bouquet": 3, "gift-mochi": 3, "gift-golden-lotus": 4}
HALO_PAD = 1.4  # the bloom image covers this many times the item's square, so its light can spill past the edges
BLOOM_SIZE = 512  # the bloom's pixels: soft light, so a little under the item's own resolution per unit of size is enough


def emissive(app_id, img):
    """A 0..1 mask of the parts that glow: the item's chosen hues (vivid pixels), its brightest metal, or both."""
    hsv = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2HSV)
    solid, rule = img[:, :, 3] > 160, EMISSIVE[app_id]
    rules = rule if isinstance(rule, list) else [rule]
    mask = np.zeros(solid.shape, bool)
    for r in rules:
        if r == "bright":
            v = hsv[:, :, 2][solid & (hsv[:, :, 1] > 40)]
            mask |= solid & (hsv[:, :, 1] > 40) & (hsv[:, :, 2] >= np.percentile(v, 86))
        else:
            mask |= solid & (hsv[:, :, 0] >= r[0]) & (hsv[:, :, 0] <= r[1]) & (hsv[:, :, 1] > 80) & (hsv[:, :, 2] > 90)
    soft = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 2.2)
    return np.clip(soft * 1.4, 0, 1) * (img[:, :, 3] / 255)


def core(img, mask):
    """The glowing parts, lit in their own colours, feathered; laid over the item and breathed in and out."""
    out = lit(img)
    out[:, :, 3] = (mask * 255).astype(np.uint8)
    return out


def bloom(img, mask):
    """Light shining from the glowing parts, laid over the item: their own colours made bright and vivid, blurred so the
    light spreads a little past their edges. Where it lies over the item, the picture already holds the "screen" blend of
    that light with the item (lighter, never covering), so ordinary layering in the app gives the same look everywhere;
    beyond the item it is the light itself."""
    hsv = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.25, 0, 255)
    hsv[:, :, 2] = np.clip(255 * (hsv[:, :, 2] / 255) ** 0.45 * 1.15, 0, 255)
    bright = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
    # On a canvas HALO_PAD times the item, so the aura is not cut off where the item meets its square's edges.
    pad = int(SIZE * (HALO_PAD - 1) / 2)
    side = SIZE + 2 * pad
    m = np.zeros((side, side), np.float32)
    c = np.zeros((side, side, 3), np.float32)
    m[pad:pad + SIZE, pad:pad + SIZE] = mask
    c[pad:pad + SIZE, pad:pad + SIZE] = bright * mask[:, :, None]
    # A tight glow on the glowing parts, spreading only a little past their edges (owner, 1 Nov 2026: a wide aura looked
    # unnatural).
    tight = SIZE * 0.022
    colour = cv2.GaussianBlur(c, (0, 0), tight)
    weight = cv2.GaussianBlur(m, (0, 0), tight)
    light = np.clip(colour / np.maximum(weight[:, :, None], 1e-4), 0, 255) / 255
    item = np.zeros((side, side, 3), np.float32)
    cover = np.zeros((side, side, 1), np.float32)
    item[pad:pad + SIZE, pad:pad + SIZE] = img[:, :, :3] / 255
    cover[pad:pad + SIZE, pad:pad + SIZE, 0] = img[:, :, 3] / 255
    screened = 1 - (1 - item) * (1 - light)
    out = np.zeros((side, side, 4), np.uint8)
    out[:, :, :3] = np.clip((screened * cover + light * (1 - cover)) * 255, 0, 255).astype(np.uint8)
    out[:, :, 3] = np.clip(weight * 1.7 * 255, 0, 255).astype(np.uint8)
    return out


def gems(img, mask, fallback):
    """Spots that twinkle: centres of small vivid blobs within the glowing parts (gems, crystal tips), else edge points."""
    hsv = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2HSV)
    vivid = (img[:, :, 3] > 200) & (hsv[:, :, 1] > 100) & (hsv[:, :, 2] > 160) & (mask > 0.5)
    count, _, stats, centres = cv2.connectedComponentsWithStats(vivid.astype(np.uint8), connectivity=8)
    blobs = [(stats[i, cv2.CC_STAT_AREA], centres[i]) for i in range(1, count) if 25 <= stats[i, cv2.CC_STAT_AREA] <= 2500]
    blobs.sort(key=lambda b: -b[0])
    picked = []
    for _, (x, y) in blobs:
        if all((x - px) ** 2 + (y - py) ** 2 > (SIZE * 0.12) ** 2 for px, py in picked):
            picked.append((x, y))
        if len(picked) == 5:
            break
    points = [[round(float(x) / SIZE, 3), round(float(y) / SIZE, 3)] for x, y in picked]
    return points if len(points) >= 2 else fallback[1:-1:3][:5]


def orbit(img, hole_at):
    """A border's ring path for the orbiting light: [centre x, centre y, radius] as fractions, the radius being the middle
    of the ring's metal, measured around the photo opening."""
    left, top, size = (v / 100 * SIZE for v in hole_at)
    cx, cy, r0 = left + size / 2, top + size / 2, size / 2
    solid, mids = img[:, :, 3] > 140, []
    for a in np.linspace(0, 2 * np.pi, 96, endpoint=False):
        inside, start = False, None
        for r in np.arange(r0 * 0.92, SIZE * 0.75, 1.0):
            x, y = int(cx + r * np.sin(a)), int(cy - r * np.cos(a))
            if not (0 <= x < SIZE and 0 <= y < SIZE):
                break
            if solid[y, x] and not inside:
                inside, start = True, r
            elif inside and not solid[y, x]:
                mids.append((start + r) / 2)
                break
    radius = float(np.median(mids)) if mids else r0 * 1.06
    return [round(cx / SIZE, 4), round(cy / SIZE, 4), round(radius / SIZE, 4)]


def write_art(out):
    """Lit copies, glow layers and src/config/collection-art.ts from the images in assets/collection."""
    entries = []
    for app_id in PICKS:
        img = cv2.imread(str(out / f"{app_id}.webp"), cv2.IMREAD_UNCHANGED)
        # The lit copy and glowing parts lie exactly over the item, so they keep its full size: anything smaller shows as soft,
        # blocky edges where they meet the sharp original.
        cv2.imwrite(str(out / f"{app_id}-lit.webp"), lit(img), [cv2.IMWRITE_WEBP_QUALITY, LAYER_QUALITY])
        mask = emissive(app_id, img)
        cv2.imwrite(str(out / f"{app_id}-core.webp"), core(img, mask), [cv2.IMWRITE_WEBP_QUALITY, LAYER_QUALITY])
        cv2.imwrite(str(out / f"{app_id}-bloom.webp"), cv2.resize(bloom(img, mask), (BLOOM_SIZE, BLOOM_SIZE), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_WEBP_QUALITY, LAYER_QUALITY])
        edge = glints(img)
        extra = ""
        if app_id.startswith("border-"):
            hole_at = hole(img)
            cv2.imwrite(str(out / f"{app_id}-hot.webp"), hot(img), [cv2.IMWRITE_WEBP_QUALITY, LAYER_QUALITY])
            extra = f', hole: {json.dumps(hole_at)}, orbit: {json.dumps(orbit(img, hole_at))}, hot: require("../../assets/collection/{app_id}-hot.webp")'
        base = f'"../../assets/collection/{app_id}'
        entries.append(f'  "{app_id}": {{ image: require({base}.webp"), lit: require({base}-lit.webp"), core: require({base}-core.webp"), '
                       f'bloom: require({base}-bloom.webp"), level: {LEVEL[app_id]}, tone: "{tone(img)}", spark: "{spark(tone(img))}", '
                       f'glints: {json.dumps(edge)}, gems: {json.dumps(gems(img, mask, edge))}{extra} }},')
    ts = ("// Generated by scripts/import-collection-art.py from the owner's QT Gamer picks (1 Nov 2026). Do not edit by hand.\n"
          "// lit: the item lit in its own colours, swept across it as light; core: its glowing parts (breathed in and out);\n"
          "// bloom: light shining from its glowing parts, a little past their edges, laid over it (a canvas 1.4 times its\n"
          "// size, light blend baked in); level: how rich its effects are (1 to 4);\n"
          "// tone / spark: its highlight colour and a paler version of the same hue (star glints);\n"
          "// glints: edge points; gems: spots that twinkle; hole: a border's photo opening [left, top, size] in percent;\n"
          "// orbit: a border's ring path [centre x, centre y, radius] in fractions of the square image; hot: its metal glowing\n"
          "// hot in its own colours, for the light that runs round the ring.\n"
          "export type CollectionArt = { image: number; lit: number; core: number; bloom: number; level: 1 | 2 | 3 | 4; tone: string; spark: string;\n"
          "  glints: [number, number][]; gems: [number, number][]; hole?: [number, number, number]; orbit?: [number, number, number]; hot?: number };\n"
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
