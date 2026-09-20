import { auditExamQuality, blockLabel, blockTypeForItem } from './questionBankExamManager.js';

export const TNTHPT_40_BLUEPRINT = [
  { type: 'arrangement_5', label: 'Arrangement', mode: 'items', count: 5 },
  { type: 'discourse_cloze_5', label: 'Discourse Cloze', mode: 'bundles', bundleCount: 1, itemCount: 5 },
  { type: 'reading_10', label: 'Reading 10', mode: 'bundles', bundleCount: 1, itemCount: 10 },
  { type: 'reading_8', label: 'Reading 8', mode: 'bundles', bundleCount: 1, itemCount: 8 },
  { type: 'functional_cloze_6', label: 'Functional Cloze', mode: 'bundles', bundleCount: 2, itemCount: 6 },
];

function valueText(value) {
  return String(value ?? '').trim();
}

function normalize(value) {
  return valueText(value).toLowerCase();
}

function hashSeed(value) {
  let hash = 2166136261;
  for (const char of String(value || '')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function scoreWithSeed(id, seed) {
  const hash = hashSeed(`${seed}:${id || ''}`);
  return (hash % 10000) / 10000;
}

function matchesTopic(candidate, topic) {
  const needle = normalize(topic);
  if (!needle) return true;
  const haystack = [
    candidate?.bundle?.title,
    candidate?.bundle?.topic,
    candidate?.bundle?.context_text,
    ...(candidate?.items || []).flatMap((item) => [item.topic, item.skill, ...(item.tags || [])]),
  ].map(normalize).join(' ');
  return haystack.includes(needle);
}

function matchesGrade(candidate, grade) {
  if (!grade) return true;
  const target = String(grade);
  const values = [
    candidate?.bundle?.grade,
    ...(candidate?.items || []).map((item) => item.grade),
  ].filter((value) => value !== null && value !== undefined && String(value).trim() !== '');
  if (!values.length) return true;
  return values.every((value) => String(value) === target);
}

function cefrScore(candidate, cefr) {
  if (!cefr || cefr === 'B1-B2') return 0;
  const values = (candidate?.items || []).map((item) => valueText(item.cefr).toUpperCase()).filter(Boolean);
  if (!values.length) return 0;
  const matching = values.filter((value) => value === cefr).length;
  return matching / values.length;
}

function cognitiveScore(candidate, cognitiveLevel) {
  if (!cognitiveLevel) return 0;
  const values = (candidate?.items || []).map((item) => normalize(item.cognitive_level)).filter(Boolean);
  if (!values.length) return 0;
  const matching = values.filter((value) => value === cognitiveLevel).length;
  return matching / values.length;
}

function itemMatchesPartFilters(item, part = {}) {
  const filters = part.filters || {};
  if (filters.tag) {
    const needle = normalize(filters.tag);
    if (!(item.tags || []).some((tag) => normalize(tag).includes(needle))) return false;
  }
  if (filters.grammar) {
    if (!normalize(item.grammar_point).includes(normalize(filters.grammar))) return false;
  }
  if (filters.skill) {
    if (normalize(item.skill) !== normalize(filters.skill)) return false;
  }
  if (filters.questionType) {
    if (normalize(item.question_type) !== normalize(filters.questionType)) return false;
  }
  if (filters.topic) {
    if (!normalize(item.topic).includes(normalize(filters.topic))) return false;
  }
  if (filters.cefr) {
    const allowed = Array.isArray(filters.cefr) ? filters.cefr : [filters.cefr];
    if (!allowed.map((value) => valueText(value).toUpperCase()).includes(valueText(item.cefr).toUpperCase())) return false;
  }
  return true;
}

function averageUsage(items = []) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + Number(item.usage_count || 0), 0) / items.length;
}

function cognitiveTargetScore(candidate, selected, filters) {
  const targets = filters.cognitiveTargets;
  const totalItems = Number(filters.totalItems || 0);
  if (!targets || !totalItems) return 0;
  const levels = ['recognition', 'comprehension', 'application'];
  const current = Object.fromEntries(levels.map((level) => [
    level,
    selected.filter((item) => normalize(item.cognitive_level) === level).length,
  ]));
  const candidateCounts = Object.fromEntries(levels.map((level) => [
    level,
    (candidate.items || []).filter((item) => normalize(item.cognitive_level) === level).length,
  ]));

  return levels.reduce((score, level) => {
    const targetCount = (Number(targets[level] || 0) / 100) * totalItems;
    const shortage = Math.max(0, targetCount - current[level]);
    const useful = Math.min(shortage, candidateCounts[level]);
    const overshoot = Math.max(0, candidateCounts[level] - shortage);
    return score + useful * 1.4 - overshoot * 0.35;
  }, 0);
}

function candidateScore(candidate, filters, seed, selected = []) {
  const usagePenalty = Math.min(20, averageUsage(candidate.items || [])) / 20;
  const cefrBoost = cefrScore(candidate, filters.cefr);
  const cognitiveBoost = cognitiveScore(candidate, filters.cognitiveLevel);
  const targetBoost = cognitiveTargetScore(candidate, selected, filters);
  const jitter = scoreWithSeed(candidate.id, seed);
  return (cefrBoost * 3) + (cognitiveBoost * 2) + targetBoost + jitter - usagePenalty;
}

