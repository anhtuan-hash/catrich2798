import { getCurrentUser } from './utils/auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  loadHomeroomWorkspace,
  saveHomeroomWorkspace,
  setCurrentHomeroomWorkspaceId,
} from './utils/homeroomClassWorkspaceStore.js';
import { createManualBackup, prepareWorkspaceCommit } from './utils/homeroomPhase3.js';

const BUTTON_ID = 'bes-grade-restore-import';
const INPUT_ID = 'bes-grade-restore-input';
const STYLE_ID = 'bes-grade-restore-style';

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function normalizeClassName(value) {
  const match = safeText(value).match(/(\d{1,2})\D+(\d{1,2})/);
  return match ? `${Number(match[1])}.${Number(match[2])}` : safeText(value).replace('-', '.');
}

function fold(value) {
  return safeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace('le si thanh dat', 'le sy thanh dat');
}

function normalizeCode(value) {
  const compact = fold(value).replace(/\s+/g, '');
  const cpMatch = compact.match(/^cp0*(\d+)$/);
  if (cpMatch) return `cp${cpMatch[1]}`;
  return /^\d+$/.test(compact) ? compact.replace(/^0+(?=\d)/, '') : compact;
}

function isScore(value) {
  return value !== '' && value != null && Number.isFinite(Number(String(value).replace(',', '.')));
}

function scoreCount(book) {
  let count = 0;
  const countMap = (scores = {}) => {
    Object.values(scores || {}).forEach((value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.values(value).forEach((cell) => { if (isScore(cell)) count += 1; });
      } else if (isScore(value)) count += 1;
    });
  };
  Object.values(book?.subjects || {}).forEach((subject) => {
    Object.values(subject?.semesters || {}).forEach((semester) => {
      (semester?.regular || []).forEach((round) => {
        countMap(round?.scores || {});
        countMap(round?.bonus || {});
      });
      countMap(semester?.midterm?.scores || {});
      countMap(semester?.final?.scores || {});
    });
  });
  return count;
}

function buildStudentResolver(sourceStudents = [], targetStudents = []) {
  const activeTargets = targetStudents.filter((student) => student?.active !== false);
  const byId = new Map(activeTargets.map((student) => [student.id, student]));
  const byCode = new Map();
  const byName = new Map();
  activeTargets.forEach((student) => {
    const code = normalizeCode(student.code);
    const name = fold(student.fullName);
    if (code && !byCode.has(code)) byCode.set(code, student.id);
    if (name && !byName.has(name)) byName.set(name, student.id);
  });
  const sourceById = new Map(sourceStudents.map((student) => [student.id, student]));

  return (sourceId) => {
    if (byId.has(sourceId)) return sourceId;
    const source = sourceById.get(sourceId);
    const code = normalizeCode(source?.code || sourceId);
    const name = fold(source?.fullName);
    return (code && byCode.get(code)) || (name && byName.get(name)) || sourceId;
  };
}

function remapScoreMap(source = {}, resolveStudentId) {
  const output = {};
  Object.entries(source || {}).forEach(([sourceId, value]) => {
    const targetId = resolveStudentId(sourceId);
    if (!targetId) return;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[targetId] = { ...(output[targetId] || {}), ...clone(value) };
    } else if (output[targetId] === '' || output[targetId] == null) {
      output[targetId] = clone(value);
    }
  });
  return output;
}

function remapGradebook(sourceBook, sourceStudents, targetStudents) {
  if (!sourceBook || typeof sourceBook !== 'object') return null;
  const resolveStudentId = buildStudentResolver(sourceStudents, targetStudents);
  const book = clone(sourceBook);
  Object.values(book.subjects || {}).forEach((subject) => {
    Object.values(subject?.semesters || {}).forEach((semester) => {
      (semester?.regular || []).forEach((round) => {
        round.scores = remapScoreMap(round.scores, resolveStudentId);
        round.bonus = remapScoreMap(round.bonus, resolveStudentId);
      });
      if (semester?.midterm) semester.midterm.scores = remapScoreMap(semester.midterm.scores, resolveStudentId);
      if (semester?.final) semester.final.scores = remapScoreMap(semester.final.scores, resolveStudentId);
    });
  });
  return book;
}

