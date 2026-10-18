"""Import QT Gamer art into the app: assets/game/<key>.webp, assets/game/provenance.json and src/game/art.ts.

Usage: python -I scripts/import-game-art.py --source <qt-team gamer folder> [--check]
Each key is taken from the first run that has it (later runs override earlier ones), using variant 1 unless chosen below.
Art is QT Gamer draft output (ChatGPT image generation); an artist approves everything that ships to members.
"""
import argparse
import hashlib
import json
import pathlib
import re
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "game"
# Later runs win. Scenes come from raw PNGs; sprites from processed sprite-N.webp files.
RUNS = ["scene", "scene2", "level5", "lotus", "home", "home2", "iso", "kit", "cast", "dishes", "pantry", "dishfix", "wear2", "wear3", "widen"]
RENAME = {"rh-bg": ("scene2", "bg-cafe"), "rh-counter": ("scene2", "counter"), "cafe-counter": ("home", "counter")}
VARIANT = {"avatar-adult": 2, "avatar-mini": 2}
SCENES = {"skin-sunny", "skin-lotus", "skin-lantern", "rh-bg"}
# Wide home skins (QT Gamer style.json homeSkin): widen.py composites, imported at 1280 px high with the portrait room in the middle.
WIDE = {"skin-sunny-wide", "skin-lotus-wide", "skin-lantern-wide"}
SCENES |= WIDE
SIZES = {"skin": 1280, "rh-bg": 1280, "rh-counter": 1024, "cafe-counter": 768, "avatar": 480, "guest": 360, "dish": 360, "pet": 360, "wear": 360,
         "decor": 360, "stove": 320, "soup": 320, "rice": 320, "dessert": 320, "assembly": 320, "board": 320, "plate": 256, "acc": 220, "lotus": 160}
STEAM = {"soup-pot", "rice-cooker"}


def size_for(key):
    for prefix, side in SIZES.items():
        if key.startswith(prefix):
            return side
    return 256


def required_keys():
    text = "".join((ROOT / "src" / "game" / "content" / f).read_text(encoding="utf-8") for f in ("items.ts", "dishes.ts", "guests.ts", "cosmetics.ts"))
    keys = set(re.findall(r'\bart: "([a-z0-9-]+)"', text)) | set(re.findall(r'\bartNo: "([a-z0-9-]+)"', text))
    keys |= set(re.findall(r'fresh\("[a-z0-9-]+", "[^"]+", "([a-zA-Z0-9-]+)"', text)) | set(re.findall(r'pantry\("[a-z0-9-]+", "[^"]+", "([a-zA-Z0-9-]+)"', text))
    keys |= set(re.findall(r'one\("[a-z0-9-]+", "[^"]+", "([a-z0-9-]+)"', text))
    pets = ["sprout", "pip", "purple", "blue", "golden"]
    accs = ["clip", "coral", "lilac", "mushroom", "lantern", "hat", "scarf", "crown"]
    keys |= {f"wear-{p}-{a}" for p in pets for a in accs if not (p == "blue" and a == "scarf")}
    keys |= WIDE
    keys |= {"rh-bg", "rh-counter", "plate", "board", "cafe-counter", "avatar-adult", "avatar-mini", "avatar-lian", "lotus-bud-pink",
             "lotus-pink", "lotus-purple", "lotus-blue", "lotus-golden", "decor-rug"}
    keys.discard("")
    return sorted(k for k in keys if k)


def find(src, key):
    if key in RENAME:
        run, folder = RENAME[key]
        return run, folder
    hit, fallback = None, None
    for run in RUNS:
        if not (src / "runs" / run / key).is_dir():
            continue
        report = src / "runs" / run / "report.json"
        fallback = (run, key)
        if report.is_file() and key not in SCENES:
            entries = json.loads(report.read_text(encoding="utf-8")).get(key, [])
            if entries and not any(e.get("ok") for e in entries):
                continue
        hit = (run, key)
    # A render that failed an automatic check but was approved by eye (for example a crown cut out in pieces).
    return hit or fallback


