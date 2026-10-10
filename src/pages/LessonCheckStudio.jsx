import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Copy,
  Edit3,
  ExternalLink,
  Filter,
  FolderOpen,
  Fullscreen,
  Gamepad2,
  Globe2,
  Grid2X2,
  KeyRound,
  Layers3,
  List,
  MoreHorizontal,
  LoaderCircle,
  LockKeyhole,
  MonitorPlay,
  Plus,
  Save,
  Search,
  BarChart3,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { canPublishDepartment } from '../utils/permissions.js';
import {
  deleteLessonCheckActivity,
  getLessonCheckActivityContent,
  LESSON_CHECK_EVENT,
  listLessonCheckAccessRequests,
  listLessonCheckActivities,
  listLessonCheckTeacherAccess,
  removeLessonCheckActivityThumbnail,
  requestLessonCheckAccess,
  reviewLessonCheckAccessRequest,
  saveLessonCheckActivity,
  setLessonCheckTeacherAccess,
  subscribeLessonCheckUpdates,
  uploadLessonCheckActivityThumbnail,
} from '../utils/lessonCheckActivities.js';
import AssessmentWorkspace from '../components/lessonCheck/AssessmentWorkspace.jsx';
import {
  GLOBAL_SUCCESS_LESSONS,
  globalSuccessLessonTitle,
  globalSuccessUnitTitle,
  unitOptionsForGrade,
} from '../data/globalSuccessCatalog.js';
import './LessonCheckStudio.css';

const TYPE_OPTIONS = [
  { value: 'quiz', vi: 'Trắc nghiệm', en: 'Quiz' },
  { value: 'game', vi: 'Trò chơi', en: 'Game' },
  { value: 'exercise', vi: 'Bài tập', en: 'Exercise' },
  { value: 'video', vi: 'Video / nghe nhìn', en: 'Video / media' },
  { value: 'other', vi: 'Khác', en: 'Other' },
];

const FOCUS_OPTIONS = [
  { value: 'vocabulary', vi: 'Từ vựng', en: 'Vocabulary', short: 'VOCABULARY' },
  { value: 'grammar', vi: 'Ngữ pháp', en: 'Grammar', short: 'GRAMMAR' },
  { value: 'reading', vi: 'Đọc hiểu', en: 'Reading', short: 'READING' },
  { value: 'listening', vi: 'Nghe', en: 'Listening', short: 'LISTENING' },
  { value: 'speaking', vi: 'Nói', en: 'Speaking', short: 'SPEAKING' },
  { value: 'mixed', vi: 'Tổng hợp', en: 'Mixed', short: 'MIXED' },
  { value: 'unclassified', vi: 'Chưa gắn', en: 'Unclassified', short: 'CHƯA GẮN' },
];

function blankDraft() {
  return {
    id: '',
    title: '',
    bookKey: 'global-success',
    grade: '11',
    unitNo: '1',
    unitTitle: globalSuccessUnitTitle(11, 1),
    lessonKey: 'getting-started',
    lessonTitle: globalSuccessLessonTitle('getting-started'),
    className: '',
    type: 'game',
    focusArea: 'unclassified',
    notes: '',
    sourceHost: '',
    embedCode: '',
    thumbnailUrl: '',
  };
}

function safeUrl(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  try {
    const parsed = new URL(input);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function wrapHtmlSnippet(raw) {
  const html = String(raw || '').trim();
  if (!html) return '';
  if (/<!doctype|<html[\s>]/i.test(html)) return html;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>html,body{margin:0;min-height:100%;font-family:Arial,Helvetica,sans-serif;background:#fff}*{box-sizing:border-box}</style></head><body>${html}</body></html>`;
}

function parseEmbed(raw) {
  const input = String(raw || '').trim();
  if (!input) return { kind: 'empty', source: '', raw: '' };

  const directUrl = safeUrl(input);
  if (directUrl) return { kind: 'url', source: directUrl, raw: input };

  try {
    const doc = new DOMParser().parseFromString(input, 'text/html');
    const iframe = doc.querySelector('iframe[src]');
    const iframeUrl = safeUrl(iframe?.getAttribute('src'));
    if (iframeUrl) return { kind: 'url', source: iframeUrl, raw: input };
  } catch {
    // Fall through to srcDoc mode.
  }

  if (/<[a-z][\s\S]*>/i.test(input)) {
    return { kind: 'html', source: wrapHtmlSnippet(input), raw: input };
  }

  return { kind: 'invalid', source: '', raw: input };
}

function sourceHost(source) {
  try { return new URL(source).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function labelForType(type, language) {
  const option = TYPE_OPTIONS.find((item) => item.value === type);
  return option ? (language === 'vi' ? option.vi : option.en) : type;
}

function labelForFocusArea(value, language) {
  const option = FOCUS_OPTIONS.find((item) => item.value === value) || FOCUS_OPTIONS[FOCUS_OPTIONS.length - 1];
  return language === 'vi' ? option.vi : option.en;
}

function focusShortLabel(value) {
  return (FOCUS_OPTIONS.find((item) => item.value === value) || FOCUS_OPTIONS[FOCUS_OPTIONS.length - 1]).short;
}

function compactDate(value, language) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function compactDateOnly(value, language) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

async function prepareManualThumbnail(file) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    throw new Error('Vui lòng dán hoặc chọn một file ảnh.');
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error('Không đọc được ảnh thumbnail.'));
      node.src = sourceUrl;
    });

    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) throw new Error('Ảnh thumbnail không hợp lệ.');

    const targetRatio = 3 / 2;
    const sourceRatio = sourceWidth / sourceHeight;
    let sx = 0;
    let sy = 0;
    let sw = sourceWidth;
    let sh = sourceHeight;

    if (sourceRatio > targetRatio) {
      sw = Math.round(sourceHeight * targetRatio);
      sx = Math.max(0, Math.round((sourceWidth - sw) / 2));
    } else if (sourceRatio < targetRatio) {
      sh = Math.round(sourceWidth / targetRatio);
      sy = Math.max(0, Math.round((sourceHeight - sh) / 2));
    }

    const outputWidth = 1200;
    const outputHeight = 800;
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý thumbnail.');

    context.drawImage(image, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
    return canvas.toDataURL('image/jpeg', 0.9);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function iframeProps(embed, title) {
  const common = {
    title: title || 'Embedded teaching activity',
    allowFullScreen: true,
    allow: 'fullscreen; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share',
    referrerPolicy: 'strict-origin-when-cross-origin',
  };
  if (embed?.kind === 'url') {
    return {
      ...common,
      src: embed.source,
      sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock allow-downloads allow-presentation allow-top-navigation-by-user-activation',
    };
  }
  return {
    ...common,
    srcDoc: embed?.source || '',
    sandbox: 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock allow-downloads allow-presentation',
  };
}

function ActivityFrame({ embed, title, className = '' }) {
  if (!embed || !['url', 'html'].includes(embed.kind)) return null;
  return <iframe className={className} {...iframeProps(embed, title)} />;
}

const ActivityCardPreview = React.memo(function ActivityCardPreview({ activity, canLoad, isLeader, language, onOpen, onRequest }) {
  const isVi = language === 'vi';
  const thumbnailUrl = String(activity?.thumbnailUrl || '').trim();

  const activate = () => {
    if (canLoad) onOpen?.();
    else if (activity.requestStatus !== 'pending') onRequest?.();
  };

  return (
    <div
      className={`lcs-card-media ${canLoad ? 'can-preview' : 'is-locked'} ${thumbnailUrl ? 'has-static-thumbnail' : 'has-no-thumbnail'}`}
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      }}
      aria-label={canLoad
        ? (isVi ? `Mở ${activity.title}` : `Open ${activity.title}`)
        : (isVi ? `Xin quyền ${activity.title}` : `Request access to ${activity.title}`)}
    >
      {thumbnailUrl ? (
        <img className="lcs-card-thumbnail-image" src={thumbnailUrl} alt="" loading="lazy" decoding="async" draggable="false" />
      ) : (
        <div className="lcs-card-preview-placeholder" aria-hidden="true">
          {canLoad ? <MonitorPlay /> : <LockKeyhole />}
          <strong>{canLoad
            ? (isVi ? 'Chưa có thumbnail' : 'No thumbnail yet')
            : (isVi ? 'Hoạt động chưa có thumbnail' : 'No thumbnail available')}</strong>
          <span>{canLoad
            ? (isVi ? 'Admin có thể dán ảnh trong Chỉnh sửa' : 'Paste an image in Edit')
            : (activity.sourceHost || activity.embedKind?.toUpperCase() || 'Activity')}</span>
        </div>
      )}

      <div className="lcs-card-media-shade" aria-hidden="true" />
      <div className="lcs-card-media-top">
        <span className={`lcs-focus-indicator is-${activity.focusArea || 'unclassified'}`}>{focusShortLabel(activity.focusArea)}</span>
        {!isLeader ? <StatusPill activity={activity} isLeader={isLeader} language={language} /> : null}
      </div>
      {canLoad ? <span className="lcs-preview-open-hint" aria-hidden="true"><MonitorPlay size={18} /></span> : null}
      {!canLoad && !thumbnailUrl ? <div className="lcs-card-lock-mark" aria-hidden="true"><LockKeyhole /></div> : null}
    </div>
  );
}, (previous, next) => (
  previous.activity === next.activity
  && previous.canLoad === next.canLoad
  && previous.isLeader === next.isLeader
  && previous.language === next.language
));

