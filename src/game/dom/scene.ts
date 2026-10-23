/**
 * Phaser playfield: backdrop, guests behind the counter, plate mats, the plating board, stations with heat glow, steam,
 * smoke and what is cooking in them, and every flight between them. Visual state is derived from the simulation every
 * frame, so the scene never owns game rules; station and guest taps and the drags are reported to the DOM root through `hooks`.
 */
import * as Phaser from "phaser";
import { DISHES, STATIONS, type StationKind } from "../content/dishes";
import { GUESTS } from "../content/guests";
import { ITEM_FORM, ITEMS, type ItemTone } from "../content/items";
import * as sim from "../sim/engine";
import { takePhase } from "./Knob";
import { SERVE_GLIDE } from "./coinsFx";
import { CounterPet } from "./pet";
import { nearestStation, type Layout, type Point, type Rect } from "./layout";
import * as motion from "./motion";
import { PanContents, type Tones } from "./pan";
import { STATION_ART } from "./stationArt";

export type SceneHooks = {
  onStation(kind: StationKind): void; onGuest(orderId: string): void;
  onServeDrag(slot: number, orderId: string): void; onPlateDrag(kind: StationKind): void;
  /** A ready paste dragged from one station onto another (transfer). */
  onTransfer(from: StationKind, to: StationKind): void;
  /** The scene has built its first frame; it hands itself over, since Phaser creates scenes only after it boots. */
  ready(scene: Playfield): void;
};
/** Pixel density for a crisp canvas on phones, capped to keep texture memory reasonable. */
export const DPR = typeof window !== "undefined" ? Math.min(2.5, Math.max(1, window.devicePixelRatio || 1)) : 1;

/** Canvas colours come from the DOM layer's CSS tokens (styles.ts), so the game keeps one palette. */
const TOKENS = { light: "--fx-light", spark: "--fx-spark", flame: "--fx-flame", flameHot: "--fx-flame-hot", smoke: "--fx-smoke", char: "--fx-char",
  track: "--fx-ring-track", ready: "--fx-ready", warn: "--fx-warn", progress: "--fx-progress", coin: "--fx-coin", coinEdge: "--fx-coin-edge",
  cooked: "--fx-cooked", focus: "--fx-focus", soy: "--fx-soy", oil: "--fx-oil", cream: "--fx-cream", red: "--fx-red",
  white: "--fx-grain-white", gold: "--fx-grain-gold", dark: "--fx-grain-dark", heart: "--fx-heart" } as const;
type Palette = Record<keyof typeof TOKENS, number>;
function readPalette(): Palette {
  const el = typeof document !== "undefined" ? document.querySelector(".rh") : null, css = el ? getComputedStyle(el) : null, out = {} as Palette;
  (Object.keys(TOKENS) as (keyof typeof TOKENS)[]).forEach(k => {
    const v = css?.getPropertyValue(TOKENS[k]).trim() ?? ""; out[k] = /^#[0-9a-f]{6}$/i.test(v) ? parseInt(v.slice(1), 16) : 0x808080;
  });
  return out;
}
type StationView = { art: Img; scale: Point; glow: Phaser.GameObjects.Ellipse; hi: Phaser.GameObjects.Graphics; ring: Phaser.GameObjects.Graphics; pan: PanContents;
  steam: Phaser.GameObjects.Particles.ParticleEmitter; smoke: Phaser.GameObjects.Particles.ParticleEmitter };
type PlateView = { base: Phaser.GameObjects.Image; dish: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Ellipse };
type Img = Phaser.GameObjects.Image;

/** How far a pointer may move (in canvas pixels) and still count as a tap. */
const TAP = 10 * DPR;
export class Playfield extends Phaser.Scene {
  run!: sim.Run; L!: Layout; art: Record<string, string> = {}; hooks!: SceneHooks; reduced = false; pal!: Palette;
  /** Knob mode: the heat the knob is held at, so the stove's flame follows the needle before it is let go. */
  heatPreview: { kind: StationKind; v: number } | null = null;
  /** The station a dragged ingredient is over (a drop target). */
  hover: StationKind | null = null;
  /** A ready dish being carried from this station, and the board slot of a plate being carried to a guest (the DOM lights up its targets). */
  dragKind: StationKind | null = null; dragSlot: number | null = null;
  /** The dish being carried is a paste: it goes onto another station, not the plates. */
  dragPaste = false;
  /** Item uids, board slots and seats whose food is still flying in; each shows only when it lands. */
  readonly landing = new Set<number>(); readonly incomingSlots = new Set<number>(); readonly incomingSeats = new Set<number>();
  private guests = new Map<string, Img>();
  private stations = new Map<StationKind, StationView>();
  private plates: PlateView[] = [];
  private mats: Img[] = [];
  private shakeUntil = new Map<number, number>();
  private ghost: Img | null = null;
  private flareUntil = new Map<StationKind, number>();

