import crypto from 'node:crypto';
import { ensureFolder, getConnection, resourceCategoryFolderName, uploadFile } from './_googleDrive.js';
import { normaliseResourceCategory } from './_resourceCategoryFolders.js';
import { appendApiAudit, createRequestId, enforceRateLimit, requireApprovedUser, sendJson } from './_security.js';

const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;

function cleanText(value, maxLength = 500) {
  return String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, maxLength);
}

function cleanTags(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(source.map((entry) => cleanText(entry, 48).toLowerCase()).filter(Boolean))].slice(0, 12);
}

async function findProfile(adminClient, userId) {
  if (!userId) return null;
  for (const column of ['id', 'user_id', 'profile_id']) {
    const { data, error } = await adminClient.from('profiles').select('*').eq(column, userId).limit(1).maybeSingle();
    if (!error && data) return data;
    if (error && !/column .* does not exist|42703/i.test(String(error.message || ''))) break;
  }
  return null;
}

function attachmentPath(entry) {
  return cleanText(entry?.path, 600);
}

export default async function handler(req, res) {
  const requestId = createRequestId();
  let uploadedDriveFileId = '';
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    const context = await requireApprovedUser(req, { roles: ['admin', 'department_head'] });
    await enforceRateLimit(context, { feature: 'work_hub_resource_archive', perMinute: 12, perDay: 200 });

    const commentId = cleanText(req.body?.commentId, 80);
    const requestedPath = cleanText(req.body?.attachmentPath, 600);
    const title = cleanText(req.body?.title, 220);
    const category = normaliseResourceCategory(req.body?.category || 'other');
    const description = cleanText(req.body?.description, 4000);
    const grade = cleanText(req.body?.grade, 40);
    const schoolYear = cleanText(req.body?.schoolYear, 40);
    const unitName = cleanText(req.body?.unitName, 180);
    const tags = [...new Set(['work-hub', 'teacher-submission', ...cleanTags(req.body?.tags)])].slice(0, 12);

    if (!commentId || !requestedPath) throw new Error('Thiếu thông tin phản hồi hoặc tệp cần lưu.');
    if (!title) throw new Error('Vui lòng nhập tên tài liệu.');

    const { data: comment, error: commentError } = await context.adminClient
      .from('work_hub_comments')
      .select('*')
      .eq('id', commentId)
      .maybeSingle();
    if (commentError) throw new Error(commentError.message);
    if (!comment) throw new Error('Không tìm thấy phản hồi công việc.');

    const { data: item, error: itemError } = await context.adminClient
      .from('work_hub_items')
      .select('*')
      .eq('id', comment.item_id)
      .maybeSingle();
    if (itemError) throw new Error(itemError.message);
    if (!item) throw new Error('Không tìm thấy công việc liên quan.');

    const attachments = Array.isArray(comment.attachments) ? comment.attachments : [];
    const attachment = attachments.find((entry) => attachmentPath(entry) === requestedPath);
    if (!attachment) throw new Error('Tệp không còn thuộc phản hồi này.');

    if (attachment.library_resource_id) {
      const { data: existingResource } = await context.adminClient
        .from('resource_items')
        .select('*')
        .eq('id', attachment.library_resource_id)
        .maybeSingle();
      return sendJson(res, 200, {
        ok: true,
        reused: true,
        resource: existingResource || null,
        comment,
        message: 'Tệp đã được lưu trong Kho học liệu trước đó.',
      });
    }

    const bucket = cleanText(attachment.bucket || 'work-hub-submissions', 120);
    const sourcePath = attachmentPath(attachment);
    const { data: sourceBlob, error: downloadError } = await context.adminClient.storage.from(bucket).download(sourcePath);
    if (downloadError || !sourceBlob) throw new Error(downloadError?.message || 'Không thể đọc tệp nộp từ kho lưu trữ.');

    const buffer = Buffer.from(await sourceBlob.arrayBuffer());
    if (!buffer.length) throw new Error('Tệp nộp không có dữ liệu.');
    if (buffer.length > MAX_ARCHIVE_BYTES) throw new Error('Tệp vượt quá giới hạn lưu trữ 25 MB.');

    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const { data: duplicate } = await context.adminClient
      .from('resource_items')
      .select('*')
      .eq('checksum', checksum)
      .neq('status', 'archived')
      .limit(1)
      .maybeSingle();

    let resource = duplicate || null;
    let uploaded = null;
    const now = new Date().toISOString();
    const submitterProfile = await findProfile(context.adminClient, comment.author_id);
    const submitterName = cleanText(
      submitterProfile?.full_name || submitterProfile?.name || submitterProfile?.email || attachment.uploaded_by || 'Giáo viên',
      180,
    );

    if (!resource) {
      const { client: driveDb, connection, accessToken } = await getConnection();
      const folderName = resourceCategoryFolderName(category);
      const folderMap = connection.folder_map || {};
      const targetFolderId = folderMap[folderName]
        || await ensureFolder(accessToken, folderName, connection.root_folder_id);
      const fileName = cleanText(attachment.name || sourcePath.split('/').pop() || 'tai-lieu', 180);
      const mimeType = cleanText(attachment.mime || sourceBlob.type || 'application/octet-stream', 160);

      uploaded = await uploadFile(accessToken, buffer, {
        name: fileName,
        parents: [targetFolderId],
        appProperties: {
          besResource: 'true',
          category,
          sourceModule: 'work-hub',
          workItemId: String(item.id),
          workCommentId: String(comment.id),
          submittedBy: String(comment.author_id || ''),
          archivedBy: String(context.user.id),
        },
      }, mimeType);
      uploadedDriveFileId = uploaded.id;

      const resourceId = crypto.randomUUID();
      const row = {
        id: resourceId,
        title,
        description: description || `Tệp do ${submitterName} nộp cho công việc “${cleanText(item.title, 240)}”.`,
        category,
        category_id: category,
        grade,
        school_year: schoolYear,
        unit_name: unitName,
        cefr: '',
        skills: [],
        tags,
        source: `Trung tâm công việc · ${cleanText(item.title, 240)}`,
        copyright_status: 'internal',
        visibility: 'department',
        allow_download: true,
        status: 'approved',
        is_featured: false,
        uploader_id: comment.author_id || null,
        uploader_name: submitterName,
        mime_type: mimeType,
        file_name: fileName,
        file_size: buffer.length,
        drive_file_id: uploaded.id,
        drive_web_view_link: uploaded.webViewLink || null,
        drive_download_link: uploaded.webContentLink || null,
        ai_summary: description || cleanText(comment.body, 1200),
        ai_uses: [],
        extracted_text: '',
        checksum,
        version_number: 1,
        parent_resource_id: null,
        approved_at: now,
        approved_by: context.user.email || context.user.id,
        created_at: now,
        updated_at: now,
      };

      const { data: inserted, error: insertError } = await context.adminClient
        .from('resource_items')
        .insert(row)
        .select('*')
        .single();
      if (insertError) throw new Error(insertError.message);
      resource = inserted;

      await driveDb.from('resource_activity_logs').insert({
        actor_id: context.user.id,
        resource_id: resource.id,
        action: 'archive_work_submission',
        details: {
          work_item_id: item.id,
          work_comment_id: comment.id,
          attachment_path: sourcePath,
          submitted_by: comment.author_id,
          category,
        },
      });
    }

    const nextAttachments = attachments.map((entry) => attachmentPath(entry) === requestedPath ? {
      ...entry,
      library_resource_id: resource.id,
      library_title: resource.title,
      library_category: resource.category || resource.category_id || category,
      library_drive_file_id: resource.drive_file_id || uploaded?.id || '',
      archived_to_library_at: now,
      archived_by: context.user.id,
    } : entry);

    const { data: updatedComment, error: updateError } = await context.adminClient
      .from('work_hub_comments')
      .update({ attachments: nextAttachments, updated_at: now })
      .eq('id', comment.id)
      .select('*')
      .single();
    if (updateError) throw new Error(updateError.message);

    await context.adminClient.from('work_hub_activity').insert({
      item_id: item.id,
      actor_id: context.user.id,
      event_type: 'submission_archived_to_library',
      message: `Đã lưu “${resource.title}” vào Kho học liệu`,
      payload: {
        comment_id: comment.id,
        resource_id: resource.id,
        attachment_path: sourcePath,
        category: resource.category || resource.category_id || category,
        reused: Boolean(duplicate),
      },
    });

    await appendApiAudit(context, {
      endpoint: '/api/work-hub-archive-resource',
      action: 'archive_work_submission',
      status: 'ok',
      requestId,
      details: {
        itemId: item.id,
        commentId: comment.id,
        resourceId: resource.id,
        category,
        reused: Boolean(duplicate),
        fileSize: buffer.length,
      },
    });

    return sendJson(res, 200, {
      ok: true,
      reused: Boolean(duplicate),
      resource,
      comment: updatedComment,
      message: duplicate
        ? 'Tệp đã tồn tại trong Kho học liệu và đã được liên kết với phản hồi.'
        : 'Đã lưu tệp vào Kho học liệu và duyệt chia sẻ cho giáo viên trong tổ.',
    });
  } catch (error) {
    return sendJson(res, Number(error?.status || 400), {
      error: error?.message || 'Không thể lưu tệp vào Kho học liệu.',
      requestId,
      uploadedDriveFileId: uploadedDriveFileId || undefined,
    }, error?.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {});
  }
}
