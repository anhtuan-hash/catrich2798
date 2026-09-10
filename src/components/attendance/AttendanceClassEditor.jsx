import React, { useEffect, useMemo, useState } from 'react';
import { roomForExtraClass, weekdaysForExtraClass } from '../../utils/extraClassSchedule2026.js';
import './AttendanceClassEditor.css';

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ nhật' },
];

function weekdayLabel(values = []) {
  const labels = WEEKDAY_OPTIONS.filter((item) => values.includes(item.value)).map((item) => item.label);
  return labels.length ? labels.join(', ') : 'Chưa ghi';
}

function normalizeTeacherNames(values = []) {
  const result = [];
  values.forEach((value) => {
    const clean = String(value || '').trim();
    if (!clean) return;
    const key = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    if (!result.some((name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase() === key)) result.push(clean);
  });
  return result;
}

function initialClassForm(classRow, teacherNames = []) {
  return {
    class_name: String(classRow?.class_name || ''),
    subject: String(classRow?.subject || ''),
    grade_level: String(classRow?.grade_level || ''),
    room: roomForExtraClass(classRow),
    time_range: String(classRow?.time_range || '').trim(),
    weekdays: weekdaysForExtraClass(classRow),
    teacher_names: normalizeTeacherNames(teacherNames),
  };
}

function initialMemberForm(member) {
  return {
    student_code: String(member?.student_code || ''),
    student_full_name: String(member?.student_full_name || ''),
    school_class_name: String(member?.school_class_name || ''),
    active: member?.active !== false,
  };
}

function studentInitials(value) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'HS';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[words.length - 1][0] || ''}`.toUpperCase();
}

export default function AttendanceClassEditor({
  client,
  selectedClass,
  members = [],
  teacherNames = [],
  canManageMembers = false,
  busy = false,
  onRemoveStudent,
  onReload,
  onError,
  onNotice,
  editingClass: controlledEditingClass,
  onEditingClassChange,
  showEditButton = true,
  showClassInfo = true,
  memberTableVariant = 'default',
  memberIndexOffset = 0,
}) {
  const [internalEditingClass, setInternalEditingClass] = useState(false);
  const [classForm, setClassForm] = useState(() => initialClassForm(selectedClass, teacherNames));
  const [newClassTeacherName, setNewClassTeacherName] = useState('');
  const [editingMemberId, setEditingMemberId] = useState('');
  const [memberForm, setMemberForm] = useState(() => initialMemberForm(null));
  const [saving, setSaving] = useState('');
  const [openMemberMenuId, setOpenMemberMenuId] = useState('');
  const editingClass = typeof controlledEditingClass === 'boolean' ? controlledEditingClass : internalEditingClass;
  const setEditingClass = (value) => {
    if (onEditingClassChange) onEditingClassChange(Boolean(value));
    else setInternalEditingClass(Boolean(value));
  };

  const teacherNamesKey = normalizeTeacherNames(teacherNames).join('\u0001');

  useEffect(() => {
    setClassForm(initialClassForm(selectedClass, teacherNames));
    setNewClassTeacherName('');
    setEditingClass(false);
    setEditingMemberId('');
    setMemberForm(initialMemberForm(null));
    setOpenMemberMenuId('');
  }, [selectedClass?.id, selectedClass?.updated_at, teacherNamesKey]);

  const currentWeekdays = useMemo(() => weekdaysForExtraClass(selectedClass), [selectedClass]);
  const currentRoom = roomForExtraClass(selectedClass);
  const locked = busy || Boolean(saving);
  const isMockupTable = memberTableVariant === 'mockup';

  function toggleWeekday(value) {
    setClassForm((current) => {
      const exists = current.weekdays.includes(value);
      return {
        ...current,
        weekdays: exists
          ? current.weekdays.filter((day) => day !== value)
          : [...current.weekdays, value],
      };
    });
  }

  function cancelClassEdit() {
    setClassForm(initialClassForm(selectedClass, teacherNames));
    setNewClassTeacherName('');
    setEditingClass(false);
    onError?.('');
  }

  function addClassTeacher() {
    const teacherName = newClassTeacherName.trim();
    if (!teacherName) return;
    const nextNames = normalizeTeacherNames([...classForm.teacher_names, teacherName]);
    if (nextNames.length === classForm.teacher_names.length) {
      onError?.(`${teacherName} đã có trong danh sách giáo viên của lớp.`);
      return;
    }
    setClassForm((current) => ({ ...current, teacher_names: nextNames }));
    setNewClassTeacherName('');
    onError?.('');
  }

  function removeClassTeacher(teacherName) {
    if (locked) return;
    setClassForm((current) => ({
      ...current,
      teacher_names: current.teacher_names.filter((name) => name !== teacherName),
    }));
    onError?.('');
  }

  async function saveClassInfo(event) {
    event.preventDefault();
    if (!canManageMembers || !selectedClass || !client || locked) return;

    const className = classForm.class_name.trim();
    const gradeLevel = Number(classForm.grade_level);
    if (!className) {
      onError?.('Tên lớp không được để trống.');
      return;
    }
    if (![10, 11, 12].includes(gradeLevel)) {
      onError?.('Khối lớp phải là 10, 11 hoặc 12.');
      return;
    }
    if (!classForm.weekdays.length) {
      onError?.('Vui lòng chọn ít nhất một ngày học trong tuần.');
      return;
    }
    if (classForm.teacher_names.length === 0) {
      onError?.('Lớp phải có ít nhất một giáo viên.');
      return;
    }

    setSaving('class');
    onError?.('');
    onNotice?.('');
    try {
      const { error } = await client.rpc('bes_admin_update_extra_class', {
        p_class_id: selectedClass.id,
        p_class_name: className,
        p_subject: classForm.subject.trim(),
        p_grade_level: gradeLevel,
        p_room: classForm.room.trim(),
        p_time_range: classForm.time_range.trim(),
        p_weekdays: classForm.weekdays,
        p_teacher_names: classForm.teacher_names,
      });
      if (error) throw error;
      setEditingClass(false);
      onNotice?.(`Đã cập nhật thông tin lớp ${className}. Các buổi đã chốt vẫn giữ nguyên dữ liệu lịch sử.`);
      await onReload?.();
    } catch (saveError) {
      onError?.(saveError?.message || 'Không thể cập nhật thông tin lớp.');
    } finally {
      setSaving('');
    }
  }

  function startEditMember(member) {
    if (!canManageMembers || !member || locked) return;
    setEditingMemberId(String(member.id));
    setMemberForm(initialMemberForm(member));
    setOpenMemberMenuId('');
    onError?.('');
  }

  function cancelMemberEdit() {
    setEditingMemberId('');
    setMemberForm(initialMemberForm(null));
    onError?.('');
  }

  async function saveMemberInfo(member) {
    if (!canManageMembers || !selectedClass || !member || !client || locked) return;
    const fullName = memberForm.student_full_name.trim();
    const schoolClass = memberForm.school_class_name.trim();
    if (!fullName || !schoolClass) {
      onError?.('Vui lòng nhập Họ và tên và Lớp chính khóa.');
      return;
    }

    setSaving(`member:${member.id}`);
    onError?.('');
    onNotice?.('');
    try {
      const { error } = await client.rpc('bes_update_extra_class_member', {
        p_class_id: selectedClass.id,
        p_member_id: member.id,
        p_student_code: memberForm.student_code.trim(),
        p_student_full_name: fullName,
        p_school_class_name: schoolClass,
        p_active: Boolean(memberForm.active),
      });
      if (error) throw error;
      setEditingMemberId('');
      setMemberForm(initialMemberForm(null));
      onNotice?.(`Đã cập nhật ${fullName} · ${memberForm.active ? 'Đang học' : 'Đã nghỉ'}. Lịch sử điểm danh trước đây không thay đổi.`);
      await onReload?.();
    } catch (saveError) {
      onError?.(saveError?.message || 'Không thể cập nhật thông tin học sinh.');
    } finally {
      setSaving('');
    }
  }

  if (!selectedClass) return null;

  const classInfoSection = showClassInfo ? (
    <section className="attendance-class-info-card">
      <header className="attendance-class-info-head">
        <div>
          <span>THÔNG TIN LỚP HỌC</span>
          <strong>Dữ liệu hiện tại dùng cho các buổi chưa chốt</strong>
          <p>Các thay đổi bên dưới không sửa lại lịch sử điểm danh đã xác nhận.</p>
        </div>
        {showEditButton && canManageMembers && !editingClass ? (
          <button type="button" disabled={locked} onClick={() => setEditingClass(true)}>Sửa thông tin lớp</button>
        ) : null}
      </header>

      {editingClass && canManageMembers ? (
        <form className="attendance-class-edit-form" onSubmit={saveClassInfo}>
          <div className="attendance-class-edit-grid">
            <label><span>Tên lớp *</span><input value={classForm.class_name} onChange={(event) => setClassForm((current) => ({ ...current, class_name: event.target.value }))} /></label>
            <label><span>Môn học</span><input value={classForm.subject} onChange={(event) => setClassForm((current) => ({ ...current, subject: event.target.value }))} /></label>
            <label><span>Khối *</span><select value={classForm.grade_level} onChange={(event) => setClassForm((current) => ({ ...current, grade_level: event.target.value }))}><option value="">Chọn khối</option><option value="10">Khối 10</option><option value="11">Khối 11</option><option value="12">Khối 12</option></select></label>
            <label><span>Phòng học</span><input value={classForm.room} onChange={(event) => setClassForm((current) => ({ ...current, room: event.target.value }))} placeholder="Ví dụ A103" /></label>
            <label className="is-wide"><span>Thời gian học</span><input value={classForm.time_range} onChange={(event) => setClassForm((current) => ({ ...current, time_range: event.target.value }))} placeholder="Ví dụ 16h45 đến 18h15" /></label>
          </div>
          <div className="attendance-class-teacher-editor">
            <span>Giáo viên dạy lớp *</span>
            <div className="attendance-class-teacher-chips">
              {classForm.teacher_names.length ? classForm.teacher_names.map((teacherName) => (
                <span key={teacherName} className="attendance-class-teacher-chip">
                  <b>{teacherName}</b>
                  <button type="button" disabled={locked} aria-label={`Xóa ${teacherName} khỏi lớp`} onClick={() => removeClassTeacher(teacherName)}>×</button>
                </span>
              )) : <em>Chưa có giáo viên. Thêm ít nhất một giáo viên để lưu.</em>}
            </div>
            <div className="attendance-class-teacher-add">
              <input
                value={newClassTeacherName}
                onChange={(event) => setNewClassTeacherName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addClassTeacher();
                  }
                }}
                placeholder="Nhập họ tên giáo viên"
                aria-label="Họ tên giáo viên cần thêm"
              />
              <button type="button" disabled={locked || !newClassTeacherName.trim()} onClick={addClassTeacher}>+ Thêm giáo viên</button>
            </div>
            <small>Danh sách này sẽ được dùng cho các buổi điểm danh chưa chốt. Lịch sử đã xác nhận không thay đổi.</small>
          </div>
          <div className="attendance-weekday-editor">
            <span>Ngày học trong tuần *</span>
            <div>{WEEKDAY_OPTIONS.map((item) => <button key={item.value} type="button" className={classForm.weekdays.includes(item.value) ? 'is-active' : ''} onClick={() => toggleWeekday(item.value)}>{item.label}</button>)}</div>
          </div>
          <footer><button type="button" disabled={locked} onClick={cancelClassEdit}>Hủy</button><button className="is-primary" type="submit" disabled={locked || !classForm.class_name.trim() || !classForm.weekdays.length || classForm.teacher_names.length === 0}>{saving === 'class' ? 'Đang lưu…' : 'Lưu thông tin lớp'}</button></footer>
        </form>
      ) : (
        <div className="attendance-class-info-grid">
          <article><span>Tên lớp</span><b>{selectedClass.class_name}</b></article>
          <article><span>Môn học</span><b>{selectedClass.subject || 'Chưa ghi'}</b></article>
          <article><span>Khối</span><b>{selectedClass.grade_level ? `Khối ${selectedClass.grade_level}` : 'Chưa ghi'}</b></article>
          <article><span>Phòng học</span><b>{currentRoom || 'Chưa ghi'}</b></article>
          <article><span>Thời gian học</span><b>{selectedClass.time_range || 'Chưa ghi'}</b></article>
          <article className="is-wide"><span>Giáo viên dạy lớp</span><b>{normalizeTeacherNames(teacherNames).join(', ') || 'Chưa phân công'}</b></article>
          <article className="is-wide"><span>Ngày học</span><b>{weekdayLabel(currentWeekdays)}</b></article>
        </div>
      )}
    </section>
  ) : null;

  if (isMockupTable) {
    return (
      <>
        {classInfoSection}
        <div className="attendance-member-table is-mockup">
          <div className="attendance-member-table-head"><span>STT</span><span>Học sinh</span><span>Lớp chính khóa</span><span>Mã HS</span><span>Trạng thái</span><span>Hành động</span></div>
          {members.map((member, index) => {
            const isEditing = String(editingMemberId) === String(member.id) && canManageMembers;
            if (isEditing) {
              return (
                <div key={member.id} className="attendance-member-edit-row is-mockup-row">
                  <span className="attendance-member-table__index">{memberIndexOffset + index + 1}</span>
                  <span><label><small>Họ và tên *</small><input value={memberForm.student_full_name} onChange={(event) => setMemberForm((current) => ({ ...current, student_full_name: event.target.value }))} /></label></span>
                  <span><label><small>Lớp chính khóa *</small><input value={memberForm.school_class_name} onChange={(event) => setMemberForm((current) => ({ ...current, school_class_name: event.target.value }))} placeholder="Ví dụ 12.6" /></label></span>
                  <span><label><small>Mã HS</small><input value={memberForm.student_code} onChange={(event) => setMemberForm((current) => ({ ...current, student_code: event.target.value }))} placeholder="Có thể để trống" /></label></span>
                  <span><label><small>Trạng thái</small><select value={memberForm.active ? 'active' : 'inactive'} onChange={(event) => setMemberForm((current) => ({ ...current, active: event.target.value === 'active' }))}><option value="active">Đang học</option><option value="inactive">Đã nghỉ</option></select></label></span>
                  <span className="attendance-member-edit-actions"><button type="button" disabled={locked} onClick={cancelMemberEdit}>Hủy</button><button className="is-primary" type="button" disabled={locked || !memberForm.student_full_name.trim() || !memberForm.school_class_name.trim()} onClick={() => saveMemberInfo(member)}>{saving === `member:${member.id}` ? 'Đang lưu…' : 'Lưu'}</button></span>
                </div>
              );
            }

            const menuOpen = String(openMemberMenuId) === String(member.id);
            return (
              <div key={member.id} className={`attendance-member-table-row${member.active === false ? ' is-inactive' : ''}`}>
                <span className="attendance-member-table__index">{memberIndexOffset + index + 1}</span>
                <span className="attendance-member-name-cell"><span className="attendance-member-avatar">{studentInitials(member.student_full_name)}</span><b>{member.student_full_name}</b></span>
                <span className="attendance-member-school-class">{member.school_class_name || '—'}</span>
                <span className="attendance-member-code">{member.student_code || '—'}</span>
                <span><em className={`attendance-member-status-pill ${member.active === false ? 'is-inactive' : 'is-active'}`}><i aria-hidden="true" />{member.active === false ? 'Đã nghỉ' : 'Đang học'}</em></span>
                <span className="attendance-member-row-actions is-compact">
                  {canManageMembers ? <button type="button" className="attendance-member-edit-button" disabled={locked} onClick={() => startEditMember(member)}>Sửa</button> : null}
                  {canManageMembers ? (
                    <button
                      type="button"
                      className="attendance-member-menu-button"
                      disabled={locked}
                      aria-label={`Mở thao tác cho ${member.student_full_name}`}
                      aria-expanded={menuOpen}
                      onClick={() => setOpenMemberMenuId((current) => String(current) === String(member.id) ? '' : String(member.id))}
                    >…</button>
                  ) : null}
                  {canManageMembers && menuOpen ? (
                    <span className="attendance-member-row-menu">
                      {member.active !== false ? <button type="button" disabled={locked} onClick={() => { setOpenMemberMenuId(''); onRemoveStudent?.(member); }}>Xóa khỏi lớp</button> : <em>{member.removal_reason || 'Đã lưu lịch sử'}</em>}
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
          {!members.length ? <div className="attendance-empty">Không có học sinh phù hợp.</div> : null}
        </div>
      </>
    );
  }

  return (
    <>
      {classInfoSection}
      <div className="attendance-member-table">
        <div className="attendance-member-table-head"><span>Học sinh</span><span>Lớp</span><span>Trạng thái</span><span /></div>
        {members.map((member) => {
          const isEditing = String(editingMemberId) === String(member.id) && canManageMembers;
          if (isEditing) {
            return (
              <div key={member.id} className="attendance-member-edit-row">
                <span className="attendance-member-edit-fields">
                  <label><small>Mã HS</small><input value={memberForm.student_code} onChange={(event) => setMemberForm((current) => ({ ...current, student_code: event.target.value }))} placeholder="Có thể để trống" /></label>
                  <label><small>Họ và tên *</small><input value={memberForm.student_full_name} onChange={(event) => setMemberForm((current) => ({ ...current, student_full_name: event.target.value }))} /></label>
                </span>
                <span><label><small>Lớp chính khóa *</small><input value={memberForm.school_class_name} onChange={(event) => setMemberForm((current) => ({ ...current, school_class_name: event.target.value }))} placeholder="Ví dụ 12.6" /></label></span>
                <span><label><small>Trạng thái</small><select value={memberForm.active ? 'active' : 'inactive'} onChange={(event) => setMemberForm((current) => ({ ...current, active: event.target.value === 'active' }))}><option value="active">Đang học</option><option value="inactive">Đã nghỉ</option></select></label></span>
                <span className="attendance-member-edit-actions"><button type="button" disabled={locked} onClick={cancelMemberEdit}>Hủy</button><button className="is-primary" type="button" disabled={locked || !memberForm.student_full_name.trim() || !memberForm.school_class_name.trim()} onClick={() => saveMemberInfo(member)}>{saving === `member:${member.id}` ? 'Đang lưu…' : 'Lưu'}</button></span>
              </div>
            );
          }
          return (
            <div key={member.id} className={member.active === false ? 'is-inactive' : ''}>
              <span><b>{member.student_full_name}</b><small>{member.student_code || 'Không có mã HS'}</small></span>
              <span>{member.school_class_name || '—'}</span>
              <span>{member.active === false ? `Đã nghỉ${member.left_at ? ` · ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(member.left_at))}` : ''}` : 'Đang học'}</span>
              <span className="attendance-member-row-actions">
                {canManageMembers ? <button type="button" disabled={locked} onClick={() => startEditMember(member)}>Sửa học sinh</button> : null}
                {member.active !== false ? <button type="button" disabled={locked} onClick={() => onRemoveStudent?.(member)}>Xóa khỏi lớp</button> : <em>{member.removal_reason || 'Đã lưu lịch sử'}</em>}
              </span>
            </div>
          );
        })}
        {!members.length ? <div className="attendance-empty">Không có học sinh phù hợp.</div> : null}
      </div>
    </>
  );
}
