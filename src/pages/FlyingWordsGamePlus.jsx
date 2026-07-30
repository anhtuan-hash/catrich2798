import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  FileText,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import FlyingWordsGame from './FlyingWordsGame.jsx';
import '../styles/FlyingWordsQuestionManager.css';

const STORAGE_KEY = 'brian-flying-words-draft-v1';

function tokenizeSentence(sentence) {
  const raw = String(sentence || '').replace(/\s+/g, ' ').trim();
  if (!raw) return [];

  const tokens = [];
  const pattern = /\[([^\]]+)\]|(\S+)/g;
  let match;
  while ((match = pattern.exec(raw))) {
    const text = String(match[1] || match[2] || '').trim();
    if (text) tokens.push(text);
  }
  return tokens;
}

function normalizeSentence(sentence) {
  return String(sentence || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function canonicalSentence(sentence) {
  return normalizeSentence(sentence).toLocaleLowerCase('vi-VN');
}

function createItem(text = '') {
  return {
    id: `fwg-question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
  };
}

function getEditorTextarea() {
  return document.querySelector('.flying-words-app .fwg-content-card textarea');
}

function readStoredSentences() {
  try {
    const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return typeof draft?.sentences === 'string' ? draft.sentences : '';
  } catch {
    return '';
  }
}

function readCurrentSentences() {
  const textarea = getEditorTextarea();
  if (textarea) return textarea.value;
  return readStoredSentences();
}

function writeCurrentSentences(value) {
  const textarea = getEditorTextarea();
  if (textarea) {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    descriptor?.set?.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus({ preventScroll: true });
    return true;
  }

  try {
    const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, sentences: value }));
    return false;
  } catch {
    return false;
  }
}

function buildItems(raw) {
  const lines = String(raw || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim());
  const nonEmpty = lines.filter(Boolean);
  return (nonEmpty.length ? nonEmpty : ['']).map((line) => createItem(line));
}

function QuestionManagerModal({ onClose, onApplied }) {
  const [items, setItems] = useState(() => buildItems(readCurrentSentences()));
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector('textarea, input, button')?.focus({ preventScroll: true });
    });

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const duplicateIds = useMemo(() => {
    const groups = new Map();
    items.forEach((item) => {
      const key = canonicalSentence(item.text);
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item.id);
    });
    return new Set([...groups.values()].filter((ids) => ids.length > 1).flat());
  }, [items]);

  const stats = useMemo(() => {
    let valid = 0;
    let warnings = 0;
    let tokens = 0;
    items.forEach((item) => {
      const count = tokenizeSentence(item.text).length;
      tokens += count;
      if (count >= 2) valid += 1;
      if ((item.text.trim() && count < 2) || count > 16 || duplicateIds.has(item.id)) warnings += 1;
    });
    return { total: items.length, valid, warnings, tokens };
  }, [duplicateIds, items]);

  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');
    if (!keyword) return items;
    return items.filter((item) => item.text.toLocaleLowerCase('vi-VN').includes(keyword));
  }, [items, search]);

  const updateItem = (id, text) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const addItem = () => {
    const next = createItem('');
    setItems((current) => [...current, next]);
    setSearch('');
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-fwg-question-id="${next.id}"] textarea`)?.focus({ preventScroll: false });
    });
  };

  const duplicateItem = (id) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index < 0) return current;
      const copy = createItem(current[index].text);
      const next = [...current];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const removeItem = (id) => {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id);
      return next.length ? next : [createItem('')];
    });
  };

  const moveItem = (id, direction) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const normalizeAll = () => {
    setItems((current) => current.map((item) => ({ ...item, text: normalizeSentence(item.text) })));
    setNotice('Đã chuẩn hóa khoảng trắng và dấu câu.');
  };

  const removeDuplicates = () => {
    const seen = new Set();
    let removed = 0;
    setItems((current) => {
      const next = current.filter((item) => {
        const key = canonicalSentence(item.text);
        if (!key) return true;
        if (seen.has(key)) {
          removed += 1;
          return false;
        }
        seen.add(key);
        return true;
      });
      return next.length ? next : [createItem('')];
    });
    setNotice(removed ? `Đã loại ${removed} câu trùng lặp.` : 'Không phát hiện câu trùng lặp.');
  };

  const reloadFromEditor = () => {
    setItems(buildItems(readCurrentSentences()));
    setSearch('');
    setNotice('Đã nạp lại nội dung mới nhất từ trình soạn.');
  };

  const applyChanges = () => {
    const sentences = items
      .map((item) => normalizeSentence(item.text))
      .filter(Boolean);

    if (!sentences.length) {
      setNotice('Cần ít nhất một câu trước khi áp dụng.');
      return;
    }

    const invalid = sentences.filter((sentence) => tokenizeSentence(sentence).length < 2);
    if (invalid.length) {
      setNotice(`Còn ${invalid.length} câu có dưới 2 thẻ. Hãy sửa hoặc xóa trước khi áp dụng.`);
      return;
    }

    const syncedImmediately = writeCurrentSentences(sentences.join('\n'));
    onApplied(syncedImmediately
      ? `Đã cập nhật ${sentences.length} câu vào trò chơi.`
      : `Đã lưu ${sentences.length} câu. Mở lại ứng dụng để đồng bộ giao diện.`);
    onClose();
  };

  return (
    <div className="fwgqm-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        ref={dialogRef}
        className="fwgqm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fwgqm-title"
      >
        <header className="fwgqm-header">
          <div className="fwgqm-heading-mark"><ListChecks aria-hidden="true" /></div>
          <div>
            <span>Brian Flying Words · Giai đoạn 2</span>
            <h2 id="fwgqm-title">Quản lý từng câu</h2>
            <p>Chỉnh từng câu, đổi thứ tự và kiểm tra thẻ trước khi mở màn hình chơi.</p>
          </div>
          <button type="button" className="fwgqm-close" onClick={onClose} aria-label="Đóng">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="fwgqm-toolbar">
          <label className="fwgqm-search">
            <Search aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trong danh sách câu..." />
          </label>
          <button type="button" onClick={addItem}><Plus aria-hidden="true" /> Thêm câu</button>
          <button type="button" onClick={normalizeAll}><Sparkles aria-hidden="true" /> Chuẩn hóa</button>
          <button type="button" onClick={removeDuplicates}><Trash2 aria-hidden="true" /> Xóa câu trùng</button>
          <button type="button" onClick={reloadFromEditor}><RefreshCw aria-hidden="true" /> Nạp lại</button>
        </div>

        <div className="fwgqm-stats" aria-label="Thống kê danh sách câu">
          <div><strong>{stats.total}</strong><span>Tổng câu</span></div>
          <div><strong>{stats.valid}</strong><span>Câu hợp lệ</span></div>
          <div><strong>{stats.tokens}</strong><span>Tổng thẻ</span></div>
          <div className={stats.warnings ? 'is-warning' : ''}><strong>{stats.warnings}</strong><span>Cảnh báo</span></div>
        </div>

        {notice ? (
          <div className="fwgqm-notice" role="status">
            <FileText aria-hidden="true" />
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')} aria-label="Ẩn thông báo"><X /></button>
          </div>
        ) : null}

        <div className="fwgqm-list" aria-live="polite">
          {visibleItems.length ? visibleItems.map((item) => {
            const originalIndex = items.findIndex((entry) => entry.id === item.id);
            const tokens = tokenizeSentence(item.text);
            const tooShort = item.text.trim() && tokens.length < 2;
            const tooLong = tokens.length > 16;
            const duplicate = duplicateIds.has(item.id);
            const hasWarning = tooShort || tooLong || duplicate;

            return (
              <article
                key={item.id}
                className={`fwgqm-card ${hasWarning ? 'has-warning' : ''}`}
                data-fwg-question-id={item.id}
              >
                <div className="fwgqm-card-index">{String(originalIndex + 1).padStart(2, '0')}</div>
                <div className="fwgqm-card-main">
                  <label>
                    <span>Câu {originalIndex + 1}</span>
                    <textarea
                      rows={2}
                      value={item.text}
                      onChange={(event) => updateItem(item.id, event.target.value)}
                      placeholder="Nhập câu hoàn chỉnh..."
                      spellCheck="false"
                    />
                  </label>

                  <div className="fwgqm-token-line">
                    <span className="fwgqm-token-label">{tokens.length} thẻ</span>
                    <div className="fwgqm-token-preview">
                      {tokens.length
                        ? tokens.map((token, index) => <i key={`${item.id}-${index}`}>{token}</i>)
                        : <em>Thẻ sẽ xuất hiện tại đây.</em>}
                    </div>
                  </div>

                  {hasWarning ? (
                    <div className="fwgqm-warning-row">
                      <AlertTriangle aria-hidden="true" />
                      {tooShort ? <span>Câu cần ít nhất 2 thẻ.</span> : null}
                      {tooLong ? <span>Câu có hơn 16 thẻ, có thể khó quan sát trên máy chiếu.</span> : null}
                      {duplicate ? <span>Nội dung đang trùng với một câu khác.</span> : null}
                    </div>
                  ) : null}
                </div>

                <div className="fwgqm-card-actions">
                  <button type="button" onClick={() => moveItem(item.id, -1)} disabled={originalIndex === 0} aria-label="Đưa câu lên">
                    <ArrowUp aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => moveItem(item.id, 1)} disabled={originalIndex === items.length - 1} aria-label="Đưa câu xuống">
                    <ArrowDown aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => duplicateItem(item.id)} aria-label="Nhân bản câu">
                    <Copy aria-hidden="true" />
                  </button>
                  <button type="button" className="is-danger" onClick={() => removeItem(item.id)} aria-label="Xóa câu">
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          }) : (
            <div className="fwgqm-empty">
              <Search aria-hidden="true" />
              <strong>Không tìm thấy câu phù hợp</strong>
              <span>Đổi từ khóa tìm kiếm hoặc thêm một câu mới.</span>
            </div>
          )}
        </div>

        <footer className="fwgqm-footer">
          <div>
            <strong>Mẹo tạo cụm từ</strong>
            <span>Dùng ngoặc vuông để giữ cụm trên cùng một thẻ: <code>[New York]</code></span>
          </div>
          <button type="button" className="fwgqm-cancel" onClick={onClose}>Hủy</button>
          <button type="button" className="fwgqm-apply" onClick={applyChanges}>
            <Check aria-hidden="true" /> Áp dụng vào trò chơi
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function FlyingWordsGamePlus(props) {
  const [managerOpen, setManagerOpen] = useState(false);
  const [setupVisible, setSetupVisible] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const scan = () => setSetupVisible(Boolean(document.querySelector('.flying-words-app .fwg-setup')));
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <FlyingWordsGame {...props} />

      {setupVisible && !managerOpen ? (
        <button type="button" className="fwgqm-launcher" onClick={() => setManagerOpen(true)}>
          <span><ListChecks aria-hidden="true" /></span>
          <strong>Quản lý từng câu</strong>
          <small>Thêm · sửa · xóa · đổi thứ tự</small>
        </button>
      ) : null}

      {managerOpen ? (
        <QuestionManagerModal
          onClose={() => setManagerOpen(false)}
          onApplied={setToast}
        />
      ) : null}

      {toast ? (
        <div className="fwgqm-toast" role="status">
          <Check aria-hidden="true" /> {toast}
        </div>
      ) : null}
    </>
  );
}
