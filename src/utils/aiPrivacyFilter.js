/**
 * Brian AI Privacy Filter
 *
 * Redacts common personal and secret data before a prompt leaves the browser.
 * The filter is deterministic inside one request, never stores the original
 * values, and returns only aggregate metadata for audit/provenance.
 */

export const DEFAULT_AI_PRIVACY_SETTINGS = Object.freeze({
  enabled: true,
  mode: 'mask', // mask | block | off
  maskEmails: true,
  maskPhones: true,
  maskStudentIds: true,
  maskNationalIds: true,
  maskBirthDates: true,
  maskAddresses: true,
  maskNamedPeople: true,
  maskSecrets: true,
  scanAttachments: true,
  blockSensitiveImages: false,
  forceLocalForSensitive: false,
});

const LABELS = Object.freeze({
  email: 'EMAIL',
  phone: 'PHONE',
  studentId: 'STUDENT_ID',
  nationalId: 'PERSONAL_ID',
  birthDate: 'DOB',
  address: 'ADDRESS',
  personName: 'PERSON',
  secret: 'SECRET',
});

function asText(value) {
  return typeof value === 'string' ? value : String(value ?? '');
}

function normalizeSettings(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const mode = ['mask', 'block', 'off'].includes(source.mode) ? source.mode : DEFAULT_AI_PRIVACY_SETTINGS.mode;
  return {
    ...DEFAULT_AI_PRIVACY_SETTINGS,
    ...source,
    enabled: source.enabled !== false,
    mode,
  };
}

function createMasker() {
  const counters = {};
  const cache = new Map();
  const reverse = new Map();
  const mask = (category, raw) => {
    const value = asText(raw);
    const key = `${category}:${value.toLowerCase()}`;
    if (cache.has(key)) return cache.get(key);
    counters[category] = (counters[category] || 0) + 1;
    const replacement = `[${LABELS[category] || 'PRIVATE'}_${counters[category]}]`;
    cache.set(key, replacement);
    reverse.set(replacement, { value, category, restorable: category !== 'secret' });
    return replacement;
  };
  const restore = (text, { json = false } = {}) => {
    let output = asText(text);
    for (const [placeholder, item] of reverse.entries()) {
      if (!item.restorable) continue;
      const value = json ? JSON.stringify(item.value).slice(1, -1) : item.value;
      output = output.split(placeholder).join(value);
    }
    return output;
  };
  return { mask, restore };
}

function replaceMatches(text, regex, category, masker, report, replacer = null) {
  return text.replace(regex, (...args) => {
    const match = args[0];
    const offset = args.at(-2);
    const source = args.at(-1);
    const replacement = replacer
      ? replacer({ match, groups: args.slice(1, -2), offset, source, mask: (value = match) => masker(category, value) })
      : masker(category, match);
    report.counts[category] = (report.counts[category] || 0) + 1;
    report.maskedCount += 1;
    return replacement;
  });
}

