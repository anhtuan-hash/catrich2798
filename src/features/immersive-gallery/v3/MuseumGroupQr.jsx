import React,{useEffect,useState} from 'react';
import {Copy,QrCode} from 'lucide-react';
import {joinUrl} from './museumApi.js';

let qrLoader;
const getQrLibrary=()=>qrLoader||(qrLoader=import('qrcode').then(module=>module.default));

export default function MuseumGroupQr({handle,exhibitionId,groupLabel,expiresAt,revoked=false,language='en'}){
 const [image,setImage]=useState('');
 const [failed,setFailed]=useState(false);
 const publicLink=Boolean(exhibitionId);
 const target=typeof window==='undefined'?'':publicLink
  ?window.location.origin+'/#/tool/immersive-gallery?exhibition='+encodeURIComponent(exhibitionId)
  :handle?joinUrl(handle):'';
 useEffect(()=>{
  let cancelled=false;
  setImage('');setFailed(false);
  if(!target)return ()=>{cancelled=true;};
  getQrLibrary().then(QRCode=>QRCode.toDataURL(target,{
   margin:2,width:256,errorCorrectionLevel:'M',
   color:{dark:'#132b59',light:'#ffffff'}
  })).then(url=>{if(!cancelled)setImage(url);})
   .catch(()=>{if(!cancelled)setFailed(true);});
  return ()=>{cancelled=true;};
 },[target]);
 const expired=Boolean(expiresAt&&Number.isFinite(Date.parse(expiresAt))&&Date.parse(expiresAt)<=Date.now());
 const unavailable=revoked||expired;
 const en=language==='en';
 const publicLabel=en?'Open published exhibit':'Mở triển lãm đã công bố';
 const copy=async()=>{
  try{await navigator.clipboard.writeText(target);}
  catch{window.prompt(en?'Copy link:':'Sao chép liên kết:',target);}
 };
 return <div className="bml-lesson-qr-invite" aria-label={publicLink?publicLabel+' · '+groupLabel:(en?'Invitation QR for ':'Mã QR cho ')+groupLabel}>
  <div className="bml-lesson-qr-image">
   {image?<img src={image} width="128" height="128" alt={(en?'Scan to open ':'Quét để mở ')+groupLabel} loading="lazy"/>:
    <span className="bml-lesson-qr-fallback"><QrCode size={43}/><small>{failed?(en?'QR unavailable':'Không tạo được QR'):(target?(en?'Preparing QR':'Đang tạo QR'):(en?'No invitation':'Chưa có mã mời'))}</small></span>}
  </div>
  {publicLink?<a className="bml-lesson-qr-handle" href={target} target="_blank" rel="noopener">{publicLabel}</a>:
   <span className="bml-lesson-qr-handle" title={handle||''}>{handle?(en?'Invite: ':'Mã mời: ')+handle:(en?'No invitation':'Chưa có mã mời')}</span>}
  {unavailable?<span className="bml-lesson-qr-expired">{revoked?(en?'Revoked':'Đã thu hồi'):(en?'Expired':'Đã hết hạn')}</span>:null}
  {target&&!unavailable?<button type="button" className="bml-lesson-qr-copy-link" onClick={copy}><Copy size={13}/>{en?'Copy link':'Sao chép'}</button>:null}
 </div>;
}
