import { normalizeSelfie as normalize, avatarFrame as frame } from "../../../server/avatar/media.mjs";
import { LocalServiceError } from "../local-explore/store";
async function localError<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch (error) {
    const failure = error as { status?: number; message?: string };
    throw new LocalServiceError(failure.status || 500, failure.message || "Image processing failed.");
  }
}
export const normalizeSelfie = (value: unknown) => localError(() => normalize(value));
export const avatarFrame = (bytes: Buffer) => localError(() => frame(bytes));
