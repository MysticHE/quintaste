"""QT Gamer: turn raw generations into game sprites and check them.

Removes the flat chroma background (only where it connects to the image border, so the
subject's own colours stay), unmixes the background colour from soft edges, trims, resizes,
exports WebP and scores each variant against style.json checks. Writes a contact sheet.

Usage (any Python with OpenCV and NumPy):
  python process.py --run RUN_ID
"""
import argparse
import json
import pathlib

import cv2
import numpy as np

HERE = pathlib.Path(__file__).resolve().parent


def hex_bgr(h):
    h = h.lstrip("#")
    return np.array([int(h[4:6], 16), int(h[2:4], 16), int(h[0:2], 16)], np.float32)


def key_out(img, chroma_bgr):
    h, w = img.shape[:2]
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    frame = np.concatenate([lab[:6].reshape(-1, 3), lab[-6:].reshape(-1, 3),
                            lab[:, :6].reshape(-1, 3), lab[:, -6:].reshape(-1, 3)])
    bg_lab = np.median(frame, axis=0)
    border_bgr = np.concatenate([img[:6].reshape(-1, 3), img[-6:].reshape(-1, 3),
                                 img[:, :6].reshape(-1, 3), img[:, -6:].reshape(-1, 3)]).astype(np.float32)
    border_std = float(border_bgr.std(axis=0).mean())
    bg_bgr = np.median(border_bgr, axis=0)
    dist = np.linalg.norm(lab - bg_lab, axis=2)
    t_in, t_out = 22.0, 60.0
    cand = (dist < t_out).astype(np.uint8)
    n, lab_cc = cv2.connectedComponents(cand, connectivity=4)
    touching = set(np.unique(np.concatenate([lab_cc[0], lab_cc[-1], lab_cc[:, 0], lab_cc[:, -1]]))) - {0}
    bg_region = np.isin(lab_cc, list(touching))
    # Enclosed pockets (inside a jug handle, between leaves) that are almost pure chroma are background too:
    # the prompt forbids the chroma colour on the subject, so near-exact matches cannot be the subject.
    pocket = ((dist < 30) & ~bg_region).astype(np.uint8)
    pn, plab, pst, _ = cv2.connectedComponentsWithStats(pocket, connectivity=4)
    for i in range(1, pn):
        if pst[i, cv2.CC_STAT_AREA] >= 12:
            grown = cv2.dilate((plab == i).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
            bg_region |= grown & (dist < t_out)
    alpha = np.ones((h, w), np.float32)
    ramp = np.clip((dist - t_in) / (t_out - t_in), 0, 1)
    alpha[bg_region] = ramp[bg_region]
    # Pull fringe pixels in by one pixel so halos never survive.
    hard = (alpha > 0.5).astype(np.uint8)
    eroded = cv2.erode(hard, np.ones((3, 3), np.uint8))
    alpha = np.where((hard == 1) & (eroded == 0), alpha * 0.6, alpha)
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0.6)
    a = np.clip(alpha, 1e-3, 1)[:, :, None]
    unmixed = (img.astype(np.float32) - (1 - a) * bg_bgr) / a
    rgb = np.where(alpha[:, :, None] < 0.98, np.clip(unmixed, 0, 255), img.astype(np.float32))
    return rgb.astype(np.uint8), alpha, border_std, bg_bgr


def spill_ratio(rgb, alpha, chroma_bgr):
    opaque = alpha > 0.9
    if not opaque.any():
        return 1.0
    hsv_px = cv2.cvtColor(rgb, cv2.COLOR_BGR2HSV)
    chroma_hsv = cv2.cvtColor(chroma_bgr.reshape(1, 1, 3).astype(np.uint8), cv2.COLOR_BGR2HSV)[0, 0].astype(int)
    dh = np.abs(hsv_px[:, :, 0].astype(int) - chroma_hsv[0])
    dh = np.minimum(dh, 180 - dh)
    near = (dh < 8) & (hsv_px[:, :, 1] > 170) & (hsv_px[:, :, 2] > 170) & opaque
    return float(near.sum()) / float(opaque.sum())


def process_scene(raw_path, style, out_dir):
    img = cv2.imread(str(raw_path), cv2.IMREAD_COLOR)
    scale = style["output"].get("sceneMaxSide", 1400) / max(img.shape[:2])
    if scale < 1:
        img = cv2.resize(img, (round(img.shape[1] * scale), round(img.shape[0] * scale)), interpolation=cv2.INTER_AREA)
    out = out_dir / (raw_path.stem.replace("raw", "sprite") + ".webp")
    cv2.imwrite(str(out), img, [cv2.IMWRITE_WEBP_QUALITY, style["output"]["webpQuality"]])
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    return {"ok": True, "issues": [], "sprite": out.name, "bytes": out.stat().st_size,
            "size": [int(img.shape[1]), int(img.shape[0])], "scene": True}, rgba


