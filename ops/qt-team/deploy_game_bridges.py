"""Owner request 22 Oct 2026: put QT Gamer's two app bridges on the VPS for the Rush Hour Recipe Kitchen.

game_level_bridge.py shapes recipe levels the app's level worker drafts (`/api/game-levels/bot/*`); game_art_bridge.py draws the
pictures a level is missing (`/api/game-art/bot/*`). Both sign with the publisher key and publish nothing: staff review every
level and the artist approves every picture.

Guarded like deploy_videomaker.py: run lock, release-hash check, backup, atomic replace, import check as the hermes user,
automatic restore on failure. Refreshes the qt-gamer profile's SOUL from roles/qt-gamer.md (level shaping added 22 Oct).
Installs no service: run a bridge once with `python game_level_bridge.py --once` (or `game_art_bridge.py --once`) inside the
Hermes container as uid 10000; a long-running service is the owner's decision.
"""
import base64
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
# gamer/generate.py: the art bridge runs it with --manifest (one picture per job) and extra reference images; QT Gamer's own runs
# keep working unchanged (the manifest defaults to assets.json).
NAMES = ['game_level_bridge.py', 'game_art_bridge.py', 'app_signing.py', 'roles/qt-gamer.md', 'gamer/generate.py']  # app_signing.py: shared signer
payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}

code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time,io
from ruamel.yaml import YAML
_y=YAML(typ='safe')
def yload(text):return _y.load(io.StringIO(text))
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD;PY='/opt/hermes/.venv/bin/python'
for attempt in range(600):  # the team's 15-minute cycle can hold this lock for most of each cycle; wait up to 40 minutes
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work:
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/game-bridges-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 from hermes_cli.profiles import get_profile_dir
 profile=get_profile_dir('qt-gamer')
 assert profile.exists(),'qt-gamer profile missing; deploy QT Gamer first'
 meta=yload((profile/'profile.yaml').read_text()) or {}
 assert meta.get('display_name')=='QT Gamer','Unexpected qt-gamer profile; refusing'
 created=[]
 for n,data in payload.items():
  p=r/n
  if n.endswith('.py'):compile(base64.b64decode(data),n,'exec')
  if n in release['hashes'] and p.exists():assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  (backup/n.replace('/','__')).write_bytes(p.read_bytes()) if p.exists() else created.append(n)
 soul=profile/'SOUL.md'
 if soul.exists():(backup/'qt-gamer.SOUL.md').write_bytes(soul.read_bytes())
 try:
  for n,data in payload.items():
   p=r/n;p.parent.mkdir(parents=True,exist_ok=True)
   tmp=p.with_suffix(p.suffix+'.gb-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  tmp=soul.with_suffix('.gb-new');tmp.write_bytes((r/'roles/qt-gamer.md').read_bytes());os.chown(tmp,10000,10000);os.replace(tmp,soul)
  gen=subprocess.run([PY,'gamer/generate.py','--help'],cwd=r,capture_output=True,text=True,user=10000,group=10000,env={**os.environ,'HERMES_SRC':'/opt/hermes','HERMES_HOME':'/opt/data'})
  assert '--manifest' in gen.stdout,'generate.py check failed: '+gen.stderr[-300:]
  for mod in ('game_level_bridge','game_art_bridge'):
   imported=subprocess.run([PY,'-c','import '+mod+';print("ok")'],cwd=r,capture_output=True,text=True,user=10000,group=10000)
   assert imported.stdout.strip()=='ok','Import check failed for '+mod+': '+imported.stderr[-300:]
  assert (r/'private/publisher.key').exists(),'publisher key missing'
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.gb-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n
   if n in created:p.unlink(missing_ok=True);continue
   tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n.replace('/','__')).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  if (backup/'qt-gamer.SOUL.md').exists():soul.write_bytes((backup/'qt-gamer.SOUL.md').read_bytes())
  raise
 print(json.dumps({'files':list(payload),'created':created,'backup':str(backup)}))
'''.replace('PAYLOAD', repr(payload))

if __name__ == '__main__':
    print(setup.remote_container(code, 'root'))
