import './components/HomeroomHeroIdentity.css';

let scheduled = false;

function safeText(value, fallback = '') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function parseClassSummary(value) {
  const parts = safeText(value).split('·').map((item) => item.trim()).filter(Boolean);
  return {
    className: parts[0] || 'Chưa đặt tên lớp',
    schoolYear: parts[1] || 'Chưa có năm học',
    studentCount: parts[2] || 'Chưa có sĩ số',
  };
}

function initials(value) {
  const words = safeText(value, 'GV').split(/\s+/).filter(Boolean);
  return words.slice(-2).map((word) => word[0] || '').join('').toUpperCase() || 'GV';
}

function enhanceHero() {
  if (!/homeroom|chu-nhiem|gvcn/i.test(window.location.hash || '')) return;
  const hero = document.querySelector('.hr-page .hr-hero');
  if (!hero) return;

  const copy = hero.querySelector('.hr-hero-copy');
  const meta = hero.querySelector('.hr-hero-meta');
  const board = hero.querySelector('.hr-board b');
  if (!copy || !meta) return;

  const originalRole = safeText(copy.querySelector(':scope > h1')?.textContent, 'Giáo viên chủ nhiệm');
  const originalSummary = safeText(copy.querySelector(':scope > span')?.textContent);
  const summary = parseClassSummary(originalSummary);
  const teacherName = safeText(meta.querySelector(':scope > b')?.textContent, 'Chưa xác định giáo viên');
  const teacherEmail = safeText(meta.querySelector(':scope > small')?.textContent);
  const isSubject = /bộ môn|subject/i.test(originalRole) || document.querySelector('.hr-page')?.classList.contains('is-subject-class');
  const roleLabel = isSubject ? 'Giáo viên bộ môn' : 'Giáo viên chủ nhiệm';
  const shortRole = isSubject ? 'GVBM' : 'GVCN';
  const signature = JSON.stringify([summary.className, summary.schoolYear, summary.studentCount, teacherName, teacherEmail, roleLabel]);

  hero.classList.add('bes-identity-hero');
  hero.classList.toggle('is-subject-identity', isSubject);

  let identity = copy.querySelector('.bes-hero-class-identity');
  if (!identity) {
    identity = document.createElement('div');
    identity.className = 'bes-hero-class-identity';
    copy.appendChild(identity);
  }
  if (identity.dataset.signature !== signature) {
    identity.dataset.signature = signature;
    identity.innerHTML = `
      <div class="bes-hero-kicker"><span></span>${isSubject ? 'KHÔNG GIAN LỚP BỘ MÔN' : 'KHÔNG GIAN LỚP CHỦ NHIỆM'}</div>
      <div class="bes-hero-class-title"><small>LỚP</small><strong>${summary.className}</strong></div>
      <div class="bes-hero-teacher-line"><span>${shortRole}</span><b>${teacherName}</b></div>
      <div class="bes-hero-facts">
        <span><small>Năm học</small><b>${summary.schoolYear}</b></span>
        <span><small>Sĩ số</small><b>${summary.studentCount}</b></span>
      </div>`;
  }

  let teacherCard = meta.querySelector('.bes-hero-teacher-identity');
  if (!teacherCard) {
    teacherCard = document.createElement('div');
    teacherCard.className = 'bes-hero-teacher-identity';
    meta.insertBefore(teacherCard, meta.firstChild);
  }
  if (teacherCard.dataset.signature !== signature) {
    teacherCard.dataset.signature = signature;
    teacherCard.innerHTML = `
      <div class="bes-hero-avatar" aria-hidden="true">${initials(teacherName)}</div>
      <div><small>${roleLabel}</small><strong>${teacherName}</strong>${teacherEmail ? `<span>${teacherEmail}</span>` : ''}</div>`;
  }

  meta.querySelectorAll(':scope > b, :scope > small').forEach((element) => element.classList.add('bes-hero-original-meta'));
  if (board && safeText(board.textContent) !== summary.className) board.textContent = summary.className;
}

function scheduleEnhance() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    enhanceHero();
  });
}

const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => (
    mutation.type === 'characterData'
    || [...mutation.addedNodes].some((node) => node.nodeType === 1)
  ))) scheduleEnhance();
});
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

window.addEventListener('hashchange', scheduleEnhance);
window.addEventListener('bes-homeroom-store-updated', scheduleEnhance);
window.addEventListener('bes-school-class-assignment-synced', scheduleEnhance);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleEnhance, { once: true });
} else {
  scheduleEnhance();
}
