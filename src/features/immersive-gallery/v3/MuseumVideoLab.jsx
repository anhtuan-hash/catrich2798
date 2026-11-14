import React,{useEffect,useState} from 'react';
import {BookOpen,Check,ExternalLink,Film,Link2,Play,RefreshCcw,Search,Send,ShieldCheck,Trash2,Video,X} from 'lucide-react';
import {extractYouTubeVideoId,VIDEO_TASK_SUGGESTIONS,MUSEUM_CURRICULUM_VIDEOS} from './museumLiveExtensions.js';
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
export default function MuseumVideoLab({mode='student',readOnly=false,stage,stageIndex,media,assignmentId,version,language='vi',csrf,onSaved,onProject,transport=liveStaff}){
 const teacher=mode==='teacher',task=media||{query:'',instruction:'',videos:[]},videos=task.videos||[];
 const [query,setQuery]=useState(task.query||''),[instruction,setInstruction]=useState(task.instruction||'');
 const [refine,setRefine]=useState(''),[manualUrl,setManualUrl]=useState(''),[manualTitle,setManualTitle]=useState('');
 const [results,setResults]=useState([]),[selected,setSelected]=useState(null);
 const [saving,setSaving]=useState(false),[searching,setSearching]=useState(false);
 const busy=saving||searching;
 const [message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{setQuery(task.query||'');setInstruction(task.instruction||'');setResults([]);setSelected(null);setError('');},[stageIndex,task.query,task.instruction]);
 const save=async(action,payload)=>{
  if(readOnly||busy)return;
  setSaving(true);setError('');setMessage('');
  try{
   const request=expectedVersion=>transport(action,{assignmentId,stageIndex,version:expectedVersion,...payload});
   let out;
   try{out=await request(version);}
   catch(e){
    if(!teacher||e.status!==409)throw e;
    const latest=await transport('state',null,{assignmentId});
    if(latest.session?.stageIndex!==stageIndex)throw new Error('The activity changed. Reopen Video Lab for the current activity.');
    out=await request(latest.session.version);
   }
   await onSaved?.(out);
   setMessage(action==='media-task'?
    (payload.query?'Research task assigned to the current activity.':'Research task cleared from this activity.'):
    action==='media-add'?'YouTube video assigned to the current activity.':
    'Video removed from the current activity.');
   if(action==='media-add'){setManualUrl('');setManualTitle('');}
  }catch(e){setError(e.message);}finally{setSaving(false);}
 };
 const search=async()=>{
  if(searching)return;
  setSearching(true);setError('');setMessage('');setResults([]);
  try{
   const res=teacher?
    await transport('video-search',null,{assignmentId,q:query.trim()}):
    await liveGuest('video-search','GET',null,csrf,{refine});
   setResults(res.results||[]);
   if(!res.available){
    const reasons={
     invalid_query:tr(language,'Nhập ít nhất 4 ký tự để tìm kiếm.','Enter at least 4 characters to search.'),
     youtube_api_key_not_configured:tr(language,'Chưa có YouTube API key và tìm kiếm dự phòng không khả dụng.','YouTube API key is missing and backup search is unavailable.'),
     youtube_quota_exceeded:tr(language,'Đã hết hạn mức YouTube API và tìm kiếm dự phòng không khả dụng.','YouTube API quota has been reached and backup search is unavailable.'),
     youtube_api_forbidden:tr(language,'YouTube API từ chối truy cập. Kiểm tra giới hạn API key trong Google Cloud.','YouTube API access was denied. Check the API key restrictions in Google Cloud.'),
     youtube_api_key_invalid:tr(language,'YouTube từ chối khóa API. Kiểm tra cấu hình trong Google Cloud.','YouTube rejected the API key. Check your Google Cloud configuration.')
    };
    setError(reasons[res.reason]||tr(language,'Không thể tìm video lúc này. Hãy thử lại hoặc thêm liên kết YouTube.','YouTube search is unavailable. Try again or add a YouTube URL manually.'));
   }else if(!res.results?.length){
    setMessage(tr(language,'Chưa có kết quả phù hợp. Hãy thử từ khóa rộng hơn.','No matching videos found. Try broader search terms.'));
   }else if(res.source?.includes('fallback')||res.source==='youtube-html'){
    setMessage(tr(language,'Đang sử dụng tìm kiếm YouTube dự phòng.','Using backup YouTube search.'));
   }
  }catch(e){setError(e.message||'YouTube search failed.');}finally{setSearching(false);}
 };
 const addManual=()=>{
  const id=extractYouTubeVideoId(manualUrl);
  if(!id){setError(tr(language,'Hãy nhập URL video YouTube hợp lệ (watch, youtu.be, shorts hoặc embed).','Enter a valid YouTube URL (watch, youtu.be, Shorts or embed).'));return;}
  save('media-add',{videoId:id,title:manualTitle||'Teacher-selected video',channel:''});
 };
 const suggestion=VIDEO_TASK_SUGGESTIONS[stage?.id]||'climate change school action';
 const curated=MUSEUM_CURRICULUM_VIDEOS[stageIndex];
 if(!teacher&&!task.query&&!videos.length)return null;
 return <section className="bml-video-lab" data-testid="museum-video-lab">
  <header className="bml-video-lab-header">
   <div><div className="bml-video-kicker"><Film size={18}/> VIDEO RESEARCH STUDIO</div>
    <h3>{tr(language,'Khám phá video theo nhiệm vụ','Research videos for this learning task')}</h3>
    <p>{tr(language,'Xem trực tiếp trong bài học, ghi nguồn và kiểm chứng trước khi sử dụng.','Watch here, cite the original creator and verify claims before using them.')}</p></div>
  </header>
  {teacher&&curated?<div className="bml-video-curated">
    <div className="bml-video-kicker"><ShieldCheck size={16}/> VERIFIED LESSON CLIP · NASA</div>
    <strong>{curated.title}</strong><p>{curated.prompt}</p><small>{curated.timing}</small>
    <div className="bml-video-actions">
     {readOnly?<button type="button" className="bml-primary" onClick={()=>{const clip={id:curated.id,title:curated.title,channel:curated.channel};setSelected(clip);onProject?.(clip);}}>
      <Play size={16}/>Watch NASA clip</button>:
     <button type="button" className="bml-primary" disabled={busy||videos.some(v=>v.id===curated.id)}
      onClick={()=>save('media-add',{videoId:curated.id,title:curated.title,channel:curated.channel,instruction:curated.prompt})}>
      <Check size={16}/>{videos.some(v=>v.id===curated.id)?'Assigned to this activity':'Assign verified NASA clip'}</button>}
     <a target="_blank" rel="noopener noreferrer" href={curated.source}>Check original NASA video</a>
    </div>
   </div>:null}
  {teacher&&readOnly?<div className="bml-video-task">
    <div className="bml-video-kicker"><ShieldCheck size={16}/> VIEW ONLY · NO SAVED CHANGES</div>
    {task.query?<strong>{task.query}</strong>:null}
    {task.instruction?<p lang="en">{task.instruction}</p>:null}
    <label>Search YouTube for viewing (not assigned to this lesson)
     <input maxLength={120} value={query} placeholder={suggestion} onChange={e=>setQuery(e.target.value)}/></label>
    <button className="bml-outline" type="button" onClick={search} disabled={searching||query.trim().length<4}>
     <Search size={17}/>{searching?'Searching…':'Search videos'}</button>
   </div>:teacher?<div className="bml-video-teacher-form">
   <label>{tr(language,'Từ khóa tìm kiếm giao cho học sinh','Student research search topic')}
    <input maxLength={120} value={query} placeholder={suggestion} onChange={e=>setQuery(e.target.value)}/></label>
   <label>{tr(language,'Câu hỏi định hướng khi xem video','Teacher viewing task')}
    <textarea rows={2} maxLength={350} value={instruction} onChange={e=>setInstruction(e.target.value)}
     placeholder="Find one claim, identify its source, and explain a limitation in English."/></label>
   <div className="bml-video-actions">
    <button type="button" className="bml-primary" disabled={busy||query.trim().length<6}
     onClick={()=>save('media-task',{query:query.trim(),instruction:instruction.trim()})}><Check size={17}/>Assign research task</button>
    {task.query?<button type="button" className="bml-outline" disabled={busy} onClick={()=>save('media-task',{query:'',instruction:''})}>Clear research task</button>:null}
    <button type="button" className="bml-outline" disabled={searching||query.trim().length<4} onClick={search}><Search size={17}/>{searching?'Searching…':tr(language,'Tìm video trên YouTube','Search YouTube videos')}</button>
   </div>
   <div className="bml-video-manual"><label>{tr(language,'Hoặc chọn trước một video YouTube phù hợp','Or select a suitable YouTube video in advance')}
    <input maxLength={250} value={manualUrl} placeholder="https://www.youtube.com/watch?v=…" onChange={e=>setManualUrl(e.target.value)}/></label>
    <label>{tr(language,'Tên video / nguồn','Video title / source')}
     <input maxLength={160} value={manualTitle} placeholder="Teacher-curated climate video" onChange={e=>setManualTitle(e.target.value)}/></label>
    <button type="button" className="bml-outline" disabled={busy||!extractYouTubeVideoId(manualUrl)} onClick={addManual}><Link2 size={16}/>Assign video to this activity</button>
   </div>
   <p className="bml-video-note" role="status">{task.query?'Research task assigned · ':''}{videos.length?videos.length+' video(s) assigned to this activity':'Paste a YouTube URL above to assign a specific video without an API key.'}</p>
  </div>:<div className="bml-video-task">
   <span className="bml-video-task-label"><ShieldCheck size={17}/>{tr(language,'NHIỆM VỤ GIÁO VIÊN GIAO','TEACHER-ASSIGNED RESEARCH')}</span>
   <strong>{task.query||'Teacher-selected research videos'}</strong>
   {task.instruction?<p lang="en">{task.instruction}</p>:null}
   {task.query?<div className="bml-video-student-search"><label>{tr(language,'Tìm thêm trong chủ đề (tối đa 32 ký tự)','Refine the topic (32 characters max)')}
    <input value={refine} maxLength={32} placeholder="causes · student actions…" onChange={e=>setRefine(e.target.value)}/></label>
    <button type="button" className="bml-primary" disabled={searching} onClick={search}><Search size={16}/>{searching?'Searching…':tr(language,'Tìm video','Search videos')}</button></div>:null}
  </div>}
  {videos.length?<div className="bml-video-approved">
   <div className="bml-video-kicker"><Check size={16}/> {tr(language,'VIDEO GIÁO VIÊN ĐÃ CHỌN','TEACHER-SELECTED VIDEOS')} · {videos.length}</div>
   <div className="bml-video-results">{videos.map(v=><div className="bml-video-result" key={v.id}>
    <div><strong>{v.title}</strong><small>{v.channel||'YouTube'} · ID {v.id}</small></div>
    <div className="bml-video-actions"><button className="bml-outline" type="button" onClick={()=>{setSelected(v);onProject?.(v);}}><Play size={15}/>{teacher?tr(language,'Chiếu video','Project video'):tr(language,'Xem tại đây','Watch here')}</button>
     {teacher&&!readOnly?<button className="bml-outline" disabled={busy} type="button" onClick={()=>save('media-remove',{videoId:v.id})}><Trash2 size={15}/>{tr(language,'Bỏ','Remove')}</button>:null}</div>
   </div>)}</div>
  </div>:null}
  {results.length?<div className="bml-video-results">
   <h4>{tr(language,'Kết quả tìm kiếm · kiểm tra nguồn trước khi sử dụng','Search results · verify before citing')}</h4>
   {results.map(v=><div className="bml-video-result" key={v.id}>
    <div><strong>{v.title}</strong><small>{v.channel}</small></div>
    <div className="bml-video-actions">
     <button type="button" className="bml-outline" onClick={()=>{setSelected(v);onProject?.(v);}}><Play size={15}/>{teacher?tr(language,'Xem thử','Preview'):tr(language,'Xem tại đây','Watch here')}</button>
     {teacher&&!readOnly?<button type="button" className="bml-primary" disabled={busy||videos.some(x=>x.id===v.id)} onClick={()=>save('media-add',{videoId:v.id,title:v.title,channel:v.channel})}><Check size={15}/>{tr(language,'Duyệt','Approve')}</button>:null}
    </div>
   </div>)}
  </div>:null}
  {selected&&!onProject?<MuseumVideoFrame id={selected.id} title={selected.title} language={language} onClose={()=>setSelected(null)}/>:null}
  {message?<p className="bml-video-note" role="status">{message}</p>:null}
  {error?<p className="bml-live-media-error" role="alert">{error}</p>:null}
  <small className="bml-video-disclaimer">YouTube retains its own terms and playback controls. Searching does not publish material or substitute for a cited scientific source. Teacher-selected items can be opened even when search API is unavailable.</small>
 </section>;
}
