import React from 'react';
import './StudentSupportCenter.css';

export default function StudentSupportCenter({ language = 'vi' }) {
  const vi = language === 'vi';
  return (
    <main className="student-support-center" aria-labelledby="student-support-title">
      <section className="student-support-hero">
        <div>
          <span className="student-support-kicker">Student Support Center</span>
          <h1 id="student-support-title">{vi ? 'Trung tâm Hỗ trợ Học sinh' : 'Student Support Center'}</h1>
          <p>
            {vi
              ? 'Tổng hợp dữ liệu thực tế, cảnh báo theo quy tắc và quy trình hỗ trợ do giáo viên quyết định.'
              : 'Review factual school data, deterministic alerts and teacher-controlled support workflows.'}
          </p>
        </div>
        <span className="student-support-no-ai">{vi ? 'Không AI' : 'No AI'}</span>
      </section>

      <section className="student-support-empty" aria-live="polite">
        <strong>{vi ? 'Đang hoàn thiện dữ liệu nền' : 'Core data layer in progress'}</strong>
        <p>{vi ? 'Student 360, cảnh báo và hồ sơ hỗ trợ sẽ được mở theo từng bước kiểm thử.' : 'Student 360, alerts and support cases will be enabled after each verification gate.'}</p>
      </section>
    </main>
  );
}
