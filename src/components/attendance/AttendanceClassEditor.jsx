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

function initialClassForm(classRow) {
  return {
    class_name: String(classRow?.class_name || ''),
    subject: String(classRow?.subject || ''),
    grade_level: String(classRow?.grade_level || ''),
    room: roomForExtraClass(classRow),
    time_range: String(classRow?.time_range || '').trim(),
    weekdays: weekdaysForExtraClass(classRow),
  };
}

function initialMemberForm(member) {
  return {
    student_code: String(member?.student_code || ''),
    student_full_name: String(member?.student_full_name || ''),
    school_class_name: String(member?.school_class_name || ''),
  };
}

export default function AttendanceClassEditor({
  client,
  selectedClass,
  members = [],
  isAdmin = false,
  busy = false,
  onRemoveStudent,
  onReload,
  onError,
  onNotice,
}) {
  const [editingClass, setEditingClass] = useState(false);
  const [classForm, setClassForm] = useState(() => initialClassForm(selectedClass));
  const [editingMemberId, setEditingMemberId] = useState('');
  const [memberForm, setMemberForm] = useState(() => initialMemberForm(null));
  const [saving, setSaving] = useState('');

  useEffect(() => {
    setClassForm(initialClassForm(selectedClass));
    setEditingClass(false);
    setEditingMemberId('');
    setMemberForm(initialMemberForm(null));
  }, [selectedClass?.id, selectedClass?.updated_at]);

  const currentWeekdays = useMemo(() => weekdaysForExtraClass(selectedClass), [selectedClass]);
  const currentRoom = roomForExtraClass(selectedClass);
  const locked = busy || Boolean(saving);

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
    setClassForm(initialClassForm(selectedClass));
    setEditingClass(false);
    onError?.('');
  }

  async function saveClassInfo(event) {
    event.preventDefault();
    if (!isAdmin || !selectedClass || !client || locked) return;

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
    if (!isAdmin || !member || member.active === false || locked) return;
    setEditingMemberId(String(member.id));
    setMemberForm(initialMemberForm(member));
    onError?.('');
  }

  function cancelMemberEdit() {
    setEditingMemberId('');
    setMemberForm(initialMemberForm(null));
    onError?.('');
  }

  async function saveMemberInfo(member) {
    if (!isAdmin || !selectedClass || !member || !client || locked) return;
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
      const { error } = await client.rpc('bes_admin_update_extra_class_member', {
        p_class_id: selectedClass.id,
        p_member_id: member.id,
        p_student_code: memberForm.student_code.trim(),
        p_student_full_name: fullName,
        p_school_class_name: schoolClass,
      });
      if (error) throw error;
      setEditingMemberId('');
      setMemberForm(initialMemberForm(null));
      onNotice?.(`Đã cập nhật ${fullName}. Lịch sử điểm danh trước đây không thay đổi.`);
      await onReload?.();
    } catch (saveError) {
      onError?.(saveError?.message || 'Không thể cập nhật thông tin học sinh.');
    } finally {
      setSaving('');
    }
  }

  if (!selectedClass) return null;

  return (
    <>
      <section className="attendance-class-info-card">
        <header className="attendance-class-info-head">
          <div>
            <span>THÔNG TIN LỚP HỌC</span>
            <strong>Dữ liệu hiện tại dùng cho các buổi chưa chốt</strong>
            <p>Các thay đổi bên dưới không sửa lại lịch sử điểm danh đã xác nhận.</p>
          </div>
          {isAdmin && !editingClass ? (
            <button type="button" disabled={locked} onClick={() => setEditingClass(true)}>Sửa thông tin lớp</button>
          ) : null}
        </header>

        {editingClass && isAdmin ? (
          <form className="attendance-class-edit-form" onSubmit={saveClassInfo}>
            <div className="attendance-class-edit-grid">
              <label><span>Tên lớp *</span><input value={classForm.class_name} onChange={(event) => setClassForm((current) => ({ ...current, class_name: event.target.value }))} /></label>
              <label><span>Môn học</span><input value={classForm.subject} onChange={(event) => setClassForm((current) => ({ ...current, subject: event.target.value }))} /></label>
              <label><span>Khối *</span><select value={classForm.grade_level} onChange={(event) => setClassForm((current) => ({ ...current, grade_level: event.target.value }))}><option value="">Chọn khối</option><option value="10">Khối 10</option><option value="11">Khối 11</option><option value="12">Khối 12</option></select></label>
              <label><span>Phòng học</span><input value={classForm.room} onChange={(event) => setClassForm((current) => ({ ...current, room: event.target.value }))} placeholder="Ví dụ A103" /></label>
              <label className="is-wide"><span>Thời gian học</span><input value={classForm.time_range} onChange={(event) => setClassForm((current) => ({ ...current, time_range: event.target.value }))} placeholder="Ví dụ 16h45 đến 18h15" /></label>
            </div>
            <div className="attendance-weekday-editor">
              <span>Ngày học trong tuần *</span>
              <div>{WEEKDAY_OPTIONS.map((item) => <button key={item.value} type="button" className={classForm.weekdays.includes(item.value) ? 'is-active' : ''} onClick={() => toggleWeekday(item.value)}>{item.label}</button>)}</div>
            </div>
            <footer><button type="button" disabled={locked} onClick={cancelClassEdit}>Hủy</button><button className="is-primary" type="submit" disabled={locked || !classForm.class_name.trim() || !classForm.weekdays.length}>{saving === 'class' ? 'Đang lưu…' : 'Lưu thông tin lớp'}</button></footer>
          </form>
        ) : (
          <div className="attendance-class-info-grid">
            <article><span>Tên lớp</span><b>{selectedClass.class_name}</b></article>
            <article><span>Môn học</span><b>{selectedClass.subject || 'Chưa ghi'}</b></article>
            <article><span>Khối</span><b>{selectedClass.grade_level ? `Khối ${selectedClass.grade_level}` : 'Chưa ghi'}</b></article>
            <article><span>Phòng học</span><b>{currentRoom || 'Chưa ghi'}</b></article>
            <article><span>Thời gian học</span><b>{selectedClass.time_range || 'Chưa ghi'}</b></article>
            <article className="is-wide"><span>Ngày học</span><b>{weekdayLabel(currentWeekdays)}</b></article>
          </div>
        )}
      </section>

      <div className="attendance-member-table">
        <div className="attendance-member-table-head"><span>Học sinh</span><span>Lớp</span><span>Trạng thái</span><span /></div>
        {members.map((member) => {
          const isEditing = String(editingMemberId) === String(member.id) && member.active !== false && isAdmin;
          if (isEditing) {
            return (
              <div key={member.id} className="attendance-member-edit-row">
                <span className="attendance-member-edit-fields">
                  <label><small>Mã HS</small><input value={memberForm.student_code} onChange={(event) => setMemberForm((current) => ({ ...current, student_code: event.target.value }))} placeholder="Có thể để trống" /></label>
                  <label><small>Họ và tên *</small><input value={memberForm.student_full_name} onChange={(event) => setMemberForm((current) => ({ ...current, student_full_name: event.target.value }))} /></label>
                </span>
                <span><label><small>Lớp chính khóa *</small><input value={memberForm.school_class_name} onChange={(event) => setMemberForm((current) => ({ ...current, school_class_name: event.target.value }))} placeholder="Ví dụ 12.6" /></label></span>
                <span>Đang chỉnh sửa</span>
                <span className="attendance-member-edit-actions"><button type="button" disabled={locked} onClick={cancelMemberEdit}>Hủy</button><button className="is-primary" type="button" disabled={locked || !memberForm.student_full_name.trim() || !memberForm.school_class_name.trim()} onClick={() => saveMemberInfo(member)}>{saving === `member:${member.id}` ? 'Đang lưu…' : 'Lưu'}</button></span>
              </div>
            );
          }
          return (
            <div key={member.id} className={member.active === false ? 'is-inactive' : ''}>
              <span><b>{member.student_full_name}</b><small>{member.student_code || 'Không có mã HS'}</small></span>
              <span>{member.school_class_name || '—'}</span>
              <span>{member.active === false ? `Đã rời lớp${member.left_at ? ` · ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(member.left_at))}` : ''}` : 'Đang học'}</span>
              <span className="attendance-member-row-actions">
                {member.active !== false && isAdmin ? <button type="button" disabled={locked} onClick={() => startEditMember(member)}>Sửa học sinh</button> : null}
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
