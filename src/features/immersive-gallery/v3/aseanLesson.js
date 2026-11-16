export const ASEAN_TEMPLATE = 'asean-in-three-frames';
export const ASEAN_TITLE = 'ASEAN in Three Frames';
export const ASEAN_TOPIC = 'ASEAN and Viet Nam';
export const ASEAN_SUBTITLE = 'English 11 · Global Success · Unit 4: ASEAN and Viet Nam';
export const ASEAN_CHALLENGE = 'How can three images and three English captions help a first-time visitor understand an ASEAN destination?';
export const ASEAN_BRIEF = 'Work in groups to build a three-frame travel exhibit: Place, Experience and Visitor Advice. Write 20–30 words per caption, cite a fact, and credit each photo. Test your first version, revise one detail and ask a fresh group to test it again.';
export const ASEAN_FRAMES = Object.freeze([
 {key:'issue',label:'Place',question:'Where is it?'},
 {key:'evidence',label:'Experience',question:'What can I do there?'},
 {key:'solution',label:'Visitor Advice',question:'What should I keep in mind?'},
]);
export const ASEAN_STAGES = Object.freeze([
 {id:'asean-baseline',period:1,minutes:10,title:'Collect a group baseline and identify visitor needs',vi:'Viết đầu giờ và xác định nhu cầu khách',kind:'asean',question:'Which visitor question does the first exhibit leave unanswered?',teaching:'2 min group writing · 2 min model · 4 min group discussion · 2 min confirm the task.',expected:'One baseline card per group and one identified information gap.'},
 {id:'asean-plan',period:1,minutes:10,title:'Plan the exhibit and choose photographs',vi:'Lập kế hoạch và chọn ảnh',kind:'asean',question:'Which three photographs will help a first-time visitor?',teaching:'2 min assign the plan · 6 min compare and select · 2 min explain and check.',expected:'Three image codes, a sourced fact and a reason for an image choice.'},
 {id:'asean-build',period:1,minutes:25,title:'Build your group’s 3D exhibit',vi:'Dựng triển lãm 3D của nhóm',kind:'asean',question:'Can a visitor locate the place, imagine an experience and follow the advice?',teaching:'5 min model the studio · 10 min write captions · 8 min upload and preview in 3D · 2 min save V1.',expected:'A saved three-frame 3D room with English captions, image credits and a factual source.'},
 {id:'asean-visit',period:2,minutes:15,title:'Visit another exhibit and exchange feedback',vi:'Tham quan chéo và góp ý',kind:'asean',question:'Can your group find all three answers without help from the authors?',teaching:'2 min brief the visitors · 8 min visit and record · 5 min exchange feedback.',expected:'Three answers with frame numbers, a visitor score out of 3 and one actionable comment.'},
 {id:'asean-revise',period:2,minutes:20,title:'Revise one detail and test it again',vi:'Chỉnh sửa và nhờ nhóm mới thử lại',kind:'asean',question:'Can a fresh group find the answer after your revision?',teaching:'3 min select an issue · 12 min revise and save V2 · 5 min retest.',expected:'A justified V1–V2 change and a fresh visitor group’s answer.'},
 {id:'asean-transfer',period:2,minutes:10,title:'Report the revision and complete group transfer writing',vi:'Báo cáo và viết vận dụng theo nhóm',kind:'asean',question:'What did your group change and what should visitors do at a new destination?',teaching:'3 min reports · 4 min transfer task (2 min writing) · 3 min conclude.',expected:'One group transfer card and the final three-frame exhibit.'},
]);
export const ASEAN_DESTINATIONS = Object.freeze([
 ['Hội An Ancient Town','Viet Nam',948],['Tràng An','Viet Nam',1438],['Angkor','Cambodia',668],
 ['Luang Prabang','Lao PDR',479],['Ayutthaya','Thailand',576],['Melaka','Malaysia',1223],
 ['George Town','Malaysia',1223],['Singapore Botanic Gardens','Singapore',1483],
 ['Borobudur','Indonesia',592],['Vigan','Philippines',502],
].map(([name,country,sourceId])=>({name,country,source:'https://whc.unesco.org/en/list/'+sourceId+'/'})));
export const ASEAN_MIN_GROUPS = 3;
export const ASEAN_MAX_GROUPS = ASEAN_DESTINATIONS.length;
export const validAseanGroupCount = count =>
 Number.isInteger(count)&&count>=ASEAN_MIN_GROUPS&&count<=ASEAN_MAX_GROUPS;
