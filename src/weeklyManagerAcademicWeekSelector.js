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

const RAW_WEEKS = [
  ['HỌC KÌ I', 1, '2026-07-20', '2026-07-25', 'HỌC KÌ I'],
  ['HỌC KÌ I', 2, '2026-07-27', '2026-08-01', 'HỌC KÌ I'],
  ['HỌC KÌ I', 3, '2026-08-03', '2026-08-08', 'HỌC KÌ I'],
  ['HỌC KÌ I', 4, '2026-08-10', '2026-08-15', 'HỌC KÌ I'],
  ['HỌC KÌ I', 5, '2026-08-17', '2026-08-22', 'HỌC KÌ I'],
  ['HỌC KÌ I', 6, '2026-08-24', '2026-08-29', 'HỌC KÌ I'],
  ['HỌC KÌ I', 7, '2026-08-31', '2026-09-05', 'HỌC KÌ I'],
  ['HỌC KÌ I', 8, '2026-09-07', '2026-09-12', 'HỌC KÌ I'],
  ['HỌC KÌ I', 9, '2026-09-14', '2026-09-19', 'HỌC KÌ I'],
  ['HỌC KÌ I', 10, '2026-09-21', '2026-09-26', 'HỌC KÌ I'],
  ['HỌC KÌ I', 11, '2026-09-28', '2026-10-03', 'HỌC KÌ I'],
  ['HỌC KÌ I', 12, '2026-10-05', '2026-10-10', 'HỌC KÌ I'],
  ['HỌC KÌ I', 13, '2026-10-12', '2026-10-17', 'HỌC KÌ I'],
  ['HỌC KÌ I', 14, '2026-10-19', '2026-10-24', 'HỌC KÌ I'],
  ['HỌC KÌ I', 15, '2026-10-26', '2026-10-31', 'HỌC KÌ I'],
  ['HỌC KÌ I', 16, '2026-11-02', '2026-11-07', 'HỌC KÌ I'],
  ['HỌC KÌ I', 17, '2026-11-09', '2026-11-14', 'HỌC KÌ I'],
  ['HỌC KÌ I', 18, '2026-11-16', '2026-11-21', 'HỌC KÌ I'],
  ['HỌC KÌ I', 19, '2026-11-23', '2026-11-28', 'HỌC KÌ I'],
  ['HỌC KÌ I', 20, '2026-11-30', '2026-12-05', 'HỌC KÌ I'],
  ['HỌC KÌ I', 21, '2026-12-07', '2026-12-12', 'HỌC KÌ I'],
  ['HỌC KÌ II', 1, '2026-12-14', '2026-12-19', 'HỌC KÌ II · GIAI ĐOẠN 1'],
  ['HỌC KÌ II', 2, '2026-12-21', '2026-12-26', 'HỌC KÌ II · GIAI ĐOẠN 1'],
  ['HỌC KÌ II', 3, '2026-12-28', '2027-01-02', 'HỌC KÌ II · GIAI ĐOẠN 1'],
  ['HỌC KÌ II', 4, '2027-01-04', '2027-01-09', 'HỌC KÌ II · GIAI ĐOẠN 1'],
  ['HỌC KÌ II', 5, '2027-01-11', '2027-01-16', 'HỌC KÌ II · GIAI ĐOẠN 1'],
  ['HỌC KÌ II', 6, '2027-01-18', '2027-01-23', 'HỌC KÌ II · GIAI ĐOẠN 1'],
  ['HỌC KÌ II', 7, '2027-01-25', '2027-01-30', 'HỌC KÌ II · GIAI ĐOẠN 1'],
  ['NGHỈ TẾT NGUYÊN ĐÁN', null, '2027-02-01', '2027-02-13', 'NGHỈ TẾT NGUYÊN ĐÁN'],
  ['HỌC KÌ II', 8, '2027-02-15', '2027-02-20', 'HỌC KÌ II · GIAI ĐOẠN 2'],
  ['HỌC KÌ II', 9, '2027-02-22', '2027-02-27', 'HỌC KÌ II · GIAI ĐOẠN 2'],
  ['HỌC KÌ II', 10, '2027-03-01', '2027-03-06', 'HỌC KÌ II · GIAI ĐOẠN 2'],
  ['HỌC KÌ II', 11, '2027-03-08', '2027-03-13', 'HỌC KÌ II · GIAI ĐOẠN 2'],
  ['HỌC KÌ II', 12, '2027-03-15', '2027-03-20', 'HỌC KÌ II · GIAI ĐOẠN 2'],
  ['HỌC KÌ II', 13, '2027-03-22', '2027-03-27', 'HỌC KÌ II · GIAI ĐOẠN 2'],
  ['HỌC KÌ II', 14, '2027-03-29', '2027-04-03', 'HỌC KÌ II · GIAI ĐOẠN 2'],
  ['HỌC KÌ II', 15, '2027-04-05', '2027-04-10', 'HỌC KÌ II · GIAI ĐOẠN 2'],
  ['HỌC KÌ II', 16, '2027-04-12', '2027-04-17', 'HỌC KÌ II · GIAI ĐOẠN 2'],
  ['HỌC KÌ II', 17, '2027-04-19', '2027-04-24', 'HỌC KÌ II · GIAI ĐOẠN 2'],
  ['HỌC KÌ II', 18, '2027-04-26', '2027-05-01', 'HỌC KÌ II · GIAI ĐOẠN 2'],
  ['HỌC KÌ II', 19, '2027-05-03', '2027-05-08', 'HỌC KÌ II · GIAI ĐOẠN 2'],
  ['HỌC KÌ II', 20, '2027-05-10', '2027-05-15', 'HỌC KÌ II · GIAI ĐOẠN 2'],
  ['HỌC KÌ II', 21, '2027-05-17', '2027-05-22', 'HỌC KÌ II · GIAI ĐOẠN 2'],
];

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

