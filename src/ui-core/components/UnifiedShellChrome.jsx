import React from 'react';
import StatusMenuBar from '../../components/StatusMenuBar.jsx';
import GlobalFlatNavigation from '../../components/GlobalFlatNavigation.jsx';
import WorkspaceTabs from '../../components/WorkspaceTabs.jsx';
import AppErrorBoundary from '../../components/AppErrorBoundary.jsx';
import UIActivityCenter from './UIActivityCenter.jsx';

/**
 * V12.14 restores the V11 shell anatomy while keeping the V12 UI Core,
 * workspace memory, activity center, command center and design adapters.
 *
 * V11 anatomy:
 * 1. Status menu bar
 * 2. Flat global menu/navigation
 * 3. Independent workspace tab strip
 */
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
  const showTopChrome = route !== 'homeroom-portal';
  const showWorkspace = Boolean(
    currentUser
    && canAccessRoute
    && !['login', 'register', 'setup', 'homeroom-portal'].includes(route),
  );

  return (
    <>
      {showTopChrome ? (
        <div
          className="bes-top-chrome bes-v11-navigation-restored bes-visual-harmony-v12408"
          data-ui="v11-shell-chrome"
          data-harmony-theme="avocado"
        >
          <StatusMenuBar
            route={route}
            {...context}
            currentUser={currentUser}
            language={language}
            activityCenterOwned
          />
          <UIActivityCenter
            currentUser={currentUser}
            route={route}
            selectedTool={selectedTool}
            language={language}
            externalTrigger
          />
          <AppErrorBoundary
            compact
            scope="global-navigation"
            label={language === 'vi' ? 'thanh điều hướng' : 'navigation'}
          >
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
      ) : null}

      {showWorkspace ? (
        <AppErrorBoundary
          compact
          scope="workspace-tabs"
          label={language === 'vi' ? 'tab không gian làm việc' : 'workspace tabs'}
        >
          <WorkspaceTabs
            currentUser={currentUser}
            route={route}
            selectedTool={selectedTool}
            activeProfile={activeProfile}
            language={language}
            appVisibility={appVisibility}
          />
        </AppErrorBoundary>
      ) : null}
    </>
  );
}
