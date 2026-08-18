export const V2_TOOL_BRIDGE = {
  'classroom-screen': { label: 'Brian Classroom Stage', family: 'classroom', tone: 'blue', tested: true, fullscreen: true, level: 2 },
  'knowledge-train': { label: 'Knowledge Train', family: 'game', tone: 'violet', tested: true, fullscreen: true, level: 2 },
  'crossword-trial': { label: 'Crossword Trial', family: 'game', tone: 'blue', tested: true, fullscreen: true, level: 2 },
  'flying-words': { label: 'Flying Words', family: 'game', tone: 'cyan', tested: true, fullscreen: true, level: 2 },
  'top-five-arena': { label: 'Top Five Arena', family: 'game', tone: 'green', tested: true, fullscreen: true, level: 1 },
  'textlab-activities': { label: 'Brian TextLab Activities', family: 'authoring', tone: 'blue', tested: true, level: 2 },
  'exam-studio': { label: 'Exam Studio', family: 'assessment', tone: 'violet', tested: true, level: 2 },
  'lesson-plan-ai': { label: 'Lesson Architect', family: 'authoring', tone: 'blue', tested: true, level: 2 },
  'thpt-practice-hub': { label: 'THPT Interactive Practice Hub', family: 'assessment', tone: 'orange', tested: true, level: 2 },
  'seating-chart-studio': { label: 'Seating Chart Studio', family: 'classroom', tone: 'green', tested: true, level: 2 },
  'reading-studio': { label: 'Reading Studio', family: 'authoring', tone: 'orange', tested: true, level: 2 },
  'word2graph': { label: 'WordGraph Studio', family: 'authoring', tone: 'cyan', tested: true, level: 1 },
  'vietnam-tax': { label: 'Vietnam Tax Studio', family: 'utility', tone: 'blue', tested: true, level: 1 },
  'textcare': { label: 'TextCare Fixer', family: 'utility', tone: 'red', tested: true, level: 1 },
};

export function getToolBridgeMeta(slug) {
  return V2_TOOL_BRIDGE[slug] || { label: slug, family: 'tool', tone: 'blue', tested: false, level: 0 };
}

export function isBridgeTested(slug) {
  return Boolean(V2_TOOL_BRIDGE[slug]?.tested);
}

export function getBridgeLevel(slug) {
  return Number(V2_TOOL_BRIDGE[slug]?.level || 0);
}
