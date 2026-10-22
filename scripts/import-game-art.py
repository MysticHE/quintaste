"""Import QT Gamer art into the app: assets/game/<key>.webp, assets/game/provenance.json and src/game/art.ts.

Usage: python -I scripts/import-game-art.py --source <qt-team gamer folder> [--check]
       python -I scripts/import-game-art.py --add <run folder> [--add <run folder>] [--pick key=variant]
Each key is taken from the first run that has it (later runs override earlier ones), using variant 1 unless chosen below.
--add merges downloaded runs (asset folders with sprite-N.webp and report-N.json) into the art already imported, without the
older runs: only keys the game uses and does not have yet, or keys named with --pick, are added, each from the first run given that has it.
Art is QT Gamer draft output (ChatGPT image generation); an artist approves everything that ships to members. A re-import keeps an
approval (status, approvedBy, approvedAt) only while the picture's bytes are unchanged; a new or changed picture starts as a draft.
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
RUNS = ["scene", "scene2", "level5", "lotus", "home", "home2", "iso", "kit", "cast", "dishes", "pantry", "dishfix", "wear2", "wear3", "widen",
        "growth", "widen-signature"]
RENAME = {"rh-bg": ("scene2", "bg-cafe"), "rh-counter": ("scene2", "counter"), "cafe-counter": ("home", "counter")}
# Pinned by eye: the signature room variant that keeps the hotspot layout, and the more compact assembly board.
VARIANT = {"avatar-adult": 2, "avatar-mini": 2, "skin-signature": 2, "assembly-counter": 2}
SCENES = {"skin-sunny", "skin-lotus", "skin-lantern", "skin-signature", "rh-bg"}
# Every café skin is a full scene (no cut-out), including the chapter and season rewards.
is_scene = lambda key: key in SCENES or (key.startswith("skin-") and not key.endswith("-wide"))
# Wide home skins (QT Gamer style.json homeSkin): widen.py composites, imported at 1280 px high with the portrait room in the middle.
WIDE = {"skin-sunny-wide", "skin-lotus-wide", "skin-lantern-wide", "skin-signature-wide"}
SCENES |= WIDE
SIZES = {"skin": 1280, "rh-bg": 1280, "rh-counter": 1024, "cafe-counter": 768, "avatar": 480, "guest": 360, "dish": 360, "pet": 360, "wear": 360,
         "decor": 360, "stove": 320, "blender": 320, "steamer": 320, "oven": 320, "griddle": 320, "fryer": 320, "dough-board": 320, "fridge": 320, "tool": 160, "soup": 320, "rice": 320, "dessert": 320, "assembly": 320, "board": 320, "plate": 256, "acc": 220, "lotus": 160}
STEAM = {"soup-pot", "rice-cooker"}


def size_for(key):
    for prefix, side in SIZES.items():
        if key.startswith(prefix):
            return side
    return 256


def required_keys():
    content = ROOT / "src" / "game" / "content"
    files = [content / f for f in ("items.ts", "dishes.ts", "guests.ts", "cosmetics.ts")] + sorted((content / "chapters").glob("*.ts"))
    text = "".join(f.read_text(encoding="utf-8") for f in files)
    keys = set(re.findall(r'\bart: "([a-z0-9-]+)"', text)) | set(re.findall(r'\bartNo: "([a-z0-9-]+)"', text))
    # fresh(id, name) and pantry(id, name) default the art key to the id.
    keys |= {m.group(2) or m.group(1) for m in re.finditer(r'\b(?:fresh|pantry)\("([a-z0-9-]+)", "[^"]+"(?:, "([a-zA-Z0-9-]+)")?', text)}
    keys |= set(re.findall(r'one\("[a-z0-9-]+", "[^"]+", "([a-z0-9-]+)"', text))
    pets = ["sprout", "pip", "purple", "blue", "golden"]
    accs = ["clip", "coral", "lilac", "mushroom", "lantern", "hat", "scarf", "crown"]
    keys |= {f"wear-{p}-{a}" for p in pets for a in accs if not (p == "blue" and a == "scarf")}
    keys |= WIDE
    keys |= {"rh-bg", "rh-counter", "plate", "board", "cafe-counter", "avatar-adult", "avatar-mini", "avatar-lian", "lotus-bud-pink",
             "lotus-pink", "lotus-purple", "lotus-blue", "lotus-golden", "decor-rug", "assembly-counter"}
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
        if report.is_file() and not is_scene(key):
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


def encode(key, path):
    im = Image.open(path)
    im = im.convert("RGB") if is_scene(key) else im.convert("RGBA")
    if key in STEAM:
        im = despill(im)
    side = size_for(key)
    if key in WIDE:
        im = im.resize((round(im.width * 1280 / im.height), 1280), Image.LANCZOS)
    elif max(im.size) > side:
        s = side / max(im.size)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    dest = OUT / f"{key}.webp"
    im.save(dest, "WEBP", quality=76 if is_scene(key) else 82, method=4)
    return im.size, dest


def record(source, v, path, size, dest):
    req = path.parent / f"request-{v}.json"
    meta = json.loads(req.read_text(encoding="utf-8")) if req.is_file() else {}
    return {"source": source, "variant": v, "tool": "QT Gamer (ChatGPT image generation via Hermes openai-codex)",
            "model": meta.get("model"), "tier": meta.get("tier"), "requestedAt": meta.get("requestedAt"),
            "prompt": meta.get("prompt"), "sha256": hashlib.sha256(dest.read_bytes()).hexdigest(), "size": list(size),
            "status": "draft: needs artist approval before members see it"}


def keep_approval(old, key, rec):
    prev = old.get(key)
    if prev and prev.get("status") == "approved" and prev.get("sha256") == rec["sha256"]:
        rec.update({k: prev[k] for k in ("status", "approvedBy", "approvedAt") if k in prev})
    return rec


def write_outputs(prov):
    (OUT / "provenance.json").write_text(json.dumps(prov, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = ["/* Generated by scripts/import-game-art.py. Do not edit by hand. */",
             "import type { ImageSourcePropType } from \"react-native\";", "",
             "export const GAME_ART: Record<string, ImageSourcePropType> = {"]
    lines += [f'  "{k}": require("../../assets/game/{k}.webp"),' for k in sorted(prov)]
    lines += ["};", "", "/** Pixel size of each image, for layout without decoding (width, height). */",
              "export const GAME_ART_SIZE: Record<string, [number, number]> = {"]
    lines += [f'  "{k}": [{prov[k]["size"][0]}, {prov[k]["size"][1]}],' for k in sorted(prov)]
    lines += ["};", ""]
    (ROOT / "src" / "game" / "art.ts").write_text("\n".join(lines), encoding="utf-8")


def add_runs(runs, picks):
    prov = json.loads((OUT / "provenance.json").read_text(encoding="utf-8"))
    wanted, added = set(required_keys()), {}
    for run in map(pathlib.Path, runs):
        for d in sorted(p for p in run.iterdir() if p.is_dir()):
            key = d.name
            if key not in wanted or key in added or (key in prov and key not in picks):
                continue
            ok = sorted(int(r.stem.split("-")[1]) for r in d.glob("report-*.json") if json.loads(r.read_text(encoding="utf-8")).get("ok"))
            v = picks.get(key, ok[0] if ok else None)
            path = d / (f"raw-{v}.png" if is_scene(key) else f"sprite-{v}.webp")
            if v is None or not path.is_file():
                sys.exit(f"{key}: no passing sprite in {d}")
            size, dest = encode(key, path)
            prov[key] = keep_approval(prov, key, record(f"runs/{run.name}/{key}", v, path, size, dest))
            added[key] = v
    write_outputs(prov)
    print("added", len(added), " ".join(f"{k}:{v}" for k, v in added.items()))
    missing = sorted(k for k in wanted if k not in prov)
    print("still missing:", ", ".join(missing) if missing else "none")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--add", action="append", default=[])
    ap.add_argument("--pick", action="append", default=[])
    args = ap.parse_args()
    if args.add:
        add_runs(args.add, {k: int(v) for k, v in (p.split("=") for p in args.pick)})
        return
    if not args.source:
        ap.error("--source or --add is required")
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
        if key not in VARIANT and not is_scene(key) and report.is_file():
            entries = json.loads(report.read_text(encoding="utf-8")).get(folder, [])
            ok = [e["variant"] for e in entries if e.get("ok")]
            if ok:
                v = ok[0]
        wide_report = d / "wide-report.json"
        if key in WIDE and key not in VARIANT and wide_report.is_file():
            ok = sorted((e for e in json.loads(wide_report.read_text(encoding="utf-8")) if e.get("ok")), key=lambda e: e.get("seamDifference", 99))
            v = ok[0]["variant"] if ok else v
        path = d / (f"wide-{v}.png" if key in WIDE else f"raw-{v}.png" if is_scene(key) else f"sprite-{v}.webp")
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
    old = json.loads((OUT / "provenance.json").read_text(encoding="utf-8")) if (OUT / "provenance.json").is_file() else {}
    prov, total = {}, 0
    for key, (run, folder, v, path) in plan.items():
        size, dest = encode(key, path)
        total += dest.stat().st_size
        prov[key] = keep_approval(old, key, record(f"runs/{run}/{folder}", v, path, size, dest))
    write_outputs(prov)
    print(f"imported {len(plan)} images, {total / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
