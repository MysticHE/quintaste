"""Hide the reviewed duplicate Explore places of 24 October 2026, keeping the packaged record of each pair.

Default: validate inside a rolled-back transaction. --apply commits.
Each duplicate becomes a hidden content.item place (reversible in Admin > Content); nothing is deleted.
Stores protected before-images, the reviewed input, a guarded forward rollback and the transaction result.
Never changes schema, member data, packaged files or bot state.
"""
import argparse, base64, hashlib, json
from pathlib import Path
import paramiko

REPO=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply',action='store_true')
args=parser.parse_args()
raw=(REPO/'data/menu-research/duplicate-merge-2026-10-24/review.json').read_bytes()
b=json.loads(raw);b['reviewedInputSha256']=hashlib.sha256(raw).hexdigest()
merges=b['merges']
assert len(merges)==12 and len({m['retire'] for m in merges})==12 and not {m['keep'] for m in merges}&{m['retire'] for m in merges}
for m in merges:
 assert m['source'] in {'staff','bot'} and m['retire'].startswith('staff-' if m['source']=='staff' else 'vk-') and len(m['reason'])>40

payload=base64.b64encode(json.dumps(b,ensure_ascii=False).encode()).decode()
code=r'''
import base64,datetime as dt,json,pathlib,subprocess
b=json.loads(base64.b64decode(PAYLOAD));apply=APPLY
root=pathlib.Path('/docker/quintaste');stamp=dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup=root/'state/content-backups'/('duplicate-merge-'+stamp+('-apply' if apply else '-dry'))
backup.mkdir(mode=0o700,parents=True)
def save(name,text):
 p=backup/name;p.write_text(text);p.chmod(0o600)
q=lambda s:"'"+str(s).replace("'","''")+"'"
j=lambda v:q(json.dumps(v,ensure_ascii=False))+'::jsonb'
ids=[m['keep'] for m in b['merges']]+[m['retire'] for m in b['merges']]
keys=','.join(q(i) for i in ids)
cmd=['docker','exec','-i','quintaste-staging-db-1','psql','-X','-U','quintaste','-d','quintaste','-v','ON_ERROR_STOP=1']
before=subprocess.run(cmd+['-At','-c',"SELECT coalesce(json_agg(t),'[]'::json)::text FROM (SELECT * FROM content.item WHERE kind='place' AND id IN ("+keys+")) t"],capture_output=True,text=True,check=True).stdout
save('rows-before.json',before);save('reviewed-input.json',json.dumps(b,ensure_ascii=False,indent=2))
prior={x['id']:x for x in json.loads(before)}
rollback=['BEGIN;',"SET LOCAL lock_timeout='5s';","SELECT pg_advisory_xact_lock(hashtext('qt-duplicate-merge-20261024'));"]
sql=rollback.copy()
for m in b['merges']:
 keep,old,id=prior.get(m['keep']),prior.get(m['retire']),m['retire']
 assert not (keep or {}).get('hidden',False),'Kept place is hidden: '+m['keep']
 if m['source']=='staff': assert old and old['origin']=='staff','Duplicate is not a staff-created place: '+id
 assert not (old or {}).get('hidden',False),'Duplicate already hidden: '+id
 ver=old['version'] if old else 0
 if old:
  mutation="UPDATE content.item SET hidden=true,version=version+1,updated_at=now() WHERE kind='place' AND id="+q(id)+' AND version='+str(ver)+' AND NOT hidden;'
 else:
  mutation="INSERT INTO content.item(kind,id,origin,hidden,data) VALUES('place',"+q(id)+",'edit',true,'{}'::jsonb);"
 sql.append('DO $qt$ BEGIN '+mutation+' IF NOT FOUND THEN RAISE EXCEPTION '+q('Concurrent change place:'+id)+'; END IF; END $qt$;')
 details={'appliedBy':'Claude','ownerRequest':b['ownerRequest'],'keptId':m['keep'],'expectedVersion':ver,'reviewedInputSha256':b['reviewedInputSha256'],'backup':str(backup)}
 sql.append("INSERT INTO staff.audit(actor_id,action,target,reason,details) VALUES(NULL,'content.place.hide',"+q('place:'+id)+','+q('Duplicate of '+m['keep']+'. '+m['reason'])+','+j(details)+');')
 # Forward recovery: show the duplicate again with a new version, never delete rows or overwrite later edits.
 rollback.append("DO $qt$ BEGIN UPDATE content.item SET hidden=false,version=version+1,updated_at=now() WHERE kind='place' AND id="+q(id)+' AND version='+str(ver+1)+' AND hidden; IF NOT FOUND THEN RAISE EXCEPTION '+q('Later edit prevents rollback place:'+id)+'; END IF; END $qt$;')
 rollback.append("INSERT INTO staff.audit(actor_id,action,target,reason,details) VALUES(NULL,'content.place.restore',"+q('place:'+id)+','+q('Forward recovery of the 24 Oct duplicate merge')+','+j({'backup':str(backup),'expectedVersion':ver+1})+');')
rollback.append('COMMIT;');save('rollback-merge.sql','\n'.join(rollback))
retired=','.join(q(m['retire']) for m in b['merges'])
sql.append("SELECT json_build_object('hidden',count(*) FILTER (WHERE hidden),'rows',count(*)) FROM content.item WHERE kind='place' AND id IN ("+retired+");")
sql.append('COMMIT;' if apply else 'ROLLBACK;')
run=subprocess.run(cmd,input='\n'.join(sql),capture_output=True,text=True)
save('result.txt',run.stdout+run.stderr)
if run.returncode:raise RuntimeError(run.stderr[-1800:])
print(json.dumps({'applied':apply,'merges':len(b['merges']),'reviewedInputSha256':b['reviewedInputSha256'],'backup':str(backup),'rollbackSql':str(backup/'rollback-merge.sql'),'transaction':run.stdout[-600:]}))
'''.replace('PAYLOAD',repr(payload)).replace('APPLY',repr(args.apply))
ssh=paramiko.SSHClient();ssh.load_system_host_keys()
ssh.connect('srv1902914.hstgr.cloud',username='root',key_filename=str(Path.home()/'.ssh/id_ed25519'),timeout=20)
try:
 stdin,out,err=ssh.exec_command('python3 -',timeout=90);stdin.write(code);stdin.channel.shutdown_write()
 text=out.read().decode();error=err.read().decode()
 if out.channel.recv_exit_status():raise RuntimeError(error)
 result=json.loads(text);outdir=REPO/'.local/duplicate-merge';outdir.mkdir(parents=True,exist_ok=True)
 (outdir/('merge-result.json' if args.apply else 'merge-dry-run.json')).write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
finally:ssh.close()
