import {
  getWeeklyPracticeAvailability,
  listPublicWeeklyPractices,
  readWeeklyPracticeProgress,
} from './utils/weeklyPractice.js';

const ROOT_SELECTOR = '#bes-weekly-practice-root';
const CARD_SELECTOR = `${ROOT_SELECTOR} [data-practice-id]`;
const DIALOG_ID = 'bes-weekly-schedule-dialog';

let itemsById = new Map();
let itemsPromise = null;
let scanFrame = 0;

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function safeDate(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatScheduleParts(value) {
  const date = safeDate(value);
  if (!date) return { date: 'Chưa xác định', time: 'Chưa xác định', full: 'Chưa xác định' };
  const dateText = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  const timeText = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return {
    date: dateText.charAt(0).toUpperCase() + dateText.slice(1),
    time: timeText,
    full: `${timeText}, ${dateText}`,
  };
}

function ensureScheduleDialog() {
  let dialog = document.getElementById(DIALOG_ID);
  if (dialog) return dialog;

  dialog = document.createElement('dialog');
  dialog.id = DIALOG_ID;
  dialog.className = 'bes-weekly-schedule-dialog';
  dialog.setAttribute('aria-labelledby', `${DIALOG_ID}-title`);
  dialog.innerHTML = `
    <section class="bes-weekly-schedule-dialog__card">
      <button type="button" class="bes-weekly-schedule-dialog__close" aria-label="Đóng">×</button>
      <div class="bes-weekly-schedule-dialog__icon" aria-hidden="true">◷</div>
      <span class="bes-weekly-schedule-dialog__eyebrow">ĐÃ ĐẶT LỊCH CÔNG BỐ</span>
      <h2 id="${DIALOG_ID}-title">Bài tập sắp mở</h2>
      <p class="bes-weekly-schedule-dialog__practice"></p>
      <div class="bes-weekly-schedule-dialog__details">
        <div><span>Ngày công bố</span><strong data-schedule-date></strong></div>
        <div><span>Giờ công bố</span><strong data-schedule-time></strong></div>
      </div>
      <p class="bes-weekly-schedule-dialog__note">Bài sẽ tự động mở đúng thời điểm trên. Bạn chưa thể bắt đầu trước giờ công bố.</p>
      <button type="button" class="bes-weekly-schedule-dialog__confirm">Đã hiểu</button>
    </section>
  `;

  const close = () => {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  };
  dialog.querySelector('.bes-weekly-schedule-dialog__close')?.addEventListener('click', close);
  dialog.querySelector('.bes-weekly-schedule-dialog__confirm')?.addEventListener('click', close);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });
  document.body.appendChild(dialog);
  return dialog;
}

function showScheduleDialog(item) {
  const parts = formatScheduleParts(item?.opens_at);
  const dialog = ensureScheduleDialog();
  dialog.querySelector('.bes-weekly-schedule-dialog__practice').textContent = cleanText(item?.title) || 'Bài luyện tập tiếng Anh';
  dialog.querySelector('[data-schedule-date]').textContent = parts.date;
  dialog.querySelector('[data-schedule-time]').textContent = parts.time;
  dialog.setAttribute('aria-label', `Lịch công bố ${cleanText(item?.title)} vào ${parts.full}`);

  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

function actionLabelForOpenItem(item) {
  const progress = readWeeklyPracticeProgress(item?.id) || {};
  if (progress.submitted) return 'Xem lại';
  if (progress.identity) return 'Tiếp tục';
  return 'Mở bài';
}

function decorateCard(card) {
  const item = itemsById.get(card?.dataset?.practiceId);
  if (!item) return;
  const availability = getWeeklyPracticeAvailability(item);
  const button = card.querySelector('.bes-weekly-grade-card__action > button');
  if (!button) return;

  if (availability.state === 'upcoming') {
    const parts = formatScheduleParts(item.opens_at);
    card.classList.add('is-scheduled');
    card.dataset.scheduledAt = item.opens_at || '';
    button.disabled = false;
    button.textContent = 'Xem lịch';
    button.dataset.scheduleAction = '1';
    button.setAttribute('aria-label', `Xem lịch công bố ${cleanText(item.title)} lúc ${parts.full}`);
    button.title = `Công bố lúc ${parts.full}`;

    const top = card.querySelector('.bes-weekly-grade-card__top');
    let hint = top?.querySelector('.bes-weekly-schedule-hint');
    if (top && !hint) {
      hint = document.createElement('span');
      hint.className = 'bes-weekly-schedule-hint';
      top.appendChild(hint);
    }
    if (hint) hint.textContent = `${parts.time} · ${new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(safeDate(item.opens_at))}`;
    return;
  }

  if (card.classList.contains('is-scheduled')) {
    card.classList.remove('is-scheduled');
    delete card.dataset.scheduledAt;
    delete button.dataset.scheduleAction;
    button.removeAttribute('title');
    button.setAttribute('aria-label', actionLabelForOpenItem(item));
    card.querySelector('.bes-weekly-schedule-hint')?.remove();
    if (availability.canOpen) {
      button.disabled = false;
      button.textContent = actionLabelForOpenItem(item);
    }
  }
}

function scan(root = document) {
  root.querySelectorAll?.(CARD_SELECTOR).forEach(decorateCard);
  if (root.matches?.(CARD_SELECTOR)) decorateCard(root);
}

function queueScan(root = document) {
  if (scanFrame) return;
  scanFrame = window.requestAnimationFrame(() => {
    scanFrame = 0;
    scan(root);
  });
}

async function loadScheduleItems(force = false) {
  if (!force && itemsById.size) return itemsById;
  if (!force && itemsPromise) return itemsPromise;
  itemsPromise = listPublicWeeklyPractices()
    .then((items) => {
      itemsById = new Map((items || []).map((item) => [String(item.id), item]));
      queueScan();
      return itemsById;
    })
    .catch(() => itemsById)
    .finally(() => { itemsPromise = null; });
  return itemsPromise;
}

document.addEventListener('click', (event) => {
  const button = event.target?.closest?.(`${CARD_SELECTOR} .bes-weekly-grade-card__action > button`);
  if (!button) return;
  const card = button.closest('[data-practice-id]');
  const item = itemsById.get(card?.dataset?.practiceId);
  if (!item || getWeeklyPracticeAvailability(item).state !== 'upcoming') return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  showScheduleDialog(item);
}, true);

const observer = new MutationObserver((records) => {
  records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) queueScan(node);
  }));
});
observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('DOMContentLoaded', () => loadScheduleItems(), { once: true });
window.setInterval(() => {
  scan();
}, 30000);
loadScheduleItems();
