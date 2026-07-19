import React, { useEffect, useMemo, useState } from 'react';
import {
  REGULAR_ASSESSMENT_MAX_COLUMNS,
  buildRegularAssessmentScoreMap,
  calculateRegularRoundClassAverage,
  calculateRegularStudentAverage,
  getRegularAssessmentRounds,
  normalizeRegularAssessmentRounds,
  parseRegularScore,
  regularScoreKey,
  saveRegularAssessmentRound,
} from '../utils/regularAssessment.js';
import { updateGradeSettings } from '../utils/homeroomStore.js';
import '../styles/homeroom-regular-gradebook-v1167.css';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatAverage(value) {
  return Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, '.0') : '—';
}

function makeColumnId(round) {
  if (globalThis.crypto?.randomUUID) return `regular-r${round}-${globalThis.crypto.randomUUID()}`;
  return `regular-r${round}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortStudents(students) {
  return [...students].sort((a, b) => {
    const codeA = String(a.code || '');
    const codeB = String(b.code || '');
    return codeA.localeCompare(codeB, 'vi', { numeric: true }) || String(a.fullName || '').localeCompare(String(b.fullName || ''), 'vi');
  });
}

export default function RegularAssessmentGradebook({ workspace, onCommit, currentUser }) {
  const students = useMemo(() => sortStudents((workspace.students || []).filter((item) => item.active !== false)), [workspace.students]);
  const [subject, setSubject] = useState('Tiếng Anh');
  const [period, setPeriod] = useState(workspace.semester || 'Học kỳ I');
  const [teacherName, setTeacherName] = useState(currentUser?.name || '');
  const [recordedAt, setRecordedAt] = useState(today());
  const [activeRound, setActiveRound] = useState(1);
  const [rounds, setRounds] = useState(() => getRegularAssessmentRounds(workspace));
  const [scoreMap, setScoreMap] = useState(() => buildRegularAssessmentScoreMap(workspace, { subject: 'Tiếng Anh', period: workspace.semester || 'Học kỳ I' }));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const lockedPeriods = workspace.gradeSettings?.lockedPeriods || [];
  const isLocked = lockedPeriods.includes(period);
  const currentRound = rounds.find((item) => item.round === activeRound) || rounds[0];

  useEffect(() => {
    const nextRounds = getRegularAssessmentRounds(workspace);
    setRounds(nextRounds);
    setScoreMap(buildRegularAssessmentScoreMap(workspace, { subject, period, rounds: nextRounds }));
    setDirty(false);
  }, [workspace.updatedAt]);

  const changeContext = (key, value) => {
    if (dirty && !window.confirm('Bạn đang có điểm chưa lưu. Chuyển dữ liệu và bỏ các thay đổi này?')) return;
    const nextSubject = key === 'subject' ? value : subject;
    const nextPeriod = key === 'period' ? value : period;
    if (key === 'subject') setSubject(value);
    if (key === 'period') setPeriod(value);
    const nextRounds = getRegularAssessmentRounds(workspace);
    setRounds(nextRounds);
    setScoreMap(buildRegularAssessmentScoreMap(workspace, { subject: nextSubject, period: nextPeriod, rounds: nextRounds }));
    setDirty(false);
    setMessage('');
  };

  const setScore = (studentId, columnId, rawValue) => {
    const normalized = String(rawValue).replace(/[^0-9.,]/g, '').slice(0, 5);
    setScoreMap((current) => ({ ...current, [regularScoreKey(activeRound, studentId, columnId)]: normalized }));
    setDirty(true);
    setMessage('');
  };

  const updateColumnLabel = (columnId, label) => {
    setRounds((current) => current.map((round) => round.round === activeRound ? {
      ...round,
      columns: round.columns.map((column) => column.id === columnId ? { ...column, label: label.slice(0, 40) } : column),
    } : round));
    setDirty(true);
  };

  const addColumn = () => {
    if (currentRound.columns.length >= REGULAR_ASSESSMENT_MAX_COLUMNS) {
      setMessage(`Mỗi đợt được phép tối đa ${REGULAR_ASSESSMENT_MAX_COLUMNS} cột điểm.`);
      return;
    }
    const nextIndex = currentRound.columns.length + 1;
    const column = { id: makeColumnId(activeRound), label: `Cột ${nextIndex}` };
    setRounds((current) => current.map((round) => round.round === activeRound ? { ...round, columns: [...round.columns, column] } : round));
    setDirty(true);
  };

  const removeColumn = (columnId) => {
    if (currentRound.columns.length <= 1) {
      setMessage('Mỗi đợt phải giữ lại ít nhất một cột điểm.');
      return;
    }
    if (!window.confirm('Xoá cột này và toàn bộ điểm đã nhập trong cột?')) return;
    setRounds((current) => current.map((round) => round.round === activeRound ? {
      ...round,
      columns: round.columns.filter((column) => column.id !== columnId),
    } : round));
    setScoreMap((current) => {
      const next = { ...current };
      students.forEach((student) => delete next[regularScoreKey(activeRound, student.id, columnId)]);
      return next;
    });
    setDirty(true);
  };

  const validateScores = (targetRounds) => {
    const invalid = [];
    targetRounds.forEach((round) => {
      round.columns.forEach((column) => {
        students.forEach((student) => {
          const raw = scoreMap[regularScoreKey(round.round, student.id, column.id)];
          if (raw !== '' && raw !== undefined && raw !== null && parseRegularScore(raw) === null) {
            invalid.push(`${student.fullName} · ${round.name} · ${column.label}`);
          }
        });
      });
    });
    return invalid;
  };

  const saveRounds = async (roundNumbers) => {
    if (isLocked || saving) return;
    const targetRounds = rounds.filter((round) => roundNumbers.includes(round.round));
    const invalid = validateScores(targetRounds);
    if (invalid.length) {
      setMessage(`Có ${invalid.length} ô điểm không hợp lệ. Điểm phải từ 0 đến 10. Ví dụ: ${invalid.slice(0, 2).join('; ')}`);
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      let next = { ...workspace, gradeSettings: { ...(workspace.gradeSettings || {}), regularAssessmentRounds: normalizeRegularAssessmentRounds(rounds) } };
      roundNumbers.forEach((round) => {
        next = saveRegularAssessmentRound(next, {
          round,
          rounds,
          students,
          scoreMap,
          subject,
          period,
          teacherName,
          recordedAt,
        });
      });
      const recordCount = roundNumbers.reduce((sum, round) => {
        const config = rounds.find((item) => item.round === round);
        return sum + students.reduce((studentSum, student) => studentSum + config.columns.filter((column) => parseRegularScore(scoreMap[regularScoreKey(round, student.id, column.id)]) !== null).length, 0);
      }, 0);
      await onCommit(next, `Đã lưu ${recordCount} cột điểm thường xuyên cho ${roundNumbers.length === 4 ? 'cả 4 đợt' : `Đợt ${roundNumbers[0]}`}.`);
      setDirty(false);
      setMessage(`Đã lưu thành công ${recordCount} điểm.`);
    } catch (error) {
      setMessage(error?.message || 'Không thể lưu bảng điểm.');
    } finally {
      setSaving(false);
    }
  };

  const togglePeriodLock = async () => {
    const nextLocked = isLocked ? lockedPeriods.filter((item) => item !== period) : [...new Set([...lockedPeriods, period])];
    await onCommit(updateGradeSettings(workspace, { lockedPeriods: nextLocked }), isLocked ? `Đã mở khóa ${period}.` : `Đã khóa bảng điểm ${period}.`);
  };

  const roundAverages = useMemo(() => rounds.map((round) => ({
    round: round.round,
    average: calculateRegularRoundClassAverage(scoreMap, round.round, students, round.columns),
  })), [rounds, scoreMap, students]);

  const columnAverages = useMemo(() => Object.fromEntries(currentRound.columns.map((column) => {
    const values = students.map((student) => parseRegularScore(scoreMap[regularScoreKey(activeRound, student.id, column.id)])).filter(Number.isFinite);
    return [column.id, values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null];
  })), [currentRound.columns, students, scoreMap, activeRound]);

  return (
    <section className="hr-panel hr-regular-gradebook">
      <div className="hr-panel-head hr-regular-gradebook-head">
        <div>
          <small>Sổ điểm toàn lớp</small>
          <h2>Điểm kiểm tra thường xuyên · 4 đợt</h2>
          <p>Mỗi đợt gồm nhiều cột; điểm đợt là trung bình cộng của các cột có dữ liệu.</p>
        </div>
        <div className="hr-head-actions">
          <button type="button" className="secondary" onClick={togglePeriodLock}>{isLocked ? 'Mở khóa học kỳ' : 'Khóa học kỳ'}</button>
          <button type="button" className="secondary" disabled={isLocked || saving} onClick={() => saveRounds([activeRound])}>{saving ? 'Đang lưu…' : `Lưu Đợt ${activeRound}`}</button>
          <button type="button" className="primary" disabled={isLocked || saving} onClick={() => saveRounds([1, 2, 3, 4])}>{isLocked ? 'Đã khóa' : 'Lưu cả 4 đợt'}</button>
        </div>
      </div>

      <div className="hr-regular-context">
        <label><span>Môn học</span><input value={subject} onChange={(event) => changeContext('subject', event.target.value)} /></label>
        <label><span>Học kỳ / giai đoạn</span><input value={period} onChange={(event) => changeContext('period', event.target.value)} /></label>
        <label><span>Giáo viên bộ môn</span><input value={teacherName} onChange={(event) => setTeacherName(event.target.value)} /></label>
        <label><span>Ngày ghi nhận</span><input type="date" value={recordedAt} onChange={(event) => setRecordedAt(event.target.value)} /></label>
      </div>

      <div className="hr-regular-round-tabs" role="tablist" aria-label="Bốn đợt kiểm tra thường xuyên">
        {rounds.map((round) => {
          const average = roundAverages.find((item) => item.round === round.round)?.average;
          return <button key={round.round} type="button" role="tab" aria-selected={activeRound === round.round} className={activeRound === round.round ? 'active' : ''} onClick={() => setActiveRound(round.round)}><span>{round.name}</span><small>{round.columns.length} cột · TB {formatAverage(average)}</small></button>;
        })}
      </div>

      <div className="hr-regular-table-toolbar">
        <div><strong>{currentRound.name}</strong><span>{students.length} học sinh · {currentRound.columns.length} cột điểm</span></div>
        <button type="button" className="secondary" disabled={isLocked} onClick={addColumn}>＋ Thêm cột điểm</button>
      </div>

      {message ? <div className={`hr-regular-message ${message.startsWith('Đã lưu') ? 'success' : ''}`} role="status">{message}</div> : null}
      {dirty ? <div className="hr-regular-unsaved">● Có thay đổi chưa lưu</div> : null}

      <div className="hr-regular-table-wrap">
        <table className="hr-regular-table">
          <thead>
            <tr>
              <th className="sticky-col index">STT</th>
              <th className="sticky-col code">Mã HS</th>
              <th className="sticky-col name">Họ và tên</th>
              {currentRound.columns.map((column) => <th key={column.id} className="score-column"><div><input value={column.label} disabled={isLocked} onChange={(event) => updateColumnLabel(column.id, event.target.value)} aria-label={`Tên ${column.label}`} />{currentRound.columns.length > 1 ? <button type="button" disabled={isLocked} onClick={() => removeColumn(column.id)} title="Xóa cột">×</button> : null}</div></th>)}
              <th className="average-column">TB {currentRound.name}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => {
              const average = calculateRegularStudentAverage(scoreMap, activeRound, student.id, currentRound.columns);
              return <tr key={student.id}>
                <td className="sticky-col index">{index + 1}</td>
                <td className="sticky-col code">{student.code || '—'}</td>
                <td className="sticky-col name"><strong>{student.fullName}</strong></td>
                {currentRound.columns.map((column) => {
                  const key = regularScoreKey(activeRound, student.id, column.id);
                  const value = scoreMap[key] ?? '';
                  const invalid = value !== '' && parseRegularScore(value) === null;
                  return <td key={column.id} className={invalid ? 'invalid' : ''}><input type="text" inputMode="decimal" disabled={isLocked} value={value} onChange={(event) => setScore(student.id, column.id, event.target.value)} aria-label={`${student.fullName} · ${column.label}`} placeholder="—" /></td>;
                })}
                <td className="average-cell"><strong>{formatAverage(average)}</strong><small>{Number.isFinite(average) ? '/10' : ''}</small></td>
              </tr>;
            })}
          </tbody>
          <tfoot>
            <tr>
              <th className="sticky-col index" colSpan="3">Trung bình lớp</th>
              {currentRound.columns.map((column) => <th key={column.id}>{formatAverage(columnAverages[column.id])}</th>)}
              <th>{formatAverage(roundAverages.find((item) => item.round === activeRound)?.average)}</th>
            </tr>
          </tfoot>
        </table>
      </div>

      {!students.length ? <div className="hr-regular-empty"><span>＋</span><h3>Chưa có học sinh</h3><p>Hãy thêm danh sách lớp trước khi nhập điểm.</p></div> : null}
      <p className="hr-security-note">Ô trống không được tính vào trung bình. Xóa nội dung một ô rồi lưu sẽ xóa điểm tương ứng. Điểm hợp lệ từ 0 đến 10.</p>
    </section>
  );
}
