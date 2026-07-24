import React, { useEffect, useMemo, useState } from 'react';
import {
  loadPersonnelDirectory,
  reviewPersonnelChange,
  savePersonnelRecord,
  setPersonnelAccountState,
  submitPersonnelChange,
} from '../utils/personnelDirectory.js';
import '../styles/personnel-hub-google.css';

const EMPTY_RECORD = {
  employeeCode: '', fullName: '', preferredName: '', loginEmail: '', contactEmail: '', phone: '', gender: '',
  dateOfBirth: '', address: '', department: 'Tổ Tiếng Anh', position: 'Giáo viên', employmentType: '',
  employmentStatus: 'active', startDate: '', qualification: '', degree: '', subjects: [], gradeLevels: [],
  homeroomClass: '', school: '', emergencyContactName: '', emergencyContactPhone: '', notes: '',
};

const ADMIN_SECTIONS = [
  {
    id: 'identity', title: 'Thông tin cá nhân', icon: 'person',
    fields: [
      ['employeeCode', 'Mã nhân sự'], ['fullName', 'Họ và tên'], ['preferredName', 'Tên thường dùng'],
      ['gender', 'Giới tính', 'select', ['', 'Nam', 'Nữ', 'Khác', 'Không công khai']],
      ['dateOfBirth', 'Ngày sinh', 'date'], ['phone', 'Số điện thoại'], ['contactEmail', 'Email liên hệ'],
      ['address', 'Địa chỉ', 'textarea'],
    ],
  },
  {
    id: 'employment', title: 'Thông tin công tác', icon: 'work',
    fields: [
      ['department', 'Tổ / bộ phận'], ['position', 'Chức vụ'],
      ['employmentType', 'Loại hình', 'select', ['', 'Biên chế', 'Hợp đồng', 'Thỉnh giảng', 'Khác']],
      ['employmentStatus', 'Trạng thái công tác', 'select', [['active', 'Đang công tác'], ['leave', 'Tạm nghỉ'], ['inactive', 'Đã nghỉ']]],
      ['startDate', 'Ngày bắt đầu', 'date'], ['school', 'Đơn vị công tác'], ['homeroomClass', 'Lớp chủ nhiệm'],
    ],
  },
  {
    id: 'professional', title: 'Phát triển chuyên môn', icon: 'school',
    fields: [
      ['qualification', 'Trình độ chuyên môn'], ['degree', 'Văn bằng / chứng chỉ', 'textarea'],
      ['subjects', 'Môn phụ trách', 'tags'], ['gradeLevels', 'Khối lớp phụ trách', 'tags'],
    ],
  },
  {
    id: 'contact', title: 'Liên hệ và ghi chú', icon: 'contact_phone',
    fields: [
      ['emergencyContactName', 'Người liên hệ khẩn cấp'], ['emergencyContactPhone', 'SĐT khẩn cấp'],
      ['notes', 'Ghi chú nội bộ', 'textarea'],
    ],
  },
];

const TEACHER_EDITABLE_KEYS = new Set([
  'fullName', 'preferredName', 'contactEmail', 'phone', 'gender', 'dateOfBirth', 'address', 'school',
  'qualification', 'degree', 'subjects', 'gradeLevels', 'homeroomClass', 'emergencyContactName',
  'emergencyContactPhone', 'notes',
]);

const NAV_ITEMS = [
  ['overview', 'home', 'Tổng quan'],
  ['teachers', 'group', 'Giáo viên'],
  ['assignments', 'assignment', 'Phân công'],
  ['verification', 'verified_user', 'Xác minh hồ sơ'],
  ['development', 'school', 'Phát triển chuyên môn'],
  ['awards', 'workspace_premium', 'Danh hiệu & Khen thưởng'],
  ['reports', 'bar_chart', 'Báo cáo'],
  ['settings', 'settings', 'Cài đặt'],
];

