const METRICS_SOURCE = String.raw`function countGradebookScores(book, allowedStudentIds = null) {
  const allowed = allowedStudentIds instanceof Set ? allowedStudentIds : null;
  let count = 0;
  const countScoreMap = (scores = {}) => {
    Object.entries(scores || {}).forEach(([studentId, value]) => {
      if (allowed && !allowed.has(studentId)) return;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.values(value).forEach((cell) => { if (isScoreValue(cell)) count += 1; });
      } else if (isScoreValue(value)) count += 1;
    });
  };
  Object.values(book?.subjects || {}).forEach((subject) => {
    Object.values(subject?.semesters || {}).forEach((semester) => {
      (semester?.regular || []).forEach((round) => {
        countScoreMap(round?.scores || {});
        countScoreMap(round?.bonus || {});
      });
      countScoreMap(semester?.midterm?.scores || {});
      countScoreMap(semester?.final?.scores || {});
    });
  });
  return count;
}

function activeStudentIds(workspace) {
  return new Set((workspace?.students || [])
    .filter((student) => student?.active !== false)
    .map((student) => student.id)
    .filter(Boolean));
}

function activeConductCount(workspace, allowedStudentIds = null) {
  const allowed = allowedStudentIds instanceof Set ? allowedStudentIds : null;
  return (workspace?.conductRecords || []).filter((item) => (
    item?.status !== 'cancelled'
    && (!allowed || allowed.has(item.studentId))
  )).length;
}

function attendanceExceptionCount(workspace, allowedStudentIds = null) {
  let count = 0;
  const allowed = allowedStudentIds instanceof Set ? allowedStudentIds : null;
  Object.values(workspace?.attendance || {}).forEach((rows) => {
    Object.entries(rows || {}).forEach(([studentId, entry]) => {
      if (allowed && !allowed.has(studentId)) return;
      if (safeText(entry?.status, 'present') !== 'present') count += 1;
    });
  });
  return count;
}

function dataMetrics(workspace) {
  const activeIds = activeStudentIds(workspace);
  const learningRecords = Array.isArray(workspace?.learningRecords) ? workspace.learningRecords : [];
  const conductRecords = Array.isArray(workspace?.conductRecords) ? workspace.conductRecords : [];
  return {
    gradebookScores: countGradebookScores(workspace?.learningGradebook),
    visibleGradebookScores: countGradebookScores(workspace?.learningGradebook, activeIds),
    learningRecords: learningRecords.length,
    visibleLearningRecords: learningRecords.filter((record) => activeIds.has(record?.studentId)).length,
    conductActive: activeConductCount(workspace),
    visibleConductActive: activeConductCount(workspace, activeIds),
    conductTotal: conductRecords.length,
    attendanceSessions: Object.keys(workspace?.attendance || {}).length,
    attendanceExceptions: attendanceExceptionCount(workspace),
    visibleAttendanceExceptions: attendanceExceptionCount(workspace, activeIds),
  };
}

function dataWeight(metrics) {
  return metrics.visibleGradebookScores * 1000000
    + metrics.gradebookScores * 100000
    + metrics.visibleLearningRecords * 10000
    + metrics.learningRecords * 1000
    + metrics.visibleConductActive * 500
    + metrics.conductActive * 100
    + metrics.conductTotal * 10
    + metrics.visibleAttendanceExceptions * 5
    + metrics.attendanceExceptions * 3
    + metrics.attendanceSessions;
}
`;

