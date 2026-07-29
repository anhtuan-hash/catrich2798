import React, { useCallback, useEffect, useState } from 'react';
import { listManagedWeeklyPractices } from '../utils/weeklyPractice.js';
import WeeklyPracticeStatisticsPanel from './WeeklyPracticeStatisticsPanel.jsx';

export default function HomeWeeklyPracticeStatisticsController() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const launch = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      setItems(await listManagedWeeklyPractices());
      setOpen(true);
    } catch (error) {
      const message = String(error?.message || error || '').trim();
      window.alert(message || 'Không thể tải dữ liệu thống kê TTCM.');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    window.addEventListener('bes-open-weekly-statistics', launch);
    return () => window.removeEventListener('bes-open-weekly-statistics', launch);
  }, [launch]);

  return open ? <WeeklyPracticeStatisticsPanel items={items} onClose={() => setOpen(false)} /> : null;
}
