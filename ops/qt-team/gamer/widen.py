"""QT Gamer: widen a café home skin from the phone portrait (2:3) to the wide home size (3:2).

Home skins are painted in two steps (style.json -> homeSkin):
  1. the portrait room, 1024x1536, which fixes the playable layout (hotspots, counter, decor spots);
  2. the wide room, 2304x1536: the portrait room unchanged in the middle, with the room continued to the left and right
     for tablets, desktops and landscape screens.

Step 2 runs in three parts:
  python widen.py prep --skin runs/home/skin-sunny/raw-1.png --name sunny
      writes references/widen-sunny.png, a 1536x1024 canvas with the portrait room in the middle and flat grey sides;
  python generate.py --run widen --manifest concepts-widen.json   (Hermes Python, as for every QT Gamer run)
      QT Gamer paints the grey sides as the rest of the room;
  python widen.py composite --skin runs/home/skin-sunny/raw-1.png --run widen --id skin-sunny-wide
      aligns the painting to the original, upscales it to 2304x1536 and pastes the original room back pixel-exact in
      the middle, cutting each seam along the path where the repaint matches the original best (no ghosting), so
      every hotspot coordinate of the portrait skin still holds. It writes runs/<run>/<id>/wide-<n>.png and
      wide-report.json; a weak match or a seam difference above homeSkin.maxSeamDifference fails the check.

Runs in any Python with OpenCV and NumPy (like process.py).
"""
import argparse
import json
import pathlib
import sys

import cv2
import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
STYLE = json.loads((HERE / "style.json").read_text(encoding="utf-8"))
SPEC = STYLE["homeSkin"]
WIDE_W, WIDE_H = SPEC["wide"]            # 2304 x 1536
PORT_W, PORT_H = SPEC["portrait"]        # 1024 x 1536
CANVAS_W, CANVAS_H = SPEC["canvas"]      # 1536 x 1024, the generator's landscape size
FEATHER = SPEC["feather"]


def read(path):
    im = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if im is None:
        raise SystemExit(f"Cannot read {path}")
    return im


def safe_name(value):
    if not value.replace("-", "").isalnum():
        raise SystemExit("Names may use letters, digits and hyphens only")
    return value


def prep(args):
    room = cv2.resize(read(args.skin), (round(CANVAS_H * PORT_W / PORT_H), CANVAS_H), interpolation=cv2.INTER_AREA)
    canvas = np.full((CANVAS_H, CANVAS_W, 3), SPEC["canvasGrey"], np.uint8)
    x = (CANVAS_W - room.shape[1]) // 2
    canvas[:, x:x + room.shape[1]] = room
    out = HERE / "references" / f"widen-{safe_name(args.name)}.png"
    cv2.imwrite(str(out), canvas)
    print(json.dumps({"canvas": str(out.relative_to(HERE)), "roomX": x, "roomWidth": room.shape[1]}))


