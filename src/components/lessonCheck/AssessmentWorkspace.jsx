import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardCheck,
  Download,
  Gamepad2,
  LoaderCircle,
  MonitorPlay,
  Printer,
  RefreshCw,
  Search,
  Shuffle,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  listAssessmentAssignedClasses,
  listAssessmentResults,
  listAssessmentSessions,
  saveAssessmentSession,
} from '../../utils/lessonCheckAssessment.js';
import './AssessmentWorkspace.css';

const PURPOSES = [
  ['warm_up', 'Khởi động'],
  ['prior_knowledge', 'Kiểm tra bài cũ'],
  ['formative', 'Đánh giá trong quá trình học'],
  ['reinforcement', 'Củng cố'],
  ['exit_ticket', 'Exit ticket'],
  ['unit_review', 'Đánh giá cuối Unit'],
  ['other', 'Khác'],
];

const SCORING_MODES = [
  ['manual', 'Kết quả linh hoạt'],
  ['points', 'Điểm số'],
  ['correct_answers', 'Số câu đúng'],
  ['rubric', 'Rubric'],
  ['completion', 'Hoàn thành'],
  ['ranking', 'Xếp hạng'],
  ['other', 'Khác'],
];

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function studentRef(student) {
  return text(student?.ref || student?.id || student?.code || student?.fullName);
}

function shuffled(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function csvCell(value) {
  const content = String(value ?? '');
  return `"${content.replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadCsv(filename, rows) {
  const csv = '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function purposeLabel(value) {
  return PURPOSES.find(([key]) => key === value)?.[1] || value;
}

function focusLabel(value) {
  const labels = {
    vocabulary: 'Vocabulary',
    grammar: 'Grammar',
    reading: 'Reading',
    listening: 'Listening',
    speaking: 'Speaking',
    mixed: 'Mixed',
    unclassified: 'Chưa gắn',
  };
  return labels[value] || value || '—';
}

function StepBadge({ number, active, done, children }) {
  return <div className={`f4a-step-badge ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}>
    <span>{done ? <Check size={14} /> : number}</span>
    <strong>{children}</strong>
  </div>;
}

