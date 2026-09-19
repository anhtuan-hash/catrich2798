import { TNTHPT_40_BLUEPRINT } from './questionBankExamBuilder.js';

export const BLUEPRINT_PART_CATALOG = [
  { type: 'arrangement_5', label: 'Arrangement', mode: 'items', defaultCount: 5, fixedItemsPerBundle: null },
  { type: 'discourse_cloze_5', label: 'Discourse Cloze', mode: 'bundles', defaultBundleCount: 1, fixedItemsPerBundle: 5 },
  { type: 'reading_10', label: 'Reading 10', mode: 'bundles', defaultBundleCount: 1, fixedItemsPerBundle: 10 },
  { type: 'reading_8', label: 'Reading 8', mode: 'bundles', defaultBundleCount: 1, fixedItemsPerBundle: 8 },
  { type: 'functional_cloze_6', label: 'Functional Cloze', mode: 'bundles', defaultBundleCount: 2, fixedItemsPerBundle: 6 },
];

export const DEFAULT_COGNITIVE_TARGETS = {
  recognition: 30,
  comprehension: 50,
  application: 20,
};

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function int(value, fallback = 0) {
  return Math.max(0, Math.round(num(value, fallback)));
}

export function blueprintTotal(parts = []) {
  return (parts || []).reduce((sum, part) => {
    if (part.mode === 'items') return sum + int(part.count);
    return sum + (int(part.bundleCount) * int(part.itemCount));
  }, 0);
}

export function defaultBlueprintCriteria() {
  return {
    version: 1,
    preset: 'tnthpt_40',
    grade: '12',
    cefr: 'B1-B2',
    cognitiveTargets: { ...DEFAULT_COGNITIVE_TARGETS },
    tolerance: 10,
    parts: TNTHPT_40_BLUEPRINT.map((part) => ({ ...part })),
  };
}

export function normalizeBlueprintCriteria(criteria = {}) {
  const sourceParts = Array.isArray(criteria.parts) && criteria.parts.length
    ? criteria.parts
    : TNTHPT_40_BLUEPRINT;
  const catalog = new Map(BLUEPRINT_PART_CATALOG.map((part) => [part.type, part]));
  const parts = sourceParts
    .map((part) => {
      const def = catalog.get(part.type);
      if (!def) return null;
      if (def.mode === 'items') {
        return {
          type: def.type,
          label: part.label || def.label,
          mode: 'items',
          count: int(part.count, def.defaultCount || 0),
        };
      }
      return {
        type: def.type,
        label: part.label || def.label,
        mode: 'bundles',
        bundleCount: int(part.bundleCount, def.defaultBundleCount || 1),
        itemCount: int(part.itemCount, def.fixedItemsPerBundle || 1),
      };
    })
    .filter(Boolean);

  const targets = criteria.cognitiveTargets || {};
  return {
    version: 1,
    preset: criteria.preset || 'custom',
    grade: String(criteria.grade || '12'),
    cefr: criteria.cefr || 'B1-B2',
    cognitiveTargets: {
      recognition: int(targets.recognition, DEFAULT_COGNITIVE_TARGETS.recognition),
      comprehension: int(targets.comprehension, DEFAULT_COGNITIVE_TARGETS.comprehension),
      application: int(targets.application, DEFAULT_COGNITIVE_TARGETS.application),
    },
    tolerance: Math.max(0, Math.min(50, int(criteria.tolerance, 10))),
    parts,
  };
}

export function validateBlueprint(criteria = {}) {
  const normalized = normalizeBlueprintCriteria(criteria);
  const errors = [];
  const warnings = [];
  const total = blueprintTotal(normalized.parts);
  const cognitiveTotal = Object.values(normalized.cognitiveTargets).reduce((sum, value) => sum + value, 0);

  if (!normalized.parts.length) errors.push('Ma trận chưa có phần nào.');
  normalized.parts.forEach((part) => {
    if (part.mode === 'items' && part.count <= 0) errors.push(`${part.label}: số câu phải lớn hơn 0.`);
    if (part.mode === 'bundles') {
      if (part.bundleCount <= 0) errors.push(`${part.label}: số chùm phải lớn hơn 0.`);
      if (part.itemCount <= 0) errors.push(`${part.label}: số câu mỗi chùm phải lớn hơn 0.`);
    }
  });
  if (total <= 0) errors.push('Tổng số câu phải lớn hơn 0.');
  if (cognitiveTotal !== 100) errors.push(`Tỉ lệ nhận thức phải bằng 100%; hiện là ${cognitiveTotal}%.`);
  if (total !== 40 && normalized.preset === 'tnthpt_40') {
    warnings.push(`Preset TN THPT đang có ${total} câu thay vì 40.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    total,
    cognitiveTotal,
    normalized,
  };
}

export function compareCognitiveTargets(audit, targets = DEFAULT_COGNITIVE_TARGETS, tolerance = 10) {
  const total = Number(audit?.totalQuestions || 0) || 1;
  const actualCounts = audit?.distributions?.cognitive || {};
  const actual = {
    recognition: Math.round(((actualCounts.recognition || 0) / total) * 100),
    comprehension: Math.round(((actualCounts.comprehension || 0) / total) * 100),
    application: Math.round(((actualCounts.application || 0) / total) * 100),
  };
  const target = {
    recognition: int(targets.recognition),
    comprehension: int(targets.comprehension),
    application: int(targets.application),
  };
  const deviations = {
    recognition: actual.recognition - target.recognition,
    comprehension: actual.comprehension - target.comprehension,
    application: actual.application - target.application,
  };
  const withinTolerance = Object.values(deviations).every((value) => Math.abs(value) <= Number(tolerance || 0));
  return { actual, target, deviations, tolerance: Number(tolerance || 0), withinTolerance };
}
