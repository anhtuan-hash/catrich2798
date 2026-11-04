import { createScrapbookTheme } from '../../utils/createScrapbookTheme.js';

export const assessmentScrapbook = createScrapbookTheme('assessment', 'Kiểm tra');

export function useAssessmentScrapbookActive(route, toolSlug) {
  const onAssessment = route === 'tool' && toolSlug === 'lesson-check-studio';
  return assessmentScrapbook.useTheme(onAssessment).enabled;
}
