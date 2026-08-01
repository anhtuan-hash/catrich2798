import { getCurrentUser } from './utils/auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  listHomeroomWorkspaces,
  loadHomeroomWorkspace,
  saveHomeroomWorkspace,
} from './utils/homeroomClassWorkspaceStore.js';
import { createManualBackup, prepareWorkspaceCommit } from './utils/homeroomPhase3.js';
import { normalizeSchoolClassName } from './utils/schoolClassRegistry.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';

const CLASS_NAME = '12.6';
const LOCAL_PREFIX = 'bes-homeroom-workspace-v1:';
const RESULT_EVENT = 'bes-class-12-6-recovery-result';
const SESSION_NOTICE_KEY = 'bes-class-12-6-recovery-notice-v1';

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function classNameOf(workspace) {
  return normalizeSchoolClassName(workspace?.classProfile?.className || '')
    || (/12[^0-9]*6/i.test(safeText(workspace?.classProfile?.className)) ? CLASS_NAME : '');
}

function isClass126(workspace) {
  return classNameOf(workspace) === CLASS_NAME;
}

function parseWorkspace(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function fold(value) {
  return safeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeCode(value) {
  const compact = fold(value).replace(/\s+/g, '');
  if (!compact) return '';
  const withoutStudentPrefix = compact.replace(/^(student|hoc?sinh|hs)/, '');
  const cpMatch = withoutStudentPrefix.match(/^cp0*(\d+)$/);
  if (cpMatch) return `cp${cpMatch[1]}`;
  if (/^\d+$/.test(withoutStudentPrefix)) return withoutStudentPrefix.replace(/^0+(?=\d)/, '');
  return withoutStudentPrefix;
}

function identityKey(student) {
  const name = fold(student?.fullName || student?.name);
  const birthDate = safeText(student?.birthDate || student?.dateOfBirth);
  return name ? `${name}|${birthDate}` : '';
}

function buildStudentIdMap(sourceStudents = [], targetStudents = []) {
  const targetByCode = new Map();
  const targetByIdentity = new Map();
  const targetIds = new Set();

  targetStudents.forEach((student) => {
    if (!student?.id) return;
    targetIds.add(student.id);
    const code = normalizeCode(student.code);
    if (code && !targetByCode.has(code)) targetByCode.set(code, student.id);
    const identity = identityKey(student);
    if (identity && !targetByIdentity.has(identity)) targetByIdentity.set(identity, student.id);
  });

  const map = new Map();
  sourceStudents.forEach((student) => {
    if (!student?.id) return;
    if (targetIds.has(student.id)) {
      map.set(student.id, student.id);
      return;
    }
    const code = normalizeCode(student.code || student.id);
    const byCode = code ? targetByCode.get(code) : '';
    const byIdentity = targetByIdentity.get(identityKey(student));
    if (byCode || byIdentity) map.set(student.id, byCode || byIdentity);
  });

  return {
    map,
    resolve(sourceId) {
      if (!sourceId) return sourceId;
      if (targetIds.has(sourceId)) return sourceId;
      if (map.has(sourceId)) return map.get(sourceId);
      const byCode = targetByCode.get(normalizeCode(sourceId));
      return byCode || sourceId;
    },
  };
}

function isScoreValue(value) {
  if (value === '' || value == null) return false;
  return Number.isFinite(Number(String(value).replace(',', '.')));
}

function countGradebookScores(book) {
  let count = 0;
  Object.values(book?.subjects || {}).forEach((subject) => {
    Object.values(subject?.semesters || {}).forEach((semester) => {
      (semester?.regular || []).forEach((round) => {
        Object.values(round?.scores || {}).forEach((row) => {
          Object.values(row || {}).forEach((value) => { if (isScoreValue(value)) count += 1; });
        });
        Object.values(round?.bonus || {}).forEach((value) => { if (isScoreValue(value)) count += 1; });
      });
      Object.values(semester?.midterm?.scores || {}).forEach((value) => { if (isScoreValue(value)) count += 1; });
      Object.values(semester?.final?.scores || {}).forEach((value) => { if (isScoreValue(value)) count += 1; });
    });
  });
  return count;
}

function activeConductCount(workspace) {
  return (workspace?.conductRecords || []).filter((item) => item?.status !== 'cancelled').length;
}

function attendanceExceptionCount(workspace) {
  let count = 0;
  Object.values(workspace?.attendance || {}).forEach((rows) => {
    Object.values(rows || {}).forEach((entry) => {
      if (safeText(entry?.status, 'present') !== 'present') count += 1;
    });
  });
  return count;
}

function dataMetrics(workspace) {
  return {
    gradebookScores: countGradebookScores(workspace?.learningGradebook),
    learningRecords: Array.isArray(workspace?.learningRecords) ? workspace.learningRecords.length : 0,
    conductActive: activeConductCount(workspace),
    conductTotal: Array.isArray(workspace?.conductRecords) ? workspace.conductRecords.length : 0,
    attendanceSessions: Object.keys(workspace?.attendance || {}).length,
    attendanceExceptions: attendanceExceptionCount(workspace),
  };
}

function dataWeight(metrics) {
  return metrics.gradebookScores * 100000
    + metrics.learningRecords * 1000
    + metrics.conductActive * 100
    + metrics.conductTotal * 10
    + metrics.attendanceExceptions * 3
    + metrics.attendanceSessions;
}

function candidateFromWorkspace(workspace, source, label = '', createdAt = '') {
  if (!workspace || !isClass126(workspace)) return null;
  const metrics = dataMetrics(workspace);
  return {
    workspace,
    source,
    label: label || `${source} · ${safeText(workspace.id)}`,
    createdAt: createdAt || workspace.updatedAt || workspace.createdAt || '',
    metrics,
    weight: dataWeight(metrics),
  };
}

function collectWorkspaceAndBackups(workspace, source, candidates, label = '') {
  const direct = candidateFromWorkspace(workspace, source, label);
  if (direct) candidates.push(direct);
  (workspace?.backups || []).forEach((backup) => {
    const snapshot = parseWorkspace(backup?.snapshot);
    const candidate = candidateFromWorkspace(
      snapshot,
      `${source}-backup`,
      backup?.label || `${label || source} · bản sao lưu`,
      backup?.createdAt,
    );
    if (candidate) candidates.push(candidate);
  });
}

function collectLocalCandidates(user) {
  const candidates = [];
  const acceptedScopes = new Set([
    user?.id,
    user?.authId,
    user?.email,
    'guest',
  ].map((value) => safeText(value).toLowerCase()).filter(Boolean));

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(LOCAL_PREFIX)) continue;
      const remainder = key.slice(LOCAL_PREFIX.length);
      const separator = remainder.indexOf(':');
      const scope = separator >= 0 ? remainder.slice(0, separator).toLowerCase() : '';
      const workspace = parseWorkspace(localStorage.getItem(key));
      if (!workspace || !isClass126(workspace)) continue;
      const adviserEmail = safeText(workspace.classProfile?.adviserEmail).toLowerCase();
      const sameUser = acceptedScopes.has(scope)
        || (user?.email && adviserEmail === safeText(user.email).toLowerCase())
        || workspace.schoolAssignment?.registryOwnerId === user?.id;
      if (!sameUser) continue;
      collectWorkspaceAndBackups(workspace, 'local', candidates, `Thiết bị · ${safeText(workspace.id)}`);
    }
  } catch (error) {
    console.warn('[Class126Recovery] Không đọc được toàn bộ bản cục bộ.', error);
  }
  return candidates;
}

