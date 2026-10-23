import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Eye, Image, MonitorPlay, Paintbrush, RotateCcw, Save, UploadCloud, X } from 'lucide-react';
import { uploadHomeHeroMedia } from '../utils/homepageHeroCms.js';
import {
  DEFAULT_GRADEBOOK_HERO, normalizeGradebookHero, publishGradebookHero, saveGradebookHeroDraft,
} from '../utils/gradebookHeroCms.js';
import './DashboardHeroEditor.css';

const TABS = [
  ['background', Image, 'Hình nền'],
  ['appearance', Paintbrush, 'Hiển thị'],
];

function NumberSlider({ label, value, onChange, min = 0, max = 100, unit = '%' }) {
  return <label className="db-he-field"><span>{label}<output>{value}{unit}</output></span>
    <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </label>;
}
function Input({ label, value, onChange, multiline = false, placeholder = '' }) {
  return <label className="db-he-field"><span>{label}</span>
    {multiline
      ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} maxLength={600} placeholder={placeholder}/>
      : <input type="text" value={value} onChange={(e) => onChange(e.target.value)} maxLength={2000} placeholder={placeholder}/>}
  </label>;
}

export default function GradebookHeroEditor({ open, initialConfig, currentUser, language = 'vi', onClose, onPreview, onPublished }) {
  const vi = language !== 'en';
  const [tab, setTab] = useState('background');
  const [config, setConfig] = useState(() => normalizeGradebookHero(initialConfig));
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const savedRef = useRef(normalizeGradebookHero(initialConfig));
  const fileRef = useRef(null);
  const sheetRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const value = normalizeGradebookHero(initialConfig);
    setConfig(value);
    savedRef.current = value;
    setNotice(null);
    setTab('background');
  }, [open, initialConfig]);

  useEffect(() => {
    if (open) onPreview?.(normalizeGradebookHero(config));
  }, [config, open, onPreview]);

  const set = (key, value) => setConfig((previous) => ({ ...previous, [key]: value }));
  const close = () => {
    if (busy) return;
    if (JSON.stringify(normalizeGradebookHero(config)) !== JSON.stringify(savedRef.current)
      && !window.confirm('Bạn có thay đổi chưa lưu. Đóng và bỏ các thay đổi này?')) return;
    onPreview?.(null);
    onClose?.();
  };
  onCloseRef.current = close;

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const previousFocus = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
      }
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const elements = Array.from(sheetRef.current.querySelectorAll(
        'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])',
      )).filter((el) => el.getClientRects().length && el.getAttribute('type') !== 'hidden');
      if (!elements.length) return;
      if (event.shiftKey && document.activeElement === elements[0]) {
        event.preventDefault();
        elements.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === elements.at(-1)) {
        event.preventDefault();
        elements[0].focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
      previousFocus?.focus?.();
    };
  }, [open]);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('upload');
    setNotice(null);
    try {
      const media = await uploadHomeHeroMedia(file, currentUser);
      setConfig((previous) => ({
        ...previous,
        backgroundUrl: media.url,
        backgroundType: media.type,
        opacity: 100,
      }));
      setNotice({ tone: media.temporary ? 'warning' : 'success', text: media.temporary
        ? 'Tệp chỉ được xem trước tạm thời. Không thể công bố khi chưa tải lên Storage.'
        : 'Đã tải nền thành công. Hãy nhấn Công bố để áp dụng cho giáo viên.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error?.message || 'Không thể tải ảnh/video.' });
    } finally {
      setBusy('');
    }
  };

  const commit = async (publish) => {
    setBusy(publish ? 'publish' : 'draft');
    setNotice(null);
    try {
      const result = publish
        ? await publishGradebookHero(config, currentUser)
        : await saveGradebookHeroDraft(config, currentUser);
      savedRef.current = result;
      setConfig(result);
      if (publish) onPublished?.(result);
      setNotice({ tone: 'success', text: publish
        ? 'Đã công bố nền Sổ điểm cho mọi giáo viên. Hero Dashboard và Trang chủ không thay đổi.'
        : 'Đã lưu bản nháp. Nội dung này chưa được công bố cho các giáo viên.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error?.message || 'Không thể lưu cấu hình Hero Sổ điểm.' });
    } finally {
      setBusy('');
    }
  };

  if (!open || typeof document === 'undefined') return null;
  const hasMedia = config.backgroundType !== 'none' && Boolean(config.backgroundUrl);
  return createPortal(
    <div className="db-he-backdrop" role="dialog" aria-modal="true" aria-label={vi ? 'Chỉnh sửa Hero Sổ điểm' : 'Edit Gradebook Hero'} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="db-he-sheet" ref={sheetRef}>
        <header className="db-he-head">
          <div className="db-he-heading">
            <span className="db-he-logo"><MonitorPlay size={22}/></span>
            <div><small>GRADEBOOK / HERO STUDIO</small><h2>{vi ? 'Chỉnh sửa Hero' : 'Edit Gradebook Hero'}</h2><p>{vi ? 'Nền Sổ điểm riêng · Không ảnh hưởng Dashboard' : 'Separate from Dashboard and Homepage'}</p></div>
          </div>
          <button ref={closeRef} type="button" className="db-he-close" disabled={Boolean(busy)} onClick={close} aria-label={vi ? 'Đóng' : 'Close'}><X size={19}/></button>
        </header>
        <nav className="db-he-tabs" aria-label={vi ? 'Các nhóm chỉnh sửa Hero' : 'Hero editor tabs'}>
          {TABS.map(([id, Icon, title]) => <button key={id} type="button" className={tab === id ? 'is-active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><Icon size={17}/>{title}</button>)}
        </nav>
        <main className="db-he-body">
          <div className="db-he-preview">
            <div className="db-he-preview-title"><Eye size={17}/><strong>{vi ? 'Xem trước nền đang chọn' : 'Background preview'}</strong><small>{hasMedia ? (config.backgroundType === 'video' ? 'VIDEO' : 'IMAGE') : 'DEFAULT'}</small></div>
            <div className="db-he-preview-stage">
              {hasMedia && config.backgroundType === 'video'
                ? <video src={config.backgroundUrl} autoPlay loop muted playsInline preload="metadata" style={{ objectFit: config.backgroundFit, objectPosition: `${config.positionX}% ${config.positionY}%`, opacity: config.opacity / 100 }} />
                : hasMedia ? <img alt="" src={config.backgroundUrl} style={{ objectFit: config.backgroundFit, objectPosition: `${config.positionX}% ${config.positionY}%`, opacity: config.opacity / 100 }}/> : <span><Image size={26}/><small>{vi ? 'Đang dùng nền mặc định' : 'Using the default background'}</small></span>}
              <div className="db-he-preview-wash" style={{ opacity: config.shade / 100 }}/>
            </div>
            <small className="db-he-preview-note">{vi ? 'Hero Sổ điểm sẽ thay đổi tức thời trong lúc bạn chỉnh sửa.' : 'The actual gradebook hero updates while you edit.'}</small>
          </div>

          {tab === 'background' ? <section className="db-he-section">
            <h3>{vi ? 'Ảnh hoặc video nền' : 'Background image or video'}</h3>
            <p>{vi ? 'Chọn ảnh 16:9 hoặc video ngắn. Tệp tải lên được tối ưu và quản lý riêng.' : 'Use a wide image or short video.'}</p>
            <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif,image/apng,video/mp4,video/webm" onChange={upload}/>
            <button className="db-he-upload" type="button" disabled={Boolean(busy)} onClick={() => fileRef.current?.click()}><UploadCloud size={23}/><span><strong>{busy === 'upload' ? 'Đang tải…' : 'Chọn ảnh / GIF / video'}</strong><small>JPG, PNG, WebP, GIF, MP4, WebM · tối đa 25 MB</small></span></button>
            <Input label={vi ? 'Hoặc nhập URL ảnh/video (HTTPS)' : 'Or provide media HTTPS URL'} value={config.backgroundUrl} placeholder="https://..." onChange={(value) => { set('backgroundUrl', value); setConfig((prev) => ({ ...prev, backgroundUrl: value, backgroundType: value ? (prev.backgroundType === 'none' ? 'image' : prev.backgroundType) : 'none' })); }}/>
            <div className="db-he-two">
              <label className="db-he-field"><span>{vi ? 'Định dạng' : 'Media type'}</span><select value={config.backgroundType} onChange={(e) => set('backgroundType', e.target.value)}><option value="none">Không có nền</option><option value="image">Ảnh</option><option value="gif">Ảnh động</option><option value="video">Video</option></select></label>
              <label className="db-he-field"><span>{vi ? 'Cách phủ ảnh' : 'Image fit'}</span><select value={config.backgroundFit} onChange={(e) => set('backgroundFit', e.target.value)}><option value="cover">Phủ kín</option><option value="contain">Hiển thị toàn bộ</option></select></label>
            </div>
            <NumberSlider label="Vị trí ngang" value={config.positionX} onChange={(v) => set('positionX', v)}/>
            <NumberSlider label="Vị trí dọc" value={config.positionY} onChange={(v) => set('positionY', v)}/>
            <NumberSlider label="Độ rõ hình nền" value={config.opacity} onChange={(v) => set('opacity', v)}/>
            <button type="button" className="db-he-remove" onClick={() => setConfig((prev) => ({ ...prev, backgroundUrl: '', backgroundType: 'none' }))}>Xóa nền tùy chỉnh</button>
          </section> : null}

          {tab === 'appearance' ? <section className="db-he-section">
            <h3>{vi ? 'Độ tương phản & kiểu chữ' : 'Contrast & typography'}</h3>
            <p>{vi ? 'Giữ tiêu đề, bộ chọn lớp và các nút thao tác dễ đọc trên mọi hình nền.' : 'Keep gradebook selectors and actions legible over the chosen background.'}</p>
            <NumberSlider label={vi ? 'Lớp bảo vệ nội dung' : 'Content protection'} value={config.shade} onChange={(v) => set('shade', v)} max={80}/>
            <label className="db-he-field"><span>{vi ? 'Màu tiêu đề Sổ điểm' : 'Gradebook heading color'}</span><div className="db-he-color"><input type="color" value={config.headingColor} onChange={(e) => set('headingColor', e.target.value)}/><code>{config.headingColor}</code></div></label>
            <div className="db-he-info">{vi ? 'Mọi bộ chọn lớp, học kỳ và nút thao tác vẫn nằm bên trái. Nền chỉ trang trí, không che vùng thao tác.' : 'Interactive gradebook controls stay on the left. The background does not cover them.'}</div>
          </section> : null}
        </main>
        <footer className="db-he-footer">
          <div className={`db-he-notice ${notice ? 'is-' + notice.tone : ''}`} role="status">
            {notice?.text || 'Bản nháp không hiển thị với giáo viên cho đến khi công bố.'}
          </div>
          <div className="db-he-actions">
            <button type="button" className="db-he-reset" disabled={Boolean(busy)} onClick={() => { if (window.confirm('Khôi phục nội dung Hero Sổ điểm về mặc định trong bản chỉnh sửa?')) setConfig(normalizeGradebookHero(DEFAULT_GRADEBOOK_HERO)); }} title="Khôi phục mặc định"><RotateCcw size={17}/><span>Đặt lại</span></button>
            <button type="button" className="db-he-draft" disabled={Boolean(busy)} onClick={() => commit(false)}><Save size={16}/>{busy === 'draft' ? 'Đang lưu…' : 'Lưu nháp'}</button>
            <button type="button" className="db-he-publish" disabled={Boolean(busy)} onClick={() => commit(true)}><Check size={17}/>{busy === 'publish' ? 'Đang công bố…' : 'Công bố'}</button>
          </div>
        </footer>
      </div>
    </div>, document.body,
  );
}
