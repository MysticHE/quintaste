"""Owner-confirmed moderation. No model interprets commands or chooses mutations."""
import secrets
import time


def photo_identity(photo, live):
    """Older cached captures bind only when their recorded URL/title identifies one item."""
    import telegram_reporter as t
    if photo.get('kind') in ('venue','recipe','event') and photo.get('recordId'):
        return photo['kind'], photo['recordId']
    caption = photo.get('caption', '')
    matches=[]
    for row in live['records']:
        if row['kind']=='recipe' and (t.ORIGIN+'/cook/recipe/'+row['id']) in caption.splitlines():
            matches.append(('recipe',row['id']))
        elif row['kind']=='event' and caption.splitlines() and caption.splitlines()[0] == 'Live app — '+row['data']['title']:
            matches.append(('event',row['id']))
    return matches[0] if len(matches)==1 else (None,None)


def photo_buttons(state, kind, record_id, live):
    """Owner explicitly requested one-click deletion on recipe/event screenshots."""
    import telegram_reporter as t
    change = next((c for c in live.get('changes',[]) if c['kind'] == kind and c['id'] == record_id), None)
    if change and (kind == 'venue' or change.get('beforeHash')):
        rows = live.get('venues',[]) if kind == 'venue' else live.get('records',[])
        row = next((r for r in rows if r['id'] == record_id and r['hash'] == change['afterHash']), None)
        if row is None: return []
        actions = {k:v for k,v in state.setdefault('moderation',{}).items() if v['expires'] > time.time()}
        token = next((k for k,v in actions.items() if v.get('changeId') == change['changeId'] and v['stage'] == 'direct'), None)
        if token is None:
            token = secrets.token_hex(12)
            actions[token] = {'kind':kind,'id':record_id,'name':change['name'],'hash':row['hash'],
                              'changeId':change['changeId'],'expires':time.time()+30*86400,'stage':'direct',
                              'mode':'revert','actionId':'owner-revert-'+token}
        state['moderation'] = dict(list(actions.items())[-400:])
        route = '/place/catalogue-'+record_id if kind in ('venue','place') else '/cook/recipe/'+record_id if kind == 'recipe' else '/social?tab=events&eventType=Local%20events'
        return [[{'text':'Open '+kind,'url':t.ORIGIN+route},{'text':'Revert this update','callback_data':'revert:'+token}]]
    if kind not in ('recipe', 'event'): return []
    row = next((r for r in live['records'] if r['kind'] == kind and r['id'] == record_id), None)
    if row is None: return []
    actions = {k:v for k,v in state.setdefault('moderation', {}).items() if v['expires'] > time.time()}
    token = next((k for k,v in actions.items() if v.get('mode') == 'direct' and v['kind'] == kind
                  and v['id'] == record_id and v['hash'] == row['hash'] and v['stage'] == 'direct'), None)
    if token is None:
        token = secrets.token_hex(12)
        actions[token] = {'kind':kind, 'id':record_id, 'name':row['data'].get('name') or row['data']['title'],
                          'hash':row['hash'], 'expires':time.time()+30*86400, 'stage':'direct', 'mode':'direct',
                          'actionId':'owner-delete-'+token}
    state['moderation'] = dict(list(actions.items())[-400:])
    route = '/cook/recipe/'+record_id if kind == 'recipe' else '/social?tab=events&eventType=Local%20events'
    return [[{'text':'Open '+kind, 'url':t.ORIGIN+route},
             {'text':'Delete '+kind+' now', 'callback_data':'delete:'+token}]]


