import { normalizeScheduleText, scheduleFingerprint } from './workScheduleImport.js';

/**
 * Deterministic, zero-API-cost matching. The result is a REVIEW CANDIDATE:
 * matching never grants permission to publish or notify recipients.
 */
const has = (text, expression) => expression.test(text);
const clean = (value) => normalizeScheduleText(value);
const TT_CM = /\bttcm\b|\btt tpcm\b|\btt tp\b|\bto truong chuyen mon\b|\bto truong bo mon\b/;
const ENGLISH_THPT = /\bto (?:tieng anh|ta|av) thpt\b|\bto anh van thpt\b|\bto tieng anh cap 3\b/;
const ENGLISH_LESSON = /\b(?:thao giang|du gio|day minh hoa|hoi giang)\b.*\b(?:mon )?(?:av|tieng anh|anh van)\b/;
const HIGH_SCHOOL_CLASS = /\b(?:lop|khoi) (?:10|11|12)(?:\b|\s)/;
const THCS_ONLY = /\bthcs\b|\btrung hoc co so\b|\bcap 2\b/;

export function detectScheduleEvent(row = {}) {
  const title = clean(row.title);
  const owner = clean(row.ownerText);
  const attendees = clean(row.attendees);
  const rest = clean([row.description, row.note].join(' '));
  const combined = [title, owner, attendees, rest].join(' ');
  let audience = '';
  let reason = '';
  let confidence = 'high';

  if (has(owner + ' ' + attendees, TT_CM)) {
    audience = 'ttcm';
    reason = 'Phân công trực tiếp cho TTCM / TT-TPCM';
  } else if (has(combined, ENGLISH_THPT)) {
    audience = 'english_thpt';
    reason = 'Có chỉ định Tổ Tiếng Anh THPT';
  } else if (has(title, ENGLISH_LESSON) && has(title + ' ' + rest, HIGH_SCHOOL_CLASS) && !has(title, THCS_ONLY)) {
    audience = 'english_thpt';
    reason = 'Thao giảng Tiếng Anh tại khối THPT';
    confidence = 'review';
  } else {
    return null;
  }

  const startDate = row.startAt ? new Date(row.startAt) : null;
  const knownDate = startDate && Number.isFinite(startDate.getTime());
  return {
    fingerprint: row.fingerprint || scheduleFingerprint(row),
    audience,
    reason,
    confidence,
    category: has(title, /\bthao giang\b|\bhoi giang\b/) ? 'Thao giảng'
      : has(title, /\bhop\b/) ? 'Họp tổ chuyên môn'
      : has(title, /\bhalloween\b|\bsinh hoat chuyen de\b/) ? 'Sinh hoạt chuyên đề'
      : has(title, /\bboi duong\b|\btap huan\b/) ? 'Hội thảo / tập huấn'
      : 'Thông báo chung',
    timeKnown: row.timeKnown === true,
    needsTimeReview: row.timeKnown !== true || !knownDate,
    approvalStatus: 'pending',
    sourceRow: row.sourceRow || null,
  };
}

export function draftFromScheduleRow(row, detection, now = new Date()) {
  if (!detection || detection.needsTimeReview || !row.startAt) return null;
  const start = new Date(row.startAt);
  if (!Number.isFinite(start.getTime())) return null;
  const rawEnd = row.endAt ? new Date(row.endAt) : null;
  const end = rawEnd && Number.isFinite(rawEnd.getTime()) && rawEnd > start
    ? rawEnd : new Date(start.getTime() + 60 * 60000);
  const displayStart = new Date(now);
  const displayEnd = new Date(Math.max(now.getTime() + 86400000, end.getTime()));
  const year = start.getFullYear();
  const schoolYear = start.getMonth() >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  const description = [
    row.description,
    row.note ? `Ghi chú: ${row.note}` : '',
    row.ownerText ? `Phụ trách: ${row.ownerText}` : '',
    row.attendees ? `Thành phần: ${row.attendees}` : '',
    `Nguồn: ${row.sourceFileName || 'Lịch làm việc'} · dòng ${row.sourceRow || '—'}`,
    'Bản nháp tự trích lọc; phải kiểm tra và duyệt trước khi công bố.',
    !row.endTimeKnown ? 'Lưu ý: giờ kết thúc chưa ghi trong nguồn; hệ thống tạm dùng 60 phút để chỉnh sửa trước khi duyệt.' : '',
  ].filter(Boolean).join('\n');
  return {
    title: String(row.title || '').trim().slice(0, 180),
    category: detection.category,
    summary: `Ứng viên từ lịch chung · ${detection.reason}`.slice(0, 500),
    description,
    organizer: detection.audience === 'ttcm' ? 'TTCM' : 'Tổ Tiếng Anh THPT',
    school_year: schoolYear,
    event_start_at: start.toISOString(),
    event_end_at: end.toISOString(),
    display_start_at: displayStart.toISOString(),
    display_end_at: displayEnd.toISOString(),
    venue_type: /\btruc tuyen\b|\bzoom\b|\bgoogle meet\b|\bwayground\b/.test(clean(row.location + ' ' + row.description)) ? 'online' : 'offline',
    venue_name: String(row.location || '').slice(0, 250),
    priority: row.priority === 'urgent' ? 'urgent' : row.priority === 'high' ? 'important' : 'normal',
    frequency: 'once',
  };
}

export function extractScheduleCandidates(rows = []) {
  return rows.map((row) => ({ row, detection: detectScheduleEvent(row) }))
    .filter((entry) => entry.detection !== null);
}