async function collectCloudCandidates(user) {
  const candidates = [];
  if (!isSupabaseConfigured || !supabase || !user?.id) return candidates;
  const { data, error } = await supabase
    .from('bes_homeroom_workspaces')
    .select('workspace_id,class_name,payload,updated_at')
    .eq('owner_id', user.id);
  if (error) {
    console.warn('[Class126Recovery] Không tải được bản cloud để khôi phục.', error.message || error);
    return candidates;
  }
  (data || []).forEach((row) => {
    const workspace = parseWorkspace(row?.payload);
    if (!workspace) return;
    collectWorkspaceAndBackups(
      workspace,
      'cloud',
      `Cloud · ${safeText(row.workspace_id)}`,
    );
  });
  return candidates;
}

function remapScoreObject(source = {}, resolver) {
  const output = {};
  Object.entries(source || {}).forEach(([studentId, value]) => {
    const targetId = resolver(studentId);
    if (!targetId) return;
    output[targetId] = clone(value);
  });
  return output;
}

function remapGradebook(sourceBook, sourceStudents, targetStudents) {
  if (!sourceBook || typeof sourceBook !== 'object') return null;
  const { resolve } = buildStudentIdMap(sourceStudents, targetStudents);
  const book = clone(sourceBook);
  Object.values(book.subjects || {}).forEach((subject) => {
    Object.values(subject?.semesters || {}).forEach((semester) => {
      (semester?.regular || []).forEach((round) => {
        round.scores = remapScoreObject(round.scores, resolve);
        round.bonus = remapScoreObject(round.bonus, resolve);
      });
      if (semester?.midterm) semester.midterm.scores = remapScoreObject(semester.midterm.scores, resolve);
      if (semester?.final) semester.final.scores = remapScoreObject(semester.final.scores, resolve);
    });
  });
  return book;
}

