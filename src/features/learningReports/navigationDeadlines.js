// Shared nav countdown selector. Only pending/active assignments are eligible;
// the original monthly deadline remains an independent candidate.
export const LEARNING_NAV_LABELS = Object.freeze({
  gifted: {vi:'HSG',en:'Gifted'},
  remedial: {vi:'Phụ đạo',en:'Remedial'},
  monthly: {vi:'Tháng',en:'Monthly'},
});
const validDate = value => {
  if(value===null || value===undefined || value==='') return null;
  const ms=new Date(value).getTime();
  return Number.isFinite(ms)?ms:null;
};
const isPending = (status,role) => role==='manager'
  ? ['draft','revision','submitted'].includes(status)
  : ['draft','revision'].includes(status);
const byTime = (a,b,now) => {
  const aFuture=a.time>now,bFuture=b.time>now;
  if (aFuture!==bFuture) return aFuture?-1:1;
  return aFuture ? a.time-b.time : b.time-a.time;
};
export function selectReportNavigationDeadlines({monthlyDeadline=null,learningTasks=[],userId='',isLeader=false,now=Date.now()}={}) {
  const items=[];
  const monthlyTime=validDate(monthlyDeadline);
  if(monthlyTime!==null)items.push({
    id:'monthly',kind:'monthly',period:'',role:'teacher',
    time:monthlyTime,dueAt:new Date(monthlyTime).toISOString(),count:1,
  });
  const grouped=new Map();
  for(const task of learningTasks||[]){
    if(!task || !['gifted','remedial'].includes(task.report_kind))continue;
    const teacher=String(task.teacher_id||'')===String(userId||'') && Boolean(userId);
    const manager=isLeader&&String(task.head_id||'')===String(userId||'')&&Boolean(userId);
    if(!teacher&&!manager)continue;
    const role=teacher?'teacher':'manager';
    if(!isPending(task.status,role))continue;
    const due=task.effective_due_at===undefined?task.due_at:task.effective_due_at;
    const time=validDate(due);
    if(time===null)continue;
    const period=String(task.period||'').slice(0,7);
    const key=[task.report_kind,role,period,time].join('|');
    const prior=grouped.get(key);
    if(prior)prior.count+=1;
    else grouped.set(key,{
      id:key,kind:task.report_kind,period,role,count:1,time,
      dueAt:new Date(time).toISOString(),
    });
  }
  items.push(...grouped.values());
  items.sort((a,b)=>byTime(a,b,now));
  return {primary:items[0]||null,items,otherCount:Math.max(0,items.length-1)};
}
export function formatNavigationDeadline(item,language='vi',now=Date.now()){
  if(!item)return '';
  const label=LEARNING_NAV_LABELS[item.kind]?.[language==='en'?'en':'vi']||item.kind;
  if(item.time<=now)return language==='en'?label+' · End':label+' · Hết';
  const remain=item.time-now;
  const pad=n=>String(n).padStart(2,'0');
  const days=Math.floor(remain/86400000),hours=Math.floor((remain%86400000)/3600000);
  const minutes=Math.floor((remain%3600000)/60000);
  const seconds=Math.floor((remain%60000)/1000);
  const count=days>0?(language==='en'?days+'d ':days+'ng ')+pad(hours)+':'+pad(minutes)
    :pad(hours)+':'+pad(minutes)+':'+pad(seconds);
  return (item.kind==='monthly'?'':label+' ')+count;
}
export function navigationDeadlineSummary(items,language='vi',now=Date.now()){
  const date=new Intl.DateTimeFormat(language==='en'?'en-GB':'vi-VN',{
    dateStyle:'short',timeStyle:'short',
  });
  return (items||[]).map(item=>{
    const label=LEARNING_NAV_LABELS[item.kind]?.[language==='en'?'en':'vi']||item.kind;
    const group=item.role==='manager'
      ? language==='en'?'issued':'đã giao'
      : language==='en'?'assigned':'được giao';
    const period=item.period ? ' · '+item.period:'';
    const count=item.count>1?' ×'+item.count:'';
    return label+period+count+' ('+group+') · '+
      date.format(new Date(item.time))+' · '+
      formatNavigationDeadline(item,language,now);
  }).join('\n');
}
