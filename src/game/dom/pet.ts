/**
 * The companion pet on the counter (owner, 23 Oct 2026: "have the pet hopping around freely"). It lives on the counter's back edge,
 * behind the plates (owner, 23 Oct: it was blocking them), and rests only in the gaps between them, hopping from gap to gap, turning
 * the way it goes and squashing as it lands; now and then it bounces where it is, and it pops up in the gap beside a guest who is
 * served to cheer. With motion reduced it sits still at the counter's end.
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
  private size = 0; private floor = 0;
  /** Where it may rest: the middle of each gap between the plates (and at the counter's ends) wide enough for it. */
  private spots: number[] = [];

  constructor(private scene: Scene, readonly key: string, private still: () => boolean) {}

  /** (Re)builds the pet for a layout; the old one went with the scene's children. */
  build(L: Layout) {
    this.stop();
    if (!this.key || !this.scene.textures.exists(this.key)) { this.img = null; return; }
    const c = L.counter, tex = this.scene.textures.get(this.key).getSourceImage() as { width: number; height: number };
    // A little smaller at a full counter of four, where it peeks out from between the plates.
    this.size = L.seats.length >= 4 ? 44 : Math.max(40, Math.min(56, c.h * 1.2)); this.floor = c.y + c.h * 0.42;
    // The middle of every gap between two plates, and of the counter's ends when there is room for it there.
    const mats = L.seats.map(s => s.mat).sort((a, b) => a.x - b.x), left = L.col.x + 8, right = L.col.x + L.col.w - 8;
    const edges = [left, ...mats.flatMap(m => [m.x, m.x + m.w]), right];
    this.spots = [];
    for (let i = 0; i + 1 < edges.length; i += 2) {
      const a = edges[i], b = edges[i + 1], end = i === 0 || i + 2 === edges.length;
      if (b - a >= (end ? this.size * 0.5 : 8)) this.spots.push(Math.min(right - this.size / 2 + 8, Math.max(left + this.size / 2 - 8, (a + b) / 2)));
    }
    if (!this.spots.length) this.spots = [right - this.size / 2];
    const scale = this.size / Math.max(tex.width, tex.height), home = this.spots[this.spots.length - 1];
    // Over the counter and the guests, under the plates and what is served on them.
    this.img = this.scene.add.image(this.still() ? home : this.spots[Math.floor(this.spots.length / 2)], this.floor, this.key).setOrigin(0.5, 1).setScale(scale).setDepth(3.5);
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
  /** Another gap to hop to (or a little shuffle where it is, when there is only one). */
  private pick() {
    const x = this.img!.x, others = this.spots.filter(s => Math.abs(s - x) > 4);
    return others.length ? others[Math.floor(Math.random() * others.length)] : x + (Math.random() < 0.5 ? -8 : 8);
  }
  /** The gap nearest a point on the counter. */
  private near(x: number) { return this.spots.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a), this.spots[0] ?? x); }
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
    this.hopTo(this.near(x), () => {
      this.busy = true;
      const gen = this.gen;
      this.scene.tweens.chain({ targets: img, tweens: [
        { y: this.floor - this.size * 0.55, angle: 360, duration: 380, ease: "Sine.easeOut" },
        { y: this.floor, duration: 220, ease: "Bounce.easeOut" }],
        onComplete: () => { img.setAngle(0); if (gen !== this.gen) return; this.busy = false; this.next(); } });
    });
  }
}
