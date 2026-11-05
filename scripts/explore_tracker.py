"""Operate the sole active Explore tracker. Read docs/EXPLORE_TRACKER.md first.

Commands: status, validate, show --id ID, export-publication --batch ID --content SNAPSHOT
--catalogue SNAPSHOT --out PACKET, record-publication --packet PACKET --receipt RECEIPT
--content SNAPSHOT --catalogue SNAPSHOT --verification PROOF.
All commands are local. This utility never publishes to production.
"""
from __future__ import annotations
import argparse,copy,datetime as dt,hashlib,json,re,sys,time,unicodedata
from collections import Counter
from pathlib import Path
import openpyxl
from openpyxl.styles import Alignment,Font,PatternFill
from openpyxl.worksheet.table import Table,TableStyleInfo
from openpyxl.worksheet.datavalidation import DataValidation

ROOT=Path(__file__).resolve().parents[1]
DEFAULT=ROOT/'docs/research/explore-tracker.xlsx'
SCHEMA='2.1'
LOCATION_COLUMNS=['Location ID','Kitchen','Name','Branch','Address','Postcode','Unit','Latitude','Longitude','Google place ID','Aliases','Venue diet value','Allium-free claim value','Research status','Research checked date','Identity validation','Operation validation','Whole-kitchen validation','Vegan validation','Allium-free validation','Publication status','Batch ID','Publication verified at','Live observed at','Content version','Primary source URL','Menu status','Live menu entries','Menu source','Menu qualification','Cover status','Photo metadata','Hours status','Hours summary','Hours schedule','Hours notes','Hours source','Hours checked date','Routine recheck','Reopen trigger','Evidence IDs','Decision notes','Legacy research notes','Pin precision']
LEAD_COLUMNS=['Candidate ID','Original name','Original address','Location ID','Research status','Research checked date','Eligibility','Recommendation','Publication status','Hold reason','Decision notes','Evidence IDs','Batch ID']
EVIDENCE_COLUMNS=['Evidence ID','Subject type','Subject ID','Source class','URL','Access status','Source date','Access date','Date basis','Fact supported','Field scope','Accepted','Publisher record ID','Evidence notes']
CHECK_COLUMNS=['Check ID','Subject type','Subject ID','Source category','Check result','Checked date','Evidence IDs','Notes']
VALIDATION_COLUMNS=['Validation ID','Subject type','Subject ID','Field','Result','Checked date','Evidence IDs','Scope and limits']
BATCH_COLUMNS=['Batch ID','Status','Authorized count','Authorization date','Owner authorization','Workbook revision at export','Input SHA256','Applied at','Verified at','Backup reference','Notes']
EVENT_COLUMNS=['Event ID','Batch ID','Location ID','Action','Expected version','Observed version','Applied at','Verified at','Receipt reference','Notes']
CHANGE_COLUMNS=['Change ID','Changed at','Actor','Scope','Change','Evidence / receipt']
MIXED_COLUMNS=['Candidate ID','Google place ID','Harvest order','Review batch ID','Triage','Name hint','Name basis','Name hint expires at','Address','Unit','Postcode','Latitude','Longitude','Website pointer','Website expires at','Historical website name match','Bot status','Bot attempts','Bot cause','Bot reason','Bot updated at','Bot last attempt at','Bot reviewed in','Bot packet reference','Bot published at','Bot recheck notes','Bot retry at','Owner suppression','Historical research state','Research status','Research checked date','Verification scope','Identity validation','Operation validation','Mixed eligibility','Merchant-labelled dish count','Menu status','Menu source','Menu qualification','Cover status','Cover type','Cover source','Cover rights','Hours status','Hours summary','Hours schedule','Hours source','Vegan validation','Allium-free validation','Publication status','Location ID','Identity match basis','Follow-up reason','Next action','Evidence IDs','Routine recheck','Reopen trigger','Snapshot reference','Imported at','Notes']
RESEARCH_BATCH_COLUMNS=['Review batch ID','Kitchen','Review batch status','Candidate count','Research checked count','Pending count','Held count','Not qualified count','Published reported count','Owner instruction','Started at','Completed at','Scope and limits']
MIXED_DISH_COLUMNS=['Dish ID','Candidate ID','Dish','Portion','Merchant label','Source URL','Amount','Currency','Price qualifier','Channel','Availability','Research checked date','Evidence IDs','Published','Limits']
HOURS_REVIEW_COLUMNS=['Review ID','Location ID','Batch ID','Kitchen','Name','Address','Postcode','Prior hours status','Prior live hours schedule','Research status','Research checked date','Identity validation','Identity match basis','Google place ID','Google listing name','Google listing address','Business status','Hours status','Hours summary','Hours schedule','Current hours schedule','Special days','Regular periods JSON','Current hours JSON','API source URL','Google Maps URL','Access method','Captured at','Publication status','Evidence IDs','Limitations','Technical receipt']
HOURS_FOLLOWUP_COLUMNS=['Follow-up ID','Location ID','Review ID','Batch ID','Kitchen','Name','Address','Initial hours status','Research status','Research checked date','Identity validation','Hours status','Hours schedule','Hours source','Finding','Source coverage','Limitations','Routine recheck','Reopen trigger','Publication status','Evidence IDs']
COVER_ACQUISITION_COLUMNS=['Acquisition ID','Location ID','Acquisition batch ID','Kitchen','Name','Address','Live observed at','Live cover present','Input assessment status','Assessment checked at','Acquisition status','Source route','Supported subject','Source URL','Access method','Rights and attribution','Prepared photo metadata','Asset SHA256','Publication status','Evidence IDs','Limitations','Next action','Technical receipt']
ENUMS={
 'Kitchen':['VEG_KITCHEN','MIXED_KITCHEN','UNKNOWN'],
 'Research status':['NOT_CHECKED','CHECKED'],
 'Identity validation':['UNVERIFIED','VERIFIED','CONFLICT'],
 'Operation validation':['UNVERIFIED','VERIFIED','CONFLICT'],
 'Whole-kitchen validation':['UNVERIFIED','VERIFIED','HOLD','EXCLUDED','NOT_APPLICABLE'],
 'Vegan validation':['UNVERIFIED','VERIFIED','NOT_APPLICABLE'],
 'Allium-free validation':['UNVERIFIED','VERIFIED','NOT_APPLICABLE'],
 'Publication status':['NOT_PUBLISHED','PREPARED','AUTHORIZED','LIVE_OBSERVED','PUBLISHED_VERIFIED','HIDDEN','MISSING_REVIEW'],
 'Menu status':['NOT_RESEARCHED','CHECKED_UNAVAILABLE','VERIFIED_PARTIAL','VERIFIED_FULL','HISTORICAL','WITHHELD','PRESENT_UNVERIFIED'],
 'Cover status':['NOT_RESEARCHED','CHECKED_UNAVAILABLE','VERIFIED','PRESENT_UNVERIFIED'],
 'Hours status':['NOT_RESEARCHED','CHECKED_UNAVAILABLE','VERIFIED_PARTIAL','VERIFIED_WEEK','QUALIFIED','WITHHELD','PRESENT_UNVERIFIED'],
 'Routine recheck':['NO','YES'],
 'Eligibility':['UNVERIFIED','VERIFIED','HOLD','EXCLUDED'],
 'Recommendation':['INCLUDE','KEEP_EXISTING','HOLD','EXCLUDE'],
 'Hold reason':['NONE','CURRENT_EVIDENCE','WHOLE_KITCHEN_DIET','IDENTITY_CONFLICT','NOT_A_KITCHEN','NOT_VEGETARIAN'],
 'Source class':['GOVERNMENT','MERCHANT','LANDLORD_OPERATOR','ORIGINAL_REPORT','BUSINESS_METADATA','SECONDARY','EXCLUDED'],
 'Access status':['FETCHED','INDEXED_SNIPPET','ACCESS_LIMITED','RETAINED_FACT','NOT_RECORDED','EXCLUDED'],
 'Source category':['WEB_SEARCH','GOOGLE_SEARCH','CDC_OFFICIAL','MERCHANT','LANDLORD_OPERATOR','ORIGINAL_REPORT','GOOGLE_MAPS_METADATA','HAPPY_COW'],
 'Check result':['CHECKED','NOT_RECORDED','ACCESS_LIMITED','EXCLUDED'],
 'Field':['IDENTITY','OPERATION','WHOLE_KITCHEN','VEGAN','ALLIUM_FREE','MENU','COVER','HOURS','PUBLICATION'],
 'Result':['UNVERIFIED','VERIFIED','CONFLICT','NOT_RESEARCHED','QUALIFIED','CHECKED_UNAVAILABLE','EXCLUDED','NOT_APPLICABLE'],
 'Bot status':['PENDING','IN_REVIEW','VERIFIED','HELD','NOT_QUALIFIED','PUBLISHED','REMOVED'],
 'Historical research state':['NOT_ATTEMPTED','ATTEMPTED'],
 'Mixed eligibility':['UNVERIFIED','VERIFIED','HOLD','EXCLUDED','REFER_VEG_KITCHEN'],
 'Cover type':['UNDETERMINED','FOOD','VENUE'],
 'Review batch status':['PLANNED','IN_PROGRESS','RESEARCH_CHECKED'],
}
ENUMS['Field'].append('MIXED_ELIGIBILITY')
ENUMS['Input assessment status']=['NOT_CHECKED','CHECKED']
ENUMS['Acquisition status']=['HELD_INPUT','READY_FOR_GENERATION','GENERATED_AWAITING_REVIEW','PREPARED','PUBLISHED_VERIFIED']
SHEETS={'Locations':LOCATION_COLUMNS,'Leads':LEAD_COLUMNS,'Evidence':EVIDENCE_COLUMNS,'Source checks':CHECK_COLUMNS,'Validations':VALIDATION_COLUMNS,'Publication batches':BATCH_COLUMNS,'Publication events':EVENT_COLUMNS,'Change log':CHANGE_COLUMNS,'Mixed candidates':MIXED_COLUMNS,'Mixed batches':RESEARCH_BATCH_COLUMNS,'Mixed dishes':MIXED_DISH_COLUMNS}
SHEETS['Hours reviews']=HOURS_REVIEW_COLUMNS
SHEETS['Hours follow-up']=HOURS_FOLLOWUP_COLUMNS
SHEETS['Cover acquisition']=COVER_ACQUISITION_COLUMNS
MENU_REVIEW_COLUMNS=['Review ID','Location ID','Batch ID','Kitchen','Name','Address','Prior menu status','Prior live menu entries','Live menu entries','Live price range','Research status','Research checked date','Google Search check','Google Maps check','Menu status','Menu source','Supported dishes','Currency','Sales channel','Publication status','Live verified at','Evidence IDs','Limitations','Next action','Technical receipt']
SHEETS['Menu reviews']=MENU_REVIEW_COLUMNS
WEAK=re.compile(r'happycow|stampede\.sg|spinach\.guide|localrank\.sg|threebestrated|onehungryhippo|makaneast|foursquare|wanderboat|zomato',re.I)
def now():return dt.datetime.now(dt.timezone.utc).isoformat()
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def read(path):return json.loads(Path(path).read_text(encoding='utf-8'))
def records(wb,name):
 ws=wb[name];head=[c.value for c in ws[1]]
 return [dict(zip(head,r)) for r in ws.iter_rows(min_row=2,values_only=True) if r[0] is not None]
