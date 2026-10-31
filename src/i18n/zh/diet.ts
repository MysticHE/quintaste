import type en from "../en/diet";

/** 简体中文 messages; the type keeps every English key covered. */
const zh: typeof en = {
  nameVegan: "纯素",
  nameVegetarian: "素食",
  namePlantBased: "蔬食",
  ruleVegan: "无蛋奶蜂蜜",
  ruleVegetarian: "无五辛",
  rulePlantBased: "无肉",
  labelSpoken: v => String(v.name) + "，" + String(v.rule),
  jainRoots: "耆那教：根茎类蔬菜未确认",
};
export default zh;
