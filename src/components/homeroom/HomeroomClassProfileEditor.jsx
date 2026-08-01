import React from 'react';
import {
  HOMEROOM_CLASS_TYPE_OPTIONS,
  SUBJECT_CLASS_TYPE,
  normalizeHomeroomClassType,
} from '../../utils/homeroomClassTypes.js';

function hasText(value) {
  return Boolean(String(value ?? '').trim());
}

export default function HomeroomClassProfileEditor({ value, onChange, onSave, saving, language = 'vi' }) {
  const classType = normalizeHomeroomClassType(value.classType);
  const subjectMode = classType === SUBJECT_CLASS_TYPE;
  const field = (key, label, type = 'text') => <label key={key}><span>{label}</span><input type={type} value={value[key] || ''} onChange={(event) => onChange({ ...value, [key]: event.target.value })} /></label>;

  return <section className="hr-panel hr-class-setup">
    <div className="hr-panel-head"><div><small>{language === 'vi' ? 'Thiết lập lớp' : 'Class setup'}</small><h2>{language === 'vi' ? (subjectMode ? 'Thông tin lớp bộ môn' : 'Thông tin lớp chủ nhiệm') : (subjectMode ? 'Subject class profile' : 'Homeroom class profile')}</h2></div><button type="button" className="primary" disabled={saving || !hasText(value.className)} onClick={onSave}>{saving ? 'Đang lưu…' : 'Lưu thông tin lớp'}</button></div>
    <div className="hr-form-grid four">
      <label><span>Loại lớp</span><select value={classType} onChange={(event) => onChange({ ...value, classType: event.target.value })}>{HOMEROOM_CLASS_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{language === 'vi' ? item.labelVi : item.label}</option>)}</select></label>
      {field('className', 'Tên lớp')}{field('schoolYear', 'Năm học')}{field('grade', 'Khối')}{field('room', 'Phòng học')}
      {field('adviserName', subjectMode ? 'Giáo viên bộ môn' : 'Giáo viên chủ nhiệm')}{field('adviserEmail', 'Email', 'email')}{subjectMode ? null : field('classMonitor', 'Lớp trưởng')}{field('studentCountTarget', 'Sĩ số dự kiến', 'number')}{field('schoolName', 'Tên trường')}
    </div>
    <p className={`hr-class-type-note ${subjectMode ? 'subject' : 'homeroom'}`}>{subjectMode ? 'Lớp bộ môn chỉ hiển thị quản lý lớp, danh sách học sinh và sổ điểm; các chức năng riêng của GVCN được ẩn.' : 'Mỗi tài khoản giáo viên chỉ có tối đa một lớp chủ nhiệm đang hoạt động.'}</p>
    <label className="hr-wide-field"><span>Ghi chú lớp</span><textarea value={value.notes || ''} onChange={(event) => onChange({ ...value, notes: event.target.value })} /></label>
  </section>;
}
