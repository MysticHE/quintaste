import type { Recipe } from "../../types/food";
import { sampleMeta, vegan } from "./shared";

const meta = sampleMeta("2026-10-12");
const laksa: Recipe = {
  ...meta, id: "coconut-laksa", name: "Plant-based coconut laksa", photo: "laksa", minutes: 25, servings: 2, cuisine: "Local",
  categories: ["Noodles", "Soups"],
  description: "Comforting coconut noodles with a clearly listed homemade spice base.",
  dietary: vegan(["Garlic", "Onion", "Root vegetables"], "2026-10-12"),
  dishId: "coconut-laksa", adaptationId: "gentle-laksa",
  ingredients: [
    { id: "noodles", name: "Rice noodles, dry", amount: 150, unit: "g" },
    { id: "coconut", name: "Coconut milk", amount: 250, unit: "ml" },
    { id: "stock", name: "Vegetable stock (check label)", amount: 400, unit: "ml" },
    { id: "tofu", name: "Tofu puffs", amount: 120, unit: "g" },
    { id: "onion", name: "Onion, finely chopped", amount: 0.5, unit: "" },
    { id: "garlic", name: "Garlic, minced", amount: 2, unit: "cloves" },
    { id: "ginger", name: "Grated ginger", amount: 1, unit: "tbsp" },
    { id: "spice", name: "Ground turmeric & coriander", amount: 2, unit: "tsp" },
    { id: "sprouts", name: "Bean sprouts", amount: 100, unit: "g" },
    { id: "oil", name: "Neutral oil", amount: 1, unit: "tbsp" },
  ],
  steps: [
    { title: "Prepare the noodles", instruction: "Prepare noodles according to the packet. Drain and divide between bowls.", ingredientIds: ["noodles"] },
    { title: "Build the spice base", instruction: "Warm oil over medium heat. Soften onion, then add garlic, ginger and spices. Stir gently; reduce heat if the spices catch.", ingredientIds: ["oil", "onion", "garlic", "ginger", "spice"], timer: { label: "Spice base · stir", seconds: 240 } },
    { title: "Simmer the broth", instruction: "Add stock, coconut milk and tofu puffs. Bring to a gentle simmer until the tofu is hot throughout. Check every packaged ingredient for your exclusions.", ingredientIds: ["stock", "coconut", "tofu"], timer: { label: "Laksa broth · check", seconds: 600 } },
    { title: "Finish your bowls", instruction: "Blanch the bean sprouts in the hot broth. Ladle broth and tofu over noodles and serve.", ingredientIds: ["sprouts", "noodles"] },
  ],
};
export const classics: Recipe[] = [
  {
    ...meta, id: "miso-bowl", name: "Miso mushroom bowl", photo: "bowl", minutes: 30, servings: 2, cuisine: "Bowls", categories: ["Rice meals"],
    description: "A colourful bowl with savoury mushrooms and crisp toppings. No alliums in the listed recipe.",
    dietary: vegan(["Gluten", "Mushrooms"], "2026-10-12"),
    dishId: "miso-bowl",
    ingredients: [
      { id: "rice", name: "Brown rice, dry", amount: 150, unit: "g" },
      { id: "tofu", name: "Firm tofu", amount: 200, unit: "g" },
      { id: "mushrooms", name: "Sliced mushrooms", amount: 200, unit: "g" },
      { id: "avocado", name: "Avocado", amount: 1, unit: "" },
      { id: "cabbage", name: "Shredded red cabbage", amount: 80, unit: "g" },
      { id: "edamame", name: "Shelled edamame", amount: 80, unit: "g" },
      { id: "miso", name: "Miso paste", amount: 1, unit: "tbsp" },
      { id: "soy", name: "Soy sauce", amount: 1, unit: "tbsp" },
      { id: "water", name: "Water for rice (check pack)", amount: 350, unit: "ml" },
      { id: "oil", name: "Neutral oil", amount: 1, unit: "tbsp" },
    ],
    steps: [
      { title: "Start the rice", instruction: "Rinse the rice. Add water following your rice packet, bring to a boil, then cover and simmer. Packet timing takes precedence.", ingredientIds: ["rice", "water"], timer: { label: "Rice · check doneness", seconds: 1500 } },
      { title: "Prepare the toppings", instruction: "Drain and cube the tofu. Slice avocado and shred cabbage. Cook the edamame according to its packet and set the toppings aside.", ingredientIds: ["tofu", "avocado", "cabbage", "edamame"] },
      { title: "Sear mushrooms & tofu", instruction: "Heat the oil in a wide pan. Sear tofu, then add mushrooms. Cook until the mushrooms are golden. Use batches for larger servings.", ingredientIds: ["oil", "tofu", "mushrooms"], timer: { label: "Mushrooms · check pan", seconds: 480 } },
      { title: "Dress and build", instruction: "Loosen miso and soy sauce with a little warm water. Toss with the cooked mushrooms. Divide rice into bowls and add tofu and toppings.", ingredientIds: ["miso", "soy", "rice", "avocado", "cabbage", "edamame"] },
    ],
  },
  laksa,
  {
    ...meta, id: "sesame-greens", name: "Sesame greens & tofu", photo: "greens", minutes: 20, servings: 2, cuisine: "Asian", categories: ["Rice meals"],
    description: "Crisp tofu, plenty of greens and a simple sesame dressing. Start with cooked rice.",
    dietary: vegan(["Gluten"], "2026-10-12"),
    dishId: "sesame-greens",
    ingredients: [
      { id: "rice", name: "Cooked brown rice", amount: 300, unit: "g" },
      { id: "tofu", name: "Firm tofu", amount: 250, unit: "g" },
      { id: "greens", name: "Broccoli & bok choy", amount: 300, unit: "g" },
      { id: "soy", name: "Soy sauce", amount: 1, unit: "tbsp" },
      { id: "sesame", name: "Sesame oil", amount: 1, unit: "tsp" },
      { id: "seeds", name: "Sesame seeds", amount: 1, unit: "tbsp" },
      { id: "oil", name: "Neutral oil", amount: 1, unit: "tbsp" },
    ],
    steps: [
      { title: "Prepare your bowl", instruction: "Drain tofu and pat dry. Cut into cubes. Wash greens and cut into bite-sized pieces. Warm your cooked rice.", ingredientIds: ["rice", "tofu", "greens"] },
      { title: "Crisp the tofu", instruction: "Warm oil in a non-stick pan. Cook tofu, turning gently, until golden. For more servings use batches rather than crowding the pan.", ingredientIds: ["oil", "tofu"], timer: { label: "Tofu · turn & check", seconds: 480 } },
      { title: "Steam the greens", instruction: "Steam the greens until just tender. Check the thickest pieces before removing from heat.", ingredientIds: ["greens"], timer: { label: "Greens · check", seconds: 240 } },
      { title: "Dress and serve", instruction: "Mix soy sauce and sesame oil. Arrange rice, tofu and greens in bowls. Drizzle dressing and finish with sesame seeds.", ingredientIds: ["rice", "soy", "sesame", "seeds"] },
    ],
  },
  {
    ...laksa, id: "gentle-laksa", name: "Ginger coconut laksa", adaptationId: undefined, dishId: undefined,
    description: "A separate no-allium editorial variation with extra ginger and an allium-free stock.",
    adaptationNote: "Editorial sample variation: onion and garlic are omitted; ginger is increased. Use stock explicitly free of all seven alliums. This recipe cannot confirm a stall's dish.",
    dietary: vegan(["Root vegetables"], "2026-10-12"),
    ingredients: laksa.ingredients.filter(item => !["onion", "garlic"].includes(item.id))
      .map(item => item.id === "ginger" ? { ...item, amount: 2 } : item.id === "stock"
        ? { ...item, name: "Confirmed allium-free vegetable stock", labelChecked: true } : item),
    steps: laksa.steps.map((step, index) => index === 1 ? {
      ...step, title: "Warm the ginger & spices",
      instruction: "Warm oil over medium heat. Add ginger and spices, stir gently and cook briefly until fragrant. This version has no onion or garlic.",
      ingredientIds: ["oil", "ginger", "spice"], timer: { label: "Ginger spice base · stir", seconds: 120 },
    } : step),
  },
];
