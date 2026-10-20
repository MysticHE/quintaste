"""Owner-only Telegram reporting. Read-only reports and explicit owner-confirmed editorial removals.

Run with the isolated telegram-runtime Python. The Hermes no-agent scheduler
calls tick once per minute. Credentials and pairing stay outside source control.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

ROOT = Path(os.environ.get('QT_TEAM_ROOT', '/opt/data/qt-team'))
STATE = ROOT / 'state/telegram'
ORIGIN = 'https://quintaste.srv1902914.hstgr.cloud'
SG = ZoneInfo('Asia/Singapore')
COMMANDS = ('status', 'latest', 'coverage', 'holds', 'learning', 'manage', 'help')


def read(path, default=None):
    return json.loads(path.read_text()) if path.is_file() else default


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    tmp = path.with_suffix('.tmp')
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as stream:
        json.dump(data, stream, ensure_ascii=False)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(tmp, path)


def stamp():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def singapore_time(value=None):
    value = dt.datetime.fromisoformat(value.replace('Z', '+00:00')) if value else dt.datetime.now(SG)
    value = value.astimezone(SG)
    return f"{value.day} {value.strftime('%b')}, {value.strftime('%I:%M').lstrip('0')} {value.strftime('%p').lower()} SGT"


def next_research():
    now = dt.datetime.now(SG)
    evening = '6–10 pm SGT (active now)' if 18 <= now.hour < 22 else '6–10 pm SGT'
    return 'Explorer runs around the clock; Cooker and Event ' + evening


def photo_caption(caption):
    lines = caption.splitlines()
    if len(lines) > 1 and lines[1].startswith('Captured '):
        lines[1] = singapore_time(lines[1].removeprefix('Captured '))
    if lines:
        lines[0] = lines[0].replace('Live app screenshot —', 'Live app —')
    return '\n'.join(lines)


def publication_text(publication):
    if publication.get('status') != 'published':
        return 'No verified publication yet.'
    baseline = read(ROOT / 'baseline.json', {})
    names = {v['venueId']: v['name'] for v in baseline.get('venues', [])}
    records = publication.get('records', [])
    venues = [names.get(r[6:], r[6:].replace('-', ' ').title()) for r in records if r.startswith('venue:')]
    recipes = [r[7:].replace('-', ' ').title() for r in records if r.startswith('recipe:')]
    events = sum(r.startswith('event:') for r in records)
    kitchen = sum(r.startswith('place:vk-') for r in records)
    places = sum(r.startswith('place:') for r in records) - kitchen
    lines = ['Latest published update · ' + singapore_time(publication['publishedAt'])]
    if venues:
        lines.append('• Explore: ' + ', '.join(venues[:3]) + (f' and {len(venues)-3} more' if len(venues)>3 else '') + ' updated.')
    if recipes:
        lines.append('• Cook: ' + ', '.join(recipes[:2]) + (f' and {len(recipes)-2} more' if len(recipes)>2 else '') + ' updated.')
    if events:
        lines.append(f'• Events: {events} listing' + ('s' if events != 1 else '') + ' updated.')
    if places:
        lines.append(f'• Explore: {places} Mixed Kitchen place' + ('s' if places != 1 else '') + ' added or updated.')
    if kitchen:
        lines.append(f'• Explore: {kitchen} Veg Kitchen place' + ('s' if kitchen != 1 else '') + ' added or updated.')
    return '\n'.join(lines)


class DeliveryError(Exception):
    def __init__(self, kind, retry_after=0):
        self.kind, self.retry_after = kind, retry_after
        super().__init__(kind)  # Never include a token-bearing request URL.


def telegram(method, payload, photo=None):
    if method not in ('getUpdates', 'sendMessage', 'sendPhoto', 'setMyCommands', 'editMessageText', 'editMessageCaption', 'editMessageReplyMarkup', 'answerCallbackQuery'):
        raise ValueError('Unsupported Telegram operation')
    token = (ROOT / 'private/telegram-token').read_text().strip()
    if photo is None:
        body = json.dumps(payload).encode()
        content_type = 'application/json'
    else:
        blob = photo.read_bytes()
        if len(blob) > 4_000_000:
            raise DeliveryError('oversized-photo')
        boundary = 'qt' + secrets.token_hex(16)
        parts = []
        for key, value in payload.items():
            if isinstance(value, (dict, list)): value = json.dumps(value)
            parts.append((f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n').encode())
        parts.extend([(f'--{boundary}\r\nContent-Disposition: form-data; name="photo"; filename="qt-live.jpg"\r\nContent-Type: image/jpeg\r\n\r\n').encode(), blob, f'\r\n--{boundary}--\r\n'.encode()])
        body = b''.join(parts)
        content_type = 'multipart/form-data; boundary=' + boundary
    req = urllib.request.Request('https://api.telegram.org/bot' + token + '/' + method,
                                 data=body, headers={'Content-Type': content_type})
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    try:
        with urllib.request.build_opener(NoRedirect).open(req, timeout=25) as response:
            data = json.loads(response.read(1_000_000))
    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            try:
                delay = int(json.loads(exc.read(10000)).get('parameters', {}).get('retry_after', 60))
            except Exception:
                delay = 60
            raise DeliveryError('rate-limited', min(max(delay, 1), 86400)) from None
        raise DeliveryError('server-rejected' if exc.code >= 500 else 'rejected') from None
    except Exception:
        # A timeout may have happened AFTER Telegram accepted the message.
        raise DeliveryError('delivery-unknown') from None
    if not data.get('ok'):
        raise DeliveryError('rejected')
    return data['result']


def get_public(route):
    with urllib.request.urlopen(ORIGIN + route, timeout=20) as response:
        raw = response.read(1_000_001)
    if len(raw) > 1_000_000:
        raise ValueError('Oversized public response')
    return json.loads(raw)


def coverage_text(complete, total):
    from menu_coverage import month_totals
    t = month_totals(ROOT)
    return (f"Whole-menu audits this month: {t['assessed']}/{total} locations fully assessed, "
            f"{complete} with every dish verified.\n"
            f"Dishes: {t['verified']:,} verified · {t['held']:,} held · {t['pending']:,} not yet checked "
            f"(across {t['started']} started menus).")


def mixed_kitchen_line():
    """'\nMixed Kitchen: N in Explore, ...' from the bot's own progress file; empty without a queue or on any error."""
    try:
        import veg_options
        totals, line = veg_options.status(ROOT)
        return '\n' + line.rstrip('\n') if totals else ''
    except Exception:
        return ''


