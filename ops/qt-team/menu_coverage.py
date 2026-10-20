"""Exact dish inventory, resumable monthly review and Manager-gated completion."""
import datetime as dt
import hashlib
import json
import re
import time
import unicodedata
import urllib.parse
from zoneinfo import ZoneInfo

SG=ZoneInfo('Asia/Singapore')
CHUNK=80


def read(path, default=None):
    return json.loads(path.read_text(encoding='utf-8')) if path.is_file() else default


def write(path, value):
    from workflow import write as save
    save(path,value)


def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,ensure_ascii=False).encode()).hexdigest()


def month(): return dt.datetime.now(SG).strftime('%Y-%m')
def key(item): return item['sectionId']+':'+item['itemId']
def filename(root, rid):
    if not re.fullmatch('[a-z0-9-]{3,151}',rid): raise ValueError('Invalid menu identity')
    return root/'state/menu-coverage'/(rid+'.json')


def inventory(menu):
    items=[{'sectionId':s['id'],'itemId':i['id'],'name':i['name'],'price':i['price'],
            'scope':s['scope'],'sourceUrl':s['sourceUrl']} for s in menu['sections'] for i in s['items']]
    if not items or len(items)>2000 or len({key(i) for i in items})!=len(items):
        raise ValueError('Incomplete or duplicate menu inventory')
    return items


def plan(root, menu):
    """Never truncate the denominator; only the explicit assignment is bounded."""
    items=inventory(menu);path=filename(root,menu['id']);prior=read(path,{})
    proofs=prior.get('items',{}) if prior.get('month')==month() else {}
    proofs={key(i):proofs[key(i)] for i in items if key(i) in proofs and digest(i) in proofs[key(i)].get('fingerprints',[])}
    pending=[i for i in items if key(i) not in proofs]
    retries=[i for i in items if key(i) in proofs and proofs[key(i)]['status']!='verified' and proofs[key(i)].get('retryAt',0)<=time.time()]
    assigned=(pending+retries)[:CHUNK]
    state={'version':1,'id':menu['id'],'month':month(),'inventoryHash':digest(items),'postalCode':menu.get('postalCode'),
           'inventory':items,'items':proofs,'checkedAt':prior.get('checkedAt')}
    write(path,state)
    complete={}
    for i in items:complete.setdefault(i['sourceUrl'],[]).append(i['name'])
    complete={u:capture_completeness(root,u,n) for u,n in complete.items()}
    return {'id':menu['id'],'inventoryHash':state['inventoryHash'],'postalCode':menu.get('postalCode'),'totalItems':len(items),'assignedItems':assigned,
            'storedCaptureCompleteness':complete,
            'coverage':summary(state),'instruction':'Return one menuReview.items result for EVERY assignedItems entry. The denominator is the complete live menu, never a sample. ''storedCaptureCompleteness is the share of this menu\'s dish names found in the stored copy of each recorded source; below 0.5 that copy is incomplete, ''so look for another current source for the same branch (a working variant of the page, another delivery platform, an official menu) and web_extract it. ''A dish may be verified from any cited page whose stored capture shows its exact name and explicit SGD price; otherwise hold it with the cause.'}


def summary(state):
    rows=state.get('items',{});total=len(state.get('inventory',[]))
    verified=sum(r['status']=='verified' for r in rows.values())
    return {'total':total,'verified':verified,'held':len(rows)-verified,'pending':total-len(rows),
            'complete':total>0 and verified==total,'checkedAt':state.get('checkedAt')}


def get(root,rid):
    state=read(filename(root,rid),{})
    return summary(state) if state.get('month')==month() else {'total':0,'verified':0,'held':0,'pending':0,'complete':False}


def due(root,rid):
    state=read(filename(root,rid),{})
    if state.get('month')!=month() or not state.get('inventory'):return True
    result=summary(state)
    return result['pending']>0 or any(x['status']!='verified' and x.get('retryAt',0)<=time.time() for x in state['items'].values())


def normalize(text):return ''.join(c for c in unicodedata.normalize('NFKC',text).casefold() if c.isalnum())


FOREIGN=re.compile(r'(?i)\bRM\s?\d|US\$|\bUSD\b|\bMYR\b|€|£')


