const WELCOME_FRAME_ID = 'brian-first-visit-welcome';
const INSTALL_KEY = '__besWelcomeStartExitGuardInstalled';
const START_EXIT_DELAY_MS = 1650;
const HARD_EXIT_DELAY_MS = 1100;

const armedFrames = new WeakSet();
let startTimer = 0;
let hardTimer = 0;

function hardRemoveWelcome(frame) {
  if (!(frame instanceof HTMLIFrameElement) || !frame.isConnected) return;
  frame.remove();
  document.body?.style.removeProperty('overflow');
  window.dispatchEvent(new CustomEvent('bes-first-visit-welcome-dismissed', {
    detail: {
      reason: 'start-watchdog-hard-exit',
      isolated: true,
      scene: 'starry-night',
      watchdog: true,
    },
  }));
}

function finishThroughWelcomeCleanup(frame) {
  if (!(frame instanceof HTMLIFrameElement) || !frame.isConnected) return;
  const doc = frame.contentDocument;
  const skip = doc?.getElementById('skipWelcome');

  if (skip instanceof HTMLButtonElement) {
    skip.click();
  }

  window.clearTimeout(hardTimer);
  hardTimer = window.setTimeout(() => hardRemoveWelcome(frame), HARD_EXIT_DELAY_MS);
}

function armFrame(frame) {
  if (!(frame instanceof HTMLIFrameElement) || armedFrames.has(frame)) return;
  const doc = frame.contentDocument;
  const start = doc?.getElementById('startJourney');
  if (!(start instanceof HTMLButtonElement)) return;

  armedFrames.add(frame);
  start.addEventListener('click', () => {
    window.clearTimeout(startTimer);
    window.clearTimeout(hardTimer);
    startTimer = window.setTimeout(
      () => finishThroughWelcomeCleanup(frame),
      START_EXIT_DELAY_MS,
    );
  }, { capture: true });
}

function armCurrentFrame() {
  const frame = document.getElementById(WELCOME_FRAME_ID);
  if (!(frame instanceof HTMLIFrameElement)) return;
  armFrame(frame);
}

export function installWelcomeStartExitGuard() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;

  window.addEventListener('bes-first-visit-welcome-shown', armCurrentFrame);
  armCurrentFrame();
}

installWelcomeStartExitGuard();
