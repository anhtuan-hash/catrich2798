import React, { useMemo } from 'react';
import SectionHeader from '../components/SectionHeader.jsx';
import { loadBank, loadHistory, loadPrompts } from '../utils/library.js';

function readSafely(name, reader) {
  try {
    const value = reader();
    const rows = Array.isArray(value) ? value : [];
    return {
      name,
      ok: Array.isArray(value),
      detail: `read-only · ${rows.length} item${rows.length === 1 ? '' : 's'}`,
    };
  } catch (error) {
    return { name, ok: false, detail: error?.message || 'read failed' };
  }
}

function runChecks() {
  return [
    readSafely('Question Bank storage', loadBank),
    readSafely('Teacher Library history', loadHistory),
    readSafely('Prompt Studio storage', loadPrompts),
    {
      name: 'QA data safety',
      ok: true,
      detail: 'health check is read-only; no sample records are created',
    },
  ];
}

export default function QAHealthCheck({ language }) {
  const rows = useMemo(() => runChecks(), []);
  const passed = rows.filter((row) => row.ok).length;
  const vi = language === 'vi';

  return (
    <div className="page narrow qa-page">
      <button className="back-btn" onClick={() => window.history.back()}>← {vi ? 'Quay lại' : 'Back'}</button>
      <SectionHeader
        eyebrow="V1.0 · QA"
        title={vi ? 'Kiểm tra nhanh tính năng' : 'Feature health check'}
        text={vi
          ? 'Trang này chỉ đọc trạng thái thư viện, Prompt Studio và ngân hàng câu hỏi; không tạo dữ liệu kiểm thử.'
          : 'This page only reads library, Prompt Studio and question-bank state; it never creates test data.'}
      />
      <section className="panel qa-panel">
        <div className="result-summary inline-summary">
          <h1>{passed}/{rows.length}</h1>
          <p>{vi ? 'hạng mục đạt' : 'checks passed'}</p>
        </div>
        <div className="library-list compact-list">
          {rows.map((row) => (
            <article className={`question-row result-row ${row.ok ? 'ok' : 'wrong'}`} key={row.name}>
              <div>
                <strong>{row.ok ? '✓' : '×'} {row.name}</strong>
                <small>{row.detail}</small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
