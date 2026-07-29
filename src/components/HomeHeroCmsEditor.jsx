import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CloudUpload,
  Eye,
  FileImage,
  Image as ImageIcon,
  LayoutTemplate,
  Monitor,
  Palette,
  Play,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Tablet,
  Type,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  DEFAULT_HOME_HERO_CONFIG,
  normalizeHomeHeroConfig,
  publishHomeHero,
  saveHomeHeroDraft,
  uploadHomeHeroMedia,
} from '../utils/homepageHeroCms.js';

const TABS = [
  ['content', Type, 'Nội dung'],
  ['buttons', Sparkles, 'Nút hành động'],
  ['info', LayoutTemplate, 'Thẻ thông tin'],
  ['background', ImageIcon, 'Nền'],
  ['overlay', Palette, 'Lớp phủ & bố cục'],
];

const ICON_OPTIONS = [
  ['shield', 'Khiên'],
  ['cloud', 'Đám mây'],
  ['users', 'Người dùng'],
  ['book', 'Sách'],
  ['star', 'Ngôi sao'],
  ['clock', 'Đồng hồ'],
  ['none', 'Không icon'],
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function Field({ label, hint, children, wide = false }) {
  return (
    <label className={`hero-editor__field${wide ? ' is-wide' : ''}`}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="hero-editor__toggle">
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
      <i><b /></i>
      <span><strong>{label}</strong>{hint ? <small>{hint}</small> : null}</span>
    </label>
  );
}

function RangeField({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return (
    <Field label={label}>
      <div className="hero-editor__range">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <output>{value}{suffix}</output>
      </div>
    </Field>
  );
}

function ColorField({ label, value, onChange }) {
  const fallback = /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#1a73e8';
  return (
    <Field label={label}>
      <div className="hero-editor__color">
        <input type="color" value={fallback} onChange={(event) => onChange(event.target.value)} />
        <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </Field>
  );
}

function LanguageColumns({ children }) {
  return <div className="hero-editor__languages">{children}</div>;
}

function PreviewDevice({ value, active, icon: Icon, label, onClick }) {
  return (
    <button type="button" className={active ? 'is-active' : ''} onClick={() => onClick(value)} title={label}>
      <Icon size={16} /><span>{label}</span>
    </button>
  );
}

function sanitizeMessage(error) {
  const message = String(error?.message || error || 'Có lỗi xảy ra.');
  if (/row-level security/i.test(message)) return 'Tài khoản hiện tại chưa được cấp quyền cập nhật Hero trong Supabase.';
  if (/bucket/i.test(message) && /not found/i.test(message)) return 'Chưa có Storage bucket cho Hero. Cần chạy bản nâng cấp Supabase đi kèm.';
  return message;
}

export default function HomeHeroCmsEditor({
  open,
  currentUser,
  language = 'vi',
  initialConfig,
  databaseReady = false,
  onClose,
  onPreview,
  onPublished,
}) {
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('content');
  const [device, setDevice] = useState('desktop');
  const [config, setConfig] = useState(() => normalizeHomeHeroConfig(initialConfig));
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!open) return;
    setConfig(normalizeHomeHeroConfig(initialConfig));
    setMessage(null);
    setTab('content');
  }, [open, initialConfig]);

  useEffect(() => {
    if (!open) return;
    onPreview?.(normalizeHomeHeroConfig(config), device);
  }, [config, device, onPreview, open]);

  const update = (path, value) => {
    setConfig((previous) => {
      const next = clone(previous);
      const parts = path.split('.');
      let cursor = next;
      parts.slice(0, -1).forEach((part) => {
        if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
        cursor = cursor[part];
      });
      cursor[parts.at(-1)] = value;
      return next;
    });
  };

  const updateButton = (index, key, value) => {
    setConfig((previous) => {
      const next = clone(previous);
      next.buttons[index] = { ...next.buttons[index], [key]: value };
      return next;
    });
  };

  const updateInfoItem = (index, key, value) => {
    setConfig((previous) => {
      const next = clone(previous);
      next.infoItems[index] = { ...next.infoItems[index], [key]: value };
      return next;
    });
  };

  const addInfoItem = () => {
    setConfig((previous) => {
      if (previous.infoItems.length >= 4) return previous;
      const next = clone(previous);
      const index = next.infoItems.length + 1;
      next.infoItems.push({
        id: `info-${Date.now()}`,
        enabled: true,
        icon: 'star',
        titleVi: `Thông tin ${index}`,
        titleEn: `Information ${index}`,
        textVi: 'Mô tả ngắn',
        textEn: 'Short description',
        color: '#1a73e8',
      });
      return next;
    });
  };

  const removeInfoItem = (index) => {
    setConfig((previous) => {
      const next = clone(previous);
      next.infoItems.splice(index, 1);
      return next;
    });
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('upload');
    setMessage(null);
    try {
      const result = await uploadHomeHeroMedia(file, currentUser);
      setConfig((previous) => ({
        ...previous,
        background: {
          ...previous.background,
          type: result.type,
          url: result.url,
          mimeType: result.mimeType,
          fileName: result.fileName,
          opacity: 100,
        },
      }));
      setMessage({ tone: result.temporary ? 'warning' : 'success', text: result.temporary
        ? 'Đã tải để xem trước. Cần nâng cấp Supabase để tệp được chia sẻ cho mọi người.'
        : 'Đã tải tệp nền lên hệ thống.' });
    } catch (error) {
      setMessage({ tone: 'error', text: sanitizeMessage(error) });
    } finally {
      setBusy('');
    }
  };

  const handleSaveDraft = async () => {
    setBusy('draft');
    setMessage(null);
    try {
      const result = await saveHomeHeroDraft(config, currentUser);
      setMessage({
        tone: result.databaseReady ? 'success' : 'warning',
        text: result.databaseReady ? 'Đã lưu bản nháp lên Supabase.' : 'Đã lưu bản nháp trên trình duyệt. Cần chạy SQL nâng cấp để chia sẻ giữa các thiết bị.',
      });
    } catch (error) {
      setMessage({ tone: 'error', text: sanitizeMessage(error) });
    } finally {
      setBusy('');
    }
  };

  const handlePublish = async () => {
    setBusy('publish');
    setMessage(null);
    try {
      const result = await publishHomeHero(config, currentUser);
      const normalized = normalizeHomeHeroConfig(config);
      onPublished?.(normalized);
      setMessage({
        tone: result.databaseReady ? 'success' : 'warning',
        text: result.databaseReady ? 'Hero mới đã được công bố.' : 'Hero đã được áp dụng trên trình duyệt này. Cần chạy SQL nâng cấp để công bố cho mọi người.',
      });
    } catch (error) {
      setMessage({ tone: 'error', text: sanitizeMessage(error) });
    } finally {
      setBusy('');
    }
  };

  const resetDefault = () => {
    if (!window.confirm('Khôi phục toàn bộ nội dung Hero về mặc định?')) return;
    setConfig(normalizeHomeHeroConfig(DEFAULT_HOME_HERO_CONFIG));
    setMessage({ tone: 'info', text: 'Đã khôi phục trong bản xem trước. Hãy bấm Công bố để áp dụng.' });
  };

  const closeEditor = () => {
    onPreview?.(null, 'desktop');
    onClose?.();
  };

  const activeTab = useMemo(() => TABS.find(([id]) => id === tab), [tab]);
  if (!open) return null;

  return (
    <div className="hero-editor" role="dialog" aria-modal="true" aria-label="Trình chỉnh sửa Hero trang chủ">
      <div className="hero-editor__shell">
        <header className="hero-editor__header">
          <div>
            <button type="button" className="hero-editor__back" onClick={closeEditor}><ArrowLeft size={18} /></button>
            <span><strong>Chỉnh sửa Hero</strong><small>TTCM / Admin · Nội dung và nền đa phương tiện</small></span>
          </div>
          <div className="hero-editor__device-switcher">
            <PreviewDevice value="desktop" active={device === 'desktop'} icon={Monitor} label="Desktop" onClick={setDevice} />
            <PreviewDevice value="tablet" active={device === 'tablet'} icon={Tablet} label="Tablet" onClick={setDevice} />
            <PreviewDevice value="mobile" active={device === 'mobile'} icon={Smartphone} label="Mobile" onClick={setDevice} />
          </div>
          <button type="button" className="hero-editor__close" onClick={closeEditor}><X size={20} /></button>
        </header>

        <div className="hero-editor__body">
          <aside className="hero-editor__tabs">
            {TABS.map(([id, Icon, label]) => (
              <button type="button" key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
                <Icon size={17} /><span>{label}</span>
              </button>
            ))}
            <div className={`hero-editor__database ${databaseReady ? 'is-ready' : 'is-local'}`}>
              <i>{databaseReady ? <Check size={15} /> : <CloudUpload size={15} />}</i>
              <span><strong>{databaseReady ? 'Supabase sẵn sàng' : 'Chế độ cục bộ'}</strong><small>{databaseReady ? 'Có thể công bố cho toàn hệ thống' : 'Cần chạy SQL nâng cấp đi kèm'}</small></span>
            </div>
          </aside>

          <main className="hero-editor__panel">
            <header><span>{activeTab ? React.createElement(activeTab[1], { size: 20 }) : null}</span><div><h2>{activeTab?.[2]}</h2><p>Thay đổi được phản ánh trực tiếp trên bản xem trước Hero.</p></div></header>

            {tab === 'content' ? (
              <section className="hero-editor__section">
                <div className="hero-editor__section-title"><h3>Badge và logo</h3><Toggle checked={config.badge.enabled} onChange={(value) => update('badge.enabled', value)} label="Hiển thị badge" /></div>
                <LanguageColumns>
                  <Field label="Badge tiếng Việt"><input value={config.badge.textVi} onChange={(event) => update('badge.textVi', event.target.value)} /></Field>
                  <Field label="Badge tiếng Anh"><input value={config.badge.textEn} onChange={(event) => update('badge.textEn', event.target.value)} /></Field>
                </LanguageColumns>
                <Field label="Đường dẫn logo" hint="Để trống sẽ dùng biểu tượng mặc định." wide><input value={config.badge.logoUrl} onChange={(event) => update('badge.logoUrl', event.target.value)} placeholder="https://..." /></Field>
                <div className="hero-editor__grid"><ColorField label="Màu chữ badge" value={config.badge.color} onChange={(value) => update('badge.color', value)} /><ColorField label="Màu nền badge" value={config.badge.background} onChange={(value) => update('badge.background', value)} /></div>

                <div className="hero-editor__section-title"><h3>Tiêu đề và mô tả</h3></div>
                <LanguageColumns>
                  <Field label="Tiêu đề tiếng Việt" hint="Xuống dòng trong ô để chia dòng trên Hero."><textarea rows="5" value={config.content.headlineVi} onChange={(event) => update('content.headlineVi', event.target.value)} /></Field>
                  <Field label="Headline English"><textarea rows="5" value={config.content.headlineEn} onChange={(event) => update('content.headlineEn', event.target.value)} /></Field>
                  <Field label="Dòng nhấn tiếng Việt"><input value={config.content.highlightVi} onChange={(event) => update('content.highlightVi', event.target.value)} /></Field>
                  <Field label="Highlight English"><input value={config.content.highlightEn} onChange={(event) => update('content.highlightEn', event.target.value)} /></Field>
                  <Field label="Mô tả tiếng Việt"><textarea rows="4" value={config.content.descriptionVi} onChange={(event) => update('content.descriptionVi', event.target.value)} /></Field>
                  <Field label="Description English"><textarea rows="4" value={config.content.descriptionEn} onChange={(event) => update('content.descriptionEn', event.target.value)} /></Field>
                </LanguageColumns>
                <div className="hero-editor__grid is-three"><ColorField label="Màu tiêu đề" value={config.content.headlineColor} onChange={(value) => update('content.headlineColor', value)} /><ColorField label="Màu nhấn" value={config.content.highlightColor} onChange={(value) => update('content.highlightColor', value)} /><ColorField label="Màu mô tả" value={config.content.descriptionColor} onChange={(value) => update('content.descriptionColor', value)} /></div>
              </section>
            ) : null}

            {tab === 'buttons' ? (
              <section className="hero-editor__section">
                {config.buttons.map((button, index) => (
                  <article className="hero-editor__card" key={button.id}>
                    <header><div><strong>{index === 0 ? 'Nút chính' : 'Nút phụ'}</strong><small>{button.target}</small></div><Toggle checked={button.enabled} onChange={(value) => updateButton(index, 'enabled', value)} label="Hiển thị" /></header>
                    <LanguageColumns>
                      <Field label="Nhãn tiếng Việt"><input value={button.labelVi} onChange={(event) => updateButton(index, 'labelVi', event.target.value)} /></Field>
                      <Field label="Label English"><input value={button.labelEn} onChange={(event) => updateButton(index, 'labelEn', event.target.value)} /></Field>
                    </LanguageColumns>
                    <Field label="Liên kết" hint="Chấp nhận #/route nội bộ hoặc https://" wide><input value={button.target} onChange={(event) => updateButton(index, 'target', event.target.value)} /></Field>
                    <div className="hero-editor__grid is-three">
                      <Field label="Kiểu nút"><select value={button.style} onChange={(event) => updateButton(index, 'style', event.target.value)}><option value="primary">Nút đặc</option><option value="secondary">Nút viền</option><option value="ghost">Nút trong</option></select></Field>
                      <Field label="Icon"><select value={button.icon} onChange={(event) => updateButton(index, 'icon', event.target.value)}><option value="rocket">Tên lửa</option><option value="play">Phát</option><option value="arrow">Mũi tên</option><option value="sparkles">Lấp lánh</option><option value="none">Không icon</option></select></Field>
                      <ColorField label="Màu nút" value={button.color} onChange={(value) => updateButton(index, 'color', value)} />
                    </div>
                    <Toggle checked={button.newTab} onChange={(value) => updateButton(index, 'newTab', value)} label="Mở trong tab mới" hint="Chỉ nên dùng với liên kết https:// bên ngoài." />
                  </article>
                ))}
              </section>
            ) : null}

            {tab === 'info' ? (
              <section className="hero-editor__section">
                <div className="hero-editor__section-title"><div><h3>Thẻ thông tin phía dưới</h3><p>Hiển thị tối đa 4 thẻ, có thể tắt từng thẻ.</p></div><button type="button" disabled={config.infoItems.length >= 4} onClick={addInfoItem}>+ Thêm thẻ</button></div>
                {config.infoItems.map((item, index) => (
                  <article className="hero-editor__card" key={item.id}>
                    <header><div><strong>Thẻ {index + 1}</strong><small>{item.titleVi}</small></div><div className="hero-editor__card-actions"><Toggle checked={item.enabled} onChange={(value) => updateInfoItem(index, 'enabled', value)} label="Hiển thị" /><button type="button" onClick={() => removeInfoItem(index)} disabled={config.infoItems.length <= 1}>Xóa</button></div></header>
                    <LanguageColumns>
                      <Field label="Tiêu đề tiếng Việt"><input value={item.titleVi} onChange={(event) => updateInfoItem(index, 'titleVi', event.target.value)} /></Field>
                      <Field label="Title English"><input value={item.titleEn} onChange={(event) => updateInfoItem(index, 'titleEn', event.target.value)} /></Field>
                      <Field label="Mô tả tiếng Việt"><input value={item.textVi} onChange={(event) => updateInfoItem(index, 'textVi', event.target.value)} /></Field>
                      <Field label="Description English"><input value={item.textEn} onChange={(event) => updateInfoItem(index, 'textEn', event.target.value)} /></Field>
                    </LanguageColumns>
                    <div className="hero-editor__grid"><Field label="Icon"><select value={item.icon} onChange={(event) => updateInfoItem(index, 'icon', event.target.value)}>{ICON_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><ColorField label="Màu icon" value={item.color} onChange={(value) => updateInfoItem(index, 'color', value)} /></div>
                  </article>
                ))}
              </section>
            ) : null}

            {tab === 'background' ? (
              <section className="hero-editor__section">
                <div className="hero-editor__upload">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/apng,video/mp4,video/webm" onChange={handleUpload} hidden />
                  <i>{config.background.type === 'video' ? <Video size={30} /> : <FileImage size={30} />}</i>
                  <div><strong>{config.background.fileName || 'Tải ảnh, GIF hoặc video làm nền'}</strong><small>JPG, PNG, WebP, GIF, APNG, MP4, WebM · tối đa 50 MB</small></div>
                  <button type="button" disabled={busy === 'upload'} onClick={() => fileInputRef.current?.click()}><Upload size={16} />{busy === 'upload' ? 'Đang tải…' : 'Chọn tệp'}</button>
                </div>
                <Field label="Hoặc dùng URL trực tiếp" wide><input value={config.background.url} onChange={(event) => update('background.url', event.target.value)} placeholder="https://..." /></Field>
                <div className="hero-editor__grid is-three">
                  <Field label="Loại nền"><select value={config.background.type} onChange={(event) => update('background.type', event.target.value)}><option value="none">Không có nền</option><option value="image">Ảnh</option><option value="gif">Ảnh động</option><option value="video">Video</option></select></Field>
                  <Field label="Cách phủ"><select value={config.background.fit} onChange={(event) => update('background.fit', event.target.value)}><option value="cover">Phủ kín</option><option value="contain">Hiện toàn bộ</option><option value="fill">Kéo đầy khung</option></select></Field>
                  <Field label="Poster video"><input value={config.background.posterUrl} onChange={(event) => update('background.posterUrl', event.target.value)} placeholder="https://..." /></Field>
                </div>
                <div className="hero-editor__grid is-three"><RangeField label="Vị trí ngang" value={config.background.positionX} min={0} max={100} suffix="%" onChange={(value) => update('background.positionX', value)} /><RangeField label="Vị trí dọc" value={config.background.positionY} min={0} max={100} suffix="%" onChange={(value) => update('background.positionY', value)} /><RangeField label="Phóng to" value={config.background.scale} min={50} max={200} suffix="%" onChange={(value) => update('background.scale', value)} /></div>
                <div className="hero-editor__grid is-three"><RangeField label="Độ rõ" value={config.background.opacity} min={0} max={100} suffix="%" onChange={(value) => update('background.opacity', value)} /><RangeField label="Độ sáng" value={config.background.brightness} min={20} max={180} suffix="%" onChange={(value) => update('background.brightness', value)} /><RangeField label="Làm mờ" value={config.background.blur} min={0} max={30} suffix="px" onChange={(value) => update('background.blur', value)} /></div>
                {config.background.type === 'video' ? <div className="hero-editor__grid is-three"><Toggle checked={config.background.autoplay} onChange={(value) => update('background.autoplay', value)} label="Tự phát" /><Toggle checked={config.background.loop} onChange={(value) => update('background.loop', value)} label="Lặp lại" /><Toggle checked onChange={() => {}} label="Luôn tắt tiếng" hint="Bắt buộc để video có thể tự phát." /></div> : null}
                <button type="button" className="hero-editor__clear-media" onClick={() => setConfig((previous) => ({ ...previous, background: { ...previous.background, type: 'none', url: '', posterUrl: '', fileName: '', mimeType: '' } }))}>Xóa nền hiện tại</button>
              </section>
            ) : null}

            {tab === 'overlay' ? (
              <section className="hero-editor__section">
                <div className="hero-editor__section-title"><h3>Lớp bảo vệ chữ</h3><Toggle checked={config.overlay.enabled} onChange={(value) => update('overlay.enabled', value)} label="Bật lớp phủ" /></div>
                <div className="hero-editor__grid is-three"><ColorField label="Màu lớp phủ" value={config.overlay.color} onChange={(value) => update('overlay.color', value)} /><RangeField label="Độ phủ toàn khung" value={config.overlay.opacity} min={0} max={100} suffix="%" onChange={(value) => update('overlay.opacity', value)} /><RangeField label="Bảo vệ phía chữ" value={config.overlay.leftProtection} min={0} max={100} suffix="%" onChange={(value) => update('overlay.leftProtection', value)} /></div>
                <RangeField label="Chiều rộng vùng bảo vệ chữ" value={config.overlay.leftProtectionWidth} min={20} max={90} suffix="%" onChange={(value) => update('overlay.leftProtectionWidth', value)} />

                <div className="hero-editor__section-title"><h3>Bố cục Hero</h3></div>
                <div className="hero-editor__grid is-three"><RangeField label="Chiều cao" value={config.layout.minHeight} min={420} max={850} suffix="px" onChange={(value) => update('layout.minHeight', value)} /><RangeField label="Độ rộng nội dung" value={config.layout.contentWidth} min={28} max={70} suffix="%" onChange={(value) => update('layout.contentWidth', value)} /><RangeField label="Bo góc" value={config.layout.borderRadius} min={0} max={60} suffix="px" onChange={(value) => update('layout.borderRadius', value)} /></div>
                <div className="hero-editor__grid"><Field label="Căn chữ"><select value={config.layout.contentAlign} onChange={(event) => update('layout.contentAlign', event.target.value)}><option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option></select></Field><Field label="Vị trí dọc"><select value={config.layout.verticalAlign} onChange={(event) => update('layout.verticalAlign', event.target.value)}><option value="start">Trên</option><option value="center">Giữa</option><option value="end">Dưới</option></select></Field></div>

                <div className="hero-editor__section-title"><h3>Chuyển động</h3></div>
                <div className="hero-editor__grid is-three"><Toggle checked={config.animation.enabled} onChange={(value) => update('animation.enabled', value)} label="Bật hiệu ứng" /><Toggle checked={config.animation.contentReveal} onChange={(value) => update('animation.contentReveal', value)} label="Hiện chữ mềm" /><Toggle checked={config.animation.mediaMotion} onChange={(value) => update('animation.mediaMotion', value)} label="Chuyển động nền" /><Toggle checked={config.animation.buttonPulse} onChange={(value) => update('animation.buttonPulse', value)} label="Nhấn nút nhẹ" /></div>
              </section>
            ) : null}
          </main>
        </div>

        <footer className="hero-editor__footer">
          <div>{message ? <span className={`hero-editor__message is-${message.tone}`}>{message.text}</span> : <span className="hero-editor__hint"><Eye size={15} />Mọi thay đổi đang được xem trước trực tiếp.</span>}</div>
          <div>
            <button type="button" className="is-reset" onClick={resetDefault}><RotateCcw size={16} />Khôi phục mặc định</button>
            <button type="button" className="is-draft" disabled={Boolean(busy)} onClick={handleSaveDraft}><Save size={16} />{busy === 'draft' ? 'Đang lưu…' : 'Lưu bản nháp'}</button>
            <button type="button" className="is-publish" disabled={Boolean(busy)} onClick={handlePublish}><Check size={17} />{busy === 'publish' ? 'Đang công bố…' : 'Công bố'}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