def replace_sheet(wb,name,columns,rows):
 if name in wb.sheetnames:del wb[name]
 ws=wb.create_sheet(name);ws.append(columns)
 for row in rows:ws.append([row.get(c) for c in columns])
 return ws
def metadata(wb):return {r[0]:r[1] for r in wb['Read me'].iter_rows(min_row=2,values_only=True) if r[0]}
def setmeta(wb,key,value):
 ws=wb['Read me']
 for row in ws.iter_rows(min_row=2):
  if row[0].value==key:row[1].value=value;return
 ws.append([key,value])
def format_workbook(wb):
 for n in SHEETS:
  if n not in wb:continue
  ws=wb[n];ws.freeze_panes='C2';ws.sheet_view.showGridLines=False
  ws.tables.clear()
  if ws.max_row>1:
   table=Table(displayName='Explore'+re.sub('[^A-Za-z]','',n),ref=ws.dimensions);table.tableStyleInfo=TableStyleInfo(name='TableStyleMedium2',showRowStripes=True);ws.add_table(table)
  for c in ws[1]:c.font=Font(bold=True,color='FFFFFF');c.fill=PatternFill('solid',fgColor='17365D');c.alignment=Alignment(wrap_text=True,vertical='center')
  ws.row_dimensions[1].height=32
  ws.data_validations.dataValidation=[]
  for col,c in enumerate(ws[1],1):
   label=c.value;letter=openpyxl.utils.get_column_letter(col)
   width=65 if any(s in label for s in ['notes','qualification','Fact','authorization','URL','Evidence IDs','trigger','limits']) else 48 if label in ['Address','Original address','Location ID','Candidate ID','Subject ID','Hours schedule'] else 31 if 'Name' in label or 'name' in label else 23
   ws.column_dimensions[letter].width=width
   if label in ENUMS:
    # Named ranges on the Terms sheet avoid Excel's 255-character inline-list limit.
    dv=DataValidation(type='list',formula1='=Term_'+re.sub('[^A-Za-z]','',label),allow_blank=False);dv.errorTitle='Use a standard term';dv.error='Choose a value from the list.';dv.showErrorMessage=True;dv.errorStyle='stop';ws.add_data_validation(dv);dv.add(f'{letter}2:{letter}1048576')
  for row in ws.iter_rows(min_row=2):
   for c in row:c.alignment=Alignment(vertical='top',wrap_text=True)
 for n in ['Read me','Terms','Menu entries','Legacy evidence']:
  if n in wb:
   wb[n].freeze_panes='B2';wb[n].sheet_view.showGridLines=False
   for c in wb[n][1]:c.font=Font(bold=True,color='FFFFFF');c.fill=PatternFill('solid',fgColor='17365D')
