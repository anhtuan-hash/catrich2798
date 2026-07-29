import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getUsers, USERS_EVENT } from '../utils/auth.js';
import '../styles/personnel-lookup-google.css';

const STORAGE_KEY = 'bes-personnel-directory-v1';

const DEGREE_LEVELS = [
  { id: 'doctorate', vi: 'Tiến sĩ', en: 'Doctorate', rank: 5 },
  { id: 'doctoral_candidate', vi: 'Nghiên cứu sinh', en: 'Doctoral candidate', rank: 4 },
  { id: 'master', vi: 'Thạc sĩ', en: "Master's", rank: 3 },
  { id: 'bachelor', vi: 'Cử nhân', en: "Bachelor's", rank: 2 },
  { id: 'college', vi: 'Cao đẳng', en: 'College diploma', rank: 1 },
];

const COPY = {
  vi: {
    eyebrow: 'Tổ Tiếng Anh', title: 'Tra cứu thông tin nhân sự', subtitle: 'Tài khoản giáo viên, phân công và trình độ chuyên môn trong một bảng tra cứu nhanh.',
    search: 'Tìm theo tên, email, chuyên ngành hoặc phân công', total: 'Tổng nhân sự', postgraduate: 'Sau đại học', masters: 'Thạc sĩ', incomplete: 'Thiếu hồ sơ',
    all: 'Tất cả', doctorate: 'Tiến sĩ', doctoral_candidate: 'Nghiên cứu sinh', master: 'Thạc sĩ', bachelor: 'Cử nhân', missing: 'Chưa cập nhật',
    teacher: 'Giáo viên', position: 'Chức vụ', qualification: 'Trình độ chuyên môn', assignment: 'Phân công', status: 'Trạng thái',
    active: 'Đang công tác', leave: 'Tạm nghỉ', inactive: 'Ngừng công tác', core: 'Cơ hữu', visiting: 'Thỉnh giảng',
    noQualification: 'Chưa cập nhật trình độ', noMajor: 'Chưa cập nhật chuyên ngành', noAssignment: 'Chưa cập nhật phân công',
    records: 'hồ sơ', loading: 'Đang tải tài khoản giáo viên…', empty: 'Không tìm thấy nhân sự phù hợp.',
    profile: 'Hồ sơ nhân sự', linkedAccount: 'Tài khoản giáo viên đã liên kết', professional: 'Trình độ chuyên môn', employment: 'Công tác và phân công',
    highestLevel: 'Trình độ cao nhất', degreeName: 'Tên văn bằng', major: 'Chuyên ngành', specialization: 'Định hướng/chuyên sâu', institution: 'Cơ sở đào tạo', graduationYear: 'Năm tốt nghiệp',
    department: 'Tổ chuyên môn', employmentType: 'Loại nhân sự', phone: 'Điện thoại', otherDegrees: 'Văn bằng/chứng chỉ khác',
    edit: 'Cập nhật hồ sơ', save: 'Lưu thay đổi', cancel: 'Hủy', close: 'Đóng', saved: 'Đã lưu hồ sơ nhân sự.',
    positionTtcm: 'TTCM', positionTeacher: 'Giáo viên', suggestedMajor: 'Ví dụ: Ngôn ngữ Anh', suggestedSpecialization: 'Ví dụ: Lý luận và PPDH Tiếng Anh',
    suggestedInstitution: 'Tên trường/cơ sở đào tạo', suggestedAssignment: 'Ví dụ: Khối 12 · Lớp 12.1, 12.6', suggestedOther: 'Mỗi văn bằng hoặc chứng chỉ trên một dòng',
    accountNotice: 'Mỗi hồ sơ trong bảng được gắn trực tiếp với một tài khoản giáo viên hiện có.', missingNotice: 'Hồ sơ chưa đủ trình độ chuyên môn', updateNow: 'Cập nhật ngay', error: 'Không thể tải đầy đủ danh sách tài khoản. Đang hiển thị dữ liệu khả dụng.',
  },
  en: {
    eyebrow: 'English Department', title: 'Personnel directory', subtitle: 'Teacher accounts, assignments and professional qualifications in one quick lookup table.',
    search: 'Search name, email, major or assignment', total: 'Total staff', postgraduate: 'Postgraduate', masters: "Master's", incomplete: 'Incomplete',
    all: 'All', doctorate: 'Doctorate', doctoral_candidate: 'Doctoral candidate', master: "Master's", bachelor: "Bachelor's", missing: 'Not updated',
    teacher: 'Teacher', position: 'Position', qualification: 'Professional qualification', assignment: 'Assignment', status: 'Status',
    active: 'Active', leave: 'On leave', inactive: 'Inactive', core: 'Core staff', visiting: 'Visiting',
    noQualification: 'Qualification not updated', noMajor: 'Major not updated', noAssignment: 'Assignment not updated',
    records: 'records', loading: 'Loading teacher accounts…', empty: 'No matching personnel found.',
    profile: 'Personnel profile', linkedAccount: 'Linked teacher account', professional: 'Professional qualification', employment: 'Employment and assignment',
    highestLevel: 'Highest qualification', degreeName: 'Degree name', major: 'Major', specialization: 'Specialization', institution: 'Institution', graduationYear: 'Graduation year',
    department: 'Department', employmentType: 'Employment type', phone: 'Phone', otherDegrees: 'Other degrees/certificates',
    edit: 'Update profile', save: 'Save changes', cancel: 'Cancel', close: 'Close', saved: 'Personnel profile saved.',
    positionTtcm: 'Department head', positionTeacher: 'Teacher', suggestedMajor: 'Example: English Language', suggestedSpecialization: 'Example: English Language Teaching',
    suggestedInstitution: 'University or institution', suggestedAssignment: 'Example: Grade 12 · Classes 12.1, 12.6', suggestedOther: 'One degree or certificate per line',
    accountNotice: 'Every profile in this table is directly linked to an existing teacher account.', missingNotice: 'Professional qualification is incomplete', updateNow: 'Update now', error: 'The complete account list could not be loaded. Available data is shown.',
  },
};