export const ASEAN_CARDS=Object.freeze([
 {title:'My Son Sanctuary',country:'Viet Nam · historic brick temples',experience:'brick towers / look from the path',advice:'taking a photo / stand to one side of the path'},
 {title:'Sukhothai Historical Park',country:'Thailand · historic monuments',experience:'historic monuments / look from the path',advice:'stopping to read / leave room for others on the path'},
]);
export const ASEAN_RUBRIC=Object.freeze([
 {key:'english',label:'Tiếng Anh cho khách',en:'English for visitors',max:4,help:'Clear, specific captions for all three purposes.'},
 {key:'design',label:'Thiết kế trưng bày',en:'Exhibit design',max:2,help:'The three images serve distinct purposes and the group explains one choice.'},
 {key:'evidence',label:'Dữ kiện và ghi công',en:'Accuracy and credits',max:2,help:'Verifiable facts and complete credit and permissions.'},
 {key:'revision',label:'Chỉnh sửa có căn cứ',en:'Evidence-based revision',max:2,help:'A justified change and the fresh visitor’s recorded result.'},
]);
export const isAsean = assignment => (typeof assignment==='string'?assignment:assignment?.lesson_template)===ASEAN_TEMPLATE;
export const aseanGroupIndex = label => Number(String(label||'').match(/(\d+)\s*$/)?.[1]||0)-1;
export const aseanDestination = label => ASEAN_DESTINATIONS[aseanGroupIndex(label)];
export function aseanPeerGroup(classGroups,groupId,stage,{reverse=false}={}){
 if(!validAseanGroupCount(classGroups.length)||![3,4].includes(stage))return null;
 const sorted=classGroups.slice().sort((a,b)=>aseanGroupIndex(a.label)-aseanGroupIndex(b.label));
 const index=sorted.findIndex(group=>group.id===groupId);
 if(index<0)return null;
 const offset=(stage===3?1:2)*(reverse?-1:1);
 return sorted[(index+offset+sorted.length)%sorted.length];
}
export const aseanWritingCard = (label,transfer=false)=>ASEAN_CARDS[(Math.max(0,aseanGroupIndex(label))+(transfer?1:0))%2];
export const aseanPublicKey = id => 'asean-'+id;
export const aseanWordCount = value=>String(value||'').trim().split(/\s+/u).filter(Boolean).length;
export function aseanExhibitMissing(doc){
 const exhibits=doc?.rooms?.[0]?.exhibits||[];
 const missing=[];
 if(!doc?.title)missing.push('Exhibit title');
 if(!doc?.learning?.source)missing.push('Factual source');
 for(const [index,{key,label}] of ASEAN_FRAMES.entries()){
  const words=aseanWordCount(doc?.learning?.[key]);
  if(words<20||words>30)missing.push(label+' caption (20–30 words)');
  if(!doc?.artworks?.[key]||exhibits[index]?.kind!=='image'||exhibits[index]?.asset_id!==doc.artworks[key])missing.push(label+' photo');
  if(!doc?.artMeta?.[key]?.alt||!doc?.artMeta?.[key]?.source||!doc?.artMeta?.[key]?.rights)missing.push(label+' photo description, credit and permissions');
 }
 return missing;
}
const str=(value,max=220)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max;
const frame=value=>Number.isInteger(value)&&value>=1&&value<=3;
const score=value=>value===0||value===1;
export function validAseanResponse(stage,value){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const exact=(...keys)=>Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
 if(stage===0||stage===5)return exact('experience','advice')&&str(value.experience)&&str(value.advice);
 if(stage===1)return exact('codes','comparisonFrame','alternative','fact','source','reason')&&Array.isArray(value.codes)&&value.codes.length===3&&
  new Set(value.codes.map(v=>String(v).trim().toLowerCase())).size===3&&value.codes.every(v=>str(v,35))&&
  frame(value.comparisonFrame)&&str(value.alternative,35)&&
  value.alternative.trim().toLowerCase()!==value.codes[value.comparisonFrame-1].trim().toLowerCase()&&
  str(value.fact)&&str(value.reason)&&str(value.source,350);
 if(stage===3)return exact('first','answers','comment')&&frame(value.first)&&str(value.comment)&&
  Array.isArray(value.answers)&&value.answers.length===3&&value.answers.every((a,index)=>
   a&&Object.keys(a).length===3&&str(a.text,130)&&
   (frame(a.frame)||(a.frame===null&&a.score===0))&&score(a.score)&&(a.score===0||a.frame===index+1));
 if(stage===4)return exact('question','answer','frame','score')&&frame(value.question)&&str(value.answer)&&
  (frame(value.frame)||(value.frame===null&&value.score===0))&&score(value.score)&&
  (value.score===0||value.question===value.frame);
 return false;
}
