import { CHEFS, PROPS, chefTitle, ticketLine, ticketKey as keyOf, clock, ago, reason, ui } from './strings.js';
import { LIVE, ON_SHIFT } from './chefs.js';
import { createWorld } from './world.js';
import { createTickets } from './tickets.js';

const FEED_URL = '/api/kitchen/feed';
const POLL_MS = 60_000;
const STALE_MS = 2 * 3_600_000;
const PAGE = 6;
const SFA = /^https:\/\/www\.sfa\.gov\.sg\//;
const ROUTE = /^\/(?!\/)[A-Za-z0-9/?=&%._~-]*$/;
const $ = id => document.getElementById(id);

const state = { lang: initialLang(), feed: null, chef: null, expanded: false, loaded: false, replayed: false, seen: new Set() };
const scene = $('scene');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let world = null, tickets = null;

function initialLang() {
  try {
    const saved = localStorage.getItem('kitchen-lang');
    if (saved === 'en' || saved === 'zh') return saved;
  } catch { /* storage blocked: fall back to the browser language */ }
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}
const fresh = feed => feed?.generatedAt && Date.now() - Date.parse(feed.generatedAt) < STALE_MS;

function chefState(id) {
  if (!LIVE.has(id)) return { state: 'soon' };
  if (!state.feed?.generatedAt) return { state: 'unknown' };
  if (!fresh(state.feed)) return { state: 'resting' };
  return state.feed.chefs.find(c => c.id === id) ?? { state: 'resting' };
}
/** Online means the bot is on shift (working, checking plates or waiting on the owner); the light on each tag shows it. */
const presence = chef => (chef.state === 'soon' ? null : ON_SHIFT.includes(chef.state) ? 'online' : 'offline');

function stateWords(chef) {
  const t = ui(state.lang);
  if (chef.state === 'waiting') return t.waiting(chef.waiting ?? 0);
  const word = t[chef.state] ?? t.unknown;
  if (chef.state === 'working' && chef.since) return word + ' · ' + t.since(clock(chef.since, state.lang));
  if (chef.state === 'resting' && chef.nextShift && Date.parse(chef.nextShift) > Date.now()) return word + ' · ' + t.back(clock(chef.nextShift, state.lang));
  return word;
}

function renderText() {
  const t = ui(state.lang);
  document.documentElement.lang = state.lang === 'zh' ? 'zh-Hans' : 'en';
  document.title = t.title + ' · QuinTaste';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-label]').forEach(el => el.setAttribute('aria-label', t[el.dataset.i18nLabel]));
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
  document.querySelectorAll('#how-list li').forEach((li, i) => {
    li.querySelector('strong').textContent = t.how[i][0];
    li.querySelector('span').textContent = t.how[i][1];
  });
}

function renderChefs() {
  const template = $('chef-template');
  scene.querySelectorAll('.chef').forEach(button => {
    if (!button.firstElementChild) button.append(template.content.cloneNode(true));
    const id = button.dataset.chef, chef = chefState(id), on = presence(chef), t = ui(state.lang);
    button.dataset.state = chef.state;
    if (on) button.dataset.presence = on; else delete button.dataset.presence;
    button.setAttribute('aria-pressed', String(state.chef === id));
    button.querySelector('.chef-name').textContent = CHEFS[id].name[state.lang];
    button.querySelector('.chef-role').textContent = CHEFS[id].role[state.lang];
    const status = (on ? t[on] + ', ' : '') + stateWords(chef);
    button.setAttribute('aria-label', `${chefTitle(id, state.lang)}, ${status}. ${CHEFS[id].job[state.lang]}`);
    scene.querySelectorAll(`.prop[data-for="${id}"]`).forEach(prop => { prop.dataset.state = chef.state; });
  });
  world?.setStates(Object.fromEntries([...scene.querySelectorAll('.chef')].map(b => [b.dataset.chef, b.dataset.state])));
  scene.classList.toggle('has-selection', Boolean(state.chef));
}

function renderNotice() {
  const t = ui(state.lang), feed = state.feed, notice = $('notice');
  let words = '';
  if (feed?.sample) words = t.sample;
  else if (!feed?.generatedAt) words = t.opening;
  else if (!fresh(feed)) words = t.delayed(ago(feed.generatedAt, state.lang));
  notice.textContent = words;
  notice.hidden = !words;
  const today = fresh(feed) ? feed.today : null, count = $('pass-count');
  count.hidden = !today || today.published == null;
  if (today) count.textContent = t.pass(today.published ?? 0, today.sentBack ?? 0);
  const back = fresh(feed) ? feed.sentBack.filter(s => s.count > 0) : [];
  $('sent-back').hidden = !back.length || Boolean(state.chef);
  $('sent-back').textContent = t.sentBack + ': ' + back.map(s => `${reason(s.reason, state.lang)} (${s.count})`).join(' · ');
}

