import encryptedPackage from './data/secureClassImport20260805.json';
import { AUTH_EVENT, getCurrentUser } from './utils/auth.js';
import { isDepartmentLeaderRole } from './utils/roles.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';
import {
  SCHOOL_CLASS_REGISTRY_TABLE,
  SCHOOL_CLASS_REGISTRY_VERSION,
  schoolClassRegistryStorageKey,
} from './utils/schoolClassRegistry.js';

const IMPORT_VERSION = '2026-08-05-27-classes-v1';
const IMPORT_MARKER = 'bes-secure-27-class-import-20260805-v1';
const PURGE_MARKER = 'bes-all-class-local-purge-20260805-v1';
const ROOT_ID = 'bes-secure-class-import-root';
const EXPECTED_CLASS_COUNT = 27;
const EXPECTED_STUDENT_COUNT = 718;
let checking = false;
let installed = false;
let dismissed = false;

function bytesFromBase64(value) {
  const binary = window.atob(String(value || ''));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function decryptPackage(passphrase) {
  if (!globalThis.crypto?.subtle) throw new Error('Trình duyệt chưa hỗ trợ Web Crypto.');
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(passphrase || '').trim()),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey({
    name: 'PBKDF2',
    salt: bytesFromBase64(encryptedPackage.salt),
    iterations: Number(encryptedPackage.iterations),
    hash: 'SHA-256',
  }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  let clear;
  try {
    clear = await crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: bytesFromBase64(encryptedPackage.iv),
      additionalData: bytesFromBase64(encryptedPackage.aad),
      tagLength: 128,
    }, key, bytesFromBase64(encryptedPackage.ciphertext));
  } catch {
    throw new Error('Mã nhập không đúng. Vui lòng sao chép lại chính xác.');
  }
  let decoded = new Uint8Array(clear);
  if (encryptedPackage.compression === 'gzip') {
    if (typeof DecompressionStream !== 'function') throw new Error('Trình duyệt chưa hỗ trợ giải nén dữ liệu an toàn.');
    const stream = new Blob([decoded]).stream().pipeThrough(new DecompressionStream('gzip'));
    decoded = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return JSON.parse(new TextDecoder().decode(decoded));
}

async function validatePackage(pkg) {
  if (pkg?.packageVersion !== IMPORT_VERSION) throw new Error('Gói dữ liệu không đúng phiên bản.');
  if (!Array.isArray(pkg.classes) || pkg.classes.length !== EXPECTED_CLASS_COUNT) {
    throw new Error('Gói dữ liệu không có đủ 27 lớp.');
  }
  const classNames = new Set(pkg.classes.map((item) => String(item?.className || '').trim()));
  const totalStudents = pkg.classes.reduce((sum, item) => sum + (Array.isArray(item?.students) ? item.students.length : 0), 0);
  if (classNames.size !== EXPECTED_CLASS_COUNT || totalStudents !== EXPECTED_STUDENT_COUNT) {
    throw new Error('Gói dữ liệu không đủ 718 học sinh hoặc có lớp trùng tên.');
  }
  const { sha256, ...unsigned } = pkg;
  const actualHash = await sha256Hex(stableStringify(unsigned));
  if (!sha256 || actualHash !== sha256) throw new Error('Dữ liệu mã hóa không vượt qua kiểm tra toàn vẹn.');
  return totalStudents;
}

function importedRegistryReady(payload) {
  if (!Array.isArray(payload?.classes)) return false;
  const classNames = new Set(payload.classes.map((item) => String(item?.className || '').trim()));
  const totalStudents = payload.classes.reduce((sum, item) => sum + (Array.isArray(item?.students) ? item.students.length : 0), 0);
  return classNames.size === EXPECTED_CLASS_COUNT
    && payload.classes.length === EXPECTED_CLASS_COUNT
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
}