def place_row(state, change, live):
    """Open + Remove for one new Mixed Kitchen or Veg Kitchen place in the publication digest. A new place is taken down with the
    owner removal route (the app refuses to revert a creation); removal also blocks automatic republication.
    An update of a live place (recheck or new cover photo) gets Open + Revert this update instead."""
    import telegram_reporter as t
    row = next((r for r in live.get('records', []) if r.get('kind') == 'place' and r['id'] == change['id']), None)
    if row is None:
        return None, []
    if change.get('beforeHash'):
        buttons = photo_buttons(state, 'place', row['id'], live)
        return row, buttons[0] if buttons else []
    name = row['data'].get('name') or change['id']
    actions = {k:v for k,v in state.setdefault('moderation', {}).items() if v['expires'] > time.time()}
    token = next((k for k,v in actions.items() if v.get('mode') == 'direct' and v['kind'] == 'place' and v['id'] == row['id']
                  and v['hash'] == row['hash'] and v['stage'] == 'direct'), None)
    if token is None:
        token = secrets.token_hex(12)
        actions[token] = {'kind':'place', 'id':row['id'], 'name':name, 'hash':row['hash'], 'expires':time.time()+30*86400,
                          'stage':'direct', 'mode':'direct', 'actionId':'owner-delete-'+token}
    state['moderation'] = dict(list(actions.items())[-400:])
    return row, [{'text':'Open ' + name[:20], 'url':t.ORIGIN + '/place/catalogue-' + row['id']},
                 {'text':'Remove', 'callback_data':'delete:' + token}]


def menu(state, kind='recipe', offset=0):
    import publisher as p
    import telegram_reporter as t
    live = p.request('GET', '/control/state')
    rows = sorted((r for r in live['records'] if r['kind'] == kind), key=lambda r: r['data'].get('name', r['data'].get('title', '')))
    buttons = []
    actions = state.setdefault('moderation', {})
    actions = {k:v for k,v in actions.items() if v['expires'] > time.time()}
    state['moderation'] = actions
    for row in rows[offset:offset + 5]:
        token = secrets.token_hex(12)
        title = row['data'].get('name') or row['data']['title']
        if kind == 'event': title += ' · ' + t.singapore_time(row['data']['startsAt'])
        actions[token] = {'kind':kind, 'id':row['id'], 'name':title, 'hash':row['hash'], 'expires':time.time()+600, 'stage':'select'}
        buttons.append([{'text':'Delete ' + title[:52], 'callback_data':'select:' + token}])
    navigation = []
    if offset: navigation.append({'text':'Previous', 'callback_data':f'manage:{kind}:{max(0,offset-5)}'})
    if offset + 5 < len(rows): navigation.append({'text':'Next', 'callback_data':f'manage:{kind}:{offset+5}'})
    if navigation: buttons.append(navigation)
    buttons.append([{'text':'Recipes', 'callback_data':'manage:recipe:0'}, {'text':'Events', 'callback_data':'manage:event:0'}])
    # Bound stale menus even if an owner repeatedly requests a long catalogue.
    state['moderation'] = dict(list(actions.items())[-400:])
    return ('Manage bot-added ' + ('recipes' if kind == 'recipe' else 'events') + '\n'
            + ('Choose an item, then confirm deletion.' if rows else 'No published items in this category.')
            + '\nExisting app caches refresh within 15 minutes when online; offline copies can last up to 24 hours.', buttons)


