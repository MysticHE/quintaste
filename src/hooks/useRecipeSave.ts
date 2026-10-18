import { useState } from "react";
import { useFood } from "../state/Food";

/** Save or unsave one recipe, ignoring taps while a save is in progress. Shaped for `ReactionColumn`'s `save`. */
export function useRecipeSave(id: string) {
  const { isSaved, toggleSave, readable } = useFood(), [busy, setBusy] = useState(false);
  const onPress = () => {
    if (busy || !readable) return;
    setBusy(true);
    void toggleSave("recipe", id).finally(() => setBusy(false));
  };
  return { saved: isSaved("recipe", id), busy, disabled: !readable, onPress };
}
