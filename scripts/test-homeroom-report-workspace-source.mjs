import assert from 'node:assert/strict';
import {
  activeHomeroomRosterSignature,
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

const rosterBefore = {
  id: renderedWorkspaceId,
  students: [
    { id: 'a', code: 'CP-007371', fullName: 'Đinh Bảo Châu', birthDate: '2009-01-01', active: true },
    { id: 'b', code: 'CP-000461', fullName: 'Pei Quang Dũng', birthDate: '2009-02-02', active: true },
  ],
};
const rosterAfter = {
  id: renderedWorkspaceId,
  students: [
    { id: 'a', code: 'CP-007371', fullName: 'Đinh Bảo Châu', birthDate: '2009-01-01', active: true },
    { id: 'c', code: 'CP-000777', fullName: 'Trần Hoàng Đăng', birthDate: '2009-03-03', active: true },
  ],
};
assert.notEqual(
  activeHomeroomRosterSignature(rosterBefore),
  activeHomeroomRosterSignature(rosterAfter),
  'cùng workspace id nhưng roster đổi học sinh phải tạo signature mới để panel được làm mới',
);
assert.equal(
  activeHomeroomRosterSignature({ ...rosterAfter, students: [...rosterAfter.students].reverse() }),
  activeHomeroomRosterSignature(rosterAfter),
  'đổi thứ tự hiển thị không được tạo refresh giả',
);

console.log('✓ homeroom report workspace source regression');
