import { useEffect, useState } from "react";

export function usePristineDraft<T>(incoming: T) {
  const [value, setValue] = useState(incoming);
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    if (edited) return;
    let active = true;
    void Promise.resolve().then(() => { if (active) setValue(incoming); });
    return () => { active = false; };
  }, [incoming, edited]);
  const change = (next: T) => { setEdited(true); setValue(next); };
  return [value, change] as const;
}
