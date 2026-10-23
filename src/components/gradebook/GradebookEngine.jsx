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
import './HomeroomLearningGradebook.css';
import { filterGradebookStudentView, gradebookColumnProgress } from '../../utils/gradebookStudentView.js';
import { Search, ScanEye, Minimize2, Keyboard, X, ArrowDownToLine, ListFilter, Rows3, Rows4, ChartColumnIncreasing, BookOpenCheck, GraduationCap, NotebookPen, FileBarChart2, Sigma, ChevronRight, Check } from 'lucide-react';
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

function GradebookNavigationPalette({
  semesterId, onSemesterChange, externalSemester,
  view, onViewChange, showMockExams = false, progressSections = [],
}) {
  const viewMeta = VIEWS.find((item) => item.id === view) || VIEWS[0];
  const progressById = Object.fromEntries(progressSections.map((section) => [section.id, section]));
  const labels = { 'regular-0': 'TX 1', 'regular-1': 'TX 2', 'regular-2': 'TX 3', 'regular-3': 'TX 4', midterm: 'Giữa kỳ', final: 'Cuối kỳ', summary: 'Tổng hợp' };
  return <nav data-grade-tone={viewMeta.tone} className="hr-grade-navigation-dock is-always-visible gbm3-assessment-nav" aria-label="Thành phần điểm">
    <div className="hr-grade-navigation">
      {!externalSemester ? <label className="gbm3-term-fallback">
        <span>Học kỳ</span>
        <select value={semesterId} onChange={(event) => onSemesterChange(event.target.value)}>
          {SEMESTERS.map((semester) => <option key={semester.id} value={semester.id}>{semester.label}</option>)}
        </select>
      </label> : null}
      <div className="hr-grade-views" role="group" aria-label="Chọn thành phần">
        {VIEWS.filter((item) => item.id !== 'mock').map((item) => (
          <button key={item.id} type="button" data-grade-tone={item.tone}
            className={view === item.id ? 'active' : ''}
            aria-pressed={view === item.id}
            title={progressById[item.id] ? item.label + ': ' + progressById[item.id].filled + '/' + progressById[item.id].total + ' ô đã nhập' : item.label}
            onClick={() => onViewChange(item.id)}
          ><span className="gbm3-tab-icon" aria-hidden="true">{item.id === 'summary' ? <Sigma size={16}/> : <FileBarChart2 size={15}/>}</span>{labels[item.id]}</button>
        ))}
      </div>
    </div>
  </nav>;
}

function GradebookCompactAnalytics({ progress, semesterLabel, onOpenSection }) {
  const next = progress.sections.find((section) => section.missing > 0 && section.total > 0);
  return (
    <section className="gb14-completion-panel" aria-labelledby="gb14-completion-title">
      <header className="gb14-completion-head">
        <div className="gb14-completion-title">
          <span className="gb14-completion-icon" aria-hidden="true"><ChartColumnIncreasing size={19} /></span>
          <div>
            <h2 id="gb14-completion-title">Tiến độ theo thành phần điểm</h2>
            <p>Nhấn vào thành phần để nhập hoặc chỉnh sửa điểm còn thiếu</p>
          </div>
        </div>
        <span className="gb14-completion-semester">{semesterLabel}</span>
      </header>
      <div className="gb14-completion-grid">
        {progress.sections.map((section) => {
          const complete = section.total > 0 && section.missing === 0;
          const empty = section.total === 0;
          return (
            <button key={section.id} type="button"
              className={`gb14-component-card gb14-component-card--${section.color}${complete ? ' is-complete' : ''}`}
              onClick={() => onOpenSection(section.id)}
              aria-label={section.title + ': ' + section.filled + '/' + section.total + ' ô điểm đã nhập. Mở nhập điểm.'}
              title={'Mở ' + section.title}>
              <span className="gb14-component-top">
                <strong>{section.short}</strong>
                <span>{empty ? 'Chưa có cột' : section.filled + '/' + section.total}</span>
              </span>
              <span className="gb14-component-track" aria-hidden="true">
                <span style={{ width: section.percent + '%' }} />
              </span>
              <span className="gb14-component-bottom">
                <b>{section.percent}%</b>
                <span>{complete ? 'Hoàn tất' : 'Mở nhập điểm'} <ChevronRight size={14} aria-hidden="true" /></span>
              </span>
            </button>
          );
        })}
      </div>
      {next ? <p className="gb14-next-step"><NotebookPen size={16} aria-hidden="true" />
        Gợi ý tiếp theo: <button type="button" onClick={() => onOpenSection(next.id)}>
          Hoàn thiện {next.short} ({next.missing} ô còn thiếu) <ChevronRight size={15} aria-hidden="true" />
        </button>
      </p> : <p className="gb14-next-step is-complete"><Check size={16} aria-hidden="true" />
        {progress.total ? 'Các thành phần điểm hiện có đã hoàn thiện.' : 'Chưa có ô điểm để thống kê.'}
      </p>}
    </section>
  );
}

