import { useEffect,useState } from 'react';
import { createPortal } from 'react-dom';
import { safeExternalWebAppUrl } from '../utils/externalWebApps.js';
import './ExternalWebApps.css';
export default function ExternalWebAppViewer({app,onClose}){
 const [key,setKey]=useState(0),[check,setCheck]=useState(null);const url=safeExternalWebAppUrl(app?.externalUrl||app?.url);
 useEffect(()=>{if(!app||!url)return;document.documentElement.classList.add('bes-ext-open');const esc=e=>e.key==='Escape'&&onClose?.();window.addEventListener('keydown',esc);return()=>{document.documentElement.classList.remove('bes-ext-open');window.removeEventListener('keydown',esc);};},[app?.id,url,onClose]);
 useEffect(()=>{if(!url)return;const c=new AbortController();setCheck({checking:true});fetch(`/api/check-embed?url=${encodeURIComponent(url)}`,{signal:c.signal}).then(r=>r.json()).then(setCheck).catch(()=>{});return()=>c.abort();},[url,key]);
 if(!app||!url||typeof document==='undefined')return null;
 return createPortal(<div className="bes-ext-layer"><section className="bes-ext-viewer"><header className="bes-ext-head"><div><span>{app.icon||'WEB'}</span><div><strong>{app.title||app.name}</strong><small>{url}</small></div></div><div className="bes-ext-actions"><button onClick={()=>setKey(v=>v+1)}>↻ Tải lại</button><button className="bes-ext-close" onClick={onClose}>×</button></div></header><div className={`bes-ext-viewer-status ${check?.embeddable===false?'blocked':''}`}>{check?.checking?'Đang kiểm tra khả năng chạy nội bộ…':check?.embeddable===false?`Website có thể chặn iframe: ${check.reason||'chính sách bảo mật'}.`:'Website đang chạy trực tiếp trong Brian; không tự mở tab mới.'}</div><iframe key={key} src={url} title={app.title||app.name} allow="clipboard-read; clipboard-write; microphone; camera; fullscreen; geolocation" sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads" referrerPolicy="strict-origin-when-cross-origin"/></section></div>,document.body);
}
