import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LegacyPersonnelLookup from './PersonnelLookup.jsx';
import { listTeamTeacherAccounts, loadTeamWorkspace } from '../utils/personnelHub.js';
import {
  PERSONNEL_DIRECTORY_EVENT,
  cleanPersonnelRecord,
  createEmptyPersonnelDegree,
  emptyPersonnelRecord,
  listPersonnelDirectoryItems,
  reviewPersonnelProposal,
  saveApprovedPersonnelProfile,
  subscribePersonnelDirectory,
} from '../utils/personnelDirectoryCloud.js';
import '../styles/personnel-google-table-v2.css';

const DEGREE_LEVELS = [
  ['doctorate', 'Tiến sĩ', 'Doctorate'],
  ['doctoral_candidate', 'Nghiên cứu sinh', 'Doctoral candidate'],
  ['master', 'Thạc sĩ', "Master's"],
  ['bachelor', 'Cử nhân', "Bachelor's"],
  ['college', 'Cao đẳng', 'College diploma'],
];

const COPY = {
  vi: {
    total: 'Tổng giáo viên', missing: 'Thiếu hồ sơ', postgraduate: 'Thạc sĩ & Tiến sĩ', core: 'Cơ hữu', approved: 'Đã duyệt', pending: 'Chờ duyệt',
    teacherUnit: 'Giáo viên', notUpdated: 'Chưa cập nhật', search: 'Tìm theo tên, email, chuyên môn, phân công', all: 'Tất cả',
    masters: 'Thạc sĩ', doctorates: 'Tiến sĩ', filters: 'Bộ lọc', teacher: 'GIÁO VIÊN', role: 'CHỨC VỤ', professional: 'CHUYÊN MÔN',
    assignment: 'PHÂN CÔNG', profile: 'HỒ SƠ', approval: 'PHÊ DUYỆT', action: 'THAO TÁC', missingDegree: 'Chưa có bằng cấp',
    missingMajor: 'Chưa cập nhật chuyên ngành', missingInstitution: 'Chưa cập nhật cơ sở đào tạo', missingAssignment: 'Chưa phân công',
    active: 'Đang công tác', leave: 'Tạm nghỉ', inactive: 'Ngừng công tác', coreStaff: 'Cơ hữu', visiting: 'Thỉnh giảng',
    completed: 'Hoàn tất', incomplete: 'Thiếu hồ sơ', submitted: 'Chờ duyệt', changesRequested: 'Cần chỉnh sửa', notSubmitted: 'Chưa gửi',
    updated: 'Cập nhật', classes: 'lớp', periods: 'tiết/tuần', noPeriods: 'Chưa cập nhật số tiết', loading: 'Đang đồng bộ hồ sơ nhân sự…',
    noResults: 'Không tìm thấy nhân sự phù hợp.', show: 'Hiển thị', of: 'của', rowsPerPage: 'Hàng mỗi trang',
    edit: 'Cập nhật trực tiếp', close: 'Đóng', save: 'Lưu và duyệt', cancel: 'Hủy', profileTitle: 'Hồ sơ nhân sự',
    linkedAccount: 'Tài khoản giáo viên', degreeList: 'Danh sách văn bằng', addDegree: 'Thêm văn bằng', remove: 'Xóa', highest: 'Cao nhất',
    setHighest: 'Đặt làm trình độ cao nhất', degreeLevel: 'Trình độ', degreeName: 'Tên văn bằng', major: 'Chuyên ngành',
    specialization: 'Định hướng/chuyên sâu', institution: 'Cơ sở đào tạo', graduationYear: 'Năm tốt nghiệp', employment: 'Công tác và phân công',
    position: 'Chức vụ', department: 'Tổ chuyên môn', employmentType: 'Loại nhân sự', workStatus: 'Trạng thái', phone: 'Điện thoại',
    assignmentField: 'Phân công giảng dạy', otherDegrees: 'Chứng chỉ/văn bằng khác', proposal: 'Đề xuất của giáo viên', current: 'Đang áp dụng',
    proposed: 'Giáo viên đề xuất', approveProposal: 'Duyệt đề xuất', requestChanges: 'Yêu cầu chỉnh sửa', reviewNote: 'Phản hồi TTCM',
    saved: 'Đã cập nhật hồ sơ nhân sự.', approvedNotice: 'Đã duyệt đề xuất của giáo viên.', changesNotice: 'Đã yêu cầu giáo viên chỉnh sửa.',
    cloudError: 'Không thể đồng bộ dữ liệu nhân sự.', emptyDegrees: 'Chưa khai báo văn bằng.', selectLevel: 'Chọn trình độ',
    teacherRole: 'Giáo viên', headRole: 'TTCM', deputyRole: 'Tổ phó', details: 'Xem chi tiết', completion: 'Mức độ hoàn thiện',
  },
  en: {
    total: 'Total teachers', missing: 'Incomplete', postgraduate: 'Master & Doctorate', core: 'Core staff', approved: 'Approved', pending: 'Pending',
    teacherUnit: 'Teachers', notUpdated: 'Not updated', search: 'Search name, email, qualification or assignment', all: 'All',
    masters: "Master's", doctorates: 'Doctorate', filters: 'Filters', teacher: 'TEACHER', role: 'ROLE', professional: 'QUALIFICATION',
    assignment: 'ASSIGNMENT', profile: 'PROFILE', approval: 'APPROVAL', action: 'ACTION', missingDegree: 'No degree declared',
    missingMajor: 'Major not updated', missingInstitution: 'Institution not updated', missingAssignment: 'Not assigned',
    active: 'Active', leave: 'On leave', inactive: 'Inactive', coreStaff: 'Core staff', visiting: 'Visiting',
    completed: 'Complete', incomplete: 'Incomplete', submitted: 'Pending', changesRequested: 'Changes requested', notSubmitted: 'Not sent',
    updated: 'Updated', classes: 'classes', periods: 'periods/week', noPeriods: 'Weekly periods not updated', loading: 'Syncing personnel profiles…',
    noResults: 'No matching personnel found.', show: 'Showing', of: 'of', rowsPerPage: 'Rows per page',
    edit: 'Update directly', close: 'Close', save: 'Save and approve', cancel: 'Cancel', profileTitle: 'Personnel profile',
    linkedAccount: 'Linked teacher account', degreeList: 'Degree list', addDegree: 'Add degree', remove: 'Remove', highest: 'Highest',
    setHighest: 'Set as highest qualification', degreeLevel: 'Level', degreeName: 'Degree name', major: 'Major',
    specialization: 'Specialization', institution: 'Institution', graduationYear: 'Graduation year', employment: 'Employment and assignment',
    position: 'Position', department: 'Department', employmentType: 'Employment type', workStatus: 'Status', phone: 'Phone',
    assignmentField: 'Teaching assignment', otherDegrees: 'Other degrees/certificates', proposal: 'Teacher proposal', current: 'Current',
    proposed: 'Proposed', approveProposal: 'Approve proposal', requestChanges: 'Request changes', reviewNote: 'Leader feedback',
    saved: 'Personnel profile updated.', approvedNotice: 'Teacher proposal approved.', changesNotice: 'Revision requested.',
    cloudError: 'Personnel data could not be synced.', emptyDegrees: 'No degrees declared.', selectLevel: 'Select level',
    teacherRole: 'Teacher', headRole: 'Department head', deputyRole: 'Deputy head', details: 'View details', completion: 'Profile completion',
  },
};