def make_terms(wb):
 from openpyxl.workbook.defined_name import DefinedName
 if 'Terms' in wb:del wb['Terms']
 ws=wb.create_sheet('Terms');ws.append(['Field','Standard value','Meaning'])
 for label,values in ENUMS.items():
  start=ws.max_row+1
  for v in values:ws.append([label,v,'See docs/EXPLORE_TRACKER.md; '+label])
  end=ws.max_row;key='Term_'+re.sub('[^A-Za-z]','',label)
  if key in wb.defined_names:del wb.defined_names[key]
  wb.defined_names.add(DefinedName(key,attr_text=f"'Terms'!$B\u0024{start}:$B\u0024{end}"))
 ws.column_dimensions['A'].width=28;ws.column_dimensions['B'].width=31;ws.column_dimensions['C'].width=90
def summary(wb):
 loc=records(wb,'Locations');leads=records(wb,'Leads')
 live=[r for r in loc if r['Publication status'] in ['LIVE_OBSERVED','PUBLISHED_VERIFIED']]
 result=dict(workbook=str(DEFAULT.relative_to(ROOT)),revision=metadata(wb).get('Workbook revision'),locations=len(loc),liveKitchenCounts=dict(Counter(r['Kitchen'] for r in live)),leadCount=len(leads),leadRecommendations=dict(Counter(r['Recommendation'] for r in leads)),leadPublication=dict(Counter(r['Publication status'] for r in leads)),holds=dict(Counter(r['Hold reason'] for r in leads if r['Eligibility']=='HOLD')),sourceChecks=len(records(wb,'Source checks')),evidence=len(records(wb,'Evidence')))
 if 'Mixed candidates' in wb:
  mixed=records(wb,'Mixed candidates')
  result['mixedCandidates']=dict(total=len(mixed),botStatus=dict(Counter(r['Bot status'] for r in mixed)),historicallyAttempted=sum(r['Historical research state']=='ATTEMPTED' for r in mixed),researchChecked=sum(r['Research status']=='CHECKED' for r in mixed),assignedForReview=sum(bool(r['Review batch ID']) for r in mixed),remainingAssignedResearch=sum(bool(r['Review batch ID']) and r['Research status']=='NOT_CHECKED' for r in mixed),eligibility=dict(Counter(r['Mixed eligibility'] for r in mixed)),reviewBatches=len(records(wb,'Mixed batches')),dishObservations=len(records(wb,'Mixed dishes')) if 'Mixed dishes' in wb else 0)
  required=google_check_coverage(wb,mixed)
  result['mixedCandidates']['requiredGoogleChecks']=required
  result['mixedCandidates']['remainingPreliminarySourceReviews']=result['mixedCandidates']['remainingAssignedResearch']
  if metadata(wb).get('Required Google source checks'):
   result['mixedCandidates']['remainingAssignedResearch']=required['assignedMissingRequiredChecks']
 if 'Hours reviews' in wb:
  hours=records(wb,'Hours reviews');checked=[r for r in hours if r['Research status']=='CHECKED']
  result['vegHoursReviews']=dict(total=len(hours),researchChecked=len(checked),remaining=len(hours)-len(checked),hoursStates=dict(Counter(r['Hours status'] for r in checked)),identityStates=dict(Counter(r['Identity validation'] for r in checked)),publicationStates=dict(Counter(r['Publication status'] for r in hours)),recordedUnpublishedSchedules=sum(r['Hours status'] in ['VERIFIED_WEEK','VERIFIED_PARTIAL'] and r['Publication status']=='NOT_PUBLISHED' for r in checked),scope='Google API hours-only research; live Locations hours and kitchen eligibility are separate.')
 if 'Hours follow-up' in wb:
  follow=records(wb,'Hours follow-up');done=[r for r in follow if r['Research status']=='CHECKED']
  result['vegHoursFollowup']=dict(total=len(follow),researchChecked=len(done),remaining=len(follow)-len(done),hoursStates=dict(Counter(r['Hours status'] for r in done)),identityStates=dict(Counter(r['Identity validation'] for r in done)),publicationStates=dict(Counter(r['Publication status'] for r in follow)),noRoutineRecheck=sum(r['Routine recheck']=='NO' for r in done),scope='Owner-requested hours follow-up; completed research may retain unknown or withheld hours. Source coverage remains explicit.')
  overrides={r['Location ID']:r for r in done}
  effective=[overrides.get(r['Location ID'],r) for r in (records(wb,'Hours reviews') if 'Hours reviews' in wb else [])]
  result['vegHoursCurrent']=dict(total=len(effective),hoursStates=dict(Counter(r['Hours status'] for r in effective)),verifiedLiveHoursUpdates=sum(r['Publication status']=='PUBLISHED_VERIFIED' for r in effective),publishableUnpublished=sum(r['Hours status'] in ['VERIFIED_WEEK','VERIFIED_PARTIAL'] and r['Publication status']!='PUBLISHED_VERIFIED' for r in effective),followupRemaining=len(follow)-len(done),scope='Current Hours follow-up findings override earlier Google collection observations for the same canonical ID. No double-counting; original observations remain evidence.')
 if 'Cover acquisition' in wb:
  covers=records(wb,'Cover acquisition')
  result['vegCoverAcquisition']=dict(total=len(covers),inputAssessmentsChecked=sum(r['Input assessment status']=='CHECKED' for r in covers),acquisitionStates=dict(Counter(r['Acquisition status'] for r in covers)),verifiedLiveUpdates=sum(r['Publication status']=='PUBLISHED_VERIFIED' for r in covers),remainingAbsent=sum(not r['Live cover present'] for r in covers),scope='Owner-assigned cover gaps only. Input assessment is not a new merchant, Google Search/Maps or image review. Prepared illustrations and verified live covers remain separate.')
 if 'Menu reviews' in wb:
  menus=records(wb,'Menu reviews')
  result['vegMenuReviews']=dict(total=len(menus),researchChecked=sum(r['Research status']=='CHECKED' for r in menus),remainingResearch=sum(r['Research status']!='CHECKED' for r in menus),mapsChecked=sum(r['Google Maps check']=='CHECKED' for r in menus),searchChecked=sum(r['Google Search check']=='CHECKED' for r in menus),menuStates=dict(Counter(r['Menu status'] for r in menus)),publicationStates=dict(Counter(r['Publication status'] for r in menus)),verifiedLiveMenuUpdates=sum(r['Publication status']=='PUBLISHED_VERIFIED' for r in menus),remainingAbsent=sum(not r['Live menu entries'] for r in menus),scope='Owner-assigned existing Veg Kitchen missing menus only. Research, required-source coverage, supported dishes, prices and verified publication are separate; Google venue-spend ranges are not menu prices.')
  result['vegMenuReviews']['preliminarySourceReviews']=result['vegMenuReviews']['researchChecked']
  result['vegMenuReviews']['requiredGoogleSourcesChecked']=sum(r['Google Search check']==r['Google Maps check']=='CHECKED' for r in menus)
  result['vegMenuReviews']['supportedMenusUnpublished']=sum(r['Menu status'] in ['VERIFIED_PARTIAL','VERIFIED_FULL'] and r['Publication status']!='PUBLISHED_VERIFIED' for r in menus)
 if 'Veg refresh' in wb:
  refresh=records(wb,'Veg refresh')
  result['vegRefresh']=dict(total=len(refresh),inventoryChecked=sum(r['Inventory status']=='CHECKED' for r in refresh),researchChecked=sum(r['Research status']=='CHECKED' for r in refresh),remainingResearch=sum(r['Research status']!='CHECKED' for r in refresh),coverRoutes=dict(Counter(r['Cover route'] for r in refresh)),coverPublication=dict(Counter(r['Cover publication status'] for r in refresh)),contactStates=dict(Counter(r['Contact status'] for r in refresh)),contactPublication=dict(Counter(r['Contact publication status'] for r in refresh)),liveMenuEntries=sum(r['Live menu entries'] or 0 for r in refresh),liveSGDPricedDishes=sum(r['Live SGD priced dishes'] or 0 for r in refresh),scope='Owner-requested 2 November live Veg cover/contact/menu refresh. Inventory, source research, draft inspection, preparation and verified publication are independent. Existing dishes/prices are dated observations, not fresh merchant verification.')
 return result

