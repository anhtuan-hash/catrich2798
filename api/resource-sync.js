import crypto from 'node:crypto';
import { adminClient, isManagerUser, requireUser, send } from '../server/api/_googleDrive.js';
import { normaliseResourceCategory } from '../server/api/_resourceCategoryFolders.js';
import externalAppRequestsHandler from '../server/externalAppRequestsHandler.js';

const VALID_STATUS = new Set(['pending', 'approved', 'revision', 'rejected', 'archived']);
const RESOURCE_SYNC_COLUMNS = [
  'id', 'title', 'description', 'category', 'grade', 'school_year', 'unit_name', 'cefr', 'skills', 'tags',
  'source', 'copyright_status', 'visibility', 'allow_download', 'status', 'is_featured', 'uploader_id',
  'uploader_name', 'mime_type', 'file_name', 'file_size', 'drive_file_id', 'drive_web_view_link',
  'drive_download_link', 'ai_summary', 'ai_uses', 'checksum', 'version_number', 'parent_resource_id',
  'created_at', 'updated_at', 'approved_at', 'approved_by', 'views', 'downloads', 'deleted_at',
].join(',');

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function cleanArray(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry || '').trim()).filter(Boolean) : [];
}

function rowFromItem(item, user, manager, existing = null) {
  const requestedStatus = String(item.status || existing?.status || 'pending').trim().toLowerCase();
  const status = manager && VALID_STATUS.has(requestedStatus) ? requestedStatus : 'pending';
  const suppliedUploaderId = isUuid(item.uploaderId) ? item.uploaderId : null;
  const uploaderId = manager && suppliedUploaderId ? suppliedUploaderId : (existing?.uploader_id || user.id);
  const row = {
    title: String(item.title || item.fileName || existing?.title || 'Tài liệu').trim(),
    description: String(item.description || existing?.description || ''),
    category: normaliseResourceCategory(item.category || existing?.category),
    grade: String(item.grade || existing?.grade || ''),
    school_year: String(item.schoolYear || item.school_year || existing?.school_year || ''),
    unit_name: String(item.unitName || item.unit_name || existing?.unit_name || ''),
    cefr: String(item.cefr || existing?.cefr || ''),
    skills: cleanArray(item.skills || existing?.skills),
    tags: cleanArray(item.tags || existing?.tags),
    source: String(item.source || existing?.source || ''),
    copyright_status: String(item.copyright || item.copyright_status || existing?.copyright_status || 'internal'),
    visibility: String(item.visibility || existing?.visibility || 'department'),
    allow_download: item.allowDownload !== false && item.allow_download !== false,
    status,
    is_featured: Boolean(item.featured || item.is_featured || existing?.is_featured),
    uploader_id: uploaderId,
    uploader_name: String(item.uploaderName || item.uploader_name || existing?.uploader_name || user.email || ''),
    mime_type: String(item.mimeType || item.mime_type || existing?.mime_type || ''),
    file_name: String(item.fileName || item.file_name || existing?.file_name || ''),
    file_size: Number(item.size || item.file_size || existing?.file_size || 0),
    drive_file_id: String(item.driveFileId || item.drive_file_id || existing?.drive_file_id || '') || null,
    drive_web_view_link: String(item.driveWebViewLink || item.drive_web_view_link || existing?.drive_web_view_link || '') || null,
    drive_download_link: String(item.driveDownloadLink || item.drive_download_link || existing?.drive_download_link || '') || null,
    ai_summary: String(item.aiSummary || item.ai_summary || existing?.ai_summary || ''),
    ai_uses: Array.isArray(item.aiUses || item.ai_uses) ? (item.aiUses || item.ai_uses) : (existing?.ai_uses || []),
    checksum: String(item.checksum || existing?.checksum || ''),
    version_number: Number(item.version || item.version_number || existing?.version_number || 1),
    parent_resource_id: isUuid(item.parentResourceId || item.parent_resource_id)
      ? (item.parentResourceId || item.parent_resource_id)
      : (existing?.parent_resource_id || null),
    approved_at: status === 'approved' ? (item.approvedAt || item.approved_at || existing?.approved_at || new Date().toISOString()) : null,
    approved_by: status === 'approved' ? String(item.approvedBy || item.approved_by || existing?.approved_by || user.email || '') : null,
    updated_at: new Date().toISOString(),
  };

  // `extracted_text` can be tens of thousands of characters. Preserve the existing
  // database value by omitting the column unless the caller explicitly sends a new value.
  if (Object.prototype.hasOwnProperty.call(item, 'extractedText') || Object.prototype.hasOwnProperty.call(item, 'extracted_text')) {
    row.extracted_text = String(item.extractedText ?? item.extracted_text ?? '').slice(0, 60000);
  }
  return row;
}

async function findExisting(client, item) {
  const candidateId = item.cloudId || item.id;
  if (isUuid(candidateId)) {
    const { data, error } = await client.from('resource_items').select(RESOURCE_SYNC_COLUMNS).eq('id', candidateId).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
  }

  const driveFileId = String(item.driveFileId || item.drive_file_id || '');
  if (driveFileId) {
    const { data, error } = await client.from('resource_items').select(RESOURCE_SYNC_COLUMNS).eq('drive_file_id', driveFileId).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
  }

  const checksum = String(item.checksum || '');
  if (checksum) {
    const { data, error } = await client.from('resource_items').select(RESOURCE_SYNC_COLUMNS).eq('checksum', checksum).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
  }
  return null;
}

export default async function handler(req, res) {
  if (String(req.query?.scope || '') === 'external-app-requests') {
    return externalAppRequestsHandler(req, res);
  }

  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const user = await requireUser(req);
    const client = adminClient();
    const item = req.body?.item || req.body || {};
    if (!item || typeof item !== 'object') throw new Error('Missing resource data');

    const manager = await isManagerUser(client, user);
    const uploaderMatches = !item.uploaderId
      || item.uploaderId === user.id
      || String(item.uploaderName || '').toLowerCase() === String(user.email || '').toLowerCase();
    if (!manager && !uploaderMatches) throw new Error('Bạn chỉ có thể đồng bộ tài liệu do mình tải lên');

    const existing = await findExisting(client, item);
    const row = rowFromItem(item, user, manager, existing);
    let saved;

    if (existing?.id) {
      const { data, error } = await client.from('resource_items').update(row).eq('id', existing.id).select(RESOURCE_SYNC_COLUMNS).single();
      if (error) throw new Error(error.message);
      saved = data;
    } else {
      const requestedId = item.cloudId || item.id;
      const insertRow = {
        id: isUuid(requestedId) ? requestedId : crypto.randomUUID(),
        ...row,
        created_at: item.createdAt || item.created_at || new Date().toISOString(),
      };
      const { data, error } = await client.from('resource_items').insert(insertRow).select(RESOURCE_SYNC_COLUMNS).single();
      if (error) throw new Error(error.message);
      saved = data;
    }

    await client.from('resource_activity_logs').insert({
      actor_id: user.id,
      resource_id: saved.id,
      action: existing ? 'repair_sync_update' : 'repair_sync_insert',
      details: {
        driveFileId: saved.drive_file_id || null,
        title: saved.title,
        status: saved.status,
        category: saved.category || 'other',
      },
    });

    return send(res, 200, { ok: true, item: saved, repaired: !existing });
  } catch (error) {
    return send(res, 400, { error: error.message });
  }
}
