import React, { useCallback, useEffect, useRef, useState } from 'react';
import ResourceLibraryBase from './ResourceLibraryBase.jsx';
import { getAccessToken, loadResourceLibrary, RESOURCE_EVENT } from '../utils/resourceLibrary.js';
import '../features/resource-library/textlabInteractiveResources.css';

function isTextLabInteractiveResource(item) {
  const tags = Array.isArray(item?.tags) ? item.tags.map((tag) => String(tag).toLowerCase()) : [];
  const filename = String(item?.fileName || '').toLowerCase();
  const source = String(item?.source || '').toLowerCase();
  return filename.endsWith('.html') && (
    tags.includes('textlab-activity')
    || tags.includes('interactive-html')
    || source.includes('brian textlab activities')
  );
}

function normaliseTitle(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function currentTextLabItems() {
  return loadResourceLibrary().items.filter(isTextLabInteractiveResource);
}

export default function ResourceLibrary(props) {
  const shellRef = useRef(null);
  const runnerRef = useRef(null);
  const [activeItem, setActiveItem] = useState(null);
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [frameKey, setFrameKey] = useState(0);

  const decorateCards = useCallback(() => {
    const root = shellRef.current;
    if (!root) return;
    const items = currentTextLabItems();
    const byTitle = new Map();
    for (const item of items) {
      const key = normaliseTitle(item.title || item.fileName);
      if (!byTitle.has(key)) byTitle.set(key, item);
    }

    root.querySelectorAll('.resource-library-card').forEach((card) => {
      const title = normaliseTitle(card.querySelector('h3')?.textContent);
      const item = byTitle.get(title);
      if (!item) {
        card.removeAttribute('data-textlab-resource-id');
        return;
      }

      card.dataset.textlabResourceId = item.cloudId || item.id;
      const buttons = [...card.querySelectorAll('.resource-card-actions button')];
      const previewButton = buttons.find((candidate) => {
        const label = normaliseTitle(candidate.textContent);
        return label === 'xem' || label === 'view' || candidate.dataset.textlabRun === 'true';
      });
      if (previewButton) {
        previewButton.dataset.textlabRun = 'true';
        previewButton.classList.add('resource-textlab-run-button');
        if (previewButton.textContent !== '▶ Chạy trực tiếp') previewButton.textContent = '▶ Chạy trực tiếp';
        previewButton.setAttribute('aria-label', `Chạy trực tiếp ${item.title || item.fileName}`);
      }
    });
  }, []);

  useEffect(() => {
    const root = shellRef.current;
    if (!root) return undefined;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(decorateCards);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener(RESOURCE_EVENT, schedule);
    const timer = window.setInterval(schedule, 1600);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener(RESOURCE_EVENT, schedule);
      window.clearInterval(timer);
    };
  }, [decorateCards]);

  const fetchInteractiveHtml = useCallback(async (item) => {
    if (!item?.driveFileId) throw new Error('Hoạt động chưa có file HTML trên Google Drive.');
    const token = await getAccessToken();
    if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để chạy học liệu.');
    const params = new URLSearchParams({
      resourceId: item.cloudId || item.id,
      fileId: item.driveFileId,
      mode: 'inline',
    });
    const response = await fetch(`/api/google-drive-file?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      let message = 'Không thể đọc hoạt động từ Kho học liệu.';
      try { message = (await response.json()).error || message; } catch { /* non-JSON response */ }
      throw new Error(message);
    }
    return response.text();
  }, []);

  const runItem = useCallback(async (item) => {
    setActiveItem(item);
    setHtml('');
    setError('');
    setLoading(true);
    setFrameKey((value) => value + 1);
    try {
      const source = await fetchInteractiveHtml(item);
      if (!/<!doctype html|<html[\s>]/i.test(source)) throw new Error('File học liệu không chứa tài liệu HTML hợp lệ.');
      setHtml(source);
      window.setTimeout(() => runnerRef.current?.scrollIntoView({ block: 'center' }), 0);
    } catch (nextError) {
      setError(nextError?.message || 'Không thể chạy hoạt động.');
    } finally {
      setLoading(false);
    }
  }, [fetchInteractiveHtml]);

  const handleCapture = useCallback((event) => {
    const button = event.target.closest('button[data-textlab-run="true"]');
    if (!button || !shellRef.current?.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();
    const card = button.closest('.resource-library-card');
    const resourceId = card?.dataset.textlabResourceId;
    const title = normaliseTitle(card?.querySelector('h3')?.textContent);
    const item = currentTextLabItems().find((entry) => (
      String(entry.cloudId || entry.id) === String(resourceId || '')
      || normaliseTitle(entry.title || entry.fileName) === title
    ));
    if (item) runItem(item);
  }, [runItem]);

  const reload = () => {
    if (activeItem) runItem(activeItem);
  };

  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await runnerRef.current?.requestFullscreen?.();
    } catch {
      setError('Trình duyệt không cho phép mở toàn màn hình trong phiên này.');
    }
  };

  const close = () => {
    setActiveItem(null);
    setHtml('');
    setError('');
    setLoading(false);
  };

  return (
    <div ref={shellRef} className="resource-library-interactive-shell" onClickCapture={handleCapture}>
      <ResourceLibraryBase {...props} />

      {activeItem ? (
        <div className="textlab-library-runner-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section ref={runnerRef} className="textlab-library-runner" role="dialog" aria-modal="true" aria-label={`Chạy trực tiếp ${activeItem.title || activeItem.fileName}`}>
            <header className="textlab-library-runner__header">
              <div className="textlab-library-runner__identity">
                <span className="textlab-library-runner__icon" aria-hidden="true">▶</span>
                <div>
                  <small>TEXTLAB · CHẠY TRỰC TIẾP TỪ KHO HỌC LIỆU</small>
                  <strong>{activeItem.title || activeItem.fileName}</strong>
                  <span>{activeItem.uploaderName || 'Giáo viên'} · {activeItem.cefr || 'Mọi trình độ'}</span>
                </div>
              </div>
              <div className="textlab-library-runner__actions">
                <button type="button" onClick={reload}>↻ Chơi lại</button>
                <button type="button" onClick={fullscreen}>⛶ Toàn màn hình</button>
                <button type="button" className="close" onClick={close} aria-label="Đóng hoạt động">×</button>
              </div>
            </header>
            <div className="textlab-library-runner__body">
              {loading ? <div className="textlab-library-runner__state"><div><strong>Đang mở hoạt động…</strong><p>Brian đang đọc file HTML từ Kho học liệu và khởi động trò chơi trực tiếp.</p></div></div> : null}
              {error ? <div className="textlab-library-runner__state is-error"><div><strong>Không thể chạy hoạt động</strong><p>{error}</p></div></div> : null}
              {!loading && !error && html ? (
                <iframe
                  key={frameKey}
                  title={activeItem.title || 'TextLab Activity'}
                  srcDoc={html}
                  allow="fullscreen; autoplay"
                  allowFullScreen
                  sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
                />
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