def google_check_coverage(wb,mixed):
 checks={(r['Subject ID'],r['Source category']):r for r in records(wb,'Source checks') if r['Subject type']=='MIXED_CANDIDATE'}
 per_source={}
 for category in ['GOOGLE_SEARCH','GOOGLE_MAPS_METADATA']:
  scoped=[checks.get((row['Candidate ID'],category),{}) for row in mixed]
  checked=sum(r.get('Check result')=='CHECKED' and bool(r.get('Checked date')) and bool(r.get('Evidence IDs')) for r in scoped)
  limited_count=sum(r.get('Check result')=='ACCESS_LIMITED' and bool(r.get('Checked date')) and bool(r.get('Evidence IDs')) for r in scoped)
  per_source[category]=dict(checked=checked,accessLimited=limited_count,notAttempted=len(mixed)-checked-limited_count)
 complete=[];limited=[]
 for row in mixed:
  sources=[checks.get((row['Candidate ID'],category),{}) for category in ['GOOGLE_SEARCH','GOOGLE_MAPS_METADATA']]
  if all(r.get('Check result') in ['CHECKED','ACCESS_LIMITED'] and r.get('Checked date') and r.get('Evidence IDs') for r in sources):
   complete.append(row)
   if any(r['Check result']=='ACCESS_LIMITED' for r in sources):limited.append(row)
 done={r['Candidate ID'] for r in complete}
 return dict(bothAttempted=len(complete),bothChecked=len(complete)-len(limited),withAccessLimits=len(limited),missingRequiredChecks=len(mixed)-len(complete),assignedMissingRequiredChecks=sum(bool(r['Review batch ID']) and r['Candidate ID'] not in done for r in mixed),bySource=per_source)
def update_summary(wb):
 s=summary(wb)
 for key,value in [('Schema version',SCHEMA),('Updated at',now()),('Live Veg Kitchen',s['liveKitchenCounts'].get('VEG_KITCHEN',0)),('Live Mixed Kitchen',s['liveKitchenCounts'].get('MIXED_KITCHEN',0)),('Leads tracked',s['leadCount']),('Held leads',sum(s['holds'].values())),('Authorized pending locations',sum(r['Publication status']=='AUTHORIZED' for r in records(wb,'Locations')))]:setmeta(wb,key,value)
 if 'mixedCandidates' in s:
  mixed=s['mixedCandidates'];google=mixed['requiredGoogleChecks']
  for key,value in [('Mixed candidate count',mixed['total']),('Mixed preliminary source passes recorded',mixed['researchChecked']),('Mixed preliminary source passes remaining',mixed['remainingPreliminarySourceReviews']),('Mixed required Google checks successfully completed',google['bothChecked']),('Mixed required Google checks attempted with access limits',google['withAccessLimits']),('Mixed missing required Google checks',google['missingRequiredChecks'])]:setmeta(wb,key,value)
def save(wb,path):
 if 'Mixed candidates' not in wb:replace_sheet(wb,'Mixed candidates',MIXED_COLUMNS,[])
 if 'Mixed batches' not in wb:replace_sheet(wb,'Mixed batches',RESEARCH_BATCH_COLUMNS,[])
 if 'Mixed dishes' not in wb:replace_sheet(wb,'Mixed dishes',MIXED_DISH_COLUMNS,[])
 make_terms(wb)
 update_summary(wb);format_workbook(wb)
 temp=Path(path).with_suffix('.tmp.xlsx');wb.save(temp)
 # Windows indexers/readers can briefly hold the destination after a read.
 # Keep the fully written temporary workbook and retry the atomic replacement.
 for attempt in range(30):
  try:temp.replace(path);break
  except PermissionError:
   if attempt==29:raise
   time.sleep(1)
