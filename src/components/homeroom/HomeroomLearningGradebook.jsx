import React, { useEffect, useMemo, useState } from 'react';
import './HomeroomLearningGradebook.css';

const SEMESTERS = [
  { id: 'semester1', label: 'Học kỳ I' },
  { id: 'semester2', label: 'Học kỳ II' },
];

const VIEWS = [
  { id: 'regular-0', label: 'TX · Đợt 1' },
  { id: 'regular-1', label: 'TX · Đợt 2' },
  { id: 'regular-2', label: 'TX · Đợt 3' },
  { id: 'regular-3', label: 'TX · Đợt 4' },
  { id: 'midterm', label: 'Giữa kỳ' },
  { id: 'final', label: 'Cuối kỳ' },
  { id: 'summary', label: 'Tổng hợp' },
];

function uid(prefix = 'grade') {
  try { return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
  catch { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function subjectKey(value) {
  return String(value || 'Tiếng Anh')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tieng-anh';
}

function makeColumn(index = 1, label = '') {
  return { id: uid('regular-column'), label: label || `Lần ${index}` };
}

function makeRound(index = 1) {
  return {
    id: `round-${index}`,
    columns: [makeColumn(1)],
    scores: {},
    bonus: {},
  };
}

function makeSemester() {
  return {
    regular: [makeRound(1), makeRound(2), makeRound(3), makeRound(4)],
    midterm: { scores: {} },
    final: { scores: {} },
  };
}

function normalizeRound(value, index) {
  const source = value && typeof value === 'object' ? value : {};
  const columns = Array.isArray(source.columns) && source.columns.length
    ? source.columns.map((column, columnIndex) => ({
      id: String(column?.id || uid('regular-column')),
      label: String(column?.label || `Lần ${columnIndex + 1}`),
    }))
    : [makeColumn(1)];
  return {
    id: String(source.id || `round-${index + 1}`),
    columns,
    scores: source.scores && typeof source.scores === 'object' ? source.scores : {},
    bonus: source.bonus && typeof source.bonus === 'object' ? source.bonus : {},
  };
}

function normalizeSemester(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    regular: Array.from({ length: 4 }, (_, index) => normalizeRound(source.regular?.[index], index)),
    midterm: { scores: source.midterm?.scores && typeof source.midterm.scores === 'object' ? source.midterm.scores : {} },
    final: { scores: source.final?.scores && typeof source.final.scores === 'object' ? source.final.scores : {} },
  };
}

function normalizeSubject(value, fallbackName = 'Tiếng Anh') {
  const source = value && typeof value === 'object' ? value : {};
  return {
    name: String(source.name || fallbackName).trim() || fallbackName,
    semesters: {
      semester1: normalizeSemester(source.semesters?.semester1),
      semester2: normalizeSemester(source.semesters?.semester2),
    },
  };
}

function hasGradebookData(book) {
  return Object.values(book?.subjects || {}).some((subject) => SEMESTERS.some(({ id }) => {
    const semester = subject?.semesters?.[id];
    if (!semester) return false;
    const regular = semester.regular?.some((round) => (
      Object.values(round?.scores || {}).some((row) => Object.values(row || {}).some((value) => value !== '' && value != null))
      || Object.values(round?.bonus || {}).some((value) => value !== '' && value != null)
    ));
    return regular
      || Object.values(semester.midterm?.scores || {}).some((value) => value !== '' && value != null)
      || Object.values(semester.final?.scores || {}).some((value) => value !== '' && value != null);
  }));
}

function migrateLegacyRecords(book, records = []) {
  if (hasGradebookData(book) || !Array.isArray(records) || !records.length) return book;
  const next = clone(book);
  const regularColumns = new Map();

  records.forEach((record) => {
    if (!record?.studentId || !record?.subject) return;
    const key = subjectKey(record.subject);
    if (!next.subjects[key]) next.subjects[key] = normalizeSubject(null, record.subject);
    const semesterId = /(^|\s)(ii|2)($|\s)/i.test(String(record.period || '')) ? 'semester2' : 'semester1';
    const semester = next.subjects[key].semesters[semesterId];
    const assessment = String(record.assessment || '').toLowerCase();
    const score = Number(record.score);
    if (!Number.isFinite(score)) return;
    const normalized = Math.max(0, Math.min(10, score / (Number(record.maxScore || 10) || 10) * 10));

    if (assessment.includes('giữa') || assessment.includes('mid')) {
      semester.midterm.scores[record.studentId] = normalized;
      return;
    }
    if (assessment.includes('cuối') || assessment.includes('final')) {
      semester.final.scores[record.studentId] = normalized;
      return;
    }

    const round = semester.regular[0];
    const signature = `${key}:${semesterId}:${record.assessment || 'Điểm TX'}:${record.recordedAt || record.id || ''}`;
    if (!regularColumns.has(signature)) {
      const column = makeColumn(round.columns.length + 1, record.recordedAt ? `Lần ${round.columns.length + 1} · ${record.recordedAt}` : `Lần ${round.columns.length + 1}`);
      round.columns.push(column);
      regularColumns.set(signature, column.id);
    }
    const columnId = regularColumns.get(signature);
    round.scores[record.studentId] = { ...(round.scores[record.studentId] || {}), [columnId]: normalized };
  });

  Object.values(next.subjects).forEach((subject) => {
    SEMESTERS.forEach(({ id }) => {
      const round = subject.semesters[id].regular[0];
      if (round.columns.length > 1 && !Object.values(round.scores).some((row) => row?.[round.columns[0].id] !== undefined)) {
        round.columns.shift();
      }
    });
  });
  return next;
}

function normalizeGradebook(raw, legacyRecords = []) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const subjects = {};
  Object.entries(source.subjects || {}).forEach(([key, subject]) => {
    subjects[key] = normalizeSubject(subject, subject?.name || key);
  });
  if (!Object.keys(subjects).length) subjects['tieng-anh'] = normalizeSubject(null, 'Tiếng Anh');
  const activeSubject = subjects[source.activeSubject] ? source.activeSubject : Object.keys(subjects)[0];
  return migrateLegacyRecords({ version: 2, activeSubject, subjects, updatedAt: source.updatedAt || '' }, legacyRecords);
}

function scoreNumber(value) {
  if (value === '' || value == null) return null;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? Math.max(0, Math.min(10, number)) : null;
}

function cleanInput(value) {
  const text = String(value ?? '').replace(',', '.').trim();
  if (text === '') return '';
  if (!/^\d{0,2}(?:\.\d{0,2})?$/.test(text)) return null;
  return text;
}

function clampedInput(value) {
  const number = scoreNumber(value);
  return number == null ? '' : String(Math.round(number * 100) / 100);
}

function roundScore(round, studentId) {
  const row = round?.scores?.[studentId] || {};
  const scores = (round?.columns || []).map((column) => scoreNumber(row[column.id])).filter((value) => value != null);
  if (!scores.length) return null;
  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const bonus = scoreNumber(round?.bonus?.[studentId]) || 0;
  return Math.min(10, average + bonus);
}

function formatScore(value) {
  return value == null || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

function ensureSubject(book, name) {
  const key = subjectKey(name);
  if (!book.subjects[key]) book.subjects[key] = normalizeSubject(null, name);
  return key;
}

function ScoreInput({ value, onChange, label }) {
  return <input
    className="hr-grade-input"
    inputMode="decimal"
    aria-label={label}
    value={value ?? ''}
    onChange={(event) => {
      const next = cleanInput(event.target.value);
      if (next !== null) onChange(next);
    }}
    onBlur={(event) => onChange(clampedInput(event.target.value))}
    onWheel={(event) => event.currentTarget.blur()}
    placeholder="—"
  />;
}

export default function HomeroomLearningGradebook({ workspace, onCommit, currentUser }) {
  const students = useMemo(
    () => (workspace.students || []).filter((student) => student.active !== false),
    [workspace.students],
  );
  const [gradebook, setGradebook] = useState(() => normalizeGradebook(workspace.learningGradebook, workspace.learningRecords));
  const [activeSubjectKey, setActiveSubjectKey] = useState(() => normalizeGradebook(workspace.learningGradebook, workspace.learningRecords).activeSubject);
  const [semesterId, setSemesterId] = useState('semester1');
  const [view, setView] = useState('regular-0');
  const [newSubject, setNewSubject] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    const normalized = normalizeGradebook(workspace.learningGradebook, workspace.learningRecords);
    setGradebook(normalized);
    setActiveSubjectKey((current) => normalized.subjects[current] ? current : normalized.activeSubject);
  }, [workspace.learningGradebook, workspace.learningRecords, workspace.id, dirty]);

  const subjectEntries = useMemo(
    () => Object.entries(gradebook.subjects || {}).sort(([, a], [, b]) => a.name.localeCompare(b.name, 'vi')),
    [gradebook.subjects],
  );
  const activeSubject = gradebook.subjects[activeSubjectKey] || subjectEntries[0]?.[1];
  const activeSemester = activeSubject?.semesters?.[semesterId] || makeSemester();
  const roundIndex = view.startsWith('regular-') ? Number(view.split('-')[1]) : -1;
  const activeRound = roundIndex >= 0 ? activeSemester.regular[roundIndex] : null;

  const mutate = (callback) => {
    setGradebook((current) => {
      const next = clone(current);
      const key = next.subjects[activeSubjectKey] ? activeSubjectKey : ensureSubject(next, activeSubject?.name || 'Tiếng Anh');
      callback(next.subjects[key].semesters[semesterId], next.subjects[key], next);
      next.activeSubject = key;
      next.updatedAt = new Date().toISOString();
      return next;
    });
    setDirty(true);
  };

  const openSubject = () => {
    const name = newSubject.trim();
    if (!name) return;
    setGradebook((current) => {
      const next = clone(current);
      const key = ensureSubject(next, name);
      next.activeSubject = key;
      setActiveSubjectKey(key);
      return next;
    });
    setNewSubject('');
    setDirty(true);
  };

  const updateRegularScore = (studentId, columnId, value) => mutate((semester) => {
    const round = semester.regular[roundIndex];
    round.scores[studentId] = { ...(round.scores[studentId] || {}), [columnId]: value };
  });

  const updateBonus = (studentId, value) => mutate((semester) => {
    semester.regular[roundIndex].bonus[studentId] = value;
  });

  const updateExamScore = (type, studentId, value) => mutate((semester) => {
    semester[type].scores[studentId] = value;
  });

  const addRegularColumn = () => mutate((semester) => {
    const round = semester.regular[roundIndex];
    round.columns.push(makeColumn(round.columns.length + 1));
  });

  const renameRegularColumn = (columnId, label) => mutate((semester) => {
    const round = semester.regular[roundIndex];
    round.columns = round.columns.map((column) => column.id === columnId ? { ...column, label } : column);
  });

  const removeRegularColumn = (columnId) => {
    if (!activeRound || activeRound.columns.length <= 1) return;
    const hasScores = Object.values(activeRound.scores || {}).some((row) => row?.[columnId] !== '' && row?.[columnId] != null);
    if (hasScores && !window.confirm('Cột này đã có điểm. Xóa cột sẽ xóa toàn bộ điểm trong cột. Tiếp tục?')) return;
    mutate((semester) => {
      const round = semester.regular[roundIndex];
      round.columns = round.columns.filter((column) => column.id !== columnId);
      Object.keys(round.scores).forEach((studentId) => {
        const row = { ...(round.scores[studentId] || {}) };
        delete row[columnId];
        round.scores[studentId] = row;
      });
    });
  };

  const save = async () => {
    const payload = clone(gradebook);
    payload.activeSubject = activeSubjectKey;
    payload.updatedAt = new Date().toISOString();
    payload.updatedBy = currentUser?.email || currentUser?.name || '';
    await onCommit(
      { ...workspace, learningGradebook: payload },
      `Đã lưu sổ điểm ${activeSubject?.name || 'môn học'} · ${SEMESTERS.find((item) => item.id === semesterId)?.label}.`,
    );
    setDirty(false);
  };

  const discard = () => {
    const normalized = normalizeGradebook(workspace.learningGradebook, workspace.learningRecords);
    setGradebook(normalized);
    setActiveSubjectKey(normalized.activeSubject);
    setDirty(false);
  };

  const totalRegularColumns = activeSemester.regular.reduce((sum, round) => sum + round.columns.length, 0);
  const completedFourRounds = students.filter((student) => activeSemester.regular.every((round) => roundScore(round, student.id) != null)).length;
  const activeRoundCoverage = activeRound ? students.filter((student) => roundScore(activeRound, student.id) != null).length : 0;

  const renderRegularTable = () => (
    <section className="hr-panel hr-grade-panel">
      <div className="hr-panel-head hr-grade-panel-head">
        <div>
          <small>Điểm thường xuyên · Đợt {roundIndex + 1}</small>
          <h2>Nhập điểm cho toàn bộ lớp</h2>
          <p>Điểm đợt = trung bình tất cả các lần nhập trong đợt + điểm cộng; kết quả tối đa 10.</p>
        </div>
        <button type="button" className="secondary" onClick={addRegularColumn}>＋ Thêm lần nhập</button>
      </div>
      {students.length ? <div className="hr-grade-table-wrap">
        <table className="hr-grade-table">
          <thead>
            <tr>
              <th className="hr-grade-index">STT</th>
              <th className="hr-grade-student">Học sinh</th>
              {activeRound.columns.map((column) => <th key={column.id} className="hr-grade-attempt-head">
                <input value={column.label} onChange={(event) => renameRegularColumn(column.id, event.target.value)} aria-label="Tên cột điểm" />
                <button type="button" disabled={activeRound.columns.length <= 1} onClick={() => removeRegularColumn(column.id)} title="Xóa cột">×</button>
              </th>)}
              <th className="hr-grade-bonus-head">Điểm cộng</th>
              <th className="hr-grade-result-head">Điểm Đợt {roundIndex + 1}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => {
              const row = activeRound.scores?.[student.id] || {};
              const result = roundScore(activeRound, student.id);
              return <tr key={student.id}>
                <td className="hr-grade-index">{index + 1}</td>
                <td className="hr-grade-student"><b>{student.fullName}</b><small>{student.code || 'Chưa có mã học sinh'}</small></td>
                {activeRound.columns.map((column) => <td key={column.id}>
                  <ScoreInput value={row[column.id]} onChange={(value) => updateRegularScore(student.id, column.id, value)} label={`${student.fullName} · ${column.label}`} />
                </td>)}
                <td className="hr-grade-bonus-cell"><ScoreInput value={activeRound.bonus?.[student.id]} onChange={(value) => updateBonus(student.id, value)} label={`${student.fullName} · Điểm cộng`} /></td>
                <td className={`hr-grade-result ${result != null ? 'has-score' : ''}`}><strong>{formatScore(result)}</strong><small>{result != null && result >= 10 ? 'Đã giới hạn 10' : 'Tự động tính'}</small></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div> : <div className="hr-grade-empty"><b>Chưa có danh sách lớp</b><span>Hãy nhập học sinh trước khi mở sổ điểm.</span></div>}
    </section>
  );

  const renderExamTable = (type, title) => (
    <section className="hr-panel hr-grade-panel">
      <div className="hr-panel-head hr-grade-panel-head"><div><small>{title}</small><h2>Nhập điểm cho toàn bộ lớp</h2><p>Mỗi học sinh có một cột điểm {title.toLowerCase()}, thang điểm 10.</p></div></div>
      {students.length ? <div className="hr-grade-table-wrap compact">
        <table className="hr-grade-table hr-grade-exam-table">
          <thead><tr><th className="hr-grade-index">STT</th><th className="hr-grade-student">Học sinh</th><th>{title}</th><th>Trạng thái</th></tr></thead>
          <tbody>{students.map((student, index) => {
            const value = activeSemester[type].scores?.[student.id] ?? '';
            return <tr key={student.id}><td className="hr-grade-index">{index + 1}</td><td className="hr-grade-student"><b>{student.fullName}</b><small>{student.code || 'Chưa có mã học sinh'}</small></td><td><ScoreInput value={value} onChange={(score) => updateExamScore(type, student.id, score)} label={`${student.fullName} · ${title}`} /></td><td className="hr-grade-status">{scoreNumber(value) == null ? <span>Chưa nhập</span> : <b>Đã nhập</b>}</td></tr>;
          })}</tbody>
        </table>
      </div> : <div className="hr-grade-empty"><b>Chưa có danh sách lớp</b><span>Hãy nhập học sinh trước khi mở sổ điểm.</span></div>}
    </section>
  );

  const renderSummary = () => (
    <section className="hr-panel hr-grade-panel">
      <div className="hr-panel-head hr-grade-panel-head"><div><small>Tổng hợp thành phần</small><h2>Bảng điểm {SEMESTERS.find((item) => item.id === semesterId)?.label}</h2><p>Bảng này hiển thị kết quả của 4 đợt thường xuyên, giữa kỳ và cuối kỳ; không tự đặt thêm công thức trung bình học kỳ.</p></div></div>
      {students.length ? <div className="hr-grade-table-wrap">
        <table className="hr-grade-table hr-grade-summary-table">
          <thead><tr><th className="hr-grade-index">STT</th><th className="hr-grade-student">Học sinh</th>{activeSemester.regular.map((_, index) => <th key={index}>TX Đợt {index + 1}</th>)}<th>Giữa kỳ</th><th>Cuối kỳ</th><th>Đã nhập</th></tr></thead>
          <tbody>{students.map((student, index) => {
            const regular = activeSemester.regular.map((round) => roundScore(round, student.id));
            const midterm = scoreNumber(activeSemester.midterm.scores?.[student.id]);
            const final = scoreNumber(activeSemester.final.scores?.[student.id]);
            const count = [...regular, midterm, final].filter((value) => value != null).length;
            return <tr key={student.id}><td className="hr-grade-index">{index + 1}</td><td className="hr-grade-student"><b>{student.fullName}</b><small>{student.code || 'Chưa có mã học sinh'}</small></td>{regular.map((value, scoreIndex) => <td key={scoreIndex} className="hr-grade-summary-score">{formatScore(value)}</td>)}<td className="hr-grade-summary-score">{formatScore(midterm)}</td><td className="hr-grade-summary-score">{formatScore(final)}</td><td className="hr-grade-completion"><b>{count}/6</b></td></tr>;
          })}</tbody>
        </table>
      </div> : <div className="hr-grade-empty"><b>Chưa có danh sách lớp</b><span>Hãy nhập học sinh trước khi mở sổ điểm.</span></div>}
    </section>
  );

  return <div className="hr-tab-stack hr-gradebook">
    <section className="hr-panel hr-grade-toolbar">
      <div className="hr-grade-title">
        <span>GRADEBOOK · 2 SEMESTERS</span>
        <h2>Sổ điểm học tập</h2>
        <p>Nhập theo lớp, quản lý riêng từng môn và từng học kỳ.</p>
      </div>
      <div className="hr-grade-controls">
        <label><span>Môn học</span><select value={activeSubjectKey} onChange={(event) => setActiveSubjectKey(event.target.value)}>{subjectEntries.map(([key, subject]) => <option key={key} value={key}>{subject.name}</option>)}</select></label>
        <div className="hr-grade-new-subject"><label><span>Thêm môn / mở môn mới</span><input value={newSubject} onChange={(event) => setNewSubject(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') openSubject(); }} placeholder="Ví dụ: Toán" /></label><button type="button" className="secondary" onClick={openSubject}>Mở môn</button></div>
      </div>
      <div className="hr-grade-formula"><span>fx</span><p><b>Công thức điểm thường xuyên từng đợt</b><small>min(10, trung bình các cột điểm trong đợt + điểm cộng)</small></p></div>
    </section>

    <section className="hr-grade-overview">
      <article><small>Học sinh đang học</small><strong>{students.length}</strong><span>Nhập đồng loạt theo danh sách lớp</span></article>
      <article><small>Cấu trúc học kỳ</small><strong>4 + 1 + 1</strong><span>4 đợt TX · giữa kỳ · cuối kỳ</span></article>
      <article><small>Cột TX hiện có</small><strong>{totalRegularColumns}</strong><span>Có thể thêm nhiều lần nhập ở mỗi đợt</span></article>
      <article><small>Đủ 4 đợt TX</small><strong>{completedFourRounds}/{students.length}</strong><span>{activeRound ? `${activeRoundCoverage} học sinh có điểm ở đợt đang mở` : 'Theo học kỳ đang chọn'}</span></article>
    </section>

    <section className="hr-panel hr-grade-navigation">
      <div className="hr-grade-semesters" role="tablist" aria-label="Chọn học kỳ">{SEMESTERS.map((semester) => <button key={semester.id} type="button" className={semesterId === semester.id ? 'active' : ''} onClick={() => setSemesterId(semester.id)}>{semester.label}</button>)}</div>
      <div className="hr-grade-views" role="tablist" aria-label="Chọn thành phần điểm">{VIEWS.map((item) => <button key={item.id} type="button" className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>{item.label}</button>)}</div>
      <div className="hr-grade-save-actions"><span className={dirty ? 'is-dirty' : 'is-saved'}>{dirty ? 'Có thay đổi chưa lưu' : 'Dữ liệu đã lưu'}</span>{dirty ? <button type="button" className="secondary" onClick={discard}>Hoàn tác</button> : null}<button type="button" className="primary" disabled={!dirty} onClick={save}>Lưu bảng điểm</button></div>
    </section>

    {view.startsWith('regular-') ? renderRegularTable() : null}
    {view === 'midterm' ? renderExamTable('midterm', 'Điểm giữa kỳ') : null}
    {view === 'final' ? renderExamTable('final', 'Điểm cuối kỳ') : null}
    {view === 'summary' ? renderSummary() : null}
  </div>;
}
