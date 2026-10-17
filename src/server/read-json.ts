export class BodyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function readSmallJson(request: Request, maximum = 4096): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new BodyError(400, "Invalid search request.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new BodyError(413, "Search request is too large."); }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    if (error instanceof BodyError) throw error;
    throw new BodyError(400, "Invalid search request.");
  } finally { reader.releaseLock(); }
}