function initials(name = '') {
  return String(name || 'GV').trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase() || 'GV';
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function roleLabel(record) {
  if (record.position) return record.position;
  return record.accountRole === 'admin' ? 'Quản trị viên' : 'Giáo viên';
}

function statusLabel(record) {
  if (!record.accountApproved) return 'Tài khoản tạm khóa';
  if (record.employmentStatus === 'leave') return 'Tạm nghỉ';
  if (record.employmentStatus === 'inactive') return 'Đã nghỉ';
  return 'Đang công tác';
}

function completeness(record = {}) {
  const keys = ['employeeCode', 'fullName', 'phone', 'department', 'position', 'qualification', 'degree', 'subjects', 'gradeLevels'];
  const filled = keys.filter((key) => Array.isArray(record[key]) ? record[key].length : String(record[key] || '').trim()).length;
  return Math.round((filled / keys.length) * 100);
}

function normalizeForm(record = {}) {
  return {
    ...EMPTY_RECORD,
    ...record,
    subjects: Array.isArray(record.subjects) ? record.subjects : [],
    gradeLevels: Array.isArray(record.gradeLevels) ? record.gradeLevels : [],
  };
}

function splitTags(value) {
  return [...new Set(String(value || '').split(/[,;\n]/).map((item) => item.trim()).filter(Boolean))];
}

function displayValue(record, key) {
  const value = record?.[key];
  if (Array.isArray(value)) return value.length ? value.join(' · ') : 'Chưa cập nhật';
  if (key === 'dateOfBirth' || key === 'startDate') return formatDate(value);
  if (key === 'gender') return value || 'Chưa cập nhật';
  if (key === 'employmentStatus') return ({ active: 'Đang công tác', leave: 'Tạm nghỉ', inactive: 'Đã nghỉ' }[value] || 'Chưa cập nhật');
  return String(value || '').trim() || 'Chưa cập nhật';
}

function fieldLabel(key) {
  for (const section of ADMIN_SECTIONS) {
    const field = section.fields.find((item) => item[0] === key);
    if (field) return field[1];
  }
  return key;
}

function MaterialIcon({ children }) {
  return <span className="ph-material-icon" aria-hidden="true">{children}</span>;
}

function AppRail({ active, onNavigate }) {
  return (
    <aside className="ph-app-rail" aria-label="Điều hướng quản lý nhân sự">
      <nav>
        {NAV_ITEMS.map(([id, icon, label]) => (
          <button type="button" key={id} className={active === id ? 'active' : ''} onClick={() => onNavigate(id)}>
            <MaterialIcon>{icon}</MaterialIcon><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="ph-rail-note">
        <div className="ph-rail-illustration"><MaterialIcon>cloud_done</MaterialIcon></div>
        <strong>Dữ liệu luôn được đồng bộ và bảo mật.</strong>
        <button type="button" onClick={() => onNavigate('settings')}>Tìm hiểu thêm <MaterialIcon>arrow_forward</MaterialIcon></button>
      </div>
    </aside>
  );
}

function TopBar({ query, setQuery, pending, currentUser, onFilter }) {
  return (
    <header className="ph-topbar">
      <div className="ph-brand"><span className="ph-brand-mark">B</span><strong>Nhân sự giáo viên</strong></div>
      <label className="ph-global-search">
        <MaterialIcon>search</MaterialIcon>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm giáo viên, email, mã nhân viên..." />
      </label>
      <button type="button" className="ph-filter-button" onClick={onFilter}><MaterialIcon>filter_list</MaterialIcon>Bộ lọc</button>
      <button type="button" className="ph-icon-button" aria-label="Thông báo"><MaterialIcon>notifications</MaterialIcon>{pending > 0 ? <span>{pending}</span> : null}</button>
      <button type="button" className="ph-icon-button" aria-label="Trợ giúp"><MaterialIcon>help</MaterialIcon></button>
      <div className="ph-user-chip"><span>{initials(currentUser?.full_name || currentUser?.email || 'AT')}</span><strong>{currentUser?.full_name || 'Anh Tuấn'}</strong><MaterialIcon>expand_more</MaterialIcon></div>
    </header>
  );
}

function StatCard({ icon, label, value, caption, tone }) {
  return (
    <article className={`ph-stat ${tone}`}>
      <span><MaterialIcon>{icon}</MaterialIcon></span>
      <div><small>{label}</small><strong>{value}</strong><p>{caption}</p></div>
    </article>
  );
}

function ProfileList({ records, selectedId, onSelect, filter, setFilter, query }) {
  const filters = [
    ['all', 'Tất cả'], ['active', 'Đang công tác'], ['inactive', 'Tạm khóa'], ['incomplete', 'Thiếu hồ sơ'],
  ];
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = records.filter((record) => {
    const matchesQuery = !normalizedQuery || [record.fullName, record.employeeCode, record.loginEmail, record.department, record.position]
      .some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
    if (!matchesQuery) return false;
    if (filter === 'active') return record.accountApproved;
    if (filter === 'inactive') return !record.accountApproved;
    if (filter === 'incomplete') return completeness(record) < 75;
    return true;
  });
  return (
    <section className="ph-directory-panel" id="personnel-teachers">
      <header><div><h2>Danh sách giáo viên</h2><p>{filtered.length} trên {records.length} tài khoản</p></div><MaterialIcon>tune</MaterialIcon></header>
      <div className="ph-local-search"><MaterialIcon>search</MaterialIcon><span>{query || 'Tìm kiếm giáo viên...'}</span></div>
      <div className="ph-filter-chips" role="tablist">
        {filters.map(([id, label]) => <button type="button" key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}{id === 'all' ? ` ${records.length}` : ''}</button>)}
      </div>
      <div className="ph-person-list">
        {filtered.map((record) => (
          <button type="button" className={`ph-person-row ${selectedId === record.id ? 'active' : ''}`} key={record.id} onClick={() => onSelect(record.id)}>
            <span className="ph-avatar">{initials(record.fullName)}</span>
            <span className="ph-person-copy"><strong>{record.fullName}</strong><small>{record.department || roleLabel(record)}</small></span>
            <span className={`ph-verification ${record.accountApproved ? 'verified' : 'pending'}`}><MaterialIcon>{record.accountApproved ? 'check_circle' : 'schedule'}</MaterialIcon>{record.accountApproved ? 'Đã xác minh' : 'Chờ xác minh'}</span>
            <MaterialIcon>chevron_right</MaterialIcon>
          </button>
        ))}
        {!filtered.length ? <div className="ph-empty">Không có giáo viên phù hợp.</div> : null}
      </div>
      <footer><span>1–{Math.min(filtered.length, 7)} của {filtered.length}</span><div><button type="button" disabled><MaterialIcon>chevron_left</MaterialIcon></button><button type="button" disabled><MaterialIcon>chevron_right</MaterialIcon></button></div></footer>
    </section>
  );
}

function FieldInput({ field, value, onChange, disabled = false }) {
  const [key, label, type = 'text', options = []] = field;
  if (type === 'select') {
    return (
      <label className="ph-field"><span>{label}</span><select value={value || ''} disabled={disabled} onChange={(event) => onChange(key, event.target.value)}>
        {options.map((option) => {
          const pair = Array.isArray(option) ? option : [option, option || 'Chọn'];
          return <option key={pair[0]} value={pair[0]}>{pair[1]}</option>;
        })}
      </select></label>
    );
  }
  if (type === 'textarea') return <label className="ph-field wide"><span>{label}</span><textarea rows="3" value={value || ''} disabled={disabled} onChange={(event) => onChange(key, event.target.value)} /></label>;
  if (type === 'tags') return <label className="ph-field wide"><span>{label}</span><input value={(value || []).join(', ')} disabled={disabled} placeholder="Nhập các mục, cách nhau bằng dấu phẩy" onChange={(event) => onChange(key, splitTags(event.target.value))} /></label>;
  return <label className="ph-field"><span>{label}</span><input type={type} value={value || ''} disabled={disabled} onChange={(event) => onChange(key, event.target.value)} /></label>;
}

function RecordForm({ record, onChange, teacherMode = false }) {
  return (
    <div className="ph-form-sections">
      {ADMIN_SECTIONS.map((section) => {
        const fields = teacherMode ? section.fields.filter(([key]) => TEACHER_EDITABLE_KEYS.has(key)) : section.fields;
        if (!fields.length) return null;
        return (
          <section className="ph-form-section" key={section.id}>
            <header><MaterialIcon>{section.icon}</MaterialIcon><div><h3>{section.title}</h3><p>{teacherMode ? 'Chỉ gửi các nội dung cần thay đổi.' : 'Thông tin do Admin quản lý.'}</p></div></header>
            <div className="ph-form-grid">{fields.map((field) => <FieldInput key={field[0]} field={field} value={record[field[0]]} onChange={onChange} />)}</div>
          </section>
        );
      })}
    </div>
  );
}

function RecordDetails({ record, activeTab }) {
  const visibleSections = activeTab === 'overview'
    ? ADMIN_SECTIONS
    : ADMIN_SECTIONS.filter((section) => section.id === activeTab);
  return (
    <div className="ph-detail-sections">
      {visibleSections.map((section) => (
        <section key={section.id} className={`ph-detail-section ${section.id}`}>
          <header><MaterialIcon>{section.icon}</MaterialIcon><h3>{section.title}</h3></header>
          <div className="ph-detail-grid">{section.fields.map(([key, label]) => (
            <div className={['address', 'degree', 'subjects', 'gradeLevels', 'notes'].includes(key) ? 'wide' : ''} key={key}><small>{label}</small><strong>{displayValue(record, key)}</strong></div>
          ))}</div>
        </section>
      ))}
    </div>
  );
}

function ProfileHeader({ record, admin, editing, onEdit, onToggleAccount }) {
  const percent = completeness(record);
  return (
    <header className="ph-profile-head">
      <div className="ph-profile-identity">
        <span className="ph-avatar large">{initials(record.fullName)}</span>
        <div><div className="ph-name-line"><h2>{record.fullName}</h2><span className="ph-status-pill active"><MaterialIcon>verified</MaterialIcon>Đã xác minh</span></div><p>{record.loginEmail}</p><span className="ph-employee-code">Mã nhân viên: {record.employeeCode || 'Chưa cập nhật'}</span></div>
      </div>
      <div className="ph-profile-head-actions">
        <div className="ph-completeness"><span><b>{percent}%</b><small>Hoàn thiện hồ sơ</small></span><i><em style={{ width: `${percent}%` }} /></i></div>
        <button type="button" className="ph-tonal" onClick={onEdit}><MaterialIcon>{editing ? 'close' : (admin ? 'edit' : 'edit_note')}</MaterialIcon>{editing ? 'Hủy' : (admin ? 'Chỉnh sửa hồ sơ' : 'Đề nghị chỉnh sửa')}</button>
        {admin ? <button type="button" className={record.accountApproved ? 'ph-outline danger' : 'ph-outline success'} onClick={onToggleAccount}><MaterialIcon>{record.accountApproved ? 'person_off' : 'person_check'}</MaterialIcon>{record.accountApproved ? 'Tạm khóa' : 'Kích hoạt'}</button> : null}
      </div>
    </header>
  );
}

function ProfileTabs({ activeTab, setActiveTab, onHistory }) {
  const tabs = [
    ['overview', 'Tổng quan'], ['identity', 'Cá nhân'], ['employment', 'Công tác'], ['professional', 'Phát triển chuyên môn'], ['contact', 'Liên hệ'], ['history', 'Lịch sử cập nhật'],
  ];
  return (
    <div className="ph-profile-tabs" role="tablist">
      {tabs.map(([id, label]) => <button type="button" key={id} className={activeTab === id ? 'active' : ''} onClick={() => id === 'history' ? onHistory() : setActiveTab(id)}>{label}</button>)}
    </div>
  );
}

function ChangeRequests({ requests, admin, onReview, busy }) {
  const pending = requests.filter((request) => request.status === 'pending');
  const rows = admin ? requests : requests.slice(0, 8);
  return (
    <section className="ph-requests-panel" id="personnel-change-requests">
      <header><div><span className="ph-section-icon amber"><MaterialIcon>edit_notifications</MaterialIcon></span><div><h2>{admin ? 'Đề nghị chỉnh sửa' : 'Yêu cầu của tôi'}</h2><p>{pending.length} yêu cầu đang chờ xử lý</p></div></div></header>
      <div className="ph-request-list">
        {rows.map((request) => {
          const changed = Object.entries(request.proposed || {});
          return (
            <article className="ph-request-card" key={request.id}>
              <div className="ph-request-top"><div><span className={`ph-request-status ${request.status}`}>{request.status === 'pending' ? 'Chờ duyệt' : request.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}</span><h3>{request.requester_name || request.requester_email}</h3><p>{formatDate(request.created_at)}{request.reason ? ` · ${request.reason}` : ''}</p></div></div>
              <div className="ph-change-grid">{changed.map(([key, value]) => <div key={key}><small>{fieldLabel(key)}</small><span>{Array.isArray(value) ? value.join(' · ') : String(value || 'Để trống')}</span></div>)}</div>
              {admin && request.status === 'pending' ? <footer><button type="button" className="ph-outline danger" disabled={busy === request.id} onClick={() => onReview(request.id, 'rejected')}>Từ chối</button><button type="button" className="ph-primary compact" disabled={busy === request.id} onClick={() => onReview(request.id, 'approved')}><MaterialIcon>check</MaterialIcon>Duyệt và áp dụng</button></footer> : null}
            </article>
          );
        })}
        {!rows.length ? <div className="ph-empty large">Chưa có đề nghị chỉnh sửa hồ sơ.</div> : null}
      </div>
    </section>
  );
}

export default function PersonnelHub({ currentUser }) {
  const [snapshot, setSnapshot] = useState({ admin: false, records: [], requests: [], updatedAt: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_RECORD);
  const [reason, setReason] = useState('');
  const [activeNav, setActiveNav] = useState('overview');
  const [activeTab, setActiveTab] = useState('overview');

  const load = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const data = await loadPersonnelDirectory();
      setSnapshot(data);
      const first = data.records.find((item) => item.id === selectedId) || data.records[0];
      if (first) {
        setSelectedId(first.id);
        if (!editing) setForm(normalizeForm(first));
      }
      setMessage('');
    } catch (error) {
      setMessage(error?.message || String(error));
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentUser?.id]);

  const admin = snapshot.admin;
  const selected = useMemo(() => snapshot.records.find((record) => record.id === selectedId) || snapshot.records[0] || null, [snapshot.records, selectedId]);
  const stats = useMemo(() => ({
    total: snapshot.records.length,
    active: snapshot.records.filter((record) => record.accountApproved).length,
    incomplete: snapshot.records.filter((record) => completeness(record) < 75).length,
    pending: snapshot.requests.filter((request) => request.status === 'pending').length,
    excellent: snapshot.records.filter((record) => completeness(record) >= 90).length,
  }), [snapshot]);

  useEffect(() => {
    if (selected && !editing) setForm(normalizeForm(selected));
  }, [selected?.id, selected?.updatedAt, editing]);

  const startEdit = () => {
    if (!selected) return;
    if (editing) {
      setEditing(false);
      setForm(normalizeForm(selected));
      setReason('');
    } else {
      setForm(normalizeForm(selected));
      setEditing(true);
    }
  };

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!selected || busy) return;
    setBusy('save');
    setMessage('');
    try {
      if (admin) {
        await savePersonnelRecord(selected.id, form);
        setMessage(`Đã lưu hồ sơ của ${form.fullName || selected.fullName}.`);
      } else {
        const proposed = {};
        for (const key of TEACHER_EDITABLE_KEYS) {
          const before = Array.isArray(selected[key]) ? selected[key].join('|') : String(selected[key] || '');
          const after = Array.isArray(form[key]) ? form[key].join('|') : String(form[key] || '');
          if (before !== after) proposed[key] = form[key];
        }
        await submitPersonnelChange(proposed, reason);
        setMessage('Đã gửi đề nghị chỉnh sửa đến Admin.');
      }
      setEditing(false);
      setReason('');
      await load({ quiet: true });
    } catch (error) {
      setMessage(error?.message || String(error));
    } finally {
      setBusy('');
    }
  };

  const toggleAccount = async () => {
    if (!selected || busy) return;
    const next = !selected.accountApproved;
    if (!window.confirm(next ? `Kích hoạt tài khoản ${selected.fullName}?` : `Tạm khóa tài khoản ${selected.fullName}?`)) return;
    setBusy('account');
    try {
      await setPersonnelAccountState(selected.id, next);
      await load({ quiet: true });
      setMessage(next ? 'Đã kích hoạt tài khoản.' : 'Đã tạm khóa tài khoản.');
    } catch (error) { setMessage(error?.message || String(error)); }
    finally { setBusy(''); }
  };

  const review = async (requestId, decision) => {
    setBusy(requestId);
    try {
      await reviewPersonnelChange(requestId, decision);
      await load({ quiet: true });
      setMessage(decision === 'approved' ? 'Đã duyệt và áp dụng thay đổi.' : 'Đã từ chối đề nghị.');
    } catch (error) { setMessage(error?.message || String(error)); }
    finally { setBusy(''); }
  };

  const navigate = (id) => {
    setActiveNav(id);
    if (id === 'overview') document.getElementById('personnel-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (['teachers', 'assignments', 'verification', 'development', 'awards'].includes(id)) document.getElementById('personnel-teachers')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else document.getElementById('personnel-change-requests')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <div className="ph-loading"><span /><h1>Đang tải hồ sơ nhân sự…</h1></div>;

  return (
    <div className="page personnel-hub-page">
      <TopBar query={query} setQuery={setQuery} pending={stats.pending} currentUser={currentUser} onFilter={() => document.getElementById('personnel-teachers')?.scrollIntoView({ behavior: 'smooth' })} />
      <div className="ph-app-shell">
        <AppRail active={activeNav} onNavigate={navigate} />
        <main className="ph-app-main" id="personnel-overview">
          <section className="ph-page-heading">
            <div><span className="ph-eyebrow">GOOGLE MATERIAL WORKSPACE</span><h1>Quản lý nhân sự giáo viên</h1><p>Hiệu quả quản lý và nâng cao chất lượng đội ngũ nhà giáo.</p></div>
            <div className="ph-award-card"><MaterialIcon>workspace_premium</MaterialIcon><div><small>Hồ sơ nổi bật</small><strong>{stats.excellent}</strong><span>Hoàn thiện từ 90%</span></div></div>
          </section>

          <section className="ph-stat-grid">
            <StatCard icon="groups" label="Tổng số giáo viên" value={stats.total} caption="Toàn trường" tone="blue" />
            <StatCard icon="verified_user" label="Hồ sơ đã xác minh" value={stats.active} caption={`${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% đã xác minh`} tone="green" />
            <StatCard icon="assignment" label="Hồ sơ cần bổ sung" value={stats.incomplete} caption="Mức hoàn thiện dưới 75%" tone="yellow" />
            <StatCard icon="mail" label="Thông báo cần xử lý" value={stats.pending} caption="Chờ Admin xác nhận" tone="red" />
          </section>

          {message ? <div className="ph-message"><MaterialIcon>info</MaterialIcon>{message}<button type="button" onClick={() => setMessage('')}>×</button></div> : null}

          <div className={`ph-workspace ${admin ? 'admin' : 'teacher'}`}>
            {admin ? <ProfileList records={snapshot.records} selectedId={selected?.id} onSelect={(id) => { setSelectedId(id); setEditing(false); setActiveTab('overview'); }} filter={filter} setFilter={setFilter} query={query} /> : null}

            <section className="ph-profile-panel">
              {selected ? (
                <>
                  <ProfileHeader record={selected} admin={admin} editing={editing} onEdit={startEdit} onToggleAccount={toggleAccount} />
                  <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} onHistory={() => document.getElementById('personnel-change-requests')?.scrollIntoView({ behavior: 'smooth' })} />
                  {editing ? (
                    <div className="ph-editor">
                      <RecordForm record={form} onChange={updateField} teacherMode={!admin} />
                      {!admin ? <label className="ph-reason"><span>Lý do đề nghị</span><textarea rows="3" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Mô tả ngắn gọn vì sao cần cập nhật…" /></label> : null}
                      <footer className="ph-editor-actions"><button type="button" className="ph-outline" onClick={startEdit}>Hủy</button><button type="button" className="ph-primary" disabled={busy === 'save'} onClick={save}><MaterialIcon>save</MaterialIcon>{busy === 'save' ? 'Đang lưu…' : admin ? 'Lưu hồ sơ' : 'Gửi Admin duyệt'}</button></footer>
                    </div>
                  ) : <RecordDetails record={selected} activeTab={activeTab} />}
                </>
              ) : <div className="ph-empty large">Chưa có tài khoản giáo viên trong hệ thống.</div>}
            </section>
          </div>

          <ChangeRequests requests={snapshot.requests} admin={admin} onReview={review} busy={busy} />
          <footer className="ph-page-footer"><span><MaterialIcon>shield</MaterialIcon>Dữ liệu nhân sự được giới hạn theo vai trò tài khoản.</span><span>Cập nhật gần nhất: {formatDate(snapshot.updatedAt)}</span></footer>
        </main>
      </div>
    </div>
  );
}
