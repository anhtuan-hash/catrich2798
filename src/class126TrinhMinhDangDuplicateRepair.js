import { getCurrentUser } from './utils/auth.js';
import {
  listHomeroomWorkspaces,
  loadHomeroomWorkspace,
  loadLocalHomeroomWorkspace,
  saveHomeroomWorkspace,
  saveLocalHomeroomWorkspace,
} from './utils/homeroomClassWorkspaceStore.js';
import {
  normalizeSchoolClassName,
  normalizeSchoolClassRegistry,
  schoolClassRegistryStorageKey,
} from './utils/schoolClassRegistry.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';

const CLASS_NAME = '12.6';
const DUPLICATE_ID = '034d8c44-5217-4087-b068-ebf9dc822b1e';
const CANONICAL_ID = 'student-074209005954';
const CANONICAL_CODE = '074209005954';
const STUDENT_NAME = 'Trịnh Minh Đăng';
const BIRTH_DATE = '2009-02-02';
const TOMBSTONE_PREFIX = 'bes-permanent-student-deletions-v1';
let running = false;
let installed = false;

function text(value, fallback = '') {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

function fold(value) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeDate(value) {
  const raw = text(value);
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  const local = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (local) return `${local[3]}-${String(local[2]).padStart(2, '0')}-${String(local[1]).padStart(2, '0')}`;
  return raw;
}

function userKey(user) {
  return text(user?.id || user?.authId || user?.email, 'guest').toLowerCase();
}

function isDuplicateStudent(student) {
  if (!student) return false;
  if (student.id === DUPLICATE_ID) return true;
  return !text(student.code)
    && fold(student.fullName) === fold(STUDENT_NAME)
    && normalizeDate(student.birthDate) === BIRTH_DATE;
}

function isCanonicalStudent(student) {
  if (!student) return false;
  return student.id === CANONICAL_ID || text(student.code).replace(/\D/g, '') === CANONICAL_CODE;
}

function clone(value) {
  if (value == null || typeof value !== 'object') return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function isBlank(value) {
  return value == null || value === '';
}

function mergePreferExisting(existing, incoming) {
  if (existing === undefined) return clone(incoming);
  if (incoming === undefined) return clone(existing);
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    const byKey = new Map();
    [...existing, ...incoming].forEach((item, index) => {
      const key = item && typeof item === 'object'
        ? text(item.id || item.sourceKey || `${item.studentId || ''}:${item.date || ''}:${item.title || ''}`)
        : `${typeof item}:${String(item)}:${index}`;
      if (!byKey.has(key)) byKey.set(key, clone(item));
    });
    return [...byKey.values()];
  }
  if (existing && incoming && typeof existing === 'object' && typeof incoming === 'object') {
    const output = clone(existing);
    Object.entries(incoming).forEach(([key, value]) => {
      output[key] = key in output ? mergePreferExisting(output[key], value) : clone(value);
    });
    return output;
  }
  return isBlank(existing) && !isBlank(incoming) ? clone(incoming) : clone(existing);
}

function canonicalStudent(primary, duplicate) {
  const merged = mergePreferExisting(primary || {}, duplicate || {});
  return {
    ...merged,
    ...(primary || {}),
    id: CANONICAL_ID,
    code: CANONICAL_CODE,
    fullName: text(primary?.fullName || duplicate?.fullName, STUDENT_NAME),
    birthDate: normalizeDate(primary?.birthDate || duplicate?.birthDate || BIRTH_DATE),
    active: primary?.active !== false,
    lifecycleStatus: text(primary?.lifecycleStatus, 'active'),
    updatedAt: new Date().toISOString(),
  };
}

function repairStudentArray(students, fallbackCanonical) {
  if (!Array.isArray(students)) return [];
  const duplicate = students.find(isDuplicateStudent) || null;
  const primary = students.find(isCanonicalStudent) || fallbackCanonical || null;
  if (!duplicate) return students.map((student) => remapValue(student, fallbackCanonical));

  const replacement = canonicalStudent(primary, duplicate);
  const output = [];
  let inserted = false;
  students.forEach((student) => {
    if (isDuplicateStudent(student)) {
      if (!primary && !inserted) {
        output.push(replacement);
        inserted = true;
      }
      return;
    }
    if (isCanonicalStudent(student)) {
      if (!inserted) {
        output.push(replacement);
        inserted = true;
      }
      return;
    }
    output.push(remapValue(student, fallbackCanonical));
  });
  if (!inserted) output.push(replacement);
  return output;
}

function remapValue(value, fallbackCanonical) {
  if (value === DUPLICATE_ID) return CANONICAL_ID;
  if (Array.isArray(value)) return value.map((item) => remapValue(item, fallbackCanonical));
  if (!value || typeof value !== 'object') return value;

  const output = {};
  Object.entries(value).forEach(([key, item]) => {
    if (key === 'students' && Array.isArray(item)) {
      output[key] = repairStudentArray(item, fallbackCanonical);
      return;
    }
    const nextKey = key === DUPLICATE_ID ? CANONICAL_ID : key;
    const nextValue = remapValue(item, fallbackCanonical);
    output[nextKey] = nextKey in output
      ? mergePreferExisting(output[nextKey], nextValue)
      : nextValue;
  });
  return output;
}

function repairWorkspace(workspace) {
  const students = Array.isArray(workspace?.students) ? workspace.students : [];
  const duplicate = students.find(isDuplicateStudent);
  if (!duplicate) return { changed: false, workspace };
  const primary = students.find(isCanonicalStudent);
  if (!primary) throw new Error('Không tìm thấy hồ sơ Trịnh Minh Đăng có mã 074209005954 để nhận dữ liệu.');

  const repaired = remapValue(workspace, primary);
  repaired.students = repairStudentArray(students, primary);
  repaired.updatedAt = new Date().toISOString();
  repaired.auditLogs = [
    {
      id: `repair-trinh-minh-dang-${Date.now()}`,
      action: 'Xóa hồ sơ trùng Trịnh Minh Đăng không có mã',
      summary: `Gộp ${DUPLICATE_ID} vào ${CANONICAL_ID}; giữ hồ sơ mã ${CANONICAL_CODE}.`,
      actorName: 'Hệ thống sửa dữ liệu',
      source: 'class-12.6-data-repair',
      createdAt: repaired.updatedAt,
    },
    ...(repaired.auditLogs || []),
  ].slice(0, 300);
  return { changed: true, workspace: repaired };
}

function tombstoneKey(user) {
  return `${TOMBSTONE_PREFIX}:${userKey(user)}:${normalizeSchoolClassName(CLASS_NAME)}`;
}

function persistExactTombstone(user) {
  const key = tombstoneKey(user);
  let rows = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    rows = Array.isArray(parsed) ? parsed : [];
  } catch {
    rows = [];
  }
  if (!rows.some((item) => text(item?.id) === DUPLICATE_ID)) {
    rows.push({ id: DUPLICATE_ID, code: '', identity: '', fullName: STUDENT_NAME, deletedAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(rows));
  }
}

function repairRegistryPayload(registry) {
  let changed = false;
  const next = {
    ...registry,
    updatedAt: new Date().toISOString(),
    classes: (registry.classes || []).map((item) => {
      if (normalizeSchoolClassName(item.className) !== CLASS_NAME) return item;
      const students = (item.students || []).filter((student) => {
        const remove = isDuplicateStudent(student);
        if (remove) changed = true;
        return !remove;
      });
      return {
        ...item,
        students,
        importedCount: students.filter((student) => student?.active !== false).length,
      };
    }),
  };
  return { changed, payload: next };
}

async function repairRegistry(user) {
  const key = schoolClassRegistryStorageKey(user);
  let registry = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) registry = normalizeSchoolClassRegistry(JSON.parse(raw));
  } catch {
    registry = null;
  }
  if (!registry) return { changed: false, cloudOk: true };

  const result = repairRegistryPayload(registry);
  if (!result.changed) return { changed: false, cloudOk: true };
  localStorage.setItem(key, JSON.stringify(result.payload));

  const role = text(user?.role).toLowerCase();
  if (!isSupabaseConfigured || !supabase || !['admin', 'department_head', 'ttcm'].includes(role)) {
    return { changed: true, cloudOk: true };
  }
  const { error } = await supabase.from('school_class_registries').upsert({
    owner_id: user.id,
    owner_email: user.email || '',
    payload: result.payload,
    updated_at: result.payload.updatedAt,
  }, { onConflict: 'owner_id' });
  return { changed: true, cloudOk: !error, message: error?.message || '' };
}

