/** Prompts and JSON schemas for AI recipes. The model structures what it sees or finds; it never invents a tested recipe. */
export const categories = ['Breakfast', 'Noodles', 'Rice meals', 'With rice', 'Soups', 'Snacks & kueh', 'Desserts & drinks'];

export const recipeSchema = {
  type: 'OBJECT',
  properties: {
    isRecipe: { type: 'BOOLEAN', description: 'false when the content is not a cooking recipe' },
    title: { type: 'STRING' },
    description: { type: 'STRING', description: 'one or two sentences in your own words' },
    creator: { type: 'STRING', description: 'the name or handle of the person or channel who made the source; empty when unknown' },
    language: { type: 'STRING', description: 'language of the source, e.g. English, Chinese, Malay, Tamil' },
    servings: { type: 'INTEGER' },
    minutes: { type: 'INTEGER', description: 'total time from start to serving' },
    category: { type: 'STRING', enum: categories },
    diet: { type: 'STRING', enum: ['Vegan', 'Vegetarian', 'NotVegetarian'], description: 'NotVegetarian when any meat, poultry, seafood, fish sauce, lard or gelatine is used' },
    ingredients: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'plain ingredient name, e.g. "firm tofu", "light soy sauce"' },
          amount: { type: 'NUMBER', nullable: true, description: 'number only; null when added to taste or not stated' },
          unit: { type: 'STRING', description: 'metric where possible: g, ml, tbsp, tsp, cup, cloves, slices, pieces; empty when amount is null' },
        },
        required: ['name', 'amount', 'unit'],
      },
    },
    steps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING', description: '2 to 4 words' },
          instruction: { type: 'STRING', description: 'one action per step with heat, time and a doneness cue, in your own words' },
          ingredientNames: { type: 'ARRAY', items: { type: 'STRING' } },
          timerMinutes: { type: 'INTEGER', nullable: true, description: 'a timer the cook should set for this step, else null' },
          at: { type: 'INTEGER', nullable: true, description: 'second in the video where this step starts; null for text sources' },
        },
        required: ['title', 'instruction', 'ingredientNames', 'timerMinutes', 'at'],
      },
    },
    confidence: { type: 'NUMBER', description: '0 to 1: how completely the quantities and steps were shown or stated' },
    notes: { type: 'STRING', description: 'what was unclear or assumed; empty when nothing' },
  },
  required: ['isRecipe', 'title', 'description', 'creator', 'language', 'servings', 'minutes', 'category', 'diet', 'ingredients', 'steps', 'confidence', 'notes'],
};

const house = `You write recipes for QuinTaste, a Singapore vegetarian cooking app. Rules:
- Use only what the source shows or states. Do not add ingredients, quantities or times that are not there; use null amounts for "to taste" or unstated.
- Write every sentence in your own words. Never copy the creator's wording or captions.
- Metric units. Convert cups and spoons only when the source states them; keep "1 cup" as unit "cup".
- One action per step, with heat level, time and a visual or sensory doneness cue when the source gives one.
- Categories: Breakfast, Noodles, Rice meals (one-dish rice meals), With rice (dishes eaten with rice), Soups, Snacks & kueh, Desserts & drinks.
- Diet: Vegan when no egg, dairy or honey; Vegetarian when those appear; NotVegetarian when any meat, poultry, seafood, fish sauce, oyster sauce made from oysters, lard or gelatine appears.
- Return JSON matching the schema and nothing else.`;

export const videoSystem = house + `
You are given a cooking video. Watch the frames and listen to the speech and on-screen text. Record for each step the second in the video where it starts.`;

export const videoPrompt = 'Turn this video into a complete recipe. If it is not a cooking recipe, set isRecipe to false.';

export const searchSystem = `You research vegetarian recipes for a Singapore cooking app. Use Google Search to find 2 to 4 well-rated recipe pages that match the request, prefer Singapore, Malaysian, Chinese, Indian and South-East Asian home cooking, and read the actual ingredient lists and steps. Report what you found: for each page its URL, title, author, rating if shown, servings, total time, ingredients with quantities and the method in brief. Then propose one QuinTaste version that stays faithful to those pages (no invented quantities), explaining which page each part follows. Vegetarian only; if the request needs meat, say so.`;

export const structureSystem = house + `
You are given research notes about recipes found on the web plus a proposed version. Produce the final recipe JSON from the proposed version. Set creator to the author of the page the version mainly follows, and at to null for every step.`;

export const requestPrompt = text => `Recipe request from a member: "${text}". Find matching vegetarian recipes and propose the QuinTaste version.`;
