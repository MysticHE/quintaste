import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_BASICS, basicsKey, readItems, type FoodItem } from "../utils/my-ingredients";

/**
 * The member's kitchen basics for My ingredients, kept on this device for their account (default rice, oil, salt, soy sauce).
 * `ready` turns true once the saved list is read, so nothing is sent with the default by mistake; an edit made before then wins.
 */
export function useBasics(userId: string | null | undefined) {
  // The account whose saved list has been read: ready only for the account now signed in.
  const [basics, setBasics] = useState<FoodItem[]>(DEFAULT_BASICS), [readFor, setReadFor] = useState<string | null>(null);
  const alive = useRef(true), edited = useRef(false);
  useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => {
    if (!userId) return;
    edited.current = false;
    void AsyncStorage.getItem(basicsKey(userId)).then(raw => { if (alive.current && !edited.current) setBasics(readItems(raw) ?? DEFAULT_BASICS); })
      .catch(() => {}).finally(() => { if (alive.current) setReadFor(userId); });
  }, [userId]);
  const save = (next: FoodItem[]) => {
    edited.current = true;
    setBasics(next);
    if (userId) void AsyncStorage.setItem(basicsKey(userId), JSON.stringify(next)).catch(() => {});
  };
  return { basics, setBasics: save, ready: !!userId && readFor === userId };
}
