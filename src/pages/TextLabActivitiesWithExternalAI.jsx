import React, { useEffect, useState } from 'react';
import TextLabActivities from './TextLabActivities.jsx';
import TextLabExternalAISidebar from '../components/TextLabExternalAISidebar.jsx';

const SIDEBAR_STATE_KEY = 'bes-textlab-external-ai-sidebar-v1';

function readSidebarState() {
  try {
    return window.localStorage.getItem(SIDEBAR_STATE_KEY) !== 'closed';
  } catch {
    return true;
  }
}

export default function TextLabActivitiesWithExternalAI(props) {
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarState);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STATE_KEY, sidebarOpen ? 'open' : 'closed');
    } catch {
      // The sidebar still works when browser storage is restricted.
    }
  }, [sidebarOpen]);

  return (
    <div className={`textlab-ai-layout ${sidebarOpen ? 'is-open' : 'is-collapsed'}`}>
      <div className="textlab-ai-main">
        <TextLabActivities {...props} />
      </div>
      <TextLabExternalAISidebar
        language={props.language}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((value) => !value)}
      />
    </div>
  );
}
