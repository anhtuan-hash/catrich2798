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
  uploadWeeklyPracticeProof,
  WEEKLY_PRACTICE_CLASSES,
  WEEKLY_PRACTICE_MAX_BYTES,
  WEEKLY_PRACTICE_MINIMUM_SECONDS,
  writeWeeklyPracticeProgress,
} from '../utils/weeklyPractice.js';

const HOME_ROOT_SELECTOR = ".metro-clean-system[data-route='home']";
const HOST_ID = 'bes-weekly-practice-root';

function errorText(error) {
  const message = String(error?.message || error || '').trim();
  if (/weekly_practice_items|weekly_practice_results|proof_path|weekly-practice-proofs|does not exist|schema cache/i.test(message)) {
    return 'Cơ sở dữ liệu Bài luyện tập theo tuần chưa được cập nhật. Hãy chạy migration weekly_practice_v1 và weekly_practice_student_proof_v2 trong Supabase.';
  }
  if (/row-level security|permission denied|policy/i.test(message)) {
    return 'Tài khoản hiện tại không có quyền thực hiện thao tác này.';
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

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
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
    duration_minutes: 45,
    opens_at: toLocalInput(),
    closes_at: '',
    status: 'published',
    allow_retake: true,
    collect_results: true,
    show_answers: true,
    is_featured: true,
  };
}

function inferManagerGrade(item) {
  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  const explicitGrade = (value) => {
    const text = normalize(value);
    if (/^(10|11|12)$/.test(text)) return text;
    return text.match(/(?:tieng anh|english|khoi|grade|lop)\s*(10|11|12)(?:\b|$)/)?.[1] || '';
  };
  return explicitGrade(item?.grade)
    || explicitGrade(item?.category)
    || explicitGrade(item?.title)
    || '';
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
    <span>Tối thiểu 20 phút</span>
    {item.created_at ? <span>Đăng {formatDate(item.created_at, language)}</span> : null}
  </div>;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((value, index) => {
    const clipped = index === maxLines - 1 && lines.length > maxLines ? `${value.replace(/[.,;:]?$/, '')}…` : value;
    ctx.fillText(clipped, x, y + (index * lineHeight));
  });
}

async function createCompletionProof({ item, identity, durationSeconds, startedAt, confirmedAt, proofCode }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không thể tạo ảnh xác nhận.');

  const gradient = ctx.createLinearGradient(0, 0, 1200, 675);
  gradient.addColorStop(0, '#f9fbe9');
  gradient.addColorStop(0.58, '#ffffff');
  gradient.addColorStop(1, '#e8efbd');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 675);

  ctx.fillStyle = '#b2c248';
  ctx.fillRect(0, 0, 34, 675);
  ctx.fillRect(34, 0, 1166, 18);

  drawRoundedRect(ctx, 74, 58, 1052, 559, 36);
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(67,83,25,.15)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#718220';
  ctx.font = '800 24px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('BRIAN ENGLISH STUDIO', 120, 112);

  ctx.fillStyle = '#203016';
  ctx.font = '900 50px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('XÁC NHẬN ĐÃ HOÀN THÀNH', 120, 176);

  ctx.font = '700 25px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = '#506044';
  drawWrappedText(ctx, item.title, 120, 225, 910, 34, 2);

  const rows = [
    ['Học sinh', identity.student_name],
    ['Lớp', identity.class_code],
    ['Bắt đầu', formatDate(startedAt)],
    ['Xác nhận', formatDate(confirmedAt)],
    ['Thời lượng hoạt động', formatDuration(durationSeconds)],
    ['Mã minh chứng', proofCode],
  ];
  let y = 316;
  rows.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = column === 0 ? 120 : 625;
    y = 316 + (row * 90);
    ctx.fillStyle = '#7a856f';
    ctx.font = '700 18px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(label.toUpperCase(), x, y);
    ctx.fillStyle = '#25321e';
    ctx.font = '800 27px system-ui, -apple-system, Segoe UI, sans-serif';
    drawWrappedText(ctx, value, x, y + 34, 430, 31, 2);
  });

  drawRoundedRect(ctx, 120, 570, 960, 3, 2);
  ctx.fillStyle = '#dfe6be';
  ctx.fill();
  ctx.fillStyle = '#68755c';
  ctx.font = '600 17px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Ảnh được hệ thống tạo khi học sinh xác nhận sau tối thiểu 20 phút.', 120, 601);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Không thể xuất ảnh xác nhận.'));
    }, 'image/png', 0.95);
  });
}

