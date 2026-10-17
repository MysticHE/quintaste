import { completeGoogleCallback } from '../../../lib/oauth';
import { route } from '../../../lib/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return route(() => completeGoogleCallback(request)); }