export function buildBankInventory(questions = [], bundles = []) {
  const bundleMap = new Map((bundles || []).map((bundle) => [bundle.id, bundle]));
  const grouped = new Map();

  (questions || []).forEach((item) => {
    if (!item.bundle_id) return;
    if (!grouped.has(item.bundle_id)) grouped.set(item.bundle_id, []);
    grouped.get(item.bundle_id).push(item);
  });

  const bundleCandidates = [];
  grouped.forEach((items, bundleId) => {
    const bundle = bundleMap.get(bundleId);
    const type = valueText(bundle?.bundle_type).toLowerCase();
    if (!['functional_cloze_6', 'discourse_cloze_5', 'reading_8', 'reading_10'].includes(type)) return;
    const ordered = [...items].sort((a, b) => Number(a.bundle_position || 0) - Number(b.bundle_position || 0));
    if (String(bundle?.status || 'draft').toLowerCase() === 'archived') return;
    bundleCandidates.push({
      id: bundleId,
      type,
      bundle,
      items: ordered,
      size: ordered.length,
    });
  });

  const arrangementItems = (questions || []).filter((item) => {
    if (String(item.status || 'draft').toLowerCase() === 'archived') return false;
    if (blockTypeForItem(item) !== 'arrangement_5') return false;
    if (!item.bundle_id) return true;
    const bundleType = valueText(bundleMap.get(item.bundle_id)?.bundle_type).toLowerCase();
    return bundleType === 'arrangement_5';
  });
  const standaloneMcqItems = (questions || []).filter((item) => {
    if (String(item.status || 'draft').toLowerCase() === 'archived') return false;
    if (item.bundle_id) return false;
    if (blockTypeForItem(item) === 'arrangement_5') return false;
    return Array.isArray(item.options) && item.options.length === 4;
  });

  return {
    bundleCandidates,
    standaloneItems: arrangementItems,
    arrangementItems,
    standaloneMcqItems,
  };
}

export function selectExamFromBank({
  questions = [],
  bundles = [],
  blueprint = TNTHPT_40_BLUEPRINT,
  filters = {},
  seed = 1,
  auditOptions = {},
} = {}) {
  const inventory = buildBankInventory(questions, bundles);
  const usedIds = new Set();
  const selected = [];
  const missing = [];
  let position = 1;

  const pickBundles = (type, bundleCount, itemCount) => {
    const candidates = inventory.bundleCandidates
      .filter((candidate) => candidate.type === type)
      .filter((candidate) => candidate.size === itemCount)
      .filter((candidate) => matchesTopic(candidate, filters.topic))
      .filter((candidate) => matchesGrade(candidate, filters.grade))
      .filter((candidate) => candidate.items.every((item) => !usedIds.has(item.id)))
      .filter((candidate) => !filters.excludeIds || candidate.items.every((item) => !filters.excludeIds.includes(item.id)))
      .filter((candidate) => !filters.approvedOnly || candidate.items.every((item) => String(item.status || '').toLowerCase() === 'approved'))
      .sort((a, b) => candidateScore(b, filters, seed, selected) - candidateScore(a, filters, seed, selected));

    const picked = candidates.slice(0, bundleCount);
    if (picked.length < bundleCount) {
      missing.push({
        type,
        need: bundleCount,
        found: picked.length,
        message: `${blockLabel(type)}: cần ${bundleCount} chùm đủ ${itemCount} câu, hiện chọn được ${picked.length}.`,
      });
    }
    picked.forEach((candidate) => {
      candidate.items.forEach((item) => {
        usedIds.add(item.id);
        selected.push({
          ...item,
          position: position++,
          option_order: [],
          bundle_type: candidate.type,
          _bundle: candidate.bundle,
        });
      });
    });
  };

  blueprint.forEach((part) => {
    if (part.mode === 'items') {
      const pool = part.type === 'standalone_mcq'
        ? inventory.standaloneMcqItems
        : inventory.arrangementItems;
      const candidates = pool
        .filter((item) => !usedIds.has(item.id))
        .filter((item) => !filters.excludeIds || !filters.excludeIds.includes(item.id))
        .filter((item) => !filters.approvedOnly || String(item.status || '').toLowerCase() === 'approved')
        .filter((item) => !filters.grade || !item.grade || String(item.grade) === String(filters.grade))
        .filter((item) => !filters.topic || [item.topic, item.skill, ...(item.tags || [])]
          .map(normalize).join(' ').includes(normalize(filters.topic)))
        .filter((item) => itemMatchesPartFilters(item, part))
        .sort((a, b) => {
          const aCandidate = { id: a.id, items: [a] };
          const bCandidate = { id: b.id, items: [b] };
          return candidateScore(bCandidate, filters, seed, selected) - candidateScore(aCandidate, filters, seed, selected);
        });
      const picked = candidates.slice(0, part.count);
      if (picked.length < part.count) {
        missing.push({
          type: part.type,
          need: part.count,
          found: picked.length,
          message: `${blockLabel(part.type)}: cần ${part.count} câu, hiện chọn được ${picked.length}.`,
        });
      }
      picked.forEach((item) => {
        usedIds.add(item.id);
        selected.push({ ...item, position: position++, option_order: [], _bundle: null });
      });
      return;
    }

    pickBundles(part.type, part.bundleCount, part.itemCount);
  });

  return {
    items: selected,
    missing,
    audit: auditExamQuality(selected, auditOptions),
    inventory,
    complete: missing.length === 0,
  };
}

export function builderAvailability(questions = [], bundles = []) {
  const inventory = buildBankInventory(questions, bundles);
  const byType = {};
  inventory.bundleCandidates.forEach((candidate) => {
    if (!byType[candidate.type]) byType[candidate.type] = { bundles: 0, items: 0 };
    byType[candidate.type].bundles += 1;
    byType[candidate.type].items += candidate.items.length;
  });
  byType.arrangement_5 = { bundles: 0, items: inventory.arrangementItems.length };
  byType.standalone_mcq = { bundles: 0, items: inventory.standaloneMcqItems.length };
  return byType;
}