def bare_price(line,price):
    """A venue's own menu printing bare prices ("Aloha Burger ... 22.9"): the price must end the dish's line.
    Column labels (Latte Hot 5.9 Iced 6.9) and empty cells (-) between trailing prices are ignored."""
    line=re.sub(r'(?i)\b(?:hot|iced|cold|small|medium|large|regular)\b:?|\s[-–](?=\s|$)',' ',line)
    line=re.sub(r'\(\s*(\$?\d{1,4}(?:\.\d{1,2})?)\s*\)',r' \1',line)  # "Bento Set A ($7.90)" (20 Oct 2026)
    tail=re.search(r'((?:[\s|/–-]*\$?\d{1,4}(?:\.\d{1,2})?)+)[\s|]*(?:\[[^\]\d]{1,24}\][\s|]*)*$',line)  # [AF] [VG] badges may follow
    numbers=[float(n) for n in re.findall(r'\d{1,4}(?:\.\d{1,2})?',tail[1])] if tail else []
    return price.get('amount') in numbers and (price.get('maxAmount') is None or price['maxAmount'] in numbers)


def money_matches(nearby,match,price):
    """The amount found equals the claimed price, and for a range the upper bound follows it."""
    if float(match[1])!=price.get('amount'):return False
    if price.get('maxAmount') is None:return True
    upper=re.match(r'\s*(?:-|–|to)\s*(?:s\$|sgd|\$)?\s*(\d+(?:\.\d{1,2})?)',nearby[match.end():match.end()+45])
    return bool(upper and float(upper[1])==price['maxAmount'])


def price_matches(body,name,price,bare=False):
    """Basic evidence guard; independent Manager still checks semantic pairing. bare: the capture is the
    venue's own recorded menu, where Singapore menus often print prices without S$ (owner, 19 Oct 2026)."""
    text=unicodedata.normalize('NFKC',body).casefold();positions=[n for n,c in enumerate(text) if c.isalnum()]
    slim=''.join(text[n] for n in positions);needle=normalize(name);start=0
    while (found:=slim.find(needle,start))>=0:
        begin=positions[found];end=positions[found+len(needle)-1]+1
        start=found+len(needle)
        if (begin>0 and text[begin-1].isalnum()) or (end<len(text) and text[end].isalnum()):continue
        if len(needle)<8 and re.sub(r'^[\s\-*\u2022#|>\[\]()]*(?:[a-z]?\d{1,3}[.)]?\s*)?','',text[text.rfind('\n',0,begin)+1:begin]).strip():continue
        nearby=text[end:end+400]
        match=re.search(r'(?:s\$|sgd)\s*(\d+(?:\.\d{1,2})?)',nearby)
        if match and money_matches(nearby,match,price):return True
        # On the venue's own menu a plain "$8.00" is SGD; only the first amount after the name counts (the dish's own
        # price, often on the next line or under a shop-grid title), never a later dish's (20 Oct 2026).
        if bare and (dollar:=re.search(r'(?<![a-z])\$\s*(\d+(?:\.\d{1,2})?)',nearby[:300])) and money_matches(nearby,dollar,price):return True
        newline=text.find('\n',end)
        if bare and bare_price(text[end:newline if newline>=0 else len(text)],price):return True
    return False


SHARED_REASON="The same page content is returned for other branches, so it cannot confirm this branch's dish or price."
OUTLET_REASON='This storefront shows a branch menu only after the outlet is chosen; no outlet-confirmed capture was available.'
# Storefronts that ignore ?StoreID= server-side; only outlet_capture's proven captures count as evidence.
OUTLET_HOSTS=frozenset({'orders.greendot.sg','patisserie.greendot.sg'})
TRACKING=('utm_','fbclid','gclid','ref','source')
EMPTY_SHA=hashlib.sha256(b'').hexdigest()


EVIDENCE_REASONS={
    'source-differs':'Claimed from a different outlet of an outlet-selected storefront; held.',
    'source-not-cited':'The page this result relies on was not cited in its sources; held.',
    'no-stored-capture':'No usable stored capture of the cited page (missing, failed or older than 35 days); a browser view alone is not evidence; held.',
    'name-not-in-capture':'The exact dish name is not in the stored capture of the cited page; held.',
    'price-format':'The claimed price is not an explicit SGD amount or valid range; held.',
    'no-sgd-in-capture':'The stored capture shows no explicit SGD prices; held.',
    'price-not-in-capture':'The claimed price is not shown next to this dish in the stored capture; held.',
    'alternative-unconfirmed':'The cited page is not confirmed as this branch (a different listing without the branch postal code); held.',
}


