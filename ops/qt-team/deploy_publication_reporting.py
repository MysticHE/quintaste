"""Guarded reporter-only release. No app, research, credentials or delivery-state reset.

Run after committing and pushing: python deploy_publication_reporting.py --base <parent-commit>
The base must be the reviewed version currently on the VPS. Live tests run before the listener resumes.
"""
import argparse
import base64
import hashlib
import subprocess
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['telegram_reporter.py', 'test_publication_delivery.py', 'test_telegram_reporter.py']
TESTS = ['test_workflow', 'test_publisher', 'test_telegram_reporter', 'test_learning', 'test_night_controls',
         'test_recipe_policy', 'test_publication_delivery', 'test_menu_coverage', 'test_outlet_capture', 'test_gamer']
CODE = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime
r=pathlib.Path('/opt/data/qt-team');payload=__PAYLOAD__;base=__BASE__
with (r/'state/run.lock').open('a+') as work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(report,fcntl.LOCK_EX|fcntl.LOCK_NB)
 for n,data in payload.items():
  raw=base64.b64decode(data);compile(raw,n,'exec')
  assert hashlib.sha256((r/n).read_bytes()).hexdigest() in base[n]+[hashlib.sha256(raw).hexdigest()],'Concurrent live change: '+n
 backup=r/('operator-tests/publication-reporting-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 for n in payload:(backup/n).write_bytes((r/n).read_bytes())
 protected=['policy.json','baseline.json','state/checkpoint.json','state/usage.jsonl','state/latest-publication.json','state/publication-outcomes.json','state/telegram/state.json']
 before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix('.report-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  test=subprocess.run(['python','-m','unittest']+__TESTS__,cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr)
  assert test.returncode==0,'Remote tests failed; code restored'
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected},'Protected state changed'
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.report-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n;tmp=p.with_suffix('.restore');tmp.write_bytes((backup/n).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  tmp=marker.with_suffix('.restore');tmp.write_bytes((backup/'night-release.json').read_bytes());tmp.chmod(0o444);os.replace(tmp,marker)
  raise
 result={'status':'deployed','files':list(payload),'hashes':{n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload},
         'tests':[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))],
         'protectedUnchanged':True,'backup':str(backup),'at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 (backup/'release.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
'''


def build(base):
    payload = {}
    bases = {}
    for name in NAMES:
        raw = (HERE / name).read_bytes().replace(b'\r\n', b'\n')
        committed = subprocess.check_output(['git', 'show', 'HEAD:ops/qt-team/' + name], cwd=HERE).replace(b'\r\n', b'\n')
        if raw != committed:
            raise SystemExit('Uncommitted release file: ' + name)
        prior = subprocess.check_output(['git', 'show', base + ':ops/qt-team/' + name], cwd=HERE).replace(b'\r\n', b'\n')
        bases[name] = [hashlib.sha256(prior).hexdigest(), hashlib.sha256(prior.replace(b'\n', b'\r\n')).hexdigest()]
        payload[name] = base64.b64encode(raw).decode()
    return CODE.replace('__PAYLOAD__', repr(payload)).replace('__BASE__', repr(bases)).replace('__TESTS__', repr(TESTS))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', required=True)
    args = parser.parse_args()
    code = build(args.base)
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener paused for reporter reload')"))
    try:
        print(setup.remote_container(code, 'root', timeout=55))
    finally:
        print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
