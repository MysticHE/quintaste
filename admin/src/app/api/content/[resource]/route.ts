import { route } from '../../../../lib/route';
import { session } from '../../../../lib/session';
import { body, HttpError, json, text, throttle } from '../../../../lib/http';
import { menuAction, placeAction, placeDetail, placeList } from '../../../../lib/content-catalogue';
import { eventAction, eventDetail, eventList, recipeAction, recipeDetail, recipeList } from '../../../../lib/content-recipes';
import { gatheringList, marketItems, marketPhoto, marketReviews, memberAction, reviewList, reviewPhoto } from '../../../../lib/content-members';
import { contentPhoto, uploadPhoto } from '../../../../lib/content-assets';
import { memberRecipeAction, memberRecipeList, memberRecipePhoto } from '../../../../lib/content-member-recipes';

type Context = { params: Promise<{ resource: string }> };
export const runtime = 'nodejs';
const image = (bytes: Buffer | null) => {
  if (!bytes) throw new HttpError(404, 'Photo not found.');
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
};
export function GET(request: Request, context: Context) { return route(async () => {
  const member = await session(request), { resource } = await context.params, params = new URL(request.url).searchParams;
  await throttle('read:' + member.id, 240);
  const id = params.get('id'), status = params.get('status') || '', q = params.get('q') || '';
  if (resource === 'places') return json(id ? await placeDetail(member, id) : await placeList(member));
  if (resource === 'recipes') return json(id ? await recipeDetail(member, id) : await recipeList(member));
  if (resource === 'events') return json(id ? await eventDetail(member, id) : await eventList(member));
  if (resource === 'reviews') return json(await reviewList(member, status, q));
  if (resource === 'gatherings') return json(await gatheringList(member, status, q));
  if (resource === 'market') return json(await marketItems(member, status, q));
  if (resource === 'market-reviews') return json(await marketReviews(member, status));
  if (resource === 'member-recipes') return json(await memberRecipeList(member, status, q));
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
  const reason = text(input.reason, 'reason for this change', 1000, 10);
  if (resource === 'places') return json(await placeAction(member, input, reason));
  if (resource === 'menus') return json(await menuAction(member, input, reason));
  if (resource === 'recipes') return json(await recipeAction(member, input, reason));
  if (resource === 'events') return json(await eventAction(member, input, reason));
  if (resource === 'reviews') return json(await memberAction(member, 'review', input, reason));
  if (resource === 'gatherings') return json(await memberAction(member, 'gathering', input, reason));
  if (resource === 'market') return json(await memberAction(member, 'market-item', input, reason));
  if (resource === 'market-reviews') return json(await memberAction(member, 'market-review', input, reason));
  if (resource === 'member-recipes') return json(await memberRecipeAction(member, input, reason));
  throw new HttpError(404, 'Not found.');
}); }
