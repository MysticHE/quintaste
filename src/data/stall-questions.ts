import { alliums, animalExclusions, type Exclusion } from "../config/preferences";
import type { DietLabel } from "../config/diet-labels";
const translations: Record<Exclusion, string> = {
  Garlic: "蒜", Onion: "洋葱", Leeks: "韭葱", Chives: "韭菜", Scallions: "葱", Shallots: "红葱头", Asafoetida: "阿魏",
  Eggs: "鸡蛋", Dairy: "奶制品", Honey: "蜂蜜",
  Peanuts: "花生", "Tree nuts": "树坚果", Gluten: "含麸质的原料", Mushrooms: "蘑菇", "Root vegetables": "根茎类蔬菜（如姜、薯类、萝卜）",
};
/** Vegan avoids dairy, egg and honey; Vegetarian avoids the five pungent; both join the person's own exclusions. */
export function stallQuestions(diets: readonly DietLabel[], excluded: Exclusion[]) {
  const choices = [...new Set([...excluded, ...(diets.includes("Vegan") ? animalExclusions : []), ...(diets.includes("Vegetarian") ? alliums : [])])];
  const questions = [
    { en: "Does this dish contain meat, seafood, fish sauce or animal-based stock?", zh: "这道菜有肉、海鲜、鱼露或动物高汤吗？" },
    { en: "What ingredients are in the sauce, paste, oil and broth?", zh: "酱汁、酱料、油和汤底分别有什么原料？" },
  ];
  if (choices.length) questions.push({
    en: "I avoid " + choices.join(", ") + ". Are any used in this dish, including the sauce and stock?",
    zh: "我不吃" + choices.map(item => translations[item]).join("、") + "。这道菜（包括酱汁和汤底）有用到这些原料吗？",
  });
  if (choices.some(item => alliums.includes(item as typeof alliums[number]))) questions.push({
    en: "Can you make it without these alliums? Is the stock or seasoning already prepared with them?",
    zh: "可以不放这些葱蒜类原料吗？汤底或调味料是不是已经放了？",
  });
  questions.push({ en: "Is the food cooked with shared oil, utensils or equipment? If you are unsure, please tell me.", zh: "会共用油、餐具或烹饪设备吗？如果不确定，请告诉我。" });
  return questions;
}
