export const GLOBAL_SUCCESS_CATALOG = Object.freeze({
  10: [
    'Family life',
    'Humans and the environment',
    'Music',
    'For a better community',
    'Inventions',
    'Gender equality',
    'Viet Nam and international organisations',
    'New ways to learn',
    'Protecting the environment',
    'Ecotourism',
  ],
  11: [
    'A long and healthy life',
    'The generation gap',
    'Cities of the future',
    'ASEAN and Viet Nam',
    'Global warming',
    'Preserving our heritage',
    'Education for school-leavers',
    'Becoming independent',
    'Social issues',
    'The ecosystem',
  ],
  12: [
    'Life stories we admire',
    'A multicultural world',
    'Green living',
    'Urbanisation',
    'The world of work',
    'Artificial intelligence',
    'The world of mass media',
    'Wildlife conservation',
    'Career paths',
    'Lifelong learning',
  ],
});

export const GLOBAL_SUCCESS_LESSONS = Object.freeze([
  { key: 'getting-started', title: 'Getting Started' },
  { key: 'language', title: 'Language' },
  { key: 'reading', title: 'Reading' },
  { key: 'speaking', title: 'Speaking' },
  { key: 'listening', title: 'Listening' },
  { key: 'writing', title: 'Writing' },
  { key: 'communication-culture', title: 'Communication and Culture / CLIL' },
  { key: 'looking-back', title: 'Looking Back' },
  { key: 'project', title: 'Project' },
  { key: 'review', title: 'Review / Test Yourself' },
]);

export function unitOptionsForGrade(grade) {
  const units = GLOBAL_SUCCESS_CATALOG[Number(grade)] || [];
  return units.map((title, index) => ({ no: index + 1, title }));
}

export function globalSuccessUnitTitle(grade, unitNo) {
  return GLOBAL_SUCCESS_CATALOG[Number(grade)]?.[Number(unitNo) - 1] || '';
}

export function globalSuccessLessonTitle(key) {
  return GLOBAL_SUCCESS_LESSONS.find((item) => item.key === key)?.title || '';
}
