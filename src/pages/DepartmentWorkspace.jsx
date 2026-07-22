import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './department/DepartmentWorkspace.css';
import DepartmentIcon from './department/DepartmentIcons.jsx';
import DepartmentWorkCenter from './department/DepartmentWorkCenter.jsx';
import DepartmentTeacherDirectory from './department/DepartmentTeacherDirectory.jsx';
import { DEPARTMENT_TEMPLATES } from '../data/department.js';
import { canPublishDepartment } from '../utils/permissions.js';
import { canUseCloudDepartmentStore, loadDepartmentSnapshot, saveDepartmentSnapshot } from '../utils/departmentStore.js';
import { loadMammoth, loadPdfjs } from '../utils/documentParsers.js';
import { makeOfflineScheduleCsvTemplate, parseOfflineScheduleFile } from '../utils/offlineScheduleParser.js';

const STORAGE_PREFIX = 'bes-department-workspace-v2';
const SHARED_STORAGE_KEY = `${STORAGE_PREFIX}:shared`;
const STATUS_OPTIONS = ['Chưa làm', 'Đang thực hiện', 'Chờ duyệt', 'Hoàn thành'];
const ACTIVITY_TYPES = ['Kế hoạch', 'Họp tổ', 'Dự giờ', 'Nghiên cứu bài học', 'Chuyên đề', 'Kiểm tra đánh giá', 'Bồi dưỡng giáo viên', 'HSG / CLB / Ngoại khóa', 'Hạn nộp hồ sơ', 'Hoạt động khác'];
const RECORD_CATEGORIES = ['Kế hoạch', 'Biên bản', 'Nghiên cứu bài học', 'Dự giờ', 'Kiểm tra đánh giá', 'Bồi dưỡng giáo viên', 'HSG / CLB / Ngoại khóa', 'Văn bản hành chính', 'Mẫu biểu', 'Minh chứng đã duyệt', 'Khác'];
const NAV_ITEMS = [
  ['overview', 'Tổng quan', 'home'],
  ['schedule', 'Lịch & hoạt động', 'calendar'],
  ['work', 'Trung tâm công việc', 'tasks'],
  ['records', 'Hồ sơ & văn bản', 'folder'],
  ['teachers', 'Danh sách giáo viên', 'users'],
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix = 'department') {
  try {
    return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function defaultData(language = 'vi') {
  return {
    schoolYear: '2026-2027',
    semester: language === 'vi' ? 'Học kỳ I' : 'Semester I',
    departmentName: language === 'vi' ? 'Tổ Tiếng Anh' : 'English Department',
    workSchedules: [],
    documents: [],
    reports: [],
    plans: [],
    meetings: [],
    tasks: [],
    lessonStudies: [],
    observations: [],
    assessments: [],
    teacherDevelopment: [],
    studentActivities: [],
    teachers: [],
    lastUpdated: new Date().toISOString(),
  };
}

function normalizeData(raw, language = 'vi') {
  const base = defaultData(language);
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    ...base,
    ...source,
    workSchedules: toArray(source.workSchedules),
    documents: toArray(source.documents),
    reports: toArray(source.reports),
    plans: toArray(source.plans),
    meetings: toArray(source.meetings),
    tasks: toArray(source.tasks),
    lessonStudies: toArray(source.lessonStudies),
    observations: toArray(source.observations),
    assessments: toArray(source.assessments),
    teacherDevelopment: toArray(source.teacherDevelopment),
    studentActivities: toArray(source.studentActivities),
    teachers: toArray(source.teachers),
  };
}

function localKey(user) {
  return `${STORAGE_PREFIX}:${user?.id || user?.email || 'guest'}`;
}

function readStored(user, language = 'vi', preferShared = false) {
  if (typeof localStorage === 'undefined') return defaultData(language);
  const keys = preferShared ? [SHARED_STORAGE_KEY, localKey(user)] : [localKey(user), SHARED_STORAGE_KEY];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return normalizeData(JSON.parse(raw), language);
    } catch {
      // Ignore invalid local cache and continue.
    }
  }
  return defaultData(language);
}

function writeStored(user, data, shared = false) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(localKey(user), JSON.stringify(data));
    if (shared) localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Cloud storage remains the source of truth.
  }
}

