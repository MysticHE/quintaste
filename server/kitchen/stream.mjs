/** One disk read per tick for all viewers, bounded connections and no per-client queues. */
export function feedStream(read) {
  const clients = new Map();
  let timer, reading = false, latest, ticks = 0;
  const send = (res, body) => {
    if (!res.destroyed && !res.write(body)) res.destroy(); // a slow viewer reconnects to the latest snapshot
  };
  async function tick() {
    if (reading) return;
    reading = true;
    try {
      const value = await read();
      if (value !== latest) {
        latest = value;
        for (const res of clients.keys()) send(res, `event: feed\ndata: ${value}\n\n`);
      }
      if (++ticks % 15 === 0) {
        for (const res of clients.keys()) send(res, 'event: heartbeat\ndata: {}\n\n');
      }
    } catch { /* Keep the last snapshot's timestamp; the page marks it delayed. */ }
    finally { reading = false; }
  }
  return (req, res) => {
    if (req.method !== 'GET') return res.sendStatus(405);
    // This exact GET route bypasses the proxy's buffering. It accepts no request body.
    if (req.headers['transfer-encoding'] || Number(req.headers['content-length'] ?? 0) !== 0) return res.sendStatus(400);
    if (clients.size >= 200 || [...clients.values()].filter(ip => ip === req.ip).length >= 20) return res.sendStatus(503);
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    clients.set(res, req.ip);
    const expiry = setTimeout(() => res.end(), 5 * 60_000);
    res.once('close', () => {
      clearTimeout(expiry);
      clients.delete(res);
      if (!clients.size) { clearInterval(timer); timer = undefined; latest = undefined; }
    });
    send(res, 'retry: 5000\n\n');
    if (latest) send(res, `event: feed\ndata: ${latest}\n\n`);
    if (!timer) { timer = setInterval(() => void tick(), 1000); timer.unref(); }
    void tick();
  };
}