const ICONS = {
  people: 'M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z',
  document: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm1 17H7v-2h8v2Zm2-4H7v-2h10v2Zm-4-6V3.5L18.5 9H13Z',
  school: 'M12 3 1 9l4 2.18v6L12 21l7-3.82v-6L21 10v7h2V9L12 3Zm0 2.18L18.74 9 12 12.82 5.26 9 12 5.18Z',
  work: 'M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2ZM10 4h4v2h-4V4Z',
  shield: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4Zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8Z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 11h5v-2h-4V6h-2v7h1Z',
  search: 'M9.5 3a6.5 6.5 0 1 0 3.98 11.64L19.85 21 21 19.85l-6.36-6.37A6.5 6.5 0 0 0 9.5 3Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z',
  filter: 'M3 5h18v2H3V5Zm4 6h10v2H7v-2Zm3 6h4v2h-4v-2Z',
  phone: 'M6.62 10.79a15.46 15.46 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z',
  more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2Zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2Zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2Z',
  close: 'M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.3-6.3 1.41 1.42Z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z',
};

function Icon({ name, size = 20 }) {
  return <svg className="pgt-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[name] || ICONS.people} /></svg>;
}

function isLeader(user) {
  return ['admin', 'department_head', 'department-head', 'ttcm', 'to_truong', 'tổ trưởng', 'department_leader', 'department leader', 'subject_leader', 'subject leader', 'leader']
    .includes(String(user?.role || '').trim().toLowerCase());
}

