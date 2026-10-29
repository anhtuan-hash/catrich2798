import React, { memo, useEffect, useRef, useState } from 'react';
import { ExternalLink, Maximize2, MonitorPlay } from 'lucide-react';
import './PhotoAudienceLive.css';

// This is a third-party page, not a copy or a recreation of QRvote's results.
// We deliberately preserve its URL, scripts, QR code, rankings and refresh cycle.
export const HALLOWEEN_QRVOTE_SCREEN = 'https://qrvote.org/c/halloween-showcase-ry29/screen';
const DESKTOP_WIDTH = 1440;
const DESKTOP_HEIGHT = 920;

function PhotoAudienceLive({language='vi'}) {
  const en=language==='en';
  const viewportRef=useRef(null);
  const [width,setWidth]=useState(560);
  const [fullscreen,setFullscreen]=useState(false);

  useEffect(()=>{
    const node=viewportRef.current;
    if(!node)return undefined;
    const measure=()=>setWidth(current=>{
      const next=Math.max(1,Math.round(node.getBoundingClientRect().width));
      return next===current?current:next;
    });
    measure();
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;
    observer?.observe(node);
    window.addEventListener('resize',measure);
    const onFullscreen=()=>{setFullscreen(document.fullscreenElement===node);measure();};
    document.addEventListener('fullscreenchange',onFullscreen);
    return()=>{observer?.disconnect();window.removeEventListener('resize',measure);document.removeEventListener('fullscreenchange',onFullscreen);};
  },[]);

  const scale=fullscreen
    ? Math.min(width/DESKTOP_WIDTH,window.innerHeight/DESKTOP_HEIGHT)
    : width/DESKTOP_WIDTH;
  const frameHeight=Math.round(DESKTOP_HEIGHT*scale);

  const maximize=async()=>{
    try {
      if(document.fullscreenElement===viewportRef.current)await document.exitFullscreen();
      else await viewportRef.current?.requestFullscreen?.();
    }catch{window.open(HALLOWEEN_QRVOTE_SCREEN,'_blank','noopener,noreferrer');}
  };

  return <section className="bss-audience-panel" aria-label={en?'Live audience voting on QRvote':'Bình chọn khán giả trực tiếp từ QRvote'}>
    <header className="bss-audience-heading">
      <div className="bss-audience-title"><span className="bss-audience-pulse"/><strong>{en?'LIVE · AUDIENCE VOTING':'LIVE · BÌNH CHỌN KHÁN GIẢ'}</strong><small>QRvote</small></div>
      <div className="bss-audience-actions">
        <button type="button" onClick={maximize} title={en?'Expand original screen':'Phóng to màn hình gốc'} aria-label={en?'Expand QRvote screen':'Phóng to màn hình QRvote'}><Maximize2 size={15}/></button>
        <a href={HALLOWEEN_QRVOTE_SCREEN} target="_blank" rel="noopener noreferrer" aria-label={en?'Open original QRvote scoreboard in new tab':'Mở màn hình QRvote gốc trong tab mới'}><ExternalLink size={15}/><span>{en?'Original screen':'Mở màn hình gốc'}</span></a>
      </div>
    </header>
    <div className="bss-audience-viewport" ref={viewportRef} style={fullscreen?undefined:{height:frameHeight+'px'}}>
      <iframe
        title={en?'QRvote Halloween Showcase 2026 live voting screen':'Màn hình bình chọn QRvote Halloween Showcase 2026'}
        src={HALLOWEEN_QRVOTE_SCREEN}
        loading="eager"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        style={{width:DESKTOP_WIDTH+'px',height:DESKTOP_HEIGHT+'px',transform:'scale('+scale+')'}}
      />
    </div>
    <div className="bss-audience-foot">
      <MonitorPlay size={14} aria-hidden="true"/>
      <span>{en
        ? 'Live third-party screen, unchanged. If embedding is blocked, open the original.'
        : 'Màn hình QRvote gốc, không chỉnh sửa. Nếu bị chặn nhúng, mở liên kết gốc.'}</span>
      <a href={HALLOWEEN_QRVOTE_SCREEN} target="_blank" rel="noopener noreferrer">{en?'Open QRvote':'Mở QRvote'} <ExternalLink size={12}/></a>
    </div>
  </section>;
}
export default memo(PhotoAudienceLive);
