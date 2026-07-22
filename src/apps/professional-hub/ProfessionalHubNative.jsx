import React, { useEffect, useRef, useState } from 'react';
import App from './App.jsx';
import TasksWorkspace from './TasksWorkspace.jsx';
import RecordsWorkspace from './RecordsWorkspace.jsx';
import PlansWorkspace from './PlansWorkspace.jsx';
import CalendarWorkspace, { createDefaultCalendarEvents } from './CalendarWorkspace.jsx';
import MeetingsWorkspace, { createDefaultMeetings } from './MeetingsWorkspace.jsx';
import EvidenceWorkspace, { createDefaultEvidence } from './EvidenceWorkspace.jsx';
import ReportsWorkspace from './ReportsWorkspace.jsx';
import GlobalNotificationDrawer, { readGlobalNotifications } from './GlobalNotificationDrawer.jsx';
import {
  collectionFromContext,
  createLocalDepartmentContext,
  initializeDepartmentCloud,
  scheduleDepartmentCollectionSave,
  shouldBlockReadOnlyMutation,
} from './department-cloud.js';
import './styles.css';
import './laptop-scale.css';
import './macbook-readable.css';
import './notification-toggle.css';
import './task-workspace-bridge.css';
import './shell-fixes.css';
import './department-cloud.css';
import './professional-hub-native-host.css';

export default function ProfessionalHubNative({ language = 'vi' }) {
  useEffect(() => {
    document.documentElement.classList.remove('department-microfrontend-active');
    document.body.classList.remove('department-microfrontend-active');
  }, []);

  return (
    <section
      className="professional-hub-native-app"
      data-testid="professional-hub-native-app"
      data-language={language}
      aria-label={language === 'vi' ? 'Hub Chuyên môn' : 'Professional Hub'}
    >
      <React.StrictMode><DepartmentRoot/></React.StrictMode>
    </section>
  );
}