def process_variant(raw_path, meta, style, out_dir):
    if meta.get("chroma") is None:
        return process_scene(raw_path, style, out_dir)
    img = cv2.imread(str(raw_path), cv2.IMREAD_COLOR)
    chroma_bgr = hex_bgr(style["chroma"][meta["chroma"]])
    rgb, alpha, border_std, bg = key_out(img, chroma_bgr)
    h, w = alpha.shape
    ys, xs = np.where(alpha > 0.1)
    checks = style["checks"]
    issues = []
    if border_std > checks["borderStdMax"]:
        issues.append(f"background not flat (std {border_std:.1f})")
    if np.linalg.norm(bg - chroma_bgr) > 90:
        issues.append("background colour differs from requested chroma")
    if len(xs) == 0:
        return {"ok": False, "issues": ["nothing left after keying"]}, None
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    m = checks["edgeMarginMinPx"]
    touches = [s for s, cond in (("top", y0 < m), ("bottom", y1 > h - m), ("left", x0 < m), ("right", x1 > w - m)) if cond]
    if touches and meta["kind"] != "character":
        issues.append("subject touches the " + "/".join(touches) + " edge")
    if meta["kind"] == "character" and "top" in touches:
        issues.append("hair touches the top edge")
    coverage = float((alpha > 0.5).sum()) / (h * w)
    if not checks["coverageMin"] <= coverage <= checks["coverageMax"]:
        issues.append(f"subject size off ({coverage:.0%} of frame)")
    spill = spill_ratio(rgb, alpha, chroma_bgr)
    if spill > checks["spillMaxRatio"]:
        issues.append(f"background colour on the subject ({spill:.1%})")
    n_parts = cv2.connectedComponentsWithStats((alpha > 0.5).astype(np.uint8))[2][1:, cv2.CC_STAT_AREA]
    big = int((n_parts > 0.02 * n_parts.max()).sum()) if len(n_parts) else 0
    if big > 3:
        issues.append(f"{big} separate pieces")
    rgba = np.dstack([rgb, (alpha * 255).astype(np.uint8)])[y0:y1, x0:x1]
    scale = style["output"]["maxSide"] / max(rgba.shape[:2])
    if scale < 1:
        rgba = cv2.resize(rgba, (round(rgba.shape[1] * scale), round(rgba.shape[0] * scale)), interpolation=cv2.INTER_AREA)
    out = out_dir / (raw_path.stem.replace("raw", "sprite") + ".webp")
    cv2.imwrite(str(out), rgba, [cv2.IMWRITE_WEBP_QUALITY, style["output"]["webpQuality"]])
    return {"ok": not issues, "issues": issues, "coverage": round(coverage, 3), "borderStd": round(border_std, 1),
            "spill": round(spill, 4), "pieces": big, "sprite": out.name, "bytes": out.stat().st_size,
            "size": [int(rgba.shape[1]), int(rgba.shape[0])]}, rgba


def contact_sheet(rows, path):
    cell, pad, label_h = 220, 12, 40
    cols = max(len(r[1]) for r in rows)
    sheet = np.full((len(rows) * (cell + label_h + pad) + pad, cols * (cell + pad) + pad + 150, 3), (216, 234, 248), np.uint8)
    for i, (asset_id, variants) in enumerate(rows):
        y = pad + i * (cell + label_h + pad)
        cv2.putText(sheet, asset_id, (pad, y + cell // 2), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (40, 40, 60), 1, cv2.LINE_AA)
        for j, (rgba, report) in enumerate(variants):
            x = pad + 150 + j * (cell + pad)
            if rgba is not None:
                s = min(cell / rgba.shape[0], cell / rgba.shape[1])
                im = cv2.resize(rgba, (max(1, int(rgba.shape[1] * s)), max(1, int(rgba.shape[0] * s))), interpolation=cv2.INTER_AREA)
                a = im[:, :, 3:4].astype(np.float32) / 255
                oy, ox = y + (cell - im.shape[0]) // 2, x + (cell - im.shape[1]) // 2
                roi = sheet[oy:oy + im.shape[0], ox:ox + im.shape[1]].astype(np.float32)
                sheet[oy:oy + im.shape[0], ox:ox + im.shape[1]] = (im[:, :, :3] * a + roi * (1 - a)).astype(np.uint8)
            colour = (60, 140, 60) if report.get("ok") else (40, 60, 200)
            text = "PASS" if report.get("ok") else ("; ".join(report.get("issues", []))[:44] or "failed")
            cv2.putText(sheet, f"v{j + 1} {text}", (x, y + cell + 24), cv2.FONT_HERSHEY_SIMPLEX, 0.38, colour, 1, cv2.LINE_AA)
    cv2.imwrite(str(path), sheet)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", required=True)
    args = ap.parse_args()
    style = json.loads((HERE / "style.json").read_text(encoding="utf-8"))
    run_dir = HERE / "runs" / args.run
    if not run_dir.is_dir():
        raise SystemExit("No such run " + str(run_dir))
    report, rows = {}, []
    for asset_dir in sorted(p for p in run_dir.iterdir() if p.is_dir()):
        variants = []
        for meta_path in sorted(asset_dir.glob("request-*.json")):
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            raw = asset_dir / f"raw-{meta['variant']}.png"
            if meta.get("status") != "generated" or not raw.is_file():
                r, rgba = {"ok": False, "issues": [meta.get("error", "generation failed")[:120]]}, None
            else:
                r, rgba = process_variant(raw, meta, style, asset_dir)
            report.setdefault(asset_dir.name, []).append(dict(r, variant=meta["variant"]))
            variants.append((rgba, r))
        if variants:
            rows.append((asset_dir.name, variants))
    (run_dir / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    if rows:
        contact_sheet(rows, run_dir / "contact-sheet.png")
    passed = sum(1 for v in report.values() for r in v if r.get("ok"))
    total = sum(len(v) for v in report.values())
    print(json.dumps({"run": args.run, "variants": total, "passed": passed}))


if __name__ == "__main__":
    main()