function ticketLink(item, t) {
  if (item.type === 'sfa-notice' && SFA.test(item.url ?? '')) {
    const a = Object.assign(document.createElement('a'), { href: item.url, target: '_blank', rel: 'noopener noreferrer', textContent: t.sfaLink });
    return a;
  }
  if (item.route && ROUTE.test(item.route)) return Object.assign(document.createElement('a'), { href: item.route, textContent: t.openTicket });
  return null;
}

function renderRail() {
  const t = ui(state.lang), rail = $('rail'), template = $('ticket-template');
  const items = (state.feed?.items ?? []).filter(i => !state.chef || i.chef === state.chef)
    .map(i => ({ ...i, line: ticketLine(i, state.lang) })).filter(i => i.line);
  const shown = state.expanded ? items : items.slice(0, PAGE);
  rail.replaceChildren(...shown.map(item => {
    const li = template.content.firstElementChild.cloneNode(true);
    li.dataset.key = keyOf(item);
    li.dataset.chef = item.chef;
    li.querySelector('.ticket-chef').src = `/kitchen/art/${PROPS[item.chef]}.webp`;
    li.querySelector('.ticket-line').textContent = item.line;
    li.querySelector('.ticket-who').textContent = chefTitle(item.chef, state.lang);
    const time = li.querySelector('time');
    time.dateTime = item.at;
    time.textContent = ago(item.at, state.lang);
    time.title = clock(item.at, state.lang);
    const link = ticketLink(item, t);
    if (link) li.append(Object.assign(link, { className: 'ticket-link' }));
    return li;
  }));
  $('more').hidden = state.expanded || items.length <= PAGE;
  $('rail-empty').hidden = items.length > 0;
  $('rail-empty').textContent = state.chef ? t.chefEmpty : t.railEmpty;
  $('show-all').hidden = !state.chef;
  const detail = $('chef-detail');
  detail.hidden = !state.chef;
  if (state.chef) detail.textContent = `${chefTitle(state.chef, state.lang)} · ${stateWords(chefState(state.chef))}. ${CHEFS[state.chef].job[state.lang]}`;
}

function render() {
  renderText();
  renderChefs();
  renderNotice();
  renderRail();
}

async function load() {
  try {
    const response = await fetch(FEED_URL, { cache: 'no-cache', headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('feed ' + response.status);
    const feed = await response.json();
    if (feed?.version !== 1 || !Array.isArray(feed.items)) throw new Error('feed shape');
    const items = feed.items.filter(i => CHEFS[i.chef] && ticketLine(i, 'en'));
    state.feed = { ...feed, items, chefs: Array.isArray(feed.chefs) ? feed.chefs : [], sentBack: Array.isArray(feed.sentBack) ? feed.sentBack : [] };
    render();
    // Only a fresh snapshot is animated, and tickets count as seen only then, so a late snapshot's tickets still play later.
    if (!fresh(state.feed)) return;
    const arrivals = items.filter(i => !state.seen.has(keyOf(i)));
    items.forEach(i => state.seen.add(keyOf(i)));
    if (!state.replayed) { state.replayed = true; tickets.replay(items.slice(0, PAGE).reverse()); }
    else tickets.play(arrivals.reverse());
  } catch {
    // Keep what is on screen; the notice turns to "delayed" once the last snapshot is two hours old.
    if (!state.feed) { state.feed = { version: 1, generatedAt: null, items: [], chefs: [], sentBack: [] }; render(); }
  } finally {
    state.loaded = true;
  }
}

document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
  state.lang = button.dataset.lang;
  try { localStorage.setItem('kitchen-lang', state.lang); } catch { /* not saved; the choice still applies */ }
  render();
}));
scene.addEventListener('click', event => {
  const button = event.target.closest('.chef');
  if (!button) return;
  world.poke(button.dataset.chef);
  if (state.chef === button.dataset.chef) return;
  state.chef = button.dataset.chef;
  state.expanded = false;
  render();
});
$('show-all').addEventListener('click', () => { state.chef = null; render(); });
$('more').addEventListener('click', () => { state.expanded = true; renderRail(); });
$('replay').addEventListener('click', () => {
  $('replay').hidden = true;
  tickets.replay((state.feed?.items ?? []).slice(0, PAGE).reverse());
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.loaded) load(); });

render();
world = createWorld({ scene });
tickets = createTickets({ world, findTicket: key => $('rail').querySelector(`[data-key="${CSS.escape(key)}"]`),
  onReplayDone: () => { $('replay').hidden = reduced.matches; } });
renderChefs();
load();
setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
setInterval(() => { if (!document.hidden) { renderChefs(); renderNotice(); renderRail(); } }, 30_000);
