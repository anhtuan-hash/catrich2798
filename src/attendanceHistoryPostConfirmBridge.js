import { ensureRuntimeReady, getRuntimeClient } from './services/runtime/core.js';

const INSTALL_KEY = '__besAttendanceHistoryPostConfirmBridgeInstalled';
const HISTORY_ROOT = '.ahv3__shell[data-attendance-history-v3="true"]';
const DETAIL_SELECTOR = `${HISTORY_ROOT} .ahv3__detail`;
const BRIDGE_ATTRIBUTE = 'data-bes-history-post-confirm-bridge';

let observer = null;
let scheduled = false;
let resolutionToken = 0;

function text(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function fold(value) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function parseDisplayDate(value) {
  const raw = text(value);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;
  const vi = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return vi ? `${vi[3]}-${vi[2]}-${vi[1]}` : '';
}

function detailField(detail, label) {
  const wanted = fold(label);
  const article = Array.from(detail?.querySelectorAll('.ahv3__info-grid > article') || [])
    .find((node) => fold(node.querySelector('div > span')?.textContent) === wanted);
  return text(article?.querySelector('div > b')?.textContent);
}

function selectedHistorySnapshot() {
  const detail = document.querySelector(DETAIL_SELECTOR);
  if (!detail) return null;
  const hero = detail.querySelector('.ahv3__hero');
  const className = text(hero?.querySelector('h2')?.textContent);
  const attendanceDate = parseDisplayDate(detailField(detail, 'Ngày dạy'));
  if (!hero || !className || !attendanceDate) return { detail, className: '', attendanceDate: '', source: '' };

  const typeChip = hero.querySelector('.ahv3__type');
  const source = typeChip?.classList.contains('is-supplemental') ? 'supplemental' : 'extra';
  return {
    detail,
    className,
    attendanceDate,
    source,
    subject: detailField(detail, 'Môn học'),
    teacherName: detailField(detail, 'Giáo viên'),
  };
}

function snapshotKey(snapshot) {
  return [snapshot?.source, snapshot?.attendanceDate, fold(snapshot?.className), fold(snapshot?.subject), fold(snapshot?.teacherName)].join('|');
}

function chooseBestExtraSession(rows, snapshot) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length <= 1) return list[0] || null;
  const subject = fold(snapshot.subject);
  const teacher = fold(snapshot.teacherName);
  return list.find((row) => subject && fold(row?.subject) === subject && teacher && fold(row?.teacher_name) === teacher)
    || list.find((row) => subject && fold(row?.subject) === subject)
    || list.find((row) => teacher && fold(row?.teacher_name) === teacher)
    || list[0]
    || null;
}

