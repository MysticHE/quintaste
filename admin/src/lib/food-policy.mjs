/** Shared fast food eligibility checks. AI handles uncertainty; these reject explicit ingredient evidence only. */
export const FOOD_POLICY_VERSION = '2026-11-04.2';
const animals = 'lard|gelatine?|bonito|anchov(?:y|ies)|ikan bilis|belacan|chicken|beef|fish|prawns?|shrimps?|pork|bacon|duck|goose|geese|turkey|mutton|lamb|venison|ham|crab|lobsters?|oysters?|squid|clams?|mussels?|seafood';
const meat = new RegExp('\\b(?:' + animals + ')\\b', 'i');
const alternatives = new RegExp('(?<!\\b(?:non[- ]|not ))\\b(?:vegetarian|vegan|veggie|mock|plant[- ]based|meatless|meat[- ]free|no|without|free from)(?:[-\\s]+(?:roast(?:ed)?|fried|smoked|grilled|shredded|sliced|braised|crispy)){0,2}[-\\s]+(?:' + animals + ')\\b', 'gi');
const englishExceptions = /\boyster mushrooms?\b|\b(?:(?:vegetarian|vegan) mushroom|mushroom[- ]based) oyster sauce\b|\bfish mint\b|\b(?:chicken|duck|goose|quail|turkey) eggs?\b|\b(?:agar[- ]agar|plant[- ]based|vegan|vegetarian) gelatine?\b/gi;
const localMeat = /\b(?:daging|ayam|babi|lembu|kambing|udang|sotong|ikan|kerang|kepah|tiram|terasi|cencaluk|bak kwa|bak kut teh|hae bee|hae bi|hae ko)\b/i;
const localAlternatives = /\b(?:vegetarian|vegan|mock|plant[- ]based|tanpa|tiada|bebas|bukan)[ -]+(?:daging|ayam|babi|lembu|kambing|udang|sotong|ikan|kerang|kepah|tiram|terasi|cencaluk|bak kwa|bak kut teh|hae bee|hae bi|hae ko)\b/gi;
const chineseAnimals='猪肉|豬肉|牛肉|羊肉|鸡肉|雞肉|鸭肉|鴨肉|鹅肉|鵝肉|鱼肉|魚肉|鱼露|魚露|蚝油|蠔油|猪油|豬油|虾米|蝦米|虾酱|蝦醬|鰹魚|鲣鱼|柴鱼|柴魚|肉松|肉鬆|鸡精|雞精|蚝汁|蠔汁|虾仁|蝦仁|鲜虾|鮮蝦|虾皮|蝦皮|鱿鱼|魷魚|章鱼|章魚|蟹肉|鲍鱼|鮑魚|海参|海參|鸡汤|雞湯|鸡腿|雞腿|鸡翅|雞翅|鸡胸|雞胸|骨汤|骨湯';
const chineseMeat = new RegExp(chineseAnimals);
const chineseAlternatives = new RegExp('(?:纯素|純素|植物性|植物|素食|素|无|無|不含)(?:'+chineseAnimals+')|(?:素鸡|素雞|素鸭|素鴨|素鹅|素鵝)|(?:杏鲍菇|杏鮑菇)','g');

export function containsMeat(value) {
  const source = String(value ?? '').normalize('NFKC');
  const clean = source.replace(englishExceptions, '').replace(alternatives, '').replace(localAlternatives, '').replace(chineseAlternatives, '');
  return meat.test(clean) || localMeat.test(clean) || chineseMeat.test(clean);
}

/** Each field is checked separately: a vegan claim in one field never clears meat in another. */
export function foodFindings(fields) {
  return Object.entries(fields).filter(([, value]) => typeof value === 'string' && containsMeat(value))
    .map(([field]) => ({ code: 'animal-ingredient', field, message: 'QuinTaste food posts must be meat-free. Check this field and any sauces or stock.' }));
}

export function recipeFoodFields(recipe) {
  return Object.fromEntries([
    ['title', recipe?.title ?? recipe?.name ?? ''], ['description', recipe?.description ?? recipe?.summary ?? ''],
    ...(Array.isArray(recipe?.ingredients) ? recipe.ingredients : []).map((i, n) => ['ingredients.' + n, typeof i === 'string' ? i : i?.name ?? '']),
    ...(Array.isArray(recipe?.steps) ? recipe.steps : []).flatMap((s, n) => [
      ['steps.' + n + '.title', s?.title ?? ''], ['steps.' + n + '.instruction', typeof s === 'string' ? s : s?.instruction ?? s?.text ?? ''],
    ]),
  ]);
}
