import React, { useEffect, useMemo, useState } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../../data/apps.js';
import BrianV2Shell from './BrianV2Shell.jsx';
import B2ToolShell from './components/B2ToolShell.jsx';
import B2Home from './pages/B2Home.jsx';
import B2Apps from './pages/B2Apps.jsx';
import B2TeachingHub from './pages/B2TeachingHub.jsx';
import B2Games from './pages/B2Games.jsx';
import B2Resources from './pages/B2Resources.jsx';
import B2Homeroom from './pages/B2Homeroom.jsx';
import B2Classes from './pages/B2Classes.jsx';
import B2Students from './pages/B2Students.jsx';
import B2Dashboard from './pages/B2Dashboard.jsx';
import B2Reports from './pages/B2Reports.jsx';
import B2Settings from './pages/B2Settings.jsx';
import B2Admin from './pages/B2Admin.jsx';
import B2UILab from './pages/B2UILab.jsx';
import { B2Button, B2EmptyState } from './components/B2UI.jsx';
import { getToolBridgeMeta, isBridgeTested } from './toolBridgeRegistry.js';
import './BrianV2Preview.css';

const READY_VIEWS = new Set(['home', 'apps', 'teaching-tools', 'games', 'resources', 'homeroom', 'classes', 'students', 'dashboard', 'reports', 'settings', 'admin', 'ui-lab']);
const ALL_TOOLS = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];

function isReadyPreviewView(raw) {
  if (READY_VIEWS.has(raw)) return true;
  if (!raw.startsWith('tool/')) return false;
  const slug = raw.slice(5);
  return Boolean(ALL_TOOLS.some((tool) => tool.slug === slug) && isBridgeTested(slug));
}

function readPreviewView() {
  if (typeof window === 'undefined') return 'home';
  const raw = window.location.hash.replace(/^#/, '').trim();
  return isReadyPreviewView(raw) ? raw : 'home';
}

export default function BrianV2Preview() {
  const [view, setView] = useState(readPreviewView);

  useEffect(() => {
    const onHash = () => setView(readPreviewView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (next) => {
    if (!isReadyPreviewView(next)) return;
    if (window.location.hash.replace(/^#/, '') !== next) window.location.hash = next;
    setView(next);
  };

  const selectedTool = useMemo(() => {
    if (!view.startsWith('tool/')) return null;
    const slug = view.slice(5);
    return ALL_TOOLS.find((tool) => tool.slug === slug) || null;
  }, [view]);

  let content = null;
  if (selectedTool) {
    const meta = getToolBridgeMeta(selectedTool.slug);
    const backTarget = meta.family === 'game' ? 'games' : 'apps';
    content = <B2ToolShell tool={selectedTool} onBack={() => navigate(backTarget)} />;
  } else if (view === 'home') content = <B2Home navigate={navigate} />;
  else if (view === 'apps') content = <B2Apps navigate={navigate} />;
  else if (view === 'teaching-tools') content = <B2TeachingHub />;
  else if (view === 'games') content = <B2Games navigate={navigate} />;
  else if (view === 'resources') content = <B2Resources />;
  else if (view === 'homeroom') content = <B2Homeroom />;
  else if (view === 'classes') content = <B2Classes />;
  else if (view === 'students') content = <B2Students />;
  else if (view === 'dashboard') content = <B2Dashboard />;
  else if (view === 'reports') content = <B2Reports />;
  else if (view === 'settings') content = <B2Settings />;
  else if (view === 'admin') content = <B2Admin />;
  else if (view === 'ui-lab') content = <B2UILab />;
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
  return <BrianV2Shell active={active} onNavigate={navigate}>{content}</BrianV2Shell>;
}
