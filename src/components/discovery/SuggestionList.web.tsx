import type { PropsWithChildren } from "react";

export function SuggestionList({ id, label, children }: PropsWithChildren<{ id: string; label: string }>) {
  return <div id={id} role="listbox" aria-label={label}>{children}</div>;
}
