// BRIAN Museum Lab V3 — deterministic learning content and validation.
// No network calls, identities, third-party model endpoints, or invented assessment data.
export const LESSON_KITS = Object.freeze([
 {id:'climate',title:'Climate Action Museum',subtitle:'Unit 5 · Global Warming · Tiếng Anh 11',
  topic:'Global warming',accent:'green',icon:'leaf',theme:'classic',
  challenge:'How can our school take practical action against environmental problems?',
  brief:'Create an English exhibition with three clear sections: The Problem, The Evidence and Our Solution. Explain your source, test your prototype with a classmate and revise your English.',
  prompt:'Design an interactive English museum that persuades visitors to take one realistic environmental action.',
  sample:'Our Planet, Our Future',goal:'Describe a problem, explain reliable evidence and propose a realistic action.'},
 {id:'marine',title:'Protecting Marine Life',subtitle:'Environment · English communication',
  topic:'Marine conservation',accent:'cyan',icon:'waves',theme:'culture',
  challenge:'How can visitors learn to reduce plastic waste reaching the ocean?',
  brief:'Explain a marine problem, show one credible source and propose an action school communities can take. Create and test an English-language exhibition.',
  prompt:'Tell a clear evidence-based story about protecting marine life.',
  sample:'Oceans Without Plastic',goal:'Use evidence and persuasive English to raise environmental awareness.'},
 {id:'school',title:'Sustainable School',subtitle:'School life · Problem solving',
  topic:'Sustainability',accent:'amber',icon:'school',theme:'lab',
  challenge:'What small change could make our school more sustainable?',
  brief:'Investigate one daily school issue, explain evidence, make a prototype exhibition and invite feedback. All final visitor-facing text must be in English.',
  prompt:'Introduce a practical school sustainability idea to an international visitor.',
  sample:'A Greener School',goal:'Make a proposal using cause-effect and persuasive language.'}
]);
export const RUBRIC = Object.freeze([
 {key:'english',label:'Giao tiếp tiếng Anh',en:'English communication',max:40,help:'Tính rõ ràng, độ chính xác và diễn đạt có mục đích'},
 {key:'evidence',label:'Bằng chứng & nguồn',en:'Evidence & sources',max:20,help:'Dẫn nguồn minh bạch, không suy diễn dữ liệu'},
 {key:'reasoning',label:'Tư duy giải pháp',en:'Problem-solving',max:15,help:'Vấn đề, phương án và lý do lựa chọn'},
 {key:'design',label:'Thiết kế & trải nghiệm',en:'Prototype & usability',max:15,help:'Bố cục dễ hiểu, phù hợp người xem'},
 {key:'revision',label:'Thử nghiệm & cải tiến',en:'Testing & revision',max:10,help:'Có phản hồi và minh chứng điều chỉnh'}
]);
export const STEPS = Object.freeze([
 {key:'understand',vi:'Hiểu vấn đề',en:'Understand'},
 {key:'plan',vi:'Lên ý tưởng',en:'Plan'},
 {key:'create',vi:'Sáng tạo',en:'Create'},
 {key:'test',vi:'Thử nghiệm',en:'Test'},
 {key:'submit',vi:'Nộp bài',en:'Submit'}
]);
const cap=(value,max)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
export const emptyLearning=()=>({issue:'',audience:'',source:'',evidence:'',solution:'',feedback:'',improvement:'',reflection:'',tested:false});
export const emptyStudio=()=>({title:'',summary:'',theme:'classic',learning:emptyLearning(),rooms:[]});
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
  title:cap(input.title,140),
  summary:cap(input.summary,1200),
  theme:['classic','culture','lab'].includes(input.theme)?input.theme:(original[0]?.template_key||'classic'),
  learning,legacy,legacyOriginal:legacy?input:null
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
   i===2&&v.improvement?'After peer testing: '+v.improvement:''
  ].filter(Boolean).join('\n\n'),5000),
  kind:'text',model_key:null,
  transform:{position:[(i-1)*3,2,-7.72],rotation:[0,0,0],scale:[1,1,1]}
 }));
 return {
  title:d.title,
  summary:d.summary,
  theme:d.theme,
  learning:v,
  rooms:[{title:d.title||'Our English Museum',template_key:d.theme,exhibits:descriptions}]
 };
}
export function submissionMissing(studio){
 const d=normalizeStudio(studio),v=d.learning;
 const required=[
  ['title','Đặt tên triển lãm'],
  ['issue','Giải thích vấn đề bằng tiếng Anh'],
  ['evidence','Viết một bằng chứng hoặc nhận định có nguồn'],
  ['source','Ghi nguồn thông tin hoặc nêu rõ dữ liệu tình huống'],
  ['solution','Đề xuất giải pháp bằng tiếng Anh'],
  ['feedback','Ghi phản hồi thử nghiệm từ bạn học'],
  ['improvement','Ghi điều nhóm đã điều chỉnh'],
  ['tested','Xác nhận nhóm đã thử nghiệm'],
  ['reflection','Viết phản ánh học tập bằng tiếng Anh']
 ];
 return required.filter(([key])=>!String(key==='title'?d.title:v[key]||'').trim()).map(([,label])=>label);
}
export function progressOfGroup(state){
 if(['published','approved_locked'].includes(state))return {label:'Đã duyệt',pct:100};
 if(state==='ttcm_review')return {label:'Chờ TTCM',pct:90};
 if(state==='submitted')return {label:'Đã nộp',pct:80};
 if(state==='changes_requested')return {label:'Cần sửa',pct:65};
 if(state==='rejected')return {label:'Từ chối',pct:100};
 if(state==='editing')return {label:'Đang thực hiện',pct:48};
 return {label:'Chưa bắt đầu',pct:5};
}
export function safeCsvCell(value){
 const raw=String(value??'');
 const cleaned=/^[=+\-@\t\r]/.test(raw)?'\''+raw:raw;
 return '"'+cleaned.replaceAll('"','""')+'"';
}
export function buildProgressCsv(data){
 const headers=['Chủ đề','Lớp','Nhóm','Trạng thái','Phiên bản duyệt','Ngày nộp'];
 const rows=[];
 for(const a of data.assignments||[])for(const g of (data.groups||[]).filter(x=>x.assignment_id===a.id)){
  const rev=(data.reviews||[]).find(x=>x.group_id===g.id);
  rows.push([a.title,a.class_scope,g.label,progressOfGroup(g.state).label,rev?.version??'',rev?.submitted_at??'']);
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
