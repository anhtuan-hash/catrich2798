import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../../data/apps.js';
import BrianV2Shell from './BrianV2Shell.jsx';
import B2ToolShell from './components/B2ToolShell.jsx';
import B2ReleaseEvidenceStrip from './components/B2ReleaseEvidenceStrip.jsx';
import B2Home from './pages/B2Home.jsx';
import { B2Button, B2EmptyState } from './components/B2UI.jsx';
import { getToolBridgeMeta, isBridgeTested } from './toolBridgeRegistry.js';
import { readStoredPreviewRole, storePreviewRole } from './previewPermissions.js';
import { canUseV2Target, getRealRoleMeta, getV2PermissionMode } from './realPermissions.js';
import { BrianV2DataProvider, useBrianV2Data } from './data/BrianV2DataContext.jsx';
import './BrianV2Preview.css';
import './B2ResponsiveQA.css';
import './B2QualityGate.css';

const B2Apps = lazy(() => import('./pages/B2Apps.jsx'));
const B2TeachingHub = lazy(() => import('./pages/B2TeachingHub.jsx'));
const B2Games = lazy(() => import('./pages/B2Games.jsx'));
const B2Resources = lazy(() => import('./pages/B2Resources.jsx'));
const B2KnowledgeHub = lazy(() => import('./pages/B2KnowledgeHub.jsx'));
const B2News = lazy(() => import('./pages/B2News.jsx'));
const B2Homeroom = lazy(() => import('./pages/B2Homeroom.jsx'));
const B2Classes = lazy(() => import('./pages/B2Classes.jsx'));
const B2Students = lazy(() => import('./pages/B2Students.jsx'));
const B2Dashboard = lazy(() => import('./pages/B2Dashboard.jsx'));
const B2WorkHub = lazy(() => import('./pages/B2WorkHub.jsx'));
const B2Assessment = lazy(() => import('./pages/B2Assessment.jsx'));
const B2Collaboration = lazy(() => import('./pages/B2Collaboration.jsx'));
const B2Reports = lazy(() => import('./pages/B2Reports.jsx'));
const B2Settings = lazy(() => import('./pages/B2Settings.jsx'));
const B2Admin = lazy(() => import('./pages/B2Admin.jsx'));
const B2Cloud = lazy(() => import('./pages/B2Cloud.jsx'));
const B2UILab = lazy(() => import('./pages/B2UILab.jsx'));
const B2ReleaseGate = lazy(() => import('./pages/B2ReleaseGate.jsx'));

const PAGE_COMPONENTS = {
  apps: B2Apps,
  'teaching-tools': B2TeachingHub,
  games: B2Games,
  resources: B2Resources,
  'knowledge-hub': B2KnowledgeHub,
  news: B2News,
  homeroom: B2Homeroom,
  classes: B2Classes,
  students: B2Students,
  dashboard: B2Dashboard,
  'work-hub': B2WorkHub,
  assessment: B2Assessment,
  collaboration: B2Collaboration,
  reports: B2Reports,
  settings: B2Settings,
  admin: B2Admin,
  cloud: B2Cloud,
  'ui-lab': B2UILab,
  'release-gate': B2ReleaseGate,
};

const READY_VIEWS = new Set([
  'home', 'apps', 'teaching-tools', 'games', 'resources', 'knowledge-hub', 'news',
  'homeroom', 'classes', 'students', 'dashboard', 'work-hub', 'assessment',
  'collaboration', 'reports', 'settings', 'admin', 'cloud', 'ui-lab', 'release-gate',
]);
const ALL_TOOLS = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];

function isReadyPreviewView(raw) {
  if (READY_VIEWS.has(raw)) return true;
  if (!raw.startsWith('tool/')) return false;
  return isBridgeTested(raw.slice(5));
}

