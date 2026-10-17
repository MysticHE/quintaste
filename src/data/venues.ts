import type { Venue } from "../types/food";

export const venues: Venue[] = [
  {
    id: "green-table", googlePlaceId: null, name: "Green Table", areaId: "tiong-bahru",
    description: "A little inspiration for your next plant-based lunch. A fictional venue in our preview collection.",
    photo: "bowl", cuisine: "Bowls", address: null, phone: null, hours: "Sample: daily 11am–9pm",
    schedule: { source: "sample", checkedAt: "2026-10-10", periods: [{ days: [0,1,2,3,4,5,6], opens: 660, closes: 1260 }] },
    dietary: { diet: "Vegan", contains: ["Gluten", "Mushrooms"], ingredientsKnown: true,
      evidence: { kind: "menu", source: "Sample menu · preview", checkedAt: "2026-10-10" } },
  },
  {
    id: "little-laksa", googlePlaceId: null, name: "Little Laksa", areaId: "tiong-bahru",
    description: "Comforting noodles and coconut broth, with the questions you would ask before ordering. Fictional preview venue.",
    photo: "laksa", cuisine: "Local", address: null, phone: null, hours: "Sample: daily 10:30am–8:30pm",
    schedule: { source: "sample", checkedAt: "2026-10-09", periods: [{ days: [0,1,2,3,4,5,6], opens: 630, closes: 1230 }] },
    dietary: { diet: "Vegetarian", contains: ["Garlic", "Onion", "Eggs"], ingredientsKnown: true,
      evidence: { kind: "menu", source: "Sample menu · preview", checkedAt: "2026-10-09" } },
  },
  {
    id: "sesame-kitchen", googlePlaceId: null, name: "Sesame Kitchen", areaId: "chinatown",
    description: "A seasonal greens bowl. Ingredient information is incomplete in this fictional preview.",
    photo: "greens", cuisine: "Asian", address: null, phone: null, hours: null,
    dietary: { diet: "Unknown", contains: [], ingredientsKnown: false,
      evidence: { kind: "community", source: "Sample community note · preview", checkedAt: "2026-05-01" } },
  },
];
export function venueById(id: string) { return venues.find(venue => venue.id === id); }
