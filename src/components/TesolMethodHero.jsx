import { useState } from 'react';
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
    note: 'From controlled practice to purposeful communication.',
  },
  {
    title: 'Interlanguage',
    domain: 'SLA',
    copy: 'A learner language system that develops as new forms and meanings are acquired.',
    note: 'A changing system, not simply a collection of errors.',
  },
  {
    title: 'Formative Assessment',
    domain: 'Assessment',
    copy: 'Evidence gathered during learning to guide feedback and next instructional steps.',
    note: 'Assessment becomes part of the learning process itself.',
  },
];

export default function TesolMethodHero({ language = 'vi' }) {
  const [activeTerm, setActiveTerm] = useState(0);
  const isVietnamese = language !== 'en';
  const selectedTerm = PREVIEW_TERMS[activeTerm] || PREVIEW_TERMS[0];

  const exploreTerms = () => {
    document.getElementById('tesol-method-explorer')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const openDashboard = () => {
    window.location.hash = '#/dashboard';
  };

  const handlePointerMove = (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    event.currentTarget.style.setProperty('--tesol-shift-x', `${(x * 11).toFixed(2)}px`);
    event.currentTarget.style.setProperty('--tesol-shift-y', `${(y * 7).toFixed(2)}px`);
    event.currentTarget.style.setProperty('--tesol-tilt', `${(x * 1.25).toFixed(2)}deg`);
  };

  const handlePointerLeave = (event) => {
    event.currentTarget.style.setProperty('--tesol-shift-x', '0px');
    event.currentTarget.style.setProperty('--tesol-shift-y', '0px');
    event.currentTarget.style.setProperty('--tesol-tilt', '0deg');
  };

  return (
    <section
      className="tesol-method-hero tesol-editorial-shell"
      aria-labelledby="tesol-method-hero-title"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="tesol-editorial-grain" aria-hidden="true" />
      <div className="tesol-editorial-accent-line" aria-hidden="true" />

      <div className="tesol-editorial-shell-inner">
        <header className="tesol-editorial-masthead">
          <div>
            <span>BRIAN ENGLISH</span>
            <strong>ELT REVIEW</strong>
          </div>
          <div>
            <span>ACADEMIC JOURNAL</span>
            <strong>ISSUE 01 / 2026</strong>
          </div>
          <div>
            <span>KNOWLEDGE SERIES</span>
            <strong>TESOL</strong>
          </div>
        </header>

        <div className="tesol-editorial-grid">
          <div className="tesol-editorial-copy">
            <div className="tesol-editorial-kicker">
              <span><Sparkles size={15} /></span>
              <strong>ELT Knowledge Hub</strong>
              <i />
              <small>{isVietnamese ? 'Tuyển tập thuật ngữ' : 'Curated terminology'}</small>
            </div>

            <h1 id="tesol-method-hero-title">
              Master <em>ELT Terms</em> &amp; Concepts
            </h1>

            <p className="tesol-editorial-deck">
              Explore, connect, and teach with confidence.
              {isVietnamese
                ? ' Một trang đọc học thuật giúp bạn nhìn thuật ngữ TESOL như một hệ thống ý tưởng có liên hệ.'
                : ' An academic reading experience that treats TESOL terminology as a connected system of ideas.'}
            </p>

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

            <div className="tesol-editorial-notes" aria-label={isVietnamese ? 'Thông tin chuyên đề' : 'Issue notes'}>
              <span><BookOpenCheck size={15} /> Methodology</span>
              <span><Network size={15} /> SLA</span>
              <span><GraduationCap size={15} /> Assessment</span>
            </div>
          </div>

          <div className="tesol-editorial-visual" aria-label={isVietnamese ? 'Tạp chí ELT tương tác' : 'Interactive ELT journal'}>
            <div className="tesol-editorial-side-label" aria-hidden="true">TERMS / THEORY / PRACTICE</div>

            <article className="tesol-editorial-journal">
              <div className="tesol-editorial-journal-head">
                <span>FEATURED CONCEPT</span>
                <strong>{selectedTerm.domain}</strong>
              </div>

              <div className="tesol-editorial-journal-body">
                <div className="tesol-editorial-index">0{activeTerm + 1}</div>
                <div className="tesol-editorial-story">
                  <small>{selectedTerm.domain.toUpperCase()} / ELT CONCEPT</small>
                  <h2>{selectedTerm.title}</h2>
                  <p>{selectedTerm.copy}</p>
                  <blockquote>{selectedTerm.note}</blockquote>
                </div>
              </div>

              <div className="tesol-editorial-map" aria-hidden="true">
                <span className="is-core">ELT</span>
                <span>Methodology</span>
                <span>SLA</span>
                <span>Assessment</span>
                <i className="line-a" />
                <i className="line-b" />
                <i className="line-c" />
              </div>
            </article>

            <nav className="tesol-editorial-rail" aria-label={isVietnamese ? 'Chọn thuật ngữ nổi bật' : 'Select featured term'}>
              {PREVIEW_TERMS.map((term, index) => (
                <button
                  key={term.title}
                  type="button"
                  className={activeTerm === index ? 'is-active' : ''}
                  aria-pressed={activeTerm === index}
                  onClick={() => setActiveTerm(index)}
                >
                  <span>0{index + 1}</span>
                  <div>
                    <small>{term.domain}</small>
                    <strong>{term.title}</strong>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}
