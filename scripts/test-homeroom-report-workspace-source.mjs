import assert from 'node:assert/strict';
import {
  isAllowedHomeroomExportStorageRead,
  resolveHomeroomExportWorkspaceId,
} from '../src/utils/homeroomExportWorkspace.js';

const renderedWorkspaceId = '12-6-2026-2027';
const assignedWorkspaceId = '12-6-assigned';
const stalePanelWorkspaceId = '11-2-old';
const staleCurrentWorkspaceId = 'subject-10-4';

assert.equal(
  resolveHomeroomExportWorkspaceId({
    renderedWorkspaceId,
    assignedWorkspaceId,
    panelWorkspaceId: stalePanelWorkspaceId,
    currentWorkspaceId: staleCurrentWorkspaceId,
  }),
  renderedWorkspaceId,
  'workspace đang hiển thị phải thắng mọi current-id cũ trong localStorage',
);

assert.equal(
  resolveHomeroomExportWorkspaceId({
    assignedWorkspaceId,
    panelWorkspaceId: stalePanelWorkspaceId,
    currentWorkspaceId: staleCurrentWorkspaceId,
  }),
  assignedWorkspaceId,
  'phân công GVCN từ server phải thắng panel/current-id cũ khi DOM chưa sẵn sàng',
);

assert.equal(
  resolveHomeroomExportWorkspaceId({
    panelWorkspaceId: '12-6-panel',
    currentWorkspaceId: staleCurrentWorkspaceId,
  }),
  '12-6-panel',
  'panel đang mở phải được ưu tiên trước current-id localStorage',
);

const payloadKey = 'bes-homeroom-workspace-v1:user-1:12-6-2026-2027';
const currentKey = 'bes-homeroom-current-workspace-v3:user-1';
assert.equal(isAllowedHomeroomExportStorageRead(payloadKey, { payloadKey, currentKey }), true);
assert.equal(isAllowedHomeroomExportStorageRead(currentKey, { payloadKey, currentKey }), true);
assert.equal(
  isAllowedHomeroomExportStorageRead('bes-homeroom-workspace-v1:user-1:12-6-2025-2026', { payloadKey, currentKey }),
  false,
  'workspace cùng tên lớp nhưng khác năm học không được lọt vào exporter legacy',
);
assert.equal(
  isAllowedHomeroomExportStorageRead('bes-homeroom-current-workspace-v3:user-2', { payloadKey, currentKey }),
  false,
  'current workspace của tài khoản khác không được lọt vào exporter legacy',
);
assert.equal(isAllowedHomeroomExportStorageRead('bes-unrelated-setting', { payloadKey, currentKey }), true);

console.log('✓ homeroom report workspace source regression');
