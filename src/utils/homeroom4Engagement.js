// Homeroom 4.0 — read-only attendance / conduct reporting.
// No guessing scheduled sessions or changing week lock, scores or corrections.
const text=(v)=>String(v??'').trim();
const rows=(obj)=>obj && typeof obj==='object'&&!Array.isArray(obj) ? obj : {};
const items=(arr)=>Array.isArray(arr)?arr:[];
function isoDay(day,delta){
  const match=text(day).slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match)return '';
  const d=new Date(Date.UTC(+match[1],+match[2]-1,+match[3]+delta));
  return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):'';
}
export function buildHomeroomEngagement(workspace={},dateIso='') {
  const attendance=rows(workspace.attendance);
  const sessions=Object.entries(attendance).filter(([key,value])=>/^\d{4}-\d{2}-\d{2}(?:::|$)/.test(key)&&value&&typeof value==='object'&&!Array.isArray(value))
    .map(([key,value])=>({
      day:key.slice(0,10),key,
      entries:Object.values(value).filter((entry)=>entry&&typeof entry==='object'&&text(entry.status)),
    }));
  const pastDays=Array.from({length:7},(_,index)=>isoDay(dateIso,index-6));
  const dates=pastDays.map((day)=>{
    const daily=sessions.filter(s=>s.day===day);
    const statuses=daily.flatMap(s=>s.entries.map(e=>e.status));
    return {
      day,sessionCount:daily.length,recordedRows:statuses.length,
      present:statuses.filter(v=>v==='present').length,
      late:statuses.filter(v=>v==='late').length,
      excused:statuses.filter(v=>v==='excused').length,
      unexcused:statuses.filter(v=>v==='unexcused').length,
      otherAbsences:statuses.filter(v=>['absent_one_period','absent_two_periods'].includes(v)).length,
    };
  });
  const totals={
    sessions:sessions.length,
    recordedRows:sessions.reduce((n,s)=>n+s.entries.length,0),
    pendingCorrections:items(workspace.correctionRequests).filter((request)=>request?.status==='pending').length,
    lockedAttendanceSessions:Object.values(rows(workspace.attendanceLocks)).filter(v=>v?.locked===true).length,
  };
  const conduct=items(workspace.conductRecords);
  const active=conduct.filter(record=>record?.status!=='cancelled');
  const summaries=items(workspace.conductWeekSummaries);
  return {
    attendance:{days:dates,totals,today:dates[6]||null,hasWeekData:dates.some(d=>d.recordedRows>0)},
    conduct:{
      total:active.length,confirmed:active.filter(x=>x.status==='confirmed').length,
      pending:active.filter(x=>x.status==='pending').length,
      rewards:active.filter(x=>x.entryType==='reward'&&x.status==='confirmed').length,
      violations:active.filter(x=>x.entryType!=='reward'&&x.status==='confirmed').length,
      lockedWeeks:summaries.filter(x=>x?.status==='locked').length,
      unlockedWeeks:summaries.filter(x=>x?.status!=='locked').length,
      recent:summaries.filter(x=>x?.weekStart).map(x=>({
        weekStart:text(x.weekStart),status:text(x.status),
      })).sort((a,b)=>b.weekStart.localeCompare(a.weekStart)).slice(0,6),
    },
  };
}
