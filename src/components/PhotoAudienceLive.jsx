import React, { memo, useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, Link2, Maximize2, MonitorPlay, Save, Settings2, X } from 'lucide-react';
import { supabase } from '../utils/supabase.js';
import { DEFAULT_HALLOWEEN_SCREEN, HALLOWEEN_ALBUM_ID, normalizeAudienceScreenUrl } from '../utils/photoAudienceScreen.js';
import './PhotoAudienceLive.css';

// QRvote's native desktop screen requires a wide inner browsing context.
// Explicit <iframe> width/height attributes AND a max-width override are
// essential: BRIAN's responsive rules can otherwise clamp an iframe to its
// narrow 16:9 parent and make QRvote switch to its mobile one-column layout.
export const QRVOTE_DESKTOP_WIDTH=1920;
export const QRVOTE_DESKTOP_HEIGHT=1080;

function PhotoAudienceLive({ language='vi',albumId,screenUrl='',canEdit=false,onSaved,compact=false }) {
  const en=language==='en';
  const suggested=albumId===HALLOWEEN_ALBUM_ID?DEFAULT_HALLOWEEN_SCREEN:'';
  const initial=screenUrl || suggested;
  const viewportRef=useRef(null);
  const [draft,setDraft]=useState(initial);
  const [currentUrl,setCurrentUrl]=useState(initial);
  const [width,setWidth]=useState(560);
  const [height,setHeight]=useState(400);
  const [showConfig,setShowConfig]=useState(false);
  const [isFull,setIsFull]=useState(false);
  const [saving,setSaving]=useState(false);
  const [feedback,setFeedback]=useState('');

  useEffect(()=>{
    const next=screenUrl || (albumId===HALLOWEEN_ALBUM_ID?DEFAULT_HALLOWEEN_SCREEN:'');
    setDraft(next);setCurrentUrl(next);
  },[albumId,screenUrl]);

  useEffect(()=>{
    const node=viewportRef.current;
    if(!node)return undefined;
    const measure=()=>{
      const rect=node.getBoundingClientRect();
      const nextWidth=Math.max(1,Math.round(rect.width));
      const nextHeight=Math.max(1,Math.round(rect.height));
      setWidth(current=>current===nextWidth?current:nextWidth);
      setHeight(current=>current===nextHeight?current:nextHeight);
    };
    measure();
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;
    observer?.observe(node);
    window.addEventListener('resize',measure);
    const onFull=()=>{setIsFull(document.fullscreenElement===node);measure();};
    document.addEventListener('fullscreenchange',onFull);
    return()=>{
      observer?.disconnect();
      window.removeEventListener('resize',measure);
      document.removeEventListener('fullscreenchange',onFull);
    };
  },[currentUrl]);

  // Preserve 100% of the original QRvote screen. Cropping a cross-origin
  // layout is unreliable because QRvote controls its own responsive breakpoints.
  const scale=(compact || isFull)
    ? Math.min(width/QRVOTE_DESKTOP_WIDTH,height/QRVOTE_DESKTOP_HEIGHT)
    : width/QRVOTE_DESKTOP_WIDTH;
  const frameHeight=Math.round(QRVOTE_DESKTOP_HEIGHT*scale);

  const save=async event=>{
    event.preventDefault();
    if(!canEdit||saving||!albumId)return;
    let normalized;
    try{normalized=normalizeAudienceScreenUrl(draft);}
    catch(error){setFeedback(error.message);return;}
    setSaving(true);setFeedback('');
    try{
      const result=await supabase.from('bes_slideshow_albums')
        .update({audience_screen_url:normalized,updated_at:new Date().toISOString()})
        .eq('id',albumId)
        .select('id,audience_screen_url')
        .single();
      if(result.error)throw result.error;
      setCurrentUrl(result.data.audience_screen_url);
      setDraft(result.data.audience_screen_url);
      setFeedback(en?'Screen link saved for all viewers.':'Đã lưu link cho tất cả người xem.');
      if(compact)setShowConfig(false);
      await onSaved?.();
    }catch(error){setFeedback((en?'Could not save: ':'Không thể lưu: ')+(error.message||String(error)));}
    finally{setSaving(false);}
  };

  const maximize=async()=>{
    try{
      if(document.fullscreenElement===viewportRef.current)await document.exitFullscreen();
      else await viewportRef.current?.requestFullscreen?.();
    }catch{
      if(currentUrl)window.open(currentUrl,'_blank','noopener,noreferrer');
    }
  };

  return <section className={'bss-audience-panel'+(compact?' bss-audience-panel--compact':'')} aria-label={en?'Live audience voting screen':'Khung bình chọn khán giả trực tiếp'}>
    <header className="bss-audience-heading">
      <div className="bss-audience-title">
        <span className="bss-audience-pulse"/>
        <strong>{en?'LIVE · AUDIENCE VOTING':'LIVE · BÌNH CHỌN KHÁN GIẢ'}</strong>
        <small>QRvote</small>
      </div>
      <div className="bss-audience-actions">
        {canEdit && compact && <button type="button" onClick={()=>setShowConfig(v=>!v)}
          title={en?'Configure QRvote link':'Dán link QRvote'} aria-label={en?'Configure QRvote link':'Cấu hình QRvote'} aria-expanded={showConfig}>
          {showConfig?<X size={15}/>:<Settings2 size={15}/>}
        </button>}
        {currentUrl&&<button type="button" onClick={maximize} title={en?'Expand screen':'Phóng to màn hình'} aria-label={en?'Expand QRvote screen':'Phóng to màn hình QRvote'}><Maximize2 size={15}/></button>}
        {currentUrl&&<a href={currentUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/><span>{en?'Original screen':'Mở QRvote'}</span></a>}
      </div>
    </header>
    {canEdit&&(!compact||showConfig)&&<form className="bss-audience-config" onSubmit={save}>
      <label htmlFor={'bss-audience-url-'+albumId}>
        <Link2 size={14}/>{en?'Paste the QRvote link here':'Dán link Live View khán giả tại đây'}
      </label>
      <div className="bss-audience-config-row">
        <input id={'bss-audience-url-'+albumId} type="text" inputMode="url" spellCheck={false}
          placeholder="https://qrvote.org/c/.../screen" value={draft}
          onChange={event=>{setDraft(event.target.value);setFeedback('');}}
          aria-label={en?'QRvote screen URL':'Liên kết màn hình bình chọn QRvote'}/>
        <button type="submit" disabled={saving||!draft.trim()}><Save size={14}/>{saving?(en?'Saving…':'Đang lưu…'):(en?'Save & display':'Lưu & hiển thị')}</button>
      </div>
      {feedback&&<p role="status" className="bss-audience-feedback"><Check size={13}/>{feedback}</p>}
    </form>}

    {currentUrl?<div className="bss-audience-viewport" ref={viewportRef} style={compact||isFull?undefined:{height:frameHeight+'px'}}>
      <div className="bss-audience-framed" style={{
        width:Math.round(QRVOTE_DESKTOP_WIDTH*scale)+'px',
        height:Math.round(QRVOTE_DESKTOP_HEIGHT*scale)+'px'
      }}>
        <iframe title={en?'Original QRvote desktop voting results':'Màn hình kết quả QRvote bản PC gốc'}
          src={currentUrl} loading="eager" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
          width={QRVOTE_DESKTOP_WIDTH} height={QRVOTE_DESKTOP_HEIGHT}
          style={{
            width:QRVOTE_DESKTOP_WIDTH+'px',
            minWidth:QRVOTE_DESKTOP_WIDTH+'px',
            maxWidth:'none',
            height:QRVOTE_DESKTOP_HEIGHT+'px',
            minHeight:QRVOTE_DESKTOP_HEIGHT+'px',
            maxHeight:'none',
            position:'absolute',
            left:0,top:0,
            display:'block',
            transformOrigin:'top left',
            transform:'scale('+scale+')'
          }}/>
      </div>
    </div>:<div className="bss-audience-placeholder" role="status">
      <MonitorPlay size={29}/>
      <strong>{en?'Audience screen is ready':'Đã tạo khung Live View khán giả'}</strong>
      <span>{en?'The admin can paste and save a QRvote link above.':'Admin dán link QRvote vào ô phía trên rồi nhấn Lưu & hiển thị.'}</span>
    </div>}
    <div className="bss-audience-foot">
      <MonitorPlay size={14} aria-hidden="true"/>
      <span>{en?'QRvote retains control. If embedding is blocked, use Open QRvote.':'QRvote kiểm soát việc nhúng. Nếu khung trắng hoặc bị chặn, hãy nhấn Mở QRvote.'}</span>
      {currentUrl&&<a href={currentUrl} target="_blank" rel="noopener noreferrer">{en?'Open original':'Màn hình gốc'} <ExternalLink size={12}/></a>}
    </div>
  </section>;
}
export default memo(PhotoAudienceLive);
