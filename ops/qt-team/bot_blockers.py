"""Exhausted work goes to one durable Manager case. The existing reporter delivers the exact issue link.

Self-healing (owner, 5 Nov 2026): the case says what failed and where, and it closes by itself when the same work succeeds again;
the reporter then tells the owner it recovered. Only work that keeps failing after its automatic retries is left for a person."""
import hashlib,json,sys,threading,time,traceback
from pathlib import Path
import chef_admin
LOCK=threading.Lock()


def recovered_log(root:Path)->Path:
    return root/'state'/'bot-blockers'/'recovered.jsonl'


def where(exc=None)->str:
    """' (at workflow.py:296)': the innermost QT file line of the exception being handled (or exc), or ''."""
    exc=exc or sys.exc_info()[1]
    frames=[f for f in traceback.extract_tb(exc.__traceback__) if Path(f.filename).parent.name in ('qt-team','')] if exc and exc.__traceback__ else []
    return f' (at {Path(frames[-1].filename).name}:{frames[-1].lineno})' if frames else ''


def describe(exc=None)->str:
    """'AttributeError (at workflow.py:294)' or 'HTTPError 429 (at publisher.py:40)': the error class and where, for the case text.
    Never the message: work that reads members' text could carry it into a staff case (5 Nov 2026). Inside an except block it reads
    the exception being handled; '' outside one."""
    exc=exc or sys.exc_info()[1]
    if not exc:return ''
    code=getattr(exc,'code',None)
    return type(exc).__name__+(f' {code}' if isinstance(code,int) else '')+where(exc)


RECONFIRM=6*3600  # a case staff closed while the work still fails is opened again within this time
RECOVER_RETRY=(60,3600)  # first and longest wait before telling admin again that the work recovered


def record(root:Path,caller:str,scope:str,key='runtime',*,failed=True,threshold=3,error=None):
    path=root/'state'/'bot-blockers'/(''+hashlib.sha256((scope+'|'+key).encode()).hexdigest()+'.json')
    with LOCK:
        path.parent.mkdir(parents=True,exist_ok=True)
        try:row=json.loads(path.read_text())
        except (OSError,ValueError):row={}
        now=time.time()
        if not failed:
            if row.get('case'):
                if row.get('recoverAt',0)>now:  # admin refused the last try: wait instead of asking on every success
                    if row.get('n'):row['n']=0;_write(path,row)
                    return
                try:closed=chef_admin.call(root,caller,'POST','/api/bot/recovered',{'scope':scope,'key':key}).get('closed') or []
                except Exception:
                    tries=row.get('recoverTries',0)
                    row.update(n=0,recoverTries=tries+1,recoverAt=now+min(RECOVER_RETRY[1],RECOVER_RETRY[0]*2**tries))
                    _write(path,row);return
                if closed:  # staff may have closed it already; then there is nothing to announce
                    with recovered_log(root).open('a',encoding='utf-8') as log:
                        log.write(json.dumps({'case':closed[0],'scope':scope,'at':now})+'\n')
            path.unlink(missing_ok=True);return
        row['n']=min(100,row.get('n',0)+1)
        row['error']=(error if error is not None else describe() or row.get('error') or '')[:300]
        # Asked again every few hours while it keeps failing: admin returns the open case, or opens a new one if staff closed it.
        if row['n']>=threshold and (not row.get('case') or now-row.get('confirmedAt',0)>=RECONFIRM):
            tried=f"failed {row['n']} times in a row; refused or busy app requests were retried automatically each time"
            try:
                row['case']=chef_admin.call(root,caller,'POST','/api/bot/blocked',{'scope':scope,'key':key,'error':row['error'],'tried':tried})['id']
                row['confirmedAt']=now
            except Exception:pass  # persisted count retries delivery; never changes the owning content action
        _write(path,row)


def _write(path:Path,row:dict)->None:
    temp=path.with_suffix('.tmp');temp.write_text(json.dumps(row));temp.chmod(0o600);temp.replace(path)
