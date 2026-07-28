import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import {
  clearWeeklyPracticeProgress,
  createWeeklyPractice,
  deleteWeeklyPractice,
  downloadWeeklyPracticeHtml,
  getWeeklyPracticeAvailability,
  listManagedWeeklyPractices,
  listPublicWeeklyPractices,
  logWeeklyPracticeEvent,
  readWeeklyPracticeProgress,
  updateWeeklyPracticeStatus,
  WEEKLY_PRACTICE_MAX_BYTES,
  writeWeeklyPracticeProgress,
} from '../utils/weeklyPractice.js';

const HOME_ROOT_SELECTOR = ".metro-clean-system[data-route='home']";
const HOST_ID = 'bes-weekly-practice-root';

function errorText(error) {
  const message = String(error?.message || error || '').trim();
  if (/weekly_practice_items|does not exist|schema cache/i.test(message)) {
    return 'Cơ sở dữ liệu Bài luyện tập theo tuần chưa được cài đặt. Hãy chạy migration weekly_practice_v1 trong Supabase.';
  }
  if (/row-level security|permission denied|policy/i.test(message)) {
    return 'Tài khoản hiện tại không có quyền quản lý bài luyện tập theo tuần.';
  }
  return message || 'Không thể hoàn thành thao tác.';
}

function formatDate(value, language = 'vi') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;
}

function currentIsoWeek() {
  const date = new Date();
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function toLocalInput(date = new Date()) {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}

function defaultForm() {
  const year = new Date().getFullYear();
  return {
    title: '',
    description: '',
    week_key: currentIsoWeek(),
    school_year: `${year}-${year + 1}`,
    grade: 'Tất cả',
    category: 'HTML tương tác',
    cefr: '',
    question_count: 0,
    duration_minutes: 0,
    opens_at: toLocalInput(),
    closes_at: '',
    status: 'published',
    allow_retake: true,
    collect_results: false,
    show_answers: true,
    is_featured: true,
  };
}

function ensureHost() {
  const root = document.querySelector(HOME_ROOT_SELECTOR);
  if (!root) return null;
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('section');
    host.id = HOST_ID;
    host.setAttribute('aria-label', 'Bài luyện tập tiếng Anh theo tuần');
  }
  const stage = root.querySelector(':scope > main.wp8-page-stage') || root.querySelector(':scope > .wp8-page-stage') || root.querySelector('.wp8-page-stage');
  const parent = stage?.parentElement || root;
  if (host.parentElement !== parent) parent.insertBefore(host, stage?.nextSibling || null);
  return host;
}

function StatusPill({ item }) {
  const availability = getWeeklyPracticeAvailability(item);
  return <span className={`bes-weekly-status is-${availability.state}`}>{availability.label}</span>;
}

function PracticeMeta({ item, language = 'vi' }) {
  return <div className="bes-weekly-meta">
    <span>File HTML</span>
    <span>{formatBytes(item.file_size)}</span>
    {item.created_at ? <span>Đăng {formatDate(item.created_at, language)}</span> : null}
  </div>;
}

