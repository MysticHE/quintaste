import type { Vars } from "..";

/** Diet label names, their rules (shown beside the word everywhere, D23) and the explainer sheet. */
const en = {
  nameVegan: "Vegan",
  nameVegetarian: "Vegetarian",
  namePlantBased: "Plant-Based",
  ruleVegan: "no dairy, egg, honey",
  ruleVegetarian: "no five pungent",
  rulePlantBased: "meat-free",
  /** The other language's name, shown small on the sheet so both readers find their word. */
  altVegan: "纯素",
  altVegetarian: "素食 · 无五辛",
  altPlantBased: "蔬食",
  labelSpoken: (v: Vars) => String(v.name) + ", " + String(v.rule),
  explain: "What the labels mean",
  explainHint: "Opens what each label means",
  sheetTitle: "What the labels mean",
  sheetIntro: "Each label is a separate check. A label shows only when we can confirm it; no label means not confirmed, not that it is in the food.",
  sheetIntroDeclared: "On Market, labels come from what the seller declares about their own food. QuinTaste doesn't check sellers.",
  detailVegan: "No dairy, egg or honey. The five pungent may be used.",
  detailVegetarian: "None of the five pungent. Dairy, egg and honey may be used.",
  detailBoth: "Both labels: no dairy, egg, honey or five pungent.",
  detailPlantBased: "Meat-free. Neither check above is confirmed.",
  fivePungentTitle: "The five pungent",
  fivePungentList: "Garlic, onion, shallots, spring onion, leeks, chives and asafoetida.",
  notAllergy: "Labels are not allergy advice. Ask the stall if you are unsure.",
  pungentUnconfirmed: "Five pungent: not confirmed",
  askStallTitle: "Ask the stall",
  askStallQuestion: "请问这个有没有放葱、蒜、洋葱或韭菜？",
  askStallTranslation: "Does this have spring onion, garlic, onion or chives?",
  jainRoots: "Jain: root vegetables not checked",
} satisfies Record<string, string | ((vars: Vars) => string)>;
export default en;
