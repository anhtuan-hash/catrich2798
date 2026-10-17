export const WORLDS = Object.freeze([
  { id: 'temple', title: 'Ancient Temple', symbol: '◇', subtitle: 'Decode the ancient vault' },
  { id: 'cyber', title: 'Cyber Lab', symbol: '⌘', subtitle: 'Unlock the future' },
  { id: 'library', title: 'Mystic Library', symbol: '✦', subtitle: 'Find the forgotten spell' },
]);

export function cleanText(input, limit = 240) {
  return String(input ?? '').trim().replace(/\s+/g, ' ').slice(0, limit);
}

export function normalizedAnswer(input) {
  return cleanText(input, 500).normalize('NFKC').toLocaleLowerCase('en-US');
}

export function answerMatches(puzzle, response) {
  if (!puzzle || !['choice', 'code'].includes(puzzle.kind)) return false;
  const expected = normalizedAnswer(puzzle.correct_answer);
  return expected.length > 0 && normalizedAnswer(response) === expected;
}

export function parseOptions(value) {
  const lines = Array.isArray(value) ? value : String(value ?? '').split(/\r?\n/g);
  return lines.map((item) => cleanText(item, 160)).filter(Boolean).slice(0, 4);
}

export function validatePuzzle(puzzle) {
  const kind = puzzle?.kind;
  if (!['choice', 'code'].includes(kind)) return 'Chọn một loại thử thách hợp lệ.';
  if (cleanText(puzzle.stem, 500).length < 8) return 'Câu hỏi cần ít nhất 8 ký tự.';
  if (!cleanText(puzzle.correct_answer, 180)) return 'Chưa có đáp án đúng.';
  if (kind === 'choice') {
    const opts = parseOptions(puzzle.options);
    if (opts.length !== 4 || new Set(opts.map(normalizedAnswer)).size !== 4) return 'Trắc nghiệm cần đúng 4 lựa chọn khác nhau.';
    if (!opts.some((o) => normalizedAnswer(o) === normalizedAnswer(puzzle.correct_answer))) return 'Đáp án phải trùng với một lựa chọn.';
  }
  return '';
}

export function validateQuest(quest, puzzles) {
  if (cleanText(quest?.title, 150).length < 5) return 'Tên Quest phải có ít nhất 5 ký tự.';
  if (!WORLDS.some((world) => world.id === quest?.world)) return 'Chủ đề thế giới không hợp lệ.';
  if (!puzzles?.length) return 'Cần ít nhất một câu hỏi trước khi xuất bản.';
  for (const p of puzzles) {
    const problem = validatePuzzle(p);
    if (problem) return problem;
  }
  return '';
}

export function graphLayout(nodes) {
  const total = Math.max(nodes.length, 1);
  return nodes.map((node, i) => {
    const ring = i < 7 ? 1 : 1.6;
    const angle = (i / Math.min(total, 7)) * Math.PI * 2 - Math.PI / 2;
    return { ...node, x: 350 + Math.cos(angle) * 185 * ring, y: 220 + Math.sin(angle) * 120 * ring };
  });
}

export function demoRecords() {
  return {
    nodes: [
      { id: 'demo-node-1', title: 'Relative Clauses', summary: 'Defining and non-defining clauses', grade: 11, unit_name: 'Unit 5', status: 'draft' },
      { id: 'demo-node-2', title: 'Participle Clauses', summary: 'Present and past participles', grade: 11, unit_name: 'Unit 5', status: 'draft' },
      { id: 'demo-node-3', title: 'Vocabulary', summary: 'Words in context', grade: 11, unit_name: 'Unit 5', status: 'draft' },
    ],
    edges: [{ id: 'demo-edge-1', from_node_id: 'demo-node-1', to_node_id: 'demo-node-2', relation: 'related' }],
    quests: [{ id: 'demo-quest-1', title: 'The Grammar Vault', world: 'temple', description: 'Unlock three chambers', status: 'draft' }],
    puzzles: [
      { id: 'demo-puzzle-1', quest_id: 'demo-quest-1', source_node_id: 'demo-node-1', position: 1, kind: 'choice', stem: 'The teacher _____ helped us win the award.', options: ['who', 'whom', 'whose', 'where'], correct_answer: 'who', clue: 'A person acting as subject', points: 10 },
      { id: 'demo-puzzle-2', quest_id: 'demo-quest-1', source_node_id: 'demo-node-2', position: 2, kind: 'code', stem: 'Complete: _____ by the rain, they stayed indoors.', options: [], correct_answer: 'Surprised', clue: 'Use a past participle', points: 10 },
    ],
  };
}
