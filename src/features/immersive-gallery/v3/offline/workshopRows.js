import {isAsean,validAseanResponse} from '../aseanLesson.js';

export function groupWorkshopRows({staff={},evidence={},groupDrafts={}}){
 const assignments=new Map((staff.assignments||[]).map(assignment=>[assignment.id,assignment]));
 const exits=new Set((staff.exitTickets||[]).map(row=>row.group_id));
 const groups=[...(staff.groups||[])].sort((a,b)=>String(a.label||'').localeCompare(String(b.label||''),undefined,{numeric:true}));
 return groups.map((group,index)=>{
  const assignment=assignments.get(group.assignment_id);
  const responses=evidence[group.assignment_id]?.responses??staff.aseanResponses??[];
  const transfer=isAsean(assignment)?responses.some(row=>row.group_id===group.id&&
   row.stage_index===5&&validAseanResponse(5,row.value)):null;
  const number=String(index+1).padStart(2,'0');
  return {id:group.id,label:group.label||'Group '+number,classScope:assignment?.class_scope||'',
   state:group.state||'',exit:exits.has(group.id),transfer,draft:Boolean(groupDrafts[group.id]),
   filename:'nhom-'+number+'.html'};
 });
}
