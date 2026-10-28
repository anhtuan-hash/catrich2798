import React,{useEffect,useState} from 'react';
import {isAdminRole} from '../../utils/roles.js';
import {useHalloweenHomeTheme,loadHalloweenHomeTheme,saveHalloweenHomeTheme} from '../../utils/halloweenHomeTheme.js';
import './HalloweenNavbarAdminPanel.css';
import './HalloweenHomeAdminPanel.css';

const COPY={
 vi:{
  brow:'BRIAN SEASONAL DESIGN SYSTEM · V5', title:'Halloween toàn trang',
  desc:'Bật để chuyển toàn bộ Trang chủ sang thế giới Halloween màu tím đêm, ánh sáng bí ngô và tranh minh họa. Tắt để khôi phục nguyên vẹn giao diện gốc: thanh điều hướng, Hero, Photo Story, bài tập theo tuần và footer. Tắt để khôi phục giao diện nguyên bản; không thay đổi ảnh Hero do Admin đã công bố hoặc dữ liệu học sinh.',
  enabled:'Đang bật toàn trang',disabled:'Giao diện nguyên bản',
  syncing:'Đang đọc cấu hình',saving:'Đang lưu…',
  done:'Đã cập nhật Halloween toàn trang và đồng bộ thanh điều hướng + footer.',
  error:'Không lưu được cấu hình. Giao diện trước đó được giữ nguyên.',
  note:'Chỉ Admin · Đồng bộ cho khách và mọi tài khoản · Hai công tắc nhỏ bên dưới chỉ hoạt động khi Halloween toàn trang bật',
  parts:['Điều hướng','Hero','Slideshow','Bài tập tuần','Footer'],
 },
 en:{
  brow:'BRIAN SEASONAL DESIGN SYSTEM · V5',title:'Full-site Halloween',
  desc:'Switch the entire Home into the illustrated Halloween world; OFF restores the original navigation, Hero, Photo Story, weekly practice and footer. OFF restores original styling, without changing Admin-published Hero media or classroom data.',
  enabled:'Full Halloween on',disabled:'Original appearance',
  syncing:'Loading settings',saving:'Saving…',
  done:'Whole-home Halloween, navbar and footer updated.',
  error:'Could not save. Previous appearance has been preserved.',
  note:'Admins only · Syncs for guests and all accounts · Individual controls below work only while the master is ON',
  parts:['Navigation','Hero','Slideshow','Weekly practice','Footer'],
 }
};
export default function HalloweenHomeAdminPanel({currentUser,language='vi'}){
 const admin=isAdminRole(currentUser?.role) && currentUser?.provider==='supabase';
 const t=COPY[language==='en'?'en':'vi'];
 const theme=useHalloweenHomeTheme();
 const [available,setAvailable]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 useEffect(()=>{
  if(!admin)return undefined;
  let alive=true;
  loadHalloweenHomeTheme().then(result=>{
   if(!alive)return;
   setAvailable(Boolean(result.ok));
   if(!result.ok)setError(result.error||t.error);
  });
  return()=>{alive=false;};
 },[admin]);
 if(!admin)return null;
 const toggle=async()=>{
  if(busy || !available || !theme.verified)return;
  setBusy(true);setError('');setSuccess('');
  const result=await saveHalloweenHomeTheme(!theme.enabled);
  setBusy(false);
  if(result.ok)setSuccess(t.done);else setError(result.error||t.error);
 };
 return (
  <article className="settings-google-card halloween-navbar-admin halloween-home-admin" id="settings-halloween-home">
   <div className="halloween-home-admin__visual" aria-hidden="true">
     <span className="halloween-home-admin__moon" />
     <span className="halloween-home-admin__caption">HALLOWEEN <b>V5</b></span>
   </div>
   <div className="halloween-navbar-admin__copy">
     <span className="halloween-navbar-admin__eyebrow">🎃 {t.brow}</span>
     <h2>{t.title}</h2><p>{t.desc}</p>
     <div className="halloween-home-admin__parts" aria-label={language==='en'?'Theme coverage':'Phạm vi giao diện'}>
       {t.parts.map(part=><span key={part}>{part}</span>)}
     </div>
     <small>{t.note}</small>
   </div>
   <div className="halloween-navbar-admin__action">
     <span>{busy?t.saving:theme.verified?theme.enabled?t.enabled:t.disabled:t.syncing}</span>
     <button type="button" role="switch" aria-label={t.title}
       aria-checked={Boolean(theme.enabled)}
       className={'halloween-navbar-admin__switch'+(theme.enabled?' is-on':'')}
       disabled={busy||!available||!theme.verified}
       onClick={toggle}><span /></button>
   </div>
   {error?<p className="halloween-navbar-admin__feedback is-error" role="alert">{error}</p>:null}
   {success?<p className="halloween-navbar-admin__feedback is-success" role="status">{success}</p>:null}
  </article>
 );
}
