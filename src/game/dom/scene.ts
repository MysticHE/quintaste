/**
 * Phaser playfield: backdrop, guests behind the counter, stations with heat, steam and smoke, the plating board,
 * plates on mats, flying items and coins. Visual state is derived from the simulation every frame, so the scene
 * never owns game rules; taps and drags are reported to the DOM root.
 */
import * as Phaser from "phaser";
import { DISHES, STATIONS, type StationKind } from "../content/dishes";
import { GUESTS } from "../content/guests";
import { ITEMS } from "../content/items";
import * as sim from "../sim/engine";
import type { Layout } from "./layout";

export type SceneHooks = {
  onStation(kind: StationKind): void; onPlate(slot: number): void; onGuest(orderId: string): void;
  onServeDrag(slot: number, orderId: string): void; onPlateDrag(kind: StationKind): void; ready(): void;
};
type Vec = { x: number; y: number };
/** Pixel density for a crisp canvas on phones, capped to keep texture memory reasonable. */
export const DPR = typeof window !== "undefined" ? Math.min(2.5, Math.max(1, window.devicePixelRatio || 1)) : 1;

/** Canvas colours come from the DOM layer's CSS tokens (styles.ts), so the game keeps one palette. */
const TOKENS = { light: "--fx-light", spark: "--fx-spark", flame: "--fx-flame", flameHot: "--fx-flame-hot", smoke: "--fx-smoke", char: "--fx-char",
  track: "--fx-ring-track", ready: "--fx-ready", warn: "--fx-warn", progress: "--fx-progress", coin: "--fx-coin", coinEdge: "--fx-coin-edge" } as const;
type Palette = Record<keyof typeof TOKENS, number>;
function readPalette(): Palette {
  const el = typeof document !== "undefined" ? document.querySelector(".rh") : null, css = el ? getComputedStyle(el) : null;
  const out = {} as Palette;
  (Object.keys(TOKENS) as (keyof typeof TOKENS)[]).forEach(k => {
    const v = css?.getPropertyValue(TOKENS[k]).trim() ?? ""; out[k] = /^#[0-9a-f]{6}$/i.test(v) ? parseInt(v.slice(1), 16) : 0x808080;
  });
  return out;
}

export class Playfield extends Phaser.Scene {
  run!: sim.Run; pal!: Palette; L!: Layout; art: Record<string, string> = {}; hooks!: SceneHooks; reduced = false;
  private guestSprites = new Map<string, Phaser.GameObjects.Image>();
  private stationSprites = new Map<StationKind, { img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Ellipse; ring: Phaser.GameObjects.Graphics;
    items: Phaser.GameObjects.Image[]; steam: Phaser.GameObjects.Particles.ParticleEmitter; smoke: Phaser.GameObjects.Particles.ParticleEmitter; zone: Phaser.GameObjects.Zone }>();
  private plates: { base: Phaser.GameObjects.Image; dish: Phaser.GameObjects.Image; zone: Phaser.GameObjects.Zone }[] = [];
  private mats: Phaser.GameObjects.Image[] = [];
  private select!: Phaser.GameObjects.Graphics;
  private shakeUntil = new Map<number, number>();

