import { setTimeout as delay } from "node:timers/promises";

export class IdentityRequestGate {
  private nextStart = 0;
  private cooldownUntil = 0;
  private queue: Promise<void> = Promise.resolve();

  async enter(isStopped: () => boolean) {
    const previous = this.queue;
    let release = () => {};
    this.queue = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try {
      while (!isStopped()) {
        const wait = Math.max(this.nextStart, this.cooldownUntil) - Date.now();
        if (wait <= 0) { this.nextStart = Date.now() + 150; return; }
        await delay(Math.min(wait, 1000));
      }
      throw new Error("Identity pass interrupted before rate-limit reservation.");
    } finally { release(); }
  }

  cooldown() { this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + 60000); }
}
