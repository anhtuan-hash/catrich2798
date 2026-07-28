const FORM_SELECTOR = '.bes-weekly-manager--simple form.bes-weekly-form--simple';
const MAX_BATCH_FILES = 10;
const selectedFilesByForm = new WeakMap();
let scanFrame = 0;

function fileKey(file) {
  return [file?.name, file?.size, file?.lastModified, file?.type].join('::');
}

function uniqueFiles(files) {
  const seen = new Set();
  return files.filter((file) => {
    const key = fileKey(file);
    if (!file || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function assignFiles(input, files) {
  if (!input) return false;
  try {
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
    return input.files.length === files.length;
  } catch {
    return false;
  }
}

function managerMessage(form, text, isError = false) {
  const manager = form?.closest?.('.bes-weekly-manager--simple');
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

function currentFiles(form, input) {
  const remembered = selectedFilesByForm.get(form) || [];
  if (remembered.length) return remembered;
  return [...(input?.files || [])];
}

function ensurePickerTools(form, input) {
  const label = input?.closest?.('.bes-weekly-file');
  if (!label) return null;
  let tools = label.querySelector('.bes-weekly-bulk-picker-tools');
  if (!tools) {
    tools = document.createElement('div');
    tools.className = 'bes-weekly-bulk-picker-tools';
    tools.innerHTML = `
      <span class="bes-weekly-bulk-picker-count">0/10 file đã chọn</span>
      <button type="button" class="bes-weekly-bulk-picker-clear" hidden>Xóa danh sách</button>
    `;
    label.appendChild(tools);
    tools.querySelector('.bes-weekly-bulk-picker-clear')?.addEventListener('click', () => {
      selectedFilesByForm.delete(form);
      const activeInput = form.querySelector('input[type="file"]');
      if (activeInput) {
        activeInput.dataset.bulkGuardClearing = '1';
        activeInput.value = '';
        assignFiles(activeInput, []);
        activeInput.dispatchEvent(new Event('change', { bubbles: true }));
        delete activeInput.dataset.bulkGuardClearing;
      }
      updatePickerTools(form, activeInput, []);
      managerMessage(form, 'Đã xóa danh sách file đã chọn.');
    });
  }
  return tools;
}

function updatePickerTools(form, input, files = currentFiles(form, input)) {
  const tools = ensurePickerTools(form, input);
  if (!tools) return;
  const count = tools.querySelector('.bes-weekly-bulk-picker-count');
  const clear = tools.querySelector('.bes-weekly-bulk-picker-clear');
  if (count) count.textContent = `${files.length}/${MAX_BATCH_FILES} file đã chọn`;
  if (clear) clear.hidden = files.length === 0;
}

function requestReplay(input) {
  if (!input || input.dataset.bulkReplayQueued === '1') return;
  input.dataset.bulkReplayQueued = '1';
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      delete input.dataset.bulkReplayQueued;
      if (!input.isConnected || !input.files?.length) return;
      input.dataset.bulkGuardReplay = '1';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      delete input.dataset.bulkGuardReplay;
    });
  });
}

function patchInput(input) {
  if (!input?.matches?.('input[type="file"]')) return;
  const form = input.closest(FORM_SELECTOR);
  if (!form) return;

  input.multiple = true;
  input.setAttribute('multiple', '');
  input.accept = '.html,.htm,text/html';
  input.setAttribute('accept', '.html,.htm,text/html');
  input.setAttribute('aria-label', 'Chọn tối đa 10 file HTML');

  const isNewInput = input.dataset.bulkInputGuardReady !== '1';
  if (isNewInput) {
    input.dataset.bulkInputGuardReady = '1';
    form.dataset.bulkUploadReady = '';
    input.dataset.bulkNeedsReplay = '1';

    const remembered = selectedFilesByForm.get(form) || [];
    if (remembered.length && assignFiles(input, remembered)) requestReplay(input);
  }

  ensurePickerTools(form, input);
  updatePickerTools(form, input);
}

function handleSelection(event) {
  const input = event.target;
  if (!input?.matches?.(`${FORM_SELECTOR} input[type="file"]`)) return;
  const form = input.closest(FORM_SELECTOR);
  if (!form) return;
  patchInput(input);

  if (input.dataset.bulkGuardClearing === '1' || input.dataset.bulkGuardReplay === '1') {
    updatePickerTools(form, input);
    return;
  }

  const picked = [...(input.files || [])];
  if (!picked.length) {
    updatePickerTools(form, input);
    return;
  }

  const previous = selectedFilesByForm.get(form) || [];
  const merged = uniqueFiles([...previous, ...picked]);
  const accepted = merged.slice(0, MAX_BATCH_FILES);
  selectedFilesByForm.set(form, accepted);

  const assigned = assignFiles(input, accepted);
  updatePickerTools(form, input, accepted);

  if (merged.length > MAX_BATCH_FILES) {
    managerMessage(form, `Chỉ giữ lại ${MAX_BATCH_FILES} file đầu tiên. Hãy xóa danh sách nếu cần chọn lại.`, true);
  } else if (accepted.length > 1) {
    managerMessage(form, `Đã chọn ${accepted.length}/${MAX_BATCH_FILES} file. Có thể chọn thêm ở lần mở tiếp theo.`);
  }

  if (!assigned && previous.length && picked.length === 1) {
    managerMessage(form, 'Trình duyệt không thể cộng dồn lựa chọn. Hãy chọn nhiều file cùng lúc bằng Command/Shift.', true);
  }

  if (input.dataset.bulkNeedsReplay === '1') {
    delete input.dataset.bulkNeedsReplay;
    requestReplay(input);
  }
}

function scan(root = document) {
  root.querySelectorAll?.(`${FORM_SELECTOR} input[type="file"]`).forEach(patchInput);
  if (root.matches?.(`${FORM_SELECTOR} input[type="file"]`)) patchInput(root);
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

document.addEventListener('pointerdown', (event) => {
  const input = event.target?.closest?.(`${FORM_SELECTOR} input[type="file"]`);
  if (input) patchInput(input);
}, true);
document.addEventListener('focusin', (event) => {
  if (event.target?.matches?.(`${FORM_SELECTOR} input[type="file"]`)) patchInput(event.target);
}, true);
document.addEventListener('change', handleSelection, true);
document.addEventListener('reset', (event) => {
  const form = event.target?.closest?.(FORM_SELECTOR);
  if (!form) return;
  selectedFilesByForm.delete(form);
  window.setTimeout(() => {
    const input = form.querySelector('input[type="file"]');
    updatePickerTools(form, input, []);
  }, 0);
}, true);

const observer = new MutationObserver(queueScan);
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', () => scan(), { once: true });
scan();
