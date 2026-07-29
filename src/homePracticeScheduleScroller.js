import './styles/HomePracticeScheduleScroller.css';
import {
  getWeeklyPracticeAvailability,
  listPublicWeeklyPractices,
} from './utils/weeklyPractice.js';

const HOME_SELECTOR = ".metro-clean-system[data-route='home']";
const GRADES = [10, 11, 12];
const sortModes = new Map(GRADES.map((grade) => [grade, 'alpha']));
let cachedItems = [];
let loadPromise = null;
let scanFrame = 0;
let modalNode = null;
let observer = null;

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
        schedule: 'View schedule', scheduled: 'SCHEDULED FOR PUBLICATION', upcomingTitle: 'Practice opens soon',
        information: 'PUBLICATION INFORMATION', publishedTitle: 'Practice publication schedule',
        date: 'Publication date', time: 'Publication time', acknowledge: 'Got it', close: 'Close',
        upcomingNote: 'This practice will open automatically at the scheduled time. It cannot be started before publication.',
        publishedNote: 'This practice was published according to the schedule shown above.',
        noSchedule: 'A publication schedule has not been set for this practice.', empty: 'No practice has been published for this grade yet.',
      }
    : {
        lessons: 'BÀI', sortAlpha: 'ABC', sortDate: 'Ngày công bố', sortHint: 'Đổi cách sắp xếp',
        schedule: 'Xem lịch', scheduled: 'ĐÃ ĐẶT LỊCH CÔNG BỐ', upcomingTitle: 'Bài tập sắp mở',
        information: 'THÔNG TIN CÔNG BỐ', publishedTitle: 'Lịch công bố bài tập',
        date: 'Ngày công bố', time: 'Giờ công bố', acknowledge: 'Đã hiểu', close: 'Đóng',
        upcomingNote: 'Bài sẽ tự động mở đúng thời điểm trên. Bạn chưa thể bắt đầu trước giờ công bố.',
        publishedNote: 'Bài đã được công bố theo đúng lịch hiển thị ở trên.',
        noSchedule: 'Bài tập này chưa được thiết lập lịch công bố.', empty: 'Khối này chưa có bài tập được công bố.',
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

function createIcon(name) {
  const span = document.createElement('span');
  span.className = `bha-schedule-icon bha-schedule-icon--${name}`;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = name === 'clock'
    ? '<svg viewBox="0 0 24 24"><path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M6 9 12 3l6 6M6 15l6 6 6-6"/></svg>';
  return span;
}

function openScheduleModal(item) {
  closeModal();
  const text = labels();
  const availability = getWeeklyPracticeAvailability(item);
  const upcoming = availability.state === 'upcoming';
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
  title.textContent = cleanText(item?.title) || (upcoming ? text.upcomingTitle : text.publishedTitle);

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
  const row = document.createElement('article');
  row.className = 'bha-schedule-row';
  const title = document.createElement('strong');
  title.textContent = cleanText(item?.title) || text.schedule;
  title.title = title.textContent;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bha-schedule-view-button';
  button.innerHTML = `<span>${text.schedule}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>`;
  button.addEventListener('click', () => openScheduleModal(item));
  row.append(title, button);
  return row;
}

function renderGrade(card, grade, items) {
  const text = labels();
  const signature = JSON.stringify({
    ids: items.map((item) => [item.id, item.title, item.opens_at, item.published_at]),
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
  return [...shell.querySelectorAll('.bha-grades > .bha-grade')].find((card) => {
    const label = cleanText(card.querySelector('.bha-grade-copy > span')?.textContent);
    return new RegExp(`(?:^|\\D)${grade}(?:\\D|$)`).test(label);
  });
}

async function loadItems(force = false) {
  if (!force && cachedItems.length) return cachedItems;
  if (!force && loadPromise) return loadPromise;
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
  scanFrame = 0;
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
  if (scanFrame) cancelAnimationFrame(scanFrame);
  scanFrame = requestAnimationFrame(() => scan(force));
}

function install() {
  if (window.__brianPracticeScheduleScrollerInstalled) return;
  window.__brianPracticeScheduleScrollerInstalled = true;
  observer = new MutationObserver(() => queueScan(false));
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('focus', () => queueScan(true));
  window.addEventListener('hashchange', () => queueScan(true));
  window.addEventListener('storage', () => queueScan(false));
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
  window.setInterval(() => queueScan(true), 30000);
  queueScan(true);
}

install();
