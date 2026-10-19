import type { ReactNode } from 'react';

/** One line-icon set in the SF Symbols manner: 24-unit grid, 1.7 stroke, round caps and joins. */
const paths: Record<string, ReactNode> = {
  overview: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></>,
  accounts: <><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.9-4.8 5.5-4.8s4.9 1.8 5.5 4.8"/><circle cx="16.5" cy="8.6" r="2.5"/><path d="M15.8 14.3c2.3-.1 4.1 1.4 4.7 4.2"/></>,
  cases: <><path d="M4 13.5 6.2 5.8a1.8 1.8 0 0 1 1.7-1.3h8.2a1.8 1.8 0 0 1 1.7 1.3L20 13.5v4.2a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 17.7z"/><path d="M4 13.5h4.5a3.5 3.5 0 0 0 7 0H20"/></>,
  content: <><rect x="4" y="8.5" width="16" height="11.5" rx="2.2"/><path d="M6.5 5.5h11M8.5 2.8h7"/></>,
  sellers: <><path d="M3.5 8.5 5.2 4.5h13.6l1.7 4"/><path d="M3.5 8.5a2.8 2.8 0 0 0 5.6 0 2.9 2.9 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0"/><path d="M5 11.2V19a1.2 1.2 0 0 0 1.2 1.2h11.6A1.2 1.2 0 0 0 19 19v-7.8M10 20.2v-4.7h4v4.7"/></>,
  controls: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></>,
  integrations: <><path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1"/><path d="M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1"/></>,
  staff: <><circle cx="10" cy="8" r="3.4"/><path d="M3.5 19.5c.6-3.3 3.1-5.3 6.5-5.3 1 0 1.9.2 2.7.5"/><path d="M17.5 13 20.5 14.1v2.4c0 2-1.3 3.4-3 4-1.7-.6-3-2-3-4v-2.4z"/></>,
  audit: <><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.3 4.2v3.3h3.3M12 8v4l2.8 1.8"/></>,
  identity: <><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10.8" r="2"/><path d="M5.8 16c.5-1.3 1.5-2 2.7-2s2.2.7 2.7 2M14 10h4M14 13.5h4"/></>,
  person: <><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.8 7-5.8s6.2 2.2 7 5.8"/></>,
  search: <><circle cx="11" cy="11" r="6"/><path d="m15.5 15.5 4.5 4.5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>,
  back: <path d="M14.5 5.5 8 12l6.5 6.5"/>,
  forward: <path d="M9.5 5.5 16 12l-6.5 6.5"/>,
  up: <path d="M5.5 14.5 12 8l6.5 6.5"/>,
  down: <path d="M5.5 9.5 12 16l6.5-6.5"/>,
  refresh: <><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.7 4.2v3.3h-3.3"/></>,
  signOut: <><path d="M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7"/><path d="M10.5 12H20M16.5 8.5 20 12l-3.5 3.5"/></>,
  external: <path d="M8 16 16 8M9.5 8H16v6.5"/>,
  photo: <><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 4.5-4.5 3.5 3.5 2.5-2.5 5.5 5"/></>,
  trash: <><path d="M5 7h14M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7"/><path d="m6.8 7 .8 11.3a1.8 1.8 0 0 0 1.8 1.7h5.2a1.8 1.8 0 0 0 1.8-1.7L17.2 7"/></>,
  hide: <><path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/></>,
  show: <><path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="3"/></>,
  edit: <><path d="M14.5 5.5l4 4L9 19H5v-4z"/><path d="m12.5 7.5 4 4"/></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5"/>,
  warning: <><path d="M12 4.2 2.9 19.5h18.2z"/><path d="M12 10v4.2"/><circle cx="12" cy="17" r=".5"/></>,
  star: <path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>,
  undo: <><path d="M9 14 4.5 9.5 9 5"/><path d="M4.5 9.5H15a4.5 4.5 0 0 1 0 9h-3"/></>,
  pin: <><path d="M12 20.5s-6.5-5.6-6.5-10.8a6.5 6.5 0 0 1 13 0c0 5.2-6.5 10.8-6.5 10.8z"/><circle cx="12" cy="9.7" r="2.4"/></>,
  book: <><path d="M4.5 5.5c2.6-.9 5.1-.6 7.5 1 2.4-1.6 4.9-1.9 7.5-1v13c-2.6-.9-5.1-.6-7.5 1-2.4-1.6-4.9-1.9-7.5-1z"/><path d="M12 6.5v13"/></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="2.2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></>,
  chef: <><path d="M7.5 14.5a4 4 0 0 1-.6-7.9 5.2 5.2 0 0 1 10.2 0 4 4 0 0 1-.6 7.9"/><path d="M7.5 14.5V19a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-4.5M7.5 16.8h9"/></>,
  wand: <><path d="m4.5 19.5 10-10M13 8l3 3"/><path d="M18 3.5v3M16.5 5h3M19.5 10.5v2M18.5 11.5h2M9.5 3.5v2M8.5 4.5h2"/></>,
  group: <><circle cx="8" cy="9" r="2.8"/><circle cx="16" cy="9" r="2.8"/><path d="M3 18.5c.5-2.6 2.5-4.2 5-4.2s4.5 1.6 5 4.2M11 18.5c.5-2.6 2.5-4.2 5-4.2s4.5 1.6 5 4.2"/></>,
  tag: <><path d="M3.8 12.6V5.2a1.4 1.4 0 0 1 1.4-1.4h7.4l7.6 7.6a1.4 1.4 0 0 1 0 2l-6.4 6.4a1.4 1.4 0 0 1-2 0z"/><circle cx="8.3" cy="8.3" r="1.4"/></>,
  leaf: <><path d="M5.5 18.5C5 10.5 10 5.5 19 5c.4 8.8-4.6 14-13.5 13.5z"/><path d="M5.5 18.5c2.6-4 5.6-6.8 9.5-8.8"/></>,
};
export type IconName = keyof typeof paths;

export function Icon({ name, size = 18, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
    strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
/** Google's "G" mark for the sign-in button; brand colours are fixed by Google's guidelines. */
export function GoogleMark() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.5z"/>
    <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.9-6.2z"/>
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z"/>
  </svg>;
}