def outlet_store(url):
    """StoreID for URLs on outlet-selected storefronts, else None."""
    parts=urllib.parse.urlsplit(str(url))
    if parts.netloc.lower() not in OUTLET_HOSTS:return None
    return (urllib.parse.parse_qs(parts.query).get('StoreID') or [''])[0]


def _cache_head(path):
    """url and sha256 from a cache entry without parsing its (up to 240 KB) content."""
    try:
        with path.open('rb') as handle:head=handle.read(4096).decode('utf-8','replace')
        url=re.search(r'"url":\s*("(?:[^"\\]|\\.)*")',head);sha=re.search(r'"sha256":\s*"([0-9a-f]{64})"',head)
        if url and sha:return json.loads(url[1]),sha[1]
        row=json.loads(path.read_text(encoding='utf-8'));return row.get('url'),row.get('sha256')
    except (OSError,ValueError):return None,None


def shared_captures(root):
    """URLs whose capture is byte-identical to a variant of the same page that differs only in the
    value of a shared query key (e.g. ?StoreID=a vs ?StoreID=b): the server ignored that parameter,
    so the capture cannot establish any single branch. Order, extra or tracking parameters do not count.
    """
    pages,shared={},set()
    for path in (root/'state/source-cache').glob('*.json'):
        url,sha=_cache_head(path)
        if not isinstance(url,str) or not sha or sha==EMPTY_SHA:continue
        parts=urllib.parse.urlsplit(url)
        query={k:v for k,v in urllib.parse.parse_qs(parts.query).items() if not k.lower().startswith(TRACKING)}
        group=pages.setdefault((parts.netloc.lower(),parts.path,sha),[])
        for other,other_query in group:
            if any(other_query[k]!=v for k,v in query.items() if k in other_query):shared.update((url,other))
        group.append((url,query))
    return shared


def reason_groups(held,limit=3):
    """Collapse identical hold reasons so a 53-dish hold reads as one cause, not 53 names."""
    counts={}
    for row in held:
        text=re.sub(r'\s+',' ',str(row.get('reason') or 'No reason recorded')).strip()
        if re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)+',text):text=text.replace('-',' ').capitalize()
        counts[text]=counts.get(text,0)+1
    return sorted(counts.items(),key=lambda pair:-pair[1])[:limit]


def month_totals(root):
    """Dish-level progress across this month's whole-menu audits."""
    totals={'started':0,'assessed':0,'complete':0,'verified':0,'held':0,'pending':0}
    folder=root/'state/menu-coverage'
    for path in sorted(folder.glob('*.json')) if folder.is_dir() else []:
        state=read(path,{})
        if state.get('month')!=month() or not state.get('inventory'):continue
        row=summary(state);totals['started']+=1
        totals['assessed']+=row['pending']==0;totals['complete']+=row['complete']
        for name in ('verified','held','pending'):totals[name]+=row[name]
    return totals


CAPTURE_COMPLETE=0.5
SHORT_RETRY=18*3600        # next nightly window
SHORT_RETRY_LIMIT=3        # then fall back to a weekly recheck
WEEK_RETRY=7*86400
ABSENT_RETRY=14*86400      # complete capture, dish not on it: probably renamed or dropped
TOOLING_CAUSES={'no-stored-capture','source-not-cited','source-differs','no-sgd-in-capture','price-format','alternative-unconfirmed'}
ABSENT_CONFIDENCE=0.9      # a dish is 'probably dropped' only when the copy holds at least 90% of the menu


LISTING_ID={'www.foodpanda.sg':('restaurant',1),'food.grab.com':('restaurant',-1)}  # platform: segment holding the vendor ID


