/**
 * The companion pet on the counter (owner, 23 Oct 2026: "have the pet hopping around freely"). It stands in front of the empty
 * plates (a served dish stays on top) and hops from spot to spot before the guests, turning the way it goes and squashing as it
 * lands; now and then it bounces where it is, and it hops over to cheer when a guest is served. With motion reduced it sits still
 * at the counter's end.
 */
import type * as Phaser from "phaser";
import type { Layout } from "./layout";

type Scene = Phaser.Scene;
export class CounterPet {
  private img: Phaser.GameObjects.Image | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;
  /** The hop under way: its progress is a tween of its own, which killing the image's tweens would not stop. */
  private hop: { t: number } | null = null;
  /** Bumped whenever the pet's motion is taken over (a rebuild, a cheer): a chain from an earlier one stops instead of looping on. */
  private gen = 0;
  private busy = false;
  private size = 0; private floor = 0; private lo = 0; private hi = 0;

  constructor(private scene: Scene, readonly key: string, private still: () => boolean) {}

  /** (Re)builds the pet for a layout; the old one went with the scene's children. */
  build(L: Layout) {
    this.stop();
    if (!this.key || !this.scene.textures.exists(this.key)) { this.img = null; return; }
    const c = L.counter, tex = this.scene.textures.get(this.key).getSourceImage() as { width: number; height: number };
    this.size = Math.max(48, Math.min(76, c.h * 1.65)); this.floor = c.y + c.h * 0.9;
    this.lo = L.col.x + this.size * 0.6; this.hi = L.col.x + L.col.w - this.size * 0.6;
    const scale = this.size / Math.max(tex.width, tex.height);
    this.img = this.scene.add.image(this.still() ? this.hi - this.size * 0.3 : (this.lo + this.hi) / 2, this.floor, this.key).setOrigin(0.5, 1).setScale(scale).setDepth(4.2);
    this.img.setData("scale", scale);
    this.next();
  }

  /** Ends whatever the pet is doing: its wait, its hop and its bounces. */
  private stop() {
    this.gen++; this.busy = false;
    this.timer?.remove(); this.timer = null;
    if (this.hop) this.scene.tweens.killTweensOf(this.hop);
    this.hop = null;
    if (this.img?.active) this.scene.tweens.killTweensOf(this.img);
  }
  private next(wait = 700 + Math.random() * 1800) {
    if (this.still()) return;
    const gen = this.gen;
    this.timer = this.scene.time.delayedCall(wait, () => { if (gen !== this.gen) return; if (this.busy) this.next(); else if (Math.random() < 0.22) this.bounce(); else this.hopTo(this.pick()); });
  }
  private pick() {
    const img = this.img!, step = (40 + Math.random() * 80) * (Math.random() < 0.5 ? -1 : 1);
    let x = img.x + step; if (x < this.lo || x > this.hi) x = img.x - step;
    return Math.min(this.hi, Math.max(this.lo, x));
  }
  /** One hop (or a short run of them) to x: up on an arc, a squash on landing. */
  private hopTo(x: number, after?: () => void) {
    const img = this.img; if (!img?.active) return;
    this.busy = true;
    const gen = this.gen, s = img.getData("scale") as number, from = img.x, dist = Math.abs(x - from), hops = Math.max(1, Math.round(dist / 70)), each = (x - from) / hops;
    img.setFlipX(x < from);
    const one = (i: number) => {
      if (!img.active || gen !== this.gen) return;
      if (i >= hops) { this.hop = null; this.busy = false; if (after) after(); else this.next(); return; }
      const c = { t: 0 }, x0 = img.x, h = this.size * (0.32 + Math.random() * 0.1);
      this.hop = c;
      this.scene.tweens.add({ targets: c, t: 1, duration: 330, ease: "Sine.easeInOut",
        onUpdate: () => { img.setPosition(x0 + each * c.t, this.floor - h * 4 * c.t * (1 - c.t)); img.setScale(s * (1 - 0.06 * Math.sin(Math.PI * c.t)), s * (1 + 0.08 * Math.sin(Math.PI * c.t))); },
        onComplete: () => this.scene.tweens.add({ targets: img, scaleX: s * 1.12, scaleY: s * 0.86, duration: 70, yoyo: true, ease: "Quad.easeOut", onComplete: () => one(i + 1) }) });
    };
    one(0);
  }
  /** A little bounce where it stands. */
  private bounce() {
    const img = this.img; if (!img?.active) return;
    this.busy = true;
    const gen = this.gen, s = img.getData("scale") as number;
    this.scene.tweens.chain({ targets: img, tweens: [
      { scaleX: s * 1.1, scaleY: s * 0.88, duration: 90, ease: "Quad.easeOut" },
      { y: this.floor - this.size * 0.25, scaleX: s * 0.94, scaleY: s * 1.08, duration: 160, ease: "Sine.easeOut" },
      { y: this.floor, scaleX: s, scaleY: s, duration: 160, ease: "Sine.easeIn" }],
      onComplete: () => { if (gen !== this.gen) return; this.busy = false; this.next(); } });
  }
  /** A guest was served: hop over beside them and jump for joy. */
  cheer(x: number) {
    const img = this.img; if (!img?.active || this.still()) return;
    this.stop();
    const s = img.getData("scale") as number; img.setScale(s).setY(this.floor).setAngle(0);
    const to = Math.min(this.hi, Math.max(this.lo, x + (img.x < x ? -1 : 1) * this.size * 0.9));
    this.hopTo(to, () => {
      this.busy = true;
      const gen = this.gen;
      this.scene.tweens.chain({ targets: img, tweens: [
        { y: this.floor - this.size * 0.55, angle: 360, duration: 380, ease: "Sine.easeOut" },
        { y: this.floor, duration: 220, ease: "Bounce.easeOut" }],
        onComplete: () => { img.setAngle(0); if (gen !== this.gen) return; this.busy = false; this.next(); } });
    });
  }
}