def locate(painted, room):
    """Where the portrait room sits in the painting: best template match over scales 0.85-1.15 at quarter size."""
    small = cv2.cvtColor(cv2.resize(painted, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
    best = (-1.0, 0, 0, 0)
    for scale in np.arange(0.85, 1.151, 0.01):
        h = round(painted.shape[0] * 0.25 * scale)
        w = round(h * PORT_W / PORT_H)
        if h > small.shape[0] or w > small.shape[1]:
            continue
        tmpl = cv2.cvtColor(cv2.resize(room, (w, h), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
        res = cv2.matchTemplate(small, tmpl, cv2.TM_CCOEFF_NORMED)
        _, score, _, loc = cv2.minMaxLoc(res)
        if score > best[0]:
            best = (score, loc[0] * 4, loc[1] * 4, w * 4)
    return best


def seam_path(cost):
    """Lowest-cost top-to-bottom path through a cost band (dynamic programming, moves of at most one column per row)."""
    h, w = cost.shape
    acc = cost.copy()
    for y in range(1, h):
        prev = acc[y - 1]
        left = np.concatenate(([np.inf], prev[:-1]))
        right = np.concatenate((prev[1:], [np.inf]))
        acc[y] += np.minimum(np.minimum(left, prev), right)
    path = np.zeros(h, np.int32)
    path[-1] = int(np.argmin(acc[-1]))
    for y in range(h - 2, -1, -1):
        x = path[y + 1]
        lo, hi = max(0, x - 1), min(w, x + 2)
        path[y] = lo + int(np.argmin(acc[y, lo:hi]))
    return path, float(cost[np.arange(h), path].mean())


def composite_one(room, raw):
    painted = read(raw)
    score, gx, gy, gw = locate(painted, room)
    k = PORT_W / gw
    x0 = (WIDE_W - PORT_W) // 2
    m = np.float32([[k, 0, x0 - gx * k], [0, k, -gy * k]])
    wide = cv2.warpAffine(painted, m, (WIDE_W, WIDE_H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    band = FEATHER * 2
    # Match the sides' colour to the original along each edge (left shift fades into right shift across the middle).
    left = room[:, :band].astype(np.float32).mean((0, 1)) - wide[:, x0:x0 + band].mean((0, 1))
    right = room[:, -band:].astype(np.float32).mean((0, 1)) - wide[:, x0 + PORT_W - band:x0 + PORT_W].mean((0, 1))
    ramp = np.clip((x0 + PORT_W - np.arange(WIDE_W)) / PORT_W, 0, 1)[None, :, None]
    wide = np.clip(wide + ramp * left + (1 - ramp) * right, 0, 255)
    # Cut each seam where the repaint and the original agree most, so nothing is ghosted, then soften it by a few px.
    full = wide.copy()
    full[:, x0:x0 + PORT_W] = room
    alpha = np.zeros((WIDE_H, WIDE_W), np.float32)
    alpha[:, x0:x0 + PORT_W] = 1.0
    costs = []
    # The seam may wander up to seamBand px into the room, so it can go round furniture the edge cuts through
    # (a bookcase, a doorway) instead of joining two different versions of it.
    reach = SPEC["seamBand"]
    for start, keep_right in ((x0, True), (x0 + PORT_W - reach, False)):
        diff = np.abs(room[:, start - x0:start - x0 + reach].astype(np.float32) - wide[:, start:start + reach]).sum(2)
        diff = cv2.GaussianBlur(diff, (9, 9), 0)
        path, cost = seam_path(diff)
        costs.append(cost)
        cols = np.arange(reach)[None, :]
        alpha[:, start:start + reach] = (cols >= path[:, None]) if keep_right else (cols < path[:, None])
    alpha = cv2.GaussianBlur(alpha, (0, 0), SPEC["seamSoften"])
    a = alpha[:, :, None]
    out = (full * a + wide * (1 - a)).astype(np.uint8)
    shift = float(max(np.abs(left).max(), np.abs(right).max()))
    seam = round(max(costs) / 3, 1)
    return out, {"match": round(float(score), 3), "scale": round(k, 3), "offset": [round(gx * k, 1), round(gy * k, 1)],
                 "colourShift": round(shift, 1), "seamDifference": seam, "ok": bool(score >= 0.55 and seam <= SPEC["maxSeamDifference"])}


def composite(args):
    room = cv2.resize(read(args.skin), (PORT_W, PORT_H), interpolation=cv2.INTER_AREA)
    folder = HERE / "runs" / safe_name(args.run) / safe_name(args.id)
    raws = sorted(folder.glob("raw-*.png"))
    if not raws:
        raise SystemExit(f"No raw-*.png in {folder}")
    report = []
    for raw in raws:
        n = raw.stem.split("-")[1]
        out, info = composite_one(room, raw)
        cv2.imwrite(str(folder / f"wide-{n}.png"), out)
        report.append({"variant": int(n), **info})
        print(json.dumps({"id": args.id, **report[-1]}))
    (folder / "wide-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("prep"); p.add_argument("--skin", required=True); p.add_argument("--name", required=True)
    c = sub.add_parser("composite"); c.add_argument("--skin", required=True); c.add_argument("--run", required=True); c.add_argument("--id", required=True)
    args = ap.parse_args()
    for attr in ("skin",):
        path = (HERE / getattr(args, attr)).resolve()
        if HERE not in path.parents:
            sys.exit("--skin must be inside the QT Gamer folder")
        setattr(args, attr, path)
    prep(args) if args.cmd == "prep" else composite(args)


if __name__ == "__main__":
    main()
