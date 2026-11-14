import React from 'react';
import './contestMasthead.css';

const wingLeft = '/museum/branding/contest-wing-left.jpg';
const wingRight = '/museum/branding/contest-wing-right.jpg';

export default function ContestMasthead() {
  return (
    <div className="cmast">
      <img className="cmast-wing cmast-wing-l" src={wingLeft} alt="Logo Sở Giáo dục và Đào tạo Thành phố Hồ Chí Minh" width={500} height={463} />
      <div className="cmast-copy">
        <p className="cmast-award"><span>★</span> BÀI DỰ THI <span>★</span></p>
        <p className="cmast-event">HỘI THI THIẾT KẾ CHỦ ĐỀ DẠY HỌC STEM/STEAM, CHỦ ĐỀ DẠY HỌC SỐ</p>
        <p className="cmast-level">CẤP THÀNH PHỐ · NĂM HỌC 2026–2027</p>
        <p className="cmast-field"><i /><span>Lĩnh vực dự thi: Chủ đề số</span><i /></p>
        <p className="cmast-title">OUR CLIMATE ACTION MUSEUM</p>
        <p className="cmast-meta">Môn học: Tiếng Anh · Lớp: 11 – Global Success, Unit 5: Global Warming · Thời lượng: 02 tiết × 45 phút</p>
        <p className="cmast-teacher">GV thực hiện: Thạc sĩ Nguyễn Anh Tuấn</p>
      </div>
      <img className="cmast-wing cmast-wing-r" src={wingRight} alt="Logo Trường Trung - Tiểu học Pétrus Ký – The Pioneers" width={486} height={463} />
    </div>
  );
}
