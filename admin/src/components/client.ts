'use client';
import { useEffect, useState, useCallback } from 'react';

export function navigateFresh(path: string) {
  // Authentication transitions discard the current document and its cached staff state.
  window.location.assign(new URL(path, window.location.origin).href);
}

export async function api<T>(path: string, input?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: input === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal,
    headers: input === undefined ? {} : { 'Content-Type': 'application/json', 'x-quintaste-admin': '1' },
    body: input === undefined ? undefined : JSON.stringify(input) });
  const value = response.status === 204 ? {} : await response.json();
  if (!response.ok) {
    if (response.status === 401) navigateFresh('/');
    if (response.status === 428) navigateFresh('/verify');
    throw new Error(value.error || 'Request failed. Try again.');
  }
  return value as T;
}
export function useResource<T>(path: string | null) {
  const [version,setVersion] = useState(0);
  const key = `${path}:${version}`;
  const [result,setResult] = useState<{ key: string; data: T | null; error: string } | null>(null);
  const reload = useCallback(() => setVersion(v => v+1), []);
  useEffect(() => {
    const controller = new AbortController();
    if (!path) return () => controller.abort();
    api<T>(path, undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ key, data, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key, data: null, error: error instanceof Error ? error.message : 'Request failed.' });
    });
    return () => controller.abort();
  },[path,key]);
  const current = path && result?.key === key ? result : null;
  // While the same resource reloads, keep showing what was there, so open panels and their confirmations stay mounted.
  const previous = path && result && result.key.slice(0, result.key.lastIndexOf(':')) === path ? result : null;
  return { data: (current ?? previous)?.data || null, error: current?.error || '', loading: Boolean(path && !current), reload };
}
export function date(value: unknown) {
  if (typeof value !== 'string' || !value) return '—';
  return new Date(value).toLocaleString();
}