def validate(wb):
 schema=metadata(wb).get('Schema version')
 assert schema in ['2.0',SCHEMA],'Wrong tracker schema'
 tables={}
 for name,head in SHEETS.items():
  if name in ['Mixed dishes','Hours reviews','Hours follow-up','Cover acquisition','Menu reviews'] and name not in wb:continue
  if name not in wb and schema=='2.0' and name in ['Mixed candidates','Mixed batches']:continue
  assert [c.value for c in wb[name][1]]==head,'Wrong columns: '+name
  rows=records(wb,name);ids=[r[head[0]] for r in rows];assert len(ids)==len(set(ids)),name+' duplicate IDs';tables[name]=rows
  for r in rows:
   for k,v in r.items():
    if k in ENUMS:assert v in ENUMS[k],f'{name} {r[head[0]]}: invalid {k}={v}'
 loc={r['Location ID']:r for r in tables['Locations']};ev={r['Evidence ID']:r for r in tables['Evidence']}
 for r in tables['Leads']:
  assert not r['Location ID'] or r['Location ID'] in loc,'Lead references missing location'
  assert not(r['Eligibility']=='HOLD' and r['Recommendation']!='HOLD')
 for name in ['Locations','Leads','Source checks','Validations','Mixed candidates','Hours reviews','Hours follow-up','Cover acquisition','Menu reviews']:
  if name not in tables:continue
  for r in tables[name]:
   for eid in str(r.get('Evidence IDs') or '').splitlines():assert eid in ev,'Missing evidence '+eid
 for r in tables['Evidence']:
  subjects={'LOCATION':loc,'LEAD':{x['Candidate ID'] for x in tables['Leads']},'MIXED_CANDIDATE':{x['Candidate ID'] for x in tables.get('Mixed candidates',[])}}
  assert r['Subject type'] in subjects
  assert r['Subject ID'] in subjects[r['Subject type']],'Evidence references missing subject'
  assert isinstance(r['Accepted'],bool),'Accepted must be an Excel boolean'
  if r['Accepted']:assert not WEAK.search(str(r['URL'])),'Excluded source marked accepted'
 if 'Menu reviews' in tables:
  menus=tables['Menu reviews'];ids=[r['Location ID'] for r in menus]
  assert len(ids)==len(set(ids)),'Menu reviews duplicate canonical location'
  counts=Counter(r['Batch ID'] for r in menus)
  assert all(b and 1<=n<=50 for b,n in counts.items()),'Menu review batch exceeds50 or lacks ID'
  for r in menus:
   assert r['Location ID'] in loc and r['Kitchen']==loc[r['Location ID']]['Kitchen']=='VEG_KITCHEN','Menu review must reference existing Veg Kitchen'
   assert r['Google Search check'] in ENUMS['Check result'] and r['Google Maps check'] in ENUMS['Check result']
   assert isinstance(r['Live menu entries'],int) and r['Live menu entries']>=0
   assert isinstance(r['Prior live menu entries'],int) and r['Prior live menu entries']>=0
   dishes=json.loads(r['Supported dishes'] or '[]');assert isinstance(dishes,list)
   if r['Research status']=='CHECKED':assert r['Research checked date'] and r['Evidence IDs'] and r['Limitations'] and r['Next action']
   if r['Menu status'] in ['VERIFIED_PARTIAL','VERIFIED_FULL']:
    assert dishes and r['Menu source'] and r['Evidence IDs'],'Verified menu lacks source/dishes'
   if r['Publication status']=='PUBLISHED_VERIFIED':
    assert r['Live verified at'] and r['Live menu entries']>0
    assert any(e['Location ID']==r['Location ID'] and e['Action']=='UPDATE_MENU' and e['Verified at'] for e in tables['Publication events']),'Menu lacks verified update event'
 for r in tables['Locations']:
  assert r['Name'] and r['Address']
  assert isinstance(r['Allium-free claim value'],bool)
  if r['Publication status'] in ['PREPARED','AUTHORIZED']:
   assert r['Identity validation']==r['Operation validation']=='VERIFIED'
   if r['Kitchen']=='MIXED_KITCHEN':
    assert r['Whole-kitchen validation']=='NOT_APPLICABLE' and r['Menu status'] in ['VERIFIED_PARTIAL','VERIFIED_FULL']
    assert any(x['Location ID']==r['Location ID'] and x['Mixed eligibility']=='VERIFIED' for x in tables.get('Mixed candidates',[])),'Mixed location lacks qualifying candidate'
   else:assert r['Kitchen']=='VEG_KITCHEN' and r['Whole-kitchen validation']=='VERIFIED'
   assert r['Primary source URL'] and not WEAK.search(r['Primary source URL'])
   assert 1.15<=r['Latitude']<=1.48 and 103.6<=r['Longitude']<=104.1
   assert re.fullmatch(r'\d{6}',str(r['Postcode']))
   assert r['Research status']=='CHECKED' and r['Research checked date']
   accepted=[ev[eid] for eid in str(r['Evidence IDs'] or '').splitlines() if ev[eid]['Accepted']]
   assert accepted,'Prepared location has no accepted evidence'
   assert any(re.match(r'202[5-9]|20[3-9]\d',str(e['Source date'] or '')) or e['Source class'] in ['GOVERNMENT','MERCHANT','LANDLORD_OPERATOR'] and 'current' in str(e['Date basis']).lower() for e in accepted),'Prepared location has no qualifying recent/current evidence'
 for r in tables['Leads']:
  if r['Eligibility']=='HOLD':assert r['Hold reason'] in ['CURRENT_EVIDENCE','WHOLE_KITCHEN_DIET','IDENTITY_CONFLICT'] and r['Publication status']=='NOT_PUBLISHED'
  if r['Publication status']=='PUBLISHED_VERIFIED':assert r['Eligibility']=='VERIFIED' and r['Location ID'] in loc and loc[r['Location ID']]['Publication status']=='PUBLISHED_VERIFIED'
 if 'Mixed candidates' in tables:
  mixed=tables['Mixed candidates'];batches={r['Review batch ID']:r for r in tables['Mixed batches']}
  google_ids=[r['Google place ID'] for r in mixed];assert len(google_ids)==len(set(google_ids)),'Mixed Google ID duplicated'
  for r in mixed:
   assert not r['Location ID'] or r['Location ID'] in loc,'Mixed candidate links missing canonical location'
   assert not r['Review batch ID'] or r['Review batch ID'] in batches,'Mixed candidate links missing research batch'
   assert isinstance(r['Historical website name match'],bool) and isinstance(r['Owner suppression'],bool)
   assert isinstance(r['Bot attempts'],int) and r['Bot attempts']>=0
   assert re.fullmatch(r'\d{6}',str(r['Postcode']))
   if r['Research status']=='CHECKED':assert r['Research checked date'] and r['Verification scope'] and r['Evidence IDs'],'Checked Mixed candidate lacks evidence/scope/date'
   if r['Publication status']=='PUBLISHED_VERIFIED':assert r['Location ID'] and loc[r['Location ID']]['Publication status']=='PUBLISHED_VERIFIED','Bot publication alone is not verified live publication'
   if r['Mixed eligibility']=='VERIFIED':
    assert r['Identity validation']==r['Operation validation']=='VERIFIED' and r['Evidence IDs'],'Mixed eligibility lacks identity/operation/evidence'
    assert r['Menu status'] in ['VERIFIED_PARTIAL','VERIFIED_FULL'] and any(ev[eid]['Accepted'] for eid in str(r['Evidence IDs']).splitlines()),'Mixed eligibility lacks accepted menu evidence'
   if r['Cover status']=='VERIFIED':assert r['Cover type'] in ['FOOD','VENUE'] and r['Cover source'] and r['Cover rights'],'Cover lacks exact subject/source/rights'
  for bid,b in batches.items():
   scoped=[r for r in mixed if r['Review batch ID']==bid]
   assert 1<=len(scoped)<=50 and len(scoped)==b['Candidate count'],'Mixed research batch size mismatch'
   assert sum(r['Research status']=='CHECKED' for r in scoped)==b['Research checked count'],'Mixed research checked count mismatch'
   for status,column in [('PENDING','Pending count'),('HELD','Held count'),('NOT_QUALIFIED','Not qualified count'),('PUBLISHED','Published reported count')]:assert sum(r['Bot status']==status for r in scoped)==b[column],'Mixed batch bot count mismatch'
   if b['Review batch status']=='RESEARCH_CHECKED':
    assert b['Research checked count']==len(scoped) and b['Completed at'],'Incomplete research batch marked checked'
    if metadata(wb).get('Required Google source checks'):
     source_checks={(r['Subject ID'],r['Source category']):r for r in tables['Source checks'] if r['Subject type']=='MIXED_CANDIDATE'}
     for row in scoped:
      for category in ['GOOGLE_SEARCH','GOOGLE_MAPS_METADATA']:
       check=source_checks.get((row['Candidate ID'],category),{})
       assert check.get('Check result') in ['CHECKED','ACCESS_LIMITED'] and check.get('Checked date') and check.get('Evidence IDs'),f'Required {category} check missing: '+row['Candidate ID']
       evidence_rows=[ev[eid] for eid in str(check['Evidence IDs']).splitlines()]
       assert any(re.match(r'https://(www\.)?google\.com(\.sg)?/search\?',str(e['URL'])) if category=='GOOGLE_SEARCH' else re.match(r'https://((www\.)?google\.com(\.sg)?/maps|maps\.google\.com)',str(e['URL'])) for e in evidence_rows),f'Required {category} lacks direct Google URL: '+row['Candidate ID']
  mixed_ids={r['Candidate ID'] for r in mixed}
  for r in tables.get('Mixed dishes',[]):
   assert r['Candidate ID'] in mixed_ids and r['Dish'] and r['Merchant label'],'Dish lacks candidate or merchant label'
   assert r['Currency'] in ['SGD','UNKNOWN'] and (r['Amount'] is None or isinstance(r['Amount'],(int,float)) and r['Amount']>=0),'Invalid dish price'
   assert r['Source URL'] and not WEAK.search(r['Source URL']) and r['Research checked date']
   assert isinstance(r['Published'],bool)
   for eid in str(r['Evidence IDs'] or '').splitlines():assert eid in ev and ev[eid]['Accepted'],'Dish lacks accepted source evidence'
 if 'Hours follow-up' in tables:
  follow=tables['Hours follow-up'];review={r['Review ID']:r for r in tables.get('Hours reviews',[])}
  assert len(follow)==len({r['Location ID'] for r in follow}),'Repeated hours follow-up location'
  for r in follow:
   assert r['Location ID'] in loc and r['Review ID'] in review
   assert review[r['Review ID']]['Location ID']==r['Location ID']
   if r['Research status']=='CHECKED':
    assert r['Research checked date'] and r['Finding'] and r['Evidence IDs'] and r['Source coverage'] and r['Limitations']
    assert r['Routine recheck']=='NO' and r['Reopen trigger'],'Completed hours research needs explicit reopen policy'
   if r['Hours status']=='VERIFIED_WEEK':assert r['Identity validation']=='VERIFIED' and r['Hours schedule'] and r['Hours source']
   if r['Publication status']=='PUBLISHED_VERIFIED':assert any(e['Location ID']==r['Location ID'] and e['Action']=='UPDATE_HOURS' and e['Verified at'] for e in tables['Publication events'])
  for bid in {r['Batch ID'] for r in follow}:assert 1<=sum(r['Batch ID']==bid for r in follow)<=50
 if 'Hours reviews' in tables:
  hours=tables['Hours reviews'];location_ids=[r['Location ID'] for r in hours]
  assert len(location_ids)==len(set(location_ids)),'Hours review canonical location duplicated'
  batches=Counter(r['Batch ID'] for r in hours)
  assert all(bid and 1<=count<=50 for bid,count in batches.items()),'Hours review batch exceeds50 or lacks ID'
  for r in hours:
   assert r['Location ID'] in loc and r['Kitchen']=='VEG_KITCHEN','Hours review lacks canonical Veg location'
   if r['Research status']=='NOT_CHECKED':
    assert r['Hours status']=='NOT_RESEARCHED' and not r['Research checked date'],'Unattempted hours review falsely checked'
    continue
   assert r['Research checked date'] and r['Captured at'] and r['Evidence IDs'] and r['Access method'] and r['Limitations'] and r['Technical receipt'],'Hours review lacks dated source/limitations/receipt'
   assert re.fullmatch(r'https://places\.googleapis\.com/v1/(?:places/[A-Za-z0-9_-]+|places:searchText)',str(r['API source URL'])),'Hours API source must be actual endpoint'
   if r['Hours status'] in ['VERIFIED_WEEK','VERIFIED_PARTIAL']:
    assert r['Identity validation']=='VERIFIED' and r['Google place ID'] and r['Google listing name'] and r['Google listing address'],'Hours lack exact listing identity'
    assert r['Hours schedule'],'Verified hours lack schedule'
    assert any(ev[eid]['Accepted'] for eid in str(r['Evidence IDs']).splitlines()),'Hours lack accepted evidence'
    if r['Hours status']=='VERIFIED_WEEK':assert len(str(r['Hours schedule']).splitlines())==7,'Full week must contain seven explicit weekday rows'
   for column,kind in [('Special days',list),('Regular periods JSON',list),('Current hours JSON',dict)]:
    if r[column]:assert isinstance(json.loads(r[column]),kind),'Invalid hours JSON: '+column
 if 'Cover acquisition' in tables:
  covers=tables['Cover acquisition']
  assert len(covers)==len({r['Location ID'] for r in covers}),'Repeated cover acquisition location'
  batches=Counter(r['Acquisition batch ID'] for r in covers)
  assert all(bid and 1<=count<=50 for bid,count in batches.items()),'Cover acquisition batch exceeds50 or lacks ID'
  for r in covers:
   assert r['Location ID'] in loc and r['Kitchen']==loc[r['Location ID']]['Kitchen']=='VEG_KITCHEN'
   assert isinstance(r['Live cover present'],bool)
   assert r['Input assessment status'] in ['NOT_CHECKED','CHECKED']
   assert r['Acquisition status'] in ['HELD_INPUT','READY_FOR_GENERATION','GENERATED_AWAITING_REVIEW','PREPARED','PUBLISHED_VERIFIED']
   if r['Input assessment status']=='CHECKED':assert r['Assessment checked at'] and r['Live observed at'] and r['Evidence IDs'] and r['Limitations'] and r['Technical receipt']
   if r['Acquisition status'] in ['READY_FOR_GENERATION','GENERATED_AWAITING_REVIEW','PREPARED','PUBLISHED_VERIFIED']:
    assert r['Supported subject'] and r['Source URL'] and r['Access method'] and r['Rights and attribution'],'Cover acquisition lacks independent subject/source/rights'
   if r['Acquisition status'] in ['PREPARED','PUBLISHED_VERIFIED']:
    photo=json.loads(r['Prepared photo metadata']);assert re.fullmatch(r'[a-f0-9]{64}',str(r['Asset SHA256']))
    assert photo['path']=='/api/catalogue-photos/'+r['Asset SHA256']+'.jpg' and photo['author'] and photo['license'] and photo['sourceUrl']
   if r['Publication status']=='PUBLISHED_VERIFIED':
    assert r['Acquisition status']=='PUBLISHED_VERIFIED' and r['Live cover present']
    assert any(e['Location ID']==r['Location ID'] and e['Action']=='UPDATE_PHOTO' and e['Verified at'] for e in tables['Publication events']),'Cover acquisition lacks verified photo publication event'
 return summary(wb)
