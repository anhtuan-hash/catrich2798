export const STUDENT_SUPPORT_RULE_TYPES = Object.freeze([
  'attendance_count',
  'grade_window_drop',
  'consecutive_scores_below',
  'observation_count',
  'combined_all',
]);

export const STUDENT_SUPPORT_CASE_STATUSES = Object.freeze([
  'NEW', 'REVIEWING', 'ACTIVE', 'FOLLOW_UP', 'RESOLVED', 'CLOSED', 'NO_ACTION_REQUIRED',
]);

export const STUDENT_SUPPORT_ALERT_STATUSES = Object.freeze([
  'NEW', 'REVIEWING', 'LINKED_TO_CASE', 'NO_ACTION_REQUIRED', 'RESOLVED', 'ARCHIVED',
]);

export const STUDENT_SUPPORT_ACTION_STATUSES = Object.freeze([
  'TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED',
]);

export const STUDENT_SUPPORT_NOTE_VISIBILITY = Object.freeze([
  'PRIVATE', 'HOMEROOM', 'TEACHING_TEAM', 'MANAGEMENT',
]);

export const STUDENT_SUPPORT_OBSERVATION_TYPES = Object.freeze([
  'TASK_INCOMPLETE',
  'MATERIAL_NOT_PREPARED',
  'CLASS_TASK_INCOMPLETE',
  'LATE_ARRIVAL',
  'ABSENCE_OBSERVED',
  'POSITIVE_PROGRESS',
  'GOOD_PARTICIPATION',
  'HELPED_PEERS',
  'OTHER_FACTUAL',
]);
