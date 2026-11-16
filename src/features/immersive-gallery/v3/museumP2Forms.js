import {EVIDENCE_WRITING, VISITOR_TASKS} from './lessonPlanAlignment.js';

export const P2_ROLES = 'Coordinator · Language checker · Evidence checker · Designer · Visitor-test recorder (fifth member, when available)';
const text = (key, label, required = false) => ({key,label,required});
const select = (key, label, options) => ({key,label,options});
const mark = (key, label) => select(key,label,['0','1']);
const number = (key,label,max) => ({key,label,max});
const stages = ['01–02 · Issue, reason, NASA citation and first listening task','03 · Group vote, figures and scope','04–05 · Listening, options, storyboard and test plan','06–07 · V1, labels, visuals, tally, sources and credits','08 · C2 answers and one suggestion','09 · V2 and targeted retest','10–11 · Pitch, I1-B and group Exit Ticket'];
const evidence = ['Listening tasks 1 and 2','Frozen survey results','Canvas and storyboard','V1 and feedback','V2 and revision log','Pitch, rubric, I1 and group Exit Ticket'];
const tasks = VISITOR_TASKS.map((label,i)=>text('answer'+i,label,true));
const scores = VISITOR_TASKS.map((label,i)=>mark('score'+i,label));
const i1 = (stage,prompt) => ({title:'Individual writing · one minute',stage,individual:true,prompt,
 fields:[text('figures','One sentence reporting the result with a percentage',true),text('scope','One sentence explaining what the survey can tell us',true)]});
