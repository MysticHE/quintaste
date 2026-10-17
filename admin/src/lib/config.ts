import 'server-only';
import { readFileSync } from 'node:fs';

export function secret(name: string): string {
  const file = process.env[name + '_FILE'];
  return file ? readFileSync(file, 'utf8').trim() : process.env[name]?.trim() || '';
}
export function settings() {
  const origin = new URL(process.env.ADMIN_URL || 'http://localhost:3100');
  if (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:') throw new Error('Secure admin origin required');
  return { origin: origin.origin, rpId: origin.hostname,
    googleId: process.env.ADMIN_GOOGLE_CLIENT_ID || '',
    ownerEmail: (process.env.ADMIN_OWNER_EMAIL || '').toLowerCase().trim(),
    cloudflareAccount: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    gateway: process.env.CLOUDFLARE_GATEWAY_ID || 'quintaste',
  };
}
export function googleConfigured() {
  return Boolean(settings().googleId && secret('ADMIN_GOOGLE_CLIENT_SECRET'));
}
