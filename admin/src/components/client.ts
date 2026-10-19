'use client';
import { useEffect, useState, useCallback } from 'react';

export function navigateFresh(path: string) {
  // Authentication transitions discard the current document and its cached staff state.
  window.location.assign(new URL(path, window.location.origin).href);
}
/** An expired session signs in again through Google and returns to the same console page, at most once a minute per tab. */
export function signInAgain() {
  let recent = false;
  try {
    recent = Date.now() - Number(sessionStorage.getItem('qt-sign-in') || 0) < 60000;
    sessionStorage.setItem('qt-sign-in', String(Date.now()));
  } catch { /* Storage blocked: the server throttle still bounds the loop. */ }
  if (recent) return navigateFresh('/?error=stuck');
  const here = window.location.pathname + window.location.search;
  navigateFresh('/auth/login' + (here.startsWith('/console/') ? '?next=' + encodeURIComponent(here) : ''));
}
export async function api<T>(path: string, input?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: input === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal,
    headers: input === undefined ? {} : { 'Content-Type': 'application/json', 'x-quintaste-admin': '1' },
    body: input === undefined ? undefined : JSON.stringify(input) });
  const value = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) signInAgain();
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
  const previous = path && result?.data && result.key.slice(0, result.key.lastIndexOf(':')) === path ? result : null;
  return { data: (current ?? previous)?.data || null, error: current?.error || '', loading: Boolean(path && !current && !previous), reload };
}
export function date(value: unknown) {
  if (typeof value !== 'string' || !value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
/** Parses an optional numeric field; '' is "no value", anything else must be a finite number. */
export function optionalNumber(value: string, label: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Check ${label}.`);
  return parsed;
}
