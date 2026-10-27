import { LIVE, VIEWS, FLOOR, SIZE, HABITS, HANDS, ICON, COUNTER, spot } from './chefs.js';
import { RING, FACE, ringFor, inside, bodyMotion, handOffsets } from './pose.js';
import { home, depth, step, settle } from './behaviour.js';
import { REACTIONS, burst, bubble } from './reactions.js';
import { createSay, placeSay, handOver } from './speech.js';
import { wait } from './time.js';
import { buildNook, layoutNook, bedDepth, pressBeds } from './nook.js';

/**
 * The kitchen as a small game world: each chef walks the floor on its own habits (behaviour.js), turns through eight directions
 * using the turnaround art, swings its hands (pose.js) and reacts when poked (reactions.js). Real tickets are carried to the
 * Head Chef in a text bubble above the carrier's head (speech.js). With reduced motion the chefs stand still at home and only their bubbles appear.
 */
const AWAKE = ['working', 'reviewing', 'waiting'];

/** Writes a style property only when it changes, so a still chef costs no style or layout work. */
function put(el, prop, value) {
  const cache = el.kitchenStyle ??= {};
  if (cache[prop] !== value) { cache[prop] = value; el.style[prop] = value; }
}

function buildChef(w, el) {
  const id = el.dataset.chef, art = w.artBase, rig = Object.assign(document.createElement('span'), { className: 'chef-rig' });
  const sprite = Object.assign(document.createElement('img'), { className: 'chef-sprite', alt: '', draggable: false });
  const icon = Object.assign(document.createElement('img'), { className: 'chef-icon', alt: '', draggable: false, src: `${art}icon-${id}.webp` });
  icon.onerror = () => { icon.hidden = true; };
  const hands = [0, 1].map(() => Object.assign(document.createElement('img'), { className: 'chef-hand', alt: '', draggable: false, hidden: true }));
  w.hasHands.then(ok => hands.forEach(h => { h.src = art + 'mochi-hand.webp'; h.hidden = !ok; }));
  rig.append(hands[1], sprite, icon, hands[0]);
  const shadow = Object.assign(document.createElement('span'), { className: 'chef-shadow' });
  el.querySelector('.chef-figure').replaceChildren(shadow, rig, el.querySelector('.zz'));
  return { id, el, rig, sprite, icon, hands, shadow, habit: HABITS[id], x: 50, y: 70, ring: 0, turnAt: 0, queue: [], task: null,
    phase: 0, act: null, actT: 0, hop: 0, pokes: [], state: LIVE.has(id) ? 'unknown' : 'soon', nextIdle: 0, placed: false };
}

function place(w, chef) {
  chef.cancelDelivery?.();  // a carried ticket is dropped, not left floating over the chef's home spot
  const h = home(w, chef);
  Object.assign(chef, { x: h.x, y: h.y, ring: FACE[h.face], queue: [], task: null, act: null, walking: false, napping: false, bed: null, placed: true });
}

function measure(w) {
  const next = w.scene.clientWidth >= 640 ? 'wide' : 'tall';
  w.W = w.scene.clientWidth; w.H = w.scene.clientHeight;
  if (next !== w.layout || !w.chefs.every(c => c.placed)) { w.layout = next; w.chefs.forEach(c => place(w, c)); }
  w.scene.querySelectorAll('.prop').forEach(p => { p.style.zIndex = Math.round(parseFloat(getComputedStyle(p).getPropertyValue('--y')) * 10) || 1; });
  w.scene.querySelector('.pass').style.zIndex = 985;
  layoutNook(w.nook, w.layout);
  w.chefs.forEach(c => render(w, c, performance.now()));
}

