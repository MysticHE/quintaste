"""Excel-derived Mixed Kitchen publication; independent research coverage is preserved."""
from collections import defaultdict,Counter
import hashlib,json,re,textwrap
from urllib.parse import urlsplit

def editorial_places(snapshot):
    return {key:{k:v for k,v in snapshot.get(key,{}).items() if v.get('kind')=='place'} for key in ['records','removals']}

def publication_hours(hours,status):
    """Fit the public contract without inventing days or losing qualifications."""
    if not hours:return None
    u=urlsplit(hours['sourceUrl'])
    assert u.scheme=='https' and not u.username and not u.password and len(hours['sourceUrl'])<=600,'Hours source must satisfy public URL contract'
    detail=hours['summary'].strip()
    schedule=hours.get('schedule') or textwrap.wrap(detail,width=220,break_long_words=False,break_on_hyphens=False)
    assert 1<=len(schedule)<=8 and all(0<len(s)<=220 for s in schedule)
    notes=hours.get('notes') or detail
    assert len(notes)<=500
    return {**hours,'summary':'Restaurant opening hours' if status=='VERIFIED_WEEK' else 'Partial or qualified hours','schedule':schedule,'notes':notes}

def reviewed_dishes(dishes,decision_notes):
    """An explicit Excel selection can withhold observations from publication.

    Research observations remain intact. Unknown or repeated IDs must stop the
    export rather than silently dropping evidence or publishing another item.
    """
    marker='Publication dish IDs: '
    lines=[line[len(marker):] for line in str(decision_notes or '').splitlines() if line.startswith(marker)]
    if not lines:return dishes
    assert len(lines)==1,'Multiple publication dish selections'
    selected=json.loads(lines[0])
    assert isinstance(selected,list) and selected and all(isinstance(x,str) for x in selected)
    assert len(selected)==len(set(selected)),'Repeated publication dish ID'
    available={d['Dish ID']:d for d in dishes}
    assert len(available)==len(dishes) and set(selected)<=set(available),'Publication dish selection does not match current observations'
    return [available[x] for x in selected]

def menu_items(dishes,qualification,public_note=None):
    """Keep source portions, price semantics and source observation IDs explicit."""
    delivery=any(re.search(r'foodpanda|delivery|deliveroo',str(d['Channel'])+' '+str(d.get('Source URL') or ''),re.I) for d in dishes)
    note='Menu and availability may change. Ask for vegetarian accompaniments. This is a partial menu.'
    if delivery:note='Includes delivery prices and offers, which may differ from dine-in. '+note
    if re.search(r'broth.*(?:must|select)|(?:choose|select).*broth',qualification,re.I):note+=' Choose vegetarian broth and sauces.'
    if re.search(r'mains only|mains? alone|included.*(?:sides|miso).*not|sides.*not.*certif',qualification,re.I):note+=' Meat-free labels apply to the mains; ask to omit unconfirmed soup and sides.'
    if public_note is not None:
        assert public_note.startswith('Menu and availability may change.')
        note=public_note
    assert len(note)<=400
    added=[];observations={};seen={}
    for d in dishes:
        name=str(d['Dish']).strip();portion=str(d['Portion'] or '').strip()
        # These retained research labels are not serving sizes.
        if re.search(r'^(?:Vegetarian|Vegan)\s*page\s*\d|^Bento.*section|^Dinner section|^Listed serving|^Listed side|^(?:not\s*stated|unspecified|unknown)$',portion,re.I):portion=''
        if portion:
            portion=portion.split(';')[0].strip()
            if portion.lower() not in name.lower():name+=' ('+portion+')'
        assert 0<len(name)<=300,name
        channel=str(d['Channel'] or '')+' '+str(d.get('Source URL') or '')
        category='Delivery menu' if re.search(r'foodpanda|delivery|deliveroo',channel,re.I) else 'Menu'
        if re.search(r'course in|component|choice\s*within|within.*package',portion,re.I):category='Set-menu choices'
        minimum=re.search(r'^\s*from(?:\b|(?=S\$|SGD))|\bdisplayed\s+(?:SGD\s+)?starting\b|\b(?:from|starting at)\s*(?:SGD|S\$|\$|\d)',str(d['Price qualifier']),re.I)
        price={'amount':d['Amount'],'currency':'SGD' if d['Currency']=='SGD' else 'unknown','type':'from' if minimum else 'displayed'}
        key=json.dumps([name.casefold(),category,price],sort_keys=True)
        if key in seen:observations[seen[key]].append(d['Dish ID']);continue
        iid='mixed-'+hashlib.sha256(d['Dish ID'].encode()).hexdigest()[:18]
        seen[key]=iid;observations[iid]=[d['Dish ID']]
        # V is the merchant's conventional meat-free claim; it confers no app diet badge.
        added.append({'id':iid,'name':name,'category':category,'price':price,'diet':'V','qualifier':note})
    assert added and len(added)<=2000
    return added,observations

