import type { Vars } from "..";
import type en from "../en/social-vocab";
import type { educationOptions, ethnicities, familyOptions, habitOptions, hereForOptions, hobbyOptions, languageOptions, petOptions, promptBank, religions,
  whyPlantBased, ageBands } from "../../config/social-profile";
import type { hostDeclarations, meetPractices, meetTimes, PayOption, premisesTypes } from "../../types/meet";
import { ingredientKeys, type MarketIngredient } from "../../config/market-ingredients";
import market from "./market";

type Of<T extends readonly unknown[]> = T[number] & string;
const pick = (map: Record<string, string>, v: Vars) => map[String(v.value)] ?? String(v.value);
const hereFor: Record<typeof hereForOptions[number]["id"], string> = { friends: "新朋友", makan: "找饭友", more: "随缘" };
const genders: Record<string, string> = { woman: "女", man: "男" };
const pay: Record<PayOption, string> = { own: "各付各的", split: "平分账单", organiser: "发起人请客" };
const religion: Record<Of<typeof religions>, string> = {
  Buddhist: "佛教", Taoist: "道教", Christian: "基督教", Catholic: "天主教", Muslim: "伊斯兰教", Hindu: "印度教", Sikh: "锡克教", Jain: "耆那教",
  "Free thinker": "无宗教信仰", Spiritual: "灵性信仰", Other: "其他", "Prefer not to say": "不便透露",
};
const ethnicity: Record<Of<typeof ethnicities>, string> = { Chinese: "华族", Malay: "马来族", Indian: "印度族", Eurasian: "欧亚裔", Other: "其他", "Prefer not to say": "不便透露" };
const why: Record<Of<typeof whyPlantBased>, string> = { Religion: "宗教", Ethics: "道德", Health: "健康", Environment: "环保", Family: "家庭", Taste: "口味" };
const hobby: Record<Of<typeof hobbyOptions>, string> = {
  Hiking: "徒步", Cycling: "骑脚车", Running: "跑步", Gym: "健身", Yoga: "瑜伽", Badminton: "羽毛球", Pickleball: "匹克球", Bouldering: "抱石", Swimming: "游泳",
  "Board games": "桌游", Gaming: "打游戏", "K-drama": "韩剧", Anime: "动漫", Movies: "电影", Reading: "阅读", Writing: "写作", Photography: "摄影", Drawing: "画画",
  Music: "音乐", "Live music": "现场音乐", Karaoke: "卡拉OK", Dancing: "跳舞", "Café hopping": "逛咖啡馆", Baking: "烘焙", Cooking: "下厨", Gardening: "园艺",
  Volunteering: "做义工", "Temple volunteering": "寺庙义工", Meditation: "冥想", Travel: "旅行", Museums: "逛博物馆", Thrifting: "逛二手店", Crafts: "手工",
  Pets: "宠物", "Language learning": "学语言", Tech: "科技", Investing: "投资", Fashion: "时尚", Camping: "露营", Fishing: "钓鱼",
};
const language: Record<Of<typeof languageOptions>, string> = {
  English: "英语", Mandarin: "华语", Malay: "马来语", Tamil: "淡米尔语", Hokkien: "福建话", Cantonese: "广东话", Teochew: "潮州话", Hakka: "客家话",
  Japanese: "日语", Korean: "韩语", Hindi: "印地语", Other: "其他",
};
const education: Record<Of<typeof educationOptions>, string> = { Secondary: "中学", Diploma: "文凭", Degree: "学士", Postgraduate: "研究生", "Prefer not to say": "不便透露" };
const habit: Record<Of<typeof habitOptions>, string> = { No: "不会", Sometimes: "偶尔", Yes: "会" };
const family: Record<Of<typeof familyOptions>, string> = { "Want kids": "想要孩子", "Don't want kids": "不想要孩子", Open: "都可以", "Have kids": "已有孩子" };
const pet: Record<Of<typeof petOptions>, string> = { Dog: "狗", Cat: "猫", Other: "其他", None: "没有" };
const prompt: Record<Of<typeof promptBank>, string> = {
  "My go-to hawker order": "我在小贩中心必点的", "A dish I'll cross the island for": "值得我跨岛去吃的一道菜", "I can teach you to cook": "我可以教你煮",
  "Teach me to cook": "教我煮", "My kopi order says": "我点的咖啡说明了", "The stall I would defend in an argument": "我会力挺到底的摊位",
  "Best thing I ate this month": "这个月吃过最好吃的", "My comfort food": "我的治愈系食物", "A perfect Saturday": "完美的星期六", "I am weirdly good at": "我意外擅长的事",
  "Green flag at the table": "饭桌上的加分表现", "Two truths and a lie": "两真一假", "The way to win me over": "跟我交朋友的捷径", "My most-cooked recipe": "我最常煮的食谱",
  "A food I changed my mind about": "我改观的一种食物", "My plant-based story": "我的蔬食故事", "Ask me about": "可以问我关于", "This year I want to": "今年我想",
  "Dessert or no dessert": "吃不吃甜点", "My simple pleasures": "我的小确幸",
};
const age: Record<Of<typeof ageBands>, string> = { "20s": "20多岁", "30s": "30多岁", "40s": "40多岁", "50+": "50岁以上" };
const time: Record<Of<typeof meetTimes>, string> = { "Weekday lunch": "工作日午餐", "Weekday dinner": "工作日晚餐", Weekends: "周末" };
const practice: Record<Of<typeof meetPractices>, string> = { "No egg": "不吃蛋", "Lunar 1st & 15th": "初一十五吃素" };
const premises: Record<Of<typeof premisesTypes>, string> = { "HDB flat": "组屋", "Private home": "私人住宅", "Commercial kitchen": "商业厨房" };
const declaration: Record<Of<typeof hostDeclarations>, string> = {
  "Only residents prepare the food": "只由住户准备食物", "No catering, buffets or packed meals for sale": "不提供到会、自助餐或出售盒饭",
  "No raw ready-to-eat seafood": "不供应生食海鲜", "Ingredients come from licensed sources": "食材来自持牌供应商", "No signage at the premises": "住所不挂招牌",
  "No alcohol is sold": "不售卖酒精饮料",
};
const halal: Record<string, string> = { "Not halal-certified": "无清真认证", "Halal-certified": "有清真认证" };
const lunar: Record<string, string> = { "Nine Emperor Gods": "九皇爷", "Lunar 1st": "初一", "Lunar 15th": "十五" };
const eventType: Record<string, string> = { Tables: "饭局", Gatherings: "聚会", "Local events": "本地活动", Classes: "烹饪课", "Home dining": "私房餐" };
const appKind: Record<string, string> = { "Cooking class": "烹饪课", "Home dining": "私房餐" };
const intro: Record<string, string> = {
  "Coffee and a light bite?": "喝杯咖啡，吃点小东西？", "Shall we try a new veggie place?": "要不要试一家新的素食店？",
  "First time here, a small group sounds nice.": "第一次来，几个人一起吃感觉不错。",
};
/** Ingredient names come from the Market table, so each is translated once. */
const ingredient = (v: Vars) => { const name = market[ingredientKeys[String(v.value) as MarketIngredient]]; return typeof name === "string" ? name : String(v.value); };
const starter: Record<string, string> = {
  "Any favourite places nearby?": "附近有什么喜欢的店吗？", "What day works for everyone?": "大家哪天方便？", "Any ingredients we should avoid?": "有什么食材要避开吗？",
  "Hawker centre or a cafe?": "小贩中心还是咖啡馆？",
};

