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
  Fullscreen,
  Globe2,
  KeyRound,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  MonitorPlay,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRound,
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
  requestLessonCheckAccess,
  reviewLessonCheckAccessRequest,
  saveLessonCheckActivity,
  setLessonCheckTeacherAccess,
  subscribeLessonCheckUpdates,
} from '../utils/lessonCheckActivities.js';
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
    type: 'quiz',
    notes: '',
    sourceHost: '',
    embedCode: '',
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

const cardPreviewCache = new Map();

function ActivityCardPreview({ activity, canLoad, isLeader, language, onOpen, onRequest }) {
  const isVi = language === 'vi';
  const hostRef = useRef(null);
  const loadingRef = useRef(false);
  const [nearViewport, setNearViewport] = useState(false);
  const [embed, setEmbed] = useState(() => cardPreviewCache.get(activity.id) || null);
  const [state, setState] = useState(embed ? 'ready' : 'idle');

  useEffect(() => {
    const node = hostRef.current;
    if (!node || !canLoad) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setNearViewport(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setNearViewport(entry.isIntersecting);
    }, { rootMargin: '180px 0px', threshold: 0.02 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoad]);

  useEffect(() => {
    if (!canLoad || !nearViewport || embed || loadingRef.current) return undefined;
    let active = true;
    const cached = cardPreviewCache.get(activity.id);
    if (cached) {
      setEmbed(cached);
      setState('ready');
      return () => { active = false; };
    }

    loadingRef.current = true;
    setState('loading');
    getLessonCheckActivityContent(activity.id)
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setState('error');
          return;
        }
        const parsed = parseEmbed(result.content.embedCode);
        if (!['url', 'html'].includes(parsed.kind)) {
          setState('error');
          return;
        }
        cardPreviewCache.set(activity.id, parsed);
        setEmbed(parsed);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('error');
      })
      .finally(() => {
        loadingRef.current = false;
      });

    return () => { active = false; };
  }, [activity.id, canLoad, embed, nearViewport]);

  const showLivePreview = canLoad && nearViewport && embed;

  return (
    <div ref={hostRef} className={`lcs-card-media ${canLoad ? 'can-preview' : 'is-locked'}`}>
      {showLivePreview ? (
        <div className="lcs-card-live-preview" aria-hidden="true">
          <ActivityFrame embed={embed} title={activity.title} className="lcs-card-preview-frame" />
        </div>
      ) : (
        <div className="lcs-card-preview-placeholder" aria-hidden="true">
          {canLoad && state === 'loading' ? <LoaderCircle className="lcs-spin" /> : canLoad ? <MonitorPlay /> : <LockKeyhole />}
          <strong>{!canLoad
            ? (isVi ? 'Xem trước bị khóa' : 'Preview locked')
            : state === 'error'
              ? (isVi ? 'Không tải được hình xem trước' : 'Preview unavailable')
              : (isVi ? 'Đang chuẩn bị hình xem trước' : 'Preparing preview')}</strong>
          <span>{activity.sourceHost || activity.embedKind?.toUpperCase() || 'Activity'}</span>
        </div>
      )}

      <div className="lcs-card-media-shade" aria-hidden="true" />
      <div className="lcs-card-media-top">
        <span className="lcs-book-badge"><BookOpen size={15} />Global Success {activity.grade || '—'}</span>
        <StatusPill activity={activity} isLeader={isLeader} language={language} />
      </div>
      <button
        className={`lcs-card-media-action ${canLoad ? '' : activity.requestStatus === 'pending' ? 'is-pending' : 'is-request'}`}
        type="button"
        disabled={!canLoad && activity.requestStatus === 'pending'}
        onClick={canLoad ? onOpen : onRequest}
      >
        {canLoad ? <MonitorPlay size={17} /> : activity.requestStatus === 'pending' ? <Clock3 size={17} /> : <KeyRound size={17} />}
        {canLoad
          ? (isVi ? 'Mở nhanh' : 'Quick open')
          : activity.requestStatus === 'pending'
            ? (isVi ? 'Đang chờ duyệt' : 'Pending approval')
            : (isVi ? 'Xin quyền' : 'Request access')}
      </button>
    </div>
  );
}

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
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [lessonFilter, setLessonFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortMode, setSortMode] = useState('newest');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [showEditor, setShowEditor] = useState(true);
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

  const filteredActivities = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('vi');
    const result = activities.filter((item) => {
      if (gradeFilter !== 'all' && String(item.grade || '') !== gradeFilter) return false;
      if (unitFilter !== 'all' && String(item.unitNo || '') !== unitFilter) return false;
      if (lessonFilter !== 'all' && String(item.lessonKey || '') !== lessonFilter) return false;
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (!q) return true;
      return [
        item.title,
        item.unitTitle,
        item.lessonTitle,
        item.classLabel,
        item.notes,
        item.sourceHost,
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
  }, [activities, gradeFilter, lessonFilter, query, sortMode, typeFilter, unitFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize));
  const pagedActivities = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredActivities.slice(start, start + pageSize);
  }, [filteredActivities, page, pageSize]);

  const pageStart = filteredActivities.length ? ((page - 1) * pageSize) + 1 : 0;
  const pageEnd = Math.min(page * pageSize, filteredActivities.length);

  useEffect(() => {
    setPage(1);
  }, [gradeFilter, lessonFilter, pageSize, query, sortMode, typeFilter, unitFilter]);

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

  function resetDraft() {
    setDraft(blankDraft());
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
      type: item.type || 'quiz',
      notes: item.notes || '',
      sourceHost: item.sourceHost || '',
      embedCode: result.content.embedCode,
    });
    setShowEditor(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveActivity() {
    if (!isLeader) return;
    if (!draft.title.trim()) {
      setNotice(isVi ? 'Hãy nhập tên hoạt động.' : 'Enter an activity title.');
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
    setSaving(false);
    if (!result.ok) {
      setNotice(result.message || (isVi ? 'Không thể lưu hoạt động.' : 'Could not save activity.'));
      return;
    }
    setNotice(isVi ? 'Đã lưu lên Supabase.' : 'Saved to Supabase.');
    resetDraft();
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
      return;
    }
    setTeachingActivity(item);
    setTeachingLoading(true);
    setTeachingEmbed(null);
    const result = await getLessonCheckActivityContent(item.id);
    setTeachingLoading(false);
    if (!result.ok) {
      setTeachingActivity(null);
      setNotice(result.message || (isVi ? 'Không thể tải hoạt động.' : 'Could not load activity.'));
      return;
    }
    const embed = parseEmbed(result.content.embedCode);
    if (!['url', 'html'].includes(embed.kind)) {
      setTeachingActivity(null);
      setNotice(isVi ? 'Nội dung nhúng không còn hợp lệ.' : 'The stored embed is no longer valid.');
      return;
    }
    setTeachingEmbed(embed);
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

  const headerText = isLeader
    ? (isVi ? 'Tạo hoạt động, đồng bộ lên Supabase và cấp quyền theo từng hoạt động.' : 'Create activities, sync them to Supabase and grant per-activity access.')
    : (isVi ? 'Xem toàn bộ hoạt động của tổ. Hoạt động chưa được cấp quyền vẫn hiện nhưng bị khóa.' : 'Browse every department activity. Items without access remain visible but locked.');

  return (
    <div className="lcs-page">
      <header className="lcs-hero">
        <button className="lcs-back" onClick={() => { window.location.hash = '#/apps'; }} aria-label={isVi ? 'Quay lại Ứng dụng' : 'Back to Apps'}>
          <ArrowLeft />
        </button>
        <div className="lcs-hero-copy">
          <span className="lcs-kicker">{isVi ? 'BRIAN · GLOBAL SUCCESS ACTIVITY LIBRARY' : 'BRIAN · GLOBAL SUCCESS ACTIVITY LIBRARY'}</span>
          <h1>{isVi ? 'Kiểm tra bài' : 'Lesson Check Studio'}</h1>
          <p>{headerText}</p>
        </div>
        <div className="lcs-hero-actions">
          <span className="lcs-cloud-chip"><ShieldCheck size={17} />Supabase</span>
          {isLeader ? (
            <>
              {pendingCount ? <button className="lcs-btn lcs-btn-warn" onClick={() => document.querySelector('.lcs-library')?.scrollIntoView({ behavior: 'smooth' })}><KeyRound size={18} />{pendingCount} {isVi ? 'yêu cầu' : 'requests'}</button> : null}
              <button className="lcs-btn lcs-btn-primary" onClick={resetDraft}><Plus size={19} />{isVi ? 'Hoạt động mới' : 'New activity'}</button>
            </>
          ) : null}
          <button className="lcs-btn lcs-btn-secondary" onClick={() => { loadActivities(); loadRequests(); }}><RefreshCw size={17} />{isVi ? 'Làm mới' : 'Refresh'}</button>
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

      {isLeader ? (
        <section className="lcs-builder">
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
                <label className="lcs-field lcs-field-wide">
                  <span>{isVi ? 'Ghi chú tổ chức' : 'Teaching notes'}</span>
                  <input value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder={isVi ? 'Ví dụ: 7 phút · Teacher-led · dùng cuối tiết' : 'e.g. 7 minutes · Teacher-led · end-of-lesson'} />
                </label>
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
                  {draft.id ? <button className="lcs-btn lcs-btn-secondary" onClick={resetDraft}>{isVi ? 'Hủy chỉnh sửa' : 'Cancel edit'}</button> : null}
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
        </section>
      ) : (
        <section className="lcs-teacher-banner">
          <div className="lcs-teacher-icon"><UserRound /></div>
          <div><span>{isVi ? 'THƯ VIỆN DÙNG CHUNG' : 'SHARED LIBRARY'}</span><h2>{isVi ? 'Hoạt động do TTCM quản lý quyền' : 'Department-managed activity access'}</h2><p>{isVi ? 'Bạn luôn thấy danh mục hoạt động. Hoạt động đã được cấp quyền có thể mở ngay; hoạt động khóa có nút Xin quyền.' : 'You always see the activity catalog. Granted items open immediately; locked items show a Request access action.'}</p></div>
        </section>
      )}

      <section className="lcs-library">
        <div className="lcs-library-head">
          <div>
            <span className="lcs-kicker">{isVi ? 'GLOBAL SUCCESS · SUPABASE' : 'GLOBAL SUCCESS · SUPABASE'}</span>
            <h2>{isVi ? 'Hoạt động dạy học' : 'Teaching activities'} <b>{activities.length}</b></h2>
          </div>
          <div className="lcs-library-tools">
            <label className="lcs-search"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isVi ? 'Tìm tên, Unit, Lesson, lớp…' : 'Search title, Unit, Lesson, class…'} /></label>
            <label className="lcs-filter-select"><Filter size={16} /><select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}><option value="all">{isVi ? 'Tất cả khối' : 'All grades'}</option><option value="10">Lớp 10</option><option value="11">Lớp 11</option><option value="12">Lớp 12</option></select></label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">{isVi ? 'Tất cả loại' : 'All types'}</option>{TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isVi ? item.vi : item.en}</option>)}</select>
          </div>
        </div>

        {loading ? <LoadingBlock language={language} /> : !filteredActivities.length ? (
          <div className="lcs-empty-library"><Layers3 /><h3>{activities.length ? (isVi ? 'Không có hoạt động phù hợp bộ lọc.' : 'No activities match these filters.') : (isVi ? 'Chưa có hoạt động nào trên Supabase.' : 'No activities in Supabase yet.')}</h3><p>{isLeader ? (isVi ? 'Tạo hoạt động đầu tiên ở phía trên.' : 'Create the first activity above.') : (isVi ? 'TTCM chưa đăng hoạt động.' : 'The department head has not published an activity yet.')}</p></div>
        ) : (
          <div className="lcs-card-grid">
            {filteredActivities.map((item) => {
              const locked = !isLeader && !item.hasAccess;
              return (
                <article key={item.id} className={`lcs-card ${locked ? 'is-locked' : 'is-open'}`}>
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
                  <div className="lcs-card-body">
                    <div className="lcs-card-unitline">
                      <strong>Unit {item.unitNo || '—'}</strong>
                      <span>{item.unitTitle || (isVi ? 'Chưa gắn Unit' : 'No Unit')}</span>
                      <em>{item.lessonTitle || (isVi ? 'Hoạt động bổ sung' : 'Extra activity')}</em>
                    </div>
                    <div className="lcs-card-meta"><span>{labelForType(item.type, language)}</span>{item.classLabel ? <span>{item.classLabel}</span> : null}{isLeader ? <span><Users size={12} />{item.grantCount}</span> : null}</div>
                    <h3>{item.title}</h3>
                    <p>{item.notes || (isVi ? 'Hoạt động kiểm tra / củng cố trên lớp.' : 'Classroom check / reinforcement activity.')}</p>
                    <small>{item.sourceHost || item.embedKind?.toUpperCase()} · {compactDate(item.updatedAt, language)}</small>

                    <div className="lcs-card-actions">
                      {locked ? (
                        item.requestStatus === 'pending' ? (
                          <button className="lcs-card-primary is-pending" disabled><Clock3 size={17} />{isVi ? 'Đang chờ TTCM duyệt' : 'Waiting for approval'}</button>
                        ) : (
                          <button className="lcs-card-primary is-request" onClick={() => { setRequestTarget(item); setRequestNote(''); }}><KeyRound size={17} />{isVi ? 'Xin quyền' : 'Request access'}</button>
                        )
                      ) : (
                        <button className="lcs-card-primary" onClick={() => openTeachingMode(item)}><MonitorPlay size={17} />{isVi ? 'Trình chiếu' : 'Teach'}</button>
                      )}

                      {isLeader ? (
                        <>
                          <button onClick={() => openAccessManager(item)}><UserCheck size={16} />{isVi ? 'Quyền' : 'Access'}</button>
                          <button onClick={() => editActivity(item)}><Edit3 size={16} />{isVi ? 'Sửa' : 'Edit'}</button>
                          <button onClick={() => duplicateActivity(item)}><Copy size={16} />{isVi ? 'Nhân bản' : 'Duplicate'}</button>
                          <button className="is-danger" onClick={() => removeActivity(item)}><Trash2 size={16} />{isVi ? 'Xóa' : 'Delete'}</button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

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
              {teachingEmbed?.kind === 'url' ? <button onClick={() => openExternalFromEmbed(teachingEmbed)}><ExternalLink size={18} />{isVi ? 'Mở ngoài' : 'Open externally'}</button> : null}
              <button onClick={() => document.fullscreenElement ? document.exitFullscreen?.() : teachRef.current?.requestFullscreen?.()}><Fullscreen size={18} />{isVi ? 'Toàn màn hình' : 'Fullscreen'}</button>
              <button className="lcs-close" onClick={() => { if (document.fullscreenElement) document.exitFullscreen?.(); setTeachingActivity(null); setTeachingEmbed(null); }}><X size={18} />{isVi ? 'Đóng' : 'Close'}</button>
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