def callback(state, data, uid):
    import telegram_reporter as t
    import publisher as p
    parts = data.split(':')
    if len(parts) == 3 and parts[0] == 'manage' and parts[1] in ('recipe','event') and parts[2].isdigit() and int(parts[2]) <= 2000:
        text, buttons = menu(state, parts[1], int(parts[2]))
    elif len(parts) == 2 and parts[0] in ('select','confirm','cancel','delete','revert','cover-ok','cover-no','game-ok','game-no','keep',
                                          'vk-veg','vk-vegan','vk-mixed','vk-skip'):
        action = state.get('moderation', {}).get(parts[1])
        if not action or action['expires'] <= time.time():
            text, buttons = 'This action expired. Use /manage to select the item again.', []
        elif parts[0] in ('game-ok','game-no') and action.get('mode') == 'game' and action['stage'] == 'direct':
            import gamer
            outcome = gamer.decide(t.ROOT, action['id'], action['hash'], parts[0] == 'game-ok', parts[1])
            action['stage'] = 'done'
            text = {'approved': 'Approved game art: ' + action['name'] + '.\nSaved to the QT Gamer approved set. It is not in the app until the game is built.',
                    'rejected': 'Rejected: ' + action['name'] + '. This version is dropped; request it again in the asset list for a new attempt.',
                    'stale': 'This game art is no longer waiting for approval. Nothing was changed.'}[outcome]
            buttons = []
        elif parts[0].startswith('vk-') and action.get('mode') == 'vkcheck' and action['stage'] == 'direct':
            # Owner check (20 Oct 2026): the listener only records the answer; the next round applies it under the run lock.
            import veg_kitchen
            choice = parts[0][3:]
            outcome = veg_kitchen.record_owner_check(t.ROOT, action['id'], choice, parts[1])
            action.update(stage='done', outcome=outcome, choice=choice)
            text = {'veg': 'Thanks: ' + action['name'] + ' is a Veg Kitchen (vegetarian). The next bot round finishes its menu and publishes it.',
                    'vegan': 'Thanks: ' + action['name'] + ' is a Veg Kitchen (vegan). The next bot round finishes its menu and publishes it.',
                    'mixed': 'Thanks: ' + action['name'] + ' moves to the Mixed Kitchen queue (only its labelled vegetarian dishes are listed).',
                    'skip': 'Skipped: ' + action['name'] + ' will not be added.'}[choice] if outcome == 'recorded' else 'This question was already answered. Nothing was changed.'
            buttons = []
        elif parts[0] in ('cover-ok','cover-no') and action.get('mode') == 'cover' and action['stage'] == 'direct':
            import cover_photos
            outcome = cover_photos.decide(t.ROOT, action['id'], action['sha'], parts[0] == 'cover-ok', parts[1])
            action.update(stage='done', outcome=outcome)  # the publisher checks this record before a cover goes live
            kitchen = 'Veg Kitchen' if str(action.get('id', '')).startswith('vk-') else 'Mixed Kitchen'
            live_note = (f'When it goes live it is listed in the {kitchen} update message with a Revert button.' if action.get('target') == 'place'
                         else 'When it goes live you get the usual screenshot with a Revert button.')
            drawing = any(e['sha256'] == action['sha'] and e.get('basis') == 'illustration' for e in cover_photos.entries(t.ROOT))
            text = {'approved': 'Approved cover for ' + action['name'] + '.\n' + ('QT Manager checks the drawing in the next bot round. ' if drawing else
                                'The next bot round enhances it and QT Manager checks the result. ') + live_note,
                    'rejected': ('Rejected. QT draws a different illustration of ' + action['name'] + ' later (up to '
                                 + str(cover_photos.ILLUSTRATION_TRIES) + ' tries in all).' if drawing else
                                 'Rejected. Explorer will look for a different photo of ' + action['name'] + ' tomorrow.'),
                    'stale': 'This cover is no longer waiting for approval. Nothing was changed.'}[outcome]
            buttons = []
        elif parts[0] == 'keep' and action.get('mode') == 'direct' and action['stage'] == 'direct':
            action.update(stage='done', outcome='keep')  # veg_options.settle reads a Mixed Kitchen or Veg Kitchen check's outcome from here
            later = ' Explorer checks it again in 30 days.' if action.get('mixedKitchen') is not None or action.get('vegKitchen') is not None else ''
            text, buttons = 'Kept: ' + action['name'] + '. It stays in the app.' + later, []
        elif parts[0] == 'select' and action['stage'] == 'select':
            token = secrets.token_hex(12)
            action['stage'] = 'selected'
            state['moderation'][token] = dict(action, stage='confirm', actionId='owner-delete-' + token)
            text = 'Delete ' + action['name'] + '?\nIt will be removed from the live app and excluded from automatic republication. An audit copy will be retained.'
            buttons = [[{'text':'Confirm delete', 'callback_data':'confirm:'+token}, {'text':'Cancel', 'callback_data':'cancel:'+token}]]
        elif parts[0] == 'cancel' and action['stage'] == 'confirm':
            action['stage'] = 'cancelled'
            text, buttons = 'Cancelled. The item was kept.', []
        elif parts[0] == 'revert' and action.get('mode') == 'revert' and action['stage'] in ('direct','pending'):
            action['stage'] = 'pending'
            t.write(t.STATE / 'state.json', state)
            request = {'actionId':action['actionId'],'kind':action['kind'],'id':action['id'],
                       'expectedHash':action['hash'],'changeId':action['changeId'],'actor':'telegram-owner'}
            try:
                result = p.request('POST','/control/revert',request)
                live = p.request('GET','/control/state')
                if not any(r['actionId'] == action['actionId'] and r['changeId'] == action['changeId'] for r in live.get('reverts',[])):
                    raise ValueError('Revert receipt not verified')
                action.update(stage='done',revision=result['revision'])
                text, buttons = 'Reverted: '+action['name']+'\nThe previous data is restored on the live server. Other updates and deletions are preserved. Cached screens update on their next online refresh (up to 15 minutes). This rejected proposal will not be republished automatically.', []
            except Exception:
                text = 'Revert could not be confirmed. If this item has a newer update, this old button cannot overwrite it. You can safely retry this same action.'
                buttons = [[{'text':'Retry revert','callback_data':data}]]
        elif ((parts[0] == 'confirm' and action.get('mode') not in ('direct','revert') and action['stage'] in ('confirm','pending'))
              or (parts[0] == 'delete' and action.get('mode') == 'direct' and action['stage'] in ('direct','pending'))):
            action['stage'] = 'pending'
            # Persist the idempotency key BEFORE transport. A timeout can be retried
            # safely with exactly the same request; never infer success from a send.
            t.write(t.STATE / 'state.json', state)
            request = {'actionId':action['actionId'],'kind':action['kind'],'id':action['id'], 'expectedHash':action['hash'],'actor':'telegram-owner'}
            try:
                result = p.request('POST','/control/remove', request)
                live = p.request('GET','/control/state')
                if not any(r['actionId'] == action['actionId'] and r['expectedHash'] == action['hash'] for r in live.get('removals', [])):
                    raise ValueError('Removal receipt not verified')
                action.update(stage='done', revision=result['revision'], outcome='removed')
                text, buttons = 'Deleted: ' + action['name'] + '\nRemoved from the live catalogue. Previously cached screens update on their next online refresh (up to 15 minutes). Bots will not automatically restore it.', []
            except Exception:
                text = 'Deletion could not be confirmed. It may already have reached the app. Retry this same action safely, or use /manage to check current items.'
                buttons = [[{'text':'Retry confirmation', 'callback_data':data}]]
        else:
            text, buttons = 'This action was already handled. Use /manage for current items.', []
    else:
        return
    t.enqueue(state, 'control:'+str(uid), text, buttons=buttons)