  constructor() { super("playfield"); }
  private pet!: CounterPet;
  init(data: { run: sim.Run; layout: Layout; art: Record<string, string>; hooks: SceneHooks; reduced: boolean; pet: string }) {
    this.run = data.run; this.L = data.layout; this.art = data.art; this.hooks = data.hooks; this.reduced = data.reduced; this.pal = readPalette();
    this.pet = new CounterPet(this, data.pet, () => this.reduced);
  }
  preload() {
    // Image elements instead of XHR, so file:// art in release builds loads and stays untainted for WebGL.
    this.load.imageLoadType = "HTMLImageElement";
    // Only what this level uses: its stations, guests, dishes and every ingredient its dishes accept.
    const r = this.run, dishes = [...new Set(r.guests.map(g => g.dishId))].map(id => DISHES[id]);
    const items = new Set<string>([...r.level.distractors]);
    dishes.forEach(d => d.parts.forEach(p => p.stages.forEach(st => st.slots.forEach(sl => sl.accepts.forEach(a => items.add(a))))));
    const keys = new Set([this.pet.key, "rh-bg", "rh-kitchen", "rh-counter", "plate", "serving-tray", ...Object.keys(r.stations).map(k => STATIONS[k as StationKind].art),
      ...r.guests.flatMap(g => [GUESTS[g.guestId].art, GUESTS[g.guestId].artNo ?? GUESTS[g.guestId].art]), ...dishes.map(d => d.art),
      ...[...items].map(i => ITEMS[i]?.art).filter((k): k is string => !!k)]);
    keys.forEach(k => { if (this.art[k]) this.load.image(k, this.art[k]); });
  }
  create() {
    // The canvas is drawn at the screen's pixel density and shown at CSS size; the camera zoom keeps layout in CSS px.
    this.cameras.main.setOrigin(0, 0).setZoom(DPR);
    const g = this.make.graphics({ x: 0, y: 0 }, false), P = this.pal;
    g.fillStyle(P.coin).fillCircle(16, 16, 15).lineStyle(3, P.coinEdge).strokeCircle(16, 16, 13); g.generateTexture("coin", 32, 32); g.clear();
    g.fillStyle(P.light).fillCircle(16, 16, 16); g.generateTexture("puff", 32, 32); g.clear();
    g.fillStyle(P.light).fillCircle(5, 5, 5); g.generateTexture("drop", 10, 10); g.clear();
    g.fillStyle(P.spark).fillCircle(6, 6, 6); g.generateTexture("spark", 12, 12); g.clear();
    g.fillStyle(P.heart).fillCircle(7, 7, 6).fillCircle(17, 7, 6).fillTriangle(1.4, 9, 22.6, 9, 12, 21); g.generateTexture("heart", 24, 22); g.destroy();
    this.build(); this.hooks.ready(this);
  }

