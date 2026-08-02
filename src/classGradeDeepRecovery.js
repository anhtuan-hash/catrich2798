import { getCurrentUser } from './utils/auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  loadHomeroomWorkspace,
  saveHomeroomWorkspace,
} from './utils/homeroomClassWorkspaceStore.js';
import { createManualBackup, prepareWorkspaceCommit } from './utils/homeroomPhase3.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';

const BUTTON_ID = 'bes-class-grade-deep-recovery';
const STYLE_ID = 'bes-class-grade-deep-recovery-style';
const LOCAL_PREFIX = 'bes-homeroom-workspace-v1:';
let busy = false;

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function parseJson(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function fold(value) {
  return safeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeCode(value) {
  const compact = fold(value).replace(/\s+/g, '');
  const cp = compact.match(/^cp0*(\d+)$/);
  if (cp) return `cp${cp[1]}`;
  if (/^\d+$/.test(compact)) return compact.replace(/^0+(?=\d)/, '');
  return compact;
}

function normalizeClassName(value) {
  const raw = safeText(value).replace(',', '.');
  const match = raw.match(/(\d{1,2})\D+(\d{1,2})/);
  return match ? `${Number(match[1])}.${Number(match[2])}` : raw.toLowerCase();
}

function isScore(value) {
  if (value === '' || value == null) return false;
  return Number.isFinite(Number(String(value).replace(',', '.')));
}

function activeStudents(workspace) {
  return (workspace?.students || []).filter((student) => student?.active !== false);
}

function buildStudentResolver(sourceStudents = [], targetStudents = []) {
  const activeTargets = targetStudents.filter((student) => student?.active !== false);
  const targetIds = new Set(activeTargets.map((student) => student.id).filter(Boolean));
  const byCode = new Map();
  const byIdentity = new Map();

  activeTargets.forEach((student) => {
    const code = normalizeCode(student.code);
    if (code && !byCode.has(code)) byCode.set(code, student.id);
    const identity = `${fold(student.fullName)}|${safeText(student.birthDate)}`;
    if (fold(student.fullName) && !byIdentity.has(identity)) byIdentity.set(identity, student.id);
  });

  const sourceById = new Map(sourceStudents.map((student) => [student.id, student]));
  return (sourceId) => {
    if (!sourceId) return '';
    if (targetIds.has(sourceId)) return sourceId;
    const source = sourceById.get(sourceId);
    const code = normalizeCode(source?.code || sourceId);
    if (code && byCode.has(code)) return byCode.get(code);
    if (source) {
      const identity = `${fold(source.fullName)}|${safeText(source.birthDate)}`;
      if (byIdentity.has(identity)) return byIdentity.get(identity);
      const nameOnly = fold(source.fullName);
      const sameName = activeTargets.filter((student) => fold(student.fullName) === nameOnly);
      if (nameOnly && sameName.length === 1) return sameName[0].id;
    }
    return '';
  };
}

function remapScoreMap(source = {}, resolveStudentId) {
  const output = {};
  Object.entries(source || {}).forEach(([sourceId, value]) => {
    const targetId = resolveStudentId(sourceId);
    if (!targetId) return;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[targetId] = { ...(output[targetId] || {}), ...clone(value) };
    } else if (isScore(value)) {
      output[targetId] = value;
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
      const row = { ...(output[studentId] || {}) };
      Object.entries(sourceValue).forEach(([columnId, value]) => {
        if ((row[columnId] === '' || row[columnId] == null) && isScore(value)) row[columnId] = value;
      });
      output[studentId] = row;
    } else if ((output[studentId] === '' || output[studentId] == null) && isScore(sourceValue)) {
      output[studentId] = sourceValue;
    }
  });
  return output;
}

function mergeGradebooks(targetBook, sourceBook) {
  if (!sourceBook) return targetBook;
  if (!targetBook || typeof targetBook !== 'object') return clone(sourceBook);
  const output = clone(targetBook);
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
        if (!targetSemester.regular[roundIndex]) {
          targetSemester.regular[roundIndex] = clone(sourceRound);
          return;
        }
        const targetRound = targetSemester.regular[roundIndex];
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

function countVisibleScores(book, studentIds) {
  const allowed = studentIds instanceof Set ? studentIds : new Set(studentIds || []);
  let count = 0;
  const countMap = (map = {}) => {
    Object.entries(map || {}).forEach(([studentId, value]) => {
      if (!allowed.has(studentId)) return;
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

function rosterOverlap(source, target) {
  const targetCodes = new Set(activeStudents(target).map((student) => normalizeCode(student.code)).filter(Boolean));
  const targetNames = new Set(activeStudents(target).map((student) => fold(student.fullName)).filter(Boolean));
  let matched = 0;
  const used = new Set();
  (source?.students || []).forEach((student) => {
    const code = normalizeCode(student.code);
    const name = fold(student.fullName);
    const key = code && targetCodes.has(code) ? `code:${code}` : name && targetNames.has(name) ? `name:${name}` : '';
    if (key && !used.has(key)) {
      used.add(key);
      matched += 1;
    }
  });
  return matched;
}

function candidateAllowed(candidate, target) {
  const sourceClass = normalizeClassName(candidate.workspace?.classProfile?.className);
  const targetClass = normalizeClassName(target.classProfile?.className);
  if (sourceClass && targetClass && sourceClass === targetClass) return true;
  const targetSize = Math.max(1, activeStudents(target).length);
  return rosterOverlap(candidate.workspace, target) >= Math.max(5, Math.ceil(targetSize * 0.6));
}

function addWorkspaceCandidate(candidates, workspace, source, label, createdAt = '') {
  if (!workspace || typeof workspace !== 'object') return;
  candidates.push({ workspace, source, label, createdAt: createdAt || workspace.updatedAt || workspace.createdAt || '' });
  (workspace.backups || []).forEach((backup) => {
    const snapshot = parseJson(backup?.snapshot);
    if (snapshot) candidates.push({
      workspace: snapshot,
      source: `${source}-backup`,
      label: backup?.label || `${label} · bản sao lưu`,
      createdAt: backup?.createdAt || '',
    });
  });
}

function collectLocalCandidates(user) {
  const candidates = [];
  const userKeys = new Set([user?.id, user?.authId, user?.email, 'guest'].map((value) => safeText(value).toLowerCase()).filter(Boolean));
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(LOCAL_PREFIX)) continue;
      const remainder = key.slice(LOCAL_PREFIX.length);
      const separator = remainder.indexOf(':');
      const scope = separator >= 0 ? remainder.slice(0, separator).toLowerCase() : '';
      if (scope && !userKeys.has(scope)) continue;
      const workspace = parseJson(localStorage.getItem(key));
      if (workspace) addWorkspaceCandidate(candidates, workspace, 'local', `Thiết bị · ${safeText(workspace.id)}`);
    }
  } catch (error) {
    console.warn('[ClassGradeDeepRecovery] Không đọc được toàn bộ dữ liệu cục bộ.', error);
  }
  return candidates;
}

async function collectCloudCandidates(user) {
  const candidates = [];
  if (!isSupabaseConfigured || !supabase || !user?.id) return candidates;
  const { data, error } = await supabase
    .from('bes_homeroom_workspaces')
    .select('workspace_id,class_name,payload,updated_at')
    .eq('owner_id', user.id);
  if (error) {
    console.warn('[ClassGradeDeepRecovery] Không đọc được dữ liệu cloud.', error.message || error);
    return candidates;
  }
  (data || []).forEach((row) => {
    const workspace = parseJson(row?.payload);
    if (workspace) addWorkspaceCandidate(
      candidates,
      workspace,
      'cloud',
      `Cloud · ${safeText(row.workspace_id)}`,
      row.updated_at,
    );
  });
  return candidates;
}

function downloadRecoveryEvidence(target, candidates) {
  const payload = {
    type: 'BES_CLASS_GRADE_FORENSIC_PACKAGE',
    version: 1,
    exportedAt: new Date().toISOString(),
    className: target.classProfile?.className || '',
    workspaceId: target.id,
    target,
    candidates: candidates.filter((candidate) => candidateAllowed(candidate, target)),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const classSlug = safeText(target.classProfile?.className, 'lop').replace(/\./g, '-').replace(/[^a-zA-Z0-9-]+/g, '-');
  anchor.href = url;
  anchor.download = `goi-cuu-ho-diem-lop-${classSlug}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function recoverCurrentClassGrades(button) {
  if (busy) return;
  busy = true;
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = 'Đang quét dữ liệu…';

  try {
    const user = await getCurrentUser();
    if (!user?.id) throw new Error('Chưa xác định được tài khoản giáo viên đang đăng nhập.');
    const workspaceId = getCurrentHomeroomWorkspaceId(user);
    if (!workspaceId) throw new Error('Chưa xác định được lớp đang mở.');
    const loaded = await loadHomeroomWorkspace(user, workspaceId);
    const current = loaded.workspace;
    if (!current) throw new Error('Không tải được dữ liệu lớp đang mở.');

    const targetStudents = activeStudents(current);
    const targetIds = new Set(targetStudents.map((student) => student.id));
    const before = countVisibleScores(current.learningGradebook, targetIds);
    const allCandidates = [
      ...collectLocalCandidates(user),
      ...(await collectCloudCandidates(user)),
    ].filter((candidate) => candidateAllowed(candidate, current));

    const prepared = allCandidates.map((candidate) => {
      const remapped = remapGradebook(
        candidate.workspace.learningGradebook,
        candidate.workspace.students || [],
        current.students || [],
      );
      return {
        ...candidate,
        remapped,
        visibleScores: countVisibleScores(remapped, targetIds),
      };
    }).filter((candidate) => candidate.visibleScores > 0)
      .sort((a, b) => b.visibleScores - a.visibleScores || (Date.parse(b.createdAt || 0) || 0) - (Date.parse(a.createdAt || 0) || 0));

    if (!prepared.length) {
      downloadRecoveryEvidence(current, allCandidates);
      window.alert(
        `Chưa tìm thấy bản nào còn điểm của lớp ${current.classProfile?.className || ''}. Hệ thống đã xuất gói cứu hộ chi tiết để kiểm tra sâu; hãy gửi file vừa tải vào cuộc trò chuyện.`,
      );
      return;
    }

    let mergedBook = clone(current.learningGradebook || { subjects: {} });
    prepared.forEach((candidate) => {
      mergedBook = mergeGradebooks(mergedBook, candidate.remapped);
    });
    const after = countVisibleScores(mergedBook, targetIds);
    const recovered = Math.max(0, after - before);

    if (!recovered) {
      window.alert(`Lớp ${current.classProfile?.className || ''} hiện đã có ${before} ô điểm; không tìm thấy ô trống nào cần khôi phục thêm.`);
      return;
    }

    const confirmed = window.confirm(
      `Tìm thấy ${recovered} ô điểm có thể khôi phục cho lớp ${current.classProfile?.className || ''}.\n\n`
      + `Điểm hiện có: ${before} ô · Sau khôi phục: ${after} ô.\n`
      + 'Hệ thống chỉ điền ô đang trống, không ghi đè điểm hiện có và sẽ tạo bản sao lưu trước khi lưu. Tiếp tục?',
    );
    if (!confirmed) return;

    button.textContent = 'Đang lưu điểm…';
    const backedUp = createManualBackup(current, user, `Trước khi khôi phục sâu điểm lớp ${current.classProfile?.className || ''}`);
    const next = {
      ...backedUp,
      learningGradebook: mergedBook,
      gradeRecoveryMeta: {
        ...(current.gradeRecoveryMeta || {}),
        recoveredAt: new Date().toISOString(),
        before,
        after,
        recovered,
        sources: prepared.slice(0, 10).map((candidate) => ({
          source: candidate.source,
          label: candidate.label,
          visibleScores: candidate.visibleScores,
        })),
      },
    };
    const committed = prepareWorkspaceCommit(
      backedUp,
      next,
      user,
      `Khôi phục ${recovered} ô điểm lớp ${current.classProfile?.className || ''}`,
    );
    const result = await saveHomeroomWorkspace(committed, user);
    if (result?.ok === false) throw new Error(result.message || 'Không thể lưu dữ liệu khôi phục.');

    window.alert(`Đã khôi phục ${recovered} ô điểm cho lớp ${current.classProfile?.className || ''}. Trang sẽ tải lại để hiển thị bảng điểm.`);
    window.location.reload();
  } catch (error) {
    console.error('[ClassGradeDeepRecovery] Khôi phục thất bại.', error);
    window.alert(error?.message || 'Không thể khôi phục điểm lớp đang mở.');
  } finally {
    busy = false;
    button.disabled = false;
    button.textContent = originalText;
  }
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${BUTTON_ID}{position:fixed;right:22px;bottom:198px;z-index:99990;min-height:46px;padding:0 18px;border:1px solid #1a73e8;border-radius:999px;background:#1a73e8;color:#fff;font:800 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 12px 32px rgba(26,115,232,.28);cursor:pointer}
    #${BUTTON_ID}:hover{background:#185abc}#${BUTTON_ID}:disabled{opacity:.65;cursor:wait}
    @media(max-width:640px){#${BUTTON_ID}{right:12px;bottom:190px;max-width:calc(100vw - 24px)}}
  `;
  document.head.appendChild(style);
}

function ensureButton() {
  if (!/homeroom|chu-nhiem|gvcn/i.test(window.location.hash || '')) {
    document.getElementById(BUTTON_ID)?.remove();
    return;
  }
  injectStyle();
  let button = document.getElementById(BUTTON_ID);
  if (!button) {
    button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = 'Khôi phục điểm lớp đang mở';
    button.title = 'Quét dữ liệu thiết bị, cloud và các bản sao lưu; chỉ điền các ô điểm đang trống.';
    button.addEventListener('click', () => recoverCurrentClassGrades(button));
    document.body.appendChild(button);
  }
}

window.addEventListener('hashchange', ensureButton);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureButton, { once: true });
} else {
  ensureButton();
}