function render(w, chef, time) {
  const still = w.reduced.matches, width = SIZE[w.layout].width * w.W / 100 * (chef.habit.scale ?? 1);
  put(chef.el, 'width', width.toFixed(1) + 'px');
  put(chef.el, 'transform', `translate(${(chef.x * w.W / 100 - width / 2).toFixed(1)}px, ${(chef.y * w.H / 100 - width).toFixed(1)}px) scale(${depth(w, chef.y).toFixed(3)})`);
  put(chef.el, 'zIndex', String(bedDepth(chef, AWAKE.includes(chef.state)) ?? Math.round(chef.y * 10)));  // on a bed: between it and its rim
  if (chef.napClass !== Boolean(chef.napping)) { chef.napClass = Boolean(chef.napping); chef.el.classList.toggle('is-napping', chef.napClass); }
  let [view, flip] = RING[chef.ring];
  if (!w.views.has(view)) { view = 'front'; flip = chef.ring >= 5; }
  const src = w.views.has('front') ? `${w.artBase}mochi-${view}.webp` : w.artBase + 'mochi.webp';
  if (chef.src !== src) { chef.src = src; chef.sprite.src = src; }
  const m = bodyMotion(chef, time, still);
  put(chef.rig, 'transform', `translateY(${(-m.lift).toFixed(1)}%) rotate(${(flip ? -m.rot : m.rot).toFixed(1)}deg) scale(${((flip ? -1 : 1) * m.sx).toFixed(3)}, ${m.sy.toFixed(3)})`);
  put(chef.shadow, 'transform', `translateX(-50%) scale(${(1 - m.lift / 60).toFixed(3)})`);
  HANDS[view].forEach(([hx, hy, front], i) => {
    const [dx, dy] = handOffsets(chef, i, time, still), hand = chef.hands[i];
    put(hand, 'transform', `translate(${((hx + dx) * width / 100).toFixed(1)}px, ${((hy + dy) * width / 100).toFixed(1)}px) translate(-50%, -50%) scale(${hx < 50 ? -1 : 1}, 1)`);
    put(hand, 'zIndex', front ? '3' : '1');  // the thumb points outwards on both sides
  });
  if (chef.say) placeSay(chef.say, chef.x * w.W / 100, chef.y * w.H / 100 - width * depth(w, chef.y), w.W);
  const at = ICON[view];
  put(chef.icon, 'visibility', at ? 'visible' : 'hidden');
  if (at) put(chef.icon, 'transform', `translate(${(at[0] * width / 100).toFixed(1)}px, ${(at[1] * width / 100).toFixed(1)}px) translate(-50%, -50%)`);
}

function frame(w, now) {
  requestAnimationFrame(next => frame(w, next));  // scheduled first, so one chef's error never stops the kitchen
  const dt = Math.min(0.05, (now - w.last) / 1000);
  w.last = now;
  if (!w.visible || document.hidden) return;
  for (const chef of w.chefs) {
    try {
      if (chef.hop > 0) chef.hop = Math.max(0, chef.hop - dt / 0.55);
      if (w.reduced.matches) settle(w, chef); else step(w, chef, now, dt);
      render(w, chef, now);
    } catch (error) {
      console.error('Mochi kitchen: chef ' + chef.id + ' reset', error);
      place(w, chef);
    }
  }
  pressBeds(w.nook, w.byId, w.reduced.matches);
}

/** A tap on empty floor sends the nearest working chef over to have a look. */
function floorTap(w, e) {
  if (w.reduced.matches || e.target.closest('.chef, button')) return;
  const r = w.scene.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
  if (!inside([x, y], FLOOR[w.layout])) return;
  const near = w.chefs.filter(c => c.state === 'working' && !c.habit.stays && !c.delivering)
    .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
  if (!near) return;
  burst(w.scene, { x, y, icon: 'sparkle', count: 1, rise: 0 });
  Object.assign(near, { queue: [{ walk: [x, y] }, { face: 0 }, { act: 'look', ms: 1800 }], task: null, nextIdle: performance.now() + 4000 });
}

/** The chef's reaction to a tap: its signature first, then a spin, jump or wave; four quick taps make it dizzy. */
function poke(w, id) {
  const chef = w.byId[id], now = performance.now();
  if (!chef) return;
  if (chef.delivering) { if (!w.reduced.matches) chef.hop = 1; return; }  // busy with a ticket: a happy hop, no second bubble
  chef.pokes = [...chef.pokes.filter(t => now - t < 2500), now];
  const asleep = ['resting', 'unknown'].includes(chef.state);
  const name = chef.pokes.length >= 4 ? 'dizzy' : asleep ? 'sleepy' : chef.pokes.length === 1 ? chef.habit.signature
    : ['spin', 'jump', 'wave', chef.habit.signature][Math.floor(Math.random() * 4)];
  if (chef.pokes.length >= 4) chef.pokes = [];
  if (w.reduced.matches) { bubble(w.scene, chef, name); return; }
  Object.assign(chef, { task: null, act: null, nextIdle: now + 2500 });
  chef.queue = REACTIONS[name](chef, { scene: w.scene, layout: w.layout, hop: () => { chef.hop = 1; } });
}