export default function HomeroomLearningGradebook({ workspace, onCommit, currentUser, teachingOverview, classManagement, gradebookAction, onDirtyChange, semesterIdExternal, onSemesterChangeExternal }) {
  const students = useMemo(
    () => (workspace.students || []).filter((student) => student.active !== false),
    [workspace.students],
  );
  const studentIds = useMemo(() => students.map((student) => student.id), [students]);
  const showMockExams = isGrade12Class(workspace.classProfile);
  const [gradebook, setGradebook] = useState(() => normalizeGradebook(workspace.learningGradebook, workspace.learningRecords));
  const [activeSubjectKey, setActiveSubjectKey] = useState(() => normalizeGradebook(workspace.learningGradebook, workspace.learningRecords).activeSubject);
  const [semesterId, setSemesterId] = useState(semesterIdExternal || 'semester1');
  const [view, setView] = useState('summary');
  const [summaryPage, setSummaryPage] = useState(0);
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

  const addRegularColumn = () => mutate((semester) => {
    const round = semester.regular[roundIndex];
    round.columns.push(makeColumn(round.columns.length + 1));
  });

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
  const columnProgress = useMemo(() => gradebookColumnProgress(students, activeRound), [students, activeRound]);
  const columnsWithMissing = columnProgress.filter((column) => column.missing > 0).length;

  const focusNextEmptyScore = () => {
    const cells = Array.from(scoreTableRef.current?.querySelectorAll('tbody td.gb-m3-score-cell input.hr-grade-input:not(:disabled)') || []);
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

  const renderTableControls = () => (
    <div className="gbv2-table-controls" aria-label="Tùy chọn bảng điểm">
      <label><span>Môn học</span><select aria-label="Chọn môn học" value={activeSubjectKey} onChange={(event) => setActiveSubjectKey(event.target.value)}>{subjectEntries.map(([key, subject]) => <option key={key} value={key}>{subject.name}</option>)}</select></label>
      {view !== 'mock' ? <label><span>Học kỳ</span><select aria-label="Chọn học kỳ" value={semesterId} onChange={(event) => setSemesterId(event.target.value)}>{SEMESTERS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label> : null}
      <label><span>Thành phần điểm</span><select aria-label="Chọn đợt hoặc thành phần điểm" value={view} onChange={(event) => setView(event.target.value)}>{VIEWS.filter((item) => item.id !== 'mock' || showMockExams).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    </div>
  );

  const openMissionSection = (sectionId) => {
    if (!VIEWS.some((item) => item.id === sectionId)) return;
    setView(sectionId);
    setStudentQuery('');
    setMissingOnly(true);
    setFocusMode(false);
    setWorkbenchNotice('Đang hiển thị học sinh còn thiếu điểm ở thành phần vừa chọn.');
    window.requestAnimationFrame(() => document.querySelector('.gradebook-studio .gb-roster-workbench')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const openMissionStudent = (entry) => {
    if (!entry?.nextView || !VIEWS.some((item) => item.id === entry.nextView)) return;
    setView(entry.nextView);
    setStudentQuery(entry.code || entry.name);
    setMissingOnly(true);
    setFocusMode(false);
    setWorkbenchNotice(`Đang xem ô điểm còn thiếu của ${entry.name}.`);
    window.requestAnimationFrame(() => document.querySelector('.gradebook-studio .gb-roster-workbench')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const renderRosterToolbar = () => (
    <section className="gb-roster-workbench" aria-label="Không gian nhập điểm">
      <div className="gb-roster-workbench-main">
        <label className="gb-roster-search">
          <Search className="gb-roster-search-icon" size={18} strokeWidth={2.15} aria-hidden="true" />
          <span className="sr-only">Tìm học sinh theo tên hoặc mã</span>
          <input ref={studentSearchRef} type="search" value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') { setStudentQuery(''); event.currentTarget.blur(); } }}
            placeholder="Tìm tên hoặc mã HS… (nhấn /)" aria-label="Tìm học sinh theo tên hoặc mã" />
        </label>
        <label className="gb-roster-missing">
          <input type="checkbox" checked={missingOnly} onChange={(event) => setMissingOnly(event.target.checked)} />
          <span>Chỉ học sinh còn thiếu điểm</span>
        </label>
        <label className="gb-roster-sort">
          <ListFilter size={16} aria-hidden="true" />
          <span>Sắp xếp</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sắp xếp học sinh">
            <option value="original">Thứ tự lớp</option>
            <option value="name">Họ tên A–Z</option>
            <option value="missing-first">Thiếu điểm trước</option>
          </select>
        </label>
        <span className="gb-roster-count" role="status" aria-live="polite">{visibleStudents.length}/{students.length} học sinh</span>
        {activeRound ? <span className="gb-roster-progress" title={`${activeRoundCoverage}/${students.length} học sinh đã có điểm trong đợt đang mở`}>
          <span className="gb-roster-progress-track"><span style={{ width: `${students.length ? Math.round(activeRoundCoverage / students.length * 100) : 0}%` }} /></span>
          <small>{activeRoundCoverage}/{students.length} đã có điểm</small>
        </span> : null}
        {(studentQuery || missingOnly) ? <button type="button" className="gb-roster-clear" onClick={() => { setStudentQuery(''); setMissingOnly(false); }}><X size={15} aria-hidden="true" /> Xóa bộ lọc</button> : null}
      </div>
      <div className="gb-roster-workbench-side">
        <span className="gb-roster-keyboard-hint" title="Enter hoặc mũi tên lên/xuống để chuyển hàng; Alt + trái/phải để chuyển ô."><Keyboard size={16} aria-hidden="true" /> Enter: chuyển hàng · ⌥←→: chuyển ô</span>
        {activeRound ? <button type="button" className="gb-roster-next-empty" onClick={focusNextEmptyScore} disabled={finalized || !visibleStudents.length}><ArrowDownToLine size={16} aria-hidden="true" /> Ô trống tiếp theo</button> : null}
        <button type="button" className="gb-roster-density" aria-pressed={density === 'compact'} onClick={() => setDensity((value) => value === 'compact' ? 'comfortable' : 'compact')}>
          {density === 'compact' ? <Rows4 size={16} aria-hidden="true" /> : <Rows3 size={16} aria-hidden="true" />}
          {density === 'compact' ? 'Bảng thoáng' : 'Bảng gọn'}
        </button>
        <button type="button" className="gb-roster-focus" aria-pressed={focusMode} onClick={() => setFocusMode((value) => !value)}>{focusMode ? <Minimize2 size={16} aria-hidden="true" /> : <ScanEye size={16} aria-hidden="true" />}{focusMode ? 'Thoát tập trung' : 'Chế độ tập trung'}</button>
      </div>
      {students.length > 0 && visibleStudents.length === 0 ? <p className="gb-roster-no-results">Không tìm thấy học sinh phù hợp. Hãy xóa bộ lọc để xem lại danh sách lớp.</p> : null}
      {workbenchNotice ? <span className="gb-roster-feedback" role="status" aria-live="polite">{workbenchNotice}</span> : null}
    </section>
  );

  const renderColumnInsights = () => activeRound ? (
    <details className="gb-roster-column-insights">
      <summary><ChartColumnIncreasing size={18} strokeWidth={2.1} aria-hidden="true" />
        <strong>Tiến độ từng cột điểm</strong>
        <span>{columnProgress.length - columnsWithMissing}/{columnProgress.length} cột hoàn tất · {columnsWithMissing} cột còn thiếu</span>
      </summary>
      <div className="gb-roster-column-grid">
        {columnProgress.map((column) => (
          <article key={column.id} className={column.missing ? 'has-missing' : 'is-complete'}>
            <div><strong title={column.label}>{column.label}</strong><span>{column.entered}/{column.total}</span></div>
            <div className="gb-roster-column-track"><span style={{ width: `${column.percent}%` }} /></div>
            <small>{column.missing ? `${column.missing} học sinh chưa nhập` : 'Đã nhập đủ'}</small>
          </article>
        ))}
      </div>
    </details>
  ) : null;

  const renderRegularTable = () => (
    <section className="hr-panel hr-grade-panel">
      <div className="hr-panel-head hr-grade-panel-head">
        <span className="hr-grade-panel-icon" aria-hidden="true"><GradebookUiIcon type="pencil" /></span>
        <div>
          <small>Điểm thường xuyên · Đợt {roundIndex + 1}</small>
          <h2>Nhập điểm cho toàn bộ lớp</h2>
          <p>Nhập điểm theo thang 10. Điểm cộng và điểm đợt được tính tự động.</p>
        </div>
        <details className="gbm3-column-config"><summary>Cấu hình đợt điểm</summary><div>
          <button type="button" className="secondary" onClick={addRegularColumn} disabled={finalized}>＋ Thêm lần nhập</button>
          <button type="button" className="gbv3-expand-table" aria-pressed={showFullRoster} onClick={() => setShowFullRoster((value) => !value)}>{showFullRoster ? 'Thu gọn bảng' : 'Xem toàn bộ ' + students.length + ' học sinh'}</button>
          {renderTableControls()}
        </div></details>
      </div>
      {students.length ? <div ref={scoreTableRef} className={`hr-grade-table-wrap${showFullRoster ? ' gbv3-table-expanded' : ''}`}>
        <table className={`hr-grade-table${activeRound.columns.length === 1 ? ' gb5-table-fill' : ''}`} style={{ minWidth: `${Math.max(820, 290 + activeRound.columns.length * 104 + 3 * 118)}px` }}>
          <thead>
            <tr>
              <th className="hr-grade-index">STT</th>
              <th className="hr-grade-student">Học sinh</th>
              {activeRound.columns.map((column, columnIndex) => <th key={column.id} className={`hr-grade-attempt-head gb-m3-attempt gb-m3-attempt--${columnIndex % 4}`}>
                <input value={column.label} disabled={finalized} onChange={(event) => renameRegularColumn(column.id, event.target.value)} aria-label="Tên cột điểm" />
                <button type="button" disabled={finalized || activeRound.columns.length <= 1} onClick={() => removeRegularColumn(column.id)} title="Xóa cột">×</button>
              </th>)}
              <th className="hr-grade-plus-head">Dấu +</th>
              <th className="hr-grade-bonus-head">Điểm cộng</th>
              <th className="hr-grade-result-head">Điểm Đợt {roundIndex + 1}</th>
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map((student) => {
              const row = activeRound.scores?.[student.id] || {};
              const plusCount = activeRound.plusCounts?.[student.id] ?? '';
              const bonus = gradeRoundBonus(activeRound, student.id, studentIds);
              const result = roundScore(activeRound, student.id, studentIds);
              return <tr key={student.id}>
                <td className="hr-grade-index">{originalStudentPosition.get(student.id)}</td>
                <td className="hr-grade-student"><b>{student.fullName}</b><small>{student.code || 'Chưa có mã học sinh'}</small></td>
                {activeRound.columns.map((column, columnIndex) => <td key={column.id} className={`gb-m3-score-cell gb-m3-score-cell--${columnIndex % 4}`}>
                  <ScoreInput value={row[column.id]} disabled={finalized} onChange={(value) => updateRegularScore(student.id, column.id, value)} label={`${student.fullName} · ${column.label}`} />
                </td>)}
                <td className="hr-grade-plus-cell"><PlusCountInput value={plusCount} disabled={finalized} onChange={(value) => updatePlusCount(student.id, value)} label={`${student.fullName} · Số dấu cộng`} /></td>
                <td className="hr-grade-bonus-cell"><div className="hr-grade-derived-bonus" aria-label={`${student.fullName} · Điểm cộng tự động ${formatScore(bonus)}`}><strong>{formatScore(bonus)}</strong><small>{activeRoundMaxPlusCount > 0 ? `${gradePlusCountNumber(plusCount) || 0}/${activeRoundMaxPlusCount}` : 'Tối đa lớp: 0'}</small></div></td>
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
      <div className="hr-panel-head hr-grade-panel-head"><span className="hr-grade-panel-icon" aria-hidden="true"><GradebookUiIcon type="pencil" /></span><div><small>{title}</small><h2>Nhập điểm cho toàn bộ lớp</h2><p>Thang điểm 10</p></div><details className="gbm3-column-config"><summary>Cấu hình</summary>{renderTableControls()}</details></div>
      {students.length ? <div className="hr-grade-table-wrap compact">
        <table className="hr-grade-table hr-grade-exam-table">
          <thead><tr><th className="hr-grade-index">STT</th><th className="hr-grade-student">Học sinh</th><th>{title}</th><th>Trạng thái</th></tr></thead>
          <tbody>{visibleStudents.map((student) => {
            const value = activeSemester[type].scores?.[student.id] ?? '';
            return <tr key={student.id}><td className="hr-grade-index">{originalStudentPosition.get(student.id)}</td><td className="hr-grade-student"><b>{student.fullName}</b><small>{student.code || 'Chưa có mã học sinh'}</small></td><td><ScoreInput value={value} disabled={finalized} onChange={(score) => updateExamScore(type, student.id, score)} label={`${student.fullName} · ${title}`} /></td><td className="hr-grade-status">{scoreNumber(value) == null ? <span>Chưa nhập</span> : <b>Đã nhập</b>}</td></tr>;
          })}</tbody>
        </table>
      </div> : <div className="hr-grade-empty"><b>Chưa có danh sách lớp</b><span>Hãy nhập học sinh trước khi mở sổ điểm.</span></div>}
    </section>
  );

  const renderSummary = () => {
    const pageCount = Math.max(1, Math.ceil(visibleStudents.length / 10));
    const currentPage = Math.min(summaryPage, pageCount - 1);
    const pageStudents = visibleStudents.slice(currentPage * 10, currentPage * 10 + 10);
    const openComponent = (target) => {
      setView(target);
      setMissingOnly(false);
      setSummaryPage(0);
      window.requestAnimationFrame(() =>
        document.getElementById('gb5-grade-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
    return (
      <section className="hr-panel hr-grade-panel gbm3-summary-panel">
        {students.length ? (
          <div className="hr-grade-table-wrap gbm3-summary-scroll">
            <table className="hr-grade-table hr-grade-summary-table">
              <thead><tr>
                <th className="hr-grade-index">STT</th>
                <th className="hr-grade-student">Họ và tên học sinh</th>
                {['TX 1','TX 2','TX 3','TX 4'].map((label, index) => (
                  <th key={label} className={'gbm3-summary-head gbm3-summary-head--' + index}>
                    <span>{label}</span><small>Hệ số 1</small>
                  </th>
                ))}
                <th className="gbm3-summary-head gbm3-summary-head--4"><span>Giữa kỳ</span><small>Hệ số 2</small></th>
                <th className="gbm3-summary-head gbm3-summary-head--5"><span>Cuối kỳ</span><small>Hệ số 3</small></th>
                <th className="gbm3-summary-average">Điểm TB*</th>
                <th>Trạng thái</th>
              </tr></thead>
              <tbody>{pageStudents.map((student) => {
                const regular = activeSemester.regular.map((round) => roundScore(round, student.id, studentIds));
                const midterm = scoreNumber(activeSemester.midterm.scores?.[student.id]);
                const final = scoreNumber(activeSemester.final.scores?.[student.id]);
                const allScores = [...regular, midterm, final];
                const count = allScores.filter((score) => score != null).length;
                const complete = count === allScores.length && allScores.length === 6;
                // Weighted preview is shown ONLY when all six components exist;
                // never present an incomplete semester as a final official mark.
                const average = complete
                  ? (regular.reduce((sum, value) => sum + value, 0) + 2 * midterm + 3 * final) / 9
                  : null;
                return <tr key={student.id}>
                  <td className="hr-grade-index">{originalStudentPosition.get(student.id)}</td>
                  <td className="hr-grade-student"><b>{student.fullName}</b><small>{student.code || 'Chưa có mã học sinh'}</small></td>
                  {regular.map((value, scoreIndex) => <td key={scoreIndex} className="gbm3-click-score">
                    <button type="button" title={'Mở nhập điểm TX ' + (scoreIndex + 1) + ' cho ' + student.fullName}
                      onClick={() => openComponent('regular-' + scoreIndex)}>{value == null ? '—' : formatScore(value)}</button>
                  </td>)}
                  {['midterm','final'].map((type,i) => <td key={type} className="gbm3-click-score">
                    <button type="button" title={'Mở nhập ' + (i ? 'cuối kỳ' : 'giữa kỳ') + ' cho ' + student.fullName}
                      onClick={() => openComponent(type)}>{(i ? final : midterm) == null ? '—' : formatScore(i ? final : midterm)}</button>
                  </td>)}
                  <td className="gbm3-summary-average">{average == null ? '—' : formatScore(Math.round(average * 100) / 100)}</td>
                  <td className="gbm3-summary-status"><span className={complete ? 'is-complete' : 'is-pending'}><i />{complete ? 'Đủ 6/6' : count + '/6 thành phần'}</span></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        ) : <div className="hr-grade-empty"><b>Chưa có danh sách lớp</b><span>Hãy nhập học sinh trước khi mở sổ điểm.</span></div>}
        <div className="gbm3-pagination">
          <span>Hiển thị {visibleStudents.length ? currentPage * 10 + 1 : 0}–{Math.min((currentPage + 1) * 10, visibleStudents.length)} trong {visibleStudents.length} học sinh</span>
          <div className="gbm3-pages">
            <button type="button" disabled={currentPage === 0} onClick={() => setSummaryPage(currentPage - 1)} aria-label="Trang trước">‹</button>
            {Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" aria-current={index === currentPage ? 'page' : undefined}
              onClick={() => setSummaryPage(index)}>{index + 1}</button>)}
            <button type="button" disabled={currentPage + 1 >= pageCount} onClick={() => setSummaryPage(currentPage + 1)} aria-label="Trang sau">›</button>
          </div>
          <small>* Điểm TB tham khảo khi đủ 6 thành phần; nhấn một ô để mở đúng màn hình nhập/sửa điểm.</small>
        </div>
      </section>
    );
  };

  return <div className={`hr-tab-stack hr-gradebook${focusMode ? ' gb-is-focused' : ''}${density === 'compact' ? ' gb-density-compact' : ''}`} data-grade-view={view} data-grade-tone={activeView.tone}>
    <GradebookNavigationPalette
      semesterId={semesterId} onSemesterChange={changeSemester}
      externalSemester={Boolean(onSemesterChangeExternal)}
      view={view} onViewChange={(id) => { setView(id); setSummaryPage(0); }}
      showMockExams={showMockExams}
      progressSections={semesterEntryProgress.sections}
    />

    {finalized && view !== 'mock' ? <div className="gb-finalized-banner" role="status"><strong>Học kỳ đã chốt</strong><span>Các ô điểm và thao tác chỉnh sửa đang khóa trong giao diện. Mở Bộ công cụ Sổ điểm → Chốt điểm để xem trạng thái hoặc mở khóa có lý do.</span></div> : null}
    {exportMessage ? <div className={`hr-grade-export-message ${exportMessage.type}`} role="status" aria-live="polite"><span>{exportMessage.type === 'error' ? '!' : '✓'}</span>{exportMessage.text}</div> : null}

    {saveFailure ? <div className="gb-save-error" role="alert"><strong>Không thể lưu điểm</strong><span>{saveFailure}</span><button type="button" disabled={savePending} onClick={save}>Thử lưu lại</button></div> : null}
    <div className="gb5-editor-anchor" id="gb5-grade-entry" aria-label="Bảng nhập điểm và bộ lọc học sinh">
      <header className="gbm3-editor-head">
        <span className="gbm3-editor-icon" aria-hidden="true"><NotebookPen size={21}/></span>
        <div className="gbm3-editor-titles">
          <h2>{view === 'summary' ? 'Bảng tổng hợp điểm' : view === 'mock' ? 'Bảng điểm thi thử lớp 12' : 'Nhập điểm ' + (activeView?.label || '')}</h2>
          <p>{workspace.classProfile?.className || ''} · {activeSubject?.name || 'Môn học'} · {semesterLabel} · {students.length} học sinh</p>
        </div>
        <div className="gbm3-editor-actions">
          <label className="gbm3-search">
            <Search size={16} aria-hidden="true" />
            <input value={studentQuery} onChange={(event) => { setStudentQuery(event.target.value); setSummaryPage(0); }} placeholder="Tìm kiếm học sinh..." aria-label="Tìm kiếm học sinh" />
          </label>
          <label className="gbm3-sort"><span>Sắp xếp</span>
            <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setSummaryPage(0); }} aria-label="Sắp xếp học sinh">
              <option value="original">Theo STT</option><option value="name">Tên A–Z</option><option value="missing-first">Thiếu điểm trước</option>
            </select>
          </label>
          <label className="gbm3-missing"><input type="checkbox" checked={missingOnly} onChange={(event) => { setMissingOnly(event.target.checked); setSummaryPage(0); }}/> <span>Chỉ học sinh thiếu điểm</span></label>
          <div className="gbm3-save-wrapper">
            <span className={dirty ? 'gbm3-unsaved' : 'gbm3-saved'} role="status">{savePending ? 'Đang lưu…' : dirty ? 'Chưa lưu' : 'Đã lưu'}</span>
            {dirty ? <button type="button" className="gbm3-undo" onClick={discard} disabled={savePending}>Hoàn tác</button> : null}
            {view === 'summary' && !dirty ? (
              <button type="button" className="gbm3-save" onClick={() => {
                setView(semesterEntryProgress.sections.find((section) => section.missing > 0 && section.total > 0)?.id || 'regular-0');
                setMissingOnly(false);
              }}>Nhập điểm</button>
            ) : <button type="button" className="gbm3-save" disabled={!dirty || savePending} onClick={save}>Lưu điểm</button>}
          </div>
        </div>
      </header>
      {!visibleStudents.length && students.length ? <p className="gbm3-empty">Không tìm thấy học sinh phù hợp. Thử đổi bộ lọc hoặc từ khóa.</p> : null}
      {view !== 'summary' ? <details className="gbm3-editor-advanced"><summary>Tùy chọn nhập điểm nâng cao</summary>{renderRosterToolbar()}{renderColumnInsights()}</details> : null}

    {view.startsWith('regular-') ? renderRegularTable() : null}
    {view === 'midterm' ? renderExamTable('midterm', 'Điểm giữa kỳ') : null}
    {view === 'final' ? renderExamTable('final', 'Điểm cuối kỳ') : null}
    {view === 'summary' ? renderSummary() : null}
    {view === 'mock' && showMockExams ? <GradebookMockExams
      students={students} visibleStudents={visibleStudents} exams={mockExams}
      className={workspace.classProfile?.className || ''} subjectName={activeSubject?.name || ''}
      workspaceId={workspace.id} subjectKey={activeSubjectKey}
      originalStudentPosition={originalStudentPosition} disabled={savePending}
      onAdd={addMockExam} onRename={renameMockExam} onDate={dateMockExam}
      onRemove={removeMockExam} onScoreChange={scoreMockExam}
      onBulkPaste={bulkPasteMockExam} onSetLock={setMockExamLock}
    /> : null}


    </div>

    {view !== 'mock' ? (
      <GradebookCompactAnalytics
        progress={semesterEntryProgress}
        semesterLabel={semesterLabel}
        onOpenSection={(id) => {
          setView(id);
          setMissingOnly(false);
          setStudentQuery('');
        }}
      />
    ) : null}

    <div className="gbv13-tool-entrance">
      <span><ChartColumnIncreasing size={19} aria-hidden="true" /><strong>Công cụ nâng cao</strong><small>Quản lý lớp, môn học, chốt điểm, nhập Excel và hỗ trợ chuyên sâu</small></span>
      <div className="gbv13-tool-entry-actions">
        {showMockExams ? <button type="button" onClick={() => setView('mock')}><GraduationCap size={16} aria-hidden="true" /> Thi thử lớp 12</button> : null}
        <button type="button" ref={toolboxTriggerRef} className="is-primary" onClick={() => setInsightsOpen(true)} aria-haspopup="dialog" aria-expanded={insightsOpen}>Mở công cụ <span aria-hidden="true">↗</span></button>
      </div>
    </div>

    {insightsOpen ? createPortal(
      <div className="gradebook-studio gb7-rebirth gbm3-v12 gbv13-toolbox-layer">
        <button type="button" className="gbv13-toolbox-scrim" aria-label="Đóng công cụ nâng cao" onClick={() => setInsightsOpen(false)} />
        <section className="gbv13-toolbox-dialog" role="dialog" aria-modal="true" aria-labelledby="gbv13-toolbox-title" ref={toolboxRef}>
          <header className="gbv13-toolbox-head">
            <span className="gbv13-toolbox-icon"><ChartColumnIncreasing size={23} aria-hidden="true" /></span>
            <div><h2 id="gbv13-toolbox-title">Công cụ Sổ điểm</h2><p>Quản lý lớp, bộ môn và các tác vụ nâng cao. Không làm gián đoạn việc nhập điểm.</p></div>
            <button type="button" data-gradebook-modal-close aria-label="Đóng công cụ Sổ điểm" onClick={() => setInsightsOpen(false)}>✕</button>
          </header>
          <div className="gbv13-toolbox-body">
            <div className="gb5-insights-content">

    {!focusMode && view !== 'mock' ? <details className="gb3-mission-details">
      <summary><span><strong>Danh sách ưu tiên hoàn thiện</strong><small>Học sinh còn thiếu điểm, thống kê chi tiết và điều hướng đến đúng thành phần</small></span><span className="gb3-mission-open-label">Xem chi tiết <span aria-hidden="true">⌄</span></span></summary>
      <GradebookSemesterMission sections={missionSections} summary={missionSummary} queue={missionQueue} onSelectSection={openMissionSection} onSelectStudent={openMissionStudent} finalized={finalized} />
    </details> : null}


    <details className="gb-academic-administration">
      <summary><span>Quản lý lớp và phân công giảng dạy</span><small>Mở công cụ quản trị lớp khi cần</small></summary>
      <div className="gb-academic-admin-content">
        {teachingOverview}
        {classManagement}
      </div>
    </details>


    <details className="hr-panel gb-grade-tools">
      <summary className="gb-grade-tools-trigger">
        <span className="hr-grade-title-icon" aria-hidden="true"><GradebookUiIcon type="book" /></span>
        <span className="gb-grade-tools-heading"><strong>Công cụ Sổ điểm</strong><small>Quản lý môn học và công thức tính điểm</small></span>
        <span className="gb-grade-tools-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="gb-grade-tools-content">
        <div className="hr-grade-controls">
          <details className="gbv2-manage-subject"><summary>＋ Quản lý môn học</summary>
            <div className="gbv2-manage-content">
              <label><span>Môn học hiện tại</span><select value={activeSubjectKey} onChange={(event) => setActiveSubjectKey(event.target.value)}>{subjectEntries.map(([key, subject]) => <option key={key} value={key}>{subject.name}</option>)}</select></label>
              <div className="hr-grade-new-subject"><label><span>Thêm môn / mở môn mới</span><input value={newSubject} onChange={(event) => setNewSubject(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') openSubject(); }} placeholder="Ví dụ: Toán" /></label><button type="button" className="secondary" onClick={openSubject}>Mở môn</button></div>
            </div>
          </details>
        </div>
        {view !== 'mock' ? <details className="gbv2-formula-details"><summary>fx · Xem công thức tính điểm</summary><div className="hr-grade-formula"><span>fx</span><p><b>Công thức điểm thường xuyên từng đợt</b><small>Điểm cộng = Dấu + / Dấu + cao nhất lớp (≤ 1); Điểm đợt = min(10, trung bình các cột điểm + điểm cộng)</small></p></div></details> : null}
      </div>
    </details>


    {view !== 'mock' ? <GradebookProductivityPanel
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
    /> : null}



            </div>
          </div>
        </section>
      </div>, document.getElementById('root') || document.body
    ) : null}

    {dirty ? <div className="gbv2-save-strip" role="status" aria-live="polite">
      <span>{savePending ? 'Đang lưu điểm' : 'Bạn có thay đổi chưa lưu'} · {activeSubject?.name || 'Môn học'} · {view === 'mock' ? 'Thi thử lớp 12' : semesterLabel}</span>
      <div><button type="button" className="secondary" disabled={!dirty} aria-disabled={savePending} onClick={discard}>Hoàn tác</button><button type="button" className="primary" disabled={!dirty} aria-disabled={savePending} onClick={save}>Lưu điểm</button></div>
    </div> : null}

    {view !== 'mock' ? <details className="gbm3-extra-export"><summary>Xuất Excel và phiếu điểm PDF</summary><section className="hr-panel hr-grade-export-bar" aria-labelledby="hr-grade-export-title">
      <div className="hr-grade-export-copy">
        <span className="hr-grade-export-icon" aria-hidden="true"><GradebookUiIcon type="excel" /></span>
        <div><span>EXCEL · PDF REPORTS</span><h3 id="hr-grade-export-title">Xuất báo cáo điểm</h3><p>Xuất theo môn <b>{activeSubject?.name || '—'}</b> · <b>{semesterLabel}</b>. File dùng dữ liệu đang hiển thị, kể cả thay đổi chưa lưu.</p></div>
      </div>
      <div className="hr-grade-export-actions">
        <button type="button" className="secondary hr-grade-export-class" disabled={!students.length || Boolean(exporting)} onClick={openClassGradebook}>
          <span aria-hidden="true">⇩</span>Xuất điểm cả lớp
        </button>
        <button type="button" className="primary hr-grade-export-pdf" disabled={!students.length || Boolean(exporting)} onClick={openStudentReport}>
          <span aria-hidden="true">▤</span>Xuất phiếu điểm cá nhân (PDF)
        </button>
      </div>
    </section></details> : null}

    {exportDialogMode ? <div className="hr-grade-export-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !exporting) setExportDialogMode(''); }}>
      <section className="hr-grade-export-dialog" role="dialog" aria-modal="true" aria-labelledby="hr-grade-export-dialog-title">
        <header>
          <div>
            <span>{exportDialogMode === 'class' ? 'CLASS GRADEBOOK' : 'PERSONAL SCORE REPORT'}</span>
            <h2 id="hr-grade-export-dialog-title">{exportDialogMode === 'class' ? 'Xuất điểm cả lớp' : 'Xuất phiếu điểm cá nhân'}</h2>
            <p>{exportDialogMode === 'class' ? 'Chọn đúng các cột điểm cần đưa vào sổ điểm của toàn bộ lớp.' : 'Chọn học sinh và các cột điểm cần đưa vào phiếu PDF có xác nhận.'}</p>
          </div>
          <button type="button" aria-label="Đóng cửa sổ xuất điểm" disabled={Boolean(exporting)} onClick={() => setExportDialogMode('')}>×</button>
        </header>

        <div className="hr-grade-export-dialog-body">
          {exportDialogMode === 'student' ? <label className="hr-grade-export-student">
            <span>Học sinh</span>
            <select value={selectedStudentId} disabled={Boolean(exporting)} onChange={(event) => setSelectedStudentId(event.target.value)}>
              {students.map((student) => <option key={student.id} value={student.id}>{student.fullName || 'Chưa có tên'}{student.code ? ` · ${student.code}` : ''}</option>)}
            </select>
          </label> : null}

          <div className={`hr-grade-export-select-head ${exportDialogMode === 'class' ? 'is-first' : ''}`}>
            <div><b>Cột điểm cần xuất</b><small>Đã chọn {selectedExportColumns.length}/{exportColumns.length} cột</small></div>
            <div><button type="button" disabled={Boolean(exporting)} onClick={() => setSelectedExportColumns(exportColumns.map((column) => column.id))}>Chọn tất cả</button><button type="button" disabled={Boolean(exporting)} onClick={() => setSelectedExportColumns([])}>Bỏ chọn</button></div>
          </div>

          <div className="hr-grade-export-groups">
            {exportColumnGroups.map((group) => <fieldset key={group.label}>
              <legend>{group.label}</legend>
              <div>{group.columns.map((column) => <label key={column.id} className={selectedExportColumns.includes(column.id) ? 'selected' : ''}>
                <input type="checkbox" checked={selectedExportColumns.includes(column.id)} disabled={Boolean(exporting)} onChange={() => toggleExportColumn(column.id)} />
                <span><b>{column.dialogLabel}</b><small>{column.kind === 'regular-result' ? 'Tự động tính theo công thức đợt' : column.kind === 'regular-bonus' ? 'Tự động theo số dấu + của cả lớp' : column.label}</small></span>
              </label>)}</div>
            </fieldset>)}
          </div>

          <p className="hr-grade-export-note"><span aria-hidden="true">i</span>{exportDialogMode === 'class' ? 'Sổ điểm gồm toàn bộ học sinh và chỉ các cột đã chọn; ô trống là điểm chưa nhập.' : 'Phiếu PDF có tên Trường Trung - Tiểu học Pétrus Ký, logo trường, thông tin lớp và chữ ký giáo viên chủ nhiệm.'}</p>
        </div>

        <footer>
          <button type="button" className="secondary" disabled={Boolean(exporting)} onClick={() => setExportDialogMode('')}>Hủy</button>
          {exportDialogMode === 'class'
            ? <button type="button" className="primary" disabled={!selectedExportColumns.length || Boolean(exporting)} onClick={exportClassGradebook}>{exporting === 'class' ? 'Đang tạo sổ điểm…' : `Xuất ${selectedExportColumns.length} cột cho cả lớp (.xlsx)`}</button>
            : <button type="button" className="primary" disabled={!selectedStudentId || !selectedExportColumns.length || Boolean(exporting)} onClick={exportStudentReport}>{exporting === 'student' ? 'Đang tạo phiếu PDF…' : `Xuất phiếu PDF · ${selectedExportColumns.length} cột`}</button>}
        </footer>
      </section>
    </div> : null}
  </div>;
}
