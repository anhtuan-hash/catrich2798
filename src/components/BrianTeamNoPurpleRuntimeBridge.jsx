import { useEffect } from 'react';

const IMPORTANT = 'important';

function setImportant(node, property, value) {
  if (!node?.style) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === IMPORTANT) return;
  node.style.setProperty(property, value, IMPORTANT);
}

function paintPanel(panel) {
  setImportant(panel, 'background', '#ffffff');
  setImportant(panel, 'background-color', '#ffffff');
  setImportant(panel, 'background-image', 'none');
  setImportant(panel, 'color', '#102a43');
  setImportant(panel, 'border', '1px solid #c8d6e1');
  setImportant(panel, 'box-shadow', '0 8px 24px rgba(16,42,67,.07)');
  setImportant(panel, 'overflow', 'hidden');

  const head = panel.querySelector('.bes-bt-progress-head');
  if (head) {
    setImportant(head, 'background', '#ffffff');
    setImportant(head, 'background-color', '#ffffff');
    setImportant(head, 'background-image', 'none');
    setImportant(head, 'border', '0');
    setImportant(head, 'box-shadow', 'none');
    setImportant(head, 'color', '#102a43');
  }

  const track = panel.querySelector('.bes-bt-progress-track');
  if (track) {
    setImportant(track, 'background', '#dce7ee');
    setImportant(track, 'background-color', '#dce7ee');
    setImportant(track, 'background-image', 'none');
  }
  const fill = track?.querySelector('i');
  if (fill) {
    setImportant(fill, 'background', '#0e7784');
    setImportant(fill, 'background-color', '#0e7784');
    setImportant(fill, 'background-image', 'linear-gradient(90deg,#0e7784,#50a56d)');
  }

  const metrics = panel.querySelector('.bes-bt-progress-metrics');
  if (metrics) {
    setImportant(metrics, 'background', '#ffffff');
    setImportant(metrics, 'background-color', '#ffffff');
    setImportant(metrics, 'background-image', 'none');
    setImportant(metrics, 'border', '0');
    setImportant(metrics, 'box-shadow', 'none');
  }

  panel.querySelectorAll('.bes-bt-progress-metrics > span').forEach((metric) => {
    const tone = metric.dataset.tone || '';
    const palette = {
      assigned: ['#edf5ff', '#245b8f', '#bfd5e7'],
      working: ['#f1f5f8', '#405466', '#ccd7df'],
      submitted: ['#fff6df', '#7a4e00', '#e9ca82'],
      revision: ['#fff0ee', '#963b31', '#e3b0aa'],
      finished: ['#eaf7ef', '#216a45', '#a9cfb7'],
    }[tone] || ['#f7fafc', '#334e68', '#d3dee6'];
    setImportant(metric, 'background', palette[0]);
    setImportant(metric, 'background-color', palette[0]);
    setImportant(metric, 'background-image', 'none');
    setImportant(metric, 'color', palette[1]);
    setImportant(metric, 'border', `1px solid ${palette[2]}`);
    setImportant(metric, 'box-shadow', 'none');
  });

  const assignees = panel.querySelector('.bes-bt-assignee-progress');
  if (assignees) {
    setImportant(assignees, 'background', '#ffffff');
    setImportant(assignees, 'background-color', '#ffffff');
    setImportant(assignees, 'background-image', 'none');
    setImportant(assignees, 'border', '0');
    setImportant(assignees, 'box-shadow', 'none');
  }

  panel.querySelectorAll('.bes-bt-assignee-pill').forEach((pill) => {
    setImportant(pill, 'background', '#f7fafc');
    setImportant(pill, 'background-color', '#f7fafc');
    setImportant(pill, 'background-image', 'none');
    setImportant(pill, 'color', '#243b53');
    setImportant(pill, 'border', '1px solid #c4d2dc');
    setImportant(pill, 'box-shadow', 'none');
  });

  panel.querySelectorAll('.bes-bt-progress-head button').forEach((button) => {
    const isReview = button.classList.contains('bes-bt-review-trigger');
    setImportant(button, 'background', isReview ? '#14577a' : '#0e7784');
    setImportant(button, 'background-color', isReview ? '#14577a' : '#0e7784');
    setImportant(button, 'background-image', 'none');
    setImportant(button, 'color', '#ffffff');
    setImportant(button, 'border', `1px solid ${isReview ? '#14577a' : '#0e7784'}`);
    setImportant(button, 'box-shadow', 'none');
  });

  panel.querySelectorAll('*').forEach((node) => {
    const backgroundImage = window.getComputedStyle(node).backgroundImage || '';
    if (/linear-gradient|radial-gradient/i.test(backgroundImage) && /rgb\((?:9[0-9]|1[01][0-9]),\s*(?:3[0-9]|4[0-9]|5[0-9]),\s*(?:1[4-9][0-9]|2[0-4][0-9])\)/i.test(backgroundImage)) {
      setImportant(node, 'background-image', 'none');
      setImportant(node, 'background-color', '#ffffff');
    }
  });
}

