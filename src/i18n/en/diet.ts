import type { Vars } from "..";

/** Diet label names and their rules (screens show the name; the rule is spoken by screen readers). */
const en = {
  nameVegan: "Vegan",
  nameVegetarian: "Vegetarian",
  namePlantBased: "Plant-Based",
  ruleVegan: "no dairy, egg, honey",
  ruleVegetarian: "no five pungent",
  rulePlantBased: "meat-free",
  labelSpoken: (v: Vars) => String(v.name) + ", " + String(v.rule),
  pungentUnconfirmed: "Five pungent: not confirmed",
  askStallTitle: "Ask the stall",
  askStallQuestion: "请问这个有没有放葱、蒜、洋葱或韭菜？",
  askStallTranslation: "Does this have spring onion, garlic, onion or chives?",
  jainRoots: "Jain: root vegetables not checked",
} satisfies Record<string, string | ((vars: Vars) => string)>;
export default en;
