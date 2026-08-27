import { matchGradebookClassToAssignment } from './gradebookTeachingAssignments.js';

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

export function currentSchoolYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export function normalizeSchoolYear(value) {
  return text(value)
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '');
}

export function isAssignedGradebookWorkspace(workspace) {
  const profile = workspace?.classProfile || {};
  return Boolean(text(profile.assignmentSource) || text(profile.assignmentDepartmentId));
}

export function findWorkspaceAssignment(workspace, assignments = []) {
  if (!workspace) return null;
  const item = {
    className: workspace.classProfile?.className || '',
    teachingSubject: workspace.classProfile?.teachingSubject || '',
    subject: workspace.classProfile?.teachingSubject || '',
  };
  return (Array.isArray(assignments) ? assignments : []).find((assignment) => (
    matchGradebookClassToAssignment(item, assignment)
  )) || null;
}

export function evaluateGradebookAssignmentLifecycle(
  workspace,
  assignments = [],
  assignmentSource = 'loading',
  date = new Date(),
) {
  if (!workspace) {
    return {
      status: 'none',
      label: 'Chưa có lớp',
      authoritative: false,
      sharingAllowed: false,
      rosterEditable: false,
      assignment: null,
    };
  }

  const assignedWorkspace = isAssignedGradebookWorkspace(workspace);
  if (!assignedWorkspace) {
    return {
      status: 'private',
      label: 'Lớp tự tạo · roster riêng',
      authoritative: true,
      sharingAllowed: true,
      rosterEditable: true,
      assignment: null,
    };
  }

  const schoolYear = normalizeSchoolYear(workspace.classProfile?.schoolYear);
  const currentYear = normalizeSchoolYear(currentSchoolYear(date));
  if (schoolYear && schoolYear !== currentYear) {
    return {
      status: 'historical',
      label: `Sổ lịch sử · ${schoolYear}`,
      authoritative: true,
      sharingAllowed: false,
      rosterEditable: false,
      assignment: null,
    };
  }

  const authoritative = assignmentSource === 'brian-team-sync';
  const assignment = findWorkspaceAssignment(workspace, assignments);
  if (assignment) {
    return {
      status: 'active',
      label: 'Phân công đang hiệu lực',
      authoritative: true,
      sharingAllowed: true,
      rosterEditable: true,
      assignment,
    };
  }

  if (authoritative) {
    return {
      status: 'ended',
      label: 'Phân công đã kết thúc · roster chỉ đọc',
      authoritative: true,
      sharingAllowed: false,
      rosterEditable: false,
      assignment: null,
    };
  }

  return {
    status: 'unverified',
    label: 'Đang xác minh phân công',
    authoritative: false,
    // Keep existing behavior during sync outage. Server RLS remains the final authority.
    sharingAllowed: true,
    rosterEditable: true,
    assignment: null,
  };
}
