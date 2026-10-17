import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

export async function prepareAvatarPhoto(asset: ImagePickerAsset) {
  if (!asset?.uri || !Number.isFinite(asset.width) || !Number.isFinite(asset.height) || Math.min(asset.width, asset.height) < 128) {
    throw new Error('Choose a clear photo at least 128 pixels wide and tall.');
  }
  if (asset.width * asset.height > 100000000 || (asset.fileSize || 0) > 40 * 1024 * 1024) {
    throw new Error('This photo is too large to prepare. Take a standard-resolution selfie or choose a smaller photo.');
  }
  const context = ImageManipulator.manipulate(asset.uri);
  let image;
  try {
    if (Math.max(asset.width, asset.height) > 1280) context.resize(asset.width >= asset.height ? { width: 1280 } : { height: 1280 });
    image = await context.renderAsync();
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
    if (!result.base64 || result.base64.length > 5592404) throw new Error('The prepared photo is too large. Choose another photo.');
    return 'data:image/jpeg;base64,' + result.base64;
  } finally { image?.release(); context.release(); }
}
