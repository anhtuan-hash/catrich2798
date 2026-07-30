import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

export const PERSONNEL_DIRECTORY_EVENT = 'bes-personnel-directory-cloud-updated';
export const PERSONNEL_SOURCE_MODULE = 'personnel-directory-v2';
export const PERSONNEL_ITEM_TYPE = 'personnel_profile';
export const LEGACY_PERSONNEL_STORAGE_KEY = 'bes-personnel-directory-v1';

const PERSONNEL_COLUMNS = [
  'id', 'title', 'description', 'item_type', 'status', 'priority', 'visibility',
  'owner_id', 'created_by', 'assignee_ids', 'watcher_ids', 'metadata',
  'source_module', 'created_at', 'updated_at', 'submitted_at', 'reviewed_at',
].join(',');

const PROFILE_FIELDS = [
  'position', 'department', 'employmentType', 'employmentStatus',
  'assignment', 'phone', 'otherDegrees',
];

const DEGREE_LEVEL_RANK = {
  doctorate: 5,
  doctoral_candidate: 4,
  master: 3,
  bachelor: 2,
  college: 1,
};

const DEGREE_LEVELS = new Set(Object.keys(DEGREE_LEVEL_RANK));

function text(value) {
  return String(value ?? '').trim();
}

function stringArray(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(String).map((item) => item.trim()).filter(Boolean))];
}

function degreeHasContent(degree = {}) {
  return Boolean(
    degree.level || degree.degreeName || degree.major || degree.specialization
    || degree.institution || degree.graduationYear,
  );
}

