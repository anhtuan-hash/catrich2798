import {
  createWeeklyPractice,
  WEEKLY_PRACTICE_MAX_BYTES,
} from './utils/weeklyPractice.js';
import { supabase } from './utils/supabase.js';
import './styles/WeeklyManagerAcademicWeekSelector.css';

const FORM_SELECTOR = '.bes-weekly-manager--simple form.bes-weekly-form--simple';
const ACADEMIC_YEAR = '2026-2027';
const GRADE_VALUES = ['10', '11', '12'];
const PUBLICATION_VALUES = ['published', 'draft', 'pending', 'scheduled'];
const savingForms = new WeakSet();
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

function addDays(iso, amount) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function displayDate(iso) {
  return String(iso || '').split('-').reverse().join('/');
}

function createAcademicWeeks() {
  const weeks = [];
  const addSemesterRange = ({ semester, code, firstWeek, lastWeek, firstStart, group }) => {
    for (let week = firstWeek; week <= lastWeek; week += 1) {
      const start = addDays(firstStart, (week - firstWeek) * 7);
      const end = addDays(start, 5);
      const key = `SY26-${code}-W${String(week).padStart(2, '0')}`;
      const label = `${semester} – TUẦN ${week} – TỪ ${displayDate(start)} ĐẾN ${displayDate(end)}`;
      weeks.push({ key, label, semester, week, start, end, group, selectable: true });
    }
  };

  addSemesterRange({
    semester: 'HỌC KÌ I',
    code: 'HK1',
    firstWeek: 1,
    lastWeek: 21,
    firstStart: '2026-07-20',
    group: 'HỌC KÌ I',
  });

  addSemesterRange({
    semester: 'HỌC KÌ II',
    code: 'HK2',
    firstWeek: 1,
    lastWeek: 7,
    firstStart: '2026-12-14',
    group: 'HỌC KÌ II · GIAI ĐOẠN 1',
  });

  weeks.push({
    key: 'SY26-TET',
    label: 'NGHỈ TẾT NGUYÊN ĐÁN – TỪ 01/02/2027 ĐẾN 13/02/2027',
    semester: 'NGHỈ TẾT NGUYÊN ĐÁN',
    week: null,
    start: '2027-02-01',
    end: '2027-02-13',
    group: 'NGHỈ TẾT NGUYÊN ĐÁN',
    selectable: false,
  });

  addSemesterRange({
    semester: 'HỌC KÌ II',
    code: 'HK2',
    firstWeek: 8,
    lastWeek: 21,
    firstStart: '2027-02-15',
    group: 'HỌC KÌ II · GIAI ĐOẠN 2',
  });

  return weeks;
}

const ACADEMIC_WEEKS = createAcademicWeeks();
const WEEK_BY_KEY = new Map(ACADEMIC_WEEKS.map((week) => [week.key, week]));
const WEEK_BY_LABEL = new Map(ACADEMIC_WEEKS.map((week) => [week.label, week]));

function resolveWeekKey(value) {
  const normalized = cleanText(value);
  return WEEK_BY_KEY.get(normalized)?.key || WEEK_BY_LABEL.get(normalized)?.key || '';
}

