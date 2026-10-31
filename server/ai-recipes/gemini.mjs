import { readFileSync } from 'node:fs';
import { logger } from '../config.mjs';
import { loadProviderKey } from './secret.mjs';

/**
 * Gemini access. Preferred: the Google AI Studio key staff entered in the admin console (ops.provider_secret,
 * encrypted), called directly. Fallback: the Cloudflare AI Gateway (Google AI Studio provider, BYOK alias "default")
 * with the gateway token the server already holds. AI_RECIPES_LOCAL_URL points at a local stub for checks.
 */
export class GeminiError extends Error {
  constructor(status, message) { super(message); this.status = status; this.retired = false; }
}
const DIRECT = 'https://generativelanguage.googleapis.com/v1beta/models/';

export async function geminiConfig() {
  // Google retires model names for new accounts (gemini-2.5-flash was by Oct 2026); generate() falls back to the -latest alias on that 404.
  const model = process.env.AI_RECIPES_MODEL || 'gemini-3.8-flash', strong = process.env.AI_RECIPES_STRONG_MODEL || 'gemini-pro-latest';
  const local = process.env.NODE_ENV !== 'production' && process.env.AI_RECIPES_LOCAL_URL ? process.env.AI_RECIPES_LOCAL_URL : null;
  if (local) return { enabled: true, mode: 'local', base: local, model, strong, headers: {} };
  const apiKey = await loadProviderKey('gemini');
  if (apiKey) return { enabled: true, mode: 'direct', base: DIRECT, model, strong, headers: { 'x-goog-api-key': apiKey } };
  const account = process.env.CLOUDFLARE_ACCOUNT_ID || '', gateway = process.env.CLOUDFLARE_GATEWAY_ID || '';
  let token = '';
  try { token = readFileSync(process.env.CLOUDFLARE_GATEWAY_TOKEN_FILE || '', 'utf8').trim(); } catch { /* Stays unavailable. */ }
  const valid = /^[a-f0-9]{32}$/.test(account) && /^[a-z0-9-]{1,64}$/.test(gateway) && /^[\x21-\x7e]{20,512}$/.test(token);
  return { enabled: Boolean(valid), mode: 'gateway', model, strong,
    base: `https://gateway.ai.cloudflare.com/v1/${account}/${gateway}/google-ai-studio/v1beta/models/`,
    headers: valid ? { 'cf-aig-authorization': 'Bearer ' + token, 'cf-aig-byok-alias': 'default' } : {} };
}

/** One generateContent call; returns the parsed JSON the schema asked for plus token usage. */
export async function generate(options) {
  try { return await call(options); }
  catch (error) {
    if (!(error instanceof GeminiError) || !error.retired) throw error;
    logger.warn({ event: 'ai_recipes_model_retired', model: options.model ?? 'default', fallback: FALLBACK });
    return call({ ...options, model: FALLBACK });
  }
}
const FALLBACK = 'gemini-flash-latest';

async function call({ parts, schema = null, system = null, tools = null, model = null, signal = undefined, maxOutputTokens = 8192 }) {
  const config = await geminiConfig();
  if (!config.enabled) throw new GeminiError(503, 'AI recipes are not configured.');
  const body = {
    contents: [{ role: 'user', parts }],
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    ...(tools ? { tools } : {}),
    generationConfig: { temperature: 0.2, maxOutputTokens, ...(schema ? { responseMimeType: 'application/json', responseSchema: schema } : {}) },
  };
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 240000);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });
  let response;
  try {
    response = await fetch(config.base + (model ?? config.model) + ':generateContent', { method: 'POST', redirect: 'error',
      headers: { 'content-type': 'application/json', ...config.headers }, body: JSON.stringify(body), signal: controller.signal });
  } catch {
    throw new GeminiError(502, controller.signal.aborted ? 'The model took too long.' : 'The model could not be reached.');
  } finally { clearTimeout(timer); }
  const text = await response.text();
  if (!response.ok) {
    // Status and a short, key-free excerpt only.
    logger.warn({ event: 'ai_recipes_model_error', mode: config.mode, status: response.status, body: (config.headers['x-goog-api-key'] ? text.split(config.headers['x-goog-api-key']).join('[key]') : text).replace(/AIza[\w-]+/g, '[key]').slice(0, 300) });
    if (response.status === 404 && (model ?? config.model) !== FALLBACK && /no longer available|not found/i.test(text)) {
      const retired = new GeminiError(502, 'The model is no longer available.'); retired.retired = true; throw retired;
    }
    throw new GeminiError(response.status === 429 ? 429 : 502, response.status === 429 ? 'The model is busy. Try again in a few minutes.'
      : response.status === 401 || response.status === 403 ? 'The AI key was refused. Staff need to check it in the console.' : 'The model returned an error.');
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
  // Search results come as Google redirect links; `pages` keeps each page's title (its site) for people to read, at the
  // same index as the response's grounding chunks (null when unusable), and `supports` maps answer sentences to pages.
  const grounding = candidate?.groundingMetadata ?? {};
  const pages = (grounding.groundingChunks ?? []).map(chunk => typeof chunk.web?.uri === 'string' && chunk.web.uri.length <= 2000
    ? { url: chunk.web.uri, title: String(chunk.web.title ?? '').slice(0, 120) } : null);
  const supports = (grounding.groundingSupports ?? []).map(support => ({ text: String(support.segment?.text ?? ''),
    pages: (support.groundingChunkIndices ?? []).filter(index => pages[index]) }));
  return { data: parsed, usage: { input: usage.promptTokenCount ?? 0, output: usage.candidatesTokenCount ?? 0, model: model ?? config.model },
    sources: pages.filter(Boolean).map(page => page.url), pages, supports };
}

