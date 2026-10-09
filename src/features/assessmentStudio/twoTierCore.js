/**
 * BRIAN Two-Tier Assessment · deterministic scoring and evidence checks.
 * No AI, networking, or browser storage.
 */
export const TWO_TIER_FORMAT = 'BRIAN_TWO_TIER_V1';
export const TWO_TIER_SAMPLE = [
 'She enjoys ___ novels. | read | reading | to read | reads | B | Why? | Enjoy takes an infinitive | Enjoy is followed by a gerund | Enjoy requires bare infinitive | Enjoy takes past tense | B | Gerund',
 'We decided ___ early. | leave | leaving | to leave | left | C | Which rule applies? | Decide takes a gerund | Decide takes bare infinitive | Decide is followed by to-infinitive | Decide requires a past verb | C | Infinitive',
 'My teacher made us ___ the task. | to repeat | repeating | repeat | repeated | C | Which pattern is correct? | Make + object + to-infinitive | Make + object + gerund | Make + object + bare infinitive | Make + object + past participle | C | Bare infinitive',
].join('\n');
export const TWO_TIER_POST_SAMPLE = [
 'Mina avoids ___ late. | arrive | arriving | to arrive | arrived | B | Why is this form correct? | Avoid takes to-infinitive | Avoid is followed by a gerund | Avoid is followed by bare infinitive | Avoid requires past tense | B | Gerund',
 'We hope ___ you next week. | meet | meeting | to meet | met | C | Which rule applies? | Hope takes a gerund | Hope takes bare infinitive | Hope is followed by to-infinitive | Hope requires past tense | C | Infinitive',
 'The coach let them ___ early. | to leave | leaving | leave | left | C | Which structure is correct? | Let + object + to-infinitive | Let + object + gerund | Let + object + bare infinitive | Let + object + past participle | C | Bare infinitive',
].join('\n');
export const TWO_TIER_EMPTY_META = {title:'Two-Tier Grammar Assessment',teacher:'',className:'',objective:'',date:''};
export const TWO_TIER_EMPTY_ADJUST = {finding:'',action:'',implementedDate:'',evidence:'',comparability:'',reflection:''};
const LETTERS=['A','B','C','D'];
const categories = ['understood','answerOnly','reasonOnly','misconception'];
const trim=(v,max=300)=>String(v??'').trim().slice(0,max);

