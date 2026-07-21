/**
 * Brian AI Task Registry
 *
 * Normalizes the many historical AI profile names used across Brian English
 * Studio into a small, stable task contract. The registry is intentionally
 * backward compatible: existing callers can keep passing governanceProfile,
 * profile, loadingLabel, or only a prompt.
 */

export const AI_TASK_REGISTRY = Object.freeze({
  diagnostic: {
    id: 'diagnostic',
    label: 'Provider connection test',
    governanceProfile: 'diagnostic',
    routingMode: 'manual',
    outputKind: 'text',
  },
  chat: {
    id: 'chat',
    label: 'Brian AI Chat',
    governanceProfile: 'chat',
    routingMode: 'smart',
    outputKind: 'text',
  },
  'teaching-content': {
    id: 'teaching-content',
    label: 'Teaching content creation',
    governanceProfile: 'worksheet',
    routingMode: 'smart',
    outputKind: 'mixed',
  },
  worksheet: {
    id: 'worksheet',
    label: 'Worksheet generation',
    governanceProfile: 'worksheet',
    routingMode: 'smart',
    outputKind: 'json',
  },
  exam: {
    id: 'exam',
    label: 'Exam generation',
    governanceProfile: 'worksheet',
    routingMode: 'smart',
    outputKind: 'json',
  },
  grammar: {
    id: 'grammar',
    label: 'Grammar content generation',
    governanceProfile: 'worksheet',
    routingMode: 'smart',
    outputKind: 'json',
  },
  writing: {
    id: 'writing',
    label: 'Writing coach',
    governanceProfile: 'worksheet',
    routingMode: 'quality',
    outputKind: 'mixed',
  },
  reading: {
    id: 'reading',
    label: 'Reading content generation',
    governanceProfile: 'worksheet',
    routingMode: 'long-context',
    outputKind: 'mixed',
  },
  speaking: {
    id: 'speaking',
    label: 'Speaking coach',
    governanceProfile: 'worksheet',
    routingMode: 'quality',
    outputKind: 'json',
  },
  lesson: {
    id: 'lesson',
    label: 'Lesson design',
    governanceProfile: 'document',
    routingMode: 'long-context',
    outputKind: 'mixed',
  },
  document: {
    id: 'document',
    label: 'Document analysis',
    governanceProfile: 'document',
    routingMode: 'long-context',
    outputKind: 'mixed',
  },
  'image-analysis': {
    id: 'image-analysis',
    label: 'Image and vision analysis',
    governanceProfile: 'document',
    routingMode: 'vision',
    outputKind: 'text',
  },
  'image-edit': {
    id: 'image-edit',
    label: 'Image editing',
    governanceProfile: 'document',
    routingMode: 'vision',
    outputKind: 'image',
  },
  administration: {
    id: 'administration',
    label: 'School administration',
    governanceProfile: 'administration',
    routingMode: 'quality',
    outputKind: 'mixed',
  },
  default: {
    id: 'default',
    label: 'General AI task',
    governanceProfile: 'default',
    routingMode: 'smart',
    outputKind: 'mixed',
  },
});

const TASK_ALIASES = Object.freeze({
  'provider-test': 'diagnostic',
  'connection-test': 'diagnostic',
  diagnostic: 'diagnostic',
  chat: 'chat',
  'brian-ai-chat': 'chat',
  worksheet: 'worksheet',
  'teacher-content-creation': 'teaching-content',
  'teaching-content': 'teaching-content',
  exam: 'exam',
  grammar: 'grammar',
  'grammar-builder': 'grammar',
  writing: 'writing',
  reading: 'reading',
  speaking: 'speaking',
  lesson: 'lesson',
  'lesson-design': 'lesson',
  'lesson-architect': 'lesson',
  document: 'document',
  'document-analysis': 'document',
  'image-analysis': 'image-analysis',
  vision: 'image-analysis',
  'image-edit': 'image-edit',
  administration: 'administration',
  'school-administration': 'administration',
  department: 'administration',
  homeroom: 'administration',
  default: 'default',
});

function normalizeKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-');
}

function inferTaskId(options = {}) {
  const explicit = normalizeKey(
    options.aiTaskId
      || options.taskId
      || options.task
      || options.governanceProfile
      || options.profile
      || options.aiProfile,
  );
  if (explicit && TASK_ALIASES[explicit]) return TASK_ALIASES[explicit];

  const signal = `${options.loadingLabel || ''} ${options.aiLabel || ''} ${String(options.prompt || '').slice(0, 1800)}`.toLowerCase();
  if (/connection test|kiểm tra kết nối|brian_ok|api ok/.test(signal)) return 'diagnostic';
  if (/worksheet|phiếu bài tập/.test(signal)) return 'worksheet';
  if (/đề thi|kiểm tra trắc nghiệm|test builder/.test(signal)) return 'exam';
  if (/grammar builder|ngữ pháp|verb form|word form/.test(signal)) return 'grammar';
  if (/writing coach|bài viết|rubric/.test(signal)) return 'writing';
  if (/reading passage|bài đọc/.test(signal)) return 'reading';
  if (/bài nói|speech assessment/.test(signal)) return 'speaking';
  if (/pronunciation|phát âm|ipa|shadowing/.test(signal)) return 'teaching-content';
  if (/lesson architect|giáo án|lesson plan|kế hoạch bài dạy/.test(signal)) return 'lesson';
  if (/document|tài liệu|pdf|docx|phân tích nguồn|summari[sz]e|tóm tắt/.test(signal)) return 'document';
  if (/tổ chuyên môn|chủ nhiệm|phụ huynh|học sinh|báo cáo|thông báo|biên bản|hành chính/.test(signal)) return 'administration';
  if (/chat|brian ai|copilot|trợ lý/.test(signal)) return 'chat';
  return 'default';
}

export function resolveAiTask(options = {}) {
  const id = inferTaskId(options);
  const task = AI_TASK_REGISTRY[id] || AI_TASK_REGISTRY.default;
  return {
    ...task,
    requiresJson: options.responseMimeType === 'application/json' || task.outputKind === 'json',
    privacyLevel: options.privacyLevel || 'normal',
  };
}

export function enrichAiTaskOptions(options = {}) {
  const task = resolveAiTask(options);
  return {
    ...options,
    aiTaskId: task.id,
    governanceProfile: task.governanceProfile,
    routingMode: options.routingMode,
    routingHint: options.routingHint || task.routingMode,
    privacyLevel: options.privacyLevel || task.privacyLevel,
  };
}

export function getAiTaskInfo(taskId = 'default') {
  const normalized = TASK_ALIASES[normalizeKey(taskId)] || normalizeKey(taskId) || 'default';
  return AI_TASK_REGISTRY[normalized] || AI_TASK_REGISTRY.default;
}
