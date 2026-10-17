import { useCallback, useEffect, useRef } from "react";
import { useFood } from "../state/Food";
import type { ExploreLocalDocument } from "../types/explore-local";

export function useExploreCollection() {
  const { doc, update, owner, ready, readable, dirty, saving } = useFood();
  const current = useRef(doc.exploreLocal);
  useEffect(() => { current.current = doc.exploreLocal; }, [doc.exploreLocal]);
  const commit = useCallback((change: (value: ExploreLocalDocument) => ExploreLocalDocument) => {
    const next = change(current.current);
    if (JSON.stringify(next) === JSON.stringify(current.current)) return Promise.resolve(true);
    return update(value => ({ ...value, exploreLocal: change(value.exploreLocal) }));
  }, [update]);
  return { current, collection: doc.exploreLocal, commit, owner, ready, readable, dirty, saving };
}
