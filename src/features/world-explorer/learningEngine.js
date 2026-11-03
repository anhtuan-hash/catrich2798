/* Verified, deterministic self-study material derived only from the published English text. */
const WORDS={telescope:'kính thiên văn',infrared:'hồng ngoại',astronomy:'thiên văn học',galaxy:'thiên hà',galaxies:'các thiên hà',orbit:'quỹ đạo',planet:'hành tinh',exoplanet:'ngoại hành tinh',resolution:'độ phân giải',instrument:'thiết bị',instruments:'các thiết bị',launched:'được phóng',satellite:'vệ tinh',cosmology:'vũ trụ học',universe:'vũ trụ',star:'ngôi sao',stars:'các ngôi sao',gravity:'trọng lực',atmosphere:'khí quyển',scientist:'nhà khoa học',scientists:'các nhà khoa học',science:'khoa học',research:'nghiên cứu',discovery:'khám phá',technology:'công nghệ',energy:'năng lượng',spectrum:'quang phổ',wavelength:'bước sóng',wavelengths:'các bước sóng',mirror:'gương',diameter:'đường kính',continent:'lục địa',ocean:'đại dương',river:'sông',mountain:'núi',volcano:'núi lửa',forest:'rừng',climate:'khí hậu',environment:'môi trường',ecosystem:'hệ sinh thái',species:'loài',habitat:'môi trường sống',population:'dân số',civilization:'nền văn minh',architecture:'kiến trúc',temple:'đền',monument:'di tích',heritage:'di sản',ancient:'cổ đại',century:'thế kỷ',language:'ngôn ngữ',culture:'văn hóa',tradition:'truyền thống',festival:'lễ hội',region:'khu vực',country:'quốc gia',exploration:'thám hiểm',journey:'hành trình',spacecraft:'tàu vũ trụ',mission:'sứ mệnh',image:'hình ảnh',images:'những hình ảnh',surface:'bề mặt',visible:'có thể nhìn thấy',distant:'xa xôi',faint:'mờ nhạt',formation:'sự hình thành',located:'tọa lạc',equipment:'thiết bị',equipped:'được trang bị',solar:'thuộc Mặt Trời',structure:'cấu trúc',structures:'các cấu trúc',developed:'được phát triển',observed:'được quan sát',observation:'sự quan sát',temperature:'nhiệt độ',million:'triệu',billion:'tỷ'};
const GRAMMAR=[
 ['be designed to + V','được thiết kế để thực hiện điều gì',/\b(?:is|are|was|were)\s+designed\s+to\s+[a-z]+/i],
 ['be equipped with','được trang bị',/\b(?:is|are|was|were)\s+equipped\s+with\b/i],
 ['allow + object + to V','cho phép đối tượng thực hiện hành động',/\ballow(?:s|ed|ing)?\s+(?:it|them|us|people|researchers|scientists|[a-z]+)\s+to\s+[a-z]+/i],
 ['despite + noun / V-ing','diễn đạt sự tương phản',/\bdespite\s+[a-z]+/i],
 ['relative clause','mệnh đề quan hệ',/\b(?:which|that|who)\s+(?:is|are|was|were|has|have|can|[a-z]{4,})\b/i],
 ['because + clause','nêu nguyên nhân',/\bbecause\s+[a-z]+/i],
 ['passive voice','cấu trúc bị động',/\b(?:is|are|was|were)\s+(?:known|called|located|built|launched|formed|designed|discovered|developed|used|created)\b/i]
];
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;return h.toString(16).padStart(8,'0');}
function extractSentences(body){
 const out=[];let cursor=0;const paras=body.split(/\n+/).map(x=>x.trim()).filter(Boolean);
 for(let p=0;p<paras.length;p++){
  for(const part of paras[p].match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)||[paras[p]]){
   const sentence=part.trim();if(sentence.length<45||sentence.length>380)continue;
   const offset=body.indexOf(sentence,cursor);if(offset<0)continue;cursor=offset+sentence.length;
   out.push({sentence,offset,paragraph:p,index:out.length});
  }
 }return out;
}
function evidence(s){return {sentence_id:s.index,paragraph_id:s.paragraph,offset:s.offset,exact_quote:s.sentence};}
function pattern(w){return new RegExp('\\b'+w+'\\b','i');}
function q(type,stem,answer,options,ev,hashValue,index,extra={}){
 return {id:hashValue+'-'+type+'-'+index,type,stem,answer,options,evidence:ev,points:1,
 explanation_vi:'Đối chiếu với câu được trích nguyên văn từ bài đọc.',
 explanation_en:'Compare with the exact quotation in the reading.',...extra};
}
export function buildWorldExplorerPack(article){
 const body=String(article?.body_en||'').trim(),h=hash(body),sentences=extractSentences(body);
 const vocab=[],used=new Set();for(const s of sentences)for(const m of s.sentence.matchAll(/\b[A-Za-z]{4,}\b/g)){
  const word=m[0],lemma=word.toLowerCase();if(!WORDS[lemma]||used.has(lemma))continue;used.add(lemma);
  vocab.push({id:'v'+vocab.length,word,lemma,meaning:WORDS[lemma],example:s.sentence,evidence:evidence(s)});
 }
 const vocabulary=vocab.slice(0,12),grammar=[];
 for(const [name,meaning,re] of GRAMMAR){const s=sentences.find(v=>re.test(v.sentence));if(s)grammar.push({id:'g'+grammar.length,pattern:name,meaning,example:s.sentence,evidence:evidence(s)});}
 const questions=[];
 // True claims only: exactly quoted, not unsupported False statements.
 if(sentences[0])questions.push(q('true_false','This sentence appears in the reading:\n“'+sentences[0].sentence+'”','true',[{id:'true',text:'True'},{id:'false',text:'False'}],evidence(sentences[0]),h,questions.length));
 // A false item is a modified quotation, never a claim that outside information is false.
 const falseSource=sentences.find(s=>vocabulary.some(v=>pattern(v.word).test(s.sentence)&&vocabulary.some(w=>w.lemma!==v.lemma&&!pattern(w.word).test(s.sentence))));
 if(falseSource){
  const target=vocabulary.find(v=>pattern(v.word).test(falseSource.sentence)&&vocabulary.some(w=>w.lemma!==v.lemma&&!pattern(w.word).test(falseSource.sentence)));
  const replacement=vocabulary.find(w=>w.lemma!==target.lemma&&!pattern(w.word).test(falseSource.sentence));
  const altered=falseSource.sentence.replace(pattern(target.word),replacement.word);
  if(!body.includes(altered))questions.push(q('true_false','This exact sentence appears in the reading:\n“'+altered+'”','false',[{id:'true',text:'True'},{id:'false',text:'False'}],evidence(falseSource),h,questions.length,
   {explanation_vi:'Đây là câu đã thay đổi một từ. Dẫn chứng hiển thị câu gốc trong bài.',explanation_en:'One word was changed; the evidence shows the original sentence.'}));
 }
 for(const v of vocabulary){
  if(questions.filter(x=>x.type==='single_choice').length>=4)break;
  const other=vocabulary.filter(x=>x.lemma!==v.lemma&&!pattern(x.word).test(v.example));if(other.length<3)continue;
  const m=pattern(v.word).exec(v.example);if(!m||v.example.length>290)continue;
  const choices=[v.word,...other.slice(0,3).map(x=>x.word)],shift=(questions.length+v.word.length)%4;
  const ordered=choices.slice(shift).concat(choices.slice(0,shift));
  questions.push(q('single_choice','Which word completes this exact sentence from the reading?\n“'+v.example.slice(0,m.index)+'______'+v.example.slice(m.index+m[0].length)+'”',v.word,
   ordered.map((x,i)=>({id:'o'+i,text:x})),v.evidence,h,questions.length,{explanation_vi:'Từ “'+v.word+'” xuất hiện ở vị trí được lược bỏ trong bài.'}));
 }
 const uniqueMeanings=new Set(),four=[];
 for(const item of vocabulary)if(!uniqueMeanings.has(item.meaning)){uniqueMeanings.add(item.meaning);four.push(item);if(four.length===4)break;}
 if(four.length===4){
  questions.push(q('matching','Match each English word with its Vietnamese meaning.',four.map(x=>({word:x.word,meaning:x.meaning})),
   four.map(x=>({id:x.id,text:x.word,meaning:x.meaning})),four.map(x=>x.evidence),h,questions.length));
 }
 for(const v of vocabulary){
  if(questions.filter(x=>x.type==='gap_fill').length>=2)break;
  const m=pattern(v.word).exec(v.example);if(!m)continue;
  questions.push(q('gap_fill','Complete this sentence from the reading:\n“'+v.example.slice(0,m.index)+'______'+v.example.slice(m.index+m[0].length)+'”',
   v.word,[],v.evidence,h,questions.length,{accepted:[v.word]}));
 }
 for(const s of sentences){
  if(questions.filter(x=>x.type==='short_answer').length>=2)break;
  const years=[...s.sentence.matchAll(/\b(?:1[5-9]\d{2}|20\d{2})\b/g)].map(x=>x[0]);if(years.length!==1)continue;
  questions.push(q('short_answer','Which year is mentioned in the excerpt?\n“'+s.sentence+'”',years[0],[],evidence(s),h,questions.length,{accepted:years}));
 }
 // Every question must reference text that exists in this exact version.
 const valid=questions.filter(x=>{const ev=Array.isArray(x.evidence)?x.evidence:[x.evidence];return ev.every(e=>body.includes(e.exact_quote));});
 return {id:String(article?.id||'unknown')+'-'+h,publication_id:article?.id||null,content_hash:h,version:1,
 origin:'deterministic_self_study',status:valid.length?'ready':'needs_review',vocabulary,grammar:grammar.slice(0,5),questions:valid,question_count:valid.length};
}
export function normalizeAnswer(value){return String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').replace(/[.!?,;:]+$/g,'').toLocaleLowerCase('en');}
export function gradeWorldExplorerAnswer(question,value){
 if(!question)return {correct:false,points:0,maxPoints:0};
 let correct=false,points=0;
 if(question.type==='matching'){
  const pairs=Array.isArray(question.answer)?question.answer:[],submitted=value&&typeof value==='object'?value:{};
  const found=pairs.filter(x=>normalizeAnswer(submitted[x.word])===normalizeAnswer(x.meaning)).length;
  points=pairs.length?found/pairs.length:0;correct=!!pairs.length&&found===pairs.length;
 }else{
  correct=[question.answer,...(question.accepted||[])].map(normalizeAnswer).includes(normalizeAnswer(value));
  points=correct?question.points:0;
 }
 return {correct,points,maxPoints:question.points,answer:question.answer,evidence:question.evidence,
 explanation_vi:question.explanation_vi,explanation_en:question.explanation_en};
}
