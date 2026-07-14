import { isSupabaseConfigured, supabase } from './supabase.js';

export const DEPARTMENT_SNAPSHOT_TABLE = 'department_workspace_snapshots';
export const DEPARTMENT_SUBMISSIONS_TABLE = 'department_submissions';
export const DEPARTMENT_SUBMISSION_REQUESTS_TABLE = 'department_submission_requests';
export const DEPARTMENT_EVIDENCE_BUCKET = 'department-evidence';
export const DEPARTMENT_SNAPSHOT_EVENT = 'bes-department-snapshot-updated';
export const DEPARTMENT_SUBMISSIONS_EVENT = 'bes-department-submissions-updated';
export const DEPARTMENT_SUBMISSION_REQUESTS_EVENT = 'bes-department-submission-requests-updated';

function dispatchEvent(name) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name));
  }
}

function cleanSchoolYear(value) {
  return String(value || '').trim() || '2026-2027';
}

function cleanText(value, fallback = '') {
  return String(value || fallback).trim();
}

function cleanFileName(value = 'evidence-file') {
  const original = String(value || 'evidence-file').trim();
  const safe = original
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  return safe || 'evidence-file';
}

function isFileLike(value) {
  return value && typeof value === 'object' && typeof value.name === 'string' && typeof value.size === 'number';
}

function buildSubmissionSelect() {
  return 'id,school_year,semester,request_id,request_title,request_category,title,category,link,note,related_task,submitter_id,submitter_email,submitter_name,status,review_note,reviewed_by_email,reviewed_at,file_name,file_path,file_mime,file_size,archive_folder,archive_note,archived_by_email,archived_at,created_at,updated_at';
}

function buildSubmissionRequestSelect() {
  return 'id,school_year,semester,title,category,description,due_date,target_mode,target_emails,status,created_by,created_by_email,file_name,file_path,file_mime,file_size,created_at,updated_at';
}

