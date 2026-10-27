import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileCheck2, LoaderCircle, ShieldCheck, Sparkles, X } from 'lucide-react';
import { supabase } from '../utils/supabase.js';
import { applyProofreadBlocks, chunkProofreadBlocks, extractProofreadBlocks, sameReportNumbers } from '../utils/reportProofreading.js';
import './ReportProofreadingStudio.css';

const MODES = [
  ['formal', 'Chuẩn hóa văn phong hành chính'],
  ['grammar', 'Sửa chính tả, ngữ pháp và dấu câu'],
  ['concise', 'Loại bỏ từ thừa, ý lặp'],
  ['full', 'Hiệu đính toàn diện'],
];

export default function ReportProofreadingStudio({ html, departmentId, onClose, onApply }) {
  const blocks = useMemo(() => extractProofreadBlocks(html), [html]);
  const [mode, setMode] = useState('formal');
  const [consent, setConsent] = useState(false);
  const [revisions, setRevisions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = async () => {
    if (!consent || busy) return;
    setBusy(true); setError(''); setStatus(''); setRevisions(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      if (!supabase) throw new Error('Supabase chưa sẵn sàng.');
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError || !data?.session?.access_token)
        throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
      const groups = chunkProofreadBlocks(blocks);
      if (!groups.length) throw new Error('Không tìm thấy đoạn thuyết minh cần hiệu đính.');
      const items = [];
      for (let i = 0; i < groups.length; i++) {
        setStatus('Đang hiệu đính nhóm ' + (i + 1) + '/' + groups.length + '…');
        const response = await fetch('/api/report-proofread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session.access_token },
          body: JSON.stringify({ departmentId, mode, blocks: groups[i] }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Không kết nối được dịch vụ hiệu đính.');
        if (!Array.isArray(payload.revisions) || payload.revisions.length !== groups[i].length)
          throw new Error('AI đã bỏ sót đoạn báo cáo, vui lòng thử lại.');
        items.push(...payload.revisions);
      }
      if (items.some((v, i) => v.id !== blocks[i].id)) throw new Error('Thứ tự nội dung không khớp bản gốc.');
      setRevisions(items);
      setStatus('Đã nhận bản đề xuất. Hãy đọc, điều chỉnh và duyệt từng mục trước khi áp dụng.');
    } catch (err) {
      if (err?.name !== 'AbortError') setError(err?.message || 'Lỗi hiệu đính không xác định.');
    } finally { setBusy(false); if (abortRef.current === controller) abortRef.current = null; }
  };

  const revise = (id, text) => setRevisions((current) => current.map((item) => item.id === id ? { ...item, text } : item));
  const apply = () => {
    try { onApply(applyProofreadBlocks(html, revisions)); }
    catch (err) { setError(err?.message || 'Không áp dụng được bản hiệu đính.'); }
  };
  const changed = revisions?.filter((v, i) => v.text !== blocks[i]?.text).length || 0;
  const safe = revisions && revisions.length === blocks.length &&
    revisions.every((v, i) => v.id === blocks[i].id && v.text?.trim() && sameReportNumbers(blocks[i].text, v.text));

  return (
    <div className="rps-overlay">
      <section className="rps-dialog" role="dialog" aria-modal="true" aria-label="AI hiệu đính báo cáo tháng">
        <header className="rps-header">
          <div>
            <small>BRIAN REPORTS · AI PROOFREADING STUDIO</small>
            <h2><Sparkles /> AI hiệu đính báo cáo tổ</h2>
            <p>Chỉ gửi đoạn thuyết minh. Tiêu đề, bảng số liệu, chữ ký và thông tin hành chính luôn được khóa.</p>
          </div>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Đóng"><X /></button>
        </header>
        <div className="rps-content">
          <div className="rps-settings">
            <label htmlFor="rps-mode">Chế độ hiệu đính</label>
            <select id="rps-mode" value={mode} onChange={(e) => setMode(e.target.value)} disabled={busy}>
              {MODES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <label className="rps-consent">
              <input type="checkbox" checked={consent} disabled={busy} onChange={(e) => setConsent(e.target.checked)} />
              <span>Tôi đồng ý gửi các đoạn thuyết minh đến Cloudflare Workers AI và đã kiểm tra quy định bảo mật của nhà trường.</span>
            </label>
            <div className="rps-actions">
              <button type="button" className="rps-primary" onClick={run} disabled={!consent || busy || !blocks.length}>
                {busy ? <LoaderCircle className="rps-spin" /> : <Sparkles />}
                {busy ? 'Đang xử lý…' : revisions ? 'Hiệu đính lại' : 'Bắt đầu hiệu đính'}
              </button>
              <span><ShieldCheck /> Không tự ghi đè báo cáo gốc</span>
            </div>
          </div>
          {error && <div className="rps-error" role="alert"><AlertTriangle /> {error}</div>}
          {status && <p className="rps-status" role="status">{status}</p>}
          <div className="rps-column-labels"><strong>Bản gốc</strong><strong>Bản AI đề xuất {revisions ? '· ' + changed + ' mục đã sửa' : ''}</strong></div>
          <div className="rps-blocks">
            {blocks.map((item, index) => (
              <div className="rps-pair" key={item.id}>
                <article className="rps-before"><small>Mục {index + 1}</small><p>{item.text}</p></article>
                <article className={'rps-after ' + (revisions?.[index]?.text !== item.text ? 'is-changed' : '')}>
                  {revisions ? (
                    <>
                      <small>{revisions[index]?.text === item.text ? 'Không thay đổi' : 'Có đề xuất chỉnh sửa'}</small>
                      <textarea aria-label={'Hiệu đính mục ' + (index + 1)} rows={Math.max(3, Math.ceil(item.text.length / 75))} value={revisions[index]?.text || ''} onChange={(e) => revise(item.id, e.target.value)} />
                    </>
                  ) : <p className="rps-placeholder">{busy ? 'AI đang xử lý…' : 'Chưa có bản hiệu đính'}</p>}
                </article>
              </div>
            ))}
          </div>
          {!blocks.length && <p>Báo cáo không có đoạn thuyết minh để gửi AI.</p>}
        </div>
        <footer className="rps-footer">
          <span><ShieldCheck /> AI có thể mắc lỗi. TTCM kiểm tra trước khi duyệt.</span>
          <div>
            <button type="button" onClick={onClose} disabled={busy}><X /> Hủy</button>
            <button type="button" className="rps-primary" disabled={!safe || busy} onClick={apply}><FileCheck2 /> Duyệt & áp dụng</button>
          </div>
        </footer>
      </section>
    </div>
  );
}