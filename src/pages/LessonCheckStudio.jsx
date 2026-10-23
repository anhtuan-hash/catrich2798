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
  Heart,
  Info,
  ListChecks,
  SlidersHorizontal,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  Pause,
  RotateCcw,
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
  saveLessonCheckActivityReliable,
  setLessonCheckTeacherAccess,
  subscribeLessonCheckUpdates,
  uploadLessonCheckActivityThumbnail,
} from '../utils/lessonCheckActivities.js';
import AssessmentWorkspace from '../components/lessonCheck/AssessmentWorkspace.jsx';
import Assessment5Header from '../components/lessonCheck/Assessment5Header.jsx';
import {
  DEFAULT_LESSON_CHECK_HERO, LESSON_CHECK_HERO_EVENT, normalizeLessonCheckHero,
  readLessonCheckHero,
} from '../utils/lessonCheckHeroCms.js';
import { Assessment5Preview, Assessment5Queue } from '../components/lessonCheck/Assessment5Panels.jsx';
import { readTeachingQueue, writeTeachingQueue, markRecentActivity } from '../utils/lessonCheckTeaching.js';
import { normalizeActivityTitle, matchesActivityTitle } from '../utils/lessonCheckSearch.js';
import { listActivityAttributes, saveActivityAttributes } from '../utils/lessonCheckAttributes.js';
import { listActivityJournal, logActivityUse } from '../utils/lessonCheckWorkbench.js';
import { loadAssessmentWorkspace, setAssessmentFavorite } from '../utils/lessonCheckWorkbench.js';
const Assessment4Workbench = React.lazy(() => import('../components/lessonCheck/Assessment4Workbench.jsx'));
const LessonCheckHeroEditor = React.lazy(() => import('../components/LessonCheckHeroEditor.jsx'));
import {
  GLOBAL_SUCCESS_LESSONS,
  globalSuccessLessonTitle,
  globalSuccessUnitTitle,
  unitOptionsForGrade,
} from '../data/globalSuccessCatalog.js';
import { assessmentText } from '../utils/assessmentBilingual.js';
import './LessonCheckStudio.css';
import './LessonCheckApprovedMockupOne.css';
import './LessonCheckHeroIndependent.css';
// Route-local width parity with Homeroom and Dashboard; loaded last.
import './LessonCheckAlignAppGutters.css';

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
  const t=(text)=>assessmentText(text,language);
  const isLeader = canPublishDepartment(currentUser);
  const [heroPublished,setHeroPublished] = useState(() => normalizeLessonCheckHero(DEFAULT_LESSON_CHECK_HERO));
  const [heroDraft,setHeroDraft] = useState(null);
  const [heroPreview,setHeroPreview] = useState(null);
  const [heroEditorOpen,setHeroEditorOpen] = useState(false);
  const activeHero=heroPreview || heroPublished;
  const hasHeroMedia=activeHero.backgroundType!=='none' && Boolean(activeHero.backgroundUrl);
  useEffect(() => {
    let cancelled=false;
    const reload=async () => {
      try {
        const result=await readLessonCheckHero();
        if(!cancelled) setHeroPublished(result.published);
      }catch(error) {
        if(import.meta.env.DEV) console.warn('Lesson Check Hero unavailable',error);
      }
    };
    reload();
    const updated=(event) => {
      if(!cancelled && event?.detail?.published) setHeroPublished(normalizeLessonCheckHero(event.detail.published));
    };
    window.addEventListener('focus',reload);
    window.addEventListener(LESSON_CHECK_HERO_EVENT,updated);
    return () => {
      cancelled=true;
      window.removeEventListener('focus',reload);
      window.removeEventListener(LESSON_CHECK_HERO_EVENT,updated);
    };
  },[currentUser?.id]);
  const openLessonHeroEditor=async () => {
    if(!isLeader) return;
    try{
      const result=await readLessonCheckHero({includeDraft:true});
      setHeroPublished(result.published);
      setHeroDraft(result.draft);
    }catch(error){
      setHeroDraft(heroPublished);
    }
    setHeroEditorOpen(true);
  };
  const [activities, setActivities] = useState([]);
  const [requests, setRequests] = useState([]);
  const [singleDraft, setSingleDraft] = useState(blankDraft);
  const [batchMode, setBatchMode] = useState(false);
  const [batchDrafts, setBatchDrafts] = useState(() => Array.from({ length: 10 }, () => blankDraft()));
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null);
  const savingSingleRef = useRef(false);
  const pendingSingleSaveRef = useRef(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState('');
  const [thumbnailRemoveRequested, setThumbnailRemoveRequested] = useState(false);
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const searchInputRef = useRef(null);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [focusFilter, setFocusFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [favoriteSavingIds, setFavoriteSavingIds] = useState([]);
  const favoriteInFlightRef = useRef(new Set());
  const favoriteLoadVersionRef = useRef(0);
  const uiPreferenceLoadedRef = useRef(false);
  const favoriteUserId = currentUser?.id || currentUser?.authId || '';
  const queueAccountRef = useRef(favoriteUserId);
  queueAccountRef.current = favoriteUserId;
  const [sortMode, setSortMode] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [recentIds, setRecentIds] = useState([]);
  const [queueIds, setQueueIds] = useState([]);
  const [queueClass, setQueueClass] = useState('');
  const [queueMinutes, setQueueMinutes] = useState(5);
  const [queueBusy, setQueueBusy] = useState(false);
  const [queueReady, setQueueReady] = useState(false);
  const queueMutationRef = useRef(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [previewActivity, setPreviewActivity] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [advancedFilters, setAdvancedFilters] = useState(false);
  const [cefrFilter, setCefrFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkIds, setBulkIds] = useState([]);
  const [bulkCefr, setBulkCefr] = useState('B1');
  const [bulkMinutes, setBulkMinutes] = useState(15);
  const [bulkDelivery, setBulkDelivery] = useState('whole_class');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [workbenchInitialTab, setWorkbenchInitialTab] = useState('mine');
  const [journalRows, setJournalRows] = useState([]);
  const [journalReady, setJournalReady] = useState(false);
  const [classroomQueueIndex, setClassroomQueueIndex] = useState(null);
  const [classroomTimer, setClassroomTimer] = useState(300);
  const [classroomClockRunning, setClassroomClockRunning] = useState(false);
  const [completedQueueIds, setCompletedQueueIds] = useState([]);
  const [completionBusy, setCompletionBusy] = useState(false);
  const completingRef = useRef(false);
  const [page, setPage] = useState(1);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  const [menuActivityId, setMenuActivityId] = useState('');
  const [showAccessQueue, setShowAccessQueue] = useState(false);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
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
  const batchSavingRef = useRef(false);
  const draft = batchMode ? batchDrafts[activeBatchIndex] : singleDraft;
  const populatedBatchCount = batchDrafts.filter((item) => item.title.trim() || item.embedCode.trim()).length;

  function setDraft(updater) {
    if (!batchMode) {
      setSingleDraft(updater);
      return;
    }
    setBatchDrafts((items) => items.map((item, index) => (
      index === activeBatchIndex
        ? (typeof updater === 'function' ? updater(item) : updater)
        : item
    )));
  }

  const parsedDraft = useMemo(() => parseEmbed(draft.embedCode), [draft.embedCode]);
  const previewReady = ['url', 'html'].includes(parsedDraft.kind);
  const unitOptions = useMemo(() => unitOptionsForGrade(draft.grade), [draft.grade]);
  const pendingCount = useMemo(() => requests.filter((item) => item.status === 'pending').length, [requests]);
  // The RPC supplies hasAccess for the signed-in teacher; never infer grants from other users' requests.
  const grantedCount = useMemo(() => activities.filter((item) => item.hasAccess === true).length, [activities]);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const favoriteCount = useMemo(
    () => activities.filter(item => favoriteSet.has(item.id)).length,
    [activities, favoriteSet],
  );
  const pendingActivityIds = useMemo(() => new Set(
    requests.filter((item) => item.status === 'pending').map((item) => item.activityId),
  ), [requests]);
  const pageSize = 12;
  const attrMap = useMemo(() => new Map(attributes.map(row => [row.activity_id,row])), [attributes]);
  const queueSet = useMemo(() => new Set(queueIds),[queueIds]);
  // Only display usage data supplied by the owner/leader-scoped journal query.
  const availableQueueItems = useMemo(() => queueIds.map(id => activities.find(item => item.id === id))
    .filter(item => item && (isLeader || item.hasAccess)), [queueIds, activities, isLeader]);
  const journalById = useMemo(() => {
    const map = new Map();
    journalRows.forEach(row => {
      const item = map.get(row.activity_id) || {opened:0,completed:0,latest:''};
      if(row.event_type === 'completed') item.completed += 1; else item.opened += 1;
      if(!item.latest) item.latest = new Date(row.created_at).toLocaleDateString('vi-VN');
      map.set(row.activity_id,item);
    });
    return map;
  },[journalRows]);

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

  // One personal favorites list for the library and the Assessment 4.0 workbench.
  // Refresh on return to the tab so grants and favorites made on other devices appear.
  useEffect(() => {
    let live = true;
    setFavoriteIds([]);
    setRecentIds([]);
    setJournalRows([]);
    setJournalReady(false);
    setFavoritesReady(false);
    favoriteInFlightRef.current.clear();
    setFavoriteSavingIds([]);
    if (!favoriteUserId) return () => { live = false; };
    const load = async () => {
      if (favoriteInFlightRef.current.size) return;
      const version = ++favoriteLoadVersionRef.current;
      const result = await loadAssessmentWorkspace(favoriteUserId);
      if (!live || version !== favoriteLoadVersionRef.current) return;
      if (result.ok) {
        setFavoriteIds(result.state.favorites);
        setRecentIds(result.state.recentIds || []);
        setFavoritesReady(true);
      } else {
        setFavoritesReady(false);
        setNotice(result.message || (isVi ? 'Chưa thể tải mục yêu thích.' : 'Could not load favorites.'));
      }
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      live = false;
      favoriteLoadVersionRef.current += 1;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [favoriteUserId, isVi]);

  const toggleFavorite = useCallback(async (activityId) => {
    if (!favoriteUserId || !favoritesReady) {
      setNotice(isVi ? 'Đăng nhập và đợi đồng bộ để lưu mục yêu thích.' : 'Sign in and wait for favorites to sync.');
      return;
    }
    if (favoriteInFlightRef.current.has(activityId)) return;
    const wasSaved = favoriteSet.has(activityId);
    const shouldSave = !wasSaved;
    favoriteInFlightRef.current.add(activityId);
    favoriteLoadVersionRef.current += 1;
    setFavoriteSavingIds(ids => [...ids, activityId]);
    setFavoriteIds(ids => shouldSave ? [...ids.filter(id => id !== activityId), activityId] : ids.filter(id => id !== activityId));
    try {
      const result = await setAssessmentFavorite(activityId, shouldSave);
      if (!result.ok) {
        setFavoriteIds(ids => wasSaved ? [...ids.filter(id => id !== activityId), activityId] : ids.filter(id => id !== activityId));
        setNotice(result.message || (isVi ? 'Không thể lưu mục yêu thích.' : 'Could not save favorite.'));
      }
    } catch {
      setFavoriteIds(ids => wasSaved ? [...ids.filter(id => id !== activityId), activityId] : ids.filter(id => id !== activityId));
      setNotice(isVi ? 'Lỗi kết nối khi lưu mục yêu thích.' : 'Network error while saving favorite.');
    } finally {
      favoriteInFlightRef.current.delete(activityId);
      setFavoriteSavingIds(ids => ids.filter(id => id !== activityId));
    }
  }, [favoriteUserId, favoritesReady, favoriteSet, isVi]);

  // Load the current account's queue before enabling edits; hide a previous account's data.
  useEffect(() => {
    let live = true;
    setQueueReady(false);
    setQueueIds([]);
    setQueueClass('');
    setQueueMinutes(5);
    if (!favoriteUserId) return () => { live = false; };
    readTeachingQueue(favoriteUserId).then(result => {
      if (!live) return;
      if (result.ok) {
        setQueueIds(result.queue.activity_ids || []);
        setQueueClass(result.queue.class_name || '');
        setQueueMinutes(result.queue.default_minutes || 5);
        setQueueReady(true);
      } else setNotice(result.message);
    }).catch(() => {
      if (live) setNotice(isVi ? 'Không thể kết nối hàng đợi, vui lòng thử lại.' : 'Could not connect to the teaching queue.');
    });
    listActivityAttributes().then(result => {
      if (live && result.ok) setAttributes(result.items || []);
    }).catch(() => {});
    return () => { live = false; };
  }, [favoriteUserId, isVi]);

  // Lock synchronously, not after React's queued state update. Failed writes never
  // replace the last confirmed queue; account switching cannot rehydrate another user's data.
  const updateQueue = useCallback(async (nextIds,nextClass=queueClass,nextMinutes=queueMinutes) => {
    if (queueMutationRef.current || !queueReady || !favoriteUserId) return false;
    queueMutationRef.current = true;
    setQueueBusy(true);
    const owner = favoriteUserId;
    try {
      const result = await writeTeachingQueue(owner,{ids:nextIds,className:nextClass,minutes:nextMinutes});
      if (owner !== queueAccountRef.current) return false;
      if (!result.ok) {
        setNotice(result.message || (isVi ? 'Không lưu được hàng đợi.' : 'Could not save the teaching queue.'));
        return false;
      }
      setQueueIds(result.queue.activity_ids || []);
      setQueueClass(result.queue.class_name || '');
      setQueueMinutes(result.queue.default_minutes || 5);
      return true;
    } catch {
      if (owner === queueAccountRef.current) setNotice(isVi ? 'Mất kết nối, hàng đợi chưa được lưu.' : 'Connection lost; the queue was not saved.');
      return false;
    } finally {
      queueMutationRef.current = false;
      if (owner === queueAccountRef.current) setQueueBusy(false);
    }
  },[favoriteUserId,queueReady,queueClass,queueMinutes,isVi]);

  const addToQueue = useCallback(async id => {
    const item=activities.find(a=>a.id===id);
    if(!item || (!isLeader && !item.hasAccess)){
      setNotice(isVi?'Hoạt động cần được cấp quyền trước khi thêm vào buổi dạy.':'Activity permission required.');return;
    }
    if(queueIds.includes(id))return;
    if(queueIds.length>=20){setNotice(isVi?'Hàng đợi tối đa 20 hoạt động.':'Teaching queue supports up to 20 activities.');return;}
    await updateQueue([...queueIds,id]);
  },[activities,isLeader,isVi,queueIds,updateQueue]);

  const moveQueue = async(from,to) => {
    if(to<0||to>=queueIds.length||from===to)return;
    const ids=[...queueIds];const [item]=ids.splice(from,1);ids.splice(to,0,item);
    await updateQueue(ids);
  };

  // Persist only presentation preferences. Never cache student scores or protected embeds.
  useEffect(()=>{
    if(!favoriteUserId)return;
    uiPreferenceLoadedRef.current=false;
    try{
      const prefs=JSON.parse(sessionStorage.getItem('lcs5-prefs-'+favoriteUserId)||'{}');
      if(['grid','list'].includes(prefs.view))setViewMode(prefs.view);
      if(['all','10','11','12'].includes(prefs.grade))setGradeFilter(prefs.grade);
      if(typeof prefs.query==='string')setQuery(prefs.query.slice(0,100));
      if(typeof prefs.unit==='string')setUnitFilter(prefs.unit);
      if(typeof prefs.focus==='string')setFocusFilter(prefs.focus);
      if(['newest','title','unit','favorites','recent'].includes(prefs.sort))setSortMode(prefs.sort);
      if(['all','favorites','ready','recent','pending','locked'].includes(prefs.status))setStatusFilter(prefs.status);
    }catch{/* Storage unavailable: use the existing defaults. */}
    uiPreferenceLoadedRef.current=true;
  },[favoriteUserId]);

  useEffect(()=>{
    if(!favoriteUserId||!uiPreferenceLoadedRef.current)return;
    try{
      sessionStorage.setItem('lcs5-prefs-'+favoriteUserId,JSON.stringify({
        view:viewMode,query:query.slice(0,100),grade:gradeFilter,unit:unitFilter,
        focus:focusFilter,sort:sortMode,status:statusFilter
      }));
    }catch{/* Private browsing may disallow session storage. */}
  },[favoriteUserId,viewMode,query,gradeFilter,unitFilter,focusFilter,sortMode,statusFilter]);

  const openActivityJournal = useCallback(async () => {
    if(journalReady)return;
    const r=await listActivityJournal({leader:isLeader,userId:favoriteUserId,limit:500});
    if(r.ok){setJournalRows(r.items);setJournalReady(true);}
    else setNotice(r.message);
  },[isLeader,favoriteUserId,journalReady]);

  // Absolute deadline avoids losing classroom time when a browser tab is throttled.
  // Pausing retains remaining seconds; resuming creates a fresh deadline.
  useEffect(() => {
    if (!classroomClockRunning || classroomQueueIndex === null) return undefined;
    const deadline = Date.now() + classroomTimer * 1000;
    const handle = window.setInterval(() => {
      setClassroomTimer(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(handle);
    // Re-arm only on play/pause or a new activity, not on each timer tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomClockRunning, classroomQueueIndex]);
  useEffect(() => {if(classroomTimer===0)setClassroomClockRunning(false);},[classroomTimer]);

  const openWorkspaceTab = tab => {
    setWorkbenchInitialTab(tab);
    setWorkbenchOpen(true);
    window.setTimeout(()=>document.getElementById('assessment4-workbench')?.scrollIntoView({block:'start',behavior:'smooth'}),100);
  };

  const loadRequests = useCallback(async () => {
    if (!isLeader) return;
    const result = await listLessonCheckAccessRequests();
    if (result.ok) setRequests(result.requests);
  }, [isLeader]);

  useEffect(() => {
    loadActivities();
    loadRequests();
    const unsubscribe = subscribeLessonCheckUpdates(() => {
      if (batchSavingRef.current) return;
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
    const q = normalizeActivityTitle(query);
    const result = activities.filter((item) => {
      const open = isLeader || item.hasAccess;
      const pending = isLeader ? pendingActivityIds.has(item.id) : item.requestStatus === 'pending';
      const locked = !isLeader && !item.hasAccess && item.requestStatus !== 'pending';

      if (gradeFilter !== 'all' && String(item.grade || '') !== gradeFilter) return false;
      if (unitFilter !== 'all' && String(item.unitNo || '') !== unitFilter) return false;
      if (focusFilter === 'skills' && !['reading','listening','speaking'].includes(item.focusArea)) return false;
      if (!['all','skills'].includes(focusFilter) && item.focusArea !== focusFilter) return false;
      if (statusFilter === 'pending' && !pending) return false;
      if (statusFilter === 'ready' && !open) return false;
      if (statusFilter === 'favorites' && !favoriteSet.has(item.id)) return false;
      if (statusFilter === 'recent' && !recentIds.includes(item.id)) return false;
      const attr = attrMap.get(item.id);
      if (cefrFilter !== 'all' && attr?.difficulty !== cefrFilter) return false;
      if (deliveryFilter !== 'all' && attr?.delivery_mode !== deliveryFilter) return false;
      if (durationFilter !== 'all' && (
        !attr?.duration_minutes
        || (durationFilter === 'short' && attr.duration_minutes > 10)
        || (durationFilter === 'medium' && (attr.duration_minutes <= 10 || attr.duration_minutes > 25))
        || (durationFilter === 'long' && attr.duration_minutes <= 25)
      )) return false;
      if (statusFilter === 'locked' && !locked) return false;
      if (!q) return true;
      return matchesActivityTitle(item.title, q);
    });

    return [...result].sort((a, b) => {
      if (sortMode === 'favorites') return Number(favoriteSet.has(b.id))-Number(favoriteSet.has(a.id))
        || String(a.title||'').localeCompare(String(b.title||''),'vi');
      if (sortMode === 'recent') return (recentIds.indexOf(a.id)<0?Infinity:recentIds.indexOf(a.id))
        -(recentIds.indexOf(b.id)<0?Infinity:recentIds.indexOf(b.id));
      if (sortMode === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'vi');
      if (sortMode === 'unit') {
        return (Number(a.grade || 0) - Number(b.grade || 0))
          || (Number(a.unitNo || 0) - Number(b.unitNo || 0))
          || String(a.lessonTitle || '').localeCompare(String(b.lessonTitle || ''), 'vi')
          || String(a.title || '').localeCompare(String(b.title || ''), 'vi');
      }
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });
  }, [activities, favoriteSet, recentIds, attrMap, cefrFilter, durationFilter, deliveryFilter, focusFilter, gradeFilter, isLeader, language, pendingActivityIds, query, sortMode, statusFilter, unitFilter]);

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
  }, [cefrFilter, durationFilter, deliveryFilter, focusFilter, gradeFilter, query, sortMode, statusFilter, unitFilter]);

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

  function resetActivityBuilder() {
    pendingSingleSaveRef.current = null;
    setSaveFeedback(null);
    setSingleDraft(blankDraft());
    setBatchMode(false);
    setBatchDrafts(Array.from({ length: 10 }, () => blankDraft()));
    setActiveBatchIndex(0);
    setBatchProgress({ current: 0, total: 0 });
    setThumbnailDataUrl('');
    setThumbnailRemoveRequested(false);
  }

  function openNewActivity() {
    resetActivityBuilder();
    setShowEditor(true);
    setShowBuilder(true);
  }

  function closeBuilder() {
    if (saving) return;
    resetActivityBuilder();
    setShowBuilder(false);
    setShowEditor(true);
  }

  function enableBatchMode() {
    const startingDraft = { ...draft, id: '', thumbnailUrl: '' };
    setBatchDrafts(Array.from({ length: 10 }, (_, index) => (
      index === 0 ? startingDraft : { ...startingDraft, title: '', embedCode: '' }
    )));
    setActiveBatchIndex(0);
    setBatchMode(true);
    setShowEditor(true);
  }

  function disableBatchMode() {
    const otherFilled = batchDrafts.some((item, index) => (
      index !== activeBatchIndex && (item.title.trim() || item.embedCode.trim())
    ));
    if (otherFilled && !window.confirm(isVi
      ? 'Các hoạt động ở ô khác chưa được lưu. Chỉ giữ lại ô đang chọn?'
      : 'Other activity slots are not saved. Keep only the selected slot?')) return;
    setSingleDraft({ ...batchDrafts[activeBatchIndex] });
    setBatchMode(false);
    setActiveBatchIndex(0);
  }

  function clearBatchSlot() {
    if (saving) return;
    setDraft((current) => ({
      ...blankDraft(),
      grade: current.grade,
      unitNo: current.unitNo,
      unitTitle: current.unitTitle,
      lessonKey: current.lessonKey,
      lessonTitle: current.lessonTitle,
      className: current.className,
      type: current.type,
      focusArea: current.focusArea,
      notes: current.notes,
    }));
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
    pendingSingleSaveRef.current = null;
    setSaveFeedback(null);
    setSaving(true);
    const result = await getLessonCheckActivityContent(item.id);
    setSaving(false);
    if (!result.ok) {
      setNotice(result.message || (isVi ? 'Không mở được nội dung để chỉnh sửa.' : 'Could not open this activity for editing.'));
      return;
    }
    setBatchMode(false);
    setActiveBatchIndex(0);
    setSingleDraft({
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

  async function saveBatchActivities() {
    if (!isLeader || saving) return;
    const candidates = batchDrafts.map((item, index) => ({ item, index }))
      .filter(({ item }) => item.title.trim() || item.embedCode.trim());
    if (!candidates.length) {
      setNotice(isVi ? 'Hãy nhập ít nhất một hoạt động.' : 'Enter at least one activity.');
      return;
    }

    for (const { item, index } of candidates) {
      const embed = parseEmbed(item.embedCode);
      let message = '';
      if (!item.title.trim()) message = isVi ? 'Chưa có tên hoạt động.' : 'Activity title is missing.';
      else if (item.focusArea === 'unclassified') message = isVi ? 'Chưa chọn chuyên đề / kỹ năng.' : 'Choose a learning focus.';
      else if (!['url', 'html'].includes(embed.kind)) message = isVi ? 'Mã nhúng / URL / HTML không hợp lệ.' : 'Invalid embed code / URL / HTML.';
      if (message) {
        setActiveBatchIndex(index);
        setShowEditor(true);
        setNotice((isVi ? `Hoạt động ${index + 1}: ` : `Activity ${index + 1}: `) + message);
        return;
      }
    }

    setSaving(true);
    batchSavingRef.current = true;
    setBatchProgress({ current: 0, total: candidates.length });
    const remaining = [...batchDrafts];
    let savedCount = 0;
    let failedAt = -1;
    let failureMessage = '';

    try {
      for (const { item, index } of candidates) {
        setBatchProgress({ current: savedCount + 1, total: candidates.length });
        const embed = parseEmbed(item.embedCode);
        let result;
        try {
          result = await saveLessonCheckActivity({
            ...item,
            unitTitle: globalSuccessUnitTitle(item.grade, item.unitNo) || item.unitTitle,
            lessonTitle: globalSuccessLessonTitle(item.lessonKey) || item.lessonTitle,
            sourceHost: embed.kind === 'url' ? sourceHost(embed.source) : 'HTML / srcDoc',
          }, embed);
        } catch (exception) {
          result = { ok: false, message: exception?.message || 'Network error' };
        }
        if (!result.ok) {
          failedAt = index;
          failureMessage = result.message || (isVi ? 'Không thể lưu lên Supabase.' : 'Supabase save failed.');
          // Reuse the id when the row exists but its focus tag failed to update.
          if (result.id) remaining[index] = { ...item, id: result.id };
          break;
        }
        savedCount += 1;
        remaining[index] = { ...item, id: '', title: '', embedCode: '' };
      }
    } finally {
      batchSavingRef.current = false;
      setSaving(false);
      setBatchProgress({ current: 0, total: 0 });
      await loadActivities({ silent: true });
    }

    if (failedAt >= 0) {
      setBatchDrafts(remaining);
      setActiveBatchIndex(failedAt);
      setShowEditor(true);
      setNotice(isVi
        ? `Đã lưu ${savedCount}/${candidates.length} hoạt động. Ô ${failedAt + 1} bị lỗi: ${failureMessage}. Có thể bấm lưu lại, không tạo trùng ô đã thành công.`
        : `Saved ${savedCount}/${candidates.length}. Slot ${failedAt + 1} failed: ${failureMessage}. Retry without duplicating saved items.`);
      return;
    }

    resetActivityBuilder();
    setShowBuilder(false);
    setNotice(isVi ? `Đã tạo thành công ${savedCount} hoạt động.` : `Successfully created ${savedCount} activities.`);
  }

  async function saveActivity() {
    if (!isLeader) return;
    // A synchronous lock prevents two clicks from creating simultaneous records.
    if (savingSingleRef.current || saving) return;
    if (batchMode) {
      await saveBatchActivities();
      return;
    }
    const failValidation = (vi, en) => {
      const message = isVi ? vi : en;
      setSaveFeedback({ type: 'error', text: message });
      setNotice(message);
    };
    if (!draft.title.trim()) {
      failValidation('Hãy nhập tên hoạt động.', 'Enter an activity title.');
      return;
    }
    if (draft.focusArea === 'unclassified') {
      failValidation('Hãy chọn chuyên đề / kỹ năng trước khi lưu.', 'Choose a learning focus before saving.');
      return;
    }
    if (!previewReady) {
      failValidation('Mã nhúng chưa hợp lệ. Hãy dán URL HTTPS, iframe hoặc HTML.', 'Please provide a valid HTTPS URL, iframe, or HTML.');
      return;
    }

    const normalized = {
      ...draft,
      unitTitle: globalSuccessUnitTitle(draft.grade, draft.unitNo) || draft.unitTitle,
      lessonTitle: globalSuccessLessonTitle(draft.lessonKey) || draft.lessonTitle,
      sourceHost: parsedDraft.kind === 'url' ? sourceHost(parsedDraft.source) : 'HTML / srcDoc',
    };
    // Retain the same request ID for repeated saves of unchanged content.
    // If a response is lost after the database committed, the retry is a read
    // of the original receipt, not a second INSERT.
    const fingerprint = JSON.stringify({ draft: normalized, kind: parsedDraft.kind });
    if (pendingSingleSaveRef.current?.fingerprint !== fingerprint) {
      pendingSingleSaveRef.current = {
        fingerprint,
        requestId: crypto.randomUUID(),
      };
    }

    savingSingleRef.current = true;
    setSaving(true);
    setSaveFeedback({ type: 'progress', text: isVi ? 'Đang lưu an toàn lên Supabase…' : 'Saving safely to Supabase…' });
    try {
      const result = await saveLessonCheckActivityReliable(normalized, parsedDraft, {
        requestId: pendingSingleSaveRef.current.requestId,
      });
      if (!result.ok) {
        const message = result.message || (isVi ? 'Không thể lưu hoạt động. Hãy thử lại.' : 'Could not save activity. Please retry.');
        setSaveFeedback({ type: 'error', text: message });
        setNotice(message);
        return;
      }

      // The activity and learning-focus tag now commit as one transaction.
      // If a later thumbnail operation fails, preserve the saved activity ID
      // so retrying cannot create another activity.
      if (draft.id && (thumbnailDataUrl || thumbnailRemoveRequested)) {
        const thumbnailResult = thumbnailDataUrl
          ? await uploadLessonCheckActivityThumbnail(result.id, thumbnailDataUrl)
          : await removeLessonCheckActivityThumbnail(result.id);
        if (!thumbnailResult.ok) {
          setSingleDraft(previous => ({ ...previous, id: result.id }));
          pendingSingleSaveRef.current = null;
          const message = (isVi ? 'Hoạt động đã lưu, nhưng thumbnail chưa cập nhật: ' : 'Activity saved, but thumbnail failed: ')
            + (thumbnailResult.message || 'Unknown error');
          setSaveFeedback({ type: 'error', text: message });
          setNotice(message);
          void loadActivities({ silent: true }).catch(() => {});
          return;
        }
      }

      pendingSingleSaveRef.current = null;
      setSaveFeedback({ type: 'success', text: isVi ? 'Đã lưu hoạt động thành công.' : 'Activity saved successfully.' });
      setNotice(isVi ? 'Đã lưu hoạt động thành công.' : 'Activity saved successfully.');
      resetActivityBuilder();
      setShowBuilder(false);
      void loadActivities({ silent: true }).catch(() => {});
    } catch (exception) {
      const message = (isVi ? 'Gặp lỗi ngoài dự kiến: ' : 'Unexpected save error: ')
        + String(exception?.message || 'Network error');
      setSaveFeedback({ type: 'error', text: message });
      setNotice(message);
    } finally {
      savingSingleRef.current = false;
      setSaving(false);
    }
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
    markRecentActivity(item.id).then(result => {
      if (result.ok) setRecentIds(result.recentIds||[]);
    }).catch(() => {});
    // The journal is permission-scoped and records genuine opens, not inferred scores.
    logActivityUse(favoriteUserId,item,{eventType:'opened',className:queueClass||''})
      .then(result => {if(result.ok)setJournalReady(false);}).catch(() => {});
    return true;
  }

  async function startTeachingQueue(){
    if(!availableQueueItems.length){setNotice(isVi?'Chưa có hoạt động được cấp quyền trong hàng đợi.':'No authorized activities in the teaching queue.');return;}
    const opened=await openTeachingMode(availableQueueItems[0]);
    if(!opened)return;
    setClassroomQueueIndex(0);
    setCompletedQueueIds([]);
    setClassroomTimer(queueMinutes*60);
    setClassroomClockRunning(false);
    setQueueOpen(false);
  }

  async function completeQueueStep(){
    if (!teachingActivity || classroomQueueIndex === null || completingRef.current
        || completedQueueIds.includes(teachingActivity.id)) return;
    completingRef.current = true;
    setCompletionBusy(true);
    const completedId = teachingActivity.id;
    try {
      const logged=await logActivityUse(favoriteUserId,teachingActivity,{
        eventType:'completed',className:queueClass,duration:queueMinutes
      });
      if (logged.ok) {
        setCompletedQueueIds(ids => ids.includes(completedId) ? ids : [...ids,completedId]);
        setJournalReady(false);
        setNotice(isVi?'Đã ghi nhận hoạt động hoàn thành.':'Activity completion recorded.');
      } else setNotice(logged.message||(isVi?'Không ghi được nhật ký; hoạt động vẫn đang mở.':'Journal entry could not be saved; the activity remains open.'));
    } catch {
      setNotice(isVi?'Lỗi kết nối, vui lòng ghi nhận lại.':'Connection lost. Please retry.');
    } finally {
      completingRef.current = false;
      setCompletionBusy(false);
    }
  }

  async function jumpQueueTo(next){
    if(next<0||next>=availableQueueItems.length)return;
    const opened=await openTeachingMode(availableQueueItems[next]);
    if(!opened)return;
    setClassroomQueueIndex(next);
    setClassroomTimer(queueMinutes*60);
    setClassroomClockRunning(false);
  }

  async function batchSetMetadata(){
    if(!isLeader||!bulkIds.length||bulkBusy)return;
    if(!window.confirm(isVi?('Cập nhật phân loại cho '+bulkIds.length+' hoạt động đã chọn?'):('Update the classification of '+bulkIds.length+' selected activities?')))return;
    setBulkBusy(true);
    const updates=[];let errors=0;
    for(const id of bulkIds){
      const previous=attrMap.get(id)||{};
      const r=await saveActivityAttributes(id,{
        difficulty:bulkCefr, durationMinutes:bulkMinutes,
        deliveryMode:bulkDelivery,keywords:(previous.keywords||[]).join(', '),
        learningGoal:previous.learning_goal||''
      },favoriteUserId);
      if(r.ok) updates.push(r.item);else errors++;
    }
    setBulkBusy(false);
    if(updates.length)setAttributes(old=>[...old.filter(row=>!updates.some(u=>u.activity_id===row.activity_id)),...updates]);
    setNotice(isVi?('Đã cập nhật '+updates.length+' hoạt động'+(errors?' · '+errors+' lỗi, vui lòng kiểm tra quyền.':'')):('Updated '+updates.length+' activities'+(errors?' · '+errors+' errors; check permissions.':'')));
    if(!errors){setBulkMode(false);setBulkIds([]);}
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
    setClassroomQueueIndex(null);
    setClassroomClockRunning(false);
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
      <header className={'lcs-arcade-head lch-hero' + (hasHeroMedia ? ' has-custom-media' : '')}
        style={{'--lch-protection':activeHero.leftProtection / 100}}>
        {hasHeroMedia && <div className="lch-hero-media" aria-hidden="true">
          {activeHero.backgroundType==='video'
            ? <video src={activeHero.backgroundUrl} autoPlay muted loop playsInline preload="metadata"
              style={{objectFit:activeHero.backgroundFit,objectPosition:activeHero.positionX+'% '+activeHero.positionY+'%',opacity:activeHero.opacity/100}}/>
            : <img src={activeHero.backgroundUrl} alt="" decoding="async"
              style={{objectFit:activeHero.backgroundFit,objectPosition:activeHero.positionX+'% '+activeHero.positionY+'%',opacity:activeHero.opacity/100}}/>}
        </div>}
        <div className="lch-hero-protection" aria-hidden="true"/>
        {(!hasHeroMedia || activeHero.showMascot) ? <img
          className="lcs-hero-art"
          src="/lesson-check-hero-mascot-minimal.svg"
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable="false"
        /> : null}
        {isLeader && <button type="button" className="lch-hero-edit"
          onClick={openLessonHeroEditor}
          title={isVi?'Chỉnh sửa nền Hero Kiểm tra':'Edit Assessment Hero background'}
          aria-label={isVi?'Chỉnh sửa nền Hero Kiểm tra':'Edit Assessment Hero background'}>
          <Edit3 size={17} aria-hidden="true"/><span>{isVi?'Chỉnh sửa Hero':'Edit Hero'}</span>
        </button>}
        <div className="lcs-hero-main">
          <button className="lcs-library-back" type="button"
            onClick={() => { window.location.hash = '#/apps'; }}
            aria-label={isVi ? 'Quay lại Ứng dụng' : 'Back to Apps'}><ArrowLeft size={18}/></button>
          <div className="lcs-hero-copy">
            <div className="lcs-hero-kicker">
              <span className="lcs-hero-kicker-icon"><Gamepad2 size={16}/></span>
              <strong>BRIAN ACTIVITY ARCADE</strong>
              <span>GLOBAL SUCCESS</span>
            </div>
            <div className="lcs-arcade-title-row">
              <h1><span className="is-fun">Fun</span> <span className="is-for">for</span>
                <span className="is-assessment">Assessment</span></h1>
            </div>
            <p>{isVi ? 'Đổi mới kiểm tra đánh giá' : 'Innovating assessment and evaluation'}</p>
            <div className="lcs-hero-statline" aria-label={isVi ? 'Thống kê kho hoạt động' : 'Activity library statistics'}>
              <span><Gamepad2 size={14}/><b>{activities.length}</b>{isVi ? 'hoạt động' : 'activities'}</span>
              <span className="is-vocabulary"><BookOpen size={14}/><b>{focusCounts.vocabulary}</b>Vocabulary</span>
              <span className="is-grammar"><Layers3 size={14}/><b>{focusCounts.grammar}</b>Grammar</span>
              <span className="is-skills"><MonitorPlay size={14}/><b>{focusCounts.skills}</b>{isVi ? 'Kỹ năng' : 'Skills'}</span>
            </div>
            <div className="lcs-assessment-launchers">
              {isLeader && <button className="lcs-arcade-create" type="button" onClick={openNewActivity}>
                <span className="lcs-cta-icon"><Plus size={20}/></span>
                <span className="lcs-cta-copy"><strong>{isVi ? 'Tạo hoạt động' : 'Create activity'}</strong>
                <small>{isVi ? 'Thiết kế bài kiểm tra riêng' : 'Design your own activity'}</small></span>
                <ChevronRight className="lcs-cta-chevron" size={17}/></button>}
              <button className="lcs-open-reports" type="button"
                onClick={() => { setAssessmentWorkspaceView('reports'); setAssessmentWorkspaceVisible(true); }}>
                <span className="lcs-cta-icon"><BarChart3 size={20}/></span>
                <span className="lcs-cta-copy"><strong>{isVi ? 'Báo cáo' : 'Reports'}</strong>
                <small>{isVi ? 'Kết quả và phân tích chi tiết' : 'Results and insights'}</small></span>
                <ChevronRight className="lcs-cta-chevron" size={17}/></button>
              <button className="lcs-start-assessment" type="button"
                onClick={() => { setAssessmentWorkspaceView('session'); setAssessmentWorkspaceVisible(true); }}>
                <span className="lcs-cta-icon"><ClipboardCheck size={20}/></span>
                <span className="lcs-cta-copy"><strong>{isVi ? 'Bắt đầu đánh giá' : 'Start assessment'}</strong>
                <small>{isVi ? 'Tổ chức phiên cho lớp học' : 'Start a class session'}</small></span>
                <ChevronRight className="lcs-cta-chevron" size={17}/></button>
            </div>
          </div>
        </div>
      </header>
      <React.Suspense fallback={null}>
        <LessonCheckHeroEditor open={heroEditorOpen}
          initialConfig={heroDraft || heroPublished}
          currentUser={currentUser} language={language}
          onClose={() => {setHeroEditorOpen(false);setHeroPreview(null);}}
          onPreview={setHeroPreview}
          onPublished={setHeroPublished}/>
      </React.Suspense>

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
                  {!draft.id || batchMode ? (
                    <div className="lcs-bulk-manager lcs-field-wide">
                      <div className="lcs-bulk-manager-top">
                        <div>
                          <strong>{isVi ? 'Số lượng hoạt động' : 'Activity creation mode'}</strong>
                          <span>{isVi ? 'Lưu một hoạt động hoặc tạo tối đa 10 hoạt động cùng lúc.' : 'Save a single activity or up to 10 at once.'}</span>
                        </div>
                        <div className="lcs-bulk-mode-buttons" role="group" aria-label={isVi ? 'Chế độ tạo hoạt động' : 'Creation mode'}>
                          <button type="button" disabled={saving} className={!batchMode ? 'is-active' : ''} onClick={() => { if (batchMode) disableBatchMode(); }}>{isVi ? '1 hoạt động' : 'Single'}</button>
                          <button type="button" disabled={saving} className={batchMode ? 'is-active' : ''} onClick={() => { if (!batchMode) enableBatchMode(); }}>{isVi ? '10 hoạt động' : 'Up to 10'}</button>
                        </div>
                      </div>
                      {batchMode ? (
                        <>
                          <div className="lcs-bulk-slot-head">
                            <strong>{isVi ? `Đang chỉnh hoạt động ${activeBatchIndex + 1}/10` : `Editing activity ${activeBatchIndex + 1}/10`}</strong>
                            <span>{isVi ? `${populatedBatchCount} ô có nội dung · Ô trống sẽ được bỏ qua` : `${populatedBatchCount} filled · Blank slots will be skipped`}</span>
                          </div>
                          <div className="lcs-bulk-slots" role="group" aria-label={isVi ? 'Chọn ô hoạt động' : 'Choose activity slot'}>
                            {batchDrafts.map((item, index) => (
                              <button
                                key={index}
                                type="button"
                                disabled={saving}
                                className={`lcs-bulk-slot ${activeBatchIndex === index ? 'is-active' : ''} ${item.title.trim() || item.embedCode.trim() ? 'has-content' : ''}`}
                                onClick={() => setActiveBatchIndex(index)}
                                aria-pressed={activeBatchIndex === index}
                                title={item.title || (isVi ? `Hoạt động ${index + 1}` : `Activity ${index + 1}`)}
                              >
                                <span>{String(index + 1).padStart(2, '0')}</span>
                                {item.title.trim() && item.embedCode.trim() ? <Check size={13} /> : null}
                              </button>
                            ))}
                          </div>
                          <div className="lcs-bulk-slot-footer">
                            <span>{isVi ? 'Mỗi ô có thể chọn Unit, Lesson, chuyên đề và mã nhúng riêng.' : 'Each slot can have its own Unit, Lesson, learning focus and embed code.'}</span>
                            <button type="button" disabled={saving} onClick={clearBatchSlot}><Trash2 size={14} />{isVi ? 'Xóa nội dung ô này' : 'Clear this slot'}</button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
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
                    <button type="button" className="lcs-btn lcs-btn-primary" onClick={saveActivity} disabled={saving || thumbnailBusy} aria-busy={saving}>
                      {saving ? <LoaderCircle className="lcs-spin" size={18} /> : <Save size={18} />}
                      {batchMode
                        ? (saving
                          ? (isVi ? `Đang lưu ${batchProgress.current}/${batchProgress.total}…` : `Saving ${batchProgress.current}/${batchProgress.total}…`)
                          : (isVi ? `Lưu ${populatedBatchCount} hoạt động` : `Save ${populatedBatchCount} activities`))
                        : (draft.id ? (isVi ? 'Lưu thay đổi' : 'Save changes') : (isVi ? 'Lưu lên Supabase' : 'Save to Supabase'))}
                    </button>
                  </div>
                  {!batchMode && saveFeedback ? (
                    <div className={`lcs-save-feedback is-${saveFeedback.type}`}
                      role={saveFeedback.type === 'error' ? 'alert' : 'status'} aria-live="polite">
                      {saveFeedback.type === 'progress' ? <LoaderCircle size={17} className="lcs-spin" /> :
                        saveFeedback.type === 'success' ? <Check size={17} /> : <Info size={17} />}
                      <span>{saveFeedback.text}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="lcs-panel lcs-live-preview">
              <div className="lcs-panel-head">
                <div><span className="lcs-step">02</span><h2>{isVi ? 'Xem trước trực tiếp' : 'Live preview'}{batchMode ? ` · ${activeBatchIndex + 1}/10` : ''}</h2></div>
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

      <Assessment5Header activities={activities} favorites={favoriteIds} recentIds={recentIds}
        queueCount={availableQueueItems.length} language={language}
        onFavorites={() => {setFocusFilter('all');setStatusFilter('favorites');document.getElementById('lcs5-activity-library')?.scrollIntoView({behavior:'smooth',block:'start'});}}
        onRecent={() => {setFocusFilter('all');setStatusFilter('recent');document.getElementById('lcs5-activity-library')?.scrollIntoView({behavior:'smooth',block:'start'});}}
        onQueue={() => setQueueOpen(true)}
        onWorkspace={() => openWorkspaceTab('collections')} />
      <div className="lcs-a4-launcher">
        <button type="button" className={workbenchOpen ? 'is-active' : ''}
          onClick={() => setWorkbenchOpen(value => !value)}
          aria-expanded={workbenchOpen} aria-controls="assessment4-workbench">
          <Layers3 size={18} />
          <span>{isVi ? 'Trung tâm hoạt động & đánh giá 5.0' : 'Assessment 5.0 Workspace'}</span>
          <ChevronDown size={16} />
        </button>
        <small>{isVi ? 'Bộ sưu tập · Lesson Runner · Nhật ký · Can thiệp · Phân quyền' : 'Collections · Runner · Journal · Interventions · Permissions'}</small>
      </div>
      {workbenchOpen ? <div id="assessment4-workbench"><React.Suspense fallback={<div className="lcs-loading">{t('Đang tải Assessment 4.0…')}</div>}><Assessment4Workbench
        activities={activities} currentUser={currentUser} isLeader={isLeader}
        onLaunch={openTeachingMode} onRefresh={() => loadActivities({ silent: true })}
        initialTab={workbenchInitialTab} initialSelectedActivities={bulkIds}
        favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} language={language}
      /></React.Suspense></div> : null}

      <section className="lcs-arcade-library" id="lcs5-activity-library">
        <div className="lcs-arcade-nav">
          <nav className="lcs-arcade-tabs" aria-label={isVi ? 'Bộ lọc hoạt động' : 'Activity filters'}>
            <button type="button" className={focusFilter === 'all' && statusFilter === 'all' ? 'is-active' : ''} onClick={() => { setFocusFilter('all'); setStatusFilter('all'); setShowAccessQueue(false); }}>
              <Grid2X2 size={18} /><strong>{isVi ? 'Tất cả' : 'All'}</strong><span>{activities.length}</span>
            </button>
            <button type="button" className={focusFilter === 'vocabulary' && statusFilter === 'all' ? 'is-active is-vocabulary' : 'is-vocabulary'} onClick={() => { setFocusFilter('vocabulary'); setStatusFilter('all'); setShowAccessQueue(false); }}>
              <BookOpen size={18} /><strong>Vocabulary</strong><span>{focusCounts.vocabulary}</span>
            </button>
            <button type="button" className={focusFilter === 'grammar' && statusFilter === 'all' ? 'is-active is-grammar' : 'is-grammar'} onClick={() => { setFocusFilter('grammar'); setStatusFilter('all'); setShowAccessQueue(false); }}>
              <Layers3 size={18} /><strong>Grammar</strong><span>{focusCounts.grammar}</span>
            </button>
            <button type="button" className={focusFilter === 'skills' && statusFilter === 'all' ? 'is-active is-skills' : 'is-skills'} onClick={() => { setFocusFilter('skills'); setStatusFilter('all'); setShowAccessQueue(false); }}>
              <MonitorPlay size={18} /><strong>{isVi ? 'Kỹ năng' : 'Skills'}</strong><span>{focusCounts.skills}</span>
            </button>
            <button
              type="button"
              className={statusFilter === 'favorites' ? 'is-active is-favorites' : 'is-favorites'}
              aria-pressed={statusFilter === 'favorites'}
              onClick={() => { setFocusFilter('all'); setStatusFilter('favorites'); setShowAccessQueue(false); }}
            >
              <Heart size={18} fill={statusFilter === 'favorites' ? 'currentColor' : 'none'} />
              <strong>{isVi ? 'Yêu thích' : 'Favorites'}</strong><span>{favoriteCount}</span>
            </button>
            {!isLeader ? (
              <button
                type="button"
                className={statusFilter === 'ready' ? 'is-active is-granted' : 'is-granted'}
                aria-pressed={statusFilter === 'ready'}
                aria-label={isVi ? 'Hoạt động đã được cấp quyền' : 'Activities with granted access'}
                onClick={() => { setFocusFilter('all'); setStatusFilter('ready'); setShowAccessQueue(false); }}
              >
                <UserCheck size={18} /><strong>{isVi ? 'Đã được cấp quyền' : 'Granted access'}</strong><span>{grantedCount}</span>
              </button>
            ) : null}
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
            <label className="lcs-arcade-sort" title={isVi ? 'Sắp xếp' : 'Sort'}>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                <option value="newest">{isVi ? 'Mới cập nhật' : 'Recently updated'}</option>
                <option value="title">A → Z</option>
                <option value="unit">{isVi ? 'Theo Unit' : 'By Unit'}</option>
                <option value="favorites">{isVi ? 'Yêu thích lên trước' : 'Favorites first'}</option>
                <option value="recent">{isVi ? 'Vừa sử dụng' : 'Recently used'}</option>
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

        <div className="lcs5-command-tools" aria-label={isVi?'Công cụ thư viện Assessment 5.0':'Assessment 5.0 library tools'}>
          <strong>{isVi ? 'Trình quản lý học liệu' : 'Activity library manager'}</strong>
          <div className="lcs5-tool-buttons">
            <button type="button" className={viewMode==='grid'?'is-active':''} onClick={()=>setViewMode('grid')} aria-pressed={viewMode==='grid'}><Grid2X2 size={15}/> Grid</button>
            <button type="button" className={viewMode==='list'?'is-active':''} onClick={()=>setViewMode('list')} aria-pressed={viewMode==='list'}><List size={15}/> List</button>
            <button type="button" className={advancedFilters?'is-active':''} onClick={()=>setAdvancedFilters(v=>!v)} aria-expanded={advancedFilters}><SlidersHorizontal size={15}/>{isVi?'Lọc nâng cao':'More filters'}</button>
            {isLeader?<button type="button" className={bulkMode?'is-active':''} onClick={()=>{setBulkMode(v=>!v);setBulkIds([]);}} aria-pressed={bulkMode}><CheckSquare size={15}/>{isVi?'Chọn nhiều':'Bulk select'}</button>:null}
            <button type="button" className="is-queue" onClick={()=>setQueueOpen(true)}><ListChecks size={16}/>{isVi?'Buổi dạy':'Teaching queue'} · {availableQueueItems.length}</button>
          </div>
        </div>
        <div className="lcs-arcade-filterbar">
          <span className="lcs-filter-mark"><Filter size={17} /></span>
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} aria-label={isVi ? 'Khối' : 'Grade'}>
            <option value="all">{isVi ? 'Tất cả khối' : 'All grades'}</option><option value="10">Lớp 10</option><option value="11">Lớp 11</option><option value="12">Lớp 12</option>
          </select>
          <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} aria-label="Unit">
            <option value="all">{isVi ? 'Tất cả Unit' : 'All Units'}</option>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Unit {index + 1}</option>)}
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
          <div className="lcs-filter-quick-search lcs-search-always-visible" role="search"
            aria-label={isVi ? 'Tìm hoạt động theo tên' : 'Find an activity by name'}
            onClick={event => { if (!event.target.closest('button')) searchInputRef.current?.focus(); }}>
            <Search size={18} aria-hidden="true" />
            <span className="lcs-search-visible-label">{isVi ? 'Tìm tên' : 'Find name'}</span>
            <input
              ref={searchInputRef}
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setQuery('');
              }}
              aria-label={isVi ? 'Tìm nhanh theo tên hoạt động' : 'Quick search by activity name'}
              placeholder={isVi ? 'Tìm nhanh tên hoạt động…' : 'Search activity names…'}
              autoComplete="off"
              spellCheck={false}
              maxLength={120}
            />
            {query ? (
              <button
                type="button"
                className="lcs-filter-quick-clear"
                aria-label={isVi ? 'Xóa từ khóa tìm kiếm' : 'Clear search'}
                title={isVi ? 'Xóa từ khóa' : 'Clear search'}
                onClick={() => setQuery('')}
              ><X size={16} /></button>
            ) : null}
          </div>
          {(query || gradeFilter !== 'all' || unitFilter !== 'all' || focusFilter !== 'all' || statusFilter !== 'all' || sortMode !== 'newest') ? (
            <button className="lcs-arcade-clear" type="button" onClick={() => {
              setQuery('');
              setGradeFilter('all');
              setUnitFilter('all');
              setFocusFilter('all');
              setStatusFilter('all');
              setSortMode('newest');
            }}><X size={14} />{isVi ? 'Xóa lọc' : 'Clear'}</button>
          ) : null}
        </div>

        {advancedFilters?<div className="lcs5-advanced-filters" aria-label={isVi?'Bộ lọc nâng cao':'Advanced filters'}>
          <label>CEFR<select value={cefrFilter} onChange={e=>setCefrFilter(e.target.value)}><option value="all">{t('Tất cả')}</option>{['A1','A2','B1','B2','C1','C2','mixed','unclassified'].map(v=><option key={v}>{v}</option>)}</select></label>
          <label>{isVi?'Thời lượng':'Duration'}<select value={durationFilter} onChange={e=>setDurationFilter(e.target.value)}><option value="all">{t('Tất cả')}</option><option value="short">{t('≤10 phút')}</option><option value="medium">{t('11–25 phút')}</option><option value="long">{t('>25 phút')}</option></select></label>
          <label>{isVi?'Hình thức':'Mode'}<select value={deliveryFilter} onChange={e=>setDeliveryFilter(e.target.value)}><option value="all">{t('Tất cả')}</option><option value="individual">{t('Cá nhân')}</option><option value="group">{t('Nhóm')}</option><option value="whole_class">{t('Cả lớp')}</option><option value="hybrid">{t('Kết hợp')}</option></select></label>
          <button type="button" onClick={()=>{setCefrFilter('all');setDurationFilter('all');setDeliveryFilter('all');}}>{isVi?'Xóa lọc nâng cao':'Reset advanced'}</button>
        </div>:null}
        {isLeader && bulkMode ? <div className="lcs5-bulk-panel">
          <strong>{bulkIds.length} {isVi?'hoạt động đã chọn':'selected'}</strong>
          <button type="button" onClick={()=>setBulkIds(old=>[...new Set([...old,...pagedActivities.map(a=>a.id)])].slice(0,20))}>{isVi?'Chọn trang này':'Select page'}</button>
          <button type="button" onClick={()=>setBulkIds([])}>{isVi?'Bỏ chọn':'Deselect'}</button>
          <label>CEFR <select value={bulkCefr} onChange={e=>setBulkCefr(e.target.value)}>{['A1','A2','B1','B2','C1','C2','mixed','unclassified'].map(v=><option key={v}>{v}</option>)}</select></label>
          <label>{isVi?'Phút':'Minutes'} <select value={bulkMinutes} onChange={e=>setBulkMinutes(Number(e.target.value))}>{[5,10,15,20,25,30,40,45,60].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
          <label>{isVi?'Tổ chức':'Delivery'}<select value={bulkDelivery} onChange={e=>setBulkDelivery(e.target.value)}><option value="whole_class">{t('Cả lớp')}</option><option value="group">{t('Nhóm')}</option><option value="individual">{t('Cá nhân')}</option><option value="hybrid">{t('Kết hợp')}</option></select></label>
          <button type="button" disabled={!bulkIds.length||bulkBusy} onClick={batchSetMetadata}>{bulkBusy?t('Đang lưu…'):(isVi?'Áp dụng nhãn':'Apply labels')}</button>
          <button type="button" disabled={!bulkIds.length} onClick={()=>openWorkspaceTab('permissions')}>{isVi?'Cấp quyền nhóm':'Bulk grants'}</button>
        </div> : null}
        <div className="lcs-arcade-results-head">
          <span aria-live="polite" aria-atomic="true">{query.trim()
            ? (isVi ? `Tìm “${query.trim()}”: ${filteredActivities.length} kết quả` : `Search “${query.trim()}”: ${filteredActivities.length} matches`)
            : filteredActivities.length
              ? (isVi ? `Hiển thị ${pageStart}–${pageEnd} / ${filteredActivities.length}` : `Showing ${pageStart}–${pageEnd} of ${filteredActivities.length}`)
              : (isVi ? 'Không có kết quả' : 'No results')}</span>
          {!loading && filteredActivities.length > 0 ? (
            <div className="lcs-arcade-pagination-controls">
              <div className="lcs-pagination-compact">
                <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} aria-label={isVi ? 'Trang trước' : 'Previous page'}><ChevronLeft size={16} /></button>
                {paginationPages.map((pageNumber) => <button key={pageNumber} type="button" className={pageNumber === page ? 'is-active' : ''} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}
                <button type="button" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} aria-label={isVi ? 'Trang sau' : 'Next page'}><ChevronRight size={16} /></button>
              </div>
            </div>
          ) : null}
        </div>

        {loading ? <LoadingBlock language={language} /> : !filteredActivities.length ? (
          <div className="lcs-empty-library">
            {statusFilter === 'favorites' ? <Heart /> : statusFilter === 'ready' ? <UserCheck /> : <Layers3 />}
            <h3>{query.trim() && activities.length
              ? (isVi ? `Không tìm thấy hoạt động có tên chứa “${query.trim()}”.` : `No activity name matches “${query.trim()}”.`)
              : statusFilter === 'favorites' && !favoriteCount
              ? (isVi ? 'Bạn chưa lưu trò chơi yêu thích nào.' : 'You have no favorite games yet.')
              : statusFilter === 'ready' && !grantedCount
              ? (isVi ? 'Bạn chưa có hoạt động nào được cấp quyền.' : 'No activities have been granted to you yet.')
              : activities.length
                ? (isVi ? 'Không có hoạt động phù hợp bộ lọc.' : 'No activities match these filters.')
                : (isVi ? 'Chưa có hoạt động nào trên Supabase.' : 'No activities in Supabase yet.')}
            </h3>
            {query.trim() ? (
              <button type="button" className="lcs-granted-empty-browse" onClick={() => {setQuery('');searchInputRef.current?.focus();}}>
                {isVi ? 'Xóa từ khóa tìm kiếm' : 'Clear search'}
              </button>
            ) : ['ready', 'favorites'].includes(statusFilter) ? (
              <button type="button" className="lcs-granted-empty-browse" onClick={() => {
                setStatusFilter('all');
                setFocusFilter('all');
                setGradeFilter('all');
                setUnitFilter('all');
                setQuery('');
              }}>{isVi ? 'Xem tất cả hoạt động' : 'Browse all activities'}</button>
            ) : null}
          </div>
        ) : (
          <div className={`lcs-arcade-grid lcs-arcade-grid--soft-enter ${viewMode==='list'?'lcs5-list-view':''}`} key={page}>
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
                    {bulkMode&&isLeader?<label className="lcs5-card-bulk-check"><input type="checkbox" checked={bulkIds.includes(item.id)} onChange={e=>setBulkIds(ids=>e.target.checked?[...new Set([...ids,item.id])].slice(0,20):ids.filter(id=>id!==item.id))}/> {isVi?'Chọn hoạt động':'Select activity'}</label>:null}
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
                        <button type="button"
                          className={favoriteSet.has(item.id) ? 'lcs-favorite-heart is-saved' : 'lcs-favorite-heart'}
                          aria-label={favoriteSet.has(item.id)
                            ? (isVi ? 'Bỏ khỏi mục yêu thích' : 'Remove from favorites')
                            : (isVi ? 'Thêm vào mục yêu thích' : 'Add to favorites')}
                          aria-pressed={favoriteSet.has(item.id)}
                          title={favoriteSet.has(item.id) ? (isVi ? 'Bỏ yêu thích' : 'Unfavorite') : (isVi ? 'Thả tim · Yêu thích' : 'Save to favorites')}
                          disabled={!favoritesReady || favoriteSavingIds.includes(item.id)}
                          onClick={() => toggleFavorite(item.id)}>
                          <Heart size={18} fill={favoriteSet.has(item.id) ? 'currentColor' : 'none'} />
                        </button>
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

                    {journalReady && journalById.has(item.id) ? <small className="lcs5-usage-tag">
                      <Clock3 size={12}/> {journalById.get(item.id).opened+1*journalById.get(item.id).completed} {isVi?'lượt sử dụng':'uses'}
                    </small>:null}
                    <div className="lcs5-card-toolbar">
                      <button type="button" onClick={()=>{setPreviewActivity(item);openActivityJournal();}} aria-label={'Xem nhanh '+item.title}><Info size={14}/>{isVi?'Xem nhanh':'Preview'}</button>
                      <button type="button" className={queueSet.has(item.id)?'is-queued':''}
                        disabled={queueBusy||!queueReady||queueSet.has(item.id)||(!isLeader&&!item.hasAccess)}
                        onClick={()=>addToQueue(item.id)}
                        aria-label={'Thêm '+item.title+' vào buổi dạy'}><Plus size={14}/>{queueSet.has(item.id)?'Đã thêm':(isVi?'Buổi dạy':'Queue')}</button>
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
          language={language}
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

      {previewActivity ? <Assessment5Preview language={language} activity={previewActivity} attributes={attrMap.get(previewActivity.id)}
        insight={journalById.get(previewActivity.id)}
        canOpen={isLeader||previewActivity.hasAccess}
        isFavorite={favoriteSet.has(previewActivity.id)}
        inQueue={queueSet.has(previewActivity.id)}
        onClose={()=>setPreviewActivity(null)}
        onFavorite={id=>toggleFavorite(id)}
        onAddQueue={addToQueue}
        queueReady={queueReady && !queueBusy}
        onTeach={async item=>{setPreviewActivity(null);await openTeachingMode(item);}}/> : null}
      {queueOpen?<Assessment5Queue language={language} items={availableQueueItems} busy={queueBusy} ready={queueReady} className={queueClass}
        minutes={queueMinutes} onClassChange={setQueueClass}
        onMinutesChange={value=>setQueueMinutes(Math.max(1,Math.min(60,Number(value)||1)))}
        onMove={moveQueue}
        onRemove={id=>updateQueue(queueIds.filter(x=>x!==id))}
        onClear={()=>{if(window.confirm(isVi?'Xóa toàn bộ hàng đợi buổi dạy?':'Clear the entire teaching queue?'))updateQueue([]);}}
        onClose={async()=>{
          if (queueBusy) return;
          // A failed initial load must never trap the teacher in a dialog.
          if (!queueReady) { setQueueOpen(false); return; }
          const saved=await updateQueue(queueIds,queueClass,queueMinutes);
          if (saved) setQueueOpen(false);
        }}
        onStart={async()=>{const saved=await updateQueue(queueIds,queueClass,queueMinutes);if(saved)await startTeachingQueue();}}
      />:null}
      {teachingActivity ? (
        <div className="lcs-teach-overlay" ref={teachRef}>
          <header>
            <div><span>{isVi ? 'CHẾ ĐỘ DẠY' : 'TEACHING MODE'}</span><strong>{teachingActivity.title}</strong><small>Global Success {teachingActivity.grade} · Unit {teachingActivity.unitNo} · {teachingActivity.lessonTitle}</small></div>
            <div>
              {classroomQueueIndex!==null?<>
                <span className="lcs5-classroom-step">{isVi?'Buổi dạy':'Teaching session'} {classroomQueueIndex+1}/{availableQueueItems.length}</span>
                <span className="lcs5-classroom-timer" aria-label={isVi?'Thời gian còn lại':'Time remaining'}>{String(Math.floor(classroomTimer/60)).padStart(2,'0')}:{String(classroomTimer%60).padStart(2,'0')}</span>
                <span className="lcs5-classroom-navigation">
                  <button type="button" onClick={()=>setClassroomClockRunning(v=>!v)} aria-label={classroomClockRunning?(isVi?'Tạm dừng đồng hồ':'Pause timer'):(isVi?'Bắt đầu đồng hồ':'Start timer')}>{classroomClockRunning?<Pause size={16}/>:<Play size={16}/>}</button>
                  <button type="button" onClick={()=>{setClassroomClockRunning(false);setClassroomTimer(queueMinutes*60);}} aria-label={isVi?'Đặt lại đồng hồ':'Reset timer'}><RotateCcw size={15}/></button>
                  <button type="button" onClick={completeQueueStep}
                    disabled={completionBusy || completedQueueIds.includes(teachingActivity.id)}
                    aria-label={completedQueueIds.includes(teachingActivity.id)?(isVi?'Đã ghi nhận hoàn thành':'Completion recorded'):(isVi?'Ghi nhận hoàn thành':'Record completion')}>
                    <Check size={16}/>{completedQueueIds.includes(teachingActivity.id)?(isVi?'Đã ghi nhận':'Recorded'):(completionBusy?t('Đang lưu…'):(isVi?'Đã xong':'Complete'))}
                  </button>
                  <button type="button" disabled={classroomQueueIndex===0||teachingLoading} onClick={()=>jumpQueueTo(classroomQueueIndex-1)}><ChevronLeft size={16}/>{t('Trước')}</button>
                  <button type="button" disabled={classroomQueueIndex>=availableQueueItems.length-1||teachingLoading} onClick={()=>jumpQueueTo(classroomQueueIndex+1)} >{t('Tiếp')} <ChevronRight size={16}/></button>
                </span>
              </>:null}
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
