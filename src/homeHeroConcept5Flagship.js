const HERO_SELECTOR = '.metro-clean-system[data-route="home"] .eh5-hero';

function markup() {
  const lang = document.documentElement.lang === 'en' ? 'en' : 'vi';
  const vi = lang !== 'en';
  return `
    <div class="eh5f-orbit eh5f-orbit--one" aria-hidden="true"></div>
    <div class="eh5f-orbit eh5f-orbit--two" aria-hidden="true"></div>

    <aside class="eh5f-side eh5f-side--left" aria-hidden="true">
      <div class="eh5f-flag"><span>★</span></div>
      <div class="eh5f-clipboard">
        <span class="eh5f-clip"></span>
        <i>✓</i><b></b><i>✓</i><b></b><i>✓</i><b></b>
      </div>
      <div class="eh5f-books">
        <span>TIẾNG ANH</span><span>BÀI TẬP</span><span>TÀI LIỆU</span>
      </div>
      <div class="eh5f-pencil-cup"><i></i><i></i><i></i></div>
      <div class="eh5f-float-card eh5f-game">🎮</div>
      <div class="eh5f-float-card eh5f-chat">💬</div>
    </aside>

    <div class="eh5f-center">
      <span class="eh5-badge">ENGLISH HUB</span>
      <h1>${vi ? 'Không gian dạy học thông minh' : 'A smart teaching workspace'}</h1>
      <h2>${vi ? '& sáng tạo' : '& creative learning'} <em>✦</em></h2>
      <p>${vi ? 'Tích hợp các công cụ hỗ trợ giảng dạy, học tập và quản lý hiệu quả — tối ưu cho giáo viên và học sinh.' : 'Teaching, learning and management tools brought together in one efficient workspace for teachers and students.'}</p>
      <div class="eh5-actions">
        <button type="button" class="eh5-primary" data-hero-action="start"><span>✦</span>${vi ? 'Bắt đầu ngay' : 'Get started'}<b>→</b></button>
        <button type="button" class="eh5-secondary" data-hero-action="guide"><span>▶</span>${vi ? 'Xem hướng dẫn' : 'View guide'}</button>
      </div>
    </div>

    <aside class="eh5f-side eh5f-side--right" aria-hidden="true">
      <div class="eh5f-cap">🎓</div>
      <div class="eh5f-dashboard">
        <div class="eh5f-dash-head"><strong>${vi ? 'Tổng quan học tập' : 'Learning overview'}</strong><small>${vi ? 'Tuần này' : 'This week'}</small></div>
        <div class="eh5f-stats">
          <article><small>${vi ? 'Bài luyện tập' : 'Practice'}</small><strong>24</strong><span>✓</span></article>
          <article><small>${vi ? 'Thời gian học' : 'Study time'}</small><strong>8h 45m</strong><span>◷</span></article>
          <article><small>${vi ? 'Điểm trung bình' : 'Average'}</small><strong>8.7</strong><span>↗</span></article>
        </div>
        <h3>${vi ? 'Tiến độ kỹ năng' : 'Skill progress'}</h3>
        <div class="eh5f-progress"><label>${vi ? 'Nghe' : 'Listening'}<i><b style="width:85%"></b></i><span>85%</span></label><label>${vi ? 'Nói' : 'Speaking'}<i><b style="width:78%"></b></i><span>78%</span></label><label>${vi ? 'Đọc' : 'Reading'}<i><b style="width:90%"></b></i><span>90%</span></label><label>${vi ? 'Viết' : 'Writing'}<i><b style="width:72%"></b></i><span>72%</span></label></div>
      </div>
      <div class="eh5f-apps"><span>📖</span><span>📁</span><span>🛡️</span></div>
    </aside>

    <div class="eh5f-trust"><span>✓</span><i></i><i></i><i></i><i></i><b>${vi ? 'Được tin tưởng bởi hàng nghìn giáo viên và học sinh trên toàn quốc' : 'Trusted by thousands of teachers and students nationwide'}</b></div>
  `;
}

function installHero(hero) {
  if (!hero || hero.dataset.flagshipHero === '1') return;
  hero.dataset.flagshipHero = '1';
  hero.classList.add('eh5-hero--flagship');
  hero.innerHTML = markup();
  hero.querySelector('[data-hero-action="start"]')?.addEventListener('click', () => {
    window.location.hash = localStorage.getItem('bes-current-user') ? '#/dashboard' : '#/login';
  });
  hero.querySelector('[data-hero-action="guide"]')?.addEventListener('click', () => {
    window.location.hash = '#/apps';
  });
}

function scan(root = document) {
  root.querySelectorAll?.(HERO_SELECTOR).forEach(installHero);
  if (root.matches?.(HERO_SELECTOR)) installHero(root);
}

const observer = new MutationObserver((records) => {
  records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) scan(node);
  }));
});
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', () => scan(), { once: true });
scan();