/** 简体中文 messages; the type keeps every English key covered. */
const zh: typeof en = {
  optHereFor: v => pick(hereFor, v),
  optGender: v => pick(genders, v),
  optPay: v => pick(pay, v),
  optReligion: v => pick(religion, v),
  optEthnicity: v => pick(ethnicity, v),
  optWhy: v => pick(why, v),
  optHobby: v => pick(hobby, v),
  optLanguage: v => pick(language, v),
  optEducation: v => pick(education, v),
  optHabit: v => pick(habit, v),
  optFamily: v => pick(family, v),
  optPet: v => pick(pet, v),
  optPrompt: v => pick(prompt, v),
  optAge: v => pick(age, v),
  optTime: v => pick(time, v),
  optPractice: v => pick(practice, v),
  optPremises: v => pick(premises, v),
  optDeclaration: v => pick(declaration, v),
  optHalal: v => pick(halal, v),
  optLunar: v => pick(lunar, v),
  optEventType: v => pick(eventType, v),
  optAppKind: v => pick(appKind, v),
  optIntro: v => pick(intro, v),
  optStarter: v => pick(starter, v),
  optIngredient: ingredient,
  you: "你",
  listSep: "、",
  nameJoin: "、",
  alcoholFree: "无酒精",
  womenOnly: "仅限女性",
  menOnly: "仅限男性",
  forWoman: "留给女性",
  today: "今天",
  tomorrow: "明天",
  thisWeek: "本周",
  later: "之后",
  heldOf: v => String(v.held) + "/" + String(v.size),
  goingOf: v => String(v.going) + "/" + String(v.seats) + " 人参加",
  seatsTaken: v => "已占 " + String(v.held) + "/" + String(v.size) + " 个座位",
  tableOf: v => String(v.n) + " 人饭局",
  groupOf: v => String(v.n) + " 人一组",
  peopleCount: v => String(v.n) + " 人",
  hostedBy: v => "发起人：" + String(v.name),
  whoPays: "谁付钱",
  whoPaysGroup: "谁付钱",
  whoPaysA11y: v => "谁付钱，" + String(v.pay) + "。更改",
  startTable: "发起饭局",
  startTableHere: "在这里发起饭局",
  openChat: "打开聊天",
  inviteToTable: "邀请加入饭局",
  invite: "邀请",
  draft: "草稿",
  past: "已过",
  going: "参加",
  full: "已满",
  hosting: "发起中",
  cancelled: "已取消",
  invited: "已邀请",
  joined: "已加入",
  confirmed: "已确认",
  expired: "已过期",
  invitation: "邀请",
  inReview: "审核中",
  neighbourhood: "所在地区",
  areaPlaceholder: "武吉士",
  diet: "饮食",
  usuallyFree: "平时有空",
  usuallyFreeGroup: "平时有空",
  firstName: "名字",
  hereForTitle: "想认识",
  hereFor: "想认识",
  gender: "性别",
  religion: "宗教",
  languages: "语言",
  openToPlans: "开放约饭",
  openToPlansTitle: "开放约饭",
  finishProfile: "完善资料",
  paused: "已暂停",
  noDrinking: "晚上10点半至早上7点禁止在公共场所喝酒",
  dateTime: "日期和时间",
  food: "食物",
  saveDraft: "保存草稿",
  addToCalendar: "加入日历",
  countMeIn: "算我一个",
  home: "住家",
  work: "公司",
  yourHome: "你的住家",
  yourWork: "你的公司",
  notEnoughYet: "人数还不够",
  usualSpots: "常去的店",
  seeWhoEats: "看看附近谁在吃",
  choosePlace: "选择地点",
  chooseTime: "请选择时间。",
  dateFirst: "请先选择日期和时间。",
  fromQuinTaste: "来自 QuinTaste。",
  foodPlan: "我的吃饭安排",
  leave: "退出",
  loadingPlain: "正在加载",
  plan: "安排",
  goingTitle: "参加的人",
};
export default zh;
