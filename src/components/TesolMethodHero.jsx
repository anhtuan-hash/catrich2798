import {
  ArrowRight,
  BookOpenCheck,
  GraduationCap,
  LayoutDashboard,
  Network,
  Search,
  Sparkles,
} from 'lucide-react';
import './TesolMethodHero.css';

const PREVIEW_TERMS = [
  {
    title: 'Communicative Language Teaching',
    domain: 'Methodology',
    copy: 'Meaningful interaction and communicative competence at the centre of learning.',
  },
  {
    title: 'Interlanguage',
    domain: 'SLA',
    copy: 'A learner language system that develops as new forms and meanings are acquired.',
  },
  {
    title: 'Formative Assessment',
    domain: 'Assessment',
    copy: 'Evidence gathered during learning to guide feedback and next instructional steps.',
  },
];

export default function TesolMethodHero({ language = 'vi' }) {
  const isVietnamese = language !== 'en';

  const exploreTerms = () => {
    document.getElementById('tesol-method-explorer')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const openDashboard = () => {
    window.location.hash = '#/dashboard';
  };

  return (
    <section className="tesol-method-hero" aria-labelledby="tesol-method-hero-title">
      <div className="tesol-method-hero-glow tesol-method-hero-glow-a" aria-hidden="true" />
      <div className="tesol-method-hero-glow tesol-method-hero-glow-b" aria-hidden="true" />
      <div className="tesol-method-hero-grid" aria-hidden="true" />

      <div className="tesol-method-hero-inner">
        <div className="tesol-method-hero-copy">
          <div className="tesol-method-hero-kicker">
            <span className="tesol-method-hero-kicker-icon"><Sparkles size={15} /></span>
            <span>Brian English · ELT Knowledge Hub</span>
          </div>

          <h1 id="tesol-method-hero-title">
            Master <span>ELT Terms</span> &amp; Concepts
          </h1>
          <p className="tesol-method-hero-lead">
            Explore, connect, and teach with confidence.
            {isVietnamese ? ' Khám phá hệ thống thuật ngữ TESOL trong một không gian học tập trực quan và có kết nối.' : ' Build a connected understanding of the language-teaching concepts you use every day.'}
          </p>

          <div className="tesol-method-hero-features" aria-label={isVietnamese ? 'Điểm nổi bật' : 'Highlights'}>
            <div className="tesol-method-hero-feature">
              <span><BookOpenCheck size={19} /></span>
              <div>
                <strong>Curated ELT Knowledge</strong>
                <small>{isVietnamese ? 'Thuật ngữ chuyên môn được tổ chức theo lĩnh vực.' : 'Professional terms organised by domain.'}</small>
              </div>
            </div>
            <div className="tesol-method-hero-feature">
              <span><Network size={19} /></span>
              <div>
                <strong>Smart Connections</strong>
                <small>{isVietnamese ? 'Nhìn thấy mối liên hệ giữa phương pháp, SLA và đánh giá.' : 'See links across methodology, SLA and assessment.'}</small>
              </div>
            </div>
            <div className="tesol-method-hero-feature">
              <span><GraduationCap size={19} /></span>
              <div>
                <strong>Built for Teachers &amp; Learners</strong>
                <small>{isVietnamese ? 'Tra cứu nhanh, học sâu và dùng ngay trong thực hành giảng dạy.' : 'Search quickly, learn deeply and apply ideas in practice.'}</small>
              </div>
            </div>
          </div>

          <div className="tesol-method-hero-actions">
            <button type="button" className="tesol-method-hero-primary" onClick={exploreTerms}>
              <Search size={18} />
              <span>Explore Terms</span>
              <ArrowRight size={17} />
            </button>
            <button type="button" className="tesol-method-hero-secondary" onClick={openDashboard}>
              <LayoutDashboard size={18} />
              <span>View Dashboard</span>
            </button>
          </div>

          <div className="tesol-method-hero-domains" aria-label="ELT domains">
            <span>Methodology</span>
            <span>SLA</span>
            <span>Assessment</span>
            <span>Skills</span>
            <span>Phonology</span>
          </div>
        </div>

        <div className="tesol-method-hero-visual" aria-label={isVietnamese ? 'Bản xem trước kho thuật ngữ ELT' : 'ELT terms preview'}>
          <div className="tesol-method-preview-window">
            <div className="tesol-method-preview-topbar">
              <div className="tesol-method-preview-brand">
                <span className="tesol-method-preview-mark"><Network size={17} /></span>
                <div>
                  <strong>ELT Terms &amp; Concepts</strong>
                  <small>Connected knowledge explorer</small>
                </div>
              </div>
              <div className="tesol-method-preview-search"><Search size={15} /><span>Search concepts…</span></div>
            </div>

            <div className="tesol-method-preview-domain-row">
              <span className="is-active">Methodology</span>
              <span>SLA</span>
              <span>Assessment</span>
              <span>Skills</span>
            </div>

            <div className="tesol-method-preview-content">
              <div className="tesol-method-preview-list">
                {PREVIEW_TERMS.map((term, index) => (
                  <article key={term.title} className={index === 0 ? 'is-selected' : ''}>
                    <div>
                      <small>{term.domain}</small>
                      <strong>{term.title}</strong>
                      <p>{term.copy}</p>
                    </div>
                    <span className="tesol-method-preview-arrow">↗</span>
                  </article>
                ))}
              </div>

              <div className="tesol-method-preview-map" aria-hidden="true">
                <span className="tesol-method-map-line line-a" />
                <span className="tesol-method-map-line line-b" />
                <span className="tesol-method-map-line line-c" />
                <span className="tesol-method-map-node node-core">ELT</span>
                <span className="tesol-method-map-node node-method">Methodology</span>
                <span className="tesol-method-map-node node-sla">SLA</span>
                <span className="tesol-method-map-node node-assess">Assessment</span>
              </div>
            </div>

            <div className="tesol-method-preview-footer">
              <span><Sparkles size={14} /> Connected concepts</span>
              <strong>Explore the full knowledge map below</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
