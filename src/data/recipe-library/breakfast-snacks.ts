import type { Recipe } from "../../types/food";
import { minutes, sampleMeta, vegan } from "./shared";

const meta = sampleMeta("2026-10-17");
export const breakfastSnacks: Recipe[] = [
  {
    ...meta, id: "kaya-toast", name: "Pandan kaya toast", photo: "kaya-toast", minutes: 25, servings: 2, cuisine: "Local",
    categories: ["Breakfast", "Snacks & kueh"],
    description: "Egg-free coconut-pandan kaya, cooked low and slow, sandwiched in crisp toast with cold butter.",
    dietary: vegan(["Gluten"]),
    ingredients: [
      { id: "coconut", name: "Coconut milk", amount: 200, unit: "ml" },
      { id: "sugar", name: "Brown sugar", amount: 60, unit: "g" },
      { id: "pandan", name: "Pandan, knotted", amount: 3, unit: "leaves" },
      { id: "salt", name: "Salt", amount: null, unit: "" },
      { id: "starch", name: "Cornflour", amount: 2, unit: "tbsp" },
      { id: "water", name: "Water", amount: 3, unit: "tbsp" },
      { id: "bread", name: "White bread", amount: 4, unit: "slices" },
      { id: "butter", name: "Plant-based butter, cold (check label)", amount: 20, unit: "g" },
    ],
    steps: [
      { title: "Infuse the coconut milk", instruction: "Warm coconut milk, sugar, pandan and a pinch of salt over low heat. Stir until the sugar dissolves and the milk smells of pandan. Do not let it boil.", ingredientIds: ["coconut", "sugar", "pandan", "salt"], timer: { label: "Kaya · infuse", seconds: minutes(5) } },
      { title: "Thicken the kaya", instruction: "Remove the pandan. Stir cornflour into the water, then whisk it into the pan. Keep stirring on low heat until the kaya coats the back of a spoon like thick custard.", ingredientIds: ["starch", "water"], timer: { label: "Kaya · stir & thicken", seconds: minutes(6) } },
      { title: "Cool the kaya", instruction: "Scrape the kaya into a clean jar. It sets further as it cools; chill until spreadable.", ingredientIds: [], timer: { label: "Kaya · cool", seconds: minutes(10) } },
      { title: "Toast and assemble", instruction: "Toast the bread until crisp and golden. Spread one slice thickly with kaya, add thin slices of cold butter, close and cut into fingers.", ingredientIds: ["bread", "butter"] },
    ],
  },
  {
    ...meta, id: "oat-porridge", name: "Ginger mushroom oat porridge", minutes: 15, servings: 2, cuisine: "Chinese", onePot: true,
    categories: ["Breakfast"],
    description: "A quick congee-style breakfast: oats simmered soft with ginger, shiitake and silken tofu.",
    dietary: vegan(["Gluten", "Mushrooms", "Root vegetables"]),
    ingredients: [
      { id: "oats", name: "Rolled oats", amount: 80, unit: "g" },
      { id: "water", name: "Water", amount: 600, unit: "ml" },
      { id: "ginger", name: "Ginger, finely shredded", amount: 1, unit: "tbsp" },
      { id: "shiitake", name: "Fresh shiitake, sliced", amount: 100, unit: "g" },
      { id: "tofu", name: "Silken tofu, cubed", amount: 150, unit: "g" },
      { id: "soy", name: "Light soy sauce", amount: 2, unit: "tsp" },
      { id: "pepper", name: "White pepper", amount: null, unit: "" },
      { id: "sesame", name: "Sesame oil", amount: 1, unit: "tsp" },
      { id: "coriander", name: "Coriander leaves", amount: null, unit: "" },
    ],
    steps: [
      { title: "Simmer the oats", instruction: "Bring the water to a boil with the ginger. Stir in the oats, lower to a simmer and stir often until soft and creamy.", ingredientIds: ["water", "ginger", "oats"], timer: { label: "Oats · stir", seconds: minutes(5) } },
      { title: "Add mushrooms and tofu", instruction: "Stir in the shiitake and simmer until tender. Slide in the tofu and fold gently so it keeps its shape. Add a splash of water if it gets too thick.", ingredientIds: ["shiitake", "tofu"], timer: { label: "Porridge · mushrooms", seconds: minutes(4) } },
      { title: "Season and serve", instruction: "Season with soy sauce and white pepper. Ladle into bowls, drizzle with sesame oil and top with coriander.", ingredientIds: ["soy", "pepper", "sesame", "coriander"] },
    ],
  },
  {
    ...meta, id: "popiah", name: "Fresh popiah rolls", minutes: 30, servings: 2, cuisine: "Peranakan",
    categories: ["Snacks & kueh"],
    description: "Soft wheat skins rolled around braised jicama and carrot, crunchy sprouts and peanuts.",
    dietary: vegan(["Gluten", "Peanuts", "Root vegetables"]),
    ingredients: [
      { id: "skins", name: "Popiah skins", amount: 6, unit: "" },
      { id: "jicama", name: "Jicama (bangkuang), shredded", amount: 300, unit: "g" },
      { id: "carrot", name: "Carrot, shredded", amount: 1, unit: "" },
      { id: "tofu", name: "Firm tofu, cut into strips", amount: 100, unit: "g" },
      { id: "soy", name: "Light soy sauce", amount: 1, unit: "tbsp" },
      { id: "water", name: "Water", amount: 100, unit: "ml" },
      { id: "oil", name: "Neutral oil", amount: 1, unit: "tbsp" },
      { id: "sprouts", name: "Bean sprouts", amount: 100, unit: "g" },
      { id: "lettuce", name: "Lettuce leaves", amount: 6, unit: "" },
      { id: "peanuts", name: "Roasted peanuts, crushed", amount: 40, unit: "g" },
      { id: "sweet-sauce", name: "Sweet sauce (tim cheong, check label)", amount: 2, unit: "tbsp" },
      { id: "chilli", name: "Chilli sauce", amount: null, unit: "" },
    ],
    steps: [
      { title: "Braise the filling", instruction: "Fry the tofu strips in oil over medium heat until lightly golden. Add jicama, carrot, soy sauce and water. Cover and simmer, stirring now and then, until soft and almost dry.", ingredientIds: ["oil", "tofu", "jicama", "carrot", "soy", "water"], timer: { label: "Popiah filling · stir", seconds: minutes(12) } },
      { title: "Blanch the sprouts", instruction: "Blanch the bean sprouts in boiling water, then drain well. Drain the filling in a sieve so the skins stay dry.", ingredientIds: ["sprouts"], timer: { label: "Sprouts · drain", seconds: 60 } },
      { title: "Fill and roll", instruction: "Lay a skin flat. Spread a little sweet sauce and chilli, add lettuce, a line of filling, sprouts and peanuts. Fold in the sides and roll up firmly.", ingredientIds: ["skins", "sweet-sauce", "chilli", "lettuce", "sprouts", "peanuts"] },
      { title: "Cut and serve", instruction: "Cut each roll in half with a sharp knife and serve straight away, before the skins soften.", ingredientIds: [] },
    ],
  },
];
