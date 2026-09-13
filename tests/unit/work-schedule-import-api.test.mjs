import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildScheduleImportPlan,
  importOwnershipKey,
  isImportManagedScheduleItem,
} from '../../src/utils/workScheduleImportPlan.js';
import { isScheduleImportLeader } from '../../serverless-handlers/work-schedule-import.js';

function event(overrides = {}) {
  return {
    title: 'Họp tổ chuyên môn',
    description: 'Chuẩn bị kế hoạch tuần',
    startAt: '2026-09-14T08:00:00.000Z',
    endAt: '2026-09-14T09:00:00.000Z',
    location: 'Phòng 201',
    ownerText: 'TTCM',
    attendees: 'Giáo viên',
    note: '',
    priority: 'normal',
    visibility: 'department',
    sourceRow: 2,
    fingerprint: '2026-09-14T15:00|hop to chuyen mon|phong 201',
    ...overrides,
  };
}

function importedItem(overrides = {}) {
  return {
    id: 'imported-1',
    title: 'Họp tổ chuyên môn',
    description: 'Chuẩn bị kế hoạch tuần',
    item_type: 'schedule',
    due_at: '2026-09-14T08:00:00.000Z',
    source_module: 'work-schedule-import-v1168',
    metadata: {
      schedule_event: true,
      schedule_import_managed: true,
      schedule_import_key: importOwnershipKey('ke-hoach.csv', 2),
      schedule_source_file: 'ke-hoach.csv',
      schedule_source_row: 2,
      schedule_fingerprint: '2026-09-14T15:00|hop to chuyen mon|phong 201',
      schedule_start_at: '2026-09-14T08:00:00.000Z',
      schedule_end_at: '2026-09-14T09:00:00.000Z',
      schedule_location: 'Phòng 201',
      schedule_owner_text: 'TTCM',
      schedule_attendees: 'Giáo viên',
      schedule_note: '',
    },
    ...overrides,
  };
}

test('import ownership key is stable for file name casing and source row', () => {
  assert.equal(importOwnershipKey('  KE-HOACH.csv ', 2), importOwnershipKey('ke-hoach.csv', 2));
  assert.notEqual(importOwnershipKey('ke-hoach.csv', 2), importOwnershipKey('ke-hoach.csv', 3));
});

test('only import-owned rows are considered managed', () => {
  assert.equal(isImportManagedScheduleItem(importedItem()), true);
  assert.equal(isImportManagedScheduleItem({
    ...importedItem(),
    metadata: { schedule_event: true, schedule_manual: true },
  }), false);
});

test('a manual event with the same fingerprint is preserved and not duplicated', () => {
  const manual = {
    ...importedItem({ id: 'manual-1', source_module: 'work-schedule' }),
    metadata: {
      schedule_event: true,
      schedule_manual: true,
      schedule_fingerprint: event().fingerprint,
    },
  };
  const plan = buildScheduleImportPlan({
    rows: [event()],
    existingItems: [manual],
    fileName: 'ke-hoach.csv',
  });

  assert.equal(plan.create.length, 0);
  assert.equal(plan.update.length, 0);
  assert.equal(plan.stats.unchanged, 1);
  assert.equal(plan.stats.manualConflicts, 1);
});

test('reimport of an unchanged imported row is idempotent', () => {
  const plan = buildScheduleImportPlan({
    rows: [event()],
    existingItems: [importedItem()],
    fileName: 'ke-hoach.csv',
  });

  assert.equal(plan.create.length, 0);
  assert.equal(plan.update.length, 0);
  assert.equal(plan.stats.unchanged, 1);
  assert.equal(plan.stats.added, 0);
  assert.equal(plan.stats.updated, 0);
});

test('reimport updates only the matching import-owned row when source row changed', () => {
  const changed = event({
    title: 'Họp tổ chuyên môn - cập nhật',
    fingerprint: '2026-09-14T15:00|hop to chuyen mon cap nhat|phong 201',
  });
  const plan = buildScheduleImportPlan({
    rows: [changed],
    existingItems: [importedItem()],
    fileName: 'ke-hoach.csv',
  });

  assert.equal(plan.create.length, 0);
  assert.equal(plan.update.length, 1);
  assert.equal(plan.update[0].id, 'imported-1');
  assert.equal(plan.stats.updated, 1);
});

test('a new source row is planned for creation with import-managed metadata', () => {
  const plan = buildScheduleImportPlan({
    rows: [event({ sourceRow: 4 })],
    existingItems: [],
    fileName: 'ke-hoach.csv',
  });

  assert.equal(plan.create.length, 1);
  assert.equal(plan.stats.added, 1);
  assert.equal(plan.create[0].metadata.schedule_import_managed, true);
  assert.equal(plan.create[0].metadata.schedule_import_key, importOwnershipKey('ke-hoach.csv', 4));
});

test('API import authorization matches the TTCM/admin UI permission model', () => {
  assert.equal(isScheduleImportLeader({ role: 'admin', approved: true }), true);
  assert.equal(isScheduleImportLeader({ role: 'department_head', approved: true }), true);
  assert.equal(isScheduleImportLeader({ role: 'ttcm', approved: true }), true);
  assert.equal(isScheduleImportLeader({ role: 'teacher', approved: true }), false);
  assert.equal(isScheduleImportLeader({ role: 'admin', approved: false }), false);
});
