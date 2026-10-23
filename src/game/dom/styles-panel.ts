/**
 * The heat panel, the knob and cook timer (prototype), the toast that replaced the chat panel and the stamp over a station,
 * in the owner's mockup (22 Oct 2026): a gradient heat bar with coloured labels, a big red Heat button, a white Restart pill
 * and a status card holding the companion. Tokens come from styles.ts.
 */
export const PANEL_CSS = `
.rh .heat { padding:8px 10px 10px; display:grid; grid-template-rows:auto auto 1fr; gap:4px; }
.rh .heat.knobbed { grid-template-rows:auto auto auto 1fr; }
.rh .meterbox { display:grid; gap:2px; padding:0 4px; }
.rh .meter { position:relative; height:18px; }
.rh .meter .track { position:absolute; inset:0; border-radius:99px; box-shadow:inset 0 0 0 2.5px var(--pill), inset 0 4px 4px var(--press); }
/* This step's band, outlined as the sweet spot; it breathes while the knob is held. */
.rh .meter .zone { position:absolute; top:-2px; bottom:-2px; border-radius:7px; box-shadow:0 0 0 2px var(--white), 0 0 6px 1px var(--target); pointer-events:none; }
.rh .meter.held .zone { animation:rhzone .45s ease-in-out infinite alternate; }
@keyframes rhzone { to { box-shadow:0 0 0 3px var(--white), 0 0 18px 6px var(--target); } }
.rh .needle { position:absolute; top:-7px; width:8px; height:32px; margin-left:-4px; border-radius:4px; background:var(--ink); box-shadow:0 0 0 2.5px var(--white), 0 2px 5px var(--shadow); transition:left .1s linear; z-index:1; }
/* The held needle follows the hand frame by frame and glows like the flame it sets. */
.rh .needle.knob { transition:none; background:var(--gold-deep); box-shadow:0 0 0 2.5px var(--white), 0 0 14px 5px var(--gold-hi); }
.rh .meter .set { position:absolute; top:-12px; margin-left:-6px; border:6px solid transparent; border-top-color:var(--ink); }
/* The grade pops just under the bar, over its labels, so it never covers the station tags above. */
.rh .grade { position:absolute; top:calc(100% + 1px); transform:translateX(-50%); z-index:4; font-size:14px; white-space:nowrap; padding:3px 11px; border-radius:99px; pointer-events:none;
  background:var(--white); box-shadow:0 0 0 1.5px var(--panel-edge), 0 3px 8px var(--shadow); animation:rhgrade 1.3s ease-out forwards; }
.rh .grade.gold { background:linear-gradient(var(--gold-hi),var(--gold)); color:var(--gold-ink); box-shadow:0 0 0 2px var(--white), 0 0 14px 4px var(--gold-hi); }
.rh .grade.good { color:var(--sage-deep); } .rh .grade.cool { color:var(--cool-deep); } .rh .grade.hot { color:var(--warn); }
@keyframes rhgrade { 0% { transform:translate(-50%,8px) scale(.5); opacity:0; } 14% { transform:translate(-50%,0) scale(1.18); opacity:1; } 26% { transform:translate(-50%,0) scale(1); }
  80% { opacity:1; } 100% { opacity:0; transform:translate(-50%,-8px); } }
.rh .ticks { position:relative; height:16px; }
.rh .ticks span { position:absolute; top:4px; transform:translateX(-50%); font-size:12px; line-height:1; white-space:nowrap; }
.rh .ticks span::before { content:""; position:absolute; top:-5px; left:50%; margin-left:-4px; border:4px solid transparent; border-top-width:0; border-bottom-color:currentColor; }
.rh .ticks .cool { color:var(--cool-deep); } .rh .ticks .target { color:var(--sage-deep); } .rh .ticks .hot { color:var(--cook); } .rh .ticks .toohot { color:var(--warn); }
.rh .noheat { font-size:12px; color:var(--ink-2); align-self:center; }
.rh .hrow { display:flex; align-items:center; gap:6px; min-height:0; }
.rh .burner { flex:none; height:48px; padding:0 14px 0 10px; border-radius:99px; display:inline-flex; align-items:center; gap:6px; font-size:15px; color:var(--white);
  background:linear-gradient(var(--hot),var(--burner-2)); box-shadow:inset 0 -3px 0 var(--burner), 0 3px 6px var(--shadow); transition:transform .12s; }
.rh .burner:active { transform:scale(.95); } .rh .burner svg { width:20px; height:20px; fill:var(--gold-hi); flex:none; }
.rh .burner.on { background:linear-gradient(var(--amber),var(--hot)); animation:rhburn 1.6s ease-in-out infinite; }
.rh .burner .knobicon { color:var(--white); } .rh .burner .knobicon rect { fill:var(--gold-hi); }
.rh .burner.held { transform:scale(.96); background:linear-gradient(var(--gold-hi),var(--hot)); box-shadow:inset 0 -3px 0 var(--burner), 0 0 0 4px var(--gold-hi), 0 0 18px 5px var(--gold-hi); animation:none; }
.rh .burner.nudge { animation:rhnudge 1.1s ease-in-out infinite; } .rh .burner:disabled { opacity:.5; cursor:default; }
@keyframes rhburn { 50% { box-shadow:inset 0 -3px 0 var(--burner), 0 0 0 5px var(--warn-soft); } }
@keyframes rhnudge { 50% { transform:scale(1.07); box-shadow:inset 0 -3px 0 var(--burner), 0 0 0 5px var(--gold-hi); } }
.rh .restart, .rh .take { flex:none; height:46px; padding:0 12px 0 9px; border-radius:99px; display:inline-flex; align-items:center; gap:5px; font-size:13px; transition:transform .12s; }
.rh .restart { background:var(--white); box-shadow:0 0 0 1.5px var(--panel-edge), 0 2px 5px var(--shadow); } .rh .restart svg { width:18px; height:18px; }
.rh .take { background:linear-gradient(var(--gold-hi),var(--gold)); color:var(--gold-ink); box-shadow:inset 0 -3px 0 var(--gold-deep), 0 2px 6px var(--shadow); }
.rh .take svg { width:18px; height:18px; fill:currentColor; } .rh .restart:active, .rh .take:active { transform:scale(.93); }
.rh .take.now { animation:rhtakenow .42s ease-in-out infinite alternate; box-shadow:inset 0 -3px 0 var(--gold-deep), 0 0 0 3px var(--white), 0 0 18px 6px var(--gold-hi); }
.rh .take.over { background:linear-gradient(var(--peach),var(--hot)); color:var(--white); box-shadow:inset 0 -3px 0 var(--burner); }
@keyframes rhtakenow { to { transform:scale(1.09); } }
/* The companion's Skill card: its picture, "Skill" and the skill's name (or Used). */
.rh .skill { flex:1; min-width:0; height:50px; display:flex; align-items:center; gap:8px; padding:3px 10px 3px 4px; border-radius:14px; background:var(--white); text-align:left;
  box-shadow:0 0 0 1.5px var(--panel-edge), 0 2px 5px var(--shadow); transition:transform .12s; }
.rh .skill:active { transform:scale(.96); }
.rh .skill .pic { position:relative; flex:none; width:42px; height:42px; border-radius:11px; background:var(--cream); display:grid; place-items:center; box-shadow:0 0 0 1.5px var(--panel-edge); }
.rh .skill img { width:34px; height:34px; object-fit:contain; }
.rh .skill .line { flex:1; min-width:0; display:grid; gap:1px; line-height:1.15; }
.rh .skill .line b { font-size:11px; color:var(--ink-2); }
.rh .skill .line .how { font-size:13px; line-height:1.1; color:var(--gold-deep); overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.rh .skill .ok { position:absolute; top:-6px; right:-6px; width:18px; height:18px; border-radius:50%; background:var(--sage-deep); color:var(--white); font-size:11px; font-style:normal; display:grid; place-items:center; box-shadow:0 0 0 2px var(--white); }
.rh .skill.used .line .how { color:var(--ink-2); }
.rh .skill:disabled { cursor:default; } .rh .skill:disabled:not(.used) { opacity:.55; }
.rh .restart.alert { background:var(--warn-soft); color:var(--warn); box-shadow:0 0 0 1.5px var(--warn); max-width:132px; } .rh .restart .tx { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
/* Knob mode's cook timer (C): the step cooks along the bar to the gold window, which is done to the second; past it, overcooked. */
.rh .cooktimer { display:flex; align-items:center; gap:6px; height:24px; padding:0 4px; transition:opacity .2s; }
.rh .cooktimer .watch { width:18px; height:18px; flex:none; color:var(--ink-2); }
.rh .ctrack { position:relative; flex:1; height:12px; border-radius:99px; background:var(--cream-2); box-shadow:inset 0 0 0 2px var(--panel-edge); }
.rh .cfill { position:absolute; left:0; top:0; bottom:0; border-radius:99px; background:linear-gradient(90deg,var(--cream),var(--amber)); }
.rh .cover { position:absolute; top:2px; bottom:2px; right:2px; border-radius:0 99px 99px 0; background:repeating-linear-gradient(45deg,var(--hot) 0 5px,var(--warn) 5px 10px); opacity:.5; }
.rh .cwin { position:absolute; top:-5px; bottom:-5px; min-width:18px; border-radius:7px; display:grid; place-items:center; font-size:11px; color:var(--gold-ink);
  background:linear-gradient(var(--gold-hi),var(--gold)); box-shadow:0 0 0 2px var(--white), 0 0 8px 2px var(--gold-hi); transition:transform .15s; }
.rh .cmark { position:absolute; top:50%; z-index:1; width:18px; height:18px; margin:-9px 0 0 -9px; border-radius:50%; background:var(--white); box-shadow:0 0 0 3px var(--ink), 0 2px 5px var(--shadow); }
.rh .cooktimer.idle { opacity:.45; } .rh .cooktimer.near .cwin { animation:rhwin .5s ease-in-out infinite alternate; }
.rh .cooktimer.now .cwin { transform:scale(1.18); box-shadow:0 0 0 2.5px var(--white), 0 0 18px 7px var(--gold-hi); }
.rh .cooktimer.now .cmark { box-shadow:0 0 0 3px var(--gold-deep), 0 0 12px 4px var(--gold-hi); }
.rh .cooktimer.over .cmark { box-shadow:0 0 0 3px var(--warn), 0 2px 5px var(--shadow); animation:rhnope .4s ease-in-out infinite; }
/* A flip (at halfway) or a fold (at the start) on the cook timer: gold while it is on time, red once it is late. */
.rh .cturn { position:absolute; top:50%; z-index:2; width:24px; height:24px; margin:-12px 0 0 -12px; border-radius:50%; display:grid; place-items:center;
  background:var(--white); color:var(--ink-2); box-shadow:0 0 0 2px var(--panel-edge), 0 2px 4px var(--shadow); }
.rh .cturn svg { width:15px; height:15px; fill:currentColor; }
.rh .cturn.due { background:linear-gradient(var(--gold-hi),var(--gold)); color:var(--gold-ink); box-shadow:0 0 0 2.5px var(--white), 0 0 16px 6px var(--gold-hi); animation:rhwin .45s ease-in-out infinite alternate; }
.rh .cturn.late { background:var(--warn); color:var(--white); box-shadow:0 0 0 2.5px var(--white), 0 2px 5px var(--shadow); animation:rhnope .4s ease-in-out infinite; }
@keyframes rhwin { to { box-shadow:0 0 0 2px var(--white), 0 0 14px 5px var(--gold-hi); } }
/* Messages from the chef or a guest, under the order card, gone on their own. */
.rh .saytoast { position:absolute; z-index:45; transform:translateX(-50%); display:flex; align-items:center; gap:8px; width:max-content; padding:5px 14px 5px 5px; border-radius:20px;
  background:var(--glass); box-shadow:0 0 0 1.5px var(--panel-edge), 0 4px 12px var(--shadow); pointer-events:none; animation:rhtoast 3.2s ease-out forwards; }
.rh .saytoast.warn { box-shadow:0 0 0 2px var(--warn), 0 4px 12px var(--shadow); animation-duration:4.5s; }
.rh .saytoast img { width:32px; height:32px; flex:none; border-radius:50%; object-fit:cover; object-position:50% 10%; background:var(--cream-2); }
.rh .saytoast p { margin:0; font-size:13px; line-height:1.25; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
  font-family:"Nunito_700Bold","Nunito",ui-rounded,system-ui,sans-serif; font-weight:700; }
.rh .saytoast b { margin-right:5px; font-family:"Nunito_800ExtraBold","Nunito",ui-rounded,system-ui,sans-serif; font-weight:800; color:var(--coral); }
.rh .saytoast.warn b { color:var(--warn); } .rh .saytoast.good b { color:var(--sage-deep); }
@keyframes rhtoast { 0% { opacity:0; transform:translate(-50%,-8px) scale(.9); } 7% { opacity:1; transform:translateX(-50%); } 88% { opacity:1; } 100% { opacity:0; transform:translateX(-50%); } }
/* The coin pickup (coinsFx.ts), over every panel: coins, sparks and the takings won. */
.rh .flycoin { position:absolute; left:0; top:0; z-index:47; width:26px; height:26px; margin:-13px 0 0 -13px; border-radius:50%; pointer-events:none; will-change:transform;
  background:radial-gradient(circle at 35% 30%, var(--gold-hi), var(--gold) 62%); box-shadow:inset 0 0 0 3px var(--gold-deep), 0 0 10px 2px var(--gold-hi); }
.rh .flyspark { position:absolute; left:0; top:0; z-index:46; width:8px; height:8px; margin:-4px 0 0 -4px; border-radius:50%; pointer-events:none; background:var(--gold-hi); box-shadow:0 0 6px 2px var(--gold-hi); }
.rh .coinpop { position:absolute; z-index:47; transform:translate(-50%,-50%); font-size:30px; white-space:nowrap; pointer-events:none; color:var(--gold-hi);
  text-shadow:0 3px 0 var(--gold-deep), 0 0 3px var(--gold-ink), 0 0 16px var(--gold-hi); animation:rhcoinpop 1.6s cubic-bezier(.2,1.4,.4,1) forwards; }
@keyframes rhcoinpop { 0% { transform:translate(-50%,-30%) scale(.3); opacity:0; } 12% { transform:translate(-50%,-50%) scale(1.3); opacity:1; } 22% { transform:translate(-50%,-50%) scale(1); }
  72% { opacity:1; transform:translate(-50%,-85%); } 100% { opacity:0; transform:translate(-50%,-150%); } }
/* How a step came off (C), stamped over its station. */
.rh .stamp { position:absolute; z-index:44; transform:translate(-50%,-100%); white-space:nowrap; pointer-events:none; font-size:17px; color:var(--white);
  text-shadow:0 2px 0 var(--cook), 0 0 8px var(--shadow); animation:rhstampin 1.1s cubic-bezier(.2,1.4,.4,1) forwards; }
.rh .stamp.perfect { font-size:28px; color:var(--gold-hi); text-shadow:0 3px 0 var(--gold-deep), 0 0 4px var(--gold-ink), 0 0 18px var(--gold-hi); }
@keyframes rhstampin { 0% { transform:translate(-50%,-100%) scale(2.2); opacity:0; } 16% { transform:translate(-50%,-100%) scale(.9); opacity:1; } 28% { transform:translate(-50%,-100%) scale(1.06); }
  72% { opacity:1; transform:translate(-50%,-112%); } 100% { opacity:0; transform:translate(-50%,-150%); } }
/* The panel layer passes taps through to the canvas (guests, stations, plates); only its own controls take them. */
.rh .panels { pointer-events:none; } .rh .panels > * { pointer-events:auto; }
.rh .panels > .toast, .rh .panels > .seattag, .rh .panels > .stag.plating, .rh .panels > .saytoast, .rh .panels > .stamp { pointer-events:none; }
`;
