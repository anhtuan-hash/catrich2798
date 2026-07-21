import { createTransfer } from './contentTransfer.js';
import { addHistoryEntry } from './library.js';
import { getAiGovernanceSettings, isAiActionAllowed, recordAiAction } from './aiGovernance.js';

export const AI_ACTION_EVENT = 'bes-ai-action-completed';

export const AI_ACTIONS = Object.freeze({
  'current-app': {
    id: 'current-app',
    target: 'current-app',
    icon: '↳',
    title: 'Use in current app',
    titleVi: 'Dùng trong ứng dụng hiện tại',
    desc: 'Insert the answer into the active editor or input.',
    descVi: 'Đưa câu trả lời vào vùng soạn thảo đang mở.',
  },
  'word2graph': {
    id: 'word2graph',
    target: 'word2graph',
    icon: 'WG',
    title: 'Build WordGraph',
    titleVi: 'Tạo WordGraph',
    desc: 'Turn vocabulary and relationships into a WordGraph source.',
    descVi: 'Chuyển từ vựng và quan hệ từ thành nguồn WordGraph.',
    hash: '#/tool/word2graph',
  },
  'textlab-activities': {
    id: 'textlab-activities',
    target: 'textlab-activities',
    icon: 'TL',
    title: 'Create activity',
    titleVi: 'Tạo hoạt động TextLab',
    desc: 'Use the answer to build an interactive classroom activity.',
    descVi: 'Dùng câu trả lời để tạo hoạt động tương tác.',
    hash: '#/tool/textlab-activities',
  },
  library: {
    id: 'library',
    target: 'library',
    icon: '▤',
    title: 'Save to Library',
    titleVi: 'Lưu vào Thư viện',
    desc: 'Save the answer as a reusable private library item.',
    descVi: 'Lưu câu trả lời thành học liệu riêng có thể tái sử dụng.',
    hash: '#/library',
  },
});

function localized(action, language = 'vi') {
  return {
    ...action,
    label: language === 'vi' ? action.titleVi : action.title,
    description: language === 'vi' ? action.descVi : action.desc,
  };
}

function hasAny(text, terms) {
  const value = String(text || '').toLowerCase();
  return terms.some((term) => value.includes(term));
}

export function buildAiActionSuggestions({ message = '', currentRoute = '', selectedTool = null, language = 'vi' } = {}) {
  const text = String(message || '');
  const currentSlug = selectedTool?.slug || currentRoute;
  const ranked = [];
  const add = (id, score) => {
    const action = AI_ACTIONS[id];
    if (!action || !isAiActionAllowed(action.target) || action.target === currentSlug) return;
    const existing = ranked.find((item) => item.id === id);
    if (existing) existing.score = Math.max(existing.score, score);
    else ranked.push({ ...localized(action, language), score });
  };

  add('current-app', 100);
  add('library', 45);
  add('word2graph', hasAny(text, ['vocabulary', 'word family', 'collocation', 'synonym', 'từ vựng', 'nghĩa', 'phát âm']) ? 88 : 42);
  add('textlab-activities', hasAny(text, ['game', 'activity', 'matching', 'sorting', 'hoạt động', 'trò chơi']) ? 84 : 40);

  return ranked.sort((a, b) => b.score - a.score).slice(0, 5).map(({ score, ...action }) => action);
}

function insertIntoCurrentApp(text, context = {}) {
  const detail = {
    text,
    route: context.currentRoute || '',
    toolSlug: context.selectedTool?.slug || '',
    messageId: context.messageId || '',
    handled: false,
    markHandled() { this.handled = true; },
  };
  window.dispatchEvent(new CustomEvent('bes-ai-use-result', { detail }));
  if (detail.handled) return { ok: true, mode: 'event' };

  const candidates = [...document.querySelectorAll('.wp8-page-stage textarea:not([disabled]), .wp8-page-stage input[type="text"]:not([disabled]), .wp8-page-stage [contenteditable="true"]')]
    .filter((element) => !element.closest('.ai-messenger-root') && element.offsetParent !== null);
  const target = candidates[0];
  if (!target) return { ok: false, reason: 'no-editor' };
  if (target.isContentEditable) {
    target.textContent = text;
    target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  } else {
    const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) setter.call(target, text); else target.value = text;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }
  target.focus();
  return { ok: true, mode: 'field' };
}

export function prepareAiAction(actionId, payload = {}, context = {}) {
  const action = AI_ACTIONS[actionId];
  if (!action) throw new Error('Unknown AI action.');
  const text = String(payload.text || payload.content || '').trim();
  if (!text) throw new Error('The AI result is empty.');
  const language = context.language || 'vi';
  return {
    id: `ai-plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action: localized(action, language),
    text,
    title: String(payload.title || (language === 'vi' ? 'Kết quả từ Brian AI' : 'Brian AI result')).slice(0, 160),
    source: String(payload.source || 'brian-ai'),
    messageId: String(payload.messageId || ''),
    createdAt: Date.now(),
    requiresConfirmation: getAiGovernanceSettings().requireActionConfirmation,
    context: {
      currentRoute: context.currentRoute || '',
      selectedTool: context.selectedTool || null,
      currentUser: context.currentUser || null,
      language,
    },
  };
}

export async function executeAiAction(plan) {
  if (!plan?.action?.id) throw new Error('Invalid AI action plan.');
  const action = AI_ACTIONS[plan.action.id];
  if (!action || !isAiActionAllowed(action.target)) {
    recordAiAction({ actionId: plan.action.id, label: plan.action.label, target: action?.target || '', source: plan.source, status: 'blocked', detail: { reason: 'disabled' } });
    throw new Error('This AI action is disabled by the administrator.');
  }

  try {
    let result;
    if (action.id === 'current-app') {
      result = insertIntoCurrentApp(plan.text, { ...plan.context, messageId: plan.messageId });
      if (!result.ok) throw new Error('No compatible editor is visible in the current app.');
    } else if (action.id === 'library') {
      const item = addHistoryEntry({
        title: plan.title,
        content: plan.text,
        kind: 'ai-output',
        sourceApp: 'brian-ai',
        sourceAppTitle: 'Brian AI',
        tags: ['Brian AI', 'AI Action'],
        metadata: { route: plan.context.currentRoute, tool: plan.context.selectedTool?.slug || '', messageId: plan.messageId },
      });
      result = { ok: true, itemId: item.id, hash: '#/library' };
    } else {
      const transfer = createTransfer(plan.context.currentUser, {
        target: action.target,
        type: 'ai-action',
        title: plan.title,
        sourceApp: 'brian-ai',
        sourceTitle: 'Brian AI',
        content: plan.text,
        metadata: {
          route: plan.context.currentRoute,
          tool: plan.context.selectedTool?.slug || '',
          messageId: plan.messageId,
          actionId: action.id,
          actionPlanId: plan.id,
        },
      });
      if (!transfer) throw new Error('Could not create the cross-app transfer.');
      result = { ok: true, transferId: transfer.id, hash: action.hash };
    }

    recordAiAction({ actionId: action.id, label: plan.action.label, target: action.target, source: plan.source, status: 'success', detail: result });
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(AI_ACTION_EVENT, { detail: { plan, result } }));
    return result;
  } catch (error) {
    recordAiAction({ actionId: action.id, label: plan.action.label, target: action.target, source: plan.source, status: 'error', detail: { error: error?.message || String(error) } });
    throw error;
  }
}