function mergeMissingObject(target = {}, source = {}) {
  const output = { ...(target || {}) };
  Object.entries(source || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = mergeMissingObject(output[key] && typeof output[key] === 'object' ? output[key] : {}, value);
      return;
    }
    if (output[key] === '' || output[key] == null) output[key] = clone(value);
  });
  return output;
}

function mergeGradebooks(targetBook, remappedSourceBook) {
  if (!remappedSourceBook) return targetBook;
  if (!targetBook || countGradebookScores(targetBook) === 0) return remappedSourceBook;
  const output = clone(targetBook);
  output.subjects = output.subjects || {};

  Object.entries(remappedSourceBook.subjects || {}).forEach(([subjectKey, sourceSubject]) => {
    if (!output.subjects[subjectKey]) {
      output.subjects[subjectKey] = clone(sourceSubject);
      return;
    }
    const targetSubject = output.subjects[subjectKey];
    targetSubject.name = safeText(targetSubject.name, sourceSubject?.name || subjectKey);
    targetSubject.semesters = targetSubject.semesters || {};

    Object.entries(sourceSubject?.semesters || {}).forEach(([semesterKey, sourceSemester]) => {
      if (!targetSubject.semesters[semesterKey]) {
        targetSubject.semesters[semesterKey] = clone(sourceSemester);
        return;
      }
      const targetSemester = targetSubject.semesters[semesterKey];
      targetSemester.regular = Array.isArray(targetSemester.regular) ? targetSemester.regular : [];
      (sourceSemester?.regular || []).forEach((sourceRound, roundIndex) => {
        if (!targetSemester.regular[roundIndex]) {
          targetSemester.regular[roundIndex] = clone(sourceRound);
          return;
        }
        const targetRound = targetSemester.regular[roundIndex];
        const existingColumnIds = new Set((targetRound.columns || []).map((column) => column.id));
        targetRound.columns = [
          ...(targetRound.columns || []),
          ...(sourceRound.columns || []).filter((column) => !existingColumnIds.has(column.id)).map(clone),
        ];
        targetRound.scores = targetRound.scores || {};
        Object.entries(sourceRound.scores || {}).forEach(([studentId, sourceRow]) => {
          targetRound.scores[studentId] = mergeMissingObject(targetRound.scores[studentId] || {}, sourceRow || {});
        });
        targetRound.bonus = mergeMissingObject(targetRound.bonus || {}, sourceRound.bonus || {});
      });
      targetSemester.midterm = targetSemester.midterm || { scores: {} };
      targetSemester.final = targetSemester.final || { scores: {} };
      targetSemester.midterm.scores = mergeMissingObject(
        targetSemester.midterm.scores || {},
        sourceSemester?.midterm?.scores || {},
      );
      targetSemester.final.scores = mergeMissingObject(
        targetSemester.final.scores || {},
        sourceSemester?.final?.scores || {},
      );
    });
  });
  output.updatedAt = new Date().toISOString();
  return output;
}

function remapRecords(records = [], sourceStudents, targetStudents) {
  const { resolve } = buildStudentIdMap(sourceStudents, targetStudents);
  return records.map((record) => ({ ...record, studentId: resolve(record.studentId) }));
}

function mergeRecords(target = [], source = []) {
  const byKey = new Map();
  const keyOf = (record) => safeText(record?.id)
    || safeText(record?.sourceKey)
    || [record?.studentId, record?.date, record?.ruleId || record?.assessment, record?.title, record?.deduction, record?.score].map(safeText).join('|');

  target.forEach((record) => byKey.set(keyOf(record), record));
  source.forEach((record) => {
    const key = keyOf(record);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, record);
      return;
    }
    if (existing.status === 'cancelled' && record.status === 'confirmed') byKey.set(key, record);
  });
  return [...byKey.values()];
}

