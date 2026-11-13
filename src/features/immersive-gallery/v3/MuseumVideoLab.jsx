import React,{useEffect,useState} from 'react';
import {BookOpen,Check,ExternalLink,Film,Link2,Play,RefreshCcw,Search,Send,ShieldCheck,Trash2,Video,X} from 'lucide-react';
import {extractYouTubeVideoId,VIDEO_TASK_SUGGESTIONS} from './museumLiveExtensions.js';
import {liveStaff,liveGuest} from './museumLiveApi.js';
const tr=(lang,vi,en)=>lang==='en'?en:vi;
export function MuseumVideoFrame({id,title,onClose,language='vi'}){
 const videoId=extractYouTubeVideoId(id);
 if(!videoId)return null;
 return <div className="bml-video-player" data-testid="museum-youtube-player">
  <div className="bml-video-player-heading"><strong><Film size={17}/>{title||'YouTube'}</strong>
   <button type="button" className="bml-outline" onClick={onClose}><X size={16}/>{tr(language,'Đóng video','Close video')}</button></div>
  <div className="bml-video-embed">
   <iframe title={'YouTube · '+(title||'Learning video')} loading="lazy"
    src={'https://www.youtube-nocookie.com/embed/'+videoId+'?rel=0&cc_load_policy=1&cc_lang_pref=en'}
    referrerPolicy="strict-origin-when-cross-origin"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/>
  </div>
  <p><small>{tr(language,'Video do YouTube cung cấp; một số video không cho phép nhúng hoặc có thể yêu cầu mở trực tiếp trên YouTube.','YouTube hosts this video. Some videos cannot be embedded and may require opening YouTube directly.')}</small>
   <a target="_blank" rel="noopener noreferrer" href={'https://www.youtube.com/watch?v='+videoId}><ExternalLink size={14}/>{tr(language,'Mở trên YouTube','Open on YouTube')}</a></p>
 </div>;
}
export default function MuseumVideoLab({mode='student',stage,stageIndex,media,assignmentId,version,language='vi',csrf,onSaved,onProject,transport=liveStaff}){
 const teacher=mode==='teacher',task=media||{query:'',instruction:'',videos:[]},videos=task.videos||[];
 const [query,setQuery]=useState(task.query||''),[instruction,setInstruction]=useState(task.instruction||'');
 const [refine,setRefine]=useState(''),[manualUrl,setManualUrl]=useState(''),[manualTitle,setManualTitle]=useState('');
 const [results,setResults]=useState([]),[selected,setSelected]=useState(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [searchAvailable,setSearchAvailable]=useState(null);
 useEffect(()=>{setQuery(task.query||'');setInstruction(task.instruction||'');setResults([]);setSelected(null);setError('');},[stageIndex,task.query,task.instruction]);
 const save=async(action,payload)=>{
  if(busy)return;
  setBusy(true);setError('');setMessage('');
  try{
   const out=await transport(action,{assignmentId,stageIndex,version,...payload});
   await onSaved?.(out);
   setMessage(tr(language,'Đã lưu nhiệm vụ video cho tiết học.','Video task saved for this lesson.'));
   if(action==='media-add'){setManualUrl('');setManualTitle('');}
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const search=async()=>{
  if(busy)return;
  setBusy(true);setError('');setMessage('');setResults([]);
  try{
   const res=teacher?
    await transport('video-search',null,{assignmentId,q:query}):
    await liveGuest('video-search','GET',null,csrf,{refine});
   setSearchAvailable(res.available===true);
   setResults(res.results||[]);
   if(!res.available)setMessage(tr(language,
    'Tìm kiếm YouTube trong ứng dụng cần cấu hình YOUTUBE_API_KEY trên Vercel. Video giáo viên đã chọn vẫn xem trực tiếp được.',
    'In-app YouTube search requires YOUTUBE_API_KEY on Vercel. Teacher-approved videos remain playable here.'));
   else if(!res.results?.length)setMessage(tr(language,'Chưa tìm được video phù hợp. Hãy điều chỉnh từ khóa.','No matching videos found. Adjust your keywords.'));
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const addManual=()=>{
  const id=extractYouTubeVideoId(manualUrl);
  if(!id){setError('Hãy nhập URL video YouTube hợp lệ (watch, youtu.be, shorts hoặc embed).');return;}
  save('media-add',{videoId:id,title:manualTitle||'Teacher-selected video',channel:''});
 };
 const suggestion=VIDEO_TASK_SUGGESTIONS[stage?.id]||'climate change school action';
 if(!teacher&&!task.query&&!videos.length)return null;
 return <section className="bml-video-lab" data-testid="museum-video-lab">
  <header className="bml-video-lab-header">
   <div><div className="bml-video-kicker"><Film size={18}/> VIDEO RESEARCH STUDIO</div>
    <h3>{tr(language,'Khám phá video theo nhiệm vụ','Research videos for this learning task')}</h3>
    <p>{tr(language,'Xem trực tiếp trong bài học, ghi nguồn và kiểm chứng trước khi sử dụng.','Watch here, cite the original creator and verify claims before using them.')}</p></div>
  </header>
  {teacher?<div className="bml-video-teacher-form">
   <label>{tr(language,'Từ khóa tìm kiếm giao cho học sinh','Student research search topic')}
    <input maxLength={120} value={query} placeholder={suggestion} onChange={e=>setQuery(e.target.value)}/></label>
   <label>{tr(language,'Câu hỏi định hướng khi xem video','Teacher viewing task')}
    <textarea rows={2} maxLength={350} value={instruction} onChange={e=>setInstruction(e.target.value)}
     placeholder="Find one claim, identify its source, and explain a limitation in English."/></label>
   <div className="bml-video-actions">
    <button type="button" className="bml-primary" disabled={busy||Boolean(query)&&query.trim().length<6}
     onClick={()=>save('media-task',{query:query.trim(),instruction:instruction.trim()})}><Check size={17}/>{tr(language,'Giao nhiệm vụ video','Assign video research')}</button>
    <button type="button" className="bml-outline" disabled={busy||query.trim().length<4} onClick={search}><Search size={17}/>{tr(language,'Tìm video trên YouTube','Search YouTube videos')}</button>
   </div>
   <div className="bml-video-manual"><label>Hoặc chọn trước một video YouTube phù hợp
    <input maxLength={250} value={manualUrl} placeholder="https://www.youtube.com/watch?v=…" onChange={e=>setManualUrl(e.target.value)}/></label>
    <label>Tên video / nguồn
     <input maxLength={160} value={manualTitle} placeholder="Teacher-curated climate video" onChange={e=>setManualTitle(e.target.value)}/></label>
    <button type="button" className="bml-outline" disabled={busy||!extractYouTubeVideoId(manualUrl)} onClick={addManual}><Link2 size={16}/>{tr(language,'Thêm vào kho học liệu','Add to class library')}</button>
   </div>
  </div>:<div className="bml-video-task">
   <span className="bml-video-task-label"><ShieldCheck size={17}/>{tr(language,'NHIỆM VỤ GIÁO VIÊN GIAO','TEACHER-ASSIGNED RESEARCH')}</span>
   <strong>{task.query||'Teacher-selected research videos'}</strong>
   {task.instruction?<p lang="en">{task.instruction}</p>:null}
   {task.query?<div className="bml-video-student-search"><label>{tr(language,'Tìm thêm trong chủ đề (tối đa 32 ký tự)','Refine the topic (32 characters max)')}
    <input value={refine} maxLength={32} placeholder="causes · student actions…" onChange={e=>setRefine(e.target.value)}/></label>
    <button className="bml-primary" disabled={busy} onClick={search}><Search size={16}/>{tr(language,'Tìm video','Search videos')}</button></div>:null}
  </div>}
  {videos.length?<div className="bml-video-approved">
   <div className="bml-video-kicker"><Check size={16}/> VIDEO GIÁO VIÊN ĐÃ CHỌN · {videos.length}</div>
   <div className="bml-video-results">{videos.map(v=><div className="bml-video-result" key={v.id}>
    <div><strong>{v.title}</strong><small>{v.channel||'YouTube'} · ID {v.id}</small></div>
    <div className="bml-video-actions"><button className="bml-outline" type="button" onClick={()=>{setSelected(v);onProject?.(v);}}><Play size={15}/>{teacher?'Chiếu video':'Xem tại đây'}</button>
     {teacher?<button className="bml-outline" disabled={busy} type="button" onClick={()=>save('media-remove',{videoId:v.id})}><Trash2 size={15}/>{tr(language,'Bỏ','Remove')}</button>:null}</div>
   </div>)}</div>
  </div>:null}
  {results.length?<div className="bml-video-results">
   <h4>{tr(language,'Kết quả tìm kiếm · kiểm tra nguồn trước khi sử dụng','Search results · verify before citing')}</h4>
   {results.map(v=><div className="bml-video-result" key={v.id}>
    <div><strong>{v.title}</strong><small>{v.channel}</small></div>
    <div className="bml-video-actions">
     <button type="button" className="bml-outline" onClick={()=>{setSelected(v);onProject?.(v);}}><Play size={15}/>{teacher?'Xem thử':'Xem tại đây'}</button>
     {teacher?<button type="button" className="bml-primary" disabled={busy||videos.some(x=>x.id===v.id)} onClick={()=>save('media-add',{videoId:v.id,title:v.title,channel:v.channel})}><Check size={15}/>Duyệt</button>:null}
    </div>
   </div>)}
  </div>:null}
  {selected&&!onProject?<MuseumVideoFrame id={selected.id} title={selected.title} language={language} onClose={()=>setSelected(null)}/>:null}
  {message?<p className="bml-video-note" role="status">{message}</p>:null}
  {error?<p className="bml-live-media-error" role="alert">{error}</p>:null}
  <small className="bml-video-disclaimer">YouTube retains its own terms and playback controls. Searching does not publish material or substitute for a cited scientific source. Teacher-selected items can be opened even when search API is unavailable.</small>
 </section>;
}
