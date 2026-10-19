import { readFileSync } from 'node:fs';
import { logger } from '../config.mjs';

/**
 * Gemini through the Cloudflare AI Gateway (Google AI Studio provider, BYOK). The Gemini key is stored in the gateway
 * under the alias "default"; this server sends only the gateway token it already holds for avatars.
 * AI_RECIPES_LOCAL_URL points the client at a local stub for checks without any provider call.
 */
export class GeminiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function geminiConfig() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID || '', gateway = process.env.CLOUDFLARE_GATEWAY_ID || '';
  const model = process.env.AI_RECIPES_MODEL || 'gemini-2.5-flash', strong = process.env.AI_RECIPES_STRONG_MODEL || 'gemini-2.5-pro';
  let token = '';
  try { token = readFileSync(process.env.CLOUDFLARE_GATEWAY_TOKEN_FILE || '', 'utf8').trim(); } catch { /* Stays unavailable. */ }
  const local = process.env.NODE_ENV !== 'production' && process.env.AI_RECIPES_LOCAL_URL ? process.env.AI_RECIPES_LOCAL_URL : null;
  const valid = local || (/^[a-f0-9]{32}$/.test(account) && /^[a-z0-9-]{1,64}$/.test(gateway) && /^[\x21-\x7e]{20,512}$/.test(token));
  const base = local ?? `https://gateway.ai.cloudflare.com/v1/${account}/${gateway}/google-ai-studio/v1beta/models/`;
  return { enabled: Boolean(valid), token, model, strong, base, local: Boolean(local) };
}

/** One generateContent call; returns the parsed JSON the schema asked for plus token usage. */
export async function generate({ parts, schema = null, system = null, tools = null, model = null, signal = undefined, maxOutputTokens = 8192 }) {
  const config = geminiConfig();
  if (!config.enabled) throw new GeminiError(503, 'AI recipes are not configured.');
  const body = {
    contents: [{ role: 'user', parts }],
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    ...(tools ? { tools } : {}),
    generationConfig: { temperature: 0.2, maxOutputTokens, ...(schema ? { responseMimeType: 'application/json', responseSchema: schema } : {}) },
  };
  const headers = { 'content-type': 'application/json' };
  if (!config.local) { headers['cf-aig-authorization'] = 'Bearer ' + config.token; headers['cf-aig-byok-alias'] = 'default'; }
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 240000);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });
  let response;
  try {
    response = await fetch(config.base + (model ?? config.model) + ':generateContent', { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
  } catch (error) {
    throw new GeminiError(502, controller.signal.aborted ? 'The model took too long.' : 'The model could not be reached.');
  } finally { clearTimeout(timer); }
  const text = await response.text();
  if (!response.ok) {
    logger.warn({ event: 'ai_recipes_model_error', status: response.status, body: text.slice(0, 300) });
    throw new GeminiError(response.status === 429 ? 429 : 502, response.status === 429 ? 'The model is busy. Try again in a few minutes.' : 'The model returned an error.');
  }
  let data;
  try { data = JSON.parse(text); } catch { throw new GeminiError(502, 'The model returned an unreadable reply.'); }
  const candidate = data.candidates?.[0];
  const finish = candidate?.finishReason;
  const output = (candidate?.content?.parts ?? []).map(part => part.text ?? '').join('');
  if (!output || (finish && !['STOP', 'MAX_TOKENS'].includes(finish))) throw new GeminiError(422, 'The model declined this content.');
  let parsed = output;
  if (schema) {
    try { parsed = JSON.parse(output); } catch { throw new GeminiError(502, 'The model returned invalid JSON.'); }
  }
  const usage = data.usageMetadata ?? {};
  const grounding = candidate?.groundingMetadata?.groundingChunks?.map(chunk => chunk.web?.uri).filter(Boolean) ?? [];
  return { data: parsed, usage: { input: usage.promptTokenCount ?? 0, output: usage.candidatesTokenCount ?? 0, model: model ?? config.model }, sources: grounding };
}