def veg_kitchen_line():
    """'\nVeg Kitchen: N in Explore, ...' from the bot's own progress file; empty without a queue or on any error."""
    try:
        import veg_kitchen
        totals, line = veg_kitchen.status(ROOT)
        return '\n' + line.rstrip('\n') if totals else ''
    except Exception:
        return ''


def summary(mode='status'):
    report = read(ROOT / 'state/latest-report.json', {})
    checkpoint = read(ROOT / 'state/checkpoint.json', {})
    baseline = read(ROOT / 'baseline.json', {})
    publication = read(ROOT / 'state/latest-publication.json', {})
    holds = baseline.get('holds', {})
    if mode == 'learning':
        import learning
        try:
            data = learning.status(ROOT)
        except (ValueError, KeyError, TypeError, OSError):
            return 'QT Manager · Learning status is temporarily unavailable and needs an operator check.'
        return ('QT Manager · Learning\n'
                f"Status: {'active' if data['enabled'] else 'paused'}\n"
                f"Reviewed lessons active: {data['approvedLessons']}\n"
                f"Awaiting Manager review: {data['pendingLessons']}\n"
                f"Held records queued for later checks: {data['heldRetryRecords']}\n\n"
                'Lessons use existing review runs; budgets stay unchanged.\n'
                'Improvement in accuracy is not established yet.\nNext research: ' + next_research())
    if mode == 'help':
        return ('QT Manager — private reporting\n/status — last run and publication\n'
                '/latest — latest publication and available live screenshots\n'
                '/coverage — review coverage\n/holds — unresolved baseline gaps\n/learning — reviewed lessons and follow-ups\n'
                '/manage — delete bot-added recipes/events with confirmation. Explorer: 24 hours; Cooker and Event: 6–10 pm SGT.\n'
                'Live screenshots for published changes; one text summary at the end of the run.\n'
                'Telegram never starts research or bypasses Manager review.')
    reviewed = len(checkpoint.get('explorerReviewed', {}))
    total = len(baseline.get('venues', []))
    if mode == 'holds':
        return (f"QT Manager · Awaiting verification\n"
                f"• Opening hours: {holds.get('hours', '?')} venues\n"
                f"• Cover images: {holds.get('covers', '?')} venue(s)\n"
                f"• Menu prices: {holds.get('unknownPrices', '?')} entries\n"
                f"• Food evidence: {holds.get('foodHolds', '?')} held records\n\n"
                f"Saved baseline: {str(baseline.get('checkedAt', 'unknown'))[:10]}. These counts have not been re-audited.\n"
                'Unverified information stays unpublished.')
    coverage = coverage_text(reviewed, total) + mixed_kitchen_line() + veg_kitchen_line()
    if mode == 'coverage':
        return 'QT Manager · Coverage\n' + coverage + '\nThis is research progress, not the number visible in the app.\nNext run: ' + next_research()
    text = 'QT Manager · ' + singapore_time() + '\n\n' + publication_text(publication) + '\n\n' + coverage + '\n'
    if report.get('errors'):
        roles = sorted({str(e.get('role', 'Research')).removeprefix('qt-').replace('-', ' ').title() for e in report['errors']})
        text += 'Needs attention: ' + ', '.join(roles) + ' could not complete. Verified published data is retained.\n'
    reporting = read(STATE / 'state.json', {})
    delivery = reporting.get('deliveries', {})
    failed = sum(r['status'] not in ('sent', 'pending', 'sending', 'suppressed') for r in delivery.values())
    if failed:
        text += f'Needs attention: {failed} Telegram delivery issue(s).\n'
    visuals = sum(not v.get('complete') and v.get('lastError') is not None for v in reporting.get('visuals',{}).values())
    if visuals:
        text += f'Needs attention: {visuals} publication screenshot report(s) could not finish.\n'
    from night_window import usage
    policy = read(ROOT / 'policy.json', {})  # no AI call cap (owner, 18 Oct 2026)
    allowance = usage(ROOT, policy)
    limit = f"/{allowance['limit']:,}" if allowance['limit'] is not None else ' (no monthly cap)'
    text += f"AI agent calls this month: {allowance['used']:,}{limit}.\n"
    return text + '\nNext research: ' + next_research() + '\nSummary at the end of the run. /holds for missing information.'


