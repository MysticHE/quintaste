import type { Dish } from "../types/food";

export const dishes: Dish[] = [
  {
    id: "miso-bowl", venueId: "green-table", name: "Miso mushroom bowl", photo: "bowl",
    description: "Golden mushrooms, tofu, avocado and crunchy cabbage over brown rice.",
    price: 14, ingredients: ["Brown rice", "Tofu", "Mushrooms", "Avocado", "Red cabbage", "Edamame", "Miso", "Soy sauce"],
    dietary: { diet: "Vegan", contains: ["Gluten", "Mushrooms"], ingredientsKnown: true,
      evidence: { kind: "menu", source: "Sample menu · preview", checkedAt: "2026-10-10" } },
    recipeId: "miso-bowl",
  },
  {
    id: "coconut-laksa", venueId: "little-laksa", name: "Coconut laksa", photo: "laksa",
    description: "A warming coconut broth with rice noodles, tofu puffs and fragrant herbs.",
    price: 9.5, ingredients: ["Rice noodles", "Coconut milk", "Tofu puffs", "Garlic", "Onion", "Laksa paste", "Bean sprouts"],
    dietary: { diet: "Unknown", contains: ["Garlic", "Onion"], ingredientsKnown: false,
      evidence: { kind: "community", source: "Sample stall note · preview", checkedAt: "2026-10-08" } },
    recipeId: "coconut-laksa",
  },
  {
    id: "sesame-greens", venueId: "sesame-kitchen", name: "Sesame greens & tofu", photo: "greens",
    description: "A leafy, nutty bowl with crisp tofu and brown rice. Ask about the dressing.",
    price: 12, ingredients: ["Tofu", "Brown rice", "Bok choy", "Broccoli", "Sesame dressing"],
    dietary: { diet: "Vegan", contains: [], ingredientsKnown: false,
      evidence: { kind: "menu", source: "Old sample menu · preview", checkedAt: "2026-05-01" } },
    recipeId: "sesame-greens",
  },
  {
    id: "egg-laksa", venueId: "little-laksa", name: "Egg noodle laksa", photo: "laksa",
    description: "An example of a vegetarian dish containing eggs, garlic and onion.",
    price: 8.5, ingredients: ["Egg noodles", "Eggs", "Garlic", "Onion", "Coconut milk", "Tofu"],
    dietary: { diet: "Vegetarian", contains: ["Eggs", "Garlic", "Onion", "Gluten"], ingredientsKnown: true,
      evidence: { kind: "menu", source: "Sample menu · preview", checkedAt: "2026-10-09" } },
  },
  {
    id: "seasonal-bowl", venueId: "green-table", name: "Seasonal green bowl", photo: "greens",
    description: "A changing special whose previous ingredient confirmation has been withdrawn.",
    price: null, ingredients: ["Seasonal vegetables", "Grains", "House sauce"],
    dietary: { diet: "Unknown", contains: [], ingredientsKnown: false,
      evidence: { kind: "menu", source: "Withdrawn sample menu · preview", checkedAt: "2026-09-02", withdrawn: true } },
  },
];
export function dishById(id: string) { return dishes.find(dish => dish.id === id); }
