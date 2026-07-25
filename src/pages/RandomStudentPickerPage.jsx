import React from 'react';
import { RandomStudentPicker } from '../components/RandomStudentPickerBridge.jsx';
import './RandomStudentPickerGoogle.css';

export default function RandomStudentPickerPage({ currentUser }) {
  return (
    <div className="rsp-google-page">
      <section className="rsp-google-hero" aria-labelledby="rsp-google-title">
        <div className="rsp-google-brand" aria-hidden="true">
          <span className="rsp-google-brand-ring"><i>G</i></span>
          <span className="rsp-google-brand-dots"><i /><i /><i /><i /></span>
        </div>
        <div className="rsp-google-hero-copy">
          <span className="rsp-google-overline">BRIAN CLASSROOM · MATERIAL 3</span>
          <h1 id="rsp-google-title">Gọi tên học sinh</h1>
          <p>Chọn ngẫu nhiên công bằng, chia đội nhanh và quản lý danh sách lớp trong một không gian rõ ràng, nhẹ mắt.</p>
        </div>
        <div className="rsp-google-hero-badges" aria-label="Tính năng chính">
          <span><b>12</b> chế độ</span>
          <span><b>0</b> API</span>
          <span><b>100%</b> cục bộ</span>
        </div>
      </section>

      <RandomStudentPicker
        currentUser={currentUser}
        onClose={() => { window.location.hash = '#/apps'; }}
      />
    </div>
  );
}
