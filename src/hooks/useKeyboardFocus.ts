import { useState } from "react";
import { Platform, type NativeSyntheticEvent, type TargetedEvent } from "react-native";

type Matchable = { matches?: (selector: string) => boolean };
/** Focus ring for keyboard focus only: on web a tap or click must not leave a selected-looking outline. */
export function useKeyboardFocus() {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    focusProps: {
      onFocus: (event: NativeSyntheticEvent<TargetedEvent>) => setFocused(Platform.OS !== "web" || (event.target as unknown as Matchable).matches?.(":focus-visible") === true),
      onBlur: () => setFocused(false),
      onPointerDown: () => setFocused(false),
    },
  };
}
