import React,{useEffect,useState} from 'react';
import QRCode from 'qrcode';
export default function Focus8Stage({stage,language='vi'}){
 const vi=language!=='en';const [now,setNow]=useState(Date.now()),[qr,setQr]=useState('');
 useEffect(()=>{if(!stage?.running)return undefined;const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[stage?.running]);
 useEffect(()=>{
  let mounted=true;
  if(!/^https:\/\//i.test(stage?.url||'')){setQr('');return undefined;}
  QRCode.toDataURL(stage.url,{width:150,margin:1}).then(data=>{if(mounted)setQr(data);}).catch(()=>{if(mounted)setQr('');});
  return()=>{mounted=false;};
 },[stage?.url]);
 const remaining=Math.max(0,(Number(stage?.deadline)||0)-now);
 const time=String(Math.floor(remaining/60000)).padStart(2,'0')+':'+String(Math.floor(remaining%60000/1000)).padStart(2,'0');
 return <section className="bfc8-stage" aria-label="Classroom stage">
  {stage?.title&&<h2>{stage.title}</h2>}
  <p>{stage?.parts?.[stage.partIndex]|| (vi?'Hoạt động học tập':'Learning activity')}</p>
  {stage?.running&&<strong role="timer">{time}</strong>}
  {qr&&<img src={qr} alt={vi?'Mã QR học liệu':'Learning resource QR'} width="120" height="120"/>}
 </section>;
}
