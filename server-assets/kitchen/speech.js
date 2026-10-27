import { wait } from './time.js';

/**
 * The text bubble a chef carries a real ticket in (owner, 27 Oct 2026): it floats above the chef's head while walking, stays
 * inside the kitchen and keeps its tail on the chef. At the pass it is set down on the counter, stamped there and tucked into the
 * Head Chef's tray, so a waiting ticket never covers a chef.
 */
const CHECK = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const GAP = 10;        // between the chef's head and the tail's tip, in px
const EDGE = 6;        // the bubble keeps this far from the kitchen's sides
const TAIL_ROOM = 14;  // the tail stays this far inside the bubble's rounded ends

export function createSay(layer, chefId, text, artBase) {
  const el = Object.assign(document.createElement('div'), { className: 'say' });
  const icon = Object.assign(document.createElement('img'), { className: 'say-icon', alt: '', src: `${artBase}icon-${chefId}.webp` });
  icon.onerror = () => icon.remove();
  const stamp = Object.assign(document.createElement('span'), { className: 'say-stamp' });
  stamp.innerHTML = CHECK;
  el.append(icon, Object.assign(document.createElement('span'), { className: 'say-text', textContent: text }), stamp);
  layer.append(el);
  const say = { el, width: el.offsetWidth, sceneWidth: 0, last: '', tail: '' };
  // Measured again once the web fonts are in, since the first measure may use the fallback font.
  document.fonts?.ready.then(() => { say.width = el.offsetWidth; say.last = ''; });
  return say;
}

/** Where the bubble goes with its tail's tip at (x, bottom) in px, clamped inside the kitchen, and where its tail points. */
function anchor(say, x, bottom) {
  const half = say.width / 2, sceneWidth = say.sceneWidth || say.el.parentElement?.clientWidth || 0;
  const left = Math.min(Math.max(x, half + EDGE), Math.max(half + EDGE, sceneWidth - half - EDGE));
  const room = Math.max(0, half - TAIL_ROOM), tail = Math.min(room, Math.max(-room, x - left));
  return { transform: `translate(${left.toFixed(1)}px, ${bottom.toFixed(1)}px) translate(-50%, -100%)`, tail: tail.toFixed(1) + 'px' };
}

function apply(say, spot) {
  if (spot.transform !== say.last) { say.last = spot.transform; say.el.style.transform = spot.transform; }
  if (spot.tail !== say.tail) { say.tail = spot.tail; say.el.style.setProperty('--tail', spot.tail); }
}

/** Keeps the bubble over the chef's head (x, top of head, in px of the scene) while it walks; writes only what changed. */
export function placeSay(say, x, top, sceneWidth) {
  if (sceneWidth !== say.sceneWidth) { say.sceneWidth = sceneWidth; say.width = say.el.offsetWidth; }  // resized: its % width changed
  apply(say, anchor(say, x, top - GAP));
}

/** Where the bubble sits on the counter now, measured afresh (the kitchen may have been resized since the last stage). */
function counterSpot(say, where) {
  const now = where();
  if (now.sceneWidth !== say.sceneWidth) { say.sceneWidth = now.sceneWidth; say.width = say.el.offsetWidth; }
  return { now, spot: anchor(say, now.counter.x, now.counter.y) };
}

/**
 * Sets the bubble down on the counter, stamps it there (`onStamp`), then tucks it into the Head Chef's tray. `where()` gives the
 * scene width, counter and tray in px, read as each stage starts.
 */
export async function handOver(say, where, onStamp) {
  const first = counterSpot(say, where).spot;
  await say.el.animate([{ transform: say.last }, { transform: first.transform }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }).finished;
  apply(say, first);  // the tail turns to its new spot only once the bubble is there
  say.el.classList.add('is-stamped');
  onStamp();
  await wait(700);
  const { now, spot } = counterSpot(say, where);
  apply(say, spot);
  await say.el.animate([
    { transform: spot.transform, opacity: 1 },
    { transform: `translate(${now.tray.x.toFixed(1)}px, ${now.tray.y.toFixed(1)}px) translate(-50%, -100%) scale(.35)`, opacity: 0 },
  ], { duration: 460, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished;
  say.el.remove();
}
