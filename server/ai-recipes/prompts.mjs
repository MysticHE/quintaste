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
          amount: { type: 'NUMBER', nullable: true, description: 'number only; the stated amount, or a suggested one when the source gives none; null only for seasoning or garnish added to taste' },
          unit: { type: 'STRING', description: 'metric where possible: g, ml, tbsp, tsp, cup, cloves, slices, pieces; empty when amount is null' },
          suggested: { type: 'BOOLEAN', description: 'true when the source gives no amount and amount is your suggestion for these servings' },
        },
        required: ['name', 'amount', 'unit', 'suggested'],
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
          at: { type: 'INTEGER', nullable: true, description: 'whole seconds from the start of the video where this step starts (1:04 is 64, never 104); null for text sources' },
          shotAt: { type: 'INTEGER', nullable: true, description: 'whole seconds from the start where a still frame shows this step most clearly (hands, ingredients or the result, not a face or a title card; 1:04 is 64); null for text sources' },
        },
        required: ['title', 'instruction', 'ingredientNames', 'timerMinutes', 'at', 'shotAt'],
      },
    },
    coverAt: { type: 'INTEGER', nullable: true, description: 'whole seconds from the start showing the finished dish best (1:04 is 64); null for text sources' },
    confidence: { type: 'NUMBER', description: '0 to 1: how completely the quantities and steps were shown or stated' },
    notes: { type: 'STRING', description: 'what was unclear or assumed; empty when nothing' },
  },
  required: ['isRecipe', 'title', 'description', 'creator', 'language', 'servings', 'minutes', 'category', 'diet', 'ingredients', 'steps', 'confidence', 'notes'],
};

const house = `You write recipes for QuinTaste, a Singapore vegetarian cooking app. Rules:
- Use only the ingredients, steps and times the source shows or states; never add an ingredient that is not there.
- Every ingredient needs an amount a home cook can follow. Use the amount the source states or shows (read measuring spoons, cups, packets and scale readings in the video). When it gives none, suggest a typical amount for the servings, consistent with what the video shows (a generous pour, a pinch, a whole packet), and set suggested true. Keep amount null only for salt, pepper or garnish that is clearly added to taste at the end.
- Write every sentence in your own words. Never copy the creator's wording or captions.
- Metric units. Convert cups and spoons only when the source states them; keep "1 cup" as unit "cup".
- One action per step, with heat level, time and a visual or sensory doneness cue when the source gives one.
- Categories: Breakfast, Noodles, Rice meals (one-dish rice meals), With rice (dishes eaten with rice), Soups, Snacks & kueh, Desserts & drinks.
- Diet: Vegan when no egg, dairy or honey; Vegetarian when those appear; NotVegetarian when any meat, poultry, seafood, fish sauce, oyster sauce made from oysters, lard or gelatine appears.
- Return JSON matching the schema and nothing else.`;

export const videoSystem = house + `
You are given a cooking video. Watch the frames and listen to the speech and on-screen text, and read the creator's caption when given. Record for each step the second in the video where it starts.
Every action a cook must do is a step, including preparation the video skips but the caption or speech states (soaking, deseeding, boiling, slicing, dissolving, straining). Never put a needed action only in notes. A step the video does not show gets at and shotAt null.`;

export const videoPrompt = 'Turn this video into a complete recipe. If it is not a cooking recipe, set isRecipe to false.';

export const searchSystem = `You research vegetarian recipes for a Singapore cooking app. Use Google Search to find 2 to 4 well-rated recipe pages that match the request, prefer Singapore, Malaysian, Chinese, Indian and South-East Asian home cooking, and read the actual ingredient lists and steps. Report what you found: for each page its URL, title, author, rating if shown, servings, total time, ingredients with quantities and the method in brief. Then propose one QuinTaste version that stays faithful to those pages (no invented quantities), explaining which page each part follows. Vegetarian only: when the dish is usually made with meat or seafood, find vegetarian versions of it (tofu, mushrooms, mock meat, jackfruit) and propose the meat-free home version under a name people recognise, such as "Vegetarian chicken rice".`;

export const structureSystem = house + `
You are given research notes about recipes found on the web plus a proposed version. Produce the final recipe JSON from the proposed version. Set creator to the author of the page the version mainly follows, and at to null for every step.`;

export const requestPrompt = text => `Recipe request from a member: "${text}". Find matching vegetarian recipes and propose the QuinTaste version.`;
/** A dish several members searched Cook for and could not find (server/cook-search/demand.mjs). */
export const demandPrompt = text => `Several members searched a Singapore vegetarian cooking app for "${text}" and found no recipe. Find matching vegetarian recipes, or vegetarian versions if the dish usually has meat or seafood, and propose the QuinTaste home version.`;

export const verifySystem = house + `
You are checking a draft recipe against the cooking video it was written from. Watch the whole video again, start to end, frame by frame where needed, and listen to every spoken instruction and on-screen text.
Return the complete corrected recipe in the same JSON schema:
- every ingredient that is added in the video, with the quantity shown or said; remove ingredients that never appear;
- for each amount the video does not give, a realistic suggested amount for the servings that matches what the video shows (how much oil goes in, how many chillies), with suggested true; stated amounts keep suggested false;
- every action as its own step, in the order the video does them, with heat, time and doneness cues the video gives; nothing skipped, nothing invented;
- preparation stated in the caption or speech but not shown (soaking, deseeding, boiling, slicing, dissolving) as steps of their own before the step that uses it, with at and shotAt null; notes never hold a needed action;
- correct start times (at), best still-frame times (shotAt) and the finished-dish time (coverAt);
- when the creator's caption is given, go through it sentence by sentence: every instruction in it (soaking, boiling, resting, seasoning, storing) must appear in a step, and every amount in it must be used;
- list what you changed in notes.`;

export const verifyPrompt = draft => 'Draft recipe to check against the video:' + String.fromCharCode(10) + JSON.stringify(draft);

export const photoReviewSchema = {
  type: 'OBJECT',
  properties: {
    steps: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      step: { type: 'INTEGER', description: 'step number, starting at 1' },
      choice: { type: 'STRING', nullable: true, description: 'label of the photo that shows this step correctly, or null if none does' },
      betterAt: { type: 'INTEGER', nullable: true, description: 'when choice is null and a video is available: whole seconds from the start where this step is clearly visible' },
      note: { type: 'STRING' },
    }, required: ['step', 'choice', 'betterAt', 'note'] } },
    cover: { type: 'STRING', nullable: true, description: 'label of the photo that shows the finished dish best, or null' },
  },
  required: ['steps', 'cover'],
};

export const photoReviewSystem = `You check step photos for a cooking recipe app. Each photo is labelled. For every step, pick the one photo that a home cook would recognise as that exact step: the right ingredients, the right stage (raw, frying, simmering, plated), the action described. Reject photos that show only a face or a person talking, title cards or frames mostly covered by text, transitions, black or blurry frames, or a different step (short subtitles from the creator are fine). Use the whole method to know what should be in the pan at that stage: reject a photo that shows an ingredient the method adds later or cooks or serves separately, a wrong cooking state, or readable labels on packaging in a drawn photo. When you reject, say in note exactly what is wrong. Never choose the same photo for two steps. If no photo fits a step, set choice to null and, when a video is available, give betterAt: a second inside that step where it is clearly visible. For the cover, choose the photo that best shows the finished dish. Answer choice and cover with the bare label only, for example S3-B. Return JSON only.`;