function initials(value) {
  return String(value || 'GV').trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase() || 'GV';
}

function degreeLabel(level, language) {
  const item = DEGREE_LEVELS.find(([id]) => id === level);
  return item ? item[language === 'en' ? 2 : 1] : '';
}

function roleLabel(role, t) {
  if (role === 'head') return t.headRole;
  if (role === 'deputy') return t.deputyRole;
  return t.teacherRole;
}

function workStatusLabel(status, t) {
  if (status === 'leave') return t.leave;
  if (status === 'inactive') return t.inactive;
  return t.active;
}

function employmentLabel(type, t) {
  return type === 'visiting' ? t.visiting : t.coreStaff;
}

function approvalMeta(status, t) {
  if (status === 'approved') return { label: t.approved, tone: 'approved' };
  if (status === 'submitted') return { label: t.submitted, tone: 'pending' };
  if (status === 'changes_requested') return { label: t.changesRequested, tone: 'changes' };
  return { label: t.notSubmitted, tone: 'draft' };
}

function parseClasses(value) {
  return [...new Set(String(value || '').split(/[;,·\n]+/).map((item) => item.trim()).filter((item) => /\d/.test(item)))];
}

function formatDate(value, language) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function profileCompletion(person) {
  let value = 0;
  if (person.phone) value += 25;
  if (person.position && person.department && person.employmentType && person.employmentStatus) value += 25;
  if (person.degrees?.length && person.major && person.institution) value += 25;
  if (person.assignment) value += 25;
  return value;
}

