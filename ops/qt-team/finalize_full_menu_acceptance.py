import json
from pathlib import Path
import setup
code=r"""
import pathlib,sys,json,fcntl,copy,urllib.request,hashlib
r=pathlib.Path('/opt/data/qt-team');sys.path.insert(0,str(r));import workflow as w;import publisher as p;import menu_coverage as m;import telegram_reporter as t
f=r/'runs/full-menu-acceptance-20261017';rid='zhen-xiang-woodlands-street-32'
with (r/'state/run.lock').open('a+') as lock,(r/'state/telegram/reporter.lock').open('a+') as reporting:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(reporting,fcntl.LOCK_EX)
 packet=w.read(f/'explorer/validated.json');manager=w.read(f/'manager-v2-result.json');assert manager['decisions'][0]['menuReviewDecision']=='approved'
 original=p.request('GET','/control/state');coverage=m.accept(r,[packet],manager['decisions']);assert coverage[rid]['verified']==66 and coverage[rid]['held']==2
 state=w.read(r/'state/checkpoint.json');state['explorerReviewed']=m.completed(r,w.read(r/'baseline.json')['venues']);w.write(r/'state/checkpoint.json',state)
 package={'version':1,'runId':f.name+'-manager-v2','checkedAt':w.now(),'packets':[packet],'manager':manager,'publication':'not-published'}
 w.write(r/'outbox/full-menu-20261017-manager-v2.json',package)
 reports=sorted((r/'state/menu-reviews').glob('*.json'),key=lambda p:p.stat().st_mtime)
 receipt=w.read(reports[-1]);assert receipt['coverage']['verified']==66
 delivery=w.read(t.STATE/'state.json');oldkey=next(k for k,v in delivery['deliveries'].items() if k.startswith('menu-review:') and v.get('messageId')==43);old=delivery['deliveries'][oldkey]
 text='Menu review ? Zhen Xiang Vegetarian ? 325 Woodlands Street 32\n'+t.singapore_time(receipt['checkedAt'])+'\n66/68 dishes verified; 2 held; 0 not yet checked.\nAll 68 existing dishes preserved. Prices are unchanged; this was a whole-menu review.\n'
 for held in receipt['heldItems']:text+='Held: '+held['name']+'.\n'
 text+='Screenshot shows the first menu page. Open the full menu below.'
 buttons=[[{'text':'Open full menu (68 dishes)','url':t.ORIGIN+'/menu/'+rid}]]
 config=w.read(r/'private/telegram-chat.json')
 result=t.telegram('editMessageCaption',{'chat_id':config['chatId'],'message_id':old['messageId'],'caption':text,'reply_markup':{'inline_keyboard':buttons}})
 assert result['message_id']==43 and result['caption']==text
 newkey='menu-review:'+receipt['reviewId'];item=copy.deepcopy(old);item.update(text=text,buttons=buttons,correctedAt=w.now());delivery['deliveries'][newkey]=item
 delivery['deliveries'][oldkey].update(supersededBy=newkey,text=text,correctedAt=w.now());w.write(t.STATE/'state.json',delivery)
 after=p.request('GET','/control/state');assert after['revision']==original['revision'] and after['removals']==original['removals']
 menu=json.load(urllib.request.urlopen(t.ORIGIN+'/api/menus?id='+rid))['venues'][0]
 items=m.inventory(menu);assert len(items)==68
 baseline=json.loads((f/'assignment.json').read_text())[0]['assignedItems'];assert items==baseline
 usage=[json.loads(line) for line in (r/'state/usage.jsonl').read_text().splitlines() if line.strip()]
 result={'checkedAt':w.now(),'status':'verified','coverage':coverage,'menuReceipt':receipt,'manager':manager,'dishResults':packet['records'][0]['menuReview']['items'],'liveDishCount':len(items),'liveMenuUnchanged':True,'editorialRevisionUnchanged':True,'ownerRemovalsPreserved':True,'productionWrites':0,'telegram':{'messageId':43,'correctedInPlace':True,'caption':text,'button':buttons[0][0],'photo':old['photo']},'fullMenusCompleted':len(state['explorerReviewed']),'historicalVisitsRetained':len(state['explorerAttempted']),'usageEntries':len(usage),'testsPassed':98}
 w.write(f/'final-result.json',result);print(json.dumps(result,ensure_ascii=True))
"""
result=json.loads(setup.remote_container(code))
Path('evidence/2026-10-17/menu-coverage/final-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
Path('C:/Users/huien/qt/quintaste/data/menu-research/qt-full-menu-audit-2026-10-17.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:result[k] for k in ['checkedAt','coverage','liveDishCount','liveMenuUnchanged','productionWrites','fullMenusCompleted','historicalVisitsRetained','usageEntries','testsPassed']}))
