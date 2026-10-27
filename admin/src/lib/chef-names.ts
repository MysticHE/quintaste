/** Chefs by their bot ids (server-assets/kitchen/chefs.js), for server code and the console alike. */
export const CHEFS: Record<string, string> = { head: 'Kaya', scout: 'Pandan', wok: 'Mango', host: 'Lychee', artist: 'Taro',
  writer: 'Peach', fixer: 'Coco', safety: 'Mint' };

/** A chef lane is Off, Watch (records what the chef would do) or On (acts), docs/ADMIN_CHEFS_PLAN.md §6. */
export type Mode = 'off' | 'watch' | 'on';
/** ops.control key of a lane's Off / Watch / On switch. */
export const controlKey = (lane: string) => 'chef_' + lane.replaceAll('-', '_');
/** A lane's switch is on while it watches or acts; which of the two is kept in the control's note as "mode=on". */
export const modeOf = (row: { enabled: boolean; notice: string } | undefined): Mode =>
  !row?.enabled ? 'off' : /(^|\s)mode=on(\s|$)/.test(row.notice) ? 'on' : 'watch';
/** A control's note as staff wrote it, without the settings kept in it (the AI recipes daily limit, a chef lane's mode). */
export const plainNote = (notice: string) => notice.replace(/\s*(daily=\d+|mode=\w+)\s*/g, ' ').trim();
