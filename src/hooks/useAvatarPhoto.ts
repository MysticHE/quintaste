import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { prepareAvatarPhoto } from '../utils/avatar-photo';
export function useAvatarPhoto() {
  const [photo, setPhoto] = useState<string>(), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const alive = useRef(true), revision = useRef(0);
  const [needsSettings, setNeedsSettings] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const clear = useCallback(() => { revision.current++; setPhoto(undefined); setError(""); setNeedsSettings(false); }, []);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const version = revision.current;
    void ImagePicker.getPendingResultAsync().then(async result => {
      if (!result || !alive.current || version !== revision.current) return;
      if ('code' in result) throw new Error('The camera could not return your photo. Try again or choose from Photos.');
      if (result.canceled || !result.assets?.[0]) return;
      setBusy(true);
      const prepared = await prepareAvatarPhoto(result.assets[0]);
      if (alive.current && version === revision.current) setPhoto(prepared);
    }).catch(() => { if (alive.current) setError('Your camera photo could not be restored. Take another selfie or choose from Photos.'); })
      .finally(() => { if (alive.current && version === revision.current) setBusy(false); });
  }, []);
  const choose = async (camera = false) => {
    if (busy) return;
    const version = ++revision.current; setBusy(true); setError(""); setNeedsSettings(false);
    try {
      if (camera && Platform.OS !== "web") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setNeedsSettings(!permission.canAskAgain); throw new Error("Camera access is off. Allow it in Settings, or choose a photo instead."); }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], base64: false, quality: 1, allowsMultipleSelection: false, exif: false, cameraType: ImagePicker.CameraType.front };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !alive.current || version !== revision.current) return;
      const prepared = await prepareAvatarPhoto(result.assets[0]);
      if (alive.current && version === revision.current) setPhoto(prepared);
    } catch (error) { if (alive.current && version === revision.current) setError(error instanceof Error ? error.message : "The photo picker is unavailable. Try again."); }
    finally { if (alive.current) setBusy(false); }
  };
  return { photo, busy, error, needsSettings, choose, clear };
}
