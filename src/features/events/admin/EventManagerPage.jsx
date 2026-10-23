import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Search, Eye, Save, Send, UploadCloud, X, Users, Clock3, CheckCircle2, PauseCircle, Image as ImageIcon, BarChart3, ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { isAdminRole } from '../../../utils/roles.js';
import {
  listManagedEvents, listEventProfiles, listRecipientIds, saveEventDraft,
  uploadEventPoster, getEventPosterUrl, publishEvent, reannounceEvent, changeEventStatus,
  eventAnalytics, toLocalDateTime, HALLOWEEN_TEMPLATE, EVENT_CATEGORIES
} from '../services/eventService.js';
import './EventManager.css';

const BLANK = Object.freeze({
  title:'',category:'Sinh hoạt chuyên đề',summary:'',description:'',organizer:'Tổ Tiếng Anh THPT',
  school_year:'2026-2027',event_start_at:'',event_end_at:'',
  display_start_at:'',display_end_at:'',venue_type:'online',venue_name:'',
  meeting_url:'',meeting_code:'',priority:'normal',frequency:'once'
});
const FIELDS=['title','category','summary','description','organizer','school_year','event_start_at','event_end_at','display_start_at','display_end_at','venue_type','venue_name','meeting_url','meeting_code','priority','frequency'];
const formatTime=(s)=>s?new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}).format(new Date(s)):'—';
function Input({title,value,onChange,type='text',required=false,children,placeholder=''}) {
  return <label className="bea-field"><span>{title}{required?' *':''}</span>
    {children? <select value={value??''} onChange={e=>onChange(e.target.value)}>{children}</select>
    :<input type={type} required={required} value={value??''} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>}
  </label>;
}
export default function EventManagerPage({currentUser}) {
  const allowed=isAdminRole(currentUser?.role);
  const [events,setEvents]=useState([]);
  const [profiles,setProfiles]=useState([]);
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState({...BLANK});
  const [recipientIds,setRecipientIds]=useState([]);
  const [query,setQuery]=useState('');
  const [poster,setPoster]=useState(null);
  const [posterUrl,setPosterUrl]=useState('');
  const [screen,setScreen]=useState('list');
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [analytics,setAnalytics]=useState(null);
  const [confirmPublish,setConfirmPublish]=useState(false);
  const [previewMode,setPreviewMode]=useState('desktop');
  const load=useCallback(async()=>{
    if(!allowed)return;
    setLoading(true);
    try{const [items,people]=await Promise.all([listManagedEvents(),listEventProfiles()]);setEvents(items);setProfiles(people);}
    catch(e){setError(e.message);}
    finally{setLoading(false);}
  },[allowed]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    if(!poster){return undefined;}
    const url=URL.createObjectURL(poster);
    setPosterUrl(url);
    return ()=>URL.revokeObjectURL(url);
  },[poster]);
  const openEvent=async(item)=>{
    setError('');setNotice('');setPoster(null);setSelected(item||null);
    const next={...BLANK};
    for(const key of FIELDS){
      const raw=item?.[key];
      next[key]=key.endsWith('_at')?toLocalDateTime(raw):raw??BLANK[key];
    }
    setForm(next);
    setRecipientIds([]);
    setPosterUrl('');
    setScreen('edit');
    if(item?.id){
      const id=item.id;
      try {
        const [ids,url]=await Promise.all([listRecipientIds(id),item.poster_path?getEventPosterUrl(item.poster_path):Promise.resolve('')]);
        setRecipientIds(ids);setPosterUrl(url);
      }catch(e){setError(e.message);}
    }
  };
  const setField=(name,value)=>setForm(f=>({...f,[name]:value}));
  const toggleRecipient=(id)=>setRecipientIds(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);
  const save=async()=>{
    if(saving)return null;
    setError('');setNotice('');setSaving(true);
    try{
      const record=await saveEventDraft(form,selected?.id||null);
      let latest=record;
      if(poster){const path=await uploadEventPoster(record.id,poster);latest={...record,poster_path:path};setPoster(null);}
      setSelected(latest);
      setNotice('Đã lưu sự kiện. Chưa gửi thông báo cho giáo viên.');
      await load();
      if(latest.poster_path) getEventPosterUrl(latest.poster_path).then(setPosterUrl).catch(()=>{});
      return latest;
    }catch(e){setError(e.message);return null;}
    finally{setSaving(false);}
  };
  const publish=async()=>{
    if(saving||!selected?.id)return;
    setSaving(true);setError('');setNotice('');
    try{
      const out=await publishEvent(selected.id,recipientIds);
      setSelected(out);setConfirmPublish(false);setNotice('Đã xuất bản thành công. Giáo viên được chọn sẽ thấy popup khi truy cập Dashboard trong thời gian hiển thị.');
      await load();
    }catch(e){setError(e.message);}
    finally{setSaving(false);}
  };
  const reannounce=async(item)=>{
    if(!window.confirm('Gửi lại thông báo này tới người nhận? Giáo viên đã xem sẽ thấy lại một lần nữa. Chỉ sử dụng khi có thay đổi quan trọng.'))return;
    setSaving(true);setError('');setNotice('');
    try{
      const updated=await reannounceEvent(item.id);
      setSelected(updated);setNotice('Đã kích hoạt thông báo lại: phiên bản '+updated.version+'.');
      await load();
    }catch(e){setError(e.message);}
    finally{setSaving(false);}
  };
  const cancel=async(item)=>{
    if(!window.confirm('Hủy thông báo "'+item.title+'"? Giáo viên sẽ không tiếp tục nhận popup.'))return;
    setSaving(true);setError('');
    try{await changeEventStatus(item.id,'cancelled');setNotice('Đã hủy thông báo.');await load();}
    catch(e){setError(e.message);}finally{setSaving(false);}
  };
  const openAnalytics=async(item)=>{
    setSelected(item);setScreen('analytics');setAnalytics(null);setError('');
    try{setAnalytics(await eventAnalytics(item.id));}catch(e){setError(e.message);}
  };
  const displayEvents=useMemo(()=>events.filter(x=>(x.title+' '+x.category).toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))),[events,query]);
  const chosen=profiles.filter(p=>recipientIds.includes(p.id));
  if(!allowed)return null;
  return <section className="bea-admin" id="event-manager-admin" aria-label="Quản lý sự kiện">
    <header className="bea-head">
      <div className="bea-brand"><span className="bea-brand-icon"><CalendarDays size={22}/></span><div>
        <span className="bea-eyebrow">BRIAN ENGLISH · EVENT CENTER</span><h2>Quản lý sự kiện</h2><p>Đăng thư mời và thông báo cho giáo viên ngay trên Dashboard.</p>
      </div></div>
      <button type="button" className="bea-primary" onClick={()=>openEvent(null)}><Plus size={17}/> Tạo sự kiện</button>
    </header>
    {error&&<div className="bea-alert is-error" role="alert">{error}<button type="button" onClick={()=>setError('')} aria-label="Đóng thông báo lỗi"><X size={15}/></button></div>}
    {notice&&<div className="bea-alert is-success" role="status"><CheckCircle2 size={17}/>{notice}</div>}
    {screen==='list'? <>
      <div className="bea-metrics">
        {[['Tổng sự kiện',events.length,'all'],['Đang thông báo',events.filter(x=>x.status==='published'&&Date.parse(x.display_start_at)<=Date.now()&&Date.parse(x.display_end_at)>Date.now()).length,'live'],['Bản nháp',events.filter(x=>x.status==='draft').length,'draft'],['Sắp diễn ra',events.filter(x=>Date.parse(x.event_start_at)>Date.now()&&x.status==='published').length,'soon']].map(([label,value,tone])=><div className={'bea-metric is-'+tone} key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </div>
      <div className="bea-list-top"><h3>Danh sách sự kiện</h3><label className="bea-search"><Search size={16}/><input aria-label="Tìm kiếm sự kiện" placeholder="Tìm tên sự kiện..." value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
      {loading?<p className="bea-loading">Đang tải sự kiện…</p>:displayEvents.length===0?<div className="bea-empty"><CalendarDays size={30}/><strong>Chưa có sự kiện phù hợp</strong><p>Hãy tạo sự kiện đầu tiên hoặc dùng bản nháp Halloween.</p><button onClick={()=>{openEvent(null);setForm({...HALLOWEEN_TEMPLATE});}}>Tạo thư mời Halloween</button></div>:
      <div className="bea-list">{displayEvents.map(item=><article className="bea-event-row" key={item.id}>
        <div className="bea-event-thumb"><CalendarDays size={22}/></div>
        <div className="bea-event-text"><h4>{item.title}</h4><p>{item.category} · {formatTime(item.event_start_at)}</p><span className={'bea-status is-'+item.status}>{item.status==='draft'?'Bản nháp':item.status==='published'?'Đã xuất bản':item.status==='cancelled'?'Đã hủy':'Lưu trữ'}</span></div>
        <div className="bea-row-actions">
          <button onClick={()=>openEvent(item)}><Eye size={15}/> Xem / Sửa</button>
          <button onClick={()=>openAnalytics(item)}><BarChart3 size={15}/> Báo cáo</button>
          {item.status==='published'&&<><button disabled={saving} onClick={()=>reannounce(item)}><Send size={15}/> Thông báo lại</button><button className="bea-danger" onClick={()=>cancel(item)}><PauseCircle size={15}/> Hủy</button></>}
        </div></article>)}</div>}
    </>:null}
    {screen==='edit'?<>
      <button className="bea-back" type="button" onClick={()=>{setScreen('list');setPoster(null);setNotice('');}}><ArrowLeft size={16}/> Danh sách sự kiện</button>
      <div className="bea-editor">
        <div className="bea-editor-form">
          <div className="bea-section-label"><span>01</span><h3>Thông tin sự kiện</h3></div>
          <Input title="Tên sự kiện" required value={form.title} onChange={v=>setField('title',v)}/>
          <div className="bea-two">
            <Input title="Loại sự kiện" value={form.category} onChange={v=>setField('category',v)}>{EVENT_CATEGORIES.map(x=><option key={x}>{x}</option>)}</Input>
            <Input title="Năm học" value={form.school_year} onChange={v=>setField('school_year',v)}/>
          </div>
          <Input title="Đơn vị tổ chức" value={form.organizer} onChange={v=>setField('organizer',v)}/>
          <label className="bea-field"><span>Mô tả ngắn</span><textarea rows="3" maxLength="500" value={form.summary} onChange={e=>setField('summary',e.target.value)}/></label>
          <label className="bea-field"><span>Nội dung chi tiết</span><textarea rows="4" value={form.description} onChange={e=>setField('description',e.target.value)}/></label>
          <div className="bea-section-label"><span>02</span><h3>Thời gian & hình thức</h3></div>
          <div className="bea-two">
            <Input required title="Sự kiện bắt đầu" type="datetime-local" value={form.event_start_at} onChange={v=>setField('event_start_at',v)}/>
            <Input required title="Sự kiện kết thúc" type="datetime-local" value={form.event_end_at} onChange={v=>setField('event_end_at',v)}/>
            <Input required title="Bắt đầu thông báo" type="datetime-local" value={form.display_start_at} onChange={v=>setField('display_start_at',v)}/>
            <Input required title="Ngừng thông báo" type="datetime-local" value={form.display_end_at} onChange={v=>setField('display_end_at',v)}/>
            <Input title="Hình thức" value={form.venue_type} onChange={v=>setField('venue_type',v)}><option value="online">Trực tuyến</option><option value="offline">Trực tiếp</option><option value="hybrid">Kết hợp</option></Input>
            <Input title="Địa điểm / nền tảng" value={form.venue_name} onChange={v=>setField('venue_name',v)}/>
            <Input title="Liên kết Google Meet" type="url" value={form.meeting_url} onChange={v=>setField('meeting_url',v)} placeholder="https://meet.google.com/..."/>
            <Input title="Mã phòng họp" value={form.meeting_code} onChange={v=>setField('meeting_code',v)}/>
            <Input title="Ưu tiên" value={form.priority} onChange={v=>setField('priority',v)}><option value="normal">Thông thường</option><option value="important">Quan trọng</option><option value="urgent">Khẩn</option></Input>
            <Input title="Tần suất" value={form.frequency} onChange={v=>setField('frequency',v)}><option value="once">Một lần / sự kiện</option><option value="daily">Hằng ngày đến khi xác nhận</option><option value="until_ack">Mỗi lần vào Dashboard đến khi xác nhận</option></Input>
          </div>
          <div className="bea-section-label"><span>03</span><h3>Poster & người nhận</h3></div>
          <label className="bea-file"><UploadCloud size={21}/><span>{poster?.name||'Tải poster JPG, PNG, WebP (tối đa 10MB)'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPoster(e.target.files?.[0]||null)}/></label>
          <p className="bea-help">Lưu bản nháp để tải poster lên Supabase. Poster gốc sẽ xuất hiện trong popup của giáo viên.</p>
          <div className="bea-audience-head"><strong><Users size={16}/> Danh sách giáo viên</strong><span>{recipientIds.length} được chọn</span></div>
          <div className="bea-audience-toolbar">
            <button type="button" onClick={()=>setRecipientIds(profiles.filter(p=>p.role==='teacher'||p.role==='department_head').map(x=>x.id))}>Chọn tất cả giáo viên</button>
            <button type="button" onClick={()=>setRecipientIds([])}>Bỏ chọn</button>
          </div>
          <p className="bea-help">Chọn cụ thể GVCN khối 11 theo danh sách phân công đã xác minh. Hệ thống không suy đoán khối lớp từ tên giáo viên.</p>
          <div className="bea-audience-list">{profiles.map(p=><label key={p.id}><input type="checkbox" checked={recipientIds.includes(p.id)} onChange={()=>toggleRecipient(p.id)}/><span><strong>{p.full_name||p.email}</strong><small>{p.job_title||p.role}</small></span></label>)}</div>
          <div className="bea-form-actions">
            <button type="button" className="bea-secondary" onClick={()=>{setForm({...HALLOWEEN_TEMPLATE});setError('');}}>Điền mẫu Halloween</button>
            <button type="button" className="bea-primary" disabled={saving} onClick={save}><Save size={17}/>{saving?'Đang lưu…':'Lưu bản nháp'}</button>
            <button type="button" className="bea-publish" disabled={saving||!selected?.id||!recipientIds.length||selected.status==='cancelled'} onClick={()=>setConfirmPublish(true)}><Send size={17}/> Xuất bản ({recipientIds.length})</button>
          </div>
          {selected?.status==='published'&&<p className="bea-help">Sự kiện này đã xuất bản. Lưu chỉnh sửa nội dung không tự bật lại popup cho giáo viên đã xem.</p>}
        </div>
        <aside className={'bea-preview is-'+previewMode}>
          <div className="bea-preview-top"><div><span>LIVE PREVIEW</span><h3>Popup giáo viên</h3></div><div><button className={previewMode==='desktop'?'selected':''} onClick={()=>setPreviewMode('desktop')}>Desktop</button><button className={previewMode==='mobile'?'selected':''} onClick={()=>setPreviewMode('mobile')}>Mobile</button></div></div>
          <div className="bea-preview-body">{posterUrl?<img src={posterUrl} alt="Xem trước poster sự kiện"/>:<div className="bea-preview-no-poster"><ImageIcon size={36}/><p>Poster sự kiện sẽ hiển thị tại đây</p></div>}
            <span className="bea-preview-category">{form.category}</span><h3>{form.title||'Tên sự kiện'}</h3><p>{form.summary||'Mô tả ngắn sự kiện'}</p>
            <div className="bea-preview-detail"><Clock3 size={16}/>{form.event_start_at?formatTime(new Date(form.event_start_at).toISOString()):'Chưa chọn thời gian'}</div>
            <div className="bea-preview-detail"><Users size={16}/>{chosen.length} giáo viên được chọn</div>
            <button type="button" disabled> Xem chi tiết </button>
          </div>
        </aside>
      </div>
      {confirmPublish&&<div className="bea-confirm-layer" role="presentation"><section className="bea-confirm" role="alertdialog" aria-modal="true" aria-labelledby="bea-confirm-title"><h3 id="bea-confirm-title">Xuất bản sự kiện?</h3><p>Thông báo sẽ được phân phối cho <strong>{recipientIds.length} tài khoản được chọn</strong> khi đến thời gian hiển thị. Hãy xác nhận đã kiểm tra poster, ngày giờ và danh sách người nhận.</p><div><button onClick={()=>setConfirmPublish(false)}>Kiểm tra lại</button><button className="bea-publish" disabled={saving} onClick={publish}>Xác nhận xuất bản</button></div></section></div>}
    </>:null}
    {screen==='analytics'&&<div className="bea-analytics"><button className="bea-back" onClick={()=>setScreen('list')}><ArrowLeft size={15}/> Danh sách sự kiện</button><h3>{selected?.title}</h3>{analytics?<div className="bea-metrics">{[['Người nhận',analytics.recipients],['Đã hiển thị',analytics.shown],['Đã xem chi tiết',analytics.details],['Đã xác nhận',analytics.acknowledged]].map(([k,v])=><div className="bea-metric" key={k}><strong>{v}</strong><span>{k}</span></div>)}</div>:<p>Đang tải báo cáo…</p>}<p className="bea-help">Đã hiển thị không đồng nghĩa đã đọc hoặc đã tham dự.</p></div>}
  </section>;
}
