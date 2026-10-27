/** What each chef does when poked, and the little icons that pop out. Each reaction returns the chef's next tasks. */
const SVG = {
  sparkle: '<svg viewBox="0 0 24 24"><path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5z" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M6.8 12.4l3.4 3.4 7-7.2" fill="none" stroke="var(--card)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 16.7l-5.4 2.9 1-6.1-4.4-4.3 6.1-.8z" fill="currentColor"/></svg>',
};
let layer = null;

function fxLayer(scene) {
  if (!layer || !scene.contains(layer)) {
    layer = Object.assign(document.createElement('div'), { className: 'fx' });
    layer.setAttribute('aria-hidden', 'true');
    scene.append(layer);
  }
  return layer;
}

function particle(icon) {
  const el = document.createElement('span');
  el.className = 'particle particle--' + (SVG[icon] ? icon : 'art');
  if (SVG[icon]) el.innerHTML = SVG[icon];
  else {
    const img = Object.assign(document.createElement('img'), { src: `/kitchen/art/icon-${icon}.webp`, alt: '' });
    img.onerror = () => { el.className = 'particle particle--sparkle'; el.innerHTML = SVG.sparkle; };
    el.append(img);
  }
  return el;
}

/** Icons that rise from a point (in % of the scene) and fade. */
export function burst(scene, { x, y, icon, count = 5, rise = 14, spread = 9 }) {
  const fx = fxLayer(scene), W = scene.clientWidth / 100, H = scene.clientHeight / 100;
  for (let i = 0; i < count; i++) {
    const el = particle(icon);
    el.style.left = x + '%';
    el.style.top = y + '%';
    fx.append(el);
    const dx = (Math.random() - 0.5) * spread * 2, dy = rise * (0.7 + Math.random() * 0.6), turn = (Math.random() - 0.5) * 50;
    el.animate([
      { transform: 'translate(-50%, -50%) scale(.4)', opacity: 0 },
      { transform: `translate(calc(-50% + ${dx * W * 0.5}px), calc(-50% - ${dy * H * 0.5}px)) scale(1.1) rotate(${turn * 0.5}deg)`, opacity: 1, offset: 0.35 },
      { transform: `translate(calc(-50% + ${dx * W}px), calc(-50% - ${dy * H}px)) scale(.8) rotate(${turn}deg)`, opacity: 0 },
    ], { duration: 950 + Math.random() * 450, delay: i * 70, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }).finished.then(() => el.remove());
  }
}

/** A thought bubble with the chef's icon above its head (Mochi never speaks). */
export function bubble(scene, chef, kind) {
  chef.el.querySelector('.bubble')?.remove();
  const el = Object.assign(document.createElement('span'), { className: 'bubble' });
  el.setAttribute('aria-hidden', 'true');
  el.append(kind === 'sleepy' ? Object.assign(document.createElement('span'), { className: 'bubble-z', textContent: 'z z' }) : particle(chef.id));
  chef.el.append(el);
  el.animate([{ opacity: 0, transform: 'translate(-50%, 8%) scale(.6)' }, { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.2 },
    { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.8 }, { opacity: 0, transform: 'translate(-50%, -10%) scale(.9)' }],
  { duration: 1700, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }).finished.then(() => el.remove());
}

const head = (chef, layout) => ({ x: chef.x, y: chef.y - (layout === 'wide' ? 15 : 13) * (chef.habit.scale ?? 1) });
const pop = (ctx, chef, icon, count = 5) => () => burst(ctx.scene, { ...head(chef, ctx.layout), icon, count });

export const REACTIONS = {
  spin: (chef, ctx) => [{ then: () => { ctx.hop(); pop(ctx, chef, 'sparkle', 3)(); } }, { spin: 55, left: 8 }],
  jump: (chef, ctx) => [{ then: () => { ctx.hop(); pop(ctx, chef, chef.id)(); } }, { act: 'cheer', ms: 650 }],
  wave: (chef, ctx) => [{ face: 0 }, { then: () => bubble(ctx.scene, chef) }, { act: 'wave', ms: 1300 }],
  stamp: (chef, ctx) => [{ face: 0 }, { act: 'stamp', ms: 900 }, { then: pop(ctx, chef, 'head', 5) }],
  pin: (chef, ctx) => [{ face: 0 }, { then: () => { ctx.hop(); pop(ctx, chef, 'scout', 4)(); } }, { act: 'cheer', ms: 600 }],
  flip: (chef, ctx) => [{ face: 6 }, { then: pop(ctx, chef, 'wok', 6) }, { act: 'toss', ms: 1100 }],
  flowers: (chef, ctx) => [{ face: 0 }, { then: pop(ctx, chef, 'host', 6) }, { act: 'wave', ms: 1200 }],
  splash: (chef, ctx) => [{ act: 'paint', ms: 1000 }, { then: pop(ctx, chef, 'artist', 5) }],
  hearts: (chef, ctx) => [{ act: 'stir', ms: 900 }, { then: pop(ctx, chef, 'writer', 5) }],
  moon: (chef, ctx) => [{ then: () => { ctx.hop(); bubble(ctx.scene, chef); } }, { act: 'look', ms: 1200 }],
  plaster: (chef, ctx) => [{ then: () => { ctx.hop(); pop(ctx, chef, 'fixer', 4)(); } }, { act: 'cheer', ms: 600 }],
  snow: (chef, ctx) => [{ then: pop(ctx, chef, 'safety', 6) }, { act: 'shiver', ms: 900 }],
  sleepy: (chef, ctx) => [{ then: () => { ctx.hop(); bubble(ctx.scene, chef, 'sleepy'); } }, { act: 'look', ms: 900 }],
  dizzy: (chef, ctx) => [{ then: () => { ctx.hop(); pop(ctx, chef, 'star', 6)(); } }, { spin: 40, left: 16 }, { act: 'wobble', ms: 1400 }],
};
