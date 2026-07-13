import React, { useEffect, useMemo, useState } from 'react';
import { captureCurrentPagePayload, createTransfer, TRANSFER_OPEN_EVENT } from '../utils/contentTransfer.js';
import { enqueueSync } from '../utils/syncQueue.js';

const CONNECTED_TEACHING_APPS = new Set(['worksheet-factory','reading-studio','speaking-studio','exam-studio','lesson-plan-ai','student-practice','assessment-core','content-factory','word2graph','textlab-activities','news']);

const TARGETS = [
  { id: 'content-ecosystem', route: '#/content-ecosystem', label: 'Content Ecosystem', labelVi: 'Hệ sinh thái nội dung', icon: 'CE', descVi: 'Lưu thành tài sản và đưa vào dây chuyền nhiều ứng dụng', desc: 'Save as an asset and run it through multi-app production recipes' },
  { id: 'lesson-pack', route: '#/lesson-pack', label: 'Lesson Pack', labelVi: 'Gói bài dạy', icon: 'LP', descVi: 'Thêm nội dung vào tiến trình bài dạy', desc: 'Add content to a connected lesson sequence' },
  { id: 'worksheet-factory', route: '#/tool/worksheet-factory', label: 'Worksheet Factory', labelVi: 'Worksheet Factory', icon: 'WF', descVi: 'Tạo phiếu học tập từ nội dung hiện tại', desc: 'Create a worksheet from current content' },
  { id: 'exam-studio', route: '#/tool/exam-studio', label: 'Exam Studio', labelVi: 'Exam Studio', icon: 'EX', descVi: 'Chuyển thành câu hỏi hoặc đề kiểm tra', desc: 'Turn it into questions or a test' },
  { id: 'word2graph', route: '#/tool/word2graph', label: 'WordGraph Studio', labelVi: 'WordGraph Studio', icon: 'WG', descVi: 'Tạo sơ đồ từ vựng và ý tưởng', desc: 'Build a vocabulary or idea map' },
  { id: 'textlab-activities', route: '#/tool/textlab-activities', label: 'TextLab Activities', labelVi: 'TextLab Activities', icon: 'TL', descVi: 'Biến nội dung thành hoạt động tương tác', desc: 'Turn content into interactive activities' },
  { id: 'lesson-plan-ai', route: '#/tool/lesson-plan-ai', label: 'Lesson Architect', labelVi: 'Lesson Architect', icon: 'LA', descVi: 'Đưa nội dung vào kế hoạch bài dạy', desc: 'Use content in a lesson plan' },
  { id: 'library', route: '#/library', label: 'Library', labelVi: 'Thư viện', icon: 'LI', descVi: 'Lưu để sử dụng lại sau', desc: 'Save for later reuse' },
];

