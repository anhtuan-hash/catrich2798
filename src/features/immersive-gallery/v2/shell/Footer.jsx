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

const COPY = {
  vi: {
    label: 'Thông tin và học vấn của giáo viên',
    department: 'Sở Giáo dục và Đào tạo Thành phố Hồ Chí Minh',
    schoolAlt: 'Trường Pétrus Ký',
    motto: 'Học tốt hơn · Tương lai tươi sáng hơn',
    teacher: 'Nguyễn Anh Tuấn',
    qualifications: 'Học vấn & Chứng chỉ chuyên môn',
    system: 'Hệ thống Trường Pétrus Ký',
    signoff: 'Cùng nhau dạy tốt hơn',
    credit: 'Thiết kế và phát triển bởi',
  },
  en: {
    label: 'Teacher identity and qualifications',
    department: 'Ho Chi Minh City Department of Education and Training',
    schoolAlt: 'Pétrus Ký School',
    motto: 'Better Learners · Brighter Futures',
    teacher: 'Mr Nguyễn Anh Tuấn',
    qualifications: 'Academic Qualifications & Professional Credentials',
    system: 'Pétrus Ký School System',
    signoff: 'Teach Better Together',
    credit: 'Designed & developed by',
  },
};

const TEACHER_ITEMS = [
  { icon: Landmark, vi: 'Trường Trung – Tiểu học Pétrus Ký', en: 'Pétrus Ký Primary and Secondary School' },
  { icon: GraduationCap, vi: 'Tổ trưởng chuyên môn tiếng Anh', en: 'Head of the English Department' },
  { icon: Phone, vi: '0339 270798', en: '0339 270798' },
  {
    icon: Building2,
    vi: 'Trung tâm khảo thí uỷ quyền tiếng Anh Cambridge VN070 · Sở Giáo dục và Đào tạo Thành phố Hồ Chí Minh',
    en: 'Authorised Cambridge English Exam Centre VN070 · Ho Chi Minh City Department of Education and Training',
  },
  {
    icon: ShieldCheck,
    vi: 'Giám khảo vấn đáp các kỳ thi tiếng Anh Cambridge',
    en: 'Speaking Examiner for Cambridge English Qualifications',
  },
];

const QUALIFICATION_LINES = [
  { vi: 'Cử nhân Ngôn ngữ Anh', en: 'Bachelor’s degree in English Language' },
  {
    vi: 'Văn bằng sau đại học chuyên ngành Quản lý giáo dục và lãnh đạo (Vương quốc Anh)',
    en: 'Postgraduate Diploma in Educational Management and Leadership (UK)',
  },
  {
    vi: 'Thạc sĩ Giảng dạy tiếng Anh cho người nói ngôn ngữ khác',
    en: 'Master’s degree in Teaching English to Speakers of Other Languages (TESOL)',
  },
  { vi: 'Thạc sĩ Quản lý giáo dục', en: 'Master’s degree in Educational Management' },
  { vi: 'Đang theo học Thạc sĩ Ngôn ngữ Anh', en: 'Currently pursuing a master’s degree in English Language Studies' },
];

export default function Footer({ language = 'vi', standalone = false }) {
  const locale = language === 'en' ? 'en' : 'vi';
  const copy = COPY[locale];
  const competition = standalone || Boolean(import.meta.env.MUSEUM_LAB_STANDALONE);

  return (
    <footer className={competition ? 'igv2-footer-wrap igv2-footer-wrap--competition' : 'igv2-footer-wrap'} data-testid="igv2-footer-root" lang={locale}>
      <section
        className="profile-footer"
        data-testid="igv2-footer"
        aria-label={copy.label}
      >
        <div className="footer-rule" aria-hidden="true">
          <i />
        </div>
        <div className="footer-band">
          <article className="footer-col footer-col--logos">
            <div className="footer-logos-row">
              <img
                src={deptMark}
                alt={copy.department}
                width={299}
                height={300}
                decoding="async"
              />
              <img
                src={schoolMark}
                alt={copy.schoolAlt}
                width={631}
                height={768}
                decoding="async"
              />
            </div>
            {!competition && <p className="footer-logos-motto">{copy.motto}</p>}
          </article>

          <article className="footer-col footer-col--teacher">
            <h3>{copy.teacher}</h3>
            <ul className="footer-list footer-list--icons">
              {TEACHER_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.vi}>
                    <Icon size={16} strokeWidth={1.6} className="footer-item-icon" aria-hidden="true" />
                    <span>{item[locale]}</span>
                  </li>
                );
              })}
            </ul>
          </article>

          <article className="footer-col footer-col--qual">
            <h3>{copy.qualifications}</h3>
            <ul className="footer-list footer-list--squares">
              {QUALIFICATION_LINES.map((line) => (
                <li key={line.vi}>
                  <span className="footer-red-square" aria-hidden="true" />
                  <span>{line[locale]}</span>
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
            <strong>{copy.system}</strong>
            <span className="footer-final-pipe" aria-hidden="true">|</span>
            <span className="footer-final-motto">
              {copy.signoff} <Heart size={14} strokeWidth={1.7} className="footer-heart" aria-hidden="true" />
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
              {copy.credit} <strong lang="vi">Nguyễn Anh Tuấn</strong>
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
