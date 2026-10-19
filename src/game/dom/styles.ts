/**
 * Styles for the Rush Hour DOM layer, following the owner's art target (docs/game/references/art-target-2026-10-18.webp):
 * cream panels floating over the café, a wooden counter, painted ingredient cards and a striped heat band. The game
 * world keeps one warm look in both app themes; every colour is a token. Font sizes follow Play your way text size
 * through --ts, set on the root.
 */
import { SHEETS_CSS } from "./styles-sheets";

const scaleText = (css: string) => css.replace(/font-size:(\d+(?:\.\d+)?)px/g, "font-size:calc($1px * var(--ts, 1))");
const TOKENS = `
.rh { --cream:#fff8ef; --cream-2:#fbefe2; --card:#fffdf8; --ink:#3a2a2c; --ink-2:#6f5a55; --white:#ffffff; --peach:#f7a98c; --coral:#d9573f;
  --gold:#f2c14e; --gold-hi:#ffd977; --gold-deep:#b98516; --gold-ink:#3b2604; --sage:#6f9a72; --sage-deep:#3f6b47; --warn:#c0392b; --warn-soft:#fde3dd;
  --hot:#e2553b; --cool:#8fd0ea; --cool-deep:#4f8fc4; --target:#5fb98a; --target-stripe:#45a074; --amber:#f2b33d; --cook:#b8651f;
  --pill:#5b4640; --burner:#7d2f2b; --burner-2:#a8443b; --hint-bg:#fbe3d6; --hint-ink:#8a3d2c; --press:rgba(0,0,0,0.12);
  --glass:rgba(255,248,239,0.94); --scrim:rgba(38,30,32,0.55); --shadow:rgba(60,30,10,0.22); --panel:#f3e3cf; --panel-edge:#e6cfb4;
  --fx-light:#ffffff; --fx-spark:#ffe08a; --fx-flame:#ff8a3d; --fx-flame-hot:#ff3b1f; --fx-smoke:#5b4a44; --fx-char:#6b5a50;
  --fx-ring-track:#e8dccf; --fx-ready:#3f9d6b; --fx-warn:#c0392b; --fx-progress:#f2a13a; --fx-coin:#f2c14e; --fx-coin-edge:#b98516;
  --fx-cooked:#e9b77e; --fx-focus:#ffd977; --fx-soy:#5a3418; --fx-oil:#e8b54a; --fx-cream:#fbf1dc; --fx-red:#c8381f;
  --fx-grain-white:#fbf7ee; --fx-grain-gold:#e3a43a; --fx-grain-dark:#3b2a22;
  position:absolute; inset:0; overflow:hidden; color:var(--ink); background:var(--panel); user-select:none; -webkit-user-select:none; touch-action:none;
  font-family:"Nunito_800ExtraBold","Nunito",ui-rounded,"Segoe UI",system-ui,sans-serif; font-weight:800; -webkit-tap-highlight-color:transparent; }
.rh * { box-sizing:border-box; }
.rh button { font:inherit; color:inherit; border:none; background:none; cursor:pointer; padding:0; }
.rh button:focus-visible { outline:3px solid var(--coral); outline-offset:2px; border-radius:10px; }
.rh canvas { position:absolute; inset:0; }
.rh .layer { position:absolute; }
.rh .panel { background:var(--glass); border-radius:18px; box-shadow:0 0 0 1.5px var(--panel-edge), 0 4px 12px var(--shadow); }
`;
const TOP = `
.rh .hud { display:flex; align-items:center; gap:8px; padding:0 8px; }
.rh .round { flex:none; width:40px; height:40px; border-radius:14px; background:var(--cream-2); display:grid; place-items:center; box-shadow:0 0 0 1.5px var(--panel-edge); }
.rh .round svg { width:18px; height:18px; fill:var(--ink); }
.rh .timer { width:44px; height:44px; position:relative; flex:none; }
.rh .timer svg { width:100%; height:100%; transform:rotate(-90deg); }
.rh .timer .track { fill:var(--pill); stroke:var(--cream-2); stroke-width:4; }
.rh .timer .arc { fill:none; stroke:var(--target); stroke-width:4; stroke-linecap:round; transition:stroke-dashoffset .3s linear; }
.rh .timer b { position:absolute; inset:0; display:grid; place-items:center; font-size:12px; color:var(--white); }
.rh .timer.warm .arc { stroke:var(--amber); } .rh .timer.late .arc { stroke:var(--hot); } .rh .timer.late { animation:rhpulse .8s ease-in-out infinite; }
@keyframes rhpulse { 50% { transform:scale(1.08); } }
.rh .takings { flex:1; min-width:0; display:grid; gap:5px; }
.rh .coins { display:flex; align-items:center; gap:5px; font-size:16px; line-height:1; }
.rh .coins small { margin-left:auto; font-size:11px; color:var(--ink-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rh .coins .ico { width:20px; height:20px; flex:none; border-radius:50%; background:radial-gradient(circle at 35% 30%, var(--gold-hi), var(--gold) 62%); box-shadow:inset 0 0 0 2px var(--gold-deep); }
.rh .coins .ico.eat { animation:rheat .16s ease-out; } @keyframes rheat { 50% { transform:scale(1.4, .78); } }
.rh .bar { position:relative; height:10px; border-radius:99px; background:var(--cream-2); box-shadow:inset 0 0 0 1.5px var(--panel-edge); }
.rh .bar i { position:absolute; left:0; top:0; bottom:0; border-radius:99px; background:linear-gradient(var(--gold-hi),var(--gold)); transition:width .3s ease-out; }
.rh .bar .star { position:absolute; top:-6px; width:18px; height:18px; margin-left:-9px; color:var(--panel-edge); font-size:16px; line-height:18px; text-align:center; }
.rh .bar .star.lit { color:var(--gold); text-shadow:0 1px 0 var(--gold-deep); animation:rhstar .45s cubic-bezier(.2,1.6,.4,1); }
@keyframes rhstar { from { transform:scale(.3); } }
.rh .left { flex:none; display:grid; justify-items:center; line-height:1; } .rh .left b { font-size:20px; } .rh .left small { font-size:10px; color:var(--ink-2); }
.rh .listbtn { flex:none; height:40px; padding:0 11px 0 8px; border-radius:14px; display:inline-flex; align-items:center; gap:4px; font-size:13px; color:var(--white);
  background:linear-gradient(var(--amber),var(--coral)); box-shadow:inset 0 -3px 0 var(--press); }
.rh .listbtn svg { width:18px; height:18px; fill:var(--white); stroke:var(--coral); stroke-width:2; stroke-linecap:round; }
.rh .recipe { display:flex; align-items:center; gap:8px; padding:6px 8px 6px 6px; }
.rh .recipe .idle { margin:auto; font-size:13px; color:var(--ink-2); }
.rh .recipe .bowl { height:100%; width:64px; flex:none; object-fit:contain; filter:drop-shadow(0 2px 3px var(--shadow)); }
.rh .recipe .mid { flex:1; min-width:0; display:grid; gap:4px; }
.rh .recipe .t { display:flex; align-items:center; gap:4px; font-size:15px; white-space:nowrap; overflow:hidden; }
.rh .recipe .t b { flex:0 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; }
.rh .recipe .t small { font-size:11px; color:var(--ink-2); overflow:hidden; text-overflow:ellipsis; flex:1 1 0; min-width:26px; }
.rh .rule { flex:none; font-size:9px; padding:1px 6px; border-radius:99px; background:var(--coral); color:var(--white); white-space:nowrap; }
.rh .steps { display:flex; gap:3px; align-items:center; min-width:0; }
.rh .step { flex:0 1 30px; min-width:14px; aspect-ratio:1; height:auto; border-radius:9px; background:var(--cream); box-shadow:inset 0 0 0 1.5px var(--panel-edge); position:relative; display:grid; place-items:center; }
.rh .step img { width:80%; height:80%; object-fit:contain; } .rh .step.want { box-shadow:inset 0 0 0 2px var(--gold); animation:rhpulse 1.6s ease-in-out infinite; }
.rh .step.empty img { opacity:.3; filter:grayscale(1); } .rh .step.opt { outline:1.5px dashed var(--panel-edge); outline-offset:-1.5px; box-shadow:none; }
.rh .step.done { animation:rhpop2 .3s cubic-bezier(.2,1.6,.4,1); }
.rh .step .tick { position:absolute; right:-4px; top:-4px; width:14px; height:14px; border-radius:50%; background:var(--sage-deep); color:var(--white); font-size:9px; display:grid; place-items:center; }
.rh .step.bad .tick { background:var(--warn); } .rh .sep { width:2px; height:20px; background:var(--panel-edge); border-radius:2px; flex:none; }
@keyframes rhpop2 { from { transform:scale(.6); } }
.rh .hint { flex:none; max-width:28%; font-size:11px; line-height:1.2; padding:5px 8px; border-radius:12px; background:var(--hint-bg); color:var(--hint-ink); text-align:center; }
.rh .hint.rules { max-width:36%; background:none; padding:0; display:grid; gap:3px; justify-items:end; }
.rh .hint.rules .rule { white-space:normal; text-align:center; line-height:1.15; padding:2px 7px; }
`;
const SCENE = `
.rh .bubble { position:absolute; transform:translate(-50%,-100%); margin-top:-8px; background:var(--white); border-radius:14px; padding:4px 5px 5px; display:grid; justify-items:center; gap:2px;
  box-shadow:0 3px 8px var(--shadow); font-size:10px; min-width:60px; max-width:112px; text-align:center; animation:rhpop .35s cubic-bezier(.2,1.6,.4,1); }
.rh .bubble::after { content:""; position:absolute; bottom:-6px; left:50%; margin-left:-6px; border:6px solid transparent; border-top-color:var(--white); border-bottom-width:0; }
.rh .bubble:disabled { cursor:default; }
.rh .bubble.focus { box-shadow:0 0 0 3px var(--gold), 0 3px 8px var(--shadow); } .rh .bubble.low { animation:rhwobble .5s ease-in-out infinite; }
.rh .bubble.target { box-shadow:0 0 0 3px var(--target), 0 3px 8px var(--shadow); animation:rhbeat 1s ease-in-out infinite; }
@keyframes rhpop { from { transform:translate(-50%,-80%) scale(.4); opacity:0; } } @keyframes rhwobble { 50% { transform:translate(-50%,-100%) rotate(3deg); } }
@keyframes rhbeat { 50% { transform:translate(-50%,-100%) scale(1.06); } }
.rh .bubble .row { display:flex; align-items:center; gap:3px; } .rh .bubble img { width:36px; height:28px; object-fit:contain; }
.rh .chip { max-width:100%; overflow:hidden; text-overflow:ellipsis; font-size:9px; padding:1px 6px; border-radius:99px; background:var(--cream-2); line-height:1.4; white-space:nowrap; }
.rh .chip.rule { background:var(--coral); color:var(--white); } .rh .chip.serve { background:var(--sage-deep); color:var(--white); } .rh .chip.yum { background:var(--hint-bg); color:var(--hint-ink); }
.rh .hearts { letter-spacing:-1px; font-size:10px; color:var(--coral); } .rh .hearts .off { color:var(--panel-edge); }
.rh .seattag { position:absolute; transform:translateY(-50%); display:inline-flex; align-items:center; gap:1px; font-size:10px; padding:1px 6px 1px 4px; border-radius:99px; background:var(--cream); box-shadow:0 0 0 1.5px var(--panel-edge); }
.rh .seattag svg { width:10px; height:10px; fill:var(--ink); }
.rh .stag { position:absolute; transform:translate(-50%,-50%); font-size:11px; padding:0 10px; min-height:24px; border-radius:99px; background:var(--pill); color:var(--white); white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 2px 4px var(--shadow); transition:background .2s; }
.rh .stag.cook { background:var(--cook); } .rh .stag.warn { background:var(--warn); } .rh .stag.ready { background:var(--sage-deep); animation:rhtag 1.1s ease-in-out infinite; }
@keyframes rhtag { 50% { transform:translate(-50%,-50%) scale(1.08); } }
.rh .toast { position:absolute; transform:translateX(-50%); font-size:12px; padding:5px 12px; border-radius:99px; background:var(--pill); color:var(--white); white-space:nowrap; animation:rhin .2s ease-out; }
@keyframes rhin { from { opacity:0; transform:translate(-50%,6px); } }
.rh .banner { position:absolute; transform:translate(-50%,-50%); z-index:48; font-size:34px; color:var(--white); white-space:nowrap; pointer-events:none;
  text-shadow:0 3px 0 var(--coral), 0 6px 14px var(--shadow); animation:rhbanner 1.3s ease-out forwards; }
@keyframes rhbanner { 0% { transform:translate(-50%,-50%) scale(.4); opacity:0; } 18% { transform:translate(-50%,-50%) scale(1.12); opacity:1; } 30% { transform:translate(-50%,-50%) scale(1); }
  78% { opacity:1; transform:translate(-50%,-50%); } 100% { opacity:0; transform:translate(-50%,-80%); } }
.rh .caption { position:absolute; z-index:46; pointer-events:none; font-size:11px; padding:3px 9px; border-radius:99px; background:var(--ink); color:var(--white); animation:rhcap 1.4s ease-out forwards; }
@keyframes rhcap { 0% { opacity:0; transform:translateY(-4px); } 12%, 75% { opacity:1; transform:none; } 100% { opacity:0; } }
`;
const SHELF = `
.rh .shelf { padding:8px; }
.rh .tray { display:flex; gap:var(--gap); height:100%; overflow-x:auto; overflow-y:hidden; scroll-snap-type:x proximity; scrollbar-width:none; overscroll-behavior-x:contain; }
.rh .tray::-webkit-scrollbar { display:none; }
.rh .tray[data-more] { -webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 22px),transparent); mask-image:linear-gradient(90deg,#000 calc(100% - 22px),transparent); }
.rh .group { flex:none; display:grid; grid-auto-flow:column; grid-template-rows:repeat(2, var(--ch)); grid-auto-columns:var(--cw); gap:var(--gap); }
.rh .divider { flex:none; width:2px; margin:6px 2px; border-radius:2px; background:var(--panel-edge); }
.rh .cardwrap { position:relative; scroll-snap-align:start; min-width:0; }
.rh .card { position:relative; width:100%; height:100%; border-radius:12px; background:var(--card); box-shadow:0 0 0 1.5px var(--panel-edge), 0 2px 0 var(--panel-edge);
  display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:1px; padding:5px 3px 3px; touch-action:pan-x; transition:transform .12s ease-out; }
.rh .card img { flex:1 1 0; min-height:0; width:88%; object-fit:contain; pointer-events:none; }
.rh .card .nm { max-width:100%; font-size:calc(10px * min(var(--ts, 1), 1.08)); line-height:1.1; text-align:center; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; pointer-events:none; }
.rh .card:active { transform:scale(.93); } .rh .card.nope { animation:rhnope .4s ease-in-out; }
@keyframes rhnope { 20%, 60% { transform:translateX(-4px); } 40%, 80% { transform:translateX(4px); } }
.rh .card .ab { position:absolute; left:3px; top:3px; width:15px; height:15px; border-radius:50%; background:var(--ink); color:var(--white); font-size:9px; display:grid; place-items:center; }
.rh .cardwrap .lab { position:absolute; top:2px; left:50%; transform:translateX(-50%); font-size:9px; padding:0 6px; min-height:16px; line-height:16px; border-radius:99px;
  background:var(--gold-hi); color:var(--gold-ink); box-shadow:0 0 0 1.5px var(--gold); z-index:2; }
.rh .dragghost { position:absolute; width:60px; height:60px; object-fit:contain; pointer-events:none; transform:translate(-50%,-62%) scale(1.12); filter:drop-shadow(0 8px 6px var(--shadow)); z-index:40; }
.rh .dragghost.home { transition:left .2s ease-in, top .2s ease-in, opacity .2s; opacity:.25; }
`;
const BOTTOM = `
.rh .heat { padding:6px 10px; display:grid; grid-template-rows:auto 1fr; gap:3px; }
.rh .meterbox { display:grid; gap:1px; } .rh .meter { position:relative; height:14px; }
.rh .meter .track { position:absolute; inset:0; border-radius:99px; overflow:hidden; background:var(--cream-2); }
.rh .meter .track::after { content:""; position:absolute; inset:0; border-radius:99px; box-shadow:inset 0 0 0 2px var(--pill); }
.rh .mseg { position:absolute; top:0; bottom:0; } .rh .mseg.cool { background:linear-gradient(90deg,var(--cool-deep),var(--cool)); }
.rh .mseg.target { background:repeating-linear-gradient(45deg,var(--target) 0 6px,var(--target-stripe) 6px 12px); } .rh .mseg.hot { background:var(--amber); } .rh .mseg.toohot { background:var(--hot); }
.rh .needle { position:absolute; top:-5px; width:6px; height:24px; margin-left:-3px; border-radius:3px; background:var(--ink); box-shadow:0 0 0 2px var(--white); transition:left .1s linear; }
.rh .ticks { position:relative; height:13px; } .rh .ticks span { position:absolute; transform:translateX(-50%); font-size:10px; color:var(--ink-2); white-space:nowrap; }
.rh .noheat { font-size:12px; color:var(--ink-2); align-self:center; }
.rh .hrow { display:flex; align-items:center; gap:8px; min-height:0; }
.rh .burner { flex:none; height:40px; padding:0 14px 0 10px; border-radius:99px; display:inline-flex; align-items:center; gap:6px; font-size:14px; color:var(--white);
  background:linear-gradient(var(--burner-2),var(--burner)); box-shadow:inset 0 -3px 0 var(--press), 0 0 0 2px var(--hint-bg); transition:transform .12s; }
.rh .burner:active { transform:scale(.95); } .rh .burner svg { width:18px; height:18px; fill:currentColor; }
.rh .burner .dot { width:14px; height:14px; border-radius:50%; background:var(--hot); box-shadow:inset 0 -2px 0 var(--press); }
.rh .burner[aria-pressed=true] { background:linear-gradient(var(--gold-hi),var(--hot)); animation:rhburn 1.6s ease-in-out infinite; }
.rh .burner.nudge { animation:rhnudge 1.1s ease-in-out infinite; } .rh .burner:disabled { opacity:.5; cursor:default; }
@keyframes rhburn { 50% { box-shadow:inset 0 -3px 0 var(--press), 0 0 0 5px var(--warn-soft); } }
@keyframes rhnudge { 50% { transform:scale(1.07); box-shadow:inset 0 -3px 0 var(--press), 0 0 0 5px var(--gold-hi); } }
.rh .status { flex:1; min-width:0; display:grid; gap:3px; }
.rh .status .line { font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rh .status .chips { display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; } .rh .status .chips:empty { display:none; }
.rh .hchip { flex:none; font-size:11px; padding:0 9px; min-height:24px; border-radius:99px; background:var(--cream-2); box-shadow:0 0 0 1px var(--panel-edge); }
.rh .hchip.alert { background:var(--warn-soft); color:var(--warn); } .rh .hchip.act { background:var(--sage-deep); color:var(--white); box-shadow:none; }
.rh .skill { flex:none; width:44px; height:44px; border-radius:14px; background:var(--white); position:relative; box-shadow:0 0 0 1.5px var(--panel-edge); display:grid; place-items:center; }
.rh .skill img { width:36px; height:36px; object-fit:contain; }
.rh .skill span { position:absolute; bottom:-6px; left:50%; transform:translateX(-50%); font-size:8px; padding:0 5px; border-radius:99px; background:var(--gold); color:var(--gold-ink); white-space:nowrap; }
.rh .skill:disabled { opacity:.45; filter:grayscale(.6); cursor:default; }
.rh .dialogue { display:flex; align-items:center; gap:10px; padding:6px 10px 6px 6px; }
.rh .face { height:calc(100% - 6px); max-height:58px; aspect-ratio:1; border-radius:50%; overflow:hidden; background:var(--cream-2); flex:none; box-shadow:0 0 0 3px var(--white), 0 0 0 4.5px var(--panel-edge); }
.rh .face img { width:100%; height:100%; object-fit:cover; object-position:50% 10%; }
.rh .say { flex:1; min-width:0; display:grid; gap:3px; justify-items:start; }
.rh .say .who { font-size:11px; padding:1px 10px; border-radius:99px; background:var(--coral); color:var(--white); }
.rh .say p { margin:0; width:100%; font-size:13px; line-height:1.3; padding:4px 10px; border-radius:12px; background:var(--white); box-shadow:0 0 0 1px var(--panel-edge);
  overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; font-family:"Nunito_700Bold","Nunito",ui-rounded,system-ui,sans-serif; font-weight:700; animation:rhin2 .25s ease-out; }
@keyframes rhin2 { from { opacity:0; transform:translateY(4px); } }
.rh .say.warn .who { background:var(--warn); } .rh .say.good .who { background:var(--sage-deep); }
/* The panel layer passes taps through to the canvas (guests, stations, plates); only its own controls take them. */
.rh .panels { pointer-events:none; } .rh .panels > * { pointer-events:auto; }
.rh .panels > .toast, .rh .panels > .seattag, .rh .panels > .stag.plating { pointer-events:none; }
`;
export const RUSH_CSS = scaleText(TOKENS + TOP + SCENE + SHELF + BOTTOM + SHEETS_CSS);
