import React, { useMemo, useState } from 'react';
import { callAI } from '../utils/gemini.js';
import '../styles/TextCareAiAssistant.css';

const ACTIONS = [
  { id: 'proofread', labelVi: 'Sửa ngữ pháp', labelEn: 'Proofread', icon: '✓' },
  { id: 'professional', labelVi: 'Viết chuyên nghiệp', labelEn: 'Professional', icon: '✦' },
  { id: 'shorten', labelVi: 'Rút gọn', labelEn: 'Shorten', icon: '−' },
  { id: 'upgrade', labelVi: 'Nâng B2–C1', labelEn: 'Upgrade B2–C1', icon: '↗' },
  { id: 'explain', labelVi: 'Giải thích lỗi', labelEn: 'Explain errors', icon: '?' },
];

function buildInstruction(action, language, context) {
  const vi = language !== 'en';
  const instructions = vi
    ? {
        proofread: 'Sửa lỗi chính tả, ngữ pháp, dấu câu và diễn đạt. Giữ nguyên toàn bộ dữ kiện và cấu trúc hành chính cần thiết.',
        professional: 'Viết lại chuyên nghiệp, mạch lạc, trang trọng và phù hợp văn bản hành chính giáo dục Việt Nam. Không thêm dữ kiện mới.',
        shorten: 'Rút gọn khoảng 25–35% nhưng giữ đủ ý chính, tên riêng, số liệu, ngày tháng và yêu cầu hành động.',
        upgrade: 'Nâng chất lượng diễn đạt tiếng Anh lên mức B2–C1, dùng từ tự nhiên và chính xác, không làm thay đổi ý nghĩa. Nếu văn bản là tiếng Việt, viết lại tiếng Việt trang trọng hơn.',
        explain: 'Phân tích các lỗi hoặc điểm chưa tốt. Trình bày theo nhóm: lỗi, lý do, cách sửa và ví dụ ngắn. Không cần viết lại toàn bộ văn bản.',
      }
    : {
        proofread: 'Correct spelling, grammar, punctuation, and awkward wording. Preserve all facts and required administrative structure.',
        professional: 'Rewrite in a clear, professional, formal style suitable for an educational administrative document. Do not add facts.',
        shorten: 'Shorten by about 25–35% while preserving key ideas, names, figures, dates, and requested actions.',
        upgrade: 'Upgrade the English to a natural and accurate B2–C1 level without changing meaning. If the text is Vietnamese, make the Vietnamese more formal.',
        explain: 'Analyze errors and weak points by category: issue, reason, correction, and a brief example. Do not rewrite the whole text.',
      };
  return [
    instructions[action] || instructions.proofread,
    context?.docType ? `${vi ? 'Loại văn bản' : 'Document type'}: ${context.docType}.` : '',
  ].filter(Boolean).join('\n');
}

export default function TextCareAiAssistant({ language = 'vi', getText, applyText, getContext }) {
  const vi = language !== 'en';
  const [selected, setSelected] = useState('proofread');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  const selectedAction = useMemo(() => ACTIONS.find((item) => item.id === selected) || ACTIONS[0], [selected]);

  const run = async () => {
    const source = String(getText?.() || '').trim();
    if (!source) {
      setError(vi ? 'Hãy dán hoặc nhập nội dung trước khi dùng AI.' : 'Add some text before using AI.');
      return;
    }
    setLoading(true);
    setError('');
    setApplied(false);
    try {
      const context = getContext?.() || {};
      const instruction = buildInstruction(selected, language, context);
      const output = await callAI({
        task: 'textcare',
        language,
        prompt: `${instruction}\n\n${vi ? 'VĂN BẢN CẦN XỬ LÝ' : 'TEXT TO PROCESS'}:\n${source}`,
        context,
        label: vi ? `TextCare AI: ${selectedAction.labelVi}` : `TextCare AI: ${selectedAction.labelEn}`,
      });
      setResult(output);
    } catch (runError) {
      setError(runError?.message || (vi ? 'TextCare AI chưa thể xử lý yêu cầu.' : 'TextCare AI could not process the request.'));
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!result || selected === 'explain') return;
    applyText?.(result);
    setApplied(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setApplied(true);
    } catch {
      setError(vi ? 'Trình duyệt không cho phép sao chép tự động.' : 'The browser blocked automatic copying.');
    }
  };

  return (
    <section className="tc-ai-card" aria-label={vi ? 'Trợ lý AI của TextCare' : 'TextCare AI assistant'}>
      <header className="tc-ai-header">
        <div><span className="tc-ai-spark" aria-hidden="true">✦</span><div><small>OPENROUTER · FREE</small><h2>TextCare AI</h2></div></div>
        <span className="tc-ai-private">{vi ? 'Key bảo mật trên máy chủ' : 'Server-side key'}</span>
      </header>

      <div className="tc-ai-actions">
        {ACTIONS.map((action) => (
          <button key={action.id} type="button" className={selected === action.id ? 'active' : ''} onClick={() => { setSelected(action.id); setApplied(false); }}>
            <b aria-hidden="true">{action.icon}</b><span>{vi ? action.labelVi : action.labelEn}</span>
          </button>
        ))}
      </div>

      <div className="tc-ai-run-row">
        <p>{vi ? 'AI đọc nội dung đang có trong TextCare và chỉ xử lý khi thầy/cô nhấn nút.' : 'AI reads the current TextCare content only after you press the button.'}</p>
        <button type="button" className="tc-ai-run" onClick={run} disabled={loading}>
          {loading ? (vi ? 'Đang xử lý…' : 'Processing…') : (vi ? `Thực hiện: ${selectedAction.labelVi}` : `Run: ${selectedAction.labelEn}`)}
        </button>
      </div>

      {error ? <div className="tc-ai-error" role="alert">{error}</div> : null}

      {result ? (
        <div className="tc-ai-result">
          <div className="tc-ai-result-head">
            <strong>{selected === 'explain' ? (vi ? 'Phân tích của AI' : 'AI analysis') : (vi ? 'Bản đề xuất' : 'Suggested revision')}</strong>
            <span>{result.length.toLocaleString(vi ? 'vi-VN' : 'en-US')} {vi ? 'ký tự' : 'characters'}</span>
          </div>
          <textarea value={result} onChange={(event) => { setResult(event.target.value); setApplied(false); }} rows={8} aria-label={vi ? 'Kết quả AI' : 'AI result'} />
          <footer>
            <button type="button" onClick={copy}>{vi ? 'Sao chép' : 'Copy'}</button>
            {selected !== 'explain' ? <button type="button" className="primary" onClick={apply}>{applied ? (vi ? 'Đã áp dụng' : 'Applied') : (vi ? 'Thay nội dung hiện tại' : 'Replace current text')}</button> : null}
          </footer>
        </div>
      ) : null}
    </section>
  );
}
