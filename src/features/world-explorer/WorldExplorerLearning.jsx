import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Bookmark, BookMarked, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleHelp, FileQuestion, Languages, Layers3, ListChecks, RotateCcw, Sparkles,
  Target, Volume2, XCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase.js';
import './world-explorer-learning.css';

const MODES=[
 {type:'true_false',vi:'True / False',en:'True / False'},
 {type:'single_choice',vi:'Multiple Choice',en:'Multiple Choice'},
 {type:'matching',vi:'Ghép từ với nghĩa',en:'Matching'},
 {type:'gap_fill',vi:'Điền từ vào chỗ trống',en:'Fill in the Blanks'},
 {type:'short_answer',vi:'Trả lời ngắn',en:'Short Answers'}
];
function readLocal(key,fallback){
 try{const val=JSON.parse(localStorage.getItem(key)||'null');return val&&typeof val==='object'?val:fallback;}catch{return fallback;}
}
function totalOf(items){return items.reduce((s,q)=>s+Number(q.points||1),0);}
function clip(text,max=200){const value=String(text||'');return value.length>max?value.slice(0,max-1)+'…':value;}
function describeAnswer(key,question){
 if(key?.pairs){
  return Object.entries(key.pairs).map(([term,meaning])=>{
   const t=question.options?.find(x=>x.id===term)?.text||term;
   const m=question.options?.find(x=>x.id===meaning)?.text||meaning;
   return t+' — '+m;
  }).join(' · ');
 }
 const accepted=key?.accepted||[];
 const chosen=question.options?.find(x=>x.id===accepted[0]);
 return chosen?.text||accepted[0]||'—';
}
export default function WorldExplorerLearning({article,language='vi',currentUser,onEvidence}){
 const vi=language!=='en';
 const tr=(vn,en)=>vi?vn:en;
 const [pack,setPack]=useState(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [mode,setMode]=useState('true_false');
 const [position,setPosition]=useState(0);
 const [selected,setSelected]=useState({});
 const [feedback,setFeedback]=useState({});
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState(null);
 const [attemptId,setAttemptId]=useState(null);
 const [reviewIds,setReviewIds]=useState(null);
 const [bookmark,setBookmark]=useState(false);
 const [savedMessage,setSavedMessage]=useState('');
 const [focused,setFocused]=useState(false);
 const practiceRef=useRef(null);
 const vocabularyRef=useRef(null);
 const grammarRef=useRef(null);
 const mounted=useRef(true);

 useEffect(()=>{
  mounted.current=true;
  let live=true;
  setPack(null);setLoading(true);setError('');setMode('true_false');setPosition(0);
  setSelected({});setFeedback({});setResult(null);setAttemptId(null);setReviewIds(null);
  supabase.rpc('we_get_learning_questions',{p_publication_id:article.id})
    .then(({data,error:loadError})=>{
     if(!live)return;
     if(loadError){setError(loadError.message||'Learning content unavailable');return;}
     if(data?.status==='ready'&&Array.isArray(data.questions)){
      setPack(data);
      const stored=readLocal('we-learning-v1:'+article.id+':'+data.version,{});
      if(stored.selections)setSelected(stored.selections);
     }else setPack({status:data?.status||'pending',questions:[],vocabulary:[],grammar:[]});
    }).catch(e=>{if(live)setError(e?.message||'Unavailable');})
    .finally(()=>{if(live)setLoading(false);});
  return ()=>{live=false;mounted.current=false;};
 },[article.id]);
 useEffect(()=>{
  if(!pack?.version)return;
  try{localStorage.setItem('we-learning-v1:'+article.id+':'+pack.version,
   JSON.stringify({selections:selected}));}catch{/* storage may be blocked */}
 },[article.id,pack?.version,selected]);
 useEffect(()=>{
  let live=true;
  if(!currentUser?.id)return undefined;
  supabase.from('world_explorer_bookmarks').select('publication_id')
   .eq('publication_id',article.id).maybeSingle()
   .then(({data})=>{if(live)setBookmark(Boolean(data));}).catch(()=>{});
  return ()=>{live=false;};
 },[article.id,currentUser?.id]);

 const allQuestions=useMemo(()=>Array.isArray(pack?.questions)?pack.questions:[],[pack?.questions]);
 const shown=useMemo(()=>reviewIds?allQuestions.filter(q=>reviewIds.includes(q.id)):allQuestions,[allQuestions,reviewIds]);
 const group=useMemo(()=>shown.filter(q=>q.question_type===mode),[shown,mode]);
 const current=group[Math.min(position,Math.max(0,group.length-1))]||null;
 const checked=Object.keys(feedback).length;
 const earned=Object.values(feedback).reduce((n,x)=>n+Number(x.earned||0),0);
 const available=totalOf(shown);
 const answered=shown.filter(q=>feedback[q.id]).length;

 const scrollTo=(ref)=>ref.current?.scrollIntoView({behavior:'smooth',block:'start'});
 const startPractice=()=>{setFocused(true);scrollTo(practiceRef);};
 const handleChoice=(id,value)=>setSelected(s=>({...s,[id]:value}));
 async function createAttempt(){
  if(attemptId)return attemptId;
  if(!currentUser?.id||!pack?.pack_id)return null;
  const {data,error:startError}=await supabase.rpc('we_start_learning_attempt',{p_pack_id:pack.pack_id});
  if(startError)throw startError;
  setAttemptId(data);return data;
 }
 async function checkAnswer(){
  if(!current||busy||feedback[current.id])return;
  const answer=selected[current.id];
  if(answer===undefined||answer===null||typeof answer==='string'&&!answer.trim())return;
  if(current.question_type==='matching'&&Object.keys(answer).length!==
     current.options.filter(o=>o.kind==='term').length)return;
  setBusy(true);setError('');
  try{
   const activeAttempt=reviewIds?null:await createAttempt();
   const {data,error:rpcError}=await supabase.rpc('we_submit_learning_answer',{
    p_question_id:current.id,p_answer:answer,p_attempt_id:activeAttempt
   });
   if(rpcError)throw rpcError;
   if(mounted.current)setFeedback(prev=>({...prev,[current.id]:data}));
  }catch(e){if(mounted.current)setError(e?.message||'Could not check answer');}
  finally{if(mounted.current)setBusy(false);}
 }
 const go=(delta)=>{
  const next=position+delta;
  if(next>=0&&next<group.length){setPosition(next);setError('');}
 };
 const changeMode=(type)=>{setMode(type);setPosition(0);setError('');};
 async function finish(){
  if(answered!==shown.length||busy)return;
  setBusy(true);
  try{
   let resultData={score:earned,max_score:available,completed:true};
   if(attemptId){
    const {data,error:completeError}=await supabase.rpc('we_complete_learning_attempt',{p_attempt_id:attemptId});
    if(completeError)throw completeError;
    // The server scores all questions for this attempt, not only a review subset.
    resultData=data;
   }
   setResult(resultData);
   scrollTo(practiceRef);
  }catch(e){setError(e?.message||'Could not complete practice');}
  finally{setBusy(false);}
 }
 function restart(wrongOnly=false){
  const ids=wrongOnly?shown.filter(q=>feedback[q.id]&&!feedback[q.id].correct).map(q=>q.id):null;
  if(wrongOnly&&!ids?.length)return;
  setReviewIds(ids);setSelected({});setFeedback({});setAttemptId(null);setResult(null);
  setMode((ids?allQuestions.find(q=>q.id===ids[0])?.question_type:'true_false')||'true_false');
  setPosition(0);setError('');
  scrollTo(practiceRef);
 }
 async function toggleBookmark(){
  if(!currentUser?.id){
   setSavedMessage(tr('Đăng nhập để đồng bộ thư viện trên các thiết bị.','Sign in to sync bookmarks.'));
   return;
  }
  setBusy(true);
  try{
   if(bookmark){
    const {error:e}=await supabase.from('world_explorer_bookmarks').delete().eq('publication_id',article.id);
    if(e)throw e;setBookmark(false);
   }else{
    const {error:e}=await supabase.from('world_explorer_bookmarks')
     .insert({publication_id:article.id,user_id:currentUser.id});
    if(e)throw e;setBookmark(true);
   }
   setSavedMessage('');
  }catch(e){setSavedMessage(e?.message||'Bookmark unavailable');}
  finally{setBusy(false);}
 }
 const speech=(word)=>{
  if(typeof window==='undefined'||!window.speechSynthesis){setSavedMessage(tr('Trình duyệt không hỗ trợ phát âm.','Speech unavailable.'));return;}
  try{
   window.speechSynthesis.cancel();
   const u=new SpeechSynthesisUtterance(word);u.lang='en-US';u.rate=.85;
   window.speechSynthesis.speak(u);
  }catch{setSavedMessage(tr('Không thể phát âm lúc này.','Speech unavailable.'));}
 };

 if(loading)return <div className="we-learn-state" role="status">{tr('Đang chuẩn bị không gian học tập…','Loading learning studio…')}</div>;
 if(pack?.status==='disabled')return null;
 if(error&&!pack?.questions?.length)return <div className="we-learn-state" role="status">{tr('Phần luyện tập chưa khả dụng. Bài đọc vẫn có thể xem bình thường.','Practice unavailable. Reading remains accessible.')}</div>;
 if(pack?.status!=='ready')return <div className="we-learn-state" role="status"><Sparkles size={20}/>{tr('Bài đọc đã sẵn sàng. Từ vựng và bài luyện tập đang được chuẩn bị.','Reading is ready. Practice is being prepared.')}</div>;
 return <div className="we-learning" data-world-explorer-learning>
  <header className="we-learning-heading">
   <div className="we-learning-title">
    <span className="we-learning-kicker">BRIAN ENGLISH · LEARNING STUDIO</span>
    <h3>World Explorer <span aria-hidden="true">✦</span></h3>
    <p>{tr('Đọc hiểu · Từ vựng · Cấu trúc · Luyện tập với chính bài đọc','Reading · Vocabulary · Grammar · Source-grounded practice')}</p>
   </div>
   <span className="we-hourly-stamp"><Sparkles size={16}/>{tr('Khám phá mỗi giờ','Hourly discoveries')}</span>
  </header>
  <nav className="we-learning-nav" aria-label={tr('Điều hướng bài học','Lesson navigation')}>
   <button type="button" onClick={()=>document.getElementById('we-english-reading')?.scrollIntoView({behavior:'smooth',block:'start'})}><BookOpen size={17}/>{tr('Đọc bài','Read')}</button>
   <button type="button" onClick={()=>scrollTo(vocabularyRef)}><Languages size={17}/>{tr('Từ vựng','Vocabulary')}</button>
   <button type="button" onClick={()=>scrollTo(grammarRef)}><Layers3 size={17}/>{tr('Cấu trúc','Grammar')}</button>
   <button type="button" className="is-primary" onClick={startPractice}><Target size={17}/>{tr('Luyện tập ngay','Practice Now')}</button>
   <button type="button" aria-pressed={bookmark} onClick={toggleBookmark} disabled={busy}>{bookmark?<BookMarked size={17}/>:<Bookmark size={17}/>}
    {bookmark?tr('Đã lưu','Saved'):tr('Lưu vào thư viện','Bookmark')}</button>
  </nav>
  {savedMessage?<p className="we-learning-message" role="status">{savedMessage}</p>:null}
  <aside className="we-learning-overview" aria-label={tr('Tổng quan bài học','Lesson summary')}>
   <div className="we-overview-caption"><Sparkles size={17}/><strong>{tr('TỔNG QUAN BÀI HỌC','LESSON OVERVIEW')}</strong></div>
   <div className="we-overview-stats">
    <span><BookOpen size={18}/><b>{pack.vocabulary?.length||0}</b>{tr('Từ mới','Words')}</span>
    <span><Layers3 size={18}/><b>{pack.grammar?.length||0}</b>{tr('Cấu trúc','Structures')}</span>
    <span><FileQuestion size={18}/><b>{allQuestions.length}</b>{tr('Bài tập','Tasks')}</span>
    <span><CheckCircle2 size={18}/><b>{answered}</b>{tr('Đã làm','Answered')}</span>
   </div>
  </aside>
  <div className="we-learning-duo">
   <section className="we-learning-vocabulary" ref={vocabularyRef} id="we-learning-vocabulary">
    <h4><BookOpen size={20}/>{tr('Từ vựng cần học','Key Vocabulary')} <small>{pack.vocabulary?.length||0}</small></h4>
    {pack.vocabulary?.length?
     <div className="we-vocab-scroll"><table><thead><tr>
      <th scope="col">{tr('Từ vựng','Vocabulary')}</th><th scope="col">{tr('Nghĩa','Meaning')}</th>
      <th scope="col">{tr('Ví dụ trong bài','Example in reading')}</th></tr></thead><tbody>
      {pack.vocabulary.map(item=><tr key={item.id}>
       <td><button type="button" title={tr('Phát âm','Speak')} aria-label={tr('Nghe từ ','Hear ')+item.word}
          onClick={()=>speech(item.word)}><Volume2 size={15}/></button><strong lang="en">{item.word}</strong><small>{item.part_of_speech}</small></td>
       <td lang="vi">{item.meaning_vi}</td><td lang="en">{clip(item.example_en,160)}</td>
      </tr>)}</tbody></table></div>:
      <p className="we-learning-empty">{tr('Chưa xác định được từ vựng đủ điều kiện.','No verified vocabulary for this text.')}</p>}
   </section>
   <section className="we-learning-grammar" ref={grammarRef} id="we-learning-grammar">
    <h4><Layers3 size={20}/>{tr('Cấu trúc cần học','Language Structures')} <small>{pack.grammar?.length||0}</small></h4>
    {pack.grammar?.length?<div className="we-grammar-list">
     {pack.grammar.map((item,i)=><details key={item.id} className="we-grammar-item">
      <summary><span className="we-grammar-number">{i+1}</span><strong lang="en">{item.pattern}</strong><span lang="vi">{item.explanation_vi}</span></summary>
      <p lang="en">{item.example_en}</p>
     </details>)}</div>:
     <p className="we-learning-empty">{tr('Chưa có cấu trúc đủ điều kiện.','No validated structures.')}</p>}
   </section>
  </div>
  <section className="we-practice" id="we-reading-practice" ref={practiceRef}>
   <header className="we-practice-heading"><div>
    <span className="we-learning-kicker">{tr('Luyện tập với chính bài đọc trên','Practice based on this exact reading')}</span>
    <h4><Target size={21}/> Reading Practice</h4>
   </div><div className="we-practice-progress"><span>{answered}/{shown.length} {tr('đã trả lời','answered')}</span>
    <div role="progressbar" aria-label={tr('Tiến độ luyện tập','Practice progress')} aria-valuenow={answered} aria-valuemin={0}
     aria-valuemax={shown.length} className="we-progress-track"><span style={{width:(shown.length?answered/shown.length*100:0)+'%'}}/></div></div></header>
   {result?<div className="we-learning-results" role="status">
    <CheckCircle2 size={32}/><h5>{tr('Hoàn thành bài luyện tập!','Practice completed!')}</h5>
    <strong>{Number(result.score??earned).toLocaleString()} / {Number(result.max_score??available).toLocaleString()}</strong>
    <p>{tr('Kết quả được tính từ các câu đã kiểm tra.','Score is based on checked answers.')}</p>
    <div className="we-learning-actions">
     <button type="button" onClick={()=>restart(false)}><RotateCcw size={16}/>{tr('Làm lại bài','Try again')}</button>
     {shown.some(q=>feedback[q.id]?.correct===false)?<button type="button" onClick={()=>restart(true)}><ListChecks size={16}/>{tr('Ôn tập câu sai','Review mistakes')}</button>:null}
    </div></div>:
    <>
     <div className="we-practice-tabs" role="tablist" aria-label={tr('Dạng bài đọc hiểu','Practice formats')}>
      {MODES.filter(m=>shown.some(q=>q.question_type===m.type)).map(item=>
       <button type="button" role="tab" id={'we-tab-'+item.type} aria-controls="we-practice-question"
        aria-selected={mode===item.type} className={mode===item.type?'active':''} key={item.type}
        onClick={()=>changeMode(item.type)}>{vi?item.vi:item.en}
        <small>{shown.filter(q=>q.question_type===item.type).length}</small></button>)}
     </div>
     {current?<div className="we-question" id="we-practice-question" role="tabpanel" aria-labelledby={'we-tab-'+mode}>
      <div className="we-question-meta"><span>{tr('Câu','Question')} {position+1}/{group.length}</span>
       <span>{tr('Điểm tối đa','Max points')}: {current.points||1}</span></div>
      <p className="we-question-stem" lang="en">{current.stem_en}</p>
      {current.stem_vi?<p className="we-question-stem-vi" lang="vi">{current.stem_vi}</p>:null}
      {(mode==='true_false'||mode==='single_choice')?
       <fieldset className="we-choice-grid" disabled={Boolean(feedback[current.id])}>
        <legend className="we-sr-only">{tr('Chọn một đáp án','Choose one answer')}</legend>
        {current.options.map((o,i)=><label key={o.id} className={'we-choice'+(selected[current.id]===o.id?' is-selected':'')}>
         <input type="radio" name={'we-q-'+current.id} checked={selected[current.id]===o.id}
          onChange={()=>handleChoice(current.id,o.id)}/><span>{mode==='single_choice'?String.fromCharCode(65+i)+'. ':''}{o.text}</span></label>)}
       </fieldset>:null}
      {mode==='matching'?<div className="we-matching">
       {current.options.filter(o=>o.kind==='term').map(term=><label key={term.id}><strong lang="en">{term.text}</strong>
        <select disabled={Boolean(feedback[current.id])} value={selected[current.id]?.[term.id]||''}
         onChange={e=>handleChoice(current.id,{...(selected[current.id]||{}),[term.id]:e.target.value})}>
         <option value="">{tr('Chọn nghĩa','Choose meaning')}</option>
         {current.options.filter(o=>o.kind==='meaning').map(m=><option key={m.id} value={m.id}>{m.text}</option>)}
        </select></label>)}
       </div>:null}
      {(mode==='gap_fill'||mode==='short_answer')?<label className="we-written-answer">
       <span>{tr('Câu trả lời của bạn','Your answer')}</span>
       <input type="text" maxLength={160} autoComplete="off" disabled={Boolean(feedback[current.id])}
        value={typeof selected[current.id]==='string'?selected[current.id]:''}
        placeholder={tr('Nhập câu trả lời…','Type your answer…')}
        onChange={e=>handleChoice(current.id,e.target.value)}/></label>:null}
      {feedback[current.id]?<div className={'we-feedback '+(feedback[current.id].correct?'is-correct':'is-incorrect')} role="status">
       <div>{feedback[current.id].correct?<CheckCircle2 size={22}/>:<XCircle size={22}/>}
        <strong>{feedback[current.id].correct?tr('Chính xác!','Correct!'):tr('Chưa chính xác','Not quite')}</strong>
        <span>+{feedback[current.id].earned}/{feedback[current.id].max_points}</span></div>
       <p>{vi?feedback[current.id].explanation_vi:feedback[current.id].explanation_en}</p>
       <p><b>{tr('Đáp án','Answer')}:</b> {describeAnswer(feedback[current.id].answer_key,current)}</p>
       {feedback[current.id].evidence?.exact_quote?<blockquote lang="en">{feedback[current.id].evidence.exact_quote}</blockquote>:null}
       <button type="button" onClick={()=>onEvidence?.(feedback[current.id].evidence?.exact_quote||'')}>
        <BookOpen size={15}/>{tr('Xem dẫn chứng trong bài','Find evidence in the reading')}</button>
      </div>:null}
      {error?<p className="we-practice-error" role="alert">{error}</p>:null}
      <div className="we-question-controls">
       <button type="button" onClick={()=>go(-1)} disabled={position===0}><ChevronLeft size={17}/>{tr('Trước','Previous')}</button>
       {!feedback[current.id]?<button type="button" className="is-primary" disabled={busy||selected[current.id]===undefined||
          selected[current.id]===''||mode==='matching'&&Object.keys(selected[current.id]||{}).length!==
          current.options.filter(o=>o.kind==='term').length}
          onClick={checkAnswer}>{busy?tr('Đang kiểm tra…','Checking…'):tr('Kiểm tra đáp án','Check Answer')}</button>:
        <button type="button" onClick={()=>go(1)} disabled={position>=group.length-1}>{tr('Tiếp theo','Next')}<ChevronRight size={17}/></button>}
      </div>
     </div>:<div className="we-learning-empty">{tr('Không có câu hỏi thuộc dạng này.','No questions of this type.')}</div>}
     <footer className="we-practice-footer"><span>{tr('Mọi đáp án được đối chiếu với ngữ liệu tiếng Anh đã lưu.','All answers are grounded in the saved English reading.')}</span>
      <button type="button" className="is-primary" disabled={busy||answered!==shown.length} onClick={finish}>
       <Check size={17}/>{tr('Hoàn thành bài','Complete Practice')}</button>
     </footer>
    </>}
  </section>
 </div>;
}
