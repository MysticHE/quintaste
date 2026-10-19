/**
 * Styles for the Rush Hour DOM layer. The game world keeps one warm look in both app themes; every colour is a token.
 * Every font size follows Play your way text size through --ts, set on the root.
 */
const scaleText = (css: string) => css.replace(/font-size:(\d+(?:\.\d+)?)px/g, "font-size:calc($1px * var(--ts, 1))");
export const RUSH_CSS = scaleText(`
.rh { --cream:#fff8ef; --cream-2:#fbefe2; --card:#fffdf8; --ink:#3a2a2c; --ink-2:#6f5a55; --white:#ffffff; --peach:#f7a98c; --coral:#d9573f;
  --gold:#f2c14e; --gold-hi:#ffd977; --gold-deep:#b98516; --gold-ink:#3b2604; --sage:#6f9a72; --sage-deep:#3f6b47; --warn:#c0392b; --warn-soft:#fde3dd;
  --band:#f6c27a; --band-stripe:#e9a74f; --hot:#e2553b; --cool:#7fb7d6; --glass:rgba(255,248,239,0.9); --scrim:rgba(38,30,32,0.55); --shadow:rgba(60,30,10,0.25);
  --panel:#f3e3cf; --panel-edge:#e3cbb0;
  --fx-light:#ffffff; --fx-spark:#ffe08a; --fx-flame:#ff8a3d; --fx-flame-hot:#ff3b1f; --fx-smoke:#5b4a44; --fx-char:#6b5a50;
  --fx-ring-track:#e8dccf; --fx-ready:#3f9d6b; --fx-warn:#c0392b; --fx-progress:#f2a13a; --fx-coin:#f2c14e; --fx-coin-edge:#b98516;
  position:absolute; inset:0; overflow:hidden; color:var(--ink); background:var(--panel); user-select:none; -webkit-user-select:none; touch-action:none;
  font-family:"Nunito_800ExtraBold","Nunito",ui-rounded,"Segoe UI",system-ui,sans-serif; font-weight:800; -webkit-tap-highlight-color:transparent; }
.rh * { box-sizing:border-box; }
.rh button { font:inherit; color:inherit; border:none; background:none; cursor:pointer; padding:0; }
.rh button:focus-visible { outline:3px solid var(--coral); outline-offset:2px; border-radius:10px; }
.rh canvas { position:absolute; inset:0; }
.rh .layer { position:absolute; }
.rh .hud { display:flex; align-items:center; gap:8px; padding:0 10px; }
.rh .timer { width:44px; height:44px; position:relative; flex:none; }
.rh .timer svg { width:100%; height:100%; transform:rotate(-90deg); }
.rh .timer b { position:absolute; inset:0; display:grid; place-items:center; font-size:12px; }
.rh .timer.warm .arc { stroke:var(--coral); } .rh .timer.late { animation:rhpulse .8s ease-in-out infinite; }
@keyframes rhpulse { 50% { transform:scale(1.08); } }
.rh .lvl { font-size:13px; line-height:1.15; min-width:0; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .rh .lvl small { display:block; font-size:11px; color:var(--ink-2); overflow:hidden; text-overflow:ellipsis; }
.rh .takings { flex:1.4; display:grid; gap:3px; }
.rh .bar { position:relative; height:12px; border-radius:99px; background:var(--cream-2); box-shadow:inset 0 0 0 2px var(--panel-edge); }
.rh .bar i { position:absolute; left:0; top:0; bottom:0; border-radius:99px; background:linear-gradient(var(--gold-hi),var(--gold)); }
.rh .bar .star { position:absolute; top:-6px; width:18px; height:18px; margin-left:-9px; color:var(--panel-edge); font-size:17px; line-height:18px; text-align:center; }
.rh .bar .star.lit { color:var(--gold); text-shadow:0 1px 0 var(--gold-deep); }
.rh .coins { display:flex; align-items:center; gap:4px; font-size:14px; } .rh .coins .ico { width:18px; height:18px; border-radius:50%; background:var(--gold); box-shadow:inset 0 0 0 2px var(--gold-deep); }
.rh .coins .ico.eat { animation:rheat .15s ease-out; } @keyframes rheat { 50% { transform:scale(1.35, .8); } }
.rh .pill { min-height:36px; min-width:36px; padding:0 10px; border-radius:99px; background:var(--glass); display:inline-flex; align-items:center; justify-content:center; gap:4px; font-size:13px; box-shadow:0 2px 6px var(--shadow); }
.rh .recipe { display:flex; align-items:center; gap:8px; padding:4px 10px; border-radius:16px; background:var(--glass); box-shadow:0 2px 6px var(--shadow); }
.rh .recipe .bowl { width:52px; height:52px; flex:none; object-fit:contain; filter:drop-shadow(0 2px 3px var(--shadow)); }
.rh .recipe .t { font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .rh .recipe .t small { font-size:11px; color:var(--ink-2); margin-left:4px; }
.rh .steps { display:flex; gap:5px; margin-top:3px; flex-wrap:nowrap; overflow:hidden; }
.rh .step { width:30px; height:30px; border-radius:9px; background:var(--cream); box-shadow:inset 0 0 0 2px var(--panel-edge); position:relative; flex:none; display:grid; place-items:center; }
.rh .step img { width:24px; height:24px; object-fit:contain; } .rh .step.want { box-shadow:inset 0 0 0 2px var(--gold); animation:rhpulse 1.6s ease-in-out infinite; }
.rh .step.empty img { opacity:.3; filter:grayscale(1); } .rh .step.opt { border:2px dashed var(--panel-edge); box-shadow:none; }
.rh .step .tick { position:absolute; right:-4px; top:-4px; width:14px; height:14px; border-radius:50%; background:var(--sage-deep); color:var(--white); font-size:9px; display:grid; place-items:center; }
.rh .step.bad .tick { background:var(--warn); } .rh .sep { width:2px; background:var(--panel-edge); border-radius:2px; }
.rh .hint { margin-left:auto; max-width:38%; font-size:11px; padding:6px 9px; border-radius:12px; background:var(--peach); color:var(--white); text-align:center; line-height:1.2; }
.rh .bubble { position:absolute; transform:translate(-50%,0); background:var(--white); border-radius:14px; padding:4px 6px 5px; display:grid; justify-items:center; gap:2px;
  box-shadow:0 3px 8px var(--shadow); font-size:10px; min-width:64px; max-width:96px; text-align:center; animation:rhpop .35s cubic-bezier(.2,1.6,.4,1); }
.rh .bubble::after { content:""; position:absolute; bottom:-6px; left:50%; margin-left:-6px; border:6px solid transparent; border-top-color:var(--white); border-bottom:0; }
.rh .bubble.focus { box-shadow:0 0 0 3px var(--gold), 0 3px 8px var(--shadow); } .rh .bubble.low { animation:rhwobble .5s ease-in-out infinite; }
@keyframes rhpop { from { transform:translate(-50%,10%) scale(.4); opacity:0; } } @keyframes rhwobble { 50% { transform:translate(-50%,0) rotate(3deg); } }
.rh .bubble img { width:34px; height:28px; object-fit:contain; } .rh .chip { font-size:9px; padding:1px 6px; border-radius:99px; background:var(--cream-2); line-height:1.4; }
.rh .chip.rule { background:var(--coral); color:var(--white); } .rh .hearts { letter-spacing:-1px; font-size:10px; color:var(--coral); } .rh .hearts .off { color:var(--panel-edge); }
.rh .shelves { padding:4px 8px 0; display:grid; grid-template-rows:auto 1fr; gap:4px; background:linear-gradient(var(--cream-2),var(--panel)); }
.rh .tabs { display:flex; gap:6px; } .rh .tabs button { font-size:12px; padding:4px 12px; border-radius:99px; background:var(--cream); min-height:30px; }
.rh .tabs button[aria-selected=true] { background:var(--ink); color:var(--white); } .rh .tabs .view { margin-left:auto; }
.rh .tray { display:grid; grid-auto-flow:column; grid-template-rows:1fr 1fr; grid-auto-columns:calc((100% - 30px)/6); gap:6px; overflow-x:auto; overflow-y:hidden; padding-bottom:4px; scrollbar-width:none; }
.rh .tray::-webkit-scrollbar { display:none; }
.rh .cardwrap { position:relative; display:grid; } .rh .card { position:relative; width:100%; border-radius:12px; background:var(--card); box-shadow:0 2px 0 var(--panel-edge); display:grid; grid-template-rows:1fr auto; justify-items:center; padding:3px 2px 2px; min-height:48px; touch-action:pan-x; }
.rh .card img { width:84%; height:100%; max-height:44px; object-fit:contain; pointer-events:none; } .rh .card span { font-size:9px; line-height:1.1; text-align:center; pointer-events:none; }
.rh .card.sel { box-shadow:0 0 0 3px var(--gold), 0 2px 0 var(--panel-edge); transform:translateY(-3px); }
.rh .card .tag { position:absolute; top:2px; left:3px; font-size:9px; width:15px; height:15px; border-radius:50%; background:var(--ink); color:var(--white); display:grid; place-items:center; }
.rh .cardwrap .lab { position:absolute; top:1px; right:2px; font-size:8px; padding:2px 5px; min-height:18px; border-radius:6px; background:var(--gold-hi); color:var(--gold-ink); z-index:2; }
.rh .dragghost { position:absolute; width:56px; height:56px; pointer-events:none; transform:translate(-50%,-60%) scale(1.1); filter:drop-shadow(0 8px 6px var(--shadow)); z-index:40; }
.rh .heat { padding:4px 10px; display:grid; grid-template-columns:1fr auto; grid-template-rows:auto auto; gap:4px 8px; background:var(--cream); box-shadow:0 -2px 0 var(--panel-edge); }
.rh .meter { position:relative; height:16px; border-radius:99px; background:linear-gradient(90deg,var(--cool),var(--cream-2) 30%,var(--cream-2) 70%,var(--hot)); }
.rh .meter .band { position:absolute; top:0; bottom:0; background:repeating-linear-gradient(45deg,var(--band) 0 6px,var(--band-stripe) 6px 12px); border-radius:4px; opacity:.9; }
.rh .meter .needle { position:absolute; top:-4px; width:6px; height:24px; margin-left:-3px; border-radius:3px; background:var(--ink); box-shadow:0 0 0 2px var(--white); }
.rh .meter .words { position:absolute; inset:0; display:flex; justify-content:space-between; align-items:center; padding:0 6px; font-size:8px; color:var(--ink-2); pointer-events:none; }
.rh .burner { flex:none; width:58px; height:58px; border-radius:50%; position:relative; display:grid; place-items:center; background:var(--white); color:var(--ink-2); box-shadow:0 2px 0 var(--panel-edge); transition:transform .12s, background .2s; }
.rh .burner svg { width:28px; height:28px; } .rh .burner:active { transform:scale(.94); }
.rh .burner span { position:absolute; bottom:-3px; left:50%; transform:translateX(-50%); font-size:8px; padding:0 6px; border-radius:99px; background:var(--cream-2); color:var(--ink-2); white-space:nowrap; }
.rh .burner[aria-pressed=true] { background:radial-gradient(circle at 50% 30%, var(--gold-hi), var(--hot)); color:var(--white); animation:rhburn 1.6s ease-in-out infinite; }
.rh .burner[aria-pressed=true] span { background:var(--hot); color:var(--white); }
.rh .burner:disabled { opacity:.5; cursor:default; }
@keyframes rhburn { 50% { box-shadow:0 2px 0 var(--panel-edge), 0 0 0 5px var(--warn-soft); } }
.rh .status { display:flex; flex-wrap:wrap; align-items:center; gap:4px; font-size:11px; min-height:26px; }
.rh .status .hchip { font-size:10px; padding:3px 8px; border-radius:99px; background:var(--cream-2); min-height:24px; }
.rh .status .hchip.alert { background:var(--warn-soft); color:var(--warn); } .rh .status .act { background:var(--sage-deep); color:var(--white); }
.rh .dialogue { display:flex; align-items:center; gap:8px; padding:6px 10px; background:var(--cream); }
.rh .face { width:46px; height:46px; border-radius:50%; overflow:hidden; background:var(--cream-2); flex:none; box-shadow:0 0 0 3px var(--white); }
.rh .face img { width:100%; height:100%; object-fit:cover; object-position:50% 10%; }
.rh .say { flex:1; min-width:0; } .rh .say .who { display:inline-block; font-size:10px; padding:1px 8px; border-radius:99px; background:var(--peach); color:var(--white); }
.rh .say p { margin:2px 0 0; font-size:12px; line-height:1.3; font-family:"Nunito_700Bold","Nunito",ui-rounded,system-ui,sans-serif; font-weight:700; }
.rh .say.warn .who { background:var(--warn); } .rh .say.good .who { background:var(--sage-deep); }
.rh .skill { flex:none; width:58px; height:58px; border-radius:18px; background:var(--white); position:relative; box-shadow:0 2px 0 var(--panel-edge); display:grid; place-items:center; }
.rh .skill img { width:46px; height:46px; object-fit:contain; } .rh .skill span { position:absolute; bottom:-3px; left:50%; transform:translateX(-50%); font-size:8px; padding:0 5px; border-radius:99px; background:var(--gold); color:var(--gold-ink); white-space:nowrap; }
.rh .skill:disabled { opacity:.45; filter:grayscale(.6); cursor:default; }
.rh .overlay { position:absolute; inset:0; background:var(--scrim); display:flex; align-items:flex-end; justify-content:center; z-index:50; }
.rh .overlay.center { align-items:center; padding:16px; }
.rh .sheet { width:100%; max-height:92%; overflow:auto; background:var(--cream); border-radius:22px 22px 0 0; padding:16px 16px 20px; display:grid; gap:10px; animation:rhup .25s ease-out; }
.rh .overlay.center .sheet { border-radius:22px; max-width:420px; }
@keyframes rhup { from { transform:translateY(14%); opacity:.4; } }
.rh .sheet h3 { margin:0; font-size:20px; line-height:1.2; } .rh .sheet p { margin:0; font-size:13px; line-height:1.4; font-family:"Nunito_700Bold","Nunito",ui-rounded,system-ui,sans-serif; font-weight:700; color:var(--ink-2); }
.rh .k { font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-2); }
.rh .btn { min-height:46px; border-radius:99px; padding:10px 18px; font-size:15px; color:var(--white); background:linear-gradient(var(--peach),var(--coral)); box-shadow:inset 0 -4px 0 rgba(0,0,0,.12); }
.rh .btn.gold { background:linear-gradient(var(--gold-hi),var(--gold)); color:var(--gold-ink); box-shadow:inset 0 -4px 0 var(--gold-deep); }
.rh .btn.ghost { background:var(--cream-2); color:var(--ink); box-shadow:none; } .rh .row { display:flex; gap:8px; } .rh .row .btn { flex:1 1 0; min-width:0; }
.rh .seg { display:grid; grid-auto-flow:column; grid-auto-columns:1fr; gap:4px; padding:4px; border-radius:99px; background:var(--cream-2); }
.rh .seg button { min-height:40px; border-radius:99px; font-size:13px; } .rh .seg button[aria-pressed=true] { background:var(--ink); color:var(--white); }
.rh .guestrow { display:flex; gap:8px; overflow-x:auto; } .rh .guestrow div { display:grid; justify-items:center; gap:2px; font-size:10px; min-width:64px; text-align:center; }
.rh .guestrow img { width:48px; height:48px; object-fit:contain; }
.rh .label-card { background:var(--white); border-radius:14px; padding:12px; display:grid; gap:6px; box-shadow:inset 0 0 0 2px var(--panel-edge); font-size:13px; }
.rh .label-card mark { background:var(--warn-soft); color:var(--warn); padding:0 3px; border-radius:4px; }
.rh .paused { font-size:11px; color:var(--sage-deep); }
.rh .bigstars { display:flex; justify-content:center; gap:6px; font-size:40px; color:var(--panel-edge); } .rh .bigstars .lit { color:var(--gold); text-shadow:0 2px 0 var(--gold-deep); animation:rhpop .5s cubic-bezier(.2,1.6,.4,1) backwards; }
.rh .stamps { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; } .rh .stamps div { border-radius:12px; padding:8px 4px; background:var(--white); text-align:center; font-size:11px; display:grid; gap:2px; }
.rh .stamps div.on { box-shadow:inset 0 0 0 2px var(--sage); } .rh .stamps b { font-size:18px; } .rh .stamps div.off b { color:var(--panel-edge); } .rh .stamps div.on b { color:var(--sage-deep); }
.rh .rgrid { display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:12px; } .rh .rgrid span { background:var(--white); border-radius:10px; padding:6px 8px; display:flex; justify-content:space-between; gap:6px; }
.rh .remember { background:var(--white); border-radius:14px; padding:10px 12px; font-size:12px; line-height:1.4; }
.rh .floater { position:absolute; transform:translate(-50%,-50%); font-size:13px; color:var(--sage-deep); text-shadow:0 1px 0 var(--white); pointer-events:none; animation:rhfloat 1s ease-out forwards; z-index:45; }
@keyframes rhfloat { to { transform:translate(-50%,-180%); opacity:0; } }
.rh .list { position:absolute; left:0; right:0; overflow:auto; background:var(--cream); padding:12px; display:grid; gap:10px; align-content:start; z-index:20; }
.rh .list section { background:var(--white); border-radius:14px; padding:10px; display:grid; gap:6px; } .rh .list h4 { margin:0; font-size:14px; }
.rh .list .acts { display:flex; flex-wrap:wrap; gap:6px; } .rh .list .acts button { min-height:40px; padding:6px 12px; border-radius:12px; background:var(--cream-2); font-size:12px; }
.rh .list .line { font-size:12px; font-family:"Nunito_700Bold","Nunito",ui-rounded,system-ui,sans-serif; font-weight:700; }
/* The panel layer passes taps through to the canvas (guests, stations, plates); only its own bands take them. */
.rh .panels { pointer-events:none; } .rh .panels > * { pointer-events:auto; } .rh .panels > .floater { pointer-events:none; }
.rh .caption { position:absolute; right:8px; z-index:46; pointer-events:none; font-size:11px; padding:3px 9px; border-radius:99px; background:var(--ink); color:var(--white); animation:rhcap 1.4s ease-out forwards; }
@keyframes rhcap { 0% { opacity:0; transform:translateY(-4px); } 12%, 75% { opacity:1; transform:none; } 100% { opacity:0; } }
.rh .sheethead { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.rh .bridges { display:flex; flex-wrap:wrap; gap:6px; }
.rh .linkpill { min-height:40px; padding:6px 12px; border-radius:99px; background:var(--white); color:var(--ink); box-shadow:inset 0 0 0 2px var(--panel-edge); display:inline-flex; align-items:center; gap:6px; font-size:12px; }
.rh .linkpill svg { color:var(--coral); flex:none; }
@media (prefers-reduced-motion: reduce) { .rh *, .rh *::before, .rh *::after { animation:none !important; transition:none !important; } }
.rh.still *, .rh.still *::before, .rh.still *::after { animation:none !important; transition:none !important; }
`);
