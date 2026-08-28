function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export const ATTENDANCE_LOCK_ERROR = 'attendance-session-locked';
export const ATTENDANCE_UNLOCK_ERROR = 'attendance-unlock-requires-correction';

const SUBJECT_RESTORE_STUDENT_FIELDS = [
  'id', 'code', 'fullName', 'birthDate', 'gender', 'notes',
  'active', 'lifecycleStatus', 'inactiveReason', 'inactiveAt', 'transferClass',
  'createdAt', 'updatedAt',
];

const CONDUCT_SECURITY_FIELDS = [
  'lockPasswordHash',
  'lockPasswordChangedAt',
  'lockPasswordChangedBy',
  'lockPasswordUsesDefault',
  'requireLockPassword',
];

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function currentStudentFor(snapshotStudent, currentStudents) {
  const id = text(snapshotStudent?.id);
  const code = text(snapshotStudent?.code);
  return currentStudents.find((student) => (
    (id && text(student?.id) === id)
    || (code && text(student?.code) === code)
  )) || null;
}

function sanitizeRestoredStudent(snapshotStudent, currentStudents, subjectMode) {
  const source = objectValue(snapshotStudent);
  const current = currentStudentFor(source, currentStudents);
  const candidate = { ...source };

  // A backup must never revive an old/revoked portal credential.
  if (current) {
    candidate.portalPin = current.portalPin;
    candidate.pinUpdatedAt = current.pinUpdatedAt;
  } else {
    delete candidate.portalPin;
    delete candidate.pinUpdatedAt;
  }

  if (!subjectMode) return candidate;
  const clean = {};
  SUBJECT_RESTORE_STUDENT_FIELDS.forEach((key) => {
    if (candidate[key] !== undefined) clean[key] = candidate[key];
  });
  return clean;
}

export function getAttendanceLockViolation(previousWorkspace, nextWorkspace) {
  const previous = previousWorkspace && typeof previousWorkspace === 'object' ? previousWorkspace : {};
  const next = nextWorkspace && typeof nextWorkspace === 'object' ? nextWorkspace : {};
  const locks = previous.attendanceLocks && typeof previous.attendanceLocks === 'object'
    ? previous.attendanceLocks
    : {};

  for (const [sessionKey, lock] of Object.entries(locks)) {
    if (!lock?.locked) continue;

    const nextLock = next.attendanceLocks?.[sessionKey];
    const attendanceChanged = !sameJson(previous.attendance?.[sessionKey], next.attendance?.[sessionKey]);
    const sessionChanged = !sameJson(previous.attendanceSessions?.[sessionKey], next.attendanceSessions?.[sessionKey]);

    if (nextLock?.locked) {
      if (attendanceChanged || sessionChanged) {
        return {
          code: ATTENDANCE_LOCK_ERROR,
          sessionKey,
          message: 'Phiên điểm danh đã chốt nên không thể sửa dữ liệu trực tiếp. Hãy tạo yêu cầu chỉnh sửa trước.',
        };
      }
      continue;
    }

    const correction = (next.correctionRequests || []).find((request) => (
      text(request?.sessionKey) === sessionKey
      && text(request?.reason)
      && ['pending', 'approved'].includes(text(request?.status, 'pending'))
    ));

    if (!correction) {
      return {
        code: ATTENDANCE_UNLOCK_ERROR,
        sessionKey,
        message: 'Muốn mở khóa phiên điểm danh phải có yêu cầu chỉnh sửa kèm lý do.',
      };
    }

    if (attendanceChanged || sessionChanged) {
      return {
        code: ATTENDANCE_LOCK_ERROR,
        sessionKey,
        message: 'Mở khóa và sửa dữ liệu phải là hai thao tác riêng. Hãy mở khóa hợp lệ trước rồi mới chỉnh điểm danh.',
      };
    }
  }

  return null;
}

export function stripRetiredRestoreFields(workspace) {
  if (!workspace || typeof workspace !== 'object') return workspace;
  const {
    learning,
    learningTab,
    legacyLearning,
    portalLegacy,
    legacyPortal,
    ...safe
  } = workspace;
  return safe;
}

export function sanitizeWorkspaceBackupSnapshot(workspace) {
  const safe = stripRetiredRestoreFields(workspace);
  if (!safe || typeof safe !== 'object') return safe;
  const portalConfig = objectValue(safe.portalConfig);
  const conductSettings = objectValue(safe.conductSettings);
  const sanitizedConduct = { ...conductSettings };
  CONDUCT_SECURITY_FIELDS.forEach((key) => { delete sanitizedConduct[key]; });
  return {
    ...safe,
    students: Array.isArray(safe.students) ? safe.students.map((student) => {
      const item = { ...objectValue(student) };
      delete item.portalPin;
      delete item.pinUpdatedAt;
      return item;
    }) : [],
    portalConfig: {
      ...portalConfig,
      enabled: false,
      parentCode: '',
      studentCode: '',
      subjectCode: '',
      publishedAt: '',
    },
    conductSettings: sanitizedConduct,
  };
}

export function sanitizeWorkspaceRestoreSnapshot(snapshot, currentWorkspace) {
  const safeSnapshot = stripRetiredRestoreFields(snapshot);
  if (!safeSnapshot || typeof safeSnapshot !== 'object') return safeSnapshot;
  const current = objectValue(currentWorkspace);
  const currentProfile = objectValue(current.classProfile);
  const snapshotProfile = objectValue(safeSnapshot.classProfile);
  const classType = text(currentProfile.classType, text(snapshotProfile.classType, 'homeroom'));
  const subjectMode = classType === 'subject';
  const currentStudents = Array.isArray(current.students) ? current.students : [];
  const snapshotSettings = objectValue(safeSnapshot.settings);
  const currentSettings = objectValue(current.settings);
  const snapshotConduct = objectValue(safeSnapshot.conductSettings);
  const currentConduct = objectValue(current.conductSettings);
  const restoredConduct = { ...snapshotConduct };

  CONDUCT_SECURITY_FIELDS.forEach((key) => {
    if (currentConduct[key] !== undefined) restoredConduct[key] = currentConduct[key];
    else delete restoredConduct[key];
  });

  return stripRetiredRestoreFields({
    ...safeSnapshot,
    id: text(current.id, text(safeSnapshot.id, 'default')),
    status: current.status ?? safeSnapshot.status,
    archivedAt: current.archivedAt ?? safeSnapshot.archivedAt,
    classProfile: { ...snapshotProfile, classType },
    students: Array.isArray(safeSnapshot.students)
      ? safeSnapshot.students.map((student) => sanitizeRestoredStudent(student, currentStudents, subjectMode))
      : [],
    // Restore content, never old access-control state.
    portalConfig: current.portalConfig ? { ...objectValue(current.portalConfig) } : objectValue(safeSnapshot.portalConfig),
    settings: {
      ...snapshotSettings,
      privacyMode: currentSettings.privacyMode ?? snapshotSettings.privacyMode,
      inactivityLogoutMinutes: currentSettings.inactivityLogoutMinutes ?? snapshotSettings.inactivityLogoutMinutes,
    },
    conductSettings: restoredConduct,
  });
}