def same_branch_page(url,original,body,postal):
    """An alternative page counts as this branch only when it is the same listing (same page path, or the
    same platform vendor ID such as foodpanda /restaurant/w1hc/...) or it is a single-branch page showing
    this branch's postal code (a multi-outlet list mentioning it is not enough)."""
    a,b=urllib.parse.urlsplit(str(url)),urllib.parse.urlsplit(str(original))
    host=a.netloc.lower();seg=lambda p:[x for x in p.path.split('/') if x]
    if host==b.netloc.lower():
        if seg(a)==seg(b):return True
        rule=LISTING_ID.get(host)
        if rule and rule[0] in seg(a) and rule[0] in seg(b):
            pick=lambda s:s[s.index(rule[0])+1] if rule[1]==1 else s[rule[1]]
            if len(seg(a))>seg(a).index(rule[0])+1 and len(seg(b))>seg(b).index(rule[0])+1 and pick(seg(a))==pick(seg(b)):return True
    if not (postal and re.fullmatch(r'\d{6}',str(postal))):return False
    codes=set(re.findall(r'(?<!\d)\d{6}(?!\d)',body))
    return str(postal) in codes and len(codes)<=2


def capture_completeness(root,url,names):
    """Share of these dish names present in the stored capture of url (0 when there is no capture)."""
    cache=read(root/'state/source-cache'/(hashlib.sha256(str(url).encode()).hexdigest()+'.json'),{}) or {}
    body=normalize(cache.get('result',{}).get('content','') or '')
    names=[normalize(n) for n in names if normalize(n)]
    return round(sum(n in body for n in names)/len(names),3) if body and names else 0.0


def retry_after(item,manager_ok,complete,prior):
    """Seconds until a held dish is rechecked, chosen by why it is held."""
    fixable=(not manager_ok or item.get('autoHeld') in TOOLING_CAUSES or item.get('reason') in (OUTLET_REASON,SHARED_REASON)
             or complete<ABSENT_CONFIDENCE)
    if not fixable:return ABSENT_RETRY,0
    streak=(prior or {}).get('shortRetries',0)+1
    return (SHORT_RETRY if streak<=SHORT_RETRY_LIMIT else WEEK_RETRY),streak


def validate_record(root,record,assignment):
    expected={key(i):i for i in assignment['assignedItems']}
    rows=record.get('menuReview',{}).get('items')
    if not isinstance(rows,list) or len(rows)!=len(expected) or {key(i) for i in rows}!=set(expected):
        raise ValueError('Menu review must account for every assigned dish exactly once')
    captures={s['url']:s for s in record.get('sources',[])};shared=None
    for item in rows:
        if item.get('status') not in ('verified','held','conflicting') or not isinstance(item.get('reason'),str) or not 1<=len(item['reason'])<=600:
            raise ValueError('Invalid per-dish review status/reason')
        original=expected[key(item)]
        if item['status']!='verified':continue
        url=item.get('sourceUrl');source=captures.get(url)
        cache=read(root/'state/source-cache'/(hashlib.sha256(str(url).encode()).hexdigest()+'.json'),{})
        store=outlet_store(url)
        if store is not None:
            proof=cache.get('result',{}).get('qtCapture',{})
            if proof.get('method')!='browser-outlet-selected' or not store or proof.get('storeId')!=store:
                item.update(status='held',reason=OUTLET_REASON)
                continue
        else:
            if shared is None:shared=shared_captures(root)
            if url in shared:
                item.update(status='held',reason=SHARED_REASON)
                continue
        body=cache.get('result',{}).get('content','')
        price=item.get('price') if isinstance(item.get('price'),dict) else {}
        amount=price.get('amount')
        own_menu=url==original['sourceUrl'] and not FOREIGN.search(body)
        problem=(
            'source-differs' if url!=original['sourceUrl'] and outlet_store(url) is not None else
            'source-not-cited' if not source else
            'alternative-unconfirmed' if url!=original['sourceUrl'] and body and not same_branch_page(url,original['sourceUrl'],body,assignment.get('postalCode')) else
            'no-stored-capture' if not body or cache.get('result',{}).get('error') or time.time()-cache.get('fetchedEpoch',0)>35*86400 else
            'name-not-in-capture' if normalize(original['name']) not in normalize(body) else
            'price-format' if (price.get('currency')!='SGD' or isinstance(amount,bool) or not isinstance(amount,(int,float))
                               or not 0<=amount<=10000 or price.get('type') not in ('displayed','from')
                               or ('maxAmount' in price and (not isinstance(price['maxAmount'],(int,float)) or price['maxAmount']<amount))) else
            'no-sgd-in-capture' if not own_menu and not re.search(r'S\$|\bSGD\b',body) else
            'price-not-in-capture' if not price_matches(body,original['name'],price,bare=own_menu) else None)
        if problem:
            # An unproven claim is held with its cause; it never sinks the rest of the venue's audit.
            item.update(status='held',reason=EVIDENCE_REASONS[problem],autoHeld=problem)
            continue
        item['contentSha256']=cache['sha256'];item['fetchedAt']=cache['fetchedAt']
        if url!=original['sourceUrl']:item['alternativeSource']=url  # branch confirmed by listing or postal code; Manager reviews it.


