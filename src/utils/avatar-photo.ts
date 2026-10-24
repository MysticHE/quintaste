import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { translate, type Language } from '../i18n';

/** A bounded JPEG data URL of the chosen photo; problems are worded in `language`. */
export async function prepareAvatarPhoto(asset: ImagePickerAsset, language: Language = 'en') {
  if (!asset?.uri || !Number.isFinite(asset.width) || !Number.isFinite(asset.height) || Math.min(asset.width, asset.height) < 128) {
    throw new Error(translate(language, 'me', 'photoTooSmall'));
  }
  if (asset.width * asset.height > 100000000 || (asset.fileSize || 0) > 40 * 1024 * 1024) {
    throw new Error(translate(language, 'me', 'photoTooLargeToPrepare'));
  }
  const context = ImageManipulator.manipulate(asset.uri);
  let image;
  try {
    if (Math.max(asset.width, asset.height) > 1280) context.resize(asset.width >= asset.height ? { width: 1280 } : { height: 1280 });
    image = await context.renderAsync();
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
    if (!result.base64 || result.base64.length > 5592404) throw new Error(translate(language, 'me', 'preparedPhotoTooLarge'));
    return 'data:image/jpeg;base64,' + result.base64;
  } finally { image?.release(); context.release(); }
}
