import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  buildGradeExportColumns,
  exportClassGradebookXlsx,
  gradePlusCountNumber,
  gradeRoundBonus,
  gradeRoundMaxPlusCount,
  gradeRoundScore as roundScore,
  gradeScoreNumber as scoreNumber,
} from '../../utils/homeroomGradebookExport.js';
import './GradebookMacEngine.css';
import './GradebookMacUtilities.css';
import { filterGradebookStudentView } from '../../utils/gradebookStudentView.js';
import { Plus, Search, ArrowDownToLine, ChevronRight, Check, FileSpreadsheet, FileText, Save, SlidersHorizontal, X, ChevronDown, LayoutGrid, GraduationCap, BarChart3, Settings2, BookOpen, ShieldCheck, UsersRound } from 'lucide-react';
import GradebookProductivityPanel from './GradebookProductivityPanel.jsx';
import GradebookSemesterMission from './GradebookSemesterMission.jsx';
import GradebookMockExams from './GradebookMockExams.jsx';
import { summarizeGradebookProgress } from '../../utils/gradebookProgressDeck.js';
import { isGrade12Class, normalizeMockExams, createMockExam, mockExamScoreNumber } from '../../utils/gradebookMockExams.js';
import { semesterProgressSections, semesterProgressSummary, semesterPendingStudents } from '../../utils/gradebookSemesterMission.js';
import { gradebookAuditChanges, gradebookQualityReport } from '../../utils/gradebookProductivity.js';
import { isGradebookFinalized, setFinalizationState, gradebookFinalizationReadiness } from '../../utils/gradebookFinalization.js';
import { saveGradebookRubric, previewGradebookHistoryRestore, restoreGradebookHistory } from '../../utils/gradebookPhase3.js';

const SEMESTERS = [
  { id: 'semester1', label: 'Học kỳ I' },
  { id: 'semester2', label: 'Học kỳ II' },
];

const VIEWS = [
  { id: 'regular-0', label: 'TX · Đợt 1', tone: 'blue' },
  { id: 'regular-1', label: 'TX · Đợt 2', tone: 'red' },
  { id: 'regular-2', label: 'TX · Đợt 3', tone: 'yellow' },
  { id: 'regular-3', label: 'TX · Đợt 4', tone: 'green' },
  { id: 'midterm', label: 'Giữa kỳ', tone: 'purple' },
  { id: 'final', label: 'Cuối kỳ', tone: 'orange' },
  { id: 'summary', label: 'Tổng hợp', tone: 'cyan' },
  { id: 'mock', label: 'Thi thử · Lớp 12', tone: 'purple' },
];

function GradebookUiIcon({ type }) {
  const common = { viewBox: '0 0 24 24', focusable: 'false', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'book') return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21V5.5Z" /></svg>;
  if (type === 'students') return <svg {...common}><circle cx="9" cy="8" r="3" /><circle cx="16.5" cy="9" r="2.5" /><path d="M3.5 19c.5-4 2.7-6 5.5-6s5 2 5.5 6" /><path d="M13 19c.3-3 1.8-4.6 4-4.6 2 0 3.5 1.6 3.9 4.6" /></svg>;
  if (type === 'document') return <svg {...common}><path d="M6 3h8l4 4v14H6Z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></svg>;
  if (type === 'bars') return <svg {...common}><path d="M5 20v-7M10 20V8M15 20V4M20 20v-10" /></svg>;
  if (type === 'check') return <svg {...common}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 9h6M9 13l2 2 4-5" /></svg>;
  if (type === 'excel') return <svg {...common}><path d="M5 4h10v16H5Z" /><path d="M15 7h4v10h-4M8 9l4 6M12 9l-4 6" /></svg>;
  if (type === 'pencil') return <svg {...common}><path d="m5 19 1-4L16 5l3 3-10 10-4 1Z" /><path d="m14 7 3 3" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
}

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
    plusCounts: {},
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
    plusCounts: source.plusCounts && typeof source.plusCounts === 'object' ? source.plusCounts : {},
    // Preserve old manual bonus data so loading/saving an older workspace is
    // non-destructive. Scoring now ignores this field and derives the bonus
    // exclusively from plusCounts.
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
    // Year-wide ledger; never used in semester score calculations.
    mockExams: normalizeMockExams(source.mockExams),
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
      || Object.values(round?.plusCounts || {}).some((value) => value !== '' && value != null)
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
  return migrateLegacyRecords({
    version:3, activeSubject, subjects, updatedAt:source.updatedAt||'',
    alertSettings:source.alertSettings && typeof source.alertSettings==='object' ? source.alertSettings : {minimum:5,decline:2},
    interventions:source.interventions && typeof source.interventions==='object' ? source.interventions : {},
    auditHistory:Array.isArray(source.auditHistory)?source.auditHistory.slice(0,30):[],
    finalizations:source.finalizations && typeof source.finalizations==='object'?source.finalizations:{},
    finalizationHistory:Array.isArray(source.finalizationHistory)?source.finalizationHistory.slice(0,35):[],
    rubricRecords:source.rubricRecords && typeof source.rubricRecords==='object' && !Array.isArray(source.rubricRecords)
      ?source.rubricRecords:{},
  },legacyRecords);
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

function cleanPlusCountInput(value) {
  const text = String(value ?? '').trim();
  if (text === '') return '';
  if (!/^\d+$/.test(text)) return null;
  return text;
}

