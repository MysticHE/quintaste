/** Every word on the Mochi kitchen page, in English and Simplified Chinese. Feed tickets render from these fixed templates. */
/** Each chef's prop, shown beside them in the kitchen and on their tickets. */
export const PROPS = { head: 'serving-tray', scout: 'dish-laksa', wok: 'stove-wok', host: 'decor-lanterns', artist: 'decor-painting',
  writer: 'soup-pot', storyteller: 'decor-teaset', fixer: 'tool-spatula', safety: 'fridge' };
/**
 * The chefs (owner, 27 Oct 2026): each has a mochi-flavour name, matched to its hat badge, and a one-word "Chef" role. Ids stay
 * the bots' own (scout, wok and so on), since the feed uses them.
 */
export const CHEFS = {
  head: { name: { en: 'Kaya', zh: '咖椰' }, role: { en: 'Head Chef', zh: '主厨' },
    job: { en: 'Checks every plate against its source before it goes out.', zh: '出菜前，逐一对照来源检查。' } },
  scout: { name: { en: 'Pandan', zh: '班兰' }, role: { en: 'Explore Chef', zh: '探店厨师' },
    job: { en: 'Checks places, menus, prices and opening hours.', zh: '核对店家、菜单、价格和营业时间。' } },
  wok: { name: { en: 'Mango', zh: '芒果' }, role: { en: 'Recipe Chef', zh: '食谱厨师' },
    job: { en: 'Finds well-rated vegetarian recipes and writes them up.', zh: '寻找好评素食食谱并整理成文。' } },
  host: { name: { en: 'Lychee', zh: '荔枝' }, role: { en: 'Event Chef', zh: '活动厨师' },
    job: { en: 'Finds vegetarian events and classes in Singapore.', zh: '寻找新加坡的素食活动和课程。' } },
  artist: { name: { en: 'Taro', zh: '芋头' }, role: { en: 'Game Chef', zh: '游戏厨师' },
    job: { en: 'Paints the food and regulars in the Rush Hour game.', zh: '为 Rush Hour 游戏绘制食物和常客。' } },
  writer: { name: { en: 'Peach', zh: '蜜桃' }, role: { en: 'Request Chef', zh: '心愿厨师' },
    job: { en: 'Writes the recipes members ask for.', zh: '为会员撰写他们想要的食谱。' } },
  storyteller: { name: { en: 'Sesame', zh: '芝麻' }, role: { en: 'Story Chef', zh: '说书厨师' },
    job: { en: 'Picks stalls for 初一 and 十五 and drafts Mochi’s videos.', zh: '为初一、十五挑选摊位，撰写 Mochi 的视频。' } },
  fixer: { name: { en: 'Coco', zh: '椰椰' }, role: { en: 'Fix Chef', zh: '修理厨师' },
    job: { en: 'Turns members’ place reports into rechecks.', zh: '把会员对店家的反馈变成复查任务。' } },
  safety: { name: { en: 'Mint', zh: '薄荷' }, role: { en: 'Safety Chef', zh: '安全厨师' },
    job: { en: 'Reads SFA’s food recall notices.', zh: '阅读新加坡食品局的食品召回通告。' } },
};
/** "Pandan · Explore Chef": a chef's name with its role. */
export const chefTitle = (id, lang) => `${CHEFS[id].name[lang]} · ${CHEFS[id].role[lang]}`;

const FIELDS = {
  hours: { en: 'opening hours', zh: '营业时间' }, menu: { en: 'the menu', zh: '菜单' },
  address: { en: 'the address', zh: '地址' }, diet: { en: 'the diet label', zh: '饮食标签' },
};
const REASONS = {
  'price-not-on-menu': { en: 'price not on the menu', zh: '菜单上没有价格' },
  'hours-unclear': { en: 'hours unclear', zh: '营业时间不明' },
  'branch-unclear': { en: 'branch unclear', zh: '分店不明' },
  'diet-not-proven': { en: 'diet not proven', zh: '饮食标签无依据' },
  'photo-rights-unclear': { en: 'photo rights unclear', zh: '图片版权不明' },
  'date-not-confirmed': { en: 'date not confirmed', zh: '日期未确认' },
  other: { en: 'other', zh: '其他' },
};