function mergeAccounts(accounts, currentUser) {
  const map = new Map();
  [...(accounts || []), currentUser].filter(Boolean).forEach((account) => {
    const id = String(account.id || account.authId || account.email || '').trim();
    if (!id || account.approved === false) return;
    map.set(id, {
      ...account,
      id,
      name: account.name || account.full_name || account.email?.split('@')?.[0] || 'Giáo viên',
      avatarUrl: account.avatarUrl || account.avatar_url || '',
    });
  });
  return [...map.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
}

function ProgressRing({ value }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return <span className={`pgt-progress-ring is-${safe === 100 ? 'complete' : safe >= 50 ? 'partial' : 'missing'}`} style={{ '--pgt-progress': `${safe * 3.6}deg` }}><b>{safe}%</b></span>;
}

function DegreeEditor({ draft, setDraft, language, t }) {
  const degrees = Array.isArray(draft?.degrees) ? draft.degrees : [];
  const setDegrees = (next) => setDraft((current) => ({ ...current, degrees: next }));
  const update = (index, patch) => setDegrees(degrees.map((degree, itemIndex) => itemIndex === index ? { ...degree, ...patch } : degree));
  const add = () => {
    const next = createEmptyPersonnelDegree(degrees.length);
    next.isHighest = degrees.length === 0;
    setDegrees([...degrees, next]);
  };
  const remove = (index) => {
    const removedHighest = degrees[index]?.isHighest;
    const next = degrees.filter((_, itemIndex) => itemIndex !== index);
    if (removedHighest && next.length) next[0] = { ...next[0], isHighest: true };
    setDegrees(next);
  };
  const setHighest = (index) => setDegrees(degrees.map((degree, itemIndex) => ({ ...degree, isHighest: itemIndex === index })));

  return <div className="pgt-degree-editor">
    <div className="pgt-degree-editor-head"><div><strong>{t.degreeList}</strong><span>{degrees.length}</span></div><button type="button" onClick={add}><Icon name="add" size={18} />{t.addDegree}</button></div>
    {!degrees.length ? <div className="pgt-empty-degree">{t.emptyDegrees}</div> : degrees.map((degree, index) => <article className={`pgt-degree-card${degree.isHighest ? ' is-highest' : ''}`} key={degree.id || index}>
      <header><div><b>{index + 1}</b><strong>{degreeLabel(degree.level, language) || `${t.degreeList} ${index + 1}`}</strong>{degree.isHighest ? <em>{t.highest}</em> : null}</div><button type="button" onClick={() => remove(index)}>{t.remove}</button></header>
      <div className="pgt-form-grid">
        <label><span>{t.degreeLevel}</span><select value={degree.level || ''} onChange={(event) => update(index, { level: event.target.value })}><option value="">{t.selectLevel}</option>{DEGREE_LEVELS.map(([id, vi, en]) => <option key={id} value={id}>{language === 'en' ? en : vi}</option>)}</select></label>
        <label><span>{t.degreeName}</span><input value={degree.degreeName || ''} onChange={(event) => update(index, { degreeName: event.target.value })} /></label>
        <label className="is-wide"><span>{t.major}</span><input value={degree.major || ''} onChange={(event) => update(index, { major: event.target.value })} /></label>
        <label className="is-wide"><span>{t.specialization}</span><input value={degree.specialization || ''} onChange={(event) => update(index, { specialization: event.target.value })} /></label>
        <label className="is-wide"><span>{t.institution}</span><input value={degree.institution || ''} onChange={(event) => update(index, { institution: event.target.value })} /></label>
        <label><span>{t.graduationYear}</span><input inputMode="numeric" maxLength={4} value={degree.graduationYear || ''} onChange={(event) => update(index, { graduationYear: event.target.value.replace(/[^0-9]/g, '').slice(0, 4) })} /></label>
        <label className="pgt-radio"><input type="radio" name="pgt-highest-degree" checked={Boolean(degree.isHighest)} onChange={() => setHighest(index)} /><span>{t.setHighest}</span></label>
      </div>
    </article>)}
  </div>;
}

function LeaderPersonnelTable({ currentUser, language }) {
  const t = COPY[language] || COPY.vi;
  const [accounts, setAccounts] = useState([]);
  const [items, setItems] = useState([]);
  const [memberMap, setMemberMap] = useState(new Map());
  const [departmentName, setDepartmentName] = useState(language === 'en' ? 'English Department' : 'Tổ Tiếng Anh');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const [nextAccounts, cloud, workspaceResult] = await Promise.all([
        listTeamTeacherAccounts(currentUser),
        listPersonnelDirectoryItems(),
        loadTeamWorkspace(currentUser),
      ]);
      setAccounts(mergeAccounts(nextAccounts, currentUser));
      setItems(cloud.items || []);
      if (cloud.error) setError(cloud.error);
      const workspace = workspaceResult?.workspace;
      const department = workspace?.departments?.find((item) => item.id === workspace.activeDepartmentId) || workspace?.departments?.[0];
      if (department?.shortName || department?.name) setDepartmentName(department.shortName || department.name);
      setMemberMap(new Map((department?.members || []).map((member) => [String(member.teacherAccountId), member])));
    } catch (reason) {
      setError(reason?.message || t.cloudError);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [currentUser?.id, currentUser?.email, currentUser?.role, language]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const refresh = () => load({ quiet: true });
    const unsubscribe = subscribePersonnelDirectory(refresh);
    window.addEventListener(PERSONNEL_DIRECTORY_EVENT, refresh);
    return () => { unsubscribe?.(); window.removeEventListener(PERSONNEL_DIRECTORY_EVENT, refresh); };
  }, [load]);

  const itemMap = useMemo(() => new Map(items.map((item) => [String(item.profileUserId), item])), [items]);
  const people = useMemo(() => accounts.map((account) => {
    const item = itemMap.get(String(account.id)) || null;
    const member = memberMap.get(String(account.id)) || null;
    const approved = item?.approvedProfile || null;
    const fallback = emptyPersonnelRecord({
      position: roleLabel(member?.role || (isLeader(account) ? 'head' : 'teacher'), t),
      department: departmentName,
    });
    const record = approved || fallback;
    const degrees = Array.isArray(record.degrees) ? record.degrees : [];
    const highest = degrees.find((degree) => degree.isHighest) || degrees[0] || null;
    const assignment = record.assignment || (member?.teachingClasses || []).join(', ');
    const classes = member?.teachingClasses?.length ? member.teachingClasses : parseClasses(assignment);
    const role = member?.role || (isLeader(account) ? 'head' : 'teacher');
    const person = {
      ...record,
      id: account.id,
      name: account.name,
      email: account.email,
      avatarUrl: account.avatarUrl,
      role,
      position: record.position || roleLabel(role, t),
      department: record.department || departmentName,
      employmentType: record.employmentType || member?.employmentType || 'core',
      employmentStatus: record.employmentStatus || member?.status || 'active',
      phone: record.phone || member?.phone || '',
      assignment,
      classes,
      weeklyPeriods: Number(member?.weeklyPeriods || 0),
      homeroomClass: member?.homeroomClass || '',
      additionalDuties: member?.additionalDuties || '',
      degrees,
      degreeLevel: highest?.level || '',
      degreeName: highest?.degreeName || '',
      major: highest?.major || '',
      specialization: highest?.specialization || '',
      institution: highest?.institution || '',
      graduationYear: highest?.graduationYear || '',
      item,
      workflowStatus: item?.status || 'draft',
      updatedAt: item?.updated_at || approved?.updatedAt || account.createdAt || '',
      proposedProfile: item?.proposedProfile || null,
      proposalNote: item?.proposalNote || '',
      reviewNote: item?.reviewNote || '',
    };
    return { ...person, completion: profileCompletion(person) };
  }), [accounts, itemMap, memberMap, departmentName, language]);

  const stats = useMemo(() => ({
    total: people.length,
    missing: people.filter((person) => person.completion < 100).length,
    postgraduate: people.filter((person) => person.degrees.some((degree) => ['master', 'doctorate', 'doctoral_candidate'].includes(degree.level))).length,
    core: people.filter((person) => person.employmentType !== 'visiting').length,
    approved: people.filter((person) => person.workflowStatus === 'approved').length,
    pending: people.filter((person) => person.workflowStatus === 'submitted').length,
  }), [people]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(language === 'en' ? 'en' : 'vi');
    return people.filter((person) => {
      const matchesFilter = filter === 'all'
        || (filter === 'missing' && person.completion < 100)
        || (filter === 'pending' && person.workflowStatus === 'submitted')
        || (filter === 'master' && person.degrees.some((degree) => degree.level === 'master'))
        || (filter === 'doctorate' && person.degrees.some((degree) => degree.level === 'doctorate'))
        || (filter === 'core' && person.employmentType !== 'visiting');
      if (!matchesFilter) return false;
      if (!needle) return true;
      return [person.name, person.email, person.phone, person.position, person.department, person.assignment, person.major, person.institution, person.degreeName]
        .join(' ').toLocaleLowerCase(language === 'en' ? 'en' : 'vi').includes(needle);
    });
  }, [people, query, filter, language]);

  useEffect(() => { setPage(1); }, [query, filter, pageSize]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selected = people.find((person) => person.id === selectedId) || null;

  const open = (person) => {
    setSelectedId(person.id);
    setEditing(false);
    setDraft(null);
    setNotice('');
    setReviewNote(person.reviewNote || '');
  };

  const startEdit = () => {
    if (!selected) return;
    setDraft(cleanPersonnelRecord({
      ...(selected.item?.approvedProfile || selected),
      phone: selected.phone,
      assignment: selected.assignment,
      department: selected.department,
      position: selected.position,
      employmentType: selected.employmentType,
      employmentStatus: selected.employmentStatus,
    }));
    setEditing(true);
    setNotice('');
  };

  const save = async (event) => {
    event.preventDefault();
    if (!selected || !draft || busy) return;
    setBusy(true);
    const result = await saveApprovedPersonnelProfile({ currentUser, targetUser: selected, record: cleanPersonnelRecord(draft), existingItem: selected.item });
    setBusy(false);
    if (!result.ok) { setError(result.message || t.cloudError); return; }
    setItems((current) => [result.item, ...current.filter((item) => item.profileUserId !== result.item.profileUserId)]);
    setEditing(false);
    setDraft(null);
    setNotice(t.saved);
  };

  const review = async (decision) => {
    if (!selected?.item || busy) return;
    setBusy(true);
    const result = await reviewPersonnelProposal({ currentUser, targetUser: selected, existingItem: selected.item, decision, reviewNote });
    setBusy(false);
    if (!result.ok) { setError(result.message || t.cloudError); return; }
    setItems((current) => [result.item, ...current.filter((item) => item.profileUserId !== result.item.profileUserId)]);
    setNotice(decision === 'approve' ? t.approvedNotice : t.changesNotice);
  };

  const metrics = [
    ['people', t.total, stats.total, t.teacherUnit, 'blue'],
    ['document', t.missing, stats.missing, t.notUpdated, 'amber'],
    ['school', t.postgraduate, stats.postgraduate, stats.total ? `${Math.round((stats.postgraduate / stats.total) * 1000) / 10}%` : '0%', 'purple'],
    ['work', t.core, stats.core, stats.total ? `${Math.round((stats.core / stats.total) * 1000) / 10}%` : '0%', 'blue'],
    ['shield', t.approved, stats.approved, stats.total ? `${Math.round((stats.approved / stats.total) * 1000) / 10}%` : '0%', 'green'],
    ['clock', t.pending, stats.pending, stats.total ? `${Math.round((stats.pending / stats.total) * 1000) / 10}%` : '0%', 'purple'],
  ];
  const filters = [
    ['all', t.all, stats.total], ['missing', t.missing, stats.missing], ['pending', t.pending, stats.pending],
    ['master', t.masters, people.filter((person) => person.degrees.some((degree) => degree.level === 'master')).length],
    ['doctorate', t.doctorates, people.filter((person) => person.degrees.some((degree) => degree.level === 'doctorate')).length],
    ['core', t.core, stats.core],
  ];

  return <article className="pgt-root" id="dashboard-personnel-v2">
    <section className="pgt-metrics" aria-label={t.total}>{metrics.map(([icon, label, value, detail, tone]) => <button type="button" className={`pgt-metric is-${tone}`} key={label} onClick={() => setFilter(label === t.missing ? 'missing' : label === t.pending ? 'pending' : 'all')}><span><Icon name={icon} size={22} /></span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></button>)}</section>
    <section className="pgt-table-card">
      <div className="pgt-toolbar">
        <label className="pgt-search"><Icon name="search" size={21} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />{query ? <button type="button" onClick={() => setQuery('')}><Icon name="close" size={17} /></button> : null}</label>
        <div className="pgt-filter-chips">{filters.map(([id, label, count]) => <button type="button" key={id} className={`is-${id}${filter === id ? ' is-active' : ''}`} onClick={() => setFilter(id)}><span>{label}</span><b>{count}</b></button>)}</div>
        <button type="button" className="pgt-filter-button"><Icon name="filter" size={20} />{t.filters}</button>
      </div>
      {error ? <div className="pgt-alert">{error}<button type="button" onClick={() => load()}>{t.notUpdated}</button></div> : null}
      <div className="pgt-table-head"><span /><span>{t.teacher}</span><span>{t.role}</span><span>{t.professional}</span><span>{t.assignment}</span><span>{t.profile}</span><span>{t.approval}</span><span>{t.action}</span></div>
      <div className="pgt-table" aria-live="polite">
        {loading && !people.length ? <div className="pgt-empty">{t.loading}</div> : null}
        {!loading && !visible.length ? <div className="pgt-empty">{t.noResults}</div> : null}
        {visible.map((person) => {
          const approval = approvalMeta(person.workflowStatus, t);
          const completed = person.completion === 100;
          return <button type="button" className={`pgt-row${selectedId === person.id ? ' is-selected' : ''}${person.workflowStatus === 'submitted' ? ' has-pending' : ''}`} key={person.id} onClick={() => open(person)}>
            <span className={`pgt-checkbox${selectedId === person.id ? ' is-checked' : ''}`}>{selectedId === person.id ? <Icon name="check" size={15} /> : null}</span>
            <span className="pgt-person-cell"><span className="pgt-avatar">{person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : initials(person.name)}</span><span><strong>{person.name}{person.role === 'head' ? <em className="pgt-mini-chip purple">{t.headRole}</em> : null}</strong><small>{person.email}</small><small className="pgt-phone"><Icon name="phone" size={15} />{person.phone || t.notUpdated}</small></span></span>
            <span className="pgt-role-cell"><strong>{person.position || roleLabel(person.role, t)}</strong><em className="pgt-mini-chip blue">{employmentLabel(person.employmentType, t)}</em><em className={`pgt-mini-chip ${person.employmentStatus === 'active' ? 'green' : 'amber'}`}>{workStatusLabel(person.employmentStatus, t)}</em></span>
            <span className={`pgt-professional-cell${person.degrees.length ? '' : ' is-missing'}`}><span><strong>{person.degreeLevel ? degreeLabel(person.degreeLevel, language) : t.missingDegree}</strong><b className={`pgt-count-chip${person.degrees.length ? ' has-data' : ''}`}>{person.degrees.length}</b></span><small>{person.major || t.missingMajor}</small><small>{[person.institution, person.graduationYear].filter(Boolean).join(' · ') || t.missingInstitution}</small></span>
            <span className="pgt-assignment-cell"><span><strong>{person.assignment || person.department}</strong><b className="pgt-count-chip has-data">{person.classes.length} {t.classes}</b></span><small>{person.department}</small><small>{person.weeklyPeriods ? `${person.weeklyPeriods} ${t.periods}` : t.noPeriods}</small></span>
            <span className="pgt-profile-cell"><span><ProgressRing value={person.completion} /><em className={`pgt-completion-chip is-${completed ? 'complete' : 'missing'}`}>{completed ? t.completed : t.incomplete}</em></span><small>{t.updated}: {formatDate(person.updatedAt, language)}</small></span>
            <span className="pgt-approval-cell"><em className={`pgt-approval-chip is-${approval.tone}`}>{approval.tone === 'approved' ? <Icon name="check" size={15} /> : null}{approval.label}</em></span>
            <span className="pgt-action-cell" title={t.details}><Icon name="more" size={21} /></span>
          </button>;
        })}
      </div>
      <footer className="pgt-pagination"><span>{t.show} {filtered.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filtered.length)} {t.of} {filtered.length} {t.teacherUnit.toLowerCase()}</span><label>{t.rowsPerPage}<select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><div><button type="button" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button><b>{safePage}</b><button type="button" disabled={safePage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>›</button></div></footer>
    </section>
    {selected ? <div className="pgt-drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(''); }}><aside className="pgt-drawer" role="dialog" aria-modal="true" aria-label={t.profileTitle}>
      <header className="pgt-drawer-head"><button type="button" onClick={() => setSelectedId('')}><Icon name="close" size={22} /></button><span>{t.profileTitle}</span>{!editing ? <button type="button" className="pgt-edit-button" onClick={startEdit}>{t.edit}</button> : <span />}</header>
      <div className="pgt-profile-hero"><span className="pgt-avatar large">{selected.avatarUrl ? <img src={selected.avatarUrl} alt="" /> : initials(selected.name)}</span><div><h3>{selected.name}</h3><p>{selected.email}</p><em className={`pgt-approval-chip is-${approvalMeta(selected.workflowStatus, t).tone}`}>{approvalMeta(selected.workflowStatus, t).label}</em></div></div>
      {notice ? <div className="pgt-notice"><Icon name="check" size={18} />{notice}</div> : null}
      {editing && draft ? <form className="pgt-drawer-form" onSubmit={save}>
        <section><h4><Icon name="school" size={19} />{t.degreeList}</h4><DegreeEditor draft={draft} setDraft={setDraft} language={language} t={t} /><label className="is-wide"><span>{t.otherDegrees}</span><textarea rows={3} value={draft.otherDegrees || ''} onChange={(event) => setDraft({ ...draft, otherDegrees: event.target.value })} /></label></section>
        <section><h4><Icon name="work" size={19} />{t.employment}</h4><div className="pgt-form-grid">
          <label><span>{t.position}</span><input value={draft.position || ''} onChange={(event) => setDraft({ ...draft, position: event.target.value })} /></label>
          <label><span>{t.department}</span><input value={draft.department || ''} onChange={(event) => setDraft({ ...draft, department: event.target.value })} /></label>
          <label><span>{t.employmentType}</span><select value={draft.employmentType || 'core'} onChange={(event) => setDraft({ ...draft, employmentType: event.target.value })}><option value="core">{t.coreStaff}</option><option value="visiting">{t.visiting}</option></select></label>
          <label><span>{t.workStatus}</span><select value={draft.employmentStatus || 'active'} onChange={(event) => setDraft({ ...draft, employmentStatus: event.target.value })}><option value="active">{t.active}</option><option value="leave">{t.leave}</option><option value="inactive">{t.inactive}</option></select></label>
          <label className="is-wide"><span>{t.assignmentField}</span><input value={draft.assignment || ''} onChange={(event) => setDraft({ ...draft, assignment: event.target.value })} /></label>
          <label className="is-wide"><span>{t.phone}</span><input value={draft.phone || ''} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
        </div></section>
        <div className="pgt-form-actions"><button type="button" onClick={() => { setEditing(false); setDraft(null); }}>{t.cancel}</button><button type="submit" disabled={busy}><Icon name="check" size={18} />{busy ? t.loading : t.save}</button></div>
      </form> : <div className="pgt-profile-view">
        <section><h4><Icon name="people" size={19} />{t.linkedAccount}</h4><dl><div><dt>Email</dt><dd>{selected.email}</dd></div><div><dt>{t.phone}</dt><dd>{selected.phone || '—'}</dd></div><div><dt>{t.completion}</dt><dd>{selected.completion}%</dd></div></dl></section>
        <section><h4><Icon name="school" size={19} />{t.degreeList}<span>{selected.degrees.length}</span></h4>{selected.degrees.length ? <div className="pgt-degree-view-list">{selected.degrees.map((degree, index) => <article key={degree.id || index}><header><strong>{degreeLabel(degree.level, language) || t.notUpdated}{degree.degreeName ? ` · ${degree.degreeName}` : ''}</strong>{degree.isHighest ? <em>{t.highest}</em> : null}</header><p>{degree.major || t.missingMajor}</p><small>{[degree.institution, degree.graduationYear].filter(Boolean).join(' · ') || t.missingInstitution}</small></article>)}</div> : <div className="pgt-empty-degree">{t.emptyDegrees}</div>}</section>
        <section><h4><Icon name="work" size={19} />{t.employment}</h4><dl><div><dt>{t.position}</dt><dd>{selected.position}</dd></div><div><dt>{t.department}</dt><dd>{selected.department}</dd></div><div><dt>{t.assignmentField}</dt><dd>{selected.assignment || '—'}</dd></div><div><dt>{t.workStatus}</dt><dd>{workStatusLabel(selected.employmentStatus, t)}</dd></div></dl></section>
        {selected.proposedProfile ? <section className="pgt-proposal"><h4><Icon name="clock" size={19} />{t.proposal}</h4>{selected.proposalNote ? <p>{selected.proposalNote}</p> : null}<div className="pgt-compare"><div><small>{t.current}</small><strong>{selected.major || t.notUpdated}</strong><span>{selected.assignment || t.missingAssignment}</span><span>{selected.degrees.length} {t.degreeList.toLowerCase()}</span></div><div><small>{t.proposed}</small><strong>{selected.proposedProfile.major || t.notUpdated}</strong><span>{selected.proposedProfile.assignment || t.missingAssignment}</span><span>{selected.proposedProfile.degrees?.length || 0} {t.degreeList.toLowerCase()}</span></div></div><label><span>{t.reviewNote}</span><textarea rows={3} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></label>{selected.workflowStatus === 'submitted' ? <div className="pgt-review-actions"><button type="button" disabled={busy} onClick={() => review('changes')}>{t.requestChanges}</button><button type="button" disabled={busy} onClick={() => review('approve')}><Icon name="check" size={17} />{t.approveProposal}</button></div> : null}</section> : null}
      </div>}
    </aside></div> : null}
  </article>;
}

export default function PersonnelLookupGoogleV2({ currentUser, language = 'vi' }) {
  if (!isLeader(currentUser)) return <LegacyPersonnelLookup currentUser={currentUser} language={language} />;
  return <LeaderPersonnelTable currentUser={currentUser} language={language} />;
}
