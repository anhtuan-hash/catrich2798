import React from 'react';
import { B2Button, B2SectionHeader } from '../components/B2UI.jsx';

const quickTools = [
  { icon: '▦', title: 'Teaching Launcher', meta: '12 công cụ', tone: 'blue' },
  { icon: '✦', title: 'Lesson Architect', meta: 'Soạn bài nhanh', tone: 'violet' },
  { icon: '✓', title: 'Assessment', meta: 'Thi & kiểm tra', tone: 'green' },
  { icon: '▥', title: 'Kho học liệu', meta: '248 tài liệu', tone: 'cyan' },
];

const classes = [
  { name: '12.6', students: 28, note: 'Lớp chủ nhiệm', tone: 'blue' },
  { name: '12.3', students: 31, note: 'Tiếng Anh', tone: 'violet' },
  { name: '11.3', students: 34, note: 'Tiếng Anh', tone: 'green' },
];

export default function B2Home({ navigate }) {
  return (
    <>
      <section className="b2-preview-head">
        <div>
          <span className="b2-eyebrow">BRIAN METRO NEXT · PRIVATE PREVIEW</span>
          <h1>Chào buổi tối, Tuấn.</h1>
          <p>Một workspace mới tập trung vào dạy học, quản lý lớp và công việc — ít trang trí hơn, rõ thứ bậc hơn.</p>
        </div>
        <div className="b2-date-block">
          <strong>18</strong>
          <span>THÁNG 8 · 2026</span>
          <small>Thứ Ba · Tuần 34</small>
        </div>
      </section>

      <section className="b2-hero-grid">
        <article className="b2-feature-tile b2-feature-tile--primary">
          <span className="b2-tile-label">HÔM NAY</span>
          <h2>Lớp 12.6</h2>
          <p>28 học sinh · Chủ nhiệm</p>
          <div className="b2-feature-actions">
            <button type="button">Mở lớp</button>
            <button type="button">Điểm danh</button>
          </div>
          <div className="b2-feature-number">12.6</div>
        </article>

        <article className="b2-feature-tile b2-feature-tile--dark">
          <span className="b2-tile-label">WEEKLY PRACTICE</span>
          <h2>Tuần 04</h2>
          <p>3 khối lớp đang mở · 65 bài</p>
          <button className="b2-link-btn" type="button">Xem bài tập →</button>
        </article>

        <article className="b2-feature-tile b2-feature-tile--plain">
          <span className="b2-tile-label">CÔNG VIỆC</span>
          <div className="b2-stat-line"><strong>08</strong><span>việc cần xử lý</span></div>
          <div className="b2-stat-line"><strong>03</strong><span>hạn trong hôm nay</span></div>
          <button className="b2-link-btn" type="button">Mở dashboard →</button>
        </article>
      </section>

      <section className="b2-section">
        <B2SectionHeader eyebrow="CÔNG CỤ" title="Mở nhanh" action={<B2Button variant="ghost" onClick={() => navigate?.('apps')}>Tất cả ứng dụng →</B2Button>} />
        <div className="b2-tool-grid">
          {quickTools.map((tool) => (
            <button className={`b2-tool-tile tone-${tool.tone}`} type="button" key={tool.title} onClick={() => tool.title === 'Teaching Launcher' && navigate?.('teaching-tools')}>
              <span className="b2-tool-icon">{tool.icon}</span>
              <span><strong>{tool.title}</strong><small>{tool.meta}</small></span>
              <em>↗</em>
            </button>
          ))}
        </div>
      </section>

      <section className="b2-section b2-section--split">
        <div>
          <B2SectionHeader eyebrow="LỚP HỌC" title="Đang phụ trách" />
          <div className="b2-class-list">
            {classes.map((item) => (
              <button type="button" className="b2-class-row" key={item.name}>
                <span className={`b2-class-code tone-${item.tone}`}>{item.name}</span>
                <span><strong>{item.note}</strong><small>{item.students} học sinh</small></span>
                <span>→</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <B2SectionHeader eyebrow="HỆ THỐNG" title="Trạng thái nhanh" />
          <div className="b2-health-panel">
            <div><span className="is-ok" /> <strong>Brian Cloud</strong><small>Đồng bộ bình thường</small></div>
            <div><span className="is-ok" /> <strong>Supabase</strong><small>Kết nối ổn định</small></div>
            <div><span className="is-ok" /> <strong>Autosave</strong><small>Đang hoạt động</small></div>
          </div>
        </div>
      </section>
    </>
  );
}
