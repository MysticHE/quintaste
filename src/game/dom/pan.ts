/**
 * What is in a station, drawn from the simulation every frame: solid ingredients piled inside the bowl, a pool of
 * whatever was poured in, and speckles of anything sprinkled. Containers (bottles, jars, bowls) never stay in the pan.
 * Items still flying in are left out until their arc lands, and a closed station (the rice cooker) shows nothing.
 */
import type * as Phaser from "phaser";
import { ITEM_FORM, ITEMS, type ItemTone } from "../content/items";
import type * as sim from "../sim/engine";
import type { Oval } from "./layout";

export type Tones = Record<ItemTone, number> & { cooked: number; char: number; light: number; warn: number };
type Spot = { x: number; y: number; size: number };

const hash = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
const channel = (c: number, s: number) => (c >> s) & 255;
/** Blends two 0xRRGGBB colours: k = 0 gives a, 1 gives b. */
export function lerpColor(a: number, b: number, k: number) {
  const m = (s: number) => Math.round(channel(a, s) + (channel(b, s) - channel(a, s)) * k) << s;
  return m(16) | m(8) | m(0);
}
function mix(colors: number[]) {
  const avg = (s: number) => Math.round(colors.reduce((t, c) => t + channel(c, s), 0) / colors.length) << s;
  return avg(16) | avg(8) | avg(0);
}
export const isSolid = (id: string) => !ITEM_FORM[id];

export class PanContents {
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private under: Phaser.GameObjects.Graphics;
  private over: Phaser.GameObjects.Graphics;

  /** `parent` is the station's container (the row slides it), kept in depth order as food arrives. */
  constructor(private scene: Phaser.Scene, private bowl: Oval, private depth: number, private tones: Tones, private closed: boolean, private parent?: Phaser.GameObjects.Container) {
    this.under = scene.add.graphics().setDepth(depth);
    this.over = scene.add.graphics().setDepth(depth + 0.9);
    parent?.add([this.under, this.over]);
  }

  /** Where the i-th of n solid items sits: a sunflower spiral inside the bowl, smaller as the pile grows. */
  spot(i: number, n: number): Spot {
    const B = this.bowl, size = B.rx * 2 * (n <= 1 ? 0.62 : n === 2 ? 0.52 : n <= 4 ? 0.44 : 0.38);
    if (n <= 1) return { x: B.x, y: B.y - B.ry * 0.3, size };
    const a = i * 2.39996 + 0.6, r = Math.sqrt((i + 0.5) / n) * 0.62;
    return { x: B.x + Math.cos(a) * r * B.rx, y: B.y - B.ry * 0.3 + Math.sin(a) * r * B.ry, size };
  }
  /** The landing point for item `uid` already in `pr`: its pile spot, or the bowl centre for poured and sprinkled items. */
  landingFor(pr: sim.PartRun | null, uid: number): Spot {
    const solids = pr ? pr.items.filter(i => isSolid(i.id)) : [], i = solids.findIndex(x => x.uid === uid);
    return i >= 0 ? this.spot(i, solids.length) : { x: this.bowl.x, y: this.bowl.y, size: this.bowl.rx * 1.1 };
  }

  /** `toss` (0–1) is how hard the pile bounces: full in the heat band, a little near it, none off the heat; `still` stops the pulses. */
  draw(pr: sim.PartRun | null, t: number, landing: Set<number>, toss: number, still = false) {
    this.under.clear(); this.over.clear();
    const live = pr && !this.closed ? pr.items.filter(i => !landing.has(i.uid)) : [];
    const solids = live.filter(i => isSolid(i.id));
    for (const [uid, im] of this.sprites) if (!solids.some(i => i.uid === uid)) { im.destroy(); this.sprites.delete(uid); }
    if (!pr || !live.length) return;
    this.drawPool(live);
    solids.forEach((it, i) => this.drawSolid(pr, it, i, solids.length, t, toss));
    this.drawSpeckles(live);
    this.drawWrong(live, t, still);
  }

