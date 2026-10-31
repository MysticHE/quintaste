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
  jainRoots: "Jain: root vegetables not checked",
} satisfies Record<string, string | ((vars: Vars) => string)>;
export default en;
