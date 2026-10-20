"""Operator setup helpers for the owner's existing Hermes VPS and Windows desktop.

Never print credentials or copy OAuth stores. Remote reads use the existing SSH
identity and strict known-host verification.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import tempfile
import urllib.request
from pathlib import Path

HOST = "root@100.64.190.112"
CONTAINER = "hermes-agent-yril-hermes-agent-1"


def remote(code: str) -> str:
    result = subprocess.run(
        ["ssh", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
         "-o", "ConnectTimeout=15", HOST, "python3 -"],
        input=code, text=True, encoding="utf-8", capture_output=True, timeout=120,
    )
    if result.returncode:
        raise RuntimeError(f"Remote operation failed ({result.returncode}): {result.stderr[:1200]}")
    return result.stdout


def inspect() -> None:
    print(remote(r'''
import json, pathlib, subprocess
name = "hermes-agent-yril-hermes-agent-1"
data = json.loads(subprocess.check_output(["docker", "inspect", name]))[0]
print(json.dumps({"container_user": data["Config"].get("User"),
 "environment_names": sorted(x.split("=",1)[0] for x in data["Config"]["Env"]),
 "mounts": [{"source": x["Source"], "destination": x["Destination"]} for x in data["Mounts"]]}, indent=2))
code = r"""
import json, pathlib, yaml
home = pathlib.Path('/opt/data')
config = yaml.safe_load((home/'config.yaml').read_text())
print(json.dumps({"model": {k:v for k,v in config.get('model',{}).items() if k in ['default','provider','base_url']},
 "delegation": {k:v for k,v in config.get('delegation',{}).items() if k in ['model','provider','base_url','max_concurrent_children']},
 "toolsets": config.get('toolsets'),
 "disabled_toolsets":config.get('agent',{}).get('disabled_toolsets'),
 "env_names": sorted(line.split('=',1)[0] for line in (home/'.env').read_text().splitlines() if '=' in line and not line.lstrip().startswith('#'))}, indent=2))
for root in ['/opt/hermes/hermes_cli','/opt/hermes/hermes_dashboard','/opt/hermes/plugins/dashboard_auth']:
 p=pathlib.Path(root)
 print(root, [str(f.relative_to('/opt/hermes')) for f in p.glob('**/*.py') if any(s in f.name for s in ['profile','auth','server','connection'])][:65])
"""
result = subprocess.run(['docker','exec','--user','10000','-i',name,'python','-'],input=code,text=True,capture_output=True)
print(result.stdout)
if result.returncode: print('Container inspection error:', result.stderr[:1000])
'''))


def sources() -> None:
    paths = ["website/docs/getting-started/installation.md",
             "apps/desktop/README.md", "scripts/install.ps1"]
    base = Path(tempfile.gettempdir()) / "hermes-desktop-setup" / "reference"
    base.mkdir(parents=True, exist_ok=True)
    for path in paths:
        url = "https://raw.githubusercontent.com/NousResearch/hermes-agent/v0.22.2/" + path
        with urllib.request.urlopen(url, timeout=30) as response:
            content = response.read()
        dest = base / Path(path).name
        dest.write_bytes(content)
        print(json.dumps({"source":url,"path":str(dest),"bytes":len(content)}))


def remote_sources() -> None:
    payload = remote(r'''
import base64,json,subprocess
paths=['hermes_cli/profiles.py','hermes_cli/profile_cmd.py','hermes_cli/web_server_profiles.py',
 'hermes_cli/web_server.py','hermes_cli/web_server_oauth.py','hermes_cli/auth.py']
code="import pathlib,json,base64; paths="+repr(paths)+"; paths += [str(p.relative_to('/opt/hermes')) for p in pathlib.Path('/opt/hermes/hermes_cli/dashboard_auth').glob('**/*.py')]; print(json.dumps({p:base64.b64encode((pathlib.Path('/opt/hermes')/p).read_bytes()).decode() for p in paths}))"
print(subprocess.check_output(['docker','exec','--user','10000','hermes-agent-yril-hermes-agent-1','python','-c',code],text=True))
''')
    import base64
    base = Path(tempfile.gettempdir()) / "hermes-desktop-setup" / "server-reference"
    base.mkdir(parents=True, exist_ok=True)
    for path, content in json.loads(payload).items():
        dest = base / path
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_bytes(base64.b64decode(content))
        print(dest)


def desktop_downloads() -> None:
    import re
    for url in ['https://hermes-agent.nousresearch.com/',
                'https://api.github.com/repos/NousResearch/hermes-agent/git/trees/v0.22.2?recursive=1']:
        with urllib.request.urlopen(url, timeout=60) as response:
            content=response.read().decode('utf-8')
        if 'api.github.com' in url:
            paths=[x['path'] for x in json.loads(content)['tree'] if any(s in x['path'].lower() for s in ['msix','appinstaller','release-manifest'])]
            print(json.dumps(paths))
        else:
            print(json.dumps(sorted(set(re.findall(r'https?[^"<>\s]+(?:appinstaller|msixbundle|\.exe|\.json)[^"<>\s]*',content)))))
    for path in [Path(os.environ['LOCALAPPDATA'])/'hermes',Path(os.environ['APPDATA'])/'Hermes']:
        print(json.dumps({'path':str(path),'exists':path.exists(),'entries':[x.name for x in path.iterdir()] if path.exists() else []}))


def profiles() -> None:
    print(remote(r'''
import hashlib,json,os,pathlib,subprocess
root=pathlib.Path('/docker/hermes-agent-yril/data')
baseline={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in ['config.yaml','.env','SOUL.md']}
roles={
 'researcher':('Researcher','Investigates questions, compares options, and produces concise reports supported by reliable sources.',
  'You are Researcher, a specialist Hermes teammate. Investigate the assigned question, prefer current primary sources, cite sources, distinguish evidence from inference, and report uncertainties. Give the coordinator a concise recommendation with supporting facts. Do not invent evidence. Stay within the assigned task.'),
 'coder':('Coder','Implements and debugs software, follows project instructions, and verifies changes with relevant checks.',
  'You are Coder, a specialist Hermes teammate. Read the assigned project instructions and existing implementation before changing code. Preserve unrelated work. Implement the requested scope, run relevant checks, and report exactly what changed and what was verified. Use separate worktrees when concurrent edits would overlap. Do not claim success without evidence.'),
 'reviewer':('Reviewer','Independently checks code and research for correctness, regressions, security issues, and unsupported claims.',
  'You are Reviewer, an independent Hermes teammate. Review the assigned work against its requirements and evidence. Prioritize concrete bugs, regressions, security issues, and unsupported claims. Cite files or sources and explain practical impact. Review without modifying the work unless asked. If no material issue is found, say so and identify remaining verification gaps.')}
code=r"""
import json,pathlib,yaml
from hermes_cli.profiles import create_profile, get_profile_dir
roles=ROLES
out=[]
for name,(title,description,soul) in roles.items():
 p=get_profile_dir(name)
 if p.exists():
  raise RuntimeError('Profile already exists: '+name+'; refusing to replace it')
 p=create_profile(name,no_alias=True,description=description)
 (p/'SOUL.md').write_text('# '+title+'\n\n'+soul+'\n',encoding='utf-8')
 config=yaml.safe_load((p/'config.yaml').read_text()) or {}
 config.setdefault('agent',{})['reasoning_effort']='high'
 (p/'config.yaml').write_text(yaml.safe_dump(config,sort_keys=False),encoding='utf-8')
 assert not (p/'auth.json').exists(), 'Unexpected copied OAuth store'
 env=(p/'.env').read_text()
 assert 'TELEGRAM_BOT_TOKEN=' not in env and 'API_SERVER_KEY=' not in env
 out.append({'profile':name,'path':str(p),'model':config.get('model'), 'oauth_store_copied':False})