function makeRegistry(pkg) {
  const importedAt = new Date().toISOString();
  return {
    version: Math.max(Number(SCHOOL_CLASS_REGISTRY_VERSION) || 1, 3),
    sourceLabel: pkg.sourceLabel || 'DanhSachHocSinh_27Lop_DaChuanHoa.xlsx',
    importedAt,
    updatedAt: importedAt,
    deletionAudit: [],
    classImportVersion: IMPORT_VERSION,
    classImportSummary: {
      classCount: EXPECTED_CLASS_COUNT,
      studentCount: EXPECTED_STUDENT_COUNT,
      completedAt: importedAt,
    },
    classes: pkg.classes.map((item) => ({
      className: String(item.className || '').trim(),
      grade: String(item.grade || String(item.className || '').split('.')[0]),
      expectedCount: Array.isArray(item.students) ? item.students.length : 0,
      importedCount: Array.isArray(item.students) ? item.students.length : 0,
      students: Array.isArray(item.students) ? item.students : [],
      assignment: { homeroomTeacherId: '', subjectTeacherIds: [] },
    })),
  };
}

function setMessage(root, message, kind = '') {
  const node = root.querySelector('[data-import-message]');
  if (!node) return;
  node.textContent = message;
  node.dataset.kind = kind;
}

async function commitImport(root, passphrase, user) {
  const button = root.querySelector('[data-import-submit]');
  const input = root.querySelector('[data-import-code]');
  button.disabled = true;
  input.disabled = true;
  setMessage(root, 'Đang giải mã và kiểm tra 718 hồ sơ học sinh…', 'working');
  try {
    const pkg = await decryptPackage(passphrase);
    await validatePackage(pkg);
    const registry = makeRegistry(pkg);
    clearOldClassCaches();
    const { error } = await supabase.from(SCHOOL_CLASS_REGISTRY_TABLE).upsert({
      owner_id: user.id,
      owner_email: user.email || '',
      payload: registry,
      updated_at: registry.updatedAt,
    }, { onConflict: 'owner_id' });
    if (error) throw error;
    localStorage.setItem(schoolClassRegistryStorageKey(user), JSON.stringify(registry));
    localStorage.removeItem(PURGE_MARKER);
    localStorage.setItem(IMPORT_MARKER, 'done');
    setMessage(root, 'Đã tạo đủ 27 lớp và nhập 718 học sinh. Trang sẽ tải lại ngay.', 'success');
    window.dispatchEvent(new CustomEvent('bes-school-class-registry-updated', { detail: { source: 'secure-package' } }));
    window.dispatchEvent(new CustomEvent('bes-homeroom-store-updated'));
    window.setTimeout(() => window.location.reload(), 1200);
  } catch (error) {
    setMessage(root, error?.message || 'Không thể nhập danh sách lớp.', 'error');
    button.disabled = false;
    input.disabled = false;
    input.focus();
    input.select();
  }
}

