import React, { useEffect, useMemo, useRef, useState } from 'react';
import DepartmentIcon from './DepartmentIcons.jsx';
import './DepartmentTeacherDirectory.css';

const ROLE_OPTIONS = ['TTCM', 'Tổ phó', 'Giáo viên', 'Giáo viên tập sự', 'Giáo viên thỉnh giảng'];
const STATUS_OPTIONS = ['Đang công tác', 'Nghỉ phép', 'Nghỉ thai sản', 'Tạm nghỉ', 'Chuyển tổ', 'Đã nghỉ việc'];
const EMPLOYMENT_OPTIONS = ['Chính thức', 'Hợp đồng', 'Thỉnh giảng', 'Tập sự'];
const DEGREE_OPTIONS = ['Tiến sĩ', 'Thạc sĩ', 'Cử nhân', 'Cao đẳng', 'Khác'];
const PROFILE_TABS = [
  ['overview', 'Tổng quan'],
  ['personal', 'Cá nhân'],
  ['employment', 'Công tác'],
  ['qualifications', 'Trình độ'],
  ['assignments', 'Phân công'],
  ['activities', 'Hoạt động'],
  ['work', 'Công việc'],
  ['documents', 'Hồ sơ'],
  ['history', 'Lịch sử'],
];

function uid() {
  try { return globalThis.crypto?.randomUUID?.() || `teacher-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  catch { return `teacher-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
}

function initials(value) {
  const parts = String(value || 'GV').trim().split(/\s+/).filter(Boolean);
  return parts.slice(-2).map((part) => part[0]?.toUpperCase()).join('') || 'GV';
}

function classToken(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function emptyTeacher(currentUser) {
  return {
    id: '', code: '', fullName: '', preferredName: '', avatar: '', birthDate: '', gender: '',
    emailSchool: '', emailPersonal: '', phone: '', address: '', emergencyContact: '', emergencyPhone: '',
    role: 'Giáo viên', position: 'Giáo viên', department: 'Tổ Tiếng Anh', employmentType: 'Chính thức',
    status: 'Đang công tác', startDate: '', joinDate: '', professionalTitle: '', teacherRank: '',
    yearsExperience: '', duties: '', highestDegree: 'Cử nhân', major: 'Ngôn ngữ Anh / Sư phạm Tiếng Anh',
    institution: '', graduationYear: '', degreeClassification: '', trainingMode: '', country: 'Việt Nam',
    certificatesText: '', assignmentsText: '', documentsText: '', privacyNote: '',
    linkedUserId: '', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '', auditTrail: [],
    ...(currentUser ? { emailSchool: currentUser.email || '', fullName: currentUser.name || '' } : {}),
  };
}

function normalizeTeacher(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    ...emptyTeacher(),
    ...source,
    id: source.id || uid(),
    fullName: String(source.fullName || source.name || '').trim(),
    emailSchool: String(source.emailSchool || source.email || '').trim(),
    auditTrail: Array.isArray(source.auditTrail) ? source.auditTrail : [],
  };
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(rows) {
  const headers = ['Mã giáo viên', 'Họ và tên', 'Vai trò', 'Trạng thái', 'Email trường', 'Số điện thoại', 'Trình độ', 'Chuyên ngành', 'Phân công'];
  const body = rows.map((teacher) => [teacher.code, teacher.fullName, teacher.role, teacher.status, teacher.emailSchool, teacher.phone, teacher.highestDegree, teacher.major, teacher.assignmentsText].map(csvEscape).join(','));
  const blob = new Blob(['\uFEFF', [headers.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'danh-sach-giao-vien-to-tieng-anh.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function Section({ title, children }) {
  return <section className="dtd-section"><h3>{title}</h3>{children}</section>;
}

function InfoGrid({ items, protectedView = false }) {
  return <dl className="dtd-info-grid">{items.map(([label, value, privacy]) => <div key={label} className={privacy ? `privacy-${privacy}` : ''}><dt>{label}{privacy ? <span>{privacy === 'secure' ? 'Bảo mật' : 'Nội bộ'}</span> : null}</dt><dd>{protectedView && privacy ? '••••••••' : (value || 'Chưa cập nhật')}</dd></div>)}</dl>;
}

function Lines({ value, empty = 'Chưa có dữ liệu.' }) {
  const lines = String(value || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return <div className="dtd-empty-inline">{empty}</div>;
  return <ul className="dtd-lines">{lines.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ul>;
}

export default function DepartmentTeacherDirectory({
  teachers = [], onChange, canManage = false, currentUser, globalQuery = '', createSignal = 0,
  activities = [], records = [], onNotify,
}) {
  const normalizedTeachers = useMemo(() => (Array.isArray(teachers) ? teachers : []).map(normalizeTeacher), [teachers]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [degreeFilter, setDegreeFilter] = useState('all');
  const [view, setView] = useState('table');
  const [selectedId, setSelectedId] = useState('');
  const [detailTab, setDetailTab] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(() => emptyTeacher(currentUser));
  const [editingId, setEditingId] = useState('');
  const importRef = useRef(null);
  const lastSignalRef = useRef(createSignal);

  useEffect(() => {
    if (createSignal && createSignal !== lastSignalRef.current && canManage) {
      lastSignalRef.current = createSignal;
      setEditingId('');
      setDraft(emptyTeacher());
      setDrawerOpen(true);
    }
  }, [createSignal, canManage]);

  const selected = normalizedTeachers.find((teacher) => String(teacher.id) === String(selectedId)) || null;
  const combinedQuery = `${globalQuery} ${query}`.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filtered = useMemo(() => normalizedTeachers.filter((teacher) => {
    if (roleFilter !== 'all' && teacher.role !== roleFilter) return false;
    if (statusFilter === 'active' && teacher.status !== 'Đang công tác') return false;
    if (statusFilter !== 'all' && statusFilter !== 'active' && teacher.status !== statusFilter) return false;
    if (degreeFilter !== 'all' && teacher.highestDegree !== degreeFilter) return false;
    if (!combinedQuery) return true;
    const haystack = [teacher.code, teacher.fullName, teacher.preferredName, teacher.role, teacher.position, teacher.emailSchool, teacher.phone, teacher.highestDegree, teacher.major, teacher.assignmentsText]
      .join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return combinedQuery.split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
  }), [normalizedTeachers, roleFilter, statusFilter, degreeFilter, combinedQuery]);

  const metrics = useMemo(() => ({
    active: normalizedTeachers.filter((teacher) => teacher.status === 'Đang công tác').length,
    managers: normalizedTeachers.filter((teacher) => ['TTCM', 'Tổ phó'].includes(teacher.role)).length,
    masters: normalizedTeachers.filter((teacher) => ['Thạc sĩ', 'Tiến sĩ'].includes(teacher.highestDegree)).length,
    incomplete: normalizedTeachers.filter((teacher) => !teacher.code || !teacher.emailSchool || !teacher.assignmentsText).length,
  }), [normalizedTeachers]);

  const isSelf = selected && [selected.emailSchool, selected.emailPersonal].filter(Boolean).some((email) => String(email).toLowerCase() === String(currentUser?.email || '').toLowerCase());
  const maySeeInternal = canManage || isSelf;
  const relatedActivities = selected ? activities.filter((item) => `${item.owner || ''} ${item.participants || ''}`.toLowerCase().includes((selected.emailSchool || selected.fullName).toLowerCase())) : [];
  const relatedRecords = selected ? records.filter((item) => `${item.owner || ''} ${item.createdBy || ''}`.toLowerCase().includes((selected.emailSchool || selected.fullName).toLowerCase())) : [];

  function emit(next, message) {
    onChange?.(next.map(normalizeTeacher));
    if (message) onNotify?.(message);
  }

  function openCreate(prefillCurrentUser = false) {
    setEditingId('');
    setDraft(emptyTeacher(prefillCurrentUser ? currentUser : null));
    setDrawerOpen(true);
  }

  function openEdit(teacher) {
    if (!teacher) return;
    setEditingId(teacher.id);
    setDraft(normalizeTeacher(teacher));
    setDrawerOpen(true);
  }

  function saveTeacher() {
    const fullName = String(draft.fullName || '').trim();
    const emailSchool = String(draft.emailSchool || '').trim();
    if (!fullName) return onNotify?.('Nhập họ và tên giáo viên.');
    const duplicate = normalizedTeachers.find((teacher) => teacher.id !== editingId && ((draft.code && teacher.code === draft.code) || (emailSchool && teacher.emailSchool.toLowerCase() === emailSchool.toLowerCase())));
    if (duplicate) return onNotify?.('Mã giáo viên hoặc email trường đã tồn tại.');
    const now = new Date().toISOString();
    const actor = currentUser?.email || currentUser?.name || 'Hệ thống';
    const previous = normalizedTeachers.find((teacher) => teacher.id === editingId);
    const auditEntry = { id: uid(), at: now, by: actor, action: previous ? 'Cập nhật hồ sơ' : 'Tạo hồ sơ' };
    const teacher = normalizeTeacher({
      ...draft,
      id: editingId || uid(),
      fullName,
      emailSchool,
      createdAt: previous?.createdAt || now,
      createdBy: previous?.createdBy || actor,
      updatedAt: now,
      updatedBy: actor,
      auditTrail: [...(previous?.auditTrail || draft.auditTrail || []), auditEntry],
    });
    const next = previous ? normalizedTeachers.map((item) => item.id === previous.id ? teacher : item) : [teacher, ...normalizedTeachers];
    emit(next, previous ? 'Đã cập nhật hồ sơ giáo viên.' : 'Đã thêm giáo viên vào tổ.');
    setSelectedId(teacher.id);
    setDrawerOpen(false);
  }

  function toggleArchive(teacher) {
    if (!teacher) return;
    const nextStatus = teacher.status === 'Đã nghỉ việc' ? 'Đang công tác' : 'Đã nghỉ việc';
    const now = new Date().toISOString();
    const actor = currentUser?.email || currentUser?.name || 'Hệ thống';
    emit(normalizedTeachers.map((item) => item.id === teacher.id ? {
      ...item, status: nextStatus, updatedAt: now, updatedBy: actor,
      auditTrail: [...(item.auditTrail || []), { id: uid(), at: now, by: actor, action: nextStatus === 'Đã nghỉ việc' ? 'Lưu trữ hồ sơ' : 'Khôi phục hồ sơ' }],
    } : item), nextStatus === 'Đã nghỉ việc' ? 'Đã lưu trữ hồ sơ giáo viên.' : 'Đã khôi phục hồ sơ giáo viên.');
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error('Tệp CSV chưa có dữ liệu.');
      const imported = lines.slice(1).map((line) => line.split(',').map((cell) => cell.replace(/^"|"$/g, '').trim())).filter((cells) => cells[1]).map((cells) => normalizeTeacher({
        code: cells[0], fullName: cells[1], role: cells[2] || 'Giáo viên', status: cells[3] || 'Đang công tác', emailSchool: cells[4], phone: cells[5], highestDegree: cells[6] || 'Cử nhân', major: cells[7], assignmentsText: cells.slice(8).join(','),
        createdAt: new Date().toISOString(), createdBy: currentUser?.email || currentUser?.name || 'CSV import',
      }));
      const used = new Set(normalizedTeachers.flatMap((teacher) => [teacher.code, teacher.emailSchool].filter(Boolean).map((value) => value.toLowerCase())));
      const unique = imported.filter((teacher) => {
        const keys = [teacher.code, teacher.emailSchool].filter(Boolean).map((value) => value.toLowerCase());
        if (keys.some((key) => used.has(key))) return false;
        keys.forEach((key) => used.add(key));
        return true;
      });
      emit([...unique, ...normalizedTeachers], `Đã nhập ${unique.length} giáo viên từ CSV.`);
    } catch (error) { onNotify?.(error.message || 'Không đọc được tệp CSV.'); }
  }

  function renderProfileContent() {
    if (!selected) return null;
    if (detailTab === 'overview') return <>
      <div className="dtd-profile-hero"><div className="dtd-avatar large">{selected.avatar ? <img src={selected.avatar} alt=""/> : initials(selected.fullName)}</div><div><h2>{selected.fullName}</h2><p>{selected.position || selected.role} · {selected.department}</p><div><span className={`dtd-badge role-${classToken(selected.role)}`}>{selected.role}</span><span className={`dtd-badge status-${classToken(selected.status)}`}>{selected.status}</span></div></div></div>
      <div className="dtd-profile-metrics"><article><strong>{relatedActivities.length}</strong><small>Hoạt động liên quan</small></article><article><strong>{relatedRecords.length}</strong><small>Hồ sơ liên quan</small></article><article><strong>{selected.yearsExperience || '—'}</strong><small>Năm kinh nghiệm</small></article><article><strong>{selected.highestDegree || '—'}</strong><small>Trình độ cao nhất</small></article></div>
      <Section title="Thông tin nhanh"><InfoGrid protectedView={!maySeeInternal} items={[["Mã giáo viên", selected.code], ["Email trường", selected.emailSchool], ["Số điện thoại", selected.phone, 'internal'], ["Ngày vào trường", formatDate(selected.joinDate)], ["Phân công", selected.assignmentsText], ["Nhiệm vụ kiêm nhiệm", selected.duties]]}/></Section>
    </>;
    if (detailTab === 'personal') return <Section title="Thông tin cá nhân"><InfoGrid protectedView={!maySeeInternal} items={[["Họ và tên", selected.fullName], ["Tên thường gọi", selected.preferredName], ["Ngày sinh", formatDate(selected.birthDate), 'internal'], ["Giới tính", selected.gender, 'internal'], ["Email cá nhân", selected.emailPersonal, 'internal'], ["Email trường", selected.emailSchool], ["Số điện thoại", selected.phone, 'internal'], ["Địa chỉ liên hệ", selected.address, 'secure'], ["Liên hệ khẩn cấp", selected.emergencyContact, 'secure'], ["SĐT khẩn cấp", selected.emergencyPhone, 'secure']]}/></Section>;
    if (detailTab === 'employment') return <Section title="Thông tin công tác"><InfoGrid items={[["Tổ chuyên môn", selected.department], ["Vai trò", selected.role], ["Chức vụ", selected.position], ["Loại hình công tác", selected.employmentType], ["Trạng thái", selected.status], ["Ngày bắt đầu công tác", formatDate(selected.startDate)], ["Ngày vào trường", formatDate(selected.joinDate)], ["Chức danh nghề nghiệp", selected.professionalTitle], ["Hạng giáo viên", selected.teacherRank], ["Thâm niên", selected.yearsExperience ? `${selected.yearsExperience} năm` : ''], ["Nhiệm vụ kiêm nhiệm", selected.duties]]}/></Section>;
    if (detailTab === 'qualifications') return <><Section title="Bằng cấp"><InfoGrid items={[["Trình độ cao nhất", selected.highestDegree], ["Chuyên ngành", selected.major], ["Cơ sở đào tạo", selected.institution], ["Năm tốt nghiệp", selected.graduationYear], ["Xếp loại", selected.degreeClassification], ["Hình thức đào tạo", selected.trainingMode], ["Quốc gia", selected.country]]}/></Section><Section title="Chứng chỉ"><Lines value={selected.certificatesText} empty="Chưa khai báo chứng chỉ hoặc minh chứng."/></Section></>;
    if (detailTab === 'assignments') return <Section title="Phân công giảng dạy"><Lines value={selected.assignmentsText} empty="Chưa có phân công cho năm học hiện tại."/></Section>;
    if (detailTab === 'activities') return <Section title="Hoạt động chuyên môn"><div className="dtd-related-list">{relatedActivities.map((item) => <article key={item.id}><span><DepartmentIcon name="calendar"/></span><div><strong>{item.title}</strong><small>{formatDate(item.date)} · {item.type}</small></div></article>)}{!relatedActivities.length ? <div className="dtd-empty-inline">Chưa có hoạt động được liên kết với giáo viên này.</div> : null}</div></Section>;
    if (detailTab === 'work') return <Section title="Công việc và sản phẩm"><div className="dtd-empty-state"><DepartmentIcon name="tasks" size={28}/><h3>Dữ liệu dùng chung Work Hub</h3><p>Công việc sẽ tự xuất hiện khi người được giao trùng email trường của giáo viên.</p><button type="button" onClick={() => { window.location.hash = '#/work-hub'; }}>Mở Trung tâm công việc</button></div></Section>;
    if (detailTab === 'documents') return <><Section title="Hồ sơ nhân sự"><Lines value={selected.documentsText} empty="Chưa có tài liệu nhân sự được khai báo."/></Section><Section title="Hồ sơ chuyên môn liên quan"><div className="dtd-related-list">{relatedRecords.map((item) => <article key={item.id}><span><DepartmentIcon name="file"/></span><div><strong>{item.title}</strong><small>{item.category} · {formatDate(item.date || item.createdAt)}</small></div></article>)}{!relatedRecords.length ? <div className="dtd-empty-inline">Chưa có hồ sơ chuyên môn liên quan.</div> : null}</div></Section></>;
    return <Section title="Lịch sử thay đổi"><div className="dtd-timeline">{[...(selected.auditTrail || [])].reverse().map((entry) => <article key={entry.id || `${entry.at}-${entry.action}`}><span/><div><strong>{entry.action}</strong><small>{entry.by || 'Hệ thống'} · {entry.at ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.at)) : ''}</small></div></article>)}{!selected.auditTrail?.length ? <div className="dtd-empty-inline">Chưa có lịch sử thay đổi.</div> : null}</div></Section>;
  }

  return <div className="dtd-page">
    <section className="dtd-heading"><div><p className="dwr-eyebrow">NHÂN SỰ TỔ CHUYÊN MÔN</p><h1>Danh sách giáo viên</h1><p>Quản lý hồ sơ nghề nghiệp, phân công, trình độ và lịch sử hoạt động của thành viên trong tổ.</p></div><div className="dtd-actions"><button type="button" onClick={() => downloadCsv(filtered)}><DepartmentIcon name="download"/>Xuất CSV</button>{canManage ? <><button type="button" onClick={() => importRef.current?.click()}><DepartmentIcon name="upload"/>Nhập CSV</button><button type="button" className="primary" onClick={() => openCreate(false)}><DepartmentIcon name="plus"/>Thêm giáo viên</button></> : null}</div></section>

    <section className="dtd-metrics"><article><span className="blue"><DepartmentIcon name="users"/></span><div><strong>{metrics.active}</strong><small>Đang công tác</small></div></article><article><span className="purple"><DepartmentIcon name="badge"/></span><div><strong>{metrics.managers}</strong><small>TTCM / Tổ phó</small></div></article><article><span className="green"><DepartmentIcon name="award"/></span><div><strong>{metrics.masters}</strong><small>Thạc sĩ / Tiến sĩ</small></div></article><article><span className="amber"><DepartmentIcon name="warning"/></span><div><strong>{metrics.incomplete}</strong><small>Hồ sơ chưa hoàn thiện</small></div></article></section>

    <section className="dtd-toolbar"><label className="dwr-search"><DepartmentIcon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, mã, email, phân công…"/></label><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">Tất cả vai trò</option>{ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="active">Đang công tác</option><option value="all">Tất cả trạng thái</option>{STATUS_OPTIONS.filter((status) => status !== 'Đang công tác').map((status) => <option key={status}>{status}</option>)}</select><select value={degreeFilter} onChange={(event) => setDegreeFilter(event.target.value)}><option value="all">Tất cả trình độ</option>{DEGREE_OPTIONS.map((degree) => <option key={degree}>{degree}</option>)}</select><div className="dtd-view-toggle"><button type="button" className={view === 'table' ? 'is-active' : ''} onClick={() => setView('table')}><DepartmentIcon name="list"/></button><button type="button" className={view === 'cards' ? 'is-active' : ''} onClick={() => setView('cards')}><DepartmentIcon name="grid"/></button></div></section>

    <section className={`dtd-layout${selected ? ' has-detail' : ''}`}>
      <div className="dtd-directory">
        {view === 'table' ? <div className="dtd-table-scroll"><table className="dtd-table"><thead><tr><th>Giáo viên</th><th>Vai trò</th><th>Phân công</th><th>Trình độ</th><th>Trạng thái</th><th/></tr></thead><tbody>{filtered.map((teacher) => <tr key={teacher.id} className={selectedId === teacher.id ? 'is-selected' : ''} onClick={() => { setSelectedId(teacher.id); setDetailTab('overview'); }}><td><div className="dtd-person-cell"><div className="dtd-avatar">{teacher.avatar ? <img src={teacher.avatar} alt=""/> : initials(teacher.fullName)}</div><div><strong>{teacher.fullName}</strong><small>{teacher.code || 'Chưa có mã'} · {teacher.emailSchool || 'Chưa có email'}</small></div></div></td><td><span className={`dtd-badge role-${classToken(teacher.role)}`}>{teacher.role}</span></td><td><strong className="dtd-clamp">{teacher.assignmentsText || 'Chưa phân công'}</strong></td><td>{teacher.highestDegree || 'Chưa cập nhật'}</td><td><span className={`dtd-badge status-${classToken(teacher.status)}`}>{teacher.status}</span></td><td><DepartmentIcon name="chevron"/></td></tr>)}</tbody></table></div> : <div className="dtd-card-grid">{filtered.map((teacher) => <button type="button" key={teacher.id} className={selectedId === teacher.id ? 'is-selected' : ''} onClick={() => { setSelectedId(teacher.id); setDetailTab('overview'); }}><div className="dtd-avatar large">{teacher.avatar ? <img src={teacher.avatar} alt=""/> : initials(teacher.fullName)}</div><h3>{teacher.fullName}</h3><p>{teacher.position || teacher.role}</p><span className={`dtd-badge status-${classToken(teacher.status)}`}>{teacher.status}</span><dl><div><dt>Phân công</dt><dd>{teacher.assignmentsText || 'Chưa cập nhật'}</dd></div><div><dt>Trình độ</dt><dd>{teacher.highestDegree}</dd></div></dl></button>)}</div>}
        {!filtered.length ? <div className="dtd-empty-state"><DepartmentIcon name="users" size={34}/><h3>Chưa có giáo viên phù hợp</h3><p>Thêm giáo viên mới, đồng bộ hồ sơ hiện tại hoặc thay đổi bộ lọc.</p>{canManage && !normalizedTeachers.length ? <button type="button" onClick={() => openCreate(true)}>Tạo hồ sơ từ tài khoản hiện tại</button> : null}</div> : null}
      </div>

      {selected ? <aside className="dtd-detail"><header><div><span><DepartmentIcon name="user"/></span><div><h2>Hồ sơ giáo viên</h2><p>{selected.code || selected.emailSchool || 'Chưa có mã hồ sơ'}</p></div></div><button type="button" className="dwr-icon-button" onClick={() => setSelectedId('')}><DepartmentIcon name="close"/></button></header><nav>{PROFILE_TABS.map(([key, label]) => <button type="button" key={key} className={detailTab === key ? 'is-active' : ''} onClick={() => setDetailTab(key)}>{label}</button>)}</nav><div className="dtd-detail-body">{renderProfileContent()}</div>{canManage ? <footer><button type="button" onClick={() => openEdit(selected)}><DepartmentIcon name="edit"/>Chỉnh sửa</button><button type="button" className={selected.status === 'Đã nghỉ việc' ? '' : 'danger'} onClick={() => toggleArchive(selected)}><DepartmentIcon name="archive"/>{selected.status === 'Đã nghỉ việc' ? 'Khôi phục' : 'Lưu trữ'}</button></footer> : null}</aside> : null}
    </section>

    <input ref={importRef} hidden type="file" accept=".csv,text/csv" onChange={importCsv}/>

    {drawerOpen ? <div className="dtd-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawerOpen(false); }}><aside className="dtd-drawer"><header><div><small>{editingId ? 'CẬP NHẬT HỒ SƠ' : 'THÊM THÀNH VIÊN'}</small><h2>{editingId ? 'Chỉnh sửa giáo viên' : 'Thêm giáo viên'}</h2></div><button type="button" className="dwr-icon-button" onClick={() => setDrawerOpen(false)}><DepartmentIcon name="close"/></button></header><div className="dtd-form">
      <Section title="Thông tin cơ bản"><div className="dtd-form-grid"><label><span>Họ và tên *</span><input autoFocus value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}/></label><label><span>Mã giáo viên</span><input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })}/></label><label><span>Tên thường gọi</span><input value={draft.preferredName} onChange={(event) => setDraft({ ...draft, preferredName: event.target.value })}/></label><label><span>Giới tính</span><select value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value })}><option value="">Chưa chọn</option><option>Nam</option><option>Nữ</option><option>Khác</option></select></label><label><span>Ngày sinh</span><input type="date" value={draft.birthDate} onChange={(event) => setDraft({ ...draft, birthDate: event.target.value })}/></label><label><span>Ảnh đại diện (URL)</span><input value={draft.avatar} onChange={(event) => setDraft({ ...draft, avatar: event.target.value })}/></label></div></Section>
      <Section title="Liên hệ"><div className="dtd-form-grid"><label><span>Email trường</span><input type="email" value={draft.emailSchool} onChange={(event) => setDraft({ ...draft, emailSchool: event.target.value })}/></label><label><span>Email cá nhân</span><input type="email" value={draft.emailPersonal} onChange={(event) => setDraft({ ...draft, emailPersonal: event.target.value })}/></label><label><span>Số điện thoại</span><input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })}/></label><label><span>Địa chỉ</span><input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })}/></label><label><span>Liên hệ khẩn cấp</span><input value={draft.emergencyContact} onChange={(event) => setDraft({ ...draft, emergencyContact: event.target.value })}/></label><label><span>SĐT khẩn cấp</span><input value={draft.emergencyPhone} onChange={(event) => setDraft({ ...draft, emergencyPhone: event.target.value })}/></label></div></Section>
      <Section title="Thông tin công tác"><div className="dtd-form-grid"><label><span>Vai trò</span><select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}>{ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}</select></label><label><span>Chức vụ</span><input value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value })}/></label><label><span>Loại hình công tác</span><select value={draft.employmentType} onChange={(event) => setDraft({ ...draft, employmentType: event.target.value })}>{EMPLOYMENT_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Trạng thái</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Ngày bắt đầu công tác</span><input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}/></label><label><span>Ngày vào trường</span><input type="date" value={draft.joinDate} onChange={(event) => setDraft({ ...draft, joinDate: event.target.value })}/></label><label><span>Chức danh nghề nghiệp</span><input value={draft.professionalTitle} onChange={(event) => setDraft({ ...draft, professionalTitle: event.target.value })}/></label><label><span>Hạng giáo viên</span><input value={draft.teacherRank} onChange={(event) => setDraft({ ...draft, teacherRank: event.target.value })}/></label><label><span>Số năm kinh nghiệm</span><input type="number" min="0" value={draft.yearsExperience} onChange={(event) => setDraft({ ...draft, yearsExperience: event.target.value })}/></label><label><span>Nhiệm vụ kiêm nhiệm</span><input value={draft.duties} onChange={(event) => setDraft({ ...draft, duties: event.target.value })}/></label></div></Section>
      <Section title="Trình độ"><div className="dtd-form-grid"><label><span>Trình độ cao nhất</span><select value={draft.highestDegree} onChange={(event) => setDraft({ ...draft, highestDegree: event.target.value })}>{DEGREE_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Chuyên ngành</span><input value={draft.major} onChange={(event) => setDraft({ ...draft, major: event.target.value })}/></label><label><span>Cơ sở đào tạo</span><input value={draft.institution} onChange={(event) => setDraft({ ...draft, institution: event.target.value })}/></label><label><span>Năm tốt nghiệp</span><input value={draft.graduationYear} onChange={(event) => setDraft({ ...draft, graduationYear: event.target.value })}/></label><label><span>Xếp loại</span><input value={draft.degreeClassification} onChange={(event) => setDraft({ ...draft, degreeClassification: event.target.value })}/></label><label><span>Quốc gia đào tạo</span><input value={draft.country} onChange={(event) => setDraft({ ...draft, country: event.target.value })}/></label></div><label><span>Chứng chỉ — mỗi chứng chỉ một dòng</span><textarea value={draft.certificatesText} onChange={(event) => setDraft({ ...draft, certificatesText: event.target.value })} placeholder="IELTS 7.5 — 2026 — British Council\nChứng chỉ CNTT cơ bản — 2025"/></label></Section>
      <Section title="Phân công và hồ sơ"><label><span>Phân công giảng dạy — mỗi nhiệm vụ một dòng</span><textarea value={draft.assignmentsText} onChange={(event) => setDraft({ ...draft, assignmentsText: event.target.value })} placeholder="Tiếng Anh 12.1 — 3 tiết/tuần\nGVCN lớp 12.1\nBồi dưỡng HSG khối 12"/></label><label><span>Hồ sơ / tài liệu nhân sự — mỗi mục một dòng</span><textarea value={draft.documentsText} onChange={(event) => setDraft({ ...draft, documentsText: event.target.value })}/></label><label><span>Ghi chú quyền riêng tư</span><textarea value={draft.privacyNote} onChange={(event) => setDraft({ ...draft, privacyNote: event.target.value })}/></label></Section>
    </div><footer><button type="button" onClick={() => setDrawerOpen(false)}>Hủy</button><button type="button" className="primary" onClick={saveTeacher}><DepartmentIcon name="check"/>{editingId ? 'Lưu thay đổi' : 'Thêm giáo viên'}</button></footer></aside></div> : null}
  </div>;
}
