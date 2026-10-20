"""Deploy only the owner-authorised QT reporter; no credentials in this file.

Install isolated playwright==1.62.0 and chromium --only-shell first. Pairing and
token provisioning are separate operator actions, never committed to this repo.
"""
import argparse
import base64
import json
from pathlib import Path

import setup

HERE = Path(__file__).resolve().parent


def deploy():
    payload = {name: base64.b64encode((HERE / name).read_bytes()).decode()
               for name in ['telegram_reporter.py', 'test_telegram_reporter.py']}
    code = """
import pathlib,base64,json,datetime,os,hashlib
root=pathlib.Path('/opt/data/qt-team')
protected=['policy.json','workflow.py','publisher.py','baseline.json','state/checkpoint.json','state/usage.jsonl']
before={n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in protected}
backup=pathlib.Path('/opt/data/qt-team/telegram-runtime/backups')/datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup.mkdir(parents=True,exist_ok=True)
for name,data in PAYLOAD.items():
 p=root/name
 if p.exists():(backup/name).write_bytes(p.read_bytes())
 tmp=p.with_suffix('.new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
wrapper=pathlib.Path('/opt/data/profiles/qt-manager/scripts/qt-telegram-report.py')
if wrapper.exists():(backup/'wrapper.py').write_bytes(wrapper.read_bytes())
wrapper.write_text("import os,subprocess\\nenv=dict(os.environ,PLAYWRIGHT_BROWSERS_PATH='/opt/data/qt-team/telegram-runtime/browsers')\\nr=subprocess.run(['/opt/data/qt-team/telegram-runtime/venv/bin/python','/opt/data/qt-team/telegram_reporter.py'],env=env,timeout=210)\\nraise SystemExit(r.returncode)\\n")
wrapper.chmod(0o444)
assert before=={n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in protected}
print(json.dumps({'deployed':list(PAYLOAD),'protectedFilesUnchanged':True,'backup':str(backup)}))
""".replace('PAYLOAD', repr(payload))
    print(setup.remote_container(code, 'root'))


def schedule():
    print(setup.remote_container("""
import os,json
os.environ['HERMES_HOME']='/opt/data/profiles/qt-manager'
os.environ['HERMES_TIMEZONE']='Asia/Singapore'
from cron.jobs import list_jobs,create_job
name='QT Manager Telegram reporting'
existing=[j for j in list_jobs(include_disabled=True) if j.get('name')==name]
job=existing[0] if existing else create_job(prompt='Run the fixed owner-paired Telegram reporter. Read saved results and capture owned public app pages. No research, model calls or app publication.',schedule='1m',name=name,script='qt-telegram-report.py',no_agent=True,workdir='/opt/data/qt-team',deliver='local')
print(json.dumps({k:job.get(k) for k in ['id','name','enabled','next_run_at','last_status','no_agent','script']}))
"""))


def tick():
    print(setup.remote_container("""
import subprocess,os
env=dict(os.environ,PLAYWRIGHT_BROWSERS_PATH='/opt/data/qt-team/telegram-runtime/browsers')
r=subprocess.run(['/opt/data/qt-team/telegram-runtime/venv/bin/python','/opt/data/qt-team/telegram_reporter.py'],env=env,capture_output=True,text=True,timeout=105)
print(r.stdout)
if r.returncode:raise RuntimeError('Reporter tick failed; inspect sanitized state')
"""))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['deploy', 'schedule', 'tick'])
    args = parser.parse_args()
    {'deploy': deploy, 'schedule': schedule, 'tick': tick}[args.action]()
