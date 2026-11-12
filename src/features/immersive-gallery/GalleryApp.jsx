import React,{Suspense,lazy,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {getGalleryEnabled,listExhibitions,getExhibition,createExhibition,updateExhibition,publishExhibition,unpublishExhibition,createRoom,createExhibit,updateExhibit,reviewExhibit,uploadGalleryAsset,getGalleryAssetUrl} from './galleryData.js';
import {ROOM_TEMPLATES,ROOM_KEYS,DEFAULT_TRANSFORM,normalizeTransform,slugify,QUALITY,safeVideoUrl} from './sceneTemplates.js';
import {seedDemoGallery} from './gallerySampleSeed.js';
import GalleryRenderBoundary from './GalleryRenderBoundary.jsx';
import './gallery.css';
const Canvas=lazy(()=>import('./GalleryCanvasR3F.jsx'));
const GalleryModelInspector=lazy(()=>import('./GalleryModelInspector.jsx'));
const txt=(lang,vi,en)=>lang==='en'?en:vi;
function Notice({text}){return text?<div className="big-alert" role="status">{text}</div>:null;}
function Media({exhibit,language}) {
 const [url,setUrl]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let live=true;setUrl('');setError('');if(exhibit?.asset_id)getGalleryAssetUrl(exhibit.asset_id).then(u=>{if(live)setUrl(u);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[exhibit?.asset_id]);
 if(!exhibit)return null;
 if(error)return <p role="alert">{error}</p>;
 if(exhibit.kind==='image')return url?<img className="big-media" src={url} alt={exhibit.alt_text||exhibit.title} loading="lazy"/>:<p>{txt(language,"Đang tải ảnh an toàn…","Loading protected image…")}</p>;
 if(exhibit.kind==='audio')return url?<audio controls preload="none" src={url}/>:<p>{txt(language,"Đang tải âm thanh…","Loading audio…")}</p>;
 if(exhibit.kind==='pdf')return url?<a href={url} target="_blank" rel="noreferrer">{txt(language,'Mở tài liệu PDF được cấp quyền','Open authorized PDF')}</a>:<p>{txt(language,"Đang tải tài liệu…","Loading document…")}</p>;
 if(exhibit.kind==='video'){const url=safeVideoUrl(exhibit.external_url);return url?<iframe loading="lazy" width="100%" height="260" src={url} sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture" title={exhibit.title}/>:<p>{txt(language,"Video URL không hợp lệ.","Invalid video URL.")}</p>;}
 if(exhibit.kind==='model')return <Suspense fallback={<p>Preparing model inspector…</p>}><GalleryModelInspector modelKey={exhibit.model_key||'pedestal'} language={language}/></Suspense>;
 return null;
}
function Details({item,language,onClose}) {
 const panel=useRef(null);
 useEffect(()=>{if(!item)return undefined;
   const origin=document.activeElement;
   const focusables=()=>[...panel.current?.querySelectorAll('button,a[href],input,textarea,select,[tabindex]:not([tabindex="-1"])')||[]].filter(el=>!el.disabled);
   const key=e=>{
     if(e.key==='Escape'){e.preventDefault();onClose?.();}
     if(e.key==='Tab'){const all=focusables();if(!all.length)return;
       const first=all[0],last=all[all.length-1];
       if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
       else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
   };
   panel.current?.querySelector('button')?.focus();
   document.addEventListener('keydown',key);
   return()=>{document.removeEventListener('keydown',key);origin?.focus?.();};
 },[item,onClose]);
 if(!item)return null;
 return <div className="big-detail-shade" onMouseDown={e=>{if(e.target===e.currentTarget)onClose?.();}}>
  <section ref={panel} role="dialog" aria-modal="true" aria-label={item.title} className="big-detail-panel">
   <button type="button" className="big-close" onClick={onClose} aria-label="Close">×</button>
   <small className="big-eyebrow">{item.kind?.toUpperCase()} • BRIAN LIVING EXHIBITION</small><h2>{item.title}</h2>
   <Media exhibit={item} language={language}/><p className="big-description">{item.description}</p>
   {item.transcript?<details><summary>{txt(language,'Nội dung lời nói / phụ đề','Transcript / captions')}</summary><p>{item.transcript}</p></details>:null}
   <button type="button" onClick={onClose}>{txt(language,'Trở lại phòng tranh','Back to gallery')}</button>
  </section>
 </div>;
}
function Viewer({gallery,language,onBack,onUpdated,currentUser}) {
 const [roomId,setRoomId]=useState('lobby');
 const [quality,setQuality]=useState('auto'),[listOnly,setListOnly]=useState(false),[selected,setSelected]=useState(null),[msg,setMsg]=useState('');
 const [sub,setSub]=useState({title:'',description:'',kind:'text',file:null});
 const [sending,setSending]=useState(false);
 const room=gallery.rooms.find(r=>r.id===roomId)||{id:'lobby',title:txt(language,'Sảnh trung tâm','Grand Lobby'),template_key:'lobby',exhibits:gallery.rooms.slice(0,5).map((r,i)=>({id:r.id,title:r.title,kind:'text',status:'published',description:ROOM_TEMPLATES[r.template_key]?.description||'',transform:{...DEFAULT_TRANSFORM,position:[(i-1)*3.2,2,-7.72]}}))};const exhibits=room.exhibits.filter(e=>e.status==='published'||(currentUser?.role==='admin'));
 const selectedItem=useMemo(()=>gallery.rooms.flatMap(r=>r.exhibits||[]).find(e=>e.id===selected)||null,[gallery,selected]);
 const choose=useCallback(id=>{if(roomId==='lobby'){setRoomId(id);setSelected(null);}else setSelected(id);},[roomId]);
 const close=useCallback(()=>setSelected(null),[]);
 const submit=async e=>{e.preventDefault();setSending(true);setMsg('');try{
   let asset_id=null;if(sub.kind!=='text'&&sub.file){const a=await uploadGalleryAsset(sub.file,sub.kind,currentUser);asset_id=a.id;}
   if(sub.kind!=='text'&&!asset_id)throw new Error('Vui lòng chọn tệp.');
   await createExhibit(room.id,{...sub,asset_id,transform:DEFAULT_TRANSFORM},currentUser,{submission:true});
   setSub({title:'',description:'',kind:'text',file:null});setMsg('Đã gửi sản phẩm để giáo viên duyệt.');await onUpdated();
  }catch(e){setMsg(e.message);}finally{setSending(false);}};
 return <section className="big-viewer">
  <div className="big-viewer-head"><div><button type="button" className="big-back" onClick={onBack}>← {txt(language,'Các triển lãm','Exhibitions')}</button><h2>{gallery.title}</h2><p>{gallery.summary}</p></div>
   <div className="big-controls"><label>{txt(language,'Chất lượng','Quality')} <select value={quality} onChange={e=>setQuality(e.target.value)}>{QUALITY.map(q=><option key={q} value={q}>{q}</option>)}</select></label><button type="button" onClick={()=>setListOnly(v=>!v)}>{listOnly?'3D':'2D'} {txt(language,'Chế độ xem','view')}</button></div>
  </div>
  <div className="big-room-nav" aria-label="Rooms"><button type="button" className={roomId==='lobby'?'active':''} onClick={()=>{setRoomId('lobby');close();}}>⌂ {txt(language,'Sảnh chính','Lobby')}</button>{gallery.rooms.map((r,i)=><button key={r.id} type="button" className={room?.id===r.id?'active':''} onClick={()=>{setRoomId(r.id);close();}}>{String(i+1).padStart(2,'0')} · {r.title}</button>)}</div>
  {room?<><div className="big-visit-layout">
   {!listOnly?<div className="big-scene-viewport">
    <GalleryRenderBoundary key={room.id+quality} language={language} onFallback={()=>setListOnly(true)}><Suspense fallback={<div className="big-canvas-loading">{txt(language,"Đang dựng phòng trưng bày 3D…","Building 3D gallery…")}</div>}>
     <Canvas key={room.id} template={room.template_key} exhibits={exhibits} selectedId={selected||''} onSelect={choose} quality={quality} language={language}/>
    </Suspense></GalleryRenderBoundary>
    <div className="big-scene-help">{txt(language,'Kéo để nhìn · WASD để di chuyển · Nhấn hiện vật để khám phá','Drag to look · WASD to walk · Click an artwork')}</div>
   </div>:null}
   <aside className="big-exhibit-list"><h3>{roomId==='lobby'?txt(language,'Chọn phòng tham quan','Choose a room'):txt(language,'Hiện vật trong phòng','Exhibits in this room')}</h3>
    {exhibits.length?exhibits.map(e=><button type="button" key={e.id} onClick={()=>choose(e.id)}><b>{e.title}</b><small>{e.kind} · {e.description?.slice(0,90)}</small></button>):<p>{txt(language,'Phòng chưa có hiện vật được xuất bản.','No published exhibits yet.')}</p>}
   </aside>
  </div>
  {roomId!=='lobby'&&gallery.accept_submissions&&currentUser?.role==='student'?<form className="big-paper" onSubmit={submit}><h3>{txt(language,'Gửi tác phẩm cho giáo viên','Submit your work')}</h3><input required maxLength={160} placeholder={txt(language,"Tiêu đề tác phẩm","Artwork title")} value={sub.title} onChange={e=>setSub({...sub,title:e.target.value})}/><textarea rows={3} placeholder={txt(language,"Mô tả","Description")} value={sub.description} onChange={e=>setSub({...sub,description:e.target.value})}/><select value={sub.kind} onChange={e=>setSub({...sub,kind:e.target.value,file:null})}><option value="text">Text</option><option value="image">Poster</option><option value="audio">Audio</option><option value="pdf">PDF</option></select>{sub.kind!=='text'?<input required type="file" accept={sub.kind==='image'?'image/png,image/jpeg,image/webp,image/avif':sub.kind==='audio'?'audio/mpeg,audio/mp4,audio/ogg,audio/wav':'application/pdf'} onChange={e=>setSub({...sub,file:e.target.files?.[0]||null})}/>:null}<button type="submit" disabled={sending}>{sending?'Đang gửi…':'Gửi để duyệt'}</button><Notice text={msg}/></form>:null}
  </>:<div className="big-paper">{txt(language,"Chưa có phòng trưng bày.","No rooms yet.")}</div>}
  <Details item={selectedItem} language={language} onClose={close}/>
 </section>;
}
function Studio({language,currentUser,onBack,onUpdated,galleries}) {
 const [id,setId]=useState(null),[gallery,setGallery]=useState(null),[roomId,setRoomId]=useState(''),[editing,setEditing]=useState(null),[mode,setMode]=useState('editor'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [newGallery,setNewGallery]=useState({title:'',slug:'',summary:'',visibility:'private'});
 const [newRoom,setNewRoom]=useState({title:'',template_key:'classic'});
 const [newArtwork,setNewArtwork]=useState({title:'',description:'',kind:'text',alt_text:'',transcript:'',external_url:'',model_key:'pedestal',file:null});
 const [reviewNote,setReviewNote]=useState('');
 const open=async galleryId=>{setBusy(true);setError('');try{const doc=await getExhibition(galleryId);setGallery(doc);setId(doc.id);setRoomId(doc.rooms?.[0]?.id||'');setEditing(null);}catch(e){setError(e.message);}finally{setBusy(false);}};
 const refresh=async()=>{if(id)await open(id);await onUpdated();};
 const create=async e=>{e.preventDefault();setBusy(true);setError('');try{const doc=await createExhibition(newGallery,currentUser);await onUpdated();await open(doc.id);}catch(e){setError(e.message);}finally{setBusy(false);}};
 const seed=async()=>{if(currentUser.role!=='admin'||!window.confirm('Tạo 8 tác phẩm mẫu không chứa dữ liệu học sinh thật?'))return;
    setBusy(true);setError('');try{const sample=await seedDemoGallery(currentUser);await onUpdated();await open(sample.id);}catch(e){setError(e.message);}finally{setBusy(false);}};
 const addRoom=async e=>{e.preventDefault();setBusy(true);setError('');try{await createRoom(id,newRoom.template_key,newRoom.title,gallery.rooms.length,currentUser);await refresh();setNewRoom({title:'',template_key:'classic'});}catch(e){setError(e.message);}finally{setBusy(false);}};
 const addArtwork=async e=>{e.preventDefault();setBusy(true);setError('');try{let asset_id=null;if(['image','audio','pdf'].includes(newArtwork.kind)){if(!newArtwork.file)throw new Error('Cần chọn tệp trước khi lưu.');const a=await uploadGalleryAsset(newArtwork.file,newArtwork.kind,currentUser);asset_id=a.id;}
  const count=gallery.rooms.find(r=>r.id===roomId)?.exhibits?.length||0;
  const transform={...DEFAULT_TRANSFORM,position:[(count%5-2)*2,2,-7.72]};
  await createExhibit(roomId,{...newArtwork,asset_id,transform},currentUser);
  setNewArtwork({title:'',description:'',kind:'text',alt_text:'',transcript:'',external_url:'',model_key:'pedestal',file:null});await refresh();
 }catch(e){setError(e.message);}finally{setBusy(false);}};
 const saveArtwork=async()=>{setBusy(true);setError('');try{await updateExhibit(editing.id,editing,currentUser);await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const review=async(item,state)=>{setBusy(true);setError('');try{await reviewExhibit(item.id,state,reviewNote,currentUser);setReviewNote('');await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const publish=async makePublic=>{setBusy(true);setError('');try{if(makePublic){if(gallery.visibility==='public'&&!window.confirm('Xác nhận xuất bản công khai tác phẩm đã được duyệt?'))return;await publishExhibition(id,currentUser);}else await unpublishExhibition(id,currentUser);await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const room=gallery?.rooms?.find(r=>r.id===roomId), pending=gallery?.rooms?.flatMap(r=>r.exhibits||[]).filter(e=>e.status==='submitted'||e.status==='draft')||[];
 return <section className="big-studio">
 <div className="big-viewer-head"><div><button type="button" onClick={()=>{if(id){setId(null);setGallery(null);}else onBack();}}>← {txt(language,'Quay lại','Back')}</button><h2>Exhibition Studio</h2><p>{txt(language,'Biên tập nội dung bằng dữ liệu thực của Brian','Cloud-backed exhibition authoring')}</p></div>{gallery?<div className="big-controls"><button type="button" onClick={()=>setMode('editor')}>Studio</button><button type="button" onClick={()=>setMode('moderation')}>Duyệt bài ({pending.length})</button></div>:null}</div>
 <Notice text={error}/>
 {!gallery?<><div className="big-controls">{currentUser.role==='admin'?<button type="button" disabled={busy} onClick={seed}>+ {txt(language,'Tạo triển lãm mẫu (8 tác phẩm gốc)','Create sample exhibition (8 original works)')}</button>:null}</div><div className="big-studio-columns"><form className="big-paper" onSubmit={create}><h3>{txt(language,'Tạo triển lãm mới','New exhibition')}</h3><label>{txt(language,"Tiêu đề","Title")}<input required maxLength={140} value={newGallery.title} onChange={e=>setNewGallery({...newGallery,title:e.target.value,slug:slugify(e.target.value)})}/></label><label>Slug<input required value={newGallery.slug} onChange={e=>setNewGallery({...newGallery,slug:e.target.value})}/></label><label>{txt(language,"Mô tả","Description")}<textarea rows={4} value={newGallery.summary} onChange={e=>setNewGallery({...newGallery,summary:e.target.value})}/></label><label>{txt(language,"Phạm vi","Visibility")}<select value={newGallery.visibility} onChange={e=>setNewGallery({...newGallery,visibility:e.target.value})}><option value="private">Private</option><option value="school">School</option><option value="public">Public (requires admin approval)</option></select></label><button type="submit" disabled={busy}>{txt(language,"Tạo bản nháp","Create draft")}</button></form>
 <div className="big-paper"><h3>{txt(language,"Triển lãm hiện có","Existing exhibitions")}</h3>{galleries.filter(g=>currentUser.role==='admin'||g.owner_id===currentUser.id).map(g=><button type="button" className="big-row-btn" key={g.id} onClick={()=>open(g.id)}><b>{g.title}</b><small>{g.status} · {g.visibility}</small></button>)}</div></div></>:
 <><div className="big-paper big-meta"><h3>{gallery.title} <span>{gallery.status}</span></h3><div className="big-editor-grid"><label>{txt(language,"Tên","Name")}<input value={gallery.title} onChange={e=>setGallery({...gallery,title:e.target.value})}/></label><label>{txt(language,"Mô tả","Description")}<input value={gallery.summary||''} onChange={e=>setGallery({...gallery,summary:e.target.value})}/></label><label>{txt(language,"Phạm vi","Visibility")}<select value={gallery.visibility} onChange={e=>setGallery({...gallery,visibility:e.target.value})}><option value="private">Private</option><option value="school">School</option><option value="public">Public</option></select></label><label title={txt(language,'Chỉ mở sau khi triển khai xác thực danh tính học sinh trên Brian.','Requires verified student authentication before opening.')}><input type="checkbox" checked={false} disabled aria-disabled="true"/> {txt(language,"Học sinh gửi bài — chưa kích hoạt vì tài khoản học sinh chưa được xác thực","Student submissions — unavailable until student identity is verified")}</label></div><div className="big-controls"><button disabled={busy} onClick={async()=>{try{await updateExhibition(id,gallery,currentUser);await refresh();}catch(e){setError(e.message);}}}>{txt(language,"Lưu thông tin","Save details")}</button>{currentUser.role==='admin'?(gallery.status==='published'?<button disabled={busy} onClick={()=>publish(false)}>{txt(language,"Gỡ xuất bản","Unpublish")}</button>:<button disabled={busy} onClick={()=>publish(true)}>{txt(language,"Duyệt & xuất bản","Review & publish")}</button>):<span>{txt(language,"Admin phê duyệt xuất bản","Admin approval required")}</span>}</div></div>
 {mode==='moderation'?<div className="big-paper"><h3>Hàng chờ duyệt — {pending.length}</h3>{pending.length?pending.map(e=><div className="big-review" key={e.id}><h4>{e.title}</h4><p>{e.description}</p><Media exhibit={e} language={language}/><textarea value={reviewNote} placeholder={txt(language,"Ghi chú xét duyệt (tuỳ chọn)","Review note (optional)")} onChange={ev=>setReviewNote(ev.target.value)}/><div className="big-controls"><button disabled={busy} onClick={()=>review(e,'approved')}>{txt(language,"Phê duyệt","Approve")}</button><button disabled={busy} onClick={()=>review(e,'rejected')}>{txt(language,"Từ chối","Reject")}</button></div></div>):<p>{txt(language,"Không có bài chờ duyệt.","No submissions pending.")}</p>}</div>:
 <div className="big-studio-columns">
 <div className="big-paper"><h3>{txt(language,"01 / Phòng triển lãm","01 / Exhibition rooms")}</h3>{gallery.rooms.map(r=><button key={r.id} type="button" className={roomId===r.id?'big-row-btn active':'big-row-btn'} onClick={()=>{setRoomId(r.id);setEditing(null);}}>{r.title} · {r.template_key}</button>)}
 <form onSubmit={addRoom}><input required placeholder={txt(language,"Tên phòng","Room name")} value={newRoom.title} onChange={e=>setNewRoom({...newRoom,title:e.target.value})}/><select value={newRoom.template_key} onChange={e=>setNewRoom({...newRoom,template_key:e.target.value})}>{ROOM_KEYS.map(key=><option key={key} value={key}>{ROOM_TEMPLATES[key].vi}</option>)}</select><button type="submit" disabled={busy}>{txt(language,"+ Thêm phòng","+ Add room")}</button></form>
 <h3>{txt(language,"02 / Thêm hiện vật","02 / Add exhibit")}</h3>{room?<form onSubmit={addArtwork}><label>{txt(language,"Tiêu đề","Title")}<input required maxLength={160} value={newArtwork.title} onChange={e=>setNewArtwork({...newArtwork,title:e.target.value})}/></label><label>{txt(language,"Loại","Type")}<select value={newArtwork.kind} onChange={e=>setNewArtwork({...newArtwork,kind:e.target.value,file:null})}>{['text','image','audio','video','pdf','model'].map(t=><option key={t} value={t}>{t}</option>)}</select></label><label>{txt(language,"Mô tả","Description")}<textarea rows={4} value={newArtwork.description} onChange={e=>setNewArtwork({...newArtwork,description:e.target.value})}/></label>{['image','audio','pdf'].includes(newArtwork.kind)?<label>{txt(language,"Upload (giới hạn bảo mật)","Upload (secure size limits)")}<input required type="file" accept={newArtwork.kind==='image'?'image/png,image/jpeg,image/webp,image/avif':newArtwork.kind==='audio'?'audio/mpeg,audio/mp4,audio/ogg,audio/wav':'application/pdf'} onChange={e=>setNewArtwork({...newArtwork,file:e.target.files?.[0]||null})}/></label>:null}{newArtwork.kind==='video'?<label>YouTube URL<input value={newArtwork.external_url} onChange={e=>setNewArtwork({...newArtwork,external_url:e.target.value})}/></label>:null}{newArtwork.kind==='model'?<label>{txt(language,"Mẫu mô hình","Curated model")}<select value={newArtwork.model_key} onChange={e=>setNewArtwork({...newArtwork,model_key:e.target.value})}>{['pedestal','globe','book'].map(k=><option key={k}>{k}</option>)}</select></label>:null}<label>Alt text<input value={newArtwork.alt_text} onChange={e=>setNewArtwork({...newArtwork,alt_text:e.target.value})}/></label><label>{txt(language,"Bản ghi / transcript","Transcript")}<textarea rows={2} value={newArtwork.transcript} onChange={e=>setNewArtwork({...newArtwork,transcript:e.target.value})}/></label><button disabled={busy} type="submit">{txt(language,"Thêm hiện vật","Add exhibit")}</button></form>:<p>{txt(language,"Tạo phòng trước khi thêm tác phẩm.","Create a room before adding exhibits.")}</p>}</div>
 <div className="big-paper"><h3>{txt(language,"03 / Bố trí & xem trước","03 / Placement and preview")}</h3>{room?<><div className="big-editor-preview"><GalleryRenderBoundary language={language}><Suspense fallback={<div>{txt(language,"Đang mở bản dựng…","Opening preview…")}</div>}><Canvas template={room.template_key} exhibits={room.exhibits} selectedId={editing?.id||''} onSelect={eid=>setEditing(room.exhibits.find(e=>e.id===eid)||null)} quality="lite" language={language}/></Suspense></GalleryRenderBoundary></div><div className="big-exhibit-list">{room.exhibits.map(e=><button type="button" key={e.id} onClick={()=>setEditing(e)}><b>{e.title}</b><small>{e.status} · {e.kind}</small></button>)}</div>{editing?<div className="big-transform"><h4>{editing.title} — Placement</h4><p>{txt(language,"Di chuyển theo trục XYZ (tọa độ phòng)","Move along XYZ room coordinates")}</p>{['position','rotation','scale'].map(group=><div key={group}><b>{group}</b><div className="big-editor-grid">{['X','Y','Z'].map((letter,i)=><label key={letter}>{letter}<input type="number" step={group==='rotation'?'0.1':'0.25'} value={(editing.transform?.[group]||DEFAULT_TRANSFORM[group])[i]} onChange={e=>{const next={...editing.transform,[group]:[...editing.transform[group]]};next[group][i]=Number(e.target.value);setEditing({...editing,transform:normalizeTransform(next)});}}/></label>)}</div></div>)}<label>{txt(language,"Mô tả","Description")}<textarea rows={3} value={editing.description||''} onChange={e=>setEditing({...editing,description:e.target.value})}/></label><button disabled={busy} onClick={saveArtwork}>{txt(language,"Lưu vị trí / nội dung","Save position and content")}</button></div>:null}</>:<p>{txt(language,"Chọn một phòng để chỉnh sửa.","Select a room to edit.")}</p>}</div>
 </div>}
 </>}
 </section>;
}
export default function GalleryApp({language='vi',currentUser}){
 const [enabled,setEnabled]=useState(null),[galleries,setGalleries]=useState([]),[gallery,setGallery]=useState(null),[mode,setMode]=useState('landing'),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{const active=await getGalleryEnabled();setEnabled(active);if(!active){setGalleries([]);return;}setGalleries(await listExhibitions());},[]);
 useEffect(()=>{let live=true;load().catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setBusy(false);});return()=>{live=false;};},[load,currentUser?.id]);
 const refresh=useCallback(async()=>{await load();if(gallery){const updated=await getExhibition(gallery.id);setGallery(updated);}},[load,gallery?.id]);
 useEffect(()=>{if(!enabled)return undefined;let alive=true;const openLink=()=>{const params=new URLSearchParams((window.location.hash.split('?')[1]||''));const slug=params.get('gallery');if(!slug){setGallery(null);setMode(m=>m==='viewer'?'landing':m);return;}getExhibition(slug).then(doc=>{if(alive){setGallery(doc);setMode('viewer');}}).catch(e=>{if(alive)setError(e.message);});};window.addEventListener('hashchange',openLink);openLink();return()=>{alive=false;window.removeEventListener('hashchange',openLink);};},[enabled]);
 const enter=async(g)=>{window.location.hash='#/tool/immersive-gallery?gallery='+encodeURIComponent(g.slug);setBusy(true);setError('');try{const doc=await getExhibition(g.id);setGallery(doc);setMode('viewer');}catch(e){setError(e.message);}finally{setBusy(false);}};
 if(busy&&enabled===null)return <main className="big-gallery big-page"><div className="big-paper">{txt(language,"Đang xác thực Gallery…","Verifying gallery access…")}</div></main>;
 if(!enabled)return <main className="big-gallery big-page"><section className="big-hero"><small>BRIAN · THE LIVING EXHIBITION</small><h1>Immersive Gallery</h1><p>{txt(language,'Phòng triển lãm đang tắt. Admin có thể bật trong khu vực Quản trị sau khi migration được phê duyệt.','Gallery is disabled. An admin can enable it after migration approval.')}</p><a href="#/apps">← {txt(language,'Trở về ứng dụng','Back to apps')}</a></section></main>;
 return <main className="big-gallery big-page"><div className="big-hero"><small>BRIAN ENGLISH · A LIVING MUSEUM</small><h1>Immersive Gallery <span>3D</span></h1><p>{txt(language,'Nơi học sinh được trưng bày, khám phá và kể câu chuyện bằng tiếng Anh.','Where students exhibit, explore and tell stories in English.')}</p>{mode==='landing'&&currentUser?.role!=='student'?<button type="button" onClick={()=>{setMode('studio');setGallery(null);}}>{txt(language,"Mở Exhibition Studio","Open Exhibition Studio")}</button>:null}</div>
 <Notice text={error}/>{mode==='studio'?<Studio language={language} currentUser={currentUser} galleries={galleries} onBack={()=>setMode('landing')} onUpdated={refresh}/>:mode==='viewer'&&gallery?<Viewer gallery={gallery} language={language} currentUser={currentUser} onBack={()=>{window.location.hash='#/tool/immersive-gallery';setMode('landing');setGallery(null);}} onUpdated={refresh}/>:<section className="big-catalog"><div className="big-section-heading"><h2>Exhibitions</h2><p>{galleries.length} {txt(language,'không gian sẵn có','available exhibitions')}</p></div><div className="big-catalog-grid">{galleries.map((g,i)=><article className="big-catalog-card" key={g.id}><div className={'big-card-art tone-'+i%3}><span aria-hidden="true">✦</span></div><div><small>{g.status} • {g.visibility}</small><h3>{g.title}</h3><p>{g.summary}</p><button type="button" onClick={()=>enter(g)}>{txt(language,'Khám phá triển lãm','Enter gallery')} →</button></div></article>)}</div>{!galleries.length?<div className="big-paper">{txt(language,"Chưa có triển lãm. Giáo viên được cấp quyền có thể tạo bản nháp trong Studio.","No exhibitions yet. Authorized teachers can create a draft in Studio.")}</div>:null}</section>}</main>;
}
