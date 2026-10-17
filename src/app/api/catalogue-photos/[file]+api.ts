import { readFile } from "node:fs/promises";
import path from "node:path";

// Local development only: production serves these reviewed assets from server/index.mjs before Expo routes.
const roots = [path.resolve("server-assets/catalogue"), path.resolve(".local/editorial/assets")];
export async function GET(_request: Request, { file }: { file: string }) {
  if (process.env.NODE_ENV !== "development" || !/^[a-f0-9]{64}\.jpg$/.test(file)) return new Response(null, { status: 404 });
  for (const root of roots) {
    const bytes = await readFile(path.join(root, file)).catch(() => null);
    if (bytes) return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  }
  return new Response(null, { status: 404 });
}
