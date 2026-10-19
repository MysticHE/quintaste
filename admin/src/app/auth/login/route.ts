import { beginLogin, signInStep } from '../../../lib/oauth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return signInStep(() => beginLogin(request)); }
