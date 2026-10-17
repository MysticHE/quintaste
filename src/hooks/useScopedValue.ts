import { useCallback, useState } from "react";

export function useScopedValue<T>(scope: string, initial: T) {
  const [values, setValues] = useState<Record<string, T>>({});
  const setValue = useCallback((value: T) => setValues(current => ({ ...current, [scope]: value })), [scope]);
  return [values[scope] ?? initial, setValue] as const;
}
