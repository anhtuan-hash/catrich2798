import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, ClipboardCopy, Download, ExternalLink, KeyRound, Lock, Plus, RefreshCw, ShieldOff, Trophy, UsersRound } from 'lucide-react';
import { supabase, supabaseAnonKey, supabaseUrl } from '../utils/supabase.js';
import './PhotoJudging.css';

const API = supabaseUrl + '/functions/v1/photo-judging';
const linkFor = token => window.location.origin + window.location.pathname + '#/slideshow?judge=' + token;
const csvEscape = v => '"' + String(v ?? '').replace(/"/g,'""') + '"';
export const weightedTotal = (criteria, rubric) => rubric.reduce((total,r)=>total+(Number(criteria?.[r.id])||0)*r.weight/10,0);

export async function photoJudgingRequest(payload, admin = false) {
  const headers = {'Content-Type':'application/json','apikey':supabaseAnonKey};
  if(admin) {
    const {data:{session},error} = await supabase.auth.getSession();
    if(error || !session?.access_token) throw new Error('Vui lòng đăng nhập tài khoản Admin để quản lý giám khảo.');
    headers.Authorization = 'Bearer ' + session.access_token;
  }
  if(!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase chưa được cấu hình.');
  const response = await fetch(API,{method:'POST',headers,body:JSON.stringify(payload),cache:'no-store'});
  const data=await response.json().catch(()=>({error:'Không đọc được phản hồi của máy chủ.'}));
  if(!response.ok || data.error) throw new Error(data.error || 'Máy chủ từ chối yêu cầu.');
  return data;
}
function downloadCSV(rows,album) {
  const csv='\uFEFF'+rows.map(row=>row.map(csvEscape).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url;a.download='BRIAN-Judging-'+(album.slug||'album')+'.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function JudgingAdmin({album, slides=[]}) {
  const [data,setData]=useState(null);
  const [name,setName]=useState('');
  const [rubric,setRubric]=useState([]);
  const [link,setLink]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const refresh=useCallback(async ()=>{
    const result=await photoJudgingRequest({action:'admin:load',albumId:album.id},true);
    setData(result);setRubric(result.session.rubric);
  },[album.id]);
  useEffect(()=>{
    let live=true;
    setData(null);setError('');setLink('');
    refresh().catch(e=>{if(live)setError(e.message);});
    return()=>{live=false;};
  },[refresh]);
  useEffect(()=>{
    if(!data || data.session.status==='closed') return;
    const interval=setInterval(()=>{refresh().catch(()=>{});},10000);
    return()=>clearInterval(interval);
  },[data?.session?.status,refresh]);
  async function run(action,values={}) {
    setBusy(true);setError('');setNotice('');
    try {
      const result=await photoJudgingRequest({action,albumId:album.id,...values},true);
      setData(result);setRubric(result.session.rubric);
      if(result.token){setLink(linkFor(result.token));setNotice('Đường liên kết mới chỉ hiển thị tại đây. Hãy sao chép để gửi cho giám khảo.');}
      else setNotice('Đã cập nhật dữ liệu thành công.');
      if(action==='admin:create')setName('');
    } catch(e){setError(e.message);} finally {setBusy(false);}
  }
  const session=data?.session;
  const judges=(data?.judges||[]).filter(j=>!j.revoked_at);
  const submitted=judges.filter(j=>!!j.submitted_at);
  const photoCount=session?.snapshot?.length||slides.length;
  const rows=useMemo(()=>{
    if(!data)return [];
    return slides.map((s,i)=>{
      const eligible=data.scores.filter(v=>v.slide_id===s.id && submitted.some(j=>j.id===v.invite_id));
      const mean=eligible.length?eligible.reduce((acc,x)=>acc+Number(x.total),0)/eligible.length:null;
      return {slide:s,position:i+1,mean,count:eligible.length,entries:eligible};
    }).sort((a,b)=>(b.mean??-1)-(a.mean??-1)||a.position-b.position);
  },[data,slides]);
  const ready=judges.length>0 && judges.every(j=>j.submitted_at);
  const weights=rubric.reduce((a,c)=>a+Number(c.weight||0),0);
  return <section className="bj-panel" aria-label="Hội đồng giám khảo">
    <div className="bj-head"><div><span className="bj-kicker">BRIAN · JUDGING MANAGEMENT</span><h3><Award size={23}/> Hội đồng giám khảo</h3><p>Liên kết riêng, chấm ẩn danh và tổng hợp điểm tự động.</p></div>
      <button type="button" className="bj-small" disabled={busy} onClick={()=>refresh().catch(e=>setError(e.message))}><RefreshCw size={16}/> Làm mới</button>
    </div>
    {error&&<div className="bj-error" role="alert">{error}</div>}
    {notice&&<div className="bj-success" role="status">{notice}</div>}
    {!session?<p className="bj-muted">Đang tải hoặc chưa thể kết nối dịch vụ giám khảo.</p>:<>
      <div className="bj-stats">
        <div><strong>{judges.length}</strong><span>Giám khảo hợp lệ</span></div>
        <div><strong>{submitted.length}/{judges.length}</strong><span>Phiếu đã nộp</span></div>
        <div><strong>{photoCount}</strong><span>Tác phẩm</span></div>
        <div><strong>{session.status==='draft'?'Chuẩn bị':session.status==='open'?'Đang chấm':'Đã khóa'}</strong><span>Trạng thái</span></div>
      </div>
      <div className="bj-box">
        <h4>Rubric chấm điểm · 100 điểm <span>{session.status==='draft'?'Có thể cấu hình':'Đã khóa'}</span></h4>
        {rubric.map((c,i)=><div className="bj-rubric-row" key={c.id}>
          <input aria-label={'Tên tiêu chí '+(i+1)} value={c.label} maxLength={80} disabled={session.status!=='draft'||busy} onChange={e=>setRubric(old=>old.map((r,j)=>j===i?{...r,label:e.target.value}:r))}/>
          <input aria-label={'Trọng số '+c.label} type="number" min="1" max="99" value={c.weight} disabled={session.status!=='draft'||busy} onChange={e=>setRubric(old=>old.map((r,j)=>j===i?{...r,weight:Number(e.target.value)}:r))}/>
          <span>%</span>
        </div>)}
        <div className="bj-inline">
          <span className={weights===100?'bj-ok':'bj-warn'}>Tổng trọng số: {weights}%</span>
          {session.status==='draft'&&<button disabled={busy||weights!==100||rubric.some(c=>!c.label.trim())} onClick={()=>run('admin:rubric',{rubric})}>Lưu rubric</button>}
        </div>
      </div>
      <div className="bj-box">
        <h4><UsersRound size={18}/> Danh sách giám khảo</h4>
        {session.status!=='closed'&&<div className="bj-add">
          <input value={name} maxLength={120} onChange={e=>setName(e.target.value)} placeholder="Nhập họ và tên giám khảo" aria-label="Họ và tên giám khảo"/>
          <button disabled={busy||name.trim().length<2} onClick={()=>run('admin:create',{fullName:name.trim()})}><Plus size={16}/> Tạo liên kết</button>
        </div>}
        {link&&<div className="bj-link"><label>Liên kết mới cấp — sao chép ngay (không lưu token gốc trên máy chủ)</label><input readOnly value={link} onFocus={e=>e.target.select()}/>
          <div className="bj-inline"><button onClick={()=>navigator.clipboard.writeText(link).then(()=>setNotice('Đã sao chép liên kết.')).catch(()=>setError('Không thể sao chép. Hãy chọn và sao chép thủ công.'))}><ClipboardCopy size={15}/> Sao chép</button><a href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Xem trang chấm</a></div>
        </div>}
        <div className="bj-judges">{data.judges.map(j=><div className="bj-judge" key={j.id}>
          <div className="bj-avatar"><UsersRound size={18}/></div>
          <div className="bj-judge-info"><strong>{j.full_name}</strong><small>{j.revoked_at?'Đã thu hồi':j.submitted_at?'Đã nộp phiếu':j.progress+' / '+photoCount+' tác phẩm'} · {j.last_seen_at?'Đã truy cập':'Chưa truy cập'}</small></div>
          {!j.revoked_at&&!j.submitted_at&&session.status!=='closed'&&<button disabled={busy} title="Cấp liên kết mới, vô hiệu hóa link cũ" onClick={()=>window.confirm('Cấp lại link và vô hiệu hóa link trước đó?')&&run('admin:reissue',{inviteId:j.id})}><KeyRound size={16}/><span>Cấp lại</span></button>}
          {!j.revoked_at&&session.status!=='closed'&&<button disabled={busy} title="Thu hồi quyền chấm" onClick={()=>window.confirm('Thu hồi quyền truy cập giám khảo này?')&&run('admin:revoke',{inviteId:j.id})}><ShieldOff size={16}/></button>}
        </div>)}</div>
      </div>
      <div className="bj-controls">
        {session.status==='draft'&&<button className="bj-primary" disabled={busy||!judges.length||!photoCount||weights!==100} onClick={()=>window.confirm('Mở chấm và khóa danh sách tác phẩm/rubric?')&&run('admin:open')}><Award size={18}/> Mở phiên chấm chính thức</button>}
        {session.status==='open'&&<button className="bj-primary" disabled={busy||!ready} title={!ready?'Cần tất cả giám khảo hợp lệ nộp phiếu':''} onClick={()=>window.confirm('Khóa vĩnh viễn phiên chấm và kết quả?')&&run('admin:close')}><Lock size={17}/> Khóa và chốt kết quả</button>}
        {session.status==='closed'&&<span className="bj-closed"><CheckCircle2 size={18}/> Đã khóa kết quả cuối cùng</span>}
      </div>
      <div className="bj-box">
        <div className="bj-head"><div><h4><Trophy size={19}/> Bảng xếp hạng {session.status==='closed'?'chính thức':'tạm thời'}</h4><p>Chỉ tính phiếu đã nộp. Giám khảo không thấy bảng này.</p></div>
          <button className="bj-small" disabled={!rows.length} onClick={()=>downloadCSV([['Hạng','Tác phẩm','Vị trí','Điểm TB','Phiếu đã nộp'],...rows.map((r,i)=>[i+1,r.slide.caption||'Tác phẩm '+r.position,r.position,r.mean===null?'':r.mean.toFixed(2),r.count])],album)}><Download size={16}/> Xuất CSV</button>
        </div>
        <div className="bj-table-wrap"><table><thead><tr><th>Hạng</th><th>Tác phẩm</th><th>Điểm TB</th><th>Giám khảo</th></tr></thead><tbody>
          {rows.map((r,i)=><tr key={r.slide.id}><td>{r.mean===null?'—':i+1}</td><td><strong>{r.slide.caption?.split('|')[0]||'Tác phẩm '+r.position}</strong><small># {r.position}</small></td><td>{r.mean===null?'Chưa có':r.mean.toFixed(2)}</td><td>{r.count}/{judges.length}</td></tr>)}
        </tbody></table></div>
        {submitted.length===0&&<p className="bj-muted">Chưa có phiếu hoàn tất. Điểm nháp không được dùng để xếp hạng.</p>}
        <button className="bj-small" disabled={!data.scores.length} onClick={()=>downloadCSV([['Giám khảo','Tác phẩm','Tiêu chí','Điểm','Tổng điểm','Nhận xét'],...data.scores.filter(s=>submitted.some(j=>j.id===s.invite_id)).flatMap(s=>rubric.map(c=>[submitted.find(j=>j.id===s.invite_id)?.full_name,slides.findIndex(x=>x.id===s.slide_id)+1,c.label,s.criteria?.[c.id],s.total,s.comment]))],album)}><Download size={16}/> Xuất chi tiết từng giám khảo</button>
      </div>
    </>}
  </section>;
}
