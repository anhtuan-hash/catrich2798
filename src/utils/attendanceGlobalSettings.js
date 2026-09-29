export const DEFAULT_ATTENDANCE_GLOBAL_SETTINGS = Object.freeze({
  allowTeacherPeriodSelection: false,
});

export function normalizeAttendanceGlobalSettings(row = {}) {
  return {
    allowTeacherPeriodSelection: row?.allow_teacher_period_selection === true
      || row?.allowTeacherPeriodSelection === true,
    updatedAt: row?.updated_at || row?.updatedAt || '',
    updatedBy: row?.updated_by || row?.updatedBy || '',
  };
}

export async function loadAttendanceGlobalSettings(client) {
  if (!client?.from) return { ...DEFAULT_ATTENDANCE_GLOBAL_SETTINGS };
  const { data, error } = await client
    .from('bes_attendance_global_settings')
    .select('allow_teacher_period_selection,updated_at,updated_by')
    .eq('id', true)
    .maybeSingle();
  if (error) throw error;
  return normalizeAttendanceGlobalSettings(data || DEFAULT_ATTENDANCE_GLOBAL_SETTINGS);
}

export async function saveAttendanceTeacherPeriodSelection(client, enabled, actor = '') {
  if (!client?.from) throw new Error('Supabase client is not ready.');
  const payload = {
    id: true,
    allow_teacher_period_selection: enabled === true,
    updated_by: String(actor || '').trim(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from('bes_attendance_global_settings')
    .upsert(payload, { onConflict: 'id' })
    .select('allow_teacher_period_selection,updated_at,updated_by')
    .single();
  if (error) throw error;
  return normalizeAttendanceGlobalSettings(data || payload);
}

export function subscribeAttendanceGlobalSettings(client, callback) {
  if (!client?.channel || !client?.removeChannel) return () => {};
  let channel = null;
  try {
    channel = client
      .channel('bes-attendance-global-settings')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bes_attendance_global_settings',
        filter: 'id=eq.true',
      }, (payload) => {
        callback?.(normalizeAttendanceGlobalSettings(payload?.new || {}));
      })
      .subscribe();
  } catch {
    channel = null;
  }
  return () => {
    if (!channel) return;
    try { client.removeChannel(channel); } catch { /* realtime cleanup is best effort */ }
  };
}
