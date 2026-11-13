import {normalizeArtMeta,surveySummary} from './learningEvidence.js';
// BRIAN Museum Lab V3 — deterministic learning content and validation.
// No network calls, identities, third-party model endpoints, or invented assessment data.
// The single new-lesson plan follows the contest teaching plan for
// English 11 Global Success Unit 5. Existing assignments are stored
// separately and remain untouched when older selectable kits are retired.
export const LESSON_KITS = Object.freeze([
 {id:'climate',title:'Our Climate Action Museum',
  subtitle:'English 11 · Global Success · Unit 5: Global Warming',
  topic:'Global warming · Unit 5',accent:'green',icon:'leaf',theme:'classic',
  challenge:'How can our school reduce the impact of everyday activities on global warming?',
  brief:'Our Climate Action Museum — a two-period English STEAM project (2 × 45 minutes). As a group, investigate ONE realistic school climate action and record your group-priority choice in the live anonymous survey. Report the actual number of participating groups (N), the count and percentage; do not describe group choices as individual habits or measured emission reductions. Write three English exhibit labels (about 25–40 words each): The Problem, The Evidence and Our Solution. Name a credible source, add an original image or poster and your confirmed survey chart, and prepare a 3D museum. Test your exhibition with another group, record their feedback and one specific before/after improvement, then present a 45–60 second English pitch and answer the exit-ticket question. Protect image rights and personal data.',
  prompt:'In our group-priority survey, X out of N groups selected ... (Y%). One limitation is ... . We recommend ... because ... .',
  sample:'Our Climate Action Museum',
  goal:'Investigate one school climate action, interpret an authentic group survey, write evidence-based English labels, design and test a 3D exhibition, and improve it after peer feedback.'}
]);
export const RUBRIC = Object.freeze([
 {key:'english',label:'Giao tiếp tiếng Anh',en:'English communication',max:40,help:'Clear, accurate, purposeful English communication'},
 {key:'evidence',label:'Bằng chứng & nguồn',en:'Evidence & sources',max:20,help:'Transparent citations without unsupported data claims'},
 {key:'reasoning',label:'Tư duy giải pháp',en:'Problem-solving',max:15,help:'Problem, proposed solution and justification'},
 {key:'design',label:'Thiết kế & trải nghiệm',en:'Prototype & usability',max:15,help:'Accessible layout and visitor-centered design'},
 {key:'revision',label:'Thử nghiệm & cải tiến',en:'Testing & revision',max:10,help:'Documented feedback and evidence of revision'}
]);
export const STEPS = Object.freeze([
 {key:'understand',vi:'Hiểu vấn đề',en:'Understand'},
 {key:'plan',vi:'Lên ý tưởng',en:'Plan'},
 {key:'create',vi:'Sáng tạo',en:'Create'},
 {key:'test',vi:'Thử nghiệm',en:'Test'},
 {key:'submit',vi:'Nộp bài',en:'Submit'}
]);
const cap=(value,max)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
export const emptyLearning=()=>({issue:'',audience:'',source:'',evidence:'',solution:'',feedback:'',improvement:'',reflection:'',tested:false,roles:'',feasibility:''});
export const emptyStudio=()=>({title:'',summary:'',theme:'classic',learning:emptyLearning(),artworks:{issue:null,evidence:null,solution:null},rooms:[]});
export function normalizeStudio(raw){
 const input=raw && typeof raw==='object'?raw:{};
 const stored=input.learning && typeof input.learning==='object'?input.learning:{};
 const original=Array.isArray(input.rooms)?input.rooms:[];
 const existing=original.flatMap(r=>Array.isArray(r?.exhibits)?r.exhibits:[]);
 const legacy=original.length>1||existing.length>3;
 const oldContent=existing.map(e=>String(e.description||''));
 const fallback={
  issue:oldContent[0]||'',evidence:oldContent[1]||'',solution:oldContent[2]||''
 };
 const learning={};
 for(const key of Object.keys(emptyLearning()))learning[key]=key==='tested'?stored.tested===true:cap(stored[key]??fallback[key]??'',key==='evidence'||key==='issue'||key==='solution'?2500:1200);
 return {
  title:cap(input.title,140),artMeta:normalizeArtMeta(input.artMeta),survey:surveySummary(input.survey),
  summary:cap(input.summary,1200),
  theme:['classic','culture','lab'].includes(input.theme)?input.theme:(original[0]?.template_key||'classic'),
  learning,artworks:Object.fromEntries(['issue','evidence','solution'].map(key=>[key,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(input.artworks?.[key]))?input.artworks[key]:null])),legacy,legacyOriginal:legacy?input:null
 };
}
export function documentFromStudio(studio){
 const d=normalizeStudio(studio),v=d.learning;
 const entries=[
  ['The Problem',v.issue],
  ['The Evidence',v.evidence],
  ['Our Solution',v.solution]
 ];
 const descriptions=entries.map(([title,body],i)=>({
  title,
  description: cap([
   body,
   i===1&&v.source?'Source: '+v.source:'',
   i===2&&v.improvement?'After peer testing: '+v.improvement:'',
   d.artworks[['issue','evidence','solution'][i]]?'Image source: '+d.artMeta[['issue','evidence','solution'][i]].source+' · Rights: '+d.artMeta[['issue','evidence','solution'][i]].rights:''
  ].filter(Boolean).join('\n\n'),5000),
  alt_text:d.artMeta[['issue','evidence','solution'][i]].alt,
  kind:d.artworks[['issue','evidence','solution'][i]]?'image':'text',
  asset_id:d.artworks[['issue','evidence','solution'][i]]||null,model_key:null,
  transform:{position:[(i-1)*3,2,-7.72],rotation:[0,0,0],scale:[1,1,1]}
 }));
 return {
  title:d.title,
  summary:d.summary,
  theme:d.theme,
  learning:v,artworks:d.artworks,artMeta:d.artMeta,survey:d.survey,
  rooms:[{title:d.title||'Our English Museum',template_key:d.theme,exhibits:descriptions}]
 };
}
export function submissionMissing(studio,language='vi'){
 const d=normalizeStudio(studio),v=d.learning;
 const required=[
  ['title','Đặt tên triển lãm','Name your exhibition'],
  ['issue','Giải thích vấn đề bằng tiếng Anh','Explain the problem in English'],
  ['evidence','Viết một bằng chứng hoặc nhận định có nguồn','Write a sourced observation or evidence statement'],
  ['source','Ghi nguồn thông tin hoặc nêu rõ dữ liệu tình huống','Cite the source or identify scenario data'],
  ['solution','Đề xuất giải pháp bằng tiếng Anh','Propose a solution in English'],
  ['feedback','Ghi phản hồi thử nghiệm từ bạn học','Record authentic peer feedback'],
  ['improvement','Ghi điều nhóm đã điều chỉnh','Document what your group revised'],
  ['tested','Xác nhận nhóm đã thử nghiệm','Confirm that your group tested the exhibit'],
  ['reflection','Viết phản ánh học tập bằng tiếng Anh','Write a learning reflection in English']
 ];
 return required.filter(([key])=>!String(key==='title'?d.title:v[key]||'').trim()).map(([,vi,en])=>language==='en'?en:vi);
}
export function progressOfGroup(state,language='vi'){
 if(['published','approved_locked'].includes(state))return {label:language==='en'?'Approved':'Đã duyệt',pct:100};
 if(state==='ttcm_review')return {label:language==='en'?'Awaiting department review':'Chờ TTCM',pct:90};
 if(state==='submitted')return {label:language==='en'?'Submitted':'Đã nộp',pct:80};
 if(state==='changes_requested')return {label:language==='en'?'Needs revision':'Cần sửa',pct:65};
 if(state==='rejected')return {label:language==='en'?'Rejected':'Từ chối',pct:100};
 if(state==='editing')return {label:language==='en'?'In progress':'Đang thực hiện',pct:48};
 return {label:language==='en'?'Not started':'Chưa bắt đầu',pct:5};
}
export function safeCsvCell(value){
 const raw=String(value??'');
 const cleaned=/^[=+\-@\t\r]/.test(raw)?'\''+raw:raw;
 return '"'+cleaned.replaceAll('"','""')+'"';
}
export function buildProgressCsv(data,language='vi'){
 const headers=language==='en'?['Lesson','Class','Group','Status','Review version','Submitted on']:['Chủ đề','Lớp','Nhóm','Trạng thái','Phiên bản duyệt','Ngày nộp'];
 const rows=[];
 for(const a of data.assignments||[])for(const g of (data.groups||[]).filter(x=>x.assignment_id===a.id)){
  const rev=(data.reviews||[]).find(x=>x.group_id===g.id);
  rows.push([a.title,a.class_scope,language==='en'?String(g.label||'').replace(/^Nhóm(?=\s|$)/i,'Group'):g.label,progressOfGroup(g.state,language).label,rev?.version??'',rev?.submitted_at??'']);
 }
 return '\ufeff'+[headers,...rows].map(row=>row.map(safeCsvCell).join(',')).join('\r\n');
}
export function scoreRubric(scores){
 return RUBRIC.reduce((sum,c)=>{
  const value=Number(scores?.[c.key]??0);
  if(!Number.isInteger(value)||value<0||value>c.max)throw new Error('Điểm rubric không hợp lệ: '+c.label);
  return sum+value;
 },0);
}