def enqueue(state, key, text, photo=None, buttons=None):
    if key in state['deliveries']:
        return
    pending = sum(v['status'] in ('pending', 'sending') for v in state['deliveries'].values())
    if pending >= 100:
        raise RuntimeError('Notification queue capacity reached')
    state['deliveries'][key] = {'status': 'pending', 'text': text[:4000], 'photo': photo,
                                'attempts': 0, 'createdAt': stamp(), 'nextAt': 0, 'buttons': buttons}


def thread_reply(state, key, callback):
    """Show a button's reply under the message whose button was tapped (owner, 20 Oct 2026), not only at the end of the chat."""
    item, message_id = state['deliveries'].get(key), callback.get('message', {}).get('message_id')
    if item and item.get('status') == 'pending' and isinstance(message_id, int):
        item['replyTo'] = message_id


def authorized(message, config):
    return (message.get('chat', {}).get('type') == 'private'
            and message.get('chat', {}).get('id') == config.get('chatId')
            and message.get('from', {}).get('id') == config.get('userId')
            and not message.get('from', {}).get('is_bot', True))


def acknowledge_updates(updates, config):
    """Stop Telegram's spinner before waiting for app transport or screenshot locks."""
    for update in updates:
        callback = update.get('callback_query')
        if callback and authorized(dict(callback.get('message', {}), **{'from': callback.get('from', {})}), config):
            try:
                telegram('answerCallbackQuery', {'callback_query_id': callback['id'], 'text': 'Received. Checking this item...'} )
            except DeliveryError:
                pass


def handle_updates(state, updates, acknowledge=True):
    config_path = ROOT / 'private/telegram-chat.json'
    config = read(config_path, {})
    if acknowledge and config:
        acknowledge_updates(updates, config)
    pairing_path = ROOT / 'private/telegram-pairing.json'
    for update in updates:
        uid = update['update_id']
        if uid < state.get('offset', 0):
            continue
        callback = update.get('callback_query')
        if callback and config:
            message = dict(callback.get('message', {}), **{'from':callback.get('from', {})})
            if authorized(message, config):
                import telegram_controls
                try:
                    telegram_controls.callback(state, callback.get('data', ''), uid)
                    thread_reply(state, 'control:' + str(uid), callback)
                    action = state.get('moderation', {}).get(callback.get('data', '').split(':')[-1], {})
                    if action.get('stage') == 'done' and callback.get('message', {}).get('message_id'):
                        try:
                            telegram('editMessageReplyMarkup', {'chat_id':config['chatId'],
                                'message_id':callback['message']['message_id'], 'reply_markup':{'inline_keyboard':[]}})
                        except DeliveryError:
                            pass  # Removal is already verified; the durable reply still reports it.
                except Exception as exc:
                    # 20 Oct 2026: the owner's Approve cover taps failed with no trace. Log where (never the callback payload or token).
                    import traceback
                    frame = traceback.extract_tb(exc.__traceback__)[-1] if exc.__traceback__ else None
                    print(json.dumps({'at': stamp(), 'callbackError': type(exc).__name__,
                                      'where': f'{Path(frame.filename).name}:{frame.lineno}' if frame else None}), flush=True)
                    enqueue(state, 'control-error:'+str(uid), 'That button did not go through (' + type(exc).__name__ + '). Nothing was changed. '
                            'Tap it again in a minute, or use /manage.')
                    thread_reply(state, 'control-error:'+str(uid), callback)
            state['offset'] = uid + 1
            write(STATE / 'state.json', state)
            continue
        message = update.get('message', {})
        text = message.get('text', '')
        if not config:
            pairing = read(pairing_path, {})
            chat, sender = message.get('chat', {}), message.get('from', {})
            if (pairing.get('expires', 0) > time.time() and chat.get('type') == 'private'
                    and chat.get('id') == sender.get('id') and not sender.get('is_bot', True)
                    and text.startswith('/start ')
                    and secrets.compare_digest(text[7:].strip(), pairing.get('code', ''))):
                config = {'chatId': chat['id'], 'userId': sender['id'], 'pairedAt': stamp()}
                write(config_path, config)
                pairing_path.unlink(missing_ok=True)
                enqueue(state, 'paired', 'QT Manager is connected to your private chat.\n'
                        'Explorer, Cooker and Event reports will arrive here after verified publication.\n'
                        'One summary at the end of the run. /status /latest /coverage /holds /help')
        elif authorized(message, config):
            command = text.split()[0].split('@')[0].removeprefix('/') if text else ''
            if command in COMMANDS or command == 'start':
                # Bounded command responses; incoming arbitrary text never reaches a model.
                recent = state.get('lastCommandAt', 0)
                if time.time() - recent >= 3:
                    if command == 'manage':
                        import telegram_controls
                        try:
                            body, buttons = telegram_controls.menu(state)
                            enqueue(state, 'command:'+str(uid), body, buttons=buttons)
                        except Exception:
                            enqueue(state, 'command:'+str(uid), 'Management is temporarily unavailable. Please retry /manage shortly.')
                    else:
                        enqueue(state, 'command:' + str(uid), summary(command if command in COMMANDS else 'help'))
                    if command == 'latest':
                        state['latestRequested'] = str(uid)
                    state['lastCommandAt'] = time.time()
        state['offset'] = uid + 1
        write(STATE / 'state.json', state)
    return config


