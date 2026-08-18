import React, { useEffect, useMemo, useState } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../../data/apps.js';
import BrianV2Shell from './BrianV2Shell.jsx';
import B2ToolShell from './components/B2ToolShell.jsx';
import B2Home from './pages/B2Home.jsx';
import B2Apps from './pages/B2Apps.jsx';
import B2TeachingHub from './pages/B2TeachingHub.jsx';
import B2Games from './pages/B2Games.jsx';
import B2Resources from './pages/B2Resources.jsx';
import B2KnowledgeHub from './pages/B2KnowledgeHub.jsx';
import B2Homeroom from './pages/B2Homeroom.jsx';
import B2Classes from './pages/B2Classes.jsx';
import B2Students from './pages/B2Students.jsx';
import B2Dashboard from './pages/B2Dashboard.jsx';
import B2WorkHub from './pages/B2WorkHub.jsx';
import B2Assessment from './pages/B2Assessment.jsx';
import B2Collaboration from './pages/B2Collaboration.jsx';
import B2Reports from './pages/B2Reports.jsx';
import B2Settings from './pages/B2Settings.jsx';
import B2Admin from './pages/B2Admin.jsx';
import B2UILab from './pages/B2UILab.jsx';
import { B2Button, B2EmptyState } from './components/B2UI.jsx';
import { getToolBridgeMeta, isBridgeTested } from './toolBridgeRegistry.js';
import { readStoredPreviewRole, storePreviewRole } from './previewPermissions.js';
import { canUseV2Target, getRealRoleMeta, getV2PermissionMode } from './realPermissions.js';
import { BrianV2DataProvider, useBrianV2Data } from './data/BrianV2DataContext.jsx';
import './BrianV2Preview.css';
import './B2ResponsiveQA.css';

const READY_VIEWS = new Set([
  'home', 'apps', 'teaching-tools', 'games', 'resources', 'knowledge-hub',
  'homeroom', 'classes', 'students', 'dashboard', 'work-hub', 'assessment',
  'collaboration', 'reports', 'settings', 'admin', 'ui-lab',
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

function BrianV2PreviewRouter() {
  const { user } = useBrianV2Data();
  const [previewRole, setPreviewRole] = useState(readStoredPreviewRole);
  const [view, setView] = useState(readPreviewView);
  const permissionMode = getV2PermissionMode(user);
  const roleMeta = getRealRoleMeta(user, previewRole);
  const canOpen = (target) => canUseV2Target(user, previewRole, target);

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
  } else if (view === 'home') content = <B2Home navigate={navigate} />;
  else if (view === 'apps') content = <B2Apps navigate={navigate} />;
  else if (view === 'teaching-tools') content = <B2TeachingHub />;
  else if (view === 'games') content = <B2Games navigate={navigate} />;
  else if (view === 'resources') content = <B2Resources />;
  else if (view === 'knowledge-hub') content = <B2KnowledgeHub />;
  else if (view === 'homeroom') content = <B2Homeroom />;
  else if (view === 'classes') content = <B2Classes />;
  else if (view === 'students') content = <B2Students />;
  else if (view === 'dashboard') content = <B2Dashboard />;
  else if (view === 'work-hub') content = <B2WorkHub />;
  else if (view === 'assessment') content = <B2Assessment />;
  else if (view === 'collaboration') content = <B2Collaboration />;
  else if (view === 'reports') content = <B2Reports />;
  else if (view === 'settings') content = <B2Settings />;
  else if (view === 'admin') content = <B2Admin />;
  else if (view === 'ui-lab') content = <B2UILab permissionMode={permissionMode} roleMeta={roleMeta} canOpen={canOpen} />;
  else {
    content = (
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