export default function BrianTeamNoPurpleRuntimeBridge() {
  useEffect(() => {
    let frame = 0;
    const scan = () => {
      frame = 0;
      if (!window.location.hash.includes('brian-team')) return;
      document.querySelectorAll('.bes-bt-progress-panel').forEach(paintPanel);
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(scan);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', schedule);
    window.addEventListener('focus', schedule);
    window.addEventListener('bes-brian-team-review-updated', schedule);
    window.addEventListener('bes-brian-team-realtime-updated', schedule);

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', schedule);
      window.removeEventListener('focus', schedule);
      window.removeEventListener('bes-brian-team-review-updated', schedule);
      window.removeEventListener('bes-brian-team-realtime-updated', schedule);
    };
  }, []);

  return (
    <style>{`
      #bes-external-apps-root .bes-bt-progress-panel,
      #bes-external-apps-root .bes-bt-progress-panel::before,
      #bes-external-apps-root .bes-bt-progress-panel::after,
      #bes-external-apps-root .bes-bt-progress-head,
      #bes-external-apps-root .bes-bt-progress-head::before,
      #bes-external-apps-root .bes-bt-progress-head::after,
      #bes-external-apps-root .bes-bt-progress-metrics,
      #bes-external-apps-root .bes-bt-progress-metrics::before,
      #bes-external-apps-root .bes-bt-progress-metrics::after,
      #bes-external-apps-root .bes-bt-assignee-progress,
      #bes-external-apps-root .bes-bt-assignee-progress::before,
      #bes-external-apps-root .bes-bt-assignee-progress::after{
        background:#fff!important;
        background-color:#fff!important;
        background-image:none!important;
        box-shadow:none!important;
      }
      #bes-external-apps-root .bes-bt-progress-panel{border:1px solid #c8d6e1!important;box-shadow:0 8px 24px rgba(16,42,67,.07)!important;color:#102a43!important}
      #bes-external-apps-root .bes-bt-progress-head span{color:#0e6773!important}
      #bes-external-apps-root .bes-bt-progress-head b{color:#102a43!important}
      #bes-external-apps-root .bes-bt-progress-track{background:#dce7ee!important;background-image:none!important}
      #bes-external-apps-root .bes-bt-progress-track>i{background:linear-gradient(90deg,#0e7784,#50a56d)!important}
      #bes-external-apps-root .bes-bt-progress-head button{background:#0e7784!important;background-image:none!important;border-color:#0e7784!important;color:#fff!important}
      #bes-external-apps-root .bes-bt-progress-head .bes-bt-review-trigger{background:#14577a!important;border-color:#14577a!important;color:#fff!important}
      #bes-external-apps-root .bes-bt-assignee-pill{background:#f7fafc!important;background-image:none!important;border-color:#c4d2dc!important;color:#243b53!important}
    `}</style>
  );
}
