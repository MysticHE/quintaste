import { NOOK } from './chefs.js';

/**
 * The nap nook under the window (owner, 27 Oct 2026): a rug, a plant and beds. An off-shift chef claims a free bed and sits in
 * it: the bed swaps to its sat-on picture with a soft squash, the chef sinks into the dent, and the bed's front rim (`lip`: the
 * sat-on picture masked to its rim) is drawn over the chef's base, so it sits in the cushion with its face showing. The bed
 * springs back when its chef's shift starts.
 */

/**
 * Each bed's dent when sat on, in % of its sat-on picture: centre, radii and how far below the dent's front edge the sitter's
 * base rests (hidden by the rim). The lip shows the picture below the dent's centre line, outside the dent.
 */
const DENT = {
  cushion: { cx: 50, cy: 38, rx: 38, ry: 11, sink: 9 },
  steamer: { cx: 50, cy: 37, rx: 45, ry: 20, sink: 9 },
};
/** Without its sat-on picture a bed keeps its plump one: the chef sits on top, 60% of the way up, and there is no rim over it. */
const ON_TOP = { cx: 50, cy: 40, rx: 0, ry: 0, sink: 0 };
const dentFor = (bed, picture) => (bed.noSat === bed.art ? ON_TOP : picture.startsWith('steamer') ? DENT.steamer : DENT.cushion);

/** The squash as a chef lands, and the spring back as it gets up. */
const LAND = [{ scale: '1 1' }, { scale: '1.08 .86', offset: 0.35 }, { scale: '.98 1.03', offset: 0.7 }, { scale: '1 1' }];
const LIFT = [{ scale: '1 1' }, { scale: '.95 1.07', offset: 0.35 }, { scale: '1.02 .98', offset: 0.7 }, { scale: '1 1' }];

function picture(className) {
  return Object.assign(document.createElement('img'), { className, alt: '', draggable: false });
}

function holder(className, ...children) {
  const el = Object.assign(document.createElement('span'), { className: 'prop nook ' + className });
  el.setAttribute('aria-hidden', 'true');
  el.append(...children);
  return el;
}

function buildBed(nook) {
  const soft = picture('nook-soft'), sat = picture('nook-sat'), rim = picture('nook-rim');
  const bed = { el: holder('nook-bed', soft, sat), lip: holder('nook-lip', rim), soft, sat, rim, art: null, down: false };
  soft.onerror = () => { bed.failed = bed.art; bed.el.hidden = bed.lip.hidden = true; nook.version++; };  // missing art: no bed
  sat.onerror = () => {  // no sat-on picture: the plump one squashes, with the chef on top and no rim
    if (sat.src === soft.src) return;
    bed.noSat = bed.art;
    bed.lip.hidden = true;
    sat.src = soft.src;
    nook.version++;
  };
  soft.onload = sat.onload = () => { nook.version++; };  // a picture's real size moves its seat
  return bed;
}

const MOST_BEDS = Math.max(...Object.values(NOOK).map(n => n.beds.length));

export function buildNook(scene, artBase) {
  const rug = holder('nook-rug', picture('')), plant = holder('nook-plant', picture(''));
  rug.firstChild.src = artBase + 'rug.webp';
  plant.firstChild.src = artBase + 'plant.webp';
  const nook = { rug, plant, artBase, layout: null, version: 0 };
  nook.beds = Array.from({ length: MOST_BEDS }, () => buildBed(nook));
  nook.claims = nook.beds.map(() => null);
  // Before the chefs in the page, so a chef standing level with a bed's rim is drawn over it.
  const pieces = [rug, plant, ...nook.beds.flatMap(b => [b.el, b.lip])], first = scene.querySelector('.chef');
  if (first) first.before(...pieces); else scene.append(...pieces);
  return nook;
}

function set(el, [x, y, w], z) {
  el.style.setProperty('--x', x + '%');
  el.style.setProperty('--y', y + '%');
  el.style.setProperty('--w', w + '%');
  el.style.zIndex = String(z);
}

/** Places the nook for a layout; switching layout frees every bed (the chefs are re-placed too). */
export function layoutNook(nook, layout) {
  const n = NOOK[layout];
  set(nook.rug, n.rug, 1);  // flat on the floor, under everyone
  nook.rug.style.setProperty('--flat', String(n.flat));
  nook.plant.hidden = !n.plant;
  if (n.plant) set(nook.plant, n.plant, Math.round(n.plant[1] * 10));
  nook.beds.forEach((bed, i) => {
    const b = n.beds[i], art = b ? nook.artBase + b[3] : null;
    bed.el.hidden = !b || bed.failed === art;  // this layout has fewer beds, or the picture failed to load
    bed.lip.hidden = bed.el.hidden || bed.noSat === art;
    if (!b) return;
    if (bed.art !== art) {
      bed.art = art;
      bed.soft.src = art + '.webp';
      bed.sat.src = bed.rim.src = art + '-sat.webp';
      const d = dentFor(bed, b[3]);
      for (const [k, v] of Object.entries(d)) bed.lip.style.setProperty('--' + k, v + '%');
    }
    const front = Math.round(b[1] * 10);
    set(bed.el, b, front - 2);  // bed, sitter (front - 1), rim, then anyone standing level with or in front of the rim
    set(bed.lip, b, front);
  });
  if (nook.layout !== layout) {  // the chefs are re-placed at home, so the beds are emptied without a spring-back
    nook.claims = nook.claims.map(() => null);
    nook.beds.forEach(bed => { bed.down = false; bed.el.classList.remove('is-down'); bed.lip.classList.remove('is-down'); });
  }
  nook.layout = layout;
}

