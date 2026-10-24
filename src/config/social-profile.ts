// Social profile choices. Mirrors server/social/options.mjs; the server stores only these values.
export const genderOptions = [{ id: "woman", label: "Woman" }, { id: "man", label: "Man" }] as const;
export type Gender = "" | typeof genderOptions[number]["id"];
export const religions = ["Buddhist", "Taoist", "Christian", "Catholic", "Muslim", "Hindu", "Sikh", "Jain", "Free thinker", "Spiritual", "Other", "Prefer not to say"] as const;
/** The religions shown first; More reveals the rest. */
export const commonReligions = religions.slice(0, 7);
export const ethnicities = ["Chinese", "Malay", "Indian", "Eurasian", "Other", "Prefer not to say"] as const;
export const whyPlantBased = ["Religion", "Ethics", "Health", "Environment", "Family", "Taste"] as const;
export const hobbyOptions = ["Hiking", "Cycling", "Running", "Gym", "Yoga", "Badminton", "Pickleball", "Bouldering", "Swimming", "Board games", "Gaming", "K-drama",
  "Anime", "Movies", "Reading", "Writing", "Photography", "Drawing", "Music", "Live music", "Karaoke", "Dancing", "Café hopping", "Baking", "Cooking",
  "Gardening", "Volunteering", "Temple volunteering", "Meditation", "Travel", "Museums", "Thrifting", "Crafts", "Pets", "Language learning", "Tech",
  "Investing", "Fashion", "Camping", "Fishing"] as const;
export const languageOptions = ["English", "Mandarin", "Malay", "Tamil", "Hokkien", "Cantonese", "Teochew", "Hakka", "Japanese", "Korean", "Hindi", "Other"] as const;
export const educationOptions = ["Secondary", "Diploma", "Degree", "Postgraduate", "Prefer not to say"] as const;
export const habitOptions = ["No", "Sometimes", "Yes"] as const;
export const petOptions = ["Dog", "Cat", "Other", "None"] as const;
export const promptBank = ["My go-to hawker order", "A dish I'll cross the island for", "I can teach you to cook", "Teach me to cook", "My kopi order says",
  "The stall I would defend in an argument", "Best thing I ate this month", "My comfort food", "A perfect Saturday", "I am weirdly good at",
  "Green flag at the table", "Two truths and a lie", "The way to win me over", "My most-cooked recipe", "A food I changed my mind about",
  "My plant-based story", "Ask me about", "This year I want to", "Dessert or no dessert", "My simple pleasures"] as const;
/** Social is for members aged 21 to 45, so the bands cover just that range. */
export const ageBands = ["21-29", "30s", "40-45"] as const;
export type AgeBand = typeof ageBands[number];
/** Optional fields a member can hide (server/social/profile.mjs `hideable`); name, age, gender, area, photos and food always show. */
export const hideableFields = ["religion", "ethnicity", "why", "hobbies", "languages", "education", "work", "grewUp", "height", "drinking", "smoking", "pets", "spots"] as const;
export type HideableField = typeof hideableFields[number];
export const defaultHidden: HideableField[] = ["ethnicity"];
/** Distances People can be limited to, in kilometres between planning-area centres; 0 is anywhere. */
export const distanceOptions = [0, 3, 5, 10] as const;
export type Distance = typeof distanceOptions[number];
