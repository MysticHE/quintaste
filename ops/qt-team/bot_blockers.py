"""Exhausted work goes to one durable Manager case. The existing reporter delivers the exact issue link.

Self-healing (owner, 5 Nov 2026): the case says what failed and where, and it closes by itself when the same work succeeds again;
the reporter then tells the owner it recovered. Only work that keeps failing after its automatic retries is left for a person.
A new case about a whole role (key 'runtime') is queued for Kaya's diagnosis (bot_insight.py)."""
import hashlib,json,os,re,sys,threading,time,traceback
from pathlib import Path
import bot_notices
import chef_admin
from app_signing import ADMIN_ORIGIN
LOCK=threading.Lock()
LOCATION=re.compile(r'\(at ([a-z0-9_]+\.py):(\d+)\)')


def diagnosis_queue(root:Path)->Path:
    return root/'state'/'diagnosis'/'queue'


def code_excerpt(root:Path,error:str):
    """The code around the reported line (40 before, 25 after, with the enclosing def) and the file's sha256, or None without a
    location. Taken when the case opens, by the process that failed, so a later deploy cannot shift the lines under it."""
    found=LOCATION.search(error or '')
    path=root/found.group(1) if found else None
    if not path or not path.is_file():return None
    data=path.read_bytes();line,lines=int(found.group(2)),data.decode('utf-8','replace').splitlines()
    start,end=max(0,line-41),min(len(lines),line+25)
    head=next((i for i in range(min(line,len(lines))-1,-1,-1) if lines[i].lstrip().startswith(('def ','class '))),None)
    parts=[f'{head+1}: {lines[head]}','...'] if head is not None and head<start else []
    parts+=[f"{i+1}{'>' if i+1==line else ':'} {lines[i]}" for i in range(start,end)]
    return {'file':path.name,'line':line,'code':'\n'.join(parts)[:9000],'sha256':hashlib.sha256(data).hexdigest()}


def queue_diagnosis(root:Path,case:str,scope:str,key:str,row:dict)->None:
    """One request per case, picked up by bot_insight.py; never raises (the case itself is already open)."""
    try:
        folder=diagnosis_queue(root);folder.mkdir(parents=True,exist_ok=True)
        temp=folder/(case+'.tmp')
        temp.write_text(json.dumps({'case':case,'scope':scope,'key':key,'error':row.get('error',''),'n':row.get('n',0),'at':time.time(),
                                    'excerpt':code_excerpt(root,row.get('error',''))}))
        os.replace(temp,folder/(case+'.json'))
    except (OSError,UnicodeError):pass


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


def blocker_path(root:Path,scope:str,key:str)->Path:
    return root/'state'/'bot-blockers'/(hashlib.sha256((scope+'|'+key).encode()).hexdigest()+'.json')


def open_case(root:Path,scope:str,key:str):
    """The case this work's failure streak opened, while the streak lasts (None once it recovered)."""
    try:return json.loads(blocker_path(root,scope,key).read_text()).get('case')
    except (OSError,ValueError):return None


def record(root:Path,caller:str,scope:str,key='runtime',*,failed=True,threshold=3,error=None):
    path=blocker_path(root,scope,key)
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
                    try:bot_notices.post(root,'bot-recovered:'+closed[0],'QT Manager · '+scope+' is working again. Its issue closed by itself.',
                                         [[{'text':'Open issue','url':ADMIN_ORIGIN+'/console/cases?id='+closed[0]}]])
                    except (OSError,ValueError):pass
            path.unlink(missing_ok=True);return
        row['n']=min(100,row.get('n',0)+1)
        row['error']=(error if error is not None else describe() or row.get('error') or '')[:300]
        # Asked again every few hours while it keeps failing: admin returns the open case, or opens a new one if staff closed it.
        if row['n']>=threshold and (not row.get('case') or now-row.get('confirmedAt',0)>=RECONFIRM):
            tried=f"failed {row['n']} times in a row; refused or busy app requests were retried automatically each time"
            try:
                case=chef_admin.call(root,caller,'POST','/api/bot/blocked',{'scope':scope,'key':key,'error':row['error'],'tried':tried})['id']
                if case!=row.get('case') and key=='runtime':queue_diagnosis(root,case,scope,key,row)
                row['case'],row['confirmedAt']=case,now
            except Exception:pass  # persisted count retries delivery; never changes the owning content action
        _write(path,row)


def _write(path:Path,row:dict)->None:
    temp=path.with_suffix('.tmp');temp.write_text(json.dumps(row));temp.chmod(0o600);temp.replace(path)