export const P2_FORMS = {
 'I1-A':i1(0,EVIDENCE_WRITING.before),
 B1:{title:'Group priority survey',stage:2,fields:[text('finding','Our finding · date, x, N and percentage',true),text('scope','What do these group votes represent?',true)]},
 B2:{title:'Compare ways to present the same action',stage:3,fields:[
  text('problem','School problem and what your visitor needs to understand',true),text('claim','NASA claim',true),text('source','NASA source link',true),text('localEvidence','Local evidence and its limitation',true),
  text('optionA','Option A · What will the visitor see or do?',true),
  ...['Clarity','Feasibility','Source traceability'].map((label,i)=>select('a'+i,'Option A · '+label,['0','1','2'])),
  text('optionB','Option B · What will the visitor see or do?',true),
  ...['Clarity','Feasibility','Source traceability'].map((label,i)=>select('b'+i,'Option B · '+label,['0','1','2'])),
  text('decision','We chose … because …',true),text('action','Who does what and when? What will you count?',true)]},
 B3:{title:'Three-panel storyboard',stage:4,fields:[
  text('action','Chosen action',true),...['The Problem','The Evidence','Our Solution'].map((label,i)=>text('panel'+i,label+' · title, first sentence, visual or source, owner',true)),
  text('order','Reading order and source location',true),text('creator','Poster idea and creator code'),text('alt','Alt text'),text('permission','Source or permission note'),
  ...tasks.map((field,i)=>({...field,key:'expected'+i,label:'Expected answer · '+field.label}))]},
 C1:{title:'Build and check V1',stage:6,prompt:'Create the three 25–40-word English labels in Group Project. Attach the dated tally, source and credited visuals. Use alt text online. Save the English prompt only if generating an image.',
  fields:[text('check','What did your group check or correct?',true),text('prompt','Image prompt and check, when used'),text('record','V1 file, screenshot or page ID (optional)')]},
 C2:{title:'Visitor test · V1',stage:7,fields:[...tasks,text('strength','One part that worked',true),text('suggestion','One specific suggestion in English',true)]},
 'C2-score':{title:'Check the three C2 answers against B3',stage:7,fields:scores},
 'C3-share':{title:'Revise and share V2 with the same group',stage:8,fields:[
  select('item','The question affected by the change',['0','1','2']),text('original','Original wording or layout',true),text('change','We changed … because the visitor …',true),text('record','V2 file, screenshot or page ID (optional)')]},
 'C3-answer':{title:'Answer the single retest question on V2',stage:8,fields:[
  text('answer','Visitor’s answer',true),select('reader','Did the reader change?',['same','different','unknown']),text('conditions','Changes to test conditions')]},
 'C3-score':{title:'Score the same question on V2',stage:8,fields:[mark('score','Retest score')]},
 D1:{title:'Paired pitch · 45 seconds + 15 seconds',stage:9,fields:[
  text('observer','Observer code',true),text('source','Evidence cited',true),text('question','Question asked',true),text('reply','Group’s reply',true)]},
 'I1-B':i1(10,EVIDENCE_WRITING.after),
 D2:{title:'Group Exit Ticket and school-week follow-up',stage:10,fields:[
  text('action','One action I can take at school is … because …',true),text('scope','Our class survey tells us …',true),
  text('range','Observation dates and action'),text('unit','Observation unit'),
  number('done','Times completed',100000),number('opportunities','Total opportunities',100000),text('summary','Result and one limitation · 2–3 English sentences')]},
 E1:{title:'Process checklist',staff:true,group:true,fields:stages.flatMap((label,i)=>[select('state'+i,label,['E','R','N/O']),text('note'+i,'Notes · '+label)])},
 E3:{title:'Individual speaking observation',staff:true,group:true,individual:true,fields:[
  ...['One relevant English sentence','Accurate explanation of source or survey','Action and reason in spoken English'].map((label,i)=>select('criterion'+i,label,['2','1','0','N/O'])),text('feedback','Feedback and next step')]},
 E4:{title:'Group evidence summary',staff:true,group:true,fields:[
  text('recorder','Recorder code'),...evidence.map((label,i)=>text('record'+i,label+' · File or record ID')),text('strength','The group demonstrated'),text('next','Next step')]},
 'I2-A':{title:'Score individual writing A',staff:true,group:true,individual:true,fields:['Figures · 3/10 and 30%','Scope · group priorities','Two clear English sentences'].map((label,i)=>mark('score'+i,label))},
 'I2-B':{title:'Score individual writing B',staff:true,group:true,individual:true,fields:['Figures · 7/10 and 70%','Scope · group priorities','Two clear English sentences'].map((label,i)=>mark('score'+i,label))},
 I3:{title:'Class summary',staff:true,fields:[
  number('enrolment','Total enrolment',1000),text('difficulty','One difficulty'),text('response','What you tried'),text('next','One change for the next lesson')]},
};
export const P2_PEER_FORMS = ['C2','C2-score','C3-share','C3-answer','C3-score'];
export const P2_STUDENT_FORMS = ['I1-A','B1','B2','B3','C1',...P2_PEER_FORMS,'D1','I1-B','D2'];
export const P2_STAFF_FORMS = ['E1','E3','E4','I2-A','I2-B','I3'];
export const p2Code = value => /^[A-Z0-9_-]{1,20}$/.test(value);
export function normalizeP2Values(form, body) {
 if (!body || typeof body!=='object' || Array.isArray(body)) return null;
 const values={};
 for(const f of form.fields){
  const raw=body[f.key];
  if(raw!==undefined&&typeof raw!=='string')return null;
  const value=(raw??'').trim();
  if ((!value&&(f.required||(f.options&&!form.staff))) || value.length>600 || (f.options&&value&&!f.options.includes(value))
  || (f.max&&value&&(!/^\d{1,6}$/.test(value)||Number(value)>f.max))) return null;
  values[f.key]=value;
 }
 if(form.individual&&form.staff&&Object.keys(values).some(key=>key.startsWith('score')&&!values[key]))return null;
 if ('opportunities' in values && (values.done||values.opportunities||values.summary||values.range||values.unit)) {
  if(!values.done||!values.opportunities||!values.range||!values.unit||!values.summary||Number(values.done)>Number(values.opportunities)||Number(values.opportunities)<1)return null;
 }
 return values;
}
export function summarizeP2(rows) {
 const writing=rows.filter(r=>['I1-A','I1-B'].includes(r.form));
 const matches=(row,form)=>rows.find(r=>r.form===form&&r.group_id===row.group_id&&r.slot===row.slot);
 const pairs=writing.filter(r=>r.form==='I1-A'&&matches(r,'I1-B'));
 const sum=row=>[0,1,2].reduce((n,i)=>n+Number(row.values['score'+i]),0);
 const scored=pairs.flatMap(row=>{
  const a=matches(row,'I2-A'),b=matches(row,'I2-B');
  return a&&b&&[a,b].every(x=>[0,1,2].every(i=>['0','1'].includes(x.values['score'+i])))?[sum(b)-sum(a)]:[];
 });
 const retests=rows.filter(r=>r.form==='C3-score').flatMap(row=>{
  const a=matches(row,'C2-score'), change=matches(row,'C3-share');
  return a&&change?[Number(row.values.score)-Number(a.values['score'+change.values.item])]:[];
 });
 const counts=list=>[list.filter(n=>n>0).length,list.filter(n=>n===0).length,list.filter(n=>n<0).length];
 return {a:writing.filter(r=>r.form==='I1-A').length,b:writing.filter(r=>r.form==='I1-B').length,paired:pairs.length,scored:scored.length,progress:counts(scored),retests:counts(retests),matchedRetests:retests.length,
  revisions:rows.filter(r=>r.form==='C3-share'&&r.values.change).length};
}