function localDateKey(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultAcademicWeekKey(value = new Date()) {
  const today = localDateKey(value);
  const selectable = ACADEMIC_WEEKS.filter((week) => week.selectable);
  const current = selectable.find((week) => week.start <= today && today <= week.end);
  const next = selectable.find((week) => week.start > today);
  return (current || next || selectable[selectable.length - 1] || {}).key || '';
}

function createWeekOptions(selected = defaultAcademicWeekKey()) {
  const selectedKey = resolveWeekKey(selected) || defaultAcademicWeekKey();
  const groups = [];
  const byGroup = new Map();

  ACADEMIC_WEEKS.forEach((week) => {
    if (!byGroup.has(week.group)) {
      byGroup.set(week.group, []);
      groups.push(week.group);
    }
    byGroup.get(week.group).push(week);
  });

  return groups.map((group) => {
    const options = byGroup.get(group).map((week) => {
      const selectedAttr = week.key === selectedKey ? ' selected' : '';
      const disabledAttr = week.selectable ? '' : ' disabled';
      return `<option value="${escapeHtml(week.key)}"${selectedAttr}${disabledAttr}>${escapeHtml(week.label)}</option>`;
    }).join('');
    return `<optgroup label="${escapeHtml(group)}">${options}</optgroup>`;
  }).join('');
}

function findTitleInput(form) {
  return form.querySelector(
    'input:not([type="file"]):not([type="date"]):not([type="time"]):not([type="radio"]):not([type="number"])',
  );
}

function ensureSingleWeekField(form) {
  let field = form.querySelector('.bes-weekly-academic-week-field');
  if (!field) {
    field = document.createElement('label');
    field.className = 'bes-weekly-academic-week-field';
    field.innerHTML = `<span>Tuần học</span><select class="bes-weekly-academic-week-select" required aria-label="Chọn tuần học niên khóa 2026-2027">${createWeekOptions()}</select><small>Niên khóa 2026–2027 · Nghỉ Tết được hiển thị để đối chiếu và không thể chọn.</small>`;
    const anchor = form.querySelector('.bes-weekly-grade-field') || form.querySelector('.bes-weekly-file');
    if (anchor) anchor.insertAdjacentElement('beforebegin', field);
    else form.querySelector('button[type="submit"]')?.insertAdjacentElement('beforebegin', field);
  } else {
    const select = field.querySelector('select');
    const currentKey = resolveWeekKey(select?.value) || defaultAcademicWeekKey();
    if (select && !WEEK_BY_KEY.has(select.value)) select.innerHTML = createWeekOptions(currentKey);
  }
  return field;
}

function ensureBulkWeekFields(form) {
  const fallback = resolveWeekKey(form.querySelector('.bes-weekly-academic-week-select')?.value)
    || defaultAcademicWeekKey();
  const rows = [...form.querySelectorAll('.bes-weekly-bulk-item')];

  rows.forEach((row) => {
    let select = row.querySelector('.bes-weekly-academic-bulk-week');
    if (!select) {
      const field = document.createElement('label');
      field.className = 'is-wide bes-weekly-academic-bulk-week-field';
      field.innerHTML = `<span>Tuần học</span><select class="bes-weekly-academic-bulk-week" required aria-label="Chọn tuần học cho bài này">${createWeekOptions(fallback)}</select>`;
      const titleField = row.querySelector('.bes-weekly-bulk-title')?.closest('label');
      if (titleField) titleField.insertAdjacentElement('afterend', field);
      else row.querySelector('.bes-weekly-bulk-fields')?.prepend(field);
      select = field.querySelector('select');
    } else if (!WEEK_BY_KEY.has(select.value)) {
      const currentKey = resolveWeekKey(select.value) || fallback;
      select.innerHTML = createWeekOptions(currentKey);
    }
  });

  const singleField = ensureSingleWeekField(form);
  const bulkMode = rows.length >= 2;
  singleField.hidden = bulkMode;
  const singleSelect = singleField.querySelector('select');
  if (singleSelect) singleSelect.disabled = bulkMode;
}

function humanizeStoredWeekCodes(root = document) {
  if (!root || typeof document.createTreeWalker !== 'function') return;
  const codes = [...WEEK_BY_KEY.keys()];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const value = node.nodeValue || '';
      if (!codes.some((code) => value.includes(code))) return NodeFilter.FILTER_REJECT;
      const tag = node.parentElement?.tagName;
      if (!tag || ['OPTION', 'SELECT', 'INPUT', 'TEXTAREA', 'SCRIPT', 'STYLE'].includes(tag)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    let value = node.nodeValue || '';
    WEEK_BY_KEY.forEach((week, code) => {
      value = value.replaceAll(code, week.label);
    });
    node.nodeValue = value;
  });
}

function patchForm(form) {
  if (!form) return;
  ensureSingleWeekField(form);
  ensureBulkWeekFields(form);
  form.dataset.academicWeekSelectorReady = '1';
}

function scan(root = document) {
  if (root.matches?.(FORM_SELECTOR)) patchForm(root);
  root.querySelectorAll?.(FORM_SELECTOR).forEach(patchForm);
  humanizeStoredWeekCodes(root);
}

function queueScan(root = document) {
  if (scanFrame) return;
  scanFrame = window.requestAnimationFrame(() => {
    scanFrame = 0;
    scan(root);
  });
}

function selectedMode(form) {
  return form.querySelector('input[name="bes-weekly-publication-mode"]:checked')?.value || 'published';
}

function combineLocalDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}:00`);
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

function setRowStatus(row, text, status = '') {
  if (!row) return;
  const node = row.querySelector('.bes-weekly-bulk-status');
  if (!node) return;
  node.textContent = text;
  node.title = text;
  node.className = `bes-weekly-bulk-status${status ? ` is-${status}` : ''}`;
}

function managerMessage(formOrManager, text, isError = false) {
  const manager = formOrManager?.matches?.('.bes-weekly-manager--simple')
    ? formOrManager
    : formOrManager?.closest?.('.bes-weekly-manager--simple');
  if (!manager) return;
  let message = manager.querySelector('.bes-weekly-manager__message');
  if (!message) {
    message = document.createElement('div');
    message.className = 'bes-weekly-manager__message';
    manager.querySelector('header')?.insertAdjacentElement('afterend', message);
  }
  message.textContent = text;
  message.classList.toggle('is-error', isError);
}

function readEntries(form) {
  ensureBulkWeekFields(form);
  const files = [...(form.querySelector('input[type="file"]')?.files || [])];
  const rows = [...form.querySelectorAll('.bes-weekly-bulk-item')];

  if (rows.length >= 2) {
    return rows.map((row, index) => {
      const mode = row.querySelector('.bes-weekly-bulk-mode')?.value || 'published';
      return {
        row,
        file: files[index] || null,
        title: cleanText(row.querySelector('.bes-weekly-bulk-title')?.value),
        grade: row.querySelector('.bes-weekly-bulk-grade')?.value || '10',
        weekKey: resolveWeekKey(row.querySelector('.bes-weekly-academic-bulk-week')?.value),
        mode,
        duration: Number(row.querySelector('.bes-weekly-bulk-duration')?.value || 45),
        opensAt: mode === 'scheduled'
          ? combineLocalDateTime(
            row.querySelector('.bes-weekly-bulk-date')?.value,
            row.querySelector('.bes-weekly-bulk-time')?.value,
          )
          : new Date(),
      };
    });
  }

  const mode = selectedMode(form);
  return [{
    row: null,
    file: files[0] || null,
    title: cleanText(findTitleInput(form)?.value),
    grade: form.querySelector('#bes-weekly-grade-classification')?.value || '10',
    weekKey: resolveWeekKey(form.querySelector('.bes-weekly-academic-week-select')?.value),
    mode,
    duration: 45,
    opensAt: mode === 'scheduled'
      ? combineLocalDateTime(
        form.querySelector('#bes-weekly-publish-date')?.value,
        form.querySelector('#bes-weekly-publish-time')?.value,
      )
      : new Date(),
  }];
}

function validateEntries(entries) {
  const errors = [];
  entries.forEach((entry) => {
    entry.row?.classList.remove('is-error');
    let message = '';
    if (!entry.title) message = 'Hãy nhập tên bài.';
    else if (!WEEK_BY_KEY.get(entry.weekKey)?.selectable) message = 'Hãy chọn tuần học trong danh sách niên khóa 2026–2027.';
    else if (entry.weekKey.length > 32) message = 'Mã tuần vượt quá giới hạn dữ liệu.';
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
  if (!form) return;
  patchForm(form);

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  if (savingForms.has(form)) return;

  const entries = readEntries(form).filter((entry) => entry.row?.dataset.uploaded !== '1');
  const errors = validateEntries(entries);
  if (errors.length) {
    managerMessage(form, `Có ${errors.length} bài cần kiểm tra lại trước khi tải.`, true);
    errors[0][0].row?.scrollIntoView({ behavior: 'auto', block: 'center' });
    return;
  }
  if (!entries.length) {
    managerMessage(form, 'Không còn bài nào cần tải.');
    return;
  }

  savingForms.add(form);
  const button = form.querySelector('button[type="submit"]');
  if (button) {
    button.disabled = true;
    button.textContent = `Đang tải 0/${entries.length}…`;
  }
  managerMessage(form, `Đang tải ${entries.length} bài theo tuần đã chọn…`);

  let success = 0;
  let failed = 0;
  const failureMessages = [];

  try {
    const { data, error: authError } = await supabase.auth.getSession();
    if (authError) throw authError;
    const currentUser = data?.session?.user || null;
    if (!currentUser?.id) throw new Error('Phiên đăng nhập Supabase đã hết hạn. Hãy đăng nhập lại trước khi tải bài.');

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      setRowStatus(entry.row, `Đang tải ${index + 1}/${entries.length}…`, 'uploading');
      if (button) button.textContent = `Đang tải ${index + 1}/${entries.length}…`;

      try {
        await createWeeklyPractice({
          form: {
            title: entry.title,
            description: '',
            week_key: entry.weekKey,
            school_year: ACADEMIC_YEAR,
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
        const message = cleanText(error?.message) || 'Tải lên thất bại';
        entry.row?.classList.add('is-error');
        setRowStatus(entry.row, message, 'error');
        failureMessages.push(message);
        failed += 1;
      }
    }
  } catch (error) {
    failed = entries.length;
    failureMessages.push(cleanText(error?.message) || 'Không thể xác thực tài khoản tải bài.');
  } finally {
    savingForms.delete(form);
    if (button) {
      button.disabled = false;
      button.textContent = failed ? 'Thử lại các bài lỗi' : `Đã tải ${success} bài`;
    }
  }

  if (!failed) {
    managerMessage(form, `Đã tải thành công ${success} bài và gắn đúng tuần học. Đang làm mới danh sách…`);
    window.setTimeout(() => window.location.reload(), 900);
  } else {
    const reasons = [...new Set(failureMessages)].slice(0, 2).join(' · ');
    managerMessage(
      form,
      `Đã tải ${success} bài; ${failed} bài chưa thành công.${reasons ? ` Lỗi: ${reasons}` : ''}`,
      true,
    );
  }
}

document.addEventListener('submit', handleSubmit, true);
document.addEventListener('change', (event) => {
  if (event.target?.matches?.(`${FORM_SELECTOR} input[type="file"]`)) {
    window.setTimeout(() => queueScan(), 0);
  }
}, true);

const observer = new MutationObserver((records) => {
  records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) queueScan(node);
  }));
});
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', () => scan(), { once: true });
scan();
