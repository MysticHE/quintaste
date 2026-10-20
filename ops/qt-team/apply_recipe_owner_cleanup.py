"""Owner-requested cleanup through the same exact-record immediate-delete handler."""
import json
import setup

CODE=r'''
import pathlib,json,sys,fcntl,time
r=pathlib.Path('/opt/data/qt-team');sys.path.insert(0,str(r))
active=json.loads((r/'operator-tests/active.json').read_text());d=r/'operator-tests'/active['id']
until=time.time()+900
while not (d/'recipe-controls.json').exists():
 if time.time()>until:raise RuntimeError('Recipe control deployment not ready')
 time.sleep(2)
import workflow as w,publisher as p,telegram_controls as c,telegram_reporter as t
with (r/'state/run.lock').open('a+') as work,(t.STATE/'reporter.lock').open('a+') as report:
 fcntl.flock(work,fcntl.LOCK_EX);fcntl.flock(report,fcntl.LOCK_EX)
 state=t.read(t.STATE/'state.json');config=t.read(r/'private/telegram-chat.json')
 live=p.request('GET','/control/state');before=live['revision'];removed=[]
 for rid in ['garlic-chive-eggs','tomato-egg-stir-fry']:
  row=next((x for x in live['records'] if x['kind']=='recipe' and x['id']==rid),None)
  if row is None:continue
  buttons=c.photo_buttons(state,'recipe',rid,live);data=buttons[0][1]['callback_data']
  token=data.split(':')[1]
  # This is an operator execution authorised in the owner's Codex message,
  # not a fabricated Telegram update or a claim that the owner tapped a button.
  c.callback(state,data,'owner-rule-cleanup-'+rid)
  assert state['moderation'][token]['stage']=='done','Removal not verified'
  removed.append({'id':rid,'name':row['data']['name'],'actionId':state['moderation'][token]['actionId']})
  t.write(t.STATE/'state.json',state);time.sleep(1.1)
  live=p.request('GET','/control/state')
 proof={'at':w.now(),'authority':'Owner five-pungent correction in Codex; operator invoked the production one-click handler','beforeRevision':before,'afterRevision':live['revision'],'removed':removed}
 w.write(d/'owner-policy-removals.json',proof)
 # Retrofit verified old screenshots using recorded caption URLs/titles, never guess.
 edits=[]
 for key,item in state['deliveries'].items():
  if item.get('photo') and item.get('messageId') and item['status']=='sent':
   kind,rid=c.photo_identity({'caption':item['text']},live)
   if kind:
    buttons=c.photo_buttons(state,kind,rid,live)
    t.write(t.STATE/'state.json',state)
    answer=t.telegram('editMessageReplyMarkup',{'chat_id':config['chatId'],'message_id':item['messageId'],'reply_markup':{'inline_keyboard':buttons}})
    edits.append({'messageId':item['messageId'],'kind':kind,'id':rid,'buttonReturned':bool(answer.get('reply_markup',{}).get('inline_keyboard'))})
   elif any('/cook/recipe/'+v['id'] in item['text'] for v in removed):
    caption='Removed from QuinTaste: contains a five-pungent ingredient.\n'+t.singapore_time()+'\nThis is a historical screenshot, not a currently available recipe.'
    t.telegram('editMessageCaption',{'chat_id':config['chatId'],'message_id':item['messageId'],'caption':caption,'reply_markup':{'inline_keyboard':[]}})
    item['text']=caption
 t.enqueue(state,'owner-five-pungent-policy','QT Manager — recipe rule updated\nRecipes containing the five pungent vegetables are excluded. Garlic-chive eggs and the garlic-containing tomato-and-egg recipe were removed.\nRecipe/event screenshots now include Delete now: one selection removes the linked item and prevents automatic republication. Cached app screens can take up to 15 minutes to refresh online.')
 t.write(t.STATE/'state.json',state)
 proof['retrofitted']=edits;w.write(d/'owner-policy-removals.json',proof);print(json.dumps(proof),flush=True)
'''

if __name__=='__main__':
    import base64
    print(setup.remote_container("""
import pathlib,json,subprocess,base64
r=pathlib.Path('/opt/data/qt-team');a=json.loads((r/'operator-tests/active.json').read_text());d=r/'operator-tests'/a['id'];p=d/'owner-cleanup.py'
assert not p.exists();p.write_bytes(base64.b64decode(PAYLOAD));p.chmod(0o400)
with (d/'owner-cleanup.log').open('w') as log:
 child=subprocess.Popen(['python',str(p)],stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
print(json.dumps({'cleanupQueuedPid':child.pid}))
""".replace('PAYLOAD',repr(base64.b64encode(CODE.encode()).decode()))))