function ensureStyles() {
  if (document.getElementById(`${ROOT_ID}-style`)) return;
  const style = document.createElement('style');
  style.id = `${ROOT_ID}-style`;
  style.textContent = `
    #${ROOT_ID}{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:24px;background:rgba(15,23,42,.58);backdrop-filter:blur(14px)}
    #${ROOT_ID}[hidden]{display:none!important}
    #${ROOT_ID} .bes-import-card{width:min(560px,100%);border:1px solid rgba(255,255,255,.72);border-radius:30px;background:linear-gradient(150deg,rgba(255,255,255,.98),rgba(239,246,255,.96));box-shadow:0 30px 90px rgba(15,23,42,.32);padding:30px;font-family:inherit;color:#0f172a}
    #${ROOT_ID} .bes-import-badge{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-weight:800;font-size:12px;letter-spacing:.03em}
    #${ROOT_ID} h2{margin:16px 0 8px;font-size:clamp(25px,4vw,34px);line-height:1.12}
    #${ROOT_ID} p{margin:0;color:#475569;line-height:1.65}
    #${ROOT_ID} .bes-import-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:22px 0}
    #${ROOT_ID} .bes-import-stat{padding:15px;border-radius:18px;background:#fff;border:1px solid #dbeafe}
    #${ROOT_ID} .bes-import-stat b{display:block;font-size:25px;color:#1d4ed8}.bes-import-stat span{font-size:13px;color:#64748b}
    #${ROOT_ID} label{display:block;font-weight:800;margin:4px 0 8px}
    #${ROOT_ID} input{box-sizing:border-box;width:100%;height:54px;border:2px solid #cbd5e1;border-radius:16px;padding:0 16px;font:700 17px/1 inherit;letter-spacing:.06em;outline:none;background:#fff}
    #${ROOT_ID} input:focus{border-color:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.13)}
    #${ROOT_ID} [data-import-message]{min-height:24px;margin:10px 0 2px;font-size:14px;font-weight:700;color:#64748b}
    #${ROOT_ID} [data-import-message][data-kind=error]{color:#b91c1c}#${ROOT_ID} [data-import-message][data-kind=success]{color:#047857}#${ROOT_ID} [data-import-message][data-kind=working]{color:#1d4ed8}
    #${ROOT_ID} .bes-import-actions{display:flex;gap:10px;margin-top:16px}
    #${ROOT_ID} button{height:50px;border:0;border-radius:15px;padding:0 18px;font:800 15px/1 inherit;cursor:pointer}
    #${ROOT_ID} [data-import-submit]{flex:1;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;box-shadow:0 12px 28px rgba(37,99,235,.28)}
    #${ROOT_ID} [data-import-close]{background:#e2e8f0;color:#334155}#${ROOT_ID} button:disabled{opacity:.6;cursor:wait}
    #${ROOT_ID} small{display:block;margin-top:14px;color:#64748b;line-height:1.5}
    @media(max-width:520px){#${ROOT_ID}{padding:12px}#${ROOT_ID} .bes-import-card{padding:22px;border-radius:24px}#${ROOT_ID} .bes-import-actions{flex-direction:column-reverse}}
  `;
  document.head.appendChild(style);
}

function showImporter(user) {
  if (dismissed || document.getElementById(ROOT_ID)) return;
  ensureStyles();
  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.innerHTML = `
    <section class="bes-import-card" role="dialog" aria-modal="true" aria-labelledby="bes-import-title">
      <span class="bes-import-badge">🔐 NHẬP DỮ LIỆU MÃ HÓA DÙNG MỘT LẦN</span>
      <h2 id="bes-import-title">Tạo sẵn 27 lớp mới</h2>
      <p>Gói dữ liệu đã được kiểm tra theo danh sách bạn cung cấp. Nhập mã xác nhận để tạo lớp trên tài khoản TTCM đang đăng nhập.</p>
      <div class="bes-import-stats">
        <div class="bes-import-stat"><b>27</b><span>Lớp 10.1–12.9</span></div>
        <div class="bes-import-stat"><b>718</b><span>Hồ sơ học sinh</span></div>
      </div>
      <label for="bes-import-code">Mã nhập an toàn</label>
      <input id="bes-import-code" data-import-code type="password" autocomplete="off" spellcheck="false" placeholder="Dán mã được cung cấp trong ChatGPT" />
      <div data-import-message aria-live="polite"></div>
      <div class="bes-import-actions">
        <button type="button" data-import-close>Để sau</button>
        <button type="button" data-import-submit>Tạo 27 lớp ngay</button>
      </div>
      <small>Dữ liệu học sinh chỉ được giải mã trong trình duyệt và lưu vào Supabase của tài khoản hiện tại; bản rõ không nằm trong mã nguồn GitHub.</small>
    </section>
  `;
  document.body.appendChild(root);
  const input = root.querySelector('[data-import-code]');
  root.querySelector('[data-import-close]').addEventListener('click', () => {
    dismissed = true;
    root.remove();
  });
  root.querySelector('[data-import-submit]').addEventListener('click', () => commitImport(root, input.value, user));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') commitImport(root, input.value, user);
  });
  window.setTimeout(() => input.focus(), 50);
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
      localStorage.removeItem(PURGE_MARKER);
      return;
    }
    showImporter(user);
  } catch (error) {
    console.warn('[SecureClassImport] Chưa thể kiểm tra trạng thái nhập lớp.', error);
  } finally {
    checking = false;
  }
}

export function installSecureClassImport() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const start = () => window.setTimeout(checkAndOfferImport, 900);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.addEventListener(AUTH_EVENT, () => window.setTimeout(checkAndOfferImport, 350));
}

installSecureClassImport();
