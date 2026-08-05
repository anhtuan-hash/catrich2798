import { readSheet } from 'read-excel-file/browser';
import { AUTH_EVENT, getCurrentUser } from './utils/auth.js';
import { isDepartmentLeaderRole } from './utils/roles.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';
import {
  SCHOOL_CLASS_BLUEPRINTS,
  SCHOOL_CLASS_REGISTRY_TABLE,
  applyRosterImport,
  createDefaultSchoolClassRegistry,
  parseSchoolRosterRows,
  schoolClassRegistryStorageKey,
} from './utils/schoolClassRegistry.js';

const ROOT_ID = 'bes-direct-class-import-root';
const EXPECTED_CLASS_COUNT = 27;
const EXPECTED_STUDENT_COUNT = 718;
const IMPORT_VERSION = '2026-08-05-27-classes-direct-v1';
const IMPORT_MARKER = 'bes-direct-27-class-import-20260805-v1';
const PURGE_MARKER = 'bes-all-class-local-purge-20260805-v1';
let checking = false;
let installed = false;
let dismissed = false;

function importedRegistryReady(payload) {
  if (!Array.isArray(payload?.classes)) return false;
  const names = new Set(payload.classes.map((item) => String(item?.className || '').trim()).filter(Boolean));
  const totalStudents = payload.classes.reduce((sum, item) => (
    sum + (Array.isArray(item?.students) ? item.students.length : 0)
  ), 0);
  return payload.classes.length === EXPECTED_CLASS_COUNT
    && names.size === EXPECTED_CLASS_COUNT
    && totalStudents === EXPECTED_STUDENT_COUNT;
}

async function loadCloudRegistry(user) {
  if (!isSupabaseConfigured || !supabase || !user?.id) return null;
  const { data, error } = await supabase
    .from(SCHOOL_CLASS_REGISTRY_TABLE)
    .select('payload')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.payload || null;
}

function uniqueStudentIds(parsed) {
  const used = new Map();
  Object.values(parsed.rosters || {}).forEach((students) => {
    (students || []).forEach((student) => {
      const baseId = String(student?.id || 'student').trim() || 'student';
      const count = (used.get(baseId) || 0) + 1;
      used.set(baseId, count);
      if (count > 1) student.id = `${baseId}-duplicate-${count}`;
    });
  });
  return parsed;
}

function validateParsedRoster(parsed) {
  const populatedClasses = Object.values(parsed?.classCounts || {}).filter((count) => Number(count) > 0).length;
  if (parsed?.totalStudents !== EXPECTED_STUDENT_COUNT) {
    throw new Error(`Tệp hiện có ${Number(parsed?.totalStudents) || 0} học sinh; danh sách chuẩn phải có đúng 718 học sinh.`);
  }
  if (populatedClasses !== EXPECTED_CLASS_COUNT) {
    throw new Error(`Tệp mới nhận diện được ${populatedClasses}/27 lớp. Vui lòng chọn đúng tệp danh sách đã chuẩn hóa.`);
  }
  const expectedNames = new Set(SCHOOL_CLASS_BLUEPRINTS.map((item) => item.className));
  const actualNames = Object.entries(parsed.classCounts || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([className]) => className);
  if (actualNames.some((className) => !expectedNames.has(className))) {
    throw new Error('Tệp chứa tên lớp không thuộc danh mục 10.1–12.9.');
  }
}

function clearOldClassCaches() {
  const prefixes = [
    'bes-homeroom-workspace-v1:',
    'bes-homeroom-workspace-index-v3:',
    'bes-homeroom-current-workspace-v3:',
    'bes-homeroom-class-types-v1:',
    'bes-permanent-student-deletions-v1:',
  ];
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key) keys.push(key);
  }
  keys.forEach((key) => {
    if (prefixes.some((prefix) => key.startsWith(prefix))) localStorage.removeItem(key);
  });
  localStorage.removeItem('bes-secure-27-class-import-20260805-v1');
  localStorage.setItem(PURGE_MARKER, 'done');
}

function setMessage(root, message, kind = '') {
  const node = root.querySelector('[data-import-message]');
  if (!node) return;
  node.textContent = message;
  node.dataset.kind = kind;
}

function setSelectedFile(root, file) {
  const name = root.querySelector('[data-file-name]');
  const submit = root.querySelector('[data-import-submit]');
  const zone = root.querySelector('[data-drop-zone]');
  if (name) name.textContent = file?.name || 'Chưa chọn tệp';
  if (submit) submit.disabled = !file;
  if (zone) zone.dataset.selected = file ? 'true' : 'false';
  if (file) setMessage(root, 'Đã chọn tệp. Nhấn “Tạo 27 lớp ngay” để kiểm tra và nhập dữ liệu.', 'ready');
}

