import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../utils/supabase.js';
import { cleanText } from './questModel.mjs';

const STATUSES={pending:'Chờ TTCM duyệt',approved:'Đã duyệt',rejected:'Bị từ chối'};
const EVENTS={submitted:'Gửi xét duyệt',approved:'TTCM phê duyệt',rejected:'TTCM từ chối',revoked:'Thu hồi tài nguyên'};
const safeError=(e)=>String(e?.message||'Không thể thực hiện tác vụ.').slice(0,300);

export default function DepartmentHub({currentUser,records,onReload,isDemo=false}){
  const [departments,setDepartments]=useState([]);
  const [memberships,setMemberships]=useState([]);
  const [department,setDepartment]=useState('');
  const [shares,setShares]=useState([]);
  const [audit,setAudit]=useState([]);
  const [kind,setKind]=useState('node');
  const [assetId,setAssetId]=useState('');
  const [notes,setNotes]=useState({});
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const enabled=!!currentUser?.id && !!supabase && !isDemo;
  const assets=useMemo(()=>[...records.nodes.map(n=>({id:n.id,kind:'node',title:n.title,owner_id:n.owner_id})),
  ...records.quests.filter(q=>q.status==='published').map(q=>({id:q.id,kind:'quest',title:q.title,owner_id:q.owner_id}))],[records.nodes,records.quests]);
  const ownAssets=assets.filter(a=>a.owner_id===currentUser?.id&&a.kind===kind);
  const names=useMemo(()=>new Map(assets.map(a=>[a.kind+':'+a.id,a.title])),[assets]);
  const visible=shares.filter(s=>s.department_id===department);
  const departmentHeads=new Set(memberships.filter(m=>m.role==='department_head'&&m.active).map(m=>m.department_id));
  const canReview=departmentHeads.has(department);
  const selectedDepartment=departments.find(d=>d.id===department);
  const load=useCallback(async()=>{
    if(!enabled)return;
    setError('');
    try{
      const m=await supabase.from('department_members').select('department_id,role,active').eq('user_id',currentUser.id).eq('active',true);
      if(m.error)throw m.error;
      const people=m.data||[], ids=people.map(x=>x.department_id);
      setMemberships(people);
      if(!ids.length){setDepartments([]);setShares([]);setAudit([]);setDepartment('');return;}
      const [d,s,a]=await Promise.all([
        supabase.from('departments').select('id,name,code').in('id',ids),
        supabase.from('qatl_department_shares').select('*').in('department_id',ids).order('created_at',{ascending:false}).limit(250),
        supabase.from('qatl_department_audit')
          .select('id,department_id,owner_id,actor_id,action,asset_kind,resource_title,review_note,occurred_at')
          .in('department_id',ids).order('occurred_at',{ascending:false}).limit(80)
      ]);
      if(d.error||s.error||a.error)throw(d.error||s.error||a.error);
      setDepartments(d.data||[]);setShares(s.data||[]);setAudit(a.data||[]);
      setDepartment(previous=>ids.includes(previous)?previous:ids[0]);
    }catch(e){setError(safeError(e));}
  },[currentUser?.id,enabled]);
  useEffect(()=>{void load();},[load]);
  const execute=async(action)=>{
    setBusy(true);setError('');setNotice('');
    try{const message=await action();setNotice(message);await load();}catch(e){setError(safeError(e));}
    finally{setBusy(false);}
  };
  const submitShare=()=>execute(async()=>{
    if(!department||!assetId)throw new Error('Chọn tổ chuyên môn và học liệu.');
    const asset=ownAssets.find(x=>x.id===assetId);
    if(!asset)throw new Error('Học liệu phải thuộc quyền sở hữu của bạn.');
    const payload={department_id:department,owner_id:currentUser.id,status:'pending',
      node_id:kind==='node'?assetId:null,quest_id:kind==='quest'?assetId:null};
    const r=await supabase.from('qatl_department_shares').insert(payload).select('id').single();
    if(r.error)throw r.error;
    setAssetId('');return 'Đã gửi học liệu để TTCM xét duyệt.';
  });
  const review=(share,status)=>execute(async()=>{
    if(!canReview||share.department_id!==department)throw new Error('Chỉ TTCM của tổ được duyệt.');
    const payload={status,review_note:cleanText(notes[share.id]||'',500),
      reviewed_by:currentUser.id,reviewed_at:new Date().toISOString()};
    const r=await supabase.from('qatl_department_shares').update(payload).eq('id',share.id).eq('status','pending').select('id').single();
    if(r.error)throw r.error;
    return status==='approved'?'Đã phê duyệt và mở quyền sử dụng cho tổ.':'Đã từ chối yêu cầu.';
  });
  const withdraw=share=>execute(async()=>{
    if(share.owner_id!==currentUser.id)throw new Error('Không có quyền thu hồi.');
    const r=await supabase.from('qatl_department_shares').delete().eq('id',share.id).eq('owner_id',currentUser.id);
    if(r.error)throw r.error;
    return 'Đã thu hồi tài nguyên khỏi kho chia sẻ.';
  });
  const fork=share=>execute(async()=>{
    if(share.status!=='approved')throw new Error('Chỉ được sao chép học liệu đã duyệt.');
    const r=await supabase.rpc('qatl_department_fork',{p_share_id:share.id});
    if(r.error)throw r.error;
    await onReload?.();
    return (r.data?.kind==='quest'?'Quest':'Node')+' đã được sao chép thành bản nháp của bạn.';
  });
  const titleOf=s=>cleanText(s.snapshot?.title||names.get((s.node_id?'node:':'quest:')+(s.node_id||s.quest_id))||'Học liệu được chia sẻ',150);
  const visibleAudit=audit.filter(e=>e.department_id===department);
  if(isDemo)return <section className="qa-panel"><header className="qa-panel-head"><div><h2>Department Hub</h2><p>Quy trình chia sẻ và TTCM kiểm duyệt</p></div></header><p className="qa-info qa-warning">Bản demo không gửi yêu cầu phê duyệt hoặc thay đổi học liệu thật. Kết nối migration Department Hub để dùng tính năng này.</p></section>;
  return <div className="qa-dept-layout">
    <section className="qa-panel">
      <header className="qa-panel-head"><div><h2>Department Hub</h2><p>Chia sẻ, xét duyệt và tái sử dụng học liệu giữa giáo viên trong tổ.</p></div><span className="qa-stat">{visible.length} tài nguyên</span></header>
      {error&&<p className="qa-info qa-error" role="alert">{error}</p>}
      {notice&&<p className="qa-info qa-success">{notice}</p>}
      {!enabled?<p className="qa-info qa-warning">Đăng nhập BRIAN để sử dụng.</p>
        :!departments.length?<p className="qa-info qa-warning">Tài khoản chưa được gán tổ chuyên môn đang hoạt động, hoặc migration chưa được áp dụng. Liên hệ TTCM để cấp quyền.</p>
        :<>
          <div className="qa-form">
            <label>Tổ chuyên môn<select value={department} onChange={e=>setDepartment(e.target.value)}>
              {departments.map(d=><option key={d.id} value={d.id}>{d.name||d.code||'Tổ chuyên môn'}</option>)}
            </select></label>
          </div>
          <div className="qa-dept-metrics">
            <div><strong>{visible.filter(s=>s.status==='approved').length}</strong><span>Đã duyệt</span></div>
            <div><strong>{visible.filter(s=>s.status==='pending').length}</strong><span>Chờ duyệt</span></div>
            <div><strong>{canReview?'TTCM':'GV'}</strong><span>Vai trò của bạn</span></div>
          </div>
          <h3>Gửi học liệu xin phê duyệt</h3>
          <form className="qa-form" onSubmit={e=>{e.preventDefault();void submitShare();}}>
            <label>Loại học liệu<select value={kind} onChange={e=>{setKind(e.target.value);setAssetId('');}}>
              <option value="node">Node kiến thức</option><option value="quest">Quest đã xuất bản</option>
            </select></label>
            <label>Học liệu của bạn<select value={assetId} onChange={e=>setAssetId(e.target.value)}>
              <option value="">Chọn học liệu…</option>{ownAssets.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}
            </select></label>
            <button className="qa-primary" disabled={busy||!assetId||!department} type="submit">Gửi đến {selectedDepartment?.name||'TTCM'} để duyệt →</button>
          </form>
          <button className="qa-dept-refresh" onClick={()=>void load()} disabled={busy}>↻ Làm mới danh sách</button>
        </>}
    </section>
    <section className="qa-panel">
      <header className="qa-panel-head"><div><h2>Thư viện của tổ</h2><p>Chỉ học liệu đã duyệt mới được chia sẻ cho các thành viên.</p></div></header>
      {!visible.length?<div className="qa-empty">Chưa có tài nguyên chia sẻ trong tổ.</div>
      :<div className="qa-share-list">{visible.map(s=><article className="qa-share-item" key={s.id}>
        <div className="qa-share-top"><span className={'qa-share-badge qa-share-'+s.status}>{STATUSES[s.status]||s.status}</span><span>{s.node_id?'◈ Knowledge node':'◇ Escape Quest'}</span></div>
        <h3>{titleOf(s)}</h3>
        {s.review_note&&<p className="qa-review-note">Ghi chú TTCM: {s.review_note}</p>}
        <div className="qa-share-actions">
          {s.status==='approved'&&s.owner_id!==currentUser?.id&&<button disabled={busy} className="qa-primary" onClick={()=>void fork(s)}>Sao chép vào thư viện cá nhân</button>}
          {s.status==='pending'&&canReview&&<div className="qa-review-form">
            <input aria-label={'Ghi chú duyệt '+titleOf(s)} maxLength="500" value={notes[s.id]||''} placeholder="Ghi chú TTCM (tùy chọn)" onChange={e=>setNotes(old=>({...old,[s.id]:e.target.value}))}/>
            <button disabled={busy} className="qa-primary" onClick={()=>void review(s,'approved')}>✓ Duyệt</button>
            <button disabled={busy} onClick={()=>void review(s,'rejected')}>Từ chối</button>
          </div>}
          {s.owner_id===currentUser?.id&&<button disabled={busy} onClick={()=>void withdraw(s)}>Thu hồi chia sẻ</button>}
        </div>
      </article>)}</div>}
      <div className="qa-audit-list" aria-label="Lịch sử hoạt động tổ chuyên môn">
        <h3>Lịch sử xét duyệt</h3>
        <p className="qa-dept-caption">Các sự kiện được ghi tại database; thu hồi chia sẻ không làm xóa lịch sử.</p>
        {!visibleAudit.length ? <p className="qa-info">Chưa có hoạt động nào được ghi nhận.</p>
        : visibleAudit.slice(0,30).map(event=><div className="qa-audit-item" key={event.id}>
            <span className={'qa-audit-icon qa-audit-'+event.action}>{event.action==='approved'?'✓':event.action==='rejected'?'×':event.action==='revoked'?'↩':'+'}</span>
            <div><strong>{EVENTS[event.action]||event.action}</strong>
              <p>{event.resource_title} · {event.asset_kind==='quest'?'Quest':'Kiến thức'}</p>
              {event.review_note&&<small>{event.review_note}</small>}</div>
            <time dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString('vi-VN')}</time>
          </div>)}
      </div>
    </section>
  </div>;
}