def change_caption(change):
    """Describe verified changes, not a generic 'reviewed' status."""
    if not change: return ''
    lines=[]
    before, after = change.get('before',{}), change.get('after',{})
    for field in change.get('fields',[]):
        if field == 'sourceUrls':
            lines.append('Source references refreshed: '+str(len(after.get(field) or []))+' links.')
            if change.get('retainedSourceUrls'):
                lines.append('Existing unverified references retained; their holds remain.')
        elif field == 'hours':
            old, new = before.get(field) or {}, after.get(field) or {}
            def hours(value):
                return '; '.join(value.get('weekdayText') or value.get('text') or []) if isinstance(value.get('weekdayText') or value.get('text'),list) else str(value.get('summary') or value.get('text') or value.get('weekdayText') or 'See opening hours in app')
            if hours(old) == hours(new):
                lines.append('Hours rechecked: '+hours(new)[:220]+' (times unchanged; evidence/notes updated).')
            else:
                lines.append('Hours: '+hours(old)[:160]+' → '+hours(new)[:220])
        elif field == 'menuPrices':
            prices=after.get(field) or []
            lines.append('Menu price verification: '+str(len(prices))+' dish(es).')
            for item in prices[:3]:
                price=item.get('price',{})
                amount=str(price.get('amount','?'))
                if price.get('maxAmount') is not None: amount+='–'+str(price['maxAmount'])
                if price.get('amount') is None:
                    lines.append(item.get('name','Dish')[:60]+': price unavailable')  # listed without a price (owner, 20 Oct 2026)
                    continue
                lines.append(item.get('name','Dish')[:60]+': '+str(price.get('currency') or '')+' '+amount)
        elif field == 'photo':
            photo=after.get(field) or {}
            if photo.get('author') == 'QuinTaste illustration':
                lines.append('Cover illustration '+('replaced' if before.get(field) else 'added')+': drawn from its menu (not a photo of the place).')
            else:
                lines.append('Cover photo '+('replaced' if before.get(field) else 'added')+': '+str(photo.get('license',''))[:40]+' · by '+str(photo.get('author',''))[:60]+'.')
        else:
            lines.append(field.replace('_',' ').capitalize()+' updated.')
    return '\n'.join(lines)[:650]