async function commitImport(root, file, user) {
  if (!file) {
    setMessage(root, 'Vui lòng chọn tệp Excel trước.', 'error');
    return;
  }
  const submit = root.querySelector('[data-import-submit]');
  const choose = root.querySelector('[data-file-choose]');
  submit.disabled = true;
  choose.disabled = true;
  setMessage(root, 'Đang đọc và kiểm tra danh sách 27 lớp…', 'working');
  try {
    const rows = await readSheet(file);
    const parsed = uniqueStudentIds(parseSchoolRosterRows(rows));
    validateParsedRoster(parsed);

    const current = await loadCloudRegistry(user) || createDefaultSchoolClassRegistry();
    const importedAt = new Date().toISOString();
    const registry = {
      ...applyRosterImport(current, parsed, file.name),
      classImportVersion: IMPORT_VERSION,
      classImportSummary: {
        classCount: EXPECTED_CLASS_COUNT,
        studentCount: EXPECTED_STUDENT_COUNT,
        completedAt: importedAt,
      },
      updatedAt: importedAt,
    };

    clearOldClassCaches();
    const { error } = await supabase.from(SCHOOL_CLASS_REGISTRY_TABLE).upsert({
      owner_id: user.id,
      owner_email: user.email || '',
      payload: registry,
      updated_at: importedAt,
    }, { onConflict: 'owner_id' });
    if (error) throw error;

    localStorage.setItem(schoolClassRegistryStorageKey(user), JSON.stringify(registry));
    localStorage.setItem(IMPORT_MARKER, 'done');
    setMessage(root, 'Đã tạo đủ 27 lớp và nhập 718 học sinh. Trang sẽ tải lại ngay.', 'success');
    window.dispatchEvent(new CustomEvent('bes-school-class-registry-updated', { detail: { source: 'direct-excel-import' } }));
    window.dispatchEvent(new CustomEvent('bes-homeroom-store-updated'));
    window.setTimeout(() => window.location.reload(), 1200);
  } catch (error) {
    setMessage(root, error?.message || 'Không thể nhập tệp Excel.', 'error');
    submit.disabled = false;
    choose.disabled = false;
  }
}

function ensureStyles() {
  if (document.getElementById(`${ROOT_ID}-style`)) return;
  const style = document.createElement('style');
  style.id = `${ROOT_ID}-style`;
  style.textContent = `
    #${ROOT_ID}{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:24px;background:rgba(15,23,42,.58);backdrop-filter:blur(14px)}
    #${ROOT_ID} .bes-import-card{width:min(590px,100%);border:1px solid rgba(255,255,255,.78);border-radius:30px;background:linear-gradient(150deg,rgba(255,255,255,.99),rgba(239,246,255,.97));box-shadow:0 30px 90px rgba(15,23,42,.32);padding:30px;font-family:inherit;color:#0f172a}
    #${ROOT_ID} .bes-import-badge{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;background:#dcfce7;color:#047857;font-weight:800;font-size:12px;letter-spacing:.03em}
    #${ROOT_ID} h2{margin:16px 0 8px;font-size:clamp(25px,4vw,34px);line-height:1.12}#${ROOT_ID} p{margin:0;color:#475569;line-height:1.65}
    #${ROOT_ID} .bes-import-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:22px 0}
    #${ROOT_ID} .bes-import-stat{padding:15px;border-radius:18px;background:#fff;border:1px solid #dbeafe}#${ROOT_ID} .bes-import-stat b{display:block;font-size:25px;color:#1d4ed8}#${ROOT_ID} .bes-import-stat span{font-size:13px;color:#64748b}
    #${ROOT_ID} .bes-file-zone{display:grid;place-items:center;gap:8px;min-height:142px;padding:20px;border:2px dashed #93c5fd;border-radius:20px;background:rgba(239,246,255,.72);text-align:center;transition:.2s ease}
    #${ROOT_ID} .bes-file-zone[data-selected=true]{border-style:solid;border-color:#22c55e;background:#f0fdf4}#${ROOT_ID} .bes-file-zone.is-dragging{transform:scale(1.01);border-color:#2563eb;background:#dbeafe}
    #${ROOT_ID} .bes-file-zone strong{font-size:17px}#${ROOT_ID} .bes-file-zone span{max-width:100%;overflow:hidden;text-overflow:ellipsis;color:#475569;font-size:14px}
    #${ROOT_ID} button{height:50px;border:0;border-radius:15px;padding:0 18px;font:800 15px/1 inherit;cursor:pointer}#${ROOT_ID} button:disabled{opacity:.55;cursor:not-allowed}
    #${ROOT_ID} [data-file-choose]{background:#fff;color:#1d4ed8;border:1px solid #93c5fd;box-shadow:0 8px 22px rgba(37,99,235,.12)}
    #${ROOT_ID} [data-import-message]{min-height:24px;margin:12px 0 2px;font-size:14px;font-weight:700;color:#64748b}#${ROOT_ID} [data-import-message][data-kind=error]{color:#b91c1c}#${ROOT_ID} [data-import-message][data-kind=success]{color:#047857}#${ROOT_ID} [data-import-message][data-kind=working]{color:#1d4ed8}#${ROOT_ID} [data-import-message][data-kind=ready]{color:#0369a1}
    #${ROOT_ID} .bes-import-actions{display:flex;gap:10px;margin-top:16px}#${ROOT_ID} [data-import-submit]{flex:1;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;box-shadow:0 12px 28px rgba(37,99,235,.28)}#${ROOT_ID} [data-import-close]{background:#e2e8f0;color:#334155}
    #${ROOT_ID} small{display:block;margin-top:14px;color:#64748b;line-height:1.55}@media(max-width:520px){#${ROOT_ID}{padding:12px}#${ROOT_ID} .bes-import-card{padding:22px;border-radius:24px}#${ROOT_ID} .bes-import-actions{flex-direction:column-reverse}}
  `;
  document.head.appendChild(style);
}

