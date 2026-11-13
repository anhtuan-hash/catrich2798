import React,{useEffect,useState} from 'react';
import {Copy,QrCode} from 'lucide-react';
import {joinUrl} from './museumApi.js';

let qrLoader;
const getQrLibrary=()=>qrLoader||(qrLoader=import('qrcode').then(module=>module.default));

/** Render the current group invitation URL, never a one-time private passcode. */
export default function MuseumGroupQr({handle,groupLabel,expiresAt,revoked=false,language='en'}){
 const [image,setImage]=useState('');
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  setImage('');setFailed(false);
  if(!handle)return ()=>{cancelled=true;};
  getQrLibrary().then(QRCode=>QRCode.toDataURL(joinUrl(handle),{
   margin:2,width:256,errorCorrectionLevel:'M',
   color:{dark:'#132b59',light:'#ffffff'}
  })).then(url=>{if(!cancelled)setImage(url);})
   .catch(()=>{if(!cancelled)setFailed(true);});
  return ()=>{cancelled=true;};
 },[handle]);
 const expired=Boolean(expiresAt&&Number.isFinite(Date.parse(expiresAt))&&Date.parse(expiresAt)<=Date.now());
 const unavailable=revoked||expired;
 const en=language==='en';
 const copy=async()=>{
  const url=joinUrl(handle);
  try{await navigator.clipboard.writeText(url);}
  catch{window.prompt(en?'Copy invitation link:':'Sao chép liên kết:',url);}
 };
 return <div className="bml-lesson-qr-invite" aria-label={(en?'Invitation QR for ':'Mã QR cho ')+groupLabel}>
  <div className="bml-lesson-qr-image">
   {image?<img src={image} width="128" height="128" alt={(en?'Scan to open ':'Quét để mở ')+groupLabel} loading="lazy"/>:
    <span className="bml-lesson-qr-fallback"><QrCode size={43}/><small>{failed?(en?'QR unavailable':'Không tạo được QR'):(handle?(en?'Preparing QR':'Đang tạo QR'):(en?'No invitation':'Chưa có mã mời'))}</small></span>}
  </div>
  <span className="bml-lesson-qr-handle" title={handle||''}>{handle?(en?'Invite: ':'Mã mời: ')+handle:(en?'No invitation':'Chưa có mã mời')}</span>
  {unavailable?<span className="bml-lesson-qr-expired">{revoked?(en?'Revoked':'Đã thu hồi'):(en?'Expired':'Đã hết hạn')}</span>:null}
  {handle&&!unavailable?<button type="button" className="bml-lesson-qr-copy-link" onClick={copy}><Copy size={13}/>{en?'Copy link':'Sao chép'}</button>:null}
 </div>;
}
