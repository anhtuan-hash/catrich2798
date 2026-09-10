import React, { useMemo, useState } from 'react';
import { attendanceSubjectKey, extraClassTypeLabel } from '../../utils/extraClassAttendance.js';
import { roomForExtraClass, weekdaysForExtraClass } from '../../utils/extraClassSchedule2026.js';
import AttendanceClassEditor from './AttendanceClassEditor.jsx';
import './AttendanceClassManagementWorkspace.css';
import './AttendanceClassManagementDetailMockup.css';
import './AttendanceClassManagementRosterScroll.css';

const WEEKDAY_LABELS = new Map([
  [1, 'Thứ 2'],
  [2, 'Thứ 3'],
  [3, 'Thứ 4'],
  [4, 'Thứ 5'],
  [5, 'Thứ 6'],
  [6, 'Thứ 7'],
  [0, 'Chủ nhật'],
]);

function fold(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function weekdayLabel(classRow) {
  const labels = weekdaysForExtraClass(classRow)
    .map((day) => WEEKDAY_LABELS.get(day))
    .filter(Boolean);
  return labels.length ? labels.join(', ') : 'Chưa ghi ngày';
}

function shortTypeLabel(classType) {
  return classType === 'remedial' ? 'Phụ đạo' : 'Bồi dưỡng';
}

function countTeachers(label) {
  const value = String(label || '').trim();
  if (!value || value === 'Chưa phân công GV') return 0;
  return value.split(',').map((item) => item.trim()).filter(Boolean).length;
}

function compactTeacherLabel(label) {
  const value = String(label || '').trim();
  if (!value || value === 'Chưa phân công GV') return 'Chưa phân công GV';
  const names = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (names.length <= 1) return names[0] || 'Chưa phân công GV';
  return `${names[0]} +${names.length - 1} GV`;
}

function WorkspaceIcon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    upload: <><path d="M12 16V4m0 0-4 4m4-4 4 4" /><path d="M5 15v4h14v-4" /></>,
    download: <><path d="M12 4v12m0 0 4-4m-4 4-4-4" /><path d="M5 15v4h14v-4" /></>,
    room: <><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4m8-4v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    teacher: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2" /><path d="m16 7 2-2 3 3-2 2m-3-3 3 3m-3-3-4 4" /></>,
    back: <><path d="m15 18-6-6 6-6" /><path d="M9 12h10" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6m4-6v6" /></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
  };
  return <svg {...common}>{paths[name] || paths.list}</svg>;
}