async function resolveExtraSession(client, snapshot) {
  const { data, error } = await client
    .from('bes_extra_attendance_sessions')
    .select('id,class_id,class_name,attendance_date,subject,teacher_name,session_status,checked_at')
    .eq('attendance_date', snapshot.attendanceDate)
    .eq('class_name', snapshot.className)
    .order('checked_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return chooseBestExtraSession(data, snapshot);
}

function supplementalRowDate(row) {
  return text(row?.date || row?.attendanceDate || row?.attendance_date).slice(0, 10);
}

function supplementalRowName(row) {
  return text(row?.groupName || row?.group_name || row?.title || row?.subject);
}

async function resolveSupplementalSession(client, snapshot) {
  const { data, error } = await client.rpc('bes_list_supplemental_history', {
    p_from: snapshot.attendanceDate,
    p_to: snapshot.attendanceDate,
    p_query: snapshot.className,
  });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.find((row) => supplementalRowDate(row) === snapshot.attendanceDate && fold(supplementalRowName(row)) === fold(snapshot.className))
    || rows.find((row) => supplementalRowDate(row) === snapshot.attendanceDate)
    || rows[0]
    || null;
}

function ensureCompatibilitySurface(snapshot, resolved) {
  const detail = snapshot.detail;
  let surface = detail.querySelector(`[${BRIDGE_ATTRIBUTE}]`);
  if (!surface) {
    surface = document.createElement('div');
    surface.className = 'bes-history-post-confirm-bridge';
    surface.classList.add('attendance-rollcall');
    surface.setAttribute(BRIDGE_ATTRIBUTE, 'true');
    surface.style.display = 'contents';
    surface.innerHTML = `
      <div class="attendance-rollcall-head" hidden><h2></h2></div>
      <div class="attendance-session-controls" hidden><input type="date" /></div>
      <div class="attendance-class-list" hidden><button type="button" class="is-selected" data-bes-attendance-class-id=""></button></div>`;
    detail.prepend(surface);
  }

  const source = snapshot.source;
  const classId = source === 'supplemental'
    ? text(resolved?.groupId || resolved?.group_id || '')
    : text(resolved?.class_id || '');
  const sessionId = text(resolved?.id || '');

  surface.dataset.besAttendanceSource = source;
  surface.dataset.besAttendanceSessionId = sessionId;
  surface.dataset.besAttendanceDate = snapshot.attendanceDate;
  surface.dataset.besAttendanceClassId = classId;
  surface.dataset.besHistoryKey = snapshotKey(snapshot);

  const heading = surface.querySelector('.attendance-rollcall-head h2');
  if (heading && heading.textContent !== snapshot.className) heading.textContent = snapshot.className;
  const dateInput = surface.querySelector('.attendance-session-controls input[type="date"]');
  if (dateInput && dateInput.value !== snapshot.attendanceDate) {
    dateInput.value = snapshot.attendanceDate;
    dateInput.setAttribute('value', snapshot.attendanceDate);
  }
  const selectedButton = surface.querySelector('.attendance-class-list button.is-selected');
  if (selectedButton) selectedButton.dataset.besAttendanceClassId = classId;
}

function clearCompatibilitySurface(detail) {
  detail?.querySelector(`[${BRIDGE_ATTRIBUTE}]`)?.remove();
}

function refreshVisibleHistoryAfterSave() {
  if (!document.querySelector(DETAIL_SELECTOR)) return;
  document.querySelector('.attendance-top-actions button[title="Làm mới"]')?.click();
  window.setTimeout(() => {
    document.querySelector(`${HISTORY_ROOT} .ahv3__items > button.is-selected`)?.click();
  }, 250);
}

async function synchronize() {
  scheduled = false;

  const snapshot = selectedHistorySnapshot();
  if (!snapshot?.detail) return;
  if (!snapshot.className || !snapshot.attendanceDate || !snapshot.source) {
    clearCompatibilitySurface(snapshot.detail);
    return;
  }

  const existingSurface = snapshot.detail.querySelector(`[${BRIDGE_ATTRIBUTE}]`);
  if (existingSurface?.dataset?.besHistoryKey === snapshotKey(snapshot)) return;

  const client = getRuntimeClient();
  if (!client) return;
  const token = ++resolutionToken;

  try {
    const resolved = snapshot.source === 'supplemental'
      ? await resolveSupplementalSession(client, snapshot)
      : await resolveExtraSession(client, snapshot);
    if (token !== resolutionToken || !resolved) return;

    const current = selectedHistorySnapshot();
    if (!current?.detail
      || current.detail !== snapshot.detail
      || current.className !== snapshot.className
      || current.attendanceDate !== snapshot.attendanceDate
      || current.source !== snapshot.source) return;

    ensureCompatibilitySurface(snapshot, resolved);
  } catch (error) {
    console.warn('[AttendanceHistoryPostConfirmBridge] Không thể đồng bộ phiên chỉnh sửa từ Lịch sử.', error);
  }
}

function scheduleSynchronize() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => { void synchronize(); });
}

async function install() {
  if (window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;
  try { await ensureRuntimeReady(); } catch { /* runtime can recover; observer retries */ }

  observer = new MutationObserver(() => scheduleSynchronize());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener('attendance:saved', refreshVisibleHistoryAfterSave);
  scheduleSynchronize();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') install();
