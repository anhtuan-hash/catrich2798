import React,{useEffect,useState} from 'react';
import {getGalleryEnabled,setGalleryEnabled} from './galleryData.js';
import {GALLERY_FLAG_EVENT} from './useGalleryFlag.js';
export default function GalleryAdminToggle({currentUser,language='vi'}) {
 const [enabled,setEnabled]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 useEffect(()=>{let alive=true;getGalleryEnabled().then(e=>{if(alive){setEnabled(e);setReady(true);}}).catch(()=>{if(alive)setReady(true);});return()=>{alive=false;};},[]);
 if(currentUser?.role!=='admin')return null;
 const change=async()=>{
  if(!enabled&&!window.confirm(language==='vi'?'Bạn xác nhận đã kiểm tra RLS và nội dung trước khi mở Gallery?':'Confirm RLS and content review before enabling Gallery?'))return;
  setBusy(true);setMsg('');
  try{const row=await setGalleryEnabled(!enabled,currentUser);setEnabled(row.enabled);window.dispatchEvent(new Event(GALLERY_FLAG_EVENT));setMsg(row.enabled?'Gallery đã bật.':'Gallery đã tắt và ẩn khỏi trang Ứng dụng.');}
  catch(e){setMsg('Không thể thay đổi: '+e.message);}
  finally{setBusy(false);}
 };
 return <section aria-label="Gallery feature settings" style={{padding:'18px 22px',margin:'14px 0',background:'#f7f8f2',border:'1px solid #cbd9cf',borderRadius:16}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
   <div><small style={{letterSpacing:2,color:'#637970'}}>BRIAN MUSEUM · FEATURE FLAG</small><h3 style={{margin:'4px 0'}}>Immersive Gallery 3D</h3><p style={{margin:0,color:'#526b60'}}>{language==='en'?'Disabled by default. Enable only after migration, access control and content review.':'Mặc định tắt. Chỉ bật sau khi kiểm tra migration, phân quyền và nội dung.'}</p></div>
   <div style={{display:'flex',alignItems:'center',gap:12}}><b>{ready?(enabled?'ON':'OFF'):'…'}</b><button type="button" disabled={!ready||busy} onClick={change}>{busy?'Đang lưu…':enabled?'Tắt Gallery':'Bật Gallery'}</button>{enabled?<a href="#/tool/immersive-gallery">{language==='en'?'Open Gallery':'Vào Gallery'}</a>:null}</div>
  </div>
  {msg?<p role="status" style={{marginTop:10}}>{msg}</p>:null}
 </section>;
}
