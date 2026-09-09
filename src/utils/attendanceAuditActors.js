function clean(value) {
  return String(value ?? '').trim();
}

function eventKey(row) {
  return [clean(row?.session_id), clean(row?.changed_at), clean(row?.changed_by)].join('|');
}

function compareAuditRows(a, b) {
  const time = clean(a?.changed_at).localeCompare(clean(b?.changed_at));
  if (time) return time;
  return Number(a?.id || 0) - Number(b?.id || 0);
}

export function groupAttendanceChangesBySession(changes = []) {
  const sessionMaps = new Map();

  [...changes].sort(compareAuditRows).forEach((row) => {
    const sessionId = clean(row?.session_id);
    if (!sessionId) return;
    let eventsByKey = sessionMaps.get(sessionId);
    if (!eventsByKey) {
      eventsByKey = new Map();
      sessionMaps.set(sessionId, eventsByKey);
    }
    const key = eventKey(row);
    let event = eventsByKey.get(key);
    if (!event) {
      event = {
        key,
        session_id: sessionId,
        changed_by: clean(row?.changed_by),
        changed_by_name: clean(row?.changed_by_name) || 'Chưa xác định',
        changed_at: clean(row?.changed_at),
        items: [],
      };
      eventsByKey.set(key, event);
    }
    event.items.push(row);
  });

  const result = new Map();
  sessionMaps.forEach((eventsByKey, sessionId) => {
    const events = [...eventsByKey.values()].sort((a, b) => a.changed_at.localeCompare(b.changed_at));
    const latest = events.at(-1) || null;
    result.set(sessionId, {
      events,
      change_count: events.length,
      latest_changed_by: latest?.changed_by || '',
      latest_changed_by_name: latest?.changed_by_name || '',
      latest_changed_at: latest?.changed_at || '',
    });
  });
  return result;
}

export function attendanceAuditForSession(changes = [], sessionId = '') {
  return groupAttendanceChangesBySession(changes).get(clean(sessionId)) || {
    events: [],
    change_count: 0,
    latest_changed_by: '',
    latest_changed_by_name: '',
    latest_changed_at: '',
  };
}

export function attendanceStatusLabel(value) {
  return clean(value) === 'absent' ? 'Vắng' : clean(value) === 'present' ? 'Có mặt' : (clean(value) || '—');
}

export function describeAttendanceAuditItem(item = {}) {
  if (clean(item.change_kind) === 'session_note') {
    const before = clean(item.session_note_before) || 'Không có ghi chú';
    const after = clean(item.session_note_after) || 'Không có ghi chú';
    return `Sửa ghi chú buổi học: “${before}” → “${after}”`;
  }
  const student = clean(item.student_full_name) || 'Học sinh';
  const oldStatus = attendanceStatusLabel(item.old_status);
  const newStatus = attendanceStatusLabel(item.new_status);
  const statusPart = oldStatus !== newStatus ? `${oldStatus} → ${newStatus}` : newStatus;
  const oldReason = clean(item.old_absence_reason_code);
  const newReason = clean(item.new_absence_reason_code);
  const oldNote = clean(item.old_absence_note);
  const newNote = clean(item.new_absence_note);
  const details = [];
  if (oldReason !== newReason) details.push(`lý do ${oldReason || '—'} → ${newReason || '—'}`);
  if (oldNote !== newNote) details.push(`ghi chú “${oldNote || '—'}” → “${newNote || '—'}”`);
  return `${student}: ${statusPart}${details.length ? ` · ${details.join(' · ')}` : ''}`;
}
