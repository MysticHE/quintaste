import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { avatarRequest } from '../utils/avatar-api';
import { readAvatar, sampleAvatar } from '../utils/avatar-schema';
import type { Avatar } from '../types/avatar';
import type { FoodDocument } from '../types/food';
import { useT } from '../i18n';

export type AvatarItem = { id: string; createdAt: number; thumbnail: string; recipe?: Avatar['recipe']; form?: Avatar['form'] };
type Library = { items: AvatarItem[]; selected: string | null };
type Options = { scope: string; enabled: boolean; avatar: Avatar | null; update: (change: (doc: FoodDocument) => FoodDocument) => Promise<boolean> };
export function useAccountAvatars(options: Options) {
  const [state, setState] = useState({ scope: '', items: [] as AvatarItem[], loading: false, ready: false, error: '' });
  const t = useT('me'), say = useRef(t);
  const current = useRef(options), controller = useRef<AbortController | null>(null), locked = useRef(false);
  useLayoutEffect(() => { current.current = options; say.current = t; });
  const run = useCallback(async (action: (request: <T>(path: string, init?: RequestInit) => Promise<T>) => Promise<void>) => {
    if (!current.current.enabled || locked.current) return false;
    const scope = current.current.scope, active = new AbortController();
    locked.current = true; controller.current = active;
    setState(value => ({ ...value, ...(value.scope !== scope ? { items: [], ready: false } : {}), scope, loading: true, error: '' }));
    const request = async <T,>(path: string, init: RequestInit = {}) => {
      const value = await avatarRequest<T>('profile', 'library' + path, { ...init, signal: active.signal });
      if (active.signal.aborted || current.current.scope !== scope || controller.current !== active) throw new Error('Account changed.');
      return value;
    };
    try { await action(request); return !active.signal.aborted && current.current.scope === scope; }
    catch (error) {
      if (!active.signal.aborted && current.current.scope === scope) setState(value => ({ ...value, error: error instanceof Error ? error.message : say.current('libraryConnectFailed') }));
      return false;
    } finally {
      if (controller.current === active) { locked.current = false; setState(value => ({ ...value, loading: false })); }
    }
  }, []);
  const refresh = useCallback(() => run(async request => {
    const local = current.current.avatar;
    let library = await request<Library>('');
    if (library.selected === null && local && !local.sample && !library.items.some(item => item.id === local.id)) {
      await request('', { method: 'POST', body: JSON.stringify({ avatar: local, select: false }) });
      library = await request<Library>('');
    }
    const selected = library.selected;
    const avatar = selected === 'sample-standard-v2' ? sampleAvatar : selected && selected !== 'default'
      ? readAvatar(await request<Avatar>('/' + encodeURIComponent(selected))) : null;
    if (controller.current?.signal.aborted) return;
    setState(value => ({ ...value, items: library.items, ready: true }));
    if (selected !== null && avatar?.id !== current.current.avatar?.id && !await current.current.update(doc => ({ ...doc, avatar }))) {
      throw new Error(say.current('libraryApplyFailed'));
    }
  }), [run]);
  useEffect(() => {
    if (!options.enabled) return;
    void refresh();
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); });
    return () => { subscription.remove(); controller.current?.abort(); controller.current = null; locked.current = false; };
  }, [options.scope, options.enabled, refresh]);
  const save = (avatar: Avatar) => run(async request => {
    await request('', { method: 'POST', body: JSON.stringify({ avatar }) });
    if (controller.current?.signal.aborted) return;
    setState(value => ({ ...value, items: [{ id: avatar.id, createdAt: avatar.createdAt, thumbnail: avatar.frames.base }, ...value.items.filter(item => item.id !== avatar.id)] }));
    if (!await current.current.update(doc => ({ ...doc, avatar }))) throw new Error(say.current('savedApplyFailed'));
  });
  const select = (id: string) => run(async request => {
    const avatar = id === 'default' ? null : id === sampleAvatar.id ? sampleAvatar : readAvatar(await request<Avatar>('/' + encodeURIComponent(id)));
    if (id !== 'default' && !avatar) throw new Error(say.current('avatarOpenChooseAgain'));
    await request('/selection', { method: 'POST', body: JSON.stringify({ selected: id }) });
    if (!controller.current?.signal.aborted && !await current.current.update(doc => ({ ...doc, avatar }))) throw new Error(say.current('selectionApplyFailed'));
  });
  const remove = (id: string) => run(async request => {
    await request('/' + encodeURIComponent(id), { method: 'DELETE' });
    if (controller.current?.signal.aborted) return;
    setState(value => ({ ...value, items: value.items.filter(item => item.id !== id) }));
    if (current.current.avatar?.id === id && !await current.current.update(doc => ({ ...doc, avatar: null }))) throw new Error(say.current('deletedCacheFailed'));
  });
  const active = state.scope === options.scope && options.enabled;
  return { items: active ? state.items : [], loading: active && state.loading, ready: active && state.ready,
    error: active ? state.error : '', refresh, save, select, remove, connected: options.enabled };
}
