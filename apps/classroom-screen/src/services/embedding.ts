export type BrianClassroomMessage =
  | { source: 'brian-classroom-screen'; type: 'READY' }
  | { source: 'brian-classroom-screen'; type: 'REQUEST_CLOSE' }
  | { source: 'brian-classroom-screen'; type: 'TITLE'; title: string };

export function isEmbedded(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('embed') === '1' || window.self !== window.top;
}

export function notifyBrian(message: BrianClassroomMessage): void {
  if (window.parent === window) return;
  window.parent.postMessage(message, '*');
}

export function installEmbeddingBridge(): () => void {
  const embedded = isEmbedded();
  document.documentElement.dataset.embedded = embedded ? 'true' : 'false';

  if (embedded) {
    notifyBrian({ source: 'brian-classroom-screen', type: 'READY' });
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (embedded && event.key === 'Escape') {
      notifyBrian({ source: 'brian-classroom-screen', type: 'REQUEST_CLOSE' });
    }
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
