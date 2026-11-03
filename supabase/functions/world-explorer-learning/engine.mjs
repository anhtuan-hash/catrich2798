/* World Explorer learning engine: deterministic, text-grounded and model-free. */
const LEXICON=[
 ['telescope','kính thiên văn','n'],['infrared','hồng ngoại','adj'],['galaxy','thiên hà','n'],['galaxies','thiên hà','n'],
 ['launch','phóng','v'],['launched','được phóng','v'],['orbit','quỹ đạo','n'],['resolution','độ phân giải','n'],
 ['astronomy','thiên văn học','n'],['cosmology','vũ trụ học','n'],['instruments','thiết bị','n'],
 ['wavelength','bước sóng','n'],['wavelengths','bước sóng','n'],['atmosphere','khí quyển','n'],
 ['atmospheric','thuộc khí quyển','adj'],['planet','hành tinh','n'],['planets','các hành tinh','n'],
 ['exoplanets','ngoại hành tinh','n'],['habitable','có thể sinh sống','adj'],['distant','xa xôi','adj'],
 ['formation','sự hình thành','n'],['sensitivity','độ nhạy','n'],['spectrum','quang phổ','n'],
 ['mirror','gương','n'],['diameter','đường kính','n'],['satellite','vệ tinh','n'],['solar','thuộc Mặt Trời','adj'],
 ['species','loài','n'],['habitat','môi trường sống','n'],['biodiversity','đa dạng sinh học','n'],
 ['environment','môi trường','n'],['climate','khí hậu','n'],['temperature','nhiệt độ','n'],['ecosystem','hệ sinh thái','n'],
 ['conservation','bảo tồn','n'],['endangered','có nguy cơ tuyệt chủng','adj'],['population','dân số','n'],
 ['agriculture','nông nghiệp','n'],['agricultural','thuộc nông nghiệp','adj'],['production','sản xuất','n'],
 ['innovation','đổi mới','n'],['scientific','thuộc khoa học','adj'],['scientist','nhà khoa học','n'],
 ['research','nghiên cứu','n'],['discovery','khám phá','n'],['development','phát triển','n'],
 ['civilization','nền văn minh','n'],['civilisation','nền văn minh','n'],['ancient','cổ đại','adj'],
 ['architecture','kiến trúc','n'],['heritage','di sản','n'],['culture','văn hóa','n'],
 ['cultural','thuộc văn hóa','adj'],['tradition','truyền thống','n'],['century','thế kỷ','n'],
 ['historical','thuộc lịch sử','adj'],['revolution','cuộc cách mạng','n'],['evolution','tiến hóa','n'],
 ['evidence','bằng chứng','n'],['theory','lý thuyết','n'],['technology','công nghệ','n'],
 ['digital','kỹ thuật số','adj'],['engineering','kỹ thuật','n'],['medicine','y học','n'],
 ['disease','bệnh','n'],['vaccination','tiêm chủng','n'],['treatment','điều trị','n'],
 ['energy','năng lượng','n'],['renewable','tái tạo','adj'],['electricity','điện năng','n'],
 ['gravity','trọng lực','n'],['molecule','phân tử','n'],['experiment','thí nghiệm','n'],
 ['laboratory','phòng thí nghiệm','n'],['significant','đáng kể','adj'],
 ['comparable','có thể so sánh','adj'],['established','được thành lập','v'],
 ['invented','được phát minh','v'],['founded','được sáng lập','v'],['exploration','thám hiểm','n'],
 ['expedition','chuyến thám hiểm','n'],['geography','địa lý','n'],['island','đảo','n'],
 ['continent','lục địa','n'],['ocean','đại dương','n'],['volcano','núi lửa','n'],
 ['earthquake','động đất','n'],['migration','di cư','n'],['independence','độc lập','n'],
 ['economic','thuộc kinh tế','adj'],['economy','nền kinh tế','n'],['education','giáo dục','n'],
 ['literature','văn học','n'],['language','ngôn ngữ','n'],['communication','giao tiếp','n'],
 ['international','quốc tế','adj'],['organization','tổ chức','n'],['organisation','tổ chức','n'],
 ['community','cộng đồng','n'],['society','xã hội','n'],['museum','bảo tàng','n'],['festival','lễ hội','n']
];
const RULES=[
 [/\\b(?:is|was|were|are) designed to\\b/i,'be designed to + V','được thiết kế để'],
 [/\\b(?:is|was|were|are) equipped with\\b/i,'be equipped with + N','được trang bị'],
 [/\\ballow(?:s|ed|ing)?\\s+\\w+\\s+to\\b/i,'allow + O + to V','cho phép ai làm gì'],
 [/\\bdespite\\b/i,'despite + noun/V-ing','mặc dù, bất chấp'],
 [/\\balthough\\b/i,'although + clause','mặc dù (theo sau là mệnh đề)'],
 [/\\bbecause\\b/i,'because + clause','bởi vì'],
 [/\\bhowever\\b/i,'however','tuy nhiên'],
 [/\\btherefore\\b/i,'therefore','vì vậy'],
 [/\\bin order to\\b/i,'in order to + V','để, nhằm mục đích'],
 [/\\bas a result\\b/i,'as a result','kết quả là'],
 [/\\b(?:is|was|were|are) (?:created|discovered|founded|launched|built|developed|invented)\\b/i,'passive voice: be + V3','thể bị động'],
 [/\\b(?:is|was|were|are) located in\\b/i,'be located in','tọa lạc tại'],
 [/\\b(?:more|less|larger|smaller|higher|lower)\\s+than\\b/i,'comparative + than','so sánh hơn'],
 [/\\b(?:which|who|whose)\\s+[a-z]+/i,'relative clause','mệnh đề quan hệ']
];
const STOP=new Set('about above after again against along also although always among another around because before being between both could during each either enough every first following from further have having into itself just later little many might more most much must never only other over same several since some still such than that their them there these they this those through under until very were what when where which while whose will with within would'.split(' '));
const MONTH='(?:January|February|March|April|May|June|July|August|September|October|November|December)';
const DATE_PATTERN=new RegExp('\\b(?:\\d{1,2}\\s+'+MONTH+'\\s+\\d{4}|'+MONTH+'\\s+\\d{1,2},?\\s+\\d{4})\\b','gi');
function normalize(value){return String(value||'').trim().replace(/\\s+/g,' ').replace(/[.,!?;:]+$/,'').normalize('NFKC').toLowerCase();}
function vocabTokens(value){return (value.match(/[A-Za-z][A-Za-z'-]{3,}/g)||[]).map(v=>v.toLowerCase()).filter(v=>v.length>=5&&!STOP.has(v));}
function sentencesOf(body){
 const out=[];
 for(const [p,paragraph] of String(body||'').split(/\n+/).entries()){
  for(const str of paragraph.split(/(?<=[.!?])\\s+(?=[A-Z“"(\[])/u)){
   const s=str.replace(/\\s+/g,' ').trim();
   if(s.length>=60&&s.length<=360&&s.split(' ').length>=10&&!/\[\d+\]/.test(s))out.push({text:s,paragraph_id:p+1,sentence_id:out.length+1});
  }
 }
 return out;
}
function evidence(s){return {exact_quote:s.text,paragraph_id:s.paragraph_id,sentence_id:s.sentence_id,verification_status:'exact_text'};}
function excerpt(s,max=190){if(s.length<=max)return s;const pos=s.slice(0,max).lastIndexOf(' ');return s.slice(0,Math.max(85,pos))+'…';}
function wordIn(s,w){return new RegExp('\\b'+w+'\\b','i').test(s);}
function blank(s,w){return s.replace(new RegExp('\\b'+w+'\\b','i'),'________');}
function term(s){const tokens=[...new Set(vocabTokens(s.text))];return tokens.find(t=>LEXICON.some(x=>x[0]===t))||tokens.find(t=>t.length>=7)||tokens[0];}
function rotate(xs,i){return [...xs.slice(i%xs.length),...xs.slice(0,i%xs.length)];}
export async function sha256(text){
 const bytes=new TextEncoder().encode(text);
 return [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export function buildLearningPack(input){
 const body=String(input.body_en||''),sentences=sentencesOf(body),vocabulary=[],usedWords=new Set();
 for(const [word,meaning,pos] of LEXICON){
  const lemma=word==='galaxies'?'galaxy':word==='planets'?'planet':word==='wavelengths'?'wavelength':word;
  if(usedWords.has(lemma))continue;
  const s=sentences.find(s=>wordIn(s.text,word));if(!s)continue;
  usedWords.add(lemma);
  vocabulary.push({id:'v'+(vocabulary.length+1),word,lemma,part_of_speech:pos,meaning_vi:meaning,example_en:s.text,source_evidence:evidence(s)});
  if(vocabulary.length>=10)break;
 }
 const grammar=[];
 for(const [pattern,label,explanation] of RULES){
  const s=sentences.find(s=>pattern.test(s.text)&&!grammar.some(x=>x.example_en===s.text));
  if(!s)continue;
  grammar.push({id:'g'+(grammar.length+1),pattern:label,explanation_vi:explanation,example_en:s.text,source_evidence:evidence(s)});
  if(grammar.length>=5)break;
 }
 const keywords=[...new Set(sentences.flatMap(s=>vocabTokens(s.text)))].filter(w=>w.length>=5&&w.length<=18);
 const rich=sentences.filter(s=>term(s)).slice(0,24), questions=[];
 function push(s,data){
  if(!body.includes(s.text)||questions.some(q=>q.stem_en===data.stem_en))return false;
  questions.push({...data,id:globalThis.crypto.randomUUID(),evidence:evidence(s),validation_status:'verified',difficulty:'locating',points:1,order_index:questions.length+1});
  return true;
 }
 let t=0;
 for(const s of rich){
  if(t>=3)break;
  let quoted=excerpt(s.text,160),truth=t!==1;
  if(!truth){
   const w=term(s);const replacement=keywords.find(x=>x!==w&&x.length===w.length)||keywords.find(x=>x!==w&&x.length>=5);
   if(!replacement)continue;
   quoted=blank(quoted,w).replace('________',replacement);
   if(body.includes(quoted))continue;
  }
  if(push(s,{question_type:'true_false',stem_en:'Is the following extract reproduced word for word from the English reading?\n“'+quoted+'”',
   stem_vi:'Đoạn sau có đúng nguyên văn bài tiếng Anh không?',options:[{id:'true',text:'True'},{id:'false',text:'False'}],
   answer_key:{accepted:[truth?'true':'false']},
   explanation_en:truth?'The extract matches the source text.':'One word differs from the source text.',
   explanation_vi:truth?'Đoạn trích đúng nguyên văn.':'Một từ đã bị thay đổi so với đoạn gốc.',skill:'specific_information'}))t++;
 }
 const used=new Set();
 for(const [i,s] of rich.slice(2).entries()){
  if(questions.filter(q=>q.question_type==='single_choice').length>=4)break;
  const w=term(s);if(!w||used.has(w))continue;
  const extract=blank(excerpt(s.text,210),w);
  if(!extract.includes('________'))continue;
  const others=keywords.filter(x=>x!==w&&Math.abs(x.length-w.length)<=6&&!used.has(x)).slice(i%4,i%4+3);
  if(others.length!==3)continue;
  const options=rotate([w,...others].map((text,j)=>({id:'o'+j,text})),i%4);
  if(push(s,{question_type:'single_choice',stem_en:'Which word completes this exact extract from the English reading?\n“'+extract+'”',
   stem_vi:'Từ nào hoàn thành đúng câu trích?',options,answer_key:{accepted:['o0']},
   explanation_en:'The exact word used in the passage is “'+w+'”.',
   explanation_vi:'Từ xuất hiện ở vị trí này trong bài là “'+w+'”.',skill:'specific_information'}))used.add(w);
 }
 if(vocabulary.length>=4){
  const four=vocabulary.slice(0,4),s=sentences.find(x=>x.text===four[0].example_en);
  const options=[...four.map((x,i)=>({id:'v'+i,text:x.word,kind:'term'})),
   ...rotate(four.map((x,i)=>({id:'m'+i,text:x.meaning_vi,kind:'meaning'})),2)];
  push(s,{question_type:'matching',stem_en:'Match each word from the reading with its Vietnamese meaning.',
   stem_vi:'Ghép các từ với nghĩa tiếng Việt.',options,
   answer_key:{pairs:Object.fromEntries(four.map((x,i)=>['v'+i,'m'+i]))},
   explanation_en:'Each meaning corresponds to a vocabulary item found in the reading.',
   explanation_vi:'Nghĩa tương ứng được lấy từ từ vựng bài đọc.',skill:'vocabulary_context'});
 }
 let gaps=0;
 for(const s of rich.slice(5)){
  if(gaps>=2)break;
  const w=term(s);if(!w||used.has('gap:'+w))continue;
  const quote=blank(excerpt(s.text,215),w);
  if(!quote.includes('________'))continue;
  if(push(s,{question_type:'gap_fill',stem_en:'Write the exact missing word from the reading:\n“'+quote+'”',
   stem_vi:'Điền từ còn thiếu trong câu trích.',options:[],answer_key:{accepted:[w]},
   explanation_en:'The missing word is “'+w+'”.',explanation_vi:'Từ còn thiếu là “'+w+'”.',skill:'vocabulary_context'})){
   gaps++;used.add('gap:'+w);
  }
 }
 let dateCount=0;
 for(const s of sentences){
  if(dateCount>=2)break;
  const hit=[...s.text.matchAll(new RegExp(DATE_PATTERN.source,'gi'))][0];
  if(!hit)continue;
  const quote=excerpt(s.text.replace(hit[0],'[DATE]'),210);
  if(push(s,{question_type:'short_answer',stem_en:'Which date does the passage give for this event?\n“'+quote+'”',
   stem_vi:'Bài đọc nêu ngày nào cho sự kiện này?',options:[],answer_key:{accepted:[hit[0]]},
   explanation_en:'The passage gives the date “'+hit[0]+'”.',explanation_vi:'Ngày được nêu là '+hit[0]+'.',
   skill:'specific_information'}))dateCount++;
 }
 const types=[...new Set(questions.map(q=>q.question_type))];
 const ready=questions.length>=4&&types.length>=2;
 return {vocabulary,grammar,questions,question_count:questions.length,quality_score:ready?90:60,
  status:ready?'ready':'needs_review',validation_summary:{engine:'source-exact-v1',
   evidence_verified:questions.every(q=>body.includes(q.evidence.exact_quote)),
   question_types:types,source_sentences:sentences.length,
   warning:ready?null:'Not enough evidence to publish a verified practice pack'}};
}
export const TESTING={normalize,sentencesOf};