function PracticeRunner({ item, onClose, onProgressChanged }) {
  const iframeRef = useRef(null);
  const shellRef = useRef(null);
  const blobUrlRef = useRef('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fontScale, setFontScale] = useState(1);
  const [completed, setCompleted] = useState(Boolean(readWeeklyPracticeProgress(item.id)?.completed));
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const blob = await downloadWeeklyPracticeHtml(item);
      const nextUrl = URL.createObjectURL(blob);
      blobUrlRef.current = nextUrl;
      setUrl(nextUrl);
      writeWeeklyPracticeProgress(item.id, { lastOpenedAt: new Date().toISOString() });
    } catch (loadError) {
      setError(errorText(loadError));
    } finally {
      setLoading(false);
    }
  }, [item]);

  useEffect(() => {
    load();
    logWeeklyPracticeEvent(item.id, 'open', { source: 'runner' });
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); };
  }, [item.id, load]);

  const markComplete = useCallback(async (source = 'manual') => {
    const current = readWeeklyPracticeProgress(item.id) || {};
    if (current.completed) {
      setCompleted(true);
      setNotice('Bài này đã được xác nhận hoàn thành trên thiết bị này.');
      return;
    }
    setConfirming(true);
    setNotice('');
    try {
      writeWeeklyPracticeProgress(item.id, {
        completed: true,
        completedAt: new Date().toISOString(),
        completionSource: source,
      });
      setCompleted(true);
      onProgressChanged?.();
      await logWeeklyPracticeEvent(item.id, 'complete', { source });
      setNotice('Đã ghi nhận hoàn thành. Em có thể đóng bài.');
    } finally {
      setConfirming(false);
    }
  }, [item.id, onProgressChanged]);

  useEffect(() => {
    const onMessage = async (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const message = event.data || {};
      if (message.source !== 'brian-weekly-practice' || message.practiceId !== item.id) return;
      const current = readWeeklyPracticeProgress(item.id) || {};
      if (message.type === 'storage') {
        const storage = { ...(current.storage || {}) };
        const payload = message.payload || {};
        if (payload.operation === 'set') storage[payload.key] = payload.value;
        if (payload.operation === 'remove') delete storage[payload.key];
        if (payload.operation === 'clear') Object.keys(storage).forEach((key) => delete storage[key]);
        writeWeeklyPracticeProgress(item.id, { storage });
        onProgressChanged?.();
      }
      if (message.type === 'progress') {
        writeWeeklyPracticeProgress(item.id, { runtime: message.payload || {} });
        onProgressChanged?.();
      }
      if (message.type === 'complete') await markComplete('html');
      if (message.type === 'reset') {
        clearWeeklyPracticeProgress(item.id);
        setCompleted(false);
        setNotice('');
        onProgressChanged?.();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [item.id, markComplete, onProgressChanged]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ source: 'brian-weekly-host', practiceId: item.id, type: 'font-scale', value: fontScale }, '*');
  }, [fontScale, item.id, url]);

  const reset = async () => {
    if (!window.confirm('Xóa tiến độ đã lưu trên thiết bị và làm lại từ đầu?')) return;
    clearWeeklyPracticeProgress(item.id);
    setCompleted(false);
    setNotice('');
    onProgressChanged?.();
    await load();
  };

  const confirmCompletion = async () => {
    if (completed) return;
    if (!window.confirm('Em xác nhận đã làm xong bài luyện tập này?')) return;
    await markComplete('manual');
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shellRef.current?.requestFullscreen?.();
    } catch { /* browser may block fullscreen */ }
  };

  return createPortal(
    <div className="bes-weekly-runner" ref={shellRef} role="dialog" aria-modal="true" aria-label={item.title}>
      <header className="bes-weekly-runner__bar">
        <button type="button" onClick={onClose}>← Trang chủ</button>
        <div><strong>{item.title}</strong><span>{completed ? '✓ Đã xác nhận hoàn thành' : 'Đang làm bài'}</span></div>
        <nav aria-label="Điều khiển bài tập">
          <button type="button" onClick={() => setFontScale((value) => Math.max(.8, +(value - .1).toFixed(1)))} aria-label="Giảm cỡ chữ">A−</button>
          <button type="button" onClick={() => setFontScale((value) => Math.min(1.5, +(value + .1).toFixed(1)))} aria-label="Tăng cỡ chữ">A+</button>
          <button type="button" onClick={toggleFullscreen}>Toàn màn hình</button>
          <button type="button" onClick={reset}>Làm lại</button>
          <button className="bes-weekly-runner__close" type="button" onClick={onClose} aria-label="Đóng">×</button>
        </nav>
      </header>
      <main className="bes-weekly-runner__stage">
        {loading ? <div className="bes-weekly-runner__state"><span className="bes-weekly-spinner" />Đang tải bài luyện tập…</div> : null}
        {error ? <div className="bes-weekly-runner__state is-error"><strong>Không thể mở bài</strong><p>{error}</p><button type="button" onClick={load}>Thử lại</button></div> : null}
        {!loading && !error && url ? <iframe ref={iframeRef} src={url} title={item.title} sandbox="allow-scripts allow-forms allow-downloads" referrerPolicy="no-referrer" /> : null}
      </main>
      <footer className={`bes-weekly-completion-bar ${completed ? 'is-completed' : ''}`}>
        <div><strong>{completed ? 'Đã hoàn thành' : 'Em đã làm xong bài?'}</strong><span>{notice || (completed ? 'Hệ thống đã ghi nhận trên thiết bị này.' : 'Bấm xác nhận để giáo viên thống kê lượt hoàn thành.')}</span></div>
        <button type="button" disabled={completed || confirming} onClick={confirmCompletion}>{completed ? '✓ Đã xác nhận' : confirming ? 'Đang ghi nhận…' : 'Xác nhận đã hoàn thành'}</button>
      </footer>
    </div>, document.body,
  );
}

