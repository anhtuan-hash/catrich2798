import React from 'react';
import {
  Building2,
  GraduationCap,
  Heart,
  Landmark,
  Monitor,
  Phone,
  ShieldCheck,
} from 'lucide-react';

// Route-scoped Swiss Editorial footer — 3 credential cards + dark-navy closing strip.
// Exact Vietnamese institutional/qualification strings live in JS arrays to preserve
// audit-site-language.mjs guarantees while honoring bilingual/official contest content.

const TEACHER_ITEMS = [
  { icon: Landmark, text: 'Trường Trung – Tiểu học Pétrus Ký' },
  { icon: GraduationCap, text: 'Tổ trưởng chuyên môn tiếng Anh' },
  { icon: Phone, text: '0339 270798' },
  {
    icon: Building2,
    text: 'Trung tâm khảo thí ủy quyền tiếng Anh Cambridge VN070 | Sở giáo dục và đào tạo Thành phố Hồ Chí Minh',
  },
  { icon: ShieldCheck, text: 'Giám khảo vấn đáp các kì thi tiếng Anh Cambridge' },
];

const QUALIFICATION_LINES = [
  'Cử nhân Ngôn ngữ Anh',
  'Văn bằng sau đại học chuyên ngành Quản lý giáo dục và lãnh đạo (Vương quốc Anh)',
  'Thạc sĩ Giảng dạy tiếng Anh cho người nói ngôn ngữ khác',
  'Thạc sĩ Quản lý giáo dục',
  'Đang theo học Thạc sĩ Ngôn ngữ Anh',
];

export default function Footer() {
  return (
    <footer className="igv2-footer-wrap" data-testid="igv2-footer-root">
      <section
        className="profile-footer"
        data-testid="igv2-footer"
        aria-label="Teacher identity and qualifications"
      >
        {/* Card 1: Institutional Partner Logos + Motto */}
        <article className="footer-card footer-card--logos">
          <div className="footer-logos-row">
            <div className="footer-logo-slot">
              <img
                src="/brian-english-brand-logo.png"
                alt="Brian English brand logo"
                loading="lazy"
                decoding="async"
              />
            </div>
            <span className="footer-logo-sep" aria-hidden="true" />
            <div className="footer-logo-slot">
              <img
                src="/museum/branding/petrus-ky-original.png"
                alt="Petrus Ky School emblem"
                loading="lazy"
                decoding="async"
              />
            </div>
            <span className="footer-logo-sep" aria-hidden="true" />
            <div className="footer-logo-slot">
              <img
                src="/footer-cambridge-logo.png"
                alt="Cambridge Assessment English emblem"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <div className="footer-logos-motto">Better Learners · Brighter Futures</div>
          <span className="footer-corner footer-corner--gold" aria-hidden="true" />
        </article>

        {/* Card 2: Teacher Profile */}
        <article className="footer-card footer-card--teacher" lang="vi">
          <span className="footer-ribbon" aria-hidden="true" />
          <h3>NGUYỄN ANH TUẤN (MR.)</h3>
          <ul className="footer-list footer-list--icons">
            {TEACHER_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.text}>
                  <Icon size={15} strokeWidth={1.7} className="footer-item-icon" aria-hidden="true" />
                  <span>{item.text}</span>
                </li>
              );
            })}
          </ul>
          <span className="footer-corner footer-corner--slate" aria-hidden="true" />
        </article>

        {/* Card 3: Academic & Professional Qualifications */}
        <article className="footer-card footer-card--qual" lang="vi">
          <span className="footer-ribbon" aria-hidden="true" />
          <h3>{'HỌC VẤN & CHỨNG CHỈ CHUYÊN MÔN'}</h3>
          <ul className="footer-list footer-list--squares">
            {QUALIFICATION_LINES.map((line) => (
              <li key={line}>
                <span className="footer-red-square" aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <span className="footer-corner footer-corner--gold" aria-hidden="true" />
        </article>
      </section>

      <div className="footer-final">
        <div className="footer-final-inner">
          <div className="footer-final-left">
            <img
              src="/brian-english-brand-mark.png"
              alt="Brian English"
              width={24}
              height={24}
              className="footer-final-logo"
            />
            <strong>BRIAN ENGLISH</strong>
            <span className="footer-final-pipe" aria-hidden="true">|</span>
            <span className="footer-final-motto">
              Teach Better Together <Heart size={13} strokeWidth={2} className="footer-heart" aria-hidden="true" />
            </span>
          </div>

          <a
            className="footer-final-right"
            href="https://decisive-difference-557977.framer.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Monitor size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>
              Designed &amp; Developed by <strong>Nguyễn Anh Tuấn</strong>
            </span>
          </a>
        </div>
        <span className="footer-final-accent" aria-hidden="true" />
      </div>
    </footer>
  );
}