def payload(r):
 d=dict(name=r['Name'],branch=r['Branch'] or '',address=r['Address'],postalCode=str(r['Postcode']),aliases=str(r['Aliases'] or '').splitlines(),point=dict(latitude=r['Latitude'],longitude=r['Longitude']),venueDiet=r['Venue diet value'],alliumFreeClaim=r['Allium-free claim value'],kitchen=None,menuTotal=None,sourceUrl=r['Primary source URL'])
 if r['Kitchen']=='MIXED_KITCHEN':d['kitchen']='options'
 if r['Hours summary']:
  d['hours']=dict(summary=r['Hours summary'],schedule=str(r['Hours schedule'] or '').splitlines(),notes=r['Hours notes'] or '',sourceUrl=r['Hours source'],checkedAt=r['Hours checked date'],timezone='Asia/Singapore')
 return d
def stronger_same(a,b):
 if a.get('postalCode')!=b.get('postalCode'):return False
 sys.path.insert(0,str(ROOT/'ops/qt-team'));import veg_options
 if veg_options.same_place(a,b):return True
 n=lambda s:re.sub(r'[^a-z0-9\u3400-\u9fff]','',unicodedata.normalize('NFKC',str(s)).lower().replace('鄉','乡').replace('齋','斋'))
 namesa={n(x) for x in [a.get('name'),*a.get('aliases',[])] if x};namesb={n(x) for x in [b.get('name'),*b.get('aliases',[])] if x}
 return bool(namesa&namesb)
