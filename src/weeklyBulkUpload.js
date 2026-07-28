import {
  createWeeklyPractice,
  WEEKLY_PRACTICE_MAX_BYTES,
} from './utils/weeklyPractice.js';
import { supabase } from './utils/supabase.js';

const FORM_SELECTOR = '.bes-weekly-manager--simple form.bes-weekly-form--simple';
const MAX_BATCH_FILES = 10;
const GRADE_VALUES = ['10', '11', '12'];
const PUBLICATION_VALUES = ['published', 'draft', 'pending', 'scheduled'];
const batchStates = new WeakMap();
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

function databaseStatusForMode(mode) {
  if (mode === 'pending') return 'archived';
  if (mode === 'scheduled') return 'published';
  return mode;
}

function publicationLabel(mode) {
  return {
    published: 'Công bố ngay',
    draft: 'Chưa công bố',
    pending: 'Chờ công bố',
    scheduled: 'Lịch công bố',
  }[mode] || 'Công bố ngay';
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
  if (message) {
    message.textContent = text;
    message.classList.toggle('is-error', isError);
  }
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

function selectedGlobalMode(form) {
  return form.querySelector('input[name="bes-weekly-publication-mode"]:checked')?.value || 'published';
}

function patchTimeInputs(root = document) {
  root.querySelectorAll?.('input[type="time"]').forEach((input) => {
    input.step = '60';
    input.setAttribute('step', '60');
    input.setCustomValidity('');
  });
}

function getSingleControls(form) {
  const fileInput = form.querySelector('input[type="file"]');
  const titleInput = form.querySelector(
    'input:not([type="file"]):not([type="date"]):not([type="time"]):not([type="radio"]):not([type="number"])',
  );
  const titleLabel = titleInput?.closest('label') || null;
  const gradeField = form.querySelector('.bes-weekly-grade-field');
  const publicationBlock = form.querySelector('.bes-weekly-publication-block');
  return { fileInput, titleInput, titleLabel, gradeField, publicationBlock };
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

function createBatchRoot(form) {
  let root = form.querySelector('.bes-weekly-bulk-upload');
  if (root) return root;
  root = document.createElement('section');
  root.className = 'bes-weekly-bulk-upload';
  root.hidden = true;
  root.innerHTML = `
    <header class="bes-weekly-bulk-head">
      <div>
        <strong>Tải nhiều bài cùng lúc</strong>
        <small>Mỗi file có tên, phân loại và lịch công bố riêng.</small>
      </div>
      <span class="bes-weekly-bulk-count">0/10 file</span>
    </header>
    <div class="bes-weekly-bulk-list"></div>
  `;
  const fileLabel = form.querySelector('.bes-weekly-file');
  fileLabel?.insertAdjacentElement('afterend', root);
  return root;
}

function createModeOptions(selected) {
  return PUBLICATION_VALUES.map((mode) => (
    `<option value="${mode}"${mode === selected ? ' selected' : ''}>${publicationLabel(mode)}</option>`
  )).join('');
}

function renderBatch(form, files) {
  const root = createBatchRoot(form);
  const list = root.querySelector('.bes-weekly-bulk-list');
  const fallbackGrade = form.querySelector('#bes-weekly-grade-classification')?.value || '10';
  const fallbackMode = selectedGlobalMode(form);
  const defaults = localParts();
  const today = localParts(new Date()).date;

  batchStates.set(form, { files: [...files] });
  root.hidden = files.length < 2;
  setSingleControlsDisabled(form, files.length >= 2);

  if (files.length < 2) {
    list.innerHTML = '';
    const submit = form.querySelector('button[type="submit"]');
    if (submit && form.dataset.overrideSaving !== '1') submit.textContent = 'Tải lên và công bố';
    return;
  }

  root.querySelector('.bes-weekly-bulk-count').textContent = `${files.length}/${MAX_BATCH_FILES} file`;
  list.innerHTML = files.map((file, index) => {
    const title = inferTitle(file.name);
    const grade = inferGrade(file.name, fallbackGrade);
    return `
      <article class="bes-weekly-bulk-item" data-bulk-index="${index}">
        <div class="bes-weekly-bulk-item__top">
          <div><strong>${index + 1}. ${escapeHtml(file.name)}</strong><small>${escapeHtml(formatBytes(file.size))}</small></div>
          <span class="bes-weekly-bulk-status">Sẵn sàng</span>
        </div>
        <div class="bes-weekly-bulk-fields">
          <label class="is-wide"><span>Tên bài</span><input class="bes-weekly-bulk-title" type="text" value="${escapeHtml(title)}" required></label>
          <label><span>Phân loại</span><select class="bes-weekly-bulk-grade" required>
            <option value="10"${grade === '10' ? ' selected' : ''}>Tiếng Anh 10</option>
            <option value="11"${grade === '11' ? ' selected' : ''}>Tiếng Anh 11</option>
            <option value="12"${grade === '12' ? ' selected' : ''}>Tiếng Anh 12</option>
          </select></label>
          <label><span>Trạng thái</span><select class="bes-weekly-bulk-mode" required>${createModeOptions(fallbackMode)}</select></label>
          <label><span>Thời lượng</span><input class="bes-weekly-bulk-duration" type="number" min="1" max="300" step="1" value="45" required></label>
          <div class="bes-weekly-bulk-schedule is-wide" hidden>
            <label><span>Ngày công bố</span><input class="bes-weekly-bulk-date" type="date" min="${today}" value="${defaults.date}"></label>
            <label><span>Giờ công bố</span><input class="bes-weekly-bulk-time" type="time" step="60" value="${defaults.time}"></label>
          </div>
        </div>
      </article>
    `;
  }).join('');

  list.querySelectorAll('.bes-weekly-bulk-item').forEach((row) => {
    const mode = row.querySelector('.bes-weekly-bulk-mode');
    const schedule = row.querySelector('.bes-weekly-bulk-schedule');
    const updateSchedule = () => { schedule.hidden = mode.value !== 'scheduled'; };
    mode.addEventListener('change', updateSchedule);
    updateSchedule();
  });

  patchTimeInputs(root);
  const submit = form.querySelector('button[type="submit"]');
  if (submit && form.dataset.overrideSaving !== '1') submit.textContent = `Tải lên ${files.length} bài`;
}

function readEntries(form) {
  const state = batchStates.get(form);
  if (!state?.files?.length) return [];
  return [...form.querySelectorAll('.bes-weekly-bulk-item')].map((row, index) => {
    const mode = row.querySelector('.bes-weekly-bulk-mode')?.value || 'published';
    const dateValue = row.querySelector('.bes-weekly-bulk-date')?.value || '';
    const timeValue = row.querySelector('.bes-weekly-bulk-time')?.value || '';
    return {
      row,
      file: state.files[index],
      title: cleanText(row.querySelector('.bes-weekly-bulk-title')?.value),
      grade: row.querySelector('.bes-weekly-bulk-grade')?.value || '10',
      mode,
      duration: Number(row.querySelector('.bes-weekly-bulk-duration')?.value || 45),
      opensAt: mode === 'scheduled' ? combineLocalDateTime(dateValue, timeValue) : new Date(),
    };
  });
}

function setRowStatus(row, text, state = '') {
  const status = row.querySelector('.bes-weekly-bulk-status');
  if (!status) return;
  status.textContent = text;
  status.className = `bes-weekly-bulk-status${state ? ` is-${state}` : ''}`;
}

function validateEntries(entries) {
  const errors = [];
  entries.forEach((entry) => {
    entry.row.classList.remove('is-error');
    if (!entry.title) errors.push([entry, 'Hãy nhập tên bài.']);
    else if (!GRADE_VALUES.includes(entry.grade)) errors.push([entry, 'Phân loại chưa hợp lệ.']);
    else if (!PUBLICATION_VALUES.includes(entry.mode)) errors.push([entry, 'Trạng thái chưa hợp lệ.']);
    else if (!entry.file || !/\.html?$/i.test(entry.file.name)) errors.push([entry, 'Chỉ chấp nhận file HTML.']);
    else if (entry.file.size > WEEKLY_PRACTICE_MAX_BYTES) errors.push([entry, 'File vượt quá 10 MB.']);
    else if (!Number.isFinite(entry.duration) || entry.duration < 1 || entry.duration > 300) errors.push([entry, 'Thời lượng phải từ 1–300 phút.']);
    else if (entry.mode === 'scheduled' && (!entry.opensAt || entry.opensAt.getTime() <= Date.now())) errors.push([entry, 'Lịch công bố phải ở tương lai.']);
  });
  errors.forEach(([entry, message]) => {
    entry.row.classList.add('is-error');
    setRowStatus(entry.row, message, 'error');
  });
  return errors;
}

async function handleBulkSubmit(event) {
  const form = event.target?.closest?.(FORM_SELECTOR);
  if (!form) return;
  const state = batchStates.get(form);
  if (!state?.files || state.files.length < 2) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  if (form.dataset.bulkSaving === '1') return;
  patchTimeInputs(form);

  const entries = readEntries(form).filter((entry) => entry.row.dataset.uploaded !== '1');
  const errors = validateEntries(entries);
  if (errors.length) {
    managerMessage(form, `Có ${errors.length} file cần kiểm tra lại trước khi tải.`, true);
    errors[0][0].row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const submit = form.querySelector('button[type="submit"]');
  form.dataset.bulkSaving = '1';
  form.dataset.overrideSaving = '1';
  if (submit) {
    submit.disabled = true;
    submit.textContent = `Đang tải 0/${entries.length}…`;
  }

  let success = 0;
  let failed = 0;
  try {
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    const now = new Date();
    const year = now.getFullYear();

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      setRowStatus(entry.row, `Đang tải ${index + 1}/${entries.length}…`, 'uploading');
      if (submit) submit.textContent = `Đang tải ${index + 1}/${entries.length}…`;
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
        entry.row.dataset.uploaded = '1';
        entry.row.classList.add('is-success');
        setRowStatus(entry.row, `Đã tải · ${publicationLabel(entry.mode)}`, 'success');
        success += 1;
      } catch (error) {
        entry.row.classList.add('is-error');
        setRowStatus(entry.row, cleanText(error?.message) || 'Tải lên thất bại', 'error');
        failed += 1;
      }
    }
  } catch (error) {
    failed = entries.length;
    managerMessage(form, error?.message || 'Không thể xác thực tài khoản tải bài.', true);
  } finally {
    form.dataset.bulkSaving = '0';
    form.dataset.overrideSaving = '0';
    if (submit) {
      submit.disabled = false;
      submit.textContent = failed ? 'Thử lại các file lỗi' : `Đã tải ${success} bài`;
    }
  }

  if (!failed) {
    managerMessage(form, `Đã tải thành công ${success} bài. Đang làm mới danh sách…`);
    window.setTimeout(() => window.location.reload(), 900);
  } else {
    managerMessage(form, `Đã tải ${success} bài; ${failed} bài chưa thành công. Bạn có thể sửa và thử lại các file lỗi.`, true);
  }
}

function installForm(form) {
  if (!form || form.dataset.bulkUploadReady === '1') return;
  form.dataset.bulkUploadReady = '1';
  const fileInput = form.querySelector('input[type="file"]');
  if (!fileInput) return;
  fileInput.multiple = true;
  fileInput.accept = '.html,.htm,text/html';
  fileInput.setAttribute('multiple', '');
  const fileLabel = fileInput.closest('.bes-weekly-file');
  const hint = fileLabel?.querySelector('span');
  if (hint) hint.textContent = 'Chọn 1–10 file HTML. Khi chọn nhiều file, mỗi file có cấu hình riêng.';
  createBatchRoot(form);
  fileInput.addEventListener('change', () => {
    const files = [...(fileInput.files || [])];
    if (files.length > MAX_BATCH_FILES) {
      fileInput.value = '';
      renderBatch(form, []);
      managerMessage(form, `Chỉ được chọn tối đa ${MAX_BATCH_FILES} file HTML trong mỗi lần tải.`, true);
      return;
    }
    renderBatch(form, files);
    managerMessage(form, files.length >= 2
      ? `Đã chọn ${files.length} file. Hãy thiết lập riêng từng bài trước khi tải.`
      : files.length === 1
        ? 'Đã chọn 1 file. Biểu mẫu đang dùng chế độ tải đơn.'
        : 'Chưa chọn file HTML.');
  });
}

function scan(root = document) {
  patchTimeInputs(root);
  document.querySelectorAll(FORM_SELECTOR).forEach(installForm);
}

function queueScan(mutations = []) {
  mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) patchTimeInputs(node);
  }));
  if (scanFrame) return;
  scanFrame = window.requestAnimationFrame(() => {
    scanFrame = 0;
    scan();
  });
}

document.addEventListener('submit', handleBulkSubmit, true);
document.addEventListener('focusin', (event) => {
  if (event.target?.matches?.('input[type="time"]')) patchTimeInputs(event.target.closest('form') || document);
}, true);
const observer = new MutationObserver(queueScan);
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', () => scan(), { once: true });
scan();
