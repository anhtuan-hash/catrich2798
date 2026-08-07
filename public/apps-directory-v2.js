/* Apps directory now renders natively from React.
 * This lightweight runtime keeps shared interaction fixes that must survive React re-renders.
 */
(() => {
  const SELECTOR = '.metro-clean-system[data-route="games"] .games-v46-platform-grid';
  const boundRows = new WeakSet();
  const scrollbarState = new WeakMap();

  function ensureVisibleScrollbar(row) {
    if (!row || scrollbarState.has(row)) return;

    const bar = document.createElement('div');
    bar.className = 'bes-game-platform-scrollbar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Thanh cuộn danh sách trò chơi');

    const hint = document.createElement('span');
    hint.className = 'bes-game-platform-scrollbar__hint';
    hint.textContent = '↔';
    hint.setAttribute('aria-hidden', 'true');

    const range = document.createElement('input');
    range.className = 'bes-game-platform-scrollbar__range';
    range.type = 'range';
    range.min = '0';
    range.max = '0';
    range.step = '1';
    range.value = '0';
    range.setAttribute('aria-label', 'Cuộn ngang để xem toàn bộ trò chơi');

    const end = document.createElement('span');
    end.className = 'bes-game-platform-scrollbar__end';
    end.textContent = '↔';
    end.setAttribute('aria-hidden', 'true');

    bar.append(hint, range, end);
    row.insertAdjacentElement('afterend', bar);

    let syncingFromRange = false;

    const syncMetrics = () => {
      if (!row.isConnected || !bar.isConnected) return;
      const max = Math.max(0, Math.round(row.scrollWidth - row.clientWidth));
      range.max = String(max);
      range.value = String(Math.min(max, Math.max(0, Math.round(row.scrollLeft))));
      bar.classList.toggle('is-disabled', max <= 1);
      range.disabled = max <= 1;
    };

    range.addEventListener('input', () => {
      syncingFromRange = true;
      row.scrollLeft = Number(range.value) || 0;
      syncingFromRange = false;
    });

    row.addEventListener('scroll', () => {
      if (!syncingFromRange) {
        range.value = String(Math.max(0, Math.min(Number(range.max) || 0, Math.round(row.scrollLeft))));
      }
    }, { passive: true });

    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(syncMetrics)
      : null;
    resizeObserver?.observe(row);

    // Card lists can change after approval/admin updates without resizing the row itself.
    const mutationObserver = new MutationObserver(syncMetrics);
    mutationObserver.observe(row, { childList: true, subtree: false });

    scrollbarState.set(row, { bar, range, syncMetrics, resizeObserver, mutationObserver });
    window.requestAnimationFrame(syncMetrics);
    window.setTimeout(syncMetrics, 250);
    window.setTimeout(syncMetrics, 900);
  }

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
    document.querySelectorAll(SELECTOR).forEach((row) => {
      bindDragScroll(row);
      ensureVisibleScrollbar(row);
      scrollbarState.get(row)?.syncMetrics?.();
    });
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
