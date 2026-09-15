function clean(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

function requireValue(value, label, max) {
  const result = clean(value, max);
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

export function validateCaseInput(input = {}) {
  return {
    student_ref: requireValue(input.studentRef || input.student_ref, 'student identity', 240),
    homeroom_workspace_id: requireValue(input.workspaceId || input.homeroom_workspace_id, 'workspace', 240),
    source_class_name: clean(input.className || input.source_class_name, 180),
    school_year: clean(input.schoolYear || input.school_year, 80),
    category: requireValue(input.category, 'category', 120).toUpperCase(),
    title: requireValue(input.title, 'title', 240),
    reason: clean(input.reason, 4000),
    goal: clean(input.goal, 4000),
    follow_up_at: input.followUpAt || input.follow_up_at || null,
  };
}

export function validateActionInput(input = {}) {
  return {
    case_id: requireValue(input.caseId || input.case_id, 'case', 80),
    student_ref: requireValue(input.studentRef || input.student_ref, 'student identity', 240),
    homeroom_workspace_id: requireValue(input.workspaceId || input.homeroom_workspace_id, 'workspace', 240),
    title: requireValue(input.title, 'title', 240),
    description: clean(input.description, 4000),
    due_at: input.dueAt || input.due_at || null,
  };
}
