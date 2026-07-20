import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  TEXTLAB_CATEGORIES,
  TEXTLAB_TEMPLATES,
  buildStandaloneHtml,
  downloadStandaloneHtml,
  downloadTemplateText,
  parseTemplateContent,
} from '../utils/textlabInteractive.js';
import '../styles/textlab-template-interactive.css';

const STORAGE_PREFIX = 'bes-textlab-interactive-v1';

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function copyText(value) {
  if (!value) return Promise.resolve(false);
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value).then(() => true).catch(() => false);
  const area = document.createElement('textarea');
  area.value = value;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  return Promise.resolve(ok);
}

function TemplateCard({ template, selected, favorite, onSelect, onFavorite }) {
  return (
    <article className={`tli-template-card ${selected ? 'selected' : ''}`}>
      <button type="button" className="tli-template-main" onClick={() => onSelect(template)}>
        <span className="tli-template-icon">{template.icon}</span>
        <span>
          <small>{template.categoryLabel}</small>
          <b>{template.title}</b>
          <em>{template.titleVi}</em>
        </span>
        <i>→</i>
      </button>
      <button
        type="button"
        className={`tli-favorite ${favorite ? 'active' : ''}`}
        aria-label={favorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
        onClick={() => onFavorite(template.id)}
      >
        {favorite ? '★' : '☆'}
      </button>
    </article>
  );
}

function EmptyPreview({ errors }) {
  return (
    <div className="tli-empty-preview">
      <span>HTML</span>
      <h3>Chưa thể tạo hoạt động</h3>
      <p>Kiểm tra lại cấu trúc nội dung theo hướng dẫn của template.</p>
      {errors?.length ? <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
    </div>
  );
}

export default function TextLabTemplateLibrary({ language = 'vi' }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem(`${STORAGE_PREFIX}:selected`) || TEXTLAB_TEMPLATES[0].id);
  const [favorites, setFavorites] = useState(() => readJson(`${STORAGE_PREFIX}:favorites`, []));
  const [recent, setRecent] = useState(() => readJson(`${STORAGE_PREFIX}:recent`, []));
  const [editorMode, setEditorMode] = useState('content');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef(null);

  const selected = useMemo(
    () => TEXTLAB_TEMPLATES.find((template) => template.id === selectedId) || TEXTLAB_TEMPLATES[0],
    [selectedId],
  );

  useEffect(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}:draft:${selected.id}`);
    setContent(saved || selected.example);
    setEditorMode('content');
    localStorage.setItem(`${STORAGE_PREFIX}:selected`, selected.id);
    setRecent((current) => {
      const next = [selected.id, ...current.filter((id) => id !== selected.id)].slice(0, 6);
      localStorage.setItem(`${STORAGE_PREFIX}:recent`, JSON.stringify(next));
      return next;
    });
  }, [selected.id]);

  useEffect(() => {
    if (!selected?.id) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(`${STORAGE_PREFIX}:draft:${selected.id}`, content);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [content, selected?.id]);

  const parsed = useMemo(() => parseTemplateContent(selected, content), [selected, content]);
  const html = useMemo(() => buildStandaloneHtml(selected, content), [selected, content, previewKey]);

  const visibleTemplates = useMemo(() => {
    const target = query.trim().toLowerCase();
    return TEXTLAB_TEMPLATES.filter((template) => {
      if (category !== 'all' && template.category !== category) return false;
      if (showFavoritesOnly && !favorites.includes(template.id)) return false;
      if (!target) return true;
      return `${template.title} ${template.titleVi} ${template.descriptionVi} ${template.categoryLabel}`.toLowerCase().includes(target);
    });
  }, [query, category, favorites, showFavoritesOnly]);

  const flash = (text) => {
    setMessage(text);
    window.clearTimeout(window.__textlabTemplateMessage);
    window.__textlabTemplateMessage = window.setTimeout(() => setMessage(''), 2600);
  };

  const selectTemplate = (template) => setSelectedId(template.id);

  const toggleFavorite = (id) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem(`${STORAGE_PREFIX}:favorites`, JSON.stringify(next));
      return next;
    });
  };

  const setPreset = (mode) => {
    setEditorMode(mode);
    if (mode === 'blank') setContent(selected.blank);
    if (mode === 'example') setContent(selected.example);
  };

  const openStandalone = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const fullscreen = async () => {
    const frame = iframeRef.current;
    if (!frame) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frame.requestFullscreen();
    } catch {
      openStandalone();
    }
  };

  const copy = async (value, success) => {
    const ok = await copyText(value);
    flash(ok ? success : 'Không thể sao chép. Hãy chọn nội dung và sao chép thủ công.');
  };

  const recentTemplates = recent
    .map((id) => TEXTLAB_TEMPLATES.find((template) => template.id === id))
    .filter(Boolean);

  return (
    <div className="page tli-page">
      <section className="tli-hero">
        <div>
          <p>BRIAN TEXTLAB · INTERACTIVE HTML FACTORY</p>
          <h1>36 mẫu hoạt động tương tác</h1>
          <span>Dán nội dung theo mẫu → xem hoạt động trực tiếp → tải một file HTML chạy ngoại tuyến.</span>
        </div>
        <aside>
          <strong>NO AI</strong>
          <small>Không API · Không gửi dữ liệu · Không cần mạng</small>
        </aside>
      </section>

      {message ? <div className="tli-toast">✓ {message}</div> : null}

      <section className="tli-toolbar">
        <label className="tli-search">
          <span>⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm template hoặc kỹ năng…" />
        </label>
        <div className="tli-category-row">
          {TEXTLAB_CATEGORIES.map((item) => (
            <button key={item.id} type="button" className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>
              {item.label}
            </button>
          ))}
          <button type="button" className={showFavoritesOnly ? 'active favorite' : 'favorite'} onClick={() => setShowFavoritesOnly((value) => !value)}>
            ★ Yêu thích
          </button>
        </div>
      </section>

      <div className="tli-workspace">
        <aside className="tli-catalogue">
          {recentTemplates.length && !query && category === 'all' && !showFavoritesOnly ? (
            <section className="tli-recent">
              <header><small>MỞ GẦN ĐÂY</small></header>
              <div>
                {recentTemplates.map((template) => (
                  <button key={template.id} type="button" onClick={() => selectTemplate(template)} title={template.titleVi}>
                    <span>{template.icon}</span>{template.title}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          <div className="tli-catalogue-head">
            <span><b>{visibleTemplates.length}</b> template</span>
            <small>Chọn để tạo HTML</small>
          </div>
          <div className="tli-template-grid">
            {visibleTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selected.id === template.id}
                favorite={favorites.includes(template.id)}
                onSelect={selectTemplate}
                onFavorite={toggleFavorite}
              />
            ))}
          </div>
        </aside>

        <main className="tli-builder">
          <section className="tli-template-summary">
            <span className="tli-summary-icon">{selected.icon}</span>
            <div>
              <small>{selected.categoryLabel} · {selected.title}</small>
              <h2>{selected.titleVi}</h2>
              <p>{selected.descriptionVi}</p>
            </div>
            <aside>
              <small>Số lượng khuyến nghị</small>
              <b>{selected.recommended}</b>
            </aside>
          </section>

          <section className="tli-editor-panel">
            <header className="tli-editor-tabs">
              <button type="button" className={editorMode === 'content' ? 'active' : ''} onClick={() => setEditorMode('content')}>Nội dung của bạn</button>
              <button type="button" className={editorMode === 'blank' ? 'active' : ''} onClick={() => setPreset('blank')}>Mẫu trống</button>
              <button type="button" className={editorMode === 'example' ? 'active' : ''} onClick={() => setPreset('example')}>Ví dụ hoàn chỉnh</button>
              <button type="button" className={editorMode === 'guide' ? 'active' : ''} onClick={() => setEditorMode('guide')}>Cách nhập</button>
            </header>

            {editorMode === 'guide' ? (
              <div className="tli-guide">
                <h3>Cấu trúc nội dung</h3>
                <p>{selected.syntax}</p>
                <ol>
                  <li>Sao chép mẫu trống hoặc dùng ví dụ hoàn chỉnh.</li>
                  <li>Thay nội dung bằng dữ liệu bài học của bạn.</li>
                  <li>Phần xem trước HTML tự cập nhật ngay khi bạn nhập.</li>
                  <li>Tải HTML để mở trên mọi trình duyệt hoặc gửi cho học sinh.</li>
                </ol>
                <p className="tli-security-note">Mọi xử lý diễn ra trong trình duyệt. Không có AI và không có nội dung nào được gửi ra ngoài.</p>
              </div>
            ) : (
              <>
                <div className="tli-editor-bar">
                  <span>{editorMode === 'blank' ? 'MẪU TRỐNG' : editorMode === 'example' ? 'VÍ DỤ HOÀN CHỈNH' : 'NỘI DUNG ĐANG TẠO'}</span>
                  <div>
                    <button type="button" onClick={() => copy(content, 'Đã sao chép nội dung.')}>⧉ Sao chép</button>
                    <button type="button" onClick={() => downloadTemplateText(selected, content)}>↓ TXT</button>
                  </div>
                </div>
                <textarea
                  className="tli-content-editor"
                  value={content}
                  onChange={(event) => { setContent(event.target.value); setEditorMode('content'); }}
                  spellCheck={false}
                  aria-label="Nội dung hoạt động"
                />
              </>
            )}
          </section>

          <section className="tli-preview-panel">
            <header>
              <div>
                <small>LIVE PREVIEW</small>
                <h3>Hoạt động tương tác trực tiếp</h3>
              </div>
              <div>
                <button type="button" onClick={() => setPreviewKey((value) => value + 1)}>↻ Chạy lại</button>
                <button type="button" onClick={openStandalone}>↗ Mở riêng</button>
                <button type="button" onClick={fullscreen}>⛶ Toàn màn hình</button>
                <button type="button" className="primary" onClick={() => downloadStandaloneHtml(selected, content)}>↓ Tải HTML</button>
              </div>
            </header>
            {parsed.errors?.length ? (
              <EmptyPreview errors={parsed.errors} />
            ) : (
              <iframe
                key={`${selected.id}-${previewKey}`}
                ref={iframeRef}
                title={`Xem trước ${selected.titleVi}`}
                srcDoc={html}
                sandbox="allow-scripts allow-downloads allow-modals"
              />
            )}
          </section>

          <section className="tli-bottom-actions">
            <button type="button" onClick={() => copy(selected.blank, 'Đã sao chép mẫu trống.')}>Sao chép mẫu trống</button>
            <button type="button" onClick={() => copy(selected.example, 'Đã sao chép ví dụ.')}>Sao chép ví dụ hoàn chỉnh</button>
            <button type="button" className="primary" disabled={parsed.errors?.length} onClick={() => downloadStandaloneHtml(selected, content)}>Tải hoạt động HTML</button>
          </section>
        </main>
      </div>
    </div>
  );
}
