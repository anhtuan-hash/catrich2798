import React from 'react';
import schoolMark from './branding/petrus-ky.png';
import schoolBadge from './branding/petrus-ky-mark.png';
import deptMark from './branding/hcmc-education.png';
import {
  Building2,
  GraduationCap,
  Heart,
  Landmark,
  Monitor,
  Phone,
  ShieldCheck,
} from 'lucide-react';

// Route-scoped Swiss Editorial footer — one paper band, three columns, dark close.
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
        <div className="footer-rule" aria-hidden="true">
          <i />
        </div>
        <div className="footer-band">
          <article className="footer-col footer-col--logos">
            <div className="footer-logos-row">
              <img
                src={deptMark}
                alt="Sở Giáo dục và Đào tạo Thành phố Hồ Chí Minh"
                width={299}
                height={300}
                decoding="async"
              />
              <img
                src={schoolMark}
                alt="Pétrus Ký School"
                width={631}
                height={768}
                decoding="async"
              />
            </div>
            <p className="footer-logos-motto">Better Learners ·<br />Brighter Futures</p>
          </article>

          <article className="footer-col footer-col--teacher" lang="vi">
            <h3>NGUYỄN ANH TUẤN (MR.)</h3>
            <ul className="footer-list footer-list--icons">
              {TEACHER_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text}>
                    <Icon size={16} strokeWidth={1.6} className="footer-item-icon" aria-hidden="true" />
                    <span>{item.text}</span>
                  </li>
                );
              })}
            </ul>
          </article>

          <article className="footer-col footer-col--qual" lang="vi">
            <h3>HỌC VẤN & CHỨNG CHỈ CHUYÊN MÔN</h3>
            <ul className="footer-list footer-list--squares">
              {QUALIFICATION_LINES.map((line) => (
                <li key={line}>
                  <span className="footer-red-square" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <div className="footer-final">
        <div className="footer-final-inner">
          <div className="footer-final-left">
            <img
              src={schoolBadge}
              alt=""
              width={626}
              height={652}
              className="footer-final-logo"
            />
            <strong>PÉTRUS KÝ SCHOOL SYSTEM</strong>
            <span className="footer-final-pipe" aria-hidden="true">|</span>
            <span className="footer-final-motto">
              Teach Better Together <Heart size={14} strokeWidth={1.7} className="footer-heart" aria-hidden="true" />
            </span>
          </div>

          <a
            className="footer-final-right"
            href="https://decisive-difference-557977.framer.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Monitor size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>
              Designed & Developed by <strong>Nguyễn Anh Tuấn</strong>
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
