/**
 * Brian Unified AI Prompt Registry
 *
 * Central source of truth for application-level AI tasks. Every registered task
 * owns a stable task id, prompt version, routing profile, privacy posture,
 * generation defaults and output contract. Prompt text can still be supplied by
 * legacy callers during migration, but it is always executed under a versioned
 * registry contract.
 */

const jsonContract = (requiredFields = [], extra = {}) => ({
  kind: 'json',
  requiredFields,
  ...extra,
});

const task = ({
  id,
  app,
  label,
  group = 'default',
  version = '1.0.0',
  output = 'text',
  governanceProfile = 'default',
  routingHint = 'smart',
  privacyProfile = 'standard',
  maxOutputTokens = 1600,
  temperature = 0.45,
  systemInstruction = '',
  validation = null,
  requiredInputs = [],
  enabled = true,
}) => Object.freeze({
  id,
  app,
  label,
  group,
  version,
  output,
  governanceProfile,
  routingHint,
  privacyProfile,
  maxOutputTokens,
  temperature,
  systemInstruction,
  validation,
  requiredInputs,
  enabled,
});

export const AI_PROMPT_REGISTRY_VERSION = 'bes-ai-prompt-registry/1.0';

export const AI_PROMPT_REGISTRY = Object.freeze({
  'system.connectionTest': task({ id: 'system.connectionTest', app: 'Provider Hub', label: 'Kiểm tra kết nối provider', group: 'diagnostic', governanceProfile: 'diagnostic', routingHint: 'manual', maxOutputTokens: 96, temperature: 0, version: '1.0.0' }),
  'assistant.pageChat': task({ id: 'assistant.pageChat', app: 'Brian AI', label: 'Trợ lý theo ngữ cảnh trang', group: 'chat', governanceProfile: 'chat', routingHint: 'smart', privacyProfile: 'page-context', maxOutputTokens: 1800, version: '2.0.0' }),
  'assistant.copilot': task({ id: 'assistant.copilot', app: 'Shared AI Copilot', label: 'AI Copilot dùng chung', group: 'chat', governanceProfile: 'chat', routingHint: 'smart', maxOutputTokens: 1800, version: '1.1.0' }),
  'teaching.specializedGenerate': task({ id: 'teaching.specializedGenerate', app: 'Specialized Tools', label: 'Tạo nội dung công cụ chuyên biệt', group: 'teaching-content', governanceProfile: 'worksheet', routingHint: 'smart', maxOutputTokens: 3600, version: '1.0.0' }),

  'grammar.generateBatch': task({ id: 'grammar.generateBatch', app: 'Grammar Builder', label: 'Tạo batch câu hỏi ngữ pháp', group: 'grammar', governanceProfile: 'worksheet', routingHint: 'quality', maxOutputTokens: 5200, temperature: 0.42, output: 'json', version: '2.2.0' }),
  'textlab.generateActivity': task({ id: 'textlab.generateActivity', app: 'TextLab Activities', label: 'Tạo hoạt động tương tác', group: 'teaching-content', governanceProfile: 'worksheet', routingHint: 'fast', maxOutputTokens: 1800, temperature: 0.2, output: 'json', systemInstruction: 'Return exactly one compact valid JSON object. Encode line breaks inside string values as \\n and escape embedded double quotes. Never use markdown fences or repeat the teacher request.', validation: jsonContract(['templateId', 'content']), version: '1.5.0' }),

  'lesson.generatePlan': task({ id: 'lesson.generatePlan', app: 'Lesson Architect', label: 'Tạo giáo án', group: 'lesson', governanceProfile: 'document', routingHint: 'long-context', maxOutputTokens: 6400, temperature: 0.4, version: '2.0.0' }),
  'lesson.cleanEnglish': task({ id: 'lesson.cleanEnglish', app: 'Lesson Architect', label: 'Chuẩn hóa đầu ra tiếng Anh', group: 'lesson', governanceProfile: 'document', routingHint: 'quality', maxOutputTokens: 6400, temperature: 0.2, version: '1.1.0' }),
  'lesson.generateSlides': task({ id: 'lesson.generateSlides', app: 'Lesson Architect', label: 'Tạo nội dung slides', group: 'lesson', governanceProfile: 'document', routingHint: 'long-context', maxOutputTokens: 4800, version: '1.1.0' }),
  'lesson.curriculumExtract': task({ id: 'lesson.curriculumExtract', app: 'Lesson Architect', label: 'Trích xuất PPCT', group: 'lesson', governanceProfile: 'document', routingHint: 'long-context', maxOutputTokens: 5200, output: 'json', version: '1.1.0' }),
  'lesson.curriculumBuild': task({ id: 'lesson.curriculumBuild', app: 'Lesson Architect', label: 'Tạo chuỗi giáo án', group: 'lesson', governanceProfile: 'document', routingHint: 'long-context', maxOutputTokens: 7000, version: '1.1.0' }),
  'lesson.integration': task({ id: 'lesson.integration', app: 'English Lesson Integration', label: 'Tích hợp AI vào giáo án', group: 'lesson', governanceProfile: 'document', routingHint: 'long-context', maxOutputTokens: 5600, version: '2.0.0' }),

  'department.extractSchedule': task({ id: 'department.extractSchedule', app: 'Tổ chuyên môn', label: 'Trích lịch làm việc', group: 'administration', governanceProfile: 'administration', routingHint: 'long-context', privacyProfile: 'school-sensitive', maxOutputTokens: 2800, output: 'json', version: '1.1.0' }),
  'department.generateReport': task({ id: 'department.generateReport', app: 'Tổ chuyên môn', label: 'Tạo báo cáo chuyên môn', group: 'administration', governanceProfile: 'administration', routingHint: 'quality', privacyProfile: 'school-sensitive', maxOutputTokens: 3000, systemInstruction: 'Write professional Vietnamese school-department reports. Be specific and concise.', version: '1.1.0' }),
  'department.assistant': task({ id: 'department.assistant', app: 'Tổ chuyên môn', label: 'AI TTCM', group: 'administration', governanceProfile: 'administration', routingHint: 'quality', privacyProfile: 'school-sensitive', maxOutputTokens: 3600, version: '1.1.0' }),
  'department.polishDocument': task({ id: 'department.polishDocument', app: 'Tổ chuyên môn', label: 'Chuẩn hóa văn bản hành chính', group: 'administration', governanceProfile: 'administration', routingHint: 'quality', privacyProfile: 'school-sensitive', maxOutputTokens: 3000, systemInstruction: 'Polish Vietnamese school administrative documents. Keep facts unchanged and mark missing data with ellipses.', version: '1.1.0' }),

  'homeroom.writeComment': task({ id: 'homeroom.writeComment', app: 'Chủ nhiệm', label: 'Viết nhận xét học sinh', group: 'administration', governanceProfile: 'administration', routingHint: 'quality', privacyProfile: 'student-sensitive', maxOutputTokens: 520, temperature: 0.45, version: '1.1.0' }),
  'homeroom.planMeeting': task({ id: 'homeroom.planMeeting', app: 'Chủ nhiệm', label: 'Tạo nội dung sinh hoạt lớp', group: 'administration', governanceProfile: 'administration', routingHint: 'quality', privacyProfile: 'student-sensitive', maxOutputTokens: 1100, temperature: 0.55, output: 'json', version: '1.1.0' }),
  'homeroom.parentMessage': task({ id: 'homeroom.parentMessage', app: 'Chủ nhiệm', label: 'Soạn thông báo phụ huynh', group: 'administration', governanceProfile: 'administration', routingHint: 'quality', privacyProfile: 'student-sensitive', maxOutputTokens: 520, temperature: 0.55, version: '1.1.0' }),
  'homeroom.generateReport': task({ id: 'homeroom.generateReport', app: 'Chủ nhiệm', label: 'Tổng hợp báo cáo chủ nhiệm', group: 'administration', governanceProfile: 'administration', routingHint: 'quality', privacyProfile: 'student-sensitive', maxOutputTokens: 1000, temperature: 0.45, output: 'json', version: '1.1.0' }),
  'homeroom.importData': task({ id: 'homeroom.importData', app: 'Chủ nhiệm', label: 'Nhận diện dữ liệu nhập', group: 'administration', governanceProfile: 'administration', routingHint: 'long-context', privacyProfile: 'student-sensitive', maxOutputTokens: 2400, temperature: 0.1, output: 'json', version: '1.1.0' }),
  'homeroom.analytics': task({ id: 'homeroom.analytics', app: 'Chủ nhiệm', label: 'Phân tích xu hướng lớp', group: 'administration', governanceProfile: 'administration', routingHint: 'quality', privacyProfile: 'student-sensitive', maxOutputTokens: 2200, version: '1.0.0' }),

  'library.enrichResource': task({ id: 'library.enrichResource', app: 'Kho học liệu', label: 'Phân loại và làm giàu tài nguyên', group: 'document', governanceProfile: 'document', routingHint: 'long-context', maxOutputTokens: 2400, output: 'json', version: '1.1.0' }),
  'library.answerQuestion': task({ id: 'library.answerQuestion', app: 'Kho học liệu', label: 'Hỏi đáp trên danh mục tài nguyên', group: 'document', governanceProfile: 'document', routingHint: 'long-context', maxOutputTokens: 2400, version: '1.1.0' }),
});

