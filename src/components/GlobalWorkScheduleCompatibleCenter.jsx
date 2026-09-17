import React, { useEffect } from 'react';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { ensureWorkScheduleDatabaseCompatibility } from '../utils/workScheduleDatabaseCompatibility.js';
import GlobalWorkScheduleCenter from './GlobalWorkScheduleCenter.jsx';
import './GlobalWorkScheduleTimeline.css';
import './GlobalWorkScheduleTimelineArtwork.css';
import './GlobalWorkScheduleTimelineCategories.css';

export default function GlobalWorkScheduleCompatibleCenter(props) {
  const runtime = useRuntimeCore();

  ensureWorkScheduleDatabaseCompatibility();

  useEffect(() => {
    ensureWorkScheduleDatabaseCompatibility();
  }, [runtime.ready, runtime.session]);

  return <GlobalWorkScheduleCenter {...props} />;
}