function mergeMissingScoreMap(target = {}, source = {}) {
  const output = clone(target || {});
  Object.entries(source || {}).forEach(([studentId, sourceValue]) => {
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      const targetRow = output[studentId] && typeof output[studentId] === 'object' ? output[studentId] : {};
      output[studentId] = { ...targetRow };
      Object.entries(sourceValue).forEach(([columnId, cell]) => {
        if (output[studentId][columnId] === '' || output[studentId][columnId] == null) {
          output[studentId][columnId] = clone(cell);
        }
      });
    } else if (output[studentId] === '' || output[studentId] == null) {
      output[studentId] = clone(sourceValue);
    }
  });
  return output;
}

function mergeGradebooks(targetBook, sourceBook) {
  if (!sourceBook) return targetBook;
  if (!targetBook || typeof targetBook !== 'object') return clone(sourceBook);
  const output = clone(targetBook);
  output.version = Math.max(Number(output.version) || 1, Number(sourceBook.version) || 1);
  output.subjects = output.subjects || {};

  Object.entries(sourceBook.subjects || {}).forEach(([subjectKey, sourceSubject]) => {
    if (!output.subjects[subjectKey]) {
      output.subjects[subjectKey] = clone(sourceSubject);
      return;
    }
    const targetSubject = output.subjects[subjectKey];
    targetSubject.name = safeText(targetSubject.name, sourceSubject?.name || subjectKey);
    targetSubject.semesters = targetSubject.semesters || {};

    Object.entries(sourceSubject?.semesters || {}).forEach(([semesterKey, sourceSemester]) => {
      if (!targetSubject.semesters[semesterKey]) {
        targetSubject.semesters[semesterKey] = clone(sourceSemester);
        return;
      }
      const targetSemester = targetSubject.semesters[semesterKey];
      targetSemester.regular = Array.isArray(targetSemester.regular) ? targetSemester.regular : [];
      (sourceSemester?.regular || []).forEach((sourceRound, roundIndex) => {
        let targetRound = targetSemester.regular.find((round) => round.id === sourceRound.id);
        if (!targetRound) targetRound = targetSemester.regular[roundIndex];
        if (!targetRound) {
          targetSemester.regular.push(clone(sourceRound));
          return;
        }
        const existingColumns = new Set((targetRound.columns || []).map((column) => column.id));
        targetRound.columns = [
          ...(targetRound.columns || []),
          ...(sourceRound.columns || []).filter((column) => !existingColumns.has(column.id)).map(clone),
        ];
        targetRound.scores = mergeMissingScoreMap(targetRound.scores || {}, sourceRound.scores || {});
        targetRound.bonus = mergeMissingScoreMap(targetRound.bonus || {}, sourceRound.bonus || {});
      });
      targetSemester.midterm = targetSemester.midterm || { scores: {} };
      targetSemester.final = targetSemester.final || { scores: {} };
      targetSemester.midterm.scores = mergeMissingScoreMap(
        targetSemester.midterm.scores || {},
        sourceSemester?.midterm?.scores || {},
      );
      targetSemester.final.scores = mergeMissingScoreMap(
        targetSemester.final.scores || {},
        sourceSemester?.final?.scores || {},
      );
    });
  });
  output.updatedAt = new Date().toISOString();
  return output;
}

async function readJsonFile(file) {
  return JSON.parse(await file.text());
}

function normalizePackage(recoveryPackage) {
  if (recoveryPackage?.type === 'BES_CLASS_GRADE_RESTORE_PACKAGE') {
    return {
      className: normalizeClassName(recoveryPackage.className),
      schoolYear: safeText(recoveryPackage.schoolYear),
      students: recoveryPackage.students || [],
      gradebook: recoveryPackage.learningGradebook,
      source: recoveryPackage.source,
    };
  }
  if (recoveryPackage?.type === 'BES_CLASS_12_6_RESTORE_PACKAGE') {
    const incoming = recoveryPackage.workspace;
    return {
      className: normalizeClassName(incoming?.classProfile?.className),
      schoolYear: safeText(incoming?.classProfile?.schoolYear),
      students: incoming?.students || [],
      gradebook: incoming?.learningGradebook,
      source: recoveryPackage.source,
    };
  }
  throw new Error('Đây không phải gói khôi phục điểm hợp lệ do hệ thống tạo.');
}

