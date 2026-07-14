import React from 'react';
import SectionHeader from '../components/SectionHeader.jsx';
import RouteHero from '../components/RouteHero.jsx';

export default function Resources({ items, language }) {
  return (
    <div className="page narrow">
      <RouteHero
        eyebrow="Resources"
        title={language === 'vi' ? 'Tài nguyên • Hướng dẫn • Lộ trình' : 'Resources • Guides • Roadmap'}
        description={language === 'vi' ? 'Tập hợp học liệu, tài liệu hướng dẫn, checklist triển khai và lộ trình phát triển của Brian English Studio.' : 'A central hub for teaching resources, setup guides, rollout checklists and the Brian English Studio roadmap.'}
        primary={{ label: language === 'vi' ? 'Xem tài nguyên' : 'View resources', onClick: () => window.scrollTo({ top: 420, behavior: 'smooth' }) }}
        secondary={{ label: language === 'vi' ? 'Chạy QA' : 'Run QA', onClick: () => (window.location.hash = '#/qa') }}
        stats={[
          { label: language === 'vi' ? 'mục tài nguyên' : 'resource items', value: items.length, tone: 'teal' },
          { label: language === 'vi' ? 'trạng thái' : 'status', value: 'READY', tone: 'blue' },
        ]}
        tiles={[
          { icon: '📚', title: language === 'vi' ? 'Tài liệu dùng nhanh' : 'Quick guides', text: language === 'vi' ? 'Hướng dẫn cài đặt, dùng AI và quản lý học liệu.' : 'Setup, AI usage and library management guides.', tone: 'teal' },
          { icon: '🛠️', title: language === 'vi' ? 'Checklist vận hành' : 'Operating checklist', text: language === 'vi' ? 'Kiểm tra các luồng chính trước khi dạy thật.' : 'Validate core workflows before live use.', tone: 'blue' },
          { icon: '🚀', title: language === 'vi' ? 'Lộ trình nâng cấp' : 'Upgrade path', text: language === 'vi' ? 'Theo dõi phiên bản và đề xuất tính năng mới.' : 'Track versions and future feature proposals.', tone: 'orange' },
        ]}
        accent="teal"
        icon="📁"
      />
      <div className="resource-grid">
        {items.map((item) => (
          <article key={item.title} className="resource-card">
            <span>{item.icon}</span>
            <h3>{language === 'vi' ? item.titleVi : item.title}</h3>
            <p>{language === 'vi' ? item.textVi : item.text}</p>
          </article>
        ))}
      </div>
      <section className="panel qa-cta-panel">
        <h2>{language === 'vi' ? 'Kiểm tra nhanh V1.0' : 'V1.0 Health Check'}</h2>
        <p>{language === 'vi' ? 'Mở trang QA để kiểm tra parser, thư viện, prompt, ngân hàng câu hỏi và các luồng chính trước khi dạy.' : 'Open the QA page to check parsers, library, prompts, question-bank storage and core classroom flows.'}</p>
        <button className="primary" onClick={() => (window.location.hash = '#/qa')}>{language === 'vi' ? 'Chạy QA checks' : 'Run QA checks'}</button>
      </section>

      <section className="panel timeline-panel">
        <h2>{language === 'vi' ? 'Lộ trình phát triển' : 'Development roadmap'}</h2>
        <div className="timeline">
          <div><strong>V1.0</strong><span>{language === 'vi' ? 'Phát hành chính thức: dashboard, đăng nhập thật, AI tools, thư viện và Game Hub.' : 'Official release: dashboard, real login, AI tools, library and Game Hub.'}</span></div>
          <div><strong>V1.1</strong><span>{language === 'vi' ? 'Đồng bộ dữ liệu thư viện lên Supabase thay vì chỉ lưu local.' : 'Sync teacher library data to Supabase instead of local-only storage.'}</span></div>
          <div><strong>V1.2</strong><span>{language === 'vi' ? 'Backend proxy cho AI để bảo vệ API key tốt hơn.' : 'AI backend proxy for stronger API-key protection.'}</span></div>
          <div><strong>V1.3</strong><span>{language === 'vi' ? 'Báo cáo lớp học, analytics và xuất dữ liệu nâng cao.' : 'Classroom reports, analytics and advanced exports.'}</span></div>
        </div>
      </section>
    </div>
  );
}
