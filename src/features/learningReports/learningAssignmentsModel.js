// Pure model shared by the specialist TTCM table and CI tests.
export const reportCanBeRevoked=task=>{
  if(!task||task.status!=='draft'||task.submitted_at||task.reviewed_at)return false;
  return !Object.values(task.payload||{}).some(value=>value!==null&&value!==undefined&&
    (typeof value==='object'?Object.keys(value).length>0:String(value).trim()!==''));
};
export function filteredLearningAssignments(tasks,{kind='all',month='all',status='all',query=''}={}){
  const q=query.trim().toLocaleLowerCase('vi');
  return (tasks||[]).filter(t=>
    (kind==='all'||t.report_kind===kind)&&
    (month==='all'||String(t.period||'').slice(0,7)===month)&&
    (status==='all'||t.status===status)&&
    (!q||String(t.teacherLabel||'').toLocaleLowerCase('vi').includes(q)||
      String(t.report_kind==='gifted'?'Bồi dưỡng học sinh giỏi':'Phụ đạo học sinh').toLocaleLowerCase('vi').includes(q))
  ).sort((a,b)=>String(b.period).localeCompare(String(a.period))||
    String(a.teacherLabel).localeCompare(String(b.teacherLabel),'vi'));
}
export const eligibleAssignmentIds=rows=>(rows||[]).filter(reportCanBeRevoked).map(t=>t.id);
