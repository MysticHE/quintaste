import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Open state, highlighted row and keys for a search box with a suggestion list (Explore location search, Cook recipe search).
 * Blur closes after 150 ms so a tap on a row (which calls keepOpen on press-in) lands first.
 */
export function useSuggestionKeys() {
  const [open, setOpen] = useState(false), [index, setIndex] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepOpen = useCallback(() => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);
  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);
  return {
    open, setOpen, index, setIndex, keepOpen,
    focus: () => { keepOpen(); setOpen(true); },
    blur: () => { blurTimer.current = setTimeout(() => setOpen(false), 150); },
    /** Arrow keys move the highlight over `count` rows (wrapping) and open the list; Escape closes it. True when handled. */
    key: (key: string, count: number) => {
      if (key === "Escape") { setOpen(false); return true; }
      if (key !== "ArrowDown" && key !== "ArrowUp") return false;
      setOpen(true);
      setIndex(current => count ? current < 0 ? (key === "ArrowDown" ? 0 : count - 1)
        : (current + (key === "ArrowDown" ? 1 : -1) + count) % count : -1);
      return true;
    },
  };
}