const MATERIAL_PATHS = {
  groups: 'M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z',
  search: 'M9.5 3a6.5 6.5 0 1 0 3.98 11.64L19.85 21 21 19.85l-6.36-6.37A6.5 6.5 0 0 0 9.5 3Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z',
  school: 'M12 3 1 9l4 2.18v6L12 21l7-3.82v-6L21 10v7h2V9L12 3Zm0 2.18L18.74 9 12 12.82 5.26 9 12 5.18ZM7 12.27l5 2.73 5-2.73v3.73l-5 2.73-5-2.73v-3.73Z',
  badge: 'M19 5h-3.18C15.4 3.84 14.3 3 13 3h-2c-1.3 0-2.4.84-2.82 2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-8-0h2v2h-2V5Zm1 5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm5 8H7v-1.25c0-1.66 3.33-2.5 5-2.5s5 .84 5 2.5V18Z',
  warning: 'M1 21h22L12 2 1 21Zm12-3h-2v2h2v-2Zm0-2h-2v-4h2v4Z',
  close: 'M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.3-6.3 1.41 1.42Z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92 1.75H5v-.92l9.06-9.06.92.92L5.92 19ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z',
  save: 'M17 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4Zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm3-10H5V5h10v4Z',
  arrow: 'm9.29 6.71 4.59 4.59-4.59 4.59L10.7 17.3l6-6-6-6-1.41 1.41Z',
  account: 'M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 12c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5Z',
  work: 'M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2ZM10 4h4v2h-4V4Zm10 15H4v-7h6v2h4v-2h6v7Zm-8-6h-2v-2h2v2Z',
};

function MaterialIcon({ name, size = 22 }) {
  return <svg className="gpl-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={MATERIAL_PATHS[name] || MATERIAL_PATHS.badge} /></svg>;
}

function readRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function persistRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('bes-personnel-directory-updated'));
  } catch (error) {
    console.warn('Could not save personnel directory:', error);
  }
}

