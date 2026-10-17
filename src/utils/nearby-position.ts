import * as Location from "expo-location";

export async function nearbyPosition(current: () => boolean) {
  const enabled = await Location.hasServicesEnabledAsync();
  if (!current()) return null;
  if (!enabled) throw new Error("LOCATION_SETTINGS");
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!current()) return null;
  if (!permission.granted) throw new Error("LOCATION_PERMISSION");
  const previous = await Location.getLastKnownPositionAsync({ maxAge: 60000, requiredAccuracy: 1000 });
  if (!current()) return null;
  return previous ?? Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: false });
}
