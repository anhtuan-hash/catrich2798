import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clearSessionRecovery, loadSessionRecovery, saveSessionRecovery } from '../../utils/lessonCheckWorkbench.js';
import { subscribeTable } from '../../services/runtime/core.js';
import { createPortal } from 'react-dom';
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
  Trash2,
  Users,
  RotateCcw,
  UserPlus,
  X,
} from 'lucide-react';
import {
  buildAssessmentStudentRefAliases,
  deleteAssessmentSession,
  listAssessmentAssignedClasses,
  listAssessmentResults,
  listAssessmentSessions,
  saveAssessmentSession,
} from '../../utils/lessonCheckAssessment.js';
import { drawUncalledStudent, makeBalancedGroups } from '../../utils/lessonCheckRandomizer.js';
import { buildLessonCheckA4Html } from '../../utils/lessonCheckPrintA4.js';
import { assessmentText, assessmentLocale } from '../../utils/assessmentBilingual.js';
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

function formatDate(value, language = 'vi') {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(assessmentLocale(language), {
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

function normalizedGrade10FromRaw(rawValue) {
  const raw = String(rawValue || '').trim().replace(/,/g, '.');
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const earned = Number(match[1]);
  const maximum = Number(match[2]);
  if (!Number.isFinite(earned) || !Number.isFinite(maximum) || maximum <= 0 || earned < 0 || earned > maximum) return null;
  return Math.round(((earned / maximum) * 10) * 100) / 100;
}

function purposeLabel(value,language='vi') {
  return assessmentText(PURPOSES.find(([key]) => key === value)?.[1] || value,language);
}

function focusLabel(value,language='vi') {
  const labels = {
    vocabulary: 'Vocabulary',
    grammar: 'Grammar',
    reading: 'Reading',
    listening: 'Listening',
    speaking: 'Speaking',
    mixed: 'Mixed',
    unclassified: 'Chưa gắn',
  };
  return assessmentText(labels[value] || value || '—',language);
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
  visible = true,
  resumeToScoreToken = 0,
  onClose,
  onLaunchActivity,
  language = 'vi',
}) {
  const t=(value)=>assessmentText(value,language);
  const [view, setView] = useState(initialView);
  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState([]);
  const [classLoading, setClassLoading] = useState(true);
  const [classError, setClassError] = useState('');
  const rosterRequestSequence = useRef(0);
  const [className, setClassName] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [participationMode, setParticipationMode] = useState('individual');
  const [selectedRefs, setSelectedRefs] = useState([]);
  const [groupCount, setGroupCount] = useState(4);
  const [groupMap, setGroupMap] = useState({});
  const [randomPickedRef, setRandomPickedRef] = useState('');
  const [randomScope, setRandomScope] = useState('all');
  const [calledRefs, setCalledRefs] = useState([]);
  const [spotlightOpen, setSpotlightOpen] = useState(false);

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
  const [deletingSessionId, setDeletingSessionId] = useState('');
  const [recoverable, setRecoverable] = useState(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [restorePending, setRestorePending] = useState(null);

  useEffect(() => {
    if (visible) setView(initialView);
  }, [initialView, visible]);

  useEffect(() => {
    if (!visible || typeof document === 'undefined') return undefined;
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
  }, [visible]);

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

  // Calling a learner must not alter the participants chosen for assessment.
  const randomPool = randomScope === 'selected' ? selectedStudents : roster;
  const randomPoolRefs = new Set(randomPool.map(studentRef));
  const calledInPool = calledRefs.filter((ref) => randomPoolRefs.has(ref));
  const remainingCallCount = randomPool.length - calledInPool.length;
  const lastCalledStudent = roster.find((student) => studentRef(student) === randomPickedRef) || null;
  const groupingPool = randomScope === 'selected' ? selectedStudents : roster;

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
    return [...grouped.entries()].sort((a, b) => {
      const numberA = Number(a[0].match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
      const numberB = Number(b[0].match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
      return numberA - numberB;
    });
  }, [groupMap, participationMode, selectedStudents]);

  const refreshAssignedClasses = useCallback(async () => {
    const sequence = ++rosterRequestSequence.current;
    setClassLoading(true);
    try {
      const result = await listAssessmentAssignedClasses(currentUser);
      if (sequence !== rosterRequestSequence.current) return;
      if (!result.ok) {
        setClassError(result.message || t("Không tải được danh sách học sinh dùng chung."));
        return;
      }
      const nextClasses = result.items || [];
      setClasses(nextClasses);
      setClassError('');
      setClassName((current) => (
        nextClasses.some((item) => item.className === current)
          ? current
          : (nextClasses[0]?.className || '')
      ));
    } catch (error) {
      if (sequence === rosterRequestSequence.current) {
        setClassError(error?.message || t("Không thể cập nhật danh sách học sinh."));
      }
    } finally {
      if (sequence === rosterRequestSequence.current) setClassLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!visible) return undefined;
    // Paint the modal before requesting the canonical shared school rosters.
    let timeout = 0;
    const frame = window.requestAnimationFrame(() => {
      timeout = window.setTimeout(() => { void refreshAssignedClasses(); }, 0);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      ++rosterRequestSequence.current;
    };
  }, [currentUser?.id, visible, refreshAssignedClasses]);

  useEffect(() => {
    // Refresh only while choosing students, never during an active/graded session.
    if (!visible || view !== 'session' || step !== 1) return undefined;
    const reload = () => {
      if (document.visibilityState !== 'hidden') void refreshAssignedClasses();
    };
    window.addEventListener('focus', reload);
    document.addEventListener('visibilitychange', reload);
    window.addEventListener('bes-school-class-registry-updated', reload);
    window.addEventListener('bes-class-roster-updated', reload);
    return () => {
      window.removeEventListener('focus', reload);
      document.removeEventListener('visibilitychange', reload);
      window.removeEventListener('bes-school-class-registry-updated', reload);
      window.removeEventListener('bes-class-roster-updated', reload);
    };
  }, [visible, view, step, refreshAssignedClasses]);

  useEffect(() => {
    if (!visible || view !== 'session' || step !== 1 || !className) return undefined;
    const selectedClass = classes.find((item) => item.className === className);
    const schoolYear = selectedClass?.schoolYear;
    if (!schoolYear) return undefined;
    // Keep the unstarted selection list current across different teachers/devices.
    // A running or completed assessment must never be reshuffled by realtime.
    return subscribeTable({
      key: `lesson-check-roster-${currentUser?.id || 'guest'}-${schoolYear}-${className}`,
      table: 'bes_class_rosters',
      filter: `roster_key=eq.class:${schoolYear}||${className}`,
      onChange: () => { void refreshAssignedClasses(); },
    });
  }, [visible, view, step, className, classes, currentUser?.id, refreshAssignedClasses]);

  useEffect(() => {
    setSelectedRefs([]);
    setGroupMap({});
    setRandomPickedRef('');
    setCalledRefs([]);
    setSpotlightOpen(false);
    setStudentQuery('');
    setSessionId('');
    setSessionCompleted(false);
    setResults({});
    setStep(1);
  }, [className]);

  useEffect(() => {
    if (!spotlightOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setSpotlightOpen(false); }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [spotlightOpen]);

  // Assessment 4.0: private recovery snapshots persist server-side only.
  useEffect(() => {
    const userId = currentUser?.id || currentUser?.authId;
    if (!userId) return undefined;
    let live = true;
    setRecoveryReady(false);
    loadSessionRecovery(userId).then(result => {
      if (!live) return;
      if (result.ok && result.snapshot?.sessionId) setRecoverable(result.snapshot);
      setRecoveryReady(result.ok);
    });
    return () => { live = false; };
  }, [currentUser?.id, currentUser?.authId]);

  // The existing class-change reset runs first, then the user-triggered restore repopulates data.
  useEffect(() => {
    if (!restorePending || className !== restorePending.className) return;
    setParticipationMode(restorePending.participationMode || 'individual');
    setSelectedRefs(restorePending.selectedRefs || []);
    setGroupMap(restorePending.groupMap || {});
    setActivityId(restorePending.activityId || '');
    setPurpose(restorePending.purpose || 'formative');
    setScoringMode(restorePending.scoringMode || 'manual');
    setSessionId(restorePending.sessionId || '');
    setSessionCompleted(false);
    setStartedAt(restorePending.startedAt || '');
    setResults(restorePending.results || {});
    setTeachingAdjustment(restorePending.teachingAdjustment || '');
    setSessionNotes(restorePending.sessionNotes || '');
    setView('session');
    setStep(Math.max(2,Math.min(4,Number(restorePending.step)||3)));
    setRestorePending(null);
    setNotice(t("Đã khôi phục phiên đánh giá chưa hoàn tất từ Supabase."));
  }, [className, restorePending]);

  useEffect(() => {
    const userId = currentUser?.id || currentUser?.authId;
    if (!userId || !recoveryReady) return undefined;
    if (sessionCompleted) {
      clearSessionRecovery(userId).then(result => {
        if (result.ok) setRecoverable(null);
      });
      return undefined;
    }
    if (!sessionId || !activityId) return undefined;
    const snapshot = {
      sessionId, className, participationMode, selectedRefs, groupMap, activityId,
      purpose, scoringMode, startedAt, results, teachingAdjustment, sessionNotes, step,
      savedAt: new Date().toISOString(),
    };
    const timer = window.setTimeout(() => {
      saveSessionRecovery(userId, snapshot).then(result => {
        if (result.ok) setRecoverable(snapshot);
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [currentUser?.id,currentUser?.authId,recoveryReady,sessionId,sessionCompleted,className,
      participationMode,selectedRefs,groupMap,activityId,purpose,scoringMode,startedAt,
      results,teachingAdjustment,sessionNotes,step]);

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
        setReportError(sessionsResult.message || resultsResult.message || t("Không tải được báo cáo."));
        return;
      }
      setReportSessions(sessionsResult.items || []);
      setReportResults(resultsResult.items || []);
    });
    return () => { active = false; };
  }, [view, reportClass, reportRefreshKey]);

  useEffect(() => {
    if (!resumeToScoreToken || !sessionId) return;
    setView('session');
    setStep(4);
    setNotice(t("Hoạt động đã kết thúc. Tiếp tục ghi nhận kết quả."));
  }, [resumeToScoreToken, sessionId]);

  const rosterRefAliases = useMemo(() => buildAssessmentStudentRefAliases(classes), [classes]);
  const reportSummary = useMemo(() => {
    const completedSessions = reportSessions.filter((item) => item.status === 'completed');
    const uniqueStudents = new Set(reportResults.map((item) => (
      rosterRefAliases.get(item.studentRef) || item.studentRef
    )).filter(Boolean));
    const numeric = reportResults.map((item) => item.grade10).filter((value) => Number.isFinite(value));
    const average = numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null;
    const reportRoster = reportClass
      ? (classes.find((item) => item.className === reportClass)?.students || [])
      : classes.flatMap((item) => item.students || []);
    const reportRosterRefs = new Set(reportRoster.map(studentRef).filter(Boolean));
    const coverage = reportRosterRefs.size ? (uniqueStudents.size / reportRosterRefs.size) * 100 : null;
    return {
      sessions: completedSessions.length,
      students: uniqueStudents.size,
      average,
      coverage,
    };
  }, [classes, reportClass, reportResults, reportSessions, rosterRefAliases]);

  const studentReportRows = useMemo(() => {
    const byStudent = new Map();
    reportResults.forEach((item) => {
      const key = rosterRefAliases.get(item.studentRef) || item.studentRef || item.studentName;
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
  }, [reportResults, rosterRefAliases]);

  const toggleStudent = (ref) => {
    setSelectedRefs((current) => current.includes(ref)
      ? current.filter((item) => item !== ref)
      : [...current, ref]);
    // Changing a team roster requires regrouping to avoid assigning an unselected student.
    if (participationMode === 'group') setGroupMap({});
  };

  const selectAll = () => {
    setSelectedRefs(roster.map(studentRef));
    if (participationMode === 'group') setGroupMap({});
  };

  const resetCalls = () => {
    setCalledRefs([]);
    setRandomPickedRef('');
    setSpotlightOpen(false);
    setNotice('');
  };

  const setDrawingScope = (scope) => {
    setRandomScope(scope);
    setCalledRefs([]);
    setRandomPickedRef('');
    setSpotlightOpen(false);
  };

  const randomPick = () => {
    if (!randomPool.length) {
      setNotice(t("Hãy chọn học sinh hoặc chuyển phạm vi sang Toàn lớp."));
      return;
    }
    const picked = drawUncalledStudent(randomPool, calledRefs, studentRef);
    if (!picked) {
      setNotice(t("Đã gọi hết học sinh trong lượt này. Chọn “Lượt mới” để tiếp tục."));
      return;
    }
    const ref = studentRef(picked);
    setCalledRefs((current) => [...current, ref]);
    setRandomPickedRef(ref);
    setSpotlightOpen(true);
    setNotice('');
  };

  const addCalledStudent = () => {
    if (!randomPickedRef) return;
    setSelectedRefs((current) => current.includes(randomPickedRef) ? current : [...current, randomPickedRef]);
    if (participationMode === 'group') setGroupMap({});
  };

  const randomGroups = () => {
    if (groupingPool.length < 2) {
      setNotice(t("Cần ít nhất 2 học sinh trong phạm vi đã chọn để chia nhóm."));
      return;
    }
    const count = Math.max(2, Math.min(Number(groupCount) || 2, groupingPool.length));
    const nextMap = makeBalancedGroups(groupingPool, count, studentRef);
    setParticipationMode('group');
    setSelectedRefs(groupingPool.map(studentRef));
    setGroupMap(nextMap);
    setGroupCount(count);
    setNotice((language==='en' ? `Balanced ${groupingPool.length} students into ${count} groups. You can adjust memberships on the right.` : `Đã chia đều ${groupingPool.length} học sinh thành ${count} nhóm. Có thể điều chỉnh thành viên trực tiếp bên phải.`));
  };

  const reassignGroup = (ref, group) => {
    const previous = groupMap[ref];
    if (previous === group) return;
    const sourceCount = selectedStudents.filter((student) => groupMap[studentRef(student)] === previous).length;
    if (sourceCount <= 1) {
      setNotice(t("Mỗi nhóm cần ít nhất một học sinh. Hãy đổi thành viên khác thay vì để trống nhóm."));
      return;
    }
    setGroupMap((current) => ({ ...current, [ref]: group }));
    setNotice('');
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
      setNotice(t("Hãy chọn lớp."));
      return;
    }
    if (!selectedStudents.length) {
      setNotice(t("Hãy chọn ít nhất một học sinh."));
      return;
    }
    if (participationMode === 'group' && selectedStudents.some((student) => !groupMap[studentRef(student)])) {
      setNotice(t("Hãy chia nhóm trước khi bắt đầu."));
      return;
    }
    if (!selectedActivity) {
      setNotice(t("Hãy chọn hoạt động kiểm tra."));
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
      setNotice(saved.message || t("Không thể tạo phiên đánh giá."));
      return;
    }
    setSessionId(saved.id);
    setSessionCompleted(false);
    setStep(3);
    setNotice(t("Phiên đánh giá đã được ghi nhận. Bạn có thể mở hoạt động."));
    onLaunchActivity?.(selectedActivity);
  };

  const completeSession = async () => {
    if (!selectedStudents.length || !selectedActivity) return;
    setSaving(true);
    const saved = await saveAssessmentSession(sessionPayload({ status: 'completed' }));
    setSaving(false);
    if (!saved.ok) {
      setNotice(saved.message || t("Không thể lưu kết quả."));
      return;
    }
    setSessionId(saved.id);
    setSessionCompleted(true);
    setNotice(t("Đã lưu kết quả đánh giá vào hồ sơ học sinh."));
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
    setCalledRefs([]);
  };

  const deleteSession = async (item) => {
    if (!item?.id || deletingSessionId) return;
    const ok = window.confirm(`Xóa phiên đánh giá “${item.activityTitle || t("không tên")}” của lớp ${item.className || '—'}? Kết quả học sinh thuộc phiên này cũng sẽ bị xóa khỏi báo cáo.`);
    if (!ok) return;
    setDeletingSessionId(item.id);
    const deleted = await deleteAssessmentSession(item.id);
    setDeletingSessionId('');
    if (!deleted.ok) {
      setNotice(deleted.message || t("Không thể xóa phiên đánh giá."));
      return;
    }
    if (item.id === sessionId) resetSession();
    setNotice(t("Đã xóa phiên đánh giá."));
    setReportRefreshKey((value) => value + 1);
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
    if (!popup) {
      setNotice(t("Trình duyệt đang chặn cửa sổ in báo cáo. Hãy cho phép pop-up rồi thử lại."));
      return;
    }
    try { popup.opener = null; } catch { /* best effort */ }

    const teacherName = text(
      currentUser?.fullName
        || currentUser?.full_name
        || currentUser?.name
        || currentUser?.displayName
        || currentUser?.user_metadata?.full_name
        || currentUser?.user_metadata?.name,
      'Giáo viên phụ trách',
    );
    try {
      popup.document.open();
      popup.document.write(buildLessonCheckA4Html({
        teacherName,
        reportClass,
        completedSessions: reportSessions.filter((item) => item.status === 'completed'),
        reportResults,
        studentReportRows,
        reportSummary,
      }));
      popup.document.close();
      const doPrint = () => {
        if (popup.closed) return;
        try {
          popup.focus();
          popup.print();
        } catch {
          setNotice(t("Không thể mở hộp thoại in. Hãy thử lại từ nút In / PDF."));
        }
      };
      Promise.resolve(popup.document.fonts?.ready)
        .then(() => window.setTimeout(doPrint, 200))
        .catch(doPrint);
    } catch {
      try { popup.close(); } catch { /* best effort */ }
      setNotice(t("Không tạo được phiếu A4 dọc. Hãy tải lại báo cáo rồi thử lại."));
    }
  };

  const resultFor = (ref) => results[ref] || { rawResult: '', grade10: '', achievement: '', note: '' };
  const updateResult = (ref, patch) => {
    setResults((current) => ({
      ...current,
      [ref]: { ...(current[ref] || resultFor(ref)), ...patch },
    }));
  };
  const updateRawResult = (ref, rawResult) => {
    const converted = normalizedGrade10FromRaw(rawResult);
    setResults((current) => {
      const previous = current[ref] || resultFor(ref);
      const previousAuto = normalizedGrade10FromRaw(previous.rawResult);
      const previousGrade = previous.grade10 === '' || previous.grade10 == null ? null : Number(previous.grade10);
      const shouldClearPreviousAuto = converted == null
        && previousAuto != null
        && Number.isFinite(previousGrade)
        && Math.abs(previousGrade - previousAuto) < 0.0001;
      return {
        ...current,
        [ref]: {
          ...previous,
          rawResult,
          ...(converted != null
            ? { grade10: String(converted) }
            : shouldClearPreviousAuto
              ? { grade10: '' }
              : {}),
        },
      };
    });
  };

  if (!visible) return null;

  const workspace = <div className="f4a-overlay">
    <section className="f4a-workspace" role="dialog" aria-modal="true" aria-label="Fun for Assessment">
      <header className="f4a-head">
        <div className="f4a-head-brand">
          <span className="f4a-head-icon"><ClipboardCheck size={22} /></span>
          <div><small>FUN FOR ASSESSMENT</small><h1>{view === 'reports' ? t("Báo cáo kiểm tra đánh giá") : t("Tổ chức phiên đánh giá")}</h1></div>
        </div>
        <div className="f4a-head-actions">
          <button className={view === 'session' ? 'is-active' : ''} onClick={() => setView('session')}><Sparkles size={16} />{t("Tổ chức đánh giá")}</button>
          <button className={view === 'reports' ? 'is-active' : ''} onClick={() => setView('reports')}><BarChart3 size={16} />{t("Báo cáo")}</button>
          <button className="f4a-close" onClick={onClose}><X size={18} /></button>
        </div>
      </header>

      <div className="f4a-scroll-region">
      {notice ? <div className="f4a-notice">{assessmentText(notice,language)}</div> : null}
      {view === 'session' && recoverable?.sessionId && recoverable.sessionId !== sessionId
        ? <div className="f4a-recovery-banner" role="status">
            <span><strong>{t("Phiên chưa hoàn tất")}</strong> · Lớp {recoverable.className} · Đã tự lưu {formatDate(recoverable.savedAt,language)}</span>
            <button type="button" onClick={() => { setRestorePending(recoverable); setClassName(recoverable.className); }}>{t("Khôi phục phiên")}</button>
            <button type="button" onClick={() => {
              const userId = currentUser?.id || currentUser?.authId;
              if (userId && window.confirm(t("Bỏ bản khôi phục chưa hoàn tất?"))) {
                clearSessionRecovery(userId).then(result => {
                  if (result.ok) setRecoverable(null);
                });
              }
            }}>{t("Bỏ bản lưu")}</button>
          </div> : null}

      {view === 'session' ? <>
        <div className="f4a-steps">
          <StepBadge number="1" active={step === 1} done={step > 1}>{t("Lớp & học sinh")}</StepBadge>
          <ChevronRight />
          <StepBadge number="2" active={step === 2} done={step > 2}>{t("Hoạt động")}</StepBadge>
          <ChevronRight />
          <StepBadge number="3" active={step === 3} done={step > 3}>{t("Thực hiện")}</StepBadge>
          <ChevronRight />
          <StepBadge number="4" active={step === 4} done={false}>{t("Ghi nhận kết quả")}</StepBadge>
        </div>

        {step === 1 ? <div className="f4a-stage">
          <aside className="f4a-stage-aside">
            <small>{t("BƯỚC 01")}</small>
            <h2>{t("Chọn lớp và người tham gia")}</h2>
            <p>{t("Lớp được lấy trực tiếp từ phân công giảng dạy của giáo viên.")}</p>

            <label className="f4a-field"><span>{t("Lớp được phân công")}</span>
              <select value={className} onChange={(event) => setClassName(event.target.value)} disabled={classLoading}>
                {classes.map((item) => <option key={item.className} value={item.className}>{item.className} · {item.students.length} HS</option>)}
              </select>
            </label>
            <button type="button" className="f4a-secondary" onClick={() => { void refreshAssignedClasses(); }} disabled={classLoading} title={t("Đọc lại danh sách học sinh từ nguồn chung của trường")}>
              <RefreshCw size={15} className={classLoading ? 'lcs-spin' : undefined} />
              {classLoading ? t("Đang đồng bộ học sinh…") : t("Cập nhật danh sách học sinh")}
            </button>
            {classError ? <div className="f4a-error">{classError}</div> : null}

            <div className="f4a-mode-switch">
              <button className={participationMode === 'individual' ? 'is-active' : ''} onClick={() => { setParticipationMode('individual'); setGroupMap({}); }}><BookOpen size={16} />{t("Cá nhân")}</button>
              <button className={participationMode === 'group' ? 'is-active' : ''} onClick={() => setParticipationMode('group')}><Users size={16} />{t("Nhóm")}</button>
            </div>

            <section className="f4a-random-tools" aria-label={t("Công cụ chọn ngẫu nhiên và chia nhóm")}>
              <div className="f4a-toolbox-heading"><Shuffle size={16} /><strong>{t("CHỌN NGẪU NHIÊN")}</strong></div>
              <div className="f4a-scope-switch" role="group" aria-label={t("Phạm vi áp dụng")}>
                <button type="button" className={randomScope === 'all' ? 'is-active' : ''} aria-pressed={randomScope === 'all'} onClick={() => setDrawingScope('all')}>{t("Toàn lớp")}</button>
                <button type="button" className={randomScope === 'selected' ? 'is-active' : ''} aria-pressed={randomScope === 'selected'} onClick={() => setDrawingScope('selected')}>Đã chọn ({selectedStudents.length})</button>
              </div>
              <p className="f4a-scope-note">{t("Phạm vi:")} <strong>{randomPool.length} học sinh</strong> {t("· Không gọi lặp trong một lượt.")}</p>
              <button type="button" className="f4a-draw-button" onClick={randomPick} disabled={!remainingCallCount}>
                <Shuffle size={17} />{calledInPool.length ? t("Gọi tên tiếp theo") : t("Gọi tên ngẫu nhiên")}
              </button>
              <div className="f4a-tool-status">
                <span>{t("Đã gọi")} <b>{calledInPool.length}/{randomPool.length}</b></span>
                <button type="button" onClick={resetCalls} disabled={!calledRefs.length}><RotateCcw size={13} />{t("Lượt mới")}</button>
              </div>
              <div className="f4a-tool-divider" />
              <label className="f4a-group-count-label" htmlFor="f4a-group-count"><Users size={16} />{t("CHIA NHÓM CÂN BẰNG")}</label>
              <div className="f4a-group-tool-row">
                <select id="f4a-group-count" value={groupCount} onChange={(event) => { setGroupCount(Number(event.target.value)); if (Object.keys(groupMap).length) { setGroupMap({}); setNotice(t("Đã đổi số nhóm. Hãy nhấn Chia nhóm ngẫu nhiên để cập nhật.")); } }} aria-label={t("Số nhóm")}>
                  {Array.from({ length: 11 }, (_, index) => index + 2).map((n) => <option key={n} value={n}>{n} nhóm</option>)}
                </select>
                <button type="button" onClick={randomGroups} disabled={groupingPool.length < 2}><Users size={15} />{groupedStudents.length ? t("Chia lại") : t("Chia nhóm ngẫu nhiên")}</button>
              </div>
              <p className="f4a-scope-note">{t("Chênh lệch tối đa 1 học sinh/nhóm khi chia tự động.")}</p>
            </section>

            <div className="f4a-selection-summary"><strong>{selectedStudents.length}</strong><span>{t("học sinh đã chọn")}</span></div>
            <button className="f4a-primary" disabled={!selectedStudents.length || (participationMode === 'group' && selectedStudents.some((student) => !groupMap[studentRef(student)]))} onClick={() => setStep(2)}>{t("Tiếp tục chọn hoạt động")} <ChevronRight size={16} /></button>
          </aside>

          <main className="f4a-roster">
            <div className="f4a-roster-toolbar">
              <label><Search size={17} /><input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder={t("Tìm học sinh...")} /></label>
              <button onClick={selectAll}>{t("Chọn tất cả")}</button>
              <button onClick={() => { setSelectedRefs([]); setGroupMap({}); }}>{t("Bỏ chọn")}</button>
            </div>

            {lastCalledStudent ? <section className="f4a-picked-card" aria-live="polite">
              <div className="f4a-picked-top"><span><Sparkles size={14} />{t("HỌC SINH ĐƯỢC GỌI")}</span><small>Lượt {calledInPool.length} / {randomPool.length}</small></div>
              <div className="f4a-picked-main"><span className="f4a-picked-avatar">{lastCalledStudent.fullName.trim().slice(0,1).toUpperCase()}</span><div><strong>{lastCalledStudent.fullName}</strong><small>{lastCalledStudent.code || t("Chưa có mã học sinh")}</small></div></div>
              <div className="f4a-picked-bottom">
                <span>{remainingCallCount === 0 ? t("Đã gọi hết lượt — hãy bắt đầu lượt mới") : `Còn ${remainingCallCount} học sinh chưa được gọi`}</span>
                <button type="button" className="f4a-spotlight-open" onClick={() => setSpotlightOpen(true)}><MonitorPlay size={15} />{t("Trình chiếu")}</button>
                <button type="button" onClick={addCalledStudent} disabled={selectedRefs.includes(randomPickedRef)}><UserPlus size={15} />{selectedRefs.includes(randomPickedRef) ? t("Đã tham gia") : t("Thêm vào đánh giá")}</button>
              </div>
            </section> : null}
            {calledInPool.length > 0 ? <div className="f4a-call-history"><span>{t("Đã gọi:")}</span>{calledInPool.slice(-5).map((ref) => <span className="f4a-call-chip" key={ref}>{roster.find((item) => studentRef(item) === ref)?.fullName || t("Học sinh")}</span>)}{calledInPool.length > 5 ? <small>+{calledInPool.length - 5} trước đó</small> : null}</div> : null}

            {participationMode === 'group' && groupedStudents.length > 0 ? <section className="f4a-groups-panel">
              <div className="f4a-groups-heading"><div><strong>{t("Kết quả chia nhóm")}</strong><span>{selectedStudents.length} học sinh · {groupedStudents.length} nhóm · chọn danh sách để chuyển nhóm</span></div><button type="button" onClick={randomGroups}><Shuffle size={14} />{t("Chia lại")}</button></div>
              <div className="f4a-groups-preview">
                {groupedStudents.map(([label, students], index) => <article className="f4a-group-card" key={label}>
                  <header><span className="f4a-group-icon">{index + 1}</span><strong>{label}</strong><small>{students.length} học sinh</small></header>
                  <div className="f4a-group-members">{students.map((student) => <div key={studentRef(student)} className="f4a-group-member">
                    <span title={student.fullName}>{student.fullName}</span>
                    <select aria-label={`Chuyển nhóm cho ${student.fullName}`} value={groupMap[studentRef(student)]} onChange={(event) => reassignGroup(studentRef(student), event.target.value)}>
                      {Array.from({ length: Math.max(2, Number(groupCount) || 2) }, (_, position) => <option key={position} value={`Nhóm ${position + 1}`}>Nhóm {position + 1}</option>)}
                    </select>
                  </div>)}</div>
                </article>)}
              </div>
            </section> : null}

            {classLoading ? <div className="f4a-loading"><LoaderCircle className="lcs-spin" />{t("Đang tải danh sách lớp…")}</div> : <>
              <div className="f4a-list-caption"><strong>{t("Danh sách học sinh")}</strong><span>{filteredStudents.length} / {roster.length} học sinh · Nhấn thẻ để chọn tham gia đánh giá</span></div>
              <div className="f4a-student-grid">
                {filteredStudents.map((student) => {
                  const ref = studentRef(student);
                  const selected = selectedRefs.includes(ref);
                  const group = groupMap[ref] || '';
                  return <button type="button" key={ref} aria-pressed={selected} className={`f4a-student ${selected ? 'is-selected' : ''} ${randomPickedRef === ref ? 'is-random' : ''}`} onClick={() => toggleStudent(ref)}>
                    <span className="f4a-student-avatar">{student.fullName.trim().slice(0,1).toUpperCase()}</span>
                    <span className="f4a-student-copy"><strong>{student.fullName}</strong><small>{student.code || t("Chưa có mã HS")}{group ? ` · ${group}` : ''}</small></span>
                    <span className="f4a-check">{selected ? <Check size={14} /> : null}</span>
                  </button>;
                })}
              </div>
            </>}
          </main>
        </div> : null}

        {step === 2 ? <div className="f4a-stage f4a-stage-activity">
          <aside className="f4a-stage-aside">
            <button className="f4a-back-step" onClick={() => setStep(1)}><ArrowLeft size={15} />{t("Quay lại")}</button>
            <small>{t("BƯỚC 02")}</small>
            <h2>{t("Chọn hoạt động kiểm tra")}</h2>
            <p>{t("Chỉ hiển thị những hoạt động giáo viên đã được cấp quyền sử dụng.")}</p>

            <label className="f4a-field"><span>{t("Mục đích đánh giá")}</span><select value={purpose} onChange={(event) => setPurpose(event.target.value)}>{PURPOSES.map(([value,label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>
            <label className="f4a-field"><span>{t("Cách ghi nhận kết quả")}</span><select value={scoringMode} onChange={(event) => setScoringMode(event.target.value)}>{SCORING_MODES.map(([value,label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>

            <div className="f4a-session-brief">
              <span><strong>{selectedClass?.className}</strong>{t("lớp")}</span>
              <span><strong>{selectedStudents.length}</strong>{t("học sinh")}</span>
              <span><strong>{participationMode === 'group' ? groupedStudents.length : t("Cá nhân")}</strong>{participationMode === 'group' ? t("nhóm") : t("hình thức")}</span>
            </div>
            <button className="f4a-primary" disabled={!selectedActivity || saving} onClick={startSession}>{saving ? <LoaderCircle className="lcs-spin" size={16} /> : <MonitorPlay size={16} />}Bắt đầu hoạt động</button>
          </aside>

          <main className="f4a-activity-picker">
            <label className="f4a-activity-search"><Search size={17} /><input value={activityQuery} onChange={(event) => setActivityQuery(event.target.value)} placeholder={t("Tìm hoạt động...")} /></label>
            <div className="f4a-activity-grid">
              {filteredActivities.map((activity) => <button key={activity.id} className={activityId === activity.id ? 'is-selected' : ''} onClick={() => setActivityId(activity.id)}>
                <div className={`f4a-focus is-${activity.focusArea || 'unclassified'}`}>{focusLabel(activity.focusArea,language)}</div>
                <span className="f4a-activity-icon"><Gamepad2 /></span>
                <div><small>Global Success {activity.grade} · Unit {activity.unitNo}</small><strong>{activity.title}</strong><span>{activity.lessonTitle}</span></div>
                <i>{activityId === activity.id ? <Check size={15} /> : null}</i>
              </button>)}
            </div>
          </main>
        </div> : null}

        {step === 3 ? <div className="f4a-stage f4a-run-stage">
          <aside className="f4a-stage-aside">
            <small>{t("BƯỚC 03")}</small>
            <h2>{t("Thực hiện kiểm tra")}</h2>
            <p>{t("Phiên đánh giá đã được lưu ở trạng thái nháp. Sau khi hoạt động kết thúc, chuyển sang bảng ghi điểm.")}</p>
            <div className="f4a-run-card">
              <span>{focusLabel(selectedActivity?.focusArea,language)}</span>
              <strong>{selectedActivity?.title}</strong>
              <small>{selectedClass?.className} · {selectedStudents.length} học sinh · {purposeLabel(purpose,language)}</small>
            </div>
            <button className="f4a-secondary" onClick={() => onLaunchActivity?.(selectedActivity)}><MonitorPlay size={16} />{t("Mở lại hoạt động")}</button>
            <button className="f4a-primary" onClick={() => { prepareResults(); setStep(4); }}><ClipboardCheck size={16} />{t("Hoạt động đã kết thúc · Ghi điểm")}</button>
          </aside>
          <main className="f4a-run-participants">
            <div className="f4a-run-visual"><Gamepad2 size={38} /><strong>Assessment in progress</strong><span>{t("Kết quả trò chơi được giáo viên ghi nhận sau khi hoạt động kết thúc.")}</span></div>
            <div className="f4a-participant-list">{selectedStudents.map((student) => <span key={studentRef(student)}>{student.fullName}{groupMap[studentRef(student)] ? <small>{groupMap[studentRef(student)]}</small> : null}</span>)}</div>
          </main>
        </div> : null}

        {step === 4 ? <div className="f4a-score-stage">
          <header>
            <div><small>{t("BƯỚC 04")}</small><h2>{t("Bảng ghi nhận kết quả")}</h2><p>{t("Kết quả gốc giữ nguyên cách tính điểm của từng trò chơi; điểm /10 dùng để theo dõi và tổng hợp báo cáo.")}</p></div>
            <div><span>{selectedClass?.className}</span><span>{selectedActivity?.title}</span><span>{purposeLabel(purpose,language)}</span></div>
          </header>

          <div className="f4a-score-table">
            <div className="f4a-score-row is-head"><span>{t("Học sinh")}</span><span>{t("Nhóm")}</span><span>{t("Kết quả gốc")}</span><span>{t("Điểm /10")}</span><span>{t("Mức độ")}</span><span>{t("Ghi chú")}</span></div>
            {selectedStudents.map((student) => {
              const ref = studentRef(student);
              const item = resultFor(ref);
              return <div className="f4a-score-row" key={ref}>
                <span className="f4a-score-student"><strong>{student.fullName}</strong><small>{student.code || '—'}</small></span>
                <span>{groupMap[ref] || '—'}</span>
                <span className="f4a-raw-score"><input value={item.rawResult} onChange={(event) => updateRawResult(ref, event.target.value)} placeholder="vd. 70/80" /><small>{normalizedGrade10FromRaw(item.rawResult) == null ? t("Nhập dạng x/y để tự quy đổi") : `→ ${normalizedGrade10FromRaw(item.rawResult).toFixed(2)}/10`}</small></span>
                <span><input type="number" min="0" max="10" step="0.01" value={item.grade10} onChange={(event) => updateResult(ref, { grade10: event.target.value })} placeholder="—" /></span>
                <span><select value={item.achievement} onChange={(event) => updateResult(ref, { achievement: event.target.value })}><option value="">—</option><option value="Tốt">{t("Tốt")}</option><option value="Đạt">{t("Đạt")}</option><option value="Cần hỗ trợ">{t("Cần hỗ trợ")}</option></select></span>
                <span><input value={item.note} onChange={(event) => updateResult(ref, { note: event.target.value })} placeholder={t("Ghi chú…")} /></span>
              </div>;
            })}
          </div>

          <div className="f4a-reflection">
            <label><span>{t("Điều chỉnh sau đánh giá")}</span><textarea rows={3} value={teachingAdjustment} onChange={(event) => setTeachingAdjustment(event.target.value)} placeholder={t("Ví dụ: Củng cố lại comparative structures cho nhóm học sinh chưa đạt.")} /></label>
            <label><span>{t("Ghi chú phiên đánh giá")}</span><textarea rows={3} value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} placeholder={t("Ghi chú khác nếu cần…")} /></label>
          </div>

          <div className="f4a-score-actions">
            {sessionId && step === 4 ? <button className="f4a-secondary" onClick={() => setStep(3)}><ArrowLeft size={15} />{t("Quay lại hoạt động")}</button> : null}
            <button className="f4a-primary" onClick={completeSession} disabled={saving}>{saving ? <LoaderCircle className="lcs-spin" size={16} /> : <Check size={16} />}{sessionCompleted ? t("Lưu lại thay đổi") : t("Lưu kết quả đánh giá")}</button>
            {sessionCompleted ? <button className="f4a-secondary" onClick={() => { resetSession(); setView('reports'); }}><BarChart3 size={16} />{t("Xem báo cáo")}</button> : null}
            {sessionCompleted ? <button className="f4a-secondary" onClick={resetSession}><Sparkles size={16} />{t("Phiên đánh giá mới")}</button> : null}
          </div>
        </div> : null}
      </> : <div className="f4a-report">
        <div className="f4a-report-toolbar">
          <div><small>ASSESSMENT ANALYTICS</small><h2>{t("Theo dõi kiểm tra đánh giá")}</h2><p>{t("Tổng hợp các phiên đã thực hiện và quá trình của từng học sinh.")}</p></div>
          <div>
            <select value={reportClass} onChange={(event) => setReportClass(event.target.value)}><option value="">{t("Tất cả lớp")}</option>{classes.map((item) => <option key={item.className} value={item.className}>{item.className}</option>)}</select>
            <button onClick={() => setReportRefreshKey((value) => value + 1)}><RefreshCw size={16} />{t("Làm mới")}</button>
            <button onClick={exportReport} disabled={!studentReportRows.length}><Download size={16} />Excel/CSV</button>
            <button onClick={printReport} disabled={!studentReportRows.length}><Printer size={16} />In / PDF</button>
          </div>
        </div>

        {reportLoading ? <div className="f4a-loading"><LoaderCircle className="lcs-spin" />{t("Đang tổng hợp dữ liệu…")}</div> : reportError ? <div className="f4a-error">{reportError}</div> : <>
          <div className="f4a-report-stats">
            <div><span><ClipboardCheck /></span><strong>{reportSummary.sessions}</strong><small>{t("phiên đánh giá")}</small></div>
            <div><span><Users /></span><strong>{reportSummary.students}</strong><small>{t("học sinh đã đánh giá")}</small></div>
            <div><span><BarChart3 /></span><strong>{reportSummary.average == null ? '—' : reportSummary.average.toFixed(2)}</strong><small>{t("điểm trung bình /10")}</small></div>
            <div><span><Check /></span><strong>{reportSummary.coverage == null ? '—' : `${reportSummary.coverage.toFixed(0)}%`}</strong><small>{t("độ phủ học sinh")}</small></div>
          </div>

          <div className="f4a-report-grid">
            <section>
              <header><h3>{t("Hồ sơ đánh giá học sinh")}</h3><span>{studentReportRows.length} học sinh</span></header>
              <div className="f4a-report-table">
                <div className="is-head"><span>{t("Học sinh")}</span><span>{t("Số lần")}</span><span>TB /10</span><span>{t("Chuyên đề")}</span><span>{t("Gần nhất")}</span></div>
                {studentReportRows.map((item) => <div key={item.studentRef}><span><strong>{item.studentName}</strong><small>{item.studentCode || '—'}</small></span><span>{item.sessionCount}</span><span>{item.average == null ? '—' : item.average.toFixed(2)}</span><span>{item.focusText || '—'}</span><span>{formatDate(item.latest)}</span></div>)}
              </div>
            </section>

            <aside>
              <header><h3>{t("Lịch sử phiên đánh giá")}</h3><span>{reportSessions.length}</span></header>
              <div className="f4a-session-history">
                {reportSessions.slice(0,20).map((item) => <article key={item.id}>
                  <div className="f4a-session-history-top">
                    <span className={`is-${item.focusArea}`}>{focusLabel(item.focusArea,language)}</span>
                    <button type="button" className="f4a-delete-session" onClick={() => deleteSession(item)} disabled={deletingSessionId === item.id} title={t("Xóa phiên đánh giá")}>
                      {deletingSessionId === item.id ? <LoaderCircle className="lcs-spin" size={14} /> : <Trash2 size={14} />}<span>{t("Xóa")}</span>
                    </button>
                  </div>
                  <strong>{item.activityTitle}</strong>
                  <small>{item.className} · {item.studentCount} HS · {formatDate(item.completedAt || item.startedAt)}</small>
                  <em>{item.averageGrade10 == null ? t("Chưa có điểm /10") : `TB ${item.averageGrade10.toFixed(2)}/10`}</em>
                  {item.teachingAdjustment ? <p>Điều chỉnh: {item.teachingAdjustment}</p> : null}
                </article>)}
              </div>
            </aside>
          </div>
        </>}
      </div>}
      </div>
    </section>
    {spotlightOpen && lastCalledStudent && step === 1 ? <div className="f4a-spotlight" role="dialog" aria-modal="true" aria-label={t("Kết quả gọi học sinh ngẫu nhiên")}>
      <button type="button" className="f4a-spotlight-close" onClick={() => setSpotlightOpen(false)} aria-label={t("Đóng chế độ trình chiếu")}><X size={23} /></button>
      <div className="f4a-spotlight-content">
        <span className="f4a-spotlight-kicker"><Sparkles size={18} />{t("GỌI TÊN NGẪU NHIÊN")}</span>
        <div className="f4a-spotlight-avatar">{lastCalledStudent.fullName.trim().slice(0,1).toUpperCase()}</div>
        <strong className="f4a-spotlight-name">{lastCalledStudent.fullName}</strong>
        <span className="f4a-spotlight-code">{lastCalledStudent.code || t("Học sinh được chọn")}</span>
        <div className="f4a-spotlight-counter">Đã gọi {calledInPool.length} / {randomPool.length} · Còn {remainingCallCount} học sinh</div>
        <div className="f4a-spotlight-buttons">
          <button type="button" className="is-primary" onClick={randomPick} disabled={!remainingCallCount}><Shuffle size={19} />{t("Gọi tiếp")}</button>
          <button type="button" onClick={() => setSpotlightOpen(false)}>{t("Quay lại danh sách")}</button>
        </div>
      </div>
    </div> : null}
  </div>;

  return typeof document !== 'undefined'
    ? createPortal(workspace, document.body)
    : workspace;
}
