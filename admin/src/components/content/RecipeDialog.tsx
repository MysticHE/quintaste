'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { IconButton } from '../Primitives';
export function RecipeDialog({ title, children, actions, onClose }: { title: string; children?: ReactNode; actions?: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog className="recipe-dialog" ref={ref} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2>{title}</h2><IconButton icon="close" label="Close" onClick={onClose}/></header>
    {children && <div className="recipe-dialog-body">{children}</div>}
    <footer>{actions ?? <button type="button" onClick={onClose}>Close</button>}</footer>
  </dialog>;
}