function displayDate(iso) {
  return String(iso || '').split('-').reverse().join('/');
}

const ACADEMIC_WEEKS = RAW_WEEKS.map(([semester, week, start, end, group]) => {
  const label = week
    ? `${semester} – TUẦN ${week} – TỪ ${displayDate(start)} ĐẾN ${displayDate(end)}`
    : `NGHỈ TẾT NGUYÊN ĐÁN – TỪ ${displayDate(start)} ĐẾN ${displayDate(end)}`;
  return { key: label, label, semester, week, start, end, group, selectable: week !== null };
});

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
  const selectable = ACADEMIC_WEEKS.filter((week) => week.selectable !== false);
  const current = selectable.find((week) => week.start <= today && today <= week.end);
  const next = selectable.find((week) => week.start > today);
  return (current || next || selectable[selectable.length - 1] || {}).key || '';
}

function createWeekOptions(selected = defaultAcademicWeekKey()) {
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
      const selectedAttr = week.key === selected ? ' selected' : '';
      const disabledAttr = week.selectable === false ? ' disabled' : '';
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
  }
  return field;
}

function ensureBulkWeekFields(form) {
  const fallback = form.querySelector('.bes-weekly-academic-week-select')?.value || defaultAcademicWeekKey();
  const rows = [...form.querySelectorAll('.bes-weekly-bulk-item')];
  rows.forEach((row) => {
    if (row.querySelector('.bes-weekly-academic-bulk-week')) return;
    const field = document.createElement('label');
    field.className = 'is-wide bes-weekly-academic-bulk-week-field';
    field.innerHTML = `<span>Tuần học</span><select class="bes-weekly-academic-bulk-week" required aria-label="Chọn tuần học cho bài này">${createWeekOptions(fallback)}</select>`;
    const titleField = row.querySelector('.bes-weekly-bulk-title')?.closest('label');
    if (titleField) titleField.insertAdjacentElement('afterend', field);
    else row.querySelector('.bes-weekly-bulk-fields')?.prepend(field);
  });

  const singleField = ensureSingleWeekField(form);
  const bulkMode = rows.length >= 2;
  singleField.hidden = bulkMode;
  const singleSelect = singleField.querySelector('select');
  if (singleSelect) singleSelect.disabled = bulkMode;
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
        weekKey: row.querySelector('.bes-weekly-academic-bulk-week')?.value || '',
        mode,
        duration: Number(row.querySelector('.bes-weekly-bulk-duration')?.value || 45),
        opensAt: mode === 'scheduled'
          ? combineLocalDateTime(row.querySelector('.bes-weekly-bulk-date')?.value, row.querySelector('.bes-weekly-bulk-time')?.value)
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
    weekKey: form.querySelector('.bes-weekly-academic-week-select')?.value || '',
    mode,
    duration: 45,
    opensAt: mode === 'scheduled'
      ? combineLocalDateTime(form.querySelector('#bes-weekly-publish-date')?.value, form.querySelector('#bes-weekly-publish-time')?.value)
      : new Date(),
  }];
}

function validateEntries(entries) {
  const errors = [];
  entries.forEach((entry) => {
    entry.row?.classList.remove('is-error');
    let message = '';
    if (!entry.title) message = 'Hãy nhập tên bài.';
    else if (!ACADEMIC_WEEKS.some((week) => week.selectable && week.key === entry.weekKey)) message = 'Hãy chọn tuần học trong danh sách niên khóa 2026–2027.';
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
    errors[0][0].row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  try {
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
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
        entry.row?.classList.add('is-error');
        setRowStatus(entry.row, cleanText(error?.message) || 'Tải lên thất bại', 'error');
        failed += 1;
      }
    }
  } catch (error) {
    failed = entries.length;
    managerMessage(form, error?.message || 'Không thể xác thực tài khoản tải bài.', true);
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
    managerMessage(form, `Đã tải ${success} bài; ${failed} bài chưa thành công. Có thể sửa và thử lại các bài lỗi.`, true);
  }
}

document.addEventListener('submit', handleSubmit, true);
document.addEventListener('change', (event) => {
  if (event.target?.matches?.(`${FORM_SELECTOR} input[type="file"]`)) window.setTimeout(() => queueScan(), 0);
}, true);

const observer = new MutationObserver((records) => {
  records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) queueScan(node);
  }));
});
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', () => scan(), { once: true });
scan();
