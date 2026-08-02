import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const EMPTY_METRICS = {
  active: 0,
  dueSoon: 0,
  overdue: 0,
  review: 0,
};

function numberFrom(value) {
  const parsed = Number.parseInt(String(value || '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readMetrics(hero) {
  const page = hero?.closest('.v1093-work-hub');
  if (!page) return EMPTY_METRICS;
  const cards = [...page.querySelectorAll(':scope > .v1093-metrics article')];
  const values = cards.map((card) => numberFrom(card.querySelector('strong')?.textContent));
  return {
    active: values[0] || 0,
    dueSoon: values[1] || 0,
    overdue: values[2] || 0,
    review: values[3] || 0,
  };
}

function goTo(hash) {
  if (typeof window === 'undefined') return;
  window.location.hash = hash;
}

function openCreateForm() {
  if (typeof window === 'undefined') return;
  goTo('#/work-hub');
  window.setTimeout(() => {
    document.querySelector('.v1093-work-hub .v1093-create-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, 220);
}

export default function GlobalWorkHubGoogleHeroV2({ route }) {
  const [hero, setHero] = useState(null);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [runtime, setRuntime] = useState({ connected: false, role: '' });

  useEffect(() => {
    if (route !== 'work-hub' || typeof document === 'undefined') {
      setHero(null);
      return undefined;
    }

    let frame = 0;
    const resolveHero = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nextHero = document.querySelector('.v1093-page.v1093-work-hub .v1093-hero-work');
        if (!nextHero) return;
        nextHero.classList.add('work-hub-google-hero-v2');
        nextHero.closest('.v1093-work-hub')?.classList.add('work-hub-google-hero-v2-mounted');
        setHero((current) => current === nextHero ? current : nextHero);
      });
    };

    resolveHero();
    const observer = new MutationObserver(resolveHero);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.querySelectorAll('.work-hub-google-hero-v2').forEach((node) => node.classList.remove('work-hub-google-hero-v2'));
      document.querySelectorAll('.work-hub-google-hero-v2-mounted').forEach((node) => node.classList.remove('work-hub-google-hero-v2-mounted'));
    };
  }, [route]);

  useEffect(() => {
    if (!hero) return undefined;
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setMetrics(readMetrics(hero));
        const pill = hero.querySelector('.v1093-runtime-pill');
        setRuntime({
          connected: Boolean(pill?.querySelector('b')?.textContent?.includes('Đã kết nối')),
          role: String(pill?.querySelector('span')?.textContent || '').trim(),
        });
      });
    };
    refresh();
    const page = hero.closest('.v1093-work-hub');
    const observer = new MutationObserver(refresh);
    observer.observe(page || hero, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [hero]);

  const chart = useMemo(() => {
    const total = Math.max(1, metrics.active + metrics.review + metrics.overdue);
    const activeEnd = Math.round((metrics.active / total) * 100);
    const reviewEnd = Math.round(((metrics.active + metrics.review) / total) * 100);
    return {
      total: metrics.active + metrics.review + metrics.overdue,
      background: `conic-gradient(#0b57d0 0 ${activeEnd}%, #f9ab00 ${activeEnd}% ${reviewEnd}%, #d93025 ${reviewEnd}% 100%)`,
    };
  }, [metrics]);

  if (!hero) return null;

  return createPortal(
    <>
      <div className="work-hub-google-hero-actions" aria-label="Thao tác nhanh Trung tâm công việc">
        <button type="button" className="primary" onClick={openCreateForm}>
          <span aria-hidden="true">＋</span>Tạo công việc
        </button>
        <button type="button" onClick={() => goTo('#/work-hub?view=schedule')}>
          <span aria-hidden="true">▣</span>Xem lịch làm việc
        </button>
        <button type="button" onClick={() => goTo('#/resource-library')}>
          <span aria-hidden="true">□</span>Kho học liệu
        </button>
      </div>

      <div className="work-hub-google-hero-support" aria-label="Năng lực hệ thống">
        <span><i className="green" aria-hidden="true">◯</i>Kết nối tổ chuyên môn</span>
        <span><i className="blue" aria-hidden="true">⌁</i>Lưu trữ tập trung</span>
        <span><i className="violet" aria-hidden="true">◇</i>Quản lý minh bạch</span>
      </div>

      <section className="work-hub-google-hero-summary" aria-label="Tổng quan Trung tâm công việc">
        <article className="summary-card blue">
          <div className="summary-icon" aria-hidden="true">✓</div>
          <div><span>Công việc đang xử lý</span><strong>{metrics.active}</strong><small>{metrics.dueSoon} việc sắp đến hạn</small></div>
        </article>
        <article className="summary-card green">
          <div className="summary-icon" aria-hidden="true">▦</div>
          <div><span>Lịch chung tuần này</span><strong>{metrics.dueSoon}</strong><small>Theo dõi lịch toàn tổ</small></div>
        </article>
        <article className="summary-card amber">
          <div className="summary-icon" aria-hidden="true">□</div>
          <div><span>Hồ sơ chờ duyệt</span><strong>{metrics.review}</strong><small>{metrics.overdue} mục quá hạn</small></div>
        </article>
        <article className="summary-card status-card">
          <header><span>Trạng thái công việc</span><button type="button" onClick={() => goTo('#/work-hub')}>Xem chi tiết</button></header>
          <div className="status-content">
            <div className="status-chart" style={{ background: chart.background }}>
              <div><strong>{chart.total}</strong><span>Tổng số</span></div>
            </div>
            <dl>
              <div><dt><i className="dot blue" />Đang xử lý</dt><dd>{metrics.active}</dd></div>
              <div><dt><i className="dot amber" />Chờ phản hồi</dt><dd>{metrics.review}</dd></div>
              <div><dt><i className="dot red" />Quá hạn</dt><dd>{metrics.overdue}</dd></div>
            </dl>
          </div>
        </article>
        <footer className={runtime.connected ? 'connected' : 'connecting'}>
          <span aria-hidden="true">●</span>
          <div><strong>{runtime.connected ? 'Đã kết nối' : 'Đang kết nối'}</strong><small>{runtime.role || 'hệ thống'}</small></div>
          <p>Lưu học liệu đạt yêu cầu vào kho dùng chung</p>
        </footer>
      </section>
    </>,
    hero,
  );
}
