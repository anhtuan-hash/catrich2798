import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/v1093.css';
import './styles/v1094.css';
import './styles/v1095.css';
import './styles/v1096.css';
import './styles/v1097.css';
import './styles/v1098.css';
import { APPS, GAME_APPS, SPECIAL_TOOLS, RESOURCE_ITEMS } from './data/apps.js';
import { getAppDesignProfile } from './data/designProfiles.js';
import GlobalFlatNavigation from './components/GlobalFlatNavigation.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import Footer from './components/Footer.jsx';
import PermissionRequestButton from './components/PermissionRequestButton.jsx';
import { initializeAuthSession, logoutUser, subscribeToAuthChanges } from './utils/auth.js';
import { getActiveAiConfig, getAiConfigs, getAiProvider, getProviderSummary, setAiStorageUser } from './utils/aiProviders.js';
import { getFirstAllowedRoute, getRoutePermissionId, getPermissionItem, hasRouteAccess } from './utils/permissions.js';
import { installStoredPersonalFont, waitForPersonalFontLoad } from './utils/personalFont.js';
import { applyPerformanceAttributes, getStoredMotionMode, getStoredPerformanceMode, resolveMotionMode, resolvePerformanceMode } from './utils/performanceProfile.js';
import { setLibraryStorageUser } from './utils/library.js';
import { recordAppUsage } from './utils/appUsage.js';
import { setTrashStorageUser } from './utils/trash.js';
import { runConfigurationMigrations } from './utils/configMigration.js';
import { setAiGovernanceUser } from './utils/aiGovernance.js';
import { bootRuntimeCore } from './services/runtime/core.js';
import { installAccessibilityBootstrap } from './utils/accessibility.js';
import { collectWebVitals } from './utils/webVitals.js';
import { installPwaEventCapture, registerBrianPwa } from './utils/pwa.js';

runConfigurationMigrations();
installAccessibilityBootstrap();
installPwaEventCapture();
registerBrianPwa().catch((error) => console.warn('[PWA] registration failed', error));
collectWebVitals();
installStoredPersonalFont();
waitForPersonalFontLoad();
bootRuntimeCore().catch((error) => console.warn('[RuntimeCore] boot failed', error));

const PRELOAD_RECOVERY_KEY = 'bes-vite-preload-recovery-v1086';
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    let shouldReload = true;
    try {
      const lastReload = Number(window.sessionStorage.getItem(PRELOAD_RECOVERY_KEY) || 0);
      shouldReload = !lastReload || Date.now() - lastReload > 30000;
      if (shouldReload) window.sessionStorage.setItem(PRELOAD_RECOVERY_KEY, String(Date.now()));
    } catch { /* reload once even when storage is unavailable */ }
    if (shouldReload) window.location.reload();
  });
  window.setTimeout(() => {
    try { window.sessionStorage.removeItem(PRELOAD_RECOVERY_KEY); } catch { /* optional */ }
  }, 8000);
}