export function createEmptyPersonnelDegree(index = 0) {
  return {
    id: `degree-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    level: '',
    degreeName: '',
    major: '',
    specialization: '',
    institution: '',
    graduationYear: '',
    isHighest: false,
  };
}

function cleanDegree(input = {}, index = 0) {
  const level = DEGREE_LEVELS.has(text(input.level || input.degreeLevel))
    ? text(input.level || input.degreeLevel)
    : '';
  return {
    id: text(input.id) || `degree-${index + 1}`,
    level,
    degreeName: text(input.degreeName || input.name),
    major: text(input.major),
    specialization: text(input.specialization),
    institution: text(input.institution),
    graduationYear: text(input.graduationYear).replace(/[^0-9]/g, '').slice(0, 4),
    isHighest: input.isHighest === true,
  };
}

function legacyDegree(input = {}) {
  const candidate = cleanDegree({
    id: 'legacy-degree-1',
    level: input.degreeLevel,
    degreeName: input.degreeName,
    major: input.major,
    specialization: input.specialization,
    institution: input.institution,
    graduationYear: input.graduationYear,
    isHighest: true,
  }, 0);
  return degreeHasContent(candidate) ? candidate : null;
}

export function cleanPersonnelDegrees(input = {}) {
  const legacy = legacyDegree(input);
  const source = Array.isArray(input.degrees) ? input.degrees : (legacy ? [legacy] : []);
  const degrees = source.map(cleanDegree).filter(degreeHasContent);
  if (!degrees.length) return [];

  let highestIndex = degrees.findIndex((degree) => degree.isHighest);
  if (highestIndex < 0) {
    highestIndex = degrees.reduce((bestIndex, degree, index, list) => {
      const bestRank = DEGREE_LEVEL_RANK[list[bestIndex]?.level] || 0;
      const rank = DEGREE_LEVEL_RANK[degree.level] || 0;
      return rank > bestRank ? index : bestIndex;
    }, 0);
  }
  return degrees.map((degree, index) => ({ ...degree, isHighest: index === highestIndex }));
}

export function getHighestPersonnelDegree(input = {}) {
  const degrees = Array.isArray(input) ? cleanPersonnelDegrees({ degrees: input }) : cleanPersonnelDegrees(input);
  return degrees.find((degree) => degree.isHighest) || degrees[0] || null;
}

export function cleanPersonnelRecord(input = {}) {
  const next = {};
  PROFILE_FIELDS.forEach((field) => { next[field] = text(input[field]); });
  next.employmentType = ['core', 'visiting'].includes(input.employmentType) ? input.employmentType : 'core';
  next.employmentStatus = ['active', 'leave', 'inactive'].includes(input.employmentStatus) ? input.employmentStatus : 'active';
  next.degrees = cleanPersonnelDegrees(input);

  // Compatibility projection for existing filters, exports and dashboard summaries.
  // The authoritative source is now the structured degrees array.
  const highest = getHighestPersonnelDegree(next.degrees);
  next.degreeLevel = highest?.level || '';
  next.degreeName = highest?.degreeName || '';
  next.major = highest?.major || '';
  next.specialization = highest?.specialization || '';
  next.institution = highest?.institution || '';
  next.graduationYear = highest?.graduationYear || '';
  next.updatedAt = text(input.updatedAt) || new Date().toISOString();
  return next;
}

export function emptyPersonnelRecord({ position = 'Giáo viên', department = 'Tổ Tiếng Anh' } = {}) {
  return cleanPersonnelRecord({
    position,
    department,
    employmentType: 'core',
    employmentStatus: 'active',
    degrees: [],
  });
}

export function readLegacyPersonnelRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_PERSONNEL_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function profileUserId(row) {
  return text(row?.metadata?.profile_user_id)
    || stringArray(row?.assignee_ids)[0]
    || text(row?.owner_id);
}

export function normalizePersonnelItem(row = {}) {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return {
    ...row,
    profileUserId: profileUserId(row),
    displayName: text(metadata.display_name),
    email: text(metadata.email),
    approvedProfile: metadata.approved_profile ? cleanPersonnelRecord(metadata.approved_profile) : null,
    proposedProfile: metadata.proposed_profile ? cleanPersonnelRecord(metadata.proposed_profile) : null,
    proposalNote: text(metadata.proposal_note),
    reviewNote: text(metadata.review_note),
    requestedAt: text(metadata.requested_at || row.submitted_at),
    requestedBy: text(metadata.requested_by),
    reviewedAt: text(metadata.reviewed_at || row.reviewed_at),
    reviewedBy: text(metadata.reviewed_by),
  };
}

function emitDirectoryChange(detail = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PERSONNEL_DIRECTORY_EVENT, { detail }));
  }
}

function metadataFor({ existing = null, targetUser, approvedProfile, proposedProfile, proposalNote = '', reviewNote = '', actorId = '', mode = 'approved' }) {
  const previous = existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {};
  const now = new Date().toISOString();
  const metadata = {
    ...previous,
    workflow_type: 'personnel_profile',
    profile_version: 3,
    supports_multiple_degrees: true,
    profile_user_id: text(targetUser?.id),
    display_name: text(targetUser?.name || targetUser?.full_name || targetUser?.email?.split('@')?.[0] || previous.display_name || 'Giáo viên'),
    email: text(targetUser?.email || previous.email),
    approved_profile: approvedProfile ? cleanPersonnelRecord(approvedProfile) : (previous.approved_profile || null),
    proposed_profile: proposedProfile ? cleanPersonnelRecord(proposedProfile) : null,
    proposal_note: text(proposalNote),
    review_note: text(reviewNote),
  };
  if (mode === 'submitted') {
    metadata.requested_at = now;
    metadata.requested_by = actorId;
    metadata.reviewed_at = null;
    metadata.reviewed_by = null;
  } else if (mode === 'reviewed') {
    metadata.reviewed_at = now;
    metadata.reviewed_by = actorId;
  }
  return metadata;
}

export async function listPersonnelDirectoryItems() {
  const client = getRuntimeClient();
  if (!client) return { items: [], cloudReady: false };
  const { data, error } = await client
    .from('work_hub_items')
    .select(PERSONNEL_COLUMNS)
    .eq('source_module', PERSONNEL_SOURCE_MODULE)
    .order('updated_at', { ascending: false })
    .limit(500);
  if (error) return { items: [], cloudReady: true, error: error.message || String(error) };
  const latestByUser = new Map();
  (data || []).map(normalizePersonnelItem).forEach((item) => {
    if (!item.profileUserId || latestByUser.has(item.profileUserId)) return;
    latestByUser.set(item.profileUserId, item);
  });
  return { items: [...latestByUser.values()], cloudReady: true };
}

async function insertPersonnelItem({ currentUser, targetUser, approvedProfile = null, proposedProfile = null, proposalNote = '', status = 'approved' }) {
  const client = getRuntimeClient();
  if (!client || !currentUser?.id || !targetUser?.id) return { ok: false, message: 'Supabase chưa sẵn sàng.' };
  const now = new Date().toISOString();
  const submitted = status === 'submitted';
  const payload = {
    title: `Hồ sơ chuyên môn · ${text(targetUser.name || targetUser.full_name || targetUser.email?.split('@')?.[0] || 'Giáo viên')}`,
    description: 'Hồ sơ nhân sự đồng bộ giữa giáo viên và TTCM.',
    item_type: PERSONNEL_ITEM_TYPE,
    status,
    priority: submitted ? 'high' : 'normal',
    visibility: 'restricted',
    owner_id: currentUser.id,
    created_by: currentUser.id,
    assignee_ids: [targetUser.id],
    watcher_ids: [],
    source_module: PERSONNEL_SOURCE_MODULE,
    submitted_at: submitted ? now : null,
    reviewed_at: submitted ? null : now,
    metadata: metadataFor({
      targetUser,
      approvedProfile,
      proposedProfile,
      proposalNote,
      actorId: currentUser.id,
      mode: submitted ? 'submitted' : 'reviewed',
    }),
  };
  const { data, error } = await client.from('work_hub_items').insert(payload).select(PERSONNEL_COLUMNS).single();
  if (error) return { ok: false, message: error.message || String(error) };
  const item = normalizePersonnelItem(data);
  emitDirectoryChange({ action: 'created', item });
  return { ok: true, item };
}

async function updatePersonnelItem(item, patch) {
  const client = getRuntimeClient();
  if (!client || !item?.id) return { ok: false, message: 'Không tìm thấy hồ sơ đồng bộ.' };
  const { data, error } = await client
    .from('work_hub_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', item.id)
    .select(PERSONNEL_COLUMNS)
    .single();
  if (error) return { ok: false, message: error.message || String(error) };
  const next = normalizePersonnelItem(data);
  emitDirectoryChange({ action: 'updated', item: next });
  return { ok: true, item: next };
}

export async function saveApprovedPersonnelProfile({ currentUser, targetUser, record, existingItem = null }) {
  const approvedProfile = cleanPersonnelRecord(record);
  if (!existingItem) {
    return insertPersonnelItem({ currentUser, targetUser, approvedProfile, status: 'approved' });
  }
  const now = new Date().toISOString();
  return updatePersonnelItem(existingItem, {
    status: 'approved',
    priority: 'normal',
    reviewed_at: now,
    metadata: metadataFor({
      existing: existingItem,
      targetUser,
      approvedProfile,
      proposedProfile: null,
      proposalNote: '',
      reviewNote: '',
      actorId: currentUser.id,
      mode: 'reviewed',
    }),
  });
}

export async function submitPersonnelProposal({ currentUser, record, proposalNote = '', existingItem = null }) {
  const targetUser = currentUser;
  const proposedProfile = cleanPersonnelRecord(record);
  if (!existingItem) {
    return insertPersonnelItem({ currentUser, targetUser, proposedProfile, proposalNote, status: 'submitted' });
  }
  return updatePersonnelItem(existingItem, {
    status: 'submitted',
    priority: 'high',
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
    metadata: metadataFor({
      existing: existingItem,
      targetUser,
      approvedProfile: existingItem.approvedProfile,
      proposedProfile,
      proposalNote,
      reviewNote: '',
      actorId: currentUser.id,
      mode: 'submitted',
    }),
  });
}

export async function reviewPersonnelProposal({ currentUser, targetUser, existingItem, decision, reviewNote = '' }) {
  if (!existingItem?.proposedProfile) return { ok: false, message: 'Không có đề xuất đang chờ duyệt.' };
  const approved = decision === 'approve';
  const now = new Date().toISOString();
  return updatePersonnelItem(existingItem, {
    status: approved ? 'approved' : 'changes_requested',
    priority: approved ? 'normal' : 'high',
    reviewed_at: now,
    metadata: metadataFor({
      existing: existingItem,
      targetUser,
      approvedProfile: approved ? existingItem.proposedProfile : existingItem.approvedProfile,
      proposedProfile: approved ? null : existingItem.proposedProfile,
      proposalNote: approved ? '' : existingItem.proposalNote,
      reviewNote,
      actorId: currentUser.id,
      mode: 'reviewed',
    }),
  });
}

export async function migrateLegacyPersonnelRecords({ currentUser, accounts = [], cloudItems = [] }) {
  const legacy = readLegacyPersonnelRecords();
  const existingIds = new Set((cloudItems || []).map((item) => item.profileUserId));
  const candidates = (accounts || []).filter((account) => account?.id && legacy[account.id] && !existingIds.has(account.id));
  if (!candidates.length) return { ok: true, migrated: 0, items: [] };
  const created = [];
  for (const account of candidates) {
    const result = await saveApprovedPersonnelProfile({
      currentUser,
      targetUser: account,
      record: legacy[account.id],
      existingItem: null,
    });
    if (!result.ok) return { ok: false, migrated: created.length, items: created, message: result.message };
    created.push(result.item);
  }
  return { ok: true, migrated: created.length, items: created };
}

export function subscribePersonnelDirectory(onChange) {
  return subscribeTable({
    key: 'personnel-directory-v2',
    table: 'work_hub_items',
    filter: `source_module=eq.${PERSONNEL_SOURCE_MODULE}`,
    onChange,
  });
}
