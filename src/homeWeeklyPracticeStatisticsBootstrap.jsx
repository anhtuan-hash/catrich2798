import React from 'react';
import { createRoot } from 'react-dom/client';
import HomeWeeklyPracticeStatisticsController from './components/HomeWeeklyPracticeStatisticsController.jsx';

const ROOT_ID = 'bes-weekly-statistics-root';

if (!document.getElementById(ROOT_ID)) {
  const host = document.createElement('div');
  host.id = ROOT_ID;
  document.body.appendChild(host);
  createRoot(host).render(<HomeWeeklyPracticeStatisticsController />);
}
