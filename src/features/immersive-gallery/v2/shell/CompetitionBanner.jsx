import React from 'react';
import {Star} from 'lucide-react';
import departmentLogo from './branding/hcmc-education.jpg';
import schoolLogo from './branding/petrus-ky.png';
import bambooArt from './branding/bamboo.png';

const contestName = 'HỘI THI THIẾT KẾ CHỦ ĐỀ DẠY HỌC STEM/STEAM, CHỦ ĐỀ DẠY HỌC SỐ';
const awardLabel = 'BÀI DỰ THI';
const yearLabel = 'CẤP THÀNH PHỐ · NĂM HỌC 2026–2027';
const fieldLabel = 'Lĩnh vực dự thi: Chủ đề số';
const lessonTitle = 'OUR CLIMATE ACTION MUSEUM';
const lessonDeck = 'From a Group-Priority Survey to a 3D English Exhibition';
const lessonMeta = 'Môn học: Tiếng Anh  ·  Lớp: 11 – Global Success, Unit 5: Global Warming  ·  Thời lượng: 02 tiết × 45 phút';
const teacherLabel = 'GV thực hiện:';
const teacherName = 'Thạc sĩ Nguyễn Anh Tuấn';

export default function CompetitionBanner() {
  return (
    <header className="contest" data-testid="igv2-competition-banner" lang="vi"
      aria-label={awardLabel + ' – ' + lessonTitle}>
      <div className="contest-crest-wrap contest-crest-wrap--dept">
        <img className="crest" src={departmentLogo}
          alt="Logo Sở Giáo dục và Đào tạo Thành phố Hồ Chí Minh"
          width={299} height={300} />
      </div>
      <img className="contest-bamboo" src={bambooArt} alt="" aria-hidden="true" width={731} height={1473} />
      <div className="contest-mid">
        <div className="banner-ribbon">
          <Star size={13} fill="currentColor" aria-hidden="true" className="contest-ribbon-star" />
          <span>{awardLabel}</span>
          <Star size={13} fill="currentColor" aria-hidden="true" className="contest-ribbon-star" />
        </div>
        <div className="contest-sub">{contestName}</div>
        <div className="contest-level">{yearLabel}</div>
        <p className="contest-field">{fieldLabel}</p>
        <p className="contest-lesson">{lessonTitle}</p>
        <p className="contest-deck">{lessonDeck}</p>
        <p className="contest-meta">{lessonMeta}</p>
        <div className="contest-person">{teacherLabel} <strong>{teacherName}</strong></div>
      </div>
      <div className="contest-crest-wrap contest-crest-wrap--school">
        <img className="crest school" src={schoolLogo}
          alt="Logo Trường Trung - Tiểu học Pétrus Ký – The Pioneers"
          width={631} height={768} />
      </div>
    </header>
  );
}
