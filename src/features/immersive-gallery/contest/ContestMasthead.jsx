import React from 'react';
import './contestMasthead.css';

export default function ContestMasthead() {
  return (
    <div className="cmast cmast-live" lang="vi">
      <img className="cmast-leaf cmast-leaf-tl" alt="" src="/museum/branding/swiss-bamboo-tl.png" />
      <img className="cmast-leaf cmast-leaf-br" alt="" src="/museum/branding/swiss-bamboo-br.png" />
      <img className="cmast-mark cmast-mark-seal" alt="Sở Giáo dục và Đào tạo Thành phố Hồ Chí Minh" src="/museum/branding/swiss-seal.png" />
      <div className="cmast-copy">
        <p className="cmast-badge">BÀI DỰ THI</p>
        <p className="cmast-line">HỘI THI THIẾT KẾ CHỦ ĐỀ DẠY HỌC STEM/STEAM, CHỦ ĐỀ DẠY HỌC SỐ</p>
        <p className="cmast-sub">
          <span>CẤP THÀNH PHỐ · NĂM HỌC 2026–2027</span>
          <span className="cmast-split" aria-hidden="true" />
          <span className="cmast-field">Lĩnh vực dự thi: Chủ đề số</span>
        </p>
        <h1>OUR CLIMATE ACTION MUSEUM</h1>
        <div className="cmast-rule" />
        <p className="cmast-meta">Môn học: Tiếng Anh · Lớp: 11 – Global Success, Unit 5: Global Warming · Thời lượng: 02 tiết × 45 phút</p>
        <p className="cmast-by">GV thực hiện: Thạc sĩ Nguyễn Anh Tuấn</p>
      </div>
      <div className="cmast-side">
        <img className="cmast-mark cmast-mark-school" alt="Pétrus Ký School" src="/museum/branding/swiss-school.png" />
        <p className="cmast-script">The Pioneers</p>
      </div>
    </div>
  );
}
