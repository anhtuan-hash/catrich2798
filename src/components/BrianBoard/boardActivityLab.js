/** Ten teacher-authored, offline-first classroom interactions.
 * No AI, remote scoring, student identifiers, or public answer mappings.
 * Strings are kept as text only. The project UI never uses innerHTML.
 */
export const LAB_TYPES=['hotspot','drag_label','cloze_snap','error_detective',
 'evidence_hunter','four_corners','flashcard_duel','mystery_reveal','stress_tap','concept_connection'];
export const LAB_LABELS={
 hotspot:['Hotspot Explorer','Khám phá điểm chạm'],
 drag_label:['Drag & Label','Kéo nhãn vào hình'],
 cloze_snap:['Cloze Snap','Điền từ kéo thả'],
 error_detective:['Error Detective','Thám tử sửa lỗi'],
 evidence_hunter:['Evidence Hunter','Săn bằng chứng'],
 four_corners:['Four Corners Challenge','Bốn vùng đáp án'],
 flashcard_duel:['Flashcard Duel','Đấu trường thẻ lật'],
 mystery_reveal:['Mystery Reveal','Bức ảnh bí ẩn'],
 stress_tap:['Stress Tap','Chạm trọng âm'],
 concept_connection:['Concept Connection','Sơ đồ liên kết']
};
export const LAB_EXAMPLES={
 hotspot:'Solar panel | 30 | 35\nWind turbine | 76 | 55',
 drag_label:'Renewable energy | 22 | 38\nFossil fuels | 73 | 64',
 cloze_snap:'We should [[reduce]] plastic waste.\nPeople can [[reuse]] glass bottles.\nDISTRACTORS: destroy, waste',
 error_detective:'She [[go=>goes]] to school every day.\nIf I [[was=>were]] you, I would recycle.',
 evidence_hunter:'PASSAGE: Burning fossil fuels releases carbon dioxide into the atmosphere. These gases trap heat and cause global warming.\nWhat causes warming? | Burning fossil fuels | Burning fossil fuels releases carbon dioxide | Clouds | Oceans',
 four_corners:'Which is renewable? | Coal | Oil | Solar | Gas | C\nChoose the correct verb: She ___ English. | study | studies | studying | studied | B',
 flashcard_duel:'sustainable | able to continue without harming the environment\nemissions | gases released into the atmosphere',
 mystery_reveal:'MYSTERY: Planet Earth\nWhich gas contributes to global warming? | Carbon dioxide\nName a renewable resource. | Solar energy',
 stress_tap:'pho/to/graph | 1\nre/new/a/ble | 2',
 concept_connection:'Burning fossil fuels | causes | carbon emissions\nCarbon emissions | increase | global warming'
};
export const LAB_IMAGE_TYPES=['hotspot','drag_label','mystery_reveal'];
export const MAX_LAB_IMAGE_CHARS=1450000;
const id=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const t=(v,n=240)=>String(v??'').trim().slice(0,n);
const lines=raw=>String(raw||'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
const bounded=(x,min,max)=>Math.max(min,Math.min(max,Number(x)));
const split=(line,count)=>line.split('|').map(x=>t(x,500)).slice(0,count);
const need=(valid,message)=>{if(!valid)throw Error(message);};
export function validLabImage(value){
 return typeof value==='string'&&value.length<MAX_LAB_IMAGE_CHARS&&
 /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}
export function parseLabActivity(type,raw){
 need(LAB_TYPES.includes(type),'Unsupported activity type');
 const input=lines(raw);
 need(input.length>0&&input.length<=25,'Use between 1 and 25 lines');
 let passage='',items=[],distractors=[],mysteryAnswer='';
 if(type==='hotspot'||type==='drag_label'){
  items=input.map((line,i)=>{
   const row=split(line,3);
   need(row.length===3&&row[0]&&row[1]!==''&&row[2]!==''&&
    Number.isFinite(Number(row[1]))&&Number.isFinite(Number(row[2]))&&
    Number(row[1])>=0&&Number(row[1])<=100&&Number(row[2])>=0&&Number(row[2])<=100,
    'Line '+(i+1)+': use Label | x(0–100) | y(0–100)');
   return {id:'i'+i,label:t(row[0],130),x:Number(row[1]),y:Number(row[2])};
  });
 }else if(type==='cloze_snap'){
  for(const line of input){
   if(/^DISTRACTORS:/i.test(line)){
    distractors=line.replace(/^DISTRACTORS:/i,'').split(',').map(x=>t(x,80)).filter(Boolean).slice(0,16);
    continue;
   }
   const found=[...line.matchAll(/\[\[([^\[\]]{1,75})\]\]/g)];
   need(found.length===1,'Use exactly one [[answer]] per sentence');
   const answer=t(found[0][1],75),label=line.replace(found[0][0],'_____');
   items.push({id:'i'+items.length,label:t(label,400),answer});
  }
 }else if(type==='error_detective'){
  for(const line of input){
   const found=[...line.matchAll(/\[\[([^\[\]=]{1,70})=>([^\[\]]{1,70})\]\]/g)];
   need(found.length===1,'Use one [[wrong=>correct]] expression per sentence');
   const wrong=t(found[0][1],70),answer=t(found[0][2],70);
   items.push({id:'i'+items.length,label:t(line.replace(found[0][0],wrong),400),wrong,answer});
  }
 }else if(type==='evidence_hunter'){
  need(/^PASSAGE:/i.test(input[0]),'Begin with PASSAGE: followed by the reading text');
  passage=t(input[0].replace(/^PASSAGE:/i,''),2200);
  need(passage.length>=35,'Passage must be at least 35 characters');
  items=input.slice(1).map((line,i)=>{
   const p=split(line,5);
   need(p.length>=4&&p.every(Boolean),'Use Question | correct answer | evidence | distractor [| distractor]');
   need(passage.toLocaleLowerCase().includes(p[2].toLocaleLowerCase()),
    'Line '+(i+2)+': evidence must appear verbatim in PASSAGE');
   return {id:'i'+i,label:t(p[0],250),answer:t(p[1],130),evidence:t(p[2],350),
    options:[p[1],...p.slice(3)].map(x=>t(x,130))};
  });
 }else if(type==='four_corners'){
  items=input.map((line,i)=>{
   const p=split(line,6);
   need(p.length===6&&p.slice(0,5).every(Boolean)&&/^[ABCD]$/i.test(p[5]),
    'Use Question | option A | option B | option C | option D | correct letter');
   return {id:'i'+i,label:t(p[0],220),options:p.slice(1,5).map(x=>t(x,140)),answer:p[5].toUpperCase()};
  });
 }else if(type==='flashcard_duel'||type==='mystery_reveal'){
  const questions=type==='mystery_reveal'&&/^MYSTERY:/i.test(input[0])?input.slice(1):input;
  if(type==='mystery_reveal'&&questions.length!==input.length)
   mysteryAnswer=t(input[0].replace(/^MYSTERY:/i,''),130);
  items=questions.map((line,i)=>{
   const p=split(line,2);
   need(p.length===2&&p.every(Boolean),'Use Prompt | Answer on each line');
   return {id:'i'+i,label:t(p[0],220),answer:t(p[1],180)};
  });
 }else if(type==='stress_tap'){
  items=input.map((line,i)=>{
   const p=split(line,2);
   const syllables=(p[0]||'').split('/').map(x=>t(x,40)).filter(Boolean);
   const stress=Number(p[1]);
   need(syllables.length>=2&&syllables.length<=8&&Number.isInteger(stress)&&stress>=1&&stress<=syllables.length,
    'Use syl/la/bles | stressed syllable number (starting at 1)');
   return {id:'i'+i,label:syllables.join(''),syllables,answer:stress};
  });
 }else if(type==='concept_connection'){
  items=input.map((line,i)=>{
   const p=split(line,3);
   need(p.length===3&&p.every(Boolean),'Use Source | relationship | Target');
   need(p[0]!==p[2],'Source and target must differ');
   return {id:'i'+i,label:t(p[0],130),relation:t(p[1],70),answer:t(p[2],130)};
  });
 }
 need(items.length>=1&&items.length<=(type==='cloze_snap'?12:type==='four_corners'?16:20),'The activity needs 1–20 valid items (Cloze: max 12, Four Corners: max 16)');
 return {items,passage,distractors,mysteryAnswer};
}
export function createLabActivity({type,title,prompt,raw,imageData}){
 const parts=parseLabActivity(type,raw);
 if(imageData)need(LAB_IMAGE_TYPES.includes(type)&&validLabImage(imageData),'Unsupported image or image exceeds the limit');
 return {id:id(),type,title:t(title,130)||LAB_LABELS[type][0],prompt:t(prompt,130),
  raw:t(raw,3500),...parts,image:validLabImage(imageData)&&LAB_IMAGE_TYPES.includes(type)?imageData:'',
  studentVisible:true,teacherOnly:false,createdAt:Date.now()};
}
export function normalizeLabActivity(raw){
 if(!raw||!LAB_TYPES.includes(raw.type))return null;
 try{
  const data=createLabActivity({type:raw.type,title:raw.title,prompt:raw.prompt,raw:raw.raw,
   imageData:validLabImage(raw.image)?raw.image:''});
  return {...data,id:t(raw.id,80)||id(),studentVisible:raw.studentVisible!==false,
   teacherOnly:raw.teacherOnly===true,createdAt:Number(raw.createdAt)||Date.now()};
 }catch{return null;}
}
export function labPublicActivity(raw){
 if(!raw||raw.studentVisible===false||raw.teacherOnly===true)return null;
 const a=normalizeLabActivity(raw);
 if(!a)return null;
 const visible={id:a.id,type:a.type,title:a.title,prompt:a.prompt,
  image:a.image,labels:a.items.map(i=>i.label),options:[],categories:[],
  passage:a.type==='evidence_hunter'?a.passage:'',items:[]};
 // Public TV/worksheet never receives label↔position mappings.
 // Drag targets are anonymized. Hotspot coordinates stay teacher-only until answered.
 if(a.type==='hotspot')visible.items=a.items.map(i=>({label:i.label}));
 if(a.type==='drag_label'){
  visible.items=a.items.map(i=>({x:i.x,y:i.y}));
  // Never preserve positional index pairing between the published label bank
  // and the numbered targets. Mapping remains exclusively teacher-side.
  if(a.items.length>1)visible.labels=[...a.items.slice(1),a.items[0]].map(i=>i.label);
 }
 if(a.type==='cloze_snap')visible.options=[...new Set([...a.items.map(i=>i.answer),...a.distractors])].sort();
 if(a.type==='error_detective')
  visible.items=a.items.map(i=>({label:i.label,options:[i.wrong,...a.items.map(j=>j.answer)].sort()}));
 if(a.type==='evidence_hunter')
  visible.items=a.items.map(i=>({label:i.label,options:[...i.options].sort()}));
 if(a.type==='four_corners')
  visible.items=a.items.map(i=>({label:i.label,options:[...i.options]}));
 if(a.type==='flashcard_duel'||a.type==='mystery_reveal')
  visible.items=a.items.map(i=>({label:i.label}));
 if(a.type==='stress_tap')
  visible.items=a.items.map(i=>({label:i.label,syllables:i.syllables}));
 if(a.type==='concept_connection'){
  visible.labels=[...new Set(a.items.flatMap(i=>[i.label,i.answer]))].sort();
  visible.categories=[...new Set(a.items.map(i=>i.relation))].sort();
 }
 return visible;
}
/** Grading is teacher-side only; public projections never receive the answers. */
export function gradeLabActivity(activity,response){
 const a=normalizeLabActivity(activity);
 if(!a)return {correct:0,total:0,complete:false};
 const submitted=Array.isArray(response)?response:[];
 let correct=0;
 a.items.forEach((item,index)=>{
  const choice=submitted[index];
  if(a.type==='hotspot'||a.type==='drag_label'){
   const p=choice&&typeof choice==='object'?choice:{};
   if(Math.hypot(Number(p.x)-item.x,Number(p.y)-item.y)<=8)correct++;
  }else if(a.type==='evidence_hunter'){
   const selected=choice&&typeof choice==='object'?choice:{};
   if(t(selected.answer).toLocaleLowerCase()===item.answer.toLocaleLowerCase()&&
    t(selected.evidence,350).toLocaleLowerCase()===item.evidence.toLocaleLowerCase())correct++;
  }else if(a.type==='concept_connection'){
   const p=choice&&typeof choice==='object'?choice:{};
   if(p.source===item.label&&p.target===item.answer&&p.relation===item.relation)correct++;
  }else if(a.type==='flashcard_duel'){
   if(choice===true)correct++;
  }else if(a.type==='error_detective'){
   const p=choice&&typeof choice==='object'?choice:{};
   if(t(p.wrong)===item.wrong&&t(p.answer)===item.answer)correct++;
  }else if(a.type==='mystery_reveal'){
   if(t(choice).toLocaleLowerCase()===item.answer.toLocaleLowerCase())correct++;
  }else if(a.type==='stress_tap'){
   if(Number(choice)===item.answer)correct++;
  }else if(t(choice).toLocaleLowerCase()===String(item.answer).toLocaleLowerCase())correct++;
 });
 return {correct,total:a.items.length,complete:submitted.filter(x=>x!==undefined&&x!==null).length>=a.items.length};
}
