import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TEXTLAB_TEMPLATES, buildInteractiveHtml, downloadHtml, sampleFor } from '../utils/textlabInteractive.js';
import '../styles/textlab-template-interactive.css';

const CATEGORIES = ['Tất cả','Kiểm tra','Từ vựng','Câu & đoạn','Đọc hiểu','Nói & viết','Trò chơi'];
const categoryOf = template => {
  if (['quiz','truefalse'].includes(template.kind)) return 'Kiểm tra';
  if (['pairs','memory','scramble','wordsearch','hangman','bingo','cards'].includes(template.kind)) return 'Từ vựng';
  if (['sort','order','sentence','cloze'].includes(template.kind)) return 'Câu & đoạn';
  if (template.kind === 'open') return 'Nói & viết';
  if (['wheel','boxes'].includes(template.kind)) return 'Trò chơi';
  return 'Đọc hiểu';
};

export default function TextLabTemplateLibrary() {
  const [selectedId, setSelectedId] = useState(TEXTLAB_TEMPLATES[1].id);
  const selected = TEXTLAB_TEMPLATES.find(template => template.id === selectedId) || TEXTLAB_TEMPLATES[0];
  const [content, setContent] = useState(() => sampleFor(selected.kind));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [tab, setTab] = useState('content');
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef(null);

  useEffect(() => {
    setContent(sampleFor(selected.kind));
    setTab('content');
    setPreviewKey(key => key + 1);
  }, [selectedId]);

  const html = useMemo(() => buildInteractiveHtml(selected, content), [selected, content, previewKey]);
  const visible = TEXTLAB_TEMPLATES.filter(template =>
    (category === 'Tất cả' || categoryOf(template) === category) &&
    `${template.title} ${template.titleVi}`.toLowerCase().includes(query.toLowerCase())
  );

  const openWindow = () => {
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const copy = async value => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
  };

  const shownText = tab === 'blank'
    ? `TITLE: Tên hoạt động\n\n${selected.format}`
    : tab === 'sample'
      ? sampleFor(selected.kind)
      : content;

  return <div className="tlx-page">
    <header className="tlx-hero">
      <div>
        <small>BRIAN TEXTLAB · NO AI</small>
        <h1>Interactive HTML Studio</h1>
        <p>Chọn mẫu, nhập nội dung, chơi trực tiếp và tải HTML ngoại tuyến.</p>
      </div>
      <div className="tlx-badge">36 hoạt động</div>
    </header>

    <section className="tlx-layout">
      <aside className="tlx-library">
        <div className="tlx-library-head">
          <h2>36 template</h2>
          <input placeholder="Tìm template…" value={query} onChange={event => setQuery(event.target.value)} />
          <div className="tlx-filters">
            {CATEGORIES.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
        </div>
        <div className="tlx-grid">
          {visible.map(template => <button key={template.id} className={`tlx-card ${template.id === selected.id ? 'selected' : ''}`} onClick={() => setSelectedId(template.id)}>
            <span>{String(template.index).padStart(2, '0')}</span>
            <div><small>{categoryOf(template)}</small><b>{template.title}</b><em>{template.titleVi}</em></div>
            <strong>→</strong>
          </button>)}
        </div>
      </aside>

      <main className="tlx-editor">
        <section className="tlx-info">
          <div>
            <small>{categoryOf(selected)}</small>
            <h2>{selected.title}</h2>
            <p>{selected.titleVi} · Định dạng: <code>{selected.format}</code></p>
          </div>
          <span>Hoạt động #{selected.index}</span>
        </section>

        <section className="tlx-input">
          <nav>
            <button className={tab === 'content' ? 'active' : ''} onClick={() => setTab('content')}>Nội dung của bạn</button>
            <button className={tab === 'blank' ? 'active' : ''} onClick={() => setTab('blank')}>Mẫu trống</button>
            <button className={tab === 'sample' ? 'active' : ''} onClick={() => setTab('sample')}>Ví dụ hoàn chỉnh</button>
            <button className={tab === 'guide' ? 'active' : ''} onClick={() => setTab('guide')}>Cách nhập</button>
          </nav>

          {tab === 'guide'
            ? <div className="tlx-guide"><h3>Cách nhập</h3><p>Mỗi dòng là một mục. Dùng dấu <b>|</b> để ngăn cách các phần:</p><pre>{selected.format}</pre><p>Với Đúng/Sai: <b>Nhận định | TRUE/FALSE | Câu sửa nếu sai</b>.</p></div>
            : <textarea value={shownText} readOnly={tab !== 'content'} onChange={event => setContent(event.target.value)} />}

          <div className="tlx-input-actions">
            <button onClick={() => copy(shownText)}>Sao chép</button>
            {tab === 'content' && <button className="primary" onClick={() => setPreviewKey(key => key + 1)}>Tạo hoạt động</button>}
          </div>
        </section>

        <section className="tlx-preview">
          <header>
            <div><small>LIVE PREVIEW</small><h2>Hoạt động tương tác trực tiếp</h2></div>
            <div>
              <button onClick={() => setPreviewKey(key => key + 1)}>↻ Chạy lại</button>
              <button onClick={openWindow}>↗ Mở riêng</button>
              <button onClick={() => iframeRef.current?.requestFullscreen?.()}>⛶ Toàn màn hình</button>
              <button className="download" onClick={() => downloadHtml(`${selected.id}.html`, html)}>↓ Tải HTML</button>
            </div>
          </header>
          <iframe key={previewKey} ref={iframeRef} title="TextLab interactive preview" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads" srcDoc={html} />
        </section>
      </main>
    </section>
  </div>;
}
