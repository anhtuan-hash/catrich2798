// Home grade-entry launcher.
// Home stays a lightweight landing surface: clicking a grade entry opens the
// Weekly Practice Hub instead of mounting an exercise runner inline on Home.

const HOME_GRADE_BUTTON = ".app-shell[data-route='home'] .bha-folio-grade .bha-grade-copy > button";
const WEEKLY_PRACTICE_HUB_TARGET = '#/practice';

function gradeFromCard(card) {
  if (!card) return '';
  if (card.classList.contains('bha-folio-grade--10')) return '10';
  if (card.classList.contains('bha-folio-grade--11')) return '11';
  if (card.classList.contains('bha-folio-grade--12')) return '12';
  return '';
}

function handleHomeGradeEntry(event) {
  const button = event.target instanceof Element ? event.target.closest(HOME_GRADE_BUTTON) : null;
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const grade = gradeFromCard(button.closest('.bha-folio-grade'));
  try {
    if (grade) window.sessionStorage.setItem('bes-practice-entry-grade', grade);
  } catch {
    // Navigation must still work when browser storage is unavailable.
  }

  window.location.hash = WEEKLY_PRACTICE_HUB_TARGET;
}

window.addEventListener('click', handleHomeGradeEntry, true);
