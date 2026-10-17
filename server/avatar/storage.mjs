import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile, rename, rm, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { avatarConfig, lifetimeMs } from './config.mjs';

function file(id, suffix = '') {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid payload identifier');
  return path.join(avatarConfig().directory, id + '.bin' + suffix);
}
async function key() {
  const value = await readFile(avatarConfig().keyFile);
  if (value.length !== 32) throw new Error('Invalid avatar storage configuration');
  return value;
}
export async function storageReady() {
  const value = await key(); value.fill(0);
  await mkdir(avatarConfig().directory, { recursive: true, mode: 0o700 });
}
export async function savePayload(id, value) {
  await writeFile(file(id, '.tmp'), await encryptAvatar(id, value), { mode: 0o600 });
  await rename(file(id, '.tmp'), file(id));
}
export async function encryptAvatar(id, value) {
  const secret = await key(), iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secret, iv);
  cipher.setAAD(Buffer.from(id));
  const plain = Buffer.from(JSON.stringify(value));
  try {
    return Buffer.concat([iv, cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
  } finally { plain.fill(0); secret.fill(0); }
}
export async function loadPayload(id) {
  return decryptAvatar(id, await readFile(file(id)));
}
export async function decryptAvatar(id, encrypted) {
  const secret = await key();
  let plain;
  try {
    const decipher = createDecipheriv('aes-256-gcm', secret, encrypted.subarray(0, 12));
    decipher.setAAD(Buffer.from(id)); decipher.setAuthTag(encrypted.subarray(-16));
    plain = Buffer.concat([decipher.update(encrypted.subarray(12, -16)), decipher.final()]);
    return JSON.parse(plain.toString('utf8'));
  } finally { secret.fill(0); plain?.fill(0); }
}
export async function erasePayload(id) {
  await Promise.all([rm(file(id), { force: true }), rm(file(id, '.tmp'), { force: true })]);
}
export async function sweepPayloads() {
  const directory = avatarConfig().directory;
  for (const name of await readdir(directory)) {
    if (!/^[a-f0-9-]{36}\.bin(?:\.tmp)?$/.test(name)) continue;
    const location = path.join(directory, name);
    const metadata = await stat(location).catch(() => null);
    if (metadata && Date.now() - metadata.mtimeMs > lifetimeMs) await rm(location, { force: true });
  }
}