export default function ContentTransferHub({ currentUser, currentRoute, selectedTool, language = 'vi', accent = '#3B4CCA' }) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState(null);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [quickNotice, setQuickNotice] = useState('');

  useEffect(() => {
    const onOpen = (event) => {
      const captured = event?.detail?.content
        ? { ...captureCurrentPagePayload({ route: currentRoute, selectedTool, language }), ...event.detail }
        : captureCurrentPagePayload({ route: currentRoute, selectedTool, language });
      setPayload(captured);
      setQuery('');
      setNotice('');
      setOpen(true);
    };
    window.addEventListener(TRANSFER_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(TRANSFER_OPEN_EVENT, onOpen);
  }, [currentRoute, selectedTool?.slug, language]);

  const filtered = useMemo(() => TARGETS.filter((target) => {
    const text = `${target.label} ${target.labelVi} ${target.descVi} ${target.desc}`.toLowerCase();
    return !query.trim() || text.includes(query.trim().toLowerCase());
  }), [query]);

  const begin = () => {
    setPayload(captureCurrentPagePayload({ route: currentRoute, selectedTool, language }));
    setOpen(true);
    setNotice('');
  };

  const send = (target) => {
    const item = createTransfer(currentUser, { ...payload, target: target.id });
    if (!item) return;
    if (!navigator.onLine) enqueueSync(currentUser, { type: 'content-transfer', label: `${payload?.title || 'Content'} → ${target.label}`, payload: { transferId: item.id, target: target.id } });
    setNotice(language === 'vi' ? `Đã gửi sang ${target.labelVi}.` : `Sent to ${target.label}.`);
    window.setTimeout(() => {
      setOpen(false);
      window.location.hash = target.route;
    }, 280);
  };

  const currentAppId = selectedTool?.slug || currentRoute;
  const showQuickLessonPack = CONNECTED_TEACHING_APPS.has(currentAppId);
  const quickAddToLessonPack = () => {
    const captured = captureCurrentPagePayload({ route: currentRoute, selectedTool, language });
    const item = createTransfer(currentUser, { ...captured, target: 'lesson-pack' });
    if (!item) return;
    setQuickNotice(language === 'vi' ? 'Đã thêm vào hàng chờ Lesson Pack.' : 'Added to the Lesson Pack inbox.');
    window.setTimeout(() => setQuickNotice(''), 2400);
  };

  return (
    <>
      {showQuickLessonPack ? <button type="button" className="bes-lesson-pack-quick-add" style={{ '--transfer-accent': accent }} onClick={quickAddToLessonPack} title={language === 'vi' ? 'Thêm nhanh vào Lesson Pack' : 'Quick add to Lesson Pack'}><span>＋</span><b>Lesson Pack</b></button> : null}
      {quickNotice ? <div className="bes-lesson-pack-quick-notice">✓ {quickNotice}</div> : null}
      <button type="button" className="bes-transfer-fab" style={{ '--transfer-accent': accent }} onClick={begin} title={language === 'vi' ? 'Gửi nội dung sang ứng dụng khác' : 'Send content to another app'}>
        <span aria-hidden="true">↗</span><b>{language === 'vi' ? 'Gửi sang' : 'Send to'}</b>
      </button>
      {open ? (
        <div className="bes-transfer-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="bes-transfer-panel" role="dialog" aria-modal="true" aria-label={language === 'vi' ? 'Gửi nội dung sang ứng dụng khác' : 'Send content to another app'}>
            <header>
              <div>
                <span className="bes-transfer-kicker">CONNECTED WORKFLOW</span>
                <h2>{language === 'vi' ? 'Gửi sang ứng dụng khác' : 'Send to another app'}</h2>
                <p>{language === 'vi' ? 'Nội dung được chuyển có cấu trúc, không cần sao chép thủ công.' : 'Transfer structured content without manual copy and paste.'}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={language === 'vi' ? 'Đóng' : 'Close'}>×</button>
            </header>
            <div className="bes-transfer-source">
              <div className="bes-transfer-source-icon">{String(selectedTool?.icon || currentRoute || 'BR').slice(0, 2).toUpperCase()}</div>
              <div><small>{language === 'vi' ? 'Nội dung nguồn' : 'Source content'}</small><strong>{payload?.title || document.title}</strong><span>{Number(payload?.content?.length || 0).toLocaleString()} {language === 'vi' ? 'ký tự' : 'characters'}</span></div>
            </div>
            <label className="bes-transfer-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === 'vi' ? 'Tìm ứng dụng đích…' : 'Find a destination app…'} /></label>
            <div className="bes-transfer-targets">
              {filtered.map((target) => (
                <button key={target.id} type="button" onClick={() => send(target)}>
                  <span className="bes-transfer-target-icon">{target.icon}</span>
                  <span><strong>{language === 'vi' ? target.labelVi : target.label}</strong><small>{language === 'vi' ? target.descVi : target.desc}</small></span>
                  <i>→</i>
                </button>
              ))}
            </div>
            {notice ? <div className="bes-transfer-notice">✓ {notice}</div> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
