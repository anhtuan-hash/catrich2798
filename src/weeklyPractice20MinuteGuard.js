const MINIMUM_SECONDS = 20 * 60;
const RUNNER_SELECTOR = '.bes-weekly-runner';
const RELEVANT_SELECTOR = `${RUNNER_SELECTOR}, .bes-weekly-timer, .bes-weekly-override-footer, .bes-weekly-completion-bar`;
const GUARDED_BUTTON_PATTERN = /(nộp|gửi\s+cho\s+ttcm|xác\s+nhận\s+đã\s+hoàn\s+thành|tạo\s+ảnh)/i;

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds || 0)));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function parseDuration(value) {
  const parts = String(value || '').trim().split(':').map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function setText(node, value) {
  if (!node) return;
  const next = String(value ?? '');
  if (node.textContent !== next) node.textContent = next;
}

function readElapsedSeconds(runner) {
  const timer = runner?.querySelector('.bes-weekly-timer');
  if (!timer) return 0;

  const preferred = timer.querySelector('strong, b, [data-elapsed]');
  const preferredMatch = preferred?.textContent?.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
  if (preferredMatch) return parseDuration(preferredMatch[0]) ?? 0;

  const matches = String(timer.textContent || '').match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g) || [];
  return parseDuration(matches[0]) ?? 0;
}

function markGuarded(button, remaining) {
  if (!(button instanceof HTMLButtonElement)) return;
  if (!button.dataset.besGateOriginalText) button.dataset.besGateOriginalText = button.textContent || '';
  button.dataset.besTwentyMinuteGate = '1';
  button.disabled = true;
  if (/gửi\s+cho\s+ttcm|nộp/i.test(button.dataset.besGateOriginalText)) {
    setText(button, `Còn ${formatDuration(remaining)}`);
  }
}

function releaseGuarded(button) {
  if (!(button instanceof HTMLButtonElement) || button.dataset.besTwentyMinuteGate !== '1') return;
  button.disabled = false;
  if (button.dataset.besGateOriginalText) setText(button, button.dataset.besGateOriginalText);
  delete button.dataset.besTwentyMinuteGate;
}

function updateTimer(runner, elapsed) {
  const timerNote = runner.querySelector('.bes-weekly-timer span');
  if (!timerNote) return;
  const remaining = Math.max(0, MINIMUM_SECONDS - elapsed);
  setText(timerNote, remaining
    ? `Còn ${formatDuration(remaining)} để được nộp`
    : 'Đã đủ 20 phút · Có thể nộp bài');
}

function updateFooter(runner, elapsed) {
  const footer = runner.querySelector('.bes-weekly-override-footer');
  if (!footer) return;
  const remaining = Math.max(0, MINIMUM_SECONDS - elapsed);
  const alreadySubmitted = /đã gửi cho ttcm|đã gửi thành công/i.test(footer.textContent || '');
  if (alreadySubmitted) return;

  const buttons = [...footer.querySelectorAll('button')];
  const guardedButtons = buttons.filter((button) => GUARDED_BUTTON_PATTERN.test(
    button.dataset.besGateOriginalText || button.textContent || '',
  ));

  if (remaining > 0) {
    guardedButtons.forEach((button) => markGuarded(button, remaining));
    const copy = footer.querySelector('.bes-weekly-override-footer__copy');
    if (copy) {
      const strong = copy.querySelector('strong');
      const span = copy.querySelector('span');
      setText(strong, 'Chưa thể nộp bài');
      setText(span, `Cần hoạt động tối thiểu 20 phút. Còn ${formatDuration(remaining)}.`);
    }
    return;
  }

  buttons.forEach(releaseGuarded);
  const copy = footer.querySelector('.bes-weekly-override-footer__copy');
  if (copy && /chưa thể nộp bài/i.test(copy.textContent || '')) {
    const strong = copy.querySelector('strong');
    const span = copy.querySelector('span');
    setText(strong, 'Đã đủ thời gian để nộp');
    setText(span, 'Xác nhận hoàn thành để hệ thống tạo ảnh minh chứng trước khi gửi TTCM.');
  }
}

function normalizeLegacyCopy(runner) {
  runner.querySelectorAll('.bes-weekly-override-footer__copy span, .bes-weekly-timer span').forEach((node) => {
    if (!node.textContent) return;
    const normalized = node.textContent
      .replace(/45\s*phút\s*khuyến\s*nghị/gi, '20 phút tối thiểu')
      .replace(/chưa\s*đủ\s*45\s*phút/gi, 'chưa đủ 20 phút');
    setText(node, normalized);
  });
}

function syncRunner(runner) {
  if (!(runner instanceof HTMLElement)) return;
  const elapsed = readElapsedSeconds(runner);
  updateTimer(runner, elapsed);
  updateFooter(runner, elapsed);
  normalizeLegacyCopy(runner);
  if (runner.dataset.besMinimumSubmitSeconds !== String(MINIMUM_SECONDS)) {
    runner.dataset.besMinimumSubmitSeconds = String(MINIMUM_SECONDS);
  }
}

function syncAll() {
  document.querySelectorAll(RUNNER_SELECTOR).forEach(syncRunner);
}

let syncQueued = false;
function queueSync() {
  if (syncQueued) return;
  syncQueued = true;
  const schedule = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
  schedule(() => {
    syncQueued = false;
    syncAll();
  });
}

function mutationTouchesPractice(mutations) {
  return mutations.some((mutation) => [...mutation.addedNodes, ...mutation.removedNodes].some((node) => {
    if (!(node instanceof Element)) return false;
    return node.matches(RELEVANT_SELECTOR)
      || Boolean(node.querySelector?.(RELEVANT_SELECTOR))
      || Boolean(node.closest?.(RUNNER_SELECTOR));
  }));
}

function interceptPrematureSubmission(event) {
  const button = event.target instanceof Element ? event.target.closest('button') : null;
  const runner = button?.closest(RUNNER_SELECTOR);
  if (!button || !runner || !GUARDED_BUTTON_PATTERN.test(button.textContent || button.dataset.besGateOriginalText || '')) return;

  const elapsed = readElapsedSeconds(runner);
  if (elapsed >= MINIMUM_SECONDS) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const remaining = Math.max(0, MINIMUM_SECONDS - elapsed);
  window.alert(`Học sinh cần làm bài tối thiểu 20 phút trước khi nộp cho TTCM. Còn ${formatDuration(remaining)}.`);
}

document.addEventListener('click', interceptPrematureSubmission, true);

const observer = new MutationObserver((mutations) => {
  if (mutationTouchesPractice(mutations)) queueSync();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.setInterval(syncAll, 500);
window.addEventListener('DOMContentLoaded', queueSync, { once: true });
queueSync();

window.__besWeeklyPracticeMinimumSubmitSeconds = MINIMUM_SECONDS;
