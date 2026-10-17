import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  output: 'standalone', poweredByHeader: false,
  turbopack: { root: path.resolve('.') },
  outputFileTracingRoot: path.resolve('.'),
  serverExternalPackages: ['pg', 'pino', 'sharp'],
  experimental: { cpus: 1 },
};
export default config;