function StudentIdentityGate({ item, initialIdentity, onConfirm, onClose }) {
  const [studentName, setStudentName] = useState(initialIdentity?.student_name || '');
  const [classCode, setClassCode] = useState(initialIdentity?.class_code || '');
  const [message, setMessage] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const name = studentName.replace(/\s+/g, ' ').trim();
    if (name.length < 2) {
      setMessage('Hãy nhập đầy đủ họ và tên.');
      return;
    }
    if (!WEEKLY_PRACTICE_CLASSES.includes(classCode)) {
      setMessage('Hãy chọn lớp trong danh sách.');
      return;
    }
    onConfirm({ student_name: name, class_code: classCode });
  };

  return <div className="bes-weekly-identity-gate">
    <section className="bes-weekly-identity-card" role="dialog" aria-modal="true" aria-label="Khai báo thông tin học sinh">
      <span className="bes-weekly-kicker">STUDENT CHECK-IN</span>
      <h2>Thông tin làm bài</h2>
      <p>Hệ thống bắt đầu tính thời gian hoạt động sau khi em xác nhận thông tin. Em có thể gửi bài sau khi đủ tối thiểu 20 phút hoạt động.</p>
      <div className="bes-weekly-identity-practice"><strong>{item.title}</strong><span>Không cần đăng nhập tài khoản</span></div>
      <form onSubmit={submit}>
        <label>Họ và tên học sinh<input autoFocus required maxLength={120} value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Nhập đầy đủ họ và tên" /></label>
        <label>Lớp<select required value={classCode} onChange={(event) => setClassCode(event.target.value)}><option value="">Chọn lớp</option>{WEEKLY_PRACTICE_CLASSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        {message ? <div className="bes-weekly-identity-error">{message}</div> : null}
        <div className="bes-weekly-identity-actions"><button type="button" onClick={onClose}>Quay lại</button><button className="bes-weekly-primary" type="submit">Xác nhận và bắt đầu</button></div>
      </form>
    </section>
  </div>;
}

