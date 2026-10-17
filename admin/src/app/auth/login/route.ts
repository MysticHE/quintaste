import { beginLogin } from '../../../lib/oauth';
import { route } from '../../../lib/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() { return route(beginLogin); }