def export(wb,path,args):
 validate(wb);batch=next(r for r in records(wb,'Publication batches') if r['Batch ID']==args.batch)
 assert batch['Status']=='AUTHORIZED' and batch['Owner authorization'],'Owner authorization absent'
 selected=[r for r in records(wb,'Locations') if r['Batch ID']==args.batch and r['Publication status']=='AUTHORIZED']
 assert len(selected)==batch['Authorized count']>0
 content=read(args.content);cat=read(args.catalogue);items=content['items'];listed=cat['veg']['venues']+cat['mixed']['venues']
 if all(r['Kitchen']=='MIXED_KITCHEN' for r in selected):
  import explore_tracker_mixed_publication as mixed_publication
  return mixed_publication.export(sys.modules[__name__],wb,path,args,batch,selected)
 assert all(r['Kitchen']=='VEG_KITCHEN' for r in selected)
 leads=records(wb,'Leads');ev={r['Evidence ID']:r for r in records(wb,'Evidence')};creations=[]
 for r in selected:
  d=payload(r);assert not any(x['id']==r['Location ID'] or x['kind']=='place' and x['data'].get('name') and stronger_same(d,x['data']) for x in items),'Existing/hidden content match: '+r['Name']
  assert not any(stronger_same(d,x) for x in listed),'Live duplicate: '+r['Name']
  assert not any(stronger_same(d,x['data']) for x in creations),'Batch duplicate'
  source=[ev[x] for x in str(r['Evidence IDs']).splitlines() if ev[x]['Accepted']]
  assert source
  evidence=[dict(url=x['URL'],date=x['Source date'] or x['Access date'] or 'undated',dateBasis=x['Date basis'],says=x['Fact supported'],evidenceId=x['Evidence ID']) for x in source]
  cid=next(x['Candidate ID'] for x in leads if x['Location ID']==r['Location ID'] and x['Batch ID']==args.batch)
  creations.append(dict(id=r['Location ID'],candidateId=cid,expectedVersion=0,action='create',data=d,evidence=evidence,reason='Owner-authorized publication from authoritative Excel tracker. '+str(r['Decision notes'] or 'Identity, operation and whole-kitchen eligibility verified.')))
 out=Path(args.out);assert not out.exists(),'Immutable packet already exists'
 result=dict(version=1,batchId=args.batch,ownerAuthorizedPublication=True,ownerRequest=batch['Owner authorization'],workbook=str(path.relative_to(ROOT)),workbookRevision=metadata(wb)['Workbook revision'],workbookSha256=sha(path),reviewedAt=now(),baselineContentSha256=sha(args.content),baselineCatalogueSha256=sha(args.catalogue),creations=creations,existingVerified=[])
 out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 return dict(exported=len(creations),packet=str(out),sha256=sha(out),sourceWorkbookSha256=result['workbookSha256'])
