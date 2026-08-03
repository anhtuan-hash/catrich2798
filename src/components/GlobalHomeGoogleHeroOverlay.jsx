import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './GlobalHomeGoogleHeroOverlay.css';

function Glyph({ name }) {
  const props = { viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false };
  if (name === 'home') return <svg {...props}><path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z" /></svg>;
  if (name === 'bell') return <svg {...props}><path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5zM10 20h4" /></svg>;
  if (name === 'shield') return <svg {...props}><path d="M12 3 19 6v5c0 4.6-2.9 7.6-7 9-4.1-1.4-7-4.4-7-9V6z" /><path d="m9 12 2 2 4-5" /></svg>;
  if (name === 'user') return <svg {...props}><circle cx="12" cy="8" r="3" /><path d="M5.5 20c.5-4.2 2.7-6.2 6.5-6.2s6 2 6.5 6.2" /></svg>;
  if (name === 'book') return <svg {...props}><path d="M5 5.5c2.3-1 4.7-.8 7 .5v13c-2.3-1.3-4.7-1.5-7-.5zM19 5.5c-2.3-1-4.7-.8-7 .5v13c2.3-1.3 4.7-1.5 7-.5z" /></svg>;
  if (name === 'calendar') return <svg {...props}><path d="M5 5h14v15H5zM8 3v4M16 3v4M5 9h14" /></svg>;
  if (name === 'chart') return <svg {...props}><path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-6" /></svg>;
  if (name === 'task') return <svg {...props}><path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="8" /></svg>;
}

function userDisplayName(currentUser, language) {
  const raw = currentUser?.full_name
    || currentUser?.display_name
    || currentUser?.name
    || currentUser?.user_metadata?.full_name
    || currentUser?.email?.split('@')?.[0]
    || '';
  const clean = String(raw).replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return language === 'en' ? 'Teacher' : 'Anh';
  return clean.split(' ').slice(-1)[0];
}

export default function GlobalHomeGoogleHeroOverlay({ route = 'home', language = 'vi', currentUser }) {
  const [host, setHost] = useState(null);
  const vi = language !== 'en';
  const name = useMemo(() => userDisplayName(currentUser, language), [currentUser, language]);

  useEffect(() => {
    if (route !== 'home' || typeof document === 'undefined') {
      setHost(null);
      return undefined;
    }

    let cancelled = false;
    const connect = () => {
      if (cancelled) return;
      const next = document.querySelector('.bha-home .hero-cms');
      if (next) {
        next.classList.add('hero-cms--google-refined');
        setHost(next);
      }
    };

    connect();
    const frame = window.requestAnimationFrame(connect);
    const retry = window.setTimeout(connect, 180);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retry);
      document.querySelector('.hero-cms--google-refined')?.classList.remove('hero-cms--google-refined');
    };
  }, [route]);

  if (!host) return null;

  return createPortal(
    <div className="google-home-visual" aria-hidden="true">
      <span className="google-home-cloud is-one" />
      <span className="google-home-cloud is-two" />
      <span className="google-home-dot is-blue" />
      <span className="google-home-dot is-yellow" />
      <span className="google-home-dot is-green" />

      <div className="google-home-monitor">
        <div className="google-home-monitor__bar">
          <span className="google-home-brand-mark">B</span>
          <span className="google-home-monitor__tools">
            <i><Glyph name="bell" /></i><i><Glyph name="shield" /></i><i className="is-user"><Glyph name="user" /></i>
          </span>
        </div>

        <div className="google-home-monitor__body">
          <aside className="google-home-rail">
            <i className="is-active"><Glyph name="home" /></i>
            <i><Glyph name="book" /></i>
            <i><Glyph name="calendar" /></i>
            <i><Glyph name="chart" /></i>
          </aside>

          <main className="google-home-dashboard">
            <header>
              <div><strong>{vi ? `Xin chào, ${name}!` : `Hello, ${name}!`}</strong><small>{vi ? 'Một ngày tuyệt vời để dạy và học.' : 'A great day to teach and learn.'}</small></div>
              <span className="google-home-status"><i />{vi ? 'Đã đồng bộ' : 'Synced'}</span>
            </header>

            <section className="google-home-stats">
              <article className="is-blue"><i><Glyph name="book" /></i><b>12</b><small>{vi ? 'Bài học' : 'Lessons'}</small></article>
              <article className="is-green"><i><Glyph name="calendar" /></i><b>248</b><small>{vi ? 'Hoạt động' : 'Activities'}</small></article>
              <article className="is-orange"><i><Glyph name="chart" /></i><b>86%</b><small>{vi ? 'Tiến độ' : 'Progress'}</small></article>
            </section>

            <section className="google-home-dashboard__lower">
              <article className="google-home-activity">
                <header><strong>{vi ? 'Hoạt động gần đây' : 'Recent activity'}</strong><span>•••</span></header>
                <div><i className="is-blue"><Glyph name="task" /></i><span><b>{vi ? 'Bài tập về nhà tuần này' : 'This week’s homework'}</b><small>{vi ? 'Ngữ pháp · Unit 5' : 'Grammar · Unit 5'}</small></span><em>1h</em></div>
                <div><i className="is-green"><Glyph name="book" /></i><span><b>{vi ? 'Bài kiểm tra ngữ pháp' : 'Grammar quiz'}</b><small>{vi ? 'Đã chấm tự động' : 'Auto-graded'}</small></span><em>2h</em></div>
                <div><i className="is-yellow"><Glyph name="calendar" /></i><span><b>{vi ? 'Luyện nói trực tuyến' : 'Online speaking practice'}</b><small>{vi ? 'Lớp 10A' : 'Class 10A'}</small></span><em>1d</em></div>
              </article>

              <article className="google-home-progress">
                <strong>{vi ? 'Tiến độ học tập' : 'Learning progress'}</strong>
                <div className="google-home-ring"><span>86%</span><small>{vi ? 'Hoàn thành' : 'Complete'}</small></div>
                <div className="google-home-mini-chart"><i /><i /><i /><i /><i /><i /></div>
              </article>
            </section>
          </main>
        </div>
      </div>

      <article className="google-home-float google-home-float--task">
        <i><Glyph name="task" /></i><span><strong>{vi ? 'Bài tập mới' : 'New assignment'}</strong><small>Unit 5 · Environment</small><b><em /></b></span><mark>75%</mark>
      </article>

      <article className="google-home-float google-home-float--class">
        <i><Glyph name="user" /></i><span><strong>{vi ? 'Lớp 10A' : 'Class 10A'}</strong><small>{vi ? '32 học sinh' : '32 students'}</small><b className="google-home-sparkline"><em /><em /><em /><em /><em /></b></span>
      </article>

      <article className="google-home-float google-home-float--schedule">
        <i><Glyph name="calendar" /></i><span><strong>{vi ? 'Lịch học ngày' : 'Today’s schedule'}</strong><small>{vi ? 'Thứ 2, 03/08' : 'Mon, 03/08'}</small><b>07:30&nbsp;&nbsp; English</b><b>09:30&nbsp;&nbsp; English</b></span>
      </article>

      <article className="google-home-float google-home-float--performance">
        <span><strong>{vi ? 'Hiệu suất học tập' : 'Learning performance'}</strong><b className="google-home-line-chart"><i /><i /><i /><i /><i /><i /><i /></b></span>
      </article>

      <div className="google-home-desk">
        <span className="google-home-books"><i /><i /><i /></span>
        <span className="google-home-plant"><i /><i /><i /><b /></span>
      </div>
    </div>,
    host,
  );
}
