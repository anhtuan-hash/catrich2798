/**
 * Brian AI Output Validator
 *
 * Provides one shared validation contract for text, JSON and question sets.
 * It deliberately stays dependency-free so all existing apps can use it.
 */

export const DEFAULT_AI_OUTPUT_VALIDATION_SETTINGS = Object.freeze({
  enabled: true,
  validateJson: true,
  rejectEmpty: true,
  detectDuplicates: true,
  autoRepair: true,
  maxRepairAttempts: 1,
});

function cleanText(value) {
  return String(value ?? '').replace(/^\uFEFF/, '').trim();
}

function stripFence(text) {
  const raw = cleanText(text);
  const fenced = raw.match(/^```(?:json|javascript|js)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : raw;
}

function findBalancedJson(text) {
  const raw = stripFence(text);
  const starts = [raw.indexOf('{'), raw.indexOf('[')].filter((value) => value >= 0).sort((a, b) => a - b);
  if (!starts.length) return raw;
  const start = starts[0];
  const opening = raw[start];
  const closing = opening === '{' ? '}' : ']';
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === opening) depth += 1;
    if (char === closing) depth -= 1;
    if (depth === 0) return raw.slice(start, index + 1);
  }
  return raw.slice(start);
}

export function parseAiJson(text) {
  const candidate = findBalancedJson(text)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(candidate);
}

function wordCount(text) {
  return cleanText(text).split(/\s+/).filter(Boolean).length;
}

function normalizeStem(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\b\d+\b/g, '#')
    .replace(/[^a-z0-9à-ỹ#]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCollection(parsed, preferredKey = '') {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== 'object') return [];
  if (preferredKey) {
    const direct = String(preferredKey).split('.').filter(Boolean).reduce((value, key) => value?.[key], parsed);
    if (Array.isArray(direct)) return direct;
  }
  for (const key of ['items', 'questions', 'cards', 'activities', 'sections', 'content']) {
    if (Array.isArray(parsed[key])) return parsed[key];
  }
  return [];
}

function issue(code, message, detail = {}) {
  return { code, message, ...detail };
}

function validateRequiredFields(parsed, required = [], issues = []) {
  if (!required.length) return;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    issues.push(issue('required_fields_unavailable', 'Không thể kiểm tra trường bắt buộc vì output không phải object JSON.'));
    return;
  }
  for (const key of required) {
    const value = parsed[key];
    if (value === undefined || value === null || value === '') issues.push(issue('missing_required_field', `Thiếu trường bắt buộc: ${key}`, { field: key }));
  }
}

function validateQuestionObjects(items, issues, options) {
  if (!items.length) return;
  const seen = new Map();
  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const stem = item.stem || item.question || item.prompt || item.text || item.title || '';
    const normalized = normalizeStem(stem);
    if (options.detectDuplicates && normalized.length >= 12) {
      if (seen.has(normalized)) issues.push(issue('duplicate_item', `Câu ${index + 1} trùng nội dung với câu ${seen.get(normalized) + 1}.`, { index, duplicateOf: seen.get(normalized) }));
      else seen.set(normalized, index);
    }
    const optionList = Array.isArray(item.options) ? item.options : Array.isArray(item.choices) ? item.choices : [];
    if (options.validateMcq && optionList.length && optionList.length !== 4) {
      issues.push(issue('invalid_option_count', `Câu ${index + 1} có ${optionList.length} phương án, cần đúng 4 phương án.`, { index, count: optionList.length }));
    }
    if (options.validateMcq && optionList.length && !(item.answer ?? item.correctAnswer ?? item.correct ?? item.key)) {
      issues.push(issue('missing_answer', `Câu ${index + 1} thiếu đáp án.`, { index }));
    }
  });
}

function normalizeValidationOptions(options = {}, task = {}, rawSettings = {}) {
  const settings = { ...DEFAULT_AI_OUTPUT_VALIDATION_SETTINGS, ...(rawSettings || {}) };
  const explicit = options.validation && typeof options.validation === 'object' ? options.validation : {};
  const raw = cleanText(options.__candidateText || '');
  const looksJson = /^```(?:json)?\s*[\[{]|^[\[{]/i.test(raw);
  const strictJson = options.responseMimeType === 'application/json' || explicit.kind === 'json' || Boolean(options.outputSchema);
  const shouldValidateJson = explicit.kind === 'json' || Boolean(options.outputSchema) || settings.validateJson !== false;
  return {
    ...settings,
    ...explicit,
    enabled: settings.enabled !== false && explicit.enabled !== false,
    kind: explicit.kind || (strictJson && shouldValidateJson ? 'json' : looksJson && task.outputKind === 'json' && shouldValidateJson ? 'json' : 'text'),
    strictJson,
    requiredFields: explicit.requiredFields || options.outputSchema?.required || [],
    collectionKey: explicit.collectionKey || options.outputSchema?.collectionKey || '',
    expectedCount: Number(explicit.expectedCount ?? options.expectedItemCount ?? 0) || 0,
    minWords: Number(explicit.minWords ?? options.minWords ?? 0) || 0,
    maxWords: Number(explicit.maxWords ?? options.maxWords ?? 0) || 0,
    minChars: Number(explicit.minChars ?? 0) || 0,
    maxChars: Number(explicit.maxChars ?? 0) || 0,
    validateMcq: explicit.validateMcq === true,
    detectDuplicates: explicit.detectDuplicates ?? settings.detectDuplicates,
    autoRepair: explicit.autoRepair ?? settings.autoRepair,
    maxRepairAttempts: Math.max(0, Math.min(2, Number(explicit.maxRepairAttempts ?? settings.maxRepairAttempts) || 0)),
  };
}

export function validateAiOutput(text, { options = {}, task = {}, settings = {} } = {}) {
  const normalizedText = cleanText(text);
  const config = normalizeValidationOptions({ ...options, __candidateText: normalizedText }, task, settings);
  const issues = [];
  let parsed = null;

  if (!config.enabled) {
    return { valid: true, skipped: true, normalizedText, parsed: null, issues: [], config, metrics: { chars: normalizedText.length, words: wordCount(normalizedText), items: 0 } };
  }
  if (config.rejectEmpty && !normalizedText) issues.push(issue('empty_output', 'AI trả về nội dung rỗng.'));
  const words = wordCount(normalizedText);
  if (config.minWords && words < config.minWords) issues.push(issue('too_few_words', `Output chỉ có ${words} từ, cần tối thiểu ${config.minWords} từ.`, { actual: words, expected: config.minWords }));
  if (config.maxWords && words > config.maxWords) issues.push(issue('too_many_words', `Output có ${words} từ, vượt mức tối đa ${config.maxWords} từ.`, { actual: words, expected: config.maxWords }));
  if (config.minChars && normalizedText.length < config.minChars) issues.push(issue('too_short', `Output chỉ có ${normalizedText.length} ký tự, cần tối thiểu ${config.minChars}.`));
  if (config.maxChars && normalizedText.length > config.maxChars) issues.push(issue('too_long', `Output có ${normalizedText.length} ký tự, vượt mức ${config.maxChars}.`));

  if (config.kind === 'json' && normalizedText) {
    try {
      parsed = parseAiJson(normalizedText);
    } catch (error) {
      issues.push(issue('invalid_json', `JSON không hợp lệ: ${error?.message || 'không thể phân tích'}`));
    }
  }

  if (parsed !== null) {
    validateRequiredFields(parsed, config.requiredFields, issues);
    const items = getCollection(parsed, config.collectionKey);
    if (config.expectedCount && items.length !== config.expectedCount) {
      issues.push(issue('wrong_item_count', `AI tạo ${items.length} mục, cần đúng ${config.expectedCount} mục.`, { actual: items.length, expected: config.expectedCount }));
    }
    validateQuestionObjects(items, issues, config);
  }

  const items = parsed !== null ? getCollection(parsed, config.collectionKey).length : 0;
  return {
    valid: issues.length === 0,
    skipped: false,
    normalizedText,
    parsed,
    issues,
    config,
    metrics: { chars: normalizedText.length, words, items },
  };
}

export function buildAiRepairPrompt({ originalOutput = '', validation = {}, task = {}, originalPrompt = '' } = {}) {
  const issueLines = (validation.issues || []).slice(0, 12).map((item, index) => `${index + 1}. ${item.message}`).join('\n');
  const schemaHint = validation.config?.requiredFields?.length ? `Required top-level fields: ${validation.config.requiredFields.join(', ')}.` : '';
  const countHint = validation.config?.expectedCount ? `Return exactly ${validation.config.expectedCount} items in ${validation.config.collectionKey || 'the main array'}.` : '';
  const formatHint = validation.config?.kind === 'json' ? 'Return strict valid JSON only, without markdown fences or commentary.' : 'Return only the corrected final content.';
  return `Repair the following AI output for Brian English Studio. Preserve the teacher's intended content, but fix every validation problem.\n\nTask: ${task.label || task.id || 'AI task'}\n${schemaHint}\n${countHint}\n${formatHint}\n\nVALIDATION PROBLEMS:\n${issueLines || 'The output failed validation.'}\n\nORIGINAL TEACHER REQUEST (already privacy-filtered):\n${cleanText(originalPrompt).slice(0, 9000)}\n\nFAILED OUTPUT:\n${cleanText(originalOutput).slice(0, 28000)}\n\nReturn the corrected final output now.`;
}

export function createAiValidationError(validation = {}) {
  const summary = (validation.issues || []).slice(0, 4).map((item) => item.message).join(' | ') || 'AI output validation failed.';
  const error = new Error(summary);
  error.code = 'AI_OUTPUT_VALIDATION_FAILED';
  error.validation = validation;
  return error;
}

export function summarizeAiValidation(validation = {}, extra = {}) {
  return {
    enabled: validation.config?.enabled !== false,
    valid: Boolean(validation.valid),
    skipped: Boolean(validation.skipped),
    kind: validation.config?.kind || 'text',
    issueCount: Array.isArray(validation.issues) ? validation.issues.length : 0,
    issueCodes: Array.isArray(validation.issues) ? validation.issues.map((item) => item.code).slice(0, 12) : [],
    metrics: validation.metrics || { chars: 0, words: 0, items: 0 },
    repairAttempted: Boolean(extra.repairAttempted),
    repaired: Boolean(extra.repaired),
    repairAttempts: Number(extra.repairAttempts) || 0,
  };
}
