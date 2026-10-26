import { supabase, isSupabaseConfigured } from '../../../utils/supabase.js';
import { saveEventDraft } from './eventService.js';
import { autoAttachPosterToDraft } from './eventPosterTemplates.js';
import { scheduleItemToEvent } from '../../../utils/workScheduleImport.js';
import { detectScheduleEvent, draftFromScheduleRow } from '../../../utils/scheduleEventDetection.mjs';

const database = () => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Chưa kết nối Supabase.');
  return supabase;
};

/** All reviewers must be verified admins by the UI AND by the existing database RLS. */
export async function listScheduleEventSuggestions(limit = 500) {
  const { data, error } = await database().from('work_hub_items')
    .select('id,title,description,item_type,status,priority,visibility,due_at,metadata,created_at')
    .eq('item_type', 'schedule').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).filter((item) => item.metadata?.schedule_event_detection?.approvalStatus === 'pending')
    .map((item) => {
      const row = {
        ...scheduleItemToEvent(item),
        timeKnown: item.metadata?.schedule_has_explicit_time === true,
        endTimeKnown: item.metadata?.schedule_has_explicit_end_time === true,
      };
      return { item, row, detection: item.metadata.schedule_event_detection };
    });
}

/**
 * Creates a DRAFT only, never recipients or a popup. Idempotency is checked
 * against the source item and existing title+timestamp. Source is persisted in
 * work_hub_items metadata rather than expanding the bespoke events schema.
 */
export async function createDraftFromScheduleItem(item) {
  const db = database();
  const metadata = item?.metadata || {};
  const row = {
    ...scheduleItemToEvent(item),
    timeKnown: metadata.schedule_has_explicit_time === true,
    endTimeKnown: metadata.schedule_has_explicit_end_time === true,
  };
  const detection = metadata.schedule_event_detection || detectScheduleEvent(row);
  if (!detection) return { status: 'ignored', reason: 'Không liên quan TTCM/Tổ TA THPT' };
  if (metadata.schedule_event_draft_id) return { status: 'exists', id: metadata.schedule_event_draft_id };
  const draft = draftFromScheduleRow(row, detection);
  if (!draft) return { status: 'needs_time', reason: 'Chưa có giờ bắt đầu chính xác' };

  const { data: existing, error: lookupError } = await db.from('bes_events')
    .select('id,status,poster_path').eq('title', draft.title)
    .eq('event_start_at', draft.event_start_at).limit(1);
  if (lookupError) throw lookupError;
  let record = existing?.[0] || null;
  const newlyCreated = !record;
  if (!record) record = await saveEventDraft(draft);
  let posterStatus = 'existing';
  let posterWarning = '';
  try {
    if (!record.poster_path && record.status === 'draft') {
      const posterResult = await autoAttachPosterToDraft(record);
      posterStatus = posterResult.status;
    }
  } catch (posterError) {
    posterStatus = 'failed';
    posterWarning = 'Poster chưa được tạo: ' + (posterError.message || 'Lỗi không xác định');
  }
  // Only admin can update event metadata; failed association is explicit but
  // the duplicate title/time guard still keeps common re-uploads idempotent.
  const nextMetadata = {
    ...metadata,
    schedule_event_detection: { ...detection, approvalStatus: 'draft_created' },
    schedule_event_draft_id: record.id,
    schedule_event_poster_status: posterStatus,
  };
  const { error: updateError } = await db.from('work_hub_items')
    .update({ metadata: nextMetadata }).eq('id', item.id);
  if (updateError) {
    return { status: newlyCreated ? 'created_unlinked' : 'exists_unlinked', id: record.id, warning: [updateError.message, posterWarning].filter(Boolean).join(' | ') };
  }
  return { status: newlyCreated ? 'created' : 'exists', id: record.id, posterStatus, warning: posterWarning };
}

export async function createDraftsForScheduleItems(items = []) {
  const result = { created: 0, exists: 0, needsTime: 0, errors: [] };
  for (const item of items) {
    if (!item?.metadata?.schedule_event_detection || item.metadata.schedule_event_detection.approvalStatus !== 'pending') continue;
    try {
      const outcome = await createDraftFromScheduleItem(item);
      if (['created', 'created_unlinked'].includes(outcome.status)) result.created += 1;
      else if (['exists', 'exists_unlinked'].includes(outcome.status)) result.exists += 1;
      else if (outcome.status === 'needs_time') result.needsTime += 1;
      if (outcome.warning) result.errors.push(`${item.title}: ${outcome.warning}`);
    } catch (error) {
      result.errors.push(`${item.title}: ${error.message}`);
    }
  }
  return result;
}
