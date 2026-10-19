import 'server-only';
import { createCipheriv, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { HttpError, text, throttle } from './http';

/**
 * Provider keys entered by staff (owner capability "integrations"): the Google AI Studio key for AI recipes.
 * Stored in ops.provider_secret as AES-256-GCM ciphertext under the provider-secret-key file shared with the app
 * (/run/secrets/quintaste/provider-secret-key here). The value is validated against Google before it is saved,
 * shown afterwards only as its last four characters, and never written to logs or the audit trail.
 */
// Google issues more than one key format, so only the character set and length are checked here; Google decides validity.
const PROVIDERS = { gemini: { label: 'Google AI Studio', pattern: /^[0-9A-Za-z._~+\/=-]{20,256}$/ } } as const;
type Provider = keyof typeof PROVIDERS;

function keyMaterial() {
  const file = process.env.PROVIDER_SECRET_KEY_FILE || '/run/secrets/quintaste/provider-secret-key';
  try {
    const hex = readFileSync(file, 'utf8').trim();
    return /^[0-9a-f]{64}$/i.test(hex) ? Buffer.from(hex, 'hex') : null;
  } catch { return null; }
}
function encrypt(key: Buffer, provider: string, plaintext: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(provider));
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}
function provider(value: unknown): Provider {
  if (value !== 'gemini') throw new HttpError(400, 'Unknown provider.');
  return value;
}

export async function providerKeyStatus(member: Session) {
  authorize(member, 'integrations');
  const row = (await query(`SELECT s.hint, s.updated_at, m.email FROM ops.provider_secret s LEFT JOIN staff.member m ON m.id=s.updated_by WHERE s.provider='gemini'`)).rows[0];
  const latest = (await query('SELECT status,http_status,checked_at FROM ops.integration_check WHERE provider=$1 ORDER BY id DESC LIMIT 1', ['gemini'])).rows[0] || null;
  return { gemini: { label: PROVIDERS.gemini.label, configured: Boolean(row), hint: row?.hint ?? '', updatedAt: row?.updated_at ?? null, updatedBy: row?.email ?? null, latest },
    encryptionReady: Boolean(keyMaterial()) };
}

/** Asks Google for the model list with the key; no generation, no cost. Returns a safe status category. */
async function probe(apiKey: string) {
  let httpStatus: number | null = null, status = 'network_error';
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', {
      redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'x-goog-api-key': apiKey } });
    httpStatus = response.status;
    status = response.ok ? 'connected' : response.status === 400 || response.status === 401 ? 'key_invalid'
      : response.status === 403 ? 'rejected_by_google' : response.status === 429 ? 'quota_or_rate_limit' : 'provider_error';
    await response.body?.cancel();
  } catch { /* A network failure is recorded as such; nothing from upstream is stored. */ }
  return { status, httpStatus };
}
const explain: Record<string, string> = {
  key_invalid: 'Google says this key is not valid. Copy it again from Google AI Studio.',
  rejected_by_google: 'Google rejected the key: the project is restricted (billing not linked to the project) or the key has API or application restrictions.',
  quota_or_rate_limit: 'Google accepted the key but the project has no quota right now (prepaid balance or rate limit).',
  provider_error: 'Google returned an error. Try again in a few minutes.',
  network_error: 'Google could not be reached from the server.',
};

export async function setProviderKey(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'integrations');
  const name = provider(input.provider);
  const material = keyMaterial();
  if (!material) throw new HttpError(503, 'The provider-secret-key file is not configured on the server.');
  const value = text(input.key, 'API key', 256, 20).trim();
  if (!PROVIDERS[name].pattern.test(value)) throw new HttpError(400, 'That key contains spaces or characters a Google key never has. Copy it again from Google AI Studio.');
  await throttle('provider-key-probe:' + member.id, 10, 3600);
  const { status, httpStatus } = await probe(value);
  await transaction(async db => {
    await lockPermission(db, member, 'integrations');
    await db.query('INSERT INTO ops.integration_check(provider,status,http_status) VALUES($1,$2,$3)', [name, status, httpStatus]);
    if (status !== 'connected') {
      await audit(db, member.id, 'integration.key_rejected', name, reason, { status, httpStatus });
      throw new HttpError(400, explain[status] ?? 'The key was not accepted.');
    }
    const hint = value.slice(-4);
    await db.query(`INSERT INTO ops.provider_secret(provider, ciphertext, hint, updated_by) VALUES($1,$2,$3,$4)
      ON CONFLICT(provider) DO UPDATE SET ciphertext=$2, hint=$3, updated_by=$4, updated_at=now(), key_version=ops.provider_secret.key_version+1`,
      [name, encrypt(material, name, value), hint, member.id]);
    await audit(db, member.id, 'integration.key_set', name, reason, { hint });
  });
  return { saved: true, note: 'Key accepted by Google and stored. The app picks it up within a minute.' };
}

export async function removeProviderKey(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'integrations');
  const name = provider(input.provider);
  return transaction(async db => {
    await lockPermission(db, member, 'integrations');
    const result = await db.query('DELETE FROM ops.provider_secret WHERE provider=$1', [name]);
    if (!result.rowCount) throw new HttpError(404, 'No key is stored.');
    await audit(db, member.id, 'integration.key_removed', name, reason);
    return { saved: true, note: 'Key removed. AI recipes stop within a minute unless the gateway fallback is configured.' };
  });
}

export async function checkProviderKey(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'integrations');
  const name = provider(input.provider);
  const row = (await query('SELECT ciphertext FROM ops.provider_secret WHERE provider=$1', [name])).rows[0];
  if (!row) throw new HttpError(404, 'No key is stored.');
  await throttle('provider-key-check:' + member.id, 10, 3600);
  // The console never decrypts a stored key; the app verifies it on use. This records that a key is present and when.
  await transaction(async db => {
    await lockPermission(db, member, 'integrations');
    await audit(db, member.id, 'integration.key_present', name, reason);
  });
  return { saved: true, note: 'A key is stored. Run an AI recipe in the app to exercise it.' };
}
