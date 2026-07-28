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
let managedItems = [];
let managedItemsPromise = null;

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;
}

function formatDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function toLocalInput(value = new Date(Date.now() + 60 * 60 * 1000)) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
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

function publicationModeForItem(item) {
  const status = cleanText(item?.status || 'draft').toLowerCase();
  const opensAt = new Date(item?.opens_at || 0);
  if (status === 'published' && !Number.isNaN(opensAt.getTime()) && opensAt.getTime() > Date.now()) return 'scheduled';
  if (PUBLICATION_VALUES.includes(status)) return status;
  return status === 'maintenance' ? 'maintenance' : 'draft';
}

function ensureManagerFields(form) {
  if (!form || form.dataset.publicationControlsReady === '1') return;
  form.dataset.publicationControlsReady = '1';
  form.dataset.gradeOverrideReady = '1';

  const fileLabel = form.querySelector('.bes-weekly-file');
  const existingGrade = form.querySelector('#bes-weekly-grade-classification');
  if (!existingGrade) {
    const gradeLabel = document.createElement('label');
    gradeLabel.className = 'bes-weekly-grade-field';
    gradeLabel.innerHTML = '<span>Phân loại</span><select id="bes-weekly-grade-classification" required><option value="10">Tiếng Anh 10</option><option value="11">Tiếng Anh 11</option><option value="12">Tiếng Anh 12</option></select>';
    fileLabel?.insertAdjacentElement('beforebegin', gradeLabel);
  }

  if (!form.querySelector('#bes-weekly-publication-mode')) {
    const publicationBlock = document.createElement('div');
    publicationBlock.className = 'bes-weekly-publication-block';
    publicationBlock.innerHTML = `
      <label class="bes-weekly-publication-field">
        <span>Trạng thái đăng bài</span>
        <select id="bes-weekly-publication-mode" required>
          <option value="published">Công bố ngay</option>
          <option value="draft">Chưa công bố</option>
          <option value="pending">Chờ công bố</option>
          <option value="scheduled">Lịch công bố</option>
        </select>
      </label>
      <label class="bes-weekly-schedule-field" hidden>
        <span>Thời điểm công bố</span>
        <input id="bes-weekly-publish-at" type="datetime-local" value="${toLocalInput()}" />
        <small>Bài tự mở khi đến thời điểm này.</small>
      </label>
      <div class="bes-weekly-publication-summary"><strong>Công bố ngay</strong><span>Học sinh nhìn thấy và mở bài ngay sau khi tải lên.</span></div>`;
    fileLabel?.insertAdjacentElement('beforebegin', publicationBlock);
  }

  const modeSelect = form.querySelector('#bes-weekly-publication-mode');
  const scheduleField = form.querySelector('.bes-weekly-schedule-field');
  const summary = form.querySelector('.bes-weekly-publication-summary');
  const submitButton = form.querySelector('button[type="submit"]');
  const updateMode = () => {
    const mode = modeSelect?.value || 'published';
    if (scheduleField) scheduleField.hidden = mode !== 'scheduled';
    if (summary) {
      const descriptions = {
        published: 'Học sinh nhìn thấy và mở bài ngay sau khi tải lên.',
        draft: 'Lưu bản nháp; chỉ Admin/TTCM nhìn thấy trong danh sách quản trị.',
        pending: 'Đánh dấu bài đang chờ kiểm tra hoặc duyệt trước khi công bố.',
        scheduled: 'Bài hiển thị trạng thái sắp mở và tự mở đúng thời điểm đã chọn.',
      };
      summary.innerHTML = `<strong>${publicationLabel(mode)}</strong><span>${descriptions[mode]}</span>`;
    }
    if (submitButton && form.dataset.overrideSaving !== '1') {
      submitButton.textContent = mode === 'published' ? 'Tải lên và công bố' : mode === 'scheduled' ? 'Tải lên và đặt lịch' : 'Tải lên và lưu trạng thái';
    }
  };
  modeSelect?.addEventListener('change', updateMode);
  updateMode();

  const note = form.querySelector('.bes-weekly-simple-note span');
  if (note) note.textContent = 'Bắt buộc họ tên · Chọn lớp trong danh sách · Có 4 trạng thái đăng bài · Tạo ảnh xác nhận · Gửi TTCM';
}

async function submitManagedPractice(event) {
  const form = event.target?.closest?.(FORM_SELECTOR);
  if (!form) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  if (form.dataset.overrideSaving === '1') return;

  const title = cleanText(form.querySelector('input:not([type="file"]):not([type="datetime-local"])')?.value);
  const grade = form.querySelector('#bes-weekly-grade-classification')?.value || '10';
  const mode = form.querySelector('#bes-weekly-publication-mode')?.value || 'published';
  const publishAtValue = form.querySelector('#bes-weekly-publish-at')?.value || '';
  const file = form.querySelector('input[type="file"]')?.files?.[0] || null;

  if (!title) return managerMessage(form, 'Hãy nhập tên bài luyện tập.', true);
  if (!GRADE_VALUES.includes(grade)) return managerMessage(form, 'Hãy chọn đúng phân loại Tiếng Anh 10, 11 hoặc 12.', true);
  if (!PUBLICATION_VALUES.includes(mode)) return managerMessage(form, 'Trạng thái đăng bài chưa hợp lệ.', true);
  if (!file) return managerMessage(form, 'Hãy chọn file HTML.', true);
  if (file.size > WEEKLY_PRACTICE_MAX_BYTES) return managerMessage(form, 'File HTML vượt quá giới hạn 10 MB.', true);

  let opensAt = new Date();
  let status = mode;
  if (mode === 'scheduled') {
    opensAt = new Date(publishAtValue);
    if (Number.isNaN(opensAt.getTime()) || opensAt.getTime() <= Date.now()) {
      return managerMessage(form, 'Lịch công bố phải là một thời điểm trong tương lai.', true);
    }
    status = 'published';
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
        status,
        allow_retake: true,
        collect_results: true,
        show_answers: true,
        is_featured: mode !== 'draft',
      },
      file,
      currentUser: data?.user || null,
    });
    const suffix = mode === 'scheduled' ? ` lúc ${formatDate(opensAt)}` : '';
    managerMessage(form, `Đã tải bài lên: ${publicationLabel(mode)}${suffix}. Đang làm mới trang…`);
    managedItems = [];
    window.setTimeout(() => window.location.reload(), 700);
  } catch (error) {
    managerMessage(form, error?.message || 'Không thể tải bài lên.', true);
    form.dataset.overrideSaving = '0';
    if (button) {
      button.disabled = false;
      button.textContent = mode === 'published' ? 'Tải lên và công bố' : mode === 'scheduled' ? 'Tải lên và đặt lịch' : 'Tải lên và lưu trạng thái';
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

async function saveExistingPublication(item, mode, localDate, manager) {
  let status = mode;
  let opensAt = item.opens_at || new Date().toISOString();
  let publishedAt = item.published_at || null;
  const now = new Date();

  if (mode === 'published') {
    status = 'published';
    opensAt = now.toISOString();
    publishedAt = now.toISOString();
  } else if (mode === 'scheduled') {
    const chosen = new Date(localDate);
    if (Number.isNaN(chosen.getTime()) || chosen.getTime() <= Date.now()) {
      throw new Error('Lịch công bố phải là một thời điểm trong tương lai.');
    }
    status = 'published';
    opensAt = chosen.toISOString();
    publishedAt = chosen.toISOString();
  } else if (mode === 'draft' || mode === 'pending') {
    status = mode;
    publishedAt = null;
  } else {
    throw new Error('Trạng thái đăng bài chưa hợp lệ.');
  }

  const { error } = await supabase
    .from('weekly_practice_items')
    .update({
      status,
      opens_at: opensAt,
      published_at: publishedAt,
      updated_at: now.toISOString(),
    })
    .eq('id', item.id);
  if (error) throw error;
  managerMessage(manager, `Đã cập nhật “${item.title}”: ${publicationLabel(mode)}${mode === 'scheduled' ? ` lúc ${formatDate(opensAt)}` : ''}.`);
  managedItems = [];
  window.setTimeout(() => window.location.reload(), 600);
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
  const dateInput = document.createElement('input');
  dateInput.type = 'datetime-local';
  dateInput.value = toLocalInput(mode === 'scheduled' ? item.opens_at : Date.now() + 60 * 60 * 1000);
  dateInput.setAttribute('aria-label', `Lịch công bố ${item.title}`);
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'bes-weekly-save-publication';
  saveButton.textContent = 'Lưu';
  const updateVisibility = () => { dateInput.hidden = select.value !== 'scheduled'; };
  select.addEventListener('change', updateVisibility);
  updateVisibility();
  saveButton.addEventListener('click', async () => {
    if (saveButton.disabled) return;
    saveButton.disabled = true;
    saveButton.textContent = 'Đang lưu…';
    try {
      await saveExistingPublication(item, select.value, dateInput.value, manager);
    } catch (error) {
      managerMessage(manager, error?.message || 'Không thể cập nhật trạng thái đăng bài.', true);
      saveButton.disabled = false;
      saveButton.textContent = 'Lưu';
    }
  });
  controls.append(select, dateInput, saveButton);
  nav.insertAdjacentElement('afterbegin', controls);
}

async function decorateManagerList(list) {
  if (!list || list.dataset.publicationListLoading === '1') return;
  list.dataset.publicationListLoading = '1';
  const manager = list.closest('.bes-weekly-manager--simple');
  try {
    const items = await loadManagedItems();
    list.querySelectorAll(':scope > article').forEach((article) => {
      const title = cleanText(article.querySelector('strong')?.textContent);
      const item = items.find((candidate) => cleanText(candidate.title) === title);
      if (item) decorateArticle(article, item, manager);
    });
  } catch (error) {
    managerMessage(manager, error?.message || 'Không thể tải trạng thái đăng bài.', true);
  } finally {
    list.dataset.publicationListLoading = '0';
  }
}

function scan() {
  document.querySelectorAll(FORM_SELECTOR).forEach(ensureManagerFields);
  document.querySelectorAll(LIST_SELECTOR).forEach(decorateManagerList);
}

document.addEventListener('submit', submitManagedPractice, true);
const observer = new MutationObserver(scan);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', scan, { once: true });
scan();
