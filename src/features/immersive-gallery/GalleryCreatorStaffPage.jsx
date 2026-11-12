import React,{useCallback,useEffect,useState,Suspense,lazy} from 'react';
import {supabase} from '../../utils/supabase.js';
import './creatorPass.css';
const GalleryCanvas=lazy(()=>import('./GalleryCanvasR3F.jsx'));
const fmt=x=>x?new Date(x).toLocaleString('vi-VN'):'—';
const ROLE={issued:'Chưa mở',editing:'Đang sáng tác',submitted:'Giáo viên duyệt',ttcm_review:'Chờ TTCM',
 changes_requested:'Cần chỉnh sửa',approved_locked:'TTCM đã duyệt',rejected:'Từ chối',published:'Đã xuất bản'};
async function staffApi(operation,body){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)throw new Error('Vui lòng đăng nhập Brian bằng tài khoản giáo viên.');
 const res=await fetch('/api/gallery-staff?operation='+encodeURIComponent(operation),{
  method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
  headers:{Authorization:'Bearer '+session.access_token,...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const data=await res.json().catch(()=>({error:'Máy chủ không phản hồi.'}));
 if(!res.ok)throw new Error(data.error||'Thao tác không thành công.');
 return data;
}
const joinUrl=handle=>window.location.origin+window.location.pathname+'#/gallery-create?invite='+encodeURIComponent(handle);
function OneTimeCodes({invitations,onClose}){
 const [qr,setQr]=useState({});
 useEffect(()=>{let active=true;import('qrcode').then(({default:QRCode})=>Promise.all(invitations.map(async x=>[x.groupId,await QRCode.toDataURL(joinUrl(x.handle),{margin:1,width:192})])))
  .then(items=>{if(active)setQr(Object.fromEntries(items));})).catch(()=>{});return()=>{active=false;};},[invitations]);
 return <section className="gcp-note"><div className="gcp-room-head"><div><small>ONE-TIME DELIVERY</small><h2>Mã truy cập dành riêng cho từng nhóm</h2></div><button onClick={onClose}>Đóng</button></div>
  <p>Chỉ hiển thị mã bí mật một lần. Hãy lưu vào phiếu giao nhóm an toàn. QR chỉ chứa đường dẫn/mã mời, không chứa mã bí mật.</p>
  <div className="gcp-exhibits">{invitations.map(x=><article className="gcp-exhibit-card" key={x.groupId}>
    <h3>{x.label}</h3>{qr[x.groupId]?<img width="170" height="170" alt={'QR nhóm '+x.label} src={qr[x.groupId]}/>:null}
    <p><b>Mã mời:</b> <code>{x.handle}</code></p><p><b>Mã bí mật:</b> <code>{x.groupSecret}</code></p>
    <button onClick={()=>navigator.clipboard?.writeText(joinUrl(x.handle)+'\nMã bí mật: '+x.groupSecret)}>Sao chép phiếu nhóm</button>
   </article>)}</div>
  <button onClick={()=>window.print()}>In phiếu giao nhóm</button>
 </section>;
}
export default function GalleryCreatorStaffPage({onBack}){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [newAssignment,setNewAssignment]=useState({title:'',classScope:'',brief:'',reviewerId:'',groupCount:4,
  deadlineAt:new Date(Date.now()+7*86400000).toISOString().slice(0,16)});
 const [grant,setGrant]=useState({reviewerId:'',canPublish:true});
 const [invitations,setInvitations]=useState([]),[reviewNote,setReviewNote]=useState(''),[selectedReview,setSelectedReview]=useState(null),[previewRoom,setPreviewRoom]=useState(0);
 const refresh=useCallback(async()=>{setData(await staffApi('dashboard'));},[]);
 useEffect(()=>{refresh().catch(e=>setError(e.message));},[refresh]);
 const act=async(operation,payload)=>{
  setBusy(true);setError('');setNotice('');
  try{
   const result=await staffApi(operation,payload);
   if(result.invitations)setInvitations(result.invitations);
   if(result.groupSecret)setInvitations([{groupId:result.groupId,label:'Mã mới',handle:result.handle,groupSecret:result.groupSecret}]);
   setNotice('Thao tác đã được lưu trên máy chủ.');
   await refresh();
   if(selectedReview){setSelectedReview(null);setReviewNote('');}
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const groupsFor=a=>data?.groups.filter(g=>g.assignment_id===a.id)||[];
 const latestReviewFor=g=>(data?.reviews||[]).find(r=>r.group_id===g.id);
 const selected=data?.reviews.find(r=>r.id===selectedReview);
 const selectedGroup=data?.groups.find(g=>g.id===selected?.group_id);
 const selectedAssignment=data?.assignments.find(a=>a.id===selectedGroup?.assignment_id);
 const isAdmin=data?.profile.role==='admin';
 const mayReview=selectedAssignment?.reviewer_id===data?.profile.id;
 const mayTeach=selectedAssignment?.created_by===data?.profile.id;
 const canAct=(key)=>!busy&&selected&&Boolean(key);
 const reviewers=data?.reviewers||[];
 return <section className="gcp-root gcp-staff">
  <header className="gcp-topbar"><div><small>BRIAN GALLERY · STAFF</small><h1>Giao nhiệm vụ & Duyệt triển lãm</h1><p>Giáo viên sơ duyệt · TTCM duyệt cuối · Admin xuất bản có kiểm soát</p></div>
   <div className="gcp-actions"><button type="button" onClick={onBack}>← Về Gallery</button><button type="button" onClick={refresh}>Làm mới</button></div></header>
  {error?<p role="alert" className="gcp-error">{error}</p>:null}{notice?<div role="status" className="gcp-note">{notice}</div>:null}
  {!data?<div className="gcp-note">Đang đọc quyền hạn từ máy chủ…</div>:<>
   <div className="gcp-brief"><b>Quyền quản lý</b><p>Tài khoản: {data.profile.role} · Trường: {data.profile.school} · Creator Pass: {data.creatorSettings.enabled?'Đang mở':'Đang khóa'}</p></div>
   {isAdmin?<section className="gcp-editor-side gcp-note"><h2>Ủy quyền TTCM và cờ mở Creator Pass</h2>
    <p>Cấp quyền riêng cho một tài khoản Brian đã có tại cùng trường. Không tạo tài khoản học sinh.</p>
    <label>Chọn cán bộ TTCM<select value={grant.reviewerId} onChange={e=>setGrant({...grant,reviewerId:e.target.value})}>
      <option value="">Chọn tài khoản</option>{(data.reviewerCandidates||[]).filter(p=>p.id!==data.profile.id).map(p=><option key={p.id} value={p.id}>{p.full_name||p.role} · {p.role}</option>)}</select></label>
    <label><input type="checkbox" checked={grant.canPublish} onChange={e=>setGrant({...grant,canPublish:e.target.checked})}/> Cho phép phê duyệt cuối (quyền xuất bản thực tế vẫn thuộc Admin của Gallery R1)</label>
    <button disabled={busy||!grant.reviewerId} onClick={()=>act('grant-reviewer',grant)}>Cấp quyền TTCM</button>
    <div className="gcp-actions" style={{marginTop:15}}>
     <button disabled={busy} onClick={()=>act('feature-settings',{enabled:!data.creatorSettings.enabled})}>{data.creatorSettings.enabled?'Tắt Creator Pass':'Bật Creator Pass'}</button>
     <small>Bật chỉ sau khi kiểm thử API, RLS và luồng học sinh trên môi trường phù hợp.</small>
    </div>
   </section>:null}
   <section className="gcp-editor-side gcp-note">
    <h2>01 · Giao nhiệm vụ triển lãm mới</h2>
    {!reviewers.length?<p className="gcp-error">Chưa có tài khoản TTCM được cấp quyền cùng trường. Admin cần ủy quyền trước.</p>:null}
    <form onSubmit={e=>{e.preventDefault();act('create-assignment',{...newAssignment,deadlineAt:new Date(newAssignment.deadlineAt).toISOString()});}}>
     <div className="gcp-exhibits"><label>Chủ đề<input required maxLength={140} value={newAssignment.title} onChange={e=>setNewAssignment({...newAssignment,title:e.target.value})} placeholder="Global Warming · Grade 11"/></label>
      <label>Lớp<input required maxLength={120} value={newAssignment.classScope} onChange={e=>setNewAssignment({...newAssignment,classScope:e.target.value})} placeholder="11.2"/></label>
      <label>Số nhóm (1–12)<input required type="number" min="1" max="12" value={newAssignment.groupCount} onChange={e=>setNewAssignment({...newAssignment,groupCount:Number(e.target.value)})}/></label>
      <label>Hạn nộp<input required type="datetime-local" value={newAssignment.deadlineAt} onChange={e=>setNewAssignment({...newAssignment,deadlineAt:e.target.value})}/></label>
      <label>TTCM duyệt<select required value={newAssignment.reviewerId} onChange={e=>setNewAssignment({...newAssignment,reviewerId:e.target.value})}><option value="">Chọn người duyệt</option>
        {reviewers.filter(r=>r.can_publish).map(r=><option key={r.reviewer_id} value={r.reviewer_id}>{(data.reviewerCandidates||[]).find(p=>p.id===r.reviewer_id)?.full_name||r.reviewer_id}</option>)}
      </select></label></div>
     <label>Hướng dẫn / tiêu chí<textarea rows={3} maxLength={5000} value={newAssignment.brief} onChange={e=>setNewAssignment({...newAssignment,brief:e.target.value})}/></label>
     <button disabled={busy||!newAssignment.reviewerId||!data.creatorSettings.enabled} className="gcp-primary" type="submit">Tạo nhiệm vụ và mã nhóm</button>
    </form>
   </section>
   {invitations.length?<OneTimeCodes invitations={invitations} onClose={()=>setInvitations([])}/>:null}
   <section className="gcp-note"><h2>02 · Nhiệm vụ đang quản lý</h2>
    {!data.assignments.length?<p>Chưa có nhiệm vụ.</p>:null}
    {data.assignments.map(a=><article key={a.id} className="gcp-exhibit-card" style={{marginBottom:12}}>
      <h3>{a.title} <small>· {a.class_scope} · Hạn {fmt(a.deadline_at)}</small></h3>
      <div className="gcp-exhibits">{groupsFor(a).map(g=>{
       const rev=latestReviewFor(g);return <div className="gcp-exhibit-card" key={g.id}>
        <b>{g.label}</b> <small>{ROLE[g.state]||g.state}</small><p>{rev?'Bản đã nộp v'+rev.version:'Chưa nộp'}</p>
        {rev?<button type="button" onClick={()=>{setSelectedReview(rev.id);setPreviewRoom(0);setReviewNote('');}}>Xem và duyệt</button>:null}
        {a.created_by===data.profile.id&&['issued','editing','changes_requested'].includes(g.state)?
         <button disabled={busy} type="button" onClick={()=>act('rotate-invite',{groupId:g.id})}>Cấp lại mã nhóm</button>:null}
       </div>;})}</div>
     </article>)}
   </section>
   {selected?<section className="gcp-note" aria-label="Hồ sơ duyệt">
    <div className="gcp-room-head"><div><small>REVIEW DESK · VERSION {selected.version}</small><h2>{selected.snapshot.title}</h2>
      <p>{selectedGroup?.label} · {selectedAssignment?.class_scope} · {ROLE[selected.state]||selected.state}</p>
      <small>Snapshot SHA-256: {selected.snapshot_hash}</small></div><button onClick={()=>setSelectedReview(null)}>Đóng hồ sơ</button></div>
    <div className="gcp-exhibits">{selected.snapshot.rooms?.map((room,i)=><button type="button" key={i}
      className={previewRoom===i?'active':''} onClick={()=>setPreviewRoom(i)}>{room.title}</button>)}</div>
    {selected.snapshot.rooms?.[previewRoom]?<div className="gcp-editor">
      <section className="gcp-editor-side"><h3>Checklist TTCM</h3>
       <ul><li>Đúng chủ đề tiếng Anh và chính xác ngôn ngữ</li><li>Ảnh/âm thanh và nguồn hợp lệ</li><li>Không lộ dữ liệu học sinh</li><li>Đầy đủ mô tả, trải nghiệm 2D/3D</li></ul>
       <p>Giáo viên: {selected.teacher_note||'Chưa ghi nhận xét'}</p>
       <p>TTCM: {selected.ttcm_note||'Chưa có quyết định'}</p>
       <label>Nhận xét<textarea maxLength={2000} rows={4} value={reviewNote} onChange={e=>setReviewNote(e.target.value)}/></label>
       <div className="gcp-add-room">
        {mayTeach&&selected.state==='submitted'?<>
         <button disabled={!canAct(true)} onClick={()=>act('decision',{reviewId:selected.id,action:'teacher_forward',note:reviewNote})}>Chuyển TTCM</button>
         <button disabled={!canAct(true)} onClick={()=>act('decision',{reviewId:selected.id,action:'teacher_return',note:reviewNote})}>Yêu cầu sửa</button></>:null}
        {mayReview&&selected.state==='ttcm_review'?<>
         <button disabled={!canAct(true)} onClick={()=>act('decision',{reviewId:selected.id,action:'ttcm_approve',note:reviewNote})}>TTCM phê duyệt</button>
         <button disabled={!canAct(true)} onClick={()=>act('decision',{reviewId:selected.id,action:'ttcm_return',note:reviewNote})}>Trả lại nhóm</button>
         <button disabled={!canAct(true)} onClick={()=>act('decision',{reviewId:selected.id,action:'ttcm_reject',note:reviewNote})}>Từ chối</button></>:null}
        {isAdmin&&selected.state==='approved_locked'?
         <button className="gcp-primary" disabled={busy} onClick={()=>act('publish',{reviewId:selected.id})}>Admin xuất bản bản đã duyệt</button>:null}
       </div>
      </section>
      <section className="gcp-workspace">
       <Suspense fallback={<p>Đang dựng bản xem trước 3D…</p>}>
        <div className="gcp-preview"><GalleryCanvas template={selected.snapshot.rooms[previewRoom].template_key}
           exhibits={selected.snapshot.rooms[previewRoom].exhibits.map((e,i)=>({...e,id:'review-'+i,status:'published'}))}
           language="vi" quality="balanced"/></div>
       </Suspense>
       <h3>Danh sách hiện vật (chế độ 2D)</h3>
       {selected.snapshot.rooms[previewRoom].exhibits.map((e,i)=><p key={i}><b>{e.title}</b> · {e.kind}<span style={{display:'block'}}>{e.description}</span></p>)}
      </section>
    </div>:null}
   </section>:null}
  </>}
 </section>;
}
