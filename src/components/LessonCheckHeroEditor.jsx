import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check, Eye, Image, ImagePlus, RotateCcw, Save, ShieldCheck, UploadCloud, X,
} from 'lucide-react';
import {
  DEFAULT_LESSON_CHECK_HERO, normalizeLessonCheckHero, publishLessonCheckHero,
  saveLessonCheckHeroDraft, uploadLessonCheckHeroMedia,
} from '../utils/lessonCheckHeroCms.js';
import './LessonCheckHeroEditor.css';

function Slider({title,value,onChange,min=0,max=100}) {
  return <label className="lch-field">
    <span>{title}<output>{value}%</output></span>
    <input type="range" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))}/>
  </label>;
}
export default function LessonCheckHeroEditor({
  open, initialConfig, currentUser, language='vi', onClose, onPreview, onPublished,
}) {
  const vi = language !== 'en';
  const [config,setConfig] = useState(() => normalizeLessonCheckHero(initialConfig));
  const [busy,setBusy] = useState('');
  const [message,setMessage] = useState(null);
  const saved = useRef(normalizeLessonCheckHero(initialConfig));
  const fileRef = useRef(null);
  const sheetRef = useRef(null);
  const closeButton = useRef(null);
  const closeAction = useRef(null);
  const set = (key,value) => setConfig((old) => ({...old,[key]:value}));
  const close = () => {
    if(busy) return;
    if(JSON.stringify(normalizeLessonCheckHero(config)) !== JSON.stringify(saved.current)
      && !window.confirm(vi ? 'Bỏ các chỉnh sửa chưa lưu?' : 'Discard unsaved changes?')) return;
    onPreview?.(null);
    onClose?.();
  };
  closeAction.current = close;
  useEffect(() => {
    if(!open) return;
    const value = normalizeLessonCheckHero(initialConfig);
    setConfig(value);
    saved.current=value;
    setMessage(null);
  },[open,initialConfig]);
  useEffect(() => {
    if(open) onPreview?.(normalizeLessonCheckHero(config));
  },[config,open,onPreview]);
  useEffect(() => {
    if(!open) return undefined;
    const lastFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow='hidden';
    const frame = requestAnimationFrame(() => closeButton.current?.focus());
    const keyDown = (event) => {
      if(event.key==='Escape'){event.preventDefault();closeAction.current?.();return;}
      if(event.key!=='Tab' || !sheetRef.current) return;
      const controls=Array.from(sheetRef.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])'))
        .filter((node) => node.getClientRects().length && node.type!=='hidden');
      if(!controls.length) return;
      if(event.shiftKey && document.activeElement===controls[0]){
        event.preventDefault();controls[controls.length-1].focus();
      } else if(!event.shiftKey && document.activeElement===controls[controls.length-1]){
        event.preventDefault();controls[0].focus();
      }
    };
    document.addEventListener('keydown',keyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown',keyDown);
      document.body.style.overflow=overflow;
      lastFocus?.focus?.();
    };
  },[open]);
  const upload = async (event) => {
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file) return;
    setBusy('upload');setMessage(null);
    try {
      const result=await uploadLessonCheckHeroMedia(file,currentUser);
      setConfig((old) => ({...old,...result,opacity:100}));
      setMessage({type:'success',text:vi?'Đã tải ảnh nền riêng của Kiểm tra. Nhấn Công bố để áp dụng.':'Uploaded to the Assessment-only media bucket. Publish to apply.'});
    }catch(error){setMessage({type:'error',text:error?.message||(vi?'Không tải được ảnh.':'Could not upload media.')});}
    finally{setBusy('');}
  };
  const commit = async (publish) => {
    if(busy) return;
    setBusy(publish?'publish':'draft');setMessage(null);
    try{
      const next=publish
        ? await publishLessonCheckHero(config,currentUser)
        : await saveLessonCheckHeroDraft(config,currentUser);
      saved.current=next;
      setConfig(next);
      if(publish) onPublished?.(next);
      setMessage({type:'success',text:publish
        ? (vi?'Đã công bố Hero Kiểm tra. Dashboard và Trang chủ không thay đổi.':'Assessment hero published independently.')
        : (vi?'Đã lưu nháp riêng; giáo viên vẫn thấy bản đang công bố.':'Private draft saved; published version unchanged.')});
    }catch(error){setMessage({type:'error',text:error?.message||(vi?'Không lưu được cấu hình.':'Could not save settings.')});}
    finally{setBusy('');}
  };
  if(!open || typeof document==='undefined') return null;
  const hasMedia=config.backgroundType!=='none'&&Boolean(config.backgroundUrl);
  return createPortal(<div className="lch-editor-overlay" role="presentation" onMouseDown={(event) => {
    if(event.target===event.currentTarget) close();
  }}>
    <section className="lch-editor" ref={sheetRef} role="dialog" aria-modal="true"
      aria-label={vi?'Chỉnh sửa Hero Kiểm tra':'Edit Assessment Hero'}>
      <header className="lch-editor-head">
        <span className="lch-editor-mark"><ImagePlus size={22}/></span>
        <div><small>ASSESSMENT / HERO STUDIO</small>
          <h2>{vi?'Chỉnh sửa nền Hero':'Customize Hero background'}</h2>
          <p>{vi?'Chỉ áp dụng cho phân hệ Kiểm tra · Hoàn toàn độc lập':'Assessment only · Independent from other pages'}</p>
        </div>
        <button ref={closeButton} type="button" className="lch-editor-close" onClick={close}
          disabled={Boolean(busy)} aria-label={vi?'Đóng':'Close'}><X size={20}/></button>
      </header>
      <main className="lch-editor-body">
        <div className="lch-editor-preview">
          <strong><Eye size={17}/>{vi?'Xem trước ảnh nền':'Background preview'}</strong>
          <div className="lch-editor-stage">
            {hasMedia ? config.backgroundType==='video'
              ? <video src={config.backgroundUrl} autoPlay loop muted playsInline
                  style={{objectFit:config.backgroundFit,objectPosition:config.positionX+'% '+config.positionY+'%',opacity:config.opacity/100}}/>
              : <img src={config.backgroundUrl} alt="" style={{objectFit:config.backgroundFit,
                  objectPosition:config.positionX+'% '+config.positionY+'%',opacity:config.opacity/100}}/>
              : <span><Image size={29}/>{vi?'Đang dùng nền mặc định':'Using default background'}</span>}
            <div className="lch-editor-stage-wash" style={{opacity:config.leftProtection/100}}/>
          </div>
          <small>{vi?'Chỉnh sửa được xem trước trực tiếp trên Hero Kiểm tra, chưa ảnh hưởng người khác cho đến khi công bố.':'Live preview is local until you publish.'}</small>
        </div>
        <section className="lch-editor-section">
          <h3>{vi?'Ảnh hoặc video nền':'Background image or video'}</h3>
          <p>{vi?'Ưu tiên ảnh ngang 16:9. Tệp được lưu ở kho riêng của ứng dụng Kiểm tra.':'Upload a widescreen image or a short video.'}</p>
          <input ref={fileRef} type="file" hidden
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            onChange={upload}/>
          <button type="button" className="lch-editor-upload" disabled={Boolean(busy)}
            onClick={() => fileRef.current?.click()}>
            <UploadCloud size={22}/><span><strong>{busy==='upload'?(vi?'Đang tải…':'Uploading…'):vi?'Tải ảnh / GIF / video':'Upload image / GIF / video'}</strong>
            <small>JPG · PNG · WebP · GIF · MP4 · WebM · 25 MB</small></span>
          </button>
          <label className="lch-field"><span>{vi?'Hoặc dán URL HTTPS':'Or paste an HTTPS URL'}</span>
            <input type="url" value={config.backgroundUrl} placeholder="https://..."
              onChange={(event) => {
                const url=event.target.value;
                setConfig((old) => ({...old,backgroundUrl:url,
                  backgroundType:url?(old.backgroundType==='none'?'image':old.backgroundType):'none'}));
              }}/></label>
          <div className="lch-editor-two">
            <label className="lch-field"><span>{vi?'Định dạng':'Media type'}</span>
              <select value={config.backgroundType} onChange={(event)=>set('backgroundType',event.target.value)}>
                <option value="none">{vi?'Không có nền':'No background'}</option><option value="image">{vi?'Ảnh':'Image'}</option>
                <option value="gif">GIF</option><option value="video">Video</option>
              </select></label>
            <label className="lch-field"><span>{vi?'Cách phủ ảnh':'Image fit'}</span>
              <select value={config.backgroundFit} onChange={(event)=>set('backgroundFit',event.target.value)}>
                <option value="cover">{vi?'Phủ kín':'Cover'}</option><option value="contain">{vi?'Hiện toàn bộ':'Contain'}</option>
              </select></label>
          </div>
          <Slider title={vi?'Vị trí ngang':'Horizontal position'} value={config.positionX} onChange={(v)=>set('positionX',v)}/>
          <Slider title={vi?'Vị trí dọc':'Vertical position'} value={config.positionY} onChange={(v)=>set('positionY',v)}/>
          <Slider title={vi?'Độ rõ ảnh nền':'Image opacity'} value={config.opacity} min={20} onChange={(v)=>set('opacity',v)}/>
          <Slider title={vi?'Độ sáng bảo vệ chữ bên trái':'Left text protection'} value={config.leftProtection} min={25} onChange={(v)=>set('leftProtection',v)}/>
          <label className="lch-editor-check">
            <input type="checkbox" checked={config.showMascot} onChange={(event)=>set('showMascot',event.target.checked)}/>
            <span>{vi?'Hiển thị robot minh họa khi sử dụng nền tùy chỉnh':'Show robot artwork over custom background'}</span>
          </label>
          <button type="button" className="lch-editor-reset-image" disabled={Boolean(busy)}
            onClick={() => setConfig((old)=>({...old,backgroundUrl:'',backgroundType:'none',showMascot:true}))}>
            <RotateCcw size={16}/>{vi?'Xóa nền tùy chỉnh':'Remove custom background'}
          </button>
        </section>
      </main>
      <footer className="lch-editor-footer">
        <div className={'lch-editor-notice'+(message?' is-'+message.type:'')} role="status">
          {message?.text || (vi?'Bản nháp và bản công bố chỉ thuộc Hero Kiểm tra.':'Draft and published versions are Assessment-only.')}
        </div>
        <div className="lch-editor-actions">
          <button type="button" className="lch-editor-restore" disabled={Boolean(busy)}
            onClick={() => {if(window.confirm(vi?'Khôi phục thiết kế nền mặc định?':'Restore defaults?'))setConfig(normalizeLessonCheckHero(DEFAULT_LESSON_CHECK_HERO));}}>
            <RotateCcw size={16}/>{vi?'Mặc định':'Default'}
          </button>
          <button type="button" disabled={Boolean(busy)} onClick={()=>commit(false)}>
            <Save size={16}/>{busy==='draft'?(vi?'Đang lưu…':'Saving…'):vi?'Lưu nháp':'Save draft'}
          </button>
          <button type="button" className="lch-editor-publish" disabled={Boolean(busy)} onClick={()=>commit(true)}>
            <Check size={17}/>{busy==='publish'?(vi?'Đang công bố…':'Publishing…'):vi?'Công bố':'Publish'}
          </button>
        </div>
      </footer>
    </section>
  </div>,document.body);
}
