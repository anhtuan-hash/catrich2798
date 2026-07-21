import { createTransfer } from './contentTransfer.js';

export const ECOSYSTEM_ASSET_TYPES = [
  ['source', 'Nguồn nội dung'],
  ['reading', 'Bài đọc'],
  ['vocabulary', 'Từ vựng'],
  ['worksheet', 'Worksheet'],
  ['activity', 'Hoạt động'],
  ['assessment', 'Đánh giá'],
  ['speaking', 'Nói'],
  ['lesson-plan', 'Giáo án'],
  ['homework', 'Bài tập về nhà'],
];

export const ECOSYSTEM_TARGETS = [
  { id: 'content-factory', route: '#/content-factory', label: 'Content Factory', icon: 'CF' },
  { id: 'lesson-pack', route: '#/lesson-pack', label: 'Lesson Pack', icon: 'LP' },  { id: 'reading-studio', route: '#/tool/reading-studio', label: 'Reading Studio', icon: 'RD' },  { id: 'word2graph', route: '#/tool/word2graph', label: 'WordGraph', icon: 'WG' },
  { id: 'textlab-activities', route: '#/tool/textlab-activities', label: 'TextLab', icon: 'TL' },
  { id: 'lesson-plan-ai', route: '#/tool/lesson-plan-ai', label: 'Lesson Architect', icon: 'LA' },
  { id: 'assessment-core', route: '#/assessment-core', label: 'Assessment Core', icon: 'AC' },
  { id: 'exam-studio', route: '#/tool/exam-studio', label: 'Exam Studio', icon: 'EX' },
  { id: 'student-practice', route: '#/tool/student-practice', label: 'Learner Sprint', icon: 'LS' },
];

export const ECOSYSTEM_RECIPES = [
  {
    id: 'reading-lesson',
    title: 'Reading lesson ecosystem',
    titleVi: 'Hệ sinh thái bài đọc',
    description: 'Passage, vocabulary map, worksheet, speaking follow-up, assessment and homework.',
    descriptionVi: 'Bài đọc, sơ đồ từ vựng, worksheet, hoạt động nói, đánh giá và bài tập về nhà.',
    outputs: ['reading-studio', 'word2graph', 'assessment-core', 'student-practice'],
  },
  {
    id: 'vocabulary-cycle',
    title: 'Vocabulary learning cycle',
    titleVi: 'Chu trình học từ vựng',
    description: 'Word graph, flashcards, interactive practice, quiz and spaced homework.',
    descriptionVi: 'Sơ đồ từ, flashcard, hoạt động tương tác, quiz và bài ôn giãn cách.',
    outputs: ['word2graph', 'content-factory', 'textlab-activities', 'assessment-core', 'student-practice'],
  },
  {
    id: 'complete-lesson-pack',
    title: 'Complete lesson pack',
    titleVi: 'Gói bài dạy hoàn chỉnh',
    description: 'Lesson plan, worksheet, classroom activity, assessment and connected Lesson Pack.',
    descriptionVi: 'Giáo án, worksheet, hoạt động lớp học, đánh giá và Lesson Pack liên thông.',
    outputs: ['lesson-plan-ai', 'textlab-activities', 'assessment-core', 'lesson-pack'],
  },
  {
    id: 'news-teaching',
    title: 'News-to-classroom',
    titleVi: 'Từ bản tin đến lớp học',
    description: 'Adapt a news source into reading, vocabulary, discussion, critical-thinking tasks and a quiz.',
    descriptionVi: 'Chuyển bản tin thành bài đọc, từ vựng, thảo luận, tư duy phản biện và quiz.',
    outputs: ['reading-studio', 'word2graph', 'textlab-activities', 'assessment-core'],
  },
];

function safeId(prefix = 'eco') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function makeEcosystemAsset(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id || safeId('asset'),
    title: String(input.title || 'Nội dung chưa đặt tên').slice(0, 180),
    asset_type: String(input.asset_type || input.type || 'source'),
    source_app: String(input.source_app || input.sourceApp || 'content-ecosystem').slice(0, 80),
    content_text: String(input.content_text ?? input.content ?? '').slice(0, 300000),
    content_json: input.content_json && typeof input.content_json === 'object' ? input.content_json : {},
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    tags: Array.isArray(input.tags) ? input.tags.map(String).slice(0, 30) : [],
    status: String(input.status || 'draft'),
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
  };
}

