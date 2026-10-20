"""Deploy the bounded learning layer without changing budgets or live app data."""
import base64
import json
from pathlib import Path

import setup

HERE = Path(__file__).resolve().parent
FILES = ['learning.py', 'learning-policy.json', 'test_learning.py', 'workflow.py', 'telegram_reporter.py']
EXPECTED = {'workflow.py': 'b1de389cdb33db768f9ed480af8247f709c7862b227c432b3d81405a92179b4e',
            'telegram_reporter.py': '1c78e5d69227232bfe6d810cc8b511347b57ab5e9456178ee58a2c7ffaabb8df'}


def deploy():
    payload = {name: base64.b64encode((HERE / name).read_bytes()).decode() for name in FILES}
    code = r'''
import pathlib,json,base64,hashlib,os,datetime,fcntl
root=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD;expected=EXPECTED
marker=root/'learning-release.json';previous=json.loads(marker.read_text()) if marker.exists() else {}
protected=['policy.json','publisher.py','baseline.json','state/checkpoint.json','state/usage.jsonl','state/latest-report.json','state/latest-publication.json']
with (root/'state/run.lock').open('a+') as research_lock, (root/'state/telegram/reporter.lock').open('a+') as report_lock:
 fcntl.flock(research_lock,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(report_lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 before={n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in protected}
 decoded={n:base64.b64decode(v) for n,v in payload.items()}
 for name,content in decoded.items():
  p=root/name
  if p.exists():
   live=hashlib.sha256(p.read_bytes()).hexdigest()
   allowed={expected.get(name),previous.get('hashes',{}).get(name),hashlib.sha256(content).hexdigest()}
   if live not in allowed:raise RuntimeError('Concurrent/unexpected modification: '+name)
  if name.endswith('.py'):compile(content,name,'exec')
 backup=root/'telegram-runtime/backups'/('learning-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
 backup.mkdir(parents=True,exist_ok=True)
 for name,content in decoded.items():
  p=root/name
  if p.exists():(backup/name).write_bytes(p.read_bytes())
  tmp=p.with_suffix('.new');tmp.write_bytes(content);tmp.chmod(0o444);os.replace(tmp,p)
 after={n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in protected}
 assert before==after
 receipt={'deployedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'backup':str(backup),'hashes':{n:hashlib.sha256(c).hexdigest() for n,c in decoded.items()},'protected':after}
 marker.write_text(json.dumps(receipt,indent=2));marker.chmod(0o444)
 print(json.dumps(receipt))
'''.replace('PAYLOAD', repr(payload)).replace('EXPECTED', repr(EXPECTED))
    receipt = json.loads(setup.remote_container(code, 'root'))
    dest = HERE / 'evidence/2026-10-17/learning'
    dest.mkdir(parents=True, exist_ok=True)
    (dest / 'deployment.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(json.dumps({'deployed': list(receipt['hashes']), 'backup': receipt['backup'], 'protectedUnchanged': True}))


if __name__ == '__main__':
    deploy()
