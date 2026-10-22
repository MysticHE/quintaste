/** Sheet styles for the Rush Hour DOM layer: brief, label, pause, results and the station list (see styles.ts for tokens). */
export const SHEETS_CSS = `
.rh .overlay { position:absolute; inset:0; background:var(--scrim); display:flex; align-items:flex-end; justify-content:center; z-index:50; animation:rhfade .2s ease-out; }
.rh .overlay.center { align-items:center; padding:16px; }
.rh .overlay.out { animation:rhfadeout .22s ease-in forwards; } .rh .overlay.out .sheet { animation:rhsink .22s ease-in forwards; }
@keyframes rhfade { from { opacity:0; } } @keyframes rhfadeout { to { opacity:0; } } @keyframes rhsink { to { transform:translateY(24px) scale(.96); } }
.rh .sheet { width:100%; max-width:480px; max-height:92%; overflow:auto; background:var(--cream); border-radius:22px 22px 0 0; padding:16px 16px 20px; display:grid; gap:10px; animation:rhup .25s ease-out; }
.rh .overlay.center .sheet { border-radius:22px; max-width:420px; box-shadow:0 0 0 1.5px var(--panel-edge), 0 12px 30px var(--shadow); animation:rhzoom .3s cubic-bezier(.2,1.3,.4,1); }
@keyframes rhup { from { transform:translateY(14%); opacity:.4; } } @keyframes rhzoom { from { transform:scale(.9); opacity:0; } }
.rh .sheet h3 { margin:0; font-size:22px; line-height:1.2; }
.rh .sheet p { margin:0; font-size:13px; line-height:1.4; font-family:"Nunito_700Bold","Nunito",ui-rounded,system-ui,sans-serif; font-weight:700; color:var(--ink-2); }
.rh .k { font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-2); }
.rh .btn { min-height:48px; border-radius:99px; padding:10px 18px; font-size:15px; color:var(--white); background:linear-gradient(var(--peach),var(--coral)); box-shadow:inset 0 -4px 0 var(--press); transition:transform .12s; }
.rh .btn:active { transform:scale(.97); } .rh .btn:disabled { opacity:.6; cursor:default; }
.rh .btn.gold { background:linear-gradient(var(--gold-hi),var(--gold)); color:var(--gold-ink); box-shadow:inset 0 -4px 0 var(--gold-deep); }
.rh .btn.ghost { background:var(--cream-2); color:var(--ink); box-shadow:0 0 0 1.5px var(--panel-edge); } .rh .row { display:flex; gap:8px; } .rh .row .btn { flex:1 1 0; min-width:0; }
.rh .seg { display:grid; grid-auto-flow:column; grid-auto-columns:1fr; gap:4px; padding:4px; border-radius:99px; background:var(--cream-2); }
.rh .seg button { min-height:40px; border-radius:99px; font-size:13px; transition:background .15s; } .rh .seg button[aria-pressed=true] { background:var(--ink); color:var(--white); }
.rh .guestrow { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; }
.rh .guestrow div { display:grid; justify-items:center; align-content:start; gap:3px; font-size:10px; min-width:78px; padding:6px 4px; text-align:center; border-radius:14px; background:var(--white); box-shadow:0 0 0 1px var(--panel-edge); }
.rh .guestrow b { font-size:11px; } .rh .guestrow img { width:52px; height:52px; object-fit:contain; }
.rh .label-card { background:var(--white); border-radius:14px; padding:12px; display:grid; gap:6px; box-shadow:inset 0 0 0 2px var(--panel-edge); font-size:13px; }
.rh .label-card mark { background:var(--warn-soft); color:var(--warn); padding:0 3px; border-radius:4px; }
.rh .paused { font-size:11px; color:var(--sage-deep); }
.rh .bigstars { display:flex; justify-content:center; gap:6px; font-size:42px; color:var(--panel-edge); }
.rh .bigstars .lit { color:var(--gold); text-shadow:0 2px 0 var(--gold-deep); animation:rhstarpop .5s cubic-bezier(.2,1.6,.4,1) backwards; }
@keyframes rhstarpop { from { transform:scale(.3) rotate(-30deg); opacity:0; } }
.rh .stamps { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; } .rh .stamps div { border-radius:12px; padding:8px 4px; background:var(--white); text-align:center; font-size:11px; display:grid; gap:2px; }
.rh .stamps div.on { box-shadow:inset 0 0 0 2px var(--sage); } .rh .stamps b { font-size:18px; } .rh .stamps div.off b { color:var(--panel-edge); } .rh .stamps div.on b { color:var(--sage-deep); }
.rh .rgrid { display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:12px; } .rh .rgrid span { background:var(--white); border-radius:10px; padding:6px 8px; display:flex; justify-content:space-between; gap:6px; }
.rh .remember { background:var(--white); border-radius:14px; padding:10px 12px; font-size:12px; line-height:1.4; }
.rh .sheethead { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.rh .bridges { display:flex; flex-wrap:wrap; gap:6px; }
.rh .linkpill { min-height:40px; padding:6px 12px; border-radius:99px; background:var(--white); color:var(--ink); box-shadow:inset 0 0 0 2px var(--panel-edge); display:inline-flex; align-items:center; gap:6px; font-size:12px; }
.rh .linkpill svg { color:var(--coral); flex:none; }
.rh .linkpill[aria-pressed=true] { background:var(--sage); color:var(--white); box-shadow:inset 0 0 0 2px var(--sage-deep); } .rh .linkpill[aria-pressed=true] svg { color:var(--white); }
@media (prefers-reduced-motion: reduce) { .rh *, .rh *::before, .rh *::after { animation:none !important; transition:none !important; } }
.rh.still *, .rh.still *::before, .rh.still *::after { animation:none !important; transition:none !important; }
`;
