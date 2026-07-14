import React, { useEffect, useMemo, useRef, useState } from 'react';
import { spreadsheetToTextSafe } from '../utils/safeSpreadsheet.js';
import SectionHeader from '../components/SectionHeader.jsx';
import HomeroomConductTab from '../components/HomeroomConductTab.jsx';
import {
  AnnouncementsTab,
  CompetitionTab,
  LearningAnalyticsTab,
  PortalsTab,
  SchoolStatsTab,
  SubjectFeedbackTab,
} from '../components/HomeroomPhase2Tabs.jsx';
import {
  ClassLifecycleTab,
  DataSafetyTab,
  SearchCommandTab,
  StudentSupportTab,
} from '../components/HomeroomPhase3Tabs.jsx';
import { callAI, extractJson } from '../utils/gemini.js';
import { readDocxTextFromBuffer, readPdfTextFromBuffer } from '../utils/documentParsers.js';
import {
  addMeeting,
  addMessageTemplate,
  addParentContact,
  addRecord,
  addScheduleItem,
  addStudent,
  archiveStudent,
  createHomeroomWorkspace,
  duplicateHomeroomWorkspace,
  exportWorkspaceJson,
  getCurrentHomeroomWorkspaceId,
  listHomeroomWorkspaces,
  loadHomeroomWorkspace,
  makeDefaultHomeroomWorkspace,
  normalizeHomeroomWorkspace,
  restoreStudent,
  saveHomeroomWorkspace,
  saveLocalHomeroomWorkspace,
  scheduleParentMessage,
  setAttendanceLock,
  setAttendanceSession,
  setCurrentHomeroomWorkspaceId,
  setHomeroomWorkspaceStatus,
  transferStudent,
  upsertStudents,
} from '../utils/homeroomStore.js';
import {
  attendanceSessionKey,
  createCorrectionRequest,
  parseAttendanceSessionKey,
  downloadWordDocument,
  makeWorkspaceId,
  prepareWorkspaceCommit,
  printRecordAsPdf,
} from '../utils/homeroomPhase3.js';
import {
  ATTENDANCE_STATUSES,
  CONTACT_CHANNELS,
  HOMEROOM_TABS,
  RECORD_TYPES,
  SCHEDULE_CATEGORIES,
} from '../data/homeroom.js';

