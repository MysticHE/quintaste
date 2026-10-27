import { route } from '../../../../lib/route';
import { botCaller, parse, rawBody } from '../../../../lib/bot';
import { HttpError, json, throttle } from '../../../../lib/http';
import { attention } from '../../../../lib/attention';
import { chefAsks, chefDecide, chefLane, ownerAnswer } from '../../../../lib/chefs';

type Context = { params: Promise<{ resource: string }> };
export const runtime = 'nodejs';
/** Signed routes the QT bots call (docs/ADMIN_CHEFS_PLAN.md); no staff session or console origin applies here. */
export function GET(request: Request, context: Context) { return route(async () => {
  const { resource } = await context.params, caller = botCaller(request, resource);
  await throttle('bot:' + caller, 60);
  if (resource === 'attention') return json(await attention());
  if (resource === 'asks') return json({ asks: await chefAsks(new URL(request.url).searchParams.get('after')) });
  if (resource === 'lane') {
    const params = new URL(request.url).searchParams;
    return json(await chefLane(caller, params.get('lane'), params.get('after')));
  }
  throw new HttpError(404, 'Not found.');
}); }
export function POST(request: Request, context: Context) { return route(async () => {
  const { resource } = await context.params, body = await rawBody(request), caller = botCaller(request, resource, body);
  await throttle('bot-write:' + caller, 120);
  if (resource === 'decide') return json(await chefDecide(caller, parse(body)));
  if (resource === 'answer') return json(await ownerAnswer(parse(body)));
  throw new HttpError(404, 'Not found.');
}); }
