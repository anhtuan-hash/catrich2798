(() => {
  let pendingCard = null;
  let collecting = false;

  const waitFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const openButtonOf = (card) => [...card.querySelectorAll('footer button')].find((button) => button.textContent.includes('hồ sơ chuyên môn'));

  const collapseOthers = (except) => {
    document.querySelectorAll('.tmh-inline-expansion').forEach((panel) => {
      if (panel === except) return;
      panel.hidden = true;
      const card = panel.previousElementSibling;
      const button = card && openButtonOf(card);
      if (button) button.textContent = 'Xem nội dung';
    });
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !button.textContent.includes('hồ sơ chuyên môn')) return;
    const card = button.closest('.tmh-method-card');
    if (!card) return;

    const existing = card.nextElementSibling?.classList.contains('tmh-inline-expansion') ? card.nextElementSibling : null;
    if (existing) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const willOpen = existing.hidden;
      collapseOthers(willOpen ? existing : null);
      existing.hidden = !willOpen;
      button.textContent = willOpen ? 'Thu gọn nội dung' : 'Xem nội dung';
      if (willOpen) existing.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    pendingCard = card;
    collapseOthers(null);
  }, true);

  const collectDrawer = async (layer) => {
    if (collecting || !pendingCard || !document.contains(pendingCard)) return;
    collecting = true;
    layer.classList.add('tmh-inline-collecting');

    try {
      const drawer = layer.querySelector('.tmh-drawer');
      const tabs = [...drawer.querySelectorAll('.tmh-drawer-tabs button')];
      if (!drawer || !tabs.length) throw new Error('Drawer content unavailable');

      const expansion = document.createElement('section');
      expansion.className = 'tmh-inline-expansion';
      expansion.style.setProperty('--method-color', getComputedStyle(drawer.querySelector('header')).getPropertyValue('--method-color') || '#0b57d0');

      const icon = drawer.querySelector('header > div > span')?.textContent?.trim() || 'EN';
      const english = drawer.querySelector('header small')?.textContent?.trim() || 'Teaching method';
      const vietnamese = drawer.querySelector('header h2')?.textContent?.trim() || 'Nội dung phương pháp';
      expansion.innerHTML = `<header class="tmh-inline-head"><span class="tmh-inline-icon">${icon}</span><div class="tmh-inline-title"><small>${english}</small><h3>${vietnamese}</h3></div><button type="button" class="tmh-inline-close" aria-label="Thu gọn">⌃</button></header><div class="tmh-inline-body"></div>`;
      const body = expansion.querySelector('.tmh-inline-body');

      for (let index = 0; index < tabs.length; index += 1) {
        tabs[index].click();
        await waitFrame();
        const source = drawer.querySelector('.tmh-drawer-scroll');
        const details = document.createElement('details');
        details.className = 'tmh-inline-section';
        if (index === 0) details.open = true;
        const summary = document.createElement('summary');
        summary.textContent = tabs[index].textContent.trim();
        const panel = document.createElement('div');
        panel.className = 'tmh-inline-panel';
        panel.appendChild(source.cloneNode(true));
        details.append(summary, panel);
        body.appendChild(details);
      }

      const card = pendingCard;
      card.insertAdjacentElement('afterend', expansion);
      const button = openButtonOf(card);
      if (button) button.textContent = 'Thu gọn nội dung';

      expansion.querySelector('.tmh-inline-close')?.addEventListener('click', () => {
        expansion.hidden = true;
        if (button) button.textContent = 'Xem nội dung';
      });

      expansion.querySelectorAll('.tmh-copy-panel button').forEach((copyButton) => {
        copyButton.addEventListener('click', () => card.querySelector('footer button.copy')?.click());
      });

      drawer.querySelector('header > button')?.click();
      await waitFrame();
      expansion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      console.error('[TeachingMethodsInline]', error);
      layer.classList.remove('tmh-inline-collecting');
    } finally {
      pendingCard = null;
      collecting = false;
      document.documentElement.classList.remove('tmh-drawer-open');
    }
  };

  const observer = new MutationObserver(() => {
    const layer = document.querySelector('.tmh-drawer-layer');
    if (layer) collectDrawer(layer);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
