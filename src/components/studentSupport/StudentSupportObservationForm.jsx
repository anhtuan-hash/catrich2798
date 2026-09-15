import React, { useEffect, useState } from 'react';
import { createTeacherObservation, OBSERVATION_TYPES } from '../../studentSupport/studentSupportApi.js';
import { loadStudent360Facts } from '../../studentSupport/studentSupportSources.js';

const LABELS = {
  TASK_INCOMPLETE: ['Không làm bài', 'Task incomplete'],
  MATERIAL_NOT_PREPARED: ['Không chuẩn bị bài/tài liệu', 'Materials not prepared'],
  CLASS_TASK_INCOMPLETE: ['Không hoàn thành nhiệm vụ trên lớp', 'Class task incomplete'],
  LATE_ARRIVAL: ['Đi học muộn', 'Late arrival'],
  ABSENCE_OBSERVED: ['Nghỉ học', 'Absence observed'],
  POSITIVE_PROGRESS: ['Có tiến bộ', 'Positive progress'],
  GOOD_PARTICIPATION: ['Tham gia tốt', 'Good participation'],
  HELPED_PEERS: ['Hỗ trợ bạn', 'Helped peers'],
  OTHER_FACTUAL: ['Ghi nhận thực tế khác', 'Other factual observation'],
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function StudentSupportObservationForm({
  studentRef = '',
  workspaceId = '',
  currentUser = null,
  databasePending = false,
  language = 'vi',
  onSaved,
}) {
  const vi = language === 'vi';
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState({
    observationType: 'TASK_INCOMPLETE',
    observationDate: today(),
    subjectName: '',
    periodLabel: '',
    body: '',
    submittedToHomeroom: true,
    followUpRequested: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentRef || !workspaceId) {
      setStudent(null);
      return undefined;
    }
    let alive = true;
    loadStudent360Facts({ student: { studentRef }, workspaceId })
      .then((facts) => { if (alive) setStudent(facts.student); })
      .catch(() => { if (alive) setStudent({ studentRef, workspaceId }); });
    return () => { alive = false; };
  }, [studentRef, workspaceId]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (databasePending) {
      setError(vi ? 'Database Student Support chưa được kích hoạt nên chưa thể lưu ghi nhận.' : 'Student Support database is not active yet, so this observation cannot be saved.');
      return;
    }
    if (!studentRef || !workspaceId || !student?.className) {
      setError(vi ? 'Cần chọn học sinh có lớp hợp lệ trước khi ghi nhận.' : 'Select a student with a valid class before saving an observation.');
      return;
    }
    setSaving(true);
    try {
      const row = await createTeacherObservation({
        studentRef,
        workspaceId,
        sourceWorkspaceId: workspaceId,
        className: student.className,
        subjectName: form.subjectName,
        observationType: form.observationType,
        observationDate: form.observationDate,
        periodLabel: form.periodLabel,
        body: form.body,
        submittedToHomeroom: form.submittedToHomeroom,
        followUpRequested: form.followUpRequested,
        visibilityScope: form.submittedToHomeroom ? 'HOMEROOM' : 'PRIVATE',
      }, currentUser);
      setMessage(vi ? 'Đã lưu ghi nhận.' : 'Observation saved.');
      setForm((current) => ({ ...current, body: '', followUpRequested: false }));
      onSaved?.(row);
    } catch (nextError) {
      setError(nextError?.message || (vi ? 'Không thể lưu ghi nhận.' : 'Unable to save observation.'));
    } finally {
      setSaving(false);
    }
  }

  if (!studentRef) {
    return <section className="student-support-state-card">{vi ? 'Chọn một học sinh trước khi tạo ghi nhận.' : 'Select a student before creating an observation.'}</section>;
  }

  return (
    <section className="student-support-form-card">
      <header>
        <div>
          <span>{vi ? 'Ghi nhận giáo viên' : 'Teacher observation'}</span>
          <h2>{student?.fullName || studentRef}</h2>
          <p>{[student?.className, student?.code].filter(Boolean).join(' · ')}</p>
        </div>
      </header>

      {databasePending ? (
        <div className="student-support-inline-warning">
          {vi ? 'Chế độ xem trước: database Student Support chưa được kích hoạt. Form được hiển thị nhưng nút lưu đang khóa.' : 'Preview mode: Student Support database is not active. The form is visible but saving is disabled.'}
        </div>
      ) : null}

      <form className="student-support-form" onSubmit={submit}>
        <label>
          <span>{vi ? 'Loại ghi nhận' : 'Observation type'}</span>
          <select value={form.observationType} onChange={(e) => setField('observationType', e.target.value)}>
            {OBSERVATION_TYPES.map((type) => <option key={type} value={type}>{LABELS[type]?.[vi ? 0 : 1] || type}</option>)}
          </select>
        </label>
        <label>
          <span>{vi ? 'Ngày' : 'Date'}</span>
          <input type="date" value={form.observationDate} onChange={(e) => setField('observationDate', e.target.value)} required />
        </label>
        <label>
          <span>{vi ? 'Môn học' : 'Subject'}</span>
          <input value={form.subjectName} onChange={(e) => setField('subjectName', e.target.value)} placeholder={vi ? 'Ví dụ: Tiếng Anh' : 'Example: English'} />
        </label>
        <label>
          <span>{vi ? 'Tiết / buổi' : 'Period / session'}</span>
          <input value={form.periodLabel} onChange={(e) => setField('periodLabel', e.target.value)} placeholder={vi ? 'Ví dụ: Tiết 3' : 'Example: Period 3'} />
        </label>
        <label className="student-support-form-wide">
          <span>{vi ? 'Nội dung ghi nhận' : 'Observation details'}</span>
          <textarea value={form.body} onChange={(e) => setField('body', e.target.value)} rows={4} maxLength={4000} placeholder={vi ? 'Chỉ ghi sự việc quan sát được, ngắn gọn và khách quan.' : 'Record only observable facts, briefly and objectively.'} />
        </label>
        <label className="student-support-check student-support-form-wide">
          <input type="checkbox" checked={form.submittedToHomeroom} onChange={(e) => setField('submittedToHomeroom', e.target.checked)} />
          <span>{vi ? 'Gửi GVCN xem' : 'Share with homeroom teacher'}</span>
        </label>
        <label className="student-support-check student-support-form-wide">
          <input type="checkbox" checked={form.followUpRequested} onChange={(e) => setField('followUpRequested', e.target.checked)} />
          <span>{vi ? 'Đề nghị GVCN theo dõi' : 'Request homeroom follow-up'}</span>
        </label>
        <div className="student-support-form-actions student-support-form-wide">
          <button type="submit" disabled={saving || databasePending || !currentUser?.id}>{saving ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu ghi nhận' : 'Save observation')}</button>
        </div>
      </form>
      {message ? <p className="student-support-form-message is-success">{message}</p> : null}
      {error ? <p className="student-support-form-message is-error">{error}</p> : null}
    </section>
  );
}