function PracticeRunner({ item, onClose, onProgressChanged }) {
  const initialProgress = useMemo(() => readWeeklyPracticeProgress(item.id) || {}, [item.id]);
  const iframeRef = useRef(null);
  const shellRef = useRef(null);
  const blobUrlRef = useRef('');
  const proofUrlRef = useRef('');
  const [identity, setIdentity] = useState(initialProgress.identity || null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fontScale, setFontScale] = useState(1);
  const [activeSeconds, setActiveSeconds] = useState(Math.max(0, Number(initialProgress.activeSeconds || 0)));
  const [startedAt, setStartedAt] = useState(initialProgress.startedAt || '');
  const [submitted, setSubmitted] = useState(Boolean(initialProgress.submitted));
  const [notice, setNotice] = useState(initialProgress.submitted ? 'Bài đã được gửi cho TTCM.' : '');
  const [htmlResult, setHtmlResult] = useState(initialProgress.htmlResult || {});
  const [proofBlob, setProofBlob] = useState(null);
  const [proofUrl, setProofUrl] = useState('');
  const [proofCode, setProofCode] = useState(initialProgress.proofCode || '');
  const [proofGeneratedAt, setProofGeneratedAt] = useState(initialProgress.proofGeneratedAt || '');
  const [proofPath, setProofPath] = useState(initialProgress.proofPath || '');
  const [generatingProof, setGeneratingProof] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!identity) return;
    setLoading(true);
    setError('');
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
  }, [identity, item]);

  useEffect(() => {
    if (!identity) return undefined;
    load();
    logWeeklyPracticeEvent(item.id, 'open', { source: 'runner', class_code: identity.class_code });
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, [identity, item.id, load]);

  useEffect(() => () => {
    if (proofUrlRef.current) URL.revokeObjectURL(proofUrlRef.current);
  }, []);

  useEffect(() => {
    if (!identity || submitted) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setActiveSeconds((value) => {
        const next = value + 1;
        if (next % 5 === 0) writeWeeklyPracticeProgress(item.id, { activeSeconds: next });
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [identity, item.id, submitted]);

  useEffect(() => {
    const onMessage = (event) => {
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
        setHtmlResult(payload);
        writeWeeklyPracticeProgress(item.id, { htmlResult: payload, htmlReportedCompleteAt: new Date().toISOString() });
        setNotice(activeSeconds >= WEEKLY_PRACTICE_MINIMUM_SECONDS
          ? 'Nội dung HTML đã báo hoàn thành. Em hãy tạo ảnh xác nhận.'
          : 'Nội dung HTML đã báo hoàn thành. Hệ thống vẫn khóa gửi bài cho đến đủ 20 phút.');
      }
      if (message.type === 'reset') {
        setHtmlResult({});
        writeWeeklyPracticeProgress(item.id, { htmlResult: {}, runtime: {} });
        setNotice('Đã làm mới tiến độ bên trong bài. Thời gian hoạt động đã tích lũy không bị đặt lại.');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [activeSeconds, item.id, onProgressChanged]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ source: 'brian-weekly-host', practiceId: item.id, type: 'font-scale', value: fontScale }, '*');
  }, [fontScale, item.id, url]);

  const confirmIdentity = (nextIdentity) => {
    const now = new Date().toISOString();
    setIdentity(nextIdentity);
    setStartedAt(now);
    setActiveSeconds(0);
    writeWeeklyPracticeProgress(item.id, {
      identity: nextIdentity,
      startedAt: now,
      activeSeconds: 0,
      completed: false,
      submitted: false,
    });
    onProgressChanged?.();
  };

  const reset = async () => {
    if (!window.confirm('Xóa toàn bộ tiến độ, thông tin học sinh và bắt đầu lại từ đầu?')) return;
    clearWeeklyPracticeProgress(item.id);
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    if (proofUrlRef.current) URL.revokeObjectURL(proofUrlRef.current);
    blobUrlRef.current = '';
    proofUrlRef.current = '';
    setIdentity(null);
    setUrl('');
    setActiveSeconds(0);
    setStartedAt('');
    setSubmitted(false);
    setHtmlResult({});
    setProofBlob(null);
    setProofUrl('');
    setProofCode('');
    setProofGeneratedAt('');
    setProofPath('');
    setNotice('');
    onProgressChanged?.();
  };

  const confirmCompletion = async () => {
    if (!identity || submitted || activeSeconds < WEEKLY_PRACTICE_MINIMUM_SECONDS) return;
    if (!window.confirm('Em xác nhận đã làm xong bài và đồng ý tạo ảnh xác nhận hoàn thành?')) return;
    setGeneratingProof(true);
    setError('');
    try {
      const confirmedAt = new Date().toISOString();
      const nextProofCode = `BES-${item.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const blob = await createCompletionProof({
        item,
        identity,
        durationSeconds: activeSeconds,
        startedAt,
        confirmedAt,
        proofCode: nextProofCode,
      });
      if (proofUrlRef.current) URL.revokeObjectURL(proofUrlRef.current);
      const nextUrl = URL.createObjectURL(blob);
      proofUrlRef.current = nextUrl;
      setProofBlob(blob);
      setProofUrl(nextUrl);
      setProofCode(nextProofCode);
      setProofGeneratedAt(confirmedAt);
      setNotice('Đã tạo ảnh xác nhận. Kiểm tra ảnh rồi bấm “Gửi cho TTCM”.');
      writeWeeklyPracticeProgress(item.id, {
        activeSeconds,
        proofCode: nextProofCode,
        proofGeneratedAt: confirmedAt,
      });
    } catch (proofError) {
      setError(errorText(proofError));
    } finally {
      setGeneratingProof(false);
    }
  };

  const sendToTtcm = async () => {
    if (!identity || !proofBlob || submitted || sending) return;
    setSending(true);
    setError('');
    try {
      const uploadedPath = proofPath || await uploadWeeklyPracticeProof(item.id, proofBlob);
      if (!proofPath) setProofPath(uploadedPath);
      const result = await submitWeeklyPracticeResult(item.id, identity, {
        ...htmlResult,
        durationSeconds: activeSeconds,
        proofPath: uploadedPath,
        metadata: {
          ...(htmlResult?.metadata || {}),
          proofCode,
          startedAt,
          proofGeneratedAt,
          submittedAt: new Date().toISOString(),
          source: 'weekly-practice-runner',
        },
      });
      const submittedAt = result?.created_at || new Date().toISOString();
      setSubmitted(true);
      setNotice('Đã gửi thành công cho TTCM. Em có thể lưu ảnh hoặc đóng bài.');
      writeWeeklyPracticeProgress(item.id, {
        activeSeconds,
        completed: true,
        submitted: true,
        submittedAt,
        resultId: result?.id || null,
        proofPath: uploadedPath,
      });
      onProgressChanged?.();
      await logWeeklyPracticeEvent(item.id, 'complete', {
        source: 'student-submission',
        class_code: identity.class_code,
        duration_seconds: activeSeconds,
      });
    } catch (sendError) {
      setError(errorText(sendError));
      setNotice('Chưa gửi được cho TTCM. Ảnh xác nhận vẫn được giữ để thử lại.');
    } finally {
      setSending(false);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shellRef.current?.requestFullscreen?.();
    } catch { /* browser may block fullscreen */ }
  };

  const remainingSeconds = Math.max(0, WEEKLY_PRACTICE_MINIMUM_SECONDS - activeSeconds);
  const canConfirm = Boolean(identity) && !submitted && remainingSeconds === 0;

  return createPortal(
    <div className="bes-weekly-runner" ref={shellRef} role="dialog" aria-modal="true" aria-label={item.title}>
      <header className="bes-weekly-runner__bar">
        <button type="button" onClick={onClose}>← Trang chủ</button>
        <div><strong>{item.title}</strong><span>{identity ? `${identity.student_name} · Lớp ${identity.class_code}` : 'Chưa bắt đầu'}</span></div>
        <div className={`bes-weekly-timer ${remainingSeconds === 0 ? 'is-ready' : ''}`}><small>THỜI GIAN HOẠT ĐỘNG</small><strong>{formatDuration(activeSeconds)}</strong><span>{remainingSeconds ? `Còn ${formatDuration(remainingSeconds)} để được nộp` : 'Đã đủ điều kiện xác nhận'}</span></div>
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
        {error ? <div className="bes-weekly-runner__state is-error"><strong>Không thể hoàn thành thao tác</strong><p>{error}</p>{url ? <button type="button" onClick={() => setError('')}>Đóng thông báo</button> : <button type="button" onClick={load}>Thử lại</button>}</div> : null}
        {!loading && !error && url ? <iframe ref={iframeRef} src={url} title={item.title} sandbox="allow-scripts allow-forms allow-downloads" referrerPolicy="no-referrer" /> : null}
      </main>
      <footer className={`bes-weekly-completion-bar ${submitted ? 'is-completed' : ''} ${proofUrl ? 'has-proof' : ''}`}>
        <div className="bes-weekly-completion-copy"><strong>{submitted ? '✓ Đã gửi cho TTCM' : proofUrl ? 'Ảnh xác nhận đã sẵn sàng' : remainingSeconds ? 'Chưa thể nộp bài' : 'Đã đủ 20 phút'}</strong><span>{notice || (remainingSeconds ? 'Tiếp tục làm bài. Đồng hồ chỉ tăng khi cửa sổ bài tập đang hiển thị.' : 'Bấm xác nhận để hệ thống tạo ảnh hoàn thành.')}</span></div>
        {proofUrl ? <button className="bes-weekly-proof-preview" type="button" onClick={() => window.open(proofUrl, '_blank', 'noopener,noreferrer')}><img src={proofUrl} alt="Ảnh xác nhận hoàn thành" /><span>Xem ảnh xác nhận</span></button> : null}
        <div className="bes-weekly-submit-actions">
          {!proofUrl && !submitted ? <button type="button" disabled={!canConfirm || generatingProof} onClick={confirmCompletion}>{generatingProof ? 'Đang tạo ảnh…' : remainingSeconds ? `Còn ${formatDuration(remainingSeconds)}` : 'Xác nhận đã hoàn thành'}</button> : null}
          {proofUrl && !submitted ? <><button className="is-secondary" type="button" disabled={generatingProof || sending} onClick={confirmCompletion}>Tạo lại ảnh</button><button type="button" disabled={sending} onClick={sendToTtcm}>{sending ? 'Đang gửi…' : 'Gửi cho TTCM'}</button></> : null}
          {submitted ? <button type="button" disabled>✓ Đã gửi thành công</button> : null}
        </div>
      </footer>
      {!identity ? <StudentIdentityGate item={item} initialIdentity={initialProgress.identity} onConfirm={confirmIdentity} onClose={onClose} /> : null}
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
  const [gradeFilter, setGradeFilter] = useState('all');

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try { setItems(await listManagedWeeklyPractices()); }
    catch (error) { setMessage(errorText(error)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const handleRefresh = () => refresh();
    window.addEventListener('bes-weekly-manager-refresh', handleRefresh);
    return () => window.removeEventListener('bes-weekly-manager-refresh', handleRefresh);
  }, [refresh]);

  const gradeCounts = useMemo(() => items.reduce((counts, item) => {
    const grade = inferManagerGrade(item);
    if (grade && Object.prototype.hasOwnProperty.call(counts, grade)) counts[grade] += 1;
    else counts.unclassified += 1;
    return counts;
  }, { all: items.length, 10: 0, 11: 0, 12: 0, unclassified: 0 }), [items]);

  const visibleItems = useMemo(() => gradeFilter === 'all'
    ? items
    : items.filter((item) => inferManagerGrade(item) === gradeFilter), [items, gradeFilter]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await createWeeklyPractice({ form: { ...defaultForm(), title: form.title }, file, currentUser });
      setForm(defaultForm());
      setFile(null);
      const input = document.getElementById('bes-weekly-html-file');
      if (input) input.value = '';
      await refresh();
      await onChanged?.();
      setMessage('Đã tải lên và công bố bài luyện tập. Học sinh bắt buộc khai báo tên, lớp và làm tối thiểu 20 phút trước khi nộp.');
    } catch (error) { setMessage(errorText(error)); }
    finally { setSaving(false); }
  };

  const changeStatus = async (item, status) => {
    setMessage('');
    try {
      await updateWeeklyPracticeStatus(item, status);
      await refresh();
      await onChanged?.();
    } catch (error) { setMessage(errorText(error)); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Xóa vĩnh viễn “${item.title}” và file HTML đi kèm?`)) return;
    setMessage('');
    try {
      await deleteWeeklyPractice(item);
      await refresh();
      await onChanged?.();
    } catch (error) { setMessage(errorText(error)); }
  };

  return createPortal(
    <div className="bes-weekly-modal-backdrop">
      <section className="bes-weekly-manager bes-weekly-manager--simple" role="dialog" aria-modal="true" aria-label="Quản lý bài luyện tập theo tuần">
        <header><div><span className="bes-weekly-kicker">QUẢN TRỊ NỘI DUNG</span><h2>Bài luyện tập theo tuần</h2><p>Tải file HTML; hệ thống tự áp dụng khai báo học sinh, thời gian hoạt động, ngưỡng nộp 20 phút, ảnh xác nhận và gửi kết quả cho TTCM.</p></div><button className="bes-weekly-close" type="button" onClick={onClose}>×</button></header>
        {message ? <div className="bes-weekly-manager__message">{message}</div> : null}
        <div className="bes-weekly-manager__grid">
          <form onSubmit={submit} className="bes-weekly-form bes-weekly-form--simple">
            <h3>Tải bài HTML mới</h3>
            <label>Tên bài<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ví dụ: Tiếng Anh 10 – Unit 1" /></label>
            <label className="bes-weekly-file">File HTML<input id="bes-weekly-html-file" required type="file" accept=".html,.htm,text/html" onChange={(event) => setFile(event.target.files?.[0] || null)} /><span>{file ? `${file.name} · ${formatBytes(file.size)}` : `File tự chứa, tối đa ${formatBytes(WEEKLY_PRACTICE_MAX_BYTES)}`}</span></label>
            <div className="bes-weekly-simple-note"><strong>Tự động thiết lập</strong><span>Bắt buộc họ tên · Chọn lớp 10.1–10.12, 11.1–11.6, 12.1–12.9 · Không nộp trước 20 phút · Tạo ảnh xác nhận · Gửi TTCM</span></div>
            <button className="bes-weekly-primary" disabled={saving} type="submit">{saving ? 'Đang tải lên…' : 'Tải lên và công bố'}</button>
          </form>
          <section className="bes-weekly-manage-list"><h3>Các bài đã tạo</h3><div className="bes-weekly-grade-filter bes-weekly-grade-filter--native" data-native-grade-filter="true"><div className="bes-weekly-grade-filter__heading"><strong>Phân loại theo khối</strong><small>Chọn khối để tra cứu nhanh các bài đã tạo.</small></div><div className="bes-weekly-grade-filter__buttons">{['all', '10', '11', '12'].map((grade) => <button key={grade} type="button" data-grade-filter={grade} className={gradeFilter === grade ? 'is-active' : ''} aria-pressed={gradeFilter === grade} disabled={grade !== 'all' && gradeCounts[grade] === 0} onClick={() => setGradeFilter(grade)}><span>{grade === 'all' ? 'Tất cả' : 'Khối ' + grade}</span><b>{gradeCounts[grade]}</b></button>)}</div>{gradeCounts.unclassified > 0 ? <small className="bes-weekly-grade-filter__warning">{gradeCounts.unclassified} bài chưa có phân loại khối rõ ràng. Có thể chọn các bài này và chuyển khối bằng thanh cài đặt nhanh bên dưới.</small> : null}</div>{loading ? <p>Đang tải…</p> : null}{!loading && !visibleItems.length ? <p>{gradeFilter === 'all' ? 'Chưa có bài nào.' : 'Chưa có bài thuộc Khối ' + gradeFilter + '.'}</p> : null}{visibleItems.map((practice) => <article key={practice.id} data-practice-id={practice.id}><div><StatusPill item={practice} /><strong>{practice.title}</strong><span>{formatBytes(practice.file_size)} · Tối thiểu 20 phút · {formatDate(practice.created_at)}</span></div><nav>{practice.status !== 'published' ? <button type="button" onClick={() => changeStatus(practice, 'published')}>Công bố</button> : <button type="button" onClick={() => changeStatus(practice, 'draft')}>Ẩn</button>}<button type="button" onClick={() => changeStatus(practice, 'maintenance')}>Bảo trì</button><button className="is-danger" type="button" onClick={() => remove(practice)}>Xóa</button></nav></article>)}</section>
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
    if (route !== 'home') {
      setHost(null);
      return undefined;
    }
    let frame = 0;
    const attach = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setHost(ensureHost()));
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', attach, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', attach);
      document.getElementById(HOST_ID)?.remove();
    };
  }, [route]);

  const refresh = useCallback(async () => {
    if (route !== 'home') return;
    setLoading(true);
    setError('');
    try { setItems(await listPublicWeeklyPractices()); }
    catch (loadError) {
      setItems([]);
      setError(errorText(loadError));
    } finally { setLoading(false); }
  }, [route]);

  useEffect(() => { refresh(); }, [refresh]);

  const ordered = useMemo(() => [...items].sort((a, b) => {
    const rank = (practice) => ({ open: 0, upcoming: 1, closed: 2 }[getWeeklyPracticeAvailability(practice).state] ?? 3);
    return rank(a) - rank(b) || Number(b.is_featured) - Number(a.is_featured) || new Date(b.opens_at || 0) - new Date(a.opens_at || 0);
  }), [items]);
  const featured = ordered[0] || null;

  const start = (practice) => {
    const availability = getWeeklyPracticeAvailability(practice);
    if (!availability.canOpen) return;
    setRunner(practice);
  };

  if (route !== 'home' || !host) return null;
  const content = (
    <div className="bes-weekly-section">
      <div className="bes-weekly-heading"><div><span className="bes-weekly-kicker">WEEKLY ENGLISH PRACTICE</span><h2>Bài luyện tập tiếng Anh theo tuần</h2><p>Khai báo họ tên và lớp, làm bài tối thiểu 20 phút, tạo ảnh xác nhận rồi gửi cho TTCM.</p></div>{canManage ? <button type="button" className="bes-weekly-manage-button" onClick={() => setManagerOpen(true)}>Quản lý bài tuần</button> : null}</div>
      {loading ? <div className="bes-weekly-empty"><span className="bes-weekly-spinner" />Đang tải bài tuần…</div> : null}
      {!loading && featured ? <article className="bes-weekly-featured"><div className="bes-weekly-featured__week"><span>BÀI MỚI</span><StatusPill item={featured} /></div><div className="bes-weekly-featured__content"><span className="bes-weekly-category">HTML INTERACTIVE</span><h3>{featured.title}</h3><p>Học sinh chọn lớp trong danh sách, hệ thống tính thời gian hoạt động và chỉ mở nút xác nhận sau đủ 20 phút.</p><PracticeMeta item={featured} language={language} /></div><div className="bes-weekly-featured__action">{readWeeklyPracticeProgress(featured.id)?.submitted ? <span className="bes-weekly-complete">✓ Đã gửi cho TTCM</span> : null}<button className="bes-weekly-primary" type="button" disabled={!getWeeklyPracticeAvailability(featured).canOpen} onClick={() => start(featured)}>{readWeeklyPracticeProgress(featured.id)?.identity ? 'Mở lại bài luyện tập' : 'Bắt đầu luyện tập'}</button><span>Không cần tài khoản học sinh</span></div></article> : null}
      {!loading && !featured ? <div className="bes-weekly-empty"><strong>Bài tuần đang được chuẩn bị</strong><p>{canManage ? error || 'Nhấn “Quản lý bài tuần” để tải file HTML đầu tiên.' : 'Vui lòng quay lại sau để xem bài luyện tập mới.'}</p></div> : null}
      {ordered.length > 1 ? <><button className="bes-weekly-show-all" type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Thu gọn danh sách' : `Xem tất cả bài luyện tập (${ordered.length})`}</button>{expanded ? <div className="bes-weekly-list">{ordered.map((practice) => <article key={practice.id}><div><StatusPill item={practice} /><strong>{practice.title}</strong><PracticeMeta item={practice} language={language} /></div><button type="button" disabled={!getWeeklyPracticeAvailability(practice).canOpen} onClick={() => start(practice)}>{readWeeklyPracticeProgress(practice.id)?.submitted ? 'Xem lại' : readWeeklyPracticeProgress(practice.id)?.identity ? 'Tiếp tục' : 'Mở bài'}</button></article>)}</div> : null}</> : null}
      {error && featured && canManage ? <div className="bes-weekly-inline-error">{error}</div> : null}
    </div>
  );

  return <>{createPortal(content, host)}{runner ? <PracticeRunner item={runner} onClose={() => setRunner(null)} onProgressChanged={() => forceProgress((value) => value + 1)} /> : null}{managerOpen ? <ManagerDialog currentUser={currentUser} onClose={() => setManagerOpen(false)} onChanged={refresh} /> : null}</>;
}