function initials(value) {
  return String(value || 'GV').trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase() || 'GV';
}

function degreeLabel(level, language) {
  const option = DEGREE_LEVELS.find((item) => item.id === level);
  return option ? option[language === 'en' ? 'en' : 'vi'] : '';
}

function defaultRecord(user, t) {
  const leader = ['admin', 'department_head'].includes(String(user?.role || '').toLowerCase());
  return {
    position: leader ? t.positionTtcm : t.positionTeacher,
    department: t.eyebrow,
    employmentType: 'core',
    employmentStatus: 'active',
    degreeLevel: '', degreeName: '', major: '', specialization: '', institution: '', graduationYear: '', assignment: '', phone: '', otherDegrees: '',
  };
}

function mergeUniqueUsers(users, currentUser) {
  const map = new Map();
  [...(Array.isArray(users) ? users : []), currentUser].filter(Boolean).forEach((user) => {
    const id = String(user.id || user.authId || user.email || '').trim();
    if (!id) return;
    const role = String(user.role || 'teacher').toLowerCase();
    if (!['admin', 'department_head', 'teacher'].includes(role)) return;
    if (user.approved === false) return;
    map.set(id, { ...user, id });
  });
  return [...map.values()].sort((a, b) => String(a.name || a.full_name || '').localeCompare(String(b.name || b.full_name || ''), 'vi'));
}

function statusLabel(status, t) { return t[status] || t.active; }
function employmentLabel(type, t) { return t[type] || t.core; }

