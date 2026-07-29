import { getUsers } from './auth.js';
import { isSupabaseConfigured, supabase } from './supabase.js';

const STORAGE_VERSION = 2;
const STORAGE_PREFIX = 'bes-brian-team-workspace-v1';
const CLOUD_TABLE = 'department_team_workspaces';
const DIRECTORY_ROLES = new Set([
  'teacher', 'admin', 'department_head', 'department-head',
  'ttcm', 'to_truong', 'tổ trưởng', 'department_leader',
  'department leader', 'subject_leader', 'subject leader', 'leader',
]);

function accountScope(user) {
  return String(user?.id || user?.email || 'department-leader')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-') || 'department-leader';
}

function storageKey(user) {
  return `${STORAGE_PREFIX}:${accountScope(user)}`;
}

function uid(prefix = 'item') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function stringArray(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function createMemberRecord(input = {}) {
  return {
    id: String(input.id || uid('member')),
    teacherAccountId: String(input.teacherAccountId || input.teacher_account_id || ''),
    role: ['head', 'deputy', 'teacher'].includes(input.role) ? input.role : 'teacher',
    staffCode: String(input.staffCode || input.staff_code || ''),
    joinedAt: String(input.joinedAt || input.joined_at || new Date().toISOString().slice(0, 10)),
    appointmentDate: String(input.appointmentDate || input.appointment_date || ''),
    dateOfBirth: String(input.dateOfBirth || input.date_of_birth || ''),
    gender: ['male', 'female', 'other'].includes(input.gender) ? input.gender : '',
    phone: String(input.phone || ''),
    address: String(input.address || ''),
    emergencyContactName: String(input.emergencyContactName || input.emergency_contact_name || ''),
    emergencyContactPhone: String(input.emergencyContactPhone || input.emergency_contact_phone || ''),
    employmentType: input.employmentType === 'visiting' ? 'visiting' : 'core',
    contractType: ['permanent', 'fixed_term', 'visiting', 'probation', 'other'].includes(input.contractType)
      ? input.contractType
      : (input.employmentType === 'visiting' ? 'visiting' : 'permanent'),
    professionalTitle: String(input.professionalTitle || input.professional_title || ''),
    teacherRank: String(input.teacherRank || input.teacher_rank || ''),
    qualification: String(input.qualification || ''),
    degreeMajor: String(input.degreeMajor || input.degree_major || ''),
    trainingInstitution: String(input.trainingInstitution || input.training_institution || ''),
    graduationYear: String(input.graduationYear || input.graduation_year || ''),
    yearsOfExperience: Math.max(0, Number(input.yearsOfExperience || input.years_of_experience || 0)),
    teachingSubject: String(input.teachingSubject || input.teaching_subject || 'Tiếng Anh'),
    teachingGrades: stringArray(input.teachingGrades),
    teachingClasses: stringArray(input.teachingClasses),
    weeklyPeriods: Math.max(0, Number(input.weeklyPeriods || 0)),
    homeroomClass: String(input.homeroomClass || ''),
    additionalDuties: String(input.additionalDuties || input.additional_duties || ''),
    certifications: String(input.certifications || ''),
    strengths: String(input.strengths || ''),
    achievements: String(input.achievements || ''),
    status: ['active', 'leave', 'inactive'].includes(input.status) ? input.status : 'active',
    note: String(input.note || ''),
  };
}

function createEnglishDepartment(currentUser) {
  const currentId = String(currentUser?.id || '');
  return {
    id: 'english-thpt',
    name: 'Tổ Tiếng Anh THPT',
    shortName: 'Tiếng Anh',
    schoolLevel: 'THPT',
    subject: 'Tiếng Anh',
    color: '#2F6F78',
    description: 'Không gian quản lí nhân sự và công việc của Tổ Tiếng Anh THPT.',
    createdAt: new Date().toISOString(),
    headAccountId: currentId,
    members: currentId ? [createMemberRecord({
      teacherAccountId: currentId,
      role: 'head',
      joinedAt: new Date().toISOString().slice(0, 10),
      teachingSubject: 'Tiếng Anh',
    })] : [],
    assignments: [],
    documentRequirements: [],
    absences: [],
    evaluations: [],
  };
}

export function createDefaultTeamWorkspace(currentUser) {
  const department = createEnglishDepartment(currentUser);
  return {
    version: STORAGE_VERSION,
    activeDepartmentId: department.id,
    departments: [department],
    preferences: {
      fontScale: 100,
      memberView: 'cards',
    },
    updatedAt: new Date().toISOString(),
  };
}

function normalizeMember(member = {}) {
  return createMemberRecord(member);
}

function normalizeDepartment(department = {}, currentUser = null, index = 0) {
  const fallback = index === 0 ? createEnglishDepartment(currentUser) : null;
  return {
    id: String(department.id || fallback?.id || uid('department')),
    name: String(department.name || fallback?.name || `Tổ chuyên môn ${index + 1}`),
    shortName: String(department.shortName || fallback?.shortName || department.name || 'Tổ mới'),
    schoolLevel: String(department.schoolLevel || fallback?.schoolLevel || 'THPT'),
    subject: String(department.subject || fallback?.subject || ''),
    color: String(department.color || fallback?.color || '#2F6F78'),
    description: String(department.description || fallback?.description || ''),
    createdAt: String(department.createdAt || fallback?.createdAt || new Date().toISOString()),
    headAccountId: String(department.headAccountId || fallback?.headAccountId || currentUser?.id || ''),
    members: Array.isArray(department.members)
      ? department.members.map(normalizeMember).filter((item) => item.teacherAccountId)
      : (fallback?.members || []),
    assignments: Array.isArray(department.assignments) ? department.assignments : [],
    documentRequirements: Array.isArray(department.documentRequirements) ? department.documentRequirements : [],
    absences: Array.isArray(department.absences) ? department.absences : [],
    evaluations: Array.isArray(department.evaluations) ? department.evaluations : [],
  };
}

export function normalizeTeamWorkspace(raw, currentUser) {
  if (!raw || typeof raw !== 'object') return createDefaultTeamWorkspace(currentUser);
  const departments = Array.isArray(raw.departments) && raw.departments.length
    ? raw.departments.map((item, index) => normalizeDepartment(item, currentUser, index))
    : [createEnglishDepartment(currentUser)];
  const activeDepartmentId = departments.some((item) => item.id === raw.activeDepartmentId)
    ? raw.activeDepartmentId
    : departments[0].id;
  return {
    version: STORAGE_VERSION,
    activeDepartmentId,
    departments,
    preferences: {
      fontScale: [90, 100, 110, 120, 125].includes(Number(raw.preferences?.fontScale))
        ? Number(raw.preferences.fontScale)
        : 100,
      memberView: raw.preferences?.memberView === 'table' ? 'table' : 'cards',
    },
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
  };
}

function readLocalWorkspace(currentUser) {
  try {
    const raw = window.localStorage.getItem(storageKey(currentUser));
    return raw ? normalizeTeamWorkspace(JSON.parse(raw), currentUser) : createDefaultTeamWorkspace(currentUser);
  } catch {
    return createDefaultTeamWorkspace(currentUser);
  }
}

function writeLocalWorkspace(currentUser, workspace) {
  const normalized = normalizeTeamWorkspace({ ...workspace, updatedAt: new Date().toISOString() }, currentUser);
  try {
    window.localStorage.setItem(storageKey(currentUser), JSON.stringify(normalized));
  } catch {
    // The in-memory workspace remains usable when browser storage is unavailable.
  }
  return normalized;
}

export async function loadTeamWorkspace(currentUser) {
  const localWorkspace = readLocalWorkspace(currentUser);
  if (!isSupabaseConfigured || !currentUser?.id) {
    return { workspace: localWorkspace, source: 'local', cloudReady: false };
  }

  try {
    const { data, error } = await supabase
      .from(CLOUD_TABLE)
      .select('payload,updated_at')
      .eq('owner_id', currentUser.id)
      .maybeSingle();
    if (error) throw error;
    if (!data?.payload) return { workspace: localWorkspace, source: 'local', cloudReady: true };
    const cloudWorkspace = normalizeTeamWorkspace(data.payload, currentUser);
    writeLocalWorkspace(currentUser, cloudWorkspace);
    return { workspace: cloudWorkspace, source: 'cloud', cloudReady: true };
  } catch (error) {
    return {
      workspace: localWorkspace,
      source: 'local',
      cloudReady: false,
      warning: error?.message || 'Cloud workspace is not ready.',
    };
  }
}

export async function saveTeamWorkspace(currentUser, workspace) {
  const normalized = writeLocalWorkspace(currentUser, workspace);
  if (!isSupabaseConfigured || !currentUser?.id) {
    return { ok: true, source: 'local', workspace: normalized };
  }

  try {
    const { error } = await supabase.from(CLOUD_TABLE).upsert({
      owner_id: currentUser.id,
      payload: normalized,
      updated_by: currentUser.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'owner_id' });
    if (error) throw error;
    return { ok: true, source: 'cloud', workspace: normalized };
  } catch (error) {
    return {
      ok: true,
      source: 'local',
      workspace: normalized,
      warning: error?.message || 'Saved locally because cloud storage is unavailable.',
    };
  }
}

function normalizeAccount(profile = {}) {
  return {
    id: String(profile.id || profile.authId || ''),
    name: String(profile.full_name || profile.name || profile.email?.split('@')?.[0] || 'Giáo viên'),
    email: String(profile.email || ''),
    role: String(profile.role || 'teacher'),
    approved: profile.approved !== false,
    school: String(profile.school || ''),
    avatarUrl: String(profile.avatar_url || profile.avatarUrl || ''),
    createdAt: String(profile.created_at || profile.createdAt || ''),
  };
}

function mergeDirectoryAccounts(...groups) {
  const accounts = new Map();
  groups.flat().filter(Boolean).forEach((profile) => {
    const item = normalizeAccount(profile);
    if (!item.id) return;
    const previous = accounts.get(item.id) || {};
    accounts.set(item.id, { ...previous, ...item });
  });
  return [...accounts.values()]
    .filter((item) => item.id && item.approved && DIRECTORY_ROLES.has(String(item.role || '').toLowerCase()))
    .sort((left, right) => String(left.name || left.email).localeCompare(String(right.name || right.email), 'vi'));
}

export async function listTeamTeacherAccounts(currentUser) {
  let rpcAccounts = [];
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('bes_department_list_teacher_accounts');
      if (!error && Array.isArray(data)) rpcAccounts = data;
    } catch {
      // Fall through to the existing account directory.
    }
  }

  let directoryAccounts = [];
  if (!rpcAccounts.length || String(currentUser?.role || '').toLowerCase() === 'admin') {
    try {
      directoryAccounts = await getUsers();
    } catch {
      directoryAccounts = [];
    }
  }

  const merged = mergeDirectoryAccounts(rpcAccounts, directoryAccounts, currentUser?.id ? [currentUser] : []);
  if (merged.length) return merged;
  return currentUser?.id ? [normalizeAccount({ ...currentUser, approved: true })] : [];
}

export function createDepartment(input = {}, currentUser = null) {
  return normalizeDepartment({
    id: uid('department'),
    name: input.name,
    shortName: input.shortName,
    schoolLevel: input.schoolLevel,
    subject: input.subject,
    color: input.color,
    description: input.description,
    headAccountId: currentUser?.id || '',
    createdAt: new Date().toISOString(),
    members: currentUser?.id ? [createMemberRecord({
      teacherAccountId: currentUser.id,
      role: 'head',
      joinedAt: new Date().toISOString().slice(0, 10),
      teachingSubject: input.subject || '',
    })] : [],
  }, currentUser, 1);
}

export function createTeamMember(input = {}) {
  return createMemberRecord({ ...input, id: input.id || uid('member') });
}

export function createTeamId(prefix = 'item') {
  return uid(prefix);
}