def downgrades(record):
    """Counts of verified claims the evidence check turned into holds, by cause."""
    counts={}
    for item in record.get('menuReview',{}).get('items',[]):
        if item.get('autoHeld'):counts[item['autoHeld']]=counts.get(item['autoHeld'],0)+1
    return counts


def accept(root,packets,decisions):
    """Only independent Manager-reviewed exact item results advance progress."""
    accepted={d['id'] for d in decisions if d.get('menuReviewDecision')=='approved'
              or ('menuReviewDecision' not in d and d['decision']=='ready-for-editorial-review')}
    result={}
    for packet in packets:
        if packet['role']!='qt-explorer':continue
        assignments={x['id']:x for x in packet.get('menuAssignments',[])}
        for row in packet['records']:
            assignment=assignments.get(row['id'])
            if not assignment:continue  # Legacy spot checks never become full-menu proof.
            validate_record(root,row,assignment)
            path=filename(root,row['id']);state=read(path,{})
            if state.get('inventoryHash')!=assignment['inventoryHash'] or state.get('month')!=month():
                continue  # menu changed or re-planned since this packet; the venue is simply planned again
            originals={key(i):i for i in assignment['assignedItems']}
            names={}
            for i in state.get('inventory',[]):names.setdefault(i['sourceUrl'],[]).append(i['name'])
            completeness={u:capture_completeness(root,u,n) for u,n in names.items()}
            for item in row['menuReview']['items']:
                original=originals[key(item)];status=item['status'] if row['id'] in accepted else 'held'
                reason=item['reason'] if row['id'] in accepted else ('Manager did not approve this audit. Explorer: '+item['reason'])[:600]
                hashes=[digest(original)]
                if status=='verified':hashes.append(digest(dict(original,price=item['price'])))
                wait,streak=retry_after(item,row['id'] in accepted,completeness.get(original['sourceUrl'],0.0),state['items'].get(key(item)))
                state['items'][key(item)]=dict(item,status=status,reason=reason,fingerprints=list(set(hashes)),
                     checkedAt=packet['checkedAt'],managerAccepted=row['id'] in accepted,shortRetries=streak,
                     captureCompleteness=completeness.get(original['sourceUrl'],0.0),
                     retryAt=time.time()+wait,managerReason=next((d.get('reason','') for d in decisions if d['id']==row['id']),''))
            state['checkedAt']=packet['checkedAt'];write(path,state);result[row['id']]=summary(state)
            if result[row['id']]['pending']==0:
                receipt={'id':row['id'],'name':row.get('name') or row['id'].replace('-',' '),
                         'checkedAt':packet['checkedAt'],'coverage':result[row['id']],
                         'heldItems':[{'name':i['name'],'reason':state['items'][key(i)]['reason']} for i in state['inventory'] if state['items'][key(i)]['status']!='verified'],
                         'status':'reviewed','published':False}
                retries=[r['retryAt'] for r in state['items'].values() if r['status']!='verified']
                if retries:receipt['nextCheckAt']=dt.datetime.fromtimestamp(min(retries),SG).isoformat()
                receipt['reviewId']=digest({'id':row['id'],'month':state['month'],'items':state['items']})
                write(root/'state/menu-reviews'/(receipt['reviewId']+'.json'),receipt)
    return result


def completed(root,venues):
    return {v['venueId']:get(root,v['venueId'])['checkedAt'] for v in venues if get(root,v['venueId'])['complete']}