function mergeAttendance(targetWorkspace, sourceWorkspace) {
  const { resolve } = buildStudentIdMap(sourceWorkspace.students || [], targetWorkspace.students || []);
  const attendance = clone(targetWorkspace.attendance || {});
  Object.entries(sourceWorkspace.attendance || {}).forEach(([sessionKey, sourceRows]) => {
    const targetRows = { ...(attendance[sessionKey] || {}) };
    Object.entries(sourceRows || {}).forEach(([sourceStudentId, sourceEntry]) => {
      const targetId = resolve(sourceStudentId);
      if (!targetId) return;
      const current = targetRows[targetId];
      const sourceStatus = safeText(sourceEntry?.status, 'present');
      const currentStatus = safeText(current?.status, 'present');
      if (!current || (currentStatus === 'present' && sourceStatus !== 'present')) {
        targetRows[targetId] = clone(sourceEntry);
      }
    });
    attendance[sessionKey] = targetRows;
  });
  return {
    attendance,
    attendanceSessions: { ...(sourceWorkspace.attendanceSessions || {}), ...(targetWorkspace.attendanceSessions || {}) },
  };
}

function selectBest(candidates, metricName, secondaryMetric = '') {
  return [...candidates].sort((a, b) => {
    const primary = Number(b.metrics?.[metricName] || 0) - Number(a.metrics?.[metricName] || 0);
    if (primary) return primary;
    const secondary = secondaryMetric
      ? Number(b.metrics?.[secondaryMetric] || 0) - Number(a.metrics?.[secondaryMetric] || 0)
      : 0;
    if (secondary) return secondary;
    return (Date.parse(b.createdAt || 0) || 0) - (Date.parse(a.createdAt || 0) || 0);
  })[0] || null;
}

function buildRecoveredWorkspace(target, candidates) {
  const gradeSource = selectBest(candidates, 'gradebookScores', 'learningRecords');
  const legacyGradeSource = selectBest(candidates, 'learningRecords', 'gradebookScores');
  const conductSource = selectBest(candidates, 'conductActive', 'conductTotal');
  const attendanceSource = selectBest(candidates, 'attendanceExceptions', 'attendanceSessions');

  let next = clone(target);
  const before = dataMetrics(target);
  const sources = [];

  if (gradeSource?.metrics.gradebookScores > before.gradebookScores) {
    const remapped = remapGradebook(
      gradeSource.workspace.learningGradebook,
      gradeSource.workspace.students || [],
      target.students || [],
    );
    next.learningGradebook = mergeGradebooks(next.learningGradebook, remapped);
    sources.push(`điểm: ${gradeSource.label}`);
  }

  if (legacyGradeSource?.metrics.learningRecords > before.learningRecords) {
    const records = remapRecords(
      legacyGradeSource.workspace.learningRecords || [],
      legacyGradeSource.workspace.students || [],
      target.students || [],
    );
    next.learningRecords = mergeRecords(next.learningRecords || [], records);
    sources.push(`điểm cũ: ${legacyGradeSource.label}`);
  }

  if (conductSource?.metrics.conductTotal > before.conductTotal || conductSource?.metrics.conductActive > before.conductActive) {
    const records = remapRecords(
      conductSource.workspace.conductRecords || [],
      conductSource.workspace.students || [],
      target.students || [],
    );
    next.conductRecords = mergeRecords(next.conductRecords || [], records);
    if (!(next.conductWeekSummaries || []).length && (conductSource.workspace.conductWeekSummaries || []).length) {
      next.conductWeekSummaries = clone(conductSource.workspace.conductWeekSummaries);
    }
    sources.push(`rèn luyện: ${conductSource.label}`);
  }

  if (attendanceSource?.metrics.attendanceSessions > before.attendanceSessions || attendanceSource?.metrics.attendanceExceptions > before.attendanceExceptions) {
    const restoredAttendance = mergeAttendance(next, attendanceSource.workspace);
    next.attendance = restoredAttendance.attendance;
    next.attendanceSessions = restoredAttendance.attendanceSessions;
    sources.push(`điểm danh: ${attendanceSource.label}`);
  }

  const after = dataMetrics(next);
  return {
    workspace: next,
    before,
    after,
    sources,
    changed: dataWeight(after) > dataWeight(before),
  };
}