/** Carries a real ticket, as a text bubble above the chef's head, to the Head Chef, who stamps it; true once handed over. */
async function deliver(w, item, text) {
  const chef = w.byId[item.chef], head = w.byId.head;
  if (!chef || !head || w.reduced.matches || !w.visible || document.hidden || !AWAKE.includes(chef.state)) return false;
  const [px, py] = chef === head ? [chef.x, chef.y] : spot(w.layout, 'pass');
  chef.say = createSay(w.sayLayer, chef.id, text, w.artBase);
  chef.delivering = true;
  const arrived = await Promise.race([new Promise(resolve => {
    chef.cancelDelivery = () => resolve(false);  // place() calls it when a resize resets the chef
    Object.assign(chef, { task: null, act: null });
    chef.queue = [{ walk: [px, py] }, { face: ringFor(head.x - px, head.y - py) ?? 6 }, { then: () => resolve(true) }];
  }), wait(15000).then(() => false)]);
  chef.delivering = false;
  chef.cancelDelivery = null;
  const say = chef.say;
  chef.say = null;
  if (!arrived) { say.el.remove(); return false; }
  head.task = null;
  head.queue = [{ face: ringFor(chef.x - head.x, chef.y - head.y) ?? 2 }, { wait: 300 }, { act: 'stamp', ms: 700 }, { face: 0 }];
  const [cx, cy] = COUNTER[w.layout], headWidth = SIZE[w.layout].width * w.W / 100 * (head.habit.scale ?? 1);
  w.scene.classList.add('has-handover');  // the day's count steps aside while the ticket sits on the counter
  try {
    await handOver(say, { x: cx * w.W / 100, y: cy * w.H / 100 },
      { x: head.x * w.W / 100, y: head.y * w.H / 100 - headWidth * depth(w, head.y) * 0.3 },
      () => burst(w.scene, { x: head.x, y: head.y - 14, icon: 'check', count: 1, rise: 6 }));
  } finally {
    w.scene.classList.remove('has-handover');
  }
  const h = home(w, chef);
  chef.nextIdle = performance.now() + 1500;
  chef.queue.push({ wait: 400 }, { walk: [h.x, h.y] }, { face: FACE[h.face] });
  return true;
}

export function createWorld({ scene, artBase = '/kitchen/art/' }) {
  const w = { scene, artBase, layout: 'tall', W: 1, H: 1, visible: true, last: performance.now(), pointer: null, views: new Set(),
    reduced: matchMedia('(prefers-reduced-motion: reduce)') };
  w.hasHands = new Promise(resolve => {
    const probe = new Image();
    probe.onload = () => resolve(true); probe.onerror = () => resolve(false); probe.src = artBase + 'mochi-hand.webp';
  });
  w.nook = buildNook(scene, artBase);
  w.sayLayer = Object.assign(document.createElement('div'), { className: 'say-layer' });
  w.sayLayer.setAttribute('aria-hidden', 'true');
  scene.append(w.sayLayer);
  w.chefs = [...scene.querySelectorAll('.chef')].map(el => buildChef(w, el));
  w.byId = Object.fromEntries(w.chefs.map(c => [c.id, c]));
  // Views whose turnaround art exists; until the front view loads, every chef uses the original Mochi art.
  VIEWS.forEach(view => {
    const probe = new Image();
    probe.onload = () => { w.views.add(view); w.chefs.forEach(c => render(w, c, performance.now())); };
    probe.src = `${artBase}mochi-${view}.webp`;
  });
  new ResizeObserver(() => measure(w)).observe(scene);
  new IntersectionObserver(([e]) => { w.visible = e.isIntersecting; }, { threshold: 0.05 }).observe(scene);
  scene.addEventListener('pointermove', e => {
    const r = scene.getBoundingClientRect();
    w.pointer = { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 };
  });
  scene.addEventListener('pointerleave', () => { w.pointer = null; });
  scene.addEventListener('click', e => floorTap(w, e));
  requestAnimationFrame(now => frame(w, now));
  return {
    setStates(states) { w.chefs.forEach(c => { c.state = LIVE.has(c.id) ? (states[c.id] ?? 'unknown') : 'soon'; }); },
    poke: id => poke(w, id),
    deliver: (item, text) => deliver(w, item, text),
  };
}
