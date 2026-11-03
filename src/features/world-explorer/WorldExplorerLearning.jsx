import React,{useEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,Bookmark,CheckCircle2,ChevronLeft,ChevronRight,ListChecks,RotateCcw,Sparkles,Target,XCircle} from 'lucide-react';
import {supabase,isSupabaseConfigured} from '../../utils/supabase.js';
import {buildWorldExplorerPack,gradeWorldExplorerAnswer} from './learningEngine.js';
import './world-explorer-learning.css';
const MODES=[['true_false','True / False'],['single_choice','Multiple Choice'],['matching','Ghép từ với nghĩa'],['gap_fill','Điền từ vào chỗ trống'],['short_answer','Short Answer']];
const tr=(vi,v,en)=>vi?v:en;
const storageKey=(article,hash,uid)=>'brian-we-v1:'+uid+':'+article+':'+hash;
const readStorage=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
const writeStorage=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{/* storage optional */}};
const quoteOf=ev=>Array.isArray(ev)?ev[0]?.exact_quote:ev?.exact_quote;
function Score({questions,checked,vi}){
 const answered=questions.filter(q=>checked[q.id]);
 const points=answered.reduce((n,q)=>n+(checked[q.id]?.points||0),0);
 const max=questions.reduce((n,q)=>n+q.points,0),percent=max?Math.round(points/max*100):0;
 return <div className="wel-score" role="status" aria-live="polite">
  <strong>{tr(vi,'Kết quả luyện tập','Practice results')}</strong>
  <span>{Number(points.toFixed(2))}/{max} · {percent}%</span>
  <small>{tr(vi,'Đã kiểm tra','Checked')}: {answered.length}/{questions.length} · {tr(vi,'Đúng hoàn toàn','Correct')}: {answered.filter(q=>checked[q.id].correct).length}</small>
 </div>;
}
function Question({q,value,feedback,vi,onAnswer,onCheck,onEvidence}){
 const options=Array.isArray(q.options)?q.options:[];
 const ready=typeof value==='string'?value.trim().length>0:!!value&&Object.keys(value).length===options.length;
 const answerText=Array.isArray(feedback?.answer)?feedback.answer.map(x=>x.word+' — '+x.meaning).join(' · '):String(feedback?.answer||'');
 const ev=quoteOf(feedback?.evidence);
 return <section className="wel-question" aria-labelledby={'wel-question-'+q.id}>
  <span className="wel-type-chip">{MODES.find(x=>x[0]===q.type)?.[1]}</span>
  <h5 id={'wel-question-'+q.id} lang="en">{q.stem}</h5>
  {['true_false','single_choice'].includes(q.type)?<div className="wel-options" role="radiogroup" aria-label={q.stem}>
   {options.map(o=><label className={'wel-choice '+(value===o.text?'is-picked':'')} key={o.id}>
    <input type="radio" name={q.id} value={o.text} disabled={!!feedback} checked={value===o.text} onChange={()=>onAnswer(o.text)}/>
    <span>{o.text}</span>
   </label>)}
  </div>:null}
  {q.type==='matching'?<div className="wel-match-list">{options.map(o=><label key={o.id}>
   <strong lang="en">{o.text}</strong>
   <select value={value?.[o.text]||''} disabled={!!feedback} onChange={e=>onAnswer({...value,[o.text]:e.target.value})}>
    <option value="">{tr(vi,'Chọn nghĩa','Choose meaning')}</option>
    {[...options].sort((a,b)=>a.meaning.localeCompare(b.meaning)).map(x=><option key={x.id} value={x.meaning}>{x.meaning}</option>)}
   </select>
  </label>)}</div>:null}
  {['gap_fill','short_answer'].includes(q.type)?<label className="wel-answer-input">
   <span>{tr(vi,'Câu trả lời của bạn','Your answer')}</span>
   <input type="text" value={typeof value==='string'?value:''} autoComplete="off" disabled={!!feedback} onChange={e=>onAnswer(e.target.value)} placeholder={tr(vi,'Nhập đáp án…','Enter your answer…')}/>
  </label>:null}
  <div className="wel-question-controls"><button type="button" className="wel-primary" onClick={onCheck} disabled={!ready||!!feedback}>
   <CheckCircle2 size={16}/>{tr(vi,'Kiểm tra đáp án','Check answer')}
  </button></div>
  {feedback?<div className={'wel-feedback '+(feedback.correct?'is-correct':'is-wrong')} role="status" aria-live="polite">
   <strong>{feedback.correct?<CheckCircle2 size={17}/>:<XCircle size={17}/>} {feedback.correct?tr(vi,'Chính xác!','Correct!'):tr(vi,'Chưa chính xác','Not quite')} · {Number(feedback.points.toFixed(2))}/{feedback.maxPoints}</strong>
   <p>{tr(vi,'Đáp án đúng','Correct answer')}: <b>{answerText}</b></p>
   <p>{vi?feedback.explanation_vi:feedback.explanation_en}</p>
   {ev?<div className="wel-evidence"><small>{tr(vi,'Dẫn chứng từ bài đọc','Evidence from the passage')}</small>
    <blockquote lang="en">{ev}</blockquote><button type="button" onClick={()=>onEvidence(ev)}>{tr(vi,'Xem trong bài đọc','View in reading')}</button>
   </div>:null}
  </div>:null}
 </section>;
}
export default function WorldExplorerLearning({article,language='vi'}){
 const vi=language!=='en',pack=useMemo(()=>buildWorldExplorerPack(article),[article?.id,article?.body_en]);
 const groups=useMemo(()=>Object.fromEntries(MODES.map(([id])=>[id,pack.questions.filter(q=>q.type===id)])),[pack]);
 const types=MODES.filter(([id])=>groups[id].length);
 const [mode,setMode]=useState(types[0]?.[0]||'true_false');
 const [index,setIndex]=useState(0);
 const [answers,setAnswers]=useState({});
 const [checked,setChecked]=useState({});
 const [completed,setCompleted]=useState(false);
 const [bookmark,setBookmark]=useState(false);
 const [uid,setUid]=useState(null);
 const [hydrated,setHydrated]=useState(false);
 const [message,setMessage]=useState('');
 const current=groups[mode]?.[index];
 const practiced=Object.keys(checked).length;
 const allChecked=pack.questions.length>0&&practiced===pack.questions.length;
 const previousArticle=useRef(null);
 useEffect(()=>{
  let alive=true;setHydrated(false);setAnswers({});setChecked({});setCompleted(false);setMode(types[0]?.[0]||'true_false');setIndex(0);setBookmark(false);
  async function recover(){
   let user=null;
   if(isSupabaseConfigured){try{const {data}=await supabase.auth.getUser();user=data?.user?.id||null;}catch{/* guest */}}
   if(!alive)return;setUid(user);
   const local=readStorage(storageKey(article.id,pack.content_hash,user||'guest'));
   let remote=null;
   if(user){try{
    const {data,error}=await supabase.from('world_explorer_learning_progress')
      .select('answers,feedback,completed').eq('user_id',user).eq('publication_id',article.id).eq('content_hash',pack.content_hash).maybeSingle();
    if(!error)remote=data;
    const saved=await supabase.from('world_explorer_bookmarks').select('publication_id').eq('user_id',user).eq('publication_id',article.id).maybeSingle();
    if(alive)setBookmark(!!saved.data);
   }catch{/* local fallback */}}
   if(!alive)return;const state=remote||local;
   if(state){
    const savedAnswers=state.answers&&typeof state.answers==='object'?state.answers:{};
    const evaluated={};for(const q of pack.questions){if(state.feedback&&Object.hasOwn(state.feedback,q.id))evaluated[q.id]=gradeWorldExplorerAnswer(q,savedAnswers[q.id]);}
    setAnswers(savedAnswers);setChecked(evaluated);setCompleted(!!state.completed);
   }setHydrated(true);
  }recover();return()=>{alive=false};
 },[article.id,pack.content_hash]);
 useEffect(()=>{
  if(!hydrated)return;
  const record={answers,feedback:Object.fromEntries(Object.keys(checked).map(id=>[id,true])),completed,updated_at:new Date().toISOString()};
  writeStorage(storageKey(article.id,pack.content_hash,uid||'guest'),record);
  if(uid&&isSupabaseConfigured){
   let cancelled=false;
   const timer=window.setTimeout(async()=>{
    try{const {error}=await supabase.from('world_explorer_learning_progress').upsert({
      user_id:uid,publication_id:article.id,content_hash:pack.content_hash,
      answers:record.answers,feedback:record.feedback,completed:record.completed,updated_at:record.updated_at
    },{onConflict:'user_id,publication_id,content_hash'});
    if(error&&!cancelled)setMessage(tr(vi,'Đã lưu trên thiết bị, đồng bộ tài khoản chưa thành công.','Saved locally; account sync unavailable.'));
    }catch{if(!cancelled)setMessage(tr(vi,'Đã lưu trên thiết bị.','Saved on device.'))}
   },500);
   return()=>{cancelled=true;window.clearTimeout(timer)};
  }
 },[answers,checked,completed,hydrated,uid,article.id,pack.content_hash]);
 async function saveBookmark(){
  if(!uid){setMessage(tr(vi,'Đăng nhập để lưu bài vào tài khoản.','Sign in to bookmark this article.'));return;}
  const next=!bookmark;setBookmark(next);
  try{
   const req=next?supabase.from('world_explorer_bookmarks').upsert({user_id:uid,publication_id:article.id},{onConflict:'user_id,publication_id'}):
    supabase.from('world_explorer_bookmarks').delete().eq('user_id',uid).eq('publication_id',article.id);
   const {error}=await req;if(error)throw error;setMessage('');
  }catch{setBookmark(!next);setMessage(tr(vi,'Không thể lưu dấu trang.','Unable to update bookmark.'));}
 }
 function chooseMode(value){setMode(value);setIndex(0);setCompleted(false);}
 function check(){if(!current||checked[current.id])return;setChecked(prev=>({...prev,[current.id]:gradeWorldExplorerAnswer(current,answers[current.id])}));}
 function next(){
  if(index+1<(groups[mode]?.length||0)){setIndex(x=>x+1);return;}
  const at=types.findIndex(([id])=>id===mode);if(at<types.length-1)chooseMode(types[at+1][0]);else setCompleted(true);
 }
 function retryWrong(){
  const wrong=pack.questions.find(q=>!checked[q.id]?.correct);
  if(!wrong){setCompleted(false);chooseMode(types[0]?.[0]||'true_false');return;}
  const nextChecked={...checked};for(const q of pack.questions)if(!checked[q.id]?.correct)delete nextChecked[q.id];
  setChecked(nextChecked);setCompleted(false);setMode(wrong.type);setIndex(groups[wrong.type].findIndex(q=>q.id===wrong.id));
 }
 function reset(){setAnswers({});setChecked({});setCompleted(false);chooseMode(types[0]?.[0]||'true_false');}
 function showEvidence(quote){
  const section=document.querySelector('#we-expanded-story .we-article-language');
  if(!section||!String(article.body_en).includes(quote))return;
  section.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth',block:'center'});
  section.setAttribute('data-we-evidence-active','true');
  window.setTimeout(()=>section.removeAttribute('data-we-evidence-active'),2200);
 }
 return <div className="wel-root" data-world-explorer-learning>
  <div className="wel-overview">
   <div className="wel-overview-title"><Sparkles size={20}/><span><strong>{tr(vi,'Khám phá & luyện tập','Discover & practice')}</strong><small>{tr(vi,'Học liệu dựa trên chính bài đọc phía trên','Learning material from this exact passage')}</small></span></div>
   <div className="wel-metrics"><span><BookOpen size={15}/>{pack.vocabulary.length} {tr(vi,'từ vựng','words')}</span><span><Target size={15}/>{pack.grammar.length} {tr(vi,'cấu trúc','structures')}</span><span><ListChecks size={15}/>{pack.questions.length} {tr(vi,'nhiệm vụ','tasks')}</span></div>
   <button type="button" className={'wel-bookmark '+(bookmark?'is-saved':'')} onClick={saveBookmark}><Bookmark size={15} fill={bookmark?'currentColor':'none'}/>{bookmark?tr(vi,'Đã lưu','Saved'):tr(vi,'Lưu vào thư viện','Save article')}</button>
  </div>
  <div className="wel-learning-cards">
   <section className="wel-card wel-vocabulary" aria-labelledby="wel-vocabulary"><h4 id="wel-vocabulary"><BookOpen size={19}/>{tr(vi,'Từ vựng cần học','Key vocabulary')}</h4>
    {pack.vocabulary.length?<div className="wel-word-table"><div className="wel-word-heading"><b>{tr(vi,'Từ','Word')}</b><b>{tr(vi,'Nghĩa','Meaning')}</b><b>{tr(vi,'Ví dụ trong bài','Example from text')}</b></div>
     {pack.vocabulary.map(v=><div className="wel-word-row" key={v.id}><strong lang="en">{v.word}</strong><span>{v.meaning}</span><small lang="en" title={v.example}>{v.example}</small></div>)}</div>:
     <p>{tr(vi,'Không có mục từ đã xác minh.','No verified vocabulary for this passage.')}</p>}
   </section>
   <section className="wel-card wel-grammar" aria-labelledby="wel-grammar"><h4 id="wel-grammar"><Target size={19}/>{tr(vi,'Cấu trúc cần học','Language structures')}</h4>
    {pack.grammar.length?<ol>{pack.grammar.map(g=><li key={g.id}><strong>{g.pattern}</strong><span>{g.meaning}</span><details><summary>{tr(vi,'Ví dụ từ bài đọc','Source example')}</summary><p lang="en">{g.example}</p></details></li>)}</ol>:
     <p>{tr(vi,'Chưa có cấu trúc đã xác minh.','No verified structures available.')}</p>}
   </section>
  </div>
  <section className="wel-practice" id="we-reading-practice" aria-labelledby="wel-practice-heading">
   <header><div><h4 id="wel-practice-heading"><ListChecks size={19}/>Reading Practice</h4><p>{tr(vi,'Luyện tập với ngữ liệu gốc · Có đáp án và dẫn chứng','Practice with exact source text · Answers and evidence')}</p></div>
    <strong className="wel-counter">{practiced}/{pack.questions.length}</strong></header>
   {pack.question_count?<><div className="wel-tabs" role="tablist" aria-label={tr(vi,'Dạng bài tập','Practice type')}>
    {MODES.map(([id,title])=><button type="button" role="tab" key={id} disabled={!groups[id].length} aria-selected={mode===id} className={mode===id?'is-active':''} onClick={()=>chooseMode(id)}>{title} <small>{groups[id].length}</small></button>)}</div>
    {completed?<div className="wel-complete">
     <Score questions={pack.questions} checked={checked} vi={vi}/><div className="wel-complete-actions">
      <button type="button" onClick={retryWrong}><RotateCcw size={16}/>{tr(vi,'Ôn tập câu sai','Review wrong answers')}</button>
      <button type="button" onClick={reset}>{tr(vi,'Làm lại bài','Start again')}</button>
     </div></div>:current?<><div className="wel-navigation"><span>{tr(vi,'Câu','Question')} {index+1}/{groups[mode].length}</span><div><button type="button" disabled={index===0} onClick={()=>setIndex(x=>Math.max(0,x-1))} aria-label={tr(vi,'Câu trước','Previous')}><ChevronLeft size={17}/></button><button type="button" onClick={next} aria-label={tr(vi,'Câu tiếp theo','Next')}><ChevronRight size={17}/></button></div></div>
     <Question key={current.id} q={current} value={answers[current.id]} feedback={checked[current.id]} vi={vi}
      onAnswer={value=>setAnswers(p=>({...p,[current.id]:value}))} onCheck={check} onEvidence={showEvidence}/>
     <div className="wel-end-actions"><button type="button" onClick={next}>{tr(vi,'Tiếp tục','Continue')}<ChevronRight size={16}/></button>{allChecked?<button type="button" onClick={()=>setCompleted(true)}>{tr(vi,'Xem kết quả','View results')}</button>:null}</div>
    </>:null}
    {!completed?<Score questions={pack.questions} checked={checked} vi={vi}/>:null}
   </>:<p>{tr(vi,'Chưa đủ dữ liệu xác minh để tạo bài luyện tập cho bài này.','Not enough verified evidence for practice in this article.')}</p>}
   {message?<p className="wel-notice" role="status">{message}</p>:null}
   <small className="wel-legal">{tr(vi,'Chế độ tự học có đáp án từ văn bản, không dùng làm bài kiểm tra chính thức.','Text-grounded self-study; not an official exam or assessment.')}</small>
  </section>
 </div>;
}
