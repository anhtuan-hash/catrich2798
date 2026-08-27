import './styles/HomePracticeScheduleScroller.css';
import './styles/HomePracticeScrollerFinalFix.css';
import { listPublicWeeklyPractices } from './utils/weeklyPractice.js';

const HOME_SELECTOR = ".metro-clean-system[data-route='home']";
const GRADES = [10, 11, 12];
const sortModes = new Map(GRADES.map((grade) => [grade, 'alpha']));
let cachedItems = [];
let loadPromise = null;
let scanTimer = 0;
let modalNode = null;
let observer = null;
let managerWasOpen = false;

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function language() {
  return document.documentElement.lang === 'en' ? 'en' : 'vi';
}

function labels() {
  return language() === 'en'
    ? {
        lessons: 'LESSONS', sortAlpha: 'ABC', sortDate: 'Publish date', sortHint: 'Change sorting',
        schedule: 'View publication schedule', open: 'Open lesson', scheduled: 'SCHEDULED FOR PUBLICATION', upcomingTitle: 'Practice opens soon',
        information: 'PUBLICATION INFORMATION', publishedTitle: 'Practice publication schedule',
        date: 'Publication date', time: 'Publication time', acknowledge: 'Got it', close: 'Close',
        upcomingNote: 'This practice will open automatically at the scheduled time. It cannot be started before publication.',
        publishedNote: 'This practice has already opened. Select the play icon in the list to start or continue.',
        noSchedule: 'A publication schedule has not been set for this practice.', empty: 'No practice has been published for this grade yet.',
        syncError: 'The lesson is still syncing. Please try again.',
      }
    : {
        lessons: 'BÀI', sortAlpha: 'ABC', sortDate: 'Ngày công bố', sortHint: 'Đổi cách sắp xếp',
        schedule: 'Xem lịch công bố', open: 'Mở bài', scheduled: 'ĐÃ ĐẶT LỊCH CÔNG BỐ', upcomingTitle: 'Bài tập sắp mở',
        information: 'THÔNG TIN CÔNG BỐ', publishedTitle: 'Lịch công bố bài tập',
        date: 'Ngày công bố', time: 'Giờ công bố', acknowledge: 'Đã hiểu', close: 'Đóng',
        upcomingNote: 'Bài sẽ tự động mở đúng thời điểm trên. Bạn chưa thể bắt đầu trước giờ công bố.',
        publishedNote: 'Bài đã được mở. Hãy bấm biểu tượng phát trong danh sách để bắt đầu hoặc tiếp tục làm bài.',
        noSchedule: 'Bài tập này chưa được thiết lập lịch công bố.', empty: 'Khối này chưa có bài tập được công bố.',
        syncError: 'Bài đang được đồng bộ. Hãy thử lại sau vài giây.',
      };
}

function inferGrade(item) {
  const explicit = String(item?.grade || '').match(/(?:^|\D)(10|11|12)(?:\D|$)/)?.[1];
  if (explicit) return Number(explicit);
  return Number(String(item?.title || '').match(/(?:tiếng\s*anh|english)\s*(10|11|12)/i)?.[1] || 10);
}

function safeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function publicationDate(item) {
  return safeDate(item?.opens_at) || safeDate(item?.published_at) || safeDate(item?.created_at);
}

function isAlreadyOpen(item, now = Date.now()) {
  if (cleanText(item?.status).toLowerCase() !== 'published') return false;
  const opensAt = safeDate(item?.opens_at)?.getTime();
  return !opensAt || opensAt <= now;
}

function alphaCompare(a, b) {
  return cleanText(a?.title).localeCompare(cleanText(b?.title), language() === 'en' ? 'en' : 'vi', {
    sensitivity: 'base',
    numeric: true,
    ignorePunctuation: true,
  });
}

function orderedItems(items, mode) {
  if (mode === 'date') {
    return [...items].sort((a, b) => {
      const aTime = publicationDate(a)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bTime = publicationDate(b)?.getTime() ?? Number.POSITIVE_INFINITY;
      return aTime - bTime || alphaCompare(a, b);
    });
  }
  return [...items].sort(alphaCompare);
}

