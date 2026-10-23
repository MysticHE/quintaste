/**
 * Styles for the Rush Hour DOM layer, following the owner's art target (docs/game/references/art-target-2026-10-18.webp):
 * cream panels floating over the café, a wooden counter, painted ingredient cards and a heat band. The game
 * world keeps one warm look in both app themes; every colour is a token. Font sizes follow Play your way text size
 * through --ts, set on the root.
 */
import { PANEL_CSS } from "./styles-panel";
import { SHEETS_CSS } from "./styles-sheets";

/** A token's value as written in the playfield's token list (sketch.ts draws Sketch cards with them). */
export const token = (name: string) => new RegExp(`${name}:(#[0-9a-fA-F]{6})`).exec(TOKENS)?.[1] ?? "";
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
  --fx-grain-white:#fbf7ee; --fx-grain-gold:#e3a43a; --fx-grain-dark:#3b2a22; --fx-heart:#e0614a;
  --gear:#2f63b8; --gear-hi:#76a6ee; --vegan:#3c9f55; --jain:#8657c0; --star-off:#ecd9a6; --bar-from:#f29a3a;
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
.rh .hud { display:flex; align-items:center; gap:6px; }
.rh .round { flex:none; width:44px; height:44px; border-radius:14px; transition:transform .12s ease-out; background:var(--cream-2); display:grid; place-items:center; box-shadow:0 0 0 1.5px var(--panel-edge); }
.rh .round svg { width:18px; height:18px; fill:var(--ink); } .rh .round:active { transform:scale(.9); }
.rh .round.gear { width:46px; height:46px; border-radius:50%; background:radial-gradient(circle at 35% 30%, var(--gear-hi), var(--gear) 72%); box-shadow:0 0 0 3px var(--white), 0 3px 8px var(--shadow); }
.rh .round.gear svg { width:26px; height:26px; fill:var(--white); }
.rh .hudmain { flex:1; min-width:0; height:100%; display:flex; align-items:center; gap:8px; padding:0 12px 0 4px; }
.rh .timer { width:46px; height:46px; position:relative; flex:none; }
.rh .timer svg { width:100%; height:100%; transform:rotate(-90deg); }
.rh .timer .track { fill:var(--pill); stroke:var(--cream-2); stroke-width:5; }
.rh .timer .arc { fill:none; stroke:var(--target); stroke-width:5; stroke-linecap:round; transition:stroke-dashoffset .3s linear; }
.rh .timer b { position:absolute; inset:0; display:grid; place-items:center; font-size:13px; color:var(--white); }
.rh .timer.warm .arc { stroke:var(--amber); } .rh .timer.late .arc { stroke:var(--hot); } .rh .timer.late { animation:rhpulse .8s ease-in-out infinite; }
@keyframes rhpulse { 50% { transform:scale(1.08); } }
.rh .takings { flex:1; min-width:0; display:grid; gap:5px; }
.rh .coins { display:flex; align-items:center; gap:6px; font-size:19px; line-height:1; }
.rh .coins small { margin-left:auto; font-size:12px; color:var(--ink-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rh .coins .ico { width:22px; height:22px; flex:none; border-radius:50%; background:radial-gradient(circle at 35% 30%, var(--gold-hi), var(--gold) 62%); box-shadow:inset 0 0 0 2px var(--gold-deep); }
.rh .coins .ico { position:relative; } .rh .coins .ico.eat { animation:rheat .16s ease-out; } @keyframes rheat { 50% { transform:scale(1.4, .78); } }
/* Each coin the counter eats flashes a ring and bumps the number (reel step 4 and 5); a combo chip counts quick serves. */
.rh .coins .ico.eat::after { content:""; position:absolute; inset:-2px; border-radius:50%; box-shadow:0 0 0 3px var(--gold-hi), 0 0 16px 5px var(--gold-hi); animation:rhring .36s ease-out forwards; }
@keyframes rhring { from { transform:scale(.6); opacity:1; } to { transform:scale(1.7); opacity:0; } }
.rh .coins b { display:inline-block; } .rh .coins b.bump { animation:rhbump .28s cubic-bezier(.2,1.6,.4,1); } @keyframes rhbump { 40% { transform:scale(1.55) translateY(-3px); color:var(--gold-deep); } }
.rh .combo { flex:none; font-size:12px; line-height:1; padding:3px 7px; border-radius:99px; background:var(--gold-hi); color:var(--gold-ink); box-shadow:0 0 0 1.5px var(--gold); animation:rhcombo .32s cubic-bezier(.2,1.7,.4,1); }
@keyframes rhcombo { from { transform:scale(.4) rotate(-12deg); opacity:0; } }
.rh .bar { position:relative; height:12px; border-radius:99px; background:var(--cream-2); box-shadow:inset 0 0 0 1.5px var(--panel-edge), inset 0 2px 3px var(--press); }
.rh .bar i { position:absolute; left:0; top:0; bottom:0; border-radius:99px; background:linear-gradient(90deg,var(--bar-from),var(--gold-hi)); transition:width .3s ease-out; }
.rh .bar .star { position:absolute; top:-7px; width:22px; height:22px; margin-left:-11px; color:var(--star-off); font-size:20px; line-height:22px; text-align:center; text-shadow:0 1px 0 var(--gold-deep); }
.rh .bar .star.lit { color:var(--gold); text-shadow:0 1px 0 var(--gold-deep), 0 0 6px var(--gold-hi); animation:rhstar .45s cubic-bezier(.2,1.6,.4,1); }
@keyframes rhstar { from { transform:scale(.3); } }
.rh .left { flex:none; width:54px; height:100%; display:grid; place-content:center; justify-items:center; line-height:1; } .rh .left b { font-size:24px; } .rh .left small { font-size:13px; }
.rh .recipe { display:flex; align-items:center; gap:8px; padding:6px 8px 6px 6px; }
.rh .recipe .idle { margin:auto; font-size:13px; color:var(--ink-2); }
.rh .recipe .bowl { height:112%; width:78px; margin:-4px 0 -4px -2px; flex:none; object-fit:contain; filter:drop-shadow(0 2px 3px var(--shadow)); animation:rhbowl .42s cubic-bezier(.2,1.5,.4,1); }
.rh .recipe .mid, .rh .recipe .hint { animation:rhcard .3s cubic-bezier(.2,.9,.3,1); }
@keyframes rhbowl { from { transform:scale(.5) rotate(-18deg); opacity:0; } } @keyframes rhcard { from { transform:translateX(14px); opacity:0; } }
.rh .recipe .mid { flex:1; min-width:0; display:grid; gap:4px; }
.rh .recipe .t { display:flex; align-items:baseline; gap:5px; font-size:18px; white-space:nowrap; overflow:hidden; }
.rh .recipe .t b { flex:0 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; } .rh .recipe .t small { flex:0 1 auto; } .rh .recipe .t.long { font-size:15px; } .rh .recipe .t.longer { font-size:13px; }
.rh .recipe .t small { font-size:12px; color:var(--ink-2); overflow:hidden; text-overflow:ellipsis; flex:1 1 0; min-width:26px; }
.rh .rule { flex:none; font-size:11px; padding:1px 7px; border-radius:99px; background:var(--coral); color:var(--white); white-space:nowrap; }
.rh .steps { display:flex; gap:3px; align-items:center; min-width:0; }
/* The ingredients wanted now are large; done and later ones step back, so a long recipe stays readable. */
.rh .step { flex:0 1 26px; min-width:16px; aspect-ratio:1; height:auto; border-radius:9px; background:var(--white); box-shadow:0 0 0 1.5px var(--panel-edge), 0 2px 3px var(--press); position:relative; display:grid; place-items:center;
  transition:flex-basis .25s cubic-bezier(.2,1.4,.4,1); }
.rh .step.want { flex:0 0 38px; }
.rh .step img { width:84%; height:84%; object-fit:contain; } .rh .step.want { box-shadow:0 0 0 2.5px var(--gold), 0 0 8px 2px var(--gold-hi); animation:rhpulse 1.6s ease-in-out infinite; }
.rh .step.empty img { opacity:.3; filter:grayscale(1); } .rh .step.opt { outline:1.5px dashed var(--panel-edge); outline-offset:-1.5px; box-shadow:none; }
.rh .step.done { animation:rhpop2 .3s cubic-bezier(.2,1.6,.4,1); }
.rh .step .tick { position:absolute; right:-6px; top:-6px; width:18px; height:18px; border-radius:50%; background:var(--sage-deep); color:var(--white); font-size:11px; display:grid; place-items:center;
  box-shadow:0 0 0 1.5px var(--white); animation:rhstamp .34s cubic-bezier(.2,1.6,.4,1); }
@keyframes rhstamp { from { transform:scale(0) rotate(-35deg); } }
.rh .step.bad .tick { background:var(--warn); } .rh .sep { width:2px; height:20px; background:var(--panel-edge); border-radius:2px; flex:none; }
@keyframes rhpop2 { from { transform:scale(.6); } }
.rh .hint { flex:none; max-width:28%; font-size:11px; line-height:1.2; padding:5px 8px; border-radius:12px; background:var(--hint-bg); color:var(--hint-ink); text-align:center; }
`;
const SCENE = `
.rh .bubble { position:absolute; transform:translate(-50%,-100%); margin-top:-8px; background:var(--white); border-radius:14px; padding:3px 6px 4px; display:grid; justify-items:center; gap:2px;
  box-shadow:0 0 0 2.5px var(--gold-hi), 0 0 10px 1px var(--gold-hi), 0 3px 8px var(--shadow); font-size:11px; min-width:58px; max-width:112px; text-align:center; animation:rhpop .35s cubic-bezier(.2,1.6,.4,1); }
.rh .bubble::after { content:""; position:absolute; bottom:-6px; left:50%; margin-left:-6px; border:6px solid transparent; border-top-color:var(--white); border-bottom-width:0; }
.rh .bubble:disabled { cursor:default; }
.rh .bubble.focus { box-shadow:0 0 0 3.5px var(--gold), 0 0 16px 4px var(--gold-hi), 0 3px 8px var(--shadow); } .rh .bubble.low { animation:rhwobble .5s ease-in-out infinite; }
.rh .bubble.target { box-shadow:0 0 0 3px var(--target), 0 3px 8px var(--shadow); animation:rhbeat 1s ease-in-out infinite; }
@keyframes rhpop { from { transform:translate(-50%,-80%) scale(.4); opacity:0; } } @keyframes rhwobble { 50% { transform:translate(-50%,-100%) rotate(3deg); } }
@keyframes rhbeat { 50% { transform:translate(-50%,-100%) scale(1.06); } }
.rh .bubble .row { display:flex; align-items:center; gap:3px; } .rh .bubble img { width:36px; height:26px; object-fit:contain; }
.rh .chip { max-width:100%; overflow:hidden; text-overflow:ellipsis; font-size:11px; padding:1px 7px; border-radius:99px; background:var(--cream-2); line-height:1.4; white-space:nowrap; }
.rh .chip.rule { background:var(--coral); color:var(--white); padding:1px 8px; font-size:11px; } .rh .chip.rule.vegan { background:var(--vegan); } .rh .chip.rule.jain { background:var(--jain); }
.rh .chip.rule.nomeat { background:var(--cook); } .rh .chip.rule.nomush, .rh .chip.rule.mild { background:var(--hint-bg); color:var(--hint-ink); } .rh .chip.serve { background:var(--sage-deep); color:var(--white); } .rh .chip.yum { background:var(--hint-bg); color:var(--hint-ink); }
.rh .hearts { letter-spacing:-1px; font-size:12px; line-height:1; color:var(--fx-heart); } .rh .hearts .off { color:var(--panel-edge); }
.rh .seattag { position:absolute; transform:translateY(-50%); display:inline-flex; align-items:center; gap:3px; font-size:14px; padding:3px 9px 3px 6px; border-radius:99px; background:var(--cream); box-shadow:0 0 0 1.5px var(--panel-edge); }
.rh .seattag svg { width:14px; height:14px; fill:var(--ink); }
.rh .stag { position:absolute; transform:translate(-50%,-50%); font-size:13px; padding:0 13px 0 9px; min-height:38px; gap:6px; border-radius:99px; background:var(--pill); color:var(--white); white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 0 0 2px var(--glass), 0 3px 6px var(--shadow); transition:background .2s; }
.rh .stag.quiet { opacity:0; pointer-events:none; animation:none; } .rh .stag.quiet:focus-visible { opacity:1; }
.rh .stag .tx { min-width:0; overflow:hidden; text-overflow:ellipsis; } .rh .stag.narrow { font-size:12px; padding:0 9px 0 6px; gap:4px; } .rh .stag.narrow .ti { width:14px; height:14px; }
.rh .stag .ti { width:17px; height:17px; flex:none; fill:currentColor; } .rh .stag .ti-flame { fill:var(--amber); } .rh .stag .ti-warn { fill:var(--white); }
.rh .stag.take { background:linear-gradient(var(--gold-hi),var(--gold)); color:var(--gold-ink); animation:rhtagin .26s cubic-bezier(.2,1.6,.4,1), rhtag .5s .26s ease-in-out infinite; }
/* A tag pops when its station changes state (cooking, needs attention, ready), then a ready one keeps a slow beat. */
.rh .stag.cook { background:var(--cook); animation:rhtagin .26s cubic-bezier(.2,1.6,.4,1); } .rh .stag.warn { background:var(--warn); animation:rhtagin .26s cubic-bezier(.2,1.6,.4,1); }
.rh .stag.ready { background:var(--sage-deep); animation:rhtagin .26s cubic-bezier(.2,1.6,.4,1), rhtag 1.1s .26s ease-in-out infinite; }
@keyframes rhtagin { from { transform:translate(-50%,-50%) scale(.7); } }
@keyframes rhtag { 50% { transform:translate(-50%,-50%) scale(1.08); } }
.rh .tool { position:absolute; width:46px; height:46px; transform:translate(-50%,-50%); border-radius:50%; background:var(--cream); display:grid; place-items:center;
  box-shadow:0 0 0 2px var(--gold), 0 3px 8px var(--shadow); touch-action:none; cursor:grab; z-index:6; animation:rhtag 1s ease-in-out infinite; }
.rh .tool img { width:36px; height:36px; object-fit:contain; pointer-events:none; } .rh .tool b { font-size:11px; color:var(--ink); }
.rh .tool.drag { cursor:grabbing; animation:none; z-index:30; box-shadow:0 0 0 2px var(--gold), 0 8px 16px var(--shadow); }
.rh.still .tool { animation:none; }
.rh .toast { position:absolute; transform:translateX(-50%); font-size:12px; padding:5px 12px; border-radius:99px; background:var(--pill); color:var(--white); white-space:nowrap; animation:rhin .2s ease-out; }
@keyframes rhin { from { opacity:0; transform:translate(-50%,6px); } }
.rh .banner { position:absolute; transform:translate(-50%,-50%); z-index:48; font-size:30px; color:var(--white); white-space:nowrap; pointer-events:none;
  text-shadow:0 3px 0 var(--coral), 0 6px 14px var(--shadow); animation:rhbanner 1.3s ease-out forwards; }
@keyframes rhbanner { 0% { transform:translate(-50%,-50%) scale(.4); opacity:0; } 18% { transform:translate(-50%,-50%) scale(1.12); opacity:1; } 30% { transform:translate(-50%,-50%) scale(1); }
  78% { opacity:1; transform:translate(-50%,-50%); } 100% { opacity:0; transform:translate(-50%,-80%); } }
.rh .caption { position:absolute; z-index:46; pointer-events:none; font-size:11px; padding:3px 9px; border-radius:99px; background:var(--ink); color:var(--white); animation:rhcap 1.4s ease-out forwards; }
@keyframes rhcap { 0% { opacity:0; transform:translateY(-4px); } 12%, 75% { opacity:1; transform:none; } 100% { opacity:0; } }
`;
const SHELF = `
.rh .shelf { padding:4px 8px 16px; }
/* The tray scrolls sideways, which clips anything outside it: padding keeps the cards' borders and glows inside. */
.rh .tray { display:flex; gap:var(--gap); height:100%; padding:6px 4px; scroll-padding-inline:4px; overflow-x:auto; overflow-y:hidden; scroll-snap-type:x proximity; scrollbar-width:none; overscroll-behavior-x:contain; }
.rh .tray::-webkit-scrollbar { display:none; }
/* More cards past the edge: the shelf peeks left once when it appears, so it reads as scrollable. */
.rh .tray[data-more] .group, .rh .tray[data-more] .divider { animation:rhpeek 1.1s .7s ease-in-out 1; }
@keyframes rhpeek { 35% { transform:translateX(-18px); } 60% { transform:translateX(3px); } }
.rh .shelf.paged .tray { margin:0 14px; }
.rh .sarrow { position:absolute; top:calc(50% - 5px); z-index:3; width:26px; height:26px; margin-top:-13px; border-radius:50%; display:grid; place-items:center; color:var(--ink-2);
  background:var(--white); box-shadow:0 0 0 1.5px var(--panel-edge), 0 3px 8px var(--shadow); }
.rh .sarrow::after { content:""; position:absolute; top:-10px; bottom:-10px; } .rh .sarrow svg { width:15px; height:15px; } .rh .sarrow:active { transform:scale(.9); }
.rh .sarrow.l { left:-1px; } .rh .sarrow.l::after { left:-8px; right:0; } .rh .sarrow.l svg { transform:scaleX(-1); }
.rh .sarrow.r { right:-1px; } .rh .sarrow.r::after { left:0; right:-8px; }
.rh .sdots { position:absolute; left:0; right:0; bottom:5px; display:flex; justify-content:center; gap:6px; pointer-events:none; }
.rh .sdots i { width:7px; height:7px; border-radius:50%; background:var(--panel-edge); transition:transform .2s, background .2s; } .rh .sdots i.on { background:var(--gold); transform:scale(1.25); }
.rh .group { flex:none; display:grid; grid-auto-flow:column; grid-template-rows:repeat(2, var(--ch)); grid-auto-columns:var(--cw); gap:var(--gap); }
.rh .divider { flex:none; width:2px; margin:6px 2px; border-radius:2px; background:var(--panel-edge); }
.rh .cardwrap { position:relative; scroll-snap-align:start; min-width:0; }
.rh .card { position:relative; width:100%; height:100%; border-radius:12px; background:var(--card); box-shadow:0 0 0 1.5px var(--panel-edge), 0 2px 0 var(--panel-edge);
  display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:1px; padding:5px 3px 3px; touch-action:none; transition:transform .12s ease-out; }
.rh .card img { flex:1 1 0; min-height:0; width:88%; object-fit:contain; pointer-events:none; }
.rh .card .nm { max-width:100%; font-size:calc(var(--nmfs, 12px) * min(var(--ts, 1), 1.08)); line-height:1.08; text-align:center; overflow:hidden; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; pointer-events:none; }
.rh .card.labelled { box-shadow:0 0 0 2px var(--gold), 0 0 10px 2px var(--gold-hi), 0 2px 0 var(--gold-deep); }
.rh .card:active { transform:scale(.93); } .rh .card.nope { animation:rhnope .4s ease-in-out; }
@keyframes rhnope { 20%, 60% { transform:translateX(-4px); } 40%, 80% { transform:translateX(4px); } }
.rh .card .ab { position:absolute; left:3px; top:3px; width:17px; height:17px; border-radius:50%; background:var(--ink); color:var(--white); font-size:11px; display:grid; place-items:center; }
.rh .cardwrap .lab { position:absolute; top:2px; left:50%; transform:translateX(-50%); width:max-content; white-space:nowrap; font-size:11px; padding:0 8px 0 5px; min-height:18px; line-height:18px;
  display:inline-flex; align-items:center; gap:3px; animation:rhlab .9s 1s ease-in-out 2; border-radius:99px;
  background:var(--gold-hi); color:var(--gold-ink); box-shadow:0 0 0 1.5px var(--gold); z-index:2; touch-action:none; }
.rh .cardwrap .lab svg { width:11px; height:11px; fill:var(--gold-deep); }
/* The Label badge is small to the eye; its touch area grows into its own card (a press there still drags the card), never the one above. */
.rh .cardwrap .lab::after { content:""; position:absolute; inset:-4px 0 -23px; }
@keyframes rhlab { 25% { transform:translateX(-50%) rotate(-7deg) scale(1.08); } 55% { transform:translateX(-50%) rotate(6deg) scale(1.08); } }
.rh .dragghost { position:absolute; width:60px; height:60px; object-fit:contain; pointer-events:none; transform:translate(-50%,-62%) scale(1.12); filter:drop-shadow(0 8px 6px var(--shadow)); z-index:40; }
.rh .dragghost.home { transition:left .2s ease-in, top .2s ease-in, opacity .2s; opacity:.25; }
`;
/** Twists and the drag-only shelf: VIP guests, stock tags, shared pots, bonus goals, personal bests and twist cards. */
const TWISTS_CSS = `
.rh .bubble.vip { box-shadow:0 0 0 3px var(--gold-hi), 0 3px 8px var(--shadow); }
.rh .chip.crown { background:var(--gold); color:var(--gold-ink); }
.rh .chip.pair { background:var(--sage-deep); color:var(--white); }
.rh .ptag { position:absolute; z-index:3; transform:translate(-100%,0); padding:1px 7px; min-height:17px; line-height:17px; border-radius:99px; font-size:11px; background:var(--gold); color:var(--gold-ink);
  box-shadow:0 0 0 1.5px var(--gold-deep); pointer-events:none; white-space:nowrap; }
.rh .pbest { display:flex; flex-wrap:wrap; align-items:center; gap:4px 10px; } .rh .pbest span { font-family:"Nunito_700Bold","Nunito",ui-rounded,system-ui,sans-serif; font-weight:700; }
.rh .pbest span.new { color:var(--sage-deep); }
.rh .card.low { box-shadow:0 0 0 2px var(--amber), 0 2px 0 var(--panel-edge); }
.rh .card.out { opacity:.5; filter:grayscale(.75); }
.rh .stk { position:absolute; right:3px; top:3px; font-size:11px; padding:0 5px; min-height:16px; line-height:16px; border-radius:99px; background:var(--warn); color:var(--white); pointer-events:none; }
.rh .card.low .stk { background:var(--amber); color:var(--ink); }
.rh .remember.twist { background:var(--hint-bg); color:var(--hint-ink); }
.rh .bonus { display:grid; gap:2px; padding:8px 12px; border-radius:14px; background:var(--white); box-shadow:inset 0 0 0 2px var(--panel-edge); font-size:12px; }
.rh .bonus.on { box-shadow:inset 0 0 0 2px var(--gold); }
.rh .bonus span { font-family:"Nunito_700Bold","Nunito",ui-rounded,system-ui,sans-serif; font-weight:700; color:var(--ink-2); font-size:11px; }
.rh .stag.ready.plating { animation:rhtag 0.8s ease-in-out infinite; }
.rh .basket { display:grid; align-content:center; justify-items:center; gap:8px; padding:10px; }
.rh .basket.over { box-shadow:0 0 0 3px var(--target), 0 4px 12px var(--shadow); }
.rh .bhead { display:flex; align-items:baseline; gap:8px; font-size:15px; } .rh .bhead small { font-size:12px; color:var(--ink-2); }
.rh .bslots { display:flex; flex-wrap:wrap; justify-content:center; gap:6px; max-width:100%; }
.rh .bslot { width:44px; height:44px; border-radius:12px; display:grid; place-items:center; background:var(--cream); border:1.5px dashed var(--panel-edge); color:var(--ink-2); font-size:16px; }
.rh .bslot.in { background:var(--card); border:1.5px solid var(--sage); } .rh .bslot img { width:36px; height:36px; object-fit:contain; }
`;
export const RUSH_CSS = scaleText(TOKENS + TOP + SCENE + SHELF + PANEL_CSS + TWISTS_CSS + SHEETS_CSS);
