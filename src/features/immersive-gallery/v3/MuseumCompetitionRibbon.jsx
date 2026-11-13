import React from 'react';
import {Star} from 'lucide-react';
import './museumCompetitionRibbon.css';

// Competition credits are official Vietnamese document content, not translated
// navigation controls. Original, unmodified teacher-supplied logo files
// are stored locally in public/museum/branding; neither is AI-redrawn.
const contestName='HỘI THI THIẾT KẾ CHỦ ĐỀ DẠY HỌC STEM/STEAM, CHỦ ĐỀ DẠY HỌC SỐ';
const awardLabel='BÀI DỰ THI';
const yearLabel='CẤP THÀNH PHỐ · NĂM HỌC 2026–2027';
const fieldLabel='Lĩnh vực: Chủ đề dạy học số – Môn Tiếng Anh THPT';
const teacherLabel='GV thực hiện:';
const teacherName='Thạc sĩ Nguyễn Anh Tuấn';
const schoolName='Trường Trung - Tiểu học Pétrus Ký';
const departmentLogo='/museum/branding/hcmc-department-education-original.jpg';
const schoolLogo='/museum/branding/petrus-ky-original.png';

export default function MuseumCompetitionRibbon(){
 return <section className="bml-competition-ribbon" data-testid="museum-competition-ribbon"
  lang="vi" aria-label={awardLabel+" – "+contestName}>
  <div className="bml-competition-decor bml-competition-decor--left" aria-hidden="true"/>
  <div className="bml-competition-decor bml-competition-decor--right" aria-hidden="true"/>
  <figure className="bml-competition-seal bml-competition-seal--department">
   <img src={departmentLogo} width="299" height="300" alt="Logo Sở Giáo dục và Đào tạo Thành phố Hồ Chí Minh" loading="eager" decoding="async"/>
  </figure>
  <div className="bml-competition-copy">
   <div className="bml-competition-award"><Star size={15} fill="currentColor" aria-hidden="true"/> {awardLabel} <Star size={15} fill="currentColor" aria-hidden="true"/></div>
   <h2>{contestName}</h2>
   <div className="bml-competition-year">{yearLabel}</div>
   <p className="bml-competition-field">{fieldLabel}</p>
   <p className="bml-competition-author">{teacherLabel} <strong>{teacherName}</strong></p>
   <p className="bml-competition-school">{schoolName}</p>
  </div>
  <figure className="bml-competition-seal bml-competition-seal--school">
   <img src={schoolLogo} width="1682" height="2048" alt="Logo Trường Trung - Tiểu học Pétrus Ký – The Pioneers" loading="eager" decoding="async"/>
  </figure>
 </section>;
}