function showImporter(user) {
  if (dismissed || document.getElementById(ROOT_ID)) return;
  ensureStyles();
  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.innerHTML = `
    <section class="bes-import-card" role="dialog" aria-modal="true" aria-labelledby="bes-direct-import-title">
      <span class="bes-import-badge">📄 NHẬP FILE EXCEL · KHÔNG CẦN MẬT KHẨU</span>
      <h2 id="bes-direct-import-title">Tạo sẵn 27 lớp mới</h2>
      <p>Chọn tệp danh sách đã chuẩn hóa. Hệ thống chỉ đọc tệp trên thiết bị, kiểm tra dữ liệu rồi lưu vào Supabase của tài khoản TTCM đang đăng nhập.</p>
      <div class="bes-import-stats">
        <div class="bes-import-stat"><b>27</b><span>Lớp 10.1–12.9</span></div>
        <div class="bes-import-stat"><b>718</b><span>Hồ sơ học sinh</span></div>
      </div>
      <input data-file-input hidden type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
      <div class="bes-file-zone" data-drop-zone>
        <strong>Chọn file DanhSachHocSinh_27Lop_DaChuanHoa.xlsx</strong>
        <span data-file-name>Chưa chọn tệp</span>
        <button type="button" data-file-choose>Chọn file Excel</button>
      </div>
      <div data-import-message aria-live="polite"></div>
      <div class="bes-import-actions">
        <button type="button" data-import-close>Để sau</button>
        <button type="button" data-import-submit disabled>Tạo 27 lớp ngay</button>
      </div>
      <small>Không còn bước nhập mã. Dữ liệu học sinh không được tải lên GitHub; tệp chỉ được xử lý trong trình duyệt và ghi trực tiếp vào Supabase.</small>
    </section>
  `;
  document.body.appendChild(root);

  const input = root.querySelector('[data-file-input]');
  const choose = root.querySelector('[data-file-choose]');
  const submit = root.querySelector('[data-import-submit]');
  const zone = root.querySelector('[data-drop-zone]');
  let selectedFile = null;

  const selectFile = (file) => {
    selectedFile = file || null;
    setSelectedFile(root, selectedFile);
  };

  choose.addEventListener('click', () => input.click());
  input.addEventListener('change', () => selectFile(input.files?.[0]));
  submit.addEventListener('click', () => commitImport(root, selectedFile, user));
  root.querySelector('[data-import-close]').addEventListener('click', () => {
    dismissed = true;
    root.remove();
  });
  ['dragenter', 'dragover'].forEach((type) => zone.addEventListener(type, (event) => {
    event.preventDefault();
    zone.classList.add('is-dragging');
  }));
  ['dragleave', 'drop'].forEach((type) => zone.addEventListener(type, (event) => {
    event.preventDefault();
    zone.classList.remove('is-dragging');
  }));
  zone.addEventListener('drop', (event) => selectFile(event.dataTransfer?.files?.[0]));
}

async function checkAndOfferImport() {
  if (checking || dismissed) return;
  checking = true;
  try {
    const user = await getCurrentUser();
    if (!user?.id || user.approved === false || !isDepartmentLeaderRole(user.role)) return;
    if (!isSupabaseConfigured || !supabase) return;
    const payload = await loadCloudRegistry(user);
    if (importedRegistryReady(payload)) {
      localStorage.setItem(IMPORT_MARKER, 'done');
      localStorage.setItem(PURGE_MARKER, 'done');
      document.getElementById(ROOT_ID)?.remove();
      return;
    }
    showImporter(user);
  } catch (error) {
    console.warn('[DirectClassRosterImport] Chưa thể kiểm tra trạng thái nhập lớp.', error);
  } finally {
    checking = false;
  }
}

export function installDirectClassRosterImport() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const start = () => window.setTimeout(checkAndOfferImport, 800);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.addEventListener(AUTH_EVENT, () => window.setTimeout(checkAndOfferImport, 300));
}

installDirectClassRosterImport();
