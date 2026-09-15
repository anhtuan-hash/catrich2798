const ABSENCE_STATUSES = new Set(['absent', 'unexcused', 'excused', 'absent_one_period', 'absent_two_periods']);

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function summarizeAttendance(rows = []) {
  const summary = {
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    unexcused: 0,
    early: 0,
    other: 0,
  };
  for (const row of rows || []) {
    const status = String(row?.status || '').trim().toLowerCase();
    if (!status) continue;
    summary.total += 1;
    if (status === 'present') summary.present += 1;
    else if (status === 'late') summary.late += 1;
    else if (status === 'early') summary.early += 1;
    else if (ABSENCE_STATUSES.has(status)) {
      summary.absent += 1;
      if (status === 'excused') summary.excused += 1;
      if (status === 'unexcused') summary.unexcused += 1;
    } else summary.other += 1;
  }
  return summary;
}

export function compareGradeWindows(rows = [], sampleSize = 3) {
  const size = Math.max(1, Math.min(10, Number(sampleSize) || 3));
  const normalized = (rows || [])
    .map((row) => ({ ...row, score: Number(row?.score), timestamp: new Date(row?.date || 0).getTime() }))
    .filter((row) => Number.isFinite(row.score))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (normalized.length < size * 2) {
    return {
      sampleSize: size,
      hasEnoughData: false,
      previousAverage: null,
      recentAverage: null,
      delta: null,
      previous: [],
      recent: normalized.slice(-size),
    };
  }

  const recent = normalized.slice(-size);
  const previous = normalized.slice(-(size * 2), -size);
  const average = (items) => round2(items.reduce((sum, row) => sum + row.score, 0) / items.length);
  const previousAverage = average(previous);
  const recentAverage = average(recent);
  return {
    sampleSize: size,
    hasEnoughData: true,
    previousAverage,
    recentAverage,
    delta: round2(recentAverage - previousAverage),
    previous,
    recent,
  };
}
