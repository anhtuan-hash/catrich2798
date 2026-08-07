/* Apps directory now renders natively from React.
 * This lightweight runtime keeps shared interaction fixes that must survive React re-renders.
 */
(() => {
  const SELECTOR = '.metro-clean-system[data-route="games"] .games-v46-platform-grid';
  const boundRows = new WeakSet();

  function bindDragScroll(row) {
    if (!row || boundRows.has(row)) return;
    boundRows.add(row);
    row.dataset.besHorizontalDrag = 'enabled';
    row.style.cursor = 'grab';

    let pointerId = null;
    let startX = 0;
    let startScrollLeft = 0;
    let dragged = false;
    let suppressClick = false;
    let clickResetTimer = 0;

    const restoreDragStyles = () => {
      row.style.cursor = 'grab';
      row.style.removeProperty('user-select');
      row.style.removeProperty('-webkit-user-select');
      row.style.removeProperty('scroll-snap-type');
      row.style.removeProperty('scroll-behavior');
    };

    const finishDrag = (event) => {
      if (pointerId === null || (event?.pointerId != null && event.pointerId !== pointerId)) return;
      const finishedPointerId = pointerId;
      pointerId = null;
      restoreDragStyles();

      try {
        if (row.hasPointerCapture?.(finishedPointerId)) row.releasePointerCapture(finishedPointerId);
      } catch {
        // Pointer capture is best-effort only.
      }

      if (dragged) {
        suppressClick = true;
        window.clearTimeout(clickResetTimer);
        clickResetTimer = window.setTimeout(() => {
          suppressClick = false;
        }, 120);
      }
    };

    row.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      if (row.scrollWidth <= row.clientWidth + 2) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = row.scrollLeft;
      dragged = false;
      suppressClick = false;
      window.clearTimeout(clickResetTimer);

      try {
        row.setPointerCapture?.(pointerId);
      } catch {
        // Safari/embedded contexts can reject capture; dragging still works without it.
      }
    });

    row.addEventListener('pointermove', (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const deltaX = event.clientX - startX;
      if (!dragged && Math.abs(deltaX) < 5) return;

      dragged = true;
      suppressClick = true;
      row.style.cursor = 'grabbing';
      row.style.setProperty('user-select', 'none', 'important');
      row.style.setProperty('-webkit-user-select', 'none', 'important');
      row.style.setProperty('scroll-snap-type', 'none', 'important');
      row.style.setProperty('scroll-behavior', 'auto', 'important');
      row.scrollLeft = startScrollLeft - deltaX;
      event.preventDefault();
    });

    row.addEventListener('pointerup', finishDrag);
    row.addEventListener('pointercancel', finishDrag);
    row.addEventListener('lostpointercapture', finishDrag);

    row.addEventListener('click', (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClick = false;
      window.clearTimeout(clickResetTimer);
    }, true);
  }

  function scan() {
    document.querySelectorAll(SELECTOR).forEach(bindDragScroll);
  }

  let scanQueued = false;
  const queueScan = () => {
    if (scanQueued) return;
    scanQueued = true;
    window.requestAnimationFrame(() => {
      scanQueued = false;
      scan();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }

  window.addEventListener('hashchange', queueScan);
  window.addEventListener('resize', queueScan, { passive: true });

  new MutationObserver(queueScan).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
