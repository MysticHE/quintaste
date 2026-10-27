import { SIZE, spot } from './chefs.js';
import { FACE, ringFor, turnToward } from './pose.js';

/** What each chef does next: wander between its spots on its own habits, then work its tasks one at a time. */
const rand = (a, b) => a + Math.random() * (b - a);
const AWAKE = ['working', 'reviewing', 'waiting'];

export function home(w, chef) {
  const [x, y, face] = spot(w.layout, chef.habit.home);
  return { x, y, face };
}

/** How large a chef is at a depth: smaller towards the back wall. */
export function depth(w, y) {
  const s = SIZE[w.layout];
  return s.far + (1 - s.far) * Math.max(0, Math.min(1, (y - s.horizon) / (100 - s.horizon)));
}

/** Queues the chef's next walk: home when off duty, otherwise one of its spots (sometimes home) and its habit there. */
export function plan(w, chef, now) {
  if (w.reduced.matches || chef.habit.speed === 0) return;
  const h = home(w, chef);
  if (!AWAKE.includes(chef.state)) {
    if (Math.hypot(chef.x - h.x, chef.y - h.y) > 1) chef.queue.push({ walk: [h.x, h.y] }, { face: FACE[h.face] });
    return;
  }
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

/** Advances the current task by `dt` seconds; picks the next task, or plans, when there is none. */
export function step(w, chef, now, dt) {
  if (!chef.task) chef.task = chef.queue.shift() ?? null;
  if (!chef.task) { plan(w, chef, now); glance(w, chef, now); return; }
  const t = chef.task;
  if (t.walk) {
    const [tx, ty] = t.walk, dx = (tx - chef.x) * w.W / 100, dy = (ty - chef.y) * w.H / 100, dist = Math.hypot(dx, dy);
    if (dist < 2) { chef.x = tx; chef.y = ty; chef.task = null; chef.walking = false; return; }
    const speed = chef.habit.speed * (SIZE[w.layout].width * w.W / 100) * 1.25 * depth(w, chef.y);
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