const RECOVERY_SOURCE = String.raw`function buildRecoveredWorkspace(target, candidates) {
  const before = dataMetrics(target);
  const targetActiveIds = activeStudentIds(target);
  const sources = [];
  let next = clone(target);

  const selfGradebook = remapGradebook(target.learningGradebook, target.students || [], target.students || []);
  if (selfGradebook) next.learningGradebook = selfGradebook;
  next.learningRecords = mergeRecords([], remapRecords(
    target.learningRecords || [],
    target.students || [],
    target.students || [],
  ));
  next.conductRecords = mergeRecords([], remapRecords(
    target.conductRecords || [],
    target.students || [],
    target.students || [],
  ));
  const selfAttendance = mergeAttendance(
    { ...target, attendance: {}, attendanceSessions: {} },
    target,
  );
  next.attendance = selfAttendance.attendance;
  next.attendanceSessions = selfAttendance.attendanceSessions;

  const selfMetrics = dataMetrics(next);
  if (
    selfMetrics.visibleGradebookScores > before.visibleGradebookScores
    || selfMetrics.visibleLearningRecords > before.visibleLearningRecords
    || selfMetrics.visibleConductActive > before.visibleConductActive
    || selfMetrics.visibleAttendanceExceptions > before.visibleAttendanceExceptions
  ) {
    sources.push('sửa liên kết ID học sinh trong dữ liệu hiện tại');
  }

  const gradeCandidates = candidates.map((candidate) => {
    const book = remapGradebook(
      candidate.workspace.learningGradebook,
      candidate.workspace.students || [],
      target.students || [],
    );
    return { candidate, book, visible: countGradebookScores(book, targetActiveIds) };
  }).sort((a, b) => b.visible - a.visible || b.candidate.weight - a.candidate.weight);
  const gradeSource = gradeCandidates[0];
  if (gradeSource?.visible) {
    const mergedBook = mergeGradebooks(next.learningGradebook, gradeSource.book);
    const currentVisible = countGradebookScores(next.learningGradebook, targetActiveIds);
    const mergedVisible = countGradebookScores(mergedBook, targetActiveIds);
    if (mergedVisible > currentVisible) {
      next.learningGradebook = mergedBook;
      sources.push('điểm: ' + gradeSource.candidate.label);
    }
  }

  const legacyCandidates = candidates.map((candidate) => {
    const records = remapRecords(
      candidate.workspace.learningRecords || [],
      candidate.workspace.students || [],
      target.students || [],
    );
    return {
      candidate,
      records,
      visible: records.filter((record) => targetActiveIds.has(record.studentId)).length,
    };
  }).sort((a, b) => b.visible - a.visible || b.records.length - a.records.length);
  const legacySource = legacyCandidates[0];
  if (legacySource?.records?.length) {
    const currentVisible = (next.learningRecords || []).filter((record) => targetActiveIds.has(record.studentId)).length;
    const mergedRecords = mergeRecords(next.learningRecords || [], legacySource.records);
    const mergedVisible = mergedRecords.filter((record) => targetActiveIds.has(record.studentId)).length;
    if (mergedVisible > currentVisible || mergedRecords.length > (next.learningRecords || []).length) {
      next.learningRecords = mergedRecords;
      sources.push('điểm cũ: ' + legacySource.candidate.label);
    }
  }

  const conductCandidates = candidates.map((candidate) => {
    const records = remapRecords(
      candidate.workspace.conductRecords || [],
      candidate.workspace.students || [],
      target.students || [],
    );
    return {
      candidate,
      records,
      visible: records.filter((record) => record.status !== 'cancelled' && targetActiveIds.has(record.studentId)).length,
    };
  }).sort((a, b) => b.visible - a.visible || b.records.length - a.records.length);
  const conductSource = conductCandidates[0];
  if (conductSource?.records?.length) {
    const currentVisible = (next.conductRecords || []).filter((record) => record.status !== 'cancelled' && targetActiveIds.has(record.studentId)).length;
    const mergedRecords = mergeRecords(next.conductRecords || [], conductSource.records);
    const mergedVisible = mergedRecords.filter((record) => record.status !== 'cancelled' && targetActiveIds.has(record.studentId)).length;
    if (mergedVisible > currentVisible || mergedRecords.length > (next.conductRecords || []).length) {
      next.conductRecords = mergedRecords;
      if (!(next.conductWeekSummaries || []).length && (conductSource.candidate.workspace.conductWeekSummaries || []).length) {
        next.conductWeekSummaries = clone(conductSource.candidate.workspace.conductWeekSummaries);
      }
      sources.push('rèn luyện: ' + conductSource.candidate.label);
    }
  }

  const attendanceCandidates = candidates.map((candidate) => {
    const merged = mergeAttendance(
      { ...target, attendance: {}, attendanceSessions: {} },
      candidate.workspace,
    );
    const workspace = { ...target, ...merged };
    return {
      candidate,
      workspace,
      visible: attendanceExceptionCount(workspace, targetActiveIds),
      sessions: Object.keys(merged.attendance || {}).length,
    };
  }).sort((a, b) => b.visible - a.visible || b.sessions - a.sessions);
  const attendanceSource = attendanceCandidates[0];
  if (attendanceSource) {
    const currentVisible = attendanceExceptionCount(next, targetActiveIds);
    const currentSessions = Object.keys(next.attendance || {}).length;
    const mergedAttendance = mergeAttendance(next, attendanceSource.candidate.workspace);
    const mergedWorkspace = { ...next, ...mergedAttendance };
    const mergedVisible = attendanceExceptionCount(mergedWorkspace, targetActiveIds);
    const mergedSessions = Object.keys(mergedAttendance.attendance || {}).length;
    if (mergedVisible > currentVisible || mergedSessions > currentSessions) {
      next.attendance = mergedAttendance.attendance;
      next.attendanceSessions = mergedAttendance.attendanceSessions;
      sources.push('điểm danh: ' + attendanceSource.candidate.label);
    }
  }

  const after = dataMetrics(next);
  return {
    workspace: next,
    before,
    after,
    sources: [...new Set(sources)],
    changed: dataWeight(after) > dataWeight(before),
  };
}
`;

export default function class126RecoveryIdentityPlugin() {
  return {
    name: 'brian-class-12-6-recovery-identity',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = String(id || '').split('?')[0].replaceAll('\\', '/');
      if (!cleanId.endsWith('/src/class126DataRecovery.js')) return null;

      let next = code.replace(
        '  targetStudents.forEach((student) => {',
        '  targetStudents.filter((student) => student?.active !== false).forEach((student) => {',
      );
      next = next.replace(
        /function countGradebookScores\(book\) \{[\s\S]*?\n\}\n\nfunction candidateFromWorkspace/,
        METRICS_SOURCE + '\nfunction candidateFromWorkspace',
      );
      next = next.replace(
        /function buildRecoveredWorkspace\(target, candidates\) \{[\s\S]*?\n\}\n\nasync function resolveTargetWorkspace/,
        RECOVERY_SOURCE + '\nasync function resolveTargetWorkspace',
      );
      next = next.replace(
        'return `Đã khôi phục lớp 12.6: ${result.after.gradebookScores} ô điểm, ${result.after.learningRecords} bản ghi điểm cũ, ${result.after.conductActive} ghi nhận rèn luyện và ${result.after.attendanceExceptions} lượt chuyên cần khác Có mặt.`;',
        'return `Đã khôi phục lớp 12.6: ${result.after.visibleGradebookScores} ô điểm đang hiển thị, ${result.after.visibleLearningRecords} bản ghi điểm cũ, ${result.after.visibleConductActive} ghi nhận rèn luyện và ${result.after.visibleAttendanceExceptions} lượt chuyên cần khác Có mặt.`;',
      );
      return next;
    },
  };
}