function formatDate(value) {
  if (!value) return 'Chưa đặt ngày';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function getDateValue(item) {
  return item?.date || item?.deadline || item?.due || item?.due_at || '';
}

function isOpenStatus(status) {
  return !['Hoàn thành', 'Đã duyệt', 'completed', 'approved', 'archived'].includes(String(status || ''));
}

function isOverdue(item) {
  const value = getDateValue(item);
  if (!value || !isOpenStatus(item?.status)) return false;
  const due = new Date(`${String(value).slice(0, 10)}T23:59:59`);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
}

function buildActivityRows(data) {
  const groups = [
    ['workSchedules', 'Lịch & hoạt động', 'date'],
    ['plans', 'Kế hoạch', 'deadline'],
    ['meetings', 'Họp tổ', 'date'],
    ['lessonStudies', 'Nghiên cứu bài học', 'date'],
    ['observations', 'Dự giờ', 'date'],
    ['assessments', 'Kiểm tra đánh giá', 'date'],
    ['teacherDevelopment', 'Bồi dưỡng giáo viên', 'date'],
    ['studentActivities', 'HSG / CLB / Ngoại khóa', 'date'],
  ];
  return groups.flatMap(([collection, fallbackType, dateKey]) => toArray(data[collection]).map((item) => ({
    ...item,
    id: item.id || uid('legacy'),
    collection,
    type: item.type || fallbackType,
    date: item[dateKey] || getDateValue(item),
    owner: item.owner || item.chair || item.assignee || 'Tổ chuyên môn',
    note: item.note || item.conclusion || item.evidence || '',
    legacy: collection !== 'workSchedules',
  }))).sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999')));
}

function classToken(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function initials(value) {
  const parts = String(value || 'BE').trim().split(/\s+/).filter(Boolean);
  return parts.slice(-2).map((part) => part[0]?.toUpperCase()).join('') || 'BE';
}

function emptySchedule(user) {
  return {
    title: '',
    type: 'Kế hoạch',
    owner: user?.name || user?.email || 'TTCM',
    date: today(),
    startTime: '',
    endTime: '',
    location: '',
    status: 'Chưa làm',
    note: '',
  };
}

function emptyRecord(user) {
  return {
    title: '',
    category: 'Kế hoạch',
    owner: user?.name || user?.email || 'TTCM',
    date: today(),
    link: '',
    note: '',
  };
}

function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob(['\uFEFF', content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function escapeIcs(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function toIcsDate(date, time = '') {
  const day = String(date || today()).replaceAll('-', '');
  return time ? `${day}T${String(time).replace(':', '').padEnd(6, '0')}` : `VALUE=DATE:${day}`;
}

function makeCalendarIcs(items) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Brian English Studio//Department Workspace//VI'];
  items.filter((item) => item.date).forEach((item) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcs(item.id || uid('event'))}@brian-english-studio`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
      `DTSTART;${toIcsDate(item.date, item.startTime)}`,
    );
    if (item.endTime) lines.push(`DTEND:${toIcsDate(item.date, item.endTime)}`);
    lines.push(`SUMMARY:${escapeIcs(item.title)}`);
    if (item.location) lines.push(`LOCATION:${escapeIcs(item.location)}`);
    lines.push(`DESCRIPTION:${escapeIcs([item.type, item.owner, item.note].filter(Boolean).join(' · '))}`, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

async function readScheduleText(file) {
  const name = String(file?.name || '').toLowerCase();
  const buffer = await file.arrayBuffer();
  if (name.endsWith('.docx')) {
    const mammoth = await loadMammoth();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || '';
  }
  if (name.endsWith('.pdf')) {
    const pdfjs = await loadPdfjs();
    const pdf = await pdfjs.getDocument({ data: buffer, useSystemFonts: true }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 40); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent({ normalizeWhitespace: true });
      pages.push((content.items || []).map((item) => item.str || '').join(' '));
    }
    const text = pages.join('\n');
    if (text.replace(/\s+/g, '').length < 40) throw new Error('PDF có thể là bản scan/ảnh và chưa có văn bản để đọc.');
    return text;
  }
  return new TextDecoder('utf-8').decode(buffer);
}

function MetricCard({ tone, icon, label, value, note, onClick }) {
  return (
    <button type="button" className={`dwr-metric tone-${tone}`} onClick={onClick}>
      <span className="dwr-metric-icon"><DepartmentIcon name={icon}/></span>
      <div><small>{label}</small><strong>{value}</strong><p>{note}</p></div>
    </button>
  );
}

function Drawer({ title, eyebrow = 'TẠO MỚI', onClose, children, footer }) {
  return (
    <div className="dwr-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="dwr-drawer">
        <header><div><small>{eyebrow}</small><h2>{title}</h2></div><button type="button" className="dwr-icon-button" onClick={onClose}><DepartmentIcon name="close"/></button></header>
        <div className="dwr-drawer-body">{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </aside>
    </div>
  );
}

export default function DepartmentWorkspace({ language = 'vi', currentUser }) {
  const canManage = canPublishDepartment(currentUser);
  const [activeSection, setActiveSection] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [data, setData] = useState(() => readStored(currentUser, language, !canManage));
  const [globalQuery, setGlobalQuery] = useState('');
  const [scheduleDraft, setScheduleDraft] = useState(() => emptySchedule(currentUser));
  const [recordDraft, setRecordDraft] = useState(() => emptyRecord(currentUser));
  const [schedulePanelOpen, setSchedulePanelOpen] = useState(false);
  const [recordPanelOpen, setRecordPanelOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [scheduleView, setScheduleView] = useState('list');
  const [recordQuery, setRecordQuery] = useState('');
  const [recordCategory, setRecordCategory] = useState('all');
  const [importState, setImportState] = useState({ busy: false, name: '', items: [], warnings: [] });
  const [toast, setToast] = useState('');
  const [cloud, setCloud] = useState({ checking: false, available: false, updatedAt: '', message: 'Chưa kiểm tra' });
  const [workSummary, setWorkSummary] = useState({ active: 0, dueSoon: 0, overdue: 0, review: 0, approved: 0, total: 0 });
  const [workCreateSignal, setWorkCreateSignal] = useState(0);
  const [teacherCreateSignal, setTeacherCreateSignal] = useState(0);
  const importInputRef = useRef(null);
  const loadedCloudYearRef = useRef('');

  const activities = useMemo(() => buildActivityRows(data), [data]);
  const selectedActivity = activities.find((item) => String(item.id) === String(selectedActivityId)) || null;
  const selectedRecord = data.documents.find((item) => String(item.id) === String(selectedRecordId)) || null;
  const overdueActivities = useMemo(() => activities.filter(isOverdue), [activities]);
  const upcoming = useMemo(() => activities.filter((item) => {
    if (!item.date) return false;
    const delta = (new Date(`${item.date}T12:00:00`).getTime() - new Date(`${today()}T12:00:00`).getTime()) / 86400000;
    return delta >= 0 && delta <= 14;
  }).slice(0, 10), [activities]);
  const combinedRecordQuery = `${globalQuery} ${recordQuery}`.trim().toLowerCase();
  const filteredRecords = useMemo(() => data.documents.filter((item) => {
    if (recordCategory !== 'all' && item.category !== recordCategory) return false;
    return !combinedRecordQuery || `${item.title} ${item.category} ${item.owner} ${item.note}`.toLowerCase().includes(combinedRecordQuery);
  }), [combinedRecordQuery, data.documents, recordCategory]);
  const filteredActivities = useMemo(() => activities.filter((item) => {
    const needle = globalQuery.trim().toLowerCase();
    return !needle || `${item.title} ${item.type} ${item.owner} ${item.note}`.toLowerCase().includes(needle);
  }), [activities, globalQuery]);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(''), 2800);
  }, []);

  const commitData = useCallback((producer, message = '') => {
    setData((current) => {
      const raw = typeof producer === 'function' ? producer(current) : producer;
      const next = normalizeData({ ...raw, lastUpdated: new Date().toISOString() }, language);
      writeStored(currentUser, next, canManage);
      return next;
    });
    if (message) notify(message);
  }, [canManage, currentUser, language, notify]);

  useEffect(() => {
    setData(readStored(currentUser, language, !canManage));
    setScheduleDraft(emptySchedule(currentUser));
    setRecordDraft(emptyRecord(currentUser));
  }, [currentUser?.id, currentUser?.email, language, canManage]);

  useEffect(() => {
    let cancelled = false;
    async function loadCloudData() {
      if (!currentUser?.id || !canUseCloudDepartmentStore()) {
        setCloud({ checking: false, available: false, updatedAt: '', message: 'Chế độ local' });
        return;
      }
      const year = data.schoolYear || '2026-2027';
      if (loadedCloudYearRef.current === year) return;
      loadedCloudYearRef.current = year;
      setCloud((current) => ({ ...current, checking: true }));
      const result = await loadDepartmentSnapshot(year);
      if (cancelled) return;
      if (result.ok && result.snapshot?.payload) {
        const next = normalizeData({
          ...result.snapshot.payload,
          lastUpdated: result.snapshot.updated_at || result.snapshot.payload.lastUpdated,
        }, language);
        writeStored(currentUser, next, true);
        setData(next);
        setCloud({ checking: false, available: true, updatedAt: result.snapshot.updated_at || '', message: 'Đã tải dữ liệu chung' });
      } else {
        setCloud({ checking: false, available: false, updatedAt: '', message: result.message || 'Chưa có dữ liệu cloud' });
      }
    }
    loadCloudData();
    return () => { cancelled = true; };
  }, [currentUser?.id, data.schoolYear, language]);

  async function saveCloud() {
    if (!canManage) return notify('Chỉ TTCM/Admin được lưu dữ liệu chính thức.');
    if (!canUseCloudDepartmentStore()) return notify('Supabase chưa được cấu hình; dữ liệu vẫn được lưu trên thiết bị.');
    setCloud((current) => ({ ...current, checking: true }));
    const result = await saveDepartmentSnapshot(data, currentUser);
    if (result.ok) {
      writeStored(currentUser, data, true);
      setCloud({ checking: false, available: true, updatedAt: result.snapshot?.updated_at || new Date().toISOString(), message: 'Đã lưu dữ liệu chung' });
      notify('Đã đồng bộ dữ liệu tổ lên cloud.');
    } else {
      setCloud((current) => ({ ...current, checking: false, message: result.message || 'Không lưu được cloud' }));
      notify(result.message || 'Không lưu được cloud.');
    }
  }

  async function reloadCloud() {
    loadedCloudYearRef.current = '';
    setCloud((current) => ({ ...current, checking: true }));
    const result = await loadDepartmentSnapshot(data.schoolYear);
    if (result.ok && result.snapshot?.payload) {
      const next = normalizeData(result.snapshot.payload, language);
      writeStored(currentUser, next, true);
      setData(next);
      setCloud({ checking: false, available: true, updatedAt: result.snapshot.updated_at || '', message: 'Đã tải lại dữ liệu chung' });
      loadedCloudYearRef.current = data.schoolYear;
      notify('Đã tải dữ liệu mới nhất từ cloud.');
    } else {
      setCloud((current) => ({ ...current, checking: false, message: result.message || 'Chưa có dữ liệu cloud' }));
      notify(result.message || 'Chưa có dữ liệu cloud.');
    }
  }

  function addSchedule() {
    if (!scheduleDraft.title.trim()) return notify('Nhập tên hoạt động trước.');
    const item = {
      ...scheduleDraft,
      id: uid('schedule'),
      title: scheduleDraft.title.trim(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.email || currentUser?.name || '',
    };
    commitData((current) => ({ ...current, workSchedules: [item, ...current.workSchedules] }), 'Đã thêm hoạt động vào lịch chung.');
    setScheduleDraft(emptySchedule(currentUser));
    setSchedulePanelOpen(false);
  }

  function updateScheduleStatus(id, status) {
    commitData((current) => ({
      ...current,
      workSchedules: current.workSchedules.map((item) => item.id === id ? { ...item, status } : item),
    }), 'Đã cập nhật trạng thái.');
  }

  function removeSchedule(id) {
    if (!window.confirm('Xóa hoạt động này khỏi lịch chung?')) return;
    commitData((current) => ({
      ...current,
      workSchedules: current.workSchedules.filter((item) => item.id !== id),
    }), 'Đã xóa hoạt động.');
    setSelectedActivityId('');
  }

  async function handleScheduleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportState({ busy: true, name: file.name, items: [], warnings: [] });
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error('Tệp lịch phải nhỏ hơn 12 MB.');
      const parsed = await parseOfflineScheduleFile(file, {
        weekStart: today(),
        readText: readScheduleText,
      });
      const items = toArray(parsed.items).map((item) => ({ ...item, id: uid('import') }));
      setImportState({ busy: false, name: file.name, items, warnings: toArray(parsed.warnings) });
      if (!items.length) return notify('Không nhận diện được hoạt động nào trong tệp.');
      const fingerprints = new Set(data.workSchedules.map((item) => `${item.title}|${item.date}|${item.startTime}|${item.owner}`.toLowerCase()));
      const unique = items.filter((item) => {
        const fingerprint = `${item.title}|${item.date}|${item.startTime}|${item.owner}`.toLowerCase();
        if (fingerprints.has(fingerprint)) return false;
        fingerprints.add(fingerprint);
        return true;
      }).map((item) => ({
        ...item,
        id: uid('schedule'),
        status: STATUS_OPTIONS.includes(item.status) ? item.status : 'Chưa làm',
        importedFrom: file.name,
        importedAt: new Date().toISOString(),
      }));
      commitData((current) => ({ ...current, workSchedules: [...unique, ...current.workSchedules] }), `Đã thêm ${unique.length} hoạt động từ tệp.`);
    } catch (error) {
      setImportState({ busy: false, name: file.name, items: [], warnings: [error.message || 'Không đọc được tệp.'] });
      notify(error.message || 'Không đọc được tệp.');
    } finally {
      event.target.value = '';
    }
  }

  function addRecord() {
    if (!recordDraft.title.trim()) return notify('Nhập tên hồ sơ hoặc văn bản trước.');
    const item = {
      ...recordDraft,
      id: uid('record'),
      title: recordDraft.title.trim(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.email || currentUser?.name || '',
    };
    commitData((current) => ({ ...current, documents: [item, ...current.documents] }), 'Đã lưu hồ sơ vào kho của tổ.');
    setRecordDraft(emptyRecord(currentUser));
    setRecordPanelOpen(false);
  }

  function removeRecord(id) {
    if (!window.confirm('Xóa mục hồ sơ này? File bên ngoài sẽ không bị xóa.')) return;
    commitData((current) => ({
      ...current,
      documents: current.documents.filter((item) => item.id !== id),
    }), 'Đã xóa hồ sơ.');
    setSelectedRecordId('');
  }

  function useTemplate(template) {
    setRecordDraft((current) => ({
      ...current,
      title: template.titleVi,
      category: template.type,
      note: template.contentVi,
    }));
    setRecordPanelOpen(true);
  }

  function exportCalendar() {
    downloadFile(`lich-to-tieng-anh-${data.schoolYear}.ics`, makeCalendarIcs(activities), 'text/calendar;charset=utf-8');
    notify('Đã xuất lịch ICS.');
  }

  function downloadScheduleTemplate() {
    downloadFile('mau-lich-hoat-dong-to.csv', makeOfflineScheduleCsvTemplate(), 'text/csv;charset=utf-8');
  }

  const pageTitle = {
    overview: 'Tổng quan',
    schedule: 'Lịch & hoạt động',
    records: 'Hồ sơ & văn bản',
    work: 'Trung tâm công việc',
    teachers: 'Danh sách giáo viên',
  }[activeSection];

  const primaryAction = canManage ? {
    overview: ['Giao việc', () => { setActiveSection('work'); setWorkCreateSignal((value) => value + 1); }],
    schedule: ['Thêm hoạt động', () => setSchedulePanelOpen(true)],
    records: ['Thêm hồ sơ', () => setRecordPanelOpen(true)],
    work: ['Giao việc', () => setWorkCreateSignal((value) => value + 1)],
    teachers: ['Thêm giáo viên', () => setTeacherCreateSignal((value) => value + 1)],
  }[activeSection] : null;

  const renderOverview = () => (
    <div className="dwr-page dwr-overview-page">
      <section className="dwr-overview-intro">
        <div><p className="dwr-eyebrow">KHÔNG GIAN ĐIỀU HÀNH</p><h1>Chào {currentUser?.name || 'TTCM'}, đây là tình hình của tổ hôm nay.</h1><p>Theo dõi công việc, hồ sơ và lịch chuyên môn trong một không gian thống nhất.</p></div>
        <article className="dwr-cloud-card"><span className={cloud.available ? 'is-online' : ''}><DepartmentIcon name="cloud"/></span><div><strong>{cloud.message}</strong><small>{cloud.updatedAt ? `Cập nhật ${formatDateTime(cloud.updatedAt)}` : 'Dữ liệu được lưu an toàn'}</small></div><button type="button" className="dwr-icon-button" onClick={reloadCloud} disabled={cloud.checking}><DepartmentIcon name="refresh"/></button></article>
      </section>

      <section className="dwr-metric-grid">
        <MetricCard tone="blue" icon="tasks" label="Công việc đang mở" value={workSummary.active} note={`${workSummary.dueSoon} sắp đến hạn`} onClick={() => setActiveSection('work')}/>
        <MetricCard tone="amber" icon="upload" label="Chờ phê duyệt" value={workSummary.review} note="Cần xử lý sản phẩm" onClick={() => setActiveSection('work')}/>
        <MetricCard tone="red" icon="warning" label="Quá hạn" value={workSummary.overdue + overdueActivities.length} note="Cần cập nhật ngay" onClick={() => setActiveSection('work')}/>
        <MetricCard tone="green" icon="calendar" label="Hoạt động 14 ngày tới" value={upcoming.length} note={`${data.documents.length} hồ sơ · ${data.teachers.length} giáo viên`} onClick={() => setActiveSection('schedule')}/>
      </section>

      <section className="dwr-overview-grid">
        <article className="dwr-panel">
          <header className="dwr-panel-head"><div><h2>Việc cần xử lý</h2><p>Ưu tiên trong hôm nay</p></div><button type="button" onClick={() => setActiveSection('work')}>Xem tất cả <DepartmentIcon name="chevron"/></button></header>
          <div className="dwr-priority-list">
            <button type="button" onClick={() => setActiveSection('work')}><span className="tone-red">{workSummary.overdue}</span><div><strong>Công việc quá hạn</strong><small>Cần cập nhật, gia hạn hoặc phản hồi.</small></div><DepartmentIcon name="chevron"/></button>
            <button type="button" onClick={() => setActiveSection('work')}><span className="tone-amber">{workSummary.review}</span><div><strong>Sản phẩm chờ duyệt</strong><small>Đã nộp hoặc cần chỉnh sửa.</small></div><DepartmentIcon name="chevron"/></button>
            <button type="button" onClick={() => setActiveSection('work')}><span className="tone-blue">{workSummary.dueSoon}</span><div><strong>Sắp đến hạn</strong><small>Hạn trong ba ngày tới.</small></div><DepartmentIcon name="chevron"/></button>
          </div>
        </article>

        <article className="dwr-panel">
          <header className="dwr-panel-head"><div><h2>Lịch sắp tới</h2><p>14 ngày tiếp theo</p></div><button type="button" onClick={() => setActiveSection('schedule')}>Mở lịch <DepartmentIcon name="chevron"/></button></header>
          <div className="dwr-agenda-list">
            {upcoming.map((item) => <button type="button" key={item.id} onClick={() => { setSelectedActivityId(item.id); setActiveSection('schedule'); }}><time><strong>{String(item.date || '').slice(8, 10) || '--'}</strong><small>TH{new Date(`${item.date}T12:00:00`).getDay() + 1}</small></time><div><strong>{item.title}</strong><small>{item.type} · {item.owner}</small></div><span>{item.startTime || 'Cả ngày'}</span></button>)}
            {!upcoming.length ? <div className="dwr-empty compact"><DepartmentIcon name="calendar"/><h3>Chưa có lịch trong 14 ngày tới</h3></div> : null}
          </div>
        </article>
      </section>
    </div>
  );

  const renderSchedule = () => (
    <div className="dwr-page">
      <section className="dwr-page-heading"><div><p className="dwr-eyebrow">LỊCH CHUYÊN MÔN</p><h1>Lịch & hoạt động</h1><p>Quản lý kế hoạch, cuộc họp, dự giờ và các mốc chuyên môn.</p></div><div className="dwr-page-actions"><button type="button" className={scheduleView === 'list' ? 'is-active' : ''} onClick={() => setScheduleView('list')}><DepartmentIcon name="list"/>Danh sách</button><button type="button" className={scheduleView === 'calendar' ? 'is-active' : ''} onClick={() => setScheduleView('calendar')}><DepartmentIcon name="grid"/>Lịch tháng</button><button type="button" onClick={exportCalendar}><DepartmentIcon name="download"/>Xuất ICS</button><button type="button" onClick={() => importInputRef.current?.click()} disabled={importState.busy}><DepartmentIcon name="upload"/>{importState.busy ? 'Đang đọc…' : 'Nhập file'}</button></div></section>

      <section className={`dwr-master-detail${selectedActivity ? ' has-detail' : ''}`}>
        <div className="dwr-table-card">
          <header className="dwr-card-toolbar"><div><h2>{scheduleView === 'list' ? 'Danh sách hoạt động' : 'Lịch hoạt động'}</h2><p>{filteredActivities.length} mục</p></div><button type="button" className="dwr-link-button" onClick={downloadScheduleTemplate}>Tải mẫu CSV</button></header>
          {scheduleView === 'list' ? <div className="dwr-table-scroll"><table className="dwr-table"><thead><tr><th>Ngày</th><th>Hoạt động</th><th>Loại</th><th>Phụ trách</th><th>Trạng thái</th><th/></tr></thead><tbody>{filteredActivities.map((item) => <tr key={item.id} className={`${String(selectedActivityId) === String(item.id) ? 'is-selected' : ''}${isOverdue(item) ? ' is-overdue' : ''}`} onClick={() => setSelectedActivityId(item.id)}><td><strong>{formatDate(item.date)}</strong><small>{item.startTime || 'Cả ngày'}</small></td><td><strong>{item.title}</strong><small>{item.note || item.location || 'Chưa có ghi chú'}</small></td><td><span className={`dwr-type type-${classToken(item.type)}`}>{item.type}</span></td><td>{item.owner}</td><td><span className={`dwr-status schedule-${classToken(isOverdue(item) ? 'Quá hạn' : item.status)}`}>{isOverdue(item) ? 'Quá hạn' : item.status || 'Chưa làm'}</span></td><td><button type="button" className="dwr-icon-button"><DepartmentIcon name="chevron"/></button></td></tr>)}</tbody></table>{!filteredActivities.length ? <div className="dwr-empty"><DepartmentIcon name="calendar" size={30}/><h3>Chưa có hoạt động phù hợp</h3><p>Thêm hoạt động mới hoặc thay đổi từ khóa tìm kiếm.</p></div> : null}</div> : <div className="dwr-calendar-board">{filteredActivities.slice(0, 24).map((item) => <button key={item.id} type="button" onClick={() => setSelectedActivityId(item.id)}><time>{formatDate(item.date)}</time><strong>{item.title}</strong><span className={`dwr-type type-${classToken(item.type)}`}>{item.type}</span><small>{item.startTime || 'Cả ngày'} · {item.owner}</small></button>)}{!filteredActivities.length ? <div className="dwr-empty"><DepartmentIcon name="calendar"/><h3>Chưa có hoạt động</h3></div> : null}</div>}
        </div>

        {selectedActivity ? <aside className="dwr-detail-panel"><header className="dwr-detail-head"><div className="dwr-detail-title"><span><DepartmentIcon name="calendar"/></span><div><h2>{selectedActivity.title}</h2><p>{selectedActivity.type}</p></div></div><button type="button" className="dwr-icon-button" onClick={() => setSelectedActivityId('')}><DepartmentIcon name="close"/></button></header><div className="dwr-detail-body"><dl className="dwr-meta-grid"><div><dt>Ngày</dt><dd>{formatDate(selectedActivity.date)}</dd></div><div><dt>Thời gian</dt><dd>{selectedActivity.startTime || 'Cả ngày'}{selectedActivity.endTime ? ` – ${selectedActivity.endTime}` : ''}</dd></div><div><dt>Phụ trách</dt><dd>{selectedActivity.owner}</dd></div><div><dt>Trạng thái</dt><dd><span className={`dwr-status schedule-${classToken(selectedActivity.status)}`}>{selectedActivity.status || 'Chưa làm'}</span></dd></div></dl><section className="dwr-detail-section"><h3>Địa điểm / liên kết</h3><p>{selectedActivity.location || 'Chưa cập nhật.'}</p></section><section className="dwr-detail-section"><h3>Chuẩn bị và ghi chú</h3><p>{selectedActivity.note || 'Chưa có ghi chú.'}</p></section>{canManage && !selectedActivity.legacy ? <label className="dwr-inline-field"><span>Cập nhật trạng thái</span><select value={selectedActivity.status || 'Chưa làm'} onChange={(event) => updateScheduleStatus(selectedActivity.id, event.target.value)}>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></label> : null}</div>{canManage && !selectedActivity.legacy ? <footer className="dwr-detail-actions"><button type="button" className="dwr-danger" onClick={() => removeSchedule(selectedActivity.id)}><DepartmentIcon name="trash"/>Xóa hoạt động</button></footer> : null}</aside> : null}
      </section>
    </div>
  );

  const renderRecords = () => (
    <div className="dwr-page">
      <section className="dwr-page-heading"><div><p className="dwr-eyebrow">KHO HỒ SƠ</p><h1>Hồ sơ & văn bản</h1><p>Lưu trữ, phân loại và mở nhanh tài liệu của tổ chuyên môn.</p></div><div className="dwr-record-filters"><label className="dwr-search"><DepartmentIcon name="search"/><input value={recordQuery} onChange={(event) => setRecordQuery(event.target.value)} placeholder="Tìm hồ sơ…"/></label><select value={recordCategory} onChange={(event) => setRecordCategory(event.target.value)}><option value="all">Tất cả danh mục</option>{RECORD_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div></section>

      <section className="dwr-template-library"><header><div><h2>Mẫu thường dùng</h2><p>Chọn một mẫu để điền nhanh hồ sơ mới.</p></div><span>Kéo ngang để xem thêm</span></header><div>{DEPARTMENT_TEMPLATES.map((template, index) => <button type="button" key={template.id} className={`template-${(index % 6) + 1}`} onClick={() => useTemplate(template)}><span><DepartmentIcon name="file"/></span><strong>{template.titleVi}</strong><small>{template.type}</small></button>)}</div></section>

      <section className={`dwr-master-detail${selectedRecord ? ' has-detail' : ''}`}>
        <div className="dwr-table-card"><header className="dwr-card-toolbar"><div><h2>Tất cả hồ sơ</h2><p>{filteredRecords.length} mục</p></div></header><div className="dwr-table-scroll"><table className="dwr-table"><thead><tr><th>Hồ sơ</th><th>Danh mục</th><th>Người phụ trách</th><th>Cập nhật</th><th>Trạng thái</th><th/></tr></thead><tbody>{filteredRecords.map((item) => <tr key={item.id} className={String(selectedRecordId) === String(item.id) ? 'is-selected' : ''} onClick={() => setSelectedRecordId(item.id)}><td><div className="dwr-file-cell"><span><DepartmentIcon name="file"/></span><div><strong>{item.title}</strong><small>{item.note || item.link || 'Chưa có mô tả'}</small></div></div></td><td><span className={`dwr-type type-${classToken(item.category)}`}>{item.category}</span></td><td>{item.owner || 'Tổ chuyên môn'}</td><td>{formatDate(item.date || item.createdAt)}</td><td><span className="dwr-status status-approved">Đã lưu</span></td><td><button type="button" className="dwr-icon-button"><DepartmentIcon name="chevron"/></button></td></tr>)}</tbody></table>{!filteredRecords.length ? <div className="dwr-empty"><DepartmentIcon name="folder" size={30}/><h3>Chưa có hồ sơ phù hợp</h3><p>Thêm hồ sơ mới hoặc thay đổi bộ lọc.</p></div> : null}</div></div>

        {selectedRecord ? <aside className="dwr-detail-panel"><header className="dwr-detail-head"><div className="dwr-detail-title"><span><DepartmentIcon name="file"/></span><div><h2>{selectedRecord.title}</h2><p>{selectedRecord.category}</p></div></div><button type="button" className="dwr-icon-button" onClick={() => setSelectedRecordId('')}><DepartmentIcon name="close"/></button></header><div className="dwr-detail-body"><dl className="dwr-meta-grid"><div><dt>Người phụ trách</dt><dd>{selectedRecord.owner}</dd></div><div><dt>Ngày cập nhật</dt><dd>{formatDate(selectedRecord.date || selectedRecord.createdAt)}</dd></div><div><dt>Danh mục</dt><dd>{selectedRecord.category}</dd></div><div><dt>Trạng thái</dt><dd><span className="dwr-status status-approved">Đã lưu</span></dd></div></dl><section className="dwr-detail-section"><h3>Mô tả</h3><p>{selectedRecord.note || 'Chưa có mô tả.'}</p></section><section className="dwr-detail-section"><h3>Tài liệu</h3>{selectedRecord.link ? <a className="dwr-open-link" href={selectedRecord.link} target="_blank" rel="noreferrer"><DepartmentIcon name="file"/>Mở tài liệu</a> : <p>Chưa có liên kết.</p>}</section></div>{canManage ? <footer className="dwr-detail-actions"><button type="button" className="dwr-danger" onClick={() => removeRecord(selectedRecord.id)}><DepartmentIcon name="trash"/>Xóa hồ sơ</button></footer> : null}</aside> : null}
      </section>
    </div>
  );

  return (
    <div className="department-rebuild-app">
      <aside className={`dwr-sidebar${mobileNavOpen ? ' is-open' : ''}`}>
        <header className="dwr-brand"><div className="dwr-brand-mark">B</div><div><small>BRIAN ENGLISH</small><strong>Tổ chuyên môn</strong></div><button type="button" className="dwr-icon-button dwr-mobile-close" onClick={() => setMobileNavOpen(false)}><DepartmentIcon name="close"/></button></header>
        <div className="dwr-nav-label">Tổ chuyên môn</div>
        <nav>{NAV_ITEMS.map(([key, label, icon]) => <button key={key} type="button" className={activeSection === key ? 'is-active' : ''} onClick={() => { setActiveSection(key); setMobileNavOpen(false); }}><DepartmentIcon name={icon}/><span>{label}</span></button>)}<div className="dwr-nav-divider"/><button type="button" onClick={() => { window.location.hash = '#/resource-library'; }}><DepartmentIcon name="library"/><span>Kho học liệu</span></button></nav>
        <footer><span>{initials(currentUser?.name || currentUser?.email)}</span><div><strong>{currentUser?.name || 'Brian English'}</strong><small>{canManage ? 'Tổ trưởng chuyên môn' : 'Giáo viên'}</small></div><DepartmentIcon name="chevron"/></footer>
      </aside>

      {mobileNavOpen ? <button type="button" className="dwr-mobile-backdrop" aria-label="Đóng menu" onClick={() => setMobileNavOpen(false)}/> : null}

      <div className="dwr-main">
        <header className="dwr-topbar">
          <button type="button" className="dwr-icon-button dwr-mobile-menu" onClick={() => setMobileNavOpen(true)}><DepartmentIcon name="menu"/></button>
          <h1>{pageTitle}</h1>
          <label className="dwr-global-search"><DepartmentIcon name="search"/><input value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="Tìm nhiệm vụ, giáo viên, hồ sơ…"/></label>
          <select value={data.schoolYear} onChange={(event) => commitData((current) => ({ ...current, schoolYear: event.target.value }))}><option>2025-2026</option><option>2026-2027</option><option>2027-2028</option></select>
          <select value={data.semester} onChange={(event) => commitData((current) => ({ ...current, semester: event.target.value }))}><option>Học kỳ I</option><option>Học kỳ II</option><option>Cả năm</option></select>
          <button type="button" className="dwr-notification" aria-label="Thông báo"><DepartmentIcon name="bell"/>{workSummary.review ? <span>{Math.min(workSummary.review, 9)}</span> : null}</button>
          {primaryAction ? <button type="button" className="dwr-primary dwr-top-action" onClick={primaryAction[1]}><DepartmentIcon name="plus"/>{primaryAction[0]}</button> : null}
        </header>

        <main className="dwr-content">
          {activeSection === 'overview' ? renderOverview() : null}
          {activeSection === 'schedule' ? renderSchedule() : null}
          {activeSection === 'records' ? renderRecords() : null}
          {activeSection === 'work' ? <DepartmentWorkCenter currentUser={currentUser} schoolYear={data.schoolYear} semester={data.semester} globalQuery={globalQuery} createSignal={workCreateSignal} onSummaryChange={setWorkSummary}/> : null}
          {activeSection === 'teachers' ? <DepartmentTeacherDirectory teachers={data.teachers} onChange={(next) => commitData((current) => ({ ...current, teachers: next }))} canManage={canManage} currentUser={currentUser} globalQuery={globalQuery} createSignal={teacherCreateSignal} activities={activities} records={data.documents} onNotify={notify}/> : null}
        </main>

        <footer className="dwr-statusbar"><div><span className={cloud.available ? 'is-online' : ''}/><strong>{cloud.message}</strong>{cloud.updatedAt ? <small>{formatDateTime(cloud.updatedAt)}</small> : null}</div>{canManage ? <button type="button" onClick={saveCloud} disabled={cloud.checking}><DepartmentIcon name="cloud"/>{cloud.checking ? 'Đang đồng bộ…' : 'Lưu dữ liệu tổ'}</button> : null}</footer>
      </div>

      <input ref={importInputRef} hidden type="file" accept=".csv,.txt,.html,.docx,.pdf,.xlsx" onChange={handleScheduleImport}/>

      {canManage && schedulePanelOpen ? <Drawer title="Thêm hoạt động" onClose={() => setSchedulePanelOpen(false)} footer={<><button type="button" className="dwr-secondary" onClick={() => setSchedulePanelOpen(false)}>Hủy</button><button type="button" className="dwr-primary" onClick={addSchedule}><DepartmentIcon name="plus"/>Thêm hoạt động</button></>}><label><span>Tên hoạt động</span><input autoFocus value={scheduleDraft.title} onChange={(event) => setScheduleDraft({ ...scheduleDraft, title: event.target.value })} placeholder="Ví dụ: Họp tổ rà soát đề giữa kỳ"/></label><div className="dwr-form-grid"><label><span>Loại</span><select value={scheduleDraft.type} onChange={(event) => setScheduleDraft({ ...scheduleDraft, type: event.target.value })}>{ACTIVITY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label><span>Trạng thái</span><select value={scheduleDraft.status} onChange={(event) => setScheduleDraft({ ...scheduleDraft, status: event.target.value })}>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></label><label><span>Ngày</span><input type="date" value={scheduleDraft.date} onChange={(event) => setScheduleDraft({ ...scheduleDraft, date: event.target.value })}/></label><label><span>Bắt đầu</span><input type="time" value={scheduleDraft.startTime} onChange={(event) => setScheduleDraft({ ...scheduleDraft, startTime: event.target.value })}/></label><label><span>Kết thúc</span><input type="time" value={scheduleDraft.endTime} onChange={(event) => setScheduleDraft({ ...scheduleDraft, endTime: event.target.value })}/></label><label><span>Người phụ trách</span><input value={scheduleDraft.owner} onChange={(event) => setScheduleDraft({ ...scheduleDraft, owner: event.target.value })}/></label></div><label><span>Địa điểm / liên kết</span><input value={scheduleDraft.location} onChange={(event) => setScheduleDraft({ ...scheduleDraft, location: event.target.value })}/></label><label><span>Chuẩn bị / minh chứng / ghi chú</span><textarea value={scheduleDraft.note} onChange={(event) => setScheduleDraft({ ...scheduleDraft, note: event.target.value })}/></label></Drawer> : null}

      {canManage && recordPanelOpen ? <Drawer title="Thêm hồ sơ" onClose={() => setRecordPanelOpen(false)} footer={<><button type="button" className="dwr-secondary" onClick={() => setRecordPanelOpen(false)}>Hủy</button><button type="button" className="dwr-primary" onClick={addRecord}><DepartmentIcon name="plus"/>Lưu hồ sơ</button></>}><label><span>Tên hồ sơ / văn bản</span><input autoFocus value={recordDraft.title} onChange={(event) => setRecordDraft({ ...recordDraft, title: event.target.value })}/></label><div className="dwr-form-grid"><label><span>Danh mục</span><select value={recordDraft.category} onChange={(event) => setRecordDraft({ ...recordDraft, category: event.target.value })}>{RECORD_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label><span>Ngày</span><input type="date" value={recordDraft.date} onChange={(event) => setRecordDraft({ ...recordDraft, date: event.target.value })}/></label></div><label><span>Người phụ trách</span><input value={recordDraft.owner} onChange={(event) => setRecordDraft({ ...recordDraft, owner: event.target.value })}/></label><label><span>Liên kết Google Drive / tài liệu</span><input value={recordDraft.link} onChange={(event) => setRecordDraft({ ...recordDraft, link: event.target.value })} placeholder="https://…"/></label><label><span>Mô tả / ghi chú</span><textarea value={recordDraft.note} onChange={(event) => setRecordDraft({ ...recordDraft, note: event.target.value })}/></label></Drawer> : null}

      {toast ? <div className="dwr-toast"><DepartmentIcon name="check"/><span>{toast}</span></div> : null}
    </div>
  );
}
