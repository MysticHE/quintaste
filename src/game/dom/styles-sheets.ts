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
/* The row scrolls sideways, which clips: padding keeps the cards' borders inside it. */
.rh .guestrow { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; padding:4px 3px 5px; margin:-4px -3px -5px; }
.rh .guestrow div { display:grid; justify-items:center; align-content:start; gap:3px; font-size:10px; min-width:78px; padding:6px 4px; text-align:center; border-radius:14px; background:var(--white); box-shadow:0 0 0 1px var(--panel-edge); }
.rh .guestrow b { font-size:11px; } .rh .guestrow img { width:52px; height:52px; object-fit:contain; }
.rh .label-card { background:var(--white); border-radius:14px; padding:12px; display:grid; gap:6px; box-shadow:inset 0 0 0 2px var(--panel-edge); font-size:13px; }
.rh .label-card mark { background:var(--warn-soft); color:var(--warn); padding:0 3px; border-radius:4px; }
.rh .paused { font-size:11px; color:var(--sage-deep); }
@keyframes rhstarpop { from { transform:scale(.3) rotate(-30deg); opacity:0; } }
.rh .stamps { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; } .rh .stamps div { border-radius:12px; padding:8px 4px; background:var(--white); text-align:center; font-size:11px; display:grid; gap:2px; }
.rh .stamps div.on { box-shadow:inset 0 0 0 2px var(--sage); } .rh .stamps b { font-size:18px; } .rh .stamps div.off b { color:var(--panel-edge); } .rh .stamps div.on b { color:var(--sage-deep); }
.rh .rgrid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; font-size:12px; } .rh .rgrid span { background:var(--white); border-radius:10px; padding:6px 4px; display:grid; justify-items:center; text-align:center; gap:2px; }
.rh .remember { background:var(--white); border-radius:14px; padding:10px 12px; font-size:12px; line-height:1.4; }
.rh .sheethead { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.rh .bridges { display:flex; flex-wrap:wrap; gap:6px; }
.rh .linkpill { min-height:40px; padding:6px 12px; border-radius:99px; background:var(--white); color:var(--ink); box-shadow:inset 0 0 0 2px var(--panel-edge); display:inline-flex; align-items:center; gap:6px; font-size:12px; }
.rh .linkpill svg { color:var(--coral); flex:none; }
.rh .linkpill[aria-pressed=true] { background:var(--sage); color:var(--white); box-shadow:inset 0 0 0 2px var(--sage-deep); } .rh .linkpill[aria-pressed=true] svg { color:var(--white); }
/* The level-clear moment (Celebrate.tsx): the bar fills, holds at a star line, the star bursts, the heading slams, the rest rises in. */
.rh .rfill { display:grid; gap:6px; justify-items:center; padding:8px 6px 0; }
.rh .rbar { position:relative; width:100%; height:16px; border-radius:99px; background:var(--cream-2); box-shadow:inset 0 0 0 2px var(--panel-edge); }
.rh .rbar i { position:absolute; left:0; top:0; bottom:0; border-radius:99px; background:linear-gradient(var(--gold-hi),var(--gold)); transition:box-shadow .2s; }
.rh .rbar.hold i { box-shadow:0 0 12px 3px var(--gold-hi); }
.rh .rbar .star { position:absolute; top:50%; width:34px; height:34px; margin:-17px 0 0 -17px; font-size:30px; line-height:34px; text-align:center; color:var(--panel-edge); text-shadow:0 2px 0 var(--white); }
.rh .rbar .star.next { color:var(--gold-hi); animation:rhwiggle .24s ease-in-out; }
.rh .rbar .star.lit { color:var(--gold); text-shadow:0 2px 0 var(--gold-deep); animation:rhstarpop .5s cubic-bezier(.2,1.6,.4,1); }
.rh .rbar .star.lit::after { content:""; position:absolute; inset:2px; border-radius:50%; box-shadow:0 0 0 3px var(--gold-hi), 0 0 14px 4px var(--gold-hi); animation:rhring .45s ease-out forwards; }
@keyframes rhwiggle { 25% { transform:rotate(-14deg) scale(1.15); } 75% { transform:rotate(14deg) scale(1.15); } }
.rh .rcount { display:inline-flex; align-items:center; gap:6px; font-size:14px; color:var(--ink-2); } .rh .rcount b { font-size:20px; color:var(--ink); font-variant-numeric:tabular-nums; }
.rh .rcount .ico { width:20px; height:20px; border-radius:50%; background:radial-gradient(circle at 35% 30%, var(--gold-hi), var(--gold) 62%); box-shadow:inset 0 0 0 2px var(--gold-deep); }
.rh .sheet h3.wait { opacity:0; } .rh .sheet h3.slam { animation:rhslam .5s cubic-bezier(.2,1.5,.35,1); } .rh .sheet h3.soft { animation:rhfade .35s ease-out; }
@keyframes rhslam { 0% { transform:scale(2.2); opacity:0; } 55% { transform:scale(.92); opacity:1; } 78% { transform:scale(1.05) rotate(-1deg); } }
/* The sheet opens compact near the top and grows downward as the results rise in, so the bar never jumps. */
.rh .overlay.results { align-items:flex-start; padding-top:max(16px, 7vh); }
.rh .after { display:grid; gap:10px; } .rh .after:not(.in) { display:none; } .rh .after.in > * { opacity:1; animation:rhrise .4s cubic-bezier(.2,1.3,.4,1) backwards; }
.rh .after.in > .reward { animation-name:rhpopin; } .rh .after.now > * { animation:none; }
.rh .after.in > :nth-child(1) { animation-delay:0.00s; }.rh .after.in > :nth-child(2) { animation-delay:0.08s; }.rh .after.in > :nth-child(3) { animation-delay:0.16s; }.rh .after.in > :nth-child(4) { animation-delay:0.24s; }.rh .after.in > :nth-child(5) { animation-delay:0.32s; }.rh .after.in > :nth-child(6) { animation-delay:0.40s; }.rh .after.in > :nth-child(7) { animation-delay:0.48s; }.rh .after.in > :nth-child(8) { animation-delay:0.56s; }.rh .after.in > :nth-child(9) { animation-delay:0.64s; }.rh .after.in > :nth-child(10) { animation-delay:0.72s; }.rh .after.in > :nth-child(11) { animation-delay:0.80s; }.rh .after.in > :nth-child(12) { animation-delay:0.88s; }.rh .after.in > :nth-child(13) { animation-delay:0.96s; }.rh .after.in > :nth-child(14) { animation-delay:1.04s; }
@keyframes rhrise { from { opacity:0; transform:translateY(14px) scale(.96); } } @keyframes rhpopin { 0% { opacity:0; transform:scale(.6); } 70% { transform:scale(1.06); } }
.rh .confetti { position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:3; }
.rh .confetti i { position:absolute; top:-16px; height:12px; border-radius:2px; animation:rhconf 1.7s cubic-bezier(.25,.6,.4,1) forwards; }
@keyframes rhconf { 85% { opacity:1; } to { transform:translate(var(--dx), 105vh) rotate(var(--spin)); opacity:0; } }
.rh.still .confetti { display:none; }
/* The phone's reduce-motion setting holds the game still unless the player chose Full motion in Play your way. */
@media (prefers-reduced-motion: reduce) { .rh:not(.full) *, .rh:not(.full) *::before, .rh:not(.full) *::after { animation:none !important; transition:none !important; } }
.rh.still *, .rh.still *::before, .rh.still *::after { animation:none !important; transition:none !important; }
`;
