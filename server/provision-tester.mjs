import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { auth, eligibility } from './auth.mjs';
import { origin, pool, registrationOpen } from './config.mjs';

if (registrationOpen) throw new Error('Synthetic provisioning is only allowed while public registration is closed.');
const email = process.env.TEST_ACCOUNT_EMAIL || 'tester@quintaste.invalid';
if (!/^[a-z0-9-]+@quintaste\.invalid$/.test(email)) throw new Error('Use a synthetic @quintaste.invalid address.');
const existing = await pool.query('SELECT id FROM "user" WHERE email=$1', [email]);
if (existing.rowCount) throw new Error('This test account already exists; credentials were not changed.');
const password = randomBytes(24).toString('base64url');
try {
  const result = await eligibility.run({ adult: true }, () => auth.api.signUpEmail({
    body: { email, username: email.split('@')[0].replaceAll('-', '_'), password, name: 'QuinTaste Tester' },
  }));
  await writeFile('/app/.local/staging-access-' + email.split('@')[0] + '.json', JSON.stringify({ url: origin, username: result.user.username, password }, null, 2) + '\n', { mode: 0o600 });
  process.stdout.write('Synthetic test account created; access details saved privately.\n');
} finally { await pool.end(); }
