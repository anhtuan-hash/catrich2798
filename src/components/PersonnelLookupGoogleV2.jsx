import React, { useEffect } from 'react';
import PersonnelLookupGoogleV2Base from './PersonnelLookupGoogleV2Base.jsx';
import '../styles/personnel-google-material-v3.css';

const FILTER_COPY = {
  vi: {
    title: 'Lọc hồ sơ nhân sự',
    clear: 'Xóa bộ lọc',
    hint: 'Chọn một điều kiện để lọc ngay danh sách.',
  },
  en: {
    title: 'Filter personnel profiles',
    clear: 'Clear filter',
    hint: 'Choose a condition to filter the list immediately.',
  },
};

function PersonnelFilterController({ language = 'vi' }) {
  useEffect(() => {
    let rootObserver = null;
    let cleanupMounted = null;
    let stopped = false;

    const mount = () => {
      if (stopped) return false;
      const root = document.querySelector('#dashboard-personnel-v2');
      if (!root || root.dataset.materialFilterReady === 'true') return Boolean(root);

      const trigger = root.querySelector('.pgt-filter-button');
      const chipHost = root.querySelector('.pgt-filter-chips');
      const toolbar = root.querySelector('.pgt-toolbar');
      const chips = chipHost ? [...chipHost.querySelectorAll('button')] : [];
      if (!trigger || !toolbar || !chips.length) return false;

      root.dataset.materialFilterReady = 'true';
      const copy = FILTER_COPY[language] || FILTER_COPY.vi;
      const panel = document.createElement('div');
      panel.className = 'pgt-advanced-filter-panel';
      panel.hidden = true;
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', copy.title);

      const head = document.createElement('div');
      head.className = 'pgt-advanced-filter-head';
      const headCopy = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = copy.title;
      const hint = document.createElement('small');
      hint.textContent = copy.hint;
      headCopy.append(title, hint);
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'pgt-filter-clear';
      clear.textContent = copy.clear;
      head.append(headCopy, clear);

      const options = document.createElement('div');
      options.className = 'pgt-advanced-filter-options';
      const optionMap = new Map();

      chips.forEach((chip) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'pgt-advanced-filter-option';
        option.innerHTML = chip.innerHTML;
        option.addEventListener('click', () => {
          chip.click();
          panel.hidden = true;
          root.classList.remove('is-filter-panel-open');
          trigger.setAttribute('aria-expanded', 'false');
        });
        optionMap.set(chip, option);
        options.append(option);
      });

      panel.append(head, options);
      toolbar.append(panel);
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-expanded', 'false');

      const allChip = chips.find((chip) => chip.classList.contains('is-all')) || chips[0];
      const sync = () => {
        optionMap.forEach((option, chip) => {
          const active = chip.classList.contains('is-active');
          option.classList.toggle('is-active', active);
          option.setAttribute('aria-pressed', String(active));
          chip.setAttribute('aria-pressed', String(active));
        });
        const hasActiveFilter = !allChip?.classList.contains('is-active');
        trigger.classList.toggle('is-active', hasActiveFilter);
      };

      const togglePanel = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const opening = panel.hidden;
        panel.hidden = !opening;
        root.classList.toggle('is-filter-panel-open', opening);
        trigger.setAttribute('aria-expanded', String(opening));
        if (opening) sync();
      };

      const clearFilter = () => {
        allChip?.click();
        panel.hidden = true;
        root.classList.remove('is-filter-panel-open');
        trigger.setAttribute('aria-expanded', 'false');
      };

      const closeOutside = (event) => {
        if (panel.hidden || panel.contains(event.target) || trigger.contains(event.target)) return;
        panel.hidden = true;
        root.classList.remove('is-filter-panel-open');
        trigger.setAttribute('aria-expanded', 'false');
      };

      const closeOnEscape = (event) => {
        if (event.key !== 'Escape' || panel.hidden) return;
        panel.hidden = true;
        root.classList.remove('is-filter-panel-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      };

      const chipObserver = new MutationObserver(sync);
      chipObserver.observe(chipHost, { subtree: true, attributes: true, attributeFilter: ['class'] });
      trigger.addEventListener('click', togglePanel);
      clear.addEventListener('click', clearFilter);
      document.addEventListener('pointerdown', closeOutside, true);
      document.addEventListener('keydown', closeOnEscape);
      sync();

      cleanupMounted = () => {
        chipObserver.disconnect();
        trigger.removeEventListener('click', togglePanel);
        clear.removeEventListener('click', clearFilter);
        document.removeEventListener('pointerdown', closeOutside, true);
        document.removeEventListener('keydown', closeOnEscape);
        panel.remove();
        delete root.dataset.materialFilterReady;
      };
      return true;
    };

    if (!mount()) {
      rootObserver = new MutationObserver(() => {
        if (mount()) rootObserver?.disconnect();
      });
      rootObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      stopped = true;
      rootObserver?.disconnect();
      cleanupMounted?.();
    };
  }, [language]);

  return null;
}

export default function PersonnelLookupGoogleV2(props) {
  return <>
    <PersonnelLookupGoogleV2Base {...props} />
    <PersonnelFilterController language={props.language} />
  </>;
}