def owner_check_requests(state):
    """Ask the owner about places Explorer believes are fully vegetarian but cannot prove from the venue's own words (20 Oct 2026),
    at most veg_kitchen.OWNER_CHECKS_OPEN unanswered at a time."""
    import telegram_reporter as t
    import veg_kitchen
    open_now = sum(1 for k, a in state.get('moderation', {}).items() if a.get('mode') == 'vkcheck' and a.get('stage') == 'direct' and a['expires'] > time.time())
    for row in veg_kitchen.owner_check_view(t.ROOT, limit=50):
        if open_now >= veg_kitchen.OWNER_CHECKS_OPEN:
            break
        key = 'vkcheck:' + row['candidateId']
        if key in state['deliveries']:
            continue
        token = secrets.token_hex(12)
        actions = {k: v for k, v in state.setdefault('moderation', {}).items() if v['expires'] > time.time()}
        name = row.get('nameConfirmed') or row.get('nameHint') or row['candidateId']
        actions[token] = {'mode': 'vkcheck', 'kind': 'vkcheck', 'id': row['candidateId'], 'name': name, 'expires': time.time() + 30 * 86400,
                          'stage': 'direct', 'actionId': 'owner-vkcheck-' + token}
        state['moderation'] = dict(list(actions.items())[-400:])
        text = ('Is this place fully vegetarian?\n' + name + '\n' + str(row.get('address', ''))[:200] +
                '\nQT Explorer found: ' + (str(row.get('signals')) or 'signs it is meat-free, but no statement in the venue\'s own words.')[:500] +
                '\nVeg Kitchen or Vegan Kitchen: it is published once its menu checks pass. Mixed Kitchen: only its labelled vegetarian dishes are listed.')
        buttons = [[{'text': 'Veg Kitchen', 'callback_data': 'vk-veg:' + token}, {'text': 'Vegan Kitchen', 'callback_data': 'vk-vegan:' + token}],
                   [{'text': 'Mixed Kitchen', 'callback_data': 'vk-mixed:' + token}, {'text': 'Skip', 'callback_data': 'vk-skip:' + token}]]
        if str(row.get('mapsUrl', '')).startswith('https://www.google.com/maps/'):
            buttons.append([{'text': 'Open on Google Maps', 'url': row['mapsUrl']}])
        t.enqueue(state, key, text[:4000], buttons=buttons)
        open_now += 1


