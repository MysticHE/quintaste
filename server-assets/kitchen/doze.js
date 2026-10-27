import { DOZE, FLOOR, spot } from './chefs.js';
import { FACE, inside } from './pose.js';
import { bubble } from './reactions.js';
import { PROPS } from './strings.js';
import { fluffBed, swapBed } from './nook.js';

/**
 * What an off-shift chef gets up to while it rests (owner, 27 Oct 2026: offline chefs must never look stale). Every few seconds,
 * on its own habits (`DOZE` in chefs.js), a resting chef stretches, yawns, rolls over, dreams of its favourite thing, fluffs its
 * cushion, swaps beds, pads off for a drink or a look round, or sleepwalks a little loop, then settles back into bed. Nothing here
 * runs with reduced motion.
 */
const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

/** A short, slow loop in front of its bed's step (or where the chef is), kept on the floor; empty if there is no room. */
function sleepwalk(w, chef) {
  const [x, y] = chef.bed?.door ?? [chef.x, chef.y];
  const points = [[x + rand(4, 8), y + rand(1, 4)], [x - rand(4, 8), y + rand(1, 4)]].filter(p => inside(p, FLOOR[w.layout]));
  if (!points.length) return [];
  return points.map(p => ({ walk: p, slow: 0.45, sleepwalk: true }));
}

const MOVES = {
  stretch: () => [{ face: 0 }, { act: 'stretch', ms: 1500 }],
  yawn: (w, chef) => [{ face: 0 }, { act: 'yawn', ms: 1300 }, { then: () => bubble(w.scene, chef, 'sleepy') }],
  roll: () => [{ act: 'roll', ms: 1800 }],
  dream: (w, chef) => [{ then: () => bubble(w.scene, chef, 'dream', PROPS[chef.id]) }, { act: 'doze', ms: 2400 }],
  // Only a chef sitting in a bed can fluff it or swap it; one dozing at home stretches instead.
  fluff: (w, chef) => (chef.napping ? [{ act: 'fluff', ms: 1200 }, { then: () => fluffBed(w.nook, chef, w.reduced.matches) }] : MOVES.stretch()),
  swap: (w, chef) => (chef.napping && swapBed(w.nook, chef) ? [{ act: 'stretch', ms: 900 }] : MOVES.roll()),  // plan() then walks over
  // Pads to one of its usual spots for a drink or a look (never the pass, where tickets are handed over), then plan() walks it back.
  wander: (w, chef) => {
    const spots = chef.habit.spots.filter(name => !name.startsWith('pass'));
    if (!spots.length) return MOVES.stretch();
    const [x, y, face] = spot(w.layout, pick(spots));
    return [{ walk: [x, y], slow: 0.7 }, { face: FACE[face] }, { act: Math.random() < 0.5 ? 'sip' : 'look', ms: rand(1400, 2400) }];
  },
  sleepwalk,
};

/**
 * The next things a resting chef does, or nothing yet; `stays` chefs (the Head Chef) never leave their spot. plan() asks only
 * once the chef is back at rest, so the wait is timed from the end of the last move (and the walk back), never from its start.
 */
export function doze(w, chef, now) {
  const habits = DOZE[chef.id];
  if (!habits) return [];
  if (chef.nextDoze == null) { chef.nextDoze = now + rand(...habits.every); return []; }  // just settled in: rest a while first
  if (now < chef.nextDoze) return [];
  chef.nextDoze = null;
  const moves = habits.moves.filter(m => !(chef.habit.stays && ['wander', 'sleepwalk', 'swap'].includes(m)));
  return moves.length ? MOVES[pick(moves)](w, chef) : [];
}
