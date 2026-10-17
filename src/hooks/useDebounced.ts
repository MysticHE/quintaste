import { useEffect, useState } from "react";
/** The value after it has stopped changing for `delay` milliseconds. */
export function useDebounced<T>(value: T, delay = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setSettled(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return settled;
}
