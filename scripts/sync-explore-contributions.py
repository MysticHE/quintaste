"""Sync the owner's authorized server-processed correction ledger (corrections and member-suggested places) into the Explore workbook.

No publication, model call, Telegram message or account data. Run while Excel is closed. Default is read-only; --apply saves.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import openpyxl

ROOT=Path(__file__).resolve().parents[1]
COLUMNS=['Event ID','Work ID','Location ID','Revision','Verified at','Before (public)','Changes (public)','Source evidence','Publication state','Synced at','Verification event ID']


def main():
    p=argparse.ArgumentParser();p.add_argument('--apply',action='store_true');args=p.parse_args()
    target=ROOT/'docs/research/explore-tracker.xlsx'
    original=hashlib.sha256(target.read_bytes()).hexdigest()
    wb=openpyxl.load_workbook(target,read_only=True)
    # Reading the workbook's authority is part of every synchronization session.
    next(wb['Read me'].values)
    sheet=wb['Member corrections'] if 'Member corrections' in wb.sheetnames else None
    header=next(sheet.values) if sheet else ()
    cursor_column=header.index('Verification event ID') if 'Verification event ID' in header else None
    seen={str(row[0]):str(row[cursor_column] or '') if cursor_column is not None and len(row)>cursor_column else ''
          for row in sheet.iter_rows(min_row=2,values_only=True) if row[0]} if sheet else {}
    # Legacy Event IDs identify application receipts, not verification order. Replay them once and reconcile by identity.
    after=max((int(value) for value in seen.values() if value.isdecimal()),default=0)
    wb.close()
    spec=importlib.util.spec_from_file_location('qt_remote',ROOT/'ops/hermes-desktop/setup.py')
    helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
    code=r'''
import subprocess,json
code="""
import sys,json
sys.path.insert(0,'/opt/data/qt-team')
from explore_bridge import signed
after=AFTER
out=[]
for _ in range(20):
 data=signed('/export',{'after':str(after)})
 out+=data['rows']
 if not data['rows']:break
 after=data['next']
print(json.dumps(out))
""".replace('AFTER',str(AFTER))
r=subprocess.run(['docker','exec','--user','10000','--workdir','/opt/data/qt-team','-i','hermes-agent-yril-hermes-agent-1','python','-'],input=code,text=True,capture_output=True,timeout=100)
if r.returncode:raise RuntimeError('Could not read correction ledger')
print(r.stdout)
'''.replace('AFTER',str(after))
    rows=json.loads(helper.remote(code,timeout=120))
    fresh=[r for r in rows if str(r['event_id']) not in seen]
    reconciled=[r for r in rows if str(r['event_id']) in seen and str(r['verification_event_id'])!=seen[str(r['event_id'])]]
    changed=bool(fresh or reconciled)
    if args.apply and changed:
        wb=openpyxl.load_workbook(target)
        sheet=wb['Member corrections'] if 'Member corrections' in wb.sheetnames else None
        if sheet is None:sheet=wb.create_sheet('Member corrections');sheet.append(COLUMNS);sheet.freeze_panes='A2'
        header=next(sheet.values)
        cursor_column=header.index('Verification event ID')+1 if 'Verification event ID' in header else sheet.max_column+1
        sheet.cell(1,cursor_column,'Verification event ID')
        existing={str(row[0].value):row[0].row for row in sheet.iter_rows(min_row=2) if row[0].value}
        for r in reconciled:sheet.cell(existing[str(r['event_id'])],cursor_column,str(r['verification_event_id']))
        now=dt.datetime.now(dt.timezone.utc).isoformat()
        evidence=wb['Member correction evidence'] if 'Member correction evidence' in wb.sheetnames else wb.create_sheet('Member correction evidence')
        if evidence.max_row==1 and evidence.cell(1,1).value is None:
            for column,title in enumerate(['Event ID','Work ID','Source number','URL','Checked at','Quote','Capture SHA256','Excerpt'],1):evidence.cell(1,column,title)
        for r in fresh:
            dump=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'))
            # A member-suggested place has no before-image: Changes holds the public listing it was added with.
            sheet.append([str(r['event_id']),r['work_id'],r['target'],r['revision'],r['verified_at'],dump(r['before']),dump(r['data']['changes']),'Member correction evidence','PUBLISHED_VERIFIED',now])
            sheet.cell(sheet.max_row,cursor_column,str(r['verification_event_id']))
            for i,source in enumerate(r['data']['sources'],1):evidence.append([str(r['event_id']),r['work_id'],i,source['url'],source['checkedAt'],source['quote'],source.get('captureHash',''),source.get('excerpt','')])
        authority=wb['Read me'];authority.append(['Member correction synchronization',now+': '+str(len(fresh))+' new verified receipts; '+str(len(reconciled))+' verification cursors reconciled. Current app values may have changed since verification; receipts preserve their dated scope.'])
        # Public source text is still untrusted: never let it become an Excel formula.
        for tab in [sheet,evidence]:
            for row in tab.iter_rows():
                for cell in row:
                    if isinstance(cell.value,str) and cell.value.startswith(('=','+','-','@')):cell.data_type='s'
        if hashlib.sha256(target.read_bytes()).hexdigest()!=original:raise RuntimeError('Workbook changed; reload before synchronizing')
        with tempfile.NamedTemporaryFile(dir=target.parent,suffix='.xlsx',delete=False) as temporary:temp=Path(temporary.name)
        try:wb.save(temp);temp.replace(target)
        finally:temp.unlink(missing_ok=True)
    print(json.dumps({'newVerifiedCorrections':len(fresh),'reconciledCursors':len(reconciled),'saved':bool(args.apply and changed),'workbook':'docs/research/explore-tracker.xlsx'}))


if __name__=='__main__':main()