function ManagerDialog({ currentUser, onClose, onChanged }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setMessage('');
    try { setItems(await listManagedWeeklyPractices()); }
    catch (error) { setMessage(errorText(error)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      await createWeeklyPractice({ form: { ...defaultForm(), title: form.title }, file, currentUser });
      setForm(defaultForm()); setFile(null);
      const input = document.getElementById('bes-weekly-html-file');
      if (input) input.value = '';
      await refresh(); await onChanged?.();
      setMessage('Đã tải lên và công bố bài luyện tập.');
    } catch (error) { setMessage(errorText(error)); }
    finally { setSaving(false); }
  };

  const changeStatus = async (item, status) => {
    setMessage('');
    try { await updateWeeklyPracticeStatus(item, status); await refresh(); await onChanged?.(); }
    catch (error) { setMessage(errorText(error)); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Xóa vĩnh viễn “${item.title}” và file HTML đi kèm?`)) return;
    setMessage('');
    try { await deleteWeeklyPractice(item); await refresh(); await onChanged?.(); }
    catch (error) { setMessage(errorText(error)); }
  };

  return createPortal(
    <div className="bes-weekly-modal-backdrop">
      <section className="bes-weekly-manager bes-weekly-manager--simple" role="dialog" aria-modal="true" aria-label="Quản lý bài luyện tập theo tuần">
        <header><div><span className="bes-weekly-kicker">QUẢN TRỊ NỘI DUNG</span><h2>Bài luyện tập theo tuần</h2><p>Chỉ cần đặt tên và tải file HTML. Bài được công bố ngay, học sinh không cần đăng nhập.</p></div><button className="bes-weekly-close" type="button" onClick={onClose}>×</button></header>
        {message ? <div className="bes-weekly-manager__message">{message}</div> : null}
        <div className="bes-weekly-manager__grid">
          <form onSubmit={submit} className="bes-weekly-form bes-weekly-form--simple">
            <h3>Tải bài HTML mới</h3>
            <label>Tên bài<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ví dụ: Tiếng Anh 10 – Unit 1" /></label>
            <label className="bes-weekly-file">File HTML<input id="bes-weekly-html-file" required type="file" accept=".html,.htm,text/html" onChange={(event) => setFile(event.target.files?.[0] || null)} /><span>{file ? `${file.name} · ${formatBytes(file.size)}` : `File tự chứa, tối đa ${formatBytes(WEEKLY_PRACTICE_MAX_BYTES)}`}</span></label>
            <div className="bes-weekly-simple-note"><strong>Tự động thiết lập</strong><span>Công bố ngay · Không thu tên/lớp · Không thu điểm · Có thống kê lượt mở và hoàn thành</span></div>
            <button className="bes-weekly-primary" disabled={saving} type="submit">{saving ? 'Đang tải lên…' : 'Tải lên và công bố'}</button>
          </form>
          <section className="bes-weekly-manage-list"><h3>Các bài đã tạo</h3>{loading ? <p>Đang tải…</p> : null}{!loading && !items.length ? <p>Chưa có bài nào.</p> : null}{items.map((item) => <article key={item.id}><div><StatusPill item={item} /><strong>{item.title}</strong><span>{formatBytes(item.file_size)} · {formatDate(item.created_at)}</span></div><nav>{item.status !== 'published' ? <button type="button" onClick={() => changeStatus(item, 'published')}>Công bố</button> : <button type="button" onClick={() => changeStatus(item, 'draft')}>Ẩn</button>}<button type="button" onClick={() => changeStatus(item, 'maintenance')}>Bảo trì</button><button className="is-danger" type="button" onClick={() => remove(item)}>Xóa</button></nav></article>)}</section>
        </div>
      </section>
    </div>, document.body,
  );
}

export default function GlobalWeeklyPracticeBridge({ route = 'home', language = 'vi', currentUser }) {
  const [host, setHost] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [runner, setRunner] = useState(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [, forceProgress] = useState(0);
  const canManage = isDepartmentLeaderRole(currentUser?.role);

  useEffect(() => {
    if (route !== 'home') { setHost(null); return undefined; }
    let frame = 0;
    const attach = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setHost(ensureHost())); };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', attach, { passive: true });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', attach); document.getElementById(HOST_ID)?.remove(); };
  }, [route]);

  const refresh = useCallback(async () => {
    if (route !== 'home') return;
    setLoading(true); setError('');
    try { setItems(await listPublicWeeklyPractices()); }
    catch (loadError) { setItems([]); setError(errorText(loadError)); }
    finally { setLoading(false); }
  }, [route]);

  useEffect(() => { refresh(); }, [refresh]);

  const ordered = useMemo(() => [...items].sort((a, b) => {
    const rank = (item) => ({ open: 0, upcoming: 1, closed: 2 }[getWeeklyPracticeAvailability(item).state] ?? 3);
    return rank(a) - rank(b) || Number(b.is_featured) - Number(a.is_featured) || new Date(b.opens_at || 0) - new Date(a.opens_at || 0);
  }), [items]);
  const featured = ordered[0] || null;

  const start = (item) => {
    const availability = getWeeklyPracticeAvailability(item);
    if (!availability.canOpen) return;
    setRunner(item);
  };

  if (route !== 'home' || !host) return null;
  const content = (
    <div className="bes-weekly-section">
      <div className="bes-weekly-heading"><div><span className="bes-weekly-kicker">WEEKLY ENGLISH PRACTICE</span><h2>Bài luyện tập tiếng Anh theo tuần</h2><p>Mở file HTML, làm trực tiếp và xác nhận khi hoàn thành.</p></div>{canManage ? <button type="button" className="bes-weekly-manage-button" onClick={() => setManagerOpen(true)}>Quản lý bài tuần</button> : null}</div>
      {loading ? <div className="bes-weekly-empty"><span className="bes-weekly-spinner" />Đang tải bài tuần…</div> : null}
      {!loading && featured ? <article className="bes-weekly-featured"><div className="bes-weekly-featured__week"><span>BÀI MỚI</span><StatusPill item={featured} /></div><div className="bes-weekly-featured__content"><span className="bes-weekly-category">HTML INTERACTIVE</span><h3>{featured.title}</h3><p>Làm bài trực tiếp trong nội dung HTML. Sau khi làm xong, bấm “Xác nhận đã hoàn thành” ở cuối màn hình.</p><PracticeMeta item={featured} language={language} /></div><div className="bes-weekly-featured__action">{readWeeklyPracticeProgress(featured.id)?.completed ? <span className="bes-weekly-complete">✓ Đã xác nhận hoàn thành</span> : null}<button className="bes-weekly-primary" type="button" disabled={!getWeeklyPracticeAvailability(featured).canOpen} onClick={() => start(featured)}>{readWeeklyPracticeProgress(featured.id) ? 'Mở lại bài luyện tập' : 'Bắt đầu luyện tập'}</button><span>Chỉ tải file khi mở bài</span></div></article> : null}
      {!loading && !featured ? <div className="bes-weekly-empty"><strong>Bài tuần đang được chuẩn bị</strong><p>{canManage ? error || 'Nhấn “Quản lý bài tuần” để tải file HTML đầu tiên.' : 'Vui lòng quay lại sau để xem bài luyện tập mới.'}</p></div> : null}
      {ordered.length > 1 ? <><button className="bes-weekly-show-all" type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Thu gọn danh sách' : `Xem tất cả bài luyện tập (${ordered.length})`}</button>{expanded ? <div className="bes-weekly-list">{ordered.map((item) => <article key={item.id}><div><StatusPill item={item} /><strong>{item.title}</strong><PracticeMeta item={item} language={language} /></div><button type="button" disabled={!getWeeklyPracticeAvailability(item).canOpen} onClick={() => start(item)}>{readWeeklyPracticeProgress(item.id)?.completed ? 'Mở lại' : 'Mở bài'}</button></article>)}</div> : null}</> : null}
      {error && featured && canManage ? <div className="bes-weekly-inline-error">{error}</div> : null}
    </div>
  );

  return <>{createPortal(content, host)}{runner ? <PracticeRunner item={runner} onClose={() => setRunner(null)} onProgressChanged={() => forceProgress((value) => value + 1)} /> : null}{managerOpen ? <ManagerDialog currentUser={currentUser} onClose={() => setManagerOpen(false)} onChanged={refresh} /> : null}</>;
}
