(() => {
  const STYLE_ID = 'bes-ttcm-status-badges-v1-style';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .ttcm-reader-status {
        display: inline-flex !important;
        align-items: center;
        gap: 6px;
        min-height: 24px;
        padding: 0 9px;
        border: 1px solid transparent;
        border-radius: 999px;
        white-space: nowrap;
        font-size: 11px;
        font-weight: 850;
        line-height: 1;
        letter-spacing: 0;
      }
      .ttcm-reader-status::before {
        content: '';
        width: 6px;
        height: 6px;
        flex: 0 0 6px;
        border-radius: 50%;
        background: currentColor;
        opacity: .9;
      }
      .ttcm-reader-status.is-new {
        color: #155fc9;
        background: #eaf3ff;
        border-color: #c9defd;
      }
      .ttcm-reader-status.is-expired {
        color: #b83f32;
        background: #fff0ec;
        border-color: #f0c1b7;
      }
      .ttcm-reader-card.is-new {
        box-shadow: inset 3px 0 0 #2d72df, 0 8px 22px rgba(31, 99, 216, .08) !important;
      }
      .ttcm-reader-card.is-expired {
        border-color: #efc6bd !important;
        background: #fffaf8 !important;
        box-shadow: inset 3px 0 0 #d95345 !important;
      }
      .ttcm-reader-card.is-expired .ttcm-reader-card-title {
        color: #5f342f;
      }
      .ttcm-reader-card.is-expired .ttcm-reader-due {
        color: #a63d31 !important;
        background: #fff0ec !important;
        border-color: #f0c1b7 !important;
      }
      .ttcm-reader-detail.is-expired .ttcm-reader-detail-due {
        border-color: #efc1b7 !important;
        background: #fff4f1 !important;
        color: #9d382d !important;
      }
      .ttcm-reader-detail.is-new .ttcm-reader-detail-title::after {
        content: '';
        display: block;
        width: 68px;
        height: 3px;
        margin-top: 14px;
        border-radius: 999px;
        background: #2d72df;
      }
    `;
    document.head.appendChild(style);
  }

  function text(node) {
    return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function classifyCard(card) {
    const due = card.querySelector('.ttcm-reader-due');
    const dueText = text(due);
    const expired = /Đã đến hạn|Đã hết hạn/i.test(dueText);
    const unread = card.classList.contains('is-unread');
    const activeDeadline = /Còn\s+\d+|Sắp đến hạn/i.test(dueText);

    if (expired) return { key: 'expired', label: 'Đã hết hạn' };
    if (unread || activeDeadline) return { key: 'new', label: 'Thông báo mới' };
    return null;
  }

  function hideLegacyNew(meta) {
    Array.from(meta?.children || []).forEach((node) => {
      if (node.classList?.contains('ttcm-reader-status')) return;
      if ((node.tagName === 'B' || node.tagName === 'I') && /^\s*Mới\s*$/i.test(text(node))) {
        node.style.display = 'none';
        node.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function syncCard(card) {
    const meta = card.querySelector('.ttcm-reader-card-meta');
    if (!meta) return;

    hideLegacyNew(meta);

    const due = card.querySelector('.ttcm-reader-due');
    if (due && /Đã đến hạn/i.test(text(due))) {
      due.textContent = text(due).replace(/Đã đến hạn/gi, 'Đã hết hạn');
    }

    const status = classifyCard(card);
    card.classList.remove('is-new', 'is-expired');

    let badge = meta.querySelector('.ttcm-reader-status');
    if (!status) {
      badge?.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement('span');
      meta.appendChild(badge);
    }
    badge.className = `ttcm-reader-status is-${status.key}`;
    badge.textContent = status.label;
    card.classList.add(`is-${status.key}`);
  }

  function syncDetail() {
    const detail = document.querySelector('.ttcm-reader-detail');
    if (!detail) return;

    const meta = detail.querySelector('.ttcm-reader-detail-meta');
    if (!meta) return;

    const selected = document.querySelector('.ttcm-reader-card.is-selected');
    const status = selected ? classifyCard(selected) : null;

    detail.classList.remove('is-new', 'is-expired');
    let badge = meta.querySelector('.ttcm-reader-status');

    if (!status) {
      badge?.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement('span');
      meta.appendChild(badge);
    }
    badge.className = `ttcm-reader-status is-${status.key}`;
    badge.textContent = status.label;
    detail.classList.add(`is-${status.key}`);

    const detailDue = detail.querySelector('.ttcm-reader-detail-due');
    if (detailDue && /Đã đến hạn/i.test(text(detailDue))) {
      detailDue.innerHTML = detailDue.innerHTML.replace(/Đã đến hạn/gi, 'Đã hết hạn');
    }
  }

  function sync() {
    ensureStyle();
    document.querySelectorAll('.ttcm-reader-card').forEach(syncCard);
    syncDetail();
  }

  let frame = 0;
  function schedule() {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      sync();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync, { once: true });
  } else {
    sync();
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
})();
