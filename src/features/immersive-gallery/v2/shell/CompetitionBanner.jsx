import React from 'react';
import {Star} from 'lucide-react';

// Full-width competition masthead. Text and logo paths are copied VERBATIM
// from v3/MuseumCompetitionRibbon.jsx (official 2026–2027 contest content).
// No institutions invented. Rendered FIRST on every Immersive Gallery V2 screen.
const contestName = 'HỘI THI THIẾT KẾ CHỦ ĐỀ DẠY HỌC STEM/STEAM, CHỦ ĐỀ DẠY HỌC SỐ';
const awardLabel = 'BÀI DỰ THI';
const yearLabel = 'CẤP THÀNH PHỐ · NĂM HỌC 2026–2027';
const fieldLabel = 'Lĩnh vực: Chủ đề dạy học số – Môn Tiếng Anh THPT';
const teacherLabel = 'GV thực hiện:';
const teacherName = 'Thạc sĩ Nguyễn Anh Tuấn';
const schoolName = 'Trường Trung - Tiểu học Pétrus Ký';
const departmentLogo = '/museum/branding/hcmc-department-education-original.jpg';
const schoolLogo = '/museum/branding/petrus-ky-original.png';

export default function CompetitionBanner() {
  return (
    <header className="contest" data-testid="igv2-competition-banner" lang="vi"
      aria-label={awardLabel + ' – ' + contestName}>
      <div className="contest-crest-wrap contest-crest-wrap--dept">
        <img className="crest" src={departmentLogo}
          alt="Logo Sở Giáo dục và Đào tạo Thành phố Hồ Chí Minh"
          width={299} height={300} loading="eager" decoding="async" />
      </div>
      <div className="contest-mid">
        <div className="banner-ribbon">
          <Star size={14} fill="currentColor" aria-hidden="true" className="contest-ribbon-star" />
          <span>{awardLabel}</span>
          <Star size={14} fill="currentColor" aria-hidden="true" className="contest-ribbon-star" />
        </div>
        <div className="contest-sub">{contestName}</div>
        <div className="contest-level">{yearLabel}</div>
        <div className="contest-field">{fieldLabel}</div>
        <div className="contest-person">{teacherLabel} <strong>{teacherName}</strong></div>
        <p className="contest-school">{schoolName}</p>
      </div>
      <div className="contest-crest-wrap contest-crest-wrap--school">
        <img className="crest school" src={schoolLogo}
          alt="Logo Trường Trung - Tiểu học Pétrus Ký – The Pioneers"
          width={1682} height={2048} loading="eager" decoding="async" />
      </div>
    </header>
  );
}
