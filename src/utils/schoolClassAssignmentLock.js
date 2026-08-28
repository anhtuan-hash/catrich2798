import { normalizeSchoolClassName } from './schoolClassRegistry.js';

function text(value) {
  return String(value ?? '').trim();
}

function normalizeTeacherIds(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean))];
}

function actorLabel(actor) {
  return text(actor?.email || actor?.name || actor?.id || actor?.authId);
}

function assignmentSnapshot(value = {}) {
  return {
    homeroomTeacherId: text(value?.homeroomTeacherId),
    subjectTeacherIds: normalizeTeacherIds(value?.subjectTeacherIds),
  };
}

export function normalizeAssignmentLocks(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const output = {};
  Object.entries(source).forEach(([rawClassName, rawLock]) => {
    const className = normalizeSchoolClassName(rawClassName);
    if (!className || !rawLock || typeof rawLock !== 'object') return;
    const snapshot = assignmentSnapshot(rawLock);
    output[className] = {
      locked: rawLock.locked === true,
      lockedAt: text(rawLock.lockedAt),
      lockedBy: text(rawLock.lockedBy),
      unlockedAt: text(rawLock.unlockedAt),
      unlockedBy: text(rawLock.unlockedBy),
      ...snapshot,
    };
  });
  return output;
}

export function applyAssignmentLocks(registry, rawLocks = registry?.assignmentLocks) {
  if (!registry || typeof registry !== 'object') return registry;
  const assignmentLocks = normalizeAssignmentLocks(rawLocks);
  return {
    ...registry,
    assignmentLocks,
    classes: (Array.isArray(registry.classes) ? registry.classes : []).map((item) => {
      const className = normalizeSchoolClassName(item?.className);
      const lock = className ? assignmentLocks[className] : null;
      if (!lock?.locked) return item;
      return {
        ...item,
        assignment: {
          ...(item.assignment || {}),
          homeroomTeacherId: lock.homeroomTeacherId,
          subjectTeacherIds: [...lock.subjectTeacherIds],
        },
      };
    }),
  };
}

export function preserveAssignmentLocks(nextRegistry, previousRegistry) {
  return applyAssignmentLocks({
    ...(nextRegistry || {}),
    assignmentLocks: normalizeAssignmentLocks(previousRegistry?.assignmentLocks),
  });
}

export function isClassAssignmentLocked(registry, className) {
  const target = normalizeSchoolClassName(className);
  return Boolean(target && normalizeAssignmentLocks(registry?.assignmentLocks)[target]?.locked);
}

export function getClassAssignmentLock(registry, className) {
  const target = normalizeSchoolClassName(className);
  if (!target) return null;
  return normalizeAssignmentLocks(registry?.assignmentLocks)[target] || null;
}

export function lockClassAssignment(registry, className, actor = null) {
  const target = normalizeSchoolClassName(className);
  const current = applyAssignmentLocks(registry);
  if (!target || !current) return current;
  const item = (current.classes || []).find((entry) => entry.className === target);
  if (!item) return current;
  const lockedAt = new Date().toISOString();
  const snapshot = assignmentSnapshot(item.assignment);
  return applyAssignmentLocks({
    ...current,
    updatedAt: lockedAt,
    assignmentLocks: {
      ...normalizeAssignmentLocks(current.assignmentLocks),
      [target]: {
        locked: true,
        lockedAt,
        lockedBy: actorLabel(actor),
        unlockedAt: '',
        unlockedBy: '',
        ...snapshot,
      },
    },
  });
}

export function unlockClassAssignment(registry, className, actor = null) {
  const target = normalizeSchoolClassName(className);
  const current = applyAssignmentLocks(registry);
  if (!target || !current) return current;
  const locks = normalizeAssignmentLocks(current.assignmentLocks);
  const existing = locks[target];
  if (!existing?.locked) return current;
  const unlockedAt = new Date().toISOString();
  return {
    ...current,
    updatedAt: unlockedAt,
    assignmentLocks: {
      ...locks,
      [target]: {
        ...existing,
        locked: false,
        unlockedAt,
        unlockedBy: actorLabel(actor),
      },
    },
  };
}

export function lockAllAssignedClasses(registry, actor = null) {
  let next = applyAssignmentLocks(registry);
  (next?.classes || []).forEach((item) => {
    const assignment = item.assignment || {};
    const hasAssignment = Boolean(text(assignment.homeroomTeacherId) || normalizeTeacherIds(assignment.subjectTeacherIds).length);
    if (hasAssignment && !isClassAssignmentLocked(next, item.className)) {
      next = lockClassAssignment(next, item.className, actor);
    }
  });
  return next;
}

export function lockedHomeroomConflict(registry, teacherId, exceptClassName = '') {
  const selectedTeacherId = text(teacherId);
  const except = normalizeSchoolClassName(exceptClassName);
  if (!selectedTeacherId) return null;
  const current = applyAssignmentLocks(registry);
  return (current?.classes || []).find((item) => (
    item.className !== except
    && isClassAssignmentLocked(current, item.className)
    && text(item.assignment?.homeroomTeacherId) === selectedTeacherId
  )) || null;
}