def capture(publication):
    """Read-only anonymous browser with network restricted to the owned app."""
    revision = publication.get('revision', '')
    if not re.fullmatch('[a-f0-9]{64}', revision):
        return []
    suffix = hashlib.sha256(('|'.join(publication.get('records',[]))+(':menu-review' if publication.get('menuReview') else '')).encode()).hexdigest()[:16]
    folder = STATE / 'media' / revision / suffix
    manifest = read(folder / 'manifest.json')
    if manifest:
        return [dict(photo, caption=photo_caption(photo['caption'])) for photo in manifest['photos']]
    def verify_current():
        if publication.get('changes'):
            from publisher import request as editorial_request
            live = editorial_request('GET','/control/state')
            active={c['changeId'] for c in live.get('changes',[])}
            if not all(c['changeId'] in active for c in publication['changes']):
                raise ValueError('Item changed after publication; do not misrepresent an old update')
        elif get_public('/api/editorial/status')['revision'] != revision:
            raise ValueError('Publication superseded; cannot present it as a fresh screenshot')
    verify_current()
    from playwright.sync_api import sync_playwright
    folder.mkdir(parents=True, exist_ok=True)
    routes = []
    for record in publication.get('records', []):
        kind, _, rid = record.partition(':')
        if not re.fullmatch('[a-z0-9-]{3,160}', rid):
            continue
        if kind == 'venue':
            change = next((c for c in publication.get('changes',[]) if c['kind']==kind and c['id']==rid),{})
            route = '/menu/'+rid if publication.get('menuReview') or 'menuPrices' in change.get('fields',[]) else '/place/catalogue-'+rid
            routes.append((kind, route, rid.replace('-', ' '), rid))
        elif kind == 'recipe':
            routes.append((kind, '/cook/recipe/' + rid, rid.replace('-', ' '), rid))
        elif kind == 'event':
            routes.append((kind, '/social?tab=events&eventType=Local%20events', 'Local events', rid))
    photos = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            context = browser.new_context(viewport={'width': 430, 'height': 930}, device_scale_factor=1)
            blocked = []
            def route_request(route):
                url = route.request.url
                if (url.startswith(ORIGIN + '/') and not re.search(r'/api/(?:place-search|place-photo|live-places|geocode)', url)):
                    route.continue_()
                else:
                    blocked.append(urllib.parse.urlsplit(url).hostname)
                    route.abort()
            context.route('**/*', route_request)
            page = context.new_page()
            for kind, route, label, rid in routes[:12]:
                change = next((c for c in publication.get('changes',[]) if c['kind']==kind and c['id']==rid),{})
                label = change.get('name',label)
                response = page.goto(ORIGIN + route, wait_until='networkidle', timeout=40000)
                if not response or response.status != 200:
                    raise ValueError('Page unavailable')
                page.wait_for_timeout(1500)
                body = page.locator('body').inner_text()
                if len(body) < 100 or 'Application error' in body:
                    raise ValueError('Page did not render usable content')
                if kind == 'venue':
                    if publication.get('menuReview') or 'menuPrices' in change.get('fields',[]):
                        # Show the unfiltered menu and its real total, never make
                        # one changed item look like the restaurant's entire menu.
                        page.get_by_text('All dishes',exact=True).wait_for(timeout=15000)
                    else:
                        page.get_by_text('Sources & credits', exact=True).wait_for(timeout=15000)
                        section = 'Opening hours' if 'hours' in change.get('fields',[]) else 'Sources & credits'
                        page.get_by_text(section,exact=True).click()
                if kind == 'recipe':
                    page.get_by_role('button', name='Recipe Info', exact=True).wait_for(timeout=15000)
                if kind == 'event':
                    events = get_public('/api/editorial/events').get('items', [])
                    event = next((e for e in events if e['id'] == rid), None)
                    if event is None:
                        continue  # Past/removed events must not be represented by a different event.
                    page.get_by_text(event['title'], exact=True).wait_for(timeout=15000)
                    page.get_by_text(event['title'], exact=True).click()
                    page.get_by_role('button', name='Organiser & Registration', exact=True).wait_for(timeout=10000)
                    label = event['title']
                page.evaluate('() => Promise.all(Array.from(document.images).map(i => i.decode().catch(() => {})))')
                target = folder / (kind + '-' + rid + '.jpg')
                page.screenshot(path=str(target), type='jpeg', quality=80)
                detail = change_caption(change)
                photos.append({'path': str(target), 'caption': f'Published — {label[:110]}\n{singapore_time(publication.get("publishedAt"))}\n{detail}\n{ORIGIN + route}'[:1024],
                               'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'kind':kind, 'recordId':rid})
            verify_current()
            write(folder / 'manifest.json', {'revision': revision, 'capturedAt': stamp(), 'photos': photos,
                                            'blockedHosts': sorted(set(blocked))})
        finally:
            browser.close()
    return photos


def publication_updates(state):
    # Durable publication receipts prevent intermediate batches being lost when
    # research publishes again before the reporter wakes. One item per tick keeps
    # screenshot work bounded and releases the owner-command lock frequently.
    publications = [dict(read(p),status='published') for p in sorted((ROOT/'state/publications').glob('*.json'))[-400:] if read(p).get('changes')]
    latest = read(ROOT / 'state/latest-publication.json', {})
    if latest.get('status') == 'published' and not any(p['revision'] == latest['revision'] for p in publications): publications.append(latest)
    request = state.pop('latestRequested', None)
    if request: publications = [latest] if latest.get('status') == 'published' else []
    for pub in publications:
        # Mixed Kitchen and Veg Kitchen places get one text digest per batch and task with Remove (new) or Revert (update) per place, never screenshots.
        if any(c.get('kind') == 'place' for c in pub.get('changes', [])):
            try:
                place_digest(state, pub, request)
            except Exception as exc:
                state['placeDigestError'] = type(exc).__name__
    for pub in publications:
        # A closure has no page to screenshot, so its text notice never waits behind screenshot retries.
        closed = [c for c in pub.get('changes', []) if 'closed' in c.get('fields', [])]
        if closed and len(closed) == len(pub.get('changes', [])) and not request:
            visual = state.setdefault('visuals', {}).setdefault(pub['revision'], {'attempts': 0, 'nextAt': 0})
            if not visual.get('complete'):
                try:
                    _publication_item(state, pub, visual, request)
                except Exception as exc:
                    state['closureNoticeError'] = type(exc).__name__
    for pub in publications:
        visual = state.setdefault('visuals', {}).setdefault(pub['revision'], {'attempts':0,'nextAt':0})
        if visual.get('complete') and not request: continue
        if visual['nextAt'] > time.time() and not request: continue
        if visual['attempts'] >= 3 and not request: continue
        _publication_item(state,pub,visual,request)
        return


def _publication_item(state, pub, visual, request):
    revision = pub['revision']
    key = 'publication:' + revision
    done = visual.setdefault('items',{})
    records = [r for r in pub.get('records',[]) if not r.startswith('place:')]  # places: place_digest
    if pub.get('records') and not records:
        visual['complete'] = True
        return
    remaining = [r for r in records if r not in done]
    selected = remaining[:1] if remaining else records[:1]
    changes = [c for c in pub.get('changes',[]) if c['kind']+':'+c['id'] in selected]
    if (not visual.get('complete') and visual['attempts'] < 3 and visual['nextAt'] <= time.time()) or request:
        try:
            if changes and all('closed' in c.get('fields', []) for c in changes):
                closure_notice(state, pub, changes, key, request, done)
                visual['complete'] = bool(records) and all(r in done for r in records)
                visual['attempts'] = 0
                return
            photos = capture(dict(pub,records=selected,changes=changes))
            if not photos: raise ValueError('No current item screenshot available')
            from publisher import request as editorial_request
            from telegram_controls import photo_buttons, photo_identity
            live = editorial_request('GET', '/control/state')
            if changes and not all(c['changeId'] in {x['changeId'] for x in live.get('changes',[])} for c in changes):
                raise ValueError('Item superseded during reporting')
            for i, photo in enumerate(photos):
                buttons = photo_buttons(state, *photo_identity(photo, live), live)
                record = photo.get('kind','')+':'+photo.get('recordId','')
                enqueue(state, key + ':photo:' + record + (':request:' + request if request else ''), photo['caption'], photo['path'], buttons=buttons)
                done[record] = 'queued'
            visual['complete'] = bool(records) and all(r in done for r in records)
            visual['attempts'] = 0
            visual['lastError'] = None
        except Exception as exc:
            visual['attempts'] += 1
            visual['nextAt'] = time.time() + 1800
            visual['lastError'] = type(exc).__name__
            if request:
                enqueue(state, key + ':visual-pending:request:' + request, 'QT Manager: live screenshot capture is pending. The reporter will retry within its capture limit.')


def place_digest(state, pub, request=None):
    """One message per published batch and task: "Added to Explore (Mixed Kitchen)" or "(Veg Kitchen)", a line per place and
    Open plus Remove (a new place) or Revert this update (a recheck update or a new cover photo) buttons."""
    import veg_kitchen
    import veg_options
    from publisher import request as editorial_request
    from telegram_controls import place_row
    places = [c for c in pub.get('changes', []) if c.get('kind') == 'place']
    published = dt.datetime.fromisoformat(str(pub.get('publishedAt') or stamp()).replace('Z', '+00:00'))
    if not request and dt.datetime.now(dt.timezone.utc) - published > dt.timedelta(days=7):
        return  # old receipts outlive pruned delivery keys; never re-announce them
    visual = state.setdefault('visuals', {}).setdefault(pub['revision'], {'attempts': 0, 'nextAt': 0})
    done = visual.setdefault('items', {})
    kitchen = [c for c in places if veg_kitchen.is_vk(c['id'])]
    groups = (('Mixed Kitchen', veg_options, [c for c in places if not veg_kitchen.is_vk(c['id'])], '', 'vegetarian dish', ' (dishes or prices updated)',
               '\nOnly dishes the venue labels vegetarian or vegan are shown.'),
              ('Veg Kitchen', veg_kitchen, kitchen, ':veg-kitchen', 'dish', ' (menu updated)',
               "\nThe venue's own page says its whole kitchen is vegetarian or vegan; the menu shown is a sample."))
    live = None
    for label, module, group, suffix, noun, update_note, intro in groups:
        key = 'publication:' + pub['revision'] + ':photo:place-digest' + suffix + (':request:' + request if request else '')
        if not group or key in state['deliveries'] or not (request or not all(done.get('place:' + c['id']) for c in group)):
            continue
        live = live or editorial_request('GET', '/control/state')
        lines, buttons = [], []
        for change in group[:12]:
            row, controls = place_row(state, change, live)
            data = (row or {}).get('data') or change.get('after') or {}
            count = len((data.get('menu') or {}).get('items', []))
            name = str(data.get('name') or change.get('name') or change['id'])[:60]
            update = ' (cover photo added)' if 'photo' in change.get('fields', []) else update_note
            lines.append('• ' + name + ' · ' + module.area(data, ROOT)[:40] + f' · {count} {noun}' + ('es' if count != 1 else '')
                         + ('' if row else ' (no longer live)') + (update if change.get('beforeHash') else ''))
            if controls:
                buttons.append(controls)
        updates = sum(bool(c.get('beforeHash')) for c in group[:12])
        title = f'Updated in Explore ({label})' if updates == len(group[:12]) else f'Added to Explore ({label})'
        footer = (intro + (' Tap Remove to take a new place down.' if updates < len(group[:12]) else '')
                  + (' Tap Revert this update to undo an update.' if updates else ''))
        enqueue(state, key, title + ' · ' + singapore_time(pub.get('publishedAt')) + '\n' + '\n'.join(lines) + footer, buttons=buttons)
    for change in places:
        done['place:' + change['id']] = 'queued'
    records = pub.get('records', [])
    visual['complete'] = bool(records) and all(r in done for r in records)


def closure_notice(state, pub, changes, key, request, done):
    """A closed venue leaves Explore, so there is no page to screenshot: send the closure source with Revert."""
    from publisher import request as editorial_request
    from telegram_controls import photo_buttons
    live = editorial_request('GET', '/control/state')
    for change in changes:
        closed = (change.get('after') or {}).get('closed') or read(ROOT / 'state/closure-flags.json', {}).get(change['id'], {})
        buttons = [[b for b in row if b.get('callback_data')] for row in photo_buttons(state, 'venue', change['id'], live)]
        if closed.get('sourceUrl'):
            buttons.append([{'text': 'Open source', 'url': closed['sourceUrl']}])
        enqueue(state, key + ':photo:venue:' + change['id'] + (':request:' + request if request else ''),
                'Removed from Explore — ' + change.get('name', change['id'])[:110] + '\n' + singapore_time(pub.get('publishedAt')) +
                '\nPermanently closed: "' + str(closed.get('quote', ''))[:120] + '"\nTap Revert this update if it is still open.',
                buttons=[row for row in buttons if row])
        done['venue:' + change['id']] = 'queued'


DAILY_SUMMARY_HOUR = 22


def completion_reports(state):
    """Only run-completion summaries are automatic; changed-item photos stay live."""
    for key,item in state['deliveries'].items():
        interval = key.startswith(('error:', 'scheduler-error:', 'digest:', 'overdue:'))
        publication_summary = key.startswith('publication:') and (':photo:' not in key and ':request:' not in key)
        # A supervised live run's ':end' message is the run's single end summary, so it is delivered.
        if item['status'] == 'pending' and (interval or publication_summary):
            item['status'] = 'suppressed'
    now = dt.datetime.now(SG)
    active = read(ROOT / 'operator-tests/active.json', {})
    if active.get('deadline', 0) > time.time():
        return  # a supervised live run sends its own end summary
    # One daily summary after the Cooker/Event window closes, covering the last 24 hours.
    if (now.hour, now.minute) >= (DAILY_SUMMARY_HOUR, 5) and 'daily-summary:' + now.date().isoformat() not in state['deliveries']:
        since = (now - dt.timedelta(days=1)).isoformat()
        enqueue(state, 'daily-summary:' + now.date().isoformat(),
                'QT Manager — daily summary (Explorer 24 h; Cooker and Event 6–10 pm)\n' + summary() + menu_digest(since) + cover_line())


def cover_line():
    try:
        import cover_photos
        try:
            from publisher import request as editorial_request
            live = editorial_request('GET', '/control/state')  # Mixed Kitchen places without a photo (once a day)
        except Exception:
            live = None
        return cover_photos.summary_line(ROOT, read(ROOT / 'state/live-baseline.json', {}).get('venues', []), live)
    except Exception:
        return ''


def menu_digest(since):
    """One compact block of whole-menu audit outcomes since an ISO time, for the end-of-run summary.

    Audit-only reviews change no app data, so they never get their own screenshot message
    (owner rule: live screenshots only for real changes, one summary at the end of the run).
    """
    from menu_coverage import reason_groups
    cutoff = dt.datetime.fromisoformat(since)
    rows = []
    for file in (ROOT / 'state/menu-reviews').glob('*.json'):
        review = read(file, {})
        if not review.get('checkedAt') or dt.datetime.fromisoformat(review['checkedAt']) < cutoff:
            continue
        rows.append(review)
    latest = {}
    for review in sorted(rows, key=lambda r: r['checkedAt']):
        latest[review['id']] = review
    if not latest:
        return ''
    lines = []
    for review in sorted(latest.values(), key=lambda r: (-r['coverage']['verified'] / max(1, r['coverage']['total']), r['id'])):
        c = review['coverage']
        name = str(review.get('name') or review['id']).replace('research-', '').replace('-', ' ')
        line = f"• {name[:60]}: {c['verified']}/{c['total']} verified"
        if c['held']:
            reason = reason_groups(review.get('heldItems', []), 1)
            line += f", {c['held']} held" + (f" ({reason[0][0][:90]})" if reason else '')
        lines.append(line)
    shown = lines[:12]
    more = f"\n…and {len(lines) - 12} more" if len(lines) > 12 else ''
    return ('\nMenu audits (no app data changed):\n' + '\n'.join(shown) + more + '\n')


def deliver(state, config, interactive_only=False):
    def interactive(key):
        return key.startswith(('control:', 'control-error:', 'command:')) or key == 'paired'
    for key, item in sorted(state['deliveries'].items(), key=lambda pair: not interactive(pair[0])):
        if interactive_only and not interactive(key):
            continue
        if item['status'] == 'sending':
            item['status'] = 'delivery-unknown'  # Crash after claim: no blind resend.
        if item['status'] != 'pending' or item['nextAt'] > time.time():
            continue
        item['status'], item['attempts'] = 'sending', item['attempts'] + 1
        write(STATE / 'state.json', state)
        try:
            photo = Path(item['photo']) if item.get('photo') else None
            if photo and (not photo.is_relative_to(STATE / 'media') or photo.is_symlink()):
                raise DeliveryError('invalid-photo-path')
            reply = {'reply_parameters': {'message_id': item['replyTo'], 'allow_sending_without_reply': True}} if item.get('replyTo') else {}
            if photo:
                payload = {'chat_id': config['chatId'], 'caption': item['text'][:1024], **reply}
                if item.get('buttons'): payload['reply_markup'] = {'inline_keyboard': item['buttons']}
                result = telegram('sendPhoto', payload, photo)
            else:
                result = telegram('sendMessage', {'chat_id': config['chatId'], 'text': item['text'], **reply,
                    'link_preview_options': {'is_disabled': True}, 'reply_markup': {'inline_keyboard': item.get('buttons') if item.get('buttons') is not None else [[
                    {'text': 'Explore', 'url': ORIGIN + '/explore'}, {'text': 'Cook', 'url': ORIGIN + '/cook'},
                    {'text': 'Events', 'url': ORIGIN + '/social?tab=events&eventType=Local%20events'}]]}})
            if not result.get('message_id') or result.get('chat', {}).get('id') != config['chatId']:
                raise DeliveryError('delivery-unknown')
            item.update(status='sent', messageId=result['message_id'], sentAt=stamp())
        except DeliveryError as exc:
            retry = exc.kind in ('rate-limited', 'server-rejected') and item['attempts'] < 6
            item.update(status='pending' if retry else exc.kind,
                        nextAt=time.time() + max(exc.retry_after, min(3600, 60 * 2 ** item['attempts'])))
        except Exception:
            item['status'] = 'local-failure'
        write(STATE / 'state.json', state)
        # At most four sends per tick, spaced below Telegram's per-chat rate.
        time.sleep(1.1)
        if sum(v.get('attempts', 0) for v in state['deliveries'].values()) - state.get('_attemptStart', 0) >= 4:
            break


def maintenance(state):
    # Keep 45 days of receipts and retain keys for the latest publication so an
    # unchanged old publication cannot be reannounced after receipt pruning.
    cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=45)).isoformat()
    latest = read(ROOT / 'state/latest-publication.json', {}).get('revision', '')
    for key, item in list(state['deliveries'].items()):
        keep = key == 'paired' or (latest and key.startswith('publication:' + latest))
        if item['createdAt'] < cutoff and item['status'] != 'pending' and not keep:
            del state['deliveries'][key]
    removable = sorted(((key, row) for key, row in state['deliveries'].items()
                        if row['status'] == 'sent' and key != 'paired'
                        and not (latest and key.startswith('publication:' + latest))),
                       key=lambda pair: pair[1]['createdAt'])
    for key, _ in removable:
        if len(state['deliveries']) <= 1000:
            break
        del state['deliveries'][key]
    for revision in list(state.get('visuals', {})):
        if revision != latest and not any(revision in k for k in state['deliveries']):
            del state['visuals'][revision]
    media = STATE / 'media'
    if media.exists():
        folders = sorted((p for p in media.iterdir() if p.is_dir()), key=lambda p: p.stat().st_mtime, reverse=True)
        total = 0
        pending_paths = {v.get('photo') for v in state['deliveries'].values() if v['status'] == 'pending'}
        for i, folder in enumerate(folders):
            files = list(folder.rglob('*'))
            size = sum(p.stat().st_size for p in files if p.is_file())
            total += size
            if (i >= 30 or total > 60 * 1024 * 1024) and not any(str(p) in pending_paths for p in files):
                for p in files:
                    if p.is_file() and not p.is_symlink():
                        p.unlink()
                for p in sorted((p for p in files if p.is_dir()),key=lambda p:len(p.parts),reverse=True):
                    p.rmdir()
                folder.rmdir()


