import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WorkHub from './WorkHub.jsx';
import './DepartmentWorkspaceV2.css';
import { DEPARTMENT_MODULES, DEPARTMENT_TEMPLATES } from '../data/department.js';
import { canPublishDepartment } from '../utils/permissions.js';
import {
  canUseCloudDepartmentStore,
  loadDepartmentSnapshot,
  saveDepartmentSnapshot,
} from '../utils/departmentStore.js';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { loadMammoth, loadPdfjs } from '../utils/documentParsers.js';
import {
  makeOfflineScheduleCsvTemplate,
  parseOfflineScheduleFile,
} from '../utils/offlineScheduleParser.js';

const STORAGE_PREFIX = 'bes-department-workspace-v2';
const SHARED_STORAGE_KEY = `${STORAGE_PREFIX}:shared`;
const STATUS_OPTIONS = ['Chưa làm', 'Đang thực hiện', 'Chờ duyệt', 'Hoàn thành'];
const ACTIVITY_TYPES = [
  'Kế hoạch',
  'Họp tổ',
  'Dự giờ',
  'Nghiên cứu bài học',
  'Chuyên đề',
  'Kiểm tra đánh giá',
  'Bồi dưỡng giáo viên',
  'HSG / CLB / Ngoại khóa',
  'Hạn nộp hồ sơ',
  'Hoạt động khác',
];
const RECORD_CATEGORIES = [
  'Kế hoạch',
  'Biên bản',
  'Nghiên cứu bài học',
  'Dự giờ',
  'Kiểm tra đánh giá',
  'Bồi dưỡng giáo viên',
  'HSG / CLB / Ngoại khóa',
  'Văn bản hành chính',
  'Mẫu biểu',
  'Minh chứng đã duyệt',
  'Khác',
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix = 'dept') {
  try {
    return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
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
    lastUpdated: new Date().toISOString(),
  };
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
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
      // Ignore invalid local cache and continue with the next source.
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
    // Browser storage is a cache only; cloud saving remains available.
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

function getMondayIso(value = today()) {
  const date = new Date(`${value}T12:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().slice(0, 10);
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
  if (!time) return `VALUE=DATE:${day}`;
  return `${day}T${String(time).replace(':', '').padEnd(6, '0')}`;
}

function makeCalendarIcs(items) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Brian English Studio//Department Workspace//VI'];
  items.filter((item) => item.date).forEach((item) => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeIcs(item.id || uid('event'))}@brian-english-studio`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`);
    lines.push(`DTSTART;${toIcsDate(item.date, item.startTime)}`);
    if (item.endTime) lines.push(`DTEND:${toIcsDate(item.date, item.endTime)}`);
    lines.push(`SUMMARY:${escapeIcs(item.title)}`);
    if (item.location) lines.push(`LOCATION:${escapeIcs(item.location)}`);
    lines.push(`DESCRIPTION:${escapeIcs([item.type, item.owner, item.note].filter(Boolean).join(' · '))}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function reportTitle(type) {
  return {
    week: 'BÁO CÁO TUẦN',
    month: 'BÁO CÁO THÁNG',
    semester: 'BÁO CÁO HỌC KỲ',
    year: 'BÁO CÁO NĂM HỌC',
    tasks: 'BÁO CÁO TIẾN ĐỘ CÔNG VIỆC',
    evidence: 'BÁO CÁO HỒ SƠ VÀ MINH CHỨNG',
  }[type] || 'BÁO CÁO TỔ CHUYÊN MÔN';
}

function makeDeterministicReport(data, activities, workSummary, type = 'month') {
  const now = new Date();
  const upcoming = activities.filter((item) => {
    const date = new Date(`${item.date || ''}T12:00:00`);
    const delta = (date.getTime() - now.getTime()) / 86400000;
    return Number.isFinite(delta) && delta >= -1 && delta <= 14;
  });
  const completedActivities = activities.filter((item) => !isOpenStatus(item.status));
  const overdueActivities = activities.filter(isOverdue);
  const records = toArray(data.documents);
  const lines = [
    data.departmentName?.toUpperCase() || 'TỔ TIẾNG ANH',
    reportTitle(type),
    `Năm học: ${data.schoolYear} · ${data.semester}`,
    `Thời điểm tổng hợp: ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeStyle: 'short' }).format(now)}`,
    '',
    'I. TÌNH HÌNH CHUNG',
    `- Tổng hoạt động đang theo dõi: ${activities.length}.`,
    `- Hoạt động đã hoàn thành: ${completedActivities.length}.`,
    `- Hoạt động quá hạn: ${overdueActivities.length}.`,
    `- Hồ sơ và văn bản đang lưu: ${records.length}.`,
    `- Công việc đang hoạt động trong Trung tâm công việc: ${workSummary.active}.`,
    `- Công việc chờ xử lý/phê duyệt: ${workSummary.review}.`,
    '',
    'II. CÔNG VIỆC VÀ HOẠT ĐỘNG GẦN ĐÂY',
    ...(upcoming.length ? upcoming.slice(0, 15).map((item) => `- ${formatDate(item.date)} · ${item.title} · ${item.owner || 'Chưa phân công'} · ${item.status || 'Chưa làm'}.`) : ['- Chưa có hoạt động trong khoảng thời gian tổng hợp.']),
    '',
    'III. CÔNG VIỆC CẦN TIẾP TỤC THEO DÕI',
    ...(overdueActivities.length ? overdueActivities.slice(0, 12).map((item) => `- QUÁ HẠN: ${item.title} · hạn ${formatDate(item.date)} · ${item.owner || 'Chưa phân công'}.`) : ['- Không có hoạt động quá hạn trong dữ liệu hiện tại.']),
    `- Công việc sắp đến hạn trong Trung tâm công việc: ${workSummary.dueSoon}.`,
    '',
    'IV. HỒ SƠ VÀ MINH CHỨNG',
    ...(records.length ? records.slice(0, 15).map((item) => `- ${item.category || 'Hồ sơ'}: ${item.title}${item.owner ? ` · ${item.owner}` : ''}${item.date ? ` · ${formatDate(item.date)}` : ''}.`) : ['- Chưa có hồ sơ hoặc văn bản được lưu.']),
    '',
    'V. KIẾN NGHỊ VÀ VIỆC TIẾP THEO',
    '- Rà soát các công việc quá hạn và cập nhật trạng thái thực tế.',
    '- Hoàn thiện hồ sơ còn thiếu, gắn đúng loại và năm học.',
    '- Phê duyệt hoặc yêu cầu chỉnh sửa sản phẩm đang chờ xử lý trong Trung tâm công việc.',
    '- Cập nhật lịch hoạt động và phân công trước các mốc quan trọng.',
  ];
  return lines.join('\n');
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

export default function DepartmentWorkspace({ language = 'vi', currentUser }) {
  const canManage = canPublishDepartment(currentUser);
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(() => readStored(currentUser, language, !canManage));
  const [scheduleDraft, setScheduleDraft] = useState(() => emptySchedule(currentUser));
  const [recordDraft, setRecordDraft] = useState(() => emptyRecord(currentUser));
  const [recordQuery, setRecordQuery] = useState('');
  const [recordCategory, setRecordCategory] = useState('all');
  const [importState, setImportState] = useState({ busy: false, name: '', items: [], summary: '', warnings: [] });
  const [reportType, setReportType] = useState('month');
  const [reportText, setReportText] = useState('');
  const [toast, setToast] = useState('');
  const [cloud, setCloud] = useState({ checking: false, available: false, updatedAt: '', updatedBy: '', message: 'Chưa kiểm tra' });
  const [workSummary, setWorkSummary] = useState({ active: 0, dueSoon: 0, overdue: 0, review: 0, total: 0 });
  const importInputRef = useRef(null);
  const loadedCloudYearRef = useRef('');

  const modules = DEPARTMENT_MODULES;
  const activities = useMemo(() => buildActivityRows(data), [data]);
  const upcoming = useMemo(() => activities.filter((item) => {
    if (!item.date) return false;
    const delta = (new Date(`${item.date}T12:00:00`).getTime() - new Date(`${today()}T12:00:00`).getTime()) / 86400000;
    return delta >= 0 && delta <= 14;
  }).slice(0, 8), [activities]);
  const overdue = useMemo(() => activities.filter(isOverdue), [activities]);
  const filteredRecords = useMemo(() => {
    const needle = recordQuery.trim().toLowerCase();
    return toArray(data.documents).filter((item) => {
      if (recordCategory !== 'all' && item.category !== recordCategory) return false;
      return !needle || `${item.title || ''} ${item.category || ''} ${item.owner || ''} ${item.note || ''}`.toLowerCase().includes(needle);
    });
  }, [data.documents, recordCategory, recordQuery]);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(''), 2800);
  }, []);

  const commitData = useCallback((producer, message = '') => {
    setData((current) => {
      const nextRaw = typeof producer === 'function' ? producer(current) : producer;
      const next = normalizeData({ ...nextRaw, lastUpdated: new Date().toISOString() }, language);
      writeStored(currentUser, next, canManage);
      return next;
    });
    if (message) notify(message);
  }, [canManage, currentUser, language, notify]);

  useEffect(() => {
    const next = readStored(currentUser, language, !canManage);
    setData(next);
    setScheduleDraft(emptySchedule(currentUser));
    setRecordDraft(emptyRecord(currentUser));
  }, [currentUser?.id, currentUser?.email, language, canManage]);

  useEffect(() => {
    let cancelled = false;
    async function loadCloudData() {
      if (!currentUser?.id || !canUseCloudDepartmentStore()) {
        setCloud({ checking: false, available: false, updatedAt: '', updatedBy: '', message: 'Chế độ local' });
        return;
      }
      const year = data.schoolYear || '2026-2027';
      if (loadedCloudYearRef.current === year) return;
      loadedCloudYearRef.current = year;
      setCloud((old) => ({ ...old, checking: true }));
      const result = await loadDepartmentSnapshot(year);
      if (cancelled) return;
      if (result.ok && result.snapshot?.payload) {
        const next = normalizeData({ ...result.snapshot.payload, lastUpdated: result.snapshot.updated_at || result.snapshot.payload.lastUpdated }, language);
        writeStored(currentUser, next, true);
        setData(next);
        setCloud({ checking: false, available: true, updatedAt: result.snapshot.updated_at || '', updatedBy: result.snapshot.updated_by_email || '', message: 'Đã tải dữ liệu chung' });
      } else if (result.ok) {
        setCloud({ checking: false, available: false, updatedAt: '', updatedBy: '', message: 'Chưa có dữ liệu cloud cho năm học này' });
      } else {
        setCloud({ checking: false, available: false, updatedAt: '', updatedBy: '', message: result.message || 'Không tải được cloud' });
      }
    }
    loadCloudData();
    return () => { cancelled = true; };
  }, [currentUser?.id, data.schoolYear, language]);

  const refreshWorkSummary = useCallback(async () => {
    if (!client || !runtime.ready || !runtime.session || !currentUser?.id) return;
    const { data: rows, error } = await client.from('work_hub_items').select('id,status,due_at').limit(500);
    if (error) return;
    const items = rows || [];
    const now = Date.now();
    setWorkSummary({
      total: items.length,
      active: items.filter((item) => !['completed', 'archived', 'cancelled'].includes(item.status)).length,
      dueSoon: items.filter((item) => item.due_at && new Date(item.due_at).getTime() > now && new Date(item.due_at).getTime() - now < 3 * 86400000).length,
      overdue: items.filter((item) => item.due_at && new Date(item.due_at).getTime() < now && !['completed', 'approved', 'archived'].includes(item.status)).length,
      review: items.filter((item) => ['submitted', 'changes_requested'].includes(item.status)).length,
    });
  }, [client, currentUser?.id, runtime.ready, runtime.session]);

  useEffect(() => {
    refreshWorkSummary();
    if (typeof window === 'undefined') return undefined;
    const timer = window.setInterval(refreshWorkSummary, 20000);
    return () => window.clearInterval(timer);
  }, [refreshWorkSummary]);

  const saveCloud = async () => {
    if (!canManage) return notify('Chỉ TTCM/Admin được lưu dữ liệu chính thức.');
    if (!canUseCloudDepartmentStore()) return notify('Supabase chưa được cấu hình; dữ liệu vẫn được lưu trên thiết bị.');
    setCloud((old) => ({ ...old, checking: true }));
    const result = await saveDepartmentSnapshot(data, currentUser);
    if (result.ok) {
      writeStored(currentUser, data, true);
      setCloud({ checking: false, available: true, updatedAt: result.snapshot?.updated_at || new Date().toISOString(), updatedBy: currentUser?.email || '', message: 'Đã lưu dữ liệu chung' });
      notify('Đã đồng bộ Tổ chuyên môn lên cloud.');
    } else {
      setCloud((old) => ({ ...old, checking: false, message: result.message || 'Không lưu được cloud' }));
      notify(result.message || 'Không lưu được cloud.');
    }
  };

  const reloadCloud = async () => {
    loadedCloudYearRef.current = '';
    setCloud((old) => ({ ...old, checking: true }));
    const result = await loadDepartmentSnapshot(data.schoolYear);
    if (result.ok && result.snapshot?.payload) {
      const next = normalizeData(result.snapshot.payload, language);
      writeStored(currentUser, next, true);
      setData(next);
      setCloud({ checking: false, available: true, updatedAt: result.snapshot.updated_at || '', updatedBy: result.snapshot.updated_by_email || '', message: 'Đã tải lại dữ liệu chung' });
      loadedCloudYearRef.current = data.schoolYear;
      notify('Đã tải dữ liệu mới nhất từ cloud.');
    } else {
      setCloud((old) => ({ ...old, checking: false, message: result.message || 'Chưa có dữ liệu cloud' }));
      notify(result.message || 'Chưa có dữ liệu cloud.');
    }
  };

  const addSchedule = () => {
    if (!scheduleDraft.title.trim()) return notify('Nhập tên hoạt động trước.');
    const item = { ...scheduleDraft, id: uid('schedule'), title: scheduleDraft.title.trim(), createdAt: new Date().toISOString(), createdBy: currentUser?.email || currentUser?.name || '' };
    commitData((old) => ({ ...old, workSchedules: [item, ...old.workSchedules] }), 'Đã thêm hoạt động vào lịch chung.');
    setScheduleDraft(emptySchedule(currentUser));
  };

  const updateScheduleStatus = (id, status) => {
    commitData((old) => ({ ...old, workSchedules: old.workSchedules.map((item) => item.id === id ? { ...item, status } : item) }), 'Đã cập nhật trạng thái.');
  };

  const removeSchedule = (id) => {
    if (!window.confirm('Xóa hoạt động này khỏi lịch chung?')) return;
    commitData((old) => ({ ...old, workSchedules: old.workSchedules.filter((item) => item.id !== id) }), 'Đã xóa hoạt động.');
  };

  const handleScheduleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportState({ busy: true, name: file.name, items: [], summary: '', warnings: [] });
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error('Tệp lịch phải nhỏ hơn 12 MB.');
      const parsed = await parseOfflineScheduleFile(file, { weekStart: getMondayIso(today()), readText: readScheduleText });
      const items = toArray(parsed.items).map((item) => ({ ...item, id: uid('import'), selected: item.selected !== false }));
      setImportState({ busy: false, name: file.name, items, summary: parsed.summary || '', warnings: toArray(parsed.warnings) });
      notify(`Đã nhận diện ${items.length} mục bằng bộ quy tắc ngoại tuyến.`);
    } catch (error) {
      setImportState({ busy: false, name: file.name, items: [], summary: '', warnings: [error.message || 'Không đọc được tệp.'] });
      notify(error.message || 'Không đọc được tệp.');
    } finally {
      if (event.target) event.target.value = '';
    }
  };

  const addImportedSchedules = () => {
    const selected = importState.items.filter((item) => item.selected && item.title);
    const fingerprints = new Set(data.workSchedules.map((item) => `${item.title}|${item.date}|${item.startTime}|${item.owner}`.toLowerCase()));
    const unique = selected.filter((item) => {
      const fingerprint = `${item.title}|${item.date}|${item.startTime}|${item.owner}`.toLowerCase();
      if (fingerprints.has(fingerprint)) return false;
      fingerprints.add(fingerprint);
      return true;
    }).map(({ selected: _selected, confidence: _confidence, missingDate: _missingDate, ...item }) => ({
      ...item,
      id: uid('schedule'),
      status: STATUS_OPTIONS.includes(item.status) ? item.status : 'Chưa làm',
      importedFrom: importState.name,
      importedAt: new Date().toISOString(),
    }));
    if (!unique.length) return notify('Không có mục mới để thêm.');
    commitData((old) => ({ ...old, workSchedules: [...unique, ...old.workSchedules] }), `Đã thêm ${unique.length} mục lịch, bỏ qua mục trùng.`);
    setImportState({ busy: false, name: '', items: [], summary: '', warnings: [] });
  };

  const addRecord = () => {
    if (!recordDraft.title.trim()) return notify('Nhập tên hồ sơ hoặc văn bản trước.');
    const item = { ...recordDraft, id: uid('record'), title: recordDraft.title.trim(), createdAt: new Date().toISOString(), createdBy: currentUser?.email || currentUser?.name || '' };
    commitData((old) => ({ ...old, documents: [item, ...old.documents] }), 'Đã lưu hồ sơ vào kho của tổ.');
    setRecordDraft(emptyRecord(currentUser));
  };

  const removeRecord = (id) => {
    if (!window.confirm('Xóa mục hồ sơ này? File ở hệ thống bên ngoài sẽ không bị xóa.')) return;
    commitData((old) => ({ ...old, documents: old.documents.filter((item) => item.id !== id) }), 'Đã xóa mục hồ sơ.');
  };

  const useTemplate = (template) => {
    setRecordDraft((old) => ({ ...old, title: template.titleVi, category: template.type, note: template.contentVi }));
    notify('Đã đưa mẫu vào biểu mẫu hồ sơ.');
  };

  const generateReport = () => {
    const text = makeDeterministicReport(data, activities, workSummary, reportType);
    setReportText(text);
    notify('Đã tổng hợp báo cáo từ dữ liệu thật trong hệ thống.');
  };

  const saveReport = () => {
    if (!reportText.trim()) return notify('Chưa có báo cáo để lưu.');
    const item = { id: uid('report'), title: `${reportTitle(reportType)} - ${formatDate(today())}`, type: reportType, content: reportText, createdAt: new Date().toISOString(), createdBy: currentUser?.email || currentUser?.name || '' };
    commitData((old) => ({ ...old, reports: [item, ...old.reports] }), 'Đã lưu báo cáo vào dữ liệu tổ.');
  };

  const reportHtml = () => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(reportTitle(reportType))}</title><style>body{font-family:"Times New Roman",serif;max-width:900px;margin:40px auto;padding:0 24px;line-height:1.55;color:#111}pre{font:inherit;white-space:pre-wrap}h1{text-align:center}</style></head><body><pre>${escapeHtml(reportText)}</pre></body></html>`;

  const exportCalendar = () => {
    downloadFile(`lich-to-tieng-anh-${data.schoolYear}.ics`, makeCalendarIcs(activities), 'text/calendar;charset=utf-8');
    notify('Đã xuất lịch ICS.');
  };

  const downloadScheduleTemplate = () => {
    downloadFile('mau-lich-hoat-dong-to.csv', makeOfflineScheduleCsvTemplate(), 'text/csv;charset=utf-8');
  };

  const renderOverview = () => (
    <div className="department-v2-overview">
      <section className="department-v2-metrics" aria-label="Chỉ số tổ chuyên môn">
        <button type="button" onClick={() => setActiveTab('workHub')}><span>✅</span><strong>{workSummary.active}</strong><small>Công việc đang mở</small></button>
        <button type="button" onClick={() => setActiveTab('workHub')}><span>📥</span><strong>{workSummary.review}</strong><small>Chờ xử lý / chỉnh sửa</small></button>
        <button type="button" onClick={() => setActiveTab('workSchedule')}><span>🗓️</span><strong>{upcoming.length}</strong><small>Mốc trong 14 ngày</small></button>
        <button type="button" onClick={() => setActiveTab('workSchedule')}><span>⚠️</span><strong>{overdue.length + workSummary.overdue}</strong><small>Đang quá hạn</small></button>
        <button type="button" onClick={() => setActiveTab('documents')}><span>🗂️</span><strong>{data.documents.length}</strong><small>Hồ sơ & văn bản</small></button>
      </section>

      <section className="department-v2-overview-grid">
        <article className="department-v2-card">
          <div className="department-v2-card-head"><div><span className="eyebrow">Ưu tiên</span><h2>Việc cần xử lý</h2></div><button type="button" onClick={() => setActiveTab('workHub')}>Mở Trung tâm công việc</button></div>
          <div className="department-v2-priority-list">
            <div><span className="tone-red">{workSummary.overdue}</span><p><strong>Công việc quá hạn</strong><small>Cần cập nhật, gia hạn hoặc phản hồi.</small></p></div>
            <div><span className="tone-amber">{workSummary.review}</span><p><strong>Sản phẩm chờ xử lý</strong><small>Đã nộp hoặc đang cần chỉnh sửa.</small></p></div>
            <div><span className="tone-blue">{workSummary.dueSoon}</span><p><strong>Sắp đến hạn</strong><small>Hạn trong ba ngày tới.</small></p></div>
          </div>
        </article>

        <article className="department-v2-card">
          <div className="department-v2-card-head"><div><span className="eyebrow">14 ngày tới</span><h2>Lịch & hoạt động</h2></div><button type="button" onClick={() => setActiveTab('workSchedule')}>Xem toàn bộ</button></div>
          <div className="department-v2-agenda-list">
            {upcoming.length ? upcoming.slice(0, 6).map((item) => <div key={`${item.collection}-${item.id}`}><time>{formatDate(item.date)}</time><p><strong>{item.title}</strong><small>{item.type} · {item.owner}</small></p></div>) : <p className="department-v2-empty">Chưa có hoạt động sắp tới.</p>}
          </div>
        </article>

        <article className="department-v2-card department-v2-wide-card">
          <div className="department-v2-card-head"><div><span className="eyebrow">Thao tác nhanh</span><h2>Một nơi cho toàn bộ nghiệp vụ tổ</h2></div></div>
          <div className="department-v2-quick-actions">
            <button type="button" onClick={() => setActiveTab('workSchedule')}><span>＋</span><strong>Thêm hoạt động</strong><small>Họp, dự giờ, kế hoạch, chuyên đề…</small></button>
            <button type="button" onClick={() => setActiveTab('workHub')}><span>✓</span><strong>{canManage ? 'Giao việc' : 'Xem việc của tôi'}</strong><small>Nộp, phản hồi và phê duyệt chung.</small></button>
            <button type="button" onClick={() => setActiveTab('documents')}><span>▤</span><strong>Lưu hồ sơ</strong><small>Văn bản, biểu mẫu và minh chứng.</small></button>
            <button type="button" onClick={() => setActiveTab('reports')}><span>↗</span><strong>Tạo báo cáo</strong><small>Tổng hợp bằng dữ liệu thật, không AI.</small></button>
          </div>
        </article>
      </section>
    </div>
  );

  const renderSchedule = () => (
    <div className="department-v2-section-stack">
      <section className="department-v2-card department-v2-section-intro">
        <div><span className="eyebrow">Lịch dùng chung</span><h2>Lịch & hoạt động chuyên môn</h2><p>Hợp nhất kế hoạch, họp tổ, dự giờ, nghiên cứu bài học, kiểm tra đánh giá, bồi dưỡng và hoạt động học sinh.</p></div>
        <div className="department-v2-toolbar"><button type="button" onClick={exportCalendar}>Xuất lịch .ics</button>{canManage ? <button type="button" onClick={() => importInputRef.current?.click()}>Nhập lịch từ file</button> : null}</div>
      </section>

      {canManage ? <section className="department-v2-card">
        <div className="department-v2-card-head"><div><span className="eyebrow">Thêm mới</span><h2>Tạo hoạt động</h2></div></div>
        <div className="department-v2-form-grid">
          <label className="span-2"><span>Tên hoạt động</span><input value={scheduleDraft.title} onChange={(event) => setScheduleDraft({ ...scheduleDraft, title: event.target.value })} placeholder="Ví dụ: Họp tổ rà soát đề giữa kỳ" /></label>
          <label><span>Loại</span><select value={scheduleDraft.type} onChange={(event) => setScheduleDraft({ ...scheduleDraft, type: event.target.value })}>{ACTIVITY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label><span>Người phụ trách / thành phần</span><input value={scheduleDraft.owner} onChange={(event) => setScheduleDraft({ ...scheduleDraft, owner: event.target.value })} /></label>
          <label><span>Ngày</span><input type="date" value={scheduleDraft.date} onChange={(event) => setScheduleDraft({ ...scheduleDraft, date: event.target.value })} /></label>
          <label><span>Bắt đầu</span><input type="time" value={scheduleDraft.startTime} onChange={(event) => setScheduleDraft({ ...scheduleDraft, startTime: event.target.value })} /></label>
          <label><span>Kết thúc</span><input type="time" value={scheduleDraft.endTime} onChange={(event) => setScheduleDraft({ ...scheduleDraft, endTime: event.target.value })} /></label>
          <label><span>Trạng thái</span><select value={scheduleDraft.status} onChange={(event) => setScheduleDraft({ ...scheduleDraft, status: event.target.value })}>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label className="span-2"><span>Địa điểm / liên kết</span><input value={scheduleDraft.location} onChange={(event) => setScheduleDraft({ ...scheduleDraft, location: event.target.value })} /></label>
          <label className="span-2"><span>Chuẩn bị / minh chứng / ghi chú</span><textarea value={scheduleDraft.note} onChange={(event) => setScheduleDraft({ ...scheduleDraft, note: event.target.value })} /></label>
          <button className="department-v2-primary span-2" type="button" onClick={addSchedule}>Thêm vào lịch chung</button>
        </div>
      </section> : null}

      {canManage ? <section className="department-v2-card department-v2-import-card">
        <input ref={importInputRef} hidden type="file" accept=".xlsx,.xls,.csv,.docx,.pdf,.txt,.md,.html,.htm" onChange={handleScheduleImport} />
        <div className="department-v2-card-head"><div><span className="eyebrow">Không dùng AI</span><h2>Nhập lịch bằng bộ quy tắc ngoại tuyến</h2><p>Hỗ trợ XLSX, CSV, DOCX, PDF có chữ, TXT, Markdown và HTML.</p></div><button type="button" onClick={downloadScheduleTemplate}>Tải mẫu CSV</button></div>
        {importState.busy ? <div className="department-v2-import-status">Đang đọc và chuẩn hóa {importState.name}…</div> : null}
        {importState.summary ? <p className="department-v2-import-summary">{importState.summary}</p> : null}
        {importState.warnings.length ? <ul className="department-v2-warning-list">{importState.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul> : null}
        {importState.items.length ? <div className="department-v2-import-list">
          {importState.items.map((item) => <label key={item.id}><input type="checkbox" checked={Boolean(item.selected)} onChange={(event) => setImportState((old) => ({ ...old, items: old.items.map((entry) => entry.id === item.id ? { ...entry, selected: event.target.checked } : entry) }))} /><span><strong>{item.title}</strong><small>{formatDate(item.date)} · {item.type} · {item.owner}</small></span></label>)}
          <button className="department-v2-primary" type="button" onClick={addImportedSchedules}>Thêm các mục đã chọn</button>
        </div> : null}
      </section> : null}

      <section className="department-v2-card">
        <div className="department-v2-card-head"><div><span className="eyebrow">{activities.length} mục</span><h2>Danh sách hoạt động</h2></div></div>
        <div className="department-v2-activity-list">
          {activities.length ? activities.map((item) => <article key={`${item.collection}-${item.id}`} className={isOverdue(item) ? 'is-overdue' : ''}>
            <div className="department-v2-date-block"><strong>{String(item.date || '').slice(8, 10) || '--'}</strong><span>{String(item.date || '').slice(5, 7) ? `Tháng ${String(item.date).slice(5, 7)}` : 'Chưa đặt'}</span></div>
            <div className="department-v2-item-copy"><div><span className="department-v2-type-chip">{item.type}</span>{item.legacy ? <span className="department-v2-legacy-chip">Dữ liệu cũ</span> : null}{isOverdue(item) ? <span className="department-v2-overdue-chip">Quá hạn</span> : null}</div><h3>{item.title}</h3><p>{item.owner} · {formatDate(item.date)}{item.startTime ? ` · ${item.startTime}${item.endTime ? `–${item.endTime}` : ''}` : ''}{item.location ? ` · ${item.location}` : ''}</p>{item.note ? <small>{item.note}</small> : null}</div>
            <div className="department-v2-item-actions">{!item.legacy && canManage ? <><select value={item.status || 'Chưa làm'} onChange={(event) => updateScheduleStatus(item.id, event.target.value)}>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select><button type="button" onClick={() => removeSchedule(item.id)}>Xóa</button></> : <span>{item.status || 'Chưa làm'}</span>}</div>
          </article>) : <p className="department-v2-empty">Chưa có hoạt động chuyên môn.</p>}
        </div>
      </section>
    </div>
  );

  const renderRecords = () => (
    <div className="department-v2-section-stack">
      <section className="department-v2-card department-v2-section-intro"><div><span className="eyebrow">Kho duy nhất</span><h2>Hồ sơ & văn bản</h2><p>Một hồ sơ chỉ được lưu một lần; công việc và báo cáo tham chiếu đến hồ sơ thay vì tạo bản sao.</p></div><button type="button" onClick={() => { window.location.hash = '#/resource-library'; }}>Mở Kho học liệu</button></section>

      {canManage ? <section className="department-v2-card">
        <div className="department-v2-card-head"><div><span className="eyebrow">Thêm hồ sơ</span><h2>Ghi nhận văn bản hoặc minh chứng</h2></div></div>
        <div className="department-v2-template-strip">{DEPARTMENT_TEMPLATES.map((template) => <button key={template.id} type="button" onClick={() => useTemplate(template)}><strong>{template.titleVi}</strong><small>{template.type}</small></button>)}</div>
        <div className="department-v2-form-grid">
          <label className="span-2"><span>Tên hồ sơ / văn bản</span><input value={recordDraft.title} onChange={(event) => setRecordDraft({ ...recordDraft, title: event.target.value })} /></label>
          <label><span>Loại hồ sơ</span><select value={recordDraft.category} onChange={(event) => setRecordDraft({ ...recordDraft, category: event.target.value })}>{RECORD_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label><span>Người phụ trách / nguồn</span><input value={recordDraft.owner} onChange={(event) => setRecordDraft({ ...recordDraft, owner: event.target.value })} /></label>
          <label><span>Ngày cập nhật</span><input type="date" value={recordDraft.date} onChange={(event) => setRecordDraft({ ...recordDraft, date: event.target.value })} /></label>
          <label><span>Liên kết Drive / tài liệu</span><input value={recordDraft.link} onChange={(event) => setRecordDraft({ ...recordDraft, link: event.target.value })} placeholder="https://…" /></label>
          <label className="span-2"><span>Mô tả / nội dung mẫu</span><textarea value={recordDraft.note} onChange={(event) => setRecordDraft({ ...recordDraft, note: event.target.value })} /></label>
          <button className="department-v2-primary span-2" type="button" onClick={addRecord}>Lưu vào Hồ sơ tổ</button>
        </div>
      </section> : null}

      <section className="department-v2-card">
        <div className="department-v2-record-toolbar"><div><span className="eyebrow">Tra cứu</span><h2>{filteredRecords.length} hồ sơ phù hợp</h2></div><input value={recordQuery} onChange={(event) => setRecordQuery(event.target.value)} placeholder="Tìm tên, người phụ trách, nội dung…" /><select value={recordCategory} onChange={(event) => setRecordCategory(event.target.value)}><option value="all">Tất cả loại hồ sơ</option>{RECORD_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div>
        <div className="department-v2-record-grid">
          {filteredRecords.length ? filteredRecords.map((item) => <article key={item.id}><span className="department-v2-record-icon">▤</span><div><small>{item.category || 'Hồ sơ'} · {formatDate(item.date || item.createdAt)}</small><h3>{item.title}</h3><p>{item.note || 'Chưa có mô tả.'}</p><footer><span>{item.owner || 'Tổ chuyên môn'}</span><div>{item.link ? <a href={item.link} target="_blank" rel="noreferrer">Mở tài liệu</a> : null}{canManage ? <button type="button" onClick={() => removeRecord(item.id)}>Xóa</button> : null}</div></footer></div></article>) : <p className="department-v2-empty">Chưa có hồ sơ phù hợp bộ lọc.</p>}
        </div>
      </section>
    </div>
  );

  const renderWorkHub = () => (
    <div className="department-v2-section-stack">
      <section className="department-v2-card department-v2-section-intro"><div><span className="eyebrow">Dùng chung một lõi</span><h2>Trung tâm công việc của Tổ chuyên môn</h2><p>Giao việc, nộp sản phẩm, phản hồi, yêu cầu chỉnh sửa, phê duyệt và lưu học liệu đều dùng chung dữ liệu với ứng dụng Trung tâm công việc.</p></div><div className="department-v2-work-summary"><strong>{workSummary.active}</strong><span>đang hoạt động</span><strong>{workSummary.review}</strong><span>chờ xử lý</span></div></section>
      <section className="department-workhub-embed" data-leader={canManage ? 'true' : 'false'}>
        <WorkHub currentUser={currentUser} language={language} />
      </section>
    </div>
  );

  const renderReports = () => (
    <div className="department-v2-section-stack">
      <section className="department-v2-card department-v2-section-intro"><div><span className="eyebrow">Không dùng AI</span><h2>Báo cáo & thống kê</h2><p>Hệ thống điền mẫu bằng số liệu thật từ lịch, hồ sơ và Trung tâm công việc. Nội dung có thể chỉnh sửa trước khi lưu hoặc xuất.</p></div></section>
      <section className="department-v2-card">
        <div className="department-v2-report-toolbar"><select value={reportType} onChange={(event) => setReportType(event.target.value)}><option value="week">Báo cáo tuần</option><option value="month">Báo cáo tháng</option><option value="semester">Báo cáo học kỳ</option><option value="year">Báo cáo năm học</option><option value="tasks">Báo cáo tiến độ công việc</option><option value="evidence">Báo cáo hồ sơ & minh chứng</option></select><button className="department-v2-primary" type="button" onClick={generateReport}>Tổng hợp báo cáo</button><button type="button" onClick={() => navigator.clipboard?.writeText(reportText).then(() => notify('Đã sao chép báo cáo.'))} disabled={!reportText}>Sao chép</button><button type="button" onClick={() => downloadFile(`bao-cao-to-${today()}.txt`, reportText)} disabled={!reportText}>Tải TXT</button><button type="button" onClick={() => downloadFile(`bao-cao-to-${today()}.html`, reportHtml(), 'text/html;charset=utf-8')} disabled={!reportText}>Tải HTML</button>{canManage ? <button type="button" onClick={saveReport} disabled={!reportText}>Lưu báo cáo</button> : null}</div>
        <textarea className="department-v2-report-output" value={reportText} onChange={(event) => setReportText(event.target.value)} placeholder="Chọn loại báo cáo và bấm Tổng hợp báo cáo." />
      </section>
      <section className="department-v2-card"><div className="department-v2-card-head"><div><span className="eyebrow">Đã lưu</span><h2>Lịch sử báo cáo</h2></div></div><div className="department-v2-saved-reports">{data.reports.length ? data.reports.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{formatDateTime(item.createdAt)} · {item.createdBy || 'Tổ chuyên môn'}</small></div><button type="button" onClick={() => setReportText(item.content || '')}>Mở lại</button></article>) : <p className="department-v2-empty">Chưa lưu báo cáo nào.</p>}</div></section>
    </div>
  );

  return (
    <div className="page department-page department-page-v2">
      <section className="department-v40-hero-shell department-v2-hero" aria-label="Tổ chuyên môn Tiếng Anh">
        <div className="department-v2-hero-copy"><span className="department-v2-brand">BRIAN · DEPARTMENT</span><h1>Tổ chuyên môn Tiếng Anh</h1><p>Lịch hoạt động, hồ sơ, công việc, sản phẩm nộp và báo cáo trong một không gian thống nhất — hoàn toàn không sử dụng AI.</p><div className="department-v2-hero-actions"><button className="department-v2-primary" type="button" onClick={() => setActiveTab('workHub')}>{canManage ? '＋ Giao việc mới' : 'Xem việc của tôi'}</button><button type="button" onClick={() => setActiveTab('workSchedule')}>Mở lịch hoạt động</button></div></div>
        <div className="department-v2-hero-visual" aria-hidden="true"><div className="department-v2-visual-board"><span>✓</span><strong>ONE WORKFLOW</strong><small>Giao việc → Nộp → Duyệt → Lưu</small></div><div className="department-v2-visual-card card-a">🗓️<b>{upcoming.length}</b><small>Mốc sắp tới</small></div><div className="department-v2-visual-card card-b">🗂️<b>{data.documents.length}</b><small>Hồ sơ</small></div><div className="department-v2-visual-card card-c">✅<b>{workSummary.active}</b><small>Việc đang mở</small></div></div>
      </section>

      <section className="department-v2-control-strip">
        <label><span>Năm học</span><input value={data.schoolYear} disabled={!canManage} onChange={(event) => commitData((old) => ({ ...old, schoolYear: event.target.value }))} /></label>
        <label><span>Giai đoạn</span><input value={data.semester} disabled={!canManage} onChange={(event) => commitData((old) => ({ ...old, semester: event.target.value }))} /></label>
        <div className="department-v2-cloud-state"><span className={cloud.available ? 'online' : 'local'} /> <div><strong>{cloud.message}</strong><small>{cloud.updatedAt ? `${formatDateTime(cloud.updatedAt)}${cloud.updatedBy ? ` · ${cloud.updatedBy}` : ''}` : 'Dữ liệu local được dùng làm bộ nhớ đệm.'}</small></div></div>
        <div className="department-v2-cloud-actions">{canManage ? <button type="button" disabled={cloud.checking} onClick={saveCloud}>{cloud.checking ? 'Đang xử lý…' : 'Lưu cloud'}</button> : null}<button type="button" disabled={cloud.checking || !canUseCloudDepartmentStore()} onClick={reloadCloud}>Tải lại</button></div>
      </section>

      <nav className="department-v2-tabs" aria-label="Phân hệ Tổ chuyên môn">
        {modules.map((module) => <button key={module.key} type="button" className={activeTab === module.key ? 'active' : ''} onClick={() => setActiveTab(module.key)}><span>{module.icon}</span><strong>{module.titleVi}</strong><small>{module.descVi}</small></button>)}
      </nav>

      <main className="department-v2-main">
        {activeTab === 'dashboard' ? renderOverview() : null}
        {activeTab === 'workSchedule' ? renderSchedule() : null}
        {activeTab === 'documents' ? renderRecords() : null}
        {activeTab === 'workHub' ? renderWorkHub() : null}
        {activeTab === 'reports' ? renderReports() : null}
      </main>

      {toast ? <div className="department-v2-toast" role="status">{toast}</div> : null}
    </div>
  );
}
