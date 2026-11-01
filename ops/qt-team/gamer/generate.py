"""QT Gamer: generate raw game sprites through Hermes's own ChatGPT/Codex image provider.

Runs inside Hermes's Python (no API key, no SDK bypass): the openai-codex image plugin owns
authentication and transport, exactly like the bots' image_worker.py.

Usage (Hermes Python):
  python generate.py --run RUN_ID [--tier gpt-image-2-high] [--variants 2] [--only id1,id2] [--dry-run]
Writes runs/RUN_ID/<asset>/raw-<n>.png and request-<n>.json. Post-process with process.py.
"""
import argparse
import datetime as dt
import hashlib
import importlib
import json
import os
import pathlib
import shutil
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
HERMES_SRC = os.environ.get("HERMES_SRC", r"C:\Users\huien\AppData\Local\hermes\hermes-agent")
TIERS = ("gpt-image-2-low", "gpt-image-2-medium", "gpt-image-2-high")


# A merchandise mockup ("photo") is a real-photo look: never a cut-out background, never the game style board.
PHOTO = {"chroma": None, "reference": False}


def settled(asset):
    """The asset with its kind's fixed settings applied, so a manifest entry cannot get them wrong."""
    return {**asset, **PHOTO} if asset["kind"] == "photo" else asset


def build_prompt(style, asset):
    asset = settled(asset)
    kind = style["kinds"][asset["kind"]].format(subject=asset["subject"], details=asset.get("details", ""))
    if asset["kind"] == "photo":
        parts = [kind, style["photoNegatives"]]
    else:
        # A kind may bring its own look (kindBase), e.g. crisp metal emblems instead of the soft clay house style.
        base, note = style.get("kindBase", {}).get(asset["kind"], style["base"]), style["referenceNote"]
        if asset.get("reference") is False:  # the asset's own refs (or none) describe what to copy
            base, note = base.replace(" in the style of the reference image", ""), ""
        chroma = asset.get("chroma", "magenta")
        if chroma is None:  # full-frame scene or surface: no cut-out background
            parts = [base, kind, style["sceneNegatives"], note]
        else:
            parts = [base, kind, style["background"].format(chromaName=chroma, chromaHex=style["chroma"][chroma]),
                     style["negatives"].format(chromaName=chroma), note]
    return " ".join(p.strip() for p in parts if p.strip())


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def asset_refs(asset):
    """Extra reference images for one asset (for example the pet and the accessory it should wear).
    Only plain file names inside references/ are accepted."""
    out = []
    for name in asset.get("refs", []):
        if not isinstance(name, str) or "/" in name or "\\" in name or ".." in name:
            raise SystemExit(f"{asset['id']}: refs must be file names inside references/")
        path = HERE / "references" / name
        if not path.is_file():
            raise SystemExit(f"{asset['id']}: missing reference {name}")
        out.append(path)
    return out


def load_provider():
    if HERMES_SRC not in sys.path:
        sys.path.insert(0, HERMES_SRC)
    sys._hermes_pin_default_home = True
    import hermes_bootstrap  # noqa: F401  (sets up Hermes's packages)
    import hermes_constants
    os.environ.setdefault("HERMES_HOME", str(hermes_constants.get_default_hermes_root()))
    module = importlib.import_module("plugins.image_gen.openai-codex")
    provider = module.OpenAICodexImageGenProvider()
    if not provider.is_available():
        raise SystemExit("No ChatGPT/Codex sign-in for Hermes. Run: hermes auth add openai-codex")
    return provider


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", required=True)
    ap.add_argument("--tier", default="gpt-image-2-high", choices=TIERS)
    ap.add_argument("--variants", type=int, default=1)
    ap.add_argument("--only", default="")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--manifest", default="assets.json", help="asset list file next to this script")
    args = ap.parse_args()
    if not (1 <= args.variants <= 4):
        raise SystemExit("--variants must be 1-4")

    style = json.loads((HERE / "style.json").read_text(encoding="utf-8"))
    if "/" in args.manifest or "\\" in args.manifest or not args.manifest.endswith(".json"):
        raise SystemExit("--manifest must be a .json file name next to generate.py")
    manifest = json.loads((HERE / args.manifest).read_text(encoding="utf-8"))
    wanted = {s.strip() for s in args.only.split(",") if s.strip()}
    if wanted:
        assets = [settled(a) for a in manifest["assets"] if a["id"] in wanted]
    else:
        assets = [settled(a) for a in manifest["assets"] if a.get("status") == "todo"]
    unknown = wanted - {a["id"] for a in manifest["assets"]}
    if unknown:
        raise SystemExit("Unknown asset ids: " + ", ".join(sorted(unknown)))
    reference = HERE / style["reference"]
    styled_run = any(a.get("reference") is not False for a in assets)
    if styled_run and not reference.is_file():
        raise SystemExit("Missing style reference " + str(reference))

    run_dir = HERE / "runs" / args.run
    if args.dry_run:
        for a in assets:
            print(f"--- {a['id']}\n{build_prompt(style, a)}\n")
        return

    os.environ["OPENAI_IMAGE_MODEL"] = args.tier
    provider = load_provider()
    summary = []
    board_sha = sha256(reference) if styled_run else None  # hashed once: the same file for the whole run
    for a in assets:
        prompt = build_prompt(style, a)
        styled = a.get("reference") is not False
        extra = asset_refs(a)
        # Each extra reference with its hash, since files in references/ can be replaced by a later round.
        extra_meta = [{"file": r.name, "sha256": sha256(r)} for r in extra]
        out = run_dir / a["id"]
        out.mkdir(parents=True, exist_ok=True)
        for n in range(1, args.variants + 1):
            raw = out / f"raw-{n}.png"
            if raw.exists():
                summary.append({"id": a["id"], "variant": n, "status": "exists"})
                continue
            started = time.time()
            refs = ([str(reference)] if styled else []) + [str(r) for r in extra]
            result = provider.generate(prompt, a.get("aspect", "square"), reference_image_urls=refs or None)
            meta = {"assetId": a["id"], "variant": n, "kind": a["kind"], "chroma": a.get("chroma", "magenta"),
                    "aspect": a.get("aspect", "square"),
                    "prompt": prompt, "tier": args.tier, "reference": style["reference"] if styled else None,
                    "referenceSha256": board_sha if styled else None,
                    "refs": extra_meta,
                    "requestedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
                    "seconds": round(time.time() - started, 1)}
            if not result.get("success"):
                meta.update(status="failed", errorType=result.get("error_type"), error=str(result.get("error", ""))[:400])
                (out / f"request-{n}.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
                summary.append({"id": a["id"], "variant": n, "status": "failed", "error": meta["error"][:160]})
                print(json.dumps(summary[-1]), flush=True)
                continue
            src = pathlib.Path(result["image"])
            shutil.copyfile(src, raw)
            meta.update(status="generated", provider=result.get("provider"), model=result.get("model"),
                        pixelSize=result.get("pixel_size") or result.get("extra", {}).get("pixel_size"),
                        rawSha256=sha256(raw))
            (out / f"request-{n}.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
            summary.append({"id": a["id"], "variant": n, "status": "generated", "seconds": meta["seconds"]})
            print(json.dumps(summary[-1]), flush=True)
    (run_dir / "generate-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
