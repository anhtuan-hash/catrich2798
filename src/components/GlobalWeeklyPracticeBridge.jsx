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
  submitWeeklyPracticeResult,
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

function toLocalInput(date, offsetDays = 0) {
  const value = date ? new Date(date) : new Date();
  value.setDate(value.getDate() + offsetDays);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}

function defaultForm() {
  const year = new Date().getFullYear();
  return {
    title: '', description: '', week_key: currentIsoWeek(), school_year: `${year}-${year + 1}`,
    grade: '12', category: 'Ngữ pháp', cefr: 'B1–B2', question_count: 40, duration_minutes: 30,
    opens_at: toLocalInput(), closes_at: toLocalInput(null, 7), status: 'published',
    allow_retake: true, collect_results: false, show_answers: true, is_featured: true,
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

function PracticeMeta({ item }) {
  const pieces = [
    item.grade ? `Khối ${item.grade}` : '', item.cefr, item.question_count ? `${item.question_count} câu` : '',
    item.duration_minutes ? `${item.duration_minutes} phút` : '',
  ].filter(Boolean);
  return <div className="bes-weekly-meta">{pieces.map((piece) => <span key={piece}>{piece}</span>)}</div>;
}

function IdentityDialog({ item, onCancel, onStart }) {
  const [identity, setIdentity] = useState({ student_name: '', class_code: '', student_code: '' });
  return createPortal(
    <div className="bes-weekly-modal-backdrop" role="presentation">
      <section className="bes-weekly-dialog bes-weekly-identity" role="dialog" aria-modal="true" aria-label="Thông tin học sinh">
        <button className="bes-weekly-close" type="button" onClick={onCancel} aria-label="Đóng">×</button>
        <span className="bes-weekly-kicker">TRƯỚC KHI BẮT ĐẦU</span>
        <h2>{item.title}</h2>
        <p>Bài này có thu kết quả nhưng không yêu cầu đăng nhập. Thông tin chỉ được gửi khi em hoàn thành bài.</p>
        <label>Họ và tên<input value={identity.student_name} onChange={(event) => setIdentity({ ...identity, student_name: event.target.value })} autoFocus /></label>
        <label>Lớp<input value={identity.class_code} onChange={(event) => setIdentity({ ...identity, class_code: event.target.value })} placeholder="Ví dụ: 12.1" /></label>
        <label>Mã học sinh <small>(không bắt buộc)</small><input value={identity.student_code} onChange={(event) => setIdentity({ ...identity, student_code: event.target.value })} /></label>
        <button className="bes-weekly-primary" type="button" disabled={!identity.student_name.trim() || !identity.class_code.trim()} onClick={() => onStart(identity)}>Bắt đầu làm bài</button>
      </section>
    </div>, document.body,
  );
}

function PracticeRunner({ item, identity, onClose, onProgressChanged }) {
  const iframeRef = useRef(null);
  const shellRef = useRef(null);
  const blobUrlRef = useRef('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fontScale, setFontScale] = useState(1);
  const [completed, setCompleted] = useState(Boolean(readWeeklyPracticeProgress(item.id)?.completed));

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
    logWeeklyPracticeEvent(item.id, 'open', { week_key: item.week_key });
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); };
  }, [item.id, load]);

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
      if (message.type === 'complete') {
        const payload = message.payload || {};
        writeWeeklyPracticeProgress(item.id, { completed: true, completedAt: new Date().toISOString(), result: payload });
        setCompleted(true);
        onProgressChanged?.();
        await logWeeklyPracticeEvent(item.id, 'complete', { score: payload.score ?? null });
        if (item.collect_results && identity) {
          try { await submitWeeklyPracticeResult(item.id, identity, payload); } catch (resultError) { setError(`Bài đã hoàn thành nhưng chưa gửi được kết quả: ${errorText(resultError)}`); }
        }
      }
      if (message.type === 'reset') {
        clearWeeklyPracticeProgress(item.id);
        setCompleted(false);
        onProgressChanged?.();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [identity, item, onProgressChanged]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ source: 'brian-weekly-host', practiceId: item.id, type: 'font-scale', value: fontScale }, '*');
  }, [fontScale, item.id, url]);

  const reset = async () => {
    if (!window.confirm('Xóa tiến độ đã lưu trên thiết bị và làm lại từ đầu?')) return;
    clearWeeklyPracticeProgress(item.id);
    setCompleted(false);
    onProgressChanged?.();
    await load();
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
        <div><strong>{item.title}</strong><span>{item.week_key} {completed ? '· Đã hoàn thành' : ''}</span></div>
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
      await createWeeklyPractice({ form, file, currentUser });
      setForm(defaultForm()); setFile(null);
      const input = document.getElementById('bes-weekly-html-file');
      if (input) input.value = '';
      await refresh(); await onChanged?.();
      setMessage('Đã tải lên và lưu bài luyện tập.');
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
      <section className="bes-weekly-manager" role="dialog" aria-modal="true" aria-label="Quản lý bài luyện tập theo tuần">
        <header><div><span className="bes-weekly-kicker">QUẢN TRỊ NỘI DUNG</span><h2>Bài luyện tập theo tuần</h2><p>Tải một file HTML tự chứa, tối đa 10 MB. Học sinh mở bài không cần đăng nhập.</p></div><button className="bes-weekly-close" type="button" onClick={onClose}>×</button></header>
        {message ? <div className="bes-weekly-manager__message">{message}</div> : null}
        <div className="bes-weekly-manager__grid">
          <form onSubmit={submit} className="bes-weekly-form">
            <h3>Thêm bài mới</h3>
            <label>Tên bài<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label>Mô tả<textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="bes-weekly-form__row"><label>Tuần học<input required value={form.week_key} onChange={(e) => setForm({ ...form, week_key: e.target.value })} /></label><label>Năm học<input value={form.school_year} onChange={(e) => setForm({ ...form, school_year: e.target.value })} /></label></div>
            <div className="bes-weekly-form__row"><label>Khối<input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></label><label>CEFR<input value={form.cefr} onChange={(e) => setForm({ ...form, cefr: e.target.value })} /></label><label>Chuyên đề<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label></div>
            <div className="bes-weekly-form__row"><label>Số câu<input type="number" min="0" value={form.question_count} onChange={(e) => setForm({ ...form, question_count: e.target.value })} /></label><label>Thời lượng<input type="number" min="0" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></label></div>
            <div className="bes-weekly-form__row"><label>Ngày mở<input type="datetime-local" value={form.opens_at} onChange={(e) => setForm({ ...form, opens_at: e.target.value })} /></label><label>Ngày đóng<input type="datetime-local" value={form.closes_at} onChange={(e) => setForm({ ...form, closes_at: e.target.value })} /></label></div>
            <label>Trạng thái<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="published">Công bố ngay</option><option value="draft">Lưu bản nháp</option><option value="maintenance">Bảo trì</option></select></label>
            <label className="bes-weekly-file">File HTML<input id="bes-weekly-html-file" required type="file" accept=".html,.htm,text/html" onChange={(e) => setFile(e.target.files?.[0] || null)} /><span>{file ? `${file.name} · ${formatBytes(file.size)}` : `Tối đa ${formatBytes(WEEKLY_PRACTICE_MAX_BYTES)}`}</span></label>
            <div className="bes-weekly-checks"><label><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Nổi bật trên Trang chủ</label><label><input type="checkbox" checked={form.allow_retake} onChange={(e) => setForm({ ...form, allow_retake: e.target.checked })} /> Cho phép làm lại</label><label><input type="checkbox" checked={form.collect_results} onChange={(e) => setForm({ ...form, collect_results: e.target.checked })} /> Thu kết quả</label><label><input type="checkbox" checked={form.show_answers} onChange={(e) => setForm({ ...form, show_answers: e.target.checked })} /> Cho xem đáp án</label></div>
            <button className="bes-weekly-primary" disabled={saving} type="submit">{saving ? 'Đang tải lên…' : 'Lưu bài luyện tập'}</button>
          </form>
          <section className="bes-weekly-manage-list"><h3>Các bài đã tạo</h3>{loading ? <p>Đang tải…</p> : null}{!loading && !items.length ? <p>Chưa có bài nào.</p> : null}{items.map((item) => <article key={item.id}><div><StatusPill item={item} /><strong>{item.title}</strong><span>{item.week_key} · {formatBytes(item.file_size)} · {formatDate(item.opens_at)}</span></div><nav>{item.status !== 'published' ? <button type="button" onClick={() => changeStatus(item, 'published')}>Công bố</button> : <button type="button" onClick={() => changeStatus(item, 'draft')}>Ẩn</button>}<button type="button" onClick={() => changeStatus(item, 'maintenance')}>Bảo trì</button><button className="is-danger" type="button" onClick={() => remove(item)}>Xóa</button></nav></article>)}</section>
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
  const [identityItem, setIdentityItem] = useState(null);
  const [runnerIdentity, setRunnerIdentity] = useState(null);
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

  const start = (item, identity = null) => {
    const availability = getWeeklyPracticeAvailability(item);
    if (!availability.canOpen) return;
    if (item.collect_results && !identity) { setIdentityItem(item); return; }
    setRunnerIdentity(identity); setRunner(item); setIdentityItem(null);
  };

  if (route !== 'home' || !host) return null;
  const content = (
    <div className="bes-weekly-section">
      <div className="bes-weekly-heading"><div><span className="bes-weekly-kicker">WEEKLY ENGLISH PRACTICE</span><h2>Bài luyện tập tiếng Anh theo tuần</h2><p>Học sinh làm trực tiếp trên trình duyệt, không cần tài khoản.</p></div>{canManage ? <button type="button" className="bes-weekly-manage-button" onClick={() => setManagerOpen(true)}>Quản lý bài tuần</button> : null}</div>
      {loading ? <div className="bes-weekly-empty"><span className="bes-weekly-spinner" />Đang tải bài tuần…</div> : null}
      {!loading && featured ? <article className="bes-weekly-featured"><div className="bes-weekly-featured__week"><span>{featured.week_key || 'TUẦN'}</span><StatusPill item={featured} /></div><div className="bes-weekly-featured__content"><span className="bes-weekly-category">{featured.category || 'English practice'}</span><h3>{featured.title}</h3>{featured.description ? <p>{featured.description}</p> : null}<PracticeMeta item={featured} />{featured.closes_at ? <small>Mở đến {formatDate(featured.closes_at, language)}</small> : null}</div><div className="bes-weekly-featured__action">{readWeeklyPracticeProgress(featured.id)?.completed ? <span className="bes-weekly-complete">✓ Đã hoàn thành trên thiết bị này</span> : null}<button className="bes-weekly-primary" type="button" disabled={!getWeeklyPracticeAvailability(featured).canOpen} onClick={() => start(featured)}>{readWeeklyPracticeProgress(featured.id) ? 'Tiếp tục bài đang làm' : 'Bắt đầu luyện tập'}</button><span>{formatBytes(featured.file_size)} · Chỉ tải khi mở bài</span></div></article> : null}
      {!loading && !featured ? <div className="bes-weekly-empty"><strong>Bài tuần đang được chuẩn bị</strong><p>{canManage ? error || 'Nhấn “Quản lý bài tuần” để tải bài HTML đầu tiên.' : 'Vui lòng quay lại sau để xem bài luyện tập mới.'}</p></div> : null}
      {ordered.length > 1 ? <><button className="bes-weekly-show-all" type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Thu gọn danh sách' : `Xem tất cả bài luyện tập (${ordered.length})`}</button>{expanded ? <div className="bes-weekly-list">{ordered.map((item) => <article key={item.id}><div><StatusPill item={item} /><strong>{item.title}</strong><PracticeMeta item={item} /></div><button type="button" disabled={!getWeeklyPracticeAvailability(item).canOpen} onClick={() => start(item)}>{readWeeklyPracticeProgress(item.id) ? 'Tiếp tục' : 'Mở bài'}</button></article>)}</div> : null}</> : null}
      {error && featured && canManage ? <div className="bes-weekly-inline-error">{error}</div> : null}
    </div>
  );

  return <>{createPortal(content, host)}{identityItem ? <IdentityDialog item={identityItem} onCancel={() => setIdentityItem(null)} onStart={(identity) => start(identityItem, identity)} /> : null}{runner ? <PracticeRunner item={runner} identity={runnerIdentity} onClose={() => { setRunner(null); setRunnerIdentity(null); }} onProgressChanged={() => forceProgress((value) => value + 1)} /> : null}{managerOpen ? <ManagerDialog currentUser={currentUser} onClose={() => setManagerOpen(false)} onChanged={refresh} /> : null}</>;
}