function normalizeTaskId(value = '') {
  return String(value || '').trim();
}

export function getAiPromptDefinition(taskId) {
  return AI_PROMPT_REGISTRY[normalizeTaskId(taskId)] || null;
}

export function listAiPromptDefinitions({ enabledOnly = false } = {}) {
  const rows = Object.values(AI_PROMPT_REGISTRY);
  return enabledOnly ? rows.filter((item) => item.enabled !== false) : rows;
}

export function assertAiTaskInput(definition, input = {}) {
  const missing = (definition?.requiredInputs || []).filter((key) => input?.[key] == null || input?.[key] === '');
  if (!missing.length) return true;
  const error = new Error(`AI task ${definition.id} is missing required input: ${missing.join(', ')}`);
  error.code = 'AI_TASK_INPUT_INVALID';
  error.taskId = definition.id;
  error.missingInputs = missing;
  throw error;
}

export function buildAiTaskRequest(taskId, input = {}, overrides = {}) {
  const definition = getAiPromptDefinition(taskId);
  if (!definition) {
    const error = new Error(`Unknown AI task: ${taskId}`);
    error.code = 'AI_TASK_NOT_REGISTERED';
    error.taskId = taskId;
    throw error;
  }
  if (definition.enabled === false) {
    const error = new Error(`AI task is disabled: ${taskId}`);
    error.code = 'AI_TASK_DISABLED';
    error.taskId = taskId;
    throw error;
  }
  assertAiTaskInput(definition, input);
  const prompt = overrides.prompt ?? input.prompt ?? '';
  if (!String(prompt).trim()) {
    const error = new Error(`AI task ${taskId} requires a prompt.`);
    error.code = 'AI_TASK_PROMPT_EMPTY';
    error.taskId = taskId;
    throw error;
  }
  const responseMimeType = overrides.responseMimeType || (definition.output === 'json' ? 'application/json' : '');
  return {
    ...overrides,
    prompt,
    systemInstruction: overrides.systemInstruction || definition.systemInstruction,
    temperature: overrides.temperature ?? definition.temperature,
    maxOutputTokens: overrides.maxOutputTokens ?? definition.maxOutputTokens,
    responseMimeType,
    validation: overrides.validation || definition.validation || undefined,
    governanceProfile: overrides.governanceProfile || definition.governanceProfile,
    routingHint: overrides.routingHint || definition.routingHint,
    privacyLevel: overrides.privacyLevel || definition.privacyProfile,
    aiTaskId: definition.group,
    registryTaskId: definition.id,
    promptVersion: definition.version,
    promptRegistryVersion: AI_PROMPT_REGISTRY_VERSION,
    taskApp: definition.app,
    taskLabel: definition.label,
    taskContract: definition.validation || null,
  };
}

export function getAiPromptRegistrySummary() {
  const tasks = listAiPromptDefinitions();
  return {
    registryVersion: AI_PROMPT_REGISTRY_VERSION,
    taskCount: tasks.length,
    appCount: new Set(tasks.map((item) => item.app)).size,
    jsonContractCount: tasks.filter((item) => item.output === 'json').length,
    sensitiveTaskCount: tasks.filter((item) => /sensitive/.test(item.privacyProfile)).length,
    versions: Object.fromEntries(tasks.map((item) => [item.id, item.version])),
  };
}
