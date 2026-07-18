import React from 'react';
import StatusMenuBar from '../../components/StatusMenuBar.jsx';
import GlobalChatbotDock from '../../components/GlobalChatbotDock.jsx';
import GlobalFlatNavigation from '../../components/GlobalFlatNavigation.jsx';
import AppErrorBoundary from '../../components/AppErrorBoundary.jsx';
import UIActivityCenter from './UIActivityCenter.jsx';

/**
 * Global shell chrome.
 * Home owns an isolated single-row navigation matching its approved design.
 * The former workspace/recent-app strip has been removed site-wide.
 */
export default function UnifiedShellChrome({
  route,
  selectedTool,
  currentUser,
  language = 'vi',
  onLogout,
  ...context
}) {
  const showTopChrome = !['home', 'homeroom-portal'].includes(route);

  return showTopChrome ? (
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
      <GlobalChatbotDock currentUser={currentUser} language={language} />
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
  ) : null;
}