export function parseTwoTierQuestions(raw){
 const lines=String(raw??'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(!lines.length||lines.length>40)throw new Error('Cần 1–40 câu hỏi hai tầng.');
 const seen=new Set();
 return lines.map((line,i)=>{
  const p=line.split('|').map(x=>x.trim());
  if(p.length!==13||p.some(x=>!x))throw new Error('Câu '+(i+1)+': cần 13 trường theo hướng dẫn.');
  if(!LETTERS.includes(p[5].toUpperCase())||!LETTERS.includes(p[11].toUpperCase()))
   throw new Error('Câu '+(i+1)+': khóa đáp án mỗi tầng phải là A–D.');
  if(new Set(p.slice(1,5).map(x=>x.toLocaleLowerCase())).size!==4||
     new Set(p.slice(7,11).map(x=>x.toLocaleLowerCase())).size!==4)
   throw new Error('Câu '+(i+1)+': các phương án trong cùng tầng phải khác nhau.');
  const stem=p[0].toLocaleLowerCase().replace(/\s+/g,' ');
  if(seen.has(stem))throw new Error('Trùng nội dung câu hỏi '+(i+1)+'.');
  seen.add(stem);
  return {stem:p[0],options:p.slice(1,5),answer:p[5].toUpperCase(),
   reasonStem:p[6],reasonOptions:p.slice(7,11),reasonAnswer:p[11].toUpperCase(),topic:p[12]};
 });
}
export function encodeTwoTierQuestions(items){
 return (items||[]).map(q=>[q.stem,...q.options,q.answer,q.reasonStem,...q.reasonOptions,q.reasonAnswer,q.topic].join(' | ')).join('\n');
}
export function parseAnswerPairs(raw,total){
 const pairs=String(raw??'').trim().toUpperCase().split(/[\s,;]+/).filter(Boolean);
 if(pairs.length!==total||pairs.some(p=>!/^[A-D]{2}$/.test(p)))
  throw new Error('Nhập '+total+' cặp đáp án, ví dụ BA CC AD (mỗi cặp gồm 2 chữ A–D).');
 return pairs;
}
export function gradeTwoTier(items,raw){
 if(!Array.isArray(items)||!items.length)throw new Error('Chưa cấu hình đề kiểm tra.');
 const answers=parseAnswerPairs(raw,items.length);
 const counts=Object.fromEntries(categories.map(x=>[x,0]));
 const topics={};
 const details=items.map((q,i)=>{
  const correctAnswer=answers[i][0]===q.answer;
  const correctReason=answers[i][1]===q.reasonAnswer;
  const category=correctAnswer&&correctReason?'understood':correctAnswer?'answerOnly':correctReason?'reasonOnly':'misconception';
  counts[category]++;
  if(!topics[q.topic])topics[q.topic]={mastered:0,total:0,answerCorrect:0,reasonCorrect:0};
  topics[q.topic].total++;
  topics[q.topic].mastered+=Number(category==='understood');
  topics[q.topic].answerCorrect+=Number(correctAnswer);
  topics[q.topic].reasonCorrect+=Number(correctReason);
  return {item:i+1,topic:q.topic,answer:answers[i][0],reason:answers[i][1],category,correctAnswer,correctReason};
 });
 const n=items.length;
 const answerCorrect=details.filter(x=>x.correctAnswer).length;
 const reasonCorrect=details.filter(x=>x.correctReason).length;
 return {answers:answers.join(' '),score:counts.understood,total:n,percent:100*counts.understood/n,
  answerCorrect,reasonCorrect,answerPercent:100*answerCorrect/n,reasonPercent:100*reasonCorrect/n,
  counts,topics,details};
}
export function validateTwoTierSetup({meta,preRaw,postRaw,repeat=false}){
 const m=Object.fromEntries(Object.keys(TWO_TIER_EMPTY_META).map(k=>[k,trim(meta?.[k],250)]));
 if(!m.teacher||!m.className||!m.objective||!m.title)throw new Error('Cần giáo viên, lớp, tên và mục tiêu đánh giá.');
 const pre=parseTwoTierQuestions(preRaw);
 const post=repeat?[]:parseTwoTierQuestions(postRaw);
 if(!repeat&&pre.length!==post.length)throw new Error('Hai lượt cần số câu hỏi tương đương.');
 return {meta:m,pre,post,repeat:Boolean(repeat)};
}
export function resolveTwoTierQuestions(config,phase){
 if(phase!=='pre'&&phase!=='post')throw new Error('Lượt đánh giá không hợp lệ.');
 return phase==='pre'||config.repeat?config.pre:config.post;
}
export function normalizeTwoTierStudent(code,name){
 const id=trim(code,35).toUpperCase(),fullName=trim(name,120);
 if(!/^[A-Z0-9_-]{1,35}$/.test(id))throw new Error('Mã HS cần 1–35 ký tự chữ, số, dấu gạch.');
 if(!fullName)throw new Error('Thiếu họ tên học sinh.');
 return {code:id,name:fullName};
}
export function makeTwoTierRecord({code,phase,answers,config,at=new Date().toISOString()}){
 const id=trim(code,35).toUpperCase();
 if(!/^[A-Z0-9_-]{1,35}$/.test(id))throw new Error('Mã học sinh không hợp lệ.');
 const result=gradeTwoTier(resolveTwoTierQuestions(config,phase),answers);
 return {code:id,phase,answers:result.answers,score:result.score,maxScore:result.total,percent:result.percent,
  answerPercent:result.answerPercent,reasonPercent:result.reasonPercent,counts:result.counts,topics:result.topics,
  assessedAt:trim(at,60)};
}
export function importTwoTierBatch({raw,config,phase,roster=[],records=[]}){
 const lines=String(raw??'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(!lines.length||lines.length>80)throw new Error('Mỗi lần nhập cần 1–80 học sinh.');
 if(roster.length>200||records.length>400)throw new Error('Vượt giới hạn học sinh hoặc kết quả.');
 const known=new Map(roster.map(x=>[x.code,x.name]));
 const existing=new Set(records.map(x=>x.code+'|'+x.phase));
 const preCodes=new Set(records.filter(x=>x.phase==='pre').map(x=>x.code));
 const fresh=[],graded=[];
 lines.forEach((line,index)=>{
  const fields=line.split(line.includes('\t')?'\t':'|').map(x=>x.trim());
  if(fields.length!==3)throw new Error('Dòng '+(index+1)+': nhập Mã HS | Họ tên | Đáp án hai tầng.');
  try{
   const pupil=normalizeTwoTierStudent(fields[0],fields[1]);
   if(known.has(pupil.code)&&known.get(pupil.code)!==pupil.name)throw new Error('Họ tên không khớp mã đã có.');
   if(existing.has(pupil.code+'|'+phase))throw new Error('Trùng kết quả của học sinh trong lượt.');
   if(phase==='post'&&!preCodes.has(pupil.code))throw new Error('Chưa có kết quả ban đầu của học sinh.');
   const row=makeTwoTierRecord({code:pupil.code,phase,answers:fields[2],config});
   if(!known.has(pupil.code)){fresh.push(pupil);known.set(pupil.code,pupil.name);}
   existing.add(pupil.code+'|'+phase);graded.push(row);
  }catch(e){throw new Error('Dòng '+(index+1)+': '+e.message);}
 });
 if(known.size>200||records.length+graded.length>400)throw new Error('Vượt giới hạn 200 học sinh hoặc 400 kết quả.');
 return {newStudents:fresh,newRecords:graded};
}
export function summarizeTwoTier(records,phase){
 const arr=(records||[]).filter(x=>x.phase===phase);
 const sum=Object.fromEntries(categories.map(k=>[k,0]));
 const topics={};
 arr.forEach(x=>{
  for(const k of categories)sum[k]+=x.counts[k]||0;
  for(const [key,v] of Object.entries(x.topics||{})){
   if(!topics[key])topics[key]={mastered:0,total:0,answerCorrect:0,reasonCorrect:0};
   for(const k of Object.keys(topics[key]))topics[key][k]+=v[k]||0;
  }
 });
 return {count:arr.length,average:arr.length?arr.reduce((s,x)=>s+x.percent,0)/arr.length:null,counts:sum,topics};
}
export function pairedTwoTier(records){
 const pre=new Map(records.filter(x=>x.phase==='pre').map(x=>[x.code,x]));
 const rows=records.filter(x=>x.phase==='post'&&pre.has(x.code)).map(x=>({
  code:x.code,before:pre.get(x.code).percent,after:x.percent,delta:x.percent-pre.get(x.code).percent,
 }));
 return {rows,count:rows.length,averageDelta:rows.length?rows.reduce((s,r)=>s+r.delta,0)/rows.length:null};
}
export function twoTierReadiness({meta,config,records,adjustment,demo=false}){
 const paired=pairedTwoTier(records||[]);
 const checks=[
  {label:'Mục tiêu, lớp và khóa đáp án hai tầng',ok:Boolean(meta?.className&&meta?.objective&&config?.pre?.length)},
  {label:'Kết quả đánh giá ban đầu',ok:(records||[]).some(r=>r.phase==='pre')},
  {label:'Vấn đề và nội dung điều chỉnh dạy học',ok:Boolean(trim(adjustment?.finding)&&trim(adjustment?.action))},
  {label:'Ngày thực hiện và tài liệu chứng minh',ok:Boolean(adjustment?.implementedDate&&trim(adjustment?.evidence))},
  {label:'Kết quả đánh giá lại của cùng học sinh',ok:paired.count>0},
  {label:'Nhận xét và tính tương đương của hai lượt',ok:Boolean(trim(adjustment?.reflection)&&trim(adjustment?.comparability))},
 ];
 return {checks,complete:checks.every(c=>c.ok)&&!demo,count:checks.filter(c=>c.ok).length,total:checks.length};
}
const csvCell=v=>{
 const raw=String(v??'');
 const safe=/^[=+\-@\t\r]/.test(raw)?"'"+raw:raw;
 return '"'+safe.replace(/"/g,'""')+'"';
};
export function twoTierCSV(roster,records,demo=false){
 const names=new Map(roster.map(x=>[x.code,x.name]));
 const lines=[...(demo?[['DEMO – KHÔNG DÙNG LÀM MINH CHỨNG']]:[]),
  ['Mã HS','Họ và tên','Lượt','Cặp đáp án','Tầng 1 (%)','Tầng 2 (%)','Hiểu đầy đủ (%)','Số câu hiểu đầy đủ','Tổng câu','Ngày']];
 for(const r of records)lines.push([r.code,names.get(r.code)||'',r.phase,r.answers,
  r.answerPercent.toFixed(1),r.reasonPercent.toFixed(1),r.percent.toFixed(1),r.score,r.maxScore,r.assessedAt]);
 return '\uFEFF'+lines.map(x=>x.map(csvCell).join(',')).join('\r\n');
}
export function twoTierBackup(state){
 return JSON.stringify({format:TWO_TIER_FORMAT,version:1,exportedAt:new Date().toISOString(),
  meta:state.meta,config:state.config,roster:state.roster,records:state.records,
  adjustment:state.adjustment,demo:Boolean(state.demo)},null,2);
}
export function restoreTwoTierBackup(data){
 if(!data||data.format!==TWO_TIER_FORMAT||data.version!==1)throw new Error('Không đúng định dạng Two-Tier.');
 if(!Array.isArray(data.roster)||data.roster.length>200||!Array.isArray(data.records)||data.records.length>400)
  throw new Error('Danh sách học sinh hoặc kết quả không hợp lệ.');
 let config=null;
 if(data.config){
  const setup=validateTwoTierSetup({meta:data.meta,
   preRaw:encodeTwoTierQuestions(data.config.pre),
   postRaw:encodeTwoTierQuestions(data.config.post),repeat:data.config.repeat});
  config={pre:setup.pre,post:setup.post,repeat:setup.repeat};
 }
 if(!config&&data.records.length)throw new Error('Thiếu khóa đáp án của kết quả.');
 const roster=data.roster.map(x=>normalizeTwoTierStudent(x.code,x.name));
 if(new Set(roster.map(x=>x.code)).size!==roster.length)throw new Error('Trùng mã học sinh.');
 const names=new Set(roster.map(x=>x.code)),seen=new Set(),pre=new Set();
 const records=data.records.map(x=>{
  const row=makeTwoTierRecord({code:x.code,phase:x.phase,answers:x.answers,config,at:x.assessedAt});
  const key=row.code+'|'+row.phase;
  if(!names.has(row.code)||seen.has(key)||row.score!==x.score||row.maxScore!==x.maxScore||
     Math.abs(row.percent-x.percent)>0.001)throw new Error('Kết quả không khớp khóa đáp án hoặc bị trùng.');
  seen.add(key);
  if(row.phase==='pre')pre.add(row.code);
  return row;
 });
 if(records.some(x=>x.phase==='post'&&!pre.has(x.code)))throw new Error('Thiếu kết quả ban đầu.');
 const meta=Object.fromEntries(Object.keys(TWO_TIER_EMPTY_META).map(k=>[k,trim(data.meta?.[k],250)]));
 const adjustment=Object.fromEntries(Object.keys(TWO_TIER_EMPTY_ADJUST).map(k=>[k,trim(data.adjustment?.[k],3000)]));
 return {meta,config,roster,records,adjustment,demo:Boolean(data.demo)};
}