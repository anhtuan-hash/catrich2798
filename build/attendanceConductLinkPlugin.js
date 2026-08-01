const ATTENDANCE_RULES_SOURCE = `
  {
    id: 'attendance-excused-linked', code: 'CC-P', category: 'Chuyên cần',
    title: 'Vắng phép',
    description: 'Vắng học có phép và được ghi nhận từ thẻ Điểm danh.',
    schoolPoint: null, personalDeduction: 5, severity: 'normal', reference: 'Quy tắc liên kết điểm danh – rèn luyện của lớp',
  },
  {
    id: 'attendance-absent-one-period-linked', code: 'CC-1T', category: 'Chuyên cần',
    title: 'Vắng một tiết',
    description: 'Vắng một tiết học và được ghi nhận từ thẻ Điểm danh.',
    schoolPoint: null, personalDeduction: 2, severity: 'normal', reference: 'Quy tắc liên kết điểm danh – rèn luyện của lớp',
  },
  {
    id: 'attendance-absent-two-periods-linked', code: 'CC-2T', category: 'Chuyên cần',
    title: 'Vắng hai tiết',
    description: 'Vắng hai tiết học và được ghi nhận từ thẻ Điểm danh.',
    schoolPoint: null, personalDeduction: 3, severity: 'normal', reference: 'Quy tắc liên kết điểm danh – rèn luyện của lớp',
  },
  {
    id: 'attendance-early-linked', code: 'CC-VS', category: 'Chuyên cần',
    title: 'Về sớm',
    description: 'Rời lớp hoặc rời trường sớm và được ghi nhận từ thẻ Điểm danh.',
    schoolPoint: null, personalDeduction: 1, severity: 'normal', reference: 'Quy tắc liên kết điểm danh – rèn luyện của lớp',
  },`;

const NORMALIZE_POINTS_SOURCE = `function attendanceMinimumDeduction(input = {}, existing = {}) {
  const source = safeText(input.source, existing.source || 'manual');
  return source === 'attendance' ? 1 : 5;
}

function normalizeRecordPoints(input = {}, existing = {}) {
  const entryType = safeText(input.entryType, existing.entryType || 'violation') === 'reward' ? 'reward' : 'violation';
  if (entryType === 'reward') {
    const bonus = Math.max(1, Number(input.bonus ?? input.points ?? existing.bonus) || 0);
    if (!Number.isFinite(bonus) || bonus < 1) throw new Error('Điểm thưởng tối thiểu là 1.');
    return { entryType, deduction: 0, bonus };
  }
  const minimumDeduction = attendanceMinimumDeduction(input, existing);
  const rawDeduction = Number(input.deduction ?? input.points ?? existing.deduction);
  if (!Number.isFinite(rawDeduction) || rawDeduction < minimumDeduction) {
    throw new Error(minimumDeduction === 1 ? 'Điểm trừ điểm danh tối thiểu là 1.' : 'Điểm trừ tối thiểu là 5.');
  }
  return { entryType, deduction: rawDeduction, bonus: 0 };
}`;

const ATTENDANCE_SYNC_SOURCE = `export const ATTENDANCE_CONDUCT_RULE_IDS = Object.freeze({
  excused: 'attendance-excused-linked',
  absent_one_period: 'attendance-absent-one-period-linked',
  absent_two_periods: 'attendance-absent-two-periods-linked',
  early: 'attendance-early-linked',
  late: 'attendance-late',
});

function attendanceConductRule(status, period = '') {
  const ruleId = status === 'unexcused'
    ? (period ? 'attendance-unexcused-period' : 'attendance-unexcused-session')
    : ATTENDANCE_CONDUCT_RULE_IDS[status];
  return ruleId ? OFFICIAL_CONDUCT_RULES.find((item) => item.id === ruleId) || null : null;
}

function attendanceSourceBaseKey(sessionKey, studentId) {
  return \`attendance:\${sessionKey}:\${studentId}\`;
}

function isAttendanceLinkedRecord(record, sourceBaseKey) {
  return record?.source === 'attendance'
    && (record.sourceKey === sourceBaseKey || String(record.sourceKey || '').startsWith(\`\${sourceBaseKey}:\`));
}

function cancelAttendanceRecords(current, records, actor, reason) {
  if (!records.length) return current;
  const ids = new Set(records.map((item) => item.id));
  const changedAt = new Date().toISOString();
  return {
    ...current,
    conductRecords: current.conductRecords.map((item) => ids.has(item.id) ? {
      ...item,
      status: 'cancelled',
      cancelReason: reason,
      cancelledAt: item.cancelledAt || changedAt,
      lastEditedAt: changedAt,
      lastEditedBy: safeText(actor, 'Hệ thống điểm danh'),
      updatedAt: changedAt,
    } : item),
    updatedAt: changedAt,
  };
}

export function syncAttendanceToConduct(workspace, weekStart, actor = '') {
  let current = normalizeHomeroomWorkspace(workspace);
  const start = startOfConductWeek(weekStart);
  const end = conductWeekEndForWorkspace(current, weekStart);
  if (isConductWeekLocked(current, start)) {
    return { workspace: current, added: 0, updated: 0, removed: 0, locked: true };
  }

  let added = 0;
  let updated = 0;
  let removed = 0;

  Object.entries(current.attendance || {}).forEach(([sessionKey, rows]) => {
    const [date = '', session = 'day', period = ''] = String(sessionKey).split('::');
    const attendanceDate = /^\\d{4}-\\d{2}-\\d{2}$/.test(date) ? date : sessionKey;
    if (attendanceDate < start || attendanceDate > end) return;

    Object.entries(rows || {}).forEach(([studentId, entry]) => {
      const status = safeText(entry?.status, 'present');
      const rule = attendanceConductRule(status, period);
      const sourceBaseKey = attendanceSourceBaseKey(sessionKey, studentId);
      const linked = current.conductRecords.filter((record) => isAttendanceLinkedRecord(record, sourceBaseKey));
      const activeLinked = linked.filter((record) => record.status !== 'cancelled');

      if (!rule) {
        if (activeLinked.length) {
          current = cancelAttendanceRecords(current, activeLinked, actor, 'Điểm danh đã chuyển sang trạng thái không trừ điểm rèn luyện.');
          removed += activeLinked.length;
        }
        return;
      }

      const existing = activeLinked[0] || linked[0] || null;
      const duplicateRecords = linked.filter((record) => record.id !== existing?.id && record.status !== 'cancelled');
      if (duplicateRecords.length) {
        current = cancelAttendanceRecords(current, duplicateRecords, actor, 'Hợp nhất bản ghi liên kết điểm danh bị trùng.');
        removed += duplicateRecords.length;
      }

      const hasChanged = !existing
        || existing.status !== 'confirmed'
        || existing.ruleId !== rule.id
        || Number(existing.deduction) !== Number(rule.personalDeduction)
        || existing.date !== attendanceDate
        || existing.sourceKey !== sourceBaseKey
        || safeText(existing.note) !== safeText(entry?.reason || entry?.note);

      current = addConductRecord(current, {
        id: existing?.id,
        studentId,
        date: attendanceDate,
        weekStart: start,
        ruleId: rule.id,
        code: rule.code,
        category: rule.category,
        title: rule.title,
        deduction: rule.personalDeduction,
        schoolPoint: rule.schoolPoint,
        note: safeText(entry?.reason || entry?.note),
        severity: rule.severity,
        status: 'confirmed',
        source: 'attendance',
        sourceKey: sourceBaseKey,
        createdBy: actor,
      });

      if (!existing) added += 1;
      else if (hasChanged) updated += 1;
    });
  });

  return { workspace: current, added, updated, removed, locked: false };
}`;

const ATTENDANCE_SAVE_SOURCE = `  const save = async () => {
    if (locked) return;
    const attendanceWorkspace = setAttendanceSession(workspace, sessionKey, rows, { date, session, period, note: sessionNote });
    const syncResult = syncAttendanceToConduct(
      attendanceWorkspace,
      date,
      currentUser?.email || currentUser?.name || 'GVCN',
    );
    const linkedChanges = syncResult.added + syncResult.updated + syncResult.removed;
    const syncNote = syncResult.locked
      ? ' Tuần rèn luyện đã khóa nên chưa thể cập nhật điểm rèn luyện.'
      : linkedChanges
        ? \` Đã cập nhật \${linkedChanges} liên kết điểm danh vào điểm rèn luyện.\`
        : ' Điểm rèn luyện đã đồng bộ, không có thay đổi mới.';
    await onCommit(syncResult.workspace, \`Đã lưu điểm danh \${formatViDate(date)}.\${syncNote}\`);
  };`;

const CONDUCT_SYNC_HANDLER_SOURCE = `  const handleSyncAttendance = async () => {
    const result = syncAttendanceToConduct(workspace, weekStart, currentUser?.name || currentUser?.email);
    if (result.locked) return window.alert('Tuần rèn luyện đã được tổng kết và khóa. Hãy mở khóa tuần trước khi đồng bộ lại dữ liệu điểm danh.');
    const changed = result.added + result.updated + result.removed;
    if (!changed) return window.alert('Dữ liệu điểm danh và điểm rèn luyện của tuần này đã đồng bộ, không có thay đổi mới.');
    await onCommit(
      result.workspace,
      \`Đã liên kết điểm danh với rèn luyện: thêm \${result.added}, cập nhật \${result.updated}, gỡ \${result.removed} ghi nhận.\`,
    );
  };`;

export default function attendanceConductLinkPlugin() {
  return {
    name: 'brian-attendance-conduct-link',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = String(id || '').split('?')[0].replaceAll('\\\\', '/');

      if (cleanId.endsWith('/src/data/homeroomConduct.js')) {
        if (code.includes("id: 'attendance-excused-linked'")) return code;
        return code.replace(
          'export const OFFICIAL_CONDUCT_RULES = [',
          `export const OFFICIAL_CONDUCT_RULES = [${ATTENDANCE_RULES_SOURCE}`,
        );
      }

      if (cleanId.endsWith('/src/utils/homeroomConduct.js')) {
        let next = code;
        if (!next.includes('attendanceMinimumDeduction')) {
          next = next.replace(
            /function normalizeRecordPoints\(input = \{\}, existing = \{\}\) \{[\s\S]*?\n\}\n\nexport function addConductRecord/,
            `${NORMALIZE_POINTS_SOURCE}\n\nexport function addConductRecord`,
          );
          next = next.replace(
            "    deduction: entryType === 'reward' ? 0 : Math.max(5, Number(item.deduction) || 5),",
            "    deduction: entryType === 'reward' ? 0 : Math.max(item.source === 'attendance' ? 1 : 5, Number(item.deduction) || (item.source === 'attendance' ? 1 : 5)),",
          );
        }
        if (!next.includes('ATTENDANCE_CONDUCT_RULE_IDS')) {
          next = next.replace(
            /export function syncAttendanceToConduct\(workspace, weekStart, actor = ''\) \{[\s\S]*$/,
            ATTENDANCE_SYNC_SOURCE,
          );
        }
        next = next.replaceAll(
          '{ includeOrientation: false, includeInAverageOnly: true }',
          '{ includeOrientation: true, includeInAverageOnly: false }',
        );
        next = next.replace(
          '  const rowsByWeek = weeks.map((weekStart) => calculateWeeklyConduct(current, weekStart));',
          '  const rowsByWeek = weeks.map((weekStart) => calculateWeeklyConduct(current, weekStart, { live: true }).map((row) => ({ ...row, locked: isConductWeekLocked(current, weekStart) })));',
        );
        return next;
      }

      if (cleanId.endsWith('/src/components/homeroom/HomeroomCoreTabs.jsx')) {
        let next = code;
        if (!next.includes("./AttendanceConductLink.css")) {
          next = next.replace(
            "import React, { useEffect, useMemo, useRef, useState } from 'react';",
            "import React, { useEffect, useMemo, useRef, useState } from 'react';\nimport './AttendanceConductLink.css';",
          );
        }
        if (!next.includes("from '../../utils/homeroomConduct.js'")) {
          next = next.replace(
            "import { attendanceSessionKey, createCorrectionRequest, parseAttendanceSessionKey } from '../../utils/homeroomPhase3.js';",
            "import { attendanceSessionKey, createCorrectionRequest, parseAttendanceSessionKey } from '../../utils/homeroomPhase3.js';\nimport { syncAttendanceToConduct } from '../../utils/homeroomConduct.js';",
          );
        }
        if (!next.includes('linkedChanges = syncResult.added')) {
          next = next.replace(
            "  const save = () => !locked && onCommit(setAttendanceSession(workspace, sessionKey, rows, { date, session, period, note: sessionNote }), `Đã lưu điểm danh ${formatViDate(date)}.`);",
            ATTENDANCE_SAVE_SOURCE,
          );
        }
        next = next.replace(
          "['excused', 'unexcused'].includes(entry.status)",
          "['excused', 'unexcused', 'absent_one_period', 'absent_two_periods'].includes(entry.status)",
        );
        if (!next.includes('TỰ ĐỘNG LIÊN KẾT RÈN LUYỆN')) {
          next = next.replace(
            '<div className="hr-attendance-summary">',
            '<div className="hr-attendance-conduct-link-note"><div><b>TỰ ĐỘNG LIÊN KẾT RÈN LUYỆN</b><br />Khi lưu điểm danh: Vắng phép −5 điểm · Vắng 1 tiết −2 điểm · Vắng 2 tiết −3 điểm · Về sớm −1 điểm. Khi sửa lại trạng thái, bản ghi rèn luyện liên quan cũng được cập nhật hoặc gỡ tự động.</div></div><div className="hr-attendance-summary">',
          );
        }
        return next;
      }

      if (cleanId.endsWith('/src/conductCurrentWeekExport.js')) {
        let next = code;
        next = next.replace(
          '    includeOrientation: false,\n    includeInAverageOnly: true,',
          '    includeOrientation: true,\n    includeInAverageOnly: false,',
        );
        next = next.replace(
          '    semesterLabel,\n    label: `Tính đến tuần ${formatDate(currentWeek)} – ${formatDate(weekEnd)}`,',
          '    semesterLabel,\n    prohibitedStart: semester.start || currentWeek,\n    prohibitedEnd: semester.end || end,\n    label: `Tính đến tuần ${formatDate(currentWeek)} – ${formatDate(weekEnd)}`,',
        );
        next = next.replace(
          '  const rows = calculateConductPeriod(workspace, range.start, range.end);',
          '  const rows = calculateConductPeriod(workspace, range.start, range.end, { enforceProhibitedDowngrade: true, prohibitedStartDate: range.prohibitedStart, prohibitedEndDate: range.prohibitedEnd });',
        );
        next = next.replace(
          '  const row = calculateConductPeriod(workspace, range.start, range.end)\n    .find((item) => item.student?.id === student.id);',
          '  const row = calculateConductPeriod(workspace, range.start, range.end, { enforceProhibitedDowngrade: true, prohibitedStartDate: range.prohibitedStart, prohibitedEndDate: range.prohibitedEnd })\n    .find((item) => item.student?.id === student.id);',
        );
        return next;
      }

      if (cleanId.endsWith('/src/components/HomeroomConductTab.jsx')) {
        let next = code;
        if (!next.includes('Đã liên kết điểm danh với rèn luyện')) {
          next = next.replace(
            /  const handleSyncAttendance = async \(\) => \{[\s\S]*?\n  \};/,
            CONDUCT_SYNC_HANDLER_SOURCE,
          );
        }
        next = next.replace(
          "deduction: record.entryType === 'reward' ? 0 : Math.max(5, Number(record.deduction) || 5),",
          "deduction: record.entryType === 'reward' ? 0 : Math.max(record.source === 'attendance' ? 1 : 5, Number(record.deduction) || (record.source === 'attendance' ? 1 : 5)),",
        );
        next = next.replace(
          '<label><span>Điểm trừ</span><input type="number" min="5" step="1" value={editDraft.deduction}',
          '<label><span>Điểm trừ</span><input type="number" min={editingRecord?.source === \'attendance\' ? 1 : 5} step="1" value={editDraft.deduction}',
        );
        next = next.replace(
          "Math.max(5, Number(editDraft.deduction) || 5)",
          "Math.max(editingRecord?.source === 'attendance' ? 1 : 5, Number(editDraft.deduction) || (editingRecord?.source === 'attendance' ? 1 : 5))",
        );
        return next;
      }

      return null;
    },
  };
}