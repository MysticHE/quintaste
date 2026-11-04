"""Exhausted work goes to one durable Manager case. The existing reporter delivers the exact issue link."""
import hashlib,json,threading
from pathlib import Path
import chef_admin
LOCK=threading.Lock()

def record(root:Path,caller:str,scope:str,key='runtime',*,failed=True,threshold=3):
    path=root/'state'/'bot-blockers'/(''+hashlib.sha256((scope+'|'+key).encode()).hexdigest()+'.json')
    with LOCK:
        path.parent.mkdir(parents=True,exist_ok=True)
        try:row=json.loads(path.read_text())
        except (OSError,ValueError):row={}
        if not failed:
            path.unlink(missing_ok=True);return
        row['n']=min(100,row.get('n',0)+1)
        if row['n']>=threshold and not row.get('case'):
            try:row['case']=chef_admin.call(root,caller,'POST','/api/bot/blocked',{'scope':scope,'key':key})['id']
            except Exception:pass  # persisted count retries delivery; never changes the owning content action
        temp=path.with_suffix('.tmp');temp.write_text(json.dumps(row));temp.chmod(0o600);temp.replace(path)