function formatSchedule(item) {
  const date = publicationDate(item);
  if (!date) return { dateText: '—', timeText: '—' };
  const locale = language() === 'en' ? 'en-GB' : 'vi-VN';
  const dateText = new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
  const timeText = new Intl.DateTimeFormat(locale, {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
  return { dateText: dateText.charAt(0).toUpperCase() + dateText.slice(1), timeText };
}

function closeModal() {
  if (!modalNode) return;
  modalNode.remove();
  modalNode = null;
  document.documentElement.classList.remove('bha-schedule-modal-open');
}

function iconMarkup(name) {
  if (name === 'clock') return '<svg viewBox="0 0 24 24"><path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>';
  if (name === 'play') return '<svg viewBox="0 0 24 24"><path d="m9 6 9 6-9 6V6Z"/></svg>';
  return '<svg viewBox="0 0 24 24"><path d="M6 9 12 3l6 6M6 15l6 6 6-6"/></svg>';
}

function createIcon(name) {
  const span = document.createElement('span');
  span.className = `bha-schedule-icon bha-schedule-icon--${name}`;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = iconMarkup(name);
  return span;
}

function openScheduleModal(item) {
  closeModal();
  const text = labels();
  const upcoming = !isAlreadyOpen(item);
  const schedule = formatSchedule(item);
  const hasSchedule = Boolean(publicationDate(item));

  const backdrop = document.createElement('div');
  backdrop.className = 'bha-schedule-backdrop';
  backdrop.setAttribute('role', 'presentation');

  const dialog = document.createElement('section');
  dialog.className = `bha-schedule-dialog${upcoming ? ' is-upcoming' : ''}`;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', upcoming ? text.upcomingTitle : text.publishedTitle);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'bha-schedule-close';
  close.setAttribute('aria-label', text.close);
  close.innerHTML = '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  close.addEventListener('click', closeModal);

  const icon = createIcon('clock');
  const kicker = document.createElement('p');
  kicker.className = 'bha-schedule-kicker';
  kicker.textContent = upcoming ? text.scheduled : text.information;
  const heading = document.createElement('h2');
  heading.textContent = upcoming ? text.upcomingTitle : text.publishedTitle;
  const title = document.createElement('h3');
  title.textContent = cleanText(item?.title) || heading.textContent;

  const facts = document.createElement('div');
  facts.className = 'bha-schedule-facts';
  const dateFact = document.createElement('article');
  dateFact.innerHTML = `<span>${text.date}</span><strong>${schedule.dateText}</strong>`;
  const timeFact = document.createElement('article');
  timeFact.innerHTML = `<span>${text.time}</span><strong>${schedule.timeText}</strong>`;
  facts.append(dateFact, timeFact);

  const note = document.createElement('p');
  note.className = 'bha-schedule-note';
  note.textContent = hasSchedule ? (upcoming ? text.upcomingNote : text.publishedNote) : text.noSchedule;

  const acknowledge = document.createElement('button');
  acknowledge.type = 'button';
  acknowledge.className = 'bha-schedule-acknowledge';
  acknowledge.textContent = text.acknowledge;
  acknowledge.addEventListener('click', closeModal);

  dialog.append(close, icon, kicker, heading, title, facts, note, acknowledge);
  backdrop.appendChild(dialog);
  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) closeModal();
  });
  modalNode = backdrop;
  document.body.appendChild(backdrop);
  document.documentElement.classList.add('bha-schedule-modal-open');
  window.setTimeout(() => close.focus(), 0);
}

function findLegacyPracticeButton(item) {
  const root = document.getElementById('bes-weekly-practice-root');
  if (!root || !item) return null;
  const id = String(item.id || '');
  const card = [...root.querySelectorAll('[data-practice-id]')].find((node) => node.dataset.practiceId === id);
  const cardButton = card?.querySelector('.bes-weekly-grade-card__action > button, button');
  if (cardButton) return cardButton;
  const article = [...root.querySelectorAll('.bes-weekly-featured, .bes-weekly-list article')].find((node) => {
    const title = cleanText(node.querySelector('h3, strong')?.textContent);
    return title === cleanText(item.title);
  });
  return article?.querySelector('button') || null;
}

function clickWithHistoricalAccess(button, item) {
  const originallyDisabled = button.disabled;
  const realDate = window.Date;
  const opensAt = publicationDate(item)?.getTime() || Date.now();
  const closesAt = safeDate(item?.closes_at)?.getTime() || Number.POSITIVE_INFINITY;
  try {
    if (closesAt < Date.now()) {
      const fakeNow = opensAt + 1000;
      class PracticeDate extends realDate {
        constructor(...args) { super(...(args.length ? args : [fakeNow])); }
        static now() { return fakeNow; }
      }
      PracticeDate.parse = realDate.parse;
      PracticeDate.UTC = realDate.UTC;
      window.Date = PracticeDate;
    }
    button.disabled = false;
    button.click();
  } finally {
    window.Date = realDate;
    button.disabled = originallyDisabled;
  }
}

function openPractice(item, attempt = 0) {
  if (!isAlreadyOpen(item)) {
    openScheduleModal(item);
    return;
  }
  const button = findLegacyPracticeButton(item);
  if (button) {
    clickWithHistoricalAccess(button, item);
    return;
  }
  const showAll = document.querySelector('#bes-weekly-practice-root .bes-weekly-show-all');
  if (showAll && !/thu gọn|collapse/i.test(cleanText(showAll.textContent))) showAll.click();
  if (attempt < 12) {
    window.setTimeout(() => openPractice(item, attempt + 1), 140);
    return;
  }
  window.alert(labels().syncError);
}

function createSortButton(grade, render) {
  const text = labels();
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bha-grade-sort-button';
  button.title = text.sortHint;
  button.appendChild(createIcon('sort'));
  const label = document.createElement('span');
  const update = () => {
    const mode = sortModes.get(grade) || 'alpha';
    label.textContent = mode === 'alpha' ? text.sortAlpha : text.sortDate;
    button.setAttribute('aria-label', `${text.sortHint}: ${label.textContent}`);
  };
  update();
  button.appendChild(label);
  button.addEventListener('click', () => {
    sortModes.set(grade, (sortModes.get(grade) || 'alpha') === 'alpha' ? 'date' : 'alpha');
    update();
    render();
  });
  return button;
}

