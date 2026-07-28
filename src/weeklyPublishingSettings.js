import {
  createWeeklyPractice,
  listManagedWeeklyPractices,
  WEEKLY_PRACTICE_MAX_BYTES,
} from './utils/weeklyPractice.js';
import { supabase } from './utils/supabase.js';

const FORM_SELECTOR = '.bes-weekly-manager--simple form.bes-weekly-form--simple';
const LIST_SELECTOR = '.bes-weekly-manager--simple .bes-weekly-manage-list';
const GRADE_VALUES = ['10', '11', '12'];
const PUBLICATION_VALUES = ['published', 'draft', 'pending', 'scheduled'];
const listTasks = new WeakMap();
let managedItems = [];
let managedItemsPromise = null;
let scanFrame = 0;

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function formatDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function localParts(value = new Date(Date.now() + 60 * 60 * 1000)) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  const iso = date.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function combineLocalDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}`);
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

function publicationModeForItem(item) {
  const status = cleanText(item?.status || 'draft').toLowerCase();
  const opensAt = new Date(item?.opens_at || 0);
  if (status === 'published' && !Number.isNaN(opensAt.getTime()) && opensAt.getTime() > Date.now()) return 'scheduled';
  if (status === 'archived') return 'pending';
  if (PUBLICATION_VALUES.includes(status)) return status;
  return status === 'maintenance' ? 'maintenance' : 'draft';
}

function modeDescription(mode) {
  return {
    published: 'Học sinh nhìn thấy và mở bài ngay sau khi tải lên.',
    draft: 'Lưu bản nháp; chỉ Admin/TTCM nhìn thấy trong danh sách quản trị.',
    pending: 'Đánh dấu bài đang chờ kiểm tra hoặc duyệt trước khi công bố.',
    scheduled: 'Bài hiển thị trạng thái sắp mở và tự mở đúng thời điểm đã chọn.',
  }[mode] || '';
}

function modeIcon(mode) {
  return { published: 'public', draft: 'edit_note', pending: 'schedule_send', scheduled: 'event' }[mode] || 'public';
}

function submitButtonLabel(mode) {
  if (mode === 'published') return 'Tải lên và công bố';
  if (mode === 'scheduled') return 'Tải lên và đặt lịch';
  return 'Tải lên và lưu trạng thái';
}

function ensureManagerFields(form) {
  if (!form || form.dataset.publicationControlsReady === '1') return;
  form.dataset.publicationControlsReady = '1';
  form.dataset.gradeOverrideReady = '1';

  const fileLabel = form.querySelector('.bes-weekly-file');
  if (!form.querySelector('#bes-weekly-grade-classification')) {
    const gradeLabel = document.createElement('label');
    gradeLabel.className = 'bes-weekly-grade-field';
    gradeLabel.innerHTML = '<span>Phân loại</span><select id="bes-weekly-grade-classification" required><option value="10">Tiếng Anh 10</option><option value="11">Tiếng Anh 11</option><option value="12">Tiếng Anh 12</option></select>';
    fileLabel?.insertAdjacentElement('beforebegin', gradeLabel);
  }

  if (!form.querySelector('.bes-weekly-publication-block')) {
    const defaults = localParts();
    const publicationBlock = document.createElement('section');
    publicationBlock.className = 'bes-weekly-publication-block';
    publicationBlock.setAttribute('aria-label', 'Thiết lập công bố');
    publicationBlock.innerHTML = `
      <div class="bes-weekly-publication-head">
        <span class="material-symbols-rounded" aria-hidden="true">publish</span>
        <div><strong>Thiết lập công bố</strong><small>Chọn cách bài xuất hiện với học sinh.</small></div>
      </div>
      <fieldset class="bes-weekly-mode-fieldset">
        <legend>Trạng thái đăng bài</legend>
        <div class="bes-weekly-mode-grid">
          <label><input type="radio" name="bes-weekly-publication-mode" value="published" checked><span><i class="material-symbols-rounded">public</i><b>Công bố ngay</b><small>Hiển thị ngay</small></span></label>
          <label><input type="radio" name="bes-weekly-publication-mode" value="draft"><span><i class="material-symbols-rounded">edit_note</i><b>Chưa công bố</b><small>Lưu bản nháp</small></span></label>
          <label><input type="radio" name="bes-weekly-publication-mode" value="pending"><span><i class="material-symbols-rounded">schedule_send</i><b>Chờ công bố</b><small>Chờ kiểm tra</small></span></label>
          <label><input type="radio" name="bes-weekly-publication-mode" value="scheduled"><span><i class="material-symbols-rounded">event</i><b>Lịch công bố</b><small>Tự mở đúng giờ</small></span></label>
        </div>
      </fieldset>
      <div class="bes-weekly-schedule-panel" hidden>
        <div class="bes-weekly-schedule-heading"><span class="material-symbols-rounded">calendar_month</span><div><strong>Thời điểm công bố</strong><small>Chọn ngày và giờ theo thiết bị hiện tại.</small></div></div>
        <div class="bes-weekly-schedule-grid">
          <label><span>Ngày</span><input id="bes-weekly-publish-date" type="date" value="${defaults.date}" min="${localParts(new Date()).date}"></label>
          <label><span>Giờ</span><input id="bes-weekly-publish-time" type="time" value="${defaults.time}" step="300"></label>
        </div>
      </div>
      <div class="bes-weekly-publication-summary"><span class="material-symbols-rounded">public</span><div><strong>Công bố ngay</strong><small>${modeDescription('published')}</small></div></div>`;
    fileLabel?.insertAdjacentElement('beforebegin', publicationBlock);
  }

  const block = form.querySelector('.bes-weekly-publication-block');
  const modeInputs = [...block.querySelectorAll('input[name="bes-weekly-publication-mode"]')];
  const schedulePanel = block.querySelector('.bes-weekly-schedule-panel');
  const summary = block.querySelector('.bes-weekly-publication-summary');
  const submitButton = form.querySelector('button[type="submit"]');
  const updateMode = () => {
    const mode = modeInputs.find((input) => input.checked)?.value || 'published';
    if (schedulePanel) schedulePanel.hidden = mode !== 'scheduled';
    if (summary) summary.innerHTML = `<span class="material-symbols-rounded">${modeIcon(mode)}</span><div><strong>${publicationLabel(mode)}</strong><small>${modeDescription(mode)}</small></div>`;
    if (submitButton && form.dataset.overrideSaving !== '1') submitButton.textContent = submitButtonLabel(mode);
  };
  modeInputs.forEach((input) => input.addEventListener('change', updateMode));
  updateMode();

  const note = form.querySelector('.bes-weekly-simple-note span');
  if (note) note.textContent = 'Bắt buộc họ tên · Chọn lớp trong danh sách · 4 trạng thái đăng bài · Tạo ảnh xác nhận · Gửi TTCM';
}

function selectedMode(form) {
  return form.querySelector('input[name="bes-weekly-publication-mode"]:checked')?.value || 'published';
}

async function submitManagedPractice(event) {
  const form = event.target?.closest?.(FORM_SELECTOR);
  if (!form) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  if (form.dataset.overrideSaving === '1') return;

  const title = cleanText(form.querySelector('input:not([type="file"]):not([type="date"]):not([type="time"]):not([type="radio"])')?.value);
  const grade = form.querySelector('#bes-weekly-grade-classification')?.value || '10';
  const mode = selectedMode(form);
  const file = form.querySelector('input[type="file"]')?.files?.[0] || null;

  if (!title) return managerMessage(form, 'Hãy nhập tên bài luyện tập.', true);
  if (!GRADE_VALUES.includes(grade)) return managerMessage(form, 'Hãy chọn đúng phân loại Tiếng Anh 10, 11 hoặc 12.', true);
  if (!PUBLICATION_VALUES.includes(mode)) return managerMessage(form, 'Trạng thái đăng bài chưa hợp lệ.', true);
  if (!file) return managerMessage(form, 'Hãy chọn file HTML.', true);
  if (file.size > WEEKLY_PRACTICE_MAX_BYTES) return managerMessage(form, 'File HTML vượt quá giới hạn 10 MB.', true);

  let opensAt = new Date();
  if (mode === 'scheduled') {
    opensAt = combineLocalDateTime(
      form.querySelector('#bes-weekly-publish-date')?.value,
      form.querySelector('#bes-weekly-publish-time')?.value,
    );
    if (!opensAt || opensAt.getTime() <= Date.now()) return managerMessage(form, 'Lịch công bố phải là một thời điểm trong tương lai.', true);
  }

  const button = form.querySelector('button[type="submit"]');
  form.dataset.overrideSaving = '1';
  if (button) {
    button.disabled = true;
    button.textContent = 'Đang tải lên…';
  }
  managerMessage(form, `${publicationLabel(mode)} · Đang tải bài lên hệ thống…`);

  try {
    const { data } = await supabase.auth.getUser();
    const now = new Date();
    const year = now.getFullYear();
    await createWeeklyPractice({
      form: {
        title,
        description: '',
        week_key: currentIsoWeek(),
        school_year: `${year}-${year + 1}`,
        grade,
        category: 'HTML tương tác',
        cefr: '',
        question_count: 0,
        duration_minutes: 45,
        opens_at: opensAt.toISOString(),
        closes_at: '',
        status: databaseStatusForMode(mode),
        allow_retake: true,
        collect_results: true,
        show_answers: true,
        is_featured: mode === 'published' || mode === 'scheduled',
      },
      file,
      currentUser: data?.user || null,
    });
    managerMessage(form, `Đã tải bài lên: ${publicationLabel(mode)}${mode === 'scheduled' ? ` lúc ${formatDate(opensAt)}` : ''}. Đang làm mới trang…`);
    managedItems = [];
    window.setTimeout(() => window.location.reload(), 650);
  } catch (error) {
    managerMessage(form, error?.message || 'Không thể tải bài lên.', true);
    form.dataset.overrideSaving = '0';
    if (button) {
      button.disabled = false;
      button.textContent = submitButtonLabel(mode);
    }
  }
}

async function loadManagedItems(force = false) {
  if (!force && managedItems.length) return managedItems;
  if (!force && managedItemsPromise) return managedItemsPromise;
  managedItemsPromise = listManagedWeeklyPractices()
    .then((items) => { managedItems = items || []; return managedItems; })
    .finally(() => { managedItemsPromise = null; });
  return managedItemsPromise;
}

async function saveExistingPublication(item, mode, dateValue, timeValue, manager) {
  let opensAt = item.opens_at || new Date().toISOString();
  let publishedAt = item.published_at || null;
  const now = new Date();
  if (mode === 'published') {
    opensAt = now.toISOString();
    publishedAt = now.toISOString();
  } else if (mode === 'scheduled') {
    const chosen = combineLocalDateTime(dateValue, timeValue);
    if (!chosen || chosen.getTime() <= Date.now()) throw new Error('Lịch công bố phải là một thời điểm trong tương lai.');
    opensAt = chosen.toISOString();
    publishedAt = chosen.toISOString();
  } else if (mode === 'draft' || mode === 'pending') {
    publishedAt = null;
  } else {
    throw new Error('Trạng thái đăng bài chưa hợp lệ.');
  }

  const { error } = await supabase
    .from('weekly_practice_items')
    .update({
      status: databaseStatusForMode(mode),
      opens_at: opensAt,
      published_at: publishedAt,
      updated_at: now.toISOString(),
      is_featured: mode === 'published' || mode === 'scheduled',
    })
    .eq('id', item.id);
  if (error) throw error;
  managerMessage(manager, `Đã cập nhật “${item.title}”: ${publicationLabel(mode)}${mode === 'scheduled' ? ` lúc ${formatDate(opensAt)}` : ''}.`);
  managedItems = [];
  window.setTimeout(() => window.location.reload(), 550);
}

function decorateArticle(article, item, manager) {
  if (!article || !item) return;
  const mode = publicationModeForItem(item);
  const pill = article.querySelector('.bes-weekly-status');
  if (pill) {
    pill.className = `bes-weekly-status is-${mode}`;
    pill.textContent = mode === 'maintenance' ? 'Đang bảo trì' : publicationLabel(mode);
  }

  const content = article.querySelector(':scope > div');
  if (content && !content.querySelector('.bes-weekly-publication-detail')) {
    const detail = document.createElement('span');
    detail.className = 'bes-weekly-publication-detail';
    detail.textContent = mode === 'scheduled'
      ? `Tự công bố: ${formatDate(item.opens_at)}`
      : mode === 'pending'
        ? 'Đang chờ kiểm tra hoặc duyệt trước khi công bố.'
        : mode === 'draft'
          ? 'Bản nháp chỉ hiển thị trong khu vực quản trị.'
          : mode === 'maintenance'
            ? 'Bài đang tạm đóng để bảo trì.'
            : 'Đang hiển thị cho học sinh.';
    content.appendChild(detail);
  }

  const nav = article.querySelector(':scope > nav');
  if (!nav || nav.dataset.publicationActionsReady === '1') return;
  nav.dataset.publicationActionsReady = '1';
  [...nav.querySelectorAll('button')].forEach((button) => {
    if (/^(Công bố|Ẩn)$/i.test(cleanText(button.textContent))) button.classList.add('bes-weekly-legacy-status-action');
  });

  const controls = document.createElement('div');
  controls.className = 'bes-weekly-item-publication-controls';
  const select = document.createElement('select');
  select.setAttribute('aria-label', `Trạng thái đăng bài ${item.title}`);
  select.innerHTML = '<option value="published">Công bố ngay</option><option value="draft">Chưa công bố</option><option value="pending">Chờ công bố</option><option value="scheduled">Lịch công bố</option>';
  select.value = PUBLICATION_VALUES.includes(mode) ? mode : 'draft';

  const parts = localParts(mode === 'scheduled' ? item.opens_at : Date.now() + 60 * 60 * 1000);
  const schedule = document.createElement('div');
  schedule.className = 'bes-weekly-item-schedule';
  schedule.innerHTML = `<input type="date" value="${parts.date}" min="${localParts(new Date()).date}" aria-label="Ngày công bố ${cleanText(item.title)}"><input type="time" value="${parts.time}" step="300" aria-label="Giờ công bố ${cleanText(item.title)}">`;
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'bes-weekly-save-publication';
  saveButton.innerHTML = '<span class="material-symbols-rounded">save</span><b>Lưu</b>';
  const updateVisibility = () => { schedule.hidden = select.value !== 'scheduled'; };
  select.addEventListener('change', updateVisibility);
  updateVisibility();
  saveButton.addEventListener('click', async () => {
    if (saveButton.disabled) return;
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="material-symbols-rounded">progress_activity</span><b>Đang lưu</b>';
    try {
      const [dateInput, timeInput] = schedule.querySelectorAll('input');
      await saveExistingPublication(item, select.value, dateInput?.value, timeInput?.value, manager);
    } catch (error) {
      managerMessage(manager, error?.message || 'Không thể cập nhật trạng thái đăng bài.', true);
      saveButton.disabled = false;
      saveButton.innerHTML = '<span class="material-symbols-rounded">save</span><b>Lưu</b>';
    }
  });
  controls.append(select, schedule, saveButton);
  nav.insertAdjacentElement('afterbegin', controls);
}

async function decorateManagerList(list) {
  if (!list || listTasks.has(list)) return;
  const pendingArticles = [...list.querySelectorAll(':scope > article')]
    .filter((article) => article.querySelector(':scope > nav')?.dataset.publicationActionsReady !== '1');
  if (!pendingArticles.length) return;

  const task = (async () => {
    const manager = list.closest('.bes-weekly-manager--simple');
    try {
      const items = await loadManagedItems();
      pendingArticles.forEach((article) => {
        const title = cleanText(article.querySelector('strong')?.textContent);
        const item = items.find((candidate) => cleanText(candidate.title) === title);
        if (item) decorateArticle(article, item, manager);
      });
    } catch (error) {
      managerMessage(manager, error?.message || 'Không thể tải trạng thái đăng bài.', true);
    }
  })().finally(() => listTasks.delete(list));
  listTasks.set(list, task);
}

function scan() {
  document.querySelectorAll(FORM_SELECTOR).forEach(ensureManagerFields);
  document.querySelectorAll(LIST_SELECTOR).forEach(decorateManagerList);
}

function queueScan() {
  if (scanFrame) return;
  scanFrame = window.requestAnimationFrame(() => {
    scanFrame = 0;
    scan();
  });
}

document.addEventListener('submit', submitManagedPractice, true);
const observer = new MutationObserver(queueScan);
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', queueScan, { once: true });
queueScan();
