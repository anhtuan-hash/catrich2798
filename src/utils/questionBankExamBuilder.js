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

function averageUsage(items = []) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + Number(item.usage_count || 0), 0) / items.length;
}

function candidateScore(candidate, filters, seed) {
  const usagePenalty = Math.min(20, averageUsage(candidate.items || [])) / 20;
  const cefrBoost = cefrScore(candidate, filters.cefr);
  const cognitiveBoost = cognitiveScore(candidate, filters.cognitiveLevel);
  const jitter = scoreWithSeed(candidate.id, seed);
  return (cefrBoost * 3) + (cognitiveBoost * 2) + jitter - usagePenalty;
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
    bundleCandidates.push({
      id: bundleId,
      type,
      bundle,
      items: ordered,
      size: ordered.length,
    });
  });

  const standaloneItems = (questions || []).filter((item) => {
    if (blockTypeForItem(item) !== 'arrangement_5') return false;
    if (!item.bundle_id) return true;
    const bundleType = valueText(bundleMap.get(item.bundle_id)?.bundle_type).toLowerCase();
    return bundleType === 'arrangement_5';
  });

  return { bundleCandidates, standaloneItems };
}

export function selectExamFromBank({
  questions = [],
  bundles = [],
  blueprint = TNTHPT_40_BLUEPRINT,
  filters = {},
  seed = 1,
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
      .sort((a, b) => candidateScore(b, filters, seed) - candidateScore(a, filters, seed));

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
      const candidates = inventory.standaloneItems
        .filter((item) => !usedIds.has(item.id))
        .filter((item) => !filters.grade || !item.grade || String(item.grade) === String(filters.grade))
        .filter((item) => !filters.topic || [item.topic, item.skill, ...(item.tags || [])]
          .map(normalize).join(' ').includes(normalize(filters.topic)))
        .sort((a, b) => {
          const aCandidate = { id: a.id, items: [a] };
          const bCandidate = { id: b.id, items: [b] };
          return candidateScore(bCandidate, filters, seed) - candidateScore(aCandidate, filters, seed);
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
    audit: auditExamQuality(selected),
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
  byType.arrangement_5 = { bundles: 0, items: inventory.standaloneItems.length };
  return byType;
}
