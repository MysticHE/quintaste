import 'server-only';
import { settings, secret } from './config';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { HttpError, throttle } from './http';

export async function gatewayStatus(member: Session) {
  authorize(member, 'integrations');
  const config = settings();
  const latest = (await query('SELECT status,http_status,checked_at FROM ops.integration_check WHERE provider=$1 ORDER BY id DESC LIMIT 1', ['openai'])).rows[0] || null;
  return { account: config.cloudflareAccount, gateway: config.gateway, alias: 'default',
    credentialConfigured: Boolean(secret('CLOUDFLARE_GATEWAY_TOKEN')), latest,
    dashboard: `https://dash.cloudflare.com/${encodeURIComponent(config.cloudflareAccount)}/ai/ai-gateway`,
    generationEnabled: false, note: 'A connection check does not enable customer AI generation.' };
}
export async function checkGateway(member: Session, reason: string) {
  authorize(member, 'integrations', true);
  const config = settings(); const credential = secret('CLOUDFLARE_GATEWAY_TOKEN');
  if (!/^[a-f0-9]{32}$/.test(config.cloudflareAccount) || !/^[a-z0-9-]{1,64}$/.test(config.gateway) || !credential) {
    throw new HttpError(503, 'The gateway connection has not been configured on the server.');
  }
  await throttle('gateway-probe-daily', 3, 86400);
  await transaction(async db => {
    await lockPermission(db, member, 'integrations', true);
    await audit(db, member.id, 'integration.check_started', 'openai', reason);
  });
  let status = 'network_error'; let httpStatus: number | null = null;
  try {
    const response = await fetch(`https://gateway.ai.cloudflare.com/v1/${config.cloudflareAccount}/${config.gateway}/openai/chat/completions`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', 'cf-aig-authorization': `Bearer ${credential}`,
        'cf-aig-byok-alias': 'default', 'cf-aig-skip-cache': 'true', 'cf-aig-collect-log-payload': 'false' },
      body: JSON.stringify({ model: 'gpt-4.1-mini', messages: [{ role: 'user', content: 'Reply OK.' }], max_tokens: 8 }),
    });
    httpStatus = response.status;
    status = response.ok ? 'invalid_provider_response' : response.status === 401 || response.status === 403 ? 'authorization_failed'
      : response.status === 429 ? 'quota_or_rate_limit' : 'provider_error';
    if (response.ok && response.body) {
      const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      try {
        while (size<=16384) { const chunk=await reader.read(); if(chunk.done) break; size+=chunk.value.length; chunks.push(chunk.value); }
        if (size<=16384) {
          const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (Array.isArray(payload.choices) && typeof payload.choices[0]?.message?.content==='string') status='connected_text_probe';
        }
      } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
    } else await response.body?.cancel();
  } catch { /* Persist only a safe category, never an upstream body or credential. */ }
  await transaction(async db => {
    await db.query('INSERT INTO ops.integration_check(provider,status,http_status) VALUES($1,$2,$3)', ['openai', status, httpStatus]);
    await audit(db, member.id, 'integration.check_finished', 'openai', reason, { status, httpStatus });
  });
  return { status, httpStatus };
}