function showRepairNotice(message, tone = 'success') {
  document.getElementById('bes-class126-duplicate-repair-notice')?.remove();
  const notice = document.createElement('div');
  notice.id = 'bes-class126-duplicate-repair-notice';
  notice.textContent = message;
  notice.style.cssText = `position:fixed;right:22px;bottom:24px;z-index:1000002;max-width:min(560px,calc(100vw - 44px));padding:14px 18px;border-radius:14px;background:${tone === 'error' ? '#b3261e' : '#188038'};color:#fff;font:800 14px/1.45 system-ui;box-shadow:0 12px 40px rgba(0,0,0,.24)`;
  document.body.appendChild(notice);
  window.setTimeout(() => notice.remove(), 7000);
}

export async function repairClass126TrinhMinhDangDuplicate() {
  if (running || !/homeroom|chu-nhiem|gvcn/i.test(window.location.hash || '')) return { changed: false };
  running = true;
  try {
    const user = await getCurrentUser();
    if (!user?.id) return { changed: false };
    persistExactTombstone(user);

    const catalog = await listHomeroomWorkspaces(user);
    const targets = (catalog.items || []).filter((item) => normalizeSchoolClassName(item.className) === CLASS_NAME);
    let changed = 0;
    let cloudWarnings = [];

    for (const meta of targets) {
      const loaded = await loadHomeroomWorkspace(user, meta.id);
      const workspace = loaded.workspace;
      if (!workspace) continue;
      const repaired = repairWorkspace(workspace);
      if (!repaired.changed) continue;

      saveLocalHomeroomWorkspace(repaired.workspace, user);
      const verified = loadLocalHomeroomWorkspace(user, repaired.workspace.id);
      if ((verified?.students || []).some(isDuplicateStudent)) {
        throw new Error('Không thể loại hồ sơ không có mã khỏi dữ liệu trên thiết bị.');
      }
      const saved = await saveHomeroomWorkspace(verified || repaired.workspace, user);
      if (saved?.ok === false) cloudWarnings.push(saved.message || `Lớp ${CLASS_NAME} chưa đồng bộ cloud.`);
      changed += 1;
    }

    const registry = await repairRegistry(user);
    if (!registry.cloudOk) cloudWarnings.push(registry.message || 'Danh mục lớp chưa đồng bộ cloud.');

    if (changed || registry.changed) {
      window.dispatchEvent(new CustomEvent('bes-school-class-registry-updated', {
        detail: { source: 'class-12.6-trinh-minh-dang-duplicate-repair', className: CLASS_NAME },
      }));
      showRepairNotice(
        cloudWarnings.length
          ? `Đã xóa hồ sơ Trịnh Minh Đăng không có mã trên thiết bị và gộp dữ liệu vào mã ${CANONICAL_CODE}. Cloud sẽ đồng bộ lại khi kết nối ổn định.`
          : `Đã xóa hồ sơ Trịnh Minh Đăng không có mã và gộp toàn bộ dữ liệu vào mã ${CANONICAL_CODE}.`,
        cloudWarnings.length ? 'error' : 'success',
      );
      window.setTimeout(() => window.location.reload(), 900);
    }
    return { changed: Boolean(changed || registry.changed) };
  } catch (error) {
    console.error('[Class126TrinhMinhDangDuplicateRepair] Không thể sửa hồ sơ trùng.', error);
    showRepairNotice(error?.message || 'Không thể xóa hồ sơ Trịnh Minh Đăng không có mã.', 'error');
    return { changed: false, error };
  } finally {
    running = false;
  }
}

function scheduleRepair(delay = 250) {
  window.setTimeout(() => repairClass126TrinhMinhDangDuplicate(), delay);
}

export function installClass126TrinhMinhDangDuplicateRepair() {
  if (installed) return;
  installed = true;
  window.addEventListener('bes-school-class-assignment-synced', () => scheduleRepair(180));
  window.addEventListener('bes-homeroom-store-updated', () => scheduleRepair(220));
  window.addEventListener('hashchange', () => scheduleRepair(120));
  scheduleRepair(350);
}

installClass126TrinhMinhDangDuplicateRepair();