def record(wb,path,args):
 packet=read(args.packet);receipt=read(args.receipt);proof=read(args.verification);after=read(args.content);cat=read(args.catalogue)
 if packet.get('scope')=='mixed':
  import explore_tracker_mixed_publication as mixed_publication
  return mixed_publication.record(sys.modules[__name__],wb,path,args,packet,receipt,proof,after,cat)
 assert receipt.get('applied') is True,'Applied publication receipt required'
 assert receipt.get('reviewedInputSha256')==sha(args.packet)==proof.get('reviewedInputSha256'),'Verification must match the exported publication packet'
 assert proof.get('passed') is True and proof.get('internalExactFieldsVerified') is True,'Exact-field verification required'
 assert proof.get('deployedBrowserChecksPassed') is True,'Deployed browser verification required'
 assert sha(path)==packet['workbookSha256'],'Workbook changed after export: review before reconciliation'
 live={v['id']:v for v in cat['veg']['venues']};items={x['id']:x for x in after['items'] if x['kind']=='place'}
 selected={p['id']:p for p in packet['creations']};checked=proof['checkedAt']
 for pid,p in selected.items():
  assert pid in live and items[pid]['data']==p['data'] and items[pid]['version']==1 and not items[pid]['hidden']
 rows=records(wb,'Locations')
 for r in rows:
  if r['Location ID'] in selected:r.update({'Publication status':'PUBLISHED_VERIFIED','Publication verified at':checked,'Live observed at':cat['checkedAt'],'Content version':1})
  elif r['Location ID'] in live or any(x['id']==r['Location ID'] for x in cat['mixed']['venues']):r['Live observed at']=cat['checkedAt']
 replace_sheet(wb,'Locations',LOCATION_COLUMNS,rows)
 leads=records(wb,'Leads')
 for r in leads:
  if r['Location ID'] in selected:r['Publication status']='PUBLISHED_VERIFIED'
 replace_sheet(wb,'Leads',LEAD_COLUMNS,leads)
 batches=records(wb,'Publication batches')
 for r in batches:
  if r['Batch ID']==packet['batchId']:r.update({'Status':'PUBLISHED_VERIFIED','Workbook revision at export':packet['workbookRevision'],'Input SHA256':sha(args.packet),'Applied at':receipt['appliedAt'],'Verified at':checked,'Backup reference':receipt['backup']})
 replace_sheet(wb,'Publication batches',BATCH_COLUMNS,batches)
 events=records(wb,'Publication events')
 for pid in selected:events.append({'Event ID':packet['batchId']+':'+pid,'Batch ID':packet['batchId'],'Location ID':pid,'Action':'CREATED','Expected version':0,'Observed version':1,'Applied at':receipt['appliedAt'],'Verified at':checked,'Receipt reference':str(Path(args.receipt).resolve().relative_to(ROOT)).replace('\\','/'),'Notes':'Internal exact fields, full public inventory and deployed UI verified.'})
 replace_sheet(wb,'Publication events',EVENT_COLUMNS,events)
 vals=records(wb,'Validations')
 for pid in selected:vals.append({'Validation ID':'PUB-'+packet['batchId']+'-'+pid,'Subject type':'LOCATION','Subject ID':pid,'Field':'PUBLICATION','Result':'VERIFIED','Checked date':checked[:10],'Evidence IDs':'','Scope and limits':'Applied content version1 and all expected public fields verified; not menu/cover/full-week certification.'})
 replace_sheet(wb,'Validations',VALIDATION_COLUMNS,vals)
 changes=records(wb,'Change log');changes.append({'Change ID':'publication-'+packet['batchId'],'Changed at':now(),'Actor':'Codex','Scope':packet['batchId'],'Change':str(len(selected))+' authorized kitchens published and verified. Research evidence dates preserved.','Evidence / receipt':str(args.receipt)})
 replace_sheet(wb,'Change log',CHANGE_COLUMNS,changes)
 setmeta(wb,'Workbook revision',packet['batchId']+'-published');setmeta(wb,'Last live verification',checked)
 save(wb,path);return validate(openpyxl.load_workbook(path))
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--workbook',type=Path,default=DEFAULT);sub=p.add_subparsers(dest='command',required=True)
 sub.add_parser('status');sub.add_parser('validate');s=sub.add_parser('show');s.add_argument('--id',required=True)
 e=sub.add_parser('import-mixed');e.add_argument('--snapshot',required=True,type=Path)
 e=sub.add_parser('export-publication');e.add_argument('--batch',required=True);e.add_argument('--content',required=True);e.add_argument('--catalogue',required=True);e.add_argument('--out',required=True)
 e=sub.add_parser('record-publication')
 for a in ['packet','receipt','content','catalogue','verification']:e.add_argument('--'+a,required=True)
 args=p.parse_args();wb=openpyxl.load_workbook(args.workbook)
 if args.command=='status':result=summary(wb)
 elif args.command=='validate':result=dict(passed=True,**validate(wb))
 elif args.command=='show':result={n:[r for r in records(wb,n) if args.id in [r.get('Location ID'),r.get('Candidate ID'),r.get('Subject ID')]] for n in ['Locations','Leads','Mixed candidates','Hours reviews','Hours follow-up','Cover acquisition','Evidence','Source checks','Validations'] if n in wb}
 elif args.command=='import-mixed':
  from explore_tracker_mixed import import_candidates
  result=import_candidates(wb,args.workbook,args.snapshot)
 elif args.command=='export-publication':result=export(wb,args.workbook,args)
 else:result=record(wb,args.workbook,args)
 print(json.dumps(result,ensure_ascii=False,default=str))
if __name__=='__main__':main()
