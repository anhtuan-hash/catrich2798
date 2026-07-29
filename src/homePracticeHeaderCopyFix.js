function syncHomePracticeCopy() {
  const paragraph = document.querySelector(".metro-clean-system[data-route='home'] .bha-practice > header > div > p");
  if (!paragraph) return;
  const english = document.documentElement.lang === 'en';
  const nextText = english
    ? 'Scroll to view every lesson in each grade and sort by ABC or publication date.'
    : 'Cuộn để xem toàn bộ bài của từng khối và sắp xếp theo ABC hoặc ngày công bố.';
  if (paragraph.textContent !== nextText) paragraph.textContent = nextText;
}

if (!window.__brianPracticeHeaderCopyFixInstalled) {
  window.__brianPracticeHeaderCopyFixInstalled = true;
  const observer = new MutationObserver(syncHomePracticeCopy);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['lang', 'data-language'],
  });
  window.addEventListener('hashchange', syncHomePracticeCopy);
  syncHomePracticeCopy();
}
