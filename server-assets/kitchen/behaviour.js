import { SIZE, ON_SHIFT, spot } from './chefs.js';
import { FACE, ringFor, turnToward } from './pose.js';
import { napSpot, leaveBed, onBed, inFootprint, detour } from './nook.js';
import { doze } from './doze.js';

/** What each chef does next: wander between its spots on its own habits, then work its tasks one at a time. */
const rand = (a, b) => a + Math.random() * (b - a);

export function home(w, chef) {
  const [x, y, face] = spot(w.layout, chef.habit.home);
  return { x, y, face };
}

/** How large a chef is at a depth: smaller towards the back wall. */
export function depth(w, y) {
  const s = SIZE[w.layout];
  return s.far + (1 - s.far) * Math.max(0, Math.min(1, (y - s.horizon) / (100 - s.horizon)));
}

/** The walk to where an off-shift chef rests: onto a bed by the step in front of it, or straight to its spot at home. */
function arrive(chef, rest, bed) {
  const sit = { walk: [rest.x, rest.y], bed };
  return [...(bed && !inFootprint(bed, [chef.x, chef.y]) ? [{ walk: bed.door, bed }, sit] : [sit]), { face: FACE[rest.face] }];
}

/** Queues the chef's next walk: to a bed in the nap nook (or home) when off duty, otherwise one of its spots and its habit there. */
export function plan(w, chef, now) {
  if (w.reduced.matches || chef.habit.speed === 0) return;
  const h = home(w, chef);
  if (!ON_SHIFT.includes(chef.state)) {
    const bed = napSpot(w.nook, chef, w.W, w.H), rest = bed ?? h;
    const there = Math.hypot(chef.x - rest.x, chef.y - rest.y) <= 1;
    chef.napping = there && Boolean(bed);
    // Still sitting on a bed it no longer has (it swapped, or has none): it keeps that bed until it has stepped off the front.
    if (!(chef.bed && onBed(chef) && chef.bed.i !== bed?.i)) chef.bed = bed;
    if (chef.napping) { chef.x = bed.x; chef.y = bed.y; }  // settles into the seat once the bed's real size is known
    if (!there) chef.queue.push(...arrive(chef, rest, bed));
    else chef.queue.push(...doze(w, chef, now));  // in bed (or at home): now and then a stretch, a dream or a little stroll
    return;
  }
  chef.napping = false;
  chef.nextDoze = null;
  leaveBed(w.nook, chef);  // back on shift: the bed is free for someone else
  if (chef.bed && !onBed(chef)) chef.bed = null;  // stepped off: drawn by its own depth from now on
  if (now < chef.nextIdle) return;
  chef.nextIdle = now + rand(...chef.habit.every);
  const options = chef.habit.spots.filter(name => {
    const [x, y] = spot(w.layout, name);
    return Math.hypot(chef.x - x, chef.y - y) > 3;
  });
  const goHome = !chef.habit.stays && (Math.random() < 0.3 || !options.length);
  if (!goHome && !options.length) return;
  const [x, y, face] = goHome ? [h.x, h.y, h.face] : spot(w.layout, options[Math.floor(Math.random() * options.length)]);
  chef.queue.push({ walk: [x, y] }, { face: FACE[face] }, { act: chef.habit.act, ms: rand(...chef.habit.linger) });
}

/** With reduced motion nobody walks: an off-shift chef simply sits in its bed, and an on-shift one stands at home. */
export function settle(w, chef) {
  if (chef.habit.speed === 0) return;
  const bed = ON_SHIFT.includes(chef.state) ? null : napSpot(w.nook, chef, w.W, w.H);
  if (!bed) leaveBed(w.nook, chef);
  const spot = bed ?? home(w, chef);
  Object.assign(chef, { x: spot.x, y: spot.y, ring: FACE[spot.face], napping: Boolean(bed), bed, walking: false, queue: [], task: null });
}

/** Advances the current task by `dt` seconds; picks the next task, or plans, when there is none. */
export function step(w, chef, now, dt) {
  if (!chef.task) chef.task = chef.queue.shift() ?? null;
  if (!chef.task) { plan(w, chef, now); glance(w, chef, now); return; }
  const t = chef.task;
  if (t.walk) {
    // Off a bed by its front: a chef in one first steps down in front of it, so it never slides behind the other beds.
    if (!t.exit && chef.bed && onBed(chef) && !inFootprint(chef.bed, t.walk)) {
      chef.queue.unshift(t);
      chef.task = { walk: chef.bed.door, exit: true, slow: t.slow, sleepwalk: t.sleepwalk };
      return;
    }
    // Round the front of any bed the straight line would cut behind (checked once per leg, at most a few turns in a row).
    if (!t.checked && (t.turns ?? 0) < 3) {
      t.checked = true;
      const via = detour(w.nook, w.W, w.H, [chef.x, chef.y], t.walk);
      if (via) {
        chef.queue.unshift(t);
        chef.task = { walk: via, turns: (t.turns ?? 0) + 1, slow: t.slow, sleepwalk: t.sleepwalk };
        return;
      }
    }
    if ('bed' in t && !onBed(chef)) chef.bed = t.bed;  // off its old bed: from here it is drawn by the one it is heading for
    chef.napping = false;  // up and about: its bed springs back until it sits down again
    chef.sleepwalk = Boolean(t.sleepwalk);  // paws out and a shuffle, only on a sleepwalk's own steps
    const [tx, ty] = t.walk, dx = (tx - chef.x) * w.W / 100, dy = (ty - chef.y) * w.H / 100, dist = Math.hypot(dx, dy);
    if (dist < 2) { chef.x = tx; chef.y = ty; chef.task = null; chef.walking = false; return; }
    const speed = chef.habit.speed * (t.slow ?? 1) * (SIZE[w.layout].width * w.W / 100) * 1.25 * depth(w, chef.y);
    turnToward(chef, ringFor(dx, dy), now);
    const move = Math.min(dist, speed * dt);
    chef.x += (dx / dist) * move * 100 / w.W;
    chef.y += (dy / dist) * move * 100 / w.H;
    chef.walking = true;
    chef.phase += dt * 3.4;
  } else if (t.face != null) {
    if (turnToward(chef, t.face, now)) chef.task = null;
  } else if (t.act) {
    if (chef.act !== t.act) { chef.act = t.act; chef.actT = 0; }
    chef.actT += dt * 1000;
    if (chef.actT >= t.ms) { chef.act = null; chef.task = null; }
  } else if (t.spin) {
    if (now >= chef.turnAt) { chef.ring = (chef.ring + 1) % 8; chef.turnAt = now + t.spin; if (--t.left <= 0) chef.task = null; }
  } else if (t.then) {
    chef.task = null;
    t.then();
  } else if (t.wait != null) {
    t.wait -= dt * 1000;
    if (t.wait <= 0) chef.task = null;
  } else {
    chef.task = null;  // an unknown task is dropped so the chef never stalls
  }
}

/** Idle chefs that are awake turn to look at a nearby pointer. */
export function glance(w, chef, now) {
  if (!w.pointer || chef.walking || chef.act || !['working', 'reviewing'].includes(chef.state)) return;
  const dx = (w.pointer.x - chef.x) * w.W / 100, dy = (w.pointer.y - chef.y) * w.H / 100;
  if (Math.hypot(dx, dy) < w.W * 0.28) turnToward(chef, ringFor(dx, dy), now, 110);
}