const EMPTY_STUDENT = {
  code: '', fullName: '', birthDate: '', gender: '', phone: '', parentName: '', parentPhone: '', parentEmail: '', address: '', notes: '', supportLevel: 'normal',
};
const EMPTY_EVENT = { title: '', date: today(), startTime: '', endTime: '', location: '', category: 'Sinh hoạt lớp', audience: 'Toàn lớp', note: '', status: 'Sắp tới' };
const EMPTY_MEETING = { date: today(), theme: '', objectives: '', attendanceSummary: '', learningSummary: '', commendations: '', reminders: '', nextWeek: '', content: '' };
const EMPTY_CONTACT = { studentId: '', date: today(), channel: 'Zalo', direction: 'GVCN liên hệ', subject: '', message: '', outcome: '', followUpDate: '' };
const EMPTY_RECORD = { type: 'Báo cáo tuần', title: '', period: '', content: '' };
const AI_IMPORT_EMPTY = { detectedType: '', summary: '', classProfile: null, students: [], schedule: [], attendance: [], parentContacts: [] };
const AI_IMPORT_SOURCE_LIMIT = 60000;
const AI_IMPORT_OUTPUT_BUDGET = 1200;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value, language = 'vi') {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function startOfWeekValue(dateValue = today()) {
  const date = new Date(`${dateValue}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function endOfWeekValue(dateValue = today()) {
  const date = new Date(`${startOfWeekValue(dateValue)}T00:00:00`);
  date.setDate(date.getDate() + 6);
  return date.toISOString().slice(0, 10);
}

function safeText(value) {
  return String(value ?? '').trim();
}

function normalizePhone(value) {
  const raw = safeText(value).replace(/[^\d+]/g, '');
  if (/^\d{9}$/.test(raw) && !raw.startsWith('0')) return `0${raw}`;
  return raw;
}

function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function csvCell(value) {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

async function readImportFile(file) {
  const name = String(file?.name || '').toLowerCase();
  if (!file) throw new Error('Chưa chọn file.');
  const buffer = await file.arrayBuffer();
  if (name.endsWith('.pdf')) return readPdfTextFromBuffer(buffer, { maxPages: 60, maxChars: 150000 });
  if (name.endsWith('.docx')) return readDocxTextFromBuffer(buffer);
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    return workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      return `--- SHEET: ${sheetName} ---\n${XLSX.utils.sheet_to_csv(sheet)}`;
    }).join('\n\n');
  }
  return new TextDecoder('utf-8').decode(buffer);
}

function statusLabel(status, language) {
  const item = ATTENDANCE_STATUSES.find((entry) => entry.id === status);
  return language === 'vi' ? item?.labelVi || status : item?.label || status;
}

function Tabs({ active, setActive, language, currentUser }) {
  return (
    <nav className="hr-tabs" aria-label={language === 'vi' ? 'Chức năng giáo viên chủ nhiệm' : 'Homeroom tools'}>
      {HOMEROOM_TABS.filter((tab) => !tab.adminOnly || currentUser?.role === 'admin').map((tab) => (
        <button key={tab.key} type="button" className={active === tab.key ? 'active' : ''} onClick={() => setActive(tab.key)}>
          <span>{tab.icon}</span><b>{language === 'vi' ? tab.titleVi : tab.title}</b>
        </button>
      ))}
    </nav>
  );
}

function EmptyState({ title, text, action, actionLabel }) {
  return (
    <div className="hr-empty">
      <span>＋</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? <button type="button" className="primary" onClick={action}>{actionLabel}</button> : null}
    </div>
  );
}

function StatCard({ icon, label, value, note, tone = 'blue' }) {
  return (
    <article className={`hr-stat tone-${tone}`}>
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong><em>{note}</em></div>
    </article>
  );
}

function ClassProfileEditor({ value, onChange, onSave, saving, language }) {
  const field = (key, label, type = 'text') => (
    <label>
      <span>{label}</span>
      <input type={type} value={value[key] || ''} onChange={(event) => onChange({ ...value, [key]: event.target.value })} />
    </label>
  );
  return (
    <section className="hr-panel hr-class-setup">
      <div className="hr-panel-head">
        <div><small>{language === 'vi' ? 'Thiết lập lớp' : 'Class setup'}</small><h2>{language === 'vi' ? 'Thông tin lớp chủ nhiệm' : 'Homeroom class profile'}</h2></div>
        <button type="button" className="primary" disabled={saving || !safeText(value.className)} onClick={onSave}>{saving ? 'Đang lưu…' : (language === 'vi' ? 'Lưu thông tin lớp' : 'Save class')}</button>
      </div>
      <div className="hr-form-grid four">
        {field('className', language === 'vi' ? 'Tên lớp' : 'Class name')}
        {field('schoolYear', language === 'vi' ? 'Năm học' : 'School year')}
        {field('grade', language === 'vi' ? 'Khối' : 'Grade')}
        {field('room', language === 'vi' ? 'Phòng học' : 'Room')}
        {field('adviserName', language === 'vi' ? 'Giáo viên chủ nhiệm' : 'Homeroom teacher')}
        {field('adviserEmail', 'Email', 'email')}
        {field('classMonitor', language === 'vi' ? 'Lớp trưởng' : 'Class monitor')}
        {field('studentCountTarget', language === 'vi' ? 'Sĩ số dự kiến' : 'Target size', 'number')}
      </div>
      <label className="hr-wide-field"><span>{language === 'vi' ? 'Ghi chú lớp' : 'Class notes'}</span><textarea value={value.notes || ''} onChange={(event) => onChange({ ...value, notes: event.target.value })} /></label>
    </section>
  );
}

function OverviewTab({ workspace, language, goTab }) {
  const date = today();
  const sessionKeysToday = Object.keys(workspace.attendance || {}).filter((key) => key === date || key.startsWith(`${date}::`)).sort();
  const todayAttendance = sessionKeysToday.length ? (workspace.attendance[sessionKeysToday.at(-1)] || {}) : {};
  const students = workspace.students.filter((item) => item.active !== false);
  const present = students.filter((student) => (todayAttendance[student.id]?.status || '') === 'present').length;
  const absent = students.filter((student) => ['excused', 'unexcused'].includes(todayAttendance[student.id]?.status)).length;
  const weekStart = startOfWeekValue();
  const weekEnd = endOfWeekValue();
  const weekEvents = workspace.schedule.filter((item) => item.date >= weekStart && item.date <= weekEnd);
  const upcoming = workspace.schedule.filter((item) => !item.date || item.date >= date).slice(0, 5);
  const needsSupport = students.filter((item) => item.supportLevel === 'attention' || safeText(item.notes)).slice(0, 6);
  const unexcusedTotal = Object.values(workspace.attendance).reduce((sum, rows) => sum + Object.values(rows || {}).filter((entry) => entry?.status === 'unexcused').length, 0);

  return (
    <div className="hr-tab-stack">
      <section className="hr-stat-grid">
        <StatCard icon="♙" label={language === 'vi' ? 'Sĩ số hiện tại' : 'Students'} value={students.length} note={`${workspace.classProfile.grade ? `Khối ${workspace.classProfile.grade}` : '—'} · ${workspace.classProfile.schoolYear || '—'}`} tone="blue" />
        <StatCard icon="✓" label={language === 'vi' ? 'Có mặt hôm nay' : 'Present today'} value={students.length ? `${present}/${students.length}` : '—'} note={todayAttendance && Object.keys(todayAttendance).length ? (language === 'vi' ? `${sessionKeysToday.length} phiên đã cập nhật` : `${sessionKeysToday.length} session(s) updated`) : (language === 'vi' ? 'Chưa điểm danh' : 'Not marked')} tone="green" />
        <StatCard icon="!" label={language === 'vi' ? 'Vắng hôm nay' : 'Absent today'} value={absent} note={`${language === 'vi' ? 'Vắng không phép toàn kỳ' : 'Unexcused total'}: ${unexcusedTotal}`} tone="red" />
        <StatCard icon="◷" label={language === 'vi' ? 'Công việc tuần này' : 'This week'} value={weekEvents.length} note={`${weekStart} → ${weekEnd}`} tone="orange" />
      </section>

      <section className="hr-overview-grid">
        <article className="hr-panel">
          <div className="hr-panel-head"><div><small>{language === 'vi' ? 'Thao tác nhanh' : 'Quick actions'}</small><h2>{language === 'vi' ? 'Công việc hôm nay' : 'Today’s workflow'}</h2></div></div>
          <div className="hr-quick-grid">
            <button type="button" onClick={() => goTab('attendance')}><span>✓</span><b>{language === 'vi' ? 'Điểm danh hôm nay' : 'Mark attendance'}</b><small>{language === 'vi' ? 'Lưới điểm danh nhanh' : 'Fast roster grid'}</small></button>
            <button type="button" onClick={() => goTab('schedule')}><span>＋</span><b>{language === 'vi' ? 'Thêm công việc' : 'Add schedule'}</b><small>{language === 'vi' ? 'Lịch tuần và nhắc việc' : 'Weekly tasks'}</small></button>
            <button type="button" onClick={() => goTab('conduct')}><span>100</span><b>{language === 'vi' ? 'Xét rèn luyện tuần' : 'Weekly conduct'}</b><small>{language === 'vi' ? '100 điểm · trừ theo vi phạm' : '100-point conduct score'}</small></button>
            <button type="button" onClick={() => goTab('parents')}><span>✉</span><b>{language === 'vi' ? 'Soạn tin phụ huynh' : 'Parent message'}</b><small>{language === 'vi' ? 'AI viết theo ngữ cảnh' : 'AI-assisted writing'}</small></button>
            <button type="button" onClick={() => goTab('ai')}><span>AI</span><b>{language === 'vi' ? 'Nhập file bằng AI' : 'AI file import'}</b><small>{language === 'vi' ? 'Danh sách, lịch, thông tin' : 'Roster, schedule, data'}</small></button>
          </div>
        </article>

        <article className="hr-panel">
          <div className="hr-panel-head"><div><small>{language === 'vi' ? 'Sắp tới' : 'Upcoming'}</small><h2>{language === 'vi' ? 'Lịch công việc' : 'Schedule'}</h2></div><button type="button" className="text-btn" onClick={() => goTab('schedule')}>{language === 'vi' ? 'Xem lịch' : 'Open'}</button></div>
          {upcoming.length ? <div className="hr-compact-list">{upcoming.map((item) => <div key={item.id}><time>{formatDate(item.date, language)}<small>{item.startTime || 'Cả ngày'}</small></time><span><b>{item.title}</b><small>{item.category} · {item.location || 'Chưa có địa điểm'}</small></span></div>)}</div> : <p className="hr-muted">{language === 'vi' ? 'Chưa có công việc sắp tới.' : 'No upcoming items.'}</p>}
        </article>

        <article className="hr-panel">
          <div className="hr-panel-head"><div><small>{language === 'vi' ? 'Theo dõi' : 'Attention'}</small><h2>{language === 'vi' ? 'Học sinh cần lưu ý' : 'Students to watch'}</h2></div><button type="button" className="text-btn" onClick={() => goTab('students')}>{language === 'vi' ? 'Hồ sơ' : 'Profiles'}</button></div>
          {needsSupport.length ? <div className="hr-student-mini-list">{needsSupport.map((student) => <div key={student.id}><span>{student.fullName.slice(0, 1)}</span><p><b>{student.fullName}</b><small>{student.notes || (language === 'vi' ? 'Đánh dấu cần theo dõi' : 'Needs attention')}</small></p></div>)}</div> : <p className="hr-muted">{language === 'vi' ? 'Chưa có học sinh được đánh dấu cần lưu ý.' : 'No students are flagged.'}</p>}
        </article>

        <article className="hr-panel hr-progress-panel">
          <div className="hr-panel-head"><div><small>{language === 'vi' ? 'Mức độ hoàn thiện' : 'Setup progress'}</small><h2>{language === 'vi' ? 'Hồ sơ chủ nhiệm' : 'Homeroom records'}</h2></div></div>
          {[
            [language === 'vi' ? 'Thông tin lớp' : 'Class profile', workspace.classProfile.className ? 100 : 0],
            [language === 'vi' ? 'Danh sách học sinh' : 'Student roster', Math.min(100, students.length * 4)],
            [language === 'vi' ? 'Lịch công việc' : 'Work schedule', Math.min(100, workspace.schedule.length * 20)],
            [language === 'vi' ? 'Hồ sơ / báo cáo' : 'Records', Math.min(100, workspace.records.length * 25)],
          ].map(([label, value]) => <div key={label} className="hr-progress-row"><span><b>{label}</b><small>{value}%</small></span><div><i style={{ width: `${value}%` }} /></div></div>)}
        </article>
      </section>
    </div>
  );
}

function StudentsTab({ workspace, onCommit, language, openAi, hasApiKey }) {
  const [draft, setDraft] = useState(EMPTY_STUDENT);
  const [editingId, setEditingId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const students = useMemo(() => workspace.students.filter((student) => {
    const matches = `${student.fullName} ${student.code} ${student.parentName} ${student.parentPhone}`.toLowerCase().includes(query.toLowerCase());
    if (!matches) return false;
    if (filter === 'attention') return student.supportLevel === 'attention';
    if (filter === 'inactive') return student.active === false;
    return student.active !== false;
  }), [workspace.students, query, filter]);

  const generateStudentComment = async () => {
    if (!hasApiKey || !safeText(draft.fullName)) return;
    const targetId = editingId || workspace.students.find((item) => item.fullName.toLowerCase() === draft.fullName.toLowerCase())?.id;
    const attendanceRows = targetId ? Object.entries(workspace.attendance).map(([date, rows]) => ({ date, ...(rows?.[targetId] || {}) })).filter((item) => item.status) : [];
    const counts = ATTENDANCE_STATUSES.map((item) => `${item.labelVi}: ${attendanceRows.filter((row) => row.status === item.id).length}`).join(', ');
    const prompt = `Bạn là giáo viên chủ nhiệm THPT. Viết một nhận xét học sinh bằng tiếng Việt, khách quan, tích cực, có định hướng hỗ trợ và không bịa dữ liệu.\nHọc sinh: ${draft.fullName}\nMã HS: ${draft.code || 'chưa có'}\nThông tin hiện có: ${draft.notes || 'chưa có ghi chú'}\nChuyên cần: ${counts || 'chưa có dữ liệu'}\nMức theo dõi: ${draft.supportLevel}\nYêu cầu: 90-140 từ, gồm điểm tích cực, điểm cần cải thiện và một đề xuất phối hợp cụ thể. Chỉ trả về nội dung nhận xét.`;
    const comment = await callAI({ prompt, temperature: 0.45, maxOutputTokens: 520, loadingLabel: 'AI đang viết nhận xét học sinh…' });
    setDraft((current) => ({ ...current, notes: comment }));
  };

  const save = async () => {
    if (!safeText(draft.fullName)) return;
    let next = workspace;
    if (editingId) {
      next = { ...workspace, students: workspace.students.map((student) => student.id === editingId ? { ...student, ...draft, id: editingId, updatedAt: new Date().toISOString() } : student) };
    } else next = addStudent(workspace, draft);
    await onCommit(next, language === 'vi' ? 'Đã lưu hồ sơ học sinh.' : 'Student saved.');
    setDraft(EMPTY_STUDENT); setEditingId('');
  };

  const edit = (student) => {
    setDraft({ ...EMPTY_STUDENT, ...student });
    setEditingId(student.id);
    document.querySelector('.hr-student-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const archive = async (student) => {
    const reason = window.prompt(language === 'vi' ? `Lý do ngừng theo dõi ${student.fullName}:` : `Archive reason for ${student.fullName}:`, 'Chuyển lớp / thôi học / bảo lưu') || '';
    if (!safeText(reason)) return;
    await onCommit(archiveStudent(workspace, student.id, reason), language === 'vi' ? 'Đã lưu trữ hồ sơ học sinh, không xóa lịch sử.' : 'Student archived without deleting history.');
  };
  const transfer = async (student) => {
    const target = window.prompt(language === 'vi' ? `Chuyển ${student.fullName} đến lớp nào?` : 'Target class:', '') || '';
    if (!safeText(target)) return;
    await onCommit(transferStudent(workspace, student.id, target), language === 'vi' ? `Đã ghi nhận chuyển lớp đến ${target}.` : 'Transfer recorded.');
  };
  const restore = async (student) => onCommit(restoreStudent(workspace, student.id), language === 'vi' ? 'Đã khôi phục hồ sơ học sinh.' : 'Student restored.');

  const exportCsv = () => {
    const header = ['Mã HS', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'SĐT học sinh', 'Phụ huynh', 'SĐT phụ huynh', 'Email phụ huynh', 'Địa chỉ', 'Ghi chú'];
    const rows = workspace.students.map((student) => [student.code, student.fullName, student.birthDate, student.gender, student.phone, student.parentName, student.parentPhone, student.parentEmail, student.address, student.notes]);
    downloadText(`danh-sach-${workspace.classProfile.className || 'lop'}.csv`, `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}`, 'text/csv;charset=utf-8');
  };

  return (
    <div className="hr-tab-stack">
      <section className="hr-panel hr-student-form">
        <div className="hr-panel-head">
          <div><small>{editingId ? (language === 'vi' ? 'Chỉnh sửa hồ sơ' : 'Edit profile') : (language === 'vi' ? 'Hồ sơ mới' : 'New profile')}</small><h2>{language === 'vi' ? 'Thông tin học sinh' : 'Student information'}</h2></div>
          <div className="hr-head-actions"><button type="button" className="secondary" onClick={openAi}>AI nhập danh sách</button><button type="button" className="secondary" disabled={!hasApiKey || !safeText(draft.fullName)} onClick={generateStudentComment}>AI viết nhận xét</button><button type="button" className="secondary" onClick={exportCsv}>Xuất CSV</button><button type="button" className="primary" onClick={save}>{editingId ? 'Cập nhật' : 'Thêm học sinh'}</button></div>
        </div>
        <div className="hr-form-grid four">
          {[
            ['code', 'Mã học sinh'], ['fullName', 'Họ và tên'], ['birthDate', 'Ngày sinh', 'date'], ['gender', 'Giới tính'],
            ['phone', 'SĐT học sinh', 'tel'], ['parentName', 'Phụ huynh / người giám hộ'], ['parentPhone', 'SĐT phụ huynh', 'tel'], ['parentEmail', 'Email phụ huynh', 'email'],
            ['address', 'Địa chỉ'],
          ].map(([key, label, type = 'text']) => <label key={key}><span>{label}</span><input type={type} value={draft[key] || ''} onChange={(event) => setDraft({ ...draft, [key]: key.toLowerCase().includes('phone') ? normalizePhone(event.target.value) : event.target.value })} /></label>)}
          <label><span>Mức theo dõi</span><select value={draft.supportLevel} onChange={(event) => setDraft({ ...draft, supportLevel: event.target.value })}><option value="normal">Bình thường</option><option value="attention">Cần lưu ý</option><option value="priority">Ưu tiên hỗ trợ</option></select></label>
        </div>
        <label className="hr-wide-field"><span>Ghi chú / hoàn cảnh cần lưu ý</span><textarea value={draft.notes || ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
        {editingId ? <button type="button" className="text-btn" onClick={() => { setDraft(EMPTY_STUDENT); setEditingId(''); }}>Hủy chỉnh sửa</button> : null}
      </section>

      <section className="hr-panel">
        <div className="hr-panel-head">
          <div><small>{workspace.students.length} hồ sơ</small><h2>Danh sách lớp</h2></div>
          <div className="hr-filter-row"><input placeholder="Tìm học sinh, phụ huynh…" value={query} onChange={(event) => setQuery(event.target.value)} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Đang học</option><option value="attention">Cần lưu ý</option><option value="inactive">Đã lưu trữ / chuyển lớp</option></select></div>
        </div>
        {students.length ? (
          <div className="hr-table-wrap"><table className="hr-table"><thead><tr><th>Học sinh</th><th>Liên hệ</th><th>Phụ huynh</th><th>Theo dõi</th><th /></tr></thead><tbody>
            {students.map((student, index) => <tr key={student.id}><td><div className="hr-person-cell"><span>{String(index + 1).padStart(2, '0')}</span><p><b>{student.fullName}</b><small>{student.code || 'Chưa có mã'} · {student.birthDate ? formatDate(student.birthDate) : 'Chưa có ngày sinh'}</small></p></div></td><td><b>{student.phone || '—'}</b><small>{student.address || 'Chưa có địa chỉ'}</small></td><td><b>{student.parentName || '—'}</b><small>{student.parentPhone || student.parentEmail || 'Chưa có liên hệ'}</small></td><td><span className={`hr-support-chip ${student.supportLevel}`}>{student.supportLevel === 'attention' ? 'Cần lưu ý' : student.supportLevel === 'priority' ? 'Ưu tiên' : 'Bình thường'}</span><small>{student.notes || 'Không có ghi chú'}</small></td><td><div className="hr-row-actions"><button type="button" onClick={() => edit(student)}>Sửa</button>{student.active === false ? <button type="button" onClick={() => restore(student)}>Khôi phục</button> : <><button type="button" onClick={() => transfer(student)}>Chuyển lớp</button><button type="button" className="danger" onClick={() => archive(student)}>Lưu trữ</button></>}</div></td></tr>)}
          </tbody></table></div>
        ) : <EmptyState title="Chưa có học sinh" text="Thêm thủ công hoặc dùng AI đọc danh sách từ Excel, Word, PDF, CSV." action={openAi} actionLabel="Nhập danh sách bằng AI" />}
      </section>
    </div>
  );
}

function AttendanceTab({ workspace, onCommit, language, currentUser }) {
  const [date, setDate] = useState(today());
  const [session, setSession] = useState('morning');
  const [period, setPeriod] = useState('');
  const [sessionNote, setSessionNote] = useState('');
  const [rows, setRows] = useState({});
  const students = workspace.students.filter((item) => item.active !== false);
  const sessionKey = attendanceSessionKey(date, session, period);
  const locked = Boolean(workspace.attendanceLocks?.[sessionKey]?.locked);

  useEffect(() => {
    const legacy = session === 'day' && !period ? workspace.attendance[date] : null;
    const existing = workspace.attendance[sessionKey] || legacy || {};
    const meta = workspace.attendanceSessions?.[sessionKey] || {};
    const initial = {};
    students.forEach((student) => { initial[student.id] = existing[student.id] || { status: 'present', reason: '', note: '', evidenceName: '', markedAt: '' }; });
    setRows(initial);
    setSessionNote(meta.note || '');
  }, [date, session, period, workspace.attendance, workspace.attendanceSessions, workspace.students.length]);

  const setStatus = (studentId, status) => {
    if (locked) return;
    setRows((current) => ({ ...current, [studentId]: { ...(current[studentId] || {}), status, markedAt: new Date().toISOString(), markedBy: currentUser?.email || currentUser?.name || '' } }));
  };
  const markAll = (status) => {
    if (locked) return;
    setRows(Object.fromEntries(students.map((student) => [student.id, { ...(rows[student.id] || {}), status, markedAt: new Date().toISOString(), markedBy: currentUser?.email || currentUser?.name || '' }])));
  };
  const save = async () => {
    if (locked) return;
    const next = setAttendanceSession(workspace, sessionKey, rows, { date, session, period, note: sessionNote });
    await onCommit(next, language === 'vi' ? `Đã lưu điểm danh ${formatDate(date)} · ${session}${period ? ` · tiết ${period}` : ''}.` : 'Attendance saved.');
  };
  const toggleLock = async () => {
    if (!locked && !Object.keys(workspace.attendance[sessionKey] || {}).length && !Object.keys(rows).length) return;
    await onCommit(setAttendanceLock(workspace, sessionKey, !locked, currentUser?.email || currentUser?.name), locked ? 'Đã mở khóa phiên điểm danh.' : 'Đã chốt và khóa phiên điểm danh.');
  };
  const requestCorrection = async () => {
    const reason = window.prompt('Nhập lý do cần chỉnh sửa phiên điểm danh đã chốt:') || '';
    if (!safeText(reason)) return;
    await onCommit(createCorrectionRequest(workspace, { sessionKey, reason, requestedBy: currentUser?.email || currentUser?.name }), 'Đã gửi yêu cầu chỉnh sửa điểm danh.');
  };
  const counts = ATTENDANCE_STATUSES.reduce((acc, item) => ({ ...acc, [item.id]: Object.values(rows).filter((row) => row.status === item.id).length }), {});
  const historyKeys = Object.keys(workspace.attendance).sort().reverse().slice(0, 30);
  const sessionLabel = (value) => value === 'morning' ? 'Buổi sáng' : value === 'afternoon' ? 'Buổi chiều' : value === 'evening' ? 'Buổi tối' : value === 'day' ? 'Cả ngày' : value;

  return (
    <div className="hr-tab-stack">
      <section className="hr-panel">
        <div className="hr-panel-head">
          <div><small>{language === 'vi' ? 'Điểm danh theo buổi / tiết' : 'Session attendance'}</small><h2>{formatDate(date, language)} · {sessionLabel(session)}{period ? ` · Tiết ${period}` : ''}</h2></div>
          <div className="hr-head-actions"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /><select value={session} onChange={(event) => setSession(event.target.value)}><option value="morning">Buổi sáng</option><option value="afternoon">Buổi chiều</option><option value="evening">Buổi tối</option><option value="day">Cả ngày</option></select><input className="hr-period-input" placeholder="Tiết" value={period} onChange={(event) => setPeriod(event.target.value)} /><button type="button" className="secondary" disabled={locked} onClick={() => markAll('present')}>Tất cả có mặt</button><button type="button" className="primary" disabled={locked} onClick={save}>Lưu điểm danh</button></div>
        </div>
        <div className={`hr-attendance-lock ${locked ? 'is-locked' : ''}`}><span>{locked ? '🔒 Phiên đã chốt' : '🔓 Phiên đang mở'}</span><input placeholder="Ghi chú phiên điểm danh" value={sessionNote} disabled={locked} onChange={(e) => setSessionNote(e.target.value)} /><button type="button" className="secondary" onClick={toggleLock}>{locked ? 'Mở khóa' : 'Chốt phiên'}</button>{locked ? <button type="button" className="secondary" onClick={requestCorrection}>Yêu cầu chỉnh sửa</button> : null}</div>
        <div className="hr-attendance-summary">{ATTENDANCE_STATUSES.map((item) => <span key={item.id} className={item.id}><b>{counts[item.id] || 0}</b><small>{language === 'vi' ? item.labelVi : item.label}</small></span>)}</div>
        {students.length ? <div className="hr-attendance-grid">{students.map((student, index) => {
          const row = rows[student.id] || { status: 'present', reason: '', note: '', evidenceName: '' };
          return <article key={student.id} className={`hr-attendance-card is-${row.status} ${locked ? 'locked' : ''}`}><div className="hr-attendance-name"><span>{index + 1}</span><p><b>{student.fullName}</b><small>{student.code || student.parentPhone || '—'}</small></p></div><div className="hr-status-switch">{ATTENDANCE_STATUSES.map((item) => <button key={item.id} type="button" disabled={locked} className={row.status === item.id ? 'active' : ''} title={item.labelVi} onClick={() => setStatus(student.id, item.id)}>{item.symbol}</button>)}</div>{row.status !== 'present' ? <div className="hr-attendance-detail"><input disabled={locked} placeholder="Lý do / ghi chú" value={row.reason || ''} onChange={(event) => setRows({ ...rows, [student.id]: { ...row, reason: event.target.value } })} /><label><span>Minh chứng</span><input disabled={locked} type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => setRows({ ...rows, [student.id]: { ...row, evidenceName: event.target.files?.[0]?.name || '' } })} /></label>{row.evidenceName ? <small>📎 {row.evidenceName}</small> : null}</div> : null}</article>;
        })}</div> : <EmptyState title="Chưa có danh sách lớp" text="Cần thêm học sinh trước khi điểm danh." />}
      </section>

      <section className="hr-panel">
        <div className="hr-panel-head"><div><small>30 phiên gần nhất</small><h2>Lịch sử chuyên cần</h2></div></div>
        {historyKeys.length ? <div className="hr-history-list">{historyKeys.map((key) => {
          const data = workspace.attendance[key] || {};
          const parsed = key.includes('::') ? parseAttendanceSessionKey(key) : { date: key, session: 'day', period: '' };
          const total = Object.keys(data).length;
          const presentCount = Object.values(data).filter((entry) => entry.status === 'present').length;
          const absent = Object.values(data).filter((entry) => ['excused', 'unexcused'].includes(entry.status)).length;
          return <button key={key} type="button" onClick={() => { setDate(parsed.date); setSession(parsed.session); setPeriod(parsed.period); }}><time>{formatDate(parsed.date, language)}<small>{sessionLabel(parsed.session)}{parsed.period ? ` · Tiết ${parsed.period}` : ''}</small></time><span><b>{presentCount}/{total} có mặt</b><small>{absent} vắng · {Object.values(data).filter((entry) => entry.status === 'late').length} trễ</small></span><i>{workspace.attendanceLocks?.[key]?.locked ? '🔒' : '→'}</i></button>;
        })}</div> : <p className="hr-muted">Chưa có dữ liệu chuyên cần.</p>}
        {workspace.correctionRequests.length ? <div className="hr-correction-list"><h3>Yêu cầu chỉnh sửa</h3>{workspace.correctionRequests.slice(0, 10).map((item) => <article key={item.id}><b>{item.sessionKey}</b><span>{item.reason}</span><small>{item.requestedBy} · {formatDate(item.requestedAt?.slice(0, 10))}</small></article>)}</div> : null}
      </section>
    </div>
  );
}

function ScheduleTab({ workspace, onCommit, language, openAi }) {
  const [draft, setDraft] = useState(EMPTY_EVENT);
  const [range, setRange] = useState('upcoming');
  const save = async () => {
    if (!safeText(draft.title)) return;
    await onCommit(addScheduleItem(workspace, draft), 'Đã thêm công việc vào lịch.');
    setDraft({ ...EMPTY_EVENT, date: draft.date || today() });
  };
  const remove = async (id) => onCommit({ ...workspace, schedule: workspace.schedule.filter((item) => item.id !== id) }, 'Đã xóa công việc.');
  const visible = workspace.schedule.filter((item) => range === 'all' || !item.date || item.date >= today());
  return (
    <div className="hr-tab-stack">
      <section className="hr-panel">
        <div className="hr-panel-head"><div><small>Lịch riêng của GVCN</small><h2>Thêm công việc</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={openAi}>AI đọc file lịch</button><button type="button" className="primary" onClick={save}>Thêm vào lịch</button></div></div>
        <div className="hr-form-grid four">
          <label><span>Nội dung công việc</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label><span>Ngày</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
          <label><span>Bắt đầu</span><input type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label>
          <label><span>Kết thúc</span><input type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} /></label>
          <label><span>Loại công việc</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{SCHEDULE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Địa điểm / link</span><input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
          <label><span>Đối tượng</span><input value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} /></label>
          <label><span>Trạng thái</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option>Sắp tới</option><option>Đang thực hiện</option><option>Hoàn thành</option><option>Đã hủy</option></select></label>
        </div>
        <label className="hr-wide-field"><span>Nội dung chuẩn bị / ghi chú</span><textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
      </section>

      <section className="hr-panel">
        <div className="hr-panel-head"><div><small>{visible.length} công việc</small><h2>Lịch công việc chủ nhiệm</h2></div><select value={range} onChange={(event) => setRange(event.target.value)}><option value="upcoming">Sắp tới</option><option value="all">Tất cả</option></select></div>
        {visible.length ? <div className="hr-schedule-list">{visible.map((item) => <article key={item.id}><time><b>{new Date(`${item.date || today()}T00:00:00`).getDate()}</b><small>Tháng {new Date(`${item.date || today()}T00:00:00`).getMonth() + 1}</small></time><div><span className="hr-category-chip">{item.category}</span><h3>{item.title}</h3><p>{item.startTime || 'Cả ngày'}{item.endTime ? ` – ${item.endTime}` : ''} · {item.location || 'Chưa có địa điểm'} · {item.audience}</p><small>{item.note || 'Không có ghi chú'}</small></div><aside><span className={`hr-status-chip ${item.status === 'Hoàn thành' ? 'done' : ''}`}>{item.status}</span><button type="button" onClick={() => remove(item.id)}>Xóa</button></aside></article>)}</div> : <EmptyState title="Chưa có lịch công việc" text="Thêm thủ công hoặc dùng AI đọc kế hoạch từ file." action={openAi} actionLabel="AI nhập lịch" />}
      </section>
    </div>
  );
}

function MeetingsTab({ workspace, onCommit, hasApiKey, language }) {
  const [draft, setDraft] = useState(EMPTY_MEETING);
  const [aiRequest, setAiRequest] = useState('Tạo nội dung sinh hoạt lớp tuần này, có tổng kết, tuyên dương, nhắc nhở và kế hoạch tuần tới.');
  const save = async () => {
    if (!safeText(draft.theme)) return;
    await onCommit(addMeeting(workspace, draft), 'Đã lưu nội dung sinh hoạt lớp.');
    setDraft({ ...EMPTY_MEETING, date: draft.date || today() });
  };
  const generate = async () => {
    if (!hasApiKey) return;
    const weekStart = startOfWeekValue(draft.date || today());
    const weekEnd = endOfWeekValue(draft.date || today());
    const attendance = Object.entries(workspace.attendance).filter(([date]) => date >= weekStart && date <= weekEnd);
    const attendanceSummary = attendance.map(([date, rows]) => `${date}: ${Object.values(rows).filter((r) => r.status === 'present').length} present, ${Object.values(rows).filter((r) => ['excused', 'unexcused'].includes(r.status)).length} absent, ${Object.values(rows).filter((r) => r.status === 'late').length} late`).join('\n');
    const upcoming = workspace.schedule.filter((item) => item.date >= weekStart && item.date <= endOfWeekValue(new Date(`${weekEnd}T00:00:00`).toISOString().slice(0, 10))).map((item) => `${item.date} ${item.title}`).join('\n');
    const prompt = `You are an experienced Vietnamese high-school homeroom teacher. Create a practical class meeting plan in Vietnamese.\nClass: ${workspace.classProfile.className || 'unknown'}\nWeek: ${weekStart} to ${weekEnd}\nTeacher request: ${aiRequest}\nAttendance data:\n${attendanceSummary || 'No data'}\nUpcoming schedule:\n${upcoming || 'No events'}\nStudents needing attention:\n${workspace.students.filter((s) => s.supportLevel !== 'normal' || s.notes).map((s) => `${s.fullName}: ${s.notes || s.supportLevel}`).join('\n') || 'None'}\nReturn strict JSON only with keys: theme, objectives, attendanceSummary, learningSummary, commendations, reminders, nextWeek, content. The content should be a polished 35-45 minute agenda with interaction and clear teacher prompts.`;
    const text = await callAI({ prompt, responseMimeType: 'application/json', temperature: 0.55, maxOutputTokens: 1100, loadingLabel: 'AI đang xây dựng nội dung sinh hoạt lớp…' });
    const result = extractJson(text);
    setDraft((current) => ({ ...current, ...result, date: current.date || today() }));
  };
  return (
    <div className="hr-tab-stack">
      <section className="hr-panel hr-ai-inline">
        <div className="hr-panel-head"><div><small>AI GVCN</small><h2>Tạo tiết sinh hoạt từ dữ liệu tuần</h2></div><button type="button" className="primary" disabled={!hasApiKey} onClick={generate}>{hasApiKey ? 'AI tạo nội dung' : 'Chưa cấu hình AI'}</button></div>
        <textarea value={aiRequest} onChange={(event) => setAiRequest(event.target.value)} />
      </section>
      <section className="hr-panel">
        <div className="hr-panel-head"><div><small>Kế hoạch / biên bản</small><h2>Nội dung sinh hoạt lớp</h2></div><button type="button" className="primary" onClick={save}>Lưu sinh hoạt lớp</button></div>
        <div className="hr-form-grid three"><label><span>Ngày</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label><span>Chủ đề</span><input value={draft.theme} onChange={(event) => setDraft({ ...draft, theme: event.target.value })} /></label><label><span>Mục tiêu</span><input value={draft.objectives} onChange={(event) => setDraft({ ...draft, objectives: event.target.value })} /></label></div>
        <div className="hr-form-grid two">{[
          ['attendanceSummary', 'Tổng kết chuyên cần'], ['learningSummary', 'Tình hình học tập'], ['commendations', 'Tuyên dương'], ['reminders', 'Nhắc nhở'], ['nextWeek', 'Kế hoạch tuần tới'],
        ].map(([key, label]) => <label key={key}><span>{label}</span><textarea value={draft[key] || ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}</div>
        <label className="hr-wide-field"><span>Kịch bản chi tiết</span><textarea className="tall" value={draft.content || ''} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></label>
      </section>
      <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.meetings.length} bản ghi</small><h2>Lịch sử sinh hoạt lớp</h2></div></div>{workspace.meetings.length ? <div className="hr-record-list">{workspace.meetings.map((item) => <article key={item.id}><time>{formatDate(item.date)}</time><div><h3>{item.theme}</h3><p>{item.objectives || item.content.slice(0, 180)}</p></div><button type="button" onClick={() => setDraft({ ...EMPTY_MEETING, ...item })}>Mở lại</button></article>)}</div> : <p className="hr-muted">Chưa lưu nội dung sinh hoạt lớp.</p>}</section>
    </div>
  );
}

function ParentsTab({ workspace, onCommit, hasApiKey, language }) {
  const [draft, setDraft] = useState({ ...EMPTY_CONTACT, attachmentName: '', responseStatus: 'pending' });
  const [tone, setTone] = useState('nhẹ nhàng, tôn trọng và phối hợp');
  const [templateName, setTemplateName] = useState('');
  const [sendAt, setSendAt] = useState('');
  const [filterStudent, setFilterStudent] = useState('all');
  const students = workspace.students.filter((item) => item.active !== false);
  const selectedStudent = students.find((item) => item.id === draft.studentId);
  const generate = async () => {
    if (!hasApiKey) return;
    const studentName = selectedStudent?.fullName || 'học sinh';
    const prompt = `Write a Vietnamese parent message for a high-school homeroom teacher.\nStudent: ${studentName}\nParent: ${selectedStudent?.parentName || 'Quý phụ huynh'}\nSubject/context: ${draft.subject || draft.message || 'Trao đổi tình hình học tập và rèn luyện'}\nTone: ${tone}\nChannel: ${draft.channel}\nRequirements: polite, concise, specific, collaborative, no accusation, include a clear next step. Return the message only.`;
    const message = await callAI({ prompt, temperature: 0.55, maxOutputTokens: 520, loadingLabel: 'AI đang soạn thông báo phụ huynh…' });
    setDraft((current) => ({ ...current, message }));
  };
  const save = async () => {
    if (!safeText(draft.subject) && !safeText(draft.message)) return;
    await onCommit(addParentContact(workspace, draft), 'Đã lưu lịch sử liên hệ phụ huynh.');
    setDraft({ ...EMPTY_CONTACT, date: draft.date || today(), attachmentName: '', responseStatus: 'pending' });
  };
  const saveTemplate = async () => {
    if (!safeText(templateName) || !safeText(draft.message)) return;
    await onCommit(addMessageTemplate(workspace, { name: templateName, channel: draft.channel, subject: draft.subject, content: draft.message }), 'Đã lưu mẫu thông báo.');
    setTemplateName('');
  };
  const scheduleMessage = async () => {
    if (!safeText(sendAt) || !safeText(draft.message)) return;
    await onCommit(scheduleParentMessage(workspace, { ...draft, sendAt }), 'Đã lên lịch gửi thông báo.');
    setSendAt('');
  };
  const applyTemplate = (id) => {
    const tpl = workspace.messageTemplates.find((item) => item.id === id);
    if (tpl) setDraft((current) => ({ ...current, channel: tpl.channel || current.channel, subject: tpl.subject || '', message: tpl.content || '' }));
  };
  const copy = async () => { if (draft.message) await navigator.clipboard?.writeText(draft.message); };
  const exportHistory = () => {
    const rows = workspace.parentContacts.filter((item) => filterStudent === 'all' || item.studentId === filterStudent).map((item) => {
      const student = workspace.students.find((entry) => entry.id === item.studentId);
      return [item.date, student?.fullName || 'Toàn lớp', item.channel, item.subject, item.message, item.outcome, item.followUpDate, item.attachmentName];
    });
    downloadText(`lien-he-phu-huynh-${workspace.classProfile.className || 'lop'}.csv`, `\uFEFF${[['Ngày','Học sinh','Kênh','Chủ đề','Nội dung','Kết quả','Theo dõi lại','Tệp'], ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}`, 'text/csv;charset=utf-8');
  };
  const visibleContacts = workspace.parentContacts.filter((item) => filterStudent === 'all' || item.studentId === filterStudent);
  return (
    <div className="hr-tab-stack">
      <section className="hr-panel">
        <div className="hr-panel-head"><div><small>Sổ liên lạc nội bộ</small><h2>Soạn, lên lịch và theo dõi trao đổi</h2></div><div className="hr-head-actions"><button type="button" className="secondary" disabled={!hasApiKey} onClick={generate}>AI soạn tin</button><button type="button" className="secondary" onClick={copy}>Sao chép</button><button type="button" className="primary" onClick={save}>Lưu lịch sử</button></div></div>
        <div className="hr-form-grid four">
          <label><span>Học sinh</span><select value={draft.studentId} onChange={(event) => setDraft({ ...draft, studentId: event.target.value })}><option value="">Toàn lớp / không chọn</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select></label>
          <label><span>Ngày liên hệ</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
          <label><span>Kênh</span><select value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value })}>{CONTACT_CHANNELS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Giọng điệu AI</span><select value={tone} onChange={(event) => setTone(event.target.value)}><option>nhẹ nhàng, tôn trọng và phối hợp</option><option>trang trọng, ngắn gọn</option><option>động viên và tích cực</option><option>khẩn cấp nhưng bình tĩnh</option><option>rõ ràng, kiên quyết nhưng không phán xét</option></select></label>
        </div>
        {selectedStudent ? <div className="hr-parent-info"><b>{selectedStudent.parentName || 'Chưa có tên phụ huynh'}</b><span>{selectedStudent.parentPhone || 'Chưa có SĐT'}</span><span>{selectedStudent.parentEmail || 'Chưa có email'}</span></div> : null}
        {workspace.messageTemplates.length ? <label className="hr-wide-field"><span>Dùng mẫu có sẵn</span><select defaultValue="" onChange={(e) => applyTemplate(e.target.value)}><option value="">Chọn mẫu thông báo</option>{workspace.messageTemplates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
        <label className="hr-wide-field"><span>Chủ đề / yêu cầu AI</span><input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="Ví dụ: Thông báo em đi trễ 3 lần và đề nghị phụ huynh phối hợp" /></label>
        <label className="hr-wide-field"><span>Nội dung trao đổi</span><textarea className="tall" value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} /></label>
        <div className="hr-form-grid two"><label><span>Kết quả / phản hồi</span><textarea value={draft.outcome} onChange={(event) => setDraft({ ...draft, outcome: event.target.value })} /></label><label><span>Ngày cần theo dõi lại</span><input type="date" value={draft.followUpDate} onChange={(event) => setDraft({ ...draft, followUpDate: event.target.value })} /></label><label><span>Tệp đính kèm</span><input type="file" onChange={(event) => setDraft({ ...draft, attachmentName: event.target.files?.[0]?.name || '' })} /></label><label><span>Trạng thái phản hồi</span><select value={draft.responseStatus} onChange={(event) => setDraft({ ...draft, responseStatus: event.target.value })}><option value="pending">Chờ phản hồi</option><option value="replied">Đã phản hồi</option><option value="resolved">Đã xử lý</option></select></label></div>
        <div className="hr-message-tools"><div><input placeholder="Tên mẫu" value={templateName} onChange={(e) => setTemplateName(e.target.value)} /><button type="button" className="secondary" onClick={saveTemplate}>Lưu làm mẫu</button></div><div><input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} /><button type="button" className="secondary" onClick={scheduleMessage}>Lên lịch gửi</button></div></div>
      </section>
      {workspace.scheduledMessages.length ? <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.scheduledMessages.length} lịch gửi</small><h2>Thông báo đã lên lịch</h2></div></div><div className="hr-scheduled-list">{workspace.scheduledMessages.map((item) => <article key={item.id}><div><b>{item.subject || 'Thông báo phụ huynh'}</b><small>{item.sendAt} · {item.channel}</small><p>{item.message}</p></div><span>{item.status}</span></article>)}</div></section> : null}
      <section className="hr-panel"><div className="hr-panel-head"><div><small>{visibleContacts.length} lần trao đổi</small><h2>Lịch sử liên hệ</h2></div><div className="hr-head-actions"><select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}><option value="all">Tất cả học sinh</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select><button type="button" className="secondary" onClick={exportHistory}>Xuất lịch sử CSV</button></div></div>{visibleContacts.length ? <div className="hr-contact-list">{visibleContacts.map((item) => { const student = workspace.students.find((entry) => entry.id === item.studentId); return <article key={item.id}><div><span>{item.channel}</span><time>{formatDate(item.date)}</time></div><h3>{student?.fullName || 'Toàn lớp'} · {item.subject || 'Trao đổi phụ huynh'}</h3><p>{item.message}</p>{item.outcome ? <small><b>Kết quả:</b> {item.outcome}</small> : null}<footer>{item.followUpDate ? <span>Nhắc lại: {item.followUpDate}</span> : null}{item.attachmentName ? <span>📎 {item.attachmentName}</span> : null}<span>{item.responseStatus || 'pending'}</span></footer></article>; })}</div> : <p className="hr-muted">Chưa có lịch sử liên hệ phụ huynh.</p>}</section>
    </div>
  );
}

function RecordsTab({ workspace, onCommit, hasApiKey, language }) {
  const [draft, setDraft] = useState(EMPTY_RECORD);
  const [request, setRequest] = useState('Tạo báo cáo công tác chủ nhiệm tuần này, nêu chuyên cần, công việc đã thực hiện, vấn đề cần theo dõi và kế hoạch tuần tới.');
  const [schoolName, setSchoolName] = useState(workspace.classProfile.schoolName || 'TRƯỜNG THPT');
  const createReport = async () => {
    if (!hasApiKey) return;
    const attendanceSummary = Object.entries(workspace.attendance).slice(-12).map(([key, rows]) => `${key}: ${Object.values(rows).filter((r) => r.status === 'present').length} có mặt, ${Object.values(rows).filter((r) => ['excused', 'unexcused'].includes(r.status)).length} vắng, ${Object.values(rows).filter((r) => r.status === 'late').length} trễ`).join('\n');
    const prompt = `Bạn là giáo viên chủ nhiệm THPT. Hãy tạo văn bản báo cáo bằng tiếng Việt, rõ mục, ngắn gọn, không bịa dữ liệu.\nYêu cầu: ${request}\nLớp: ${workspace.classProfile.className || 'chưa đặt tên'}\nSĩ số: ${workspace.students.filter((s) => s.active !== false).length}\nChuyên cần gần đây:\n${attendanceSummary || 'Chưa có dữ liệu'}\nLịch công việc:\n${workspace.schedule.slice(-10).map((item) => `${item.date}: ${item.title} (${item.status})`).join('\n') || 'Chưa có'}\nSự việc đang theo dõi: ${workspace.incidents.filter((item) => item.status !== 'closed').length}.\nKế hoạch hỗ trợ đang hoạt động: ${workspace.supportPlans.filter((item) => item.status === 'active').length}.\nSinh hoạt lớp:\n${workspace.meetings.slice(0, 3).map((item) => `${item.date}: ${item.theme}`).join('\n') || 'Chưa có'}\nLiên hệ phụ huynh: ${workspace.parentContacts.length} lượt.\nReturn strict JSON with keys title, period, content.`;
    const text = await callAI({ prompt, responseMimeType: 'application/json', temperature: 0.45, maxOutputTokens: 1000, loadingLabel: 'AI đang tổng hợp báo cáo chủ nhiệm…' });
    const result = extractJson(text);
    setDraft((current) => ({ ...current, ...result }));
  };
  const save = async () => {
    if (!safeText(draft.title)) return;
    const next = addRecord({ ...workspace, classProfile: { ...workspace.classProfile, schoolName } }, draft);
    await onCommit(next, 'Đã lưu hồ sơ / báo cáo.');
    setDraft(EMPTY_RECORD);
  };
  const exportAll = () => downloadText(`ho-so-gvcn-${workspace.classProfile.className || 'lop'}.json`, exportWorkspaceJson(workspace), 'application/json;charset=utf-8');
  const exportRecord = (item) => downloadText(`${item.title.replace(/[^a-zA-Z0-9À-ỹ _-]/g, '').replace(/\s+/g, '-')}.txt`, `${item.title}\n${item.type} · ${item.period}\n\n${item.content}`);
  const exportWord = (item) => downloadWordDocument(workspace, item, { schoolName });
  const exportPdf = (item) => {
    try { printRecordAsPdf(workspace, item, { schoolName }); } catch (error) { window.alert(error.message); }
  };
  return (
    <div className="hr-tab-stack">
      <section className="hr-panel hr-ai-inline"><div className="hr-panel-head"><div><small>AI báo cáo</small><h2>Tạo hồ sơ từ dữ liệu lớp</h2></div><button type="button" className="primary" disabled={!hasApiKey} onClick={createReport}>AI tạo báo cáo</button></div><textarea value={request} onChange={(event) => setRequest(event.target.value)} /></section>
      <section className="hr-panel">
        <div className="hr-panel-head"><div><small>Lưu vào hồ sơ chủ nhiệm</small><h2>Biên soạn tài liệu chuẩn Word / PDF</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={exportAll}>Sao lưu JSON</button><button type="button" className="primary" onClick={save}>Lưu tài liệu</button></div></div>
        <div className="hr-form-grid four"><label><span>Tên trường</span><input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} /></label><label><span>Loại hồ sơ</span><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>{RECORD_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Tiêu đề</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label><span>Thời gian / kỳ báo cáo</span><input value={draft.period} onChange={(event) => setDraft({ ...draft, period: event.target.value })} /></label></div>
        <label className="hr-wide-field"><span>Nội dung</span><textarea className="report" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></label>
        {safeText(draft.title) ? <div className="hr-document-preview"><header><div><b>{schoolName}</b><small>LỚP {workspace.classProfile.className || '—'}</small></div><div><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><small>Độc lập – Tự do – Hạnh phúc</small></div></header><h3>{draft.title}</h3><p>{draft.content.slice(0, 700)}{draft.content.length > 700 ? '…' : ''}</p></div> : null}
      </section>
      <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.records.length} tài liệu</small><h2>Kho hồ sơ chủ nhiệm</h2></div></div>{workspace.records.length ? <div className="hr-record-grid">{workspace.records.map((item) => <article key={item.id}><span>{item.type}</span><h3>{item.title}</h3><small>{item.period || formatDate(item.createdAt?.slice(0, 10))}</small><p>{item.content.slice(0, 220)}{item.content.length > 220 ? '…' : ''}</p><div><button type="button" onClick={() => setDraft({ ...EMPTY_RECORD, ...item })}>Mở</button><button type="button" onClick={() => exportRecord(item)}>TXT</button><button type="button" onClick={() => exportWord(item)}>Word</button><button type="button" onClick={() => exportPdf(item)}>PDF / In</button></div></article>)}</div> : <p className="hr-muted">Chưa có hồ sơ hoặc báo cáo.</p>}</section>
    </div>
  );
}

function AiImportTab({ workspace, onCommit, hasApiKey, language, jumpTo }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [instruction, setInstruction] = useState('Đọc file, tự nhận diện đây là danh sách học sinh, lịch công việc, dữ liệu điểm danh hay danh bạ phụ huynh; chuẩn hóa và trả về dữ liệu để nhập vào lớp chủ nhiệm.');
  const [sourceText, setSourceText] = useState('');
  const [preview, setPreview] = useState(AI_IMPORT_EMPTY);
  const [error, setError] = useState('');

  const analyze = async () => {
    setError('');
    if (!file && !safeText(sourceText)) { setError('Chọn file hoặc dán nội dung cần đọc.'); return; }
    if (!hasApiKey) { setError('Chưa cấu hình AI trong Cài đặt.'); return; }
    try {
      const extracted = file ? await readImportFile(file) : sourceText;
      if (!safeText(extracted)) throw new Error('Không đọc được nội dung văn bản trong file.');
      const compactSource = extracted.replace(/\u0000/g, '').slice(0, AI_IMPORT_SOURCE_LIMIT);
      const prompt = `Extract structured homeroom data from the source. Return one compact JSON object only.
Instruction: ${instruction}
Class: ${workspace.classProfile.className || 'unknown'} | School year: ${workspace.classProfile.schoolYear || 'unknown'} | Today: ${today()}

SOURCE:
${compactSource}

Required top-level keys: detectedType, summary, classProfile, students, schedule, attendance, parentContacts.
Allowed detectedType: student_roster|schedule|attendance|parent_contacts|mixed|unknown.
Student keys when present: code,fullName,birthDate,gender,phone,parentName,parentPhone,parentEmail,address,notes,supportLevel.
Schedule keys when present: title,date,startTime,endTime,location,category,audience,note,status.
Attendance keys: date,studentCode or studentName,status,reason.
Parent-contact keys when present: studentCode,studentName,date,channel,subject,message,outcome.
Rules: preserve every valid row; never invent data; use YYYY-MM-DD and HH:mm; normalize Vietnamese phone numbers; omit properties that are absent instead of repeating empty strings; keep summary under 60 Vietnamese words; output minified JSON without Markdown.`;
      const text = await callAI({ prompt, responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: AI_IMPORT_OUTPUT_BUDGET, loadingLabel: 'AI đang đọc và nhận diện dữ liệu chủ nhiệm…' });
      const result = extractJson(text);
      setPreview({ ...AI_IMPORT_EMPTY, ...result, students: Array.isArray(result.students) ? result.students : [], schedule: Array.isArray(result.schedule) ? result.schedule : [], attendance: Array.isArray(result.attendance) ? result.attendance : [], parentContacts: Array.isArray(result.parentContacts) ? result.parentContacts : [] });
    } catch (err) { setError(err?.message || 'Không thể phân tích file.'); }
  };

  const importAll = async () => {
    let next = normalizeHomeroomWorkspace(workspace);
    if (preview.classProfile) next = { ...next, classProfile: { ...next.classProfile, ...Object.fromEntries(Object.entries(preview.classProfile).filter(([, value]) => safeText(value))) } };
    if (preview.students.length) next = upsertStudents(next, preview.students.map((student) => ({ ...student, phone: normalizePhone(student.phone), parentPhone: normalizePhone(student.parentPhone) })));
    preview.schedule.forEach((item) => { try { next = addScheduleItem(next, item); } catch { /* skip invalid */ } });
    if (preview.attendance.length) {
      const attendance = { ...next.attendance };
      preview.attendance.forEach((item) => {
        const student = next.students.find((entry) => (item.studentCode && entry.code === item.studentCode) || entry.fullName.toLowerCase() === safeText(item.studentName).toLowerCase());
        if (!student || !item.date) return;
        attendance[item.date] = { ...(attendance[item.date] || {}), [student.id]: { status: item.status || 'present', reason: item.reason || '', note: '', markedAt: new Date().toISOString() } };
      });
      next = { ...next, attendance };
    }
    preview.parentContacts.forEach((item) => {
      const student = next.students.find((entry) => (item.studentCode && entry.code === item.studentCode) || entry.fullName.toLowerCase() === safeText(item.studentName).toLowerCase());
      try { next = addParentContact(next, { ...item, studentId: student?.id || '', date: item.date || today(), channel: item.channel || 'Khác', direction: 'Dữ liệu nhập từ file' }); } catch { /* skip */ }
    });
    await onCommit(next, `Đã nhập ${preview.students.length} học sinh, ${preview.schedule.length} lịch, ${preview.attendance.length} điểm danh và ${preview.parentContacts.length} liên hệ.`);
  };

  const total = preview.students.length + preview.schedule.length + preview.attendance.length + preview.parentContacts.length;
  return (
    <div className="hr-tab-stack">
      <section className="hr-panel hr-ai-import">
        <div className="hr-panel-head"><div><small>PDF · Word · Excel · CSV · TXT</small><h2>AI đọc file và nhập dữ liệu chủ nhiệm</h2></div><button type="button" className="primary" disabled={!hasApiKey} onClick={analyze}>AI phân tích file</button></div>
        <div className="hr-import-grid">
          <button type="button" className={`hr-file-drop ${file ? 'has-file' : ''}`} onClick={() => fileRef.current?.click()}><input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.html" hidden onChange={(event) => setFile(event.target.files?.[0] || null)} /><span>{file ? '✓' : '↑'}</span><b>{file?.name || 'Chọn file cần đọc'}</b><small>{file ? `${Math.ceil(file.size / 1024)} KB` : 'Hỗ trợ PDF, DOCX, XLSX, XLS, CSV, TXT'}</small></button>
          <div><label><span>Yêu cầu cho AI</span><textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} /></label><label><span>Hoặc dán nội dung trực tiếp</span><textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="Dán danh sách lớp, kế hoạch tuần, danh bạ phụ huynh…" /></label></div>
        </div>
        {error ? <p className="hr-error">{error}</p> : null}
      </section>

      {preview.detectedType || total ? <section className="hr-panel hr-ai-preview">
        <div className="hr-panel-head"><div><small>AI nhận diện: {preview.detectedType || 'mixed'}</small><h2>Xem trước dữ liệu</h2><p>{preview.summary}</p></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={() => setPreview(AI_IMPORT_EMPTY)}>Xóa kết quả</button><button type="button" className="primary" disabled={!total && !preview.classProfile} onClick={importAll}>Thêm tất cả vào lớp</button></div></div>
        <div className="hr-import-counts"><span><b>{preview.students.length}</b> học sinh</span><span><b>{preview.schedule.length}</b> lịch</span><span><b>{preview.attendance.length}</b> điểm danh</span><span><b>{preview.parentContacts.length}</b> liên hệ</span></div>
        {preview.students.length ? <div className="hr-preview-block"><h3>Học sinh</h3><div className="hr-preview-table"><table><thead><tr><th>Mã</th><th>Họ tên</th><th>Ngày sinh</th><th>Phụ huynh</th><th>SĐT</th></tr></thead><tbody>{preview.students.slice(0, 20).map((student, index) => <tr key={`${student.code}-${student.fullName}-${index}`}><td>{student.code}</td><td>{student.fullName}</td><td>{student.birthDate}</td><td>{student.parentName}</td><td>{student.parentPhone}</td></tr>)}</tbody></table>{preview.students.length > 20 ? <small>Và {preview.students.length - 20} học sinh khác…</small> : null}</div></div> : null}
        {preview.schedule.length ? <div className="hr-preview-block"><h3>Lịch công việc</h3><div className="hr-preview-cards">{preview.schedule.slice(0, 12).map((item, index) => <article key={`${item.title}-${index}`}><time>{item.date || 'Chưa rõ ngày'} {item.startTime}</time><b>{item.title}</b><small>{item.category} · {item.location}</small></article>)}</div></div> : null}
        {preview.attendance.length ? <div className="hr-preview-block"><h3>Dữ liệu điểm danh</h3><div className="hr-preview-cards">{preview.attendance.slice(0, 12).map((item, index) => <article key={`${item.date}-${item.studentName}-${index}`}><time>{item.date}</time><b>{item.studentName || item.studentCode}</b><small>{statusLabel(item.status, language)} · {item.reason}</small></article>)}</div></div> : null}
      </section> : null}

      <section className="hr-panel"><div className="hr-panel-head"><div><small>AI GVCN</small><h2>Tác vụ nhanh</h2></div></div><div className="hr-quick-grid ai-actions"><button type="button" onClick={() => { setInstruction('Đọc file và trích xuất đầy đủ danh sách học sinh cùng thông tin phụ huynh. Không bỏ sót dòng.'); fileRef.current?.click(); }}><span>♙</span><b>Nhập danh sách lớp</b><small>Excel, PDF, Word, CSV</small></button><button type="button" onClick={() => { setInstruction('Đọc kế hoạch và trích xuất tất cả mốc công việc vào lịch chủ nhiệm.'); fileRef.current?.click(); }}><span>◷</span><b>Nhập lịch công việc</b><small>Kế hoạch tuần / tháng</small></button><button type="button" onClick={() => jumpTo('meetings')}><span>☰</span><b>Tạo sinh hoạt lớp</b><small>Từ dữ liệu tuần</small></button><button type="button" onClick={() => jumpTo('records')}><span>▤</span><b>Tạo báo cáo</b><small>Tổng hợp dữ liệu thực</small></button></div></section>
    </div>
  );
}

export default function HomeroomWorkspace({ language = 'vi', currentUser, hasApiKey }) {
  const [workspaceId, setWorkspaceId] = useState(() => getCurrentHomeroomWorkspaceId(currentUser));
  const [workspace, setWorkspace] = useState(() => makeDefaultHomeroomWorkspace(currentUser));
  const [catalog, setCatalog] = useState([]);
  const [classDraft, setClassDraft] = useState(() => makeDefaultHomeroomWorkspace(currentUser).classProfile);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [syncState, setSyncState] = useState('local');

  const refreshCatalog = async () => {
    const result = await listHomeroomWorkspaces(currentUser);
    setCatalog(result.items || []);
    return result.items || [];
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadHomeroomWorkspace(currentUser, workspaceId).then((result) => {
      if (!alive) return;
      const loaded = normalizeHomeroomWorkspace(result.workspace, currentUser);
      setWorkspace(loaded);
      setClassDraft(loaded.classProfile);
      setSyncState(result.source === 'cloud' ? 'cloud' : result.offline ? 'local' : 'ready');
      setCurrentHomeroomWorkspaceId(currentUser, loaded.id);
      refreshCatalog();
      setLoading(false);
    });
    return () => { alive = false; };
  }, [currentUser?.id, currentUser?.email, workspaceId]);


  const flash = (text) => {
    setMessage(text);
    window.clearTimeout(window.__besHomeroomMsg);
    window.__besHomeroomMsg = window.setTimeout(() => setMessage(''), 3600);
  };

  const commit = async (next, successMessage = 'Đã lưu dữ liệu.') => {
    const normalized = prepareWorkspaceCommit(workspace, next, currentUser, successMessage);
    setWorkspace(normalized);
    saveLocalHomeroomWorkspace(normalized, currentUser);
    setSaving(true);
    const result = await saveHomeroomWorkspace(normalized, currentUser);
    setSaving(false);
    if (result.ok) {
      setWorkspace(result.workspace || normalized);
      setSyncState(result.offline ? 'local' : 'cloud');
      flash(successMessage);
    } else {
      setSyncState('local');
      flash(`${successMessage} Lưu cục bộ thành công; cloud chưa đồng bộ: ${result.message || 'unknown error'}`);
    }
    await refreshCatalog();
    return result;
  };

  const switchWorkspace = (id) => {
    if (!id || id === workspaceId) return;
    setCurrentHomeroomWorkspaceId(currentUser, id);
    setWorkspaceId(id);
    setActiveTab('overview');
  };
  const createWorkspace = async (input) => {
    const id = makeWorkspaceId(input.className, input.schoolYear);
    const result = await createHomeroomWorkspace(currentUser, { id, semester: input.semester, classProfile: { className: input.className, schoolYear: input.schoolYear, grade: input.grade, room: input.room, adviserName: currentUser?.name || currentUser?.email, adviserEmail: currentUser?.email || '' } });
    await refreshCatalog();
    if (result.ok) switchWorkspace(result.workspace.id);
  };
  const duplicateWorkspace = async (input) => {
    const id = makeWorkspaceId(input.className, input.schoolYear);
    const result = await duplicateHomeroomWorkspace(workspace, currentUser, { ...input, id });
    await refreshCatalog();
    if (result.ok) switchWorkspace(result.workspace.id);
  };
  const changeWorkspaceStatus = async (id, status) => {
    const targetResult = id === workspace.id ? { workspace } : await loadHomeroomWorkspace(currentUser, id);
    if (!targetResult.workspace) return;
    const result = await setHomeroomWorkspaceStatus(targetResult.workspace, currentUser, status);
    const items = await refreshCatalog();
    if (id === workspace.id && status === 'archived') {
      const fallback = items.find((item) => item.status !== 'archived' && item.id !== id);
      if (fallback) switchWorkspace(fallback.id);
    }
    flash(result.ok ? (status === 'archived' ? 'Đã lưu trữ lớp.' : 'Đã khôi phục lớp.') : result.message || 'Không thể cập nhật lớp.');
  };

  const saveClassProfile = () => commit({ ...workspace, classProfile: classDraft }, language === 'vi' ? 'Đã lưu thông tin lớp chủ nhiệm.' : 'Class profile saved.');
  const openAi = () => setActiveTab('ai');
  const className = workspace.classProfile.className || (language === 'vi' ? 'Chưa thiết lập lớp' : 'Class not configured');
  const activeStudents = workspace.students.filter((item) => item.active !== false).length;

  if (loading) return <div className="page hr-page bui-management" data-ui="management" data-management-app="homeroom"><section className="hr-panel hr-loading"><span /><h2>{language === 'vi' ? 'Đang mở không gian chủ nhiệm…' : 'Opening homeroom workspace…'}</h2></section></div>;

  return (
    <div className="page hr-page bui-management" data-ui="management" data-management-app="homeroom">
      <section className="hr-hero bui-management-header">
        <div className="hr-hero-copy">
          <p>{language === 'vi' ? 'HOMEROOM TEACHER WORKSPACE · PHASE 3.1' : 'HOMEROOM TEACHER WORKSPACE · PHASE 3.1'}</p>
          <h1>{language === 'vi' ? 'Giáo viên chủ nhiệm' : 'Homeroom Teacher'}</h1>
          <span>{className} · {workspace.classProfile.schoolYear || '—'} · {activeStudents} {language === 'vi' ? 'học sinh' : 'students'}</span>
        </div>
        <div className="hr-hero-art" aria-hidden="true"><div className="hr-board"><i /><i /><i /><b>{workspace.classProfile.className || 'GVCN'}</b></div><span className="hr-person p1" /><span className="hr-person p2" /><span className="hr-person p3" /></div>
        <aside className="hr-hero-meta"><span className={`hr-sync ${syncState}`}><i />{syncState === 'cloud' ? 'Đã đồng bộ Supabase' : 'Đang lưu trên thiết bị'}</span><b>{currentUser?.name || currentUser?.email}</b><small>{workspace.classProfile.adviserEmail || currentUser?.email}</small><button type="button" onClick={() => setActiveTab('ai')}>AI nhập dữ liệu</button></aside>
      </section>

      <Tabs active={activeTab} setActive={setActiveTab} language={language} currentUser={currentUser} />
      {message ? <div className="hr-toast"><span>✓</span>{message}</div> : null}
      {saving ? <div className="hr-saving-strip"><i />Đang đồng bộ dữ liệu lớp chủ nhiệm…</div> : null}

      {!workspace.classProfile.className || activeTab === 'overview' ? <ClassProfileEditor value={classDraft} onChange={setClassDraft} onSave={saveClassProfile} saving={saving} language={language} /> : null}

      <main className="hr-workspace-body">
        {activeTab === 'overview' ? <OverviewTab workspace={workspace} language={language} goTab={setActiveTab} /> : null}
        {activeTab === 'classes' ? <ClassLifecycleTab workspace={workspace} catalog={catalog} currentId={workspaceId} onSwitch={switchWorkspace} onCreate={createWorkspace} onDuplicate={duplicateWorkspace} onStatusChange={changeWorkspaceStatus} currentUser={currentUser} /> : null}
        {activeTab === 'search' ? <SearchCommandTab workspace={workspace} onCommit={commit} goTab={setActiveTab} /> : null}
        {activeTab === 'students' ? <StudentsTab workspace={workspace} onCommit={commit} language={language} openAi={openAi} hasApiKey={hasApiKey} /> : null}
        {activeTab === 'support' ? <StudentSupportTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
        {activeTab === 'attendance' ? <AttendanceTab workspace={workspace} onCommit={commit} language={language} currentUser={currentUser} /> : null}
        {activeTab === 'learning' ? <LearningAnalyticsTab workspace={workspace} onCommit={commit} hasApiKey={hasApiKey} currentUser={currentUser} /> : null}
        {activeTab === 'feedback' ? <SubjectFeedbackTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
        {activeTab === 'competition' ? <CompetitionTab workspace={workspace} onCommit={commit} /> : null}
        {activeTab === 'conduct' ? <HomeroomConductTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
        {activeTab === 'schedule' ? <ScheduleTab workspace={workspace} onCommit={commit} language={language} openAi={openAi} /> : null}
        {activeTab === 'meetings' ? <MeetingsTab workspace={workspace} onCommit={commit} hasApiKey={hasApiKey} language={language} /> : null}
        {activeTab === 'parents' ? <ParentsTab workspace={workspace} onCommit={commit} hasApiKey={hasApiKey} language={language} /> : null}
        {activeTab === 'announcements' ? <AnnouncementsTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
        {activeTab === 'portals' ? <PortalsTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
        {activeTab === 'records' ? <RecordsTab workspace={workspace} onCommit={commit} hasApiKey={hasApiKey} language={language} /> : null}
        {activeTab === 'safety' ? <DataSafetyTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
        {activeTab === 'ai' ? <AiImportTab workspace={workspace} onCommit={commit} hasApiKey={hasApiKey} language={language} jumpTo={setActiveTab} /> : null}
        {activeTab === 'schoolStats' ? <SchoolStatsTab currentUser={currentUser} /> : null}
      </main>
    </div>
  );
}