def export(t,wb,path,args,batch,selected):
    assert all(r['Kitchen']=='MIXED_KITCHEN' for r in selected)
    mixed=t.records(wb,'Mixed candidates');dishes=t.records(wb,'Mixed dishes')
    ev={r['Evidence ID']:r for r in t.records(wb,'Evidence')}
    content=t.read(args.content);cat=t.read(args.catalogue)
    existing=[x['data'] for x in content['items'] if x['kind']=='place']
    existing += [x['data'] for x in content.get('editorial',{}).get('records',{}).values() if x['kind']=='place']
    existing += cat['veg']['venues']+cat['mixed']['venues']
    creations=[]
    for row in selected:
        pid=row['Location ID'];linked=[r for r in mixed if r['Location ID']==pid]
        primary=next(r for r in linked if r['Candidate ID']==pid)
        assert all(r['Mixed eligibility']=='VERIFIED' and r['Publication status']=='AUTHORIZED' for r in linked)
        data=t.payload(row)
        if 'hours' in data:
            try:data['hours']=publication_hours(data['hours'],row['Hours status'])
            except AssertionError as e:raise AssertionError(pid+': '+str(e)) from e
        assert data['kitchen']=='options' and not data['alliumFreeClaim']
        assert not any(x['id']==pid for x in content['items'])
        assert not any(t.stronger_same(data,x) for x in existing),'Existing/hidden duplicate: '+pid
        assert not any(t.stronger_same(data,x['data']) for x in creations),'Batch duplicate: '+pid
        current=reviewed_dishes([d for d in dishes if d['Candidate ID']==primary['Candidate ID'] and not str(d['Limits']).startswith('SUPERSEDED')],row['Decision notes'])
        qualification=str(row['Menu qualification'] or '')
        prefix='Public menu note: '
        public_note=qualification[len(prefix):] if qualification.startswith(prefix) else None
        added,observation_map=menu_items(current,str(primary['Menu qualification'] or ''),public_note)
        source=[ev[eid] for eid in str(row['Evidence IDs']).splitlines() if ev[eid]['Accepted']]
        assert source
        creations.append({'id':pid,'candidateId':primary['Candidate ID'],'linkedCandidateIds':[r['Candidate ID'] for r in linked],
          'expectedVersion':0,'expectedMenuVersion':0,'action':'create','data':data,
          'menuData':{'added':added,'sourceUrl':row['Menu source']},'dishObservations':observation_map,
          'evidence':[{'evidenceId':x['Evidence ID'],'url':x['URL'],'date':x['Source date'] or x['Access date'],'dateBasis':x['Date basis'],'says':x['Fact supported']} for x in source],
          'reason':'Owner-authorized Mixed Kitchen publication from Excel. '+str(row['Decision notes'] or '')})
    result={'version':2,'scope':'mixed','batchId':args.batch,'ownerAuthorizedPublication':True,'ownerRequest':batch['Owner authorization'],
      'workbook':str(path.relative_to(t.ROOT)),'workbookRevision':t.metadata(wb)['Workbook revision'],'workbookSha256':t.sha(path),
      'reviewedAt':t.now(),'baselineContentSha256':t.sha(args.content),'baselineCatalogueSha256':t.sha(args.catalogue),
      'baselineEditorialRevision':content['editorial']['revision'],'creations':creations,'existingVerified':[],
      'baselineEditorialPlaceHash':hashlib.sha256(json.dumps(editorial_places(content['editorial']),sort_keys=True,separators=(',',':')).encode()).hexdigest(),
      'candidateCount':sum(len(x['linkedCandidateIds']) for x in creations),'googleResearchCoverageComplete':False}
    out=t.Path(args.out);assert not out.exists(),'Immutable packet already exists'
    out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return {'exported':len(creations),'candidateCount':result['candidateCount'],'menuItems':sum(len(x['menuData']['added']) for x in creations),'packet':str(out),'sha256':t.sha(out)}

