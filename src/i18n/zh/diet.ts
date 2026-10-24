import type en from "../en/diet";

/** 简体中文 messages; the type keeps every English key covered. */
const zh: typeof en = {
  nameVegan: "纯素",
  nameVegetarian: "素食",
  namePlantBased: "蔬食",
  ruleVegan: "无蛋奶蜂蜜",
  ruleVegetarian: "无五辛",
  rulePlantBased: "无肉",
  altVegan: "Vegan",
  altVegetarian: "Vegetarian",
  altPlantBased: "Plant-Based",
  labelSpoken: v => String(v.name) + "，" + String(v.rule),
  explain: "标签说明",
  explainHint: "查看每个标签的意思",
  sheetTitle: "标签说明",
  sheetIntro: "每个标签是一项独立检查。只有确认后才会显示；没有标签表示尚未确认，不代表食物里含有。",
  sheetIntroDeclared: "市集上的标签来自卖家对自家食物的自述。QuinTaste 不审核卖家。",
  detailVegan: "不含奶、蛋、蜂蜜。可能用到五辛。",
  detailVegetarian: "不含五辛。可能用到奶、蛋、蜂蜜。",
  detailBoth: "两个标签都有：不含奶、蛋、蜂蜜和五辛（全素）。",
  detailPlantBased: "无肉。以上两项都尚未确认。",
  fivePungentTitle: "五辛",
  fivePungentList: "大蒜、洋葱、红葱头、青葱、韭葱、韭菜和阿魏。",
  notAllergy: "标签不是过敏建议。如有疑问，请向摊主确认。",
  pungentUnconfirmed: "五辛：尚未确认",
  askStallTitle: "问问摊主",
  askStallQuestion: "请问这个有没有放葱、蒜、洋葱或韭菜？",
  askStallTranslation: "Does this have spring onion, garlic, onion or chives?",
  jainRoots: "耆那教：根茎类蔬菜未确认",
};
export default zh;