def cover_requests(state):
    """Send each photo Explorer found for a missing cover to the owner once, with one-tap Approve/Reject."""
    import shutil
    import telegram_reporter as t
    import cover_photos
    for entry in cover_photos.entries(t.ROOT):
        key = 'cover:' + entry['sha256']
        if entry.get('status') != 'pending-owner' or key in state['deliveries']:
            continue
        source = cover_photos.refs(t.ROOT) / (entry['sha256'] + '.jpg')
        if source.is_symlink() or not source.is_file():
            continue
        folder = t.STATE / 'media' / ('cover-' + entry['sha256'][:16])
        folder.mkdir(parents=True, exist_ok=True, mode=0o700)
        shutil.copyfile(source, folder / 'candidate.jpg')
        actions = {k:v for k,v in state.setdefault('moderation', {}).items() if v['expires'] > time.time()}
        token = secrets.token_hex(12)
        actions[token] = {'mode':'cover', 'kind':'cover', 'target':entry.get('kind', 'venue'), 'id':entry['venueId'], 'sha':entry['sha256'], 'name':entry['name'],
                          'expires':time.time() + 2 * cover_photos.OWNER_WAIT, 'stage':'direct', 'actionId':'owner-cover-' + token}
        state['moderation'] = dict(list(actions.items())[-400:])
        t.enqueue(state, key, cover_photos.caption(entry), str(folder / 'candidate.jpg'),
                  buttons=[[{'text':'Approve cover', 'callback_data':'cover-ok:' + token}, {'text':'Reject', 'callback_data':'cover-no:' + token}],
                           [{'text':'Open menu page' if entry.get('basis') == 'illustration' else 'Open source page', 'url':entry['photo']['sourceUrl']}]])


def gamer_requests(state):
    """Send each QT Manager-approved game sprite to the owner once, with one-tap Approve/Reject."""
    import shutil
    import telegram_reporter as t
    import gamer
    for asset_id, entry in gamer.awaiting_owner(t.ROOT):
        key = 'game:' + entry['chosen']
        if key in state['deliveries']:
            continue
        source = t.ROOT / 'images' / entry['chosen'] / 'candidate.jpg'
        if source.is_symlink() or not source.is_file():
            continue
        folder = t.STATE / 'media' / ('game-' + entry['chosen'][:16])
        folder.mkdir(parents=True, exist_ok=True, mode=0o700)
        shutil.copyfile(source, folder / 'candidate.jpg')
        actions = {k:v for k,v in state.setdefault('moderation', {}).items() if v['expires'] > time.time()}
        token = secrets.token_hex(12)
        actions[token] = {'mode':'game', 'kind':'game', 'id':asset_id, 'hash':entry['chosen'], 'name':asset_id,
                          'expires':time.time() + gamer.OWNER_WAIT, 'stage':'direct', 'actionId':'owner-game-' + token}
        state['moderation'] = dict(list(actions.items())[-400:])
        t.enqueue(state, key, gamer.caption(t.ROOT, asset_id, entry), str(folder / 'candidate.jpg'),
                  buttons=[[{'text':'Approve art', 'callback_data':'game-ok:' + token}, {'text':'Reject', 'callback_data':'game-no:' + token}]])


def _remove_or_keep(state, t, kind, rid, row, key, text, route, **extra):
    token = secrets.token_hex(12)
    state.setdefault('moderation', {})[token] = {'kind':kind, 'id':rid, 'name':row['data'].get('name') or row['data'].get('title', rid),
        'hash':row['hash'], 'expires':time.time()+30*86400, 'stage':'direct', 'mode':'direct', 'actionId':'owner-delete-' + token, **extra}
    t.enqueue(state, key, text, buttons=[[{'text':'Open ' + kind, 'url':t.ORIGIN + route}],
        [{'text':'Remove ' + kind, 'callback_data':'delete:' + token}, {'text':'Keep', 'callback_data':'keep:' + token}]])


