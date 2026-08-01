import { getCurrentUser } from './utils/auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  loadHomeroomWorkspace,
  saveHomeroomWorkspace,
  setCurrentHomeroomWorkspaceId,
} from './utils/homeroomClassWorkspaceStore.js';
import { createManualBackup, prepareWorkspaceCommit } from './utils/homeroomPhase3.js';

const BUTTON_ID = 'bes-class-126-restore-import';
const INPUT_ID = 'bes-class-126-restore-input';
const STYLE_ID = 'bes-class-126-restore-style';

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function isClass126(workspace) {
  return /(^|\D)12\D*6(\D|$)/i.test(safeText(workspace?.classProfile?.className));
}

function scoreCount(book) {
  let count = 0;
  const isScore = (value) => value !== '' && value != null && Number.isFinite(Number(String(value).replace(',', '.')));
  Object.values(book?.subjects || {}).forEach((subject) => {
    Object.values(subject?.semesters || {}).forEach((semester) => {
      (semester?.regular || []).forEach((round) => {
        Object.values(round?.scores || {}).forEach((row) => {
          Object.values(row || {}).forEach((value) => { if (isScore(value)) count += 1; });
        });
        Object.values(round?.bonus || {}).forEach((value) => { if (isScore(value)) count += 1; });
      });
      Object.values(semester?.midterm?.scores || {}).forEach((value) => { if (isScore(value)) count += 1; });
      Object.values(semester?.final?.scores || {}).forEach((value) => { if (isScore(value)) count += 1; });
    });
  });
  return count;
}

async function readJsonFile(file) {
  const text = await file.text();
  return JSON.parse(text);
}

async function importRestorePackage(file, button) {
  button.disabled = true;
  button.textContent = 'Đang khôi phục…';
  try {
    const recoveryPackage = await readJsonFile(file);
    if (recoveryPackage?.type !== 'BES_CLASS_12_6_RESTORE_PACKAGE') {
      throw new Error('Đây không phải gói khôi phục lớp 12.6 do hệ thống tạo.');
    }
    const incoming = recoveryPackage.workspace;
    if (!incoming || !isClass126(incoming)) throw new Error('Gói dữ liệu không thuộc lớp 12.6.');
    const incomingScores = scoreCount(incoming.learningGradebook);
    if (!incomingScores) throw new Error('Gói khôi phục không chứa điểm học tập.');

    const user = await getCurrentUser();
    if (!user?.id) throw new Error('Chưa xác định được tài khoản giáo viên đang đăng nhập.');

    const currentId = getCurrentHomeroomWorkspaceId(user) || incoming.id || 'default';
    const currentResult = await loadHomeroomWorkspace(user, currentId);
    const current = currentResult.workspace;
    if (!current || !isClass126(current)) {
      throw new Error('Hãy mở đúng lớp 12.6 trước khi nhập gói khôi phục.');
    }

    const confirmed = window.confirm(
      `Khôi phục ${incomingScores} ô điểm, ${(incoming.conductRecords || []).length} ghi nhận rèn luyện và ${Object.keys(incoming.attendance || {}).length} phiên điểm danh vào lớp 12.6?\n\nHệ thống sẽ tạo một bản sao lưu của dữ liệu hiện tại trước khi khôi phục.`,
    );
    if (!confirmed) return;

    const backedUp = createManualBackup(current, user, 'Trước khi nhập gói khôi phục lớp 12.6');
    const restored = {
      ...incoming,
      id: current.id,
      status: current.status || incoming.status || 'active',
      classProfile: { ...incoming.classProfile, ...current.classProfile, className: '12.6' },
      schoolAssignment: current.schoolAssignment || incoming.schoolAssignment,
      backups: backedUp.backups,
      restoredAt: new Date().toISOString(),
      restoredFrom: safeText(recoveryPackage.source, 'BES_CLASS_12_6_RESTORE_PACKAGE'),
    };
    const committed = prepareWorkspaceCommit(
      backedUp,
      restored,
      user,
      `Khôi phục lớp 12.6: ${incomingScores} ô điểm từ gói cứu hộ`,
    );
    const saveResult = await saveHomeroomWorkspace(committed, user);
    if (saveResult?.ok === false) {
      throw new Error(saveResult.message || 'Không thể lưu gói khôi phục.');
    }
    setCurrentHomeroomWorkspaceId(user, current.id);
    window.alert(`Đã khôi phục ${incomingScores} ô điểm và dữ liệu rèn luyện lớp 12.6. Trang sẽ tải lại để hiển thị dữ liệu.`);
    window.location.reload();
  } finally {
    button.disabled = false;
    button.textContent = 'Nhập gói khôi phục 12.6';
  }
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${BUTTON_ID}{position:fixed;right:22px;bottom:142px;z-index:99990;min-height:46px;padding:0 18px;border:1px solid #137333;border-radius:999px;background:#137333;color:#fff;font:800 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 12px 32px rgba(19,115,51,.28);cursor:pointer}
    #${BUTTON_ID}:hover{background:#0d652d}#${BUTTON_ID}:disabled{opacity:.65;cursor:wait}
    @media(max-width:640px){#${BUTTON_ID}{right:12px;bottom:136px;max-width:calc(100vw - 24px)}}
  `;
  document.head.appendChild(style);
}

function ensureImporter() {
  if (!/homeroom|chu-nhiem|gvcn/i.test(window.location.hash || '')) return;
  injectStyle();
  let input = document.getElementById(INPUT_ID);
  if (!input) {
    input = document.createElement('input');
    input.id = INPUT_ID;
    input.type = 'file';
    input.accept = '.json,application/json';
    input.hidden = true;
    document.body.appendChild(input);
  }

  let button = document.getElementById(BUTTON_ID);
  if (!button) {
    button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = 'Nhập gói khôi phục 12.6';
    button.title = 'Chọn file Lop_12_6_Goi_khoi_phuc_vao_app.json';
    button.addEventListener('click', () => {
      input.value = '';
      input.click();
    });
    document.body.appendChild(button);
  }

  if (input.dataset.bound !== 'true') {
    input.dataset.bound = 'true';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await importRestorePackage(file, button);
      } catch (error) {
        console.error('[Class126RestoreImporter] Import failed.', error);
        window.alert(error?.message || 'Không thể nhập gói khôi phục lớp 12.6.');
      }
    });
  }
}

window.addEventListener('hashchange', ensureImporter);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureImporter, { once: true });
} else {
  ensureImporter();
}
