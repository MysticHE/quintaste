/**
 * One-shot motion for the playfield (GAME_PLAN §13): arcs from a shelf card into a pan, pours and sprinkles from a
 * container that then leaves, plates gliding to the board and to a guest, the five-step coin pickup and small bursts.
 * Every effect calls `done` when its food has arrived, so the persistent sprite can appear exactly then.
 * Callers skip these under Reduce motion.
 */
import type * as Phaser from "phaser";
import type { Oval, Point } from "./layout";

type Scene = Phaser.Scene;
const fit = (img: Phaser.GameObjects.Image, size: number) => img.setScale(Math.min(size / img.width, size / img.height));

/** A curved flight with a little squash on landing. */
export function arc(scene: Scene, key: string, from: Point, to: Point, size: number, ms: number, done?: () => void, endSize = size) {
  if (!scene.textures.exists(key)) { done?.(); return; }
  const img = fit(scene.add.image(from.x, from.y, key).setDepth(30), size), s0 = img.scale, s1 = s0 * endSize / size;
  const c = { t: 0 }, peak = Math.min(110, Math.abs(to.x - from.x) * 0.35 + 36);
  scene.tweens.add({ targets: c, t: 1, duration: ms, ease: "Sine.easeInOut",
    onUpdate: () => { img.setPosition(from.x + (to.x - from.x) * c.t, from.y + (to.y - from.y) * c.t - peak * 4 * c.t * (1 - c.t)).setScale(s0 + (s1 - s0) * c.t); },
    onComplete: () => {
      scene.tweens.add({ targets: img, scaleX: s1 * 1.18, scaleY: s1 * 0.82, duration: 70, yoyo: true, onComplete: () => { img.destroy(); done?.(); } });
    } });
}

/** A bottle or jar flies over the pan, tips, pours a stream in the item's colour, then lifts away and fades. */
export function pour(scene: Scene, key: string, from: Point, bowl: Oval, tone: number, done: () => void) {
  if (!scene.textures.exists(key)) { done(); return; }
  const size = Math.max(34, bowl.rx * 1.05), at = { x: bowl.x + bowl.rx * 0.7, y: bowl.y - bowl.ry - size * 0.55 };
  const img = fit(scene.add.image(from.x, from.y, key).setDepth(30), size * 0.9);
  const stream = scene.add.particles(0, 0, "drop", { speedY: { min: 90, max: 150 }, speedX: { min: -30, max: -10 }, gravityY: 420, scale: { start: 0.7, end: 0.35 },
    lifespan: 340, frequency: 22, tint: tone, emitting: false }).setDepth(29);
  scene.tweens.chain({ targets: img, tweens: [
    { x: at.x, y: at.y, scale: img.scale * 1.08, duration: 240, ease: "Sine.easeOut" },
    { angle: -112, duration: 170, ease: "Back.easeOut", onComplete: () => {
      stream.setPosition(img.x - size * 0.42, img.y + size * 0.12).start();
      scene.time.delayedCall(170, done);
    } },
    { angle: -118, duration: 360 },
    { angle: -20, y: at.y - 24, alpha: 0, duration: 230, ease: "Sine.easeIn", onStart: () => stream.stop() },
  ], onComplete: () => { img.destroy(); scene.time.delayedCall(400, () => stream.destroy()); } });
}

/** A shaker or bowl flies over the pan and gives three shakes; speckles fall in, then it lifts away. */
export function sprinkle(scene: Scene, key: string, from: Point, bowl: Oval, tone: number, done: () => void) {
  if (!scene.textures.exists(key)) { done(); return; }
  const size = Math.max(32, bowl.rx * 0.95), at = { x: bowl.x + bowl.rx * 0.15, y: bowl.y - bowl.ry - size * 0.6 };
  const img = fit(scene.add.image(from.x, from.y, key).setDepth(30), size);
  const fall = scene.add.particles(0, 0, "drop", { speedY: { min: 40, max: 90 }, speedX: { min: -40, max: 40 }, gravityY: 380, scale: { start: 0.45, end: 0.3 },
    lifespan: 380, frequency: 16, tint: tone, emitting: false }).setDepth(29);
  scene.tweens.chain({ targets: img, tweens: [
    { x: at.x, y: at.y, duration: 240, ease: "Sine.easeOut", onComplete: () => { fall.setPosition(at.x, at.y + size * 0.3).start(); scene.time.delayedCall(220, done); } },
    { angle: -24, duration: 80, yoyo: true, repeat: 2, ease: "Sine.easeInOut" },
    { y: at.y - 20, alpha: 0, duration: 200, ease: "Sine.easeIn", onStart: () => fall.stop() },
  ], onComplete: () => { img.destroy(); scene.time.delayedCall(450, () => fall.destroy()); } });
}

/** A small star burst. */
export function burst(scene: Scene, at: Point, count = 8, tint?: number) {
  const e = scene.add.particles(at.x, at.y, "spark", { speed: { min: 60, max: 150 }, angle: { min: 200, max: 340 }, scale: { start: 0.8, end: 0 }, lifespan: 420,
    ...(tint !== undefined ? { tint } : {}), emitting: false }).setDepth(31);
  e.explode(count); scene.time.delayedCall(520, () => e.destroy());
}

/** A puff of smoke or steam. */
export function puff(scene: Scene, at: Point, tint: number) {
  const e = scene.add.particles(at.x, at.y, "puff", { speed: { min: 30, max: 70 }, scale: { start: 0.5, end: 1.4 }, alpha: { start: 0.6, end: 0 }, tint, lifespan: 900, emitting: false }).setDepth(31);
  e.explode(10); scene.time.delayedCall(1000, () => e.destroy());
}

/** Hearts pop up over a happy guest and drift away. */
export function hearts(scene: Scene, at: Point, count = 3) {
  for (let i = 0; i < count; i++) {
    const img = scene.add.image(at.x + (i - (count - 1) / 2) * 14, at.y, "heart").setDepth(31).setScale(0);
    scene.tweens.add({ targets: img, scale: 0.9, y: at.y - 22 - (i % 2) * 8, duration: 260, delay: i * 90, ease: "Back.easeOut",
      onComplete: () => scene.tweens.add({ targets: img, y: img.y - 18, alpha: 0, duration: 420, ease: "Sine.easeIn", onComplete: () => img.destroy() }) });
  }
}