print(json.dumps(out))
""".replace('ROLES',repr(roles))
result=subprocess.run(['docker','exec','--user','10000','-i','hermes-agent-yril-hermes-agent-1','python','-'],input=code,text=True,capture_output=True)
if result.returncode: raise RuntimeError(result.stderr[-2000:])
after={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in baseline}
assert baseline==after, 'Default profile changed unexpectedly'
receipt=pathlib.Path('/var/lib/hermes-desktop-setup')
receipt.mkdir(mode=0o700,exist_ok=True)
(receipt/'profiles-20261017.json').write_text(json.dumps({'profiles':json.loads(result.stdout),'default_unchanged':True,'default_hashes':baseline},indent=2))
os.chmod(receipt/'profiles-20261017.json',0o600)
print(result.stdout)
print('Default profile configuration and instructions preserved.')
'''))


def install() -> None:
    import hashlib
    script = Path(tempfile.gettempdir()) / 'hermes-desktop-setup' / 'reference' / 'install.ps1'
    if not script.is_file():
        raise RuntimeError('Download and inspect the stable installer first')
    target = Path(os.environ['LOCALAPPDATA']) / 'hermes'
    if target.exists():
        raise RuntimeError('Existing Hermes data directory detected; inspect before continuing')
    print(json.dumps({'installer_sha256':hashlib.sha256(script.read_bytes()).hexdigest(),
                     'release':'v0.22.2','commit':'d923a5eb487a17c0a68801bba9ef0f56c81040a8',
                     'target':str(target)}),flush=True)
    subprocess.run(['powershell.exe','-NoProfile','-ExecutionPolicy','Bypass','-File',str(script),
        '-Commit','d923a5eb487a17c0a68801bba9ef0f56c81040a8','-NonInteractive','-IncludeDesktop'],check=True)


def verify_profiles() -> None:
    print(remote(r'''
import json,subprocess
results=[]
for name in ['researcher','coder','reviewer']:
 expected=name.upper()+'_READY'
 args=['docker','exec','--user','10000','hermes-agent-yril-hermes-agent-1',
       'hermes','-p',name,'chat','-q','Setup verification only. Do not use tools or change any files. Reply with exactly '+expected+'.','-Q']
 try:
  r=subprocess.run(args,text=True,capture_output=True,timeout=100)
  passed=r.returncode==0 and expected in r.stdout
  results.append({'profile':name,'exit_code':r.returncode,'response_verified':passed,
    'response':expected if passed else r.stdout[-500:], 'error':r.stderr[-1000:] if r.returncode else None})
 except subprocess.TimeoutExpired:
  results.append({'profile':name,'response_verified':False,'error':'Timed out'})
print(json.dumps(results,indent=2))
'''))


def auth_help() -> None:
    print(remote(r'''
import subprocess
for args in [['hermes','auth','add','--help'],['hermes','auth','--help']]:
 r=subprocess.run(['docker','exec','--user','10000','hermes-agent-yril-hermes-agent-1']+args,text=True,capture_output=True)
 print(r.stdout)
 print(r.stderr if r.returncode else '')
'''))


def login() -> None:
    subprocess.run(['ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes',HOST,
        'docker','exec','--user','10000','hermes-agent-yril-hermes-agent-1',
        'hermes','auth','add','openai-codex','--type','oauth','--label','desktop-team',
        '--priority','0','--no-browser','--timeout','600'],check=True)


def connection_probe() -> None:
    # Passwords are no longer recoverable from Docker environment variables.
    from password_setup import verify
    verify()


def launch_desktop(diagnostic: bool = True) -> None:
    import socket
    root=Path(os.environ['LOCALAPPDATA'])/'hermes'/'hermes-agent'
    app=root/'apps'/'desktop'
    exe=app/'release'/'win-unpacked'/'Hermes.exe'
    if not exe.is_file():
        raise RuntimeError('Packaged Desktop build is not ready')
    temp=Path(tempfile.gettempdir())/'hermes-desktop-setup'
    previous=json.loads((temp/'desktop-process.json').read_text()) if (temp/'desktop-process.json').exists() else {}
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0))
        port=sock.getsockname()[1]
    env=dict(os.environ)
    env['HERMES_HOME']=str(root.parent)
    env.pop('HERMES_DESKTOP_REMOTE_URL',None)
    env.pop('HERMES_DESKTOP_REMOTE_TOKEN',None)
    command=[str(exe)]
    if diagnostic:
        command.extend(['--remote-debugging-address=127.0.0.1',f'--remote-debugging-port={port}'])
    with (temp/'desktop-process.log').open('a',encoding='utf-8') as log:
        child=subprocess.Popen(command,
            cwd=app,env=env,stdin=subprocess.DEVNULL,stdout=log,stderr=log,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
    receipt={'pid':child.pid,'port':port if diagnostic else None,'executable':str(exe),'app':str(app)}
    receipt['previous_diagnostic_port']=previous.get('port') or previous.get('previous_diagnostic_port')
    (temp/'desktop-process.json').write_text(json.dumps(receipt),encoding='utf-8')
    print(json.dumps(receipt))


def desktop_status() -> None:
    import socket
    state=json.loads((Path(tempfile.gettempdir())/'hermes-desktop-setup'/'desktop-process.json').read_text())
    command=f"Get-CimInstance Win32_Process -Filter 'ProcessId={int(state['pid'])}' | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress"
    result=subprocess.run(['powershell.exe','-NoProfile','-Command',command],capture_output=True,text=True,check=True)
    process=json.loads(result.stdout) if result.stdout.strip() else None
    port=state.get('previous_diagnostic_port')
    with socket.socket() as sock:
        sock.settimeout(2)
        debugger_open=bool(port and sock.connect_ex(('127.0.0.1',port))==0)
    print(json.dumps({'process':process,'diagnostic_port_open':debugger_open,
      'desktop_shortcut':(Path(os.environ['USERPROFILE'])/'Desktop'/'Hermes.lnk').is_file(),
      'start_menu_shortcut':(Path(os.environ['APPDATA'])/'Microsoft'/'Windows'/'Start Menu'/'Programs'/'Hermes.lnk').is_file()}))
    if not process or debugger_open or '--remote-debugging' in process.get('CommandLine',''):
        raise RuntimeError('Normal desktop launch verification failed')


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["inspect", "sources", "remote-sources", "desktop-downloads", "profiles", "install", "verify-profiles", "auth-help", "login", "connection-probe", "launch-desktop", "open-desktop", "desktop-status", "telegram-check", "model-inspect", "model-probe", "model-apply", "model-verify"])
    args = parser.parse_args()
    {"inspect": inspect, "sources": sources, "remote-sources":remote_sources,
     "desktop-downloads":desktop_downloads, "profiles":profiles, "install":install,
     "verify-profiles":verify_profiles,"auth-help":auth_help,"login":login,
     "connection-probe":connection_probe,"launch-desktop":launch_desktop,
     "open-desktop":lambda: launch_desktop(diagnostic=False),"desktop-status":desktop_status,
     "telegram-check":lambda: __import__('telegram_check').run(remote),
     "model-inspect":lambda: __import__('model_defaults').run(remote,'inspect'),
     "model-probe":lambda: __import__('model_defaults').run(remote,'probe'),
     "model-apply":lambda: __import__('model_defaults').run(remote,'apply'),
     "model-verify":lambda: __import__('model_defaults').run(remote,'verify')}[args.action]()