def mixed_kitchen_requests(state):
    """Mixed Kitchen places that failed two rechecks in a row: one Remove / Keep message per prompt. Bots never
    remove the place themselves; the owner's tap is recorded on the action and read back by veg_options.settle."""
    import telegram_reporter as t
    import veg_options
    due = [(rid, prompt) for rid, prompt in veg_options.owner_prompts(t.ROOT)
           if f"mixed-kitchen-check:{rid}:{prompt['seq']}" not in state['deliveries']]
    if not due:
        return
    import publisher
    live = {r['id']: r for r in publisher.request('GET', '/control/state')['records'] if r['kind'] == 'place'}
    state['moderation'] = {k:v for k,v in state.setdefault('moderation', {}).items() if v['expires'] > time.time()}
    for rid, prompt in due:
        if rid not in live:
            continue  # already removed
        name = live[rid]['data'].get('name', rid)
        _remove_or_keep(state, t, 'place', rid, live[rid], f"mixed-kitchen-check:{rid}:{prompt['seq']}",
            'Mixed Kitchen check: ' + name + ' no longer shows 2 labelled dishes\nTwo rechecks in a row found fewer than 2 dishes the '
            'venue itself labels vegetarian or vegan.' + ('\nLast check: ' + prompt['reason'][:300] if prompt.get('reason') else '') +
            '\nRemove takes it out of Explore (never added back automatically). Keep leaves it listed; Explorer checks it again in 30 days.',
            '/place/catalogue-' + rid, mixedKitchen=prompt['seq'])
    state['moderation'] = dict(list(state['moderation'].items())[-400:])


def veg_kitchen_requests(state):
    """Veg Kitchen places whose whole-venue statement failed two rechecks in a row: one Remove / Keep message per prompt.
    Bots never remove the place themselves; the owner's tap is recorded on the action and read back by veg_kitchen.settle."""
    import telegram_reporter as t
    import veg_kitchen
    due = [(rid, prompt) for rid, prompt in veg_kitchen.owner_prompts(t.ROOT)
           if f"veg-kitchen-check:{rid}:{prompt['seq']}" not in state['deliveries']]
    if not due:
        return
    import publisher
    live = {r['id']: r for r in publisher.request('GET', '/control/state')['records'] if r['kind'] == 'place'}
    state['moderation'] = {k:v for k,v in state.setdefault('moderation', {}).items() if v['expires'] > time.time()}
    for rid, prompt in due:
        if rid not in live:
            continue  # already removed
        name = live[rid]['data'].get('name', rid)
        _remove_or_keep(state, t, 'place', rid, live[rid], f"veg-kitchen-check:{rid}:{prompt['seq']}",
            'Veg Kitchen check: ' + name + " could not be confirmed as fully vegetarian or vegan\nTwo rechecks in a row could not confirm "
            "from the venue's own page that the whole venue is vegetarian or vegan." + ('\nLast check: ' + prompt['reason'][:300] if prompt.get('reason') else '') +
            '\nRemove takes it out of Explore (never added back automatically). Keep leaves it listed; Explorer checks it again in 30 days.',
            '/place/catalogue-' + rid, vegKitchen=prompt['seq'])
    state['moderation'] = dict(list(state['moderation'].items())[-400:])


def event_exclusion_requests(state):
    """Live events that Event now excludes under the owner's vegetarian-focus rule: one Remove / Keep message each."""
    import telegram_reporter as t
    excluded = t.read(t.ROOT / 'state/event-exclusions.json', {})
    due = {rid: e for rid, e in excluded.items() if 'event-exclusion:' + rid not in state['deliveries']}
    if not due:
        return
    import publisher as p
    live = {r['id']: r for r in p.request('GET', '/control/state')['records'] if r['kind'] == 'event'}
    state['moderation'] = {k:v for k,v in state.setdefault('moderation', {}).items() if v['expires'] > time.time()}
    for rid, entry in due.items():
        if rid in live:
            _remove_or_keep(state, t, 'event', rid, live[rid], 'event-exclusion:' + rid,
                'Event check: ' + live[rid]['data'].get('title', rid) + '\nEvent no longer lists this under your rule (vegetarian food must be the point):\n'
                + entry.get('reason', '')[:500], '/social?tab=events&eventType=Local%20events')
    state['moderation'] = dict(list(state['moderation'].items())[-400:])


