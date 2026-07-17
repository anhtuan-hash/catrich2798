import React, { useEffect, useMemo, useRef, useState } from 'react';
import './THPTPracticeHub.css';

const DB_NAME = 'brian-thpt-practice-hub';
const STORE_NAME = 'lessons';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function listLessons() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result || []).sort((a, b) => b.updatedAt - a.updatedAt));
    request.onerror = () => reject(request.error);
  });
}

async function putLesson(lesson) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(lesson);
    tx.oncomplete = () => resolve(lesson);
    tx.onerror = () => reject(tx.error);
  });
}

async function removeLesson(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function formatSize(size = 0) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `lesson-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function THPTPracticeHub({ language = 'vi' }) {
  const vi = language === 'vi';
  const fileRef = useRef(null);
  const [lessons, setLessons] = useState([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [activeId, setActiveId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const activeLesson = useMemo(() => lessons.find((item) => item.id === activeId) || null, [lessons, activeId]);

  const refresh = async (preferredId = '') => {
    const next = await listLessons();
    setLessons(next);
    setActiveId((current) => preferredId || (next.some((item) => item.id === current) ? current : next[0]?.id || ''));
  };

  useEffect(() => {
    refresh().catch(() => setMessage(vi ? 'Không thể đọc kho bài học trên trình duyệt.' : 'Could not read the browser lesson library.'));
  }, []);

  const chooseFile = (event) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) return;
    const htmlLike = selected.type === 'text/html' || /\.html?$/i.test(selected.name);
    if (!htmlLike) {
      setFile(null);
      setMessage(vi ? 'Chỉ chấp nhận file .html hoặc .htm.' : 'Only .html or .htm files are accepted.');
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      setFile(null);
      setMessage(vi ? 'File vượt quá giới hạn 20 MB.' : 'The file exceeds the 20 MB limit.');
      return;
    }
    setFile(selected);
    if (!title.trim()) setTitle(selected.name.replace(/\.html?$/i, ''));
    setMessage('');
  };

  const saveLesson = async (event) => {
    event.preventDefault();
    if (!title.trim() || !file) {
      setMessage(vi ? 'Hãy nhập tên bài và chọn file HTML.' : 'Enter a lesson name and choose an HTML file.');
      return;
    }
    setBusy(true);
    try {
      const html = await file.text();
      const lesson = {
        id: makeId(),
        title: title.trim(),
        filename: file.name,
        size: file.size,
        html,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await putLesson(lesson);
      await refresh(lesson.id);
      setTitle('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setMessage(vi ? 'Đã thêm bài học vào hub.' : 'Lesson added to the hub.');
    } catch {
      setMessage(vi ? 'Không thể lưu file này.' : 'Could not save this file.');
    } finally {
      setBusy(false);
    }
  };

  const renameLesson = async (lesson) => {
    const nextTitle = window.prompt(vi ? 'Tên bài mới' : 'New lesson name', lesson.title)?.trim();
    if (!nextTitle || nextTitle === lesson.title) return;
    await putLesson({ ...lesson, title: nextTitle, updatedAt: Date.now() });
    await refresh(lesson.id);
  };

  const deleteLesson = async (lesson) => {
    if (!window.confirm(vi ? `Xoá bài “${lesson.title}”?` : `Delete “${lesson.title}”?`)) return;
    await removeLesson(lesson.id);
    await refresh();
  };

  const openInNewTab = (lesson) => {
    const url = URL.createObjectURL(new Blob([lesson.html], { type: 'text/html;charset=utf-8' }));
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <div className="thpt-hub-page">
      <section className="thpt-hub-hero">
        <div>
          <span className="thpt-hub-kicker">THPT INTERACTIVE LEARNING</span>
          <h1>{vi ? 'Luyện thi THPT' : 'High School Exam Practice'}</h1>
          <p>{vi ? 'Tải bài học tương tác HTML, đặt tên, quản lý và chạy trực tiếp ngay trong Brian English Studio.' : 'Upload interactive HTML lessons, name, manage and run them directly inside Brian English Studio.'}</p>
        </div>
        <div className="thpt-hub-stat"><strong>{lessons.length}</strong><span>{vi ? 'bài đã lưu' : 'saved lessons'}</span></div>
      </section>

      <section className="thpt-hub-grid">
        <form className="thpt-upload-card" onSubmit={saveLesson}>
          <div className="thpt-section-title"><span>01</span><div><h2>{vi ? 'Thêm bài học' : 'Add a lesson'}</h2><p>{vi ? 'File được lưu trong trình duyệt hiện tại.' : 'The file is stored in this browser.'}</p></div></div>
          <label>{vi ? 'Tên bài học' : 'Lesson name'}</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={vi ? 'Ví dụ: Ôn tập 12 thì tiếng Anh' : 'Example: Review of the 12 English tenses'} maxLength={120} />
          <label className="thpt-file-drop">
            <input ref={fileRef} type="file" accept=".html,.htm,text/html" onChange={chooseFile} />
            <b>{file ? file.name : (vi ? 'Chọn file HTML' : 'Choose an HTML file')}</b>
            <span>{file ? formatSize(file.size) : (vi ? 'Tối đa 20 MB · .html hoặc .htm' : 'Up to 20 MB · .html or .htm')}</span>
          </label>
          <button className="thpt-primary" type="submit" disabled={busy}>{busy ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Thêm vào hub' : 'Add to hub')}</button>
          {message ? <p className="thpt-message" role="status">{message}</p> : null}
        </form>

        <section className="thpt-library-card">
          <div className="thpt-section-title"><span>02</span><div><h2>{vi ? 'Kho bài tương tác' : 'Interactive lesson library'}</h2><p>{vi ? 'Chọn một bài để xem và chạy.' : 'Choose a lesson to preview and run.'}</p></div></div>
          <div className="thpt-lesson-list">
            {lessons.length ? lessons.map((lesson) => (
              <article key={lesson.id} className={lesson.id === activeId ? 'thpt-lesson is-active' : 'thpt-lesson'} onClick={() => setActiveId(lesson.id)}>
                <button type="button" className="thpt-lesson-main" onClick={() => setActiveId(lesson.id)}>
                  <span className="thpt-file-icon">HTML</span>
                  <span><strong>{lesson.title}</strong><small>{lesson.filename} · {formatSize(lesson.size)}</small></span>
                </button>
                <div className="thpt-row-actions">
                  <button type="button" onClick={(event) => { event.stopPropagation(); renameLesson(lesson); }}>{vi ? 'Đổi tên' : 'Rename'}</button>
                  <button type="button" className="danger" onClick={(event) => { event.stopPropagation(); deleteLesson(lesson); }}>{vi ? 'Xoá' : 'Delete'}</button>
                </div>
              </article>
            )) : <div className="thpt-empty"><b>{vi ? 'Chưa có bài học' : 'No lessons yet'}</b><span>{vi ? 'Tải file HTML đầu tiên ở khung bên trái.' : 'Upload your first HTML file on the left.'}</span></div>}
          </div>
        </section>
      </section>

      <section className="thpt-player-card">
        <div className="thpt-player-head">
          <div><span>03 · LIVE PLAYER</span><h2>{activeLesson?.title || (vi ? 'Trình chạy bài học' : 'Lesson player')}</h2></div>
          {activeLesson ? <button type="button" className="thpt-secondary" onClick={() => openInNewTab(activeLesson)}>{vi ? 'Mở toàn màn hình ↗' : 'Open full screen ↗'}</button> : null}
        </div>
        <div className="thpt-player-shell">
          {activeLesson ? <iframe key={activeLesson.id} title={activeLesson.title} srcDoc={activeLesson.html} sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads" referrerPolicy="no-referrer" /> : <div className="thpt-player-empty">{vi ? 'Chọn hoặc tải một bài HTML để chạy trực tiếp.' : 'Choose or upload an HTML lesson to run it directly.'}</div>}
        </div>
      </section>
    </div>
  );
}
