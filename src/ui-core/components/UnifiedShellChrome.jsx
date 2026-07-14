import React from 'react';
import StatusMenuBar from '../../components/StatusMenuBar.jsx';
import GlobalFlatNavigation from '../../components/GlobalFlatNavigation.jsx';
import WorkspaceTabs from '../../components/WorkspaceTabs.jsx';
import AppErrorBoundary from '../../components/AppErrorBoundary.jsx';

export default function UnifiedShellChrome({
  route,
  selectedTool,
  currentUser,
  canAccessRoute,
  activeProfile,
  language = 'vi',
  appVisibility,
  onLogout,
  ...context
}) {
  const showShell = !['homeroom-portal', 'classroom-join'].includes(route);
  if (!showShell) return null;

  const showWorkspace = Boolean(
    currentUser
    && canAccessRoute
    && !['login', 'register', 'setup', 'homeroom-portal', 'classroom-join'].includes(route),
  );

  return (
    <header className="bui-shell-chrome" data-ui="shell-chrome">
      <div className="bui-shell-status" data-ui="status-bar">
        <StatusMenuBar route={route} {...context} currentUser={currentUser} language={language} />
      </div>

      <div className="bui-shell-navigation" data-ui="primary-navigation">
        <AppErrorBoundary compact scope="global-navigation" label={language === 'vi' ? 'thanh điều hướng' : 'navigation'}>
          <GlobalFlatNavigation
            route={route}
            selectedTool={selectedTool}
            onLogout={onLogout}
            {...context}
            currentUser={currentUser}
            language={language}
          />
        </AppErrorBoundary>
      </div>

      {showWorkspace ? (
        <div className="bui-shell-workspaces" data-ui="workspace-navigation">
          <AppErrorBoundary compact scope="workspace-tabs" label={language === 'vi' ? 'tab không gian làm việc' : 'workspace tabs'}>
            <WorkspaceTabs
              currentUser={currentUser}
              route={route}
              selectedTool={selectedTool}
              activeProfile={activeProfile}
              language={language}
              appVisibility={appVisibility}
            />
          </AppErrorBoundary>
        </div>
      ) : null}
    </header>
  );
}
