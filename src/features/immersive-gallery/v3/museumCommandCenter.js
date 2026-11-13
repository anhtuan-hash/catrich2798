// View-only class activity analytics for Teacher Live. Do not infer grades from progress.
// No I/O or authentication decisions in this module.
const list=value=>Array.isArray(value)?value:[];
export const normaliseComment=value=>String(value||'').toLowerCase()
 .replace(/\bgroup\s*\d{1,2}\b/g,'group')
 .replace(/[’‘]/g,"'")
 .replace(/[^\p{L}\p{N}]+/gu,' ')
 .replace(/\s+/g,' ').trim();

export function checkFeedbackQuality(feedback=[]){
 const entries=list(feedback).flatMap((review,i)=>
  ['learned','clarify'].map(field=>({index:i,field,text:String(review?.[field]||'').trim()})));
 const duplicates=new Map(),warnings=[];
 for(const e of entries){
  const key=normaliseComment(e.text);
  if(!key||key.length<45)continue;
  const current=duplicates.get(key)||[];
  current.push(e);
  duplicates.set(key,current);
 }
 for(const [key,group] of duplicates){
  if(group.length>1){
   warnings.push({type:'repeated-comment',count:group.length,field:group[0].field,
    excerpt:group[0].text.slice(0,110),index:group.map(e=>e.index)});
  }
 }
 const vague=list(feedback).reduce((n,r)=>
  n+(['learned','clarify'].filter(field=>String(r?.[field]||'').trim().length>0&&
   normaliseComment(r[field]).split(' ').length<5).length),0);
 if(vague)warnings.push({type:'short-feedback',count:vague,excerpt:'Some feedback is too brief to guide revision.'});
 return warnings;
}

export function classroomSummary(payload={}){
 const groups=list(payload.groups),responses=list(payload.responses),feedback=list(payload.feedback),
  microResults=list(payload.microResults),helpGroups=list(payload.helpGroups);
 const responseIds=new Set(responses.map(r=>r?.group_id).filter(Boolean));
 const microIds=new Set(microResults.map(r=>r?.group_id).filter(Boolean));
 const helpIds=new Set(helpGroups.filter(Boolean));
 const records=groups.map(g=>{
  const reviewsReceived=feedback.filter(r=>r?.to_group===g.id);
  const reviewsGiven=feedback.filter(r=>r?.from_group===g.id);
  return {id:g.id,label:g.label||'Group',state:g.state||'issued',
   responded:responseIds.has(g.id),thinkingAnswered:microIds.has(g.id),
   askingHelp:helpIds.has(g.id),
   reviewsReceived,reviewsGiven,reviewCount:reviewsReceived.length};
 });
 return {
  groups:records,
  metrics:{groups:records.length,responded:records.filter(g=>g.responded||g.thinkingAnswered).length,
   reviewed:records.filter(g=>g.reviewCount>0).length,
   needHelp:helpIds.size,totalReviews:feedback.length},
  warnings:checkFeedbackQuality(feedback)
 };
}
