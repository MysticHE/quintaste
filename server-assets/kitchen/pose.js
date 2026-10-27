/** Pose maths for the kitchen chefs, with no DOM: facing directions, turning, body motion and hand positions. */

/** Eight facings, clockwise from facing the viewer; the turnaround art faces left, so right-hand views are mirrored. */
export const RING = [['front', false], ['three-quarter', false], ['side', false], ['back-three-quarter', false], ['back', false],
  ['back-three-quarter', true], ['side', true], ['three-quarter', true]];
export const FACE = { front: 0, left: 2, back: 4, right: 6 };
const SECTOR_TO_RING = { 2: 0, 3: 1, 4: 2, '-4': 2, '-3': 3, '-2': 4, '-1': 5, 0: 6, 1: 7 };
const REST = { lift: 0, sx: 1, sy: 1, rot: 0 };

/** The facing for a move on screen (down = towards the viewer). */
export function ringFor(dx, dy) {
  return SECTOR_TO_RING[Math.round(Math.atan2(dy, dx) / (Math.PI / 4))];
}

export function inside([x, y], polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Turns one step at a time towards a facing, so a chef visibly rotates instead of snapping; true once it faces it. */
export function turnToward(chef, target, now, step = 75) {
  if (chef.ring === target || now < chef.turnAt) return chef.ring === target;
  const diff = (target - chef.ring + 8) % 8;
  chef.ring = (chef.ring + (diff <= 4 ? 1 : 7)) % 8;
  chef.turnAt = now + step;
  return chef.ring === target;
}

/** Lift (% of height), squash and lean of the body. `still` (reduced motion) always gives the resting pose. */
export function bodyMotion(chef, time, still) {
  if (still) return REST;
  const p = chef.actT / 1000;
  if (chef.walking) {
    const s = Math.abs(Math.sin(chef.phase * Math.PI)), drowsy = chef.sleepwalk ? 0.35 : 1;  // a sleepwalker shuffles
    return { lift: s * 9 * drowsy, sx: 1 - (1 - s) * 0.05, sy: 1 + (s - 0.5) * 0.06, rot: Math.sin(chef.phase * Math.PI) * 4 * drowsy };
  }
  if (chef.hop > 0) return { lift: Math.sin(chef.hop * Math.PI) * 26, sx: 0.94, sy: 1.08, rot: 0 };
  if (chef.act === 'inspect') return { ...REST, rot: 7 };
  if (chef.act === 'toss' || chef.act === 'stamp') {
    const s = Math.abs(Math.sin(p * 9));
    return { lift: s * 5, sx: 1 + (1 - s) * 0.04, sy: 1 - (1 - s) * 0.04, rot: 0 };
  }
  if (chef.act === 'shiver') return { ...REST, rot: Math.sin(p * 60) * 3 };
  if (chef.act === 'stretch') { const s = Math.sin(Math.min(1, p / 1.4) * Math.PI); return { lift: s * 4, sx: 1 - s * 0.05, sy: 1 + s * 0.1, rot: 0 }; }
  if (chef.act === 'yawn') { const s = Math.sin(Math.min(1, p / 1.2) * Math.PI); return { lift: 0, sx: 1 - s * 0.02, sy: 1 + s * 0.05, rot: -s * 4 }; }
  if (chef.act === 'roll') return { lift: 0, sx: 1.02, sy: 0.98, rot: Math.sin(p * 2.6) * 13 };
  if (chef.act === 'fluff') return { ...REST, lift: Math.abs(Math.sin(p * 8)) * 2, sy: 1 - Math.abs(Math.sin(p * 8)) * 0.03 };
  if (chef.act === 'sip') return { ...REST, rot: -3 };
  if (chef.act === 'wobble') return { ...REST, rot: Math.sin(p * 14) * 12 };
  const asleep = ['resting', 'unknown', 'soon'].includes(chef.state);
  const b = Math.sin(time / (asleep ? 900 : 520)), depth = asleep ? 0.02 : 0.012;
  return { lift: 0, sx: 1 + b * depth, sy: 1 - b * depth, rot: chef.act === 'look' ? Math.sin(p * 2.5) * 5 : 0 };
}

/** How far hand `i` moves from its resting spot, in % of the body box. */
export function handOffsets(chef, i, time, still) {
  if (still) return [0, 0];
  const a = chef.act, p = chef.actT / 1000;
  if (a === 'wave' && i === 0) return [Math.sin(p * 12) * 7, -34];
  if (a === 'cheer') return [i ? 6 : -6, -38];
  if (a === 'toss') return [0, -10 - Math.abs(Math.sin(p * 9)) * 14];
  if (a === 'stir' && i === 0) return [Math.cos(p * 7) * 8, -6 + Math.sin(p * 7) * 5];
  if (a === 'paint' && i === 0) return [Math.sin(p * 10) * 6, -14];
  if (a === 'inspect' && i === 0) return [4, -18];
  if (a === 'stamp') return [0, -24 + Math.abs(Math.sin(p * 8)) * 18];
  if (a === 'shiver') return [Math.sin(p * 60) * 3, -4];
  if (a === 'stretch') return [i ? 8 : -8, -42 * Math.sin(Math.min(1, p / 1.4) * Math.PI)];
  if (a === 'yawn' && i === 0) return [30, -14 * Math.sin(Math.min(1, p / 1.2) * Math.PI)];  // a paw over the smile
  if (a === 'fluff') return [i ? -4 : 4, 8 + Math.abs(Math.sin(p * 8 + i)) * 7];  // patting the cushion
  if (a === 'sip' && i === 0) return [26, -16];
  if (chef.walking && chef.sleepwalk) return [i ? -6 : 6, -20];  // paws out in front
  return [0, chef.walking ? Math.sin(chef.phase * Math.PI) * (i ? -7 : 7) : Math.sin(time / 600 + i) * 1.5];
}
