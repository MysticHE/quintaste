/**
 * Who works in the Mochi kitchen and how each one behaves. Positions are the chef's feet in % of the room painting, for the
 * tall (phone) and wide room. `spots` are places a chef walks to; `face` is the way the chef looks when it gets there.
 */
export const LIVE = new Set(['head', 'scout', 'wok', 'host', 'artist', 'writer']);

/** Views in the turnaround art, turned to the viewer's left; facing right mirrors them. */
export const VIEWS = ['front', 'three-quarter', 'side', 'back-three-quarter', 'back'];

const SPOTS = {
  tall: {
    window: [40, 61, 'back'], shelves: [16, 69, 'left'], fridge: [19, 66, 'left'], painting: [72, 62.5, 'right'], door: [88, 70, 'right'],
    centre: [50, 69, 'front'], pot: [50, 75, 'right'], stove: [81, 84, 'right'], fetch: [22, 67, 'left'], pass: [33, 87, 'right'],
    passLeft: [47, 92, 'left'], passRight: [63, 92, 'right'], front: [24, 82, 'front'], sill: [35, 47.6, 'front'], laksa: [17, 79, 'right'], corner: [13, 95, 'front'],
  },
  wide: {
    window: [47, 59, 'back'], shelves: [26, 64, 'left'], fridge: [13, 71, 'left'], painting: [61.5, 62, 'right'], door: [75, 64, 'back'],
    centre: [50, 68, 'front'], pot: [41, 71, 'right'], stove: [81, 82, 'right'], fetch: [16, 71, 'left'], pass: [40, 85, 'right'],
    passLeft: [53, 89, 'left'], passRight: [61, 89, 'right'], front: [30, 86, 'front'], sill: [44, 47.8, 'front'], laksa: [28, 80, 'right'], corner: [15, 94, 'front'],
  },
};

/** The floor each layout's chefs may walk on (polygon in %), kept clear of the shelves and the pass. */
export const FLOOR = {
  tall: [[20, 60], [80, 60], [95, 66], [95, 97], [80, 97], [80, 88], [30, 88], [30, 97], [6, 97], [6, 70], [18, 64]],
  wide: [[30, 58], [70, 58], [88, 62], [95, 80], [95, 97], [72, 97], [72, 85], [42, 85], [42, 97], [8, 97], [5, 74], [22, 64]],
};

/** Chef width in % of the scene at the front of the room, and how much smaller it gets at the back wall. */
export const SIZE = { tall: { width: 17, horizon: 57, far: 0.74 }, wide: { width: 8.6, horizon: 56, far: 0.68 } };

/**
 * Habits: `home` and the spots a chef visits, how fast it walks (1 = normal), how long it lingers, what it does there,
 * and the reaction it saves for the first tap. `stays` chefs never wander (the head chef keeps to the pass).
 */
export const HABITS = {
  head: { home: 'passMid', scale: 1.2, speed: 0.6, spots: ['passLeft', 'passRight'], every: [5000, 9000], linger: [2500, 4500], act: 'look', signature: 'stamp', stays: true },
  scout: { home: 'laksa', speed: 1.35, spots: ['window', 'shelves', 'door', 'centre', 'painting', 'front'], every: [1800, 3800], linger: [1600, 3200], act: 'inspect', signature: 'pin' },
  wok: { home: 'stove', speed: 0.85, spots: ['fetch', 'pass'], every: [8000, 13000], linger: [1500, 2500], act: 'toss', signature: 'flip' },
  host: { home: 'door', speed: 1, spots: ['centre', 'window', 'front', 'door'], every: [3500, 6500], linger: [2000, 3500], act: 'wave', signature: 'flowers' },
  artist: { home: 'painting', speed: 0.9, spots: ['window', 'centre', 'painting'], every: [6000, 10000], linger: [2500, 4000], act: 'paint', signature: 'splash' },
  writer: { home: 'pot', speed: 0.95, spots: ['pass', 'fridge', 'pot'], every: [7000, 11000], linger: [1500, 3000], act: 'stir', signature: 'hearts' },
  storyteller: { home: 'sill', speed: 0, spots: [], act: 'doze', signature: 'moon', stays: true },
  fixer: { home: 'corner', speed: 0, spots: [], act: 'doze', signature: 'plaster', stays: true },
  safety: { home: 'fridge', speed: 0, spots: [], act: 'doze', signature: 'snow', stays: true },
};

export function spot(layout, name) {
  if (name === 'passMid') return layout === 'tall' ? [55, 92, 'front'] : [57, 89, 'front'];
  return SPOTS[layout][name];
}

/**
 * Where the two hands sit on the body for each view, in % of the body box: [x, y, in front of the body?]. The first hand is
 * the one nearer the way the chef faces. Mirrored views flip x.
 */
export const HANDS = {
  front: [[10, 70, true], [90, 70, true]],
  'three-quarter': [[12, 72, true], [84, 66, false]],
  side: [[28, 72, true], [66, 66, false]],
  'back-three-quarter': [[16, 68, false], [88, 70, true]],
  back: [[8, 68, false], [92, 68, false]],
};

/** Where each chef's badge sits on its hat band, per view (owner, 27 Oct 2026: on the hat, seen from every side). */
export const ICON = { front: [55.6, 34], 'three-quarter': [57, 37], side: [52, 37], 'back-three-quarter': [45.6, 37], back: [49.6, 33] };
