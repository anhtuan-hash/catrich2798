import { buildBankInventory, itemMatchesPartFilters } from './questionBankExamBuilder.js';
import { normalizeBlueprintCriteria } from './questionBankBlueprints.js';

function text(value) {
  return String(value ?? '').trim();
}

function normalize(value) {
  return text(value).toLowerCase();
}

function gradeMatches(value, target) {
  if (!target) return true;
  if (value === null || value === undefined || text(value) === '') return true;
  return String(value) === String(target);
}

function bundleGradeMatches(candidate, target) {
  if (!target) return true;
  const values = [
    candidate?.bundle?.grade,
    ...(candidate?.items || []).map((item) => item.grade),
  ].filter((value) => value !== null && value !== undefined && text(value) !== '');
  if (!values.length) return true;
  return values.every((value) => String(value) === String(target));
}

function fingerprintDuplicates(questions = []) {
  const counts = new Map();
  questions.forEach((item) => {
    const fp = text(item.fingerprint);
    if (!fp) return;
    counts.set(fp, Number(counts.get(fp) || 0) + 1);
  });
  return [...counts.values()].filter((count) => count > 1).reduce((sum, count) => sum + (count - 1), 0);
}

export function analyzeBankHealth(questions = [], bundles = []) {
  const usage = (questions || []).map((item) => Number(item.usage_count || 0));
  const inventory = buildBankInventory(questions, bundles);
  const eligibleIds = new Set([
    ...inventory.standaloneItems.map((item) => item.id),
    ...inventory.bundleCandidates.flatMap((candidate) => candidate.items.map((item) => item.id)),
  ]);
  const metadataMissing = (questions || []).filter((item) =>
    !text(item.cefr)
    || !text(item.cognitive_level)
    || item.difficulty === null
    || item.difficulty === undefined
    || !text(item.topic)
  ).length;
  const missingExplanation = (questions || []).filter((item) => !text(item.explanation)).length;
  const draftCount = (questions || []).filter((item) => normalize(item.status || 'draft') === 'draft').length;
  const neverUsed = usage.filter((count) => count === 0).length;
  const usedOnce = usage.filter((count) => count === 1).length;
  const reused = usage.filter((count) => count >= 2).length;
  const heavilyUsed = usage.filter((count) => count >= 4).length;
  const maxUsage = usage.length ? Math.max(...usage) : 0;
  const topics = new Set((questions || []).map((item) => normalize(item.topic)).filter(Boolean));
  const cefr = {};
  const cognitive = {};
  const difficulty = {};
  (questions || []).forEach((item) => {
    const c = text(item.cefr).toUpperCase() || '—';
    const cog = normalize(item.cognitive_level) || 'unknown';
    const diff = item.difficulty === null || item.difficulty === undefined ? '—' : String(item.difficulty);
    cefr[c] = Number(cefr[c] || 0) + 1;
    cognitive[cog] = Number(cognitive[cog] || 0) + 1;
    difficulty[diff] = Number(difficulty[diff] || 0) + 1;
  });

  const total = questions.length;
  const completeness = total
    ? Math.round(((total - metadataMissing) / total) * 100)
    : 0;

  return {
    total,
    bundles: bundles.length,
    builderEligible: eligibleIds.size,
    outsideBuilderPool: Math.max(0, total - eligibleIds.size),
    neverUsed,
    usedOnce,
    reused,
    heavilyUsed,
    maxUsage,
    metadataMissing,
    missingExplanation,
    drafts: draftCount,
    duplicateFingerprints: fingerprintDuplicates(questions),
    uniqueTopics: topics.size,
    completeness,
    distributions: { cefr, cognitive, difficulty },
  };
}

