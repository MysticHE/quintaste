/** One recipe-writing contract for both engines and the food snapshot. These are evidence gaps, not meat findings. */
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
export const RECIPE_CLARITY_PROMPT = `Food clarity before you return the recipe:
- Name the exact food used: vegetable or shiitake stock, not stock; name a sauce, curry paste or spice blend and its known composition.
- Expand a homemade blend into its listed ingredients and preparation steps. Standard named soy sauce, tamari and miso do not need an invented manufacturing formula.
- Name plant milk by its source (soy, oat, almond), and mock meat by its supported base (tofu, soy, wheat or mushrooms). Qualify plant alternatives explicitly.
- Every ingredient added in any step, including frying fat, stock, sauces, garnishes and optional additions, must be in the ingredient list and that step's ingredientNames.
- Do not invent ingredients, brands, label checks, compound composition or dietary confirmation to pass review. Preserve an unresolved source detail in notes.
- In generated adaptations, you may deliberately choose a simple named vegetarian replacement and explain the change. Video transcription must stay faithful to what the source actually shows.
- Vegan excludes eggs, dairy and honey. The legacy recipe diet value Vegetarian only distinguishes animal-free cooking from Vegan; it does not certify five-pungent-free cooking.
- Follow the requested Food Choices separately. For five-pungent-free cooking, avoid hidden alliums in stocks/pastes; use explicitly supported alternatives or a simple preparation from listed ingredients.
- Do not claim allergen-free, medically safe, disease-curing or independently tested food without supporting evidence. A suggested amount or adaptation must be labelled honestly.`;

const norm=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const vague=/^(?:(?:soup )?(?:stock|broth|sauce|seasonings?|bouillon|soup base)(?: (?:powder|cubes?))?|curry paste|spice mix|mixed spices|plant(?:-based)? milk|plant milk|non-dairy milk|mock (?:meat|chicken|beef|pork|fish)|meat substitute|汤底|湯底|高汤|高湯|酱汁|醬汁|调味料|調味料|咖喱酱|咖喱醬|香料混合物|素肉|植物奶|kaldu|stok|sos|perencah|pes kari|susu tumbuhan)$/iu;
export const CLARITY_PREFIX='Ingredient clarity: ';
export const recipeClarityStamp=recipe=>createHash('sha256').update(JSON.stringify({ingredients:recipe.ingredients,steps:recipe.steps})).digest('hex');
// The task table allows 8 KB of jsonb text; pretty JSON is a conservative bound including PostgreSQL's separators.
export const boundedRepairPayload=payload=>Buffer.byteLength(JSON.stringify(payload,null,1))<=7800?payload:null;

export function recipeClarity(recipe){
  const items=Array.isArray(recipe?.ingredients)?recipe.ingredients:[],steps=Array.isArray(recipe?.steps)?recipe.steps:[];
  const names=new Set(items.map(item=>norm(item.name))),findings=[];
  for(const item of items){
    if(vague.test(norm(item.name)))findings.push(`Specify the type or supported composition of "${String(item.name).slice(0,120)}".`);
  }
  steps.forEach((step,index)=>{
    for(const name of Array.isArray(step.ingredientNames)?step.ingredientNames:[]){
      if(!names.has(norm(name)))findings.push(`Step ${index+1} uses "${String(name).slice(0,120)}", which is absent from the ingredient list.`);
    }
  });
  return [...new Set(findings)].slice(0,12);
}

export function recipeClarityNotes(recipe){
  const stored=recipe?.clarity?.stamp===recipeClarityStamp(recipe)&&Array.isArray(recipe.clarity.notes)?recipe.clarity.notes:[];
  return [...new Set([...recipeClarity(recipe).map(note=>CLARITY_PREFIX+note),...stored])].slice(0,12);
}