function cleanEmailList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
  return String(value || '')
    .split(/[\n,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function addSignedEvidenceUrls(items = []) {
  if (!canUseCloudDepartmentStore()) return items;
  const rows = Array.isArray(items) ? items : [];
  return Promise.all(rows.map(async (item) => {
    if (!item?.file_path) return item;
    try {
      const { data, error } = await supabase
        .storage
        .from(DEPARTMENT_EVIDENCE_BUCKET)
        .createSignedUrl(item.file_path, 60 * 60);
      if (error || !data?.signedUrl) return item;
      return { ...item, file_signed_url: data.signedUrl };
    } catch {
      return item;
    }
  }));
}

export function canUseCloudDepartmentStore() {
  return isSupabaseConfigured && Boolean(supabase);
}

export async function uploadDepartmentSubmissionFile(file, user, schoolYear = '2026-2027') {
  if (!canUseCloudDepartmentStore()) {
    return { ok: false, offline: true, message: 'Supabase is not configured.' };
  }
  if (!isFileLike(file)) return { ok: true, file: null };
  if (!user?.id) return { ok: false, message: 'You must sign in before uploading evidence.' };

  const maxBytes = 50 * 1024 * 1024;
  if (file.size > maxBytes) return { ok: false, message: 'File is larger than 50 MB.' };

  const folderYear = cleanSchoolYear(schoolYear).replace(/[^a-zA-Z0-9._-]+/g, '-');
  const fileName = cleanFileName(file.name);
  const filePath = `${user.id}/${folderYear}/${Date.now()}-${fileName}`;

  const { error } = await supabase
    .storage
    .from(DEPARTMENT_EVIDENCE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (error) {
    return { ok: false, message: `${error.message}. Hãy kiểm tra đã chạy supabase/schema.sql và bucket ${DEPARTMENT_EVIDENCE_BUCKET} đã được tạo.` };
  }

  const signed = await addSignedEvidenceUrls([{ file_path: filePath }]);
  return {
    ok: true,
    file: {
      file_name: file.name,
      file_path: filePath,
      file_mime: file.type || '',
      file_size: file.size || 0,
      file_signed_url: signed?.[0]?.file_signed_url || '',
    },
  };
}

export async function uploadDepartmentRequestFile(file, user, schoolYear = '2026-2027') {
  if (!canUseCloudDepartmentStore()) {
    return { ok: false, offline: true, message: 'Supabase is not configured.' };
  }
  if (!isFileLike(file)) return { ok: true, file: null };
  if (!user?.id) return { ok: false, message: 'You must sign in before uploading request attachments.' };

  const maxBytes = 50 * 1024 * 1024;
  if (file.size > maxBytes) return { ok: false, message: 'File is larger than 50 MB.' };

  const folderYear = cleanSchoolYear(schoolYear).replace(/[^a-zA-Z0-9._-]+/g, '-');
  const fileName = cleanFileName(file.name);
  const filePath = `requests/${user.id}/${folderYear}/${Date.now()}-${fileName}`;

  const { error } = await supabase
    .storage
    .from(DEPARTMENT_EVIDENCE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (error) {
    return { ok: false, message: `${error.message}. Hãy kiểm tra policy đọc request attachments trong supabase/schema.sql.` };
  }

  const signed = await addSignedEvidenceUrls([{ file_path: filePath }]);
  return {
    ok: true,
    file: {
      file_name: file.name,
      file_path: filePath,
      file_mime: file.type || '',
      file_size: file.size || 0,
      file_signed_url: signed?.[0]?.file_signed_url || '',
    },
  };
}

export async function loadDepartmentSnapshot(schoolYear = '2026-2027') {
  if (!canUseCloudDepartmentStore()) {
    return { ok: false, offline: true, message: 'Supabase is not configured.' };
  }

  const { data, error } = await supabase
    .from(DEPARTMENT_SNAPSHOT_TABLE)
    .select('school_year,semester,payload,updated_by,updated_by_email,updated_at')
    .eq('school_year', cleanSchoolYear(schoolYear))
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: true, empty: true, snapshot: null };
  return { ok: true, snapshot: data };
}

export async function saveDepartmentSnapshot(workspaceData, user) {
  if (!canUseCloudDepartmentStore()) {
    return { ok: false, offline: true, message: 'Supabase is not configured.' };
  }
  if (!workspaceData || typeof workspaceData !== 'object') {
    return { ok: false, message: 'Workspace data is missing.' };
  }

  const schoolYear = cleanSchoolYear(workspaceData.schoolYear);
  const payload = {
    ...workspaceData,
    schoolYear,
    cloudSavedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(DEPARTMENT_SNAPSHOT_TABLE)
    .upsert({
      school_year: schoolYear,
      semester: String(workspaceData.semester || ''),
      payload,
      updated_by: user?.id || null,
      updated_by_email: user?.email || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'school_year' })
    .select('school_year,semester,payload,updated_by_email,updated_at')
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  dispatchEvent(DEPARTMENT_SNAPSHOT_EVENT);
  return { ok: true, snapshot: data };
}

export async function listDepartmentSnapshots() {
  if (!canUseCloudDepartmentStore()) return [];
  const { data, error } = await supabase
    .from(DEPARTMENT_SNAPSHOT_TABLE)
    .select('school_year,semester,updated_by_email,updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}


export async function listDepartmentSubmissionRequests(schoolYear = '2026-2027') {
  if (!canUseCloudDepartmentStore()) {
    return { ok: false, offline: true, message: 'Supabase is not configured.', requests: [] };
  }
  const { data, error } = await supabase
    .from(DEPARTMENT_SUBMISSION_REQUESTS_TABLE)
    .select(buildSubmissionRequestSelect())
    .eq('school_year', cleanSchoolYear(schoolYear))
    .order('created_at', { ascending: false });

  if (error) return { ok: false, message: error.message, requests: [] };
  const requests = await addSignedEvidenceUrls(data || []);
  return { ok: true, requests };
}

export async function createDepartmentSubmissionRequest(input, user) {
  if (!canUseCloudDepartmentStore()) {
    return { ok: false, offline: true, message: 'Supabase is not configured.' };
  }
  if (!user?.id) return { ok: false, message: 'You must sign in before creating a request.' };
  const title = cleanText(input?.title);
  if (!title) return { ok: false, message: 'Request title is required.' };

  const targetMode = input?.targetMode === 'selected' ? 'selected' : 'all';
  const targetEmails = targetMode === 'selected' ? cleanEmailList(input?.targetEmails) : [];
  const uploaded = await uploadDepartmentRequestFile(input?.file, user, input?.schoolYear);
  if (!uploaded.ok) return uploaded;
  const fileMeta = uploaded.file || {};
  const { data, error } = await supabase
    .from(DEPARTMENT_SUBMISSION_REQUESTS_TABLE)
    .insert({
      school_year: cleanSchoolYear(input?.schoolYear),
      semester: cleanText(input?.semester),
      title,
      category: cleanText(input?.category, 'Báo cáo'),
      description: cleanText(input?.description),
      due_date: cleanText(input?.dueDate) || null,
      target_mode: targetMode,
      target_emails: targetEmails,
      status: 'open',
      created_by: user.id,
      created_by_email: user.email || '',
      file_name: fileMeta.file_name || null,
      file_path: fileMeta.file_path || null,
      file_mime: fileMeta.file_mime || null,
      file_size: fileMeta.file_size || null,
    })
    .select(buildSubmissionRequestSelect())
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  const [request] = await addSignedEvidenceUrls([data]);
  dispatchEvent(DEPARTMENT_SUBMISSION_REQUESTS_EVENT);
  return { ok: true, request };
}

export async function updateDepartmentSubmissionRequestStatus(id, status = 'closed') {
  if (!canUseCloudDepartmentStore()) {
    return { ok: false, offline: true, message: 'Supabase is not configured.' };
  }
  const cleanStatus = status === 'open' ? 'open' : 'closed';
  const { data, error } = await supabase
    .from(DEPARTMENT_SUBMISSION_REQUESTS_TABLE)
    .update({ status: cleanStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(buildSubmissionRequestSelect())
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  dispatchEvent(DEPARTMENT_SUBMISSION_REQUESTS_EVENT);
  return { ok: true, request: data };
}

export async function listDepartmentSubmissions(schoolYear = '2026-2027') {
  if (!canUseCloudDepartmentStore()) {
    return { ok: false, offline: true, message: 'Supabase is not configured.', submissions: [] };
  }
  const { data, error } = await supabase
    .from(DEPARTMENT_SUBMISSIONS_TABLE)
    .select(buildSubmissionSelect())
    .eq('school_year', cleanSchoolYear(schoolYear))
    .order('created_at', { ascending: false });

  if (error) return { ok: false, message: error.message, submissions: [] };
  const submissions = await addSignedEvidenceUrls(data || []);
  return { ok: true, submissions };
}

export async function createDepartmentSubmission(input, user) {
  if (!canUseCloudDepartmentStore()) {
    return { ok: false, offline: true, message: 'Supabase is not configured.' };
  }
  if (!user?.id) return { ok: false, message: 'You must sign in before submitting evidence.' };

  const title = cleanText(input?.title);
  if (!title) return { ok: false, message: 'Title is required.' };

  const requestId = cleanText(input?.requestId);
  if (!requestId) return { ok: false, message: 'Submission requires an open department notice/request from the department leader.' };

  const { data: request, error: requestError } = await supabase
    .from(DEPARTMENT_SUBMISSION_REQUESTS_TABLE)
    .select(buildSubmissionRequestSelect())
    .eq('id', requestId)
    .eq('school_year', cleanSchoolYear(input?.schoolYear))
    .eq('status', 'open')
    .maybeSingle();

  if (requestError || !request) {
    return { ok: false, message: requestError?.message || 'This submission request is no longer open or you are not included in it.' };
  }

  const uploaded = await uploadDepartmentRequestFile(input?.file, user, input?.schoolYear);
  if (!uploaded.ok) return uploaded;
  const fileMeta = uploaded.file || {};

  const { data, error } = await supabase
    .from(DEPARTMENT_SUBMISSIONS_TABLE)
    .insert({
      school_year: cleanSchoolYear(input?.schoolYear),
      semester: cleanText(input?.semester),
      request_id: request.id,
      request_title: request.title || '',
      request_category: request.category || '',
      title,
      category: cleanText(input?.category, request.category || 'Báo cáo'),
      link: cleanText(input?.link),
      note: cleanText(input?.note),
      related_task: cleanText(input?.relatedTask),
      submitter_id: user.id,
      submitter_email: user.email || '',
      submitter_name: user.name || user.full_name || user.email || '',
      status: 'pending',
      file_name: fileMeta.file_name || null,
      file_path: fileMeta.file_path || null,
      file_mime: fileMeta.file_mime || null,
      file_size: fileMeta.file_size || null,
    })
    .select(buildSubmissionSelect())
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  const [submission] = await addSignedEvidenceUrls([data]);
  dispatchEvent(DEPARTMENT_SUBMISSIONS_EVENT);
  return { ok: true, submission };
}

export async function reviewDepartmentSubmission(id, status, reviewNote, reviewer) {
  if (!canUseCloudDepartmentStore()) {
    return { ok: false, offline: true, message: 'Supabase is not configured.' };
  }
  const cleanStatus = ['approved', 'rejected', 'pending'].includes(status) ? status : 'pending';
  const { data, error } = await supabase
    .from(DEPARTMENT_SUBMISSIONS_TABLE)
    .update({
      status: cleanStatus,
      review_note: cleanText(reviewNote),
      reviewed_by: reviewer?.id || null,
      reviewed_by_email: reviewer?.email || '',
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(buildSubmissionSelect())
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  const [submission] = await addSignedEvidenceUrls([data]);
  dispatchEvent(DEPARTMENT_SUBMISSIONS_EVENT);
  return { ok: true, submission };
}


export async function archiveDepartmentSubmission(id, input = {}, user) {
  if (!canUseCloudDepartmentStore()) {
    return { ok: false, offline: true, message: 'Supabase is not configured.' };
  }
  const archived = input?.archived !== false;
  const payload = archived
    ? {
        archive_folder: cleanText(input?.archiveFolder, 'Hồ sơ đã duyệt'),
        archive_note: cleanText(input?.archiveNote),
        archived_by: user?.id || null,
        archived_by_email: user?.email || '',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    : {
        archive_folder: null,
        archive_note: '',
        archived_by: null,
        archived_by_email: '',
        archived_at: null,
        updated_at: new Date().toISOString(),
      };

  const { data, error } = await supabase
    .from(DEPARTMENT_SUBMISSIONS_TABLE)
    .update(payload)
    .eq('id', id)
    .select(buildSubmissionSelect())
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  const [submission] = await addSignedEvidenceUrls([data]);
  dispatchEvent(DEPARTMENT_SUBMISSIONS_EVENT);
  return { ok: true, submission };
}

export async function cancelDepartmentSubmission(id) {
  if (!canUseCloudDepartmentStore()) {
    return { ok: false, offline: true, message: 'Supabase is not configured.' };
  }
  const { data, error } = await supabase
    .from(DEPARTMENT_SUBMISSIONS_TABLE)
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(buildSubmissionSelect())
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  const [submission] = await addSignedEvidenceUrls([data]);
  dispatchEvent(DEPARTMENT_SUBMISSIONS_EVENT);
  return { ok: true, submission };
}