function StatusPill({ activity, isLeader, language }) {
  const isVi = language === 'vi';
  if (isLeader || activity.hasAccess) {
    return <span className="lcs-access-pill is-open"><Check size={14} />{isVi ? 'Đã mở' : 'Unlocked'}</span>;
  }
  if (activity.requestStatus === 'pending') {
    return <span className="lcs-access-pill is-pending"><Clock3 size={14} />{isVi ? 'Đang chờ duyệt' : 'Pending'}</span>;
  }
  return <span className="lcs-access-pill is-locked"><LockKeyhole size={14} />{isVi ? 'Cần xin quyền' : 'Access required'}</span>;
}

function LoadingBlock({ language }) {
  return (
    <div className="lcs-loading">
      <LoaderCircle className="lcs-spin" />
      <strong>{language === 'vi' ? 'Đang đồng bộ Supabase…' : 'Syncing with Supabase…'}</strong>
    </div>
  );
}

export default function LessonCheckStudio({ language = 'vi', currentUser }) {
  const isVi = language === 'vi';
  const isLeader = canPublishDepartment(currentUser);
  const [activities, setActivities] = useState([]);
  const [requests, setRequests] = useState([]);
  const [draft, setDraft] = useState(blankDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState('');
  const [thumbnailRemoveRequested, setThumbnailRemoveRequested] = useState(false);
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [lessonFilter, setLessonFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [focusFilter, setFocusFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortMode, setSortMode] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  const [menuActivityId, setMenuActivityId] = useState('');
  const [showAccessQueue, setShowAccessQueue] = useState(false);
  const [assessmentWorkspaceView, setAssessmentWorkspaceView] = useState('');
  const [assessmentWorkspaceVisible, setAssessmentWorkspaceVisible] = useState(false);
  const [assessmentResumeToScoreToken, setAssessmentResumeToScoreToken] = useState(0);
  const [teachingActivity, setTeachingActivity] = useState(null);
  const [teachingEmbed, setTeachingEmbed] = useState(null);
  const [teachingLoading, setTeachingLoading] = useState(false);
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestNote, setRequestNote] = useState('');
  const [requestSending, setRequestSending] = useState(false);
  const [accessTarget, setAccessTarget] = useState(null);
  const [teacherAccess, setTeacherAccess] = useState([]);
  const [teacherQuery, setTeacherQuery] = useState('');
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessBusyId, setAccessBusyId] = useState('');
  const teachRef = useRef(null);

  const parsedDraft = useMemo(() => parseEmbed(draft.embedCode), [draft.embedCode]);
  const previewReady = ['url', 'html'].includes(parsedDraft.kind);
  const unitOptions = useMemo(() => unitOptionsForGrade(draft.grade), [draft.grade]);
  const pendingCount = useMemo(() => requests.filter((item) => item.status === 'pending').length, [requests]);
  const pendingActivityIds = useMemo(() => new Set(
    requests.filter((item) => item.status === 'pending').map((item) => item.activityId),
  ), [requests]);
  const pageSize = 12;

  const libraryStats = useMemo(() => {
    const grades = new Set(activities.map((item) => item.grade).filter(Boolean));
    const units = new Set(activities.map((item) => item.grade && item.unitNo ? `${item.grade}-${item.unitNo}` : '').filter(Boolean));
    const types = new Set(activities.map((item) => item.type).filter(Boolean));
    const open = activities.filter((item) => isLeader || item.hasAccess).length;
    const pending = activities.filter((item) => !isLeader && item.requestStatus === 'pending').length;
    const locked = activities.filter((item) => !isLeader && !item.hasAccess && item.requestStatus !== 'pending').length;
    return { grades: grades.size, units: units.size, types: types.size, open, pending, locked };
  }, [activities, isLeader]);

  const typeCounts = useMemo(() => {
    const counts = {};
    TYPE_OPTIONS.forEach((option) => { counts[option.value] = 0; });
    activities.forEach((item) => {
      counts[item.type] = (counts[item.type] || 0) + 1;
    });
    return counts;
  }, [activities]);

  const focusCounts = useMemo(() => {
    const counts = { vocabulary: 0, grammar: 0, skills: 0, other: 0 };
    activities.forEach((item) => {
      if (item.focusArea === 'vocabulary') counts.vocabulary += 1;
      else if (item.focusArea === 'grammar') counts.grammar += 1;
      else if (['reading','listening','speaking'].includes(item.focusArea)) counts.skills += 1;
      else counts.other += 1;
    });
    return counts;
  }, [activities]);

  const loadActivities = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    const result = await listLessonCheckActivities();
    if (result.ok) {
      setActivities(result.activities);
      setError('');
    } else {
      setError(result.message || (isVi ? 'Không thể tải thư viện hoạt động.' : 'Could not load activity library.'));
    }
    if (!silent) setLoading(false);
  }, [isVi]);

  const loadRequests = useCallback(async () => {
    if (!isLeader) return;
    const result = await listLessonCheckAccessRequests();
    if (result.ok) setRequests(result.requests);
  }, [isLeader]);

  useEffect(() => {
    loadActivities();
    loadRequests();
    const unsubscribe = subscribeLessonCheckUpdates(() => {
      loadActivities({ silent: true });
      loadRequests();
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadActivities({ silent: true });
        loadRequests();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe?.();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadActivities, loadRequests]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!menuActivityId) return undefined;
    const closeMenu = (event) => {
      if (!event.target?.closest?.('.lcs-card-more')) setMenuActivityId('');
    };
    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, [menuActivityId]);

  const filteredActivities = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('vi');
    const result = activities.filter((item) => {
      const open = isLeader || item.hasAccess;
      const pending = isLeader ? pendingActivityIds.has(item.id) : item.requestStatus === 'pending';
      const locked = !isLeader && !item.hasAccess && item.requestStatus !== 'pending';

      if (gradeFilter !== 'all' && String(item.grade || '') !== gradeFilter) return false;
      if (unitFilter !== 'all' && String(item.unitNo || '') !== unitFilter) return false;
      if (lessonFilter !== 'all' && String(item.lessonKey || '') !== lessonFilter) return false;
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (focusFilter === 'skills' && !['reading','listening','speaking'].includes(item.focusArea)) return false;
      if (!['all','skills'].includes(focusFilter) && item.focusArea !== focusFilter) return false;
      if (accessFilter === 'open' && !open) return false;
      if (accessFilter === 'locked' && !locked) return false;
      if (statusFilter === 'pending' && !pending) return false;
      if (statusFilter === 'ready' && !open) return false;
      if (statusFilter === 'locked' && !locked) return false;
      if (!q) return true;
      return [
        item.title,
        item.unitTitle,
        item.lessonTitle,
        item.classLabel,
        item.notes,
        item.sourceHost,
        labelForFocusArea(item.focusArea, language),
      ].some((value) => String(value || '').toLocaleLowerCase('vi').includes(q));
    });

    return [...result].sort((a, b) => {
      if (sortMode === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'vi');
      if (sortMode === 'unit') {
        return (Number(a.grade || 0) - Number(b.grade || 0))
          || (Number(a.unitNo || 0) - Number(b.unitNo || 0))
          || String(a.lessonTitle || '').localeCompare(String(b.lessonTitle || ''), 'vi')
          || String(a.title || '').localeCompare(String(b.title || ''), 'vi');
      }
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });
  }, [accessFilter, activities, focusFilter, gradeFilter, isLeader, language, lessonFilter, pendingActivityIds, query, sortMode, statusFilter, typeFilter, unitFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize));
  const pagedActivities = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredActivities.slice(start, start + pageSize);
  }, [filteredActivities, page]);

  const pageStart = filteredActivities.length ? ((page - 1) * pageSize) + 1 : 0;
  const pageEnd = Math.min(page * pageSize, filteredActivities.length);
  const paginationPages = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [accessFilter, focusFilter, gradeFilter, lessonFilter, query, sortMode, statusFilter, typeFilter, unitFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const filteredTeachers = useMemo(() => {
    const q = teacherQuery.trim().toLocaleLowerCase('vi');
    return teacherAccess.filter((teacher) => !q || `${teacher.name} ${teacher.email}`.toLocaleLowerCase('vi').includes(q));
  }, [teacherAccess, teacherQuery]);

  const targetRequests = useMemo(
    () => requests.filter((item) => item.activityId === accessTarget?.id),
    [requests, accessTarget?.id],
  );

  function openNewActivity() {
    setDraft(blankDraft());
    setThumbnailDataUrl('');
    setThumbnailRemoveRequested(false);
    setShowEditor(true);
    setShowBuilder(true);
  }

  function closeBuilder() {
    setDraft(blankDraft());
    setThumbnailDataUrl('');
    setThumbnailRemoveRequested(false);
    setShowBuilder(false);
    setShowEditor(true);
  }

  function applyGrade(grade) {
    const nextGrade = String(grade);
    const firstUnitTitle = globalSuccessUnitTitle(nextGrade, 1);
    setDraft((current) => ({
      ...current,
      grade: nextGrade,
      unitNo: '1',
      unitTitle: firstUnitTitle,
      className: current.className && /^\d{2}\./.test(current.className) ? '' : current.className,
    }));
  }

  function applyUnit(unitNo) {
    const unitTitle = globalSuccessUnitTitle(draft.grade, unitNo);
    setDraft((current) => ({ ...current, unitNo: String(unitNo), unitTitle }));
  }

  function applyLesson(lessonKey) {
    setDraft((current) => ({
      ...current,
      lessonKey,
      lessonTitle: globalSuccessLessonTitle(lessonKey),
    }));
  }

  async function acceptThumbnailFile(file) {
    if (!file) return;
    setThumbnailBusy(true);
    try {
      const prepared = await prepareManualThumbnail(file);
      setThumbnailDataUrl(prepared);
      setThumbnailRemoveRequested(false);
      setNotice(isVi ? 'Đã nhận ảnh thumbnail. Nhấn “Lưu thay đổi” để lưu.' : 'Thumbnail ready. Save changes to apply it.');
    } catch (error) {
      setNotice(error?.message || (isVi ? 'Không đọc được ảnh thumbnail.' : 'Could not read thumbnail image.'));
    } finally {
      setThumbnailBusy(false);
    }
  }

  async function handleThumbnailPaste(event) {
    if (!draft.id || thumbnailBusy) return;
    const items = [...(event.clipboardData?.items || [])];
    const imageItem = items.find((item) => String(item.type || '').startsWith('image/'));
    const file = imageItem?.getAsFile?.() || [...(event.clipboardData?.files || [])].find((item) => String(item.type || '').startsWith('image/'));
    if (!file) {
      setNotice(isVi ? 'Clipboard chưa có ảnh. Hãy copy ảnh rồi Cmd+V vào khung thumbnail.' : 'No image found in the clipboard.');
      return;
    }
    event.preventDefault();
    await acceptThumbnailFile(file);
  }

  async function editActivity(item) {
    if (!isLeader) return;
    setSaving(true);
    const result = await getLessonCheckActivityContent(item.id);
    setSaving(false);
    if (!result.ok) {
      setNotice(result.message || (isVi ? 'Không mở được nội dung để chỉnh sửa.' : 'Could not open this activity for editing.'));
      return;
    }
    setDraft({
      id: item.id,
      title: item.title,
      bookKey: item.bookKey || 'global-success',
      grade: String(item.grade || 11),
      unitNo: String(item.unitNo || 1),
      unitTitle: item.unitTitle || globalSuccessUnitTitle(item.grade || 11, item.unitNo || 1),
      lessonKey: item.lessonKey || 'getting-started',
      lessonTitle: item.lessonTitle || globalSuccessLessonTitle(item.lessonKey || 'getting-started'),
      className: item.classLabel || '',
      type: item.type || 'game',
      focusArea: item.focusArea || 'unclassified',
      notes: item.notes || '',
      sourceHost: item.sourceHost || '',
      embedCode: result.content.embedCode,
      thumbnailUrl: item.thumbnailUrl || '',
    });
    setThumbnailDataUrl('');
    setThumbnailRemoveRequested(false);
    setShowEditor(true);
    setShowBuilder(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveActivity() {
    if (!isLeader) return;
    if (!draft.title.trim()) {
      setNotice(isVi ? 'Hãy nhập tên hoạt động.' : 'Enter an activity title.');
      return;
    }
    if (draft.focusArea === 'unclassified') {
      setNotice(isVi ? 'Hãy chọn chuyên đề: Vocabulary, Grammar hoặc kỹ năng phù hợp.' : 'Choose a learning focus before saving.');
      return;
    }
    if (!previewReady) {
      setNotice(isVi ? 'Mã nhúng chưa hợp lệ. Hãy dán URL HTTPS, iframe hoặc HTML.' : 'Embed code is not valid yet.');
      return;
    }

    setSaving(true);
    const result = await saveLessonCheckActivity({
      ...draft,
      unitTitle: globalSuccessUnitTitle(draft.grade, draft.unitNo) || draft.unitTitle,
      lessonTitle: globalSuccessLessonTitle(draft.lessonKey) || draft.lessonTitle,
      sourceHost: parsedDraft.kind === 'url' ? sourceHost(parsedDraft.source) : 'HTML / srcDoc',
    }, parsedDraft);

    if (!result.ok) {
      setSaving(false);
      setNotice(result.message || (isVi ? 'Không thể lưu hoạt động.' : 'Could not save activity.'));
      return;
    }

    if (draft.id && thumbnailDataUrl) {
      const thumbnailResult = await uploadLessonCheckActivityThumbnail(result.id, thumbnailDataUrl);
      if (!thumbnailResult.ok) {
        setSaving(false);
        setNotice((isVi ? 'Hoạt động đã lưu nhưng thumbnail chưa lưu được: ' : 'Activity saved, but thumbnail upload failed: ') + thumbnailResult.message);
        await loadActivities({ silent: true });
        return;
      }
    } else if (draft.id && thumbnailRemoveRequested) {
      const thumbnailResult = await removeLessonCheckActivityThumbnail(result.id);
      if (!thumbnailResult.ok) {
        setSaving(false);
        setNotice((isVi ? 'Hoạt động đã lưu nhưng chưa xóa được thumbnail: ' : 'Activity saved, but thumbnail could not be removed: ') + thumbnailResult.message);
        await loadActivities({ silent: true });
        return;
      }
    }

    setSaving(false);
    setNotice(isVi ? 'Đã lưu hoạt động và thumbnail.' : 'Activity and thumbnail saved.');
    setDraft(blankDraft());
    setThumbnailDataUrl('');
    setThumbnailRemoveRequested(false);
    setShowBuilder(false);
    await loadActivities({ silent: true });
  }

  async function duplicateActivity(item) {
    if (!isLeader) return;
    setSaving(true);
    const contentResult = await getLessonCheckActivityContent(item.id);
    if (!contentResult.ok) {
      setSaving(false);
      setNotice(contentResult.message);
      return;
    }
    const embed = parseEmbed(contentResult.content.embedCode);
    const result = await saveLessonCheckActivity({
      id: '',
      title: `${item.title} ${isVi ? '— Bản sao' : '— Copy'}`,
      bookKey: item.bookKey,
      grade: item.grade,
      unitNo: item.unitNo,
      unitTitle: item.unitTitle,
      lessonKey: item.lessonKey,
      lessonTitle: item.lessonTitle,
      className: item.classLabel,
      type: item.type,
      focusArea: item.focusArea || 'unclassified',
      notes: item.notes,
      sourceHost: item.sourceHost,
      embedCode: contentResult.content.embedCode,
    }, embed);
    setSaving(false);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setNotice(isVi ? 'Đã nhân bản hoạt động.' : 'Activity duplicated.');
    await loadActivities({ silent: true });
  }

  async function removeActivity(item) {
    if (!isLeader) return;
    const ok = window.confirm(isVi ? `Xóa hoạt động “${item.title}”? Quyền đã cấp và yêu cầu liên quan cũng sẽ bị xóa.` : `Delete “${item.title}”? Related grants and requests will also be deleted.`);
    if (!ok) return;
    const result = await deleteLessonCheckActivity(item.id);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setNotice(isVi ? 'Đã xóa hoạt động.' : 'Activity deleted.');
    await loadActivities({ silent: true });
    await loadRequests();
  }

  async function openTeachingMode(item) {
    if (!item.hasAccess && !isLeader) {
      setRequestTarget(item);
      return false;
    }
    setTeachingActivity(item);
    setTeachingLoading(true);
    setTeachingEmbed(null);
    const result = await getLessonCheckActivityContent(item.id);
    setTeachingLoading(false);
    if (!result.ok) {
      setTeachingActivity(null);
      setNotice(result.message || (isVi ? 'Không thể tải hoạt động.' : 'Could not load activity.'));
      return false;
    }
    const embed = parseEmbed(result.content.embedCode);
    if (!['url', 'html'].includes(embed.kind)) {
      setTeachingActivity(null);
      setNotice(isVi ? 'Nội dung nhúng không còn hợp lệ.' : 'The stored embed is no longer valid.');
      return false;
    }
    setTeachingEmbed(embed);
    return true;
  }

  async function launchAssessmentActivity(item) {
    setAssessmentWorkspaceVisible(false);
    const opened = await openTeachingMode(item);
    if (!opened) setAssessmentWorkspaceVisible(true);
  }

  function resumeAssessmentForScoring() {
    if (!assessmentWorkspaceView) return;
    setAssessmentWorkspaceView('session');
    setAssessmentResumeToScoreToken((value) => value + 1);
    setAssessmentWorkspaceVisible(true);
  }

  function closeTeachingMode({ resumeAssessment = false, toScore = false } = {}) {
    if (document.fullscreenElement) document.exitFullscreen?.();
    setTeachingActivity(null);
    setTeachingEmbed(null);
    if (resumeAssessment && assessmentWorkspaceView) {
      setAssessmentWorkspaceView('session');
      if (toScore) setAssessmentResumeToScoreToken((value) => value + 1);
      setAssessmentWorkspaceVisible(true);
    }
  }

  async function sendAccessRequest() {
    if (!requestTarget || requestSending) return;
    setRequestSending(true);
    const result = await requestLessonCheckAccess(requestTarget.id, requestNote);
    setRequestSending(false);
    if (!result.ok) {
      setNotice(result.message || (isVi ? 'Không gửi được yêu cầu.' : 'Could not send request.'));
      return;
    }
    setRequestTarget(null);
    setRequestNote('');
    setNotice(isVi ? 'Đã gửi yêu cầu đến TTCM.' : 'Request sent to the department head.');
    await loadActivities({ silent: true });
  }

  async function openAccessManager(item) {
    if (!isLeader) return;
    setAccessTarget(item);
    setTeacherQuery('');
    setAccessLoading(true);
    const result = await listLessonCheckTeacherAccess(item.id);
    setAccessLoading(false);
    if (!result.ok) {
      setNotice(result.message || (isVi ? 'Không tải được danh sách giáo viên.' : 'Could not load teacher access.'));
      setAccessTarget(null);
      return;
    }
    setTeacherAccess(result.teachers);
  }

  async function changeTeacherAccess(teacher, allowed) {
    if (!accessTarget || accessBusyId) return;
    setAccessBusyId(teacher.userId);
    const result = await setLessonCheckTeacherAccess(accessTarget.id, teacher.userId, allowed);
    setAccessBusyId('');
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setTeacherAccess((current) => current.map((item) => (
      item.userId === teacher.userId
        ? { ...item, hasAccess: allowed, pendingRequest: false }
        : item
    )));
    setNotice(allowed
      ? (isVi ? `Đã cấp quyền cho ${teacher.name}.` : `Access granted to ${teacher.name}.`)
      : (isVi ? `Đã thu hồi quyền của ${teacher.name}.` : `Access revoked for ${teacher.name}.`));
    await loadActivities({ silent: true });
    await loadRequests();
  }

  async function reviewRequest(request, decision) {
    if (!isLeader || accessBusyId) return;
    setAccessBusyId(request.requesterId);
    const result = await reviewLessonCheckAccessRequest(request.id, decision);
    setAccessBusyId('');
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setNotice(decision === 'approved'
      ? (isVi ? 'Đã duyệt và cấp quyền.' : 'Approved and granted.')
      : (isVi ? 'Đã từ chối yêu cầu.' : 'Request rejected.'));
    if (accessTarget) {
      const teachers = await listLessonCheckTeacherAccess(accessTarget.id);
      if (teachers.ok) setTeacherAccess(teachers.teachers);
    }
    await loadRequests();
    await loadActivities({ silent: true });
  }

  function openExternalFromEmbed(embed) {
    if (embed?.kind !== 'url') return;
    window.open(embed.source, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className={`lcs-page lcs-page--library ${assessmentWorkspaceView ? 'is-assessment-open' : ''}`}>
      <header className="lcs-arcade-head">
        <div className="lcs-hero-main">
          <button className="lcs-library-back" onClick={() => { window.location.hash = '#/apps'; }} aria-label={isVi ? 'Quay lại Ứng dụng' : 'Back to Apps'}>
            <ArrowLeft size={18} />
          </button>

          <div className="lcs-hero-copy">
            <div className="lcs-hero-kicker">
              <span className="lcs-hero-kicker-icon"><Gamepad2 size={16} /></span>
              <strong>BRIAN ACTIVITY ARCADE</strong>
              <span>GLOBAL SUCCESS</span>
            </div>
            <div className="lcs-arcade-title-row">
              <h1><span className="is-fun">Fun</span> <span className="is-for">for</span> <span className="is-assessment">Assessment</span></h1>
            </div>
            <p>{isVi ? 'Đổi mới kiểm tra đánh giá' : 'Innovating assessment and evaluation'}</p>

            <div className="lcs-hero-statline" aria-label={isVi ? 'Thống kê kho hoạt động' : 'Activity library statistics'}>
              <span><Gamepad2 size={14} /><b>{activities.length}</b>{isVi ? 'hoạt động' : 'activities'}</span>
              <span className="is-vocabulary"><BookOpen size={14} /><b>{focusCounts.vocabulary}</b>Vocabulary</span>
              <span className="is-grammar"><Layers3 size={14} /><b>{focusCounts.grammar}</b>Grammar</span>
              <span className="is-skills"><MonitorPlay size={14} /><b>{focusCounts.skills}</b>{isVi ? 'Kỹ năng' : 'Skills'}</span>
            </div>
          </div>
        </div>

        <img
          className="lcs-hero-art"
          src="/lesson-check-hero-art.svg"
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable="false"
        />

        <div className="lcs-hero-side">
          <div className="lcs-hero-deck" aria-hidden="true">
            <span className="is-one"><BookOpen size={18} />Vocabulary</span>
            <span className="is-two"><Layers3 size={18} />Grammar</span>
            <span className="is-three"><MonitorPlay size={18} />Skills</span>
          </div>
          <div className="lcs-assessment-launchers">
            <button className="lcs-start-assessment" type="button" onClick={() => { setAssessmentWorkspaceView('session'); setAssessmentWorkspaceVisible(true); }}><ClipboardCheck size={18} />{isVi ? 'Bắt đầu đánh giá' : 'Start assessment'}</button>
            <button className="lcs-open-reports" type="button" onClick={() => { setAssessmentWorkspaceView('reports'); setAssessmentWorkspaceVisible(true); }}><BarChart3 size={17} />{isVi ? 'Báo cáo' : 'Reports'}</button>
            {isLeader ? <button className="lcs-arcade-create" type="button" onClick={openNewActivity}><Plus size={18} />{isVi ? 'Tạo hoạt động' : 'Create activity'}</button> : null}
          </div>
        </div>
      </header>

      {notice ? <div className="lcs-toast" role="status">{notice}</div> : null}
      {error ? (
        <section className="lcs-system-alert">
          <LockKeyhole size={22} />
          <div>
            <strong>{isVi ? 'Chưa kết nối được dữ liệu Lesson Check' : 'Lesson Check database is not ready'}</strong>
            <span>{error}</span>
            <small>{isVi ? 'Nếu đây là lần triển khai đầu tiên, cần chạy migration Supabase của Lesson Check Studio.' : 'On first deployment, apply the Lesson Check Studio Supabase migration.'}</small>
          </div>
        </section>
      ) : null}

      {isLeader && showBuilder ? (
        <section className="lcs-builder-shell">
          <div className="lcs-builder-shell-head">
            <div>
              <span>{draft.id ? (isVi ? 'CHỈNH SỬA HOẠT ĐỘNG' : 'EDIT ACTIVITY') : (isVi ? 'TẠO HOẠT ĐỘNG MỚI' : 'CREATE ACTIVITY')}</span>
              <strong>{draft.id ? draft.title : (isVi ? 'Thêm nội dung vào kho hoạt động' : 'Add content to the activity library')}</strong>
            </div>
            <button type="button" onClick={closeBuilder}><X size={18} />{isVi ? 'Đóng' : 'Close'}</button>
          </div>

          <div className="lcs-builder">
            <div className="lcs-panel lcs-editor">
              <div className="lcs-panel-head">
                <div><span className="lcs-step">01</span><h2>{draft.id ? (isVi ? 'Chỉnh sửa hoạt động' : 'Edit activity') : (isVi ? 'Tạo hoạt động' : 'Create activity')}</h2></div>
                <button className="lcs-icon-btn" onClick={() => setShowEditor((value) => !value)} title={isVi ? 'Thu gọn' : 'Collapse'}>
                  <ChevronDown className={showEditor ? 'is-up' : ''} />
                </button>
              </div>

              {showEditor ? (
                <div className="lcs-form">
                  <div className="lcs-quick-select lcs-field-wide">
                    <div className="lcs-quick-title"><BookOpen size={18} /><div><strong>{isVi ? 'Chọn nhanh theo SGK Global Success' : 'Quick select · Global Success'}</strong><span>{isVi ? 'Chọn khối → Unit → Lesson, hệ thống tự điền metadata.' : 'Choose grade → Unit → Lesson to fill metadata automatically.'}</span></div></div>
                    <div className="lcs-quick-grid">
                      <label><span>{isVi ? 'Sách' : 'Book'}</span><select value="global-success" disabled><option>Global Success</option></select></label>
                      <label><span>{isVi ? 'Khối' : 'Grade'}</span><select value={draft.grade} onChange={(e) => applyGrade(e.target.value)}><option value="10">Lớp 10</option><option value="11">Lớp 11</option><option value="12">Lớp 12</option></select></label>
                      <label><span>Unit</span><select value={draft.unitNo} onChange={(e) => applyUnit(e.target.value)}>{unitOptions.map((unit) => <option key={unit.no} value={unit.no}>Unit {unit.no} · {unit.title}</option>)}</select></label>
                      <label><span>Lesson</span><select value={draft.lessonKey} onChange={(e) => applyLesson(e.target.value)}>{GLOBAL_SUCCESS_LESSONS.map((lesson) => <option key={lesson.key} value={lesson.key}>{lesson.title}</option>)}</select></label>
                    </div>
                    <div className="lcs-book-path"><span>Global Success {draft.grade}</span><b>Unit {draft.unitNo}</b><strong>{globalSuccessUnitTitle(draft.grade, draft.unitNo)}</strong><em>{globalSuccessLessonTitle(draft.lessonKey)}</em></div>
                  </div>

                  <label className="lcs-field lcs-field-wide">
                    <span>{isVi ? 'Tên hoạt động' : 'Activity title'}</span>
                    <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder={isVi ? `Ví dụ: Unit ${draft.unitNo} – ${globalSuccessUnitTitle(draft.grade, draft.unitNo)} Quiz` : 'Activity title'} />
                  </label>
                  <label className="lcs-field">
                    <span>{isVi ? 'Lớp / nhóm dùng' : 'Class / group'}</span>
                    <input value={draft.className} onChange={(e) => setDraft((d) => ({ ...d, className: e.target.value }))} placeholder={isVi ? '11.1 / Khối 11 / Tất cả' : '11.1 / Grade 11 / All'} />
                  </label>
                  <label className="lcs-field">
                    <span>{isVi ? 'Loại hoạt động' : 'Activity type'}</span>
                    <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>{TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isVi ? item.vi : item.en}</option>)}</select>
                  </label>
                  <label className="lcs-field">
                    <span>{isVi ? 'Chuyên đề / kỹ năng' : 'Learning focus'}</span>
                    <select value={draft.focusArea} onChange={(e) => setDraft((d) => ({ ...d, focusArea: e.target.value }))}>
                      <option value="unclassified">{isVi ? '— Chọn chuyên đề —' : '— Choose focus —'}</option>
                      {FOCUS_OPTIONS.filter((item) => item.value !== 'unclassified').map((item) => <option key={item.value} value={item.value}>{isVi ? item.vi : item.en}</option>)}
                    </select>
                  </label>
                  <label className="lcs-field">
                    <span>{isVi ? 'Ghi chú tổ chức' : 'Teaching notes'}</span>
                    <input value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder={isVi ? 'Ví dụ: 7 phút · Teacher-led · dùng cuối tiết' : 'e.g. 7 minutes · Teacher-led · end-of-lesson'} />
                  </label>
                  {draft.id ? (
                    <div className="lcs-thumbnail-editor lcs-field-wide">
                      <div className="lcs-thumbnail-editor-head">
                        <div>
                          <strong>{isVi ? 'Thumbnail thẻ hoạt động' : 'Activity card thumbnail'}</strong>
                          <span>{isVi ? 'Copy một ảnh rồi bấm vào khung dưới và nhấn Cmd+V. Ảnh sẽ tự cắt về tỉ lệ 3:2.' : 'Copy an image, focus the box below, then press Cmd+V. It will be center-cropped to 3:2.'}</span>
                        </div>
                        {(thumbnailDataUrl || (!thumbnailRemoveRequested && draft.thumbnailUrl)) ? (
                          <button
                            type="button"
                            className="lcs-thumbnail-remove"
                            onClick={() => {
                              setThumbnailDataUrl('');
                              setThumbnailRemoveRequested(true);
                            }}
                          >
                            <Trash2 size={15} />{isVi ? 'Xóa thumbnail' : 'Remove'}
                          </button>
                        ) : null}
                      </div>

                      <div
                        className={`lcs-thumbnail-paste-zone ${thumbnailBusy ? 'is-busy' : ''}`}
                        tabIndex={0}
                        onPaste={handleThumbnailPaste}
                      >
                        {(thumbnailDataUrl || (!thumbnailRemoveRequested && draft.thumbnailUrl)) ? (
                          <img src={thumbnailDataUrl || draft.thumbnailUrl} alt="" />
                        ) : (
                          <div className="lcs-thumbnail-empty">
                            {thumbnailBusy ? <LoaderCircle className="lcs-spin" /> : <Copy size={28} />}
                            <strong>{thumbnailBusy ? (isVi ? 'Đang xử lý ảnh…' : 'Processing image…') : (isVi ? 'Bấm vào đây rồi Cmd+V để dán ảnh' : 'Click here, then press Cmd+V')}</strong>
                            <span>{isVi ? 'PNG · JPG · WebP · ảnh sẽ lưu vĩnh viễn trên Supabase' : 'PNG · JPG · WebP · stored permanently in Supabase'}</span>
                          </div>
                        )}
                      </div>

                      <label className="lcs-thumbnail-file">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) acceptThumbnailFile(file);
                            event.target.value = '';
                          }}
                        />
                        <span>{isVi ? 'Hoặc chọn ảnh từ máy' : 'Or choose an image file'}</span>
                      </label>
                    </div>
                  ) : null}

                  <label className="lcs-field lcs-field-wide">
                    <span>{isVi ? 'Mã nhúng / URL / HTML' : 'Embed code / URL / HTML'}</span>
                    <textarea rows={9} value={draft.embedCode} onChange={(e) => setDraft((d) => ({ ...d, embedCode: e.target.value }))} placeholder={'<iframe src="https://..."></iframe>\n\nhttps://...\n\n<div>...</div><script>...</script>'} spellCheck={false} />
                  </label>
                  <div className="lcs-detection">
                    <span className={`lcs-dot ${previewReady ? 'is-ready' : ''}`} />
                    {parsedDraft.kind === 'url' ? (isVi ? `Đã nhận diện iframe/URL · ${sourceHost(parsedDraft.source)}` : `Embed URL detected · ${sourceHost(parsedDraft.source)}`)
                      : parsedDraft.kind === 'html' ? (isVi ? 'Đã nhận diện mã HTML tương tác' : 'Interactive HTML detected')
                      : parsedDraft.kind === 'invalid' ? (isVi ? 'Chưa nhận diện được mã hợp lệ' : 'No valid embed detected')
                      : (isVi ? 'Chưa có mã nhúng' : 'No embed code yet')}
                  </div>
                  <div className="lcs-form-actions">
                    {draft.id ? <button className="lcs-btn lcs-btn-secondary" onClick={closeBuilder}>{isVi ? 'Hủy chỉnh sửa' : 'Cancel edit'}</button> : null}
                    <button className="lcs-btn lcs-btn-primary" onClick={saveActivity} disabled={saving}>
                      {saving ? <LoaderCircle className="lcs-spin" size={18} /> : <Save size={18} />}
                      {draft.id ? (isVi ? 'Lưu thay đổi' : 'Save changes') : (isVi ? 'Lưu lên Supabase' : 'Save to Supabase')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="lcs-panel lcs-live-preview">
              <div className="lcs-panel-head">
                <div><span className="lcs-step">02</span><h2>{isVi ? 'Xem trước trực tiếp' : 'Live preview'}</h2></div>
                {parsedDraft.kind === 'url' ? <span className="lcs-host-chip">{sourceHost(parsedDraft.source)}</span> : null}
              </div>
              <div className="lcs-frame-shell">
                {previewReady ? <ActivityFrame embed={parsedDraft} title={draft.title} className="lcs-frame" /> : (
                  <div className="lcs-preview-empty"><Globe2 /><strong>{isVi ? 'Dán mã để xem trước' : 'Paste code to preview'}</strong><p>{isVi ? 'Hỗ trợ URL HTTPS, mã iframe và đoạn HTML tương tác.' : 'Supports HTTPS URLs, iframe code and interactive HTML snippets.'}</p></div>
                )}
              </div>
              {previewReady ? <div className="lcs-preview-foot"><span>{isVi ? 'Nguồn tự chặn iframe sẽ không thể hiển thị bên trong BRIAN.' : 'Sources that block iframe embedding cannot render inside BRIAN.'}</span>{parsedDraft.kind === 'url' ? <button onClick={() => openExternalFromEmbed(parsedDraft)}><ExternalLink size={15} />{isVi ? 'Mở nguồn' : 'Open source'}</button> : null}</div> : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="lcs-arcade-library">
        <div className="lcs-arcade-nav">
          <nav className="lcs-arcade-tabs" aria-label={isVi ? 'Chuyên đề' : 'Learning focus'}>
            <button type="button" className={focusFilter === 'all' ? 'is-active' : ''} onClick={() => { setFocusFilter('all'); setShowAccessQueue(false); }}>
              <Grid2X2 size={18} /><strong>{isVi ? 'Tất cả' : 'All'}</strong><span>{activities.length}</span>
            </button>
            <button type="button" className={focusFilter === 'vocabulary' ? 'is-active is-vocabulary' : 'is-vocabulary'} onClick={() => { setFocusFilter('vocabulary'); setShowAccessQueue(false); }}>
              <BookOpen size={18} /><strong>Vocabulary</strong><span>{focusCounts.vocabulary}</span>
            </button>
            <button type="button" className={focusFilter === 'grammar' ? 'is-active is-grammar' : 'is-grammar'} onClick={() => { setFocusFilter('grammar'); setShowAccessQueue(false); }}>
              <Layers3 size={18} /><strong>Grammar</strong><span>{focusCounts.grammar}</span>
            </button>
            <button type="button" className={focusFilter === 'skills' ? 'is-active is-skills' : 'is-skills'} onClick={() => { setFocusFilter('skills'); setShowAccessQueue(false); }}>
              <MonitorPlay size={18} /><strong>{isVi ? 'Kỹ năng' : 'Skills'}</strong><span>{focusCounts.skills}</span>
            </button>
            {isLeader ? (
              <button
                type="button"
                className={showAccessQueue ? 'is-active is-access-request' : 'is-access-request'}
                onClick={() => setShowAccessQueue((value) => !value)}
              >
                <KeyRound size={18} /><strong>{isVi ? 'Xin quyền truy cập' : 'Access requests'}</strong><span>{pendingCount}</span>
              </button>
            ) : null}
          </nav>

          <div className="lcs-arcade-nav-tools">
            <label className="lcs-arcade-search">
              <Search size={20} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isVi ? 'Tìm kiếm' : 'Search'} />
            </label>
            <label className="lcs-arcade-sort" title={isVi ? 'Sắp xếp' : 'Sort'}>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                <option value="newest">{isVi ? 'Mới cập nhật' : 'Recently updated'}</option>
                <option value="title">A → Z</option>
                <option value="unit">{isVi ? 'Theo Unit' : 'By Unit'}</option>
              </select>
            </label>
          </div>
        </div>

        {isLeader && showAccessQueue ? (
          <section className="lcs-access-queue" aria-label={isVi ? 'Yêu cầu xin quyền truy cập' : 'Access requests'}>
            <div className="lcs-access-queue-head">
              <div>
                <span>{isVi ? 'TTCM · DUYỆT QUYỀN' : 'DEPARTMENT HEAD · ACCESS REVIEW'}</span>
                <h2>{isVi ? 'Xin quyền truy cập' : 'Access requests'}</h2>
                <p>{pendingCount
                  ? (isVi ? `Có ${pendingCount} yêu cầu đang chờ xử lý.` : `${pendingCount} requests are waiting for review.`)
                  : (isVi ? 'Hiện không có yêu cầu nào đang chờ.' : 'There are no pending requests right now.')}</p>
              </div>
              <button type="button" onClick={() => setShowAccessQueue(false)} aria-label={isVi ? 'Đóng danh sách yêu cầu' : 'Close request list'}><X size={17} /></button>
            </div>

            <div className="lcs-access-queue-list">
              {requests.filter((item) => item.status === 'pending').map((request) => (
                <article key={request.id}>
                  <div className="lcs-access-queue-avatar">{String(request.requesterName || 'GV').trim().slice(0,1).toUpperCase()}</div>
                  <div className="lcs-access-queue-copy">
                    <div className="lcs-access-queue-title">
                      <strong>{request.requesterName}</strong>
                      <span>{request.requesterEmail}</span>
                    </div>
                    <h3>{request.activityTitle}</h3>
                    {request.message ? <p>“{request.message}”</p> : <p className="is-muted">{isVi ? 'Không có lời nhắn.' : 'No message.'}</p>}
                    <small>{compactDate(request.createdAt, language)}</small>
                  </div>
                  <div className="lcs-access-queue-actions">
                    <button type="button" className="is-reject" onClick={() => reviewRequest(request, 'rejected')} disabled={Boolean(accessBusyId)}><X size={15} />{isVi ? 'Từ chối' : 'Reject'}</button>
                    <button type="button" className="is-approve" onClick={() => reviewRequest(request, 'approved')} disabled={Boolean(accessBusyId)}><Check size={15} />{isVi ? 'Cấp quyền' : 'Grant'}</button>
                  </div>
                </article>
              ))}
              {!pendingCount ? <div className="lcs-access-queue-empty"><Check size={18} />{isVi ? 'Đã xử lý hết yêu cầu.' : 'All requests have been reviewed.'}</div> : null}
            </div>
          </section>
        ) : null}

        <div className="lcs-arcade-filterbar">
          <span className="lcs-filter-mark"><Filter size={17} /></span>
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} aria-label={isVi ? 'Khối' : 'Grade'}>
            <option value="all">{isVi ? 'Tất cả khối' : 'All grades'}</option><option value="10">Lớp 10</option><option value="11">Lớp 11</option><option value="12">Lớp 12</option>
          </select>
          <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} aria-label="Unit">
            <option value="all">{isVi ? 'Tất cả Unit' : 'All Units'}</option>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Unit {index + 1}</option>)}
          </select>
          <select value={lessonFilter} onChange={(e) => setLessonFilter(e.target.value)} aria-label="Lesson">
            <option value="all">{isVi ? 'Tất cả Lesson' : 'All lessons'}</option>{GLOBAL_SUCCESS_LESSONS.map((lesson) => <option key={lesson.key} value={lesson.key}>{lesson.title}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label={isVi ? 'Loại hoạt động' : 'Activity type'}>
            <option value="all">{isVi ? 'Tất cả loại' : 'All types'}</option>{TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isVi ? item.vi : item.en}</option>)}
          </select>
          <select value={focusFilter} onChange={(e) => setFocusFilter(e.target.value)} aria-label={isVi ? 'Chuyên đề' : 'Learning focus'}>
            <option value="all">{isVi ? 'Tất cả chuyên đề' : 'All focus areas'}</option>
            <option value="vocabulary">Vocabulary</option>
            <option value="grammar">Grammar</option>
            <option value="skills">{isVi ? 'Kỹ năng' : 'Skills'}</option>
            <option value="reading">Reading</option>
            <option value="listening">Listening</option>
            <option value="speaking">Speaking</option>
            <option value="mixed">{isVi ? 'Tổng hợp' : 'Mixed'}</option>
            <option value="unclassified">{isVi ? 'Chưa gắn' : 'Unclassified'}</option>
          </select>
          {!isLeader ? (
            <select value={accessFilter} onChange={(e) => setAccessFilter(e.target.value)} aria-label={isVi ? 'Quyền truy cập' : 'Access'}>
              <option value="all">{isVi ? 'Mọi quyền truy cập' : 'All access'}</option>
              <option value="open">{isVi ? 'Đã mở' : 'Unlocked'}</option>
              <option value="locked">{isVi ? 'Bị khóa' : 'Locked'}</option>
            </select>
          ) : null}
          {(query || gradeFilter !== 'all' || unitFilter !== 'all' || lessonFilter !== 'all' || typeFilter !== 'all' || focusFilter !== 'all' || accessFilter !== 'all' || statusFilter !== 'all' || sortMode !== 'newest') ? (
            <button className="lcs-arcade-clear" type="button" onClick={() => {
              setQuery('');
              setGradeFilter('all');
              setUnitFilter('all');
              setLessonFilter('all');
              setTypeFilter('all');
              setFocusFilter('all');
              setAccessFilter('all');
              setStatusFilter('all');
              setSortMode('newest');
            }}><X size={14} />{isVi ? 'Xóa lọc' : 'Clear'}</button>
          ) : null}
        </div>

        <div className="lcs-arcade-results-head">
          <span>{filteredActivities.length ? (isVi ? `Hiển thị ${pageStart}–${pageEnd} / ${filteredActivities.length}` : `Showing ${pageStart}–${pageEnd} of ${filteredActivities.length}`) : (isVi ? 'Không có kết quả' : 'No results')}</span>
          {!loading && filteredActivities.length > 0 ? (
            <div className="lcs-pagination-compact">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} aria-label={isVi ? 'Trang trước' : 'Previous page'}><ChevronLeft size={16} /></button>
              {paginationPages.map((pageNumber) => <button key={pageNumber} type="button" className={pageNumber === page ? 'is-active' : ''} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} aria-label={isVi ? 'Trang sau' : 'Next page'}><ChevronRight size={16} /></button>
            </div>
          ) : null}
        </div>

        {loading ? <LoadingBlock language={language} /> : !filteredActivities.length ? (
          <div className="lcs-empty-library"><Layers3 /><h3>{activities.length ? (isVi ? 'Không có hoạt động phù hợp bộ lọc.' : 'No activities match these filters.') : (isVi ? 'Chưa có hoạt động nào trên Supabase.' : 'No activities in Supabase yet.')}</h3></div>
        ) : (
          <div className="lcs-arcade-grid">
            {pagedActivities.map((item) => {
              const locked = !isLeader && !item.hasAccess;
              return (
                <article key={item.id} className={`lcs-arcade-card ${locked ? 'is-locked' : ''}`}>
                  <ActivityCardPreview
                    activity={item}
                    canLoad={!locked}
                    isLeader={isLeader}
                    language={language}
                    onOpen={() => openTeachingMode(item)}
                    onRequest={() => {
                      if (item.requestStatus !== 'pending') {
                        setRequestTarget(item);
                        setRequestNote('');
                      }
                    }}
                  />

                  <div className="lcs-arcade-card-copy">
                    <div className="lcs-arcade-meta">
                      <strong>{labelForType(item.type, language)}</strong>
                      <span>·</span>
                      <span>{compactDateOnly(item.updatedAt, language)}</span>
                    </div>

                    <div className="lcs-arcade-titleline">
                      <div className="lcs-arcade-titlecopy">
                        <h3>{item.title}</h3>
                        <p>Global Success {item.grade || '—'} · Unit {item.unitNo || '—'} · {item.lessonTitle || (isVi ? 'Hoạt động bổ sung' : 'Extra activity')}</p>
                      </div>

                      <div className="lcs-arcade-card-actions">
                        {!locked ? <button type="button" title={isVi ? 'Trình chiếu' : 'Teach'} onClick={() => openTeachingMode(item)}><MonitorPlay size={17} /></button> : null}
                        {isLeader ? (
                          <>
                            <button type="button" title={isVi ? 'Phân quyền' : 'Access'} onClick={() => openAccessManager(item)}><UserCheck size={17} /></button>
                            <button type="button" title={isVi ? 'Nhân bản' : 'Duplicate'} onClick={() => duplicateActivity(item)}><Copy size={17} /></button>
                            <button type="button" title={isVi ? 'Chỉnh sửa' : 'Edit'} onClick={() => editActivity(item)}><Edit3 size={17} /></button>
                            <button type="button" className="is-danger" title={isVi ? 'Xóa' : 'Delete'} onClick={() => removeActivity(item)}><Trash2 size={17} /></button>
                          </>
                        ) : locked ? (
                          item.requestStatus === 'pending'
                            ? <button type="button" className="is-pending" disabled title={isVi ? 'Đang chờ duyệt' : 'Pending'}><Clock3 size={17} /></button>
                            : <button type="button" className="is-request" title={isVi ? 'Xin quyền' : 'Request access'} onClick={() => { setRequestTarget(item); setRequestNote(''); }}><KeyRound size={17} /></button>
                        ) : null}
                      </div>
                    </div>

                    <div className="lcs-arcade-card-tags">
                      <span className={`lcs-focus-chip is-${item.focusArea || 'unclassified'}`}>{labelForFocusArea(item.focusArea, language)}</span>
                      {item.classLabel ? <span className="lcs-class-chip">{item.classLabel}</span> : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {assessmentWorkspaceView ? (
        <AssessmentWorkspace
          currentUser={currentUser}
          activities={activities}
          isLeader={isLeader}
          initialView={assessmentWorkspaceView}
          visible={assessmentWorkspaceVisible}
          resumeToScoreToken={assessmentResumeToScoreToken}
          onClose={() => { setAssessmentWorkspaceVisible(false); setAssessmentWorkspaceView(''); }}
          onLaunchActivity={launchAssessmentActivity}
        />
      ) : null}

      {assessmentWorkspaceView === 'session' && !assessmentWorkspaceVisible && !teachingActivity ? (
        <button className="lcs-assessment-resume" type="button" onClick={resumeAssessmentForScoring}>
          <span><ClipboardCheck size={18} /></span>
          <div><strong>{isVi ? 'Tiếp tục phiên đánh giá' : 'Resume assessment'}</strong><small>{isVi ? 'Quay lại để ghi nhận kết quả' : 'Return to record results'}</small></div>
          <ChevronRight size={18} />
        </button>
      ) : null}

      {requestTarget ? (
        <div className="lcs-modal-layer" onMouseDown={(event) => event.target === event.currentTarget && setRequestTarget(null)}>
          <section className="lcs-request-dialog" role="dialog" aria-modal="true">
            <button className="lcs-dialog-close" onClick={() => setRequestTarget(null)}><X /></button>
            <div className="lcs-dialog-icon"><LockKeyhole /></div>
            <span className="lcs-kicker">{isVi ? 'YÊU CẦU QUYỀN HOẠT ĐỘNG' : 'ACTIVITY ACCESS REQUEST'}</span>
            <h2>{requestTarget.title}</h2>
            <p>{isVi ? 'Hoạt động vẫn hiển thị trong thư viện nhưng nội dung nhúng được bảo vệ trên Supabase. TTCM phải cấp quyền trước khi bạn mở.' : 'The activity remains visible in the library, but embedded content is protected in Supabase until the department head grants access.'}</p>
            <div className="lcs-request-meta"><span>Global Success {requestTarget.grade}</span><span>Unit {requestTarget.unitNo} · {requestTarget.unitTitle}</span><span>{requestTarget.lessonTitle}</span></div>
            <label className="lcs-request-note"><span>{isVi ? 'Lời nhắn cho TTCM (không bắt buộc)' : 'Message to department head (optional)'}</span><textarea rows={3} maxLength={400} value={requestNote} onChange={(e) => setRequestNote(e.target.value)} placeholder={isVi ? 'Ví dụ: Em cần hoạt động này cho tiết Unit 5 lớp 11.2…' : 'For example: I need this activity for Unit 5 with class 11.2…'} /></label>
            <div className="lcs-dialog-actions"><button className="lcs-btn lcs-btn-secondary" onClick={() => setRequestTarget(null)}>{isVi ? 'Để sau' : 'Not now'}</button><button className="lcs-btn lcs-btn-primary" onClick={sendAccessRequest} disabled={requestSending}>{requestSending ? <LoaderCircle className="lcs-spin" size={18} /> : <KeyRound size={18} />}{isVi ? 'Gửi yêu cầu' : 'Send request'}</button></div>
          </section>
        </div>
      ) : null}

      {accessTarget ? (
        <div className="lcs-modal-layer" onMouseDown={(event) => event.target === event.currentTarget && setAccessTarget(null)}>
          <section className="lcs-access-dialog" role="dialog" aria-modal="true">
            <header className="lcs-access-dialog-head">
              <div><span className="lcs-kicker">{isVi ? 'TTCM · PHÂN QUYỀN TỪNG HOẠT ĐỘNG' : 'DEPARTMENT HEAD · PER-ACTIVITY ACCESS'}</span><h2>{accessTarget.title}</h2><p>Global Success {accessTarget.grade} · Unit {accessTarget.unitNo} · {accessTarget.unitTitle}</p></div>
              <button className="lcs-dialog-close" onClick={() => setAccessTarget(null)}><X /></button>
            </header>

            <div className="lcs-access-summary">
              <div><strong>{teacherAccess.filter((item) => item.hasAccess).length}</strong><span>{isVi ? 'đã được cấp' : 'granted'}</span></div>
              <div><strong>{teacherAccess.filter((item) => item.pendingRequest).length}</strong><span>{isVi ? 'đang xin quyền' : 'pending'}</span></div>
              <div><strong>{teacherAccess.length}</strong><span>{isVi ? 'giáo viên' : 'teachers'}</span></div>
            </div>

            {targetRequests.some((item) => item.status === 'pending') ? (
              <section className="lcs-pending-requests">
                <h3><ClipboardCheck size={18} />{isVi ? 'Yêu cầu đang chờ' : 'Pending requests'}</h3>
                {targetRequests.filter((item) => item.status === 'pending').map((request) => (
                  <article key={request.id}>
                    <div><strong>{request.requesterName}</strong><span>{request.requesterEmail}</span>{request.message ? <p>“{request.message}”</p> : null}</div>
                    <div><button className="is-reject" onClick={() => reviewRequest(request, 'rejected')} disabled={Boolean(accessBusyId)}><X size={15} />{isVi ? 'Từ chối' : 'Reject'}</button><button className="is-approve" onClick={() => reviewRequest(request, 'approved')} disabled={Boolean(accessBusyId)}><Check size={15} />{isVi ? 'Cấp quyền' : 'Grant'}</button></div>
                  </article>
                ))}
              </section>
            ) : null}

            <div className="lcs-teacher-toolbar"><label><Search size={18} /><input value={teacherQuery} onChange={(e) => setTeacherQuery(e.target.value)} placeholder={isVi ? 'Tìm giáo viên theo tên hoặc email…' : 'Search teacher by name or email…'} /></label></div>

            <div className="lcs-teacher-list">
              {accessLoading ? <LoadingBlock language={language} /> : filteredTeachers.map((teacher) => (
                <article key={teacher.userId} className={teacher.hasAccess ? 'has-access' : ''}>
                  <span className="lcs-teacher-avatar">{String(teacher.name || 'GV').trim().slice(0, 1).toUpperCase()}</span>
                  <div className="lcs-teacher-copy"><strong>{teacher.name}</strong><span>{teacher.email}</span>{teacher.pendingRequest ? <small><Clock3 size={12} />{isVi ? 'Đang xin quyền' : 'Pending request'}</small> : null}</div>
                  <button
                    className={teacher.hasAccess ? 'lcs-access-toggle is-on' : 'lcs-access-toggle'}
                    disabled={accessBusyId === teacher.userId}
                    onClick={() => changeTeacherAccess(teacher, !teacher.hasAccess)}
                  >
                    {accessBusyId === teacher.userId ? <LoaderCircle className="lcs-spin" size={16} /> : teacher.hasAccess ? <Check size={16} /> : <Plus size={16} />}
                    {teacher.hasAccess ? (isVi ? 'Đã cấp' : 'Granted') : (isVi ? 'Cấp quyền' : 'Grant')}
                  </button>
                </article>
              ))}
              {!accessLoading && !filteredTeachers.length ? <div className="lcs-teacher-empty">{isVi ? 'Không tìm thấy giáo viên phù hợp.' : 'No matching teachers.'}</div> : null}
            </div>
          </section>
        </div>
      ) : null}

      {teachingActivity ? (
        <div className="lcs-teach-overlay" ref={teachRef}>
          <header>
            <div><span>{isVi ? 'CHẾ ĐỘ DẠY' : 'TEACHING MODE'}</span><strong>{teachingActivity.title}</strong><small>Global Success {teachingActivity.grade} · Unit {teachingActivity.unitNo} · {teachingActivity.lessonTitle}</small></div>
            <div>
              {assessmentWorkspaceView === 'session' ? <button className="lcs-score-return" onClick={() => closeTeachingMode({ resumeAssessment: true, toScore: true })}><ClipboardCheck size={18} />{isVi ? 'Kết thúc & ghi điểm' : 'Finish & score'}</button> : null}
              {teachingEmbed?.kind === 'url' ? <button onClick={() => openExternalFromEmbed(teachingEmbed)}><ExternalLink size={18} />{isVi ? 'Mở ngoài' : 'Open externally'}</button> : null}
              <button onClick={() => document.fullscreenElement ? document.exitFullscreen?.() : teachRef.current?.requestFullscreen?.()}><Fullscreen size={18} />{isVi ? 'Toàn màn hình' : 'Fullscreen'}</button>
              <button className="lcs-close" onClick={() => closeTeachingMode()}><X size={18} />{isVi ? 'Đóng' : 'Close'}</button>
            </div>
          </header>
          <div className="lcs-teach-frame-wrap">
            {teachingLoading ? <LoadingBlock language={language} /> : teachingEmbed ? <ActivityFrame embed={teachingEmbed} title={teachingActivity.title} className="lcs-teach-frame" /> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