async function importRestorePackage(file, button) {
  button.disabled = true;
  button.textContent = 'Đang khôi phục…';
  try {
    const recoveryPackage = await readJsonFile(file);
    const incoming = normalizePackage(recoveryPackage);
    const incomingScores = scoreCount(incoming.gradebook);
    if (!incoming.className || !incomingScores) throw new Error('Gói khôi phục không chứa điểm học tập hợp lệ.');

    const user = await getCurrentUser();
    if (!user?.id) throw new Error('Chưa xác định được tài khoản giáo viên đang đăng nhập.');
    const currentId = getCurrentHomeroomWorkspaceId(user);
    const currentResult = await loadHomeroomWorkspace(user, currentId);
    const current = currentResult.workspace;
    if (!current) throw new Error('Không tải được lớp đang mở.');

    const currentClass = normalizeClassName(current.classProfile?.className);
    if (currentClass !== incoming.className) {
      throw new Error(`Hãy mở đúng lớp ${incoming.className} trước khi nhập gói khôi phục.`);
    }

    const remappedBook = remapGradebook(incoming.gradebook, incoming.students, current.students || []);
    const beforeCount = scoreCount(current.learningGradebook);
    const mergedBook = mergeGradebooks(current.learningGradebook, remappedBook);
    const afterCount = scoreCount(mergedBook);
    const restoredCount = Math.max(0, afterCount - beforeCount);

    if (!restoredCount) {
      window.alert(`Đã kiểm tra ${incomingScores} ô điểm trong gói. Bảng điểm lớp ${incoming.className} hiện đã có đầy đủ các ô này nên không cần ghi thêm.`);
      return;
    }

    const confirmed = window.confirm(
      `Khôi phục ${restoredCount} ô điểm còn thiếu vào lớp ${incoming.className}?\n\n`
      + `Gói chứa ${incomingScores} ô điểm. Hệ thống chỉ bổ sung ô đang trống, không ghi đè điểm hiện có và sẽ tạo bản sao lưu trước khi nhập.`,
    );
    if (!confirmed) return;

    const backedUp = createManualBackup(current, user, `Trước khi khôi phục điểm lớp ${incoming.className}`);
    const next = {
      ...backedUp,
      learningGradebook: mergedBook,
      gradeRecoveryMeta: {
        ...(backedUp.gradeRecoveryMeta || {}),
        lastRecoveredAt: new Date().toISOString(),
        className: incoming.className,
        packageScores: incomingScores,
        restoredScores: restoredCount,
        source: incoming.source || '',
      },
    };
    const committed = prepareWorkspaceCommit(
      backedUp,
      next,
      user,
      `Khôi phục ${restoredCount} ô điểm lớp ${incoming.className} từ gói cứu hộ`,
    );
    const saveResult = await saveHomeroomWorkspace(committed, user);
    if (saveResult?.ok === false) throw new Error(saveResult.message || 'Không thể lưu gói khôi phục.');

    setCurrentHomeroomWorkspaceId(user, current.id);
    window.alert(`Đã khôi phục ${restoredCount} ô điểm vào lớp ${incoming.className}. Trang sẽ tải lại để hiển thị dữ liệu.`);
    window.location.reload();
  } finally {
    button.disabled = false;
    button.textContent = 'Nhập gói khôi phục điểm';
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
    button.textContent = 'Nhập gói khôi phục điểm';
    button.title = 'Chọn gói JSON khôi phục điểm của lớp đang mở';
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
        console.error('[GradeRestoreImporter] Import failed.', error);
        window.alert(error?.message || 'Không thể nhập gói khôi phục điểm.');
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