def diet_flag_requests(state):
    """Venues Explorer could not prove are wholly vegetarian: tell the owner once each (venues are hidden in Admin > Content)."""
    import telegram_reporter as t
    for rid, flag in t.read(t.ROOT / 'state/diet-flags.json', {}).items():
        note = '\nNote: ' + flag['note'] if flag.get('note') else ''
        t.enqueue(state, 'diet-flag:' + rid, 'Diet check: ' + str(flag.get('name') or rid) + "\nExplorer could not confirm from the venue's own page "
                  'that the whole venue is vegetarian.' + note +
                  '\nIt stays listed for now. If it is not vegetarian, hide it in Admin > Content; Explorer rechecks it on its next visit.',
                  buttons=[[{'text':'Open place', 'url':t.ORIGIN + '/place/catalogue-' + rid}]])


def closure_flag_requests(state):
    """Venues a stored page reports temporarily closed: tell the owner once, with the source. Permanently closed
    venues are removed from Explore by the publisher instead, and that publication message carries Revert."""
    import telegram_reporter as t
    for rid, flag in t.read(t.ROOT / 'state/closure-flags.json', {}).items():
        if flag.get('status') != 'temporarily-closed':
            continue
        t.enqueue(state, 'closure-flag:' + rid + ':' + str(flag.get('status')), 'Closure check: ' + str(flag.get('name') or rid) +
                  '\nExplorer found it marked temporarily closed: "' + str(flag.get('quote', ''))[:120] + '"'
                  '\nIt stays listed. If it will not reopen, hide it in Admin > Content.',
                  buttons=[[{'text':'Open place', 'url':t.ORIGIN + '/place/catalogue-' + rid}, {'text':'Open source', 'url':flag['sourceUrl']}]])


def recipe_audit_requests(state):
    """Bot recipes already live that miss the owner's new recipe bar: one message each with Remove / Keep."""
    import telegram_reporter as t
    audit = t.read(t.ROOT / 'state/recipe-audit.json', {})
    due = {rid: a for rid, a in audit.items() if not a.get('passes') and 'recipe-audit:' + rid not in state['deliveries']}
    if not due:
        return
    import publisher as p
    live = {r['id']: r for r in p.request('GET', '/control/state')['records'] if r['kind'] == 'recipe'}
    state['moderation'] = {k:v for k,v in state.setdefault('moderation', {}).items() if v['expires'] > time.time()}
    for rid, entry in due.items():
        if rid in live:  # otherwise already removed
            _remove_or_keep(state, t, 'recipe', rid, live[rid], 'recipe-audit:' + rid,
                'Recipe check: ' + live[rid]['data'].get('name', rid) + '\nBelow the new recipe bar (4.5+ stars from 20+ ratings, '
                '30 min, 12 ingredients, 8 steps, local ingredients, naturally allium-free):\n' + entry.get('reasons', '')[:600], '/cook/recipe/' + rid)
    state['moderation'] = dict(list(state['moderation'].items())[-400:])


def budget_alerts(state):
    import telegram_reporter as t
    from night_window import usage
    policy = t.read(t.ROOT / 'policy.json')
    data = usage(t.ROOT, policy)
    cap, used = data['limit'], data['used']
    if cap is None:
        return  # no monthly cap; usage is shown in every summary instead
    threshold = (cap * policy.get('monthlyModelAlertPercent',80) + 99) // 100
    if used >= threshold:
        t.enqueue(state, 'ai-budget-80:'+data['month'], f"QT Manager · AI allowance\n{used:,} of {cap:,} monthly agent calls used (at least 80%).\n{max(0,cap-used):,} remaining.\n" + t.singapore_time() + '\nThis allowance counts agent runs, including failed attempts; each run may contain several model turns. Google and image limits are separate.')
    if used >= cap:
        t.enqueue(state, 'ai-budget-100:'+data['month'], f"QT Manager · Monthly AI limit reached\n{used:,}/{cap:,} calls. Research is paused; checkpoints and published data are retained.\nAllowance resets on the 1st at midnight SGT. Telegram reporting continues.")
