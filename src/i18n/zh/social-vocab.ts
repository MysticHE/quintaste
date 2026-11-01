import type { Vars } from "..";
import type en from "../en/social-vocab";
import type { educationOptions, ethnicities, habitOptions, hobbyOptions, languageOptions, petOptions, religions, whyPlantBased, ageBands } from "../../config/social-profile";
import { ingredientKeys, type MarketIngredient } from "../../config/market-ingredients";
import market from "./market";

type Of<T extends readonly unknown[]> = T[number] & string;
const pick = (map: Record<string, string>, v: Vars) => map[String(v.value)] ?? String(v.value);
const genders: Record<string, string> = { woman: "女", man: "男" };
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
const pet: Record<Of<typeof petOptions>, string> = { Dog: "狗", Cat: "猫", Other: "其他", None: "没有" };
const age: Record<Of<typeof ageBands>, string> = { "21-29": "21 至 29 岁", "30s": "30 多岁", "40-45": "40 至 45 岁" };
/** Ingredient names come from the Market table, so each is translated once. */
const ingredient = (v: Vars) => { const name = market[ingredientKeys[String(v.value) as MarketIngredient]]; return typeof name === "string" ? name : String(v.value); };

/** 简体中文 messages; the type keeps every English key covered. */
const zh: typeof en = {
  optGender: v => pick(genders, v),
  optReligion: v => pick(religion, v),
  optEthnicity: v => pick(ethnicity, v),
  optWhy: v => pick(why, v),
  optHobby: v => pick(hobby, v),
  optLanguage: v => pick(language, v),
  optEducation: v => pick(education, v),
  optHabit: v => pick(habit, v),
  optPet: v => pick(pet, v),
  drinkPhrase: v => pick({ No: "不喝酒", Sometimes: "偶尔喝酒", Yes: "喝酒" }, v),
  smokePhrase: v => pick({ No: "不抽烟", Sometimes: "偶尔抽烟", Yes: "抽烟" }, v),
  petPhrase: v => pick({ Dog: "狗", Cat: "猫", Other: "其他宠物", None: "没有宠物" }, v),
  optAge: v => pick(age, v),
  optIngredient: ingredient,
  you: "你",
  listSep: "、",
  today: "今天",
  tomorrow: "明天",
  paySplit: "平分账单",
  payHost: "我请客",
  payOwn: "各付各的",
  payHostYou: "你请客",
  payHostThem: "{name}请客",
  verified: "已核实",
  nameAge: "{name}，{age}",
  sameArea: "同一地区",
  kmAway: "距离 {km} 公里",
  accept: "接受",
  decline: "婉拒",
  send: "发送",
  save: "保存",
  saved: "已保存",
  continue: "继续",
  done: "完成",
  cancel: "取消",
  yes: "想",
  no: "不想",
  change: "更改",
  other: "其他",
  past: "已结束",
  myProfile: "我的资料",
};
export default zh;