export function analyzeBlueprintCoverage({
  questions = [],
  bundles = [],
  blueprint,
  targetSets = 5,
} = {}) {
  const criteria = normalizeBlueprintCriteria(blueprint?.criteria || blueprint || {});
  const inventory = buildBankInventory(questions, bundles);
  const requestedSets = Math.max(1, Math.min(100, Number(targetSets) || 1));

  const rows = criteria.parts.map((part) => {
    if (part.mode === 'items') {
      const pool = part.type === 'standalone_mcq' ? inventory.standaloneMcqItems : inventory.arrangementItems;
      const candidates = pool
        .filter((item) => gradeMatches(item.grade, criteria.grade))
        .filter((item) => itemMatchesPartFilters(item, part));
      const available = candidates.length;
      const requiredPerSet = Number(part.count || 0);
      const requiredForTarget = requiredPerSet * requestedSets;
      const maxUniqueSets = requiredPerSet > 0 ? Math.floor(available / requiredPerSet) : 0;
      return {
        type: part.type,
        label: part.label,
        mode: 'items',
        available,
        requiredPerSet,
        requiredForTarget,
        deficit: Math.max(0, requiredForTarget - available),
        maxUniqueSets,
        coveragePercent: requiredForTarget ? Math.min(100, Math.round((available / requiredForTarget) * 100)) : 100,
        itemCount: 1,
      };
    }

    const candidates = inventory.bundleCandidates
      .filter((candidate) => candidate.type === part.type)
      .filter((candidate) => candidate.size === Number(part.itemCount || 0))
      .filter((candidate) => bundleGradeMatches(candidate, criteria.grade))
      .filter((candidate) => candidate.items.every((item) => itemMatchesPartFilters(item, part)));
    const available = candidates.length;
    const requiredPerSet = Number(part.bundleCount || 0);
    const requiredForTarget = requiredPerSet * requestedSets;
    const maxUniqueSets = requiredPerSet > 0 ? Math.floor(available / requiredPerSet) : 0;
    return {
      type: part.type,
      label: part.label,
      mode: 'bundles',
      available,
      requiredPerSet,
      requiredForTarget,
      deficit: Math.max(0, requiredForTarget - available),
      maxUniqueSets,
      coveragePercent: requiredForTarget ? Math.min(100, Math.round((available / requiredForTarget) * 100)) : 100,
      itemCount: Number(part.itemCount || 0),
    };
  });

  const capacities = rows.filter((row) => row.requiredPerSet > 0).map((row) => row.maxUniqueSets);
  const maxUniqueSets = capacities.length ? Math.min(...capacities) : 0;
  const bottleneck = [...rows]
    .filter((row) => row.requiredPerSet > 0)
    .sort((a, b) => a.maxUniqueSets - b.maxUniqueSets || b.deficit - a.deficit)[0] || null;
  const missingRows = rows.filter((row) => row.deficit > 0);
  const readyForOneSet = rows.every((row) => row.maxUniqueSets >= 1);
  const readyForTarget = missingRows.length === 0;

  return {
    criteria,
    targetSets: requestedSets,
    rows,
    maxUniqueSets,
    bottleneck,
    missingRows,
    readyForOneSet,
    readyForTarget,
    coveragePercent: rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.coveragePercent, 0) / rows.length)
      : 0,
  };
}

export function buildCoverageGapPrompt({
  blueprintTitle,
  coverage,
  schoolYear = '',
  sourceFormat = 'TN THPT 2025–2026',
} = {}) {
  if (!coverage) return '';
  const missing = coverage.missingRows || [];
  const criteria = coverage.criteria || {};
  const cognitive = criteria.cognitiveTargets || {};
  const lines = [
    'Hãy bổ sung NGÂN HÀNG CÂU HỎI BRIAN theo đúng khoảng trống dưới đây.',
    '',
    `Ma trận: ${blueprintTitle || 'Ma trận hiện tại'}`,
    `Mục tiêu: đủ dữ liệu để tạo ${coverage.targetSets || 1} đề KHÔNG TRÙNG nội dung.`,
    schoolYear ? `Năm học: ${schoolYear}` : '',
    criteria.grade ? `Khối: ${criteria.grade}` : '',
    criteria.cefr ? `CEFR ưu tiên: ${criteria.cefr}` : '',
    sourceFormat ? `Bám form: ${sourceFormat}` : '',
    '',
    'PHẦN CẦN BỔ SUNG:',
    ...(missing.length ? missing.map((row) => row.mode === 'items'
      ? `- ${row.label}: tạo thêm ít nhất ${row.deficit} câu độc lập.`
      : `- ${row.label}: tạo thêm ít nhất ${row.deficit} chùm, mỗi chùm đúng ${row.itemCount} câu và phải giữ nguyên ngữ liệu chung trong bundle.`)
      : ['- Kho hiện đã đủ cho mục tiêu; hãy tạo nội dung dự phòng mới để tăng độ đa dạng.']),
    '',
    'YÊU CẦU CHẤT LƯỢNG:',
    '- Nội dung mới hoàn toàn; không sao chép nguyên văn đề thi thật.',
    '- Mỗi câu MCQ chỉ có đúng một đáp án bảo vệ được.',
    '- Không lặp content words/chủ đề quá gần với câu đã có khi có thể tránh.',
    `- Tỉ lệ nhận thức mục tiêu: Nhận biết ${cognitive.recognition ?? 30}% · Thông hiểu ${cognitive.comprehension ?? 50}% · Vận dụng ${cognitive.application ?? 20}%.`,
    '- Gắn đầy đủ grade, CEFR, skill, topic, cognitiveLevel, difficulty, grammarPoint và tags.',
    '- Với Reading/Cloze, passage + questions phải lưu thành bundle, đúng thứ tự.',
    '- Sau khi tạo xong, tự kiểm tra đáp án và dùng Brian Question Bank Action để lưu trực tiếp vào Brian.',
    '- Trước khi tạo, dùng searchBrianQuestions nếu cần để tránh trùng câu đã có.',
  ].filter(Boolean);

  return lines.join('\n');
}
