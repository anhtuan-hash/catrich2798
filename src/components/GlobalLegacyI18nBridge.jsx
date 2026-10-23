import { useEffect } from 'react';
import { assessmentText } from '../utils/assessmentBilingual.js';
import { LEGACY_SITE_EN } from '../utils/legacySiteTranslations.js';

/*
 * Compatibility bridge for older React views without language props.
 * Primary UI should still use explicit locale-aware components. This bridge
 * translates ONLY known, exact-match UI strings in DOM labels/text/attributes.
 * Never send data to an API, never use machine-generated guesses, and never
 * modify input values, persisted data or rich/editor/user-generated content.
 *
 * New changes are incremental (MutationObserver + animation-frame batching),
 * avoiding recurring full-page sweeps on Android and low-power devices.
 */
const DO_NOT_TRANSLATE = [
  '[data-i18n-ignore]', '[translate="no"]', '.notranslate',
  '[contenteditable]', '[role="textbox"]', '.ql-editor', '.ProseMirror',
  '.tiptap', '.markdown-body', '.rich-text-content', '[data-user-content]',
  '.cm-editor', '.monaco-editor',
].join(',');
const EXCLUDED_ELEMENTS = new Set([
  'SCRIPT','STYLE','NOSCRIPT','TEXTAREA','PRE','CODE','SVG','MATH','IFRAME',
  'CANVAS','VIDEO','AUDIO','SELECT'
]);
const LABEL_ATTRIBUTES = ['placeholder','aria-label','title'];
const textMemory = new WeakMap();
const attributesMemory = new WeakMap();
const COUNT_TERMS = Object.freeze({
  'học sinh':'students', 'giáo viên':'teachers', 'lớp':'classes',
  'hoạt động':'activities', 'yêu cầu':'requests', 'sự kiện':'events',
  'nhiệm vụ':'tasks', 'câu hỏi':'questions', 'bài kiểm tra':'assessments',
});

function exactEnglish(source) {
  const known = LEGACY_SITE_EN[source];
  if (known !== undefined) return known;
  const assessment = assessmentText(source, 'en');
  if (assessment !== source) return assessment;
  const count = /^(\d{1,6})\s+(học sinh|giáo viên|lớp|hoạt động|yêu cầu|sự kiện|nhiệm vụ|câu hỏi|bài kiểm tra)$/.exec(source);
  if (count) return count[1] + ' ' + COUNT_TERMS[count[2]];
  return null;
}

function eligible(element) {
  if (!element || element.closest?.(DO_NOT_TRANSLATE)) return false;
  if (EXCLUDED_ELEMENTS.has(element.tagName)) return false;
  // Without an explicit value, <option>'s displayed text is its form value.
  // Changing it may corrupt class/subject/purpose selection and persistence.
  if (element.tagName === 'OPTION' && !element.hasAttribute('value')) return false;
  return true;
}

function localizedContent(original, translation) {
  const leading = original.match(/^\s*/)?.[0] || '';
  const trailing = original.match(/\s*$/)?.[0] || '';
  return leading + translation + trailing;
}

function updateText(node, language) {
  if (!node || !node.parentElement || !eligible(node.parentElement)) return;
  const visible = node.nodeValue || '';
  const previous = textMemory.get(node);
  let source = visible;
  if (previous && visible === previous.display) source = previous.source;
  const normalized = source.trim();
  if (!normalized) return;
  const english = exactEnglish(normalized);
  if (english == null || english === normalized) {
    if (language === 'vi' && previous && visible === previous.display) {
      node.nodeValue = previous.source;
      textMemory.delete(node);
    }
    return;
  }
  const next = language === 'en' ? localizedContent(source, english) : source;
  if (visible !== next) node.nodeValue = next;
  if (language === 'en') textMemory.set(node, { source, display: next });
  else textMemory.delete(node);
}

function updateAttribute(element, attr, language) {
  if (!eligible(element) || !element.hasAttribute(attr)) return;
  const value = element.getAttribute(attr) || '';
  const state = attributesMemory.get(element);
  const remembered = state?.get(attr);
  const source = remembered && remembered.display === value ? remembered.source : value;
  const english = exactEnglish(source.trim());
  if (!english || english === source.trim()) {
    if (language === 'vi' && remembered && value === remembered.display) {
      element.setAttribute(attr, remembered.source);
      state.delete(attr);
    }
    return;
  }
  const next = language === 'en' ? localizedContent(source, english) : source;
  if (value !== next) element.setAttribute(attr, next);
  if (language === 'en') {
    const map = state || new Map();
    map.set(attr, { source, display: next });
    if (!state) attributesMemory.set(element, map);
  } else if (state) state.delete(attr);
}

function syncSubtree(root, language) {
  if (!root) return;
  if (root.nodeType === 3) { updateText(root, language); return; }
  if (root.nodeType !== 1 && root.nodeType !== 9) return;
  if (root.nodeType === 1) {
    if (!eligible(root)) return;
    LABEL_ATTRIBUTES.forEach(attr => updateAttribute(root, attr, language));
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const item = walker.currentNode;
    if (item.nodeType === 3) updateText(item, language);
    else if (item.nodeType === 1 && eligible(item)) {
      LABEL_ATTRIBUTES.forEach(attr => updateAttribute(item, attr, language));
    }
  }
}

export default function GlobalLegacyI18nBridge({ language = 'vi' }) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    let frame = 0;
    const pending = new Set();
    // Also covers portals outside .app-shell, such as drawers and dialogs.
    syncSubtree(document.body, language);
    const schedule = node => {
      if (node) pending.add(node);
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const candidates = [...pending];
        pending.clear();
        // Do not rescan a node already covered by a newly added ancestor.
        for (const item of candidates) {
          if (!item.isConnected) continue;
          if (candidates.some(other => other !== item && other.nodeType === 1 && other.contains?.(item))) continue;
          syncSubtree(item, language);
        }
      });
    };
    const observer = new MutationObserver(changes => {
      for (const change of changes) {
        if (change.type === 'characterData') schedule(change.target);
        else if (change.type === 'attributes') schedule(change.target);
        else if (change.type === 'childList') {
          for (const node of change.addedNodes) schedule(node);
        }
      }
    });
    observer.observe(document.body, {
      childList: true, characterData: true, subtree: true,
      attributes: true, attributeFilter: LABEL_ATTRIBUTES,
    });
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      pending.clear();
    };
  }, [language]);
  return null;
}