function clampedPlusCountInput(value) {
  const number = gradePlusCountNumber(value);
  return number == null ? '' : String(number);
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

function ScoreInput({ value, onChange, label, disabled=false }) {
  return <input
    className="hr-grade-input"
    inputMode="decimal"
    aria-label={label}
    disabled={disabled}
    value={value ?? ''}
    onChange={(event) => {
      const next = cleanInput(event.target.value);
      if (next !== null) onChange(next);
    }}
    onBlur={(event) => onChange(clampedInput(event.target.value))}
    onWheel={(event) => event.currentTarget.blur()}
    onKeyDown={(event) => {
      // Enter/Up/Down for rows, Alt+Left/Right for editable columns.
      // Tab and ordinary horizontal caret movement remain native.
      const horizontal=event.altKey && ['ArrowLeft', 'ArrowRight'].includes(event.key);
      if (!horizontal && !['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
      const cell=event.currentTarget.closest('td');
      const row=cell?.parentElement;
      if (!row || !cell) return;
      const index=Array.from(row.cells).indexOf(cell);
      const goingUp=event.key==='ArrowUp' || (event.key==='Enter'&&event.shiftKey);
      const destination=horizontal
        ? row.cells[index+(event.key==='ArrowRight'?1:-1)]
        : (goingUp ? row.previousElementSibling : row.nextElementSibling)?.cells?.[index];
      const target=destination?.querySelector('input.hr-grade-input:not(:disabled)');
      if (!target) return;
      event.preventDefault();
      target.focus();
      target.select();
    }}
    placeholder="—"
  />;
}

function PlusCountInput({ value, onChange, label, disabled=false }) {
  return <input
    className="hr-grade-input hr-grade-plus-input"
    inputMode="numeric"
    pattern="[0-9]*"
    disabled={disabled}
    aria-label={label}
    value={value ?? ''}
    onChange={(event) => {
      const next = cleanPlusCountInput(event.target.value);
      if (next !== null) onChange(next);
    }}
    onBlur={(event) => onChange(clampedPlusCountInput(event.target.value))}
    onWheel={(event) => event.currentTarget.blur()}
    placeholder="0"
  />;
}

export default function GradebookMacEngine({ workspace, onCommit, currentUser, teachingOverview, classManagement, supportPanel, gradebookAction, onDirtyChange, semesterIdExternal, onSemesterChangeExternal }) {
  const students = useMemo(
    () => (workspace.students || []).filter((student) => student.active !== false),
    [workspace.students],
  );
  const studentIds = useMemo(() => students.map((student) => student.id), [students]);
  const showMockExams = isGrade12Class(workspace.classProfile);
  const [gradebook, setGradebook] = useState(() => normalizeGradebook(workspace.learningGradebook, workspace.learningRecords));
  const [activeSubjectKey, setActiveSubjectKey] = useState(() => normalizeGradebook(workspace.learningGradebook, workspace.learningRecords).activeSubject);
  const [semesterId, setSemesterId] = useState(semesterIdExternal || 'semester1');
  const [view, setView] = useState('regular-0');
  const [summaryPage, setSummaryPage] = useState(0);
  const [targetStudentId, setTargetStudentId] = useState('');
  useEffect(() => {
    if (!targetStudentId || view === 'summary') return undefined;
    const raf = window.requestAnimationFrame(() => {
      const wrap = document.querySelector('.gbmac .gbmac-table-viewport');
      const row = Array.from(wrap?.querySelectorAll('tr[data-gradebook-student-id]') || [])
        .find((element) => element.dataset.gradebookStudentId === String(targetStudentId));
      if (!row) return;
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      row.querySelector('input:not([disabled])')?.focus({ preventScroll: true });
      setTargetStudentId('');
    });
    return () => window.cancelAnimationFrame(raf);
  }, [targetStudentId, view, semesterId]);

  const changeSemester = (id) => { setSemesterId(id); onSemesterChangeExternal?.(id); };
  useEffect(() => {
    if (semesterIdExternal && semesterIdExternal !== semesterId) setSemesterId(semesterIdExternal);
  }, [semesterIdExternal]);
  // Regular class sizes show every student immediately; very large rosters start compact.
  const [showFullRoster, setShowFullRoster] = useState(() => students.length <= 45);
  const [studentQuery, setStudentQuery] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [utilityPage, setUtilityPage] = useState('tools');
  const toolboxRef = useRef(null);
  const toolboxTriggerRef = useRef(null);
  useEffect(() => {
    if (!insightsOpen) return undefined;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setInsightsOpen(false);
      }
      if (event.key !== 'Tab' || !toolboxRef.current) return;
      const focusable = [...toolboxRef.current.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href]'
      )].filter((node) => node.getClientRects().length > 0);
      if (!focusable.length) return;
      if (!toolboxRef.current.contains(document.activeElement)) {
        event.preventDefault();
        focusable[0].focus();
        return;
      }
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault(); focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault(); focusable[0].focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const raf = requestAnimationFrame(() => toolboxRef.current?.querySelector('[data-gradebook-modal-close]')?.focus({ preventScroll: true }));
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(raf);
      document.body.style.overflow = oldOverflow;
      requestAnimationFrame(() => toolboxTriggerRef.current?.focus?.({ preventScroll: true }));
    };
  }, [insightsOpen]);

  const [sortBy, setSortBy] = useState('original');
  const [density, setDensity] = useState(() => {
    try { return localStorage.getItem('brian-gradebook-density-v6') === 'compact' ? 'compact' : 'comfortable'; }
    catch { return 'comfortable'; }
  });
  useEffect(() => {
    try { localStorage.setItem('brian-gradebook-density-v6', density); }
    catch { /* Cosmetic-only preference; storage access is optional. */ }
  }, [density]);
  const [workbenchNotice, setWorkbenchNotice] = useState('');
  const scoreTableRef = useRef(null);
  const pendingAddedColumnRef = useRef(false);
  const studentSearchRef = useRef(null);
  // New class/semester/score section must start at the first student.
  // Score edits themselves do not reset the editor's scroll position.
  useEffect(() => {
    const wrap = document.querySelector('.gradebook-studio .gb5-editor-anchor .hr-grade-table-wrap');
    if (wrap) { wrap.scrollTop = 0; wrap.scrollLeft = 0; }
  }, [workspace.id, activeSubjectKey, semesterId, view]);
  const [newSubject, setNewSubject] = useState('');
  const [dirty, setDirty] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [saveFailure, setSaveFailure] = useState('');
  const [exportDialogMode, setExportDialogMode] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedExportColumns, setSelectedExportColumns] = useState([]);
  const [exporting, setExporting] = useState('');
  const [exportMessage, setExportMessage] = useState(null);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (dirty) return;
    const normalized = normalizeGradebook(workspace.learningGradebook, workspace.learningRecords);
    setGradebook(normalized);
    setActiveSubjectKey((current) => normalized.subjects[current] ? current : normalized.activeSubject);
  }, [workspace.learningGradebook, workspace.learningRecords, workspace.id, dirty]);

  useEffect(() => {
    if (!showMockExams && view === 'mock') setView('regular-0');
  }, [showMockExams, view]);

  useEffect(() => {
    setShowFullRoster(students.length <= 45);
    setStudentQuery('');
    setMissingOnly(false);
    setFocusMode(false);
    setSortBy('original');
    // Retain the teacher's table density across classes (visual preference only).
    setWorkbenchNotice('');
  }, [workspace.id, students.length]);

  const subjectEntries = useMemo(
    () => Object.entries(gradebook.subjects || {}).sort(([, a], [, b]) => a.name.localeCompare(b.name, 'vi')),
    [gradebook.subjects],
  );
  const activeSubject = gradebook.subjects[activeSubjectKey] || subjectEntries[0]?.[1];
  const activeSemester = activeSubject?.semesters?.[semesterId] || makeSemester();
  const semesterEntryProgress = useMemo(() => summarizeGradebookProgress(students, activeSemester), [students, activeSemester]);
  const mockExams = activeSubject?.mockExams || [];
  const activeView = VIEWS.find((item) => item.id === view) || VIEWS[0];
  const roundIndex = view.startsWith('regular-') ? Number(view.split('-')[1]) : -1;
  const activeRound = roundIndex >= 0 ? activeSemester.regular[roundIndex] : null;
  const visibleStudents = useMemo(
     () => view === 'mock'
       ? filterGradebookStudentView({ students, search: studentQuery, missingOnly, view, activeRound, semester: activeSemester, mockExams, sortBy })
       : filterGradebookStudentView({ students, search: studentQuery, missingOnly, view, activeRound, semester: activeSemester, sortBy }),
    [students, studentQuery, missingOnly, view, activeRound, activeSemester, mockExams, sortBy],
  );
  const missionSections = useMemo(() => semesterProgressSections(students, activeSemester), [students, activeSemester]);
  const missionSummary = useMemo(() => semesterProgressSummary(missionSections), [missionSections]);
  const missionQueue = useMemo(() => semesterPendingStudents(students, activeSemester, 6), [students, activeSemester]);
  const originalStudentPosition = useMemo(
    () => new Map(students.map((student, index) => [student.id, index + 1])),
    [students],
  );
  const finalized = isGradebookFinalized(gradebook,activeSubjectKey,semesterId);
  const activeRoundMaxPlusCount = activeRound ? gradeRoundMaxPlusCount(activeRound, studentIds) : 0;
  const semesterLabel = SEMESTERS.find((item) => item.id === semesterId)?.label || semesterId;
  const exportColumns = useMemo(() => buildGradeExportColumns(activeSemester), [activeSemester]);
  const exportColumnGroups = useMemo(() => {
    const groups = new Map();
    exportColumns.forEach((column) => {
      if (!groups.has(column.group)) groups.set(column.group, []);
      groups.get(column.group).push(column);
    });
    return Array.from(groups, ([label, columns]) => ({ label, columns }));
  }, [exportColumns]);

  useEffect(() => {
    if (!dirty) return undefined;
    const protectDraft = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectDraft);
    return () => window.removeEventListener('beforeunload', protectDraft);
  }, [dirty]);

  useEffect(() => {
    if (!exportDialogMode) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !exporting) setExportDialogMode('');
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [exportDialogMode, exporting]);

  const mutate = (callback) => {
    if(finalized)return;
    if(savePending)return;
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

  // Mock exams are independent of the semester finalization lock.
  const mutateMock = (callback) => {
    if (!showMockExams || savePending) return;
    setGradebook((current) => {
      const next = clone(current);
      const key = next.subjects[activeSubjectKey] ? activeSubjectKey : ensureSubject(next, activeSubject?.name || 'Tiếng Anh');
      next.subjects[key].mockExams = normalizeMockExams(next.subjects[key].mockExams);
      callback(next.subjects[key].mockExams);
      next.activeSubject = key;
      next.updatedAt = new Date().toISOString();
      return next;
    });
    setDirty(true);
  };
  const addMockExam = () => mutateMock((exams) => {
    if (exams.length >= 40) return;
    const number = exams.reduce((max, exam) => Math.max(max, Number((exam.label || '').match(/lần\s+(\d+)/i)?.[1]) || 0), exams.length) + 1;
    exams.push(createMockExam(number, uid('mock-exam')));
  });
  const renameMockExam = (id, label) => mutateMock((exams) => {
    const exam = exams.find((item) => item.id === id);
    if (exam && !exam.locked) exam.label = label;
  });
  const dateMockExam = (id, date) => mutateMock((exams) => {
    const exam = exams.find((item) => item.id === id);
    if (exam && !exam.locked) exam.date = date;
  });
  const removeMockExam = (id) => mutateMock((exams) => {
    const index = exams.findIndex((item) => item.id === id);
    if (index !== -1 && !exams[index].locked) exams.splice(index, 1);
  });
  const scoreMockExam = (id, studentId, value) => mutateMock((exams) => {
    const exam = exams.find((item) => item.id === id);
    if (exam && !exam.locked && studentIds.includes(studentId)) exam.scores[studentId] = value;
  });
  const setMockExamLock = (id, locked) => mutateMock((exams) => {
    const exam = exams.find((item) => item.id === id);
    if (exam) exam.locked = locked === true;
  });
  const bulkPasteMockExam = (id, entries = []) => {
    if (!Array.isArray(entries) || !entries.length) return;
    const validStudents = new Set(studentIds);
    const safe = entries.filter((item) => validStudents.has(item.studentId)
      && mockExamScoreNumber(item.value) !== null);
    if (!safe.length) return;
    mutateMock((exams) => {
      const exam = exams.find((item) => item.id === id);
      if (!exam || exam.locked) return;
      for (const entry of safe) {
        const prior = mockExamScoreNumber(exam.scores?.[entry.studentId]);
        // Reconfirm that entry was previewed as an overwrite before replacing stored data.
        if (prior !== null && prior !== Number(entry.value) && !entry.overwrite) continue;
        exam.scores[entry.studentId] = String(mockExamScoreNumber(entry.value));
      }
    });
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

  const applyPaste = (entries) => {
    if (finalized || !activeRound || !Array.isArray(entries) || !entries.length) return;
    const validStudents=new Set(studentIds);
    const allowedColumns=new Set(activeRound.columns.map(column=>column.id));
    const safe=entries.filter(item=>validStudents.has(item.studentId)&&allowedColumns.has(item.columnId)&&
      item.value!==''&&scoreNumber(item.value)!=null&&Number(item.value)>=0&&Number(item.value)<=10);
    if (!safe.length) return;
    mutate((semester)=>{
      const round=semester.regular[roundIndex];
      for(const item of safe){
        round.scores[item.studentId]={...(round.scores[item.studentId]||{}),[item.columnId]:item.value};
      }
    });
  };

  const updateAlertSettings = (next) => {
    setGradebook(current=>({...current,alertSettings:{minimum:Number(next.minimum),decline:Number(next.decline)}}));
    setDirty(true);
  };

  const updateFinalization = (lock,reason) => {
    if (dirty || Boolean(lock)===finalized) return;
    if(lock){
      const ready=gradebookFinalizationReadiness({
        students,semester:activeSemester,
        computeRoundScore:(round,id)=>round?roundScore(round,id,studentIds):null,
      });
      if(!ready.ready || gradebookQualityReport({students,semester:activeSemester}).length>0) return;
    }
    let next;
    try{
      next=setFinalizationState(gradebook,{
        subject:activeSubjectKey,semester:semesterId,lock:Boolean(lock),
        reason,actor:currentUser?.email||currentUser?.name||'Giáo viên',
      });
    }catch(error){window.alert(error.message);return;}
    setGradebook(next);
    setDirty(true);
  };

  const recordRubric = (input) => {
    if (!studentIds.includes(input?.studentId)||input?.subject!==activeSubjectKey||input?.semester!==semesterId||finalized)
      throw new Error('Không thể sửa rubric của học sinh hoặc học kỳ này.');
    const next=saveGradebookRubric(gradebook,input);
    setGradebook(next);
    setDirty(true);
  };

  const restoreHistory = (entry, reason) => {
    if(dirty)throw new Error('Hãy lưu hoặc Hoàn tác điểm đang chỉnh sửa trước khi khôi phục.');
    const preview=previewGradebookHistoryRestore(gradebook,entry);
    if(!preview.ok)throw new Error(preview.issues[0]||'Lịch sử không thể khôi phục.');
    const next=restoreGradebookHistory(gradebook,entry,{
      reason,actor:currentUser?.email||currentUser?.name||'Giáo viên',
    });
    setGradebook(next);
    setDirty(true);
  };

  const updateIntervention = (key,entry) => {
    if (!key || !entry?.note) return;
    setGradebook(current=>({...current,interventions:{...(current.interventions||{}),[key]:entry}}));
    setDirty(true);
  };

  const updateRegularScore = (studentId, columnId, value) => mutate((semester) => {
    const round = semester.regular[roundIndex];
    round.scores[studentId] = { ...(round.scores[studentId] || {}), [columnId]: value };
  });

  const updatePlusCount = (studentId, value) => mutate((semester) => {
    semester.regular[roundIndex].plusCounts[studentId] = value;
  });

  const updateExamScore = (type, studentId, value) => mutate((semester) => {
    semester[type].scores[studentId] = value;
  });

  const addRegularColumn = () => {
    if (finalized || !activeRound) return;
    pendingAddedColumnRef.current = true;
    mutate((semester) => {
      const round = semester.regular[roundIndex];
      round.columns.push(makeColumn(round.columns.length + 1));
    });
  };

  const renameRegularColumn = (columnId, label) => mutate((semester) => {
    const round = semester.regular[roundIndex];
    round.columns = round.columns.map((column) => column.id === columnId ? { ...column, label } : column);
  });

  const removeRegularColumn = (columnId) => {
    if (finalized || !activeRound || activeRound.columns.length <= 1) return;
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
    if (!dirty || savePending) return;
    setSavePending(true);
    setSaveFailure('');
    try {
      const payload = clone(gradebook);
      payload.activeSubject = activeSubjectKey;
      payload.updatedAt = new Date().toISOString();
      payload.updatedBy = currentUser?.email || currentUser?.name || '';
      const restoreMeta=payload.pendingGradebookRestore||null;
      delete payload.pendingGradebookRestore;
      const changes=gradebookAuditChanges(workspace.learningGradebook || {},payload);
      if(changes.length){
        payload.auditHistory=[{
          id:'grade-save-'+Date.now(),
          at:new Date().toISOString(),
          author:payload.updatedBy||'Giáo viên',
          count:changes.length,
          changes:changes.slice(0,1200),
          action:restoreMeta?'restore':'update',
          restoredFrom:restoreMeta?.sourceId||'',
          reason:restoreMeta?.reason||'',
        },...(payload.auditHistory||[])].slice(0,30);
      }
      const commitResult = await onCommit(
        { ...workspace, learningGradebook: payload },
        `Đã lưu ${view === 'mock' ? 'sổ thi thử' : 'sổ điểm'} ${activeSubject?.name || 'môn học'} · ${view === 'mock' ? 'Lớp 12' : SEMESTERS.find((item) => item.id === semesterId)?.label}.`,
      );
      if (commitResult?.ok === false && !commitResult?.offline) {
        throw new Error('Đã lưu trên thiết bị nhưng chưa đồng bộ đám mây. Hãy kiểm tra kết nối rồi thử lưu lại.');
      }
      setGradebook(payload);
      setDirty(false);
    } catch (error) {
      setSaveFailure(error?.message || 'Chưa thể lưu điểm. Dữ liệu vẫn còn trong phiên này, vui lòng thử lại.');
    } finally {
      setSavePending(false);
    }
  };

  const discard = () => {
    if (savePending) return;
    const normalized = normalizeGradebook(workspace.learningGradebook, workspace.learningRecords);
    setGradebook(normalized);
    setActiveSubjectKey(normalized.activeSubject);
    setDirty(false);
    setSaveFailure('');
  };

  // Keyboard workflow: '/' focuses search, Esc clears search, Ctrl/Command+S saves.
  // Ignore plain shortcuts inside editable controls; never interfere with browser typing.
  useEffect(() => {
    const shortcut = (event) => {
      const target = event.target;
      const isEditing = target?.closest?.('input, textarea, select, [contenteditable="true"]');
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        if (!dirty || savePending) return;
        event.preventDefault();
        save();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isEditing) return;
      if (event.key === '/') {
        event.preventDefault();
        studentSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [dirty, savePending, save]);

  const showExportMessage = (text, type = 'success') => {
    setExportMessage({ text, type });
    window.clearTimeout(window.__besGradeExportMessage);
    window.__besGradeExportMessage = window.setTimeout(() => setExportMessage(null), 4200);
  };

  const openClassGradebook = () => {
    if (!students.length || !activeSubject) {
      showExportMessage('Chưa có học sinh hoặc môn học để xuất.', 'error');
      return;
    }
    setSelectedExportColumns(exportColumns.map((column) => column.id));
    setExportDialogMode('class');
  };

  const exportClassGradebook = async () => {
    if (!selectedExportColumns.length) return;
    setExporting('class');
    try {
      const result = await exportClassGradebookXlsx({
        workspace,
        students,
        subjectName: activeSubject.name,
        semesterId,
        semester: activeSemester,
        selectedColumnIds: selectedExportColumns,
        currentUser,
      });
      setExportDialogMode('');
      showExportMessage(`Đã xuất ${result.fileName}.`);
    } catch (error) {
      showExportMessage(error?.message || 'Không thể xuất sổ điểm lớp.', 'error');
    } finally {
      setExporting('');
    }
  };

  const openStudentReport = () => {
    if (!students.length || !activeSubject) {
      showExportMessage('Chưa có học sinh hoặc môn học để xuất.', 'error');
      return;
    }
    setSelectedStudentId((current) => students.some((student) => student.id === current) ? current : students[0].id);
    setSelectedExportColumns(exportColumns.filter((column) => column.defaultSelected).map((column) => column.id));
    setExportDialogMode('student');
  };

  const toggleExportColumn = (columnId) => {
    setSelectedExportColumns((current) => (
      current.includes(columnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId]
    ));
  };

  const exportStudentReport = async () => {
    const student = students.find((item) => item.id === selectedStudentId);
    if (!student || !selectedExportColumns.length) return;
    setExporting('student');
    try {
      const { exportStudentGradeReportPdf } = await import('../../utils/homeroomGradeReportPdf.js');
      const result = await exportStudentGradeReportPdf({
        workspace,
        students,
        student,
        subjectName: activeSubject?.name,
        semesterId,
        semester: activeSemester,
        selectedColumnIds: selectedExportColumns,
        currentUser,
      });
      setExportDialogMode('');
      showExportMessage(`Đã xuất phiếu điểm của ${student.fullName || 'học sinh'}: ${result.fileName}.`);
    } catch (error) {
      showExportMessage(error?.message || 'Không thể xuất phiếu điểm PDF.', 'error');
    } finally {
      setExporting('');
    }
  };

  // Native React hero dispatches requests directly to the existing, data-backed actions.
  useEffect(() => {
    if (!gradebookAction?.seq || gradebookAction.workspaceId !== workspace.id) return;
    if (gradebookAction.action === 'entry') setView('regular-0');
    if (gradebookAction.action === 'summary') setView('summary');
    if (gradebookAction.action === 'pdf') openStudentReport();
    if (gradebookAction.action === 'class-report') openClassGradebook();
  }, [gradebookAction?.seq]);

  const totalRegularColumns = activeSemester.regular.reduce((sum, round) => sum + round.columns.length, 0);
  const completedFourRounds = students.filter((student) => activeSemester.regular.every((round) => roundScore(round, student.id, studentIds) != null)).length;
  const activeRoundCoverage = activeRound ? students.filter((student) => roundScore(activeRound, student.id, studentIds) != null).length : 0;

  useEffect(() => {
    if (!pendingAddedColumnRef.current || !activeRound) return undefined;
    pendingAddedColumnRef.current = false;
    const raf = window.requestAnimationFrame(() => {
      const inputs = scoreTableRef.current?.querySelectorAll('thead th[data-gbmac-column] input');
      const newest = inputs?.[inputs.length - 1];
      newest?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      newest?.focus({ preventScroll: true });
      newest?.select();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [activeRound?.columns?.length, view]);

  const focusNextEmptyScore = () => {
    const cells = Array.from(scoreTableRef.current?.querySelectorAll('tbody td[data-gbmac-score] input.hr-grade-input:not(:disabled)') || []);
    if (!cells.length) {
      setWorkbenchNotice('Không có ô điểm có thể nhập trong bảng đang mở.');
      return;
    }
    const currentIndex = cells.indexOf(document.activeElement);
    const following = cells.slice(currentIndex + 1).concat(cells.slice(0, currentIndex + 1));
    const next = following.find((input) => input.value.trim() === '');
    if (!next) {
      setWorkbenchNotice('Các ô điểm đang hiển thị đã được nhập đầy đủ.');
      return;
    }
    next.focus();
    next.select();
    next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    setWorkbenchNotice('Đã chuyển đến ô điểm trống tiếp theo.');
  };

  const openMissionSection = (sectionId) => {
    if (!VIEWS.some((item) => item.id === sectionId)) return;
    setView(sectionId);
    setStudentQuery('');
    setMissingOnly(true);
    setFocusMode(false);
    setWorkbenchNotice('Đang hiển thị học sinh còn thiếu điểm ở thành phần vừa chọn.');
    window.requestAnimationFrame(() => document.querySelector('.gbmac .gbmac-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const openMissionStudent = (entry) => {
    if (!entry?.nextView || !VIEWS.some((item) => item.id === entry.nextView)) return;
    setView(entry.nextView);
    setStudentQuery(entry.code || entry.name);
    setMissingOnly(true);
    setFocusMode(false);
    setWorkbenchNotice(`Đang xem ô điểm còn thiếu của ${entry.name}.`);
    window.requestAnimationFrame(() => document.querySelector('.gbmac .gbmac-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };


  const labels = {
    'regular-0':'TX 1','regular-1':'TX 2','regular-2':'TX 3','regular-3':'TX 4',
    midterm:'Giữa kỳ',final:'Cuối kỳ',summary:'Tổng hợp',mock:'Thi thử',
  };
  const changeView = (next) => {
    if (next === view) return;
    setView(next);
    setSummaryPage(0);
    setStudentQuery('');
    setMissingOnly(false);
  };

  const TableStudent = ({student}) => <>
    <b>{student.fullName || 'Chưa có tên'}</b>
    <small>{student.code || '—'}</small>
  </>;

  const regularTable = () => (
    <div className="gbmac-table-viewport" ref={scoreTableRef} tabIndex={0} aria-label="Bảng điểm cuộn ngang và dọc">
      <table className="gbmac-table gbmac-regular-table" style={{ minWidth: Math.max(900, 325 + activeRound.columns.length * 111 + 3 * 112) }}>
        <thead><tr>
          <th className="gbmac-pin-index">STT</th>
          <th className="gbmac-pin-name">Học sinh</th>
          {activeRound.columns.map((column,index) => (
            <th key={column.id} data-gbmac-column="" className={'gbmac-attempt gbmac-tone-'+(index % 5)}>
              <div className="gbmac-column-title">
                <input aria-label={'Tên cột điểm '+(index+1)} title="Nhấn để đổi tên cột"
                  value={column.label} disabled={finalized}
                  onChange={(event) => renameRegularColumn(column.id,event.target.value)} />
                <button type="button" title={'Xóa '+column.label} aria-label={'Xóa '+column.label}
                  disabled={finalized || activeRound.columns.length <= 1}
                  onClick={() => removeRegularColumn(column.id)}>×</button>
              </div>
            </th>
          ))}
          <th className="gbmac-computed-head">Dấu +</th>
          <th className="gbmac-computed-head">Điểm cộng</th>
          <th className="gbmac-total-head">Điểm đợt {roundIndex+1}</th>
        </tr></thead>
        <tbody>
          {visibleStudents.map((student) => {
            const scoreRow=activeRound.scores?.[student.id] || {};
            const plusCount=activeRound.plusCounts?.[student.id] ?? '';
            const bonus=gradeRoundBonus(activeRound,student.id,studentIds);
            const result=roundScore(activeRound,student.id,studentIds);
            return <tr key={student.id} data-gradebook-student-id={student.id}>
              <td className="gbmac-pin-index">{originalStudentPosition.get(student.id)}</td>
              <td className="gbmac-pin-name"><TableStudent student={student}/></td>
              {activeRound.columns.map((column) => <td key={column.id} data-gbmac-score="">
                <ScoreInput value={scoreRow[column.id]} disabled={finalized} label={student.fullName+' · '+column.label}
                  onChange={(value) => updateRegularScore(student.id,column.id,value)}/>
              </td>)}
              <td data-gbmac-score=""><PlusCountInput value={plusCount} disabled={finalized}
                onChange={(value) => updatePlusCount(student.id,value)} label={student.fullName+' · Dấu cộng'}/></td>
              <td className="gbmac-bonus"><strong>{formatScore(bonus)}</strong><small>{activeRoundMaxPlusCount ? (gradePlusCountNumber(plusCount)||0)+'/'+activeRoundMaxPlusCount : '0/0'}</small></td>
              <td className="gbmac-derived"><strong>{formatScore(result)}</strong><small>Tự động tính</small></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  );

  const examTable = (kind,title) => (
    <div className="gbmac-table-viewport gbmac-exam-viewport">
      <table className="gbmac-table gbmac-exam-table">
        <thead><tr><th className="gbmac-pin-index">STT</th><th className="gbmac-pin-name">Học sinh</th><th>{title}</th><th>Trạng thái</th></tr></thead>
        <tbody>{visibleStudents.map((student)=>{
          const value=activeSemester[kind].scores?.[student.id] ?? '';
          return <tr key={student.id} data-gradebook-student-id={student.id}>
            <td className="gbmac-pin-index">{originalStudentPosition.get(student.id)}</td>
            <td className="gbmac-pin-name"><TableStudent student={student}/></td>
            <td data-gbmac-score=""><ScoreInput value={value} disabled={finalized} label={student.fullName+' · '+title}
              onChange={(score)=>updateExamScore(kind,student.id,score)}/></td>
            <td className="gbmac-exam-status">{scoreNumber(value)==null ? 'Chưa nhập' : 'Đã nhập'}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );

  const summaryTable = () => (
    <div className="gbmac-table-viewport" tabIndex={0} aria-label="Bảng tổng hợp điểm học kỳ">
      <table className="gbmac-table gbmac-summary-table">
        <thead><tr>
          <th className="gbmac-pin-index">STT</th><th className="gbmac-pin-name">Học sinh</th>
          {['TX 1','TX 2','TX 3','TX 4','Giữa kỳ','Cuối kỳ'].map((label)=><th key={label}>{label}</th>)}
          <th className="gbmac-total-head">Điểm TB*</th><th>Trạng thái</th>
        </tr></thead>
        <tbody>{visibleStudents.map((student)=>{
          const reg=activeSemester.regular.map(round=>roundScore(round,student.id,studentIds));
          const mid=scoreNumber(activeSemester.midterm.scores?.[student.id]);
          const fin=scoreNumber(activeSemester.final.scores?.[student.id]);
          const all=[...reg,mid,fin], filled=all.filter(x=>x!=null).length;
          const complete=filled===6;
          const average=complete ? (reg.reduce((sum,x)=>sum+x,0)+2*mid+3*fin)/9 : null;
          return <tr key={student.id}>
            <td className="gbmac-pin-index">{originalStudentPosition.get(student.id)}</td>
            <td className="gbmac-pin-name"><TableStudent student={student}/></td>
            {all.map((score,index)=><td key={index} className="gbmac-summary-score">
              <button type="button" title={'Mở '+(['TX1','TX2','TX3','TX4','Giữa kỳ','Cuối kỳ'][index])+' cho '+student.fullName}
                onClick={()=>{
                  setTargetStudentId(student.id);
                  changeView(index<4 ? 'regular-'+index : (index===4?'midterm':'final'));
                }}>{formatScore(score)}</button>
            </td>)}
            <td className="gbmac-derived"><strong>{formatScore(average)}</strong></td>
            <td className="gbmac-exam-status">{filled}/6</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );

  return <section className={'gbmac'+(density==='compact'?' gbmac-compact':'')} data-gbmac-view={view}>
    <nav className="gbmac-tabs" aria-label="Thành phần điểm" role="group">
      {VIEWS.filter(item=>item.id!=='mock').map((item)=>(
        <button type="button" key={item.id} data-tone={item.tone}
          className={view===item.id?'is-selected':''} aria-pressed={view===item.id}
          onClick={()=>changeView(item.id)}>{labels[item.id]}</button>
      ))}
    </nav>

    {finalized && view!=='mock' ? <div className="gbmac-alert" role="status">
      <strong>Học kỳ đã chốt.</strong> Các ô điểm đang ở chế độ chỉ đọc. Sử dụng Công cụ khác để xem hoặc mở khóa theo quyền.
    </div> : null}
    {saveFailure ? <div className="gbmac-error" role="alert">Không thể lưu điểm: {saveFailure}
      <button type="button" onClick={save} disabled={savePending}>Thử lại</button>
    </div> : null}
    {exportMessage ? <div className={'gbmac-message is-'+exportMessage.type} role="status">{exportMessage.text}</div> : null}

    <div className="gbmac-workspace" id="gb5-grade-entry">
      <header className="gbmac-workspace-heading">
        <div>
          <h2>{view==='summary' ? 'Tổng hợp điểm' : view==='mock' ? 'Điểm thi thử' : view.startsWith('regular-') ? 'TX · Đợt '+(roundIndex+1) : labels[view]}</h2>
          <p>{view.startsWith('regular-') ? activeRound.columns.length+' cột điểm · Nhập thang 10 · Điểm đợt tự tính' : view==='summary'?'Điểm trung bình chỉ hiển thị khi đủ thành phần' : 'Nhập điểm theo thang 10'} · {students.length} học sinh</p>
        </div>
        <div className="gbmac-save-state" role="status" aria-live="polite">
          <span className={savePending?'is-saving':dirty?'is-dirty':'is-saved'} />
          {savePending?'Đang lưu…':dirty?'Có thay đổi chưa lưu':'Đã lưu'}
        </div>
      </header>
      <div className="gbmac-toolbar">
        <label className="gbmac-search">
          <Search size={17} aria-hidden="true"/><span className="sr-only">Tìm học sinh</span>
          <input ref={studentSearchRef} type="search" aria-label="Tìm theo tên hoặc mã học sinh"
            value={studentQuery} onChange={(event)=>{setStudentQuery(event.target.value);setSummaryPage(0);}}
            placeholder="Tìm học sinh (tên hoặc mã)…"/>
        </label>
        <label className="gbmac-toggle"><input type="checkbox" checked={missingOnly}
          onChange={(event)=>setMissingOnly(event.target.checked)} /><span>Chỉ còn thiếu</span></label>
        <label className="gbmac-sort"><SlidersHorizontal size={15} aria-hidden="true"/>
          <span className="sr-only">Sắp xếp</span>
          <select value={sortBy} aria-label="Sắp xếp học sinh" onChange={(event)=>setSortBy(event.target.value)}>
            <option value="original">Theo STT</option><option value="name">Tên A–Z</option><option value="missing-first">Thiếu điểm trước</option>
          </select>
        </label>
        <div className="gbmac-primary-actions">
          {dirty ? <button type="button" className="gbmac-undo" disabled={savePending} onClick={discard}>Hoàn tác</button> : null}
          <button type="button" className="gbmac-save" onClick={save} disabled={!dirty||savePending}>
            <Save size={16} aria-hidden="true"/>{savePending?'Đang lưu…':'Lưu điểm'}
          </button>
          <button type="button" className="gbmac-outline" onClick={openClassGradebook} disabled={!students.length||Boolean(exporting)}>
            <FileSpreadsheet size={16} aria-hidden="true"/> Xuất Excel
          </button>
          <button type="button" className="gbmac-outline" onClick={openStudentReport} disabled={!students.length||Boolean(exporting)}>
            <FileText size={16} aria-hidden="true"/> Phiếu PDF
          </button>
        </div>
      </div>
      {view.startsWith('regular-') ? <div className="gbmac-table-actions">
        <button type="button" className="gbmac-add-column" disabled={finalized} onClick={addRegularColumn}>
          <Plus size={17} aria-hidden="true"/> Thêm cột điểm
        </button>
        <button type="button" className="gbmac-outline" disabled={finalized||!visibleStudents.length}
          onClick={focusNextEmptyScore}><ArrowDownToLine size={16} aria-hidden="true"/> Ô trống tiếp theo</button>
      </div> : null}
      {workbenchNotice ? <div role="status" className="gbmac-hint">{workbenchNotice}</div> : null}
      {!visibleStudents.length && students.length ? <div className="gbmac-empty">Không có học sinh phù hợp. <button type="button" onClick={()=>{setStudentQuery('');setMissingOnly(false)}}>Xóa bộ lọc</button></div> : null}
      {!students.length ? <div className="gbmac-empty">Chưa có học sinh trong lớp. Hãy kiểm tra Danh sách học sinh.</div>
      : view.startsWith('regular-') ? regularTable()
      : view==='midterm' ? examTable('midterm','Điểm giữa kỳ')
      : view==='final' ? examTable('final','Điểm cuối kỳ')
      : view==='summary' ? summaryTable()
      : view==='mock' && showMockExams ? <GradebookMockExams
        students={students} visibleStudents={visibleStudents} exams={mockExams}
        className={workspace.classProfile?.className || ''} subjectName={activeSubject?.name || ''}
        workspaceId={workspace.id} subjectKey={activeSubjectKey}
        originalStudentPosition={originalStudentPosition} disabled={savePending}
        onAdd={addMockExam} onRename={renameMockExam} onDate={dateMockExam}
        onRemove={removeMockExam} onScoreChange={scoreMockExam}
        onBulkPaste={bulkPasteMockExam} onSetLock={setMockExamLock}
      /> : null}
      <div className="gbmac-table-footer"><span>{visibleStudents.length}/{students.length} học sinh</span>
        <span>Cuộn ngang để xem các cột điểm tiếp theo <ChevronRight size={13} aria-hidden="true"/></span>
      </div>
    </div>
    <button type="button" className="gbmac-more" ref={toolboxTriggerRef}
      aria-haspopup="dialog" aria-expanded={insightsOpen} onClick={()=>setInsightsOpen(true)}>
      <span><SlidersHorizontal size={17} aria-hidden="true"/><strong>Công cụ khác</strong><small>Nhập Excel, chốt điểm, quản lý môn học và hồ sơ học sinh</small></span>
      <ChevronRight size={17} aria-hidden="true"/>
    </button>

    {insightsOpen ? createPortal(<div className="gbmac-tools-overlay gbmac-utilities" data-utility-page={utilityPage} role="presentation">
      <button type="button" className="gbmac-scrim" aria-label="Đóng cửa sổ công cụ" onClick={() => setInsightsOpen(false)}/>
      <section className="gbmac-tools-dialog" role="dialog" aria-modal="true"
        aria-labelledby="gbmac-tools-title" ref={toolboxRef}>
        <header className="gbmac-tools-header">
          <div className="gbmac-utilities-brand">
            <span className="gbmac-utilities-symbol" aria-hidden="true"><SlidersHorizontal size={21}/></span>
            <div>
              <span>BRIAN ENGLISH · GRADEBOOK</span>
              <h2 id="gbmac-tools-title">Công cụ Sổ điểm</h2>
              <p>Quản lý điểm và học sinh trong một không gian làm việc.</p>
            </div>
          </div>
          <button type="button" data-gradebook-modal-close aria-label="Đóng Công cụ Sổ điểm"
            className="gbmac-utilities-close" onClick={() => setInsightsOpen(false)}><X size={19}/></button>
        </header>

        <div className="gbmac-utilities-frame">
          <nav className="gbmac-utilities-sidebar" aria-label="Nhóm công cụ Sổ điểm">
            <div className="gbmac-utilities-nav-caption">KHÔNG GIAN LÀM VIỆC</div>
            {[
              {id:'tools',icon:LayoutGrid,name:'Nhập & công cụ',hint:'Nhập nhanh, chốt, nhật ký'},
              {id:'progress',icon:BarChart3,name:'Tiến độ học kỳ',hint:'Theo dõi và hoàn thiện'},
              {id:'classes',icon:UsersRound,name:'Lớp & phân công',hint:'Lớp học, giáo viên'},
              {id:'settings',icon:Settings2,name:'Thiết lập khác',hint:'Môn học và hỗ trợ'},
            ].map(item=><button type="button" key={item.id}
              className={'gbmac-utilities-nav-item'+(utilityPage===item.id?' is-current':'')}
              data-group={item.id}
              aria-current={utilityPage===item.id?'page':undefined}
              onClick={()=>setUtilityPage(item.id)}>
              <item.icon size={18} strokeWidth={1.85} aria-hidden="true"/>
              <span><strong>{item.name}</strong><small>{item.hint}</small></span>
              {utilityPage===item.id?<span className="gbmac-utilities-current-dot" aria-hidden="true"/>:null}
            </button>)}
            <div className="gbmac-utilities-sidebar-foot"><ShieldCheck size={15} aria-hidden="true"/>
              <span>Thay đổi chỉ được ghi nhận khi lưu sổ điểm.</span></div>
          </nav>

          <div className="gbmac-utilities-main">
            <section className="gbmac-utilities-page" data-panel="tools" hidden={utilityPage!=='tools'} aria-label="Nhập điểm và công cụ">
              <header className="gbmac-utilities-page-head">
                <span className="gbmac-utilities-kicker">CÔNG CỤ NHẬP LIỆU</span>
                <h3>Nhập điểm & nghiệp vụ</h3>
                <p>Nhập Excel, theo dõi dữ liệu, kiểm tra lỗi, chốt điểm và xem lịch sử.</p>
              </header>
              <GradebookProductivityPanel embedded
                students={students}
                semester={activeSemester}
                activeRound={activeRound}
                roundIndex={roundIndex}
                gradebook={gradebook}
                subjectKey={activeSubjectKey}
                semesterId={semesterId}
                onPaste={applyPaste}
                onSetFinalization={updateFinalization}
                onSaveRubric={recordRubric}
                onRestoreHistory={restoreHistory}
                subjectName={activeSubject?.name||'Môn học'}
                workspace={workspace}
                currentUser={currentUser}
                finalized={finalized}
                onSetAlertSettings={updateAlertSettings}
                onSetIntervention={updateIntervention}
                computeRoundScore={(round,studentId)=>roundScore(round,studentId,studentIds)}
                dirty={dirty}
              />
            </section>

            {utilityPage==='progress'? <section className="gbmac-utilities-page" data-panel="progress" aria-label="Tiến độ học kỳ">
              <header className="gbmac-utilities-page-head">
                <span className="gbmac-utilities-kicker">THỐNG KÊ ĐIỂM</span>
                <h3>Tiến độ học kỳ</h3>
                <p>Tình trạng hoàn thiện 6 thành phần điểm của lớp.</p>
              </header>
              <GradebookSemesterMission sections={missionSections} summary={missionSummary} queue={missionQueue}
                onSelectSection={(id)=>{openMissionSection(id);setInsightsOpen(false);}}
                onSelectStudent={(entry)=>{openMissionStudent(entry);setInsightsOpen(false);}}
                finalized={finalized}/>
            </section> : null}

            {utilityPage==='classes'? <section className="gbmac-utilities-page" data-panel="classes" aria-label="Lớp và phân công">
              <header className="gbmac-utilities-page-head">
                <span className="gbmac-utilities-kicker">QUẢN LÝ LỚP HỌC</span>
                <h3>Lớp & phân công</h3>
                <p>Chọn lớp hoặc mở sổ điểm được phân công từ TTCM.</p>
              </header>
              <div className="gbmac-utilities-managed">
                {classManagement}
                {teachingOverview}
              </div>
            </section> : null}

            {utilityPage==='settings'? <section className="gbmac-utilities-page" data-panel="settings" aria-label="Thiết lập và hỗ trợ">
              <header className="gbmac-utilities-page-head">
                <span className="gbmac-utilities-kicker">TÙY CHỈNH</span>
                <h3>Thiết lập & hỗ trợ</h3>
                <p>Quản lý môn học, chế độ hiển thị và hồ sơ học sinh.</p>
              </header>
              <div className="gbmac-utilities-settings">
                <section className="gbmac-utilities-settings-card">
                  <h4><BookOpen size={17} aria-hidden="true"/> Quản lý môn học</h4>
                  <div className="gbmac-tool-fields">
                    <label>Môn học hiện tại
                      <select value={activeSubjectKey} onChange={(event)=>setActiveSubjectKey(event.target.value)}>
                        {subjectEntries.map(([key,subject])=><option key={key} value={key}>{subject.name}</option>)}
                      </select>
                    </label>
                    <label>Thêm môn học
                      <input value={newSubject} onChange={(event)=>setNewSubject(event.target.value)}
                        onKeyDown={(event)=>{if(event.key==='Enter')openSubject();}} placeholder="Ví dụ: Tiếng Anh"/>
                    </label>
                    <button type="button" onClick={openSubject}>Thêm môn</button>
                  </div>
                </section>
                <section className="gbmac-utilities-settings-card">
                  <h4><Settings2 size={17} aria-hidden="true"/> Chế độ hiển thị</h4>
                  <div className="gbmac-tool-minor">
                    <button type="button" onClick={()=>setDensity(x=>x==='compact'?'comfortable':'compact')}>
                      {density==='compact'?'Bảng thoáng':'Bảng gọn'}
                    </button>
                    <button type="button" onClick={()=>setFocusMode(x=>!x)}>
                      {focusMode?'Thoát tập trung':'Chế độ tập trung'}
                    </button>
                    {showMockExams?<button type="button" onClick={()=>{setView('mock');setInsightsOpen(false);}}>Thi thử lớp 12</button>:null}
                  </div>
                </section>
                <section className="gbmac-utilities-settings-card">
                  <h4><GraduationCap size={17} aria-hidden="true"/> Công thức tính điểm</h4>
                  <p>Điểm cộng = Dấu + / Dấu + cao nhất lớp (tối đa 1). Điểm đợt = min(10, trung bình các cột đã có điểm + điểm cộng). Điểm chưa nhập không được tính là 0.</p>
                </section>
                {supportPanel?<section className="gbmac-utilities-settings-card"><h4><UsersRound size={17} aria-hidden="true"/> Hồ sơ và hỗ trợ học sinh</h4>{supportPanel}</section>:null}
              </div>
            </section> : null}
          </div>
        </div>
      </section>
    </div>,document.getElementById('root') || document.body) : null}

    {exportDialogMode ? <div className="gbmac-export-overlay" role="presentation"
      onMouseDown={(event)=>{if(event.target===event.currentTarget&&!exporting)setExportDialogMode('')}}>
      <section className="gbmac-export-dialog" role="dialog" aria-modal="true" aria-labelledby="gbmac-export-title">
        <header><div><h2 id="gbmac-export-title">{exportDialogMode==='class'?'Xuất điểm cả lớp':'Xuất phiếu điểm cá nhân'}</h2>
          <p>Chọn các cột điểm cần xuất</p></div>
          <button type="button" aria-label="Đóng" disabled={Boolean(exporting)} onClick={()=>setExportDialogMode('')}><X size={19}/></button></header>
        {exportDialogMode==='student' ? <label className="gbmac-export-student">Học sinh
          <select value={selectedStudentId} onChange={(event)=>setSelectedStudentId(event.target.value)}
            disabled={Boolean(exporting)}>
            {students.map(student=><option key={student.id} value={student.id}>{student.fullName}</option>)}
          </select></label> : null}
        <div className="gbmac-export-select">
          <span>Đã chọn {selectedExportColumns.length}/{exportColumns.length} cột</span>
          <button type="button" onClick={()=>setSelectedExportColumns(exportColumns.map(column=>column.id))}>Chọn tất cả</button>
          <button type="button" onClick={()=>setSelectedExportColumns([])}>Bỏ chọn</button>
        </div>
        <div className="gbmac-export-list">{exportColumnGroups.map(group=><fieldset key={group.label}>
          <legend>{group.label}</legend>{group.columns.map(column=><label key={column.id}>
            <input type="checkbox" checked={selectedExportColumns.includes(column.id)}
              disabled={Boolean(exporting)} onChange={()=>toggleExportColumn(column.id)}/>
            <span>{column.dialogLabel}</span>
          </label>)}
        </fieldset>)}</div>
        <footer><button type="button" onClick={()=>setExportDialogMode('')} disabled={Boolean(exporting)}>Hủy</button>
          <button type="button" className="gbmac-save" disabled={!selectedExportColumns.length||Boolean(exporting)}
            onClick={exportDialogMode==='class'?exportClassGradebook:exportStudentReport}>
            {exporting?'Đang xuất…':exportDialogMode==='class'?'Xuất Excel (.xlsx)':'Xuất PDF'}
          </button>
        </footer>
      </section>
    </div> : null}
  </section>;
}
