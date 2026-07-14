import React from 'react';

export default function UnifiedShellChrome({ status, navigation, workspace, language = 'vi' }) {
  return (
    <header data-ui="shell-chrome" className="ui-shell-chrome" aria-label={language === 'vi' ? 'Điều hướng hệ thống' : 'System navigation'}>
      {status ? <div data-ui="shell-status" className="ui-shell-status">{status}</div> : null}
      <div data-ui="shell-navigation" className="ui-shell-navigation">{navigation}</div>
      {workspace ? <div data-ui="shell-workspace" className="ui-shell-workspace">{workspace}</div> : null}
    </header>
  );
}