  constructor() { super("playfield"); }
  init(data: { run: sim.Run; layout: Layout; art: Record<string, string>; hooks: SceneHooks; reduced: boolean }) {
    this.run = data.run; this.L = data.layout; this.art = data.art; this.hooks = data.hooks; this.reduced = data.reduced; this.pal = readPalette();
  }
  preload() {
    // Image elements instead of XHR, so file:// art in release builds loads and stays untainted for WebGL.
    this.load.imageLoadType = "HTMLImageElement";
    // Only what this level uses: its stations, guests, dishes and every ingredient its dishes accept.
    const r = this.run, dishes = [...new Set(r.guests.map(g => g.dishId))].map(id => DISHES[id]);
    const items = new Set<string>([...r.level.distractors]);
    dishes.forEach(d => d.parts.forEach(p => p.stages.forEach(st => st.slots.forEach(sl => sl.accepts.forEach(a => items.add(a))))));
    const keys = new Set(["rh-bg", "rh-counter", "plate", "board", ...Object.keys(r.stations).map(k => STATIONS[k as StationKind].art),
      ...r.guests.flatMap(g => [GUESTS[g.guestId].art, GUESTS[g.guestId].artNo ?? GUESTS[g.guestId].art]), ...dishes.map(d => d.art),
      ...[...items].map(i => ITEMS[i]?.art).filter((k): k is string => !!k)]);
    keys.forEach(k => { if (this.art[k]) this.load.image(k, this.art[k]); });
  }
  create() {
    // The canvas is drawn at the screen's pixel density and shown at CSS size; the camera zoom keeps layout in CSS px.
    this.cameras.main.setOrigin(0, 0).setZoom(DPR);
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const P = this.pal;
    g.fillStyle(P.coin).fillCircle(16, 16, 15).lineStyle(3, P.coinEdge).strokeCircle(16, 16, 13); g.generateTexture("coin", 32, 32); g.clear();
    g.fillStyle(P.light).fillCircle(16, 16, 16); g.generateTexture("puff", 32, 32); g.clear();
    g.fillStyle(P.spark).fillCircle(6, 6, 6); g.generateTexture("spark", 12, 12); g.destroy();
    this.build(); this.hooks.ready();
  }
  /** Rebuild every object for a new layout (resize). */
  build() {
    this.children.removeAll(true); this.guestSprites.clear(); this.stationSprites.clear(); this.plates = []; this.mats = [];
    const L = this.L;
    if (this.textures.exists("rh-bg")) this.cover(this.add.image(0, 0, "rh-bg"), L.guests.x, L.guests.y - L.recipe.h, L.guests.w, L.guests.h + L.recipe.h);
    this.run.guests.forEach(gr => { const img = this.add.image(-100, -100, GUESTS[gr.guestId].art).setVisible(false).setDepth(2); this.guestSprites.set(gr.orderId, img); });
    if (this.textures.exists("rh-counter")) this.cover(this.add.image(0, 0, "rh-counter").setDepth(3), L.counter.x, L.counter.y, L.counter.w, L.counter.h + 6);
    L.mats.forEach(m => { const img = this.add.image(m.x + m.w / 2, m.y + m.h / 2, "plate").setDepth(4).setVisible(false); this.fit(img, m.w, m.h * 1.3); this.mats.push(img); });
    L.seats.forEach((s, i) => {
      const z = this.add.zone(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h + L.counter.h).setInteractive({ useHandCursor: true }).setDepth(6);
      z.on("pointerup", () => { const gr = this.run.guests.find(x => x.seat === i + 1 && x.state === "waiting"); if (gr) this.hooks.onGuest(gr.orderId); });
    });
    this.select = this.add.graphics().setDepth(7);
    (Object.keys(L.stations) as StationKind[]).forEach(kind => {
      const r = L.stations[kind], cfg = STATIONS[kind];
      const glow = this.add.ellipse(r.x + r.w / 2, r.y + r.h * 0.82, r.w * 0.9, r.h * 0.26, this.pal.flame, 0).setDepth(4);
      const img = this.add.image(r.x + r.w / 2, r.y + r.h / 2, cfg.art).setDepth(5); this.fit(img, r.w * 0.92, r.h * 0.86);
      const ring = this.add.graphics().setDepth(8);
      const steam = this.add.particles(r.x + r.w / 2, r.y + r.h * 0.35, "puff", { speedY: { min: -40, max: -70 }, speedX: { min: -10, max: 10 }, scale: { start: 0.35, end: 0.9 },
        alpha: { start: 0.45, end: 0 }, lifespan: 1300, frequency: 220, emitting: false }).setDepth(9);
      const smoke = this.add.particles(r.x + r.w / 2, r.y + r.h * 0.35, "puff", { speedY: { min: -50, max: -90 }, speedX: { min: -16, max: 16 }, scale: { start: 0.4, end: 1.2 },
        alpha: { start: 0.55, end: 0 }, tint: this.pal.smoke, lifespan: 1200, frequency: 120, emitting: false }).setDepth(9);
      const zone = this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h).setInteractive({ useHandCursor: true, draggable: true }).setDepth(10);
      zone.on("pointerup", (p: Phaser.Input.Pointer) => { if (p.getDistance() < 10) this.hooks.onStation(kind); });
      zone.on("dragend", (p: Phaser.Input.Pointer) => { if (p.getDistance() >= 10 && p.y > L.board[0].y - 20 && p.x < L.board[2].x + L.board[2].w + 10) this.hooks.onPlateDrag(kind); });
      this.stationSprites.set(kind, { img, glow, ring, items: [], steam, smoke, zone });
    });
    L.board.forEach((b, i) => {
      const base = this.add.image(b.x + b.w / 2, b.y + b.h / 2, "plate").setDepth(5); this.fit(base, b.w * 1.05, b.h * 1.05);
      const dish = this.add.image(base.x, base.y - 2, "plate").setDepth(6).setVisible(false);
      const zone = this.add.zone(base.x, base.y, b.w, b.h * 1.4).setInteractive({ useHandCursor: true, draggable: true }).setDepth(10);
      zone.on("pointerup", (p: Phaser.Input.Pointer) => { if (p.getDistance() < 10) this.hooks.onPlate(i); });
      zone.on("drag", (_p: Phaser.Input.Pointer, x: number, y: number) => { if (this.run.board[i]) dish.setPosition(x, y).setDepth(20); });
      zone.on("dragend", (p: Phaser.Input.Pointer) => {
        dish.setPosition(base.x, base.y - 2).setDepth(6); zone.setPosition(base.x, base.y);
        const seat = L.seats.findIndex(s => p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= L.counter.y + L.counter.h);
        const gr = seat >= 0 ? this.run.guests.find(x => x.seat === seat + 1 && x.state === "waiting") : undefined;
        if (gr && this.run.board[i]) this.hooks.onServeDrag(i, gr.orderId);
      });
      this.plates.push({ base, dish, zone });
    });
  }
  private fit(img: Phaser.GameObjects.Image, w: number, h: number) { const s = Math.min(w / img.width, h / img.height); img.setScale(s); return img; }
  private cover(img: Phaser.GameObjects.Image, x: number, y: number, w: number, h: number) {
    const s = Math.max(w / img.width, h / img.height); img.setScale(s).setPosition(x + w / 2, y + h / 2);
    img.setCrop((img.width - w / s) / 2, (img.height - h / s) / 2, w / s, h / s); return img;
  }
  setLayout(L: Layout) { this.L = L; this.scale.resize(L.w * DPR, L.h * DPR); this.scale.setZoom(1 / DPR); this.cameras.main.setZoom(DPR); this.build(); }

  update() {
    if (!this.run) return;
    const L = this.L, t = this.time.now / 1000;
    for (const gr of this.run.guests) {
      const img = this.guestSprites.get(gr.orderId)!; if (!img) continue;
      const seat = L.seats[gr.seat - 1];
      if (!seat || gr.state === "queue" || gr.state === "gone") { img.setVisible(false); continue; }
      const tex = gr.state === "leaving" && gr.order === "expired" ? GUESTS[gr.guestId].art : (this.shakeUntil.get(gr.seat) ?? 0) > t && GUESTS[gr.guestId].artNo ? GUESTS[gr.guestId].artNo! : GUESTS[gr.guestId].art;
      if (img.texture.key !== tex && this.textures.exists(tex)) img.setTexture(tex);
      const h = seat.h * 0.98, s = h / img.height, home: Vec = { x: seat.x + seat.w / 2, y: L.counter.y + L.counter.h * 0.25 - h * 0.36 };
      const edge = gr.seat <= L.seats.length / 2 ? -seat.w : L.w + seat.w;
      let x = home.x, y = home.y, alpha = 1, rot = 0, sc = s;
      if (gr.state === "walking") { const k = Math.min(1, gr.st); x = edge + (home.x - edge) * (1 - (1 - k) * (1 - k)); y = home.y - (this.reduced ? 0 : Math.abs(Math.sin(k * Math.PI * 3)) * 8); }
      else if (gr.state === "leaving") { const k = Math.min(1, gr.st); x = home.x + (edge - home.x) * k * k; alpha = 1 - k * 0.6; }
      else if (gr.state === "eating" && !this.reduced) y = home.y + Math.abs(Math.sin(gr.st * Math.PI * 3)) * 4;
      else if (!this.reduced) sc = s * (1 + Math.sin(t * 2 + gr.seat) * 0.008);
      if ((this.shakeUntil.get(gr.seat) ?? 0) > t && !this.reduced) rot = Math.sin(t * 40) * 0.05;
      img.setVisible(true).setPosition(x, y).setScale(sc).setAlpha(alpha).setRotation(rot);
    }
    L.mats.forEach((m, i) => {
      const gr = this.run.guests.find(x => x.seat === i + 1 && x.state === "eating");
      const img = this.mats[i];
      if (gr && this.textures.exists(DISHES[gr.dishId].art)) { if (img.texture.key !== DISHES[gr.dishId].art) { img.setTexture(DISHES[gr.dishId].art); this.fit(img, m.w, m.h * 1.4); } img.setVisible(true); }
      else img.setVisible(false);
    });
    this.select.clear();
    for (const [kind, v] of this.stationSprites) {
      const st = this.run.stations[kind]!, r = L.stations[kind], cfg = STATIONS[kind], pr = st.part;
      if (this.run.selected === kind) this.select.lineStyle(3, this.pal.light, 0.95).strokeRoundedRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6, 14);
      v.glow.setFillStyle(st.H >= cfg.scorch ? this.pal.flameHot : this.pal.flame, cfg.heat ? Math.min(0.7, st.H * 0.75) : 0);
      const cooking = !!pr && pr.state === "cooking";
      v.steam.emitting = !this.reduced && cooking && pr!.progress > 0.4;
      v.smoke.emitting = !this.reduced && cfg.heat && st.H >= cfg.scorch && !!pr;
      // Items in the station toss gently while cooking.
      const ids = pr ? pr.items.filter(i => i.stage === pr.stage || pr.state === "ready").map(i => i.id) : [];
      while (v.items.length > ids.length) v.items.pop()!.destroy();
      ids.forEach((id, i) => {
        const key = ITEMS[id]?.art; if (!key || !this.textures.exists(key)) return;
        let im = v.items[i]; if (!im) { im = this.add.image(0, 0, key).setDepth(6); v.items[i] = im; }
        if (im.texture.key !== key) im.setTexture(key);
        const n = ids.length, cx = r.x + r.w / 2 + (i - (n - 1) / 2) * r.w * 0.22, toss = cooking && !this.reduced ? Math.abs(Math.sin(t * 4 + i)) * r.h * 0.08 : 0;
        this.fit(im, r.w * 0.3, r.h * 0.3); im.setPosition(cx, r.y + r.h * 0.42 - toss);
        im.setTint(pr!.state === "scorched" ? this.pal.char : this.pal.light);
      });
      v.ring.clear();
      if (pr) {
        const cx = r.x + r.w * 0.86, cy = r.y + r.h * 0.16, rad = Math.min(r.w, r.h) * 0.11;
        const stages = sim.partOf(pr).stages.length, done = (pr.stage + (pr.state === "ready" ? 1 : pr.progress)) / stages;
        v.ring.fillStyle(this.pal.light, 0.9).fillCircle(cx, cy, rad + 3).lineStyle(4, this.pal.track).strokeCircle(cx, cy, rad);
        v.ring.lineStyle(4, pr.state === "ready" ? this.pal.ready : pr.state === "scorched" || pr.state === "split" ? this.pal.warn : this.pal.progress)
          .beginPath().arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, done)).strokePath();
      }
    }
    this.run.board.forEach((p, i) => {
      const v = this.plates[i]; if (!v) return;
      if (!p) { v.dish.setVisible(false); return; }
      const key = DISHES[p.dishId].art;
      if (this.textures.exists(key)) { if (v.dish.texture.key !== key) v.dish.setTexture(key); this.fit(v.dish, L.board[i].w * 0.95, L.board[i].h * 1.05); }
      v.dish.setVisible(true).setAlpha(sim.plateComplete(p) ? 1 : 0.55);
    });
  }

  /** Short arc from a screen point into a station or onto a plate. */
  arc(key: string, from: Vec, to: Vec, ms = 240, done?: () => void) {
    if (!this.textures.exists(key) || this.reduced) { done?.(); return; }
    const img = this.add.image(from.x, from.y, key).setDepth(30); this.fit(img, this.L.w * 0.12, this.L.w * 0.12);
    const c = { t: 0 }, peak = Math.min(120, Math.abs(to.x - from.x) * 0.3 + 40);
    this.tweens.add({ targets: c, t: 1, duration: ms, ease: "Sine.easeInOut",
      onUpdate: () => { img.setPosition(from.x + (to.x - from.x) * c.t, from.y + (to.y - from.y) * c.t - peak * 4 * c.t * (1 - c.t)); },
      onComplete: () => { img.destroy(); this.squash(to); done?.(); } });
  }
  stationCentre(kind: StationKind): Vec { const r = this.L.stations[kind]; return { x: r.x + r.w / 2, y: r.y + r.h * 0.4 }; }
  private squash(at: Vec) {
    if (this.reduced) return;
    const e = this.add.particles(at.x, at.y, "spark", { speed: { min: 60, max: 140 }, angle: { min: 200, max: 340 }, scale: { start: 0.8, end: 0 }, lifespan: 380, quantity: 7, emitting: false }).setDepth(31);
    e.explode(7); this.time.delayedCall(500, () => e.destroy());
  }
  /** Five-step coin pickup (GAME_PLAN §13): pop, sparkle, arc, counter eats it; sound and haptics live outside. */
  coins(seat: number, count: number, eat: () => void) {
    const s = this.L.seats[seat - 1]; if (!s) return;
    const from = { x: s.x + s.w / 2, y: s.y + s.h * 0.3 }, to = this.L.coin;
    if (this.reduced) { for (let i = 0; i < count; i++) eat(); return; }
    this.squash(from);
    for (let i = 0; i < Math.min(8, count); i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2, d = this.L.w * (0.04 + Math.random() * 0.05);
      const img = this.add.image(from.x, from.y, "coin").setDepth(32).setScale(0.3);
      const mid = { x: from.x + Math.cos(a) * d, y: from.y + Math.sin(a) * d };
      this.tweens.chain({ targets: img, tweens: [
        { x: mid.x, y: mid.y, scale: 0.8, duration: 160, ease: "Back.easeOut" },
        { x: to.x, y: to.y, scale: 0.45, angle: 360, duration: 520, delay: i * 40, ease: "Cubic.easeIn", onComplete: () => { img.destroy(); eat(); } }] });
    }
  }
  shake(seat: number) { this.shakeUntil.set(seat, this.time.now / 1000 + 0.9); }
  puff(kind: StationKind) {
    if (this.reduced) return; const c = this.stationCentre(kind);
    const e = this.add.particles(c.x, c.y, "puff", { speed: { min: 30, max: 70 }, scale: { start: 0.5, end: 1.4 }, alpha: { start: 0.6, end: 0 }, tint: this.pal.char, lifespan: 900, quantity: 10, emitting: false }).setDepth(31);
    e.explode(10); this.time.delayedCall(1000, () => e.destroy());
  }
  sparkleReady(kind: StationKind) {
    if (this.reduced) return; const c = this.stationCentre(kind);
    const e = this.add.particles(c.x, c.y - 10, "spark", { speed: { min: 50, max: 120 }, scale: { start: 1, end: 0 }, lifespan: 600, quantity: 14, emitting: false }).setDepth(31);
    e.explode(14); this.time.delayedCall(700, () => e.destroy());
  }
}
