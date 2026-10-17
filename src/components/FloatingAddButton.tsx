import { useEffect, useState } from "react";
import { Keyboard } from "react-native";
import { IconButton } from "./food/Controls";
export function FloatingAddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return keyboardOpen ? null : <IconButton label={label} icon="add" onPress={onPress} />;
}