export default function AssessmentWorkspace({
  currentUser,
  activities = [],
  isLeader = false,
  initialView = 'session',
  onClose,
  onLaunchActivity,
}) {
  const [view, setView] = useState(initialView);
  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState([]);
  const [classLoading, setClassLoading] = useState(true);
  const [classError, setClassError] = useState('');
  const [className, setClassName] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [participationMode, setParticipationMode] = useState('individual');
  const [selectedRefs, setSelectedRefs] = useState([]);
  const [groupCount, setGroupCount] = useState(4);
  const [groupMap, setGroupMap] = useState({});
  const [randomPickedRef, setRandomPickedRef] = useState('');

  const [activityQuery, setActivityQuery] = useState('');
  const [activityId, setActivityId] = useState('');
  const [purpose, setPurpose] = useState('formative');
  const [scoringMode, setScoringMode] = useState('manual');
  const [sessionId, setSessionId] = useState('');
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [startedAt, setStartedAt] = useState('');
  const [results, setResults] = useState({});
  const [teachingAdjustment, setTeachingAdjustment] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const [reportClass, setReportClass] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSessions, setReportSessions] = useState([]);
  const [reportResults, setReportResults] = useState([]);
  const [reportError, setReportError] = useState('');
  const [reportRefreshKey, setReportRefreshKey] = useState(0);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const body = document.body;
    const root = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousRootOverflow = root.style.overflow;
    body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previousBodyOverflow;
      root.style.overflow = previousRootOverflow;
    };
  }, []);

  const allowedActivities = useMemo(
    () => activities.filter((item) => isLeader || item.hasAccess),
    [activities, isLeader],
  );

  const selectedClass = useMemo(
    () => classes.find((item) => item.className === className) || null,
    [classes, className],
  );
  const roster = selectedClass?.students || [];

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLocaleLowerCase('vi');
    if (!query) return roster;
    return roster.filter((student) => (
      student.fullName.toLocaleLowerCase('vi').includes(query)
      || student.code.toLocaleLowerCase('vi').includes(query)
    ));
  }, [roster, studentQuery]);

  const selectedStudents = useMemo(() => {
    const refs = new Set(selectedRefs);
    return roster.filter((student) => refs.has(studentRef(student)));
  }, [roster, selectedRefs]);

  const selectedActivity = useMemo(
    () => allowedActivities.find((item) => item.id === activityId) || null,
    [activityId, allowedActivities],
  );

  const filteredActivities = useMemo(() => {
    const query = activityQuery.trim().toLocaleLowerCase('vi');
    return allowedActivities.filter((item) => {
      if (!query) return true;
      return [
        item.title,
        item.unitTitle,
        item.lessonTitle,
        item.focusArea,
      ].some((value) => String(value || '').toLocaleLowerCase('vi').includes(query));
    });
  }, [activityQuery, allowedActivities]);

  const groupedStudents = useMemo(() => {
    if (participationMode !== 'group') return [];
    const grouped = new Map();
    selectedStudents.forEach((student) => {
      const label = groupMap[studentRef(student)] || 'Chưa chia nhóm';
      const bucket = grouped.get(label) || [];
      bucket.push(student);
      grouped.set(label, bucket);
    });
    return [...grouped.entries()];
  }, [groupMap, participationMode, selectedStudents]);

  useEffect(() => {
    let active = true;
    let frame = 0;
    setClassLoading(true);

    const load = () => {
      listAssessmentAssignedClasses(currentUser).then((result) => {
        if (!active) return;
        setClassLoading(false);
        if (!result.ok) {
          setClassError(result.message || 'Không tải được lớp đã phân công.');
          return;
        }
        setClasses(result.items || []);
        setClassError('');
        setClassName((current) => current || result.items?.[0]?.className || '');
      });
    };

    // Let the modal paint first; Safari otherwise competes with the background
    // iframe layers and the roster RPC during the opening frame.
    frame = window.requestAnimationFrame(() => window.setTimeout(load, 0));

    return () => {
      active = false;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    setSelectedRefs([]);
    setGroupMap({});
    setRandomPickedRef('');
    setStudentQuery('');
    setSessionId('');
    setSessionCompleted(false);
    setResults({});
    setStep(1);
  }, [className]);

  useEffect(() => {
    if (view !== 'reports') return;
    let active = true;
    setReportLoading(true);
    setReportError('');
    Promise.all([
      listAssessmentSessions(reportClass, 300),
      listAssessmentResults(reportClass),
    ]).then(([sessionsResult, resultsResult]) => {
      if (!active) return;
      setReportLoading(false);
      if (!sessionsResult.ok || !resultsResult.ok) {
        setReportError(sessionsResult.message || resultsResult.message || 'Không tải được báo cáo.');
        return;
      }
      setReportSessions(sessionsResult.items || []);
      setReportResults(resultsResult.items || []);
    });
    return () => { active = false; };
  }, [view, reportClass, reportRefreshKey]);

  const reportSummary = useMemo(() => {
    const completedSessions = reportSessions.filter((item) => item.status === 'completed');
    const uniqueStudents = new Set(reportResults.map((item) => item.studentRef).filter(Boolean));
    const numeric = reportResults.map((item) => item.grade10).filter((value) => Number.isFinite(value));
    const average = numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null;
    const reportRoster = classes.find((item) => item.className === reportClass)?.students || [];
    const coverage = reportRoster.length ? (uniqueStudents.size / reportRoster.length) * 100 : null;
    return {
      sessions: completedSessions.length,
      students: uniqueStudents.size,
      average,
      coverage,
    };
  }, [classes, reportClass, reportResults, reportSessions]);

  const studentReportRows = useMemo(() => {
    const byStudent = new Map();
    reportResults.forEach((item) => {
      const key = item.studentRef || item.studentName;
      const current = byStudent.get(key) || {
        studentRef: key,
        studentCode: item.studentCode,
        studentName: item.studentName,
        sessions: new Set(),
        grades: [],
        focuses: new Set(),
        latest: '',
      };
      current.sessions.add(item.sessionId);
      if (Number.isFinite(item.grade10)) current.grades.push(item.grade10);
      if (item.focusArea) current.focuses.add(item.focusArea);
      if (!current.latest || Date.parse(item.completedAt || 0) > Date.parse(current.latest || 0)) {
        current.latest = item.completedAt;
      }
      byStudent.set(key, current);
    });
    return [...byStudent.values()]
      .map((item) => ({
        ...item,
        sessionCount: item.sessions.size,
        average: item.grades.length ? item.grades.reduce((sum, value) => sum + value, 0) / item.grades.length : null,
        focusText: [...item.focuses].map(focusLabel).join(', '),
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName, 'vi'));
  }, [reportResults]);

  const toggleStudent = (ref) => {
    setSelectedRefs((current) => current.includes(ref)
      ? current.filter((item) => item !== ref)
      : [...current, ref]);
    setRandomPickedRef('');
  };

  const selectAll = () => {
    setSelectedRefs(roster.map(studentRef));
    setRandomPickedRef('');
  };

  const randomPick = () => {
    if (!roster.length) return;
    const pool = selectedStudents.length ? selectedStudents : roster;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    const ref = studentRef(picked);
    setParticipationMode('individual');
    setSelectedRefs([ref]);
    setGroupMap({});
    setRandomPickedRef(ref);
    setNotice(`Đã gọi ngẫu nhiên: ${picked.fullName}`);
  };

  const randomGroups = () => {
    const pool = selectedStudents.length ? selectedStudents : roster;
    if (pool.length < 2) {
      setNotice('Cần ít nhất 2 học sinh để chia nhóm.');
      return;
    }
    const count = Math.max(2, Math.min(Number(groupCount) || 2, pool.length));
    const nextMap = {};
    shuffled(pool).forEach((student, index) => {
      nextMap[studentRef(student)] = `Nhóm ${(index % count) + 1}`;
    });
    setParticipationMode('group');
    setSelectedRefs(pool.map(studentRef));
    setGroupMap(nextMap);
    setRandomPickedRef('');
    setNotice(`Đã chia ngẫu nhiên ${pool.length} học sinh thành ${count} nhóm.`);
  };

  const prepareResults = (students = selectedStudents) => {
    const next = {};
    students.forEach((student) => {
      const ref = studentRef(student);
      const existing = results[ref] || {};
      next[ref] = {
        rawResult: existing.rawResult || '',
        grade10: existing.grade10 ?? '',
        achievement: existing.achievement || '',
        note: existing.note || '',
      };
    });
    setResults(next);
    return next;
  };

  const sessionPayload = ({ status = 'draft', resultState = results } = {}) => ({
    id: sessionId || '',
    className: selectedClass?.className || '',
    grade: selectedClass?.grade || '',
    activityId: selectedActivity?.id || '',
    activityTitle: selectedActivity?.title || '',
    focusArea: selectedActivity?.focusArea || 'unclassified',
    unitNo: selectedActivity?.unitNo || '',
    unitTitle: selectedActivity?.unitTitle || '',
    lessonTitle: selectedActivity?.lessonTitle || '',
    purpose,
    participationMode,
    scoringMode,
    scoringConfig: {},
    groupConfig: participationMode === 'group' ? { groupCount, groups: groupMap } : {},
    status,
    teachingAdjustment,
    notes: sessionNotes,
    startedAt: startedAt || new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : '',
    results: selectedStudents.map((student) => {
      const ref = studentRef(student);
      const item = resultState[ref] || {};
      return {
        studentRef: ref,
        studentCode: student.code || '',
        studentName: student.fullName,
        groupLabel: participationMode === 'group' ? (groupMap[ref] || '') : '',
        rawResult: item.rawResult || '',
        grade10: item.grade10 === '' || item.grade10 == null ? '' : Number(item.grade10),
        achievement: item.achievement || '',
        note: item.note || '',
        payload: {},
      };
    }),
  });

  const startSession = async () => {
    if (!selectedClass) {
      setNotice('Hãy chọn lớp.');
      return;
    }
    if (!selectedStudents.length) {
      setNotice('Hãy chọn ít nhất một học sinh.');
      return;
    }
    if (participationMode === 'group' && selectedStudents.some((student) => !groupMap[studentRef(student)])) {
      setNotice('Hãy chia nhóm trước khi bắt đầu.');
      return;
    }
    if (!selectedActivity) {
      setNotice('Hãy chọn hoạt động kiểm tra.');
      return;
    }
    const resultState = prepareResults();
    const start = startedAt || new Date().toISOString();
    if (!startedAt) setStartedAt(start);
    setSaving(true);
    const saved = await saveAssessmentSession({
      ...sessionPayload({ status: 'draft', resultState }),
      startedAt: start,
    });
    setSaving(false);
    if (!saved.ok) {
      setNotice(saved.message || 'Không thể tạo phiên đánh giá.');
      return;
    }
    setSessionId(saved.id);
    setSessionCompleted(false);
    setStep(3);
    setNotice('Phiên đánh giá đã được ghi nhận. Bạn có thể mở hoạt động.');
    onLaunchActivity?.(selectedActivity);
  };

  const completeSession = async () => {
    if (!selectedStudents.length || !selectedActivity) return;
    setSaving(true);
    const saved = await saveAssessmentSession(sessionPayload({ status: 'completed' }));
    setSaving(false);
    if (!saved.ok) {
      setNotice(saved.message || 'Không thể lưu kết quả.');
      return;
    }
    setSessionId(saved.id);
    setSessionCompleted(true);
    setNotice('Đã lưu kết quả đánh giá vào hồ sơ học sinh.');
    setStep(4);
  };

  const resetSession = () => {
    setStep(1);
    setSelectedRefs([]);
    setGroupMap({});
    setActivityId('');
    setPurpose('formative');
    setScoringMode('manual');
    setSessionId('');
    setSessionCompleted(false);
    setStartedAt('');
    setResults({});
    setTeachingAdjustment('');
    setSessionNotes('');
    setRandomPickedRef('');
  };

  const exportReport = () => {
    const rows = [
      ['Học sinh', 'Mã HS', 'Số lần đánh giá', 'Điểm TB /10', 'Chuyên đề', 'Lần gần nhất'],
      ...studentReportRows.map((item) => [
        item.studentName,
        item.studentCode,
        item.sessionCount,
        item.average == null ? '' : item.average.toFixed(2),
        item.focusText,
        formatDate(item.latest),
      ]),
    ];
    downloadCsv(
      `Fun-for-Assessment-${reportClass || 'tat-ca'}-${new Date().toISOString().slice(0,10)}.csv`,
      rows,
    );
  };

  const printReport = () => {
    const popup = window.open('', '_blank');
    if (!popup) return;
    try { popup.opener = null; } catch { /* best effort */ }
    const rows = studentReportRows.map((item) => `
      <tr>
        <td>${escapeHtml(item.studentName)}</td>
        <td>${escapeHtml(item.studentCode || '—')}</td>
        <td>${item.sessionCount}</td>
        <td>${item.average == null ? '—' : item.average.toFixed(2)}</td>
        <td>${escapeHtml(item.focusText || '—')}</td>
        <td>${escapeHtml(formatDate(item.latest))}</td>
      </tr>`).join('');
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Fun for Assessment Report</title>
      <style>
      body{font-family:Arial,sans-serif;margin:36px;color:#1d2a25}h1{margin:0 0 4px}p{color:#66756d}
      .stats{display:flex;gap:12px;margin:20px 0}.stats div{border:1px solid #dce7e1;border-radius:12px;padding:12px 16px}
      .stats strong{font-size:22px;display:block}table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #dfe7e2;padding:8px;text-align:left}th{background:#f3f7f5}
      small{color:#7b887f}@media print{body{margin:16mm}}
      </style></head><body>
      <h1>Fun for Assessment</h1><p>Đổi mới kiểm tra đánh giá · ${escapeHtml(reportClass || 'Tất cả lớp')} · ${new Date().toLocaleDateString('vi-VN')}</p>
      <div class="stats">
        <div><strong>${reportSummary.sessions}</strong><small>Phiên đánh giá</small></div>
        <div><strong>${reportSummary.students}</strong><small>Học sinh</small></div>
        <div><strong>${reportSummary.average == null ? '—' : reportSummary.average.toFixed(2)}</strong><small>Điểm TB /10</small></div>
        <div><strong>${reportSummary.coverage == null ? '—' : `${reportSummary.coverage.toFixed(0)}%`}</strong><small>Độ phủ</small></div>
      </div>
      <table><thead><tr><th>Học sinh</th><th>Mã HS</th><th>Số lần</th><th>Điểm TB /10</th><th>Chuyên đề</th><th>Gần nhất</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`);
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 250);
  };

  const resultFor = (ref) => results[ref] || { rawResult: '', grade10: '', achievement: '', note: '' };
  const updateResult = (ref, patch) => {
    setResults((current) => ({
      ...current,
      [ref]: { ...resultFor(ref), ...patch },
    }));
  };

  return <div className="f4a-overlay">
    <section className="f4a-workspace" role="dialog" aria-modal="true" aria-label="Fun for Assessment">
      <header className="f4a-head">
        <div className="f4a-head-brand">
          <span className="f4a-head-icon"><ClipboardCheck size={22} /></span>
          <div><small>FUN FOR ASSESSMENT</small><h1>{view === 'reports' ? 'Báo cáo kiểm tra đánh giá' : 'Tổ chức phiên đánh giá'}</h1></div>
        </div>
        <div className="f4a-head-actions">
          <button className={view === 'session' ? 'is-active' : ''} onClick={() => setView('session')}><Sparkles size={16} />Tổ chức đánh giá</button>
          <button className={view === 'reports' ? 'is-active' : ''} onClick={() => setView('reports')}><BarChart3 size={16} />Báo cáo</button>
          <button className="f4a-close" onClick={onClose}><X size={18} /></button>
        </div>
      </header>

      {notice ? <div className="f4a-notice">{notice}</div> : null}

      {view === 'session' ? <>
        <div className="f4a-steps">
          <StepBadge number="1" active={step === 1} done={step > 1}>Lớp & học sinh</StepBadge>
          <ChevronRight />
          <StepBadge number="2" active={step === 2} done={step > 2}>Hoạt động</StepBadge>
          <ChevronRight />
          <StepBadge number="3" active={step === 3} done={step > 3}>Thực hiện</StepBadge>
          <ChevronRight />
          <StepBadge number="4" active={step === 4} done={false}>Ghi nhận kết quả</StepBadge>
        </div>

        {step === 1 ? <div className="f4a-stage">
          <aside className="f4a-stage-aside">
            <small>BƯỚC 01</small>
            <h2>Chọn lớp và người tham gia</h2>
            <p>Lớp được lấy trực tiếp từ phân công giảng dạy của giáo viên.</p>

            <label className="f4a-field"><span>Lớp được phân công</span>
              <select value={className} onChange={(event) => setClassName(event.target.value)} disabled={classLoading}>
                {classes.map((item) => <option key={item.className} value={item.className}>{item.className} · {item.students.length} HS</option>)}
              </select>
            </label>
            {classError ? <div className="f4a-error">{classError}</div> : null}

            <div className="f4a-mode-switch">
              <button className={participationMode === 'individual' ? 'is-active' : ''} onClick={() => { setParticipationMode('individual'); setGroupMap({}); }}><BookOpen size={16} />Cá nhân</button>
              <button className={participationMode === 'group' ? 'is-active' : ''} onClick={() => setParticipationMode('group')}><Users size={16} />Nhóm</button>
            </div>

            <div className="f4a-random-tools">
              <button onClick={randomPick} disabled={!roster.length}><Shuffle size={16} />Gọi tên ngẫu nhiên</button>
              <div><select value={groupCount} onChange={(event) => setGroupCount(Number(event.target.value))}>{[2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n} nhóm</option>)}</select><button onClick={randomGroups} disabled={roster.length < 2}><Users size={16} />Chia nhóm ngẫu nhiên</button></div>
            </div>

            <div className="f4a-selection-summary"><strong>{selectedStudents.length}</strong><span>học sinh đã chọn</span></div>
            <button className="f4a-primary" disabled={!selectedStudents.length} onClick={() => setStep(2)}>Tiếp tục chọn hoạt động <ChevronRight size={16} /></button>
          </aside>

          <main className="f4a-roster">
            <div className="f4a-roster-toolbar">
              <label><Search size={17} /><input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="Tìm học sinh..." /></label>
              <button onClick={selectAll}>Chọn tất cả</button>
              <button onClick={() => { setSelectedRefs([]); setGroupMap({}); setRandomPickedRef(''); }}>Bỏ chọn</button>
            </div>

            {classLoading ? <div className="f4a-loading"><LoaderCircle className="lcs-spin" />Đang tải danh sách lớp…</div> : (
              <div className="f4a-student-grid">
                {filteredStudents.map((student) => {
                  const ref = studentRef(student);
                  const selected = selectedRefs.includes(ref);
                  const group = groupMap[ref] || '';
                  return <button key={ref} className={`f4a-student ${selected ? 'is-selected' : ''} ${randomPickedRef === ref ? 'is-random' : ''}`} onClick={() => toggleStudent(ref)}>
                    <span className="f4a-student-avatar">{student.fullName.trim().slice(0,1).toUpperCase()}</span>
                    <span className="f4a-student-copy"><strong>{student.fullName}</strong><small>{student.code || 'Chưa có mã HS'}{group ? ` · ${group}` : ''}</small></span>
                    <span className="f4a-check">{selected ? <Check size={14} /> : null}</span>
                  </button>;
                })}
              </div>
            )}

            {participationMode === 'group' && groupedStudents.length ? <div className="f4a-groups-preview">
              {groupedStudents.map(([label, students]) => <div key={label}><strong>{label}</strong><span>{students.map((student) => student.fullName).join(' · ')}</span></div>)}
            </div> : null}
          </main>
        </div> : null}

        {step === 2 ? <div className="f4a-stage f4a-stage-activity">
          <aside className="f4a-stage-aside">
            <button className="f4a-back-step" onClick={() => setStep(1)}><ArrowLeft size={15} />Quay lại</button>
            <small>BƯỚC 02</small>
            <h2>Chọn hoạt động kiểm tra</h2>
            <p>Chỉ hiển thị những hoạt động giáo viên đã được cấp quyền sử dụng.</p>

            <label className="f4a-field"><span>Mục đích đánh giá</span><select value={purpose} onChange={(event) => setPurpose(event.target.value)}>{PURPOSES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="f4a-field"><span>Cách ghi nhận kết quả</span><select value={scoringMode} onChange={(event) => setScoringMode(event.target.value)}>{SCORING_MODES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>

            <div className="f4a-session-brief">
              <span><strong>{selectedClass?.className}</strong>lớp</span>
              <span><strong>{selectedStudents.length}</strong>học sinh</span>
              <span><strong>{participationMode === 'group' ? groupedStudents.length : 'Cá nhân'}</strong>{participationMode === 'group' ? 'nhóm' : 'hình thức'}</span>
            </div>
            <button className="f4a-primary" disabled={!selectedActivity || saving} onClick={startSession}>{saving ? <LoaderCircle className="lcs-spin" size={16} /> : <MonitorPlay size={16} />}Bắt đầu hoạt động</button>
          </aside>

          <main className="f4a-activity-picker">
            <label className="f4a-activity-search"><Search size={17} /><input value={activityQuery} onChange={(event) => setActivityQuery(event.target.value)} placeholder="Tìm hoạt động..." /></label>
            <div className="f4a-activity-grid">
              {filteredActivities.map((activity) => <button key={activity.id} className={activityId === activity.id ? 'is-selected' : ''} onClick={() => setActivityId(activity.id)}>
                <div className={`f4a-focus is-${activity.focusArea || 'unclassified'}`}>{focusLabel(activity.focusArea)}</div>
                <span className="f4a-activity-icon"><Gamepad2 /></span>
                <div><small>Global Success {activity.grade} · Unit {activity.unitNo}</small><strong>{activity.title}</strong><span>{activity.lessonTitle}</span></div>
                <i>{activityId === activity.id ? <Check size={15} /> : null}</i>
              </button>)}
            </div>
          </main>
        </div> : null}

        {step === 3 ? <div className="f4a-stage f4a-run-stage">
          <aside className="f4a-stage-aside">
            <small>BƯỚC 03</small>
            <h2>Thực hiện kiểm tra</h2>
            <p>Phiên đánh giá đã được lưu ở trạng thái nháp. Sau khi hoạt động kết thúc, chuyển sang bảng ghi điểm.</p>
            <div className="f4a-run-card">
              <span>{focusLabel(selectedActivity?.focusArea)}</span>
              <strong>{selectedActivity?.title}</strong>
              <small>{selectedClass?.className} · {selectedStudents.length} học sinh · {purposeLabel(purpose)}</small>
            </div>
            <button className="f4a-secondary" onClick={() => onLaunchActivity?.(selectedActivity)}><MonitorPlay size={16} />Mở lại hoạt động</button>
            <button className="f4a-primary" onClick={() => { prepareResults(); setStep(4); }}><ClipboardCheck size={16} />Hoạt động đã kết thúc · Ghi điểm</button>
          </aside>
          <main className="f4a-run-participants">
            <div className="f4a-run-visual"><Gamepad2 size={38} /><strong>Assessment in progress</strong><span>Kết quả trò chơi được giáo viên ghi nhận sau khi hoạt động kết thúc.</span></div>
            <div className="f4a-participant-list">{selectedStudents.map((student) => <span key={studentRef(student)}>{student.fullName}{groupMap[studentRef(student)] ? <small>{groupMap[studentRef(student)]}</small> : null}</span>)}</div>
          </main>
        </div> : null}

        {step === 4 ? <div className="f4a-score-stage">
          <header>
            <div><small>BƯỚC 04</small><h2>Bảng ghi nhận kết quả</h2><p>Kết quả gốc giữ nguyên cách tính điểm của từng trò chơi; điểm /10 dùng để theo dõi và tổng hợp báo cáo.</p></div>
            <div><span>{selectedClass?.className}</span><span>{selectedActivity?.title}</span><span>{purposeLabel(purpose)}</span></div>
          </header>

          <div className="f4a-score-table">
            <div className="f4a-score-row is-head"><span>Học sinh</span><span>Nhóm</span><span>Kết quả gốc</span><span>Điểm /10</span><span>Mức độ</span><span>Ghi chú</span></div>
            {selectedStudents.map((student) => {
              const ref = studentRef(student);
              const item = resultFor(ref);
              return <div className="f4a-score-row" key={ref}>
                <span className="f4a-score-student"><strong>{student.fullName}</strong><small>{student.code || '—'}</small></span>
                <span>{groupMap[ref] || '—'}</span>
                <span><input value={item.rawResult} onChange={(event) => updateResult(ref, { rawResult: event.target.value })} placeholder="vd. 17/20, 850 điểm…" /></span>
                <span><input type="number" min="0" max="10" step="0.1" value={item.grade10} onChange={(event) => updateResult(ref, { grade10: event.target.value })} placeholder="—" /></span>
                <span><select value={item.achievement} onChange={(event) => updateResult(ref, { achievement: event.target.value })}><option value="">—</option><option value="Tốt">Tốt</option><option value="Đạt">Đạt</option><option value="Cần hỗ trợ">Cần hỗ trợ</option></select></span>
                <span><input value={item.note} onChange={(event) => updateResult(ref, { note: event.target.value })} placeholder="Ghi chú…" /></span>
              </div>;
            })}
          </div>

          <div className="f4a-reflection">
            <label><span>Điều chỉnh sau đánh giá</span><textarea rows={3} value={teachingAdjustment} onChange={(event) => setTeachingAdjustment(event.target.value)} placeholder="Ví dụ: Củng cố lại comparative structures cho nhóm học sinh chưa đạt." /></label>
            <label><span>Ghi chú phiên đánh giá</span><textarea rows={3} value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} placeholder="Ghi chú khác nếu cần…" /></label>
          </div>

          <div className="f4a-score-actions">
            {sessionId && step === 4 ? <button className="f4a-secondary" onClick={() => setStep(3)}><ArrowLeft size={15} />Quay lại hoạt động</button> : null}
            <button className="f4a-primary" onClick={completeSession} disabled={saving}>{saving ? <LoaderCircle className="lcs-spin" size={16} /> : <Check size={16} />}{sessionCompleted ? 'Lưu lại thay đổi' : 'Lưu kết quả đánh giá'}</button>
            {sessionCompleted ? <button className="f4a-secondary" onClick={() => { resetSession(); setView('reports'); }}><BarChart3 size={16} />Xem báo cáo</button> : null}
            {sessionCompleted ? <button className="f4a-secondary" onClick={resetSession}><Sparkles size={16} />Phiên đánh giá mới</button> : null}
          </div>
        </div> : null}
      </> : <div className="f4a-report">
        <div className="f4a-report-toolbar">
          <div><small>ASSESSMENT ANALYTICS</small><h2>Theo dõi kiểm tra đánh giá</h2><p>Tổng hợp các phiên đã thực hiện và quá trình của từng học sinh.</p></div>
          <div>
            <select value={reportClass} onChange={(event) => setReportClass(event.target.value)}><option value="">Tất cả lớp</option>{classes.map((item) => <option key={item.className} value={item.className}>{item.className}</option>)}</select>
            <button onClick={() => setReportRefreshKey((value) => value + 1)}><RefreshCw size={16} />Làm mới</button>
            <button onClick={exportReport} disabled={!studentReportRows.length}><Download size={16} />Excel/CSV</button>
            <button onClick={printReport} disabled={!studentReportRows.length}><Printer size={16} />In / PDF</button>
          </div>
        </div>

        {reportLoading ? <div className="f4a-loading"><LoaderCircle className="lcs-spin" />Đang tổng hợp dữ liệu…</div> : reportError ? <div className="f4a-error">{reportError}</div> : <>
          <div className="f4a-report-stats">
            <div><span><ClipboardCheck /></span><strong>{reportSummary.sessions}</strong><small>phiên đánh giá</small></div>
            <div><span><Users /></span><strong>{reportSummary.students}</strong><small>học sinh đã đánh giá</small></div>
            <div><span><BarChart3 /></span><strong>{reportSummary.average == null ? '—' : reportSummary.average.toFixed(2)}</strong><small>điểm trung bình /10</small></div>
            <div><span><Check /></span><strong>{reportSummary.coverage == null ? '—' : `${reportSummary.coverage.toFixed(0)}%`}</strong><small>độ phủ học sinh</small></div>
          </div>

          <div className="f4a-report-grid">
            <section>
              <header><h3>Hồ sơ đánh giá học sinh</h3><span>{studentReportRows.length} học sinh</span></header>
              <div className="f4a-report-table">
                <div className="is-head"><span>Học sinh</span><span>Số lần</span><span>TB /10</span><span>Chuyên đề</span><span>Gần nhất</span></div>
                {studentReportRows.map((item) => <div key={item.studentRef}><span><strong>{item.studentName}</strong><small>{item.studentCode || '—'}</small></span><span>{item.sessionCount}</span><span>{item.average == null ? '—' : item.average.toFixed(2)}</span><span>{item.focusText || '—'}</span><span>{formatDate(item.latest)}</span></div>)}
              </div>
            </section>

            <aside>
              <header><h3>Lịch sử phiên đánh giá</h3><span>{reportSessions.length}</span></header>
              <div className="f4a-session-history">
                {reportSessions.slice(0,20).map((item) => <article key={item.id}><span className={`is-${item.focusArea}`}>{focusLabel(item.focusArea)}</span><strong>{item.activityTitle}</strong><small>{item.className} · {item.studentCount} HS · {formatDate(item.completedAt || item.startedAt)}</small><em>{item.averageGrade10 == null ? 'Chưa có điểm /10' : `TB ${item.averageGrade10.toFixed(2)}/10`}</em>{item.teachingAdjustment ? <p>Điều chỉnh: {item.teachingAdjustment}</p> : null}</article>)}
              </div>
            </aside>
          </div>
        </>}
      </div>}
    </section>
  </div>;
}
