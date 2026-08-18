export const V2_TOOL_BRIDGE = {
  'classroom-screen': { label: 'Brian Classroom Stage', family: 'classroom', tone: 'blue', tested: true, fullscreen: true },
  'knowledge-train': { label: 'Knowledge Train', family: 'game', tone: 'violet', tested: true, fullscreen: true },
  'crossword-trial': { label: 'Crossword Trial', family: 'game', tone: 'blue', tested: true, fullscreen: true },
  'flying-words': { label: 'Flying Words', family: 'game', tone: 'cyan', tested: true, fullscreen: true },
  'top-five-arena': { label: 'Top Five Arena', family: 'game', tone: 'green', tested: true, fullscreen: true },
  'textlab-activities': { label: 'Brian TextLab Activities', family: 'authoring', tone: 'blue', tested: true },
  'exam-studio': { label: 'Exam Studio', family: 'assessment', tone: 'violet', tested: true },
  'lesson-plan-ai': { label: 'Lesson Architect', family: 'authoring', tone: 'blue', tested: true },
  'thpt-practice-hub': { label: 'THPT Interactive Practice Hub', family: 'assessment', tone: 'orange', tested: true },
  'seating-chart-studio': { label: 'Seating Chart Studio', family: 'classroom', tone: 'green', tested: true },
  'reading-studio': { label: 'Reading Studio', family: 'authoring', tone: 'orange', tested: true },
  'word2graph': { label: 'WordGraph Studio', family: 'authoring', tone: 'cyan', tested: true },
  'vietnam-tax': { label: 'Vietnam Tax Studio', family: 'utility', tone: 'blue', tested: true },
  'textcare': { label: 'TextCare Fixer', family: 'utility', tone: 'red', tested: true },
};

export function getToolBridgeMeta(slug) {
  return V2_TOOL_BRIDGE[slug] || { label: slug, family: 'tool', tone: 'blue', tested: false };
}

export function isBridgeTested(slug) {
  return Boolean(V2_TOOL_BRIDGE[slug]?.tested);
}
