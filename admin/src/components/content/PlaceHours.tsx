'use client';
import { useState } from 'react';
import { IconButton } from '../Primitives';
import { RecipeDialog } from './RecipeDialog';
import { today, type Hours } from './place-model';
const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
type Day={open:string;close:string;closed:boolean};
export function parseDays(schedule:string[]):Day[]|null {
  if(schedule.length!==7)return null;
  const result=schedule.map((line,i)=>{const match=new RegExp('^'+days[i]+' (Closed|([0-2][0-9]:[0-5][0-9])–([0-2][0-9]:[0-5][0-9]))$').exec(line);return match?{closed:match[1]==='Closed',open:match[2]??'',close:match[3]??''}:null;});
  return result.every(v=>v!==null)?result:null;
}
export const dayLines=(rows:Day[])=>rows.map((row,i)=>days[i]+' '+(row.closed?'Closed':row.open+'–'+row.close));
export function PlaceHours({hours,set,disabled}:{hours?:Hours|null;set:(h:Hours|null)=>void;disabled:boolean}) {
  const [daily,setDaily]=useState(false);const rows=hours?parseDays(hours.schedule):null;
  const update=(patch:Partial<Hours>)=>hours&&set({...hours,...patch});
  return <><div className="place-panel-body place-hours"><div className="row spread"><label className="check"><input type="checkbox" checked={!!hours} disabled={disabled} onChange={e=>set(e.target.checked?{summary:'',schedule:[''],notes:'',sourceUrl:'',checkedAt:today()}:null)}/>Set hours</label>
    {hours&&rows&&<button type="button" className="plain" disabled={disabled} onClick={()=>update({schedule:dayLines(rows.map(()=>({...rows[0]})))})}>Copy Monday</button>}</div>
    {hours&&<><div className="place-schedule">{rows?rows.map((row,i)=><div className="place-day" key={days[i]}><span>{days[i]}</span><input type="time" aria-label={days[i]+' opening time'} disabled={disabled||row.closed} value={row.open} onChange={e=>update({schedule:dayLines(rows.map((r,j)=>j===i?{...r,open:e.target.value}:r))})}/><span>–</span><input type="time" aria-label={days[i]+' closing time'} disabled={disabled||row.closed} value={row.close} onChange={e=>update({schedule:dayLines(rows.map((r,j)=>j===i?{...r,close:e.target.value}:r))})}/><IconButton icon={row.closed?'plus':'close'} label={(row.closed?'Open ':'Close ')+days[i]} disabled={disabled} onClick={()=>update({schedule:dayLines(rows.map((r,j)=>j===i?{...r,closed:!r.closed,open:r.open||'09:00',close:r.close||'18:00'}:r))})}/></div>)
      :<label>Schedule<textarea rows={7} value={hours.schedule.join('\n')} disabled={disabled} onChange={e=>update({schedule:e.target.value.split('\n')})}/></label>}</div>
      <label>Summary<input value={hours.summary} disabled={disabled} maxLength={120} onChange={e=>update({summary:e.target.value})}/></label><label>Notes<textarea rows={2} value={hours.notes} disabled={disabled} onChange={e=>update({notes:e.target.value})}/></label>
      <div className="divider"/><label>Source<input type="url" value={hours.sourceUrl} disabled={disabled} onChange={e=>update({sourceUrl:e.target.value})}/></label><label>Checked<input type="date" max={today()} value={hours.checkedAt} disabled={disabled} onChange={e=>update({checkedAt:e.target.value})}/></label>
    </>}</div>{hours&&<footer><button type="button" className="plain" disabled={disabled} onClick={()=>setDaily(true)}>Edit days</button><button type="button" className="plain" disabled={disabled} onClick={()=>setDaily(true)}>Split hours</button></footer>}
    {daily&&hours&&<ScheduleDialog hours={hours} onClose={()=>setDaily(false)} onSave={schedule=>{update({schedule});setDaily(false);}}/>}</>;
}
function ScheduleDialog({hours,onClose,onSave}:{hours:Hours;onClose:()=>void;onSave:(lines:string[])=>void}) {
  const [schedule,setSchedule]=useState(hours.schedule.join('\n')),[mode,setMode]=useState<'text'|'days'>('text'),[rows,setRows]=useState<Day[]>(()=>parseDays(hours.schedule)??days.map(()=>({open:'',close:'',closed:false}))),[error,setError]=useState('');
  return <RecipeDialog title="Schedule" onClose={onClose} actions={<><button type="button" onClick={onClose}>Cancel</button><button type="button" className="primary" onClick={()=>{if(mode==='days'&&rows.some(r=>!r.closed&&(!r.open||!r.close))){setError('Set both times or mark the day closed.');return;}onSave(mode==='text'?schedule.split('\n'):dayLines(rows));}}>Apply</button></>}>
    <div className="row"><button type="button" aria-pressed={mode==='text'} onClick={()=>setMode('text')}>Schedule</button><button type="button" aria-pressed={mode==='days'} onClick={()=>setMode('days')}>Days</button></div>
    {mode==='text'?<label>Hours<textarea rows={8} value={schedule} onChange={e=>setSchedule(e.target.value)} placeholder="Mon–Fri 10:00–14:00, 17:00–21:00"/></label>:rows.map((row,i)=><div className="place-day" key={days[i]}><span>{days[i]}</span><input type="time" aria-label={days[i]+' opening time'} disabled={row.closed} value={row.open} onChange={e=>setRows(rows.map((r,j)=>i===j?{...r,open:e.target.value}:r))}/><span>–</span><input type="time" aria-label={days[i]+' closing time'} disabled={row.closed} value={row.close} onChange={e=>setRows(rows.map((r,j)=>i===j?{...r,close:e.target.value}:r))}/><label className="check"><input type="checkbox" checked={row.closed} onChange={e=>setRows(rows.map((r,j)=>i===j?{...r,closed:e.target.checked}:r))}/>Closed</label></div>)}
    {error&&<div role="alert">{error}</div>}
  </RecipeDialog>;
}
