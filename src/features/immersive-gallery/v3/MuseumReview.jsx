import React,{useEffect,useMemo,useState} from 'react';
import { LockKeyhole,ArrowLeft,ArrowRight,BookOpen,CheckCircle2,ClipboardCheck,Clock3,Eye,FileText,MessageCircle,ShieldAlert,ShieldCheck,Star,Trash2,Users} from 'lucide-react';
import {RUBRIC,progressOfGroup,scoreRubric} from './museumData.js';
import {englishSystemGroupLabel} from './museumApi.js';
import {staffRequest} from './museumApi.js';
import MuseumScene,{reviewMuseum} from './MuseumScene.jsx';
import {artStaff} from './museumLiveApi.js';
const tr=(lang,vi,en)=>lang==='en'?en:vi;
const NOTES={
 submitted:{label:'Chờ Admin',kind:'yellow'},
 ttcm_review:{label:'Chờ Admin',kind:'purple'},
 changes_requested:{label:'Cần chỉnh sửa',kind:'orange'},
 approved_locked:{label:'Đã duyệt',kind:'green'},
 published:{label:'Đã công bố',kind:'green'},
 rejected:{label:'Đã từ chối',kind:'red'}
};
export function Submissions({data,onRefresh,initialReview,onNavigate,query='',language='vi'}){
 const [filter,setFilter]=useState('all'),[selectedId,setSelectedId]=useState(initialReview||null),
  [note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),
  [success,setSuccess]=useState(''),[preview,setPreview]=useState(false),[scores,setScores]=useState({});
 const [reviewArtAssets,setReviewArtAssets]=useState([]);
 const groups=data?.groups||[],assignments=data?.assignments||[],reviews=data?.reviews||[];
 const mine=useMemo(()=>reviews.filter(r=>{const g=groups.find(x=>x.id===r.group_id),a=assignments.find(x=>x.id===g?.assignment_id);return (filter==='all'||r.state===filter)&&((r.snapshot?.title||'')+' '+(g?.label||'')+' '+(a?.class_scope||'')).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());}),[reviews,filter,query,groups,assignments]);
 const selected=reviews.find(r=>r.id===selectedId);
 const group=groups.find(g=>g.id===selected?.group_id);
 // Teacher/admin art URLs are private and short-lived. Fetch when a submission
 // preview opens and renew while it remains visible, without touching snapshots.
 useEffect(()=>{
  if(!preview||!selected?.group_id)return undefined;
  let active=true;
  const refresh=async()=>{
   try{const assets=await artStaff(selected.group_id);if(active)setReviewArtAssets(assets);}
   catch(e){if(active)setError(e.message||'Unable to load private student artwork.');}
  };
  refresh();
  const timer=window.setInterval(refresh,55000);
  return()=>{active=false;window.clearInterval(timer);};
 },[preview,selected?.group_id]);
 const assignment=assignments.find(a=>a.id===group?.assignment_id);
 const rubric=data?.rubrics?.find(r=>r.review_id===selectedId);
 const initialScores=selected?Object.fromEntries(RUBRIC.map(c=>[c.key,Number(scores[selectedId]?.[c.key]??rubric?.scores?.[c.key]??0)])):{};
 const isAdmin=data?.profile?.role==='admin'&&!data?.offlineReadOnly;
 const frozen=Boolean(assignment?.content_frozen_at);
 const canTeach=selected&&isAdmin&&!frozen;
 const canReview=selected&&isAdmin&&!frozen;
 const canPublish=selected&&isAdmin&&!frozen;
 const decide=async action=>{
  setBusy(true);setError('');setSuccess('');
  try{
   await staffRequest(action==='publish'?'publish':'admin-decision',action==='publish'?{reviewId:selected.id}:{reviewId:selected.id,action,note});
   setSuccess(tr(language,'Đã lưu quyết định và nhật ký duyệt.','Review decision and audit log saved.'));
   setSelectedId(null);setPreview(false);setNote('');await onRefresh();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const archiveReview=async()=>{
  if(!selected||!isAdmin||busy||frozen)return;
  if(!window.confirm(tr(language,
   'Xóa bài nộp “'+(selected.snapshot?.title||'')+'” khỏi danh sách duyệt? Bài gốc và nhật ký được lưu; nhóm có thể chỉnh sửa và nộp bản mới. Bài đã duyệt/công bố không thể xóa.',
   'Remove “'+(selected.snapshot?.title||'')+'” from the review queue? Original evidence and audit are preserved; a new draft version can be submitted. Approved/published submissions are protected.')))return;
  setBusy(true);setError('');setSuccess('');
  try{await staffRequest('archive-review',{reviewId:selected.id});setSelectedId(null);setPreview(false);await onRefresh();
   setSuccess(tr(language,'Đã xóa bài nộp khỏi danh sách duyệt.','Submission removed from review queue.'));}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const grade=async()=>{
  setBusy(true);setError('');setSuccess('');
  try{
   const total=scoreRubric(initialScores);
   await staffRequest('grade-rubric',{reviewId:selected.id,scores:initialScores,feedback:note});
   // A failed dashboard refresh must not be confused with a failed score save.
   setSuccess(tr(language,'Đã lưu rubric: ','Rubric saved: ')+total+'/100');
   try{await onRefresh();}
   catch{setError(tr(language,'Điểm đã lưu nhưng chưa thể làm mới danh sách. Tải lại trang để kiểm tra.','The rubric was saved, but the list could not refresh. Reload to verify.'));}
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const open=r=>{setSelectedId(r.id);setNote(data?.rubrics?.find(row=>row.review_id===r.id)?.feedback||'');setError('');setSuccess('');setPreview(false);setReviewArtAssets([]);setScores({});};
 return <div className="bml-screen" data-testid="museum-review-desk">
  <div className="bml-heading-actions"><div><div className="bml-overline">{tr(language,'ĐÁNH GIÁ HỌC TẬP','LEARNING ASSESSMENT')}</div>
   <h1>{tr(language,'Bài nộp của học sinh','Student submissions')}</h1>
   <p>{tr(language,'Đây là bài nộp bảo tàng; Exit Ticket được xem riêng trong Bài học.','Museum project submissions appear here; Exit Tickets are available under Lessons.')}</p></div>
   <div className="bml-heading-meta"><Users size={19}/>{reviews.length} {tr(language,'bảo tàng đã nộp','museum submissions')} · {data?.exitTickets?.length||0} Exit Tickets</div></div>
  <div className="bml-tab-filter" aria-label={tr(language,'Lọc bài nộp','Filter submissions')}>
   {[['all','Tất cả'],['submitted','Chờ Admin'],['ttcm_review','Chờ Admin (cũ)'],['changes_requested','Cần sửa'],['approved_locked','Đã duyệt']].map(([id,label])=>
    <button type="button" key={id} onClick={()=>setFilter(id)} className={filter===id?'is-active':''}>{tr(language,label,
    {all:'All',submitted:'Admin review',ttcm_review:'Admin review (legacy)',changes_requested:'Needs revision',approved_locked:'Approved'}[id])}
      <span>{id==='all'?reviews.length:reviews.filter(r=>r.state===id).length}</span></button>)}
  </div>
  {error?<div className="bml-banner bml-danger-banner" role="alert"><ShieldAlert size={19}/>{error}</div>:null}
  {success?<div className="bml-banner bml-success-banner" role="status"><CheckCircle2 size={19}/>{success}</div>:null}
  {!mine.length?<div className="bml-empty bml-surface"><ClipboardCheck size={33}/>
    <h2>{tr(language,'Không có bài nộp trong mục này','No submissions in this category')}</h2>
    <p>{tr(language,'Các nhóm sẽ xuất hiện ở đây sau khi nộp triển lãm.','Submitted group exhibitions will appear here.')}</p>
    <button type="button" className="bml-outline" onClick={()=>onNavigate('lessons')}>{tr(language,'Xem bài học','View lessons')}</button>
   </div>:<div className="bml-review-grid">{mine.map(r=>{
    const g=groups.find(x=>x.id===r.group_id),a=assignments.find(x=>x.id===g?.assignment_id),status=NOTES[r.state]||{label:r.state,kind:'gray'};
    return <button className={'bml-review-card '+(selectedId===r.id?'is-selected':'')} type="button" key={r.id} onClick={()=>open(r)}>
      <div className="bml-review-card-top"><span className="bml-group-avatar"><Users size={21}/></span>
       <span className={'bml-status-pill bml-status-'+status.kind}>{tr(language,status.label,{
        submitted:'Teacher review',ttcm_review:'Department review',changes_requested:'Needs revision',approved_locked:'Approved',published:'Published',rejected:'Rejected'}[r.state]||status.label)}</span></div>
      <strong>{language==='en'?englishSystemGroupLabel(g?.label||'Nhóm'):g?.label||'Nhóm'}</strong><span>{r.snapshot?.title||a?.title||'English museum'}</span>
      <small>{a?.class_scope||''}</small>
      <span className="bml-review-card-link">{tr(language,'Xem chi tiết','Open submission')} <ArrowRight size={17}/></span>
    </button>;
   })}</div>}
  {selected?<section className="bml-review-detail bml-surface">
   {frozen?<div className="bml-banner bml-success-banner" role="status"><LockKeyhole size={18}/> Finalized lesson · Read-only review. Grading, approval and deletion are locked.</div>:null}
    <div className="bml-section-head"><div><span className="bml-overline">{tr(language,'BẢN NỘP','SUBMISSION')} · v{selected.version}</span>
     <h2>{selected.snapshot?.title||tr(language,'Bản nháp','Draft')}</h2>
     <p>{language==='en'?englishSystemGroupLabel(group?.label):group?.label} · {assignment?.class_scope}</p></div>
     <button type="button" className="bml-icon-btn" onClick={()=>setSelectedId(null)} aria-label="Close"><ArrowLeft size={21}/></button></div>
    <div className="bml-review-detail-layout">
     <div className="bml-review-preview">
      <div className="bml-review-preview-head"><h3>{tr(language,'Sản phẩm học sinh','Student exhibition')}</h3>
       <button type="button" className="bml-outline" onClick={()=>setPreview(v=>!v)}><Eye size={17}/>{preview?tr(language,'Đọc nội dung','Read content'):tr(language,'Xem bảo tàng 2D/3D','Preview museum')}</button></div>
      {preview?<div className="bml-review-cinema-overlay" role="dialog" aria-modal="true" aria-label="Review student museum in Cinema Preview">
        <MuseumScene gallery={reviewMuseum(selected,reviewArtAssets)} embedded language={language}
         cinema initial3D onClose={()=>setPreview(false)}/>
       </div>:
       <div className="bml-submission-content">
        {(selected.snapshot?.rooms||[]).map((room,i)=><article key={i}>
         <h4>{String(i+1).padStart(2,'0')} · {room.title}</h4>
         {(room.exhibits||[]).map((e,j)=><div key={j} className="bml-submission-exhibit"><strong>{e.title}</strong><p>{e.description}</p></div>)}
        </article>)}
        {selected.snapshot?.learning?<div className="bml-learning-evidence"><h4>{tr(language,'Minh chứng quá trình học','Learning process evidence')}</h4>
         {[
          ['Vấn đề','issue'],['Nguồn','source'],['Phản hồi thử nghiệm','feedback'],['Cải tiến','improvement'],['Phản ánh','reflection']
         ].map(([label,key])=><p key={key}><b>{tr(language,label,{issue:'Problem',source:'Source',feedback:'Peer feedback',improvement:'Revision',reflection:'Reflection'}[key])}:</b> {selected.snapshot.learning[key]||tr(language,'Chưa ghi','Not recorded')}</p>)}
        </div>:null}
       </div>}
     </div>
     <aside className="bml-eval-pane"><div className="bml-eval-heading"><ClipboardCheck size={21}/><h3>{tr(language,'Rubric đánh giá','Assessment rubric')}</h3></div>
       <p className="bml-muted">{tr(language,'Rubric nội bộ, không phải tiêu chí chính thức của hội thi.','An internal learning rubric, not an official competition scoring scheme.')}</p>
       {RUBRIC.map(c=><label className="bml-rubric-row" key={c.key}><span><strong>{tr(language,c.label,c.en)}</strong><small>{c.help}</small></span>
        <div className="bml-score-input"><input type="number" min="0" max={c.max} step="1" disabled={!canTeach} value={initialScores[c.key]}
          onChange={e=>setScores(v=>({...v,[selectedId]:{...initialScores,[c.key]:Number(e.target.value)}}))}/><span>/{c.max}</span></div></label>)}
       <div className="bml-total-score">{tr(language,'Tổng điểm','Total score')} <strong>{Object.values(initialScores).reduce((x,y)=>x+(Number(y)||0),0)}<small>/100</small></strong></div>
       <label className="bml-full-field">{tr(language,'Nhận xét dành cho học sinh','Student feedback')}<textarea readOnly={!!data?.offlineReadOnly} rows={4} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}
        placeholder={tr(language,'Nêu một điểm tốt và một điều cần cải tiến…','Describe a strength and one area for improvement…')}/></label>
       {selected.teacher_note?<p className="bml-note"><b>{tr(language,'Giáo viên','Teacher')}:</b> {selected.teacher_note}</p>:null}
       {selected.ttcm_note?<p className="bml-note"><b>TTCM:</b> {selected.ttcm_note}</p>:null}
       <div className="bml-review-actions">
        {canTeach?<button type="button" className="bml-outline" disabled={busy} onClick={grade}><Star size={17}/>{tr(language,'Lưu điểm rubric','Save rubric')}</button>:null}
        {canReview&&['submitted','ttcm_review'].includes(selected.state)?<>
         <button type="button" className="bml-primary" disabled={busy} onClick={()=>decide('approve')}><CheckCircle2 size={17}/>{tr(language,'Admin phê duyệt','Admin approve')}</button>
         <button type="button" className="bml-outline" disabled={busy||!note.trim()} onClick={()=>decide('return')}><MessageCircle size={17}/>{tr(language,'Yêu cầu chỉnh sửa','Request changes')}</button>
         <button type="button" className="bml-danger" disabled={busy||!note.trim()} onClick={()=>decide('reject')}>{tr(language,'Từ chối','Reject')}</button>
        </>:null}
        {isAdmin&&!frozen&&!['approved_locked','published'].includes(selected.state)?<button type="button" className="bml-danger bml-archive-btn"
         disabled={busy} onClick={archiveReview}><Trash2 size={17}/>{tr(language,'Xóa bài nộp','Delete submission')}</button>:null}
        {canPublish&&selected.state==='approved_locked'?<button type="button" disabled={busy}
          className="bml-primary" onClick={()=>decide('publish')}><ShieldCheck size={17}/>{tr(language,'Admin công bố bản đã duyệt','Admin publishes approved version')}</button>:null}
       </div>
       <p className="bml-audit">{tr(language,'Mỗi quyết định được ghi nhận trên máy chủ; nội dung đã duyệt không thể âm thầm thay đổi.','All decisions are audited; approved snapshots cannot be silently modified.')}</p>
     </aside>
    </div>
   </section>:null}
 </div>;
}