function createLessonRow(item) {
  const text = labels();
  const opened = isAlreadyOpen(item);
  const row = document.createElement('article');
  row.className = `bha-schedule-row${opened ? ' is-open' : ' is-upcoming'}`;
  const title = document.createElement('strong');
  title.textContent = cleanText(item?.title) || text.schedule;
  title.title = title.textContent;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `bha-schedule-view-button${opened ? ' is-open' : ' is-upcoming'}`;
  button.title = opened ? text.open : text.schedule;
  button.setAttribute('aria-label', `${opened ? text.open : text.schedule}: ${title.textContent}`);
  button.innerHTML = iconMarkup(opened ? 'play' : 'clock');
  button.addEventListener('click', () => opened ? openPractice(item) : openScheduleModal(item));
  row.append(title, button);
  return row;
}

function renderGrade(card, grade, items) {
  const text = labels();
  const signature = JSON.stringify({
    ids: items.map((item) => [item.id, item.title, item.opens_at, item.closes_at, item.published_at, item.status]),
    mode: sortModes.get(grade) || 'alpha',
    lang: language(),
  });
  let browser = card.querySelector(':scope > .bha-grade-schedule-browser');
  if (browser?.dataset.signature === signature) return;
  if (!browser) {
    browser = document.createElement('section');
    browser.className = 'bha-grade-schedule-browser';
    browser.dataset.grade = String(grade);
    card.appendChild(browser);
  }
  browser.dataset.signature = signature;
  browser.replaceChildren();

  const header = document.createElement('header');
  const count = document.createElement('span');
  count.textContent = `${items.length} ${text.lessons}`;
  const rerender = () => {
    browser.dataset.signature = '';
    renderGrade(card, grade, items);
  };
  header.append(count, createSortButton(grade, rerender));

  const scroll = document.createElement('div');
  scroll.className = 'bha-grade-schedule-scroll';
  scroll.tabIndex = 0;
  scroll.setAttribute('aria-label', `${text.lessons} ${grade}`);
  const ordered = orderedItems(items, sortModes.get(grade) || 'alpha');
  if (ordered.length) scroll.replaceChildren(...ordered.map(createLessonRow));
  else {
    const empty = document.createElement('div');
    empty.className = 'bha-grade-schedule-empty';
    empty.textContent = text.empty;
    scroll.appendChild(empty);
  }
  browser.append(header, scroll);
}

function findGradeCard(shell, grade) {
  const editorialCard = shell.querySelector(`.bha-grades > .bha-folio-grade--${grade}`);
  if (editorialCard) return editorialCard;

  return [...shell.querySelectorAll('.bha-grades > .bha-grade')].find((card) => {
    const mastheadLabel = cleanText(card.querySelector('.bha-folio-grade__masthead > span')?.textContent);
    const legacyLabel = cleanText(card.querySelector('.bha-grade-copy > span')?.textContent);
    const label = mastheadLabel || legacyLabel;
    return new RegExp(`(?:^|\\D)${grade}(?:\\D|$)`).test(label);
  });
}

async function loadItems(force = false) {
  if (!force && cachedItems.length) return cachedItems;
  if (loadPromise) return loadPromise;
  loadPromise = listPublicWeeklyPractices()
    .then((items) => {
      cachedItems = items || [];
      return cachedItems;
    })
    .catch(() => cachedItems)
    .finally(() => { loadPromise = null; });
  return loadPromise;
}

async function scan(force = false) {
  scanTimer = 0;
  const shell = document.querySelector(HOME_SELECTOR);
  if (!shell) return;
  const items = await loadItems(force);
  GRADES.forEach((grade) => {
    const card = findGradeCard(shell, grade);
    if (!card) return;
    renderGrade(card, grade, items.filter((item) => inferGrade(item) === grade));
  });
}

function queueScan(force = false) {
  if (scanTimer) window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => scan(force), 0);
}

function inspectManagerLifecycle() {
  const managerOpen = Boolean(document.querySelector('.bes-weekly-manager, .bes-weekly-modal-backdrop .bes-weekly-manager'));
  if (managerWasOpen && !managerOpen) {
    cachedItems = [];
    queueScan(true);
    window.dispatchEvent(new CustomEvent('bes-weekly-practice-updated'));
  }
  managerWasOpen = managerOpen;
}

function install() {
  if (window.__brianPracticeScheduleScrollerInstalled) return;
  window.__brianPracticeScheduleScrollerInstalled = true;
  observer = new MutationObserver(() => {
    inspectManagerLifecycle();
    queueScan(false);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => queueScan(false));
  window.addEventListener('storage', () => queueScan(false));
  window.addEventListener('bes-weekly-practice-updated', () => {
    cachedItems = [];
    queueScan(true);
  });
  window.addEventListener('bes-weekly-show-schedule', (event) => {
    if (event.detail?.item) openScheduleModal(event.detail.item);
  });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
  queueScan(true);
}

install();