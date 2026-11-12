import React,{useCallback,useEffect,useRef,useState,Suspense,lazy} from 'react';
import {GCP_ROOM_TEMPLATES,GCP_MODELS,normalizeGuestDraft,validateGuestSubmission} from './creatorPassPolicy.js';
import './creatorPass.css';
const GalleryCanvas=lazy(()=>import('./GalleryCanvasR3F.jsx'));
const emptyDraft=()=>({title:'',summary:'',rooms:[]});
const routeHandle=()=>{
 try{return new URLSearchParams(window.location.hash.split('?')[1]||'').get('invite')||'';}
 catch{return '';}
};
async function api(action,method='GET',body,csrf=''){
 const res=await fetch('/api/gallery-guest?operation='+encodeURIComponent(action),{
  method,credentials:'same-origin',cache:'no-store',
  headers:{...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-Gallery-CSRF':csrf}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const data=await res.json().catch(()=>({error:'Không nhận được phản hồi.'}));
 if(!res.ok)throw Object.assign(new Error(data.error||'Không thể xử lý yêu cầu.'),{status:res.status});
 return data;
}
const templateNames={classic:'Classic Gallery',culture:'Culture Pavilion',lab:'Discovery Lab'};
function Admission({onRedeem,busy,error}){
 const [handle,setHandle]=useState(routeHandle),[secret,setSecret]=useState('');
 return <section className="gcp-entry">
  <div className="gcp-entry-visual"><span>BRIAN · THE LIVING MUSEUM</span><div className="gcp-arch"><div className="gcp-arch-inner">GALLERY CREATOR</div></div><h1>Một bảo tàng do chính nhóm em tạo nên.</h1><p>Không cần tài khoản. Chỉ cần mã nhóm giáo viên cung cấp.</p></div>
  <form className="gcp-entry-form" onSubmit={e=>{e.preventDefault();onRedeem({handle:handle.trim(),groupSecret:secret});}}>
   <small>STUDENT CREATOR PASS</small><h2>Vào không gian sáng tạo</h2>
   <label>Mã lời mời (từ QR của giáo viên)<input required value={handle} autoComplete="off" maxLength={80} onChange={e=>setHandle(e.target.value)} placeholder="Mã lời mời"/></label>
   <label>Mã bí mật nhóm<input required type="password" autoComplete="off" minLength={16} maxLength={128} value={secret} onChange={e=>setSecret(e.target.value)} placeholder="Nhập mã riêng của nhóm"/></label>
   {error?<p className="gcp-error" role="alert">{error}</p>:null}
   <button type="submit" disabled={busy}>{busy?'Đang xác minh…':'Vào Creator Studio'}</button>
   <p className="gcp-footnote">Mã mời không xác nhận danh tính cá nhân. Không chia sẻ mã bí mật hoặc nhập thông tin riêng tư lên tác phẩm.</p>
  </form>
 </section>;
}
const roomBase=(key,index)=>({title:templateNames[key]+' '+(index+1),template_key:key,exhibits:[]});
const itemBase=(kind,index)=>({title:kind==='model'?'Mô hình khám phá '+(index+1):'Tác phẩm '+(index+1),description:'',kind,model_key:kind==='model'?'globe':null,
 transform:{position:[(index%5-2)*2,2,-7.72],rotation:[0,0,0],scale:[1,1,1]}});
export default function GalleryCreatorGuestPage(){
 const [session,setSession]=useState(null),[draft,setDraft]=useState(emptyDraft),[version,setVersion]=useState(0);
 const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [info,setInfo]=useState(''),[roomIndex,setRoomIndex]=useState(0),[preview,setPreview]=useState(false),[listOnly,setListOnly]=useState(false);
 const draftRef=useRef(draft),versionRef=useRef(version),csrfRef=useRef(''),savePending=useRef(false);
 const versionState=useCallback(n=>{versionRef.current=n;setVersion(n);},[]);
 const edit=next=>{
  const value=typeof next==='function'?next(draftRef.current):next;
  draftRef.current=value;setDraft(value);setDirty(true);setInfo('');
 };
 const sync=useCallback(async()=>{
  const me=await api('me'),d=await api('draft');
  csrfRef.current=me.csrf;setSession(me);draftRef.current=d.draft||emptyDraft();
  setDraft(d.draft||emptyDraft());versionState(d.version);setDirty(false);
 },[versionState]);
 useEffect(()=>{let mounted=true;api('me').then(me=>api('draft').then(d=>{
  if(!mounted)return;csrfRef.current=me.csrf;setSession(me);draftRef.current=d.draft||emptyDraft();
  setDraft(d.draft||emptyDraft());versionState(d.version);setDirty(false);
 })).catch(()=>{});return()=>{mounted=false;};},[versionState]);
 const redeem=async body=>{
  setBusy(true);setError('');
  try{await api('redeem','POST',body);await sync();}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const save=useCallback(async()=>{
  if(!session||savePending.current||!dirty)return versionRef.current;
  if(!['issued','editing','changes_requested'].includes(session.groupState))return versionRef.current;
  savePending.current=true;
  const snapshot=draftRef.current,serialized=JSON.stringify(snapshot),expected=versionRef.current;
  try{
   const cleaned=normalizeGuestDraft(snapshot,session.assignment);
   const data=await api('save','PUT',{draft:cleaned,expectedVersion:expected},csrfRef.current);
   versionState(data.version);
   if(JSON.stringify(draftRef.current)===serialized)setDirty(false);
   setInfo('Đã lưu bản nháp');
   return data.version;
  }catch(e){
   setError(e.status===409?'Bản nháp đã thay đổi trên thiết bị khác. Hãy tải lại trước khi tiếp tục.':e.message);
   return null;
  }finally{savePending.current=false;}
 },[session,dirty,versionState]);
 useEffect(()=>{
  if(!dirty||!session||savePending.current)return undefined;
  const t=setTimeout(()=>{save();},1800);return()=>clearTimeout(t);
 },[draft,dirty,session,save,version]);
 const allowed=session&&['issued','editing','changes_requested'].includes(session.groupState);
 const updateRoom=(i,update)=>edit(d=>({...d,rooms:d.rooms.map((r,n)=>n===i?{...r,...update}:r)}));
 const updateExhibit=(ri,ei,update)=>edit(d=>({...d,rooms:d.rooms.map((r,n)=>n===ri?{
  ...r,exhibits:r.exhibits.map((x,j)=>j===ei?{...x,...update}:x)
 }:r)}));
 const submit=async()=>{
  setBusy(true);setError('');
  try{
   validateGuestSubmission(normalizeGuestDraft(draftRef.current,session.assignment));
   if(dirty){
    const current=await save();
    if(current===null)throw new Error('Không thể lưu bản nháp. Vui lòng thử lại.');
   }
   await api('submit','POST',{expectedVersion:versionRef.current},csrfRef.current);
   await sync();setInfo('Đã nộp. Giáo viên sẽ kiểm tra trước khi gửi TTCM.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const logout=async()=>{
  setBusy(true);
  try{await api('logout','POST',{},csrfRef.current);}catch{}
  csrfRef.current='';setSession(null);setDraft(emptyDraft());draftRef.current=emptyDraft();
  setDirty(false);setBusy(false);setInfo('');
 };
 const removeRoom=i=>edit(d=>({...d,rooms:d.rooms.filter((_,n)=>n!==i)}));
 const room=draft.rooms[roomIndex]||null;
 const room3d=room?{id:'draft-'+roomIndex,template_key:room.template_key,exhibits:room.exhibits.map((e,i)=>({...e,id:'draft-exhibit-'+i,status:'published'}))}:null;
 if(!session)return <main className="gcp-root"><Admission onRedeem={redeem} busy={busy} error={error}/></main>;
 return <main className="gcp-root">
  <header className="gcp-topbar"><div><small>BRIAN GALLERY · CREATOR PASS</small><h1>Studio sáng tạo triển lãm</h1><p>{session.groupLabel} · {session.assignment.class_scope} · {session.assignment.title}</p></div>
   <div className="gcp-top-actions"><span className="gcp-state">{session.groupState.replaceAll('_',' ')}</span><button type="button" onClick={logout}>Thoát phiên</button></div></header>
  <div className="gcp-content">
   <section className="gcp-brief"><b>Đề bài của giáo viên</b><p>{session.assignment.brief||'Hãy tạo một bảo tàng tiếng Anh bằng nội dung do nhóm tự thực hiện.'}</p>
    <small>Hạn nộp: {new Date(session.assignment.deadline_at).toLocaleString('vi-VN')} · Tối đa {session.assignment.max_rooms} phòng, {session.assignment.max_exhibits} hiện vật</small></section>
   {session.feedback?<section className="gcp-note" role="status"><h2>Nhận xét để chỉnh sửa</h2>
    {session.feedback.teacher?<p><b>Giáo viên:</b> {session.feedback.teacher}</p>:null}
    {session.feedback.ttcm?<p><b>TTCM:</b> {session.feedback.ttcm}</p>:null}
   </section>:null}
   {!allowed?<div className="gcp-note"><h2>Bản triển lãm đã khóa chỉnh sửa</h2>
     <p>{session.groupState==='approved_locked'?'TTCM đã duyệt phiên bản đã nộp.':
      session.groupState==='published'?'Triển lãm đã được xuất bản.':
      session.groupState==='rejected'?'Hồ sơ đã được từ chối.':
      'Bài đã được gửi duyệt. Giáo viên/TTCM có thể trả lại để chỉnh sửa.'}</p></div>:null}
   <div className="gcp-editor">
    <aside className="gcp-editor-side">
     <h2>01 · Thông tin triển lãm</h2>
     <label>Tên bảo tàng<input disabled={!allowed} maxLength={140} value={draft.title} onChange={e=>edit(d=>({...d,title:e.target.value}))} placeholder="Our Planet, Our Future"/></label>
     <label>Thông điệp / lời giới thiệu<textarea disabled={!allowed} rows={4} maxLength={1200} value={draft.summary} onChange={e=>edit(d=>({...d,summary:e.target.value}))}/></label>
     <h2>02 · Kiến trúc phòng</h2>
     <nav className="gcp-room-list" aria-label="Danh sách phòng">{draft.rooms.map((r,i)=><button type="button" key={i} className={i===roomIndex?'active':''} onClick={()=>setRoomIndex(i)}>{String(i+1).padStart(2,'0')} · {r.title||templateNames[r.template_key]}</button>)}</nav>
     {allowed&&draft.rooms.length<session.assignment.max_rooms?<div className="gcp-add-room">{GCP_ROOM_TEMPLATES.map(key=><button type="button" key={key}
       onClick={()=>{edit(d=>({...d,rooms:[...d.rooms,roomBase(key,d.rooms.length)]}));setRoomIndex(draft.rooms.length);}}>
       + {templateNames[key]}</button>)}</div>:null}
     <div className="gcp-save-status" role="status">{dirty?'Chưa đồng bộ · đang tự lưu…':info||'Bản nháp đã đồng bộ'}</div>
    </aside>
    <section className="gcp-workspace">
     {room?<><div className="gcp-room-head"><div><small>ROOM {String(roomIndex+1).padStart(2,'0')}</small>
        <h2>{templateNames[room.template_key]}</h2></div>
       <div className="gcp-actions"><button type="button" onClick={()=>{setPreview(v=>!v);setListOnly(false);}}>{preview?'Trở lại biên tập':'Xem trước 3D'}</button>
        {allowed?<button type="button" className="gcp-danger" onClick={()=>{removeRoom(roomIndex);setRoomIndex(0);}}>Xóa phòng</button>:null}</div></div>
       {preview?<><div className="gcp-preview">
         {listOnly?<div className="gcp-note"><h3>Danh sách hiện vật 2D</h3>
           {room.exhibits.length?room.exhibits.map((e,i)=><article key={i} className="gcp-exhibit-card">
              <b>{e.title}</b><p>{e.description}</p>
              {e.kind==='model'?<small>Mô hình: {e.model_key}</small>:null}
             </article>):<p>Phòng chưa có hiện vật.</p>}
          </div>:
          <Suspense fallback={<p>Đang mở phòng 3D…</p>}><GalleryCanvas template={room.template_key} exhibits={room3d.exhibits} quality="balanced" language="vi"/></Suspense>}</div>
         <button type="button" onClick={()=>setListOnly(v=>!v)}>Chuyển {listOnly?'3D':'2D'}</button></>:
        <>
         <label>Tên phòng<input disabled={!allowed} maxLength={120} value={room.title}
           onChange={e=>updateRoom(roomIndex,{title:e.target.value})}/></label>
         <h3>03 · Hiện vật trong phòng</h3>
         <div className="gcp-plan">
          <div className="gcp-plan-heading"><b>Sơ đồ phòng nhìn từ trên xuống</b><small>Vị trí sẽ cập nhật trong phòng 3D</small></div>
          <div className="gcp-plan-floor" role="img" aria-label="Sơ đồ hiện vật trong phòng">
           {room.exhibits.map((item,i)=><span key={i} className="gcp-plan-marker"
              style={{left:((Math.max(-7,Math.min(7,item.transform?.position?.[0]||0))+7)/14*90+5)+'%',
                top:((Math.max(-8,Math.min(8,item.transform?.position?.[2]||0))+8)/16*84+8)+'%'}}>
             {i+1}</span>)}
          </div>
         </div>
         <div className="gcp-exhibits">{room.exhibits.map((item,i)=><article className="gcp-exhibit-card" key={i}>
          <div className="gcp-card-title"><b>Hiện vật {i+1}</b>{allowed?<button type="button" onClick={()=>updateRoom(roomIndex,{exhibits:room.exhibits.filter((_,n)=>n!==i)})}>Xóa</button>:null}</div>
          <label>Tựa đề<input disabled={!allowed} maxLength={160} value={item.title}
             onChange={e=>updateExhibit(roomIndex,i,{title:e.target.value})}/></label>
          <label>Mô tả bằng tiếng Anh<textarea disabled={!allowed} maxLength={5000} rows={4} value={item.description}
             onChange={e=>updateExhibit(roomIndex,i,{description:e.target.value})}/></label>
          {item.kind==='model'?<label>Mô hình được duyệt<select disabled={!allowed} value={item.model_key||'globe'}
            onChange={e=>updateExhibit(roomIndex,i,{model_key:e.target.value})}>{GCP_MODELS.map(model=><option key={model}>{model}</option>)}</select></label>:null}
          <div className="gcp-placement">
           {['position','rotation','scale'].map(axis=><fieldset className="gcp-axis-group" key={axis}><legend>{axis}</legend>
            {['X','Y','Z'].map((letter,index)=><label key={letter}>{letter}
             <input disabled={!allowed} type="number" step={axis==='rotation'?'0.1':'0.25'}
              min={axis==='scale'?'.25':axis==='rotation'?'-6.28':'-8'}
              max={axis==='scale'?'3':axis==='rotation'?'6.28':'8'}
              value={item.transform?.[axis]?.[index]??(axis==='scale'?1:0)}
              onChange={e=>{
               const next=[...(item.transform?.[axis]||[0,0,0])];
               next[index]=Number(e.target.value);
               updateExhibit(roomIndex,i,{transform:{...item.transform,[axis]:next}});
              }}/>
            </label>)}
           </fieldset>)}
          </div>
         </article>)}</div>
         {allowed&&draft.rooms.reduce((n,r)=>n+r.exhibits.length,0)<session.assignment.max_exhibits?<div className="gcp-add-room">
          <button type="button" onClick={()=>updateRoom(roomIndex,{exhibits:[...room.exhibits,itemBase('text',room.exhibits.length)]})}>+ Văn bản / Poster bằng chữ</button>
          <button type="button" onClick={()=>updateRoom(roomIndex,{exhibits:[...room.exhibits,itemBase('model',room.exhibits.length)]})}>+ Hiện vật GLB có sẵn</button>
         </div>:null}
        </>}
       <div className="gcp-note gcp-safety">Đợt thử nghiệm chỉ nhận văn bản và mô hình 3D có sẵn. Upload ảnh/âm thanh/PDF sẽ mở sau khi hoàn tất cổng kiểm tra tệp riêng tư.</div>
      </>:<div className="gcp-empty"><h2>Hãy chọn không gian đầu tiên.</h2><p>Bắt đầu với Classic Gallery, Culture Pavilion hoặc Discovery Lab.</p></div>}
    </section>
   </div>
   {allowed?<footer className="gcp-footer">
     <div><b>{draft.rooms.length} phòng · {draft.rooms.reduce((n,r)=>n+r.exhibits.length,0)} hiện vật</b><small>{dirty?'Đang lưu bản nháp…':'Đã lưu theo mã nhóm'}</small></div>
     <div className="gcp-actions"><button type="button" disabled={busy} onClick={()=>save()}>Lưu ngay</button>
      <button className="gcp-primary" type="button" disabled={busy||!draft.rooms.length} onClick={submit}>{busy?'Đang xử lý…':'Nộp để giáo viên duyệt'}</button></div>
    </footer>:null}
   {error?<div role="alert" className="gcp-error">{error}</div>:null}
  </div>
 </main>;
}
