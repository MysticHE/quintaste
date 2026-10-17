import { route } from '../../../../lib/route';
import { body, choice, HttpError, json } from '../../../../lib/http';
import { session, logout } from '../../../../lib/session';
import { options, register, authenticate, removeKey } from '../../../../lib/webauthn';
import { query } from '../../../../lib/db';

type Context = { params: Promise<{ action: string }> };
export const runtime = 'nodejs';
export function GET(request: Request, context: Context) { return route(async () => {
  const { action } = await context.params;
  if (action !== 'session') throw new HttpError(404, 'Not found.');
  const member = await session(request, false);
  const keys = (await query('SELECT id,name,created_at,last_used_at FROM staff.credential WHERE member_id=$1 ORDER BY created_at', [member.id])).rows;
  return json({ member: { id: member.id, email: member.email, role: member.role, verified: !!member.verified_at }, keys });
}); }
export function POST(request: Request, context: Context) { return route(async () => {
  const { action } = await context.params;
  const input = await body(request, 32768);
  if (action === 'logout') return new Response(null, { status: 204, headers: { 'Set-Cookie': await logout(request), 'Cache-Control': 'no-store' } });
  const member = await session(request, false);
  if (action === 'options') return json(await options(member, choice(input.intent, ['register','authenticate'] as const, 'intent')));
  if (action === 'register') return json(await register(member, input.response, input.name));
  if (action === 'remove-key') return json(await removeKey(member, input.id, input.reason));
  if (action === 'verify') return new Response(JSON.stringify({ verified: true }), { headers: {
    'Set-Cookie': await authenticate(member, input.response), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  throw new HttpError(404, 'Not found.');
}); }