function readPreviewView() {
  if (typeof window === 'undefined') return 'home';
  const raw = window.location.hash.replace(/^#/, '').trim();
  return isReadyPreviewView(raw) ? raw : 'home';
}

function RouteLoading() {
  return <div className="b2-route-loading" role="status" aria-live="polite" aria-busy="true"><span aria-hidden="true" /><strong>Đang mở workspace…</strong><small>Metro Next chỉ tải module khi cần.</small></div>;
}

function BrianV2PreviewRouter() {
  const { user } = useBrianV2Data();
  const [previewRole, setPreviewRole] = useState(readStoredPreviewRole);
  const [view, setView] = useState(readPreviewView);
  const permissionMode = getV2PermissionMode(user);
  const roleMeta = getRealRoleMeta(user, previewRole);
  const canOpen = (target) => canUseV2Target(user, previewRole, target);

  useEffect(() => {
    document.body.dataset.brianV2 = '1';
    return () => { delete document.body.dataset.brianV2; };
  }, []);

  useEffect(() => {
    const onHash = () => setView(readPreviewView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (next) => {
    if (!isReadyPreviewView(next) || !canOpen(next)) return;
    if (window.location.hash.replace(/^#/, '') !== next) window.location.hash = next;
    setView(next);
  };

  const changePreviewRole = (nextRole) => {
    if (permissionMode === 'real') return;
    const stored = storePreviewRole(nextRole);
    setPreviewRole(stored);
  };

  const selectedTool = useMemo(() => {
    if (!view.startsWith('tool/')) return null;
    const slug = view.slice(5);
    const registered = ALL_TOOLS.find((tool) => tool.slug === slug);
    if (registered) return registered;
    const meta = getToolBridgeMeta(slug);
    return { slug, title: meta.label, titleVi: meta.label, icon: String(meta.label || slug).slice(0, 2).toUpperCase(), tone: meta.tone, descVi: 'Công cụ hiện hữu đang chạy bên trong Metro Next Tool Shell.', desc: 'Existing tool running inside Metro Next Tool Shell.' };
  }, [view]);

  const allowed = canOpen(view);
  let content = null;

  if (!allowed) {
    content = (
      <section className="b2-access-denied" role="status">
        <span aria-hidden="true">◇</span>
        <h2>Khu vực này không nằm trong quyền hiện tại</h2>
        <p><strong>{roleMeta.label}</strong> không được mở “{view}”. {permissionMode === 'real' ? 'V2 đang đọc trực tiếp permission service của Brian V1; Shadow UI không thể tự nâng quyền.' : 'Preview chưa có phiên đăng nhập nên đang dùng role simulator.'}</p>
        <B2Button variant="primary" onClick={() => navigate('home')}>Về Trang chủ</B2Button>
      </section>
    );
  } else if (selectedTool) {
    const meta = getToolBridgeMeta(selectedTool.slug);
    const backTarget = meta.family === 'game' ? 'games' : 'apps';
    content = <B2ToolShell tool={selectedTool} onBack={() => navigate(backTarget)} />;
  } else if (view === 'home') {
    content = <B2Home navigate={navigate} />;
  } else {
    const Page = PAGE_COMPONENTS[view];
    content = Page ? (
      <Suspense fallback={<RouteLoading />}>
        <Page navigate={navigate} permissionMode={permissionMode} roleMeta={roleMeta} canOpen={canOpen} />
      </Suspense>
    ) : (
      <B2EmptyState
        icon="◇"
        title="Màn hình này chưa được migrate sang V2"
        description="Shadow UI chỉ công bố từng khu vực sau khi component, responsive và trạng thái tương tác đã được kiểm thử."
        action={<B2Button variant="primary" onClick={() => navigate('home')}>Về Trang chủ V2</B2Button>}
      />
    );
  }

  const active = selectedTool ? (getToolBridgeMeta(selectedTool.slug).family === 'game' ? 'games' : 'apps') : view;
  return (
    <BrianV2Shell
      active={active}
      onNavigate={navigate}
      currentUser={user}
      previewRole={previewRole}
      onPreviewRoleChange={changePreviewRole}
      permissionMode={permissionMode}
      roleMeta={roleMeta}
      canOpenTarget={canOpen}
    >
      {view === 'release-gate' && allowed ? <B2ReleaseEvidenceStrip /> : null}
      {content}
    </BrianV2Shell>
  );
}

export default function BrianV2Preview() {
  return (
    <BrianV2DataProvider>
      <BrianV2PreviewRouter />
    </BrianV2DataProvider>
  );
}
