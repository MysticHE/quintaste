import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/** Production requests are capped at 16 KB at the edge, so a Social picture is a small square JPEG under 15,000 characters. */
const limit = 15000;
/**
 * A centred square, 160 pixels, made on the device from an avatar frame or a chosen photo. Gets smaller and softer
 * until it fits; throws when even the smallest version is too large.
 */
export async function prepareFace(uri: string, width?: number, height?: number) {
  for (const [size, compress] of [[160, 0.72], [144, 0.6], [128, 0.5]] as const) {
    const context = ImageManipulator.manipulate(uri);
    let image;
    try {
      if (width && height && width !== height) {
        const side = Math.min(width, height);
        context.crop({ originX: Math.round((width - side) / 2), originY: Math.round((height - side) / 2), width: side, height: side });
      }
      context.resize({ width: size, height: size });
      image = await context.renderAsync();
      const result = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
      const data = result.base64 ? "data:image/jpeg;base64," + result.base64 : "";
      if (data && data.length <= limit) return data;
    } finally { image?.release(); context.release(); }
  }
  throw new Error("That picture is too detailed. Choose another.");
}
