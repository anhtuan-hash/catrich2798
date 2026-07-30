import {
  createWeeklyPractice,
  WEEKLY_PRACTICE_MAX_BYTES,
  WEEKLY_PRACTICE_TABLE,
} from './utils/weeklyPractice.js';
import { invalidateSupabaseReadCacheForTable, supabase } from './utils/supabase.js';
import './styles/WeeklyManagerPowerTools.css';

const FORM_SELECTOR = '.bes-weekly-manager--simple form.bes-weekly-form--simple';
const LIST_SELECTOR = '.bes-weekly-manager--simple .bes-weekly-manage-list';
const MAX_BATCH_FILES = 30;
const GRADE_VALUES = ['10', '11', '12'];
const PUBLICATION_VALUES = ['published', 'draft', 'pending', 'scheduled'];
const stateByForm = new WeakMap();
let scanFrame = 0;

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;
}

function fileKey(file) {
  return [file?.name, file?.size, file?.lastModified, file?.type].join('::');
}

function uniqueFiles(files) {
  const seen = new Set();
  return files.filter((file) => {
    if (!file) return false;
    const key = fileKey(file);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function assignFiles(input, files) {
  try {
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
    return input.files.length === files.length;
  } catch {
    return false;
  }
}

function localParts(value = new Date(Date.now() + 60 * 60 * 1000)) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  const iso = date.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function combineLocalDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function currentIsoWeek() {
  const date = new Date();
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function publicationLabel(mode) {
  return {
    published: 'Công bố ngay',
    draft: 'Chưa công bố',
    pending: 'Chờ công bố',
    scheduled: 'Lịch công bố',
  }[mode] || 'Công bố ngay';
}

function databaseStatusForMode(mode) {
  if (mode === 'pending') return 'archived';
  if (mode === 'scheduled') return 'published';
  return mode;
}

function selectedMode(form) {
  return form.querySelector('input[name="bes-weekly-publication-mode"]:checked')?.value || 'published';
}

function submitLabel(mode, count = 1) {
  if (count > 1) return `Tải lên ${count} bài`;
  if (mode === 'scheduled') return 'Tải lên và đặt lịch';
  if (mode === 'published') return 'Tải lên và công bố';
  return 'Tải lên và lưu trạng thái';
}

function managerMessage(formOrManager, text, isError = false) {
  const manager = formOrManager?.matches?.('.bes-weekly-manager--simple')
    ? formOrManager
    : formOrManager?.closest?.('.bes-weekly-manager--simple');
  if (!manager) return;
  let message = manager.querySelector('.bes-weekly-manager__message');
  if (!message && manager.querySelector('header')) {
    message = document.createElement('div');
    message.className = 'bes-weekly-manager__message';
    manager.querySelector('header').insertAdjacentElement('afterend', message);
  }
  if (!message) return;
  message.textContent = text;
  message.classList.toggle('is-error', isError);
}

function inferTitle(filename) {
  return cleanText(String(filename || '')
    .replace(/\.html?$/i, '')
    .replace(/[_-]+/g, ' ')) || 'Bài luyện tập theo tuần';
}

function inferGrade(filename, fallback = '10') {
  return String(filename || '').match(/(?:^|\D)(10|11|12)(?:\D|$)/)?.[1]
    || (GRADE_VALUES.includes(fallback) ? fallback : '10');
}

function getSingleControls(form) {
  const titleInput = form.querySelector(
    'input:not([type="file"]):not([type="date"]):not([type="time"]):not([type="radio"]):not([type="number"])',
  );
  return {
    titleInput,
    titleLabel: titleInput?.closest('label') || null,
    gradeField: form.querySelector('.bes-weekly-grade-field'),
    publicationBlock: form.querySelector('.bes-weekly-publication-block'),
  };
}

function setSingleControlsDisabled(form, disabled) {
  const { titleInput, titleLabel, gradeField, publicationBlock } = getSingleControls(form);
  if (titleLabel) titleLabel.hidden = disabled;
  if (gradeField) gradeField.hidden = disabled;
  if (publicationBlock) publicationBlock.hidden = disabled;
  if (titleInput) titleInput.disabled = disabled;
  gradeField?.querySelectorAll('input, select').forEach((control) => { control.disabled = disabled; });
  publicationBlock?.querySelectorAll('input, select').forEach((control) => { control.disabled = disabled; });
  form.classList.toggle('bes-weekly-bulk-active', disabled);
}

function ensurePickerTools(form, input) {
  const label = input.closest('.bes-weekly-file');
  if (!label) return null;
  let tools = label.querySelector('.bes-weekly-power-picker-tools');
  if (!tools) {
    tools = document.createElement('div');
    tools.className = 'bes-weekly-power-picker-tools';
    tools.innerHTML = '<span data-role="count">0/30 file đã chọn</span><button type="button" data-action="clear" hidden>Xóa danh sách</button>';
    label.appendChild(tools);
    tools.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
      const state = stateByForm.get(form);
      if (!state) return;
      state.files = [];
      input.value = '';
      assignFiles(input, []);
      renderBatch(form, state);
      managerMessage(form, 'Đã xóa danh sách file đã chọn.');
    });
  }
  return tools;
}

function updatePickerTools(form, state) {
  const input = form.querySelector('input[type="file"]');
  const tools = input ? ensurePickerTools(form, input) : null;
  if (!tools) return;
  const count = tools.querySelector('[data-role="count"]');
  const clear = tools.querySelector('[data-action="clear"]');
  if (count) count.textContent = `${state.files.length}/${MAX_BATCH_FILES} file đã chọn`;
  if (clear) clear.hidden = state.files.length === 0;
}

function createBatchRoot(form) {
  let root = form.querySelector('.bes-weekly-bulk-upload');
  if (root) return root;
  root = document.createElement('section');
  root.className = 'bes-weekly-bulk-upload';
  root.hidden = true;
  root.innerHTML = '<header class="bes-weekly-bulk-head"><div><strong>Tải nhiều bài cùng lúc</strong><small>Mỗi file có tên, phân loại và lịch công bố riêng.</small></div><span class="bes-weekly-bulk-count">0/30 file</span></header><div class="bes-weekly-bulk-list"></div>';
  form.querySelector('.bes-weekly-file')?.insertAdjacentElement('afterend', root);
  return root;
}

function createModeOptions(selected) {
  return PUBLICATION_VALUES.map((mode) => (
    `<option value="${mode}"${mode === selected ? ' selected' : ''}>${publicationLabel(mode)}</option>`
  )).join('');
}

function renderBatch(form, state) {
  const files = state.files;
  const root = createBatchRoot(form);
  const list = root.querySelector('.bes-weekly-bulk-list');
  const fallbackGrade = form.querySelector('#bes-weekly-grade-classification')?.value || '10';
  const fallbackMode = selectedMode(form);
  const defaults = localParts();
  const today = localParts(new Date()).date;
  const submit = form.querySelector('button[type="submit"]');

  root.hidden = files.length < 2;
  setSingleControlsDisabled(form, files.length >= 2);
  updatePickerTools(form, state);

  if (files.length < 2) {
    list.innerHTML = '';
    if (submit && !state.saving) submit.textContent = submitLabel(fallbackMode, 1);
    return;
  }

  root.querySelector('.bes-weekly-bulk-count').textContent = `${files.length}/${MAX_BATCH_FILES} file`;
  list.innerHTML = files.map((file, index) => {
    const title = inferTitle(file.name);
    const grade = inferGrade(file.name, fallbackGrade);
    return `<article class="bes-weekly-bulk-item" data-bulk-index="${index}">
      <div class="bes-weekly-bulk-item__top"><div><strong>${index + 1}. ${escapeHtml(file.name)}</strong><small>${escapeHtml(formatBytes(file.size))}</small></div><span class="bes-weekly-bulk-status">Sẵn sàng</span></div>
      <div class="bes-weekly-bulk-fields">
        <label class="is-wide"><span>Tên bài</span><input class="bes-weekly-bulk-title" type="text" value="${escapeHtml(title)}" required></label>
        <label><span>Phân loại</span><select class="bes-weekly-bulk-grade" required><option value="10"${grade === '10' ? ' selected' : ''}>Tiếng Anh 10</option><option value="11"${grade === '11' ? ' selected' : ''}>Tiếng Anh 11</option><option value="12"${grade === '12' ? ' selected' : ''}>Tiếng Anh 12</option></select></label>
        <label><span>Trạng thái</span><select class="bes-weekly-bulk-mode" required>${createModeOptions(fallbackMode)}</select></label>
        <label><span>Thời lượng</span><input class="bes-weekly-bulk-duration" type="number" min="1" max="300" step="1" value="45" required></label>
        <div class="bes-weekly-bulk-schedule is-wide" hidden><label><span>Ngày công bố</span><input class="bes-weekly-bulk-date" type="date" min="${today}" value="${defaults.date}"></label><label><span>Giờ công bố</span><input class="bes-weekly-bulk-time" type="time" step="60" value="${defaults.time}"></label></div>
      </div>
    </article>`;
  }).join('');

  list.querySelectorAll('.bes-weekly-bulk-item').forEach((row) => {
    const mode = row.querySelector('.bes-weekly-bulk-mode');
    const schedule = row.querySelector('.bes-weekly-bulk-schedule');
    const update = () => { schedule.hidden = mode.value !== 'scheduled'; };
    mode.addEventListener('change', update);
    update();
  });
  if (submit && !state.saving) submit.textContent = submitLabel(fallbackMode, files.length);
}

function readEntries(form, state) {
  if (state.files.length >= 2) {
    return [...form.querySelectorAll('.bes-weekly-bulk-item')].map((row, index) => {
      const mode = row.querySelector('.bes-weekly-bulk-mode')?.value || 'published';
      return {
        row,
        file: state.files[index],
        title: cleanText(row.querySelector('.bes-weekly-bulk-title')?.value),
        grade: row.querySelector('.bes-weekly-bulk-grade')?.value || '10',
        mode,
        duration: Number(row.querySelector('.bes-weekly-bulk-duration')?.value || 45),
        opensAt: mode === 'scheduled'
          ? combineLocalDateTime(row.querySelector('.bes-weekly-bulk-date')?.value, row.querySelector('.bes-weekly-bulk-time')?.value)
          : new Date(),
      };
    });
  }

  const { titleInput } = getSingleControls(form);
  const mode = selectedMode(form);
  return [{
    row: null,
    file: state.files[0] || form.querySelector('input[type="file"]')?.files?.[0] || null,
    title: cleanText(titleInput?.value),
    grade: form.querySelector('#bes-weekly-grade-classification')?.value || '10',
    mode,
    duration: 45,
    opensAt: mode === 'scheduled'
      ? combineLocalDateTime(form.querySelector('#bes-weekly-publish-date')?.value, form.querySelector('#bes-weekly-publish-time')?.value)
      : new Date(),
  }];
}

function setRowStatus(row, text, status = '') {
  if (!row) return;
  const node = row.querySelector('.bes-weekly-bulk-status');
  if (!node) return;
  node.textContent = text;
  node.className = `bes-weekly-bulk-status${status ? ` is-${status}` : ''}`;
}

function validateEntries(entries) {
  const errors = [];
  entries.forEach((entry) => {
    entry.row?.classList.remove('is-error');
    let message = '';
    if (!entry.title) message = 'Hãy nhập tên bài.';
    else if (!GRADE_VALUES.includes(entry.grade)) message = 'Phân loại chưa hợp lệ.';
    else if (!PUBLICATION_VALUES.includes(entry.mode)) message = 'Trạng thái chưa hợp lệ.';
    else if (!entry.file || !/\.html?$/i.test(entry.file.name)) message = 'Chỉ chấp nhận file HTML.';
    else if (entry.file.size > WEEKLY_PRACTICE_MAX_BYTES) message = 'File vượt quá 10 MB.';
    else if (!Number.isFinite(entry.duration) || entry.duration < 1 || entry.duration > 300) message = 'Thời lượng phải từ 1–300 phút.';
    else if (entry.mode === 'scheduled' && (!entry.opensAt || entry.opensAt.getTime() <= Date.now())) message = 'Lịch công bố phải ở tương lai.';
    if (message) {
      errors.push([entry, message]);
      entry.row?.classList.add('is-error');
      setRowStatus(entry.row, message, 'error');
    }
  });
  return errors;
}

async function handleSubmit(event) {
  const form = event.target?.closest?.(FORM_SELECTOR);
  if (!form || form.dataset.weeklyPowerReady !== '1') return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const state = stateByForm.get(form);
  if (!state || state.saving) return;

  const entries = readEntries(form, state).filter((entry) => entry.row?.dataset.uploaded !== '1');
  const errors = validateEntries(entries);
  if (errors.length) {
    managerMessage(form, `Có ${errors.length} bài cần kiểm tra lại trước khi tải.`, true);
    errors[0][0].row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  state.saving = true;
  const button = form.querySelector('button[type="submit"]');
  if (button) {
    button.disabled = true;
    button.textContent = `Đang tải 0/${entries.length}…`;
  }
  managerMessage(form, `Đang tải ${entries.length} bài lên hệ thống…`);

  let success = 0;
  let failed = 0;
  try {
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    const year = new Date().getFullYear();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      setRowStatus(entry.row, `Đang tải ${index + 1}/${entries.length}…`, 'uploading');
      if (button) button.textContent = `Đang tải ${index + 1}/${entries.length}…`;
      try {
        await createWeeklyPractice({
          form: {
            title: entry.title,
            description: '',
            week_key: currentIsoWeek(),
            school_year: `${year}-${year + 1}`,
            grade: entry.grade,
            category: 'HTML tương tác',
            cefr: '',
            question_count: 0,
            duration_minutes: entry.duration,
            opens_at: entry.opensAt.toISOString(),
            closes_at: '',
            status: databaseStatusForMode(entry.mode),
            allow_retake: true,
            collect_results: true,
            show_answers: true,
            is_featured: entry.mode === 'published' || entry.mode === 'scheduled',
          },
          file: entry.file,
          currentUser,
        });
        if (entry.row) entry.row.dataset.uploaded = '1';
        entry.row?.classList.add('is-success');
        setRowStatus(entry.row, `Đã tải · ${publicationLabel(entry.mode)}`, 'success');
        success += 1;
      } catch (error) {
        entry.row?.classList.add('is-error');
        setRowStatus(entry.row, cleanText(error?.message) || 'Tải lên thất bại', 'error');
        failed += 1;
      }
    }
  } catch (error) {
    failed = entries.length;
    managerMessage(form, error?.message || 'Không thể xác thực tài khoản tải bài.', true);
  } finally {
    state.saving = false;
    if (button) {
      button.disabled = false;
      button.textContent = failed ? 'Thử lại các bài lỗi' : `Đã tải ${success} bài`;
    }
  }

  if (!failed) {
    managerMessage(form, `Đã tải thành công ${success} bài. Đang làm mới danh sách…`);
    window.setTimeout(() => window.location.reload(), 900);
  } else {
    managerMessage(form, `Đã tải ${success} bài; ${failed} bài chưa thành công. Có thể sửa và thử lại các bài lỗi.`, true);
  }
}

function handleFileChange(event) {
  const input = event.target;
  if (!input?.matches?.(`${FORM_SELECTOR} input[type="file"]`)) return;
  const form = input.closest(FORM_SELECTOR);
  if (!form || form.dataset.weeklyPowerReady !== '1') return;
  event.stopPropagation();
  event.stopImmediatePropagation();

  const state = stateByForm.get(form);
  if (!state) return;
  const picked = [...(input.files || [])];
  if (!picked.length) {
    state.files = [];
    renderBatch(form, state);
    managerMessage(form, 'Chưa chọn file HTML.');
    return;
  }

  const merged = uniqueFiles([...state.files, ...picked]);
  state.files = merged.slice(0, MAX_BATCH_FILES);
  assignFiles(input, state.files);
  renderBatch(form, state);

  if (merged.length > MAX_BATCH_FILES) {
    managerMessage(form, `Chỉ giữ lại ${MAX_BATCH_FILES} file đầu tiên trong lần tải này.`, true);
  } else if (state.files.length > 1) {
    managerMessage(form, `Đã chọn ${state.files.length}/${MAX_BATCH_FILES} file. Hãy thiết lập từng bài trước khi tải.`);
  } else {
    managerMessage(form, 'Đã chọn 1 file. Biểu mẫu đang dùng chế độ tải đơn.');
  }
}

function patchForm(form) {
  if (!form) return;
  const input = form.querySelector('input[type="file"]');
  if (!input) return;

  let state = stateByForm.get(form);
  if (!state) {
    state = { files: [], saving: false };
    stateByForm.set(form, state);
  }

  form.dataset.weeklyPowerReady = '1';
  form.dataset.bulkUploadReady = '1';
  input.dataset.bulkInputGuardReady = '1';
  input.multiple = true;
  input.setAttribute('multiple', '');
  input.accept = '.html,.htm,text/html';
  input.setAttribute('accept', '.html,.htm,text/html');
  input.setAttribute('aria-label', 'Chọn tối đa 30 file HTML');
  const hint = input.closest('.bes-weekly-file')?.querySelector(':scope > span');
  if (hint && !state.files.length) hint.textContent = 'Chọn 1–30 file HTML; mỗi file tối đa 10 MB.';
  ensurePickerTools(form, input);
  createBatchRoot(form);
  updatePickerTools(form, state);
}

function chunkValues(values, size = 100) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

async function loadAllManagedItems() {
  const items = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(WEEKLY_PRACTICE_TABLE)
      .select('id,title,storage_bucket,storage_path,created_at')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = Array.isArray(data) ? data : [];
    items.push(...page);
    if (page.length < pageSize) break;
  }
  return items;
}

async function deleteAllPractices(button, manager) {
  if (button.dataset.deleting === '1') return;
  let items;
  try {
    items = await loadAllManagedItems();
  } catch (error) {
    managerMessage(manager, error?.message || 'Không thể tải danh sách bài để xóa.', true);
    return;
  }

  const total = items.length;
  if (!total) {
    managerMessage(manager, 'Không có bài nào để xóa.');
    return;
  }
  if (!window.confirm(`Xóa vĩnh viễn toàn bộ ${total} bài ở tất cả các khối và mọi trạng thái? Thao tác này không thể hoàn tác.`)) return;
  const phrase = window.prompt('Nhập chính xác “XÓA TẤT CẢ” để xác nhận lần cuối:');
  if (cleanText(phrase).toLocaleUpperCase('vi-VN') !== 'XÓA TẤT CẢ') {
    managerMessage(manager, 'Đã hủy thao tác vì cụm xác nhận không chính xác.', true);
    return;
  }

  button.dataset.deleting = '1';
  button.disabled = true;
  button.textContent = `Đang xóa 0/${total}…`;
  managerMessage(manager, `Đang xóa ${total} bài và file HTML đi kèm…`);
  let deleted = 0;
  let storageWarnings = 0;

  try {
    for (const idChunk of chunkValues(items.map((item) => item.id).filter(Boolean), 100)) {
      const { error } = await supabase.from(WEEKLY_PRACTICE_TABLE).delete().in('id', idChunk);
      if (error) throw error;
      deleted += idChunk.length;
      button.textContent = `Đang xóa ${deleted}/${total}…`;
    }

    const byBucket = new Map();
    items.forEach((item) => {
      if (!item?.storage_path) return;
      const bucket = cleanText(item.storage_bucket) || 'weekly-practice';
      if (!byBucket.has(bucket)) byBucket.set(bucket, new Set());
      byBucket.get(bucket).add(item.storage_path);
    });
    for (const [bucket, pathSet] of byBucket.entries()) {
      for (const pathChunk of chunkValues([...pathSet], 100)) {
        const { error } = await supabase.storage.from(bucket).remove(pathChunk);
        if (error) storageWarnings += pathChunk.length;
      }
    }

    invalidateSupabaseReadCacheForTable(WEEKLY_PRACTICE_TABLE);
    managerMessage(
      manager,
      `Đã xóa vĩnh viễn ${deleted} bài.${storageWarnings ? ` Có ${storageWarnings} file lưu trữ chưa dọn được.` : ' Toàn bộ file HTML đi kèm cũng đã được dọn.'}`,
      storageWarnings > 0,
    );
    window.dispatchEvent(new CustomEvent('bes-weekly-practice-updated', { detail: { deleteAll: true, count: deleted, source: 'weekly-manager-power-tools' } }));
    window.setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    button.dataset.deleting = '0';
    button.disabled = false;
    button.textContent = 'Xóa tất cả';
    managerMessage(manager, error?.message || `Không thể xóa toàn bộ bài. Đã xử lý ${deleted}/${total} bài.`, true);
  }
}

function ensureDeleteAllButton(list) {
  const manager = list.closest('.bes-weekly-manager--simple');
  const toolbar = list.querySelector(':scope > .bes-weekly-bulk-toolbar');
  if (!manager || !toolbar || toolbar.querySelector('.bes-weekly-power-delete-all')) return;
  const top = toolbar.querySelector('.bes-weekly-bulk-toolbar__top');
  const sort = toolbar.querySelector('[data-action="sort"]');
  if (!top || !sort) return;

  let wrap = top.querySelector('.bes-weekly-power-delete-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'bes-weekly-power-delete-wrap';
    sort.insertAdjacentElement('beforebegin', wrap);
    wrap.appendChild(sort);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bes-weekly-power-delete-all';
  button.textContent = 'Xóa tất cả';
  button.addEventListener('click', () => deleteAllPractices(button, manager));
  wrap.appendChild(button);
}

function scan(root = document) {
  root.querySelectorAll?.(FORM_SELECTOR).forEach(patchForm);
  root.querySelectorAll?.(LIST_SELECTOR).forEach(ensureDeleteAllButton);
  if (root.matches?.(FORM_SELECTOR)) patchForm(root);
  if (root.matches?.(LIST_SELECTOR)) ensureDeleteAllButton(root);
}

function queueScan(mutations = []) {
  mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) scan(node);
  }));
  if (scanFrame) return;
  scanFrame = window.requestAnimationFrame(() => {
    scanFrame = 0;
    scan();
  });
}

document.addEventListener('change', handleFileChange, true);
document.addEventListener('submit', handleSubmit, true);
const observer = new MutationObserver(queueScan);
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', () => scan(), { once: true });
scan();