def record(t,wb,path,args,packet,receipt,proof,after,cat):
    assert t.sha(path)==packet['workbookSha256'],'Workbook changed after export: review before reconciliation'
    assert receipt['applied'] and proof['passed'] and proof['internalExactFieldsVerified']
    assert proof.get('deployedBrowserChecksPassed') and proof.get('clientParserPassed'),'Client and deployed browser verification required'
    assert receipt['reviewedInputSha256']==t.sha(args.packet)==proof['reviewedInputSha256']
    live={v['id']:v for v in cat['mixed']['venues']};items={(r['kind'],r['id']):r for r in after['items']}
    for p in packet['creations']:
        assert p['id'] in live and live[p['id']]['kitchen']=='options'
        for kind,key in [('place','data'),('menu','menuData')]:
            r=items[(kind,p['id'])];assert r['version']==1 and not r['hidden'] and r['origin']=='staff' and r['data']==p[key]
    selected={p['id']:p for p in packet['creations']};checked=proof['checkedAt']
    rows=t.records(wb,'Locations')
    for r in rows:
        if r['Location ID'] in selected:r.update({'Publication status':'PUBLISHED_VERIFIED','Publication verified at':checked,'Live observed at':cat['checkedAt'],'Content version':1,'Live menu entries':len(selected[r['Location ID']]['menuData']['added'])})
    t.replace_sheet(wb,'Locations',t.LOCATION_COLUMNS,rows)
    candidates=t.records(wb,'Mixed candidates');linked={cid for p in selected.values() for cid in p['linkedCandidateIds']}
    for r in candidates:
        if r['Candidate ID'] in linked:r['Publication status']='PUBLISHED_VERIFIED';r['Next action']='Published and live verified under '+packet['batchId']+'. Required Google Search research check remains outstanding; source review batch stays IN_PROGRESS.'
    t.replace_sheet(wb,'Mixed candidates',t.MIXED_COLUMNS,candidates)
    dishids={d for p in selected.values() for ds in p['dishObservations'].values() for d in ds}
    dishes=t.records(wb,'Mixed dishes')
    for d in dishes:
        if d['Dish ID'] in dishids:d['Published']=True
    t.replace_sheet(wb,'Mixed dishes',t.MIXED_DISH_COLUMNS,dishes)
    batches=t.records(wb,'Publication batches')
    for b in batches:
        if b['Batch ID']==packet['batchId']:
            b.update({'Status':'PUBLISHED_VERIFIED','Workbook revision at export':packet['workbookRevision'],'Input SHA256':t.sha(args.packet),'Applied at':receipt['appliedAt'],'Verified at':checked,'Backup reference':receipt['backup']})
            if proof.get('deployedBrowserScope'):b['Notes']=str(b['Notes'] or '')+' Browser verification scope: '+proof['deployedBrowserScope']
    t.replace_sheet(wb,'Publication batches',t.BATCH_COLUMNS,batches)
    events=t.records(wb,'Publication events')
    for pid,p in selected.items():events.append({'Event ID':packet['batchId']+':'+pid,'Batch ID':packet['batchId'],'Location ID':pid,'Action':'CREATED','Expected version':0,'Observed version':1,'Applied at':receipt['appliedAt'],'Verified at':checked,'Receipt reference':str(args.receipt),'Notes':'Place/menu exact fields, complete public inventory and client menu parser verified. Linked candidates: '+', '.join(p['linkedCandidateIds'])+(' Browser scope: '+proof['deployedBrowserScope'] if proof.get('deployedBrowserScope') else '')})
    t.replace_sheet(wb,'Publication events',t.EVENT_COLUMNS,events)
    changes=t.records(wb,'Change log');changes.append({'Change ID':'publication-'+packet['batchId'],'Changed at':t.now(),'Actor':'Codex','Scope':packet['batchId'],'Change':f'{len(selected)} unique Mixed Kitchen listings covering {len(linked)} qualifying candidates published and live verified. Existing records preserved. Google research coverage remains independent.','Evidence / receipt':str(args.receipt)})
    t.replace_sheet(wb,'Change log',t.CHANGE_COLUMNS,changes)
    t.setmeta(wb,'Workbook revision',packet['batchId']+'-published');t.setmeta(wb,'Last live verification',checked)
    eligible=[r for r in candidates if r['Mixed eligibility']=='VERIFIED']
    live_ids={v['id'] for k in ['veg','mixed'] for v in cat[k]['venues']}
    for key,value in {
        'Mixed current eligible candidates':len(eligible),
        'Mixed current distinct eligible canonical/candidate keys':len({r['Location ID'] or r['Candidate ID'] for r in eligible}),
        'Mixed eligible unique observed live kitchens':len({r['Location ID'] for r in eligible if r['Location ID'] in live_ids}),
        'Mixed eligible candidate publication states':json.dumps(dict(Counter(r['Publication status'] for r in eligible))),
        'Last public Mixed catalogue observation':cat['checkedAt'],
        'Last public Mixed catalogue revision':cat['mixed']['revision'],
        'Last public Mixed catalogue evidence':str(args.catalogue),
        'Mixed verification continuation':f"Owner-authorized publication {packet['batchId']} verified: {len(selected)} unique new kitchens covering {len(linked)} candidate records. Preliminary source reviews, Google completion and field gaps remain independent.",
    }.items():t.setmeta(wb,key,value)
    for label,column in [('Mixed candidate menu states','Menu status'),('Mixed candidate cover states','Cover status'),('Mixed candidate hours states','Hours status')]:t.setmeta(wb,label,json.dumps(dict(Counter(r[column] for r in candidates))))
    t.validate(wb);t.save(wb,path)
    saved=t.openpyxl.load_workbook(path)
    try:return t.validate(saved)
    finally:saved.close()