async function resolveTargetWorkspace(user, candidates) {
  const catalogResult = await listHomeroomWorkspaces(user);
  const currentId = getCurrentHomeroomWorkspaceId(user);
  const metas = (catalogResult.items || []).filter((item) => (
    normalizeSchoolClassName(item.className) === CLASS_NAME
    || /12[^0-9]*6/i.test(safeText(item.className))
  ));

  const loaded = [];
  for (const meta of metas) {
    const result = await loadHomeroomWorkspace(user, meta.id);
    if (result.workspace && isClass126(result.workspace)) loaded.push(result.workspace);
  }

  const current = loaded.find((workspace) => workspace.id === currentId);
  if (current) return current;
  const active = loaded.filter((workspace) => workspace.status !== 'archived');
  if (active.length) {
    return active.sort((a, b) => (Date.parse(b.updatedAt || 0) || 0) - (Date.parse(a.updatedAt || 0) || 0))[0];
  }

  const directCandidates = candidates.filter((item) => !item.source.endsWith('-backup'));
  return directCandidates.sort((a, b) => (Date.parse(b.createdAt || 0) || 0) - (Date.parse(a.createdAt || 0) || 0))[0]?.workspace || null;
}

function resultMessage(result) {
  if (result.status === 'restored') {
    return `Đã khôi phục lớp 12.6: ${result.after.gradebookScores} ô điểm, ${result.after.learningRecords} bản ghi điểm cũ, ${result.after.conductActive} ghi nhận rèn luyện và ${result.after.attendanceExceptions} lượt chuyên cần khác Có mặt.`;
  }
  if (result.status === 'not-found') {
    return 'Không tìm thấy bản sao dữ liệu điểm hoặc rèn luyện cũ của lớp 12.6 trên thiết bị hay cloud. Hệ thống không ghi đè thêm dữ liệu hiện tại.';
  }
  return '';
}

export async function recoverClass126Data() {
  const user = await getCurrentUser();
  if (!user?.id || user.approved === false) return { status: 'skipped', changed: false };

  const candidates = [
    ...collectLocalCandidates(user),
    ...(await collectCloudCandidates(user)),
  ];
  const target = await resolveTargetWorkspace(user, candidates);
  if (!target) return { status: 'not-found', changed: false, candidates: candidates.length };

  collectWorkspaceAndBackups(target, 'target', candidates, `Lớp đang dùng · ${target.id}`);
  const recovery = buildRecoveredWorkspace(target, candidates);
  if (!recovery.changed) {
    const hasRecoverableData = candidates.some((candidate) => dataWeight(candidate.metrics) > 0);
    return {
      status: hasRecoverableData ? 'already-complete' : 'not-found',
      changed: false,
      candidates: candidates.length,
      before: recovery.before,
      after: recovery.after,
    };
  }

  const backedUp = createManualBackup(target, user, 'Trước khi khôi phục dữ liệu lớp 12.6');
  const merged = {
    ...recovery.workspace,
    id: target.id,
    students: target.students,
    classProfile: target.classProfile,
    schoolAssignment: target.schoolAssignment,
    backups: backedUp.backups,
    recoveryMeta: {
      ...(target.recoveryMeta || {}),
      class126RecoveredAt: new Date().toISOString(),
      sources: recovery.sources,
      before: recovery.before,
      after: recovery.after,
    },
  };
  const committed = prepareWorkspaceCommit(
    backedUp,
    merged,
    user,
    `Khôi phục điểm và rèn luyện lớp 12.6 từ ${recovery.sources.join(' · ')}`,
  );
  const saved = await saveHomeroomWorkspace(committed, user);
  if (saved?.ok === false) {
    return {
      status: 'local-only',
      changed: true,
      warning: saved.message || 'Đã khôi phục trên thiết bị nhưng chưa đồng bộ cloud.',
      before: recovery.before,
      after: recovery.after,
      sources: recovery.sources,
    };
  }

  return {
    status: 'restored',
    changed: true,
    before: recovery.before,
    after: recovery.after,
    sources: recovery.sources,
  };
}

export function announceClass126Recovery(result) {
  if (!result || typeof window === 'undefined') return;
  window.__BES_CLASS_126_RECOVERY_RESULT__ = result;
  window.dispatchEvent(new CustomEvent(RESULT_EVENT, { detail: result }));
  const message = resultMessage(result);
  if (!message) return;
  const noticeSignature = `${result.status}:${JSON.stringify(result.after || {})}`;
  try {
    if (sessionStorage.getItem(SESSION_NOTICE_KEY) === noticeSignature) return;
    sessionStorage.setItem(SESSION_NOTICE_KEY, noticeSignature);
  } catch { /* optional */ }
  window.setTimeout(() => window.alert(message), 900);
}