def despill(im):
    import numpy as np
    a = np.asarray(im.convert("RGBA")).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (r > g + 25) & (b > g + 25)
    mx = np.maximum(np.maximum(r, g), b)
    for c in range(3):
        a[..., c] = np.where(m, mx, a[..., c])
    return Image.fromarray(a.clip(0, 255).astype("uint8"), "RGBA")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    src = pathlib.Path(args.source)
    keys = required_keys()
    missing, plan = [], {}
    for key in keys:
        hit = find(src, key)
        if not hit:
            missing.append(key)
            continue
        run, folder = hit
        d = src / "runs" / run / folder
        v = VARIANT.get(key, 1)
        report = src / "runs" / run / "report.json"
        if key not in VARIANT and key not in SCENES and report.is_file():
            entries = json.loads(report.read_text(encoding="utf-8")).get(folder, [])
            ok = [e["variant"] for e in entries if e.get("ok")]
            if ok:
                v = ok[0]
        wide_report = d / "wide-report.json"
        if key in WIDE and key not in VARIANT and wide_report.is_file():
            ok = sorted((e for e in json.loads(wide_report.read_text(encoding="utf-8")) if e.get("ok")), key=lambda e: e.get("seamDifference", 99))
            v = ok[0]["variant"] if ok else v
        path = d / (f"wide-{v}.png" if key in WIDE else f"raw-{v}.png" if key in SCENES else f"sprite-{v}.webp")
        if not path.is_file():
            missing.append(key + " (" + str(path.relative_to(src)) + ")")
            continue
        plan[key] = (run, folder, v, path)
    if missing:
        print("Missing art:", ", ".join(missing))
        if args.check:
            sys.exit(1)
    if args.check:
        print(len(plan), "keys ready")
        return
    OUT.mkdir(parents=True, exist_ok=True)
    prov, total = {}, 0
    for key, (run, folder, v, path) in plan.items():
        im = Image.open(path)
        im = im.convert("RGB") if key in SCENES else im.convert("RGBA")
        if key in STEAM:
            im = despill(im)
        side = size_for(key)
        if key in WIDE:
            im = im.resize((round(im.width * 1280 / im.height), 1280), Image.LANCZOS)
        elif max(im.size) > side:
            s = side / max(im.size)
            im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        dest = OUT / f"{key}.webp"
        im.save(dest, "WEBP", quality=76 if key in SCENES else 82, method=4)
        total += dest.stat().st_size
        req = path.parent / f"request-{v}.json"
        meta = json.loads(req.read_text(encoding="utf-8")) if req.is_file() else {}
        prov[key] = {"source": f"runs/{run}/{folder}", "variant": v, "tool": "QT Gamer (ChatGPT image generation via Hermes openai-codex)",
                     "model": meta.get("model"), "tier": meta.get("tier"), "requestedAt": meta.get("requestedAt"),
                     "prompt": meta.get("prompt"), "sha256": hashlib.sha256(dest.read_bytes()).hexdigest(), "size": list(im.size),
                     "status": "draft: needs artist approval before members see it"}
    (OUT / "provenance.json").write_text(json.dumps(prov, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = ["/* Generated by scripts/import-game-art.py. Do not edit by hand. */",
             "import type { ImageSourcePropType } from \"react-native\";", "",
             "export const GAME_ART: Record<string, ImageSourcePropType> = {"]
    lines += [f'  "{k}": require("../../assets/game/{k}.webp"),' for k in sorted(plan)]
    lines += ["};", "", "/** Pixel size of each image, for layout without decoding (width, height). */",
              "export const GAME_ART_SIZE: Record<string, [number, number]> = {"]
    lines += [f'  "{k}": [{prov[k]["size"][0]}, {prov[k]["size"][1]}],' for k in sorted(plan)]
    lines += ["};", ""]
    (ROOT / "src" / "game" / "art.ts").write_text("\n".join(lines), encoding="utf-8")
    print(f"imported {len(plan)} images, {total / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
