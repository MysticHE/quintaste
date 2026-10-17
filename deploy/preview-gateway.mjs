import http from 'node:http';
import { spawn } from 'node:child_process';

const webOrigin = new URL(process.env.EXPO_PUBLIC_API_URL);
if (webOrigin.protocol !== 'https:') throw new Error('Preview requires an HTTPS app URL.');

const metro = spawn(process.execPath, ['node_modules/expo/bin/cli', 'start', '--go', '--lan', '--port', '8081', '--max-workers', '1'], {
  stdio: ['ignore', 'inherit', 'inherit'], env: process.env,
});
metro.on('error', () => process.exit(1));
metro.on('exit', code => process.exit(code || 1));
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const allowed = url.pathname === '/' || url.pathname === '/status' ||
    url.pathname.startsWith('/assets/') || url.pathname === '/node_modules/expo-router/entry.bundle';
  if (!allowed || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404).end(); return;
  }
  if (url.pathname === '/' && !req.headers['expo-platform'] &&
    req.headers.accept?.includes('text/html')) {
    res.writeHead(307, {
      location: webOrigin.origin,
      'cache-control': 'no-store',
      vary: 'Accept, Expo-Platform',
    }).end();
    return;
  }
  if (url.pathname.endsWith('.bundle')) {
    url.searchParams.set('dev', 'false');
    url.searchParams.set('minify', 'true');
    url.searchParams.set('lazy', 'false');
  }
  const upstream = http.request({ hostname: '127.0.0.1', port: 8081, path: url.pathname + url.search,
    method: req.method, headers: { ...req.headers, host: process.env.PREVIEW_HOST } }, response => {
    res.writeHead(response.statusCode, { ...response.headers, 'cache-control': 'no-store' });
    response.pipe(res);
  });
  upstream.setTimeout(240000, () => upstream.destroy());
  upstream.on('error', () => { if (!res.headersSent) res.writeHead(503); res.end('Preview is starting. Retry shortly.'); });
  req.on('aborted', () => upstream.destroy());
  upstream.end();
});
server.listen(8080, '0.0.0.0');
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { metro.kill(signal); server.close(); });
