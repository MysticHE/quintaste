"""Sync the owner's authorized server-processed correction ledger into the existing Explore workbook.

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
COLUMNS=['Event ID','Work ID','Location ID','Revision','Verified at','Before (public)','Changes (public)','Source evidence','Publication state','Synced at']


def main():
    p=argparse.ArgumentParser();p.add_argument('--apply',action='store_true');args=p.parse_args()
    target=ROOT/'docs/research/explore-tracker.xlsx'
    original=hashlib.sha256(target.read_bytes()).hexdigest()
    wb=openpyxl.load_workbook(target,read_only=True)
    # Reading the workbook's authority is part of every synchronization session.
    next(wb['Read me'].values)
    sheet=wb['Member corrections'] if 'Member corrections' in wb.sheetnames else None
    seen={str(row[0]) for row in sheet.iter_rows(min_row=2,values_only=True) if row[0]} if sheet else set()
    after=max((int(value) for value in seen),default=0)
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
    if args.apply and fresh:
        wb=openpyxl.load_workbook(target)
        sheet=wb['Member corrections'] if 'Member corrections' in wb.sheetnames else None
        if sheet is None:sheet=wb.create_sheet('Member corrections');sheet.append(COLUMNS);sheet.freeze_panes='A2'
        now=dt.datetime.now(dt.timezone.utc).isoformat()
        evidence=wb['Member correction evidence'] if 'Member correction evidence' in wb.sheetnames else wb.create_sheet('Member correction evidence')
        if evidence.max_row==1 and evidence.cell(1,1).value is None:evidence.append(['Event ID','Work ID','Source number','URL','Checked at','Quote','Capture SHA256','Excerpt'])
        for r in fresh:
            dump=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'))
            sheet.append([str(r['event_id']),r['work_id'],r['target'],r['revision'],r['verified_at'],dump(r['before']),dump(r['data']['changes']),'Member correction evidence','PUBLISHED_VERIFIED',now])
            for i,source in enumerate(r['data']['sources'],1):evidence.append([str(r['event_id']),r['work_id'],i,source['url'],source['checkedAt'],source['quote'],source['captureHash'],source.get('excerpt','')])
        authority=wb['Read me'];authority.append(['Member correction synchronization',now+': '+str(len(fresh))+' verified server correction receipts synchronized. Current app values may have changed since verification; receipts preserve their dated scope.'])
        # Public source text is still untrusted: never let it become an Excel formula.
        for tab in [sheet,evidence]:
            for row in tab.iter_rows():
                for cell in row:
                    if isinstance(cell.value,str) and cell.value.startswith(('=','+','-','@')):cell.data_type='s'
        if hashlib.sha256(target.read_bytes()).hexdigest()!=original:raise RuntimeError('Workbook changed; reload before synchronizing')
        with tempfile.NamedTemporaryFile(dir=target.parent,suffix='.xlsx',delete=False) as temporary:temp=Path(temporary.name)
        try:wb.save(temp);temp.replace(target)
        finally:temp.unlink(missing_ok=True)
    print(json.dumps({'newVerifiedCorrections':len(fresh),'saved':bool(args.apply and fresh),'workbook':'docs/research/explore-tracker.xlsx'}))


if __name__=='__main__':main()