function downloadMemberCsv(selectedClass, members) {
  if (!selectedClass) return;
  const rows = [
    ['STT', 'Họ và tên', 'Mã HS', 'Lớp chính khóa', 'Trạng thái'],
    ...members.map((member, index) => [
      index + 1,
      member.student_full_name || '',
      member.student_code || '',
      member.school_class_name || '',
      member.active === false ? 'Đã nghỉ' : 'Đang học',
    ]),
  ];
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCell).join(',')).join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${String(selectedClass.class_name || 'danh-sach-lop').replace(/[\\/:*?"<>|]+/g, '-')}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function AttendanceClassManagementWorkspace({
  activeClasses = [],
  selectedClass,
  allSelectedMembers = [],
  filteredManagementMembers = [],
  memberCounts,
  teachersForClass,
  busy = false,
  fileRef,
  importExcel,
  importReport,
  memberQuery,
  setMemberQuery,
  showAddStudent,
  setShowAddStudent,
  addForm,
  setAddForm,
  addStudent,
  showAddTeacher,
  setShowAddTeacher,
  newTeacherName,
  setNewTeacherName,
  addTeacher,
  deleteClass,
  client,
  isAdmin,
  canManageMembers,
  removeStudent,
  loadAll,
  setError,
  setNotice,
  onSelectClass,
}) {
  const [manageDetailOpen, setManageDetailOpen] = useState(false);
  const [manageClassQuery, setManageClassQuery] = useState('');
  const [manageTypeFilter, setManageTypeFilter] = useState('all');
  const [manageGradeFilter, setManageGradeFilter] = useState('all');
  const [editingClass, setEditingClass] = useState(false);

  const filteredManageClasses = useMemo(() => activeClasses.filter((classRow) => {
    if (manageTypeFilter !== 'all' && classRow.class_type !== manageTypeFilter) return false;
    if (manageGradeFilter !== 'all' && String(classRow.grade_level || '') !== manageGradeFilter) return false;
    const query = fold(manageClassQuery);
    if (!query) return true;
    const haystack = fold(`${classRow.class_name} ${classRow.subject} ${teachersForClass?.(classRow)} ${roomForExtraClass(classRow)} ${weekdayLabel(classRow)}`);
    return haystack.includes(query);
  }), [activeClasses, manageClassQuery, manageTypeFilter, manageGradeFilter, teachersForClass]);

  const detailVisible = Boolean(manageDetailOpen && selectedClass);

  function openClass(classRow) {
    onSelectClass?.(classRow.id);
    setMemberQuery?.('');
    setShowAddStudent?.(false);
    setShowAddTeacher?.(false);
    setEditingClass(false);
    setManageDetailOpen(true);
  }

  function backToOverview() {
    setManageDetailOpen(false);
    setMemberQuery?.('');
    setShowAddStudent?.(false);
    setShowAddTeacher?.(false);
    setEditingClass(false);
  }

  if (!detailVisible) {
    return (
      <section className="attendance-manage-overview">
        <div className="attendance-manage-overview-toolbar attendance-import-card">
          <label className="attendance-manage-search" data-bes-keep-search="true">
            <WorkspaceIcon name="search" size={17} />
            <input
              value={manageClassQuery}
              onChange={(event) => setManageClassQuery(event.target.value)}
              placeholder="Tìm kiếm tên lớp, môn học, giáo viên..."
              aria-label="Tìm kiếm lớp quản lý"
            />
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => importExcel?.(event.target.files?.[0])}
            hidden
          />
          <button type="button" className="attendance-manage-import-button" disabled={busy} onClick={() => fileRef?.current?.click()}>
            <WorkspaceIcon name="upload" size={17} />
            {busy ? 'Đang xử lý…' : 'Chọn file Excel'}
          </button>
        </div>

        <div className="attendance-manage-filter-chips" aria-label="Bộ lọc lớp">
          <div role="group" aria-label="Loại lớp">
            {[
              ['all', 'Tất cả'],
              ['remedial', 'Phụ đạo'],
              ['gifted', 'Bồi dưỡng'],
            ].map(([value, label]) => (
              <button key={value} type="button" className={manageTypeFilter === value ? 'is-active' : ''} onClick={() => setManageTypeFilter(value)}>{label}</button>
            ))}
          </div>
          <span className="attendance-manage-filter-divider" aria-hidden="true" />
          <div role="group" aria-label="Khối lớp">
            {[
              ['all', 'Tất cả khối'],
              ['10', 'Khối 10'],
              ['11', 'Khối 11'],
              ['12', 'Khối 12'],
            ].map(([value, label]) => (
              <button key={value} type="button" className={manageGradeFilter === value ? 'is-active' : ''} onClick={() => setManageGradeFilter(value)}>{label}</button>
            ))}
          </div>
          <span className="attendance-manage-result-count">{filteredManageClasses.length}/{activeClasses.length} lớp</span>
        </div>

        {importReport ? (
          <section className="attendance-import-report">
            <strong>{importReport.fileName}</strong>
            <div>
              <span>{importReport.totalClasses} lớp trong file</span>
              <span>{importReport.totalStudents} học sinh</span>
              <span>{importReport.createdClasses} lớp mới</span>
              <span>{importReport.addedMembers} HS thêm mới</span>
              <span>{importReport.reactivatedMembers} HS trở lại</span>
            </div>
            {importReport.warnings?.length ? <details><summary>{importReport.warnings.length} lưu ý import</summary>{importReport.warnings.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}</details> : null}
          </section>
        ) : null}

        <div className="attendance-manage-tile-grid">
          {filteredManageClasses.map((classRow) => {
            const subjectKey = attendanceSubjectKey(classRow.subject);
            const room = roomForExtraClass(classRow) || 'Chưa ghi phòng';
            const weekday = weekdayLabel(classRow);
            const time = String(classRow.time_range || '').trim() || 'Chưa ghi giờ';
            const studentCount = memberCounts?.get(String(classRow.id)) || 0;
            const teacher = teachersForClass?.(classRow) || 'Chưa phân công GV';
            return (
              <button
                key={classRow.id}
                type="button"
                className={`attendance-manage-class-tile is-subject-${subjectKey} is-${classRow.class_type}`}
                onClick={() => openClass(classRow)}
              >
                <span className="attendance-manage-tile__topline">
                  <span className="attendance-manage-tile__icon"><WorkspaceIcon name="list" size={22} /></span>
                  <span className={`attendance-manage-tile__type is-${classRow.class_type}`}>{shortTypeLabel(classRow.class_type)}</span>
                </span>
                <span className="attendance-manage-tile__title">{classRow.class_name}</span>
                <span className="attendance-manage-tile__subtitle">{classRow.subject || 'Chưa ghi môn'} · {classRow.grade_level ? `Khối ${classRow.grade_level}` : 'Chưa ghi khối'}</span>
                <span className="attendance-manage-tile__meta">
                  <span className="attendance-manage-tile__room"><WorkspaceIcon name="room" size={15} />Phòng {room}</span>
                  <span className="attendance-manage-tile__weekday"><WorkspaceIcon name="calendar" size={15} />{weekday}</span>
                  <span className="attendance-manage-tile__time"><WorkspaceIcon name="clock" size={15} />{time}</span>
                  <span className="attendance-manage-tile__students"><WorkspaceIcon name="users" size={15} />{studentCount} học sinh</span>
                  <span className="attendance-manage-tile__teacher" title={teacher}><WorkspaceIcon name="teacher" size={15} />{teacher}</span>
                </span>
              </button>
            );
          })}
          {!filteredManageClasses.length ? <div className="attendance-manage-overview-empty">Không có lớp phù hợp bộ lọc.</div> : null}
        </div>
      </section>
    );
  }

  const room = roomForExtraClass(selectedClass) || 'Chưa ghi phòng';
  const weekday = weekdayLabel(selectedClass);
  const time = String(selectedClass.time_range || '').trim() || 'Chưa ghi giờ';
  const teacher = teachersForClass?.(selectedClass) || 'Chưa phân công GV';
  const selectedAssignedTeachers = teacher === 'Chưa phân công GV'
    ? []
    : teacher.split(',').map((name) => name.trim()).filter(Boolean);
  const teacherCount = countTeachers(teacher);
  const teacherSummary = compactTeacherLabel(teacher);
  const subjectKey = attendanceSubjectKey(selectedClass.subject);
  const isActive = selectedClass.active !== false;
  const activeMemberCount = allSelectedMembers.filter((member) => member.active !== false).length;
  const inactiveMemberCount = allSelectedMembers.length - activeMemberCount;

  return (
    <section className={`attendance-manage-detail is-subject-${subjectKey}`}>
      <button type="button" className="attendance-manage-detail-back" onClick={backToOverview}>
        <WorkspaceIcon name="back" size={17} />Quay lại danh sách lớp
      </button>

      <section className="attendance-manage-detail-hero">
        <div className="attendance-manage-detail-hero__art" aria-hidden="true"><WorkspaceIcon name="globe" size={88} /></div>
        <div className="attendance-manage-detail-hero__content">
          <div className="attendance-manage-detail-hero__main">
            <span className="attendance-manage-detail-hero__icon"><WorkspaceIcon name="globe" size={34} /></span>
            <div>
              <div className="attendance-manage-detail-hero__eyebrow">
                <span className={`attendance-manage-tile__type is-${selectedClass.class_type}`}>{shortTypeLabel(selectedClass.class_type)}</span>
                {selectedClass.grade_level ? <span className="attendance-manage-detail-grade">Khối {selectedClass.grade_level}</span> : null}
              </div>
              <h2>{selectedClass.class_name}</h2>
              <p className="attendance-manage-detail-hero__meta">
                <span>{selectedClass.subject || 'Chưa ghi môn'}</span>
                <span>Phòng {room}</span>
                <span>{weekday}</span>
                <span>{time}</span>
              </p>
            </div>
          </div>

          <div className="attendance-manage-detail-hero__side">
            <div className="attendance-manage-detail-quick-stats" aria-label="Tóm tắt lớp">
              <article className="attendance-manage-detail-quick-stat">
                <span><WorkspaceIcon name="users" size={20} /></span>
                <div><b>{activeMemberCount}</b><small>học sinh</small></div>
              </article>
              <article className="attendance-manage-detail-quick-stat">
                <span><WorkspaceIcon name="teacher" size={20} /></span>
                <div><b>{teacherCount}</b><small>giáo viên</small></div>
              </article>
              <article className={`attendance-manage-detail-quick-stat is-status ${isActive ? 'is-active' : 'is-inactive'}`}>
                <i aria-hidden="true" />
                <div><b>{isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}</b><small>{isActive ? 'Lớp đang diễn ra' : 'Lớp đã ngừng'}</small></div>
              </article>
            </div>

            <div className="attendance-manage-detail-actions">
              <button type="button" className="attendance-manage-detail-actions__primary" disabled={busy} onClick={() => setShowAddStudent?.((value) => !value)}><WorkspaceIcon name="plus" size={17} />Thêm học sinh</button>
              <button type="button" disabled={busy} onClick={() => setEditingClass(true)}><WorkspaceIcon name="edit" size={15} />Sửa thông tin lớp</button>
              <button type="button" disabled={busy} onClick={() => setShowAddTeacher?.((value) => !value)}><WorkspaceIcon name="plus" size={16} />Thêm giáo viên</button>
              <button type="button" className="is-danger" disabled={busy} onClick={() => deleteClass?.(selectedClass)}><WorkspaceIcon name="trash" size={15} />Xóa lớp</button>
            </div>
          </div>
        </div>
      </section>

      <section className="attendance-manage-detail-info-strip" aria-label="Thông tin lớp học">
        <article className="attendance-manage-detail-info-item"><span><WorkspaceIcon name="book" size={20} /></span><div><small>Môn học</small><b>{selectedClass.subject || 'Chưa ghi'}</b></div></article>
        <article className="attendance-manage-detail-info-item"><span><WorkspaceIcon name="layers" size={20} /></span><div><small>Khối</small><b>{selectedClass.grade_level ? `Khối ${selectedClass.grade_level}` : 'Chưa ghi'}</b></div></article>
        <article className="attendance-manage-detail-info-item"><span><WorkspaceIcon name="room" size={20} /></span><div><small>Phòng học</small><b>{room}</b></div></article>
        <article className="attendance-manage-detail-info-item"><span><WorkspaceIcon name="calendar" size={20} /></span><div><small>Lịch học</small><b>{weekday}</b></div></article>
        <article className="attendance-manage-detail-info-item"><span><WorkspaceIcon name="clock" size={20} /></span><div><small>Thời gian</small><b>{time}</b></div></article>
        <article className="attendance-manage-detail-info-item"><span><WorkspaceIcon name="teacher" size={20} /></span><div><small>Giáo viên phụ trách</small><b className="attendance-manage-detail-teacher-summary" title={teacher}>{teacherSummary}</b></div></article>
      </section>

      {showAddTeacher ? (
        <form className="attendance-manage-detail-add attendance-add-teacher" onSubmit={addTeacher}>
          <div><strong>Thêm giáo viên</strong><span>Giáo viên sẽ được thêm vào phân công của lớp.</span></div>
          <input value={newTeacherName} onChange={(event) => setNewTeacherName?.(event.target.value)} placeholder="Nhập họ tên giáo viên" autoFocus />
          <button type="button" disabled={busy} onClick={() => { setShowAddTeacher?.(false); setNewTeacherName?.(''); }}>Hủy</button>
          <button type="submit" disabled={busy || !String(newTeacherName || '').trim()}>{busy ? 'Đang lưu…' : 'Lưu giáo viên'}</button>
        </form>
      ) : null}

      {showAddStudent ? (
        <form className="attendance-manage-detail-add attendance-add-student" onSubmit={addStudent}>
          <label><span>Mã HS</span><input value={addForm.student_code} onChange={(event) => setAddForm?.((current) => ({ ...current, student_code: event.target.value }))} placeholder="Có thể để trống" /></label>
          <label><span>Họ và tên *</span><input value={addForm.student_full_name} onChange={(event) => setAddForm?.((current) => ({ ...current, student_full_name: event.target.value }))} required /></label>
          <label><span>Lớp chính khóa *</span><input value={addForm.school_class_name} onChange={(event) => setAddForm?.((current) => ({ ...current, school_class_name: event.target.value }))} placeholder="Ví dụ 12.6" required /></label>
          <div><button type="button" onClick={() => setShowAddStudent?.(false)}>Hủy</button><button type="submit" disabled={busy}><WorkspaceIcon name="plus" size={16} />Thêm vào lớp</button></div>
        </form>
      ) : null}

      <section className="attendance-manage-detail-roster-card">
        <header className="attendance-manage-detail-roster-toolbar">
          <div className="attendance-manage-detail-roster-title">
            <span><WorkspaceIcon name="users" size={21} /></span>
            <div><strong>Danh sách học sinh</strong><small>{activeMemberCount} đang học · {inactiveMemberCount} đã nghỉ · {allSelectedMembers.length} hồ sơ</small></div>
          </div>
          <label data-bes-keep-search="true"><WorkspaceIcon name="search" size={16} /><input value={memberQuery || ''} onChange={(event) => setMemberQuery?.(event.target.value)} placeholder="Tìm kiếm học sinh..." aria-label="Tìm kiếm học sinh" /></label>
          <button type="button" onClick={() => downloadMemberCsv(selectedClass, allSelectedMembers)}><WorkspaceIcon name="download" size={16} />Xuất danh sách</button>
        </header>

        <div className={`attendance-manage-detail-body${editingClass ? ' is-editing-class' : ''}`} tabIndex={0} aria-label="Danh sách học sinh có thể cuộn">
          <AttendanceClassEditor
            client={client}
            selectedClass={selectedClass}
            members={filteredManagementMembers}
            teacherNames={selectedAssignedTeachers}
            isAdmin={isAdmin}
            canManageMembers={canManageMembers}
            busy={busy}
            onRemoveStudent={removeStudent}
            onReload={loadAll}
            onError={setError}
            onNotice={setNotice}
            editingClass={editingClass}
            onEditingClassChange={setEditingClass}
            showEditButton={false}
            showClassInfo={editingClass}
            memberTableVariant="mockup"
          />
        </div>
      </section>
    </section>
  );
}
