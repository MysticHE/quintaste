import { route } from '../../../../lib/route';
import { botCaller, parse, rawBody } from '../../../../lib/bot';
import { HttpError, json, throttle } from '../../../../lib/http';
import { attention } from '../../../../lib/attention';
import { chefAsks, chefDecide, chefLane, ownerAnswer } from '../../../../lib/chefs';
import { foodClaim,foodHeartbeat,foodPhoto,foodResult,foodEvidence } from '../../../../lib/food-review';
import { botBlocker, botDiagnosis, botRecovered } from '../../../../lib/bot-blockers';

type Context = { params: Promise<{ resource: string }> };
export const runtime = 'nodejs';
/** Signed routes the QT bots call (docs/ADMIN_CHEFS_PLAN.md); no staff session or console origin applies here. */
export function GET(request: Request, context: Context) { return route(async () => {
  const { resource } = await context.params, caller = botCaller(request, resource);
  await throttle('bot:' + caller+(resource==='food-photo'?':food-photos':''), resource==='food-photo'?240:60);
  if (resource === 'attention') return json(await attention(new URL(request.url).searchParams.get('blockedAfter')));
  if(resource==='food-photo'){
    const params=new URL(request.url).searchParams;
    const bytes=await foodPhoto(caller,params.get('id')??'',params.get('slot')??'',request.headers.get('X-QT-Lease')??'');
    if(!bytes)throw new HttpError(404,'Photo unavailable.');
    return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store'}});
  }
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
  if(resource==='blocked')return json(await botBlocker(caller,parse(body)));
  if(resource==='recovered')return json(await botRecovered(caller,parse(body)));
  if(resource==='diagnosis')return json(await botDiagnosis(caller,parse(body)));
  if(resource==='food-claim')return json(await foodClaim(caller));
  if(resource==='food-heartbeat')return json(await foodHeartbeat(caller,parse(body)));
  if(resource==='food-result')return json(await foodResult(caller,parse(body),chefDecide));
  if(resource==='food-evidence')return json(await foodEvidence(caller,parse(body)));
  if (resource === 'decide') return json(await chefDecide(caller, parse(body)));
  if (resource === 'answer') return json(await ownerAnswer(parse(body)));
  throw new HttpError(404, 'Not found.');
}); }
