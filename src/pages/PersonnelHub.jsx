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
    id: 'identity', title: 'Thông tin cơ bản', icon: 'badge',
    fields: [
      ['employeeCode', 'Mã nhân sự'], ['fullName', 'Họ và tên'], ['preferredName', 'Tên thường dùng'],
      ['gender', 'Giới tính', 'select', ['', 'Nam', 'Nữ', 'Khác', 'Không công khai']],
      ['dateOfBirth', 'Ngày sinh', 'date'], ['phone', 'Số điện thoại'], ['contactEmail', 'Email liên hệ'],
      ['address', 'Địa chỉ', 'textarea'],
    ],
  },
  {
    id: 'employment', title: 'Công tác và tài khoản', icon: 'work',
    fields: [
      ['department', 'Tổ / bộ phận'], ['position', 'Chức vụ'],
      ['employmentType', 'Loại hình', 'select', ['', 'Biên chế', 'Hợp đồng', 'Thỉnh giảng', 'Khác']],
      ['employmentStatus', 'Trạng thái công tác', 'select', [['active', 'Đang công tác'], ['leave', 'Tạm nghỉ'], ['inactive', 'Đã nghỉ']]],
      ['startDate', 'Ngày bắt đầu', 'date'], ['school', 'Đơn vị công tác'], ['homeroomClass', 'Lớp chủ nhiệm'],
    ],
  },
  {
    id: 'professional', title: 'Năng lực chuyên môn', icon: 'school',
    fields: [
      ['qualification', 'Trình độ chuyên môn'], ['degree', 'Văn bằng / chứng chỉ', 'textarea'],
      ['subjects', 'Môn phụ trách', 'tags'], ['gradeLevels', 'Khối lớp phụ trách', 'tags'],
    ],
  },
  {
    id: 'contact', title: 'Liên hệ khẩn cấp và ghi chú', icon: 'contact_phone',
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
  return 'Đang hoạt động';
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

function PersonnelHero({ admin, stats, onPrimary }) {
  return (
    <section className="ph-hero">
      <div className="ph-hero-copy">
        <span className="ph-overline"><MaterialIcon>groups</MaterialIcon> PEOPLE DIRECTORY</span>
        <h1>Quản lý nhân sự giáo viên</h1>
        <p>{admin
          ? 'Một nơi duy nhất để quản lý tài khoản, hồ sơ công tác, năng lực chuyên môn và các đề nghị cập nhật của giáo viên.'
          : 'Xem hồ sơ nhân sự của bạn, kiểm tra thông tin đang được nhà trường lưu và gửi đề nghị chỉnh sửa khi cần.'}</p>
        <div className="ph-hero-actions">
          <button type="button" className="ph-primary" onClick={onPrimary}>
            <MaterialIcon>{admin ? 'person_add' : 'edit_note'}</MaterialIcon>
            {admin ? 'Mở hồ sơ đầu tiên' : 'Đề nghị chỉnh sửa'}
          </button>
          <span className="ph-sync-note"><MaterialIcon>verified_user</MaterialIcon>Dữ liệu chỉ dành cho tài khoản đã đăng nhập</span>
        </div>
      </div>
      <div className="ph-hero-visual" aria-hidden="true">
        <div className="ph-people-stack">
          <span className="ph-person p1"><i>AT</i><b>Giáo viên</b></span>
          <span className="ph-person p2"><i>MH</i><b>TTCM</b></span>
          <span className="ph-person p3"><i>NC</i><b>Giáo viên</b></span>
          <span className="ph-person p4"><i>MD</i><b>Giáo viên</b></span>
          <div className="ph-directory-card">
            <MaterialIcon>badge</MaterialIcon>
            <strong>{stats.total}</strong>
            <small>hồ sơ nhân sự</small>
          </div>
        </div>
      </div>
    </section>
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

function ProfileList({ records, selectedId, onSelect, filter, setFilter }) {
  const filters = [
    ['all', 'Tất cả'], ['active', 'Hoạt động'], ['inactive', 'Tạm khóa'], ['incomplete', 'Thiếu hồ sơ'],
  ];
  const filtered = records.filter((record) => {
    if (filter === 'active') return record.accountApproved;
    if (filter === 'inactive') return !record.accountApproved;
    if (filter === 'incomplete') return completeness(record) < 75;
    return true;
  });
  return (
    <section className="ph-directory-panel">
      <header>
        <div><span className="ph-section-icon"><MaterialIcon>group</MaterialIcon></span><div><h2>Danh bạ giáo viên</h2><p>{filtered.length} tài khoản</p></div></div>
      </header>
      <div className="ph-filter-chips" role="tablist">
        {filters.map(([id, label]) => <button type="button" key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}
      </div>
      <div className="ph-person-list">
        {filtered.map((record) => (
          <button type="button" className={`ph-person-row ${selectedId === record.id ? 'active' : ''}`} key={record.id} onClick={() => onSelect(record.id)}>
            <span className="ph-avatar">{initials(record.fullName)}</span>
            <span className="ph-person-copy"><strong>{record.fullName}</strong><small>{record.employeeCode || 'Chưa có mã'} · {roleLabel(record)}</small></span>
            <span className={`ph-account-dot ${record.accountApproved ? 'on' : 'off'}`} title={statusLabel(record)} />
            <MaterialIcon>chevron_right</MaterialIcon>
          </button>
        ))}
        {!filtered.length ? <div className="ph-empty">Không có giáo viên phù hợp bộ lọc.</div> : null}
      </div>
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

function RecordDetails({ record }) {
  return (
    <div className="ph-detail-sections">
      {ADMIN_SECTIONS.map((section) => (
        <section key={section.id} className="ph-detail-section">
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
        <div><span className={`ph-status-pill ${record.accountApproved ? 'active' : 'inactive'}`}>{statusLabel(record)}</span><h2>{record.fullName}</h2><p>{record.loginEmail}</p></div>
      </div>
      <div className="ph-profile-head-actions">
        <div className="ph-completeness"><span><b>{percent}%</b> hoàn thiện</span><i><em style={{ width: `${percent}%` }} /></i></div>
        <button type="button" className="ph-tonal" onClick={onEdit}><MaterialIcon>{editing ? 'close' : (admin ? 'edit' : 'edit_note')}</MaterialIcon>{editing ? 'Hủy' : (admin ? 'Chỉnh sửa' : 'Đề nghị chỉnh sửa')}</button>
        {admin ? <button type="button" className={record.accountApproved ? 'ph-outline danger' : 'ph-outline success'} onClick={onToggleAccount}><MaterialIcon>{record.accountApproved ? 'person_off' : 'person_check'}</MaterialIcon>{record.accountApproved ? 'Tạm khóa' : 'Kích hoạt'}</button> : null}
      </div>
    </header>
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
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_RECORD);
  const [reason, setReason] = useState('');

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

  if (loading) return <div className="ph-loading"><span /><h1>Đang tải hồ sơ nhân sự…</h1></div>;

  return (
    <div className="page personnel-hub-page">
      <PersonnelHero admin={admin} stats={stats} onPrimary={() => admin ? setSelectedId(snapshot.records[0]?.id || '') : startEdit()} />

      <section className="ph-stat-grid">
        <StatCard icon="groups" label="Tổng giáo viên" value={stats.total} caption="Tài khoản trong hệ thống" tone="blue" />
        <StatCard icon="verified" label="Đang hoạt động" value={stats.active} caption="Được phép sử dụng Brian" tone="green" />
        <StatCard icon="assignment_late" label="Thiếu thông tin" value={stats.incomplete} caption="Hồ sơ hoàn thiện dưới 75%" tone="yellow" />
        <StatCard icon="edit_notifications" label="Chờ xử lý" value={stats.pending} caption="Đề nghị chỉnh sửa hồ sơ" tone="red" />
      </section>

      {message ? <div className="ph-message"><MaterialIcon>info</MaterialIcon>{message}<button type="button" onClick={() => setMessage('')}>×</button></div> : null}

      <div className={`ph-workspace ${admin ? 'admin' : 'teacher'}`}>
        {admin ? <ProfileList records={snapshot.records} selectedId={selected?.id} onSelect={(id) => { setSelectedId(id); setEditing(false); }} filter={filter} setFilter={setFilter} /> : null}

        <section className="ph-profile-panel">
          {selected ? (
            <>
              <ProfileHeader record={selected} admin={admin} editing={editing} onEdit={startEdit} onToggleAccount={toggleAccount} />
              <div className="ph-login-strip"><MaterialIcon>alternate_email</MaterialIcon><div><small>Email đăng nhập</small><strong>{selected.loginEmail}</strong></div><span>{selected.accountApproved ? 'Đang được phép truy cập' : 'Đang bị tạm khóa'}</span></div>
              {editing ? (
                <div className="ph-editor">
                  <RecordForm record={form} onChange={updateField} teacherMode={!admin} />
                  {!admin ? <label className="ph-reason"><span>Lý do đề nghị</span><textarea rows="3" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Mô tả ngắn gọn vì sao cần cập nhật…" /></label> : null}
                  <footer className="ph-editor-actions"><button type="button" className="ph-outline" onClick={startEdit}>Hủy</button><button type="button" className="ph-primary" disabled={busy === 'save'} onClick={save}><MaterialIcon>save</MaterialIcon>{busy === 'save' ? 'Đang lưu…' : admin ? 'Lưu hồ sơ' : 'Gửi Admin duyệt'}</button></footer>
                </div>
              ) : <RecordDetails record={selected} />}
            </>
          ) : <div className="ph-empty large">Chưa có tài khoản giáo viên trong hệ thống.</div>}
        </section>
      </div>

      <ChangeRequests requests={snapshot.requests} admin={admin} onReview={review} busy={busy} />
      <footer className="ph-page-footer"><span><MaterialIcon>shield</MaterialIcon>Dữ liệu nhân sự được giới hạn theo vai trò tài khoản.</span><span>Cập nhật gần nhất: {formatDate(snapshot.updatedAt)}</span></footer>
    </div>
  );
}
