import { route } from '../../../../lib/route';
import { session } from '../../../../lib/session';
import { body, HttpError, json, offset, text, throttle, reasonText } from '../../../../lib/http';
import { menuAction, placeAction, placeDetail, placeList } from '../../../../lib/content-catalogue';
import { eventAction, eventDetail, eventList, recipeAction, recipeDetail, recipeList } from '../../../../lib/content-recipes';
import { gatheringList, marketItems, marketPhoto, marketReviews, memberAction, reviewList, reviewPhoto } from '../../../../lib/content-members';
import { contentPhoto, uploadPhoto } from '../../../../lib/content-assets';
import { memberRecipeAction, memberRecipeList, memberRecipePhoto } from '../../../../lib/content-member-recipes';
import { aiJobs, aiSummary } from '../../../../lib/ai-recipes';
import { demandAction, demandList } from '../../../../lib/recipe-demand';
import { ingredientAction, ingredientList } from '../../../../lib/content-ingredients';
import { creatorAction, creatorList } from '../../../../lib/creators';
import { gameLevelAction, gameLevelList, gameLevelMake, gameLevelRecipes, gamePicture, gamePictureAction, gamePictureList } from '../../../../lib/game-content';

type Context = { params: Promise<{ resource: string }> };
export const runtime = 'nodejs';
const image = (bytes: Buffer | null) => {
  if (!bytes) throw new HttpError(404, 'Photo not found.');
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
};
export function GET(request: Request, context: Context) { return route(async () => {
  const member = await session(request), { resource } = await context.params, params = new URL(request.url).searchParams;
  await throttle('read:' + member.id, 240);
  const id = params.get('id'), status = params.get('status') || '', q = params.get('q') || '', skip = offset(params.get('page'));
  if (resource === 'places') return json(id ? await placeDetail(member, id) : await placeList(member));
  if (resource === 'recipes') return json(id ? await recipeDetail(member, id) : await recipeList(member));
  if (resource === 'events') return json(id ? await eventDetail(member, id) : await eventList(member));
  if (resource === 'reviews') return json(await reviewList(member, status, q, skip));
  if (resource === 'gatherings') return json(await gatheringList(member, status, q, skip));
  if (resource === 'market') return json(await marketItems(member, status, q, skip));
  if (resource === 'market-reviews') return json(await marketReviews(member, status, skip));
  if (resource === 'member-recipes') return json(await memberRecipeList(member, status, q, skip, params.get('origin') || ''));
  if (resource === 'ai-jobs') return json(await aiJobs(member, status, q, skip));
  if (resource === 'ai-summary') return json(await aiSummary(member));
  if (resource === 'recipe-demand') return json(await demandList(member, status, q, skip));
  if (resource === 'ingredients') return json(await ingredientList(member, status, q, skip));
  if (resource === 'creators') return json(await creatorList(member, status, q, skip));
  if (resource === 'game-levels') return json(await gameLevelList(member, status, q, skip));
  if (resource === 'game-pictures') return json(await gamePictureList(member, status, skip));
  if (resource === 'game-level-jobs') return json(await gameLevelRecipes(member, q));
  if (resource === 'game-picture') {
    const bytes = await gamePicture(member, text(id, 'picture', 64, 64));
    if (!bytes) throw new HttpError(404, 'Picture not found.');
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  if (resource === 'review-photo') return image(await reviewPhoto(member, text(id, 'photo', 36)));
  if (resource === 'market-photo') return image(await marketPhoto(member, text(id, 'item', 36), text(params.get('slot'), 'photo', 10)));
  if (resource === 'photo') return image(await contentPhoto(member, text(id, 'photo', 64)));
  if (resource === 'member-recipe-photo') return image(await memberRecipePhoto(member, text(id, 'recipe', 36), text(params.get('version'), 'version', 10), text(params.get('slot'), 'photo', 10)));
  throw new HttpError(404, 'Not found.');
}); }
export function POST(request: Request, context: Context) { return route(async () => {
  const { resource } = await context.params;
  if (resource === 'upload') {
    const member = await session(request);
    await throttle('upload:' + member.id, 20);
    return json(await uploadPhoto(member, request));
  }
  const input = await body(request, 262144), member = await session(request);
  await throttle('write:' + member.id, 30);
  const reason = reasonText(input.reason, resource + (typeof input.action === 'string' ? ' ' + input.action : '') + ' (no reason given)');
  if (resource === 'places') return json(await placeAction(member, input, reason));
  if (resource === 'menus') return json(await menuAction(member, input, reason));
  if (resource === 'recipes') return json(await recipeAction(member, input, reason));
  if (resource === 'events') return json(await eventAction(member, input, reason));
  if (resource === 'reviews') return json(await memberAction(member, 'review', input, reason));
  if (resource === 'gatherings') return json(await memberAction(member, 'gathering', input, reason));
  if (resource === 'market') return json(await memberAction(member, 'market-item', input, reason));
  if (resource === 'market-reviews') return json(await memberAction(member, 'market-review', input, reason));
  if (resource === 'member-recipes') return json(await memberRecipeAction(member, input, reason));
  if (resource === 'recipe-demand') return json(await demandAction(member, input, reason));
  if (resource === 'ingredients') return json(await ingredientAction(member, input, reason));
  if (resource === 'creators') return json(await creatorAction(member, input, reason));
  if (resource === 'game-levels') return json(await gameLevelAction(member, input, reason));
  if (resource === 'game-pictures') return json(await gamePictureAction(member, input, reason));
  if (resource === 'game-level-jobs') return json(await gameLevelMake(member, input, reason));
  throw new HttpError(404, 'Not found.');
}); }
