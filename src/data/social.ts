import type { SocialTemplate } from "../types/social";
export const socialPeople = [
  { id: "wei", name: "Wei", diet: "Vegan", language: "English · Mandarin", interests: "Noodles · Weekend walks" },
  { id: "ana", name: "Ana", diet: "Vegetarian", language: "English · Malay", interests: "Baking · Coffee" },
  { id: "raj", name: "Raj", diet: "Vegan", language: "English · Tamil", interests: "Curries · Food photography" },
  { id: "mei", name: "Mei", diet: "Vegan", language: "English · Mandarin", interests: "Tea · Plant-based cooking" },
  { id: "sara", name: "Sara", diet: "Vegetarian", language: "English · Malay", interests: "Gardening · Brunch" },
  { id: "lin", name: "Lin", diet: "Vegan", language: "English · Mandarin", interests: "Soups · Books" },
];
export const socialPerson = (id: string) => socialPeople.find(person => person.id === id);
export const socialTemplates: SocialTemplate[] = [
  { id: "sample-kaki", title: "A bowl, a new friend", kind: "Kaki", area: "Bugis", photo: "bowl", diet: "Vegan", ageBand: "25–34", language: "English",
    guests: ["wei", "ana", "raj", "mei"], capacity: 6, foodCents: 2400, ticketCents: 0, host: "QuinTaste sample host", venue: "Sample partner dining room · Bugis",
    menu: [{ name: "Mushroom rice bowl", ingredients: "Rice, shiitake mushrooms, tofu, soy sauce, sesame, broccoli.", contains: ["Mushrooms", "Soy", "Gluten", "Sesame"], mayContain: ["Peanuts"] },
      { name: "Ginger greens", ingredients: "Bok choy, ginger, vegetable oil, salt.", contains: [], mayContain: ["Soy"] }] },
  { id: "sample-women", title: "A little lunch together", kind: "Women", area: "Tiong Bahru", photo: "greens", diet: "Vegetarian", ageBand: "All adults", language: "English",
    guests: ["ana", "mei", "sara", "lin"], capacity: 6, foodCents: 2200, ticketCents: 0, host: "QuinTaste sample host", venue: "Sample partner cafe · Tiong Bahru",
    menu: [{ name: "Roasted vegetable plate", ingredients: "Sweet potato, spinach, tomato, chickpeas, yoghurt, lemon, olive oil.", contains: ["Dairy"], mayContain: ["Sesame", "Tree nuts"] },
      { name: "Fruit bowl", ingredients: "Pineapple, melon, grapes.", contains: [], mayContain: [] }] },
  { id: "sample-hosted", title: "Plant-based supper club", kind: "Hosted", area: "Tanjong Pagar", photo: "laksa", diet: "Vegan", ageBand: "All adults", language: "English",
    guests: ["wei", "ana", "raj", "mei", "lin"], capacity: 8, foodCents: 0, ticketCents: 3200, host: "Sample community kitchen", venue: "Sample partner studio · Tanjong Pagar",
    menu: [{ name: "Coconut noodle soup", ingredients: "Rice noodles, coconut milk, tofu, lemongrass, ginger, chilli, lime, coriander.", contains: ["Soy"], mayContain: ["Peanuts", "Sesame"] },
      { name: "Mango sticky rice", ingredients: "Mango, glutinous rice, coconut milk, sugar, salt.", contains: [], mayContain: ["Tree nuts"] }] },
];
