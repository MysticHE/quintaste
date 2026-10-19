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
          shotAt: { type: 'INTEGER', nullable: true, description: 'second in the video where a still frame shows this step most clearly (hands, ingredients or the result, not a face or a title card); null for text sources' },
        },
        required: ['title', 'instruction', 'ingredientNames', 'timerMinutes', 'at', 'shotAt'],
      },
    },
    coverAt: { type: 'INTEGER', nullable: true, description: 'second in the video showing the finished dish best; null for text sources' },
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

export const verifySystem = house + `
You are checking a draft recipe against the cooking video it was written from. Watch the whole video again, start to end, frame by frame where needed, and listen to every spoken instruction and on-screen text.
Return the complete corrected recipe in the same JSON schema:
- every ingredient that is added in the video, with the quantity shown or said (null when not given); remove ingredients that never appear;
- every action as its own step, in the order the video does them, with heat, time and doneness cues the video gives; nothing skipped, nothing invented;
- correct start times (at), best still-frame times (shotAt) and the finished-dish time (coverAt);
- list what you changed in notes.`;

export const verifyPrompt = draft => 'Draft recipe to check against the video:' + String.fromCharCode(10) + JSON.stringify(draft);

export const photoReviewSchema = {
  type: 'OBJECT',
  properties: {
    steps: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      step: { type: 'INTEGER', description: 'step number, starting at 1' },
      choice: { type: 'STRING', nullable: true, description: 'label of the photo that shows this step correctly, or null if none does' },
      betterAt: { type: 'INTEGER', nullable: true, description: 'when choice is null and a video is available: the second where this step is clearly visible' },
      note: { type: 'STRING' },
    }, required: ['step', 'choice', 'betterAt', 'note'] } },
    cover: { type: 'STRING', nullable: true, description: 'label of the photo that shows the finished dish best, or null' },
  },
  required: ['steps', 'cover'],
};

export const photoReviewSystem = `You check step photos for a cooking recipe app. Each photo is labelled. For every step, pick the one photo that a home cook would recognise as that exact step: the right ingredients, the right stage (raw, frying, simmering, plated), the action described. Reject photos that show only a face or a person talking, title cards, text overlays, transitions, black or blurry frames, or a different step. Never choose the same photo for two steps. If no photo fits a step, set choice to null and, when a video is available, give betterAt: a second inside that step where it is clearly visible. For the cover, choose the photo that best shows the finished dish. Return JSON only.`;