/** How far in front of a bed's front edge its step is (in % of the scene's height): chefs climb in and out from there. */
const STEP = 2.5;

/**
 * Where a chef sits in bed `i` (in % of the scene), the depth that keeps it between the bed and its rim, the bed's footprint and
 * the step in front of it (`door`).
 */
function seat(nook, i, W, H) {
  const [x, y, w, name] = NOOK[nook.layout].beds[i], bed = nook.beds[i], img = bed.sat.naturalWidth ? bed.sat : bed.soft;
  const aspect = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.6;  // until a picture loads; plan() re-seats after
  const height = w * W / 100 * aspect / H * 100, d = dentFor(bed, name);
  return { i, x, y: y - height * (1 - (d.cy + d.ry + d.sink) / 100), face: 'front', z: Math.round(y * 10) - 1, front: y, half: w / 2,
    door: [x, y + STEP] };
}

/** The bed this chef naps in, claiming a free one; null when every bed is taken, the chef stays at the pass or no bed is shown. */
export function napSpot(nook, chef, W, H) {
  if (!nook?.layout || chef.habit.stays) return null;  // not placed yet (first frame) or the chef keeps to the pass
  let i = nook.claims.indexOf(chef.id);
  if (i >= 0 && nook.beds[i].el.hidden) { nook.claims[i] = null; i = -1; }  // its bed's picture failed after it was claimed
  if (i < 0) {
    i = nook.claims.findIndex((id, j) => !id && j < NOOK[nook.layout].beds.length && !nook.beds[j].el.hidden);
    if (i < 0) return null;
    nook.claims[i] = chef.id;
  }
  return seat(nook, i, W, H);
}

export function leaveBed(nook, chef) {
  const i = nook ? nook.claims.indexOf(chef.id) : -1;
  if (i >= 0) nook.claims[i] = null;
}

/** Bed `i` on screen, in % of the scene: its sides, its top and its front edge. */
function box(nook, i, W, H) {
  const [x, y, w] = NOOK[nook.layout].beds[i], bed = nook.beds[i], img = bed.sat.naturalWidth ? bed.sat : bed.soft;
  const aspect = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.6;
  return { left: x - w / 2, right: x + w / 2, top: y - w * W / 100 * aspect / H * 100, front: y };
}

const within = (b, [x, y]) => x > b.left && x < b.right && y > b.top && y < b.front;

/** True when the straight walk from `a` to `c` passes through box `b` (clipping the segment against it). */
function crosses(a, c, b) {
  let t0 = 0, t1 = 1;
  const d = [c[0] - a[0], c[1] - a[1]];
  for (const [p, q] of [[-d[0], a[0] - b.left], [d[0], b.right - a[0]], [-d[1], a[1] - b.top], [d[1], b.front - a[1]]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * Where a walk from `from` to `to` should turn so it passes in front of a bed rather than behind it (drawn under it), or null.
 * A bed the walk starts or ends inside (climbing on or off it) is left out: those steps go straight up or down its front.
 */
export function detour(nook, W, H, from, to) {
  const beds = nook?.layout ? NOOK[nook.layout].beds : [];
  for (let i = 0; i < beds.length; i++) {
    if (nook.beds[i].el.hidden) continue;
    const b = box(nook, i, W, H);
    if (within(b, from) || within(b, to) || !crosses(from, to, b)) continue;
    // Behind the bed, step out round the corner on its own side; already in front, go to the corner nearest where it is going.
    const side = from[1] >= b.front ? to[0] : from[0];
    return [side < (b.left + b.right) / 2 ? b.left - 1 : b.right + 1, b.front + STEP];
  }
  return null;
}

/** True when a point (in % of the scene) is inside a bed's footprint: level with it and behind its front edge. */
export const inFootprint = (b, [x, y]) => Math.abs(x - b.x) < b.half && y <= b.front;

/** True while a chef sits on its bed or is climbing on or off it. */
export function onBed(chef) {
  const b = chef.bed;
  return Boolean(b && (chef.napping || inFootprint(b, [chef.x, chef.y])));
}

/** The depth to draw a chef at while on its bed, so it never slips behind the bed's front; null elsewhere. */
export function bedDepth(chef) {
  return onBed(chef) ? chef.bed.z : null;
}

/** A quick plump-up of the chef's own bed (it squashes and springs back once). */
export function fluffBed(nook, chef, still) {
  const bed = nook.beds[nook.claims.indexOf(chef.id)];
  if (!bed || still || bed.el.hidden) return;
  for (const el of [bed.el, bed.lip]) el.animate(LIFT, { duration: 520, easing: 'ease-out' });
}

/** Moves the chef's claim to another free, shown bed; false when there is none. plan() then walks it over. */
export function swapBed(nook, chef) {
  const from = nook.claims.indexOf(chef.id), count = NOOK[nook.layout]?.beds.length ?? 0;
  const free = nook.claims.map((id, j) => j).filter(j => j !== from && j < count && !nook.claims[j] && !nook.beds[j].el.hidden);
  if (from < 0 || !free.length) return false;
  nook.claims[from] = null;
  nook.claims[free[Math.floor(Math.random() * free.length)]] = chef.id;
  return true;
}

/** Squashes each bed whose chef is sitting in it and springs back the ones just left. */
export function pressBeds(nook, byId, still) {
  nook.beds.forEach((bed, i) => {
    const id = nook.claims[i], down = Boolean(id && byId[id]?.napping);
    if (bed.down === down) return;
    bed.down = down;
    for (const el of [bed.el, bed.lip]) {
      el.classList.toggle('is-down', down);
      if (!still && !el.hidden) el.animate(down ? LAND : LIFT, { duration: 560, easing: 'ease-out' });
    }
  });
}