const Home = lazy(() => import('./pages/Home.jsx'));
const WebApps = lazy(() => import('./pages/WebApps.jsx'));
const Games = lazy(() => import('./pages/Games.jsx'));
const SpecialTools = lazy(() => import('./pages/SpecialTools.jsx'));
const Resources = lazy(() => import('./pages/Resources.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const ToolPage = lazy(() => import('./pages/ToolPage.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Library = lazy(() => import('./pages/Library.jsx'));
const ResourceLibrary = lazy(() => import('./pages/ResourceLibrary.jsx'));
const NewsReader = lazy(() => import('./pages/NewsReader.jsx'));
const StudentPractice = lazy(() => import('./pages/StudentPractice.jsx'));
const QAHealthCheck = lazy(() => import('./pages/QAHealthCheck.jsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const SupabaseSetup = lazy(() => import('./pages/SupabaseSetup.jsx'));
const DepartmentWorkspace = lazy(() => import('./pages/DepartmentWorkspace.jsx'));
const HomeroomWorkspace = lazy(() => import('./pages/HomeroomWorkspace.jsx'));
const HomeroomPortal = lazy(() => import('./pages/HomeroomPortal.jsx'));
const FullMotionEffects = lazy(() => import('./components/FullMotionEffects.jsx')); // clean Metro motion layer
const GlobalMusicPlayer = lazy(() => import('./components/GlobalMusicPlayer.jsx'));
const StatusMenuBar = lazy(() => import('./components/StatusMenuBar.jsx'));
const UniversalAIAssist = lazy(() => import('./components/UniversalAIAssist.jsx'));
const GlobalAIIndicator = lazy(() => import('./components/GlobalAIIndicator.jsx'));
const GlobalCommandPalette = lazy(() => import('./components/GlobalCommandPalette.jsx'));
const GlobalAutosave = lazy(() => import('./components/GlobalAutosave.jsx'));
const GlobalRuntimeGuard = lazy(() => import('./components/GlobalRuntimeGuard.jsx'));
const TrashCenter = lazy(() => import('./pages/TrashCenter.jsx'));
const SystemHealthCenter = lazy(() => import('./pages/SystemHealthCenter.jsx'));
const WorkspaceTabs = lazy(() => import('./components/WorkspaceTabs.jsx'));
const ContentTransferHub = lazy(() => import('./components/ContentTransferHub.jsx'));
const TransferInboxBanner = lazy(() => import('./components/TransferInboxBanner.jsx'));
const SyncQueueIndicator = lazy(() => import('./components/SyncQueueIndicator.jsx'));
const AIGovernanceCenter = lazy(() => import('./pages/AIGovernanceCenter.jsx'));
const WorkHub = lazy(() => import('./pages/WorkHub.jsx'));
const KnowledgeHub = lazy(() => import('./pages/KnowledgeHub.jsx'));
const AIWorkspace = lazy(() => import('./pages/AIWorkspace.jsx'));
const ContentFactory = lazy(() => import('./pages/ContentFactory.jsx'));
const AssessmentCore = lazy(() => import('./pages/AssessmentCore.jsx'));
const LearningIntelligence = lazy(() => import('./pages/LearningIntelligence.jsx'));
const PlatformReadiness = lazy(() => import('./pages/PlatformReadiness.jsx'));
const AutomationCenter = lazy(() => import('./pages/AutomationCenter.jsx'));
const CloudOperations = lazy(() => import('./pages/CloudOperations.jsx'));
const CollaborationHub = lazy(() => import('./pages/CollaborationHub.jsx'));
const DataGovernance = lazy(() => import('./pages/DataGovernance.jsx'));
const GlobalAccessibilityAnnouncer = lazy(() => import('./components/GlobalAccessibilityAnnouncer.jsx'));
const PwaUpdateBanner = lazy(() => import('./components/PwaUpdateBanner.jsx'));

const ROUTES = ['home', 'apps', 'news', 'games', 'tools', 'department', 'homeroom', 'homeroom-portal', 'resources', 'library', 'resource-library', 'knowledge-hub', 'work-hub', 'ai-workspace', 'content-factory', 'assessment-core', 'learning-intelligence', 'platform-readiness', 'automation-center', 'cloud-operations', 'collaboration-hub', 'data-governance', 'practice', 'qa', 'ai-governance', 'trash', 'contact', 'settings', 'login', 'register', 'admin', 'setup'];
const PUBLIC_ROUTES = new Set(['home', 'resources', 'contact', 'login', 'register', 'setup', 'homeroom-portal']);

function getInitialRoute() {
  const href = window.location.href || '';
  const cleanHash = window.location.hash.replace('#/', '').replace('#', '').trim();
  if (href.includes('type=recovery') || href.includes('recovery=1')) return 'login';
  const routeOnly = cleanHash.split('?')[0].split('&')[0];
  return routeOnly || 'home';
}


const ROUTE_DESIGN_PROFILES = {
  home: { accent: '#FFC69D', soft: '#FFF1E2', ink: '#171312' },
  apps: { accent: '#F05A7E', soft: '#FFE1EA', ink: '#2F111A' },
  news: { accent: '#167D78', soft: '#DDF5F1', ink: '#083B38' },
  games: { accent: '#5B2A86', soft: '#E9DAFF', ink: '#20102F' },
  department: { accent: '#3B4CCA', soft: '#E0E4FF', ink: '#12183B' },
  homeroom: { accent: '#1F8F70', soft: '#DDF7ED', ink: '#0B382B' },
  'homeroom-portal': { accent: '#1F8F70', soft: '#DDF7ED', ink: '#0B382B' },
  library: { accent: '#6FBA7B', soft: '#E4F6E6', ink: '#17351D' },
  'resource-library': { accent: '#2878D0', soft: '#E7F2FF', ink: '#0D2947' },
  'knowledge-hub': { accent: '#315FC4', soft: '#EAF0FF', ink: '#10264A' },
  'work-hub': { accent: '#14866D', soft: '#E6F8F2', ink: '#0B3A31' },
  'ai-workspace': { accent: '#6255D9', soft: '#EEECFF', ink: '#211A55' },
  'content-factory': { accent: '#EF7A42', soft: '#FFF0E8', ink: '#5C2410' },
  'assessment-core': { accent: '#CC7621', soft: '#FFF3DF', ink: '#522A08' },
  'learning-intelligence': { accent: '#1A7D73', soft: '#E4F7F3', ink: '#0B3C38' },
  'platform-readiness': { accent: '#0F766E', soft: '#DFF7F4', ink: '#0C3B38' },
  'automation-center': { accent: '#1269B0', soft: '#E4F3FF', ink: '#0B3154' },
  'cloud-operations': { accent: '#167B68', soft: '#E4F6EF', ink: '#183F3C' },
  'collaboration-hub': { accent: '#315FC4', soft: '#EAF0FF', ink: '#10264A' },
  'data-governance': { accent: '#A24B35', soft: '#FFF0E8', ink: '#4A1E14' },
  practice: { accent: '#00A4EF', soft: '#DCF4FF', ink: '#063048' },
  admin: { accent: '#D13438', soft: '#FFE1E3', ink: '#351014' },
  settings: { accent: '#123C69', soft: '#DCEBFA', ink: '#07192C' },
  resources: { accent: '#D99A1E', soft: '#FFF0C8', ink: '#392406' },
  contact: { accent: '#00A6A6', soft: '#D8FAFA', ink: '#073434' },
  qa: { accent: '#123C69', soft: '#DCEBFA', ink: '#07192C' },
  'ai-governance': { accent: '#6D45C6', soft: '#EEE7FF', ink: '#24114F' },
  trash: { accent: '#A43B57', soft: '#FFE5EC', ink: '#3C101D' },
  tools: { accent: '#E86D1F', soft: '#FFE3CD', ink: '#211510' },
  login: { accent: '#191515', soft: '#F3DFD8', ink: '#191515' },
  register: { accent: '#00A6A6', soft: '#D8FAFA', ink: '#073434' },
  setup: { accent: '#2E9E5D', soft: '#DDF6E6', ink: '#0F2D1C' },
};

function getActiveDesignProfile(currentRoute, selectedTool) {
  if (currentRoute === 'tool' && selectedTool?.slug) return getAppDesignProfile(selectedTool.slug);
  return ROUTE_DESIGN_PROFILES[currentRoute] || ROUTE_DESIGN_PROFILES.home;
}

function normalizeMetroIntensity(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === ['vi', 'vid'].join('')) return 'strong';
  if (raw === ['ne', 'on'].join('')) return 'bold';
  return ['soft', 'balanced', 'strong', 'bold'].includes(raw) ? raw : 'balanced';
}

function App() {
  const [route, setRoute] = useState(getInitialRoute);
  const [language, setLanguage] = useState(() => localStorage.getItem('bet-language') || 'vi');
  const [theme, setTheme] = useState(() => localStorage.getItem('bet-theme') || 'light');
  const [apiKey, setApiKey] = useState(() => getActiveAiConfig().apiKey || '');
  const [aiModel, setAiModel] = useState(() => getActiveAiConfig().model || 'gemini-flash-latest');
  const [aiProvider, setAiProviderState] = useState(() => getAiProvider());
  const [providerConfigs, setProviderConfigs] = useState(() => getAiConfigs());
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loadingState, setLoadingState] = useState({ active: false, label: '' });
  const [aiOperationState, setAiOperationState] = useState({ active: false, label: '', provider: '' });
  const aiOperationIdsRef = useRef(new Set());
  const aiIndicatorHideTimerRef = useRef(null);
  const languageRef = useRef(language);
  const [fontScale, setFontScale] = useState(() => {
    const saved = Number(localStorage.getItem('bes-font-scale') || 100);
    return [100, 110, 120, 130].includes(saved) ? saved : 100;
  });
  const [tileLaunch, setTileLaunch] = useState(null);
  const [motionMode, setMotionMode] = useState(getStoredMotionMode);
  const [performanceMode, setPerformanceMode] = useState(getStoredPerformanceMode);
  const [themeIntensity, setThemeIntensityState] = useState(() => normalizeMetroIntensity(localStorage.getItem('bes-theme-intensity') || 'balanced'));
  const setThemeIntensity = (value) => setThemeIntensityState(normalizeMetroIntensity(value));
  const [tileBorder, setTileBorder] = useState(() => localStorage.getItem('bes-tile-border') || 'soft');
  const [indicatorMode, setIndicatorMode] = useState(() => localStorage.getItem('bes-windows-indicator') || 'on');
  const resolvedPerformance = resolvePerformanceMode(performanceMode);
  const effectiveMotionMode = resolveMotionMode(motionMode, performanceMode);

  useEffect(() => {
    let alive = true;
    const onHashChange = () => setRoute(getInitialRoute());
    window.addEventListener('hashchange', onHashChange);

    initializeAuthSession().then((user) => {
      if (!alive) return;
      setCurrentUser(user);
      setAuthReady(true);
    });

    const unsubscribe = subscribeToAuthChanges((user) => {
      if (!alive) return;
      setCurrentUser(user);
      setAuthReady(true);
    });

    return () => {
      alive = false;
      window.removeEventListener('hashchange', onHashChange);
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const onTileLaunch = (event) => {
      const detail = event.detail || {};
      setTileLaunch({ id: window.performance?.now?.() || Date.now(), color: detail.color || 'var(--blue)', label: detail.label || 'BR', rect: detail.rect || null });
      window.clearTimeout(window.__besTileLaunchTimer);
      window.__besTileLaunchTimer = window.setTimeout(() => setTileLaunch(null), Number(detail.duration) || 520);
    };
    window.addEventListener('bes-tile-launch', onTileLaunch);
    return () => {
      window.removeEventListener('bes-tile-launch', onTileLaunch);
      window.clearTimeout(window.__besTileLaunchTimer);
    };
  }, []);

  useEffect(() => {
    const onAiSettings = () => {
      const active = getActiveAiConfig();
      setAiProviderState(getAiProvider());
      setProviderConfigs(getAiConfigs());
      setApiKey(active.apiKey || '');
      setAiModel(active.model || active.providerInfo?.defaultModel || 'gemini-flash-latest');
    };
    window.addEventListener('bes-ai-settings-updated', onAiSettings);
    return () => window.removeEventListener('bes-ai-settings-updated', onAiSettings);
  }, []);


  useEffect(() => {
    const defaultLabel = () => languageRef.current === 'vi' ? 'AI đang xử lý nội dung...' : 'AI is processing your content...';
    const onStart = (event) => {
      const detail = event.detail || {};
      const id = detail.id || `ai-${Date.now()}`;
      window.clearTimeout(aiIndicatorHideTimerRef.current);
      aiOperationIdsRef.current.add(id);
      setAiOperationState({
        active: true,
        label: detail.label || defaultLabel(),
        provider: detail.provider || '',
      });
    };
    const onUpdate = (event) => {
      const detail = event.detail || {};
      if (!aiOperationIdsRef.current.size) return;
      setAiOperationState((current) => ({
        ...current,
        active: true,
        label: detail.label || current.label || defaultLabel(),
        provider: detail.provider || current.provider || '',
      }));
    };
    const onEnd = (event) => {
      const detail = event.detail || {};
      if (detail.id) aiOperationIdsRef.current.delete(detail.id);
      else aiOperationIdsRef.current.clear();
      if (aiOperationIdsRef.current.size > 0) return;
      window.clearTimeout(aiIndicatorHideTimerRef.current);
      aiIndicatorHideTimerRef.current = window.setTimeout(() => {
        setAiOperationState({ active: false, label: '', provider: '' });
      }, 320);
    };
    window.addEventListener('bes-ai-operation-start', onStart);
    window.addEventListener('bes-ai-operation-update', onUpdate);
    window.addEventListener('bes-ai-operation-end', onEnd);
    return () => {
      window.removeEventListener('bes-ai-operation-start', onStart);
      window.removeEventListener('bes-ai-operation-update', onUpdate);
      window.removeEventListener('bes-ai-operation-end', onEnd);
      window.clearTimeout(aiIndicatorHideTimerRef.current);
      aiOperationIdsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setAiStorageUser(currentUser);
    setLibraryStorageUser(currentUser);
    setTrashStorageUser(currentUser);
    setAiGovernanceUser(currentUser);
    const active = getActiveAiConfig();
    setAiProviderState(getAiProvider());
    setProviderConfigs(getAiConfigs());
    setApiKey(active.apiKey || '');
    setAiModel(active.model || active.providerInfo?.defaultModel || 'gemini-flash-latest');
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    languageRef.current = language;
    document.title = language === 'vi' ? 'Brian English · Hệ thống dạy học số' : 'Brian English · Digital Teaching Studio';
    document.documentElement.lang = language === 'vi' ? 'vi' : 'en';
    document.documentElement.dataset.language = language;
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('bet-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.fontScale = String(fontScale);
    document.documentElement.style.fontSize = `${fontScale}%`;
    try { localStorage.setItem('bes-font-scale', String(fontScale)); } catch { /* ignore */ }
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.dataset.themeIntensity = themeIntensity;
    document.documentElement.dataset.tileBorder = tileBorder;
    document.documentElement.dataset.windowsIndicator = indicatorMode;
    try {
      localStorage.setItem('bes-theme-intensity', themeIntensity);
      localStorage.setItem('bes-tile-border', tileBorder);
      localStorage.setItem('bes-windows-indicator', indicatorMode);
    } catch { /* ignore */ }
  }, [themeIntensity, tileBorder, indicatorMode]);
  useEffect(() => { localStorage.setItem('bet-language', language); }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem('bes-motion-mode', motionMode);
      localStorage.setItem('bes-performance-mode', performanceMode);
    } catch { /* ignore */ }
    applyPerformanceAttributes({ motionMode, performanceMode });
  }, [motionMode, performanceMode]);


  const allTools = useMemo(() => [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS], []);
  const toolSlug = route.startsWith('tool/') ? route.replace('tool/', '') : '';
  const selectedTool = allTools.find((item) => item.slug === toolSlug);
  const currentRoute = ROUTES.includes(route) ? route : selectedTool ? 'tool' : 'home';
  const accessibleApps = APPS;
  const accessibleGames = GAME_APPS;
  const accessibleTools = SPECIAL_TOOLS;

  const requiresAuth = currentRoute === 'tool' || !PUBLIC_ROUTES.has(currentRoute);
  const canAccessRoute = !requiresAuth || hasRouteAccess(currentUser, currentRoute, selectedTool);
  useEffect(() => {
    if (authReady && requiresAuth && !currentUser) {
      window.location.hash = '#/login';
    }
  }, [authReady, requiresAuth, currentUser]);

  useEffect(() => {
    if (authReady && currentUser && ['login', 'register'].includes(currentRoute)) {
      window.location.hash = `#/${getFirstAllowedRoute(currentUser)}`;
    }
  }, [authReady, currentUser, currentRoute]);

  const setGlobalLoading = (active, label = '') => setLoadingState({ active, label: label || (language === 'vi' ? 'Đang tải...' : 'Loading...') });

  const context = {
    language,
    setLanguage,
    theme,
    setTheme,
    apiKey,
    setApiKey,
    aiModel,
    setAiModel,
    aiProvider,
    setAiProviderState,
    providerConfigs,
    setProviderConfigs,
    aiSummary: getProviderSummary(),
    hasApiKey: getProviderSummary().hasKey || apiKey.trim().length > 8,
    currentUser,
    authReady,
    setCurrentUser,
    setGlobalLoading,
    motionMode,
    setMotionMode,
    effectiveMotionMode,
    performanceMode,
    setPerformanceMode,
    resolvedPerformance,
    themeIntensity,
    setThemeIntensity,
    tileBorder,
    setTileBorder,
    indicatorMode,
    setIndicatorMode,
    fontScale,
    setFontScale,
  };

  const activeDesignProfile = getActiveDesignProfile(currentRoute, selectedTool);

  useEffect(() => {
    if (!currentUser || !canAccessRoute || ['login', 'register', 'homeroom-portal'].includes(currentRoute)) return;
    const routeTitles = {
      home: ['Home', 'Trang chủ'], apps: ['Apps', 'Ứng dụng'], news: ['Newsroom', 'Đọc báo'], games: ['Games', 'Trò chơi'],
      department: ['Department', 'Tổ chuyên môn'], homeroom: ['Homeroom', 'Giáo viên chủ nhiệm'], library: ['Library', 'Thư viện'],
      'resource-library': ['Resource Library', 'Kho học liệu'], 'knowledge-hub': ['Smart Knowledge Library', 'Kho học liệu thông minh'],
      'work-hub': ['Unified Work Hub', 'Trung tâm công việc'], 'ai-workspace': ['Brian AI Workspace', 'Không gian AI'],
      'content-factory': ['Teaching Content Factory', 'Xưởng tạo học liệu'], 'assessment-core': ['Assessment Core', 'Ngân hàng câu hỏi'],
      'learning-intelligence': ['Learning Intelligence', 'Phân tích học tập'], 'platform-readiness': ['Platform Readiness', 'Sẵn sàng nền tảng'],
      'automation-center': ['Automation Center', 'Trung tâm tự động hóa'],
      'cloud-operations': ['Cloud Operations', 'Vận hành nền'],
      'collaboration-hub': ['Collaboration Hub', 'Không gian cộng tác'],
      'data-governance': ['Data Governance', 'Quản trị dữ liệu'],
      practice: ['Classroom', 'Lớp học'], settings: ['Settings', 'Cài đặt'],
      admin: ['Admin', 'Quản trị'], 'ai-governance': ['AI Governance', 'Quản trị AI'], resources: ['Resources', 'Tài nguyên'], contact: ['Contact', 'Liên hệ'], qa: ['System Health', 'Trạng thái hệ thống'], trash: ['Trash', 'Thùng rác'],
    };
    if (selectedTool?.slug) {
      const profile = getAppDesignProfile(selectedTool.slug);
      recordAppUsage(currentUser, {
        id: `tool:${selectedTool.slug}`, target: `#/tool/${selectedTool.slug}`,
        title: selectedTool.title || selectedTool.titleVi || selectedTool.slug,
        titleVi: selectedTool.titleVi || selectedTool.title || selectedTool.slug,
        icon: String(selectedTool.icon || selectedTool.title || 'AP').slice(0, 2).toUpperCase(), color: profile.accent, kind: 'tool',
      });
      return;
    }
    const pair = routeTitles[currentRoute] || [currentRoute, currentRoute];
    recordAppUsage(currentUser, {
      id: `route:${currentRoute}`, target: `#/${currentRoute}`, title: pair[0], titleVi: pair[1],
      icon: String(pair[0] || 'GO').slice(0, 2).toUpperCase(), color: activeDesignProfile.accent, kind: 'route',
    });
  }, [currentRoute, selectedTool?.slug, currentUser?.id, currentUser?.email, canAccessRoute]);

  const tileLaunchRect = tileLaunch
    ? (tileLaunch.rect || { x: window.innerWidth / 2 - 90, y: window.innerHeight / 2 - 70, w: 180, h: 140 })
    : null;

  return (
    <>
      <a className="bes-skip-link" href="#bes-main-content">{language === 'vi' ? 'Bỏ qua đến nội dung chính' : 'Skip to main content'}</a>
      <Suspense fallback={null}><GlobalAccessibilityAnnouncer /></Suspense>
      <div
      className="app-shell metro-shell metro-clean-system"
      data-route={currentRoute}
      data-tool={selectedTool?.slug || currentRoute}
      data-performance={resolvedPerformance}
      data-motion={effectiveMotionMode}
      data-intensity={themeIntensity}
      data-tile-border={tileBorder}
      data-windows-indicator={indicatorMode}
      style={{
        '--active-app-accent': activeDesignProfile.accent,
        '--active-app-soft': activeDesignProfile.soft,
        '--active-app-ink': activeDesignProfile.ink,
      }}
    >
      {currentRoute !== 'homeroom-portal' ? <div className="bes-top-chrome">
        <Suspense fallback={null}>
          <StatusMenuBar route={currentRoute} {...context} />
        </Suspense>
        <AppErrorBoundary compact scope="global-navigation" label={language === 'vi' ? 'thanh điều hướng' : 'navigation'}>
          <GlobalFlatNavigation route={currentRoute} selectedTool={selectedTool} onLogout={async () => { await logoutUser(); setCurrentUser(null); window.location.hash = '#/login'; }} {...context} />
        </AppErrorBoundary>
      </div> : null}
      {currentUser && canAccessRoute && !['login', 'register', 'setup', 'homeroom-portal'].includes(currentRoute) ? (
        <Suspense fallback={null}>
          <AppErrorBoundary compact scope="workspace-tabs" label={language === 'vi' ? 'tab không gian làm việc' : 'workspace tabs'}>
            <WorkspaceTabs currentUser={currentUser} route={currentRoute} selectedTool={selectedTool} activeProfile={activeDesignProfile} language={language} />
          </AppErrorBoundary>
        </Suspense>
      ) : null}
      {tileLaunch ? (
        <div
          key={tileLaunch.id}
          className="tile-launch-layer"
          style={{
            '--tile-launch-color': tileLaunch.color,
            '--tile-launch-x': `${tileLaunchRect.x}px`,
            '--tile-launch-y': `${tileLaunchRect.y}px`,
            '--tile-launch-w': `${tileLaunchRect.w}px`,
            '--tile-launch-h': `${tileLaunchRect.h}px`,
            '--tile-launch-dx': `${-tileLaunchRect.x}px`,
            '--tile-launch-dy': `${-tileLaunchRect.y}px`,
            '--tile-launch-sx': `${window.innerWidth / Math.max(tileLaunchRect.w, 1)}`,
            '--tile-launch-sy': `${window.innerHeight / Math.max(tileLaunchRect.h, 1)}`,
          }}
          aria-hidden="true"
        >
          <div className="tile-launch-backdrop" />
          <div className="tile-launch-card"><span className="tile-launch-label">{tileLaunch.label}</span></div>
        </div>
      ) : null}

      {currentUser && canAccessRoute && !['login', 'register', 'homeroom-portal'].includes(currentRoute) && (
        <Suspense fallback={null}>
          <AppErrorBoundary compact scope="command-palette" label={language === 'vi' ? 'tìm kiếm nhanh' : 'command palette'}>
            <GlobalCommandPalette
              language={language}
              currentUser={currentUser}
              theme={theme}
              setTheme={setTheme}
              currentRoute={currentRoute}
              selectedTool={selectedTool}
            />
          </AppErrorBoundary>
        </Suspense>
      )}

      <Suspense fallback={null}>
        <GlobalRuntimeGuard language={language} />
      </Suspense>

      <Suspense fallback={null}>
        <GlobalAIIndicator
          active={aiOperationState.active}
          language={language}
          label={aiOperationState.label}
          provider={aiOperationState.provider}
        />
      </Suspense>

      {effectiveMotionMode === 'full' && (
        <Suspense fallback={null}>
          <FullMotionEffects route={currentRoute} language={language} loadingState={loadingState} />
        </Suspense>
      )}
      {currentUser && canAccessRoute && !['login', 'register', 'setup', 'homeroom-portal'].includes(currentRoute) ? (
        <Suspense fallback={null}>
          <TransferInboxBanner currentUser={currentUser} route={currentRoute} selectedTool={selectedTool} language={language} />
        </Suspense>
      ) : null}
      <main id="bes-main-content" tabIndex={-1} key={`${currentRoute}:${selectedTool?.slug || 'root'}`} className="wp8-page-stage wp8-door-page" data-route={currentRoute}>
        <Suspense fallback={<RouteFallback language={language} />}>
          {currentRoute === 'home' && <Home {...context} />}
          {requiresAuth && currentUser && !canAccessRoute && <AccessDenied language={language} currentUser={currentUser} route={currentRoute} selectedTool={selectedTool} />}
          {canAccessRoute && currentRoute === 'apps' && currentUser && (
            <AppErrorBoundary scope="apps-launcher" label={language === 'vi' ? 'trang Ứng dụng' : 'Apps page'}>
              <WebApps apps={accessibleApps} {...context} />
            </AppErrorBoundary>
          )}
          {canAccessRoute && currentRoute === 'news' && currentUser && <NewsReader {...context} />}
          {canAccessRoute && currentRoute === 'games' && currentUser && <Games games={accessibleGames} {...context} />}
          {canAccessRoute && currentRoute === 'tools' && currentUser && <SpecialTools tools={accessibleTools} {...context} />}
          {canAccessRoute && currentRoute === 'department' && currentUser && <DepartmentWorkspace {...context} />}
          {canAccessRoute && currentRoute === 'homeroom' && currentUser && <HomeroomWorkspace {...context} />}
          {currentRoute === 'homeroom-portal' && <HomeroomPortal {...context} />}
          {currentRoute === 'resources' && <Resources items={RESOURCE_ITEMS} {...context} />}
          {canAccessRoute && currentRoute === 'library' && currentUser && <Library {...context} />}
          {canAccessRoute && currentRoute === 'resource-library' && currentUser && <ResourceLibrary {...context} />}
          {canAccessRoute && currentRoute === 'knowledge-hub' && currentUser && <KnowledgeHub {...context} />}
          {canAccessRoute && currentRoute === 'work-hub' && currentUser && <WorkHub {...context} />}
          {canAccessRoute && currentRoute === 'ai-workspace' && currentUser && <AIWorkspace {...context} />}
          {canAccessRoute && currentRoute === 'content-factory' && currentUser && <ContentFactory {...context} />}
          {canAccessRoute && currentRoute === 'assessment-core' && currentUser && <AssessmentCore {...context} />}
          {canAccessRoute && currentRoute === 'learning-intelligence' && currentUser && <LearningIntelligence {...context} />}
          {canAccessRoute && currentRoute === 'platform-readiness' && currentUser && <PlatformReadiness {...context} />}
          {canAccessRoute && currentRoute === 'automation-center' && currentUser && <AutomationCenter {...context} />}
          {canAccessRoute && currentRoute === 'cloud-operations' && currentUser && <CloudOperations {...context} />}
          {canAccessRoute && currentRoute === 'collaboration-hub' && currentUser && <CollaborationHub {...context} />}
          {canAccessRoute && currentRoute === 'data-governance' && currentUser && <DataGovernance {...context} />}
          {canAccessRoute && currentRoute === 'practice' && currentUser && <StudentPractice {...context} />}
          {canAccessRoute && currentRoute === 'qa' && currentUser && <SystemHealthCenter {...context} />}
          {canAccessRoute && currentRoute === 'ai-governance' && currentUser && <AIGovernanceCenter {...context} />}
          {canAccessRoute && currentRoute === 'trash' && currentUser && <TrashCenter {...context} />}
          {currentRoute === 'contact' && <Contact {...context} />}
          {canAccessRoute && currentRoute === 'settings' && currentUser && <Settings {...context} />}
          {currentRoute === 'login' && <AuthPage mode="login" onLogin={(u) => { setCurrentUser(u); window.location.hash = `#/${getFirstAllowedRoute(u)}`; }} {...context} />}
          {currentRoute === 'register' && <AuthPage mode="register" onLogin={(u) => { if (u) { setCurrentUser(u); window.location.hash = `#/${getFirstAllowedRoute(u)}`; } }} {...context} />}
          {canAccessRoute && currentRoute === 'admin' && currentUser && <AdminPage {...context} />}
          {currentRoute === 'setup' && <SupabaseSetup {...context} />}
          {canAccessRoute && currentRoute === 'tool' && currentUser && <ToolPage tool={selectedTool} {...context} />}
        </Suspense>
      </main>

      {currentUser && canAccessRoute && !['login', 'register', 'homeroom-portal'].includes(currentRoute) && (
        <Suspense fallback={null}>
          <AppErrorBoundary compact scope="global-autosave" label={language === 'vi' ? 'tự lưu' : 'autosave'}>
            <GlobalAutosave route={currentRoute} selectedTool={selectedTool} currentUser={currentUser} language={language} />
          </AppErrorBoundary>
        </Suspense>
      )}

      {currentUser && canAccessRoute && !['login', 'register', 'homeroom-portal'].includes(currentRoute) && (
        <Suspense fallback={null}>
          <AppErrorBoundary compact scope="ai-messenger" label={language === 'vi' ? 'Brian AI' : 'Brian AI'}>
          <UniversalAIAssist
            language={language}
            currentRoute={currentRoute}
            selectedTool={selectedTool}
            apiKey={apiKey}
            aiModel={aiModel}
            hasApiKey={context.hasApiKey}
            currentUser={currentUser}
            providerName={context.aiSummary.providerName}
            accent={activeDesignProfile.accent}
            soft={activeDesignProfile.soft}
            ink={activeDesignProfile.ink}
          />
          </AppErrorBoundary>
        </Suspense>
      )}

      {currentUser && canAccessRoute && !['login', 'register', 'setup', 'homeroom-portal'].includes(currentRoute) ? <>
        <Suspense fallback={null}>
          <AppErrorBoundary compact scope="content-transfer" label={language === 'vi' ? 'gửi nội dung' : 'content transfer'}>
            <ContentTransferHub currentUser={currentUser} currentRoute={currentRoute} selectedTool={selectedTool} language={language} accent={activeDesignProfile.accent} />
          </AppErrorBoundary>
        </Suspense>
        <Suspense fallback={null}>
          <SyncQueueIndicator currentUser={currentUser} language={language} />
        </Suspense>
      </> : null}
      {currentUser && canAccessRoute && !['login', 'register', 'setup', 'homeroom-portal'].includes(currentRoute) ? <Suspense fallback={null}><PwaUpdateBanner language={language} /></Suspense> : null}
      {currentRoute !== 'homeroom-portal' ? <>
        <Suspense fallback={null}>
          <GlobalMusicPlayer language={language} currentUser={currentUser} />
        </Suspense>
        <Footer language={language} currentUser={currentUser} />
      </> : null}
      </div>
    </>
  );
}

function RouteFallback({ language }) {
  return (
    <div className="page narrow">
      <section className="metro-panel empty-state">
        <h1>{language === 'vi' ? 'Đang mở trang...' : 'Opening page...'}</h1>
      </section>
    </div>
  );
}

function AccessDenied({ language, currentUser, route, selectedTool }) {
  const fallback = getFirstAllowedRoute(currentUser);
  const permissionId = route === 'tool' && selectedTool?.slug ? `tool:${selectedTool.slug}` : getRoutePermissionId(route);
  const requestItem = selectedTool || getPermissionItem(permissionId);
  return (
    <div className="page narrow">
      <section className="metro-panel empty-state">
        <h1>{language === 'vi' ? 'Chưa được cấp quyền' : 'Permission required'}</h1>
        <p>{language === 'vi' ? 'Tài khoản của bạn chưa được admin cấp quyền truy cập mục này.' : 'Your account has not been granted access to this area by an admin.'}</p>
        <div className="access-denied-actions">
          {permissionId ? (
            <PermissionRequestButton
              currentUser={currentUser}
              permissionId={permissionId}
              item={requestItem}
              language={language}
              className="secondary request-access-btn"
            />
          ) : null}
          <button className="primary" onClick={() => (window.location.hash = `#/${fallback}`)}>
            {language === 'vi' ? 'Về mục được cấp quyền' : 'Go to allowed area'}
          </button>
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <AppErrorBoundary scope="application-root">
    <App />
  </AppErrorBoundary>,
);
