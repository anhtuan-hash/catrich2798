import { useEffect,useMemo,useState } from 'react';
import { createPortal } from 'react-dom';
import { canManageAiWebsites } from '../utils/aiWebsiteSettings.js';
import { loadExternalWebApps,subscribeExternalWebApps } from '../utils/externalWebApps.js';
import ExternalWebAppManager from './ExternalWebAppManager.jsx';
import ExternalWebAppViewer from './ExternalWebAppViewer.jsx';
import './ExternalWebApps.css';
const GROUPS={plan:'Soạn bài',create:'Tạo học liệu',assess:'Kiểm tra',manage:'Quản lý'},TONES=['#1a73e8','#188038','#e37400','#9334e6','#12b5cb','#d93025'];
function tone(v=''){let h=0;for(const c of String(v))h=(h*31+c.charCodeAt(0))>>>0;return TONES[h%TONES.length];}
function Card({app,onOpen}){const accent=app.accent||tone(app.externalUrl);return <article className="flat-app-window-card flat-app-window-drawer external-website-app-card" style={{'--app-accent':accent,'--app-soft':'#e8f0fe','--app-ink':'#202124'}}><button type="button" className="flat-app-window-launch" onClick={()=>onOpen(app)}><span className="flat-app-window-chrome"><span className="flat-traffic"><i/><i/><i/></span><b>Website nhúng · Đã duyệt</b></span><span className="flat-app-window-body"><span className="flat-app-window-art external-app-tile-icon">{app.icon||'WEB'}</span><span className="flat-app-window-copy"><small>{GROUPS[app.groupId]||'Ứng dụng website'}</small><strong>{app.title}</strong><em>{app.descVi||'Chạy trực tiếp ngay trong Brian.'}</em></span><span className="flat-app-window-cta">Mở ứng dụng</span><span className="flat-app-window-decoration"/></span></button></article>}
export default function ExternalAppsIntegration({currentUser,language='vi'}){
 const manager=canManageAiWebsites(currentUser),[route,setRoute]=useState(()=>location.hash.replace(/^#\//,'').split('?')[0]),[hosts,setHosts]=useState({hero:null,grid:null}),[data,setData]=useState({approved:[],requests:[]}),[dialog,setDialog]=useState(false),[active,setActive]=useState(null);
 const pending=useMemo(()=>data.requests.filter(r=>r.status==='pending').length,[data.requests]);
 useEffect(()=>{const f=()=>setRoute(location.hash.replace(/^#\//,'').split('?')[0]);addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f);},[]);
 useEffect(()=>{if(route!=='apps'){setHosts({hero:null,grid:null});return;}const find=()=>{const hero=document.querySelector('.metro-clean-system[data-route="apps"] .flat-apps-hero-copy')||document.querySelector('.flat-apps-hero-copy'),grid=document.querySelector('.metro-clean-system[data-route="apps"] .flat-apps-collage-grid')||document.querySelector('.flat-apps-collage-grid');setHosts(c=>c.hero===hero&&c.grid===grid?c:{hero,grid});};find();const o=new MutationObserver(find);o.observe(document.body,{childList:true,subtree:true});return()=>o.disconnect();},[route]);
 useEffect(()=>{if(!currentUser||route!=='apps')return;let ok=true;loadExternalWebApps(currentUser).then(x=>ok&&setData(x)).catch(console.warn);const un=subscribeExternalWebApps(currentUser,x=>ok&&setData(x));return()=>{ok=false;un?.();};},[currentUser?.id,currentUser?.role,route]);
 if(!currentUser||route!=='apps')return null;
 return <>{hosts.hero?createPortal(<div className="external-app-integration-actions"><button className="launcher-add-external-app" onClick={()=>setDialog(true)}>＋ {manager?'Thêm / duyệt ứng dụng':'Thêm ứng dụng'}{manager&&pending?<b>{pending}</b>:null}</button></div>,hosts.hero):null}{hosts.grid?createPortal(data.approved.map(app=><Card key={app.id} app={app} onOpen={setActive}/>),hosts.grid):null}<ExternalWebAppManager open={dialog} onClose={()=>setDialog(false)} currentUser={currentUser} language={language} onChanged={setData}/><ExternalWebAppViewer app={active} onClose={()=>setActive(null)}/></>;
}
