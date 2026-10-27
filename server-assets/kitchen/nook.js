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
const dentFor = picture => (picture.startsWith('steamer') ? DENT.steamer : DENT.cushion);

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

function buildBed() {
  const soft = picture('nook-soft'), sat = picture('nook-sat'), rim = picture('nook-rim');
  const bed = { el: holder('nook-bed', soft, sat), lip: holder('nook-lip', rim), soft, sat, rim, art: null, down: false };
  soft.onerror = () => { bed.failed = bed.art; bed.el.hidden = bed.lip.hidden = true; };  // missing art: no bed
  sat.onerror = () => { if (sat.src !== soft.src) sat.src = rim.src = soft.src; };  // no sat-on picture: the plump one squashes
  return bed;
}

const MOST_BEDS = Math.max(...Object.values(NOOK).map(n => n.beds.length));

export function buildNook(scene, artBase) {
  const rug = holder('nook-rug', picture('')), plant = holder('nook-plant', picture(''));
  rug.firstChild.src = artBase + 'rug.webp';
  plant.firstChild.src = artBase + 'plant.webp';
  const beds = Array.from({ length: MOST_BEDS }, buildBed);
  scene.append(rug, plant, ...beds.flatMap(b => [b.el, b.lip]));
  return { rug, plant, beds, artBase, layout: null, claims: beds.map(() => null) };
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
    bed.el.hidden = bed.lip.hidden = !b || bed.failed === art;  // this layout has fewer beds, or the picture failed to load
    if (!b) return;
    if (bed.art !== art) {
      bed.art = art;
      bed.soft.src = art + '.webp';
      bed.sat.src = bed.rim.src = art + '-sat.webp';
      const d = dentFor(b[3]);
      for (const [k, v] of Object.entries(d)) bed.lip.style.setProperty('--' + k, v + '%');
    }
    const z = Math.round(b[1] * 10);
    set(bed.el, b, z);
    set(bed.lip, b, z + 2);  // over the sitter (z + 1), under anyone standing in front
  });
  if (nook.layout !== layout) nook.claims = nook.claims.map(() => null);
  nook.layout = layout;
}

/** Where a chef sits in bed `i` (in % of the scene), the depth that keeps it between the bed and its rim, and the bed's footprint. */
function seat(nook, i, W, H) {
  const [x, y, w, name] = NOOK[nook.layout].beds[i], bed = nook.beds[i], img = bed.sat.naturalWidth ? bed.sat : bed.soft;
  const aspect = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.6;  // the bed's own picture gives its height
  const height = w * W / 100 * aspect / H * 100, d = dentFor(name);
  return { x, y: y - height * (1 - (d.cy + d.ry + d.sink) / 100), face: 'front', z: Math.round(y * 10) + 1, front: y, half: w / 2 };
}

/** The bed this chef naps in, claiming a free one; null when every bed is taken, the chef stays at the pass or no bed is shown. */
export function napSpot(nook, chef, W, H) {
  if (!nook?.layout || chef.habit.stays) return null;  // not placed yet (first frame) or the chef keeps to the pass
  let i = nook.claims.indexOf(chef.id);
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

/**
 * The depth to draw a chef at while it sits on its bed or climbs on or off it, so it never slips behind the bed's front;
 * null elsewhere. Once an awake chef has stepped off, it forgets the bed.
 */
export function bedDepth(chef, awake) {
  const b = chef.bed;
  if (!b) return null;
  if (chef.napping || (Math.abs(chef.x - b.x) < b.half && chef.y <= b.front)) return b.z;
  if (awake) chef.bed = null;
  return null;
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
