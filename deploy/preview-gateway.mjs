import http from 'node:http';
import { spawn } from 'node:child_process';

const webOrigin = new URL(process.env.EXPO_PUBLIC_API_URL);
if (webOrigin.protocol !== 'https:') throw new Error('Preview requires an HTTPS app URL.');

// Two Metro workers keep transforms off Metro's main thread (peak about 770 MiB of the 1800m limit). If Metro still
// misses a /status reply while alive and answered within BUSY_LIMIT, report it as running (busy) instead of failing
// the healthcheck, which would make Traefik drop the preview route mid-build.
const BUSY_LIMIT = 10 * 60 * 1000;
const STATUS_TIMEOUT = 3000;
const BUNDLE_TIMEOUT = 600000;
const NATIVE = new Set(['android', 'ios']);
let lastMetroReply = 0;

const metro = spawn(process.execPath, ['node_modules/expo/bin/cli', 'start', '--go', '--lan', '--port', '8081', '--max-workers', '2'], {
  stdio: ['ignore', 'inherit', 'inherit'], env: process.env,
});
metro.on('error', () => process.exit(1));
metro.on('exit', code => process.exit(code || 1));

function forward(req, res, path, timeout, onFail) {
  const upstream = http.request({ hostname: '127.0.0.1', port: 8081, path,
    method: req.method, headers: { ...req.headers, host: process.env.PREVIEW_HOST } }, response => {
    lastMetroReply = Date.now();
    res.writeHead(response.statusCode, { ...response.headers, 'cache-control': 'no-store' });
    response.pipe(res);
  });
  let failed = false;
  const fail = () => { if (failed) return; failed = true; upstream.destroy(); if (!res.headersSent) onFail(); else res.end(); };
  upstream.setTimeout(timeout, fail);
  upstream.on('error', fail);
  req.on('aborted', () => upstream.destroy());
  upstream.end();
}

const starting = res => () => res.writeHead(503, { 'cache-control': 'no-store' }).end('Preview is starting. Retry shortly.');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const allowed = url.pathname === '/' || url.pathname === '/status' ||
    url.pathname.startsWith('/assets/') || url.pathname === '/node_modules/expo-router/entry.bundle';
  if (!allowed || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404).end(); return;
  }
  // Only Expo Go manifests reach Metro at "/": anything else would start a web server render and web bundle.
  const platform = String(req.headers['expo-platform'] ?? url.searchParams.get('platform') ?? '');
  if (url.pathname === '/' && !NATIVE.has(platform)) {
    res.writeHead(307, {
      location: webOrigin.origin,
      'cache-control': 'no-store',
      vary: 'Accept, Expo-Platform',
    }).end();
    return;
  }
  if (url.pathname === '/status') {
    forward(req, res, url.pathname, STATUS_TIMEOUT, () => {
      const busy = metro.exitCode === null && lastMetroReply > 0 && Date.now() - lastMetroReply < BUSY_LIMIT;
      if (busy) res.writeHead(200, { 'cache-control': 'no-store', 'x-preview-status': 'busy' }).end('packager-status:running');
      else res.writeHead(503, { 'cache-control': 'no-store' }).end('packager-status:unresponsive');
    });
    return;
  }
  if (url.pathname.endsWith('.bundle')) {
    if (!NATIVE.has(url.searchParams.get('platform') ?? '')) { res.writeHead(404).end(); return; }
    url.searchParams.set('dev', 'false');
    url.searchParams.set('minify', 'true');
    url.searchParams.set('lazy', 'false');
  }
  forward(req, res, url.pathname + url.search, BUNDLE_TIMEOUT, starting(res));
});
server.listen(8080, '0.0.0.0');
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { metro.kill(signal); server.close(); });
