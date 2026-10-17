import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LocalServiceError } from "../local-explore/store";
import { avatarConfig } from "./config";
import { avatarFrame } from "./images";
import { basePrompt, expressionPrompt } from "./prompts";
import type { AvatarState } from "../../types/avatar";

async function boundedResponse(response: Response) {
  if (!response.body) throw new Error("Empty response");
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.length; if (length > 20 * 1024 * 1024) throw new Error("Response too large");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as { data?: { b64_json?: unknown }[] };
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
export async function renderAvatarFrame(input: Buffer, state: AvatarState, signal: AbortSignal) {
  const config = avatarConfig();
  if (!config.enabled || !config.key) throw new LocalServiceError(503, "Avatar generation is not configured yet.");
  const body = new FormData();
  body.set("model", config.model); body.set("prompt", state === "base" ? basePrompt : expressionPrompt(state));
  body.set("n", "1"); body.set("size", "1024x1024"); body.set("quality", "high");
  body.set("background", "transparent"); body.set("output_format", "webp"); body.set("output_compression", "85");
  body.append("image[]", new Blob([new Uint8Array(input)], { type: state === "base" ? "image/jpeg" : "image/webp" }), "portrait." + (state === "base" ? "jpg" : "webp"));
  if (state === "base") for (const name of ["hormozi-base.webp", "graham-base.webp"]) {
    const bytes = await readFile(join(process.cwd(), "server-assets", "avatar", name));
    body.append("image[]", new Blob([new Uint8Array(bytes)], { type: "image/webp" }), name);
  }
  const abort = new AbortController(), cancel = () => abort.abort();
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  const timer = setTimeout(cancel, 180000);
  try {
    // Fixed destination, no redirects, no SDK retries, and no client-supplied model or prompt.
    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST", headers: { Authorization: "Bearer " + config.key }, body, signal: abort.signal, redirect: "error",
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new LocalServiceError(response.status === 429 ? 429 : 502,
        response.status === 429 ? "The image service is busy. Your saved avatar is unchanged." : "The image service could not create this avatar. Your saved avatar is unchanged.");
    }
    const result = await boundedResponse(response), encoded = result.data?.[0]?.b64_json;
    if (result.data?.length !== 1 || typeof encoded !== "string" || encoded.length > 16000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("Invalid result");
    return await avatarFrame(Buffer.from(encoded, "base64"));
  } catch (error) {
    if (error instanceof LocalServiceError) throw error;
    throw new LocalServiceError(502, signal.aborted ? "Avatar generation cancelled." : "The image service timed out or returned an unusable image. Your saved avatar is unchanged.");
  } finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); }
}