export function makeCanvasBlocks(text = '') {
  const clean = String(text || '').trim();
  if (!clean) return [{ id: safeId('block'), type: 'source', title: 'Nguồn nội dung', content: '', locked: false }];
  const chunks = clean.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
  return chunks.slice(0, 24).map((content, index) => ({
    id: safeId('block'),
    type: index === 0 ? 'source' : 'section',
    title: index === 0 ? 'Nguồn nội dung' : `Khối ${index + 1}`,
    content,
    locked: false,
  }));
}

export function serializeCanvas(blocks = []) {
  return blocks.map((block) => `## ${block.title || 'Section'}\n${block.content || ''}`).join('\n\n').trim();
}

export function extractKeywords(text = '', limit = 18) {
  const stop = new Set(['about','after','again','also','because','before','being','between','could','every','first','from','have','into','more','other','should','their','there','these','they','this','through','under','very','were','where','which','while','with','would','your','that','than','then','them','what','when','will','được','những','trong','một','các','cho','và','của','với','không','này','đến','từ','theo','học','sinh','giáo','viên']);
  const counts = new Map();
  const words = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z][a-z'-]{3,}/g) || [];
  words.forEach((word) => { if (!stop.has(word)) counts.set(word, (counts.get(word) || 0) + 1); });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([word]) => word);
}

export function buildRecipePayload(asset, target, recipe) {
  const keywords = extractKeywords(asset?.content_text || '');
  const instructionByTarget = {
    'reading-studio': 'Create a leveled reading passage, comprehension questions, evidence notes and vocabulary support.',
    word2graph: `Create a word graph using these priority terms: ${keywords.join(', ')}. Include word family, collocations, examples, synonyms and antonyms.`,
    'textlab-activities': 'Create a set of native interactive classroom activities with timer, teams and scoring options.',
    'lesson-plan-ai': 'Create a lesson timeline aligned with objectives, activities, outputs, assessment and differentiation.',
    'assessment-core': 'Create a balanced question set with CEFR, skill, topic, difficulty, answer and explanation metadata.',
    'exam-studio': 'Create a test-ready question set with grouped passages/audio references and answer key.',
    'student-practice': 'Create an adaptive practice set with easier scaffolding, standard items and mastery review.',
    'content-factory': 'Create reusable teaching outputs from this source and preserve clear metadata.',
    'lesson-pack': 'Add this source and its planned outputs to a complete connected Lesson Pack.',
  };
  return {
    target: target.id,
    type: asset.asset_type || 'source',
    title: `${asset.title} · ${target.label}`,
    sourceApp: 'content-ecosystem',
    sourceTitle: recipe?.titleVi || 'Content Ecosystem',
    content: asset.content_text || '',
    metadata: {
      assetId: asset.id,
      recipeId: recipe?.id || '',
      instruction: instructionByTarget[target.id] || 'Transform this source for the destination application.',
      keywords,
      ecosystemVersion: '11.2.0',
    },
  };
}

export function dispatchRecipe(user, asset, recipe, selectedTargetIds = []) {
  const targets = ECOSYSTEM_TARGETS.filter((target) => selectedTargetIds.includes(target.id));
  return targets.map((target) => ({ target, transfer: createTransfer(user, buildRecipePayload(asset, target, recipe)) }));
}

export function createLessonPackTransfer(user, assets = [], title = 'Connected content kit') {
  const content = assets.map((asset, index) => `${index + 1}. ${asset.title}\n${asset.content_text || ''}`).join('\n\n');
  return createTransfer(user, {
    target: 'lesson-pack',
    type: 'content-kit',
    title,
    sourceApp: 'content-ecosystem',
    sourceTitle: 'Content Ecosystem',
    content,
    metadata: { assetIds: assets.map((asset) => asset.id), ecosystemVersion: '11.2.0' },
  });
}
