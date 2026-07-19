import React, { useEffect, useMemo, useRef, useState } from 'react';
import { canPublishDepartment } from '../utils/permissions.js';
import {
  THPT_MAX_HTML_BYTES,
  deleteThptLesson,
  isLessonOwner,
  loadThptLessonHtml,
  reviewThptLesson,
  saveThptLesson,
  subscribeThptLessons,
  validateHtmlFile,
} from '../utils/thptPracticeHub.js';
import './THPTPracticeHub.css';

const EMPTY_DRAFT = { title: '', description: '', topic: '', grade: '12', cefr: 'B2–C1', visibility: 'department', status: 'approved' };
const STATUS_LABELS = {
  pending: ['Chờ duyệt', 'Pending'], approved: ['Đã duyệt', 'Approved'], revision: ['Cần chỉnh sửa', 'Revision needed'], rejected: ['Từ chối', 'Rejected'],
};

function formatBytes(bytes = 0) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
function formatDate(value, language) {
  if (!value) return '';
  try { return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  catch { return String(value); }
}
function initials(title = '') { return String(title).split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'TH'; }

export default function THPTPracticeHub({ currentUser, language = 'vi' }) {
  const vi = language === 'vi';
  const leader = canPublishDepartment(currentUser);
  const [lessons, setLessons] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [selectedFile, setSelectedFile] = useState(null);
  const [player, setPlayer] = useState(null);
  const [playerHtml, setPlayerHtml] = useState('');
  const [playerKey, setPlayerKey] = useState(0);
  const [fullscreenFallback, setFullscreenFallback] = useState(false);
  const playerRef = useRef(null);

  useEffect(() => subscribeThptLessons(currentUser, setLessons), [currentUser?.id, currentUser?.email, currentUser?.role]);
  useEffect(() => {
    const sync = () => {
      const element = document.fullscreenElement || document.webkitFullscreenElement;
      if (!element) setFullscreenFallback(false);
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return lessons.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!needle) return true;
      return [item.title, item.description, item.topic, item.grade, item.cefr, item.ownerName].join(' ').toLowerCase().includes(needle);
    });
  }, [lessons, query, statusFilter]);

  const stats = useMemo(() => ({
    total: lessons.length,
    approved: lessons.filter((item) => item.status === 'approved').length,
    pending: lessons.filter((item) => item.status === 'pending').length,
    storage: lessons.reduce((sum, item) => sum + Number(item.fileSize || 0), 0),
  }), [lessons]);

  function openCreate() {
    setDraft({ ...EMPTY_DRAFT, status: leader ? 'approved' : 'pending' });
    setSelectedFile(null);
    setModalOpen(true);
    setNotice('');
  }
  function openEdit(item) {
    setDraft({ ...item });
    setSelectedFile(null);
    setModalOpen(true);
    setNotice('');
  }
  function closeModal() { if (!busy) { setModalOpen(false); setSelectedFile(null); } }

  async function submitLesson(event) {
    event.preventDefault();
    if (!draft.title.trim()) return setNotice(vi ? 'Vui lòng nhập tên bài.' : 'Enter a lesson title.');
    if (!draft.id && !selectedFile) return setNotice(vi ? 'Vui lòng chọn file HTML.' : 'Choose an HTML file.');
    if (selectedFile) {
      const validation = validateHtmlFile(selectedFile);
      if (!validation.ok) return setNotice(validation.message);
    }
    setBusy(true); setNotice('');
    const result = await saveThptLesson(currentUser, draft, selectedFile);
    setBusy(false);
    if (!result.ok) return setNotice(result.message || (vi ? 'Không thể lưu bài.' : 'Unable to save lesson.'));
    setModalOpen(false); setSelectedFile(null);
    setNotice(result.warning || (leader ? (vi ? 'Đã lưu bài vào kho luyện thi.' : 'Lesson saved.') : (vi ? 'Đã gửi bài cho TTCM duyệt.' : 'Lesson sent for review.')));
  }

  async function runLesson(item) {
    setBusy(true); setNotice('');
    const result = await loadThptLessonHtml(currentUser, item);
    setBusy(false);
    if (!result.ok) return setNotice(result.message);
    setPlayer(result.lesson || item);
    setPlayerHtml(result.html);
    setPlayerKey((value) => value + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function closePlayer() {
    const doc = document;
    if (doc.fullscreenElement && doc.exitFullscreen) await doc.exitFullscreen().catch(() => null);
    else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    setFullscreenFallback(false); setPlayer(null); setPlayerHtml('');
  }

  async function toggleFullscreen() {
    const element = playerRef.current;
    const doc = document;
    const active = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (active) {
      if (doc.exitFullscreen) await doc.exitFullscreen().catch(() => null);
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      setFullscreenFallback(false);
      return;
    }
    try {
      if (element?.requestFullscreen) await element.requestFullscreen({ navigationUI: 'hide' });
      else if (element?.webkitRequestFullscreen) element.webkitRequestFullscreen();
      else throw new Error('Fullscreen API unavailable');
    } catch {
      setFullscreenFallback(true);
    }
  }

  async function review(item, status) {
    const promptText = status === 'approved'
      ? (vi ? 'Ghi chú duyệt (có thể bỏ trống):' : 'Approval note (optional):')
      : (vi ? 'Nhập phản hồi cho giáo viên:' : 'Feedback for the teacher:');
    const note = window.prompt(promptText, item.reviewNote || '');
    if (note === null) return;
    setBusy(true);
    const result = await reviewThptLesson(currentUser, item.id, status, note);
    setBusy(false);
    setNotice(result.ok ? (vi ? 'Đã cập nhật trạng thái bài.' : 'Lesson status updated.') : result.message);
  }

  async function remove(item) {
    if (!window.confirm(vi ? `Xoá “${item.title}”?` : `Delete “${item.title}”?`)) return;
    setBusy(true);
    const result = await deleteThptLesson(currentUser, item.id);
    setBusy(false);
    setNotice(result.ok ? (result.warning || (vi ? 'Đã xoá bài.' : 'Lesson deleted.')) : result.message);
  }

  if (player) {
    const fullActive = Boolean(document.fullscreenElement || document.webkitFullscreenElement || fullscreenFallback);
    return (
      <section ref={playerRef} className={`thpt-player ${fullscreenFallback ? 'is-fallback-fullscreen' : ''}`}>
        <header className="thpt-player-bar">
          <button type="button" onClick={closePlayer}>← {vi ? 'Đóng bài' : 'Close'}</button>
          <div className="thpt-player-title"><span>{initials(player.title)}</span><div><strong>{player.title}</strong><small>{player.topic || player.fileName}</small></div></div>
          <div className="thpt-player-actions">
            <button type="button" onClick={() => setPlayerKey((value) => value + 1)}>↻ {vi ? 'Tải lại' : 'Reload'}</button>
            <button type="button" className="primary" onClick={toggleFullscreen}>{fullActive ? '↙' : '⛶'} {fullActive ? (vi ? 'Thoát toàn màn hình' : 'Exit fullscreen') : (vi ? 'Toàn màn hình' : 'Fullscreen')}</button>
          </div>
        </header>
        <iframe key={playerKey} title={player.title} srcDoc={playerHtml} sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads allow-pointer-lock allow-presentation" allow="fullscreen; clipboard-read; clipboard-write; microphone; camera" />
      </section>
    );
  }

  return (
    <div className="page thpt-practice-page">
      <section className="thpt-hero">
        <div className="thpt-hero-copy">
          <span className="eyebrow">BRIAN ENGLISH · THPT PRACTICE HUB</span>
          <h1>{vi ? 'Luyện thi THPT' : 'THPT Exam Practice'}</h1>
          <p>{vi ? 'Tải lên, duyệt, tổ chức và chạy trực tiếp các bài học tương tác HTML. Giáo viên gửi bài; TTCM kiểm tra trước khi chia sẻ cho toàn tổ.' : 'Upload, review, organize and run interactive HTML lessons. Teachers submit lessons for department approval.'}</p>
          <div className="thpt-hero-actions">
            <button type="button" className="primary" onClick={openCreate}>＋ {leader ? (vi ? 'Thêm bài mới' : 'Add lesson') : (vi ? 'Gửi bài TTCM duyệt' : 'Submit lesson')}</button>
            <span>{vi ? 'HTML/HTM · tối đa 20 MB · chạy trong Brian' : 'HTML/HTM · up to 20 MB · runs inside Brian'}</span>
          </div>
        </div>
        <div className="thpt-stat-grid">
          <article><strong>{stats.total}</strong><span>{vi ? 'Tổng số bài' : 'Total'}</span></article>
          <article><strong>{stats.approved}</strong><span>{vi ? 'Đã duyệt' : 'Approved'}</span></article>
          <article><strong>{stats.pending}</strong><span>{vi ? 'Chờ duyệt' : 'Pending'}</span></article>
          <article><strong>{formatBytes(stats.storage)}</strong><span>{vi ? 'Dung lượng' : 'Storage'}</span></article>
        </div>
      </section>

      {notice ? <div className="thpt-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')}>×</button></div> : null}

      <section className="thpt-toolbar">
        <label className="thpt-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={vi ? 'Tìm tên bài, chuyên đề, giáo viên…' : 'Search lessons, topics or teachers…'} /></label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">{vi ? 'Tất cả trạng thái' : 'All statuses'}</option>
          {Object.entries(STATUS_LABELS).map(([key, labels]) => <option key={key} value={key}>{vi ? labels[0] : labels[1]}</option>)}
        </select>
        <button type="button" onClick={openCreate}>＋ {vi ? 'Thêm HTML' : 'Add HTML'}</button>
      </section>

      <section className="thpt-library-heading">
        <div><span className="eyebrow">{leader ? (vi ? 'KHO TTCM' : 'DEPARTMENT LIBRARY') : (vi ? 'KHO BÀI LUYỆN' : 'PRACTICE LIBRARY')}</span><h2>{vi ? 'Bài học tương tác' : 'Interactive lessons'}</h2></div>
        <small>{filtered.length}/{lessons.length} {vi ? 'bài' : 'lessons'}</small>
      </section>

      <section className="thpt-card-grid">
        {filtered.map((item) => {
          const owner = isLessonOwner(currentUser, item);
          const editable = leader || (owner && item.status !== 'approved');
          const deletable = leader || (owner && item.status !== 'approved');
          return (
            <article key={item.id} className={`thpt-lesson-card status-${item.status}`}>
              <div className="thpt-card-top"><span className="thpt-card-icon">{initials(item.title)}</span><span className={`thpt-status status-${item.status}`}>{vi ? STATUS_LABELS[item.status][0] : STATUS_LABELS[item.status][1]}</span></div>
              <div className="thpt-card-copy"><small>{item.topic || (vi ? 'Chuyên đề THPT' : 'THPT topic')}</small><h3>{item.title}</h3><p>{item.description || (vi ? 'Bài học HTML tương tác chạy trực tiếp trong Brian.' : 'Interactive HTML lesson running inside Brian.')}</p></div>
              <div className="thpt-meta"><span>Lớp {item.grade || '12'}</span><span>{item.cefr || 'B2–C1'}</span><span>{formatBytes(item.fileSize)}</span></div>
              <div className="thpt-owner"><span>{item.ownerName || item.ownerEmail}</span><small>{formatDate(item.updatedAt, language)}</small></div>
              {item.reviewNote ? <div className="thpt-review-note"><strong>{vi ? 'Phản hồi TTCM:' : 'Review:'}</strong> {item.reviewNote}</div> : null}
              <div className="thpt-card-actions">
                <button type="button" className="primary" disabled={busy} onClick={() => runLesson(item)}>▶ {vi ? 'Chạy bài' : 'Run'}</button>
                {editable ? <button type="button" disabled={busy} onClick={() => openEdit(item)}>{vi ? 'Sửa' : 'Edit'}</button> : null}
                {leader && item.status !== 'approved' ? <button type="button" className="approve" disabled={busy} onClick={() => review(item, 'approved')}>{vi ? 'Duyệt' : 'Approve'}</button> : null}
                {leader && item.status !== 'revision' ? <button type="button" disabled={busy} onClick={() => review(item, 'revision')}>{vi ? 'Yêu cầu sửa' : 'Revision'}</button> : null}
                {leader && item.status !== 'rejected' ? <button type="button" className="danger-text" disabled={busy} onClick={() => review(item, 'rejected')}>{vi ? 'Từ chối' : 'Reject'}</button> : null}
                {deletable ? <button type="button" className="danger-text" disabled={busy} onClick={() => remove(item)}>{vi ? 'Xoá' : 'Delete'}</button> : null}
              </div>
            </article>
          );
        })}
        {!filtered.length ? <div className="thpt-empty"><span>TH</span><h3>{vi ? 'Chưa có bài phù hợp' : 'No matching lessons'}</h3><p>{vi ? 'Tải lên một file HTML hoặc đổi bộ lọc.' : 'Upload an HTML file or change the filters.'}</p><button type="button" onClick={openCreate}>＋ {vi ? 'Thêm bài đầu tiên' : 'Add first lesson'}</button></div> : null}
      </section>

      {modalOpen ? (
        <div className="thpt-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <section className="thpt-modal" role="dialog" aria-modal="true" aria-labelledby="thpt-form-title">
            <header><div><small>{leader ? 'TTCM / ADMIN' : (vi ? 'GIÁO VIÊN' : 'TEACHER')}</small><h2 id="thpt-form-title">{draft.id ? (vi ? 'Cập nhật bài luyện' : 'Update lesson') : (leader ? (vi ? 'Thêm bài vào kho THPT' : 'Add THPT lesson') : (vi ? 'Gửi bài cho TTCM duyệt' : 'Submit lesson for review'))}</h2><p>{vi ? 'File nên là một trang HTML độc lập, đã nhúng sẵn CSS, JavaScript và tài nguyên cần thiết.' : 'Use a self-contained HTML file with its CSS, JavaScript and assets embedded.'}</p></div><button type="button" onClick={closeModal}>×</button></header>
            <form onSubmit={submitLesson}>
              <div className="thpt-form-grid">
                <label><span>{vi ? 'Tên bài' : 'Lesson title'} *</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={vi ? 'Ví dụ: 12 thì trong đề THPT 2025' : 'e.g. Twelve Tenses for THPT 2025'} autoFocus /></label>
                <label><span>{vi ? 'Chuyên đề' : 'Topic'}</span><input value={draft.topic || ''} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} placeholder={vi ? 'Ngữ pháp, đọc hiểu, từ vựng…' : 'Grammar, reading, vocabulary…'} /></label>
                <label><span>{vi ? 'Khối lớp' : 'Grade'}</span><select value={draft.grade || '12'} onChange={(event) => setDraft({ ...draft, grade: event.target.value })}><option value="10">10</option><option value="11">11</option><option value="12">12</option><option value="10–12">10–12</option></select></label>
                <label><span>CEFR</span><select value={draft.cefr || 'B2–C1'} onChange={(event) => setDraft({ ...draft, cefr: event.target.value })}><option>B1–B2</option><option>B2</option><option>B2–C1</option><option>C1</option><option>C1–C2</option></select></label>
                {leader ? <label><span>{vi ? 'Phạm vi' : 'Visibility'}</span><select value={draft.visibility || 'department'} onChange={(event) => setDraft({ ...draft, visibility: event.target.value })}><option value="department">{vi ? 'Chia sẻ toàn tổ' : 'Department'}</option><option value="private">{vi ? 'Chỉ người tải và TTCM' : 'Private'}</option></select></label> : null}
                {leader ? <label><span>{vi ? 'Trạng thái khi lưu' : 'Save status'}</span><select value={draft.status || 'approved'} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="approved">{vi ? 'Duyệt ngay' : 'Approved'}</option><option value="pending">{vi ? 'Chờ duyệt' : 'Pending'}</option><option value="revision">{vi ? 'Cần chỉnh sửa' : 'Revision'}</option></select></label> : null}
                <label className="thpt-description"><span>{vi ? 'Mô tả ngắn' : 'Description'}</span><textarea rows="3" value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder={vi ? 'Nội dung, dạng bài, thời lượng hoặc đối tượng học sinh…' : 'Content, format, duration or target learners…'} /></label>
                <label className="thpt-file-field"><span>{draft.id ? (vi ? 'Thay file HTML (không bắt buộc)' : 'Replace HTML (optional)') : (vi ? 'File HTML' : 'HTML file')} *</span><input type="file" accept=".html,.htm,text/html" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} /><small>{selectedFile ? `${selectedFile.name} · ${formatBytes(selectedFile.size)}` : draft.fileName ? `${vi ? 'Đang dùng' : 'Current'}: ${draft.fileName}` : `${vi ? 'Tối đa' : 'Maximum'} ${formatBytes(THPT_MAX_HTML_BYTES)}`}</small></label>
              </div>
              <div className="thpt-form-note">🔒 {vi ? 'Bài chạy trong iframe sandbox. Chỉ tải lên HTML từ nguồn đáng tin cậy; ứng dụng không tự mở tab mới.' : 'Lessons run in a sandboxed iframe. Upload trusted HTML only; the app does not open new tabs.'}</div>
              <footer><button type="button" onClick={closeModal}>{vi ? 'Huỷ' : 'Cancel'}</button><button type="submit" className="primary" disabled={busy}>{busy ? (vi ? 'Đang lưu…' : 'Saving…') : (leader ? (vi ? 'Lưu vào kho' : 'Save lesson') : (vi ? 'Gửi TTCM duyệt' : 'Submit for review'))}</button></footer>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