const UI = {
  en: {
    title: 'The Mochi kitchen',
    lead: 'QuinTaste’s AI chefs keep Singapore’s vegetarian menus, recipes and events up to date. The owner has the last word.',
    open: 'Open QuinTaste', language: 'Language', rail: 'Tickets from the kitchen', allChefs: 'All chefs', showAll: 'Show all',
    showMore: 'Show more', railEmpty: 'No tickets yet. The chefs are getting ready.', chefEmpty: 'No tickets from this chef today.',
    sample: 'Sample tickets · not real activity', delayed: t => 'Kitchen update delayed · last update ' + t,
    opening: 'The kitchen opens soon', watchAgain: 'Watch again', openTicket: 'Open', sfaLink: 'Read on SFA',
    pass: (out, back) => out + ' out today · ' + back + ' sent back', sentBack: 'Sent back today', scene: 'The Mochi kitchen. Choose a chef to see their tickets.',
    working: 'Working', reviewing: 'Checking plates', resting: 'Resting', waiting: n => n + ' waiting for the owner', soon: 'Joining soon', unknown: 'Off duty',
    since: t => 'since ' + t, back: t => 'back at ' + t, online: 'On shift', offline: 'Off shift', onShift: 'On shift',
    howTitle: 'How this kitchen works',
    how: [
      ['Chefs find and check.', 'Menus, prices, hours, recipes and events, from each place’s own pages and listings.'],
      ['Kaya, the Head Chef, checks every plate.', 'Anything it can’t trace to a source goes back to the chef who made it.'],
      ['The owner has the last word.', 'Every update can be taken back with one tap, and reports about people go to our team, not a bot.'],
    ],
    footer: 'Times are Singapore time. QuinTaste doesn’t take payment or check sellers.',
    art: 'Art from QuinTaste’s Rush Hour game.',
  },
  zh: {
    title: 'Mochi 厨房',
    lead: 'QuinTaste 的 AI 小厨师，帮你把新加坡的素食菜单、食谱和活动保持最新。最后由店主把关。',
    open: '打开 QuinTaste', language: '语言', rail: '厨房出单', allChefs: '全部厨师', showAll: '显示全部',
    showMore: '显示更多', railEmpty: '还没有出单，小厨师们正在准备。', chefEmpty: '这位厨师今天还没有出单。',
    sample: '示例单据 · 非真实动态', delayed: t => '厨房更新延迟 · 上次更新 ' + t,
    opening: '厨房即将开张', watchAgain: '再看一次', openTicket: '打开', sfaLink: '在食品局网站阅读',
    pass: (out, back) => '今天出菜 ' + out + ' · 退回 ' + back, sentBack: '今天退回', scene: 'Mochi 厨房。选择一位厨师，查看他的单据。',
    working: '忙碌中', reviewing: '检查菜品', resting: '休息中', waiting: n => n + ' 项等店主确认', soon: '即将加入', unknown: '未上班',
    since: t => t + ' 开始', back: t => t + ' 回来', online: '值班中', offline: '下班', onShift: '值班中',
    howTitle: '这间厨房怎么运作',
    how: [
      ['小厨师查找并核对。', '菜单、价格、营业时间、食谱和活动，都以店家自己的页面和资料为准。'],
      ['主厨咖椰逐一检查。', '找不到来源的，一律退回给负责的小厨师。'],
      ['店主最后把关。', '每一项更新都能一键撤回；有关会员的举报由我们的团队处理，不交给机器人。'],
    ],
    footer: '时间为新加坡时间。QuinTaste 不经手付款，也不审核卖家。',
    art: '插画来自 QuinTaste 的 Rush Hour 游戏。',
  },
};

/** One ticket's sentence, or null for a type this page does not know (it is then left out). */
export function ticketLine(item, lang) {
  const zh = lang === 'zh', p = item.place, t = item.title, n = item.n;
  const day = item.date ? formatDay(item.date, lang) : '';
  switch (item.type) {
    case 'menu-prices': return zh ? `核对了 ${p} 的 ${n} 个菜价` : `Checked ${n} menu ${n === 1 ? 'price' : 'prices'} at ${p}`;
    case 'hours': return zh ? `核对了 ${p} 的营业时间` : `Checked opening hours at ${p}`;
    case 'new-place': return zh ? `把 ${p} 加入了探索` : `Added ${p} to Explore`;
    case 'cover': return zh ? `为 ${p} 添上了封面图` : `Added a cover picture for ${p}`;
    case 'recipe': return zh ? `新食谱：${t}` : `New recipe: ${t}`;
    case 'event': return zh ? `上架活动：${t}（${day}）` : `Listed ${t} on ${day}`;
    case 'closures': return zh ? `撤下了 ${n} 家已结业的店` : `Took ${n} closed ${n === 1 ? 'place' : 'places'} off Explore`;
    case 'event-removed': return zh ? `撤下了 ${n} 个已取消的活动` : `Removed ${n} cancelled ${n === 1 ? 'event' : 'events'}`;
    case 'art': return zh ? `画好了 ${n} 张游戏插画` : `Painted ${n} new game ${n === 1 ? 'picture' : 'pictures'}`;
    case 'member-recipes': return zh ? `为会员写了 ${n} 份食谱` : `Wrote ${n} ${n === 1 ? 'recipe' : 'recipes'} members asked for`;
    case 'fixed': return zh ? `根据会员反馈，修正了 ${p} 的${FIELDS[item.field]?.zh ?? ''}` : `Fixed ${FIELDS[item.field]?.en ?? ''} at ${p} after a member’s report`;
    case 'sfa-notice': return zh ? `阅读了食品局通告：${t}` : `Read SFA’s notice: ${t}`;
    case 'lunar-picks': return zh ? `为${day}挑选了 ${n} 家素食摊` : `Picked ${n} vegetarian ${n === 1 ? 'stall' : 'stalls'} for ${day}`;
    default: return null;
  }
}

const SGT = 'Asia/Singapore';
function formatDay(date, lang) {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-SG' : 'en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: SGT })
    .format(new Date(date + 'T12:00:00+08:00'));
}
export function clock(iso, lang) {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-SG' : 'en-SG', { hour: 'numeric', minute: '2-digit', timeZone: SGT }).format(new Date(iso));
}
export function ago(iso, lang, now = Date.now()) {
  const minutes = Math.round((Date.parse(iso) - now) / 6e4);
  const format = new Intl.RelativeTimeFormat(lang === 'zh' ? 'zh-SG' : 'en-SG', { numeric: 'auto', style: 'short' });
  if (Math.abs(minutes) < 60) return format.format(Math.min(0, minutes), 'minute');
  const hours = Math.round(minutes / 60);
  return Math.abs(hours) < 24 ? format.format(hours, 'hour') : format.format(Math.round(hours / 24), 'day');
}
export const reason = (key, lang) => (REASONS[key] ?? REASONS.other)[lang];
/** One ticket's identity across feed refreshes, so the page animates only tickets it has not shown before. */
export const ticketKey = item => [item.chef, item.type, item.at, item.place ?? item.title ?? item.n].join('|');
export const ui = lang => UI[lang];
