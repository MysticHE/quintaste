import { route } from '../../../../lib/route';
import { body, HttpError, json } from '../../../../lib/http';
import { session, logout } from '../../../../lib/session';

type Context = { params: Promise<{ action: string }> };
export const runtime = 'nodejs';
export function GET(request: Request, context: Context) { return route(async () => {
  const { action } = await context.params;
  if (action !== 'session') throw new HttpError(404, 'Not found.');
  const member = await session(request);
  return json({ member: { id: member.id, email: member.email, role: member.role } });
}); }
export function POST(request: Request, context: Context) { return route(async () => {
  const { action } = await context.params;
  if (action !== 'logout') throw new HttpError(404, 'Not found.');
  await body(request, 1024);
  return new Response(null, { status: 204, headers: { 'Set-Cookie': await logout(request), 'Cache-Control': 'no-store' } });
}); }