  /**
   * An ingredient that breaks a guest's rule (the mistake toast says why) wears a pulsing red ring and a small cross until it is
   * lifted out or the dish restarted; one poured or sprinkled in rings the whole bowl.
   */
  private drawWrong(live: sim.PlacedItem[], t: number, still: boolean) {
    const bad = live.filter(i => i.warn); if (!bad.length) return;
    const pulse = still ? 1 : 0.6 + 0.4 * Math.sin(t * 7), W = this.tones.warn, B = this.bowl;
    for (const it of bad) {
      const im = this.sprites.get(it.uid);
      if (!im) { this.over.lineStyle(7, W, 0.25 * pulse).strokeEllipse(B.x, B.y - B.ry * 0.15, B.rx * 1.7, B.ry * 1.5).lineStyle(3, W, 0.9 * pulse).strokeEllipse(B.x, B.y - B.ry * 0.15, B.rx * 1.7, B.ry * 1.5); continue; }
      const r = Math.max(im.displayWidth, im.displayHeight) * 0.58, bx = im.x + r * 0.72, by = im.y - r * 0.72, k = Math.max(5, r * 0.28);
      this.over.lineStyle(7, W, 0.25 * pulse).strokeCircle(im.x, im.y, r).lineStyle(3, W, 0.9 * pulse).strokeCircle(im.x, im.y, r);
      this.over.fillStyle(W, 1).fillCircle(bx, by, k).lineStyle(2, this.tones.light, 1)
        .lineBetween(bx - k * 0.45, by - k * 0.45, bx + k * 0.45, by + k * 0.45).lineBetween(bx - k * 0.45, by + k * 0.45, bx + k * 0.45, by - k * 0.45);
    }
  }

  private drawPool(live: sim.PlacedItem[]) {
    const pours = live.filter(i => ITEM_FORM[i.id]?.form === "pour"); if (!pours.length) return;
    const B = this.bowl, k = Math.min(1, 0.72 + pours.length * 0.12), c = mix(pours.map(i => this.tones[ITEM_FORM[i.id].tone]));
    this.under.fillStyle(c, 0.9).fillEllipse(B.x, B.y, B.rx * 1.7 * k, B.ry * 1.6 * k);
    this.under.fillStyle(this.tones.light, 0.22).fillEllipse(B.x - B.rx * 0.32, B.y - B.ry * 0.25, B.rx * 0.55 * k, B.ry * 0.38 * k);
  }

  private drawSolid(pr: sim.PartRun, it: sim.PlacedItem, i: number, n: number, t: number, toss: number) {
    const key = ITEMS[it.id]?.art; if (!key || !this.scene.textures.exists(key)) return;
    const p = this.spot(i, n), lift = toss ? Math.abs(Math.sin(t * 5 + i * 1.7)) * this.bowl.ry * 0.6 * toss : 0;
    let im = this.sprites.get(it.uid);
    if (!im) { im = this.scene.add.image(p.x, p.y, key).setDepth(this.depth + 0.1); this.sprites.set(it.uid, im); this.parent?.add(im).sort("depth"); }
    const k = Math.min(p.size / im.width, p.size * 0.82 / im.height);
    // Settle smoothly into the new spot when the pile regroups.
    const x = im.x + (p.x - im.x) * 0.3, y = im.y + (p.y - lift - im.y) * 0.35;
    im.setScale(k).setPosition(x, y).setRotation(toss ? Math.sin(t * 4 + i) * 0.1 * toss : 0).setDepth(this.depth + 0.1 + p.y / 10000);
    const cooked = it.stage < pr.stage || pr.state === "ready" ? 1 : pr.state === "cooking" ? pr.progress : 0;
    im.setTint(pr.state === "scorched" ? this.tones.char : lerpColor(this.tones.light, this.tones.cooked, cooked * 0.5));
  }

  private drawSpeckles(live: sim.PlacedItem[]) {
    const B = this.bowl, r = Math.max(1.3, B.rx * 0.035);
    live.filter(i => ITEM_FORM[i.id]?.form === "sprinkle").forEach(it => {
      this.over.fillStyle(this.tones[ITEM_FORM[it.id].tone], 0.95);
      for (let k = 0; k < 18; k++) {
        const a = hash(it.uid * 31 + k) * Math.PI * 2, d = Math.sqrt(hash(it.uid * 17 + k * 7)) * 0.85;
        this.over.fillCircle(B.x + Math.cos(a) * d * B.rx, B.y - B.ry * 0.2 + Math.sin(a) * d * B.ry, r);
      }
    });
  }

  destroy() { this.sprites.forEach(im => im.destroy()); this.sprites.clear(); this.under.destroy(); this.over.destroy(); }
}
