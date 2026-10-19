import { route } from '../../../../lib/route';
import { session, authorize } from '../../../../lib/session';
import { body, HttpError, json, offset, text, throttle, reasonText } from '../../../../lib/http';
import { query } from '../../../../lib/db';
import { overview } from '../../../../lib/overview';
import { accounts, accountAction, changeControl, staffList, changeStaff } from '../../../../lib/management';
import { caseList, caseDetails, createCase, updateCase } from '../../../../lib/cases';
import { gatewayStatus, checkGateway } from '../../../../lib/gateway';
import { providerKeyStatus, setProviderKey, removeProviderKey } from '../../../../lib/provider-keys';
import { sellerAction, sellerDetail, sellerList } from '../../../../lib/sellers';
import { setDailyCap } from '../../../../lib/ai-recipes';

type Context = { params: Promise<{ resource: string }> };
export const runtime = 'nodejs';
export function GET(request: Request, context: Context) { return route(async () => {
  const member = await session(request); const { resource } = await context.params;
  await throttle('read:' + member.id, 120);
  const params = new URL(request.url).searchParams;
  if (resource === 'overview') return json(await overview(member));
  if (resource === 'accounts') return json(await accounts(member, params.get('q') || ''));
  if (resource === 'cases') return json(params.has('id') ? await caseDetails(member, text(params.get('id'),'case id',36)) : await caseList(member, params.get('status') || '', offset(params.get('page'))));
  if (resource === 'sellers') return json(params.has('id') ? await sellerDetail(member, text(params.get('id'),'seller id',64)) : await sellerList(member, params.get('status') || ''));
  if (resource === 'integrations') return json({ ...await gatewayStatus(member), ...await providerKeyStatus(member) });
  if (resource === 'staff') return json(await staffList(member));
  if (resource === 'assignees') {
    authorize(member, 'operations');
    return json((await query("SELECT id,email FROM staff.member WHERE active AND role<>'auditor' ORDER BY email LIMIT 100")).rows);
  }
  if (resource === 'controls') { authorize(member, 'operations'); return json((await query("SELECT * FROM ops.control WHERE key NOT IN ('ai','identity') ORDER BY key")).rows); }
  if (resource === 'audit') {
    authorize(member, 'audit');
    const before = params.get('before') || '9223372036854775807';
    if (!/^\d{1,19}$/.test(before) || BigInt(before) > 9223372036854775807n) throw new HttpError(400, 'Invalid cursor.');
    const action = text(params.get('q') || '', 'audit search', 100, 0);
    return json((await query(`SELECT a.id,a.occurred_at,a.action,a.target,a.reason,a.details,m.email AS actor FROM staff.audit a
      LEFT JOIN staff.member m ON m.id=a.actor_id WHERE a.id<$1 AND strpos(a.action,$2)>0 ORDER BY a.id DESC LIMIT 100`, [before,action])).rows);
  }
  throw new HttpError(404, 'Not found.');
}); }
export function POST(request: Request, context: Context) { return route(async () => {
  const input = await body(request); const member = await session(request); const { resource } = await context.params;
  await throttle('write:' + member.id, 30);
  // Provider key changes are audited with a fixed reason (owner decision: no reason box on that panel); everything else needs one.
  const what = resource === 'integrations' && input.provider ? 'Gemini key ' + (input.action === 'remove' ? 'removed' : 'saved')
    : resource === 'controls' ? (input.enabled ? 'Turned on ' : 'Turned off ') + String(input.key ?? '')
    : resource === 'ai-limit' ? 'AI recipes daily limit ' + String(input.dailyCap ?? '')
    : resource + (typeof input.action === 'string' ? ' ' + input.action : '');
  const reason = reasonText(input.reason, what + ' (no reason given)');
  if (resource === 'accounts') return json(await accountAction(member,input,reason));
  if (resource === 'cases') return json(input.id ? await updateCase(member,input,reason) : await createCase(member,input,reason));
  if (resource === 'sellers') return json(await sellerAction(member,input,reason));
  if (resource === 'controls') return json(await changeControl(member,input,reason));
  if (resource === 'ai-limit') return json(await setDailyCap(member,input,reason));
  if (resource === 'staff') return json(await changeStaff(member,input,reason));
  if (resource === 'integrations') {
    if (input.provider) return json(input.action === 'remove' ? await removeProviderKey(member,input,reason) : await setProviderKey(member,input,reason));
    return json(await checkGateway(member,reason));
  }
  throw new HttpError(404, 'Not found.');
}); }
