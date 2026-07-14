import React, { useMemo } from 'react';
import SectionHeader from '../components/SectionHeader.jsx';
import { addBankItems, addHistoryEntry, addQuestionsFromTextToBank, loadBank, loadHistory, loadPrompts, savePromptEntry } from '../utils/library.js';

function runChecks() {
  const rows = [];
  const add = (name, ok, detail = '') => rows.push({ name, ok, detail });

  const sampleMcq = `1. Choose the best answer.\nA. one\nB. two\nC. three\nD. four\nAnswer: B`;
  try {
    const before = loadBank().length;
    const added = addQuestionsFromTextToBank(sampleMcq, { source: 'QA check', level: 'B2-C1' });
    add('Question Bank parser', added.length === 1, `added ${added.length}; bank ${before} → ${loadBank().length}`);
  } catch (err) {
    add('Question Bank parser', false, err.message);
  }

  try {
    const item = addHistoryEntry({ kind: 'qa', title: 'QA Health Check', content: 'Smoke test entry', tags: ['qa'] });
    add('Teacher Library history', Boolean(item?.id) && loadHistory().some((entry) => entry.id === item.id), 'history write/read OK');
  } catch (err) {
    add('Teacher Library history', false, err.message);
  }

  try {
    const prompt = savePromptEntry({ title: 'QA Prompt', category: 'QA', body: 'Create one MCQ.' });
    add('Prompt Studio storage', Boolean(prompt?.id) && loadPrompts().some((entry) => entry.id === prompt.id), 'prompt write/read OK');
  } catch (err) {
    add('Prompt Studio storage', false, err.message);
  }

  try {
    const added = addBankItems([{ question: 'QA manual question?', options: ['A', 'B', 'C', 'D'], answer: 'A', source: 'QA manual', level: 'B2-C1' }]);
    add('Manual bank insert', added.length === 1, `added ${added.length}`);
  } catch (err) {
    add('Manual bank insert', false, err.message);
  }

  return rows;
}

export default function QAHealthCheck({ language }) {
  const rows = useMemo(() => runChecks(), []);
  const passed = rows.filter((row) => row.ok).length;
  return (
    <div className="page narrow qa-page">
      <button className="back-btn" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
      <SectionHeader
        eyebrow="V1.0 · QA"
        title={language === 'vi' ? 'Kiểm tra nhanh tính năng' : 'Feature health check'}
        text={language === 'vi' ? 'Trang này chạy smoke test trên thư viện, prompt studio và ngân hàng câu hỏi.' : 'This page runs smoke checks for the library, prompt storage and the question bank.'}
      />
      <section className="panel qa-panel">
        <div className="result-summary inline-summary"><h1>{passed}/{rows.length}</h1><p>{language === 'vi' ? 'hạng mục đạt' : 'checks passed'}</p></div>
        <div className="library-list compact-list">
          {rows.map((row) => (
            <article className={`question-row result-row ${row.ok ? 'ok' : 'wrong'}`} key={row.name}>
              <div><strong>{row.ok ? '✓' : '×'} {row.name}</strong><small>{row.detail}</small></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
