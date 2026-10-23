"""Publish the evidence-reviewed 23 October Explore bundle.

Default: validate inside a rolled-back transaction. --apply commits.
Stores protected before-images, the reviewed input, a guarded forward rollback
and the transaction result. Never changes schema, member data or bot state.
"""
import argparse, base64, hashlib, json, shlex
from pathlib import Path
import paramiko

REPO=Path(__file__).resolve().parents[1]
EXPECTED_SHA='5ada1adf8a9d922ea71fe86f770bd1ca08a9dd4c250773996f5b60c9f6abdb9c'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply',action='store_true')
args=parser.parse_args()
root=REPO/'data/menu-research/explore-completion-2026-10-23'
b=json.loads((root/'publication.json').read_text(encoding='utf-8'))
assert b['ownerAuthorizedPublication'] and b['reviewedInputSha256']==EXPECTED_SHA
assert b['stagedBatches']==list(range(21,40)) and len(b['patches'])==65 and len(b['assets'])==21
original={'stagedOnly':True,'patches':b['patches'],'assets':[{**a,'file':'assets/'+a['sha256']+'.jpg'} for a in b['assets']]}
assert hashlib.sha256(json.dumps(original,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()==EXPECTED_SHA
assert len({(p['kind'],p['id']) for p in b['patches']})==65
identities={}
for name in ['identity-review-a2b-clive.json','identity-review-newgreen-chinese.json','identity-review-a2b-dickson.json']:
 item=json.loads((root/name).read_text(encoding='utf-8'));identities[item['id']]=item
evergreen=json.loads((root/'source-review-evergreen.json').read_text(encoding='utf-8'))
for p in b['patches']:
 assert isinstance(p['expectedVersion'],int) and p['expectedVersion']>=0 and len(p['reason'])>40
 if p['kind']=='place':
  assert set(p['patch'])<= {'hours','photo','address','postalCode','sourceUrl'}
  if 'address' in p['patch']:
   proof=identities[p['id']]
   assert p['reviewKind']=='merchant-address-correction'
   assert p['patch']['address']==proof['newAddress'] and p['patch']['postalCode']==proof['newPostalCode']
   assert p['patch']['sourceUrl'] in {'https://aabsweets.com.sg/contact','https://take.app/newgreenpasture'}
  elif 'sourceUrl' in p['patch']:
   assert p['id']==evergreen['id'] and p['patch']['sourceUrl']==evergreen['newSourceUrl']
  if h:=p['patch'].get('hours'):
   assert len(h['summary'])<=120 and len(h['notes'])<=500 and 0<len(h['schedule'])<=8
 else:
  assert p['kind']=='menu' and set(p['patch'])=={'sourceUrl','added'} and 0<len(p['patch']['added'])<=2000
  assert p['patch']['sourceUrl'].startswith('https://')
  assert len({i['id'] for i in p['patch']['added']})==len(p['patch']['added'])
  for item in p['patch']['added']:
   assert 0<len(item['name'])<=300 and item['price']['type'] in {'displayed','from','range','per-weight','market','unknown'}
   assert isinstance(item.get('qualifier'),str)
for a in b['assets']:
 path=(REPO/a['file']).resolve();assert path.is_relative_to(root/'assets')
 raw=path.read_bytes();assert len(raw)==a['bytes']<700000 and hashlib.sha256(raw).hexdigest()==a['sha256']
 assert a['width']==960 and a['height']==720
 a['base64']=base64.b64encode(raw).decode()

payload=base64.b64encode(json.dumps(b,ensure_ascii=False).encode()).decode()
code=r'''
import base64,datetime as dt,hashlib,json,pathlib,subprocess
b=json.loads(base64.b64decode(PAYLOAD));apply=APPLY
root=pathlib.Path('/docker/quintaste');stamp=dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup=root/'state/content-backups'/('explore-batches21-39-'+stamp+('-apply' if apply else '-dry'))
backup.mkdir(mode=0o700,parents=True)
def save(name,text):
 p=backup/name;p.write_text(text);p.chmod(0o600)
q=lambda s:"'"+str(s).replace("'","''")+"'"
j=lambda v:q(json.dumps(v,ensure_ascii=False))+'::jsonb'
keys=','.join('('+q(p['kind'])+','+q(p['id'])+')' for p in b['patches'])
cmd=['docker','exec','-i','quintaste-staging-db-1','psql','-X','-U','quintaste','-d','quintaste','-v','ON_ERROR_STOP=1']
before=subprocess.run(cmd+['-At','-c',"SELECT coalesce(json_agg(t),'[]'::json)::text FROM (SELECT * FROM content.item WHERE (kind,id) IN ("+keys+")) t"],capture_output=True,text=True,check=True).stdout
save('rows-before.json',before);save('reviewed-batch.json',json.dumps({k:v for k,v in b.items() if k!='assets'},ensure_ascii=False,indent=2))
prior={(x['kind'],x['id']):x for x in json.loads(before)}
rollback=['BEGIN;',"SET LOCAL lock_timeout='5s';","SELECT pg_advisory_xact_lock(hashtext('qt-explore-completion-20261023'));"]
sql=rollback.copy()
for a in b['assets']:
 raw=base64.b64decode(a['base64']);assert hashlib.sha256(raw).hexdigest()==a['sha256']
 sql.append('INSERT INTO content.asset(sha256,bytes,width,height) VALUES('+','.join([q(a['sha256']),"decode("+q(a['base64'])+",'base64')",str(a['width']),str(a['height'])])+') ON CONFLICT(sha256) DO NOTHING;')
for p in b['patches']:
 kind,id,ver,patch=p['kind'],p['id'],p['expectedVersion'],p['patch'];old=prior.get((kind,id))
 assert (old['version'] if old else 0)==ver and not (old or {}).get('hidden',False),'Before-image version changed: '+id
 cond='kind='+q(kind)+' AND id='+q(id)
 if ver:
  mutation='UPDATE content.item SET data=data || '+j(patch)+',version=version+1,updated_at=now() WHERE '+cond+' AND version='+str(ver)+' AND NOT hidden;'
 else:
  mutation='INSERT INTO content.item(kind,id,origin,hidden,data) VALUES('+','.join([q(kind),q(id),q('edit'),'false',j(patch)])+');'
 sql.append('DO $qt$ BEGIN '+mutation+' IF NOT FOUND THEN RAISE EXCEPTION '+q('Concurrent/hidden change '+kind+':'+id)+'; END IF; END $qt$;')
 details={'appliedBy':'Codex','ownerRequest':'Publish reviewed Explore batches21-39 and covers after accepting documented unavailable menus','fields':list(patch),'expectedVersion':ver,'reviewedInputSha256':b['reviewedInputSha256'],'backup':str(backup),'after':patch}
 sql.append('INSERT INTO staff.audit(actor_id,action,target,reason,details) VALUES(NULL,'+q('content.'+kind+'.edit')+','+q(kind+':'+id)+','+q(p['reason'])+','+j(details)+');')
 restore=('data='+j(old['data'])+',hidden='+str(old['hidden']).lower()) if old else 'hidden=true'
 # Forward recovery: restore prior content with a new version, never delete new rows or overwrite later edits.
 rollback.append('DO $qt$ BEGIN UPDATE content.item SET '+restore+',version=version+1,updated_at=now() WHERE '+cond+' AND version='+str(ver+1)+'; IF NOT FOUND THEN RAISE EXCEPTION '+q('Later edit prevents rollback '+kind+':'+id)+'; END IF; END $qt$;')
 rollback.append('INSERT INTO staff.audit(actor_id,action,target,reason,details) VALUES(NULL,'+q('content.'+kind+'.edit')+','+q(kind+':'+id)+','+q('Forward recovery of reviewed Explore batch21-39')+','+j({'backup':str(backup),'expectedVersion':ver+1})+');')
rollback.append('COMMIT;');save('rollback-reviewed.sql','\n'.join(rollback))
sql.append("SELECT json_build_object('rows',count(*),'menuDishes',coalesce(sum(CASE WHEN kind='menu' THEN jsonb_array_length(coalesce(data->'added','[]'::jsonb)) ELSE 0 END),0)) FROM content.item WHERE (kind,id) IN ("+keys+");")
sql.append('COMMIT;' if apply else 'ROLLBACK;')
run=subprocess.run(cmd,input='\n'.join(sql),capture_output=True,text=True)
save('result.txt',run.stdout+run.stderr)
if run.returncode:raise RuntimeError(run.stderr[-1800:])
print(json.dumps({'applied':apply,'patches':len(b['patches']),'assets':len(b['assets']),'reviewedInputSha256':b['reviewedInputSha256'],'backup':str(backup),'rollbackSql':str(backup/'rollback-reviewed.sql'),'transaction':run.stdout[-800:]}))
'''.replace('PAYLOAD',repr(payload)).replace('APPLY',repr(args.apply))
ssh=paramiko.SSHClient();ssh.load_system_host_keys()
ssh.connect('srv1902914.hstgr.cloud',username='root',key_filename=str(Path.home()/'.ssh/id_ed25519'),timeout=20)
try:
 stdin,out,err=ssh.exec_command('python3 -',timeout=90);stdin.write(code);stdin.channel.shutdown_write()
 text=out.read().decode();error=err.read().decode()
 if out.channel.recv_exit_status():raise RuntimeError(error)
 result=json.loads(text);outdir=REPO/'.local/explore-completion/staged';outdir.mkdir(parents=True,exist_ok=True)
 (outdir/('publication-result.json' if args.apply else 'publication-dry-run.json')).write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
finally:ssh.close()
