import { selectExamFromBank } from './questionBankExamBuilder.js';
import { balancedOptionOrders } from './questionBankManagement.js';

function avgDifficulty(items = []) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + Number(item.difficulty || 0), 0) / items.length;
}

function overlapCount(a = [], b = []) {
  const ids = new Set(a.map((item) => item.id));
  return b.reduce((count, item) => count + (ids.has(item.id) ? 1 : 0), 0);
}

export function batchOverlapMatrix(exams = []) {
  return exams.map((exam, i) => exams.map((other, j) => (i === j ? exam.items.length : overlapCount(exam.items, other.items))));
}

export function summarizeExamBatch(exams = []) {
  const overlaps = [];
  for (let i = 0; i < exams.length; i += 1) {
    for (let j = i + 1; j < exams.length; j += 1) overlaps.push(overlapCount(exams[i].items, exams[j].items));
  }
  const difficulties = exams.map((exam) => avgDifficulty(exam.items));
  const avg = difficulties.length ? difficulties.reduce((a,b)=>a+b,0)/difficulties.length : 0;
  return {
    count: exams.length,
    totalUniqueItems: new Set(exams.flatMap((exam) => exam.items.map((item) => item.id))).size,
    maxOverlap: overlaps.length ? Math.max(...overlaps) : 0,
    averageOverlap: overlaps.length ? overlaps.reduce((a,b)=>a+b,0)/overlaps.length : 0,
    averageDifficulty: avg,
    minDifficulty: difficulties.length ? Math.min(...difficulties) : 0,
    maxDifficulty: difficulties.length ? Math.max(...difficulties) : 0,
    difficultySpread: difficulties.length ? Math.max(...difficulties) - Math.min(...difficulties) : 0,
  };
}

export function buildExamBatch({
  questions = [],
  bundles = [],
  blueprint,
  filters = {},
  count = 10,
  maxOverlap = 5,
  difficultyTolerance = 0.6,
  seedBase = 1000,
  maxAttemptsPerExam = 350,
  auditOptions = {},
} = {}) {
  const requested = Math.max(1, Math.min(100, Number(count) || 1));
  const allowedOverlap = Math.max(0, Number(maxOverlap) || 0);
  const tolerance = Math.max(0, Number(difficultyTolerance) || 0);
  const exams = [];
  const rejected = [];
  let referenceDifficulty = null;

  for (let examIndex = 0; examIndex < requested; examIndex += 1) {
    let best = null;
    let bestPenalty = Number.POSITIVE_INFINITY;
    for (let attempt = 0; attempt < maxAttemptsPerExam; attempt += 1) {
      const seed = Number(seedBase) + examIndex * 1009 + attempt * 7919;
      const candidate = selectExamFromBank({
        questions,
        bundles,
        blueprint,
        filters,
        seed,
        auditOptions,
      });
      if (!candidate.complete || !candidate.audit.ready) continue;

      const overlaps = exams.map((exam) => overlapCount(exam.items, candidate.items));
      const candidateMaxOverlap = overlaps.length ? Math.max(...overlaps) : 0;
      const difficulty = avgDifficulty(candidate.items);
      const difficultyDelta = referenceDifficulty === null ? 0 : Math.abs(difficulty - referenceDifficulty);
      const uniqueKey = candidate.items.map((item) => item.id).sort().join('|');
      if (exams.some((exam) => exam.uniqueKey === uniqueKey)) continue;

      const penalty = Math.max(0, candidateMaxOverlap - allowedOverlap) * 100
        + Math.max(0, difficultyDelta - tolerance) * 20
        + candidateMaxOverlap
        + difficultyDelta;

      const enriched = {
        ...candidate,
        seed,
        difficulty,
        difficultyDelta,
        overlaps,
        maxOverlap: candidateMaxOverlap,
        uniqueKey,
      };

      if (candidateMaxOverlap <= allowedOverlap && difficultyDelta <= tolerance) {
        best = enriched;
        break;
      }
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        best = enriched;
      }
    }

    if (!best || best.maxOverlap > allowedOverlap || best.difficultyDelta > tolerance) {
      rejected.push({
        index: examIndex + 1,
        reason: !best ? 'Không tìm được tổ hợp hoàn chỉnh.' : `Tổ hợp tốt nhất vẫn overlap ${best.maxOverlap} câu, lệch độ khó ${best.difficultyDelta.toFixed(2)}.`,
        best,
      });
      break;
    }

    if (referenceDifficulty === null) referenceDifficulty = best.difficulty;
    exams.push({
      ...best,
      optionOrders: balancedOptionOrders(best.items, `factory-${seedBase}-${examIndex + 1}`),
    });
  }

  return {
    complete: exams.length === requested,
    requested,
    exams,
    rejected,
    summary: summarizeExamBatch(exams),
  };
}

export function batchAnswerKeyCsv(exams = [], titles = []) {
  const maxItems = Math.max(0, ...exams.map((exam) => exam.items.length));
  const rows = [['Question', ...exams.map((_, index) => titles[index] || `Set ${String(index + 1).padStart(2,'0')}`)]];
  for (let q = 0; q < maxItems; q += 1) {
    const row = [String(q + 1)];
    exams.forEach((exam) => {
      const item = exam.items[q];
      if (!item) { row.push(''); return; }
      const source = String(item.correct_answer || 'A').toUpperCase().charCodeAt(0) - 65;
      const order = exam.optionOrders?.[q] || [];
      const visible = order.length === 4 ? order.indexOf(source) : source;
      row.push(String.fromCharCode(65 + Math.max(0, visible)));
    });
    rows.push(row);
  }
  return rows.map((row) => row.map((value) => {
    const raw = String(value ?? '');
    return /[",\n]/.test(raw) ? `"${raw.replace(/"/g,'""')}"` : raw;
  }).join(',')).join('\n');
}
