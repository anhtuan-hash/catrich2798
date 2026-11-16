import React,{useEffect,useMemo,useRef,useState} from 'react';
import { LockKeyhole,ArrowLeft,ArrowRight,ArrowUpRight,BookOpen,CheckCircle2,ClipboardCheck,Clock3,Eye,FileText,MessageCircle,ShieldAlert,ShieldCheck,Star,Trash2,Users} from 'lucide-react';
import {RUBRIC,scoreRubric,suggestRubric} from './museumData.js';
import {englishSystemGroupLabel,staffRequest} from './museumApi.js';
import MuseumScene,{reviewMuseum} from './MuseumScene.jsx';
import {artStaff} from './museumLiveApi.js';
const tr=(lang,vi,en)=>lang==='en'?en:vi;
const AWAITING_REVIEW=['submitted','ttcm_review'];
const GRADEABLE=[...AWAITING_REVIEW,'approved_locked','published'];
const NOTES={
 submitted:{label:'Chờ Admin',kind:'yellow'},
 ttcm_review:{label:'Chờ Admin',kind:'purple'},
 changes_requested:{label:'Cần chỉnh sửa',kind:'orange'},
 approved_locked:{label:'Đã duyệt',kind:'green'},
 published:{label:'Đã công bố',kind:'green'},
 rejected:{label:'Đã từ chối',kind:'red'}
};
export function Submissions({data,onRefresh,initialReview,onNavigate,transport=staffRequest,query='',language='vi',editorial=false}){
 const [filter,setFilter]=useState('all'),[selectedId,setSelectedId]=useState(initialReview||null),
  [busy,setBusy]=useState(false),[error,setError]=useState(''),
  [success,setSuccess]=useState(''),[preview,setPreview]=useState(false),[form,setForm]=useState(null);
 const [reviewArtAssets,setReviewArtAssets]=useState([]);
 const [publishing,setPublishing]=useState(null);
 const detailHeading=useRef(null), openedCard=useRef(null);
 const groups=data?.groups||[],assignments=data?.assignments||[],reviews=data?.reviews||[];
 const mine=useMemo(()=>reviews.filter(r=>{const g=groups.find(x=>x.id===r.group_id),a=assignments.find(x=>x.id===g?.assignment_id);return (filter==='all'||r.state===filter)&&((r.snapshot?.title||'')+' '+(g?.label||'')+' '+(a?.class_scope||'')).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());}),[reviews,filter,query,groups,assignments]);
 const selected=reviews.find(r=>r.id===selectedId);
 const group=groups.find(g=>g.id===selected?.group_id);
 useEffect(()=>{
  if(editorial&&selected?.id)detailHeading.current?.focus();
 },[editorial,selected?.id]);
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
 const publicReadOnly=Boolean(data?.publicReadOnly);
 const isAdmin=data?.profile?.role==='admin'&&!data?.offlineReadOnly&&!publicReadOnly;
 const rubricsByReview=new Map((data?.rubrics||[]).map(row=>[row.review_id,row]));
 const rubric=!publicReadOnly||selected?.state==='published'?rubricsByReview.get(selectedId):undefined;
 const frozen=Boolean(assignment?.content_frozen_at);
 const canTeach=selected&&isAdmin&&!frozen&&GRADEABLE.includes(selected.state);
 const canReview=selected&&isAdmin&&!frozen&&AWAITING_REVIEW.includes(selected.state);
 const canPublish=selected&&isAdmin&&!frozen&&selected.state==='approved_locked'&&group?.state==='approved_locked';
 const showSuggested=canReview&&!rubric;
 const suggestedScores=showSuggested?suggestRubric(selected.id):{};
 const initialScores=form?.scores??Object.fromEntries(RUBRIC.map(c=>[c.key,rubric?.scores?.[c.key]??suggestedScores[c.key]??0]));
 const note=form?.note??rubric?.feedback??'';
 const editRubric=change=>setForm({
  scores:initialScores,note,expectedUpdatedAt:form?form.expectedUpdatedAt:rubric?.updated_at??null,...change
 });
 const publishable=mine.filter(r=>{
  if(r.state!=='approved_locked')return false;
  const g=groups.find(row=>row.id===r.group_id);
  const a=assignments.find(row=>row.id===g?.assignment_id);
  return g?.state==='approved_locked'&&a&&!a.content_frozen_at&&!a.archived_at;
 });
 const busyAny=busy||publishing!==null;
 const decide=async action=>{
  if(!selected||busyAny)return;
  setBusy(true);setError('');setSuccess('');
  try{
   const body={reviewId:selected.id};
   if(action==='approve'){
    scoreRubric(initialScores);
    if(showSuggested||form){
     body.rubric={scores:initialScores,expectedUpdatedAt:form?form.expectedUpdatedAt:rubric?.updated_at??null};
    }
   }
   if(action!=='publish')Object.assign(body,{action,note});
   await transport(action==='publish'?'publish':'admin-decision',body);
   setSuccess(action==='publish'
    ?tr(language,'Đã công bố triển lãm.','Exhibition published.')
    :tr(language,'Đã lưu quyết định và nhật ký duyệt.','Review decision and audit log saved.'));
   setSelectedId(null);setPreview(false);setForm(null);await refreshAfterChange();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const refreshAfterChange=async()=>{
  try{
   if(await onRefresh()===null)throw new Error();
   return true;
  }catch{
   setError(tr(language,'Thao tác đã lưu. Tải lại trang để xem danh sách mới nhất.','The change was saved. Reload the page to see the latest submissions.'));
   return false;
  }
 };
 const publishVisible=async()=>{
  if(!isAdmin||busyAny||!publishable.length)return;
  const list=publishable.map(r=>{
   const g=groups.find(row=>row.id===r.group_id);
   const a=assignments.find(row=>row.id===g.assignment_id);
   const groupLabel=language==='en'?englishSystemGroupLabel(g.label):g.label;
   return {id:r.id,label:[a.class_scope,groupLabel,r.snapshot?.title].filter(Boolean).join(' · ')};
  });
  if(!window.confirm(tr(language,
   'Công bố '+list.length+' triển lãm đã duyệt đang hiển thị?',
   'Publish '+list.length+' approved exhibitions in the current list?')))return;
  setPublishing({done:0,total:list.length});setError('');setSuccess('');
  const failed=[];let published=0;
  try{
   for(const [index,item] of list.entries()){
    try{
     await transport('publish',{reviewId:item.id});
     published++;
    }catch(e){failed.push(item.label+' — '+e.message);}
    setPublishing({done:index+1,total:list.length});
   }
   if(published) setSuccess(tr(language,'Đã công bố '+published+' triển lãm.',
    'Published '+published+(published===1?' exhibition.':' exhibitions.')));
   await refreshAfterChange();
   if(failed.length) setError(previous=>[previous,tr(language,
    'Chưa xác nhận công bố '+failed.length+' triển lãm. Làm mới danh sách rồi thử lại các bài còn ở mục Đã duyệt.',
    'Could not confirm '+failed.length+' publications. Refresh and retry the submissions still listed as Approved.'
   ),...failed].filter(Boolean).join('\n'));
  }finally{setPublishing(null);}
 };
 const archiveReview=async()=>{
  if(!selected||!isAdmin||busyAny||frozen)return;
  if(!window.confirm(tr(language,
   'Xóa bài nộp “'+(selected.snapshot?.title||'')+'” khỏi danh sách duyệt? Bài gốc và nhật ký được lưu; nhóm có thể chỉnh sửa và nộp bản mới. Bài đã duyệt/công bố không thể xóa.',
   'Remove “'+(selected.snapshot?.title||'')+'” from the review queue? Original evidence and audit are preserved; a new draft version can be submitted. Approved/published submissions are protected.')))return;
  setBusy(true);setError('');setSuccess('');
  try{await transport('archive-review',{reviewId:selected.id});setSelectedId(null);setPreview(false);setForm(null);await refreshAfterChange();
   setSuccess(tr(language,'Đã xóa bài nộp khỏi danh sách duyệt.','Submission removed from review queue.'));}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const grade=async()=>{
  if(!canTeach||busyAny)return;
  setBusy(true);setError('');setSuccess('');
  try{
   const total=scoreRubric(initialScores);
   await transport('grade-rubric',{reviewId:selected.id,scores:initialScores,feedback:note});
   // A failed dashboard refresh must not be confused with a failed score save.
   setSuccess(tr(language,'Đã lưu rubric: ','Rubric saved: ')+total+'/100');
   if(await refreshAfterChange())setForm(null);
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const previewButton=<button type="button" className="bml-outline bml-review-preview-toggle" onClick={()=>setPreview(v=>!v)}>
  <Eye size={17} aria-hidden="true"/>{preview?tr(language,'Đọc nội dung','Read content'):tr(language,'Xem bảo tàng 2D/3D','Preview museum')}
 </button>;
 const groupContext=[language==='en'?englishSystemGroupLabel(group?.label):group?.label,assignment?.class_scope].filter(Boolean).join(' · ');
 const submissionVersion=tr(language,'BẢN NỘP','SUBMISSION')+' · v'+selected?.version;
 const open=r=>{setSelectedId(r.id);setForm(null);setError('');setSuccess('');setPreview(false);setReviewArtAssets([]);};
 return <div className={'bml-screen'+(editorial?' swiss-editorial-review-desk':'')} data-testid="museum-review-desk">
  {!editorial?<div className="bml-heading-actions"><div><div className="bml-overline">{tr(language,'ĐÁNH GIÁ HỌC TẬP','LEARNING ASSESSMENT')}</div>
   <h1>{tr(language,'Bài nộp của học sinh','Student submissions')}</h1>
   <p>{tr(language,'Đây là bài nộp bảo tàng; Exit Ticket được xem riêng trong Bài học.','Museum project submissions appear here; Exit Tickets are available under Lessons.')}</p></div>
   <div className="bml-heading-meta"><Users size={19}/>{reviews.length} {tr(language,'bảo tàng đã nộp','museum submissions')} · {data?.exitTickets?.length||0} Exit Tickets</div></div>:null}
  <div className="bml-submissions-toolbar"><div className="bml-tab-filter" role="group" aria-label={tr(language,'Lọc bài nộp','Filter submissions')}>
   {[['all','Tất cả'],['submitted','Chờ Admin'],['ttcm_review','Chờ Admin (cũ)'],['changes_requested','Cần sửa'],['approved_locked','Đã duyệt']].map(([id,label])=>
    <button type="button" key={id} onClick={()=>setFilter(id)} className={filter===id?'is-active':''} aria-pressed={filter===id}>{tr(language,label,
    {all:'All',submitted:'Admin review',ttcm_review:'Admin review (legacy)',changes_requested:'Needs revision',approved_locked:'Approved'}[id])}
      <span>{id==='all'?reviews.length:reviews.filter(r=>r.state===id).length}</span></button>)}
  </div>
  {isAdmin&&(publishable.length||publishing)?<button type="button" className="bml-primary" disabled={busyAny} onClick={publishVisible}>
   <ShieldCheck size={17}/>{publishing
    ?tr(language,'Đang công bố','Publishing')+' '+publishing.done+'/'+publishing.total
    :tr(language,'Công bố hàng loạt','Publish all approved')+' ('+publishable.length+')'}
  </button>:null}</div>
  <div className="bml-review-results" style={editorial?undefined:{display:'contents'}}>
  {error?<div className="bml-banner bml-danger-banner" role="alert"><ShieldAlert size={19}/><span className="bml-review-error">{error}</span></div>:null}
  {publishing?<span className="bml-review-publish-progress" role="status">{tr(language,'Đã xử lý','Processed')} {publishing.done}/{publishing.total}</span>:null}
  {success?<div className="bml-banner bml-success-banner" role="status"><CheckCircle2 size={19}/>{success}</div>:null}
  {!mine.length?<div className="bml-empty bml-surface"><ClipboardCheck size={33}/>
    <h2>{tr(language,'Không có bài nộp trong mục này','No submissions in this category')}</h2>
    <p>{tr(language,'Các nhóm sẽ xuất hiện ở đây sau khi nộp triển lãm.','Submitted group exhibitions will appear here.')}</p>
    <button type="button" className="bml-outline" onClick={()=>onNavigate('lessons')}>{tr(language,'Xem bài học','View lessons')}</button>
   </div>:<div className="bml-review-grid">{mine.map(r=>{
    const g=groups.find(x=>x.id===r.group_id),a=assignments.find(x=>x.id===g?.assignment_id),status=NOTES[r.state]||{label:r.state,kind:'gray'};
    const savedScores=(isAdmin||(publicReadOnly&&r.state==='published'))?rubricsByReview.get(r.id)?.scores:undefined;
    const total=savedScores?RUBRIC.reduce((sum,criterion)=>sum+(Number(savedScores[criterion.key])||0),0):null;
    const groupLabel=language==='en'?englishSystemGroupLabel(g?.label||'Nhóm'):g?.label||'Nhóm';
    const title=r.snapshot?.title||a?.title||'English museum';
    const statusName=tr(language,status.label,{
      submitted:'Teacher review',ttcm_review:'Department review',changes_requested:'Needs revision',approved_locked:'Approved',published:'Published',rejected:'Rejected'}[r.state]||status.label);
    const rubricLabel=tr(language,'Rubric đã lưu','Saved rubric');
    const openLabel=tr(language,'Xem chi tiết','Open submission');
    return <button className={'bml-review-card '+(selectedId===r.id?'is-selected':'')} type="button" key={r.id} disabled={busy} aria-expanded={editorial?selectedId===r.id:undefined} aria-controls={editorial&&selectedId===r.id?'museum-review-detail':undefined} onClick={event=>{openedCard.current=event.currentTarget;open(r);}}>
     {editorial?<>
      <span className="bml-review-card-top">
        <span className="swiss-editorial-review-group">{[groupLabel,a?.class_scope].filter(Boolean).join(' · ')}</span>
        <span className="swiss-editorial-review-status">{statusName}</span>
      </span>
      <strong className="swiss-editorial-review-title">{title}</strong>
      <span className="swiss-editorial-review-meta">
        {total!==null?<small className="bml-card-rubric">{rubricLabel}: <b>{total}/100</b></small>:null}
        <span className="bml-review-card-link">{openLabel} <ArrowUpRight size={16} aria-hidden="true"/></span>
      </span>
     </>:<>
      <div className="bml-review-card-top"><span className="bml-group-avatar"><Users size={21}/></span>
       <span className={'bml-status-pill bml-status-'+status.kind}>{statusName}</span></div>
      <strong>{groupLabel}</strong><span>{title}</span>
      <small>{a?.class_scope||''}</small>
      {total!==null?<small className="bml-card-rubric">{rubricLabel} · <b>{total}/100</b></small>:null}
      <span className="bml-review-card-link">{openLabel} <ArrowRight size={17}/></span>
     </>}
    </button>;
   })}</div>}
  </div>
  {selected?<section className="bml-review-detail bml-surface" id={editorial?'museum-review-detail':undefined} aria-labelledby={editorial?'museum-review-title':undefined}>
   {frozen?<div className="bml-banner bml-success-banner" role="status"><LockKeyhole size={18}/> Finalized lesson · Read-only review. Grading, approval and deletion are locked.</div>:null}
    <div className="bml-section-head"><div>
     <span className="bml-overline">{editorial&&groupContext?groupContext:submissionVersion}</span>
     <h2 ref={detailHeading} id={editorial?'museum-review-title':undefined} tabIndex={editorial?-1:undefined}>{selected.snapshot?.title||tr(language,'Bản nháp','Draft')}</h2>
     <p>{editorial&&groupContext?submissionVersion:groupContext}</p></div>
     <div className="bml-review-detail-controls">
      {editorial?previewButton:null}
      <button type="button" className="bml-icon-btn" disabled={busy} onClick={()=>{setSelectedId(null);setForm(null);if(editorial)openedCard.current?.focus();}} aria-label={editorial?tr(language,'Đóng chi tiết','Close submission'):'Close'}><ArrowLeft size={21} aria-hidden="true"/></button>
     </div>
    </div>
    <div className="bml-review-detail-layout">
     <div className="bml-review-preview">
      <div className="bml-review-preview-head"><h3>{tr(language,'Sản phẩm học sinh','Student exhibition')}</h3>
       {editorial?null:previewButton}</div>
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
       {showSuggested?<p className="bml-muted" role="note">{tr(language,'Điểm gợi ý ngẫu nhiên. Kiểm tra hoặc chỉnh từng tiêu chí trước khi lưu hay duyệt.','Randomly suggested scores. Check or edit each criterion before saving or approving.')}</p>:null}
       {publicReadOnly&&!rubric?.scores?<p className="bml-muted" role="status">
        {tr(language,'Chưa có điểm rubric được công khai.','No rubric score is available to the public.')}
       </p>:<>
       {RUBRIC.map(c=><label className="bml-rubric-row" key={c.key}><span><strong>{tr(language,c.label,c.en)}</strong><small>{c.help}</small></span>
        <div className="bml-score-input"><input type="number" min="0" max={c.max} step="1" disabled={!canTeach||busyAny} value={initialScores[c.key]}
          onChange={e=>editRubric({scores:{...initialScores,[c.key]:Number(e.target.value)}})}/><span>/{c.max}</span></div></label>)}
       <div className="bml-total-score">{tr(language,'Tổng điểm','Total score')} <strong>{Object.values(initialScores).reduce((x,y)=>x+(Number(y)||0),0)}<small>/100</small></strong></div>
       </>}
       {!publicReadOnly?<label className="bml-full-field">{tr(language,'Nhận xét dành cho học sinh','Student feedback')}<textarea readOnly={(!canTeach&&!canReview)||busyAny} rows={4} maxLength={2000} value={note} onChange={e=>editRubric({note:e.target.value})}
        placeholder={tr(language,'Nêu một điểm tốt và một điều cần cải tiến…','Describe a strength and one area for improvement…')}/></label>:null}
       {selected.teacher_note?<p className="bml-note"><b>{tr(language,'Giáo viên','Teacher')}:</b> {selected.teacher_note}</p>:null}
       {selected.ttcm_note?<p className="bml-note"><b>TTCM:</b> {selected.ttcm_note}</p>:null}
       <div className="bml-review-actions">
        {canTeach?<button type="button" className="bml-outline" disabled={busyAny} onClick={grade}><Star size={17}/>{tr(language,'Lưu điểm rubric','Save rubric')}</button>:null}
        {canReview?<>
         <button type="button" className="bml-primary" disabled={busyAny} onClick={()=>decide('approve')}><CheckCircle2 size={17}/>{tr(language,'Admin phê duyệt','Admin approve')}</button>
         <button type="button" className="bml-outline" disabled={busyAny||!note.trim()} onClick={()=>decide('return')}><MessageCircle size={17}/>{tr(language,'Yêu cầu chỉnh sửa','Request changes')}</button>
         <button type="button" className="bml-danger" disabled={busyAny||!note.trim()} onClick={()=>decide('reject')}>{tr(language,'Từ chối','Reject')}</button>
        </>:null}
        {isAdmin&&!frozen&&!['approved_locked','published'].includes(selected.state)?<button type="button" className="bml-danger bml-archive-btn"
         disabled={busyAny} onClick={archiveReview}><Trash2 size={17}/>{tr(language,'Xóa bài nộp','Delete submission')}</button>:null}
        {canPublish?<button type="button" disabled={busyAny}
          className="bml-primary" onClick={()=>decide('publish')}><ShieldCheck size={17}/>{tr(language,'Admin công bố bản đã duyệt','Admin publishes approved version')}</button>:null}
       </div>
       <p className="bml-audit">{tr(language,'Mỗi quyết định được ghi nhận trên máy chủ; nội dung đã duyệt không thể âm thầm thay đổi.','All decisions are audited; approved snapshots cannot be silently modified.')}</p>
     </aside>
    </div>
   </section>:null}
 </div>;
}
