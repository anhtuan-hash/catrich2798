import React, { useEffect, useMemo, useRef, useState } from 'react';
import './LessonCheckStudio.css';

const STORAGE_VERSION = 1;
const TYPE_OPTIONS = [
  { value: 'quiz', vi: 'Trắc nghiệm', en: 'Quiz' },
  { value: 'game', vi: 'Trò chơi', en: 'Game' },
  { value: 'exercise', vi: 'Bài tập', en: 'Exercise' },
  { value: 'video', vi: 'Video / nghe nhìn', en: 'Video / media' },
  { value: 'other', vi: 'Khác', en: 'Other' },
];

function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function storageKey(currentUser) {
  const identity = String(currentUser?.id || currentUser?.email || 'local').trim().toLowerCase();
  return `brian.lesson-check.activities.v${STORAGE_VERSION}:${identity}`;
}

function safeUrl(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  try {
    const parsed = new URL(input);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function wrapHtmlSnippet(raw) {
  const html = String(raw || '').trim();
  if (!html) return '';
  if (/<!doctype|<html[\s>]/i.test(html)) return html;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>html,body{margin:0;min-height:100%;font-family:Arial,Helvetica,sans-serif;background:#fff}*{box-sizing:border-box}</style></head><body>${html}</body></html>`;
}

function parseEmbed(raw) {
  const input = String(raw || '').trim();
  if (!input) return { kind: 'empty', source: '', raw: '' };

  const directUrl = safeUrl(input);
  if (directUrl) return { kind: 'url', source: directUrl, raw: input };

  try {
    const doc = new DOMParser().parseFromString(input, 'text/html');
    const iframe = doc.querySelector('iframe[src]');
    const iframeUrl = safeUrl(iframe?.getAttribute('src'));
    if (iframeUrl) return { kind: 'url', source: iframeUrl, raw: input };
  } catch {
    // Fall through to srcDoc mode.
  }

  if (/<[a-z][\s\S]*>/i.test(input)) {
    return { kind: 'html', source: wrapHtmlSnippet(input), raw: input };
  }
  return { kind: 'invalid', source: '', raw: input };
}

function sourceHost(source) {
  try { return new URL(source).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function labelForType(type, language) {
  return TYPE_OPTIONS.find((item) => item.value === type)?.[language === 'vi' ? 'vi' : 'en'] || type;
}

function iframeProps(embed) {
  const common = {
    title: 'Embedded teaching activity',
    allowFullScreen: true,
    allow: 'fullscreen; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share',
    referrerPolicy: 'strict-origin-when-cross-origin',
  };
  if (embed.kind === 'url') {
    return {
      ...common,
      src: embed.source,
      sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock allow-downloads allow-presentation allow-top-navigation-by-user-activation',
    };
  }
  return {
    ...common,
    srcDoc: embed.source,
    sandbox: 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock allow-downloads allow-presentation',
  };
}

function EmptyPreview({ language }) {
  return (
    <div className="lcs-preview-empty">
      <span className="material-symbols-rounded" aria-hidden="true">web_asset</span>
      <strong>{language === 'vi' ? 'Dán mã để xem trước' : 'Paste code to preview'}</strong>
      <p>{language === 'vi' ? 'Hỗ trợ URL HTTPS, mã <iframe> và đoạn HTML tương tác.' : 'Supports HTTPS URLs, <iframe> code and interactive HTML snippets.'}</p>
    </div>
  );
}

function ActivityFrame({ embed, className = '' }) {
  if (!embed || !['url', 'html'].includes(embed.kind)) return null;
  return <iframe className={className} {...iframeProps(embed)} />;
}

export default function LessonCheckStudio({ language = 'vi', currentUser }) {
  const isVi = language === 'vi';
  const key = useMemo(() => storageKey(currentUser), [currentUser?.id, currentUser?.email]);
  const [activities, setActivities] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showEditor, setShowEditor] = useState(true);
  const [teachingActivity, setTeachingActivity] = useState(null);
  const [notice, setNotice] = useState('');
  const [storageReady, setStorageReady] = useState(false);
  const importRef = useRef(null);
  const teachRef = useRef(null);
  const [draft, setDraft] = useState({
    id: '',
    title: '',
    unit: '',
    className: '',
    type: 'quiz',
    notes: '',
    embedCode: '',
  });

  const parsedDraft = useMemo(() => parseEmbed(draft.embedCode), [draft.embedCode]);
  const selectedActivity = useMemo(() => activities.find((item) => item.id === selectedId) || null, [activities, selectedId]);
  const filteredActivities = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('vi');
    return activities.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (!q) return true;
      return [item.title, item.unit, item.className, item.notes, sourceHost(item.embed?.source)]
        .some((value) => String(value || '').toLocaleLowerCase('vi').includes(q));
    });
  }, [activities, query, typeFilter]);

  useEffect(() => {
    setStorageReady(false);
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      const normalized = Array.isArray(parsed) ? parsed.map((item) => {
        const embedCode = String(item.embedCode || item.embed?.raw || item.embed?.source || '');
        return { ...item, embedCode, embed: parseEmbed(embedCode) };
      }).filter((item) => ['url', 'html'].includes(item.embed.kind)) : [];
      setActivities(normalized);
    } catch {
      setActivities([]);
    } finally {
      setStorageReady(true);
    }
  }, [key]);

  useEffect(() => {
    if (!storageReady) return;
    try {
      const serializable = activities.map(({ embed, ...item }) => item);
      localStorage.setItem(key, JSON.stringify(serializable));
    } catch {
      // Browser storage may be unavailable in private mode or when quota is full.
    }
  }, [activities, key, storageReady]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function resetDraft() {
    setDraft({ id: '', title: '', unit: '', className: '', type: 'quiz', notes: '', embedCode: '' });
    setSelectedId('');
    setShowEditor(true);
  }

  function editActivity(item) {
    setSelectedId(item.id);
    setDraft({
      id: item.id,
      title: item.title || '',
      unit: item.unit || '',
      className: item.className || '',
      type: item.type || 'quiz',
      notes: item.notes || '',
      embedCode: item.embedCode || item.embed?.raw || item.embed?.source || '',
    });
    setShowEditor(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function saveActivity() {
    const title = draft.title.trim();
    if (!title) {
      setNotice(isVi ? 'Hãy nhập tên hoạt động.' : 'Enter an activity title.');
      return;
    }
    if (!['url', 'html'].includes(parsedDraft.kind)) {
      setNotice(isVi ? 'Mã nhúng chưa hợp lệ. Hãy dán URL HTTPS, iframe hoặc HTML.' : 'Embed code is not valid yet.');
      return;
    }
    const now = new Date().toISOString();
    const next = {
      id: draft.id || uid(),
      title,
      unit: draft.unit.trim(),
      className: draft.className.trim(),
      type: draft.type,
      notes: draft.notes.trim(),
      embedCode: draft.embedCode,
      embed: parsedDraft,
      updatedAt: now,
      createdAt: activities.find((item) => item.id === draft.id)?.createdAt || now,
    };
    setActivities((current) => draft.id
      ? current.map((item) => item.id === draft.id ? next : item)
      : [next, ...current]);
    setSelectedId(next.id);
    setDraft((current) => ({ ...current, id: next.id }));
    setNotice(isVi ? 'Đã lưu hoạt động.' : 'Activity saved.');
  }

  function duplicateActivity(item) {
    const copy = {
      ...item,
      id: uid(),
      title: `${item.title} ${isVi ? '— Bản sao' : '— Copy'}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setActivities((current) => [copy, ...current]);
    setNotice(isVi ? 'Đã nhân bản hoạt động.' : 'Activity duplicated.');
  }

  function deleteActivity(item) {
    const ok = window.confirm(isVi ? `Xóa hoạt động “${item.title}”?` : `Delete “${item.title}”?`);
    if (!ok) return;
    setActivities((current) => current.filter((entry) => entry.id !== item.id));
    if (selectedId === item.id) resetDraft();
  }

  async function openTeachingMode(item) {
    setTeachingActivity(item);
    window.setTimeout(async () => {
      try { await teachRef.current?.requestFullscreen?.(); } catch { /* Fullscreen still works as an overlay. */ }
    }, 80);
  }

  function openExternal(item) {
    if (item.embed?.kind !== 'url') return;
    window.open(item.embed.source, '_blank', 'noopener,noreferrer');
  }

  function exportLibrary() {
    const serializable = activities.map(({ embed, ...item }) => item);
    const blob = new Blob([JSON.stringify({ version: STORAGE_VERSION, exportedAt: new Date().toISOString(), activities: serializable }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'brian-lesson-check-activities.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importLibrary(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const incoming = Array.isArray(json) ? json : json.activities;
      if (!Array.isArray(incoming)) throw new Error('Invalid library');
      const normalized = incoming.map((item) => {
        const embedCode = String(item.embedCode || item.embed?.raw || item.embed?.source || '');
        const embed = parseEmbed(embedCode);
        return {
          id: String(item.id || uid()),
          title: String(item.title || (isVi ? 'Hoạt động nhập' : 'Imported activity')),
          unit: String(item.unit || ''),
          className: String(item.className || ''),
          type: TYPE_OPTIONS.some((option) => option.value === item.type) ? item.type : 'other',
          notes: String(item.notes || ''),
          embedCode,
          embed,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }).filter((item) => ['url', 'html'].includes(item.embed.kind));
      setActivities((current) => {
        const byId = new Map(current.map((item) => [item.id, item]));
        normalized.forEach((item) => byId.set(item.id, item));
        return [...byId.values()].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      });
      setNotice(isVi ? `Đã nhập ${normalized.length} hoạt động.` : `Imported ${normalized.length} activities.`);
    } catch {
      setNotice(isVi ? 'Không đọc được tệp sao lưu.' : 'Could not read backup file.');
    }
  }

  const previewReady = ['url', 'html'].includes(parsedDraft.kind);

  return (
    <div className="lcs-page">
      <header className="lcs-hero">
        <button className="lcs-back" onClick={() => { window.location.hash = '#/apps'; }} aria-label={isVi ? 'Quay lại Ứng dụng' : 'Back to Apps'}>
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <div className="lcs-hero-copy">
          <span className="lcs-kicker">{isVi ? 'BRIAN · HOẠT ĐỘNG NHÚNG' : 'BRIAN · EMBEDDED ACTIVITIES'}</span>
          <h1>{isVi ? 'Kiểm tra bài' : 'Lesson Check Studio'}</h1>
          <p>{isVi ? 'Dán iframe, URL hoặc mã HTML và lưu mỗi nội dung thành một hoạt động dạy học riêng.' : 'Paste iframe, URL or HTML and keep each item as a separate teaching activity.'}</p>
        </div>
        <div className="lcs-hero-actions">
          <button className="lcs-btn lcs-btn-secondary" onClick={() => importRef.current?.click()}>
            <span className="material-symbols-rounded">upload_file</span>{isVi ? 'Nhập thư viện' : 'Import'}
          </button>
          <button className="lcs-btn lcs-btn-secondary" onClick={exportLibrary} disabled={!activities.length}>
            <span className="material-symbols-rounded">download</span>{isVi ? 'Sao lưu' : 'Backup'}
          </button>
          <button className="lcs-btn lcs-btn-primary" onClick={resetDraft}>
            <span className="material-symbols-rounded">add</span>{isVi ? 'Hoạt động mới' : 'New activity'}
          </button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importLibrary} />
        </div>
      </header>

      {notice ? <div className="lcs-toast" role="status">{notice}</div> : null}

      <section className="lcs-info-strip">
        <span className="material-symbols-rounded" aria-hidden="true">info</span>
        <div>
          <strong>{isVi ? 'Có thể nhúng trực tiếp.' : 'Direct embedding is supported.'}</strong>
          <span>{isVi ? 'Một số website tự chặn iframe bằng CSP/X-Frame-Options; khi đó hãy dùng nút “Mở ngoài”. Hoạt động hiện được lưu theo tài khoản trên trình duyệt này.' : 'Some websites block iframe embedding with CSP/X-Frame-Options; use “Open externally” when that happens. Activities are stored per account in this browser.'}</span>
        </div>
      </section>

      <section className="lcs-builder">
        <div className="lcs-panel lcs-editor">
          <div className="lcs-panel-head">
            <div><span className="lcs-step">01</span><h2>{draft.id ? (isVi ? 'Chỉnh sửa hoạt động' : 'Edit activity') : (isVi ? 'Tạo hoạt động' : 'Create activity')}</h2></div>
            <button className="lcs-icon-btn" onClick={() => setShowEditor((value) => !value)} title={isVi ? 'Thu gọn' : 'Collapse'}>
              <span className="material-symbols-rounded">{showEditor ? 'expand_less' : 'expand_more'}</span>
            </button>
          </div>
          {showEditor ? (
            <div className="lcs-form">
              <label className="lcs-field lcs-field-wide">
                <span>{isVi ? 'Tên hoạt động' : 'Activity title'}</span>
                <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder={isVi ? 'Ví dụ: Unit 5 – Global Warming Quiz' : 'e.g. Unit 5 – Global Warming Quiz'} />
              </label>
              <label className="lcs-field">
                <span>{isVi ? 'Bài / chủ đề' : 'Unit / topic'}</span>
                <input value={draft.unit} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))} placeholder="Unit 5 · Global Warming" />
              </label>
              <label className="lcs-field">
                <span>{isVi ? 'Lớp' : 'Class'}</span>
                <input value={draft.className} onChange={(e) => setDraft((d) => ({ ...d, className: e.target.value }))} placeholder={isVi ? '11.1 / Khối 11' : '11.1 / Grade 11'} />
              </label>
              <label className="lcs-field">
                <span>{isVi ? 'Loại hoạt động' : 'Activity type'}</span>
                <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
                  {TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isVi ? item.vi : item.en}</option>)}
                </select>
              </label>
              <label className="lcs-field">
                <span>{isVi ? 'Ghi chú' : 'Notes'}</span>
                <input value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder={isVi ? 'Mục tiêu, thời lượng, cách tổ chức…' : 'Objective, timing, classroom use…'} />
              </label>
              <label className="lcs-field lcs-field-wide">
                <span>{isVi ? 'Mã nhúng / URL / HTML' : 'Embed code / URL / HTML'}</span>
                <textarea rows={9} value={draft.embedCode} onChange={(e) => setDraft((d) => ({ ...d, embedCode: e.target.value }))} placeholder={'<iframe src="https://..."></iframe>\n\nhttps://...\n\n<div>...</div><script>...</script>'} spellCheck={false} />
              </label>
              <div className="lcs-detection">
                <span className={`lcs-dot ${previewReady ? 'is-ready' : ''}`} />
                {parsedDraft.kind === 'url' ? (isVi ? `Đã nhận diện liên kết nhúng · ${sourceHost(parsedDraft.source)}` : `Embed URL detected · ${sourceHost(parsedDraft.source)}`)
                  : parsedDraft.kind === 'html' ? (isVi ? 'Đã nhận diện mã HTML tương tác' : 'Interactive HTML detected')
                  : parsedDraft.kind === 'invalid' ? (isVi ? 'Chưa nhận diện được mã hợp lệ' : 'No valid embed detected')
                  : (isVi ? 'Chưa có mã nhúng' : 'No embed code yet')}
              </div>
              <div className="lcs-form-actions">
                {draft.id ? <button className="lcs-btn lcs-btn-secondary" onClick={resetDraft}>{isVi ? 'Hủy chỉnh sửa' : 'Cancel edit'}</button> : null}
                <button className="lcs-btn lcs-btn-primary" onClick={saveActivity}>
                  <span className="material-symbols-rounded">save</span>{draft.id ? (isVi ? 'Lưu thay đổi' : 'Save changes') : (isVi ? 'Lưu hoạt động' : 'Save activity')}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="lcs-panel lcs-live-preview">
          <div className="lcs-panel-head">
            <div><span className="lcs-step">02</span><h2>{isVi ? 'Xem trước trực tiếp' : 'Live preview'}</h2></div>
            {parsedDraft.kind === 'url' ? <span className="lcs-host-chip">{sourceHost(parsedDraft.source)}</span> : null}
          </div>
          <div className="lcs-frame-shell">
            {previewReady ? <ActivityFrame embed={parsedDraft} className="lcs-frame" /> : <EmptyPreview language={language} />}
          </div>
          {previewReady ? (
            <div className="lcs-preview-foot">
              <span>{isVi ? 'Nếu khung trắng hoặc báo từ chối kết nối, nguồn đó không cho phép iframe.' : 'A blank/refused frame usually means the source blocks iframe embedding.'}</span>
              {parsedDraft.kind === 'url' ? <button onClick={() => window.open(parsedDraft.source, '_blank', 'noopener,noreferrer')}>{isVi ? 'Mở nguồn' : 'Open source'}</button> : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="lcs-library">
        <div className="lcs-library-head">
          <div>
            <span className="lcs-kicker">{isVi ? 'THƯ VIỆN CÁ NHÂN' : 'PERSONAL LIBRARY'}</span>
            <h2>{isVi ? 'Hoạt động dạy học' : 'Teaching activities'} <b>{activities.length}</b></h2>
          </div>
          <div className="lcs-library-tools">
            <label className="lcs-search">
              <span className="material-symbols-rounded">search</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isVi ? 'Tìm tên, bài, lớp…' : 'Search title, unit, class…'} />
            </label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">{isVi ? 'Tất cả loại' : 'All types'}</option>
              {TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isVi ? item.vi : item.en}</option>)}
            </select>
          </div>
        </div>

        {!filteredActivities.length ? (
          <div className="lcs-empty-library">
            <span className="material-symbols-rounded">widgets</span>
            <h3>{activities.length ? (isVi ? 'Không có hoạt động phù hợp bộ lọc.' : 'No activities match this filter.') : (isVi ? 'Chưa có hoạt động nào.' : 'No activities yet.')}</h3>
            <p>{isVi ? 'Dán mã ở phía trên và lưu để xây dựng kho hoạt động dùng trên lớp.' : 'Paste code above and save it to build your classroom activity library.'}</p>
          </div>
        ) : (
          <div className="lcs-card-grid">
            {filteredActivities.map((item) => (
              <article key={item.id} className={`lcs-card ${selectedId === item.id ? 'is-selected' : ''}`}>
                <div className="lcs-card-preview">
                  <ActivityFrame embed={item.embed} className="lcs-card-frame" />
                  <button className="lcs-card-play" onClick={() => openTeachingMode(item)}>
                    <span className="material-symbols-rounded">present_to_all</span>
                    {isVi ? 'Trình chiếu' : 'Teach'}
                  </button>
                </div>
                <div className="lcs-card-body">
                  <div className="lcs-card-meta">
                    <span>{labelForType(item.type, language)}</span>
                    {item.className ? <span>{item.className}</span> : null}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{[item.unit, item.notes].filter(Boolean).join(' · ') || (isVi ? 'Hoạt động nhúng' : 'Embedded activity')}</p>
                  {item.embed?.kind === 'url' ? <small>{sourceHost(item.embed.source)}</small> : <small>HTML / srcDoc</small>}
                  <div className="lcs-card-actions">
                    <button onClick={() => editActivity(item)}><span className="material-symbols-rounded">edit</span>{isVi ? 'Sửa' : 'Edit'}</button>
                    <button onClick={() => duplicateActivity(item)}><span className="material-symbols-rounded">content_copy</span>{isVi ? 'Nhân bản' : 'Duplicate'}</button>
                    {item.embed?.kind === 'url' ? <button onClick={() => openExternal(item)}><span className="material-symbols-rounded">open_in_new</span>{isVi ? 'Mở ngoài' : 'Open'}</button> : null}
                    <button className="is-danger" onClick={() => deleteActivity(item)}><span className="material-symbols-rounded">delete</span>{isVi ? 'Xóa' : 'Delete'}</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {teachingActivity ? (
        <div className="lcs-teach-overlay" ref={teachRef}>
          <header>
            <div>
              <span>{isVi ? 'CHẾ ĐỘ DẠY' : 'TEACHING MODE'}</span>
              <strong>{teachingActivity.title}</strong>
            </div>
            <div>
              {teachingActivity.embed?.kind === 'url' ? <button onClick={() => openExternal(teachingActivity)}><span className="material-symbols-rounded">open_in_new</span>{isVi ? 'Mở ngoài' : 'Open externally'}</button> : null}
              <button onClick={() => document.fullscreenElement ? document.exitFullscreen?.() : teachRef.current?.requestFullscreen?.()}><span className="material-symbols-rounded">fullscreen</span>{isVi ? 'Toàn màn hình' : 'Fullscreen'}</button>
              <button className="lcs-close" onClick={() => { if (document.fullscreenElement) document.exitFullscreen?.(); setTeachingActivity(null); }}><span className="material-symbols-rounded">close</span>{isVi ? 'Đóng' : 'Close'}</button>
            </div>
          </header>
          <div className="lcs-teach-frame-wrap">
            <ActivityFrame embed={teachingActivity.embed} className="lcs-teach-frame" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
