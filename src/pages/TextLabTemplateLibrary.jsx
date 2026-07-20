import React, { useEffect, useMemo, useState } from 'react';
import {
  TEXTLAB_COPY_TEMPLATES,
  TEXTLAB_TEMPLATE_CATEGORIES,
  TEXTLAB_TEMPLATE_COUNT,
} from '../data/textLabTemplateLibrary.js';
import '../styles/textlab-template-library.css';

const FAVORITES_KEY = 'bes-textlab-template-library-favorites-v1';
const RECENT_KEY = 'bes-textlab-template-library-recent-v1';

function readStoredList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeStoredList(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* optional storage */ }
}

async function copyText(value) {
  const text = String(value || '');
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  }
}

function downloadText(filename, content) {
  const blob = new Blob([String(content || '')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function TemplateCard({ item, active, favorite, onSelect, onToggleFavorite }) {
  return (
    <article className={`tlt-card ${active ? 'active' : ''}`}>
      <button type="button" className="tlt-card-main" onClick={() => onSelect(item.id)}>
        <span className="tlt-card-icon" aria-hidden="true">{item.icon}</span>
        <span className="tlt-card-copy">
          <small>{item.tag}{item.isNew ? ' · MỚI' : ''}</small>
          <b>{item.name}</b>
          <em>{item.nameVi}</em>
        </span>
        <span className="tlt-card-arrow" aria-hidden="true">→</span>
      </button>
      <button
        type="button"
        className={`tlt-favorite ${favorite ? 'is-favorite' : ''}`}
        aria-label={favorite ? `Bỏ yêu thích ${item.name}` : `Yêu thích ${item.name}`}
        title={favorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
        onClick={() => onToggleFavorite(item.id)}
      >
        {favorite ? '★' : '☆'}
      </button>
    </article>
  );
}

export default function TextLabTemplateLibrary({ language = 'vi' }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState(TEXTLAB_COPY_TEMPLATES[0].id);
  const [view, setView] = useState('blank');
  const [favorites, setFavorites] = useState(() => readStoredList(FAVORITES_KEY));
  const [recent, setRecent] = useState(() => readStoredList(RECENT_KEY));
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [notice, setNotice] = useState('');

  const selected = useMemo(
    () => TEXTLAB_COPY_TEMPLATES.find((item) => item.id === selectedId) || TEXTLAB_COPY_TEMPLATES[0],
    [selectedId],
  );

  const filteredTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return TEXTLAB_COPY_TEMPLATES.filter((item) => {
      const categoryMatch = category === 'all' || item.category === category;
      const favoriteMatch = !onlyFavorites || favorites.includes(item.id);
      const textMatch = !normalized || [item.name, item.nameVi, item.tag, item.desc]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
      return categoryMatch && favoriteMatch && textMatch;
    });
  }, [query, category, onlyFavorites, favorites]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const chooseTemplate = (id) => {
    setSelectedId(id);
    setView('blank');
    setRecent((current) => {
      const next = [id, ...current.filter((entry) => entry !== id)].slice(0, 6);
      writeStoredList(RECENT_KEY, next);
      return next;
    });
    window.requestAnimationFrame(() => {
      document.querySelector('.tlt-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const toggleFavorite = (id) => {
    setFavorites((current) => {
      const next = current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id];
      writeStoredList(FAVORITES_KEY, next);
      return next;
    });
  };

  const handleCopy = async (kind) => {
    const content = kind === 'example' ? selected.example : selected.blank;
    const copied = await copyText(content);
    setNotice(copied
      ? (kind === 'example' ? 'Đã sao chép mẫu minh họa.' : 'Đã sao chép mẫu trống.')
      : 'Không thể sao chép tự động. Hãy chọn nội dung và sao chép thủ công.');
  };

  const recentTemplates = recent
    .map((id) => TEXTLAB_COPY_TEMPLATES.find((item) => item.id === id))
    .filter(Boolean);

  const content = view === 'example' ? selected.example : selected.blank;
  const title = language === 'vi' ? 'Thư viện mẫu hoạt động' : 'Activity Template Library';
  const subtitle = language === 'vi'
    ? `${TEXTLAB_TEMPLATE_COUNT} mẫu sẵn để xem và sao chép · Không AI · Không API key`
    : `${TEXTLAB_TEMPLATE_COUNT} copy-ready templates · No AI · No API key`;

  return (
    <div className="page tlt-page">
      <section className="tlt-hero">
        <button type="button" className="back-btn" onClick={() => (window.location.hash = '#/apps')}>
          ← {language === 'vi' ? 'Quay lại Ứng dụng' : 'Back to Apps'}
        </button>
        <div className="tlt-hero-main">
          <div className="tlt-logo" aria-hidden="true">TL</div>
          <div>
            <p>BRIAN TEXTLAB · TEMPLATE LIBRARY</p>
            <h1>{title}</h1>
            <span>{subtitle}</span>
          </div>
        </div>
        <aside className="tlt-offline-status">
          <b>100% OFFLINE</b>
          <span>Chọn mẫu → xem cấu trúc → sao chép</span>
          <small>Không gửi dữ liệu ra ngoài</small>
        </aside>
      </section>

      <section className="tlt-toolbar" aria-label="Bộ lọc template">
        <label className="tlt-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, kỹ năng hoặc dạng hoạt động…"
          />
          {query ? <button type="button" onClick={() => setQuery('')}>×</button> : null}
        </label>
        <button
          type="button"
          className={`tlt-favorite-filter ${onlyFavorites ? 'active' : ''}`}
          onClick={() => setOnlyFavorites((value) => !value)}
        >
          ★ Yêu thích <b>{favorites.length}</b>
        </button>
        <div className="tlt-count"><strong>{filteredTemplates.length}</strong><span>mẫu đang hiển thị</span></div>
      </section>

      <nav className="tlt-categories" aria-label="Nhóm template">
        {TEXTLAB_TEMPLATE_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={category === item.id ? 'active' : ''}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
            <span>{item.id === 'all' ? TEXTLAB_TEMPLATE_COUNT : TEXTLAB_COPY_TEMPLATES.filter((templateItem) => templateItem.category === item.id).length}</span>
          </button>
        ))}
      </nav>

      {recentTemplates.length ? (
        <section className="tlt-recent">
          <div><small>VỪA MỞ</small><b>Tiếp tục nhanh</b></div>
          {recentTemplates.map((item) => (
            <button key={item.id} type="button" onClick={() => chooseTemplate(item.id)}>
              <span>{item.icon}</span>{item.name}
            </button>
          ))}
        </section>
      ) : null}

      <main className="tlt-workspace">
        <section className="tlt-library" aria-label="Danh mục mẫu hoạt động">
          <div className="tlt-section-head">
            <div><small>DANH MỤC</small><h2>{TEXTLAB_TEMPLATE_COUNT} mẫu hoạt động</h2></div>
            <p>18 mẫu TextLab gốc và 18 mẫu mở rộng theo cơ chế hoạt động lớp học.</p>
          </div>
          {filteredTemplates.length ? (
            <div className="tlt-grid">
              {filteredTemplates.map((item) => (
                <TemplateCard
                  key={item.id}
                  item={item}
                  active={item.id === selected.id}
                  favorite={favorites.includes(item.id)}
                  onSelect={chooseTemplate}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="tlt-empty">
              <span>⌕</span>
              <h3>Không tìm thấy template phù hợp</h3>
              <p>Thử xóa từ khóa, chọn nhóm khác hoặc tắt bộ lọc yêu thích.</p>
              <button type="button" onClick={() => { setQuery(''); setCategory('all'); setOnlyFavorites(false); }}>Hiển thị tất cả</button>
            </div>
          )}
        </section>

        <section className="tlt-detail">
          <header className="tlt-detail-head">
            <div className="tlt-detail-icon" aria-hidden="true">{selected.icon}</div>
            <div>
              <small>{selected.tag}{selected.isNew ? ' · MẪU MỞ RỘNG' : ' · MẪU GỐC'}</small>
              <h2>{selected.name}</h2>
              <p>{selected.nameVi}</p>
            </div>
            <button
              type="button"
              className={`tlt-detail-favorite ${favorites.includes(selected.id) ? 'active' : ''}`}
              onClick={() => toggleFavorite(selected.id)}
            >
              {favorites.includes(selected.id) ? '★ Đã yêu thích' : '☆ Yêu thích'}
            </button>
          </header>

          <div className="tlt-description">
            <p>{selected.desc}</p>
            <div><span>Số lượng khuyến nghị</span><b>{selected.recommended}</b></div>
          </div>

          <div className="tlt-view-tabs" role="tablist">
            <button type="button" className={view === 'blank' ? 'active' : ''} onClick={() => setView('blank')}>Mẫu trống</button>
            <button type="button" className={view === 'example' ? 'active' : ''} onClick={() => setView('example')}>Ví dụ hoàn chỉnh</button>
            <button type="button" className={view === 'guide' ? 'active' : ''} onClick={() => setView('guide')}>Cách sử dụng</button>
          </div>

          {view === 'guide' ? (
            <div className="tlt-guide">
              <ol>
                <li><b>Chọn mẫu phù hợp</b><span>Đọc mô tả và số lượng mục khuyến nghị.</span></li>
                <li><b>Sao chép mẫu trống</b><span>Thay các phần trong dấu ngoặc vuông bằng nội dung của bạn.</span></li>
                <li><b>Kiểm tra cấu trúc</b><span>Giữ nguyên nhãn, thứ tự trường và định dạng đáp án.</span></li>
                <li><b>Dán vào nơi cần dùng</b><span>Word, Google Docs, biểu mẫu, công cụ trò chơi hoặc chatbot do bạn tự chọn.</span></li>
              </ol>
              <div className="tlt-guide-note">
                <b>Không có AI trong ứng dụng này.</b>
                <p>{selected.usage}</p>
              </div>
            </div>
          ) : (
            <div className="tlt-code-panel">
              <div className="tlt-code-head">
                <span>{view === 'example' ? 'VÍ DỤ MINH HỌA' : 'MẪU CẤU TRÚC TRỐNG'}</span>
                <div>
                  <button type="button" onClick={() => handleCopy(view)}>⧉ Sao chép</button>
                  <button
                    type="button"
                    onClick={() => downloadText(`${selected.id}-${view}.txt`, content)}
                  >
                    ↓ TXT
                  </button>
                </div>
              </div>
              <pre tabIndex="0">{content}</pre>
            </div>
          )}

          <div className="tlt-copy-actions">
            <button type="button" className="secondary" onClick={() => handleCopy('blank')}>Sao chép mẫu trống</button>
            <button type="button" className="primary" onClick={() => handleCopy('example')}>Sao chép ví dụ hoàn chỉnh</button>
          </div>
        </section>
      </main>

      <section className="tlt-principles">
        <article><span>01</span><div><b>Không AI</b><p>Không OpenRouter, Gemini, prompt hoặc API key.</p></div></article>
        <article><span>02</span><div><b>Không nhập dữ liệu</b><p>Ứng dụng chỉ hiển thị mẫu có sẵn để sao chép.</p></div></article>
        <article><span>03</span><div><b>Dùng ở mọi nơi</b><p>Sao chép sang Word, Docs, LMS hoặc công cụ khác.</p></div></article>
      </section>

      {notice ? <div className="tlt-toast" role="status"><span>✓</span>{notice}</div> : null}
    </div>
  );
}
