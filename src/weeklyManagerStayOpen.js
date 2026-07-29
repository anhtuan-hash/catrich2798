import { listManagedWeeklyPractices } from './utils/weeklyPractice.js';
import { supabase } from './utils/supabase.js';

const SAVE_SELECTOR = '.bes-weekly-save-publication';
const PUBLICATION_VALUES = ['published', 'draft', 'pending', 'scheduled'];

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function combineLocalDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(date.getTime()) ? null : date;
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

function formatDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function managerMessage(manager, text, isError = false) {
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

function updateArticlePresentation(article, item, mode, opensAt) {
  const pill = article?.querySelector('.bes-weekly-status');
  if (pill) {
    pill.className = `bes-weekly-status is-${mode}`;
    pill.textContent = publicationLabel(mode);
  }

  const detail = article?.querySelector('.bes-weekly-publication-detail');
  if (detail) {
    detail.textContent = mode === 'scheduled'
      ? `Tự công bố: ${formatDate(opensAt)}`
      : mode === 'pending'
        ? 'Đang chờ kiểm tra hoặc duyệt trước khi công bố.'
        : mode === 'draft'
          ? 'Bản nháp chỉ hiển thị trong khu vực quản trị.'
          : 'Đang hiển thị cho học sinh.';
  }

  if (item) {
    item.status = databaseStatusForMode(mode);
    item.opens_at = opensAt;
    item.published_at = mode === 'published' || mode === 'scheduled' ? opensAt : null;
    item.updated_at = new Date().toISOString();
    item.is_featured = mode === 'published' || mode === 'scheduled';
  }
}

async function findManagedItem(article) {
  const explicitId = article?.dataset?.practiceId
    || article?.getAttribute?.('data-item-id')
    || article?.getAttribute?.('data-id');
  const title = cleanText(article?.querySelector('strong')?.textContent);
  const items = await listManagedWeeklyPractices();
  if (explicitId) {
    const exact = items.find((item) => String(item.id) === String(explicitId));
    if (exact) return exact;
  }
  return items.find((item) => cleanText(item.title) === title) || null;
}

async function saveWithoutClosing(button) {
  const article = button.closest('article');
  const manager = button.closest('.bes-weekly-manager--simple');
  const controls = button.closest('.bes-weekly-item-publication-controls');
  const select = controls?.querySelector('select');
  const [dateInput, timeInput] = controls?.querySelectorAll('.bes-weekly-item-schedule input') || [];
  const mode = select?.value || 'published';

  if (!PUBLICATION_VALUES.includes(mode)) throw new Error('Trạng thái đăng bài chưa hợp lệ.');

  const item = await findManagedItem(article);
  if (!item) throw new Error('Không tìm thấy bài cần cập nhật.');

  const now = new Date();
  let opensAt = item.opens_at || now.toISOString();
  let publishedAt = item.published_at || null;

  if (mode === 'published') {
    opensAt = now.toISOString();
    publishedAt = opensAt;
  } else if (mode === 'scheduled') {
    const chosen = combineLocalDateTime(dateInput?.value, timeInput?.value);
    if (!chosen || chosen.getTime() <= Date.now()) {
      throw new Error('Lịch công bố phải là một thời điểm trong tương lai.');
    }
    opensAt = chosen.toISOString();
    publishedAt = opensAt;
  } else {
    publishedAt = null;
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

  updateArticlePresentation(article, item, mode, opensAt);
  managerMessage(
    manager,
    `Đã cập nhật “${item.title}”: ${publicationLabel(mode)}${mode === 'scheduled' ? ` lúc ${formatDate(opensAt)}` : ''}. Bảng quản lý vẫn được giữ mở.`,
  );

  window.dispatchEvent(new CustomEvent('bes-weekly-practice-updated', {
    detail: { id: item.id, item: { ...item }, source: 'manager-inline-save' },
  }));
}

function handleSaveClick(event) {
  const button = event.target?.closest?.(SAVE_SELECTOR);
  if (!button || button.dataset.stayOpenSaving === '1') return;

  // Capture before the legacy button handler, which reloads the page after saving.
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  button.dataset.stayOpenSaving = '1';
  button.disabled = true;
  button.innerHTML = '<span class="material-symbols-rounded">progress_activity</span><b>Đang lưu</b>';

  saveWithoutClosing(button)
    .then(() => {
      button.innerHTML = '<span class="material-symbols-rounded">check_circle</span><b>Đã lưu</b>';
      window.setTimeout(() => {
        if (!button.isConnected) return;
        button.disabled = false;
        button.dataset.stayOpenSaving = '0';
        button.innerHTML = '<span class="material-symbols-rounded">save</span><b>Lưu</b>';
      }, 1200);
    })
    .catch((error) => {
      const manager = button.closest('.bes-weekly-manager--simple');
      managerMessage(manager, error?.message || 'Không thể cập nhật trạng thái đăng bài.', true);
      button.disabled = false;
      button.dataset.stayOpenSaving = '0';
      button.innerHTML = '<span class="material-symbols-rounded">save</span><b>Lưu</b>';
    });
}

if (!window.__brianWeeklyManagerStayOpenInstalled) {
  window.__brianWeeklyManagerStayOpenInstalled = true;
  document.addEventListener('click', handleSaveClick, true);
}