function redactText(input, settings, context = {}) {
  let text = asText(input);
  const report = context.report;
  const masker = context.masker;
  if (!text || !settings.enabled || settings.mode === 'off') return text;

  if (settings.maskSecrets) {
    text = replaceMatches(text, /\b(?:sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,}|(?:api[_ -]?key|token|secret|password|mật khẩu)\s*[:=]\s*["']?[^\s,"'\]}]{8,})/gi, 'secret', masker, report);
    text = replaceMatches(text, /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, 'secret', masker, report);
  }
  if (settings.maskEmails) {
    text = replaceMatches(text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, 'email', masker, report);
  }
  if (settings.maskPhones) {
    text = replaceMatches(text, /(?<!\d)(?:\+?84|0)(?:[ .-]*\d){9,10}(?!\d)/g, 'phone', masker, report);
  }
  if (settings.maskNationalIds) {
    text = replaceMatches(
      text,
      /\b((?:CCCD|CMND|căn cước(?: công dân)?|citizen\s*id|national\s*id|identity\s*(?:card|number))\s*[:#-]?\s*)(\d(?:[ .-]*\d){8,11})\b/gi,
      'nationalId',
      masker,
      report,
      ({ groups, mask }) => `${groups[0]}${mask(groups[1])}`,
    );
  }
  if (settings.maskStudentIds) {
    text = replaceMatches(
      text,
      /\b((?:mã\s*(?:học\s*sinh|hs|sinh\s*viên)|student\s*id|learner\s*id|pupil\s*id)\s*[:#-]?\s*)([A-Z0-9][A-Z0-9._/-]{3,})\b/gi,
      'studentId',
      masker,
      report,
      ({ groups, mask }) => `${groups[0]}${mask(groups[1])}`,
    );
  }
  if (settings.maskBirthDates) {
    text = replaceMatches(
      text,
      /\b((?:ngày\s*sinh|sinh\s*ngày|date\s*of\s*birth|dob)\s*[:#-]?\s*)((?:\d{1,2}[\s./-]){2}\d{2,4})\b/gi,
      'birthDate',
      masker,
      report,
      ({ groups, mask }) => `${groups[0]}${mask(groups[1])}`,
    );
  }
  if (settings.maskAddresses) {
    text = replaceMatches(
      text,
      /^([ \t]*(?:địa\s*chỉ|address|nơi\s*ở|residential\s*address)\s*[:#-]?\s*)([^\n\r]{5,160})/gim,
      'address',
      masker,
      report,
      ({ groups, mask }) => `${groups[0]}${mask(groups[1])}`,
    );
  }
  if (settings.maskNamedPeople) {
    text = replaceMatches(
      text,
      /\b((?:họ\s*(?:và\s*)?tên|tên\s*học\s*sinh|student\s*name|learner\s*name|tên\s*phụ\s*huynh|parent\s*name|người\s*giám\s*hộ)\s*[:#-]?\s*)([A-ZÀ-Ỹ][A-Za-zÀ-ỹ'’-]+(?:[ \t]+[A-ZÀ-Ỹ][A-Za-zÀ-ỹ'’-]+){1,5})/gi,
      'personName',
      masker,
      report,
      ({ groups, mask }) => `${groups[0]}${mask(groups[1])}`,
    );

    if (context.taskId === 'administration') {
      text = replaceMatches(
        text,
        /^(\s*\d{1,3}[.)-]?\s+)([A-ZÀ-Ỹ][A-Za-zÀ-ỹ'’-]+(?:[ \t]+[A-ZÀ-Ỹ][A-Za-zÀ-ỹ'’-]+){1,5})(?=\s*(?:[|,;\t-]\s*)?(?:\d{1,2}(?:[.,]\d+)?|vắng|điểm|lớp|absent|score|class))/gm,
        'personName',
        masker,
        report,
        ({ groups, mask }) => `${groups[0]}${mask(groups[1])}`,
      );
    }
  }
  return text;
}

function sanitizeAttachment(attachment, settings, context) {
  if (!attachment || typeof attachment !== 'object') return attachment;
  const next = { ...attachment };
  const textFields = ['text', 'content', 'extractedText', 'transcript', 'ocrText', 'description'];
  for (const field of textFields) {
    if (typeof next[field] === 'string') next[field] = redactText(next[field], settings, context);
  }
  const mimeType = asText(next.mimeType || next.type).toLowerCase();
  if (mimeType.startsWith('image/')) {
    context.report.imageAttachmentCount += 1;
    if (settings.blockSensitiveImages && context.report.maskedCount > 0) {
      context.report.blockedAttachmentCount += 1;
      return null;
    }
  }
  return next;
}

function riskFromReport(report) {
  const highSignals = (report.counts.secret || 0) + (report.counts.nationalId || 0) + (report.counts.studentId || 0);
  const personalSignals = (report.counts.personName || 0) + (report.counts.email || 0) + (report.counts.phone || 0) + (report.counts.birthDate || 0) + (report.counts.address || 0);
  if (highSignals > 0 || personalSignals >= 3) return 'high';
  if (personalSignals > 0) return 'medium';
  return 'low';
}

export function applyAiPrivacyFilter(options = {}, rawSettings = {}) {
  const settings = normalizeSettings(rawSettings);
  const report = {
    enabled: settings.enabled && settings.mode !== 'off',
    mode: settings.mode,
    applied: false,
    maskedCount: 0,
    counts: {},
    categories: [],
    riskLevel: 'low',
    imageAttachmentCount: 0,
    blockedAttachmentCount: 0,
    forceLocal: false,
  };
  if (!report.enabled) return { options: { ...options }, report, restoreText: (text) => asText(text) };

  const privacyMap = createMasker();
  const masker = privacyMap.mask;
  const context = { masker, report, taskId: options.aiTaskId || options.taskId || 'default' };
  const prompt = redactText(options.prompt || '', settings, context);
  let systemInstruction = redactText(options.systemInstruction || '', settings, context);
  if (report.maskedCount > 0) {
    const privacyDirective = 'PRIVACY RULE: Preserve every bracketed placeholder such as [PERSON_1], [EMAIL_1] or [STUDENT_ID_1] exactly as written. Do not alter, translate, expand or guess the hidden value.';
    systemInstruction = [systemInstruction, privacyDirective].filter(Boolean).join('\n\n');
  }
  const attachments = settings.scanAttachments && Array.isArray(options.attachments)
    ? options.attachments.map((item) => sanitizeAttachment(item, settings, context)).filter(Boolean)
    : options.attachments;

  report.categories = Object.keys(report.counts).filter((key) => report.counts[key] > 0);
  report.riskLevel = riskFromReport(report);
  report.applied = report.maskedCount > 0 || report.blockedAttachmentCount > 0;
  report.forceLocal = Boolean(settings.forceLocalForSensitive && report.riskLevel === 'high');

  if (settings.mode === 'block' && report.riskLevel !== 'low') {
    const error = new Error('Yêu cầu AI chứa dữ liệu cá nhân hoặc bí mật và đã bị Privacy Filter chặn.');
    error.code = 'AI_PRIVACY_BLOCKED';
    error.privacyReport = report;
    throw error;
  }

  return {
    options: {
      ...options,
      prompt,
      systemInstruction,
      attachments,
      privacyLevel: report.forceLocal ? 'private' : options.privacyLevel,
    },
    report,
    restoreText: privacyMap.restore,
  };
}

export function summarizeAiPrivacyReport(report = {}) {
  return {
    applied: Boolean(report.applied),
    mode: report.mode || 'off',
    riskLevel: report.riskLevel || 'low',
    maskedCount: Number(report.maskedCount) || 0,
    categories: Array.isArray(report.categories) ? report.categories.slice(0, 12) : [],
    imageAttachmentCount: Number(report.imageAttachmentCount) || 0,
    blockedAttachmentCount: Number(report.blockedAttachmentCount) || 0,
    forceLocal: Boolean(report.forceLocal),
  };
}