  /** Rebuild every object for a new layout or a new run; flights in progress are dropped. */
  build() {
    this.children.removeAll(true); this.stations.forEach(v => v.pan.destroy());
    this.guests.clear(); this.stations.clear(); this.plates = []; this.mats = [];
    this.landing.clear(); this.incomingSlots.clear(); this.incomingSeats.clear();
    const L = this.L;
    if (this.textures.exists("rh-bg")) this.cover(this.add.image(0, 0, "rh-bg"), L.backdrop);
    // The cook's side under the counter (owner mockup): a wooden worktop the stations stand on, the kitchen shelves soft behind the ingredient shelf.
    const below = L.counter.y + L.counter.h - 2;
    if (this.textures.exists("rh-kitchen")) this.cover(this.add.image(0, 0, "rh-kitchen"), { x: 0, y: below, w: L.w, h: L.h - below });
    this.run.guests.forEach(gr => this.guests.set(gr.orderId, this.add.image(-200, -200, GUESTS[gr.guestId].art).setOrigin(0.5, 1).setVisible(false).setDepth(2)));
    if (this.textures.exists("rh-counter")) this.cover(this.add.image(0, 0, "rh-counter").setDepth(3), L.counter);
    this.pet.build(L);
    L.seats.forEach((s, i) => {
      this.place(this.add.image(0, 0, "plate").setDepth(4), s.mat);
      this.mats.push(this.add.image(s.mat.x + s.mat.w / 2, s.mat.y + s.mat.h * 0.42, "plate").setDepth(4.5).setVisible(false));
      const col = { x: s.guest.x - 6, y: s.guest.y, w: s.guest.w + 12, h: L.counter.y + L.counter.h - s.guest.y };
      this.zone(col, 6).on("pointerup", () => { const gr = this.guestAt(i + 1); if (gr) this.hooks.onGuest(gr.orderId); });
    });
    this.buildBoard();
    (Object.keys(L.stations) as StationKind[]).forEach(kind => this.buildStation(kind));
  }
  private buildBoard() {
    const L = this.L;
    if (this.textures.exists("serving-tray")) this.place(this.add.image(0, 0, "serving-tray").setDepth(4), L.plating.art);
    L.board.forEach((b, i) => {
      const glow = this.add.ellipse(b.x + b.w / 2, b.y + b.h * 0.62, b.w * 1.25, b.h * 0.9, this.pal.focus, 0).setDepth(4.6);
      // The tray's own plate is slot 0; the corner plates appear only while they hold a dish (updatePlates).
      const base = this.place(this.add.image(0, 0, "plate").setDepth(5), b).setVisible(false), dish = this.add.image(base.x, base.y - 2, "plate").setDepth(6).setVisible(false);
      const zone = this.zone({ x: b.x - 4, y: b.y - b.h * 0.7, w: b.w + 8, h: b.h * 2.2 }, 10, true);
      zone.on("dragstart", () => { if (this.run.board[i]) this.dragSlot = i; });
      zone.on("drag", (_p: Phaser.Input.Pointer, x: number, y: number) => { if (this.dragSlot === i) dish.setPosition(x, y).setDepth(20); });
      zone.on("dragend", (p: Phaser.Input.Pointer) => {
        this.dragSlot = null; dish.setDepth(6); zone.setPosition(b.x + b.w / 2, b.y + b.h * 0.4);
        // Pointer positions are in canvas pixels; worldX/worldY are in layout units, which the layout rectangles use.
        const seat = L.seats.findIndex(s => p.worldX >= s.guest.x - 10 && p.worldX <= s.guest.x + s.guest.w + 10 && p.worldY >= s.guest.y && p.worldY <= L.counter.y + L.counter.h);
        const gr = seat >= 0 ? this.guestAt(seat + 1) : undefined;
        if (gr && this.run.board[i]) this.hooks.onServeDrag(i, gr.orderId);
      });
      this.plates.push({ base, dish, glow });
    });
  }
  private buildStation(kind: StationKind) {
    const r = this.L.stations[kind]!, cfg = STATIONS[kind], P = this.pal;
    const hi = this.add.graphics().setDepth(4);
    const art = this.place(this.add.image(0, 0, cfg.art).setDepth(5), r.art), scale = { x: art.scaleX, y: art.scaleY };
    const f = STATION_ART[kind].flame;
    const glow = this.add.ellipse(r.art.x + r.art.w * f.x, r.art.y + r.art.h * f.y, r.art.w * f.rx * 2, r.art.h * f.ry * 2, P.flame, 0).setDepth(5.5).setBlendMode(Phaser.BlendModes.ADD);
    const pan = new PanContents(this, r.bowl, 6, this.tones(), !!STATION_ART[kind].closed);
    const ring = this.add.graphics().setDepth(8);
    const steam = this.add.particles(r.bowl.x, r.bowl.y - r.bowl.ry, "puff", { speedY: { min: -40, max: -70 }, speedX: { min: -10, max: 10 }, scale: { start: 0.3, end: 0.85 },
      alpha: { start: 0.45, end: 0 }, lifespan: 1200, frequency: 240, emitting: false }).setDepth(9);
    const smoke = this.add.particles(r.bowl.x, r.bowl.y - r.bowl.ry, "puff", { speedY: { min: -50, max: -90 }, speedX: { min: -16, max: 16 }, scale: { start: 0.4, end: 1.2 },
      alpha: { start: 0.55, end: 0 }, tint: P.smoke, lifespan: 1200, frequency: 120, emitting: false }).setDepth(9);
    const zone = this.zone(r, 10, true);
    zone.on("pointerup", (p: Phaser.Input.Pointer) => { if (p.getDistance() < TAP) this.hooks.onStation(kind); });
    zone.on("dragstart", (p: Phaser.Input.Pointer) => this.startDishDrag(kind, p));
    zone.on("drag", (p: Phaser.Input.Pointer) => {
      this.ghost?.setPosition(p.worldX, p.worldY - 14);
      if (this.dragPaste && this.dragKind === kind) { const over = this.stationAt(p.worldX, p.worldY); this.hover = over !== kind ? over : null; }
    });
    zone.on("dragend", (p: Phaser.Input.Pointer) => {
      const b = this.L.plating, moved = p.getDistance() >= TAP, carrying = this.dragKind === kind, paste = this.dragPaste, to = this.stationAt(p.worldX, p.worldY);
      this.endDishDrag(); zone.setPosition(r.x + r.w / 2, r.y + r.h / 2);
      if (!carrying || !moved) return;
      if (paste) { if (to && to !== kind) this.hooks.onTransfer(kind, to); return; }
      if (p.worldX >= b.x - 8 && p.worldX <= b.x + b.w + 8 && p.worldY >= b.y - 8 && p.worldY <= b.y + b.h + 8) this.hooks.onPlateDrag(kind);
    });
    this.stations.set(kind, { art, scale, glow, hi, ring, pan, steam, smoke });
  }
  /** A ready dish lifts off its station and follows the finger to the plates (a paste, to another station); anything else is not carried. */
  private startDishDrag(kind: StationKind, p: Phaser.Input.Pointer) {
    const pr = this.run.stations[kind]?.part;
    if (!pr || pr.state !== "ready") return;
    const made = sim.partOf(pr).makes;
    this.dragKind = kind; this.dragPaste = !!made;
    const key = made ? ITEMS[made]?.art ?? DISHES[pr.dishId].art : DISHES[pr.dishId].art;
    if (this.textures.exists(key)) this.ghost = this.fit(this.add.image(p.worldX, p.worldY - 14, key).setDepth(40), 70, 70);
  }
  private endDishDrag() { this.ghost?.destroy(); this.ghost = null; this.dragKind = null; if (this.dragPaste) this.hover = null; this.dragPaste = false; }
  /** The station under a point, if any (its art and the tag below it, with a finger's width to spare). */
  private stationAt(x: number, y: number) { return nearestStation(this.L, { x, y }); }
  private tones(): Tones { const P = this.pal; return { soy: P.soy, oil: P.oil, cream: P.cream, red: P.red, white: P.white, gold: P.gold, dark: P.dark, cooked: P.cooked, char: P.char, light: P.light }; }
  private zone(r: Rect, depth: number, draggable = false) {
    return this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h).setInteractive({ useHandCursor: true, draggable }).setDepth(depth);
  }
  private place(img: Img, r: Rect) { return img.setDisplaySize(r.w, r.h).setPosition(r.x + r.w / 2, r.y + r.h / 2); }
  private fit(img: Img, w: number, h: number) { return img.setScale(Math.min(w / img.width, h / img.height)); }
  private cover(img: Img, r: Rect) {
    const s = Math.max(r.w / img.width, r.h / img.height); img.setScale(s).setPosition(r.x + r.w / 2, r.y + r.h / 2);
    img.setCrop((img.width - r.w / s) / 2, (img.height - r.h / s) / 2, r.w / s, r.h / s); return img;
  }
  private guestAt(seat: number) { return this.run.guests.find(x => x.seat === seat && x.state === "waiting"); }
  setLayout(L: Layout) { this.L = L; this.scale.resize(L.w * DPR, L.h * DPR); this.scale.setZoom(1 / DPR); this.cameras.main.setZoom(DPR); this.build(); }

  update() {
    if (!this.run) return;
    const t = this.time.now / 1000;
    this.updateGuests(t);
    this.L.seats.forEach((_, i) => {
      const gr = this.run.guests.find(x => x.seat === i + 1 && x.state === "eating"), img = this.mats[i], m = this.L.seats[i].mat;
      const key = gr ? DISHES[gr.dishId].art : "";
      if (gr && !this.incomingSeats.has(i + 1) && this.textures.exists(key)) { if (img.texture.key !== key) img.setTexture(key); this.fit(img, m.w * 1.05, m.h * 1.5); img.setVisible(true); }
      else img.setVisible(false);
    });
    for (const [kind, v] of this.stations) this.updateStation(kind, v, t);
    this.updatePlates();
  }
  private updateGuests(t: number) {
    const L = this.L;
    for (const gr of this.run.guests) {
      const img = this.guests.get(gr.orderId), seat = L.seats[gr.seat - 1]; if (!img) continue;
      if (!seat || gr.state === "queue" || gr.state === "gone") { img.setVisible(false); continue; }
      const shaking = (this.shakeUntil.get(gr.seat) ?? 0) > t, guest = GUESTS[gr.guestId];
      const tex = shaking && guest.artNo && gr.state !== "leaving" ? guest.artNo : guest.art;
      if (img.texture.key !== tex && this.textures.exists(tex)) img.setTexture(tex);
      const g = seat.guest, s = Math.min(g.h / img.height, (g.w * 1.25) / img.width), homeX = g.x + g.w / 2, homeY = g.y + g.h;
      const edge = gr.seat <= L.seats.length / 2 ? L.col.x - g.w : L.col.x + L.col.w + g.w;
      let x = homeX, y = homeY, alpha = 1, rot = 0, sy = s;
      if (gr.state === "walking") { const k = Math.min(1, gr.st); x = edge + (homeX - edge) * (1 - (1 - k) * (1 - k)); alpha = Math.min(1, k * 2); y = homeY - (this.reduced ? 0 : Math.abs(Math.sin(k * Math.PI * 3)) * 7); }
      else if (gr.state === "leaving") { const k = Math.min(1, gr.st); x = homeX + (edge - homeX) * k * k; alpha = 1 - k * 0.7; }
      else if (gr.state === "eating" && !this.reduced) y = homeY - Math.abs(Math.sin(gr.st * Math.PI * 3)) * 4;
      else if (!this.reduced) sy = s * (1 + Math.sin(t * 2 + gr.seat) * 0.012);
      if (shaking && !this.reduced) rot = Math.sin(t * 40) * 0.05;
      img.setVisible(true).setPosition(x, y).setScale(s, sy).setAlpha(alpha).setRotation(rot);
    }
  }
  private updateStation(kind: StationKind, v: StationView, t: number) {
    const st = this.run.stations[kind]!, r = this.L.stations[kind]!, cfg = STATIONS[kind], pr = st.part, P = this.pal;
    const [lo, hi] = sim.bandOf(st, pr), cooking = !!pr && pr.state === "cooking", many = Object.keys(this.L.stations).length > 1;
    v.hi.clear();
    // The selected (or hovered) station stands in a soft pool of warm light on the counter, never a panel behind its picture.
    const a = r.art, hl = (alpha: number) => {
      const cx = a.x + a.w / 2, cy = a.y + a.h * 0.9;
      v.hi.fillStyle(P.spark, alpha * 0.45).fillEllipse(cx, cy, a.w * 1.05, a.h * 0.3);
      v.hi.fillStyle(P.spark, alpha).fillEllipse(cx, cy, a.w * 0.8, a.h * 0.17);
    };
    if (this.hover === kind) hl(0.7); else if (many && this.run.selected === kind) hl(0.5);
    const flaring = (this.flareUntil.get(kind) ?? 0) > t;
    if (flaring) v.glow.setFillStyle(P.flameHot, 0.55 + 0.3 * Math.sin(t * 16));
    else if (this.heatPreview?.kind === kind) { const h = this.heatPreview.v; v.glow.setFillStyle(h >= cfg.scorch ? P.flameHot : P.flame, Math.min(0.7, 0.12 + h * 0.6)); }
    else v.glow.setFillStyle(st.H >= cfg.scorch ? P.flameHot : P.flame, cfg.heat && st.heatOn || st.H > 0.3 ? Math.min(0.55, st.H * 0.65) : 0);
    // Knob mode: a step on the star, or a turn on time, stands in a pulsing pool of gold light, the cue to act now.
    const ph = this.run.knob && !this.reduced ? takePhase(pr, this.run.knob) : "idle";
    if ((ph === "now" && cfg.heat) || ph === "turn") hl(0.55 + 0.35 * Math.sin(t * 14));
    const toss = !cooking || this.reduced || !cfg.heat ? 0 : st.H >= lo && st.H <= hi ? 1 : st.H >= lo - 0.1 ? 0.4 : 0;
    v.pan.draw(pr, t, this.landing, toss);
    v.steam.emitting = !this.reduced && cooking && pr!.progress > 0.35;
    v.smoke.emitting = !this.reduced && cfg.heat && st.H >= cfg.scorch && !!pr;
    v.ring.clear();
    if (!pr) return;
    const rad = Math.max(9, Math.min(14, r.w * 0.08)), cx = r.x + r.w - rad - 6, cy = r.y + rad + 6;
    const done = (pr.stage + (pr.state === "ready" ? 1 : pr.progress)) / sim.partOf(pr).stages.length;
    v.ring.fillStyle(P.light, 0.95).fillCircle(cx, cy, rad + 3).lineStyle(4, P.track).strokeCircle(cx, cy, rad);
    v.ring.lineStyle(4, pr.state === "ready" ? P.ready : pr.state === "scorched" || pr.state === "split" ? P.warn : P.progress)
      .beginPath().arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, done)).strokePath();

  }
  private updatePlates() {
    const free = this.run.board.findIndex(p => !p);
    this.run.board.forEach((p, i) => {
      const v = this.plates[i], b = this.L.board[i]; if (!v) return;
      // While a dish is carried, the plate it will land on glows: the tray's plate, or the next corner plate when that one is taken.
      v.glow.setFillStyle(this.pal.focus, this.dragKind !== null && !this.dragPaste && i === free ? 0.6 : 0);
      v.base.setVisible(i > 0 && (!!p || (this.dragKind !== null && !this.dragPaste && i === free)));
      v.base.setY(b.y + b.h / 2);
      if (!p || this.incomingSlots.has(i)) { v.dish.setVisible(false); return; }
      const key = DISHES[p.dishId].art;
      if (this.textures.exists(key)) { if (v.dish.texture.key !== key) v.dish.setTexture(key); this.fit(v.dish, b.w * 1.05, b.h * 1.25); }
      if (this.dragSlot !== i) v.dish.setPosition(b.x + b.w / 2, b.y + b.h * 0.42);
      v.dish.setVisible(true).setAlpha(sim.plateComplete(p) ? 1 : 0.55);
    });
  }

  // ---------- one-shot motion, called by the DOM root as simulation events drain ----------
  /** An ingredient flies from `from` (a shelf card) into a station: solids land in the pile, sauces pour, powders sprinkle. */
  itemIn(itemId: string, uid: number, kind: StationKind, from: Point) {
    const r = this.L.stations[kind], key = ITEMS[itemId]?.art, form = ITEM_FORM[itemId], st = this.run.stations[kind];
    if (!r || !key || this.reduced) return;
    this.landing.add(uid);
    const land = () => { this.landing.delete(uid); this.squash(kind); if (!STATION_ART[kind].closed) motion.burst(this, { x: r.bowl.x, y: r.bowl.y - r.bowl.ry * 0.4 }, 6); };
    const tone = form ? this.pal[form.tone as ItemTone] : 0;
    if (form?.form === "pour") motion.pour(this, key, from, r.bowl, tone, land);
    else if (form?.form === "sprinkle") motion.sprinkle(this, key, from, r.bowl, tone, land);
    else { const spot = this.stations.get(kind)?.pan.landingFor(st?.part ?? null, uid) ?? { x: r.bowl.x, y: r.bowl.y, size: 40 }; motion.arc(this, key, from, spot, Math.max(44, spot.size * 1.3), 300, land, spot.size); }
  }
  /** A finished dish slides from its station onto the board. */
  plateIn(kind: StationKind, slot: number, dishId: string) {
    const r = this.L.stations[kind], b = this.L.board[slot]; if (!r || !b || this.reduced) return;
    this.incomingSlots.add(slot);
    motion.arc(this, DISHES[dishId].art, { x: r.bowl.x, y: r.bowl.y }, { x: b.x + b.w / 2, y: b.y + b.h * 0.42 }, r.bowl.rx * 1.8, 320, () => this.incomingSlots.delete(slot), b.w * 1.05);
  }
  /** A plate glides from the board to the guest's mat, then the coins come out. */
  serveTo(slot: number, seat: number, dishId: string, then: () => void) {
    const b = this.L.board[slot], s = this.L.seats[seat - 1];
    if (!b || !s || this.reduced) { then(); return; }
    this.incomingSeats.add(seat);
    motion.arc(this, DISHES[dishId].art, { x: b.x + b.w / 2, y: b.y + b.h / 2 }, { x: s.mat.x + s.mat.w / 2, y: s.mat.y + s.mat.h * 0.42 }, b.w * 1.05, SERVE_GLIDE,
      () => { this.incomingSeats.delete(seat); motion.hearts(this, { x: s.guest.x + s.guest.w / 2, y: s.guest.y + s.guest.h * 0.18 }); this.pet.cheer(s.mat.x + s.mat.w / 2); then(); }, s.mat.w * 1.05);
  }
  /** The station gives a little squash as an ingredient lands in it. */
  private squash(kind: StationKind) {
    const v = this.stations.get(kind); if (!v) return;
    this.tweens.killTweensOf(v.art); v.art.setScale(v.scale.x, v.scale.y);
    this.tweens.add({ targets: v.art, scaleX: v.scale.x * 1.05, scaleY: v.scale.y * 0.94, duration: 70, yoyo: true, ease: "Quad.easeOut", onComplete: () => v.art.setScale(v.scale.x, v.scale.y) });
  }
  shake(seat: number) { this.shakeUntil.set(seat, this.time.now / 1000 + 0.9); }
  wobblePlate(slot: number) {
    const v = this.plates[slot]; if (!v || this.reduced) return;
    this.tweens.add({ targets: [v.base, v.dish], angle: { from: -8, to: 8 }, duration: 70, yoyo: true, repeat: 3, onComplete: () => { v.base.setAngle(0); v.dish.setAngle(0); } });
  }
  /** The warning flickers the burner's glow; the hit is a burst of flame and a small shake. */
  flare(kind: StationKind, phase: "warn" | "hit") {
    const r = this.L.stations[kind]; if (!r || this.reduced) return;
    if (phase === "warn") { this.flareUntil.set(kind, this.time.now / 1000 + 2.5); return; }
    this.flareUntil.delete(kind);
    motion.burst(this, { x: r.bowl.x, y: r.bowl.y + r.bowl.ry * 0.6 }, 18, this.pal.flameHot);
    this.cameras.main.shake(220, 0.004);
  }
  /** Knob mode: a step came off the heat (the stamp itself is in the DOM layer). On the ring, a gold burst and a squash; early or late, a puff. */
  took(kind: StationKind, grade: "perfect" | "early" | "late") {
    const r = this.L.stations[kind]; if (!r || this.reduced) return;
    const b = r.bowl;
    if (grade !== "perfect") { motion.puff(this, { x: b.x, y: b.y - b.ry }, this.pal.light); return; }
    motion.burst(this, { x: b.x, y: b.y - b.ry }, 16); motion.burst(this, { x: b.x, y: b.y - b.ry * 1.6 }, 8, this.pal.focus); this.squash(kind);
  }
  puff(kind: StationKind) { const r = this.L.stations[kind]; if (r && !this.reduced) motion.puff(this, { x: r.bowl.x, y: r.bowl.y - r.bowl.ry }, this.pal.char); }
  sparkleReady(kind: StationKind) { const r = this.L.stations[kind]; if (r && !this.reduced) motion.burst(this, { x: r.bowl.x, y: r.bowl.y - r.bowl.ry }, 14); }
}