export default function PersonnelLookup({ currentUser, language = 'vi' }) {
  const t = COPY[language] || COPY.vi;
  const [accounts, setAccounts] = useState(() => mergeUniqueUsers([], currentUser));
  const [records, setRecords] = useState(readRecords);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState('');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const users = await getUsers();
      setAccounts(mergeUniqueUsers(users, currentUser));
    } catch (error) {
      console.warn('Personnel account lookup failed:', error);
      setAccounts((previous) => mergeUniqueUsers(previous, currentUser));
      setLoadError(t.error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUser?.email, currentUser?.role, language]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => {
    const handleUsers = () => loadAccounts();
    const handleDirectory = () => setRecords(readRecords());
    window.addEventListener(USERS_EVENT, handleUsers);
    window.addEventListener('bes-personnel-directory-updated', handleDirectory);
    window.addEventListener('storage', handleDirectory);
    return () => {
      window.removeEventListener(USERS_EVENT, handleUsers);
      window.removeEventListener('bes-personnel-directory-updated', handleDirectory);
      window.removeEventListener('storage', handleDirectory);
    };
  }, [loadAccounts]);

  const people = useMemo(() => accounts.map((user) => ({
    ...defaultRecord(user, t), ...(records[user.id] || {}), id: user.id,
    name: user.name || user.full_name || user.email?.split('@')[0] || t.teacher,
    email: user.email || '', avatarUrl: user.avatarUrl || user.avatar_url || '', accountRole: user.role || 'teacher',
  })), [accounts, records, language]);

  const filteredPeople = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(language === 'vi' ? 'vi' : 'en');
    return people.filter((person) => {
      const hasDegree = Boolean(person.degreeLevel);
      const matchesFilter = filter === 'all' || (filter === 'missing' ? !hasDegree : person.degreeLevel === filter);
      if (!matchesFilter) return false;
      if (!needle) return true;
      const haystack = [person.name, person.email, person.position, person.major, person.specialization, person.assignment, person.institution, degreeLabel(person.degreeLevel, language)].join(' ').toLocaleLowerCase(language === 'vi' ? 'vi' : 'en');
      return haystack.includes(needle);
    });
  }, [people, query, filter, language]);

  const stats = useMemo(() => ({
    total: people.length,
    postgraduate: people.filter((person) => ['doctorate', 'doctoral_candidate', 'master'].includes(person.degreeLevel)).length,
    masters: people.filter((person) => person.degreeLevel === 'master').length,
    incomplete: people.filter((person) => !person.degreeLevel || !person.major).length,
  }), [people]);

  const selected = people.find((person) => person.id === selectedId) || null;

  useEffect(() => {
    if (!selectedId) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') { setSelectedId(''); setEditing(false); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedId]);

  const openProfile = (person) => { setSelectedId(person.id); setEditing(false); setDraft(null); setNotice(''); };
  const startEditing = () => { if (selected) { setDraft({ ...selected }); setEditing(true); setNotice(''); } };

  const saveProfile = (event) => {
    event.preventDefault();
    if (!selected || !draft) return;
    const nextRecord = {
      position: String(draft.position || '').trim(), department: String(draft.department || '').trim(),
      employmentType: draft.employmentType || 'core', employmentStatus: draft.employmentStatus || 'active', degreeLevel: draft.degreeLevel || '',
      degreeName: String(draft.degreeName || '').trim(), major: String(draft.major || '').trim(), specialization: String(draft.specialization || '').trim(),
      institution: String(draft.institution || '').trim(), graduationYear: String(draft.graduationYear || '').replace(/[^0-9]/g, '').slice(0, 4),
      assignment: String(draft.assignment || '').trim(), phone: String(draft.phone || '').trim(), otherDegrees: String(draft.otherDegrees || '').trim(), updatedAt: new Date().toISOString(),
    };
    setRecords((previous) => {
      const next = { ...previous, [selected.id]: nextRecord };
      persistRecords(next);
      return next;
    });
    setEditing(false);
    setNotice(t.saved);
  };

  const filters = ['all', 'doctorate', 'doctoral_candidate', 'master', 'bachelor', 'missing'];
  const metrics = [['groups', t.total, stats.total, 'blue'], ['school', t.postgraduate, stats.postgraduate, 'green'], ['badge', t.masters, stats.masters, 'yellow'], ['warning', t.incomplete, stats.incomplete, 'red']];

  return (
    <article className="gpl-directory" id="dashboard-personnel" aria-labelledby="gpl-title">
      <header className="gpl-header">
        <div className="gpl-title-group"><span className="gpl-brand-icon"><MaterialIcon name="groups" size={26} /></span><div><span className="gpl-eyebrow">{t.eyebrow}</span><h2 id="gpl-title">{t.title}</h2><p>{t.subtitle}</p></div></div>
        <div className="gpl-google-mark" aria-hidden="true"><i /><i /><i /><i /></div>
      </header>

      <div className="gpl-body">
        <div className="gpl-metrics" aria-label={t.total}>
          {metrics.map(([icon, label, value, tone]) => <button type="button" key={label} className={`gpl-metric is-${tone}`} onClick={() => setFilter(label === t.incomplete ? 'missing' : 'all')}><span><MaterialIcon name={icon} size={21} /></span><div><small>{label}</small><strong>{value}</strong></div></button>)}
        </div>

        <div className="gpl-toolbar">
          <label className="gpl-search"><MaterialIcon name="search" size={21} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} aria-label={t.search} />{query ? <button type="button" onClick={() => setQuery('')} aria-label={t.close}><MaterialIcon name="close" size={18} /></button> : null}</label>
          <span className="gpl-result-count">{filteredPeople.length} {t.records}</span>
        </div>

        <div className="gpl-filter-row" role="group" aria-label={t.qualification}>{filters.map((item) => <button type="button" key={item} className={`gpl-filter-chip${filter === item ? ' is-active' : ''}`} onClick={() => setFilter(item)} aria-pressed={filter === item}>{t[item]}</button>)}</div>

        {loadError ? <div className="gpl-inline-alert"><MaterialIcon name="warning" size={19} /><span>{loadError}</span></div> : null}
        {stats.incomplete > 0 ? <button type="button" className="gpl-missing-banner" onClick={() => setFilter('missing')}><span><MaterialIcon name="warning" size={20} /></span><div><strong>{stats.incomplete} {t.missingNotice.toLocaleLowerCase(language === 'vi' ? 'vi' : 'en')}</strong><small>{t.accountNotice}</small></div><b>{t.updateNow}</b><MaterialIcon name="arrow" size={18} /></button> : null}

        <div className="gpl-table-wrap">
          <div className="gpl-table-head" aria-hidden="true"><span>{t.teacher}</span><span>{t.position}</span><span>{t.qualification}</span><span>{t.assignment}</span><span>{t.status}</span><span /></div>
          <div className="gpl-table" aria-live="polite">
            {loading && !people.length ? <div className="gpl-empty"><span className="gpl-loader" /><p>{t.loading}</p></div> : null}
            {!loading && !filteredPeople.length ? <div className="gpl-empty"><MaterialIcon name="search" size={28} /><p>{t.empty}</p></div> : null}
            {filteredPeople.map((person) => <button type="button" className="gpl-person-row" key={person.id} onClick={() => openProfile(person)}>
              <span className="gpl-person-cell"><span className="gpl-avatar">{person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : initials(person.name)}</span><span className="gpl-person-name"><strong>{person.name}</strong><small>{person.email}</small></span></span>
              <span className="gpl-position-cell"><strong>{person.position || t.positionTeacher}</strong><small>{employmentLabel(person.employmentType, t)}</small></span>
              <span className={`gpl-qualification-cell${person.degreeLevel ? '' : ' is-missing'}`}><b>{person.degreeLevel ? degreeLabel(person.degreeLevel, language) : t.noQualification}</b><small>{person.major || t.noMajor}</small></span>
              <span className="gpl-assignment-cell"><strong>{person.assignment || t.noAssignment}</strong><small>{person.department}</small></span>
              <span><em className={`gpl-status is-${person.employmentStatus}`}>{statusLabel(person.employmentStatus, t)}</em></span><span className="gpl-row-arrow"><MaterialIcon name="arrow" size={20} /></span>
            </button>)}
          </div>
        </div>
      </div>

      {selected ? <div className="gpl-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelectedId(''); setEditing(false); } }}>
        <aside className="gpl-drawer" role="dialog" aria-modal="true" aria-labelledby="gpl-profile-title">
          <header className="gpl-drawer-header"><button type="button" className="gpl-icon-button" onClick={() => { setSelectedId(''); setEditing(false); }} aria-label={t.close}><MaterialIcon name="close" size={22} /></button><span>{t.profile}</span>{!editing ? <button type="button" className="gpl-edit-button" onClick={startEditing}><MaterialIcon name="edit" size={18} />{t.edit}</button> : <span />}</header>
          <div className="gpl-profile-hero"><span className="gpl-profile-avatar">{selected.avatarUrl ? <img src={selected.avatarUrl} alt="" /> : initials(selected.name)}</span><div><h3 id="gpl-profile-title">{selected.name}</h3><p>{selected.position || t.positionTeacher}</p><em className={`gpl-status is-${selected.employmentStatus}`}>{statusLabel(selected.employmentStatus, t)}</em></div></div>
          {notice ? <div className="gpl-save-notice"><MaterialIcon name="save" size={18} />{notice}</div> : null}

          {editing && draft ? <form className="gpl-form" onSubmit={saveProfile}>
            <section><h4><MaterialIcon name="school" size={19} />{t.professional}</h4><div className="gpl-form-grid">
              <label><span>{t.highestLevel}</span><select value={draft.degreeLevel} onChange={(event) => setDraft({ ...draft, degreeLevel: event.target.value })}><option value="">{t.missing}</option>{DEGREE_LEVELS.map((level) => <option key={level.id} value={level.id}>{level[language === 'en' ? 'en' : 'vi']}</option>)}</select></label>
              <label><span>{t.degreeName}</span><input value={draft.degreeName} onChange={(event) => setDraft({ ...draft, degreeName: event.target.value })} /></label>
              <label className="is-wide"><span>{t.major}</span><input value={draft.major} onChange={(event) => setDraft({ ...draft, major: event.target.value })} placeholder={t.suggestedMajor} /></label>
              <label className="is-wide"><span>{t.specialization}</span><input value={draft.specialization} onChange={(event) => setDraft({ ...draft, specialization: event.target.value })} placeholder={t.suggestedSpecialization} /></label>
              <label className="is-wide"><span>{t.institution}</span><input value={draft.institution} onChange={(event) => setDraft({ ...draft, institution: event.target.value })} placeholder={t.suggestedInstitution} /></label>
              <label><span>{t.graduationYear}</span><input inputMode="numeric" value={draft.graduationYear} onChange={(event) => setDraft({ ...draft, graduationYear: event.target.value })} maxLength={4} /></label>
              <label className="is-wide"><span>{t.otherDegrees}</span><textarea value={draft.otherDegrees} onChange={(event) => setDraft({ ...draft, otherDegrees: event.target.value })} placeholder={t.suggestedOther} rows={3} /></label>
            </div></section>
            <section><h4><MaterialIcon name="work" size={19} />{t.employment}</h4><div className="gpl-form-grid">
              <label><span>{t.position}</span><input value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value })} /></label>
              <label><span>{t.department}</span><input value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })} /></label>
              <label><span>{t.employmentType}</span><select value={draft.employmentType} onChange={(event) => setDraft({ ...draft, employmentType: event.target.value })}><option value="core">{t.core}</option><option value="visiting">{t.visiting}</option></select></label>
              <label><span>{t.status}</span><select value={draft.employmentStatus} onChange={(event) => setDraft({ ...draft, employmentStatus: event.target.value })}><option value="active">{t.active}</option><option value="leave">{t.leave}</option><option value="inactive">{t.inactive}</option></select></label>
              <label className="is-wide"><span>{t.assignment}</span><input value={draft.assignment} onChange={(event) => setDraft({ ...draft, assignment: event.target.value })} placeholder={t.suggestedAssignment} /></label>
              <label className="is-wide"><span>{t.phone}</span><input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} inputMode="tel" /></label>
            </div></section>
            <div className="gpl-form-actions"><button type="button" className="gpl-button outlined" onClick={() => { setEditing(false); setDraft(null); }}>{t.cancel}</button><button type="submit" className="gpl-button filled"><MaterialIcon name="save" size={18} />{t.save}</button></div>
          </form> : <div className="gpl-profile-content">
            <section><h4><MaterialIcon name="account" size={19} />{t.linkedAccount}</h4><dl><div><dt>Email</dt><dd>{selected.email || '—'}</dd></div><div><dt>{t.department}</dt><dd>{selected.department || '—'}</dd></div></dl><p className="gpl-account-note">{t.accountNotice}</p></section>
            <section><h4><MaterialIcon name="school" size={19} />{t.professional}</h4><dl><div><dt>{t.highestLevel}</dt><dd className={selected.degreeLevel ? '' : 'is-missing'}>{selected.degreeLevel ? degreeLabel(selected.degreeLevel, language) : t.noQualification}</dd></div><div><dt>{t.degreeName}</dt><dd>{selected.degreeName || '—'}</dd></div><div><dt>{t.major}</dt><dd>{selected.major || t.noMajor}</dd></div><div><dt>{t.specialization}</dt><dd>{selected.specialization || '—'}</dd></div><div><dt>{t.institution}</dt><dd>{selected.institution || '—'}</dd></div><div><dt>{t.graduationYear}</dt><dd>{selected.graduationYear || '—'}</dd></div></dl>{selected.otherDegrees ? <div className="gpl-other-degrees"><span>{t.otherDegrees}</span>{selected.otherDegrees.split('\n').filter(Boolean).map((item) => <p key={item}>{item}</p>)}</div> : null}</section>
            <section><h4><MaterialIcon name="work" size={19} />{t.employment}</h4><dl><div><dt>{t.position}</dt><dd>{selected.position || '—'}</dd></div><div><dt>{t.employmentType}</dt><dd>{employmentLabel(selected.employmentType, t)}</dd></div><div><dt>{t.assignment}</dt><dd>{selected.assignment || t.noAssignment}</dd></div><div><dt>{t.phone}</dt><dd>{selected.phone || '—'}</dd></div></dl></section>
          </div>}
        </aside>
      </div> : null}
    </article>
  );
}