def tick():
    import fcntl
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (STATE / 'reporter.lock').open('a+') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print('QT Telegram: previous tick still active')
            return
        state = read(STATE / 'state.json', {'offset': 0, 'deliveries': {}})
        state['_attemptStart'] = sum(v.get('attempts', 0) for v in state['deliveries'].values())
        # getUpdates acknowledgement follows only persisted handling.
        try:
            # The dedicated listener owns polling. This is a crash-safe fallback;
            # never race two getUpdates consumers or advance unhandled offsets.
            with (STATE / 'poll.lock').open('a+') as poll:
                try:
                    fcntl.flock(poll, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    config = read(ROOT / 'private/telegram-chat.json', {})
                else:
                    updates = telegram('getUpdates', {'offset': state['offset'], 'timeout': 0,
                                                       'limit': 30, 'allowed_updates': ['message', 'callback_query']})
                    config = handle_updates(state, updates)
            state['pollError'] = None
        except DeliveryError as exc:
            config = read(ROOT / 'private/telegram-chat.json', {})
            state['pollError'] = exc.kind
        if config:
            import telegram_controls
            telegram_controls.budget_alerts(state)
            try:
                telegram_controls.cover_requests(state)
                try:
                    import cover_publish
                    if cover_publish.maybe_start(ROOT):  # an approved drawing goes live now, not after the next round
                        print(json.dumps({'at': stamp(), 'coverPublish': 'started'}), flush=True)
                except Exception as exc:
                    print(json.dumps({'at': stamp(), 'coverPublishError': type(exc).__name__}), flush=True)
                try:
                    telegram_controls.owner_check_requests(state)
                except Exception as exc:  # a question that cannot be built must not stop the cover requests or the digest
                    print(json.dumps({'at': stamp(), 'ownerCheckError': type(exc).__name__}), flush=True)
            except Exception as exc:  # a cover request must never stop reporting
                state['coverRequestError'] = type(exc).__name__
            try:
                telegram_controls.recipe_audit_requests(state)
            except Exception as exc:
                state['recipeAuditError'] = type(exc).__name__
            try:
                telegram_controls.event_exclusion_requests(state)
            except Exception as exc:
                state['eventExclusionError'] = type(exc).__name__
            try:
                telegram_controls.diet_flag_requests(state)
            except Exception as exc:
                state['dietFlagError'] = type(exc).__name__
            try:
                telegram_controls.closure_flag_requests(state)
            except Exception as exc:
                state['closureFlagError'] = type(exc).__name__
            try:
                telegram_controls.mixed_kitchen_requests(state)
            except Exception as exc:  # a Mixed Kitchen check must never stop reporting
                state['mixedKitchenCheckError'] = type(exc).__name__
            try:
                telegram_controls.veg_kitchen_requests(state)
            except Exception as exc:  # nor a Veg Kitchen check
                state['vegKitchenCheckError'] = type(exc).__name__
            try:
                telegram_controls.gamer_requests(state)
            except Exception as exc:  # nor may a game-art request
                state['gamerRequestError'] = type(exc).__name__
            publication_updates(state)
            completion_reports(state)
            deliver(state, config)
        maintenance(state)
        state['lastTickAt'] = stamp()
        write(STATE / 'state.json', state)
        print(json.dumps({'paired': bool(config), 'lastTickAt': state['lastTickAt'],
                          'sent': sum(v['status'] == 'sent' for v in state['deliveries'].values()),
                          'pending': sum(v['status'] == 'pending' for v in state['deliveries'].values()),
                          'pollError': state.get('pollError')}))


if __name__ == '__main__':
    try:
        tick()
    except Exception as exc:
        print(json.dumps({'status': 'failed', 'errorType': type(exc).__name__}))
        raise SystemExit(1)
