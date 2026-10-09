import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, BookOpenCheck, ClipboardCheck, FileText, Mic2, Plus, Printer, Save, TicketCheck, Download, ArrowLeft, ShieldCheck } from 'lucide-react';
import { supabase } from '../utils/supabase.js';
import { comparePairedOutcomes, summarizeResults, csvEscape } from '../features/assessmentStudio/assessmentMath.js';
import { MODULES, RUBRICS, moduleFor } from '../features/assessmentStudio/catalogue.js';
import { buildAssessmentConfig, emptyStudentInput, scoreAssessmentSubmission, startingDraft } from '../features/assessmentStudio/assessmentWorkflow.js';
import { CreateAssessmentFields, AssessmentResultFields } from '../features/assessmentStudio/AssessmentForms.jsx';
import './AssessmentStudio.css';

const emptyDraft = startingDraft;
const emptyAdjustment = () => ({ finding: '', action_taken: '', status: 'planned', implementation_date: '', evidence_note: '', followup_result: '', followup_assessment_id: '' });
const escapeHtml = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const fmtDate = value => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const percent = (a,b) => b ? Math.round(a/b*100) : 0;

export default function AssessmentStudio({ currentUser }) {
  const owner = currentUser?.id;
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [results, setResults] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [followupResults, setFollowupResults] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [adjust, setAdjust] = useState(emptyAdjustment);
  const [studentName, setStudentName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [studentInput, setStudentInput] = useState(emptyStudentInput);
  const [view, setView] = useState('dashboard');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const detailRequestRef = useRef(0);
  const [error, setError] = useState('');
  const selected = items.find(item => item.id === selectedId) || null;
  const statistics = useMemo(() => summarizeResults(results), [results]);
  const followupId = adjust.followup_assessment_id || adjustments.find(a => a.followup_assessment_id)?.followup_assessment_id || '';
  const paired = useMemo(() => comparePairedOutcomes(results, followupResults), [results, followupResults]);

  const loadAssessments = useCallback(async () => {
    if (!supabase || !owner) return;
    const { data, error: fetchError } = await supabase.from('bes_assessments')
      .select('id,kind,title,class_label,objective,config,created_at')
      .eq('owner_id', owner).order('created_at', { ascending:false }).limit(200);
    if (fetchError) throw fetchError;
    setItems(data || []);
  }, [owner]);

  const loadDetail = useCallback(async () => {
    const requestId = ++detailRequestRef.current;
    if (!supabase || !owner || !selectedId) { setResults([]); setAdjustments([]); return; }
    const [r,a] = await Promise.all([
      supabase.from('bes_assessment_results')
        .select('id,student_name,student_code,answers,score,max_score,breakdown,assessed_at')
        .eq('owner_id',owner).eq('assessment_id',selectedId).order('assessed_at',{ascending:false}).limit(500),
      supabase.from('bes_assessment_adjustments')
        .select('id,finding,action_taken,status,implementation_date,evidence_note,followup_result,followup_assessment_id,created_at')
        .eq('owner_id',owner).eq('assessment_id',selectedId).order('created_at',{ascending:false}).limit(100),
    ]);
    if (requestId !== detailRequestRef.current) return;
    if (r.error) throw r.error;
    if (a.error) throw a.error;
    setResults(r.data || []);
    setAdjustments(a.data || []);
  }, [owner,selectedId]);

  useEffect(() => {
    let live = true;
    loadAssessments().catch(e => { if(live) setError('Chưa đọc được dữ liệu. Cần áp dụng tệp supabase/brian_assessment_studio_mvp.sql trong dự án Supabase: ' + e.message); });
    return () => { live = false; };
  }, [loadAssessments]);

  useEffect(() => {
    let live = true;
    loadDetail().catch(e => { if(live) setError('Không tải được kết quả: ' + e.message); });
    return () => { live = false; };
  }, [loadDetail]);

  useEffect(() => {
    let live = true;
    if (!supabase || !owner || !followupId) { setFollowupResults([]); return () => { live = false; }; }
    setFollowupResults([]);
    supabase.from('bes_assessment_results')
      .select('student_code,score,max_score').eq('owner_id',owner)
      .eq('assessment_id',followupId).order('assessed_at',{ascending:false}).limit(500)
      .then(({data,error:queryError}) => {
        if (!live) return;
        if (queryError) { setFollowupResults([]); setError(queryError.message); }
        else setFollowupResults(data || []);
      });
    return () => { live = false; };
  }, [owner, followupId]);

  const act = async (operation, success) => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await operation(); setNotice(success); }
    catch(e) { setError(e.message || 'Thao tác thất bại, vui lòng thử lại.'); }
    finally { setBusy(false); }
  };

  const create = () => act(async () => {
    if (!owner || !supabase) throw new Error('Cần đăng nhập và cấu hình Supabase.');
    const title = draft.title.trim();
    if (!title) throw new Error('Vui lòng nhập tên bài đánh giá.');
    const config = buildAssessmentConfig(draft.kind,draft);
    const { data, error: insertError } = await supabase.from('bes_assessments').insert({
      owner_id: owner, kind: draft.kind, title, class_label: draft.classLabel.trim(), objective: draft.objective.trim(),
      config
    }).select('id').single();
    if (insertError) throw insertError;
    await loadAssessments();
    setSelectedId(data.id); setView('assessment'); setDraft(emptyDraft());
  }, 'Đã tạo bài đánh giá. Hãy nhập kết quả thực tế.');

  const recordResult = () => act(async () => {
    if (!selected || !owner || !supabase) throw new Error('Hãy chọn bài đánh giá.');
    if (!studentName.trim()) throw new Error('Cần nhập họ và tên học sinh.');
    const grade = scoreAssessmentSubmission(selected,studentInput);
    const { error: insertError } = await supabase.from('bes_assessment_results').insert({
      owner_id: owner, assessment_id: selectedId, student_name: studentName.trim(),
      student_code: studentCode.trim(), score: grade.score, max_score: grade.maxScore,
      answers: grade.answers,
      breakdown: grade.breakdown
    });
    if (insertError) throw insertError;
    setStudentName(''); setStudentCode(''); setStudentInput(emptyStudentInput());
    await loadDetail();
  }, 'Đã lưu kết quả học sinh.');

  const saveAdjustment = () => act(async () => {
    if (!selected || !owner || !supabase) throw new Error('Hãy chọn bài đánh giá.');
    if (!adjust.finding.trim() || !adjust.action_taken.trim()) throw new Error('Cần mô tả vấn đề và biện pháp điều chỉnh.');
    if (adjust.status !== 'planned' && (!adjust.implementation_date || !adjust.evidence_note.trim())) {
      throw new Error('Trạng thái đã thực hiện yêu cầu ngày thực hiện và nội dung minh chứng.');
    }
    if (adjust.status === 'reviewed' && !adjust.followup_assessment_id) {
      throw new Error('Hãy liên kết bài đánh giá lại thực tế.');
    }
    if (adjust.status === 'reviewed' && !adjust.followup_result.trim()) {
      throw new Error('Trạng thái đã đánh giá lại yêu cầu ghi kết quả kiểm tra sau điều chỉnh.');
    }
    const { error: insertError } = await supabase.from('bes_assessment_adjustments').insert({
      owner_id: owner, assessment_id: selectedId, ...adjust,
      followup_assessment_id: adjust.followup_assessment_id || null,
      implementation_date: adjust.implementation_date || null
    });
    if (insertError) throw insertError;
    setAdjust(emptyAdjustment()); await loadDetail();
  }, 'Đã lưu nhật ký điều chỉnh dạy học.');

  const downloadCSV = () => {
    if (!selected) return;
    const headings = ['Họ tên','Mã học sinh','Điểm','Điểm tối đa','Ngày đánh giá'];
    const rows = results.map(r => [r.student_name,r.student_code,r.score,r.max_score,fmtDate(r.assessed_at)]);
    const csv = '\uFEFF' + [headings,...rows].map(row => row.map(csvEscape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href=url; anchor.download='brian-assessment-results.csv'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  };

  const printEvidence = () => {
    if (!selected) return;
    const safe = escapeHtml;
    const lines = results.map((r,i) => '<tr><td>'+ (i+1) +'</td><td>'+safe(r.student_name)+'</td><td>'+safe(r.score)+' / '+safe(r.max_score)+'</td></tr>').join('');
    const logs = adjustments.map(log => '<section><b>Vấn đề:</b> '+safe(log.finding)+
      '<p><b>Điều chỉnh:</b> '+safe(log.action_taken)+'</p><p><b>Trạng thái:</b> '+safe(log.status)+
      ' · <b>Ngày:</b> '+safe(log.implementation_date || 'Chưa ghi nhận')+'</p><p><b>Minh chứng:</b> '+safe(log.evidence_note)+
      '</p><p><b>Kết quả sau điều chỉnh:</b> '+safe(log.followup_result)+'</p><p><b>ID bài đánh giá lại:</b> '+safe(log.followup_assessment_id || 'Chưa liên kết')+'</p></section>').join('');
    const html = '<!doctype html><html lang="vi"><meta charset="utf-8"><title>Minh chứng đánh giá · BRIAN</title>'+
      '<style>body{font:15px Arial,sans-serif;max-width:850px;margin:40px auto;color:#223}h1{font-size:25px}h2{font-size:19px;margin-top:28px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #bbb;padding:9px;text-align:left}section{padding:12px 0;border-bottom:1px solid #ddd}button{padding:12px 16px}@media print{button{display:none}body{margin:0}}</style>'+
      '<h1>BRIAN · Hồ sơ minh chứng kiểm tra, đánh giá</h1><p>Chỉ ghi nhận kết quả đã nhập và biện pháp đã được giáo viên xác nhận.</p>'+
      '<p><b>Công cụ:</b> '+safe(selected.kind)+' · <b>Bài đánh giá:</b> '+safe(selected.title)+'</p>'+
      '<p><b>Lớp:</b> '+safe(selected.class_label)+' · <b>Mục tiêu:</b> '+safe(selected.objective)+'</p>'+
      '<p><b>Số kết quả:</b> '+statistics.count+' · <b>Điểm bình quân (%):</b> '+statistics.average.toFixed(1)+'</p>'+
      '<h2>Kết quả đánh giá</h2><table><thead><tr><th>STT</th><th>Học sinh</th><th>Điểm</th></tr></thead><tbody>'+lines+'</tbody></table>'+
      '<h2>Đối chiếu trước–sau</h2><p>'+ (paired.pairs ? ('Số học sinh ghép theo mã: '+paired.pairs+'; trước: '+paired.beforeAverage.toFixed(1)+'%; sau: '+paired.afterAverage.toFixed(1)+'%; chênh lệch: '+paired.change.toFixed(1)+' điểm phần trăm.') : 'Chưa có đủ mã học sinh khớp giữa hai bài để tính tiến bộ cá nhân.') + '</p>'+
      '<h2>Nhật ký điều chỉnh dạy học</h2>'+(logs || '<p>Chưa có biện pháp được ghi nhận.</p>')+
      '<p>Ngày xuất: '+safe(new Date().toLocaleString('vi-VN'))+'</p><button onclick="window.print()">In / Lưu PDF</button></html>';
    const w = window.open('', '_blank');
    if (!w) { setError('Trình duyệt đang chặn cửa sổ báo cáo. Vui lòng cho phép pop-up.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  };

  if (!currentUser) return <div className="bas-root"><h2>Vui lòng đăng nhập để sử dụng Assessment Studio.</h2></div>;
  const tag = moduleFor(selected?.kind)?.name || 'Assessment';
  const topics = Object.entries(statistics.topics);

  return (
    <main className="bas-root">
      <header className="bas-hero">
        <div>
          <div className="bas-eyebrow"><ShieldCheck size={16}/> TEACHER ASSESSMENT WORKSPACE · NO AI</div>
          <h1>BRIAN Assessment Studio</h1>
          <p>Kiểm tra, đánh giá theo tiêu chí rõ ràng · Phân tích thực tế · Ghi minh chứng điều chỉnh dạy học.</p>
          <div className="bas-hero-actions">
            <button type="button" onClick={() => {setView('dashboard');setSelectedId('');}}>Tổng quan</button>
            <button type="button" onClick={() => setView('create')}><Plus size={17}/> Tạo bài đánh giá</button>
            <a href="#/assessment-core">Ngân hàng câu hỏi ↗</a>
          </div>
        </div>
        <span className="bas-watermark"><BookOpenCheck size={66}/></span>
      </header>
      {error && <div className="bas-alert" role="alert">{error}</div>}
      {notice && <div className="bas-success" role="status">{notice}</div>}
      {!supabase && <div className="bas-alert">Chưa cấu hình Supabase. Hệ thống không lưu dữ liệu vào trình duyệt để tránh nhầm minh chứng thử nghiệm với dữ liệu thật.</div>}

      {view === 'dashboard' && <>
        <div className="bas-section-heading"><div><h2>12 công cụ đánh giá</h2><p>12 quy trình nhập kết quả và đánh giá do giáo viên thực hiện. Chưa có cổng học sinh làm bài trực tuyến.</p></div></div>
        <div className="bas-grid">
          {MODULES.map((m,i) => {
            const Icon = [Mic2,ClipboardCheck,TicketCheck,FileText,BarChart3,BookOpenCheck][i%6];
            return <button type="button" className={'bas-tile '+(m.status === 'ready' ? 'is-ready' : 'is-planned')} key={m.id}
              disabled={m.status !== 'ready'}
              onClick={() => {setDraft(d => ({...d,kind:m.id}));setView('create');}}>
              <span className="bas-tile-icon"><Icon size={24}/></span>
              <b>{m.name}</b><small>{m.subtitle}</small>
              <em>{m.status === 'ready' ? 'Tạo bài đánh giá' : 'Dự kiến'}</em>
            </button>;
          })}
        </div>
        <div className="bas-section-heading"><div><h2>Đợt đánh giá đã tạo</h2><p>Chọn một đợt để nhập điểm, xem phân tích và ghi nhận biện pháp.</p></div></div>
        {items.length === 0 ? <div className="bas-empty">Chưa có bài đánh giá nào. Hãy bắt đầu bằng DiagnosticScan hoặc SpeakScale.</div> :
          <div className="bas-list">{items.map(item =>
            <button type="button" key={item.id} onClick={() => {setSelectedId(item.id);setView('assessment');}} className="bas-list-item">
              <span><b>{item.title}</b><small>{item.class_label || 'Chưa chọn lớp'} · {item.kind} · {fmtDate(item.created_at)}</small></span><span>Chi tiết →</span>
            </button>)}</div>}
      </>}

      {view === 'create' && <section className="bas-panel">
        <button type="button" className="bas-back" onClick={() => setView('dashboard')}><ArrowLeft size={17}/> Trở về tổng quan</button>
        <h2>Tạo bài đánh giá mới</h2>
        <CreateAssessmentFields draft={draft} setDraft={setDraft}/>
        <button type="button" className="bas-primary" disabled={busy || !supabase} onClick={create}><Save size={17}/>{busy?'Đang lưu...':'Lưu bài đánh giá'}</button>
      </section>}

      {view === 'assessment' && selected && <div className="bas-workspace">
        <button type="button" className="bas-back" onClick={()=>{setSelectedId('');setView('dashboard')}}><ArrowLeft size={17}/> Danh sách đánh giá</button>
        <div className="bas-section-heading"><div><span className="bas-kicker">{tag}</span><h2>{selected.title}</h2><p>{selected.class_label || 'Chưa chọn lớp'} · {selected.objective || 'Chưa ghi mục tiêu'}</p></div>
          <div className="bas-actions"><button type="button" onClick={downloadCSV}><Download size={17}/> Xuất Excel/CSV</button><button type="button" onClick={printEvidence}><Printer size={17}/> Hồ sơ PDF</button></div>
        </div>
        <div className="bas-stats">
          <div><small>Lượt đánh giá đã nhập</small><b>{statistics.count}</b></div>
          <div><small>{selected.kind==='self'?'Trung bình tự đánh giá':'Điểm bình quân'}</small><b>{statistics.average.toFixed(1)}%</b></div>
          <div><small>Nhật ký điều chỉnh</small><b>{adjustments.length}</b></div>
        </div>
        <div className="bas-two-columns">
          <section className="bas-panel">
            <h3>Nhập kết quả đánh giá</h3>
            <p className="bas-help">Giáo viên nhập câu trả lời hoặc điểm đánh giá thực tế; học sinh chưa đăng nhập để làm bài trực tuyến trong bản này.</p>
            <label>Họ và tên học sinh<input value={studentName} maxLength={160} onChange={e=>setStudentName(e.target.value)} placeholder="Họ tên thực tế"/></label>
            <label>Mã học sinh (không bắt buộc)<input value={studentCode} onChange={e=>setStudentCode(e.target.value)}/></label>
            <AssessmentResultFields key={selectedId} selected={selected} input={studentInput} setInput={setStudentInput}/>
            <button type="button" className="bas-primary" disabled={busy} onClick={recordResult}><Save size={17}/> Lưu kết quả</button>
          </section>
          <section className="bas-panel">
            <h3>Phân tích kết quả</h3>
            {results.length===0 ? <p className="bas-help">Chưa có kết quả. Biểu đồ chỉ xuất hiện khi có dữ liệu đã nhập.</p>:null}
            {topics.map(([topic,v])=><div className="bas-progress" key={topic}><span>{topic} · {percent(v.achieved,v.total)}%</span><div><i style={{width:percent(v.achieved,v.total)+'%'}}/></div></div>)}
            {['rubric','scale'].includes(moduleFor(selected.kind)?.engine) && (selected.config?.criteria||selected.config?.statements||[]).map(k=>{
              const total=results.reduce((sum,r)=>sum+Number(r.breakdown?.criteria?.[k]||0),0);
              return <div className="bas-progress" key={k}><span>{k} · {results.length?(total/results.length).toFixed(1):'0'}/4</span><div><i style={{width:percent(total,results.length*4)+'%'}}/></div></div>;
            })}
            {results.length ? <div className="bas-results-table"><table><thead><tr><th>Học sinh</th><th>Điểm</th><th>Ngày</th></tr></thead><tbody>
              {results.map(r=><tr key={r.id}><td>{r.student_name}</td><td>{r.score}/{r.max_score}</td><td>{fmtDate(r.assessed_at)}</td></tr>)}
            </tbody></table></div>:null}
          </section>
        </div>
        <section className="bas-panel">
          <h3>Teaching Adjustment Tracker</h3>
          <p className="bas-help">Dùng kết quả đánh giá thực tế để ghi vấn đề, biện pháp điều chỉnh và minh chứng đã thực hiện.</p>
          <label>Vấn đề phát hiện<textarea rows={2} value={adjust.finding} onChange={e=>setAdjust(a=>({...a,finding:e.target.value}))} placeholder="Ví dụ: 60% học sinh chưa phân biệt gerund và infinitive"/></label>
          <label>Biện pháp điều chỉnh<textarea rows={2} value={adjust.action_taken} onChange={e=>setAdjust(a=>({...a,action_taken:e.target.value}))} placeholder="Nêu hoạt động dạy học và đối tượng áp dụng"/></label>
          <div className="bas-form-grid">
            <label>Trạng thái<select value={adjust.status} onChange={e=>setAdjust(a=>({...a,status:e.target.value}))}>
              <option value="planned">Đã lên kế hoạch</option><option value="implemented">Đã thực hiện</option><option value="reviewed">Đã đánh giá lại</option>
            </select></label>
            <label>Ngày thực hiện<input type="date" value={adjust.implementation_date} onChange={e=>setAdjust(a=>({...a,implementation_date:e.target.value}))}/></label>
          </div>
          <label>Liên kết bài đánh giá lại (cùng lớp và hình thức)<select value={adjust.followup_assessment_id} onChange={e=>setAdjust(a=>({...a,followup_assessment_id:e.target.value}))}>
            <option value="">Chưa liên kết</option>{items.filter(i=>i.id!==selectedId && i.kind===selected.kind && i.class_label===selected.class_label).map(i=><option key={i.id} value={i.id}>{i.title} · {fmtDate(i.created_at)}</option>)}
          </select></label>
          {followupId && <div className="bas-hint">Đối chiếu theo mã học sinh: {paired.pairs} học sinh có kết quả ở cả hai bài. {paired.pairs ? ('Trước '+paired.beforeAverage.toFixed(1)+'% → Sau '+paired.afterAverage.toFixed(1)+'% ('+(paired.change>=0?'+':'')+paired.change.toFixed(1)+' điểm phần trăm).') : 'Cần nhập cùng mã học sinh trong hai bài để tính tiến bộ cá nhân.'} Chỉ so sánh bài có mục tiêu và độ khó tương đương.</div>}
          <label>Ghi chú minh chứng<textarea rows={2} value={adjust.evidence_note} onChange={e=>setAdjust(a=>({...a,evidence_note:e.target.value}))} placeholder="Nguồn minh chứng: giáo án, phiếu học tập, biên bản..."/></label>
          <label>Kết quả đánh giá lại<textarea rows={2} value={adjust.followup_result} onChange={e=>setAdjust(a=>({...a,followup_result:e.target.value}))} placeholder="Ghi kết quả thực tế, số liệu hoặc đối chiếu bài đánh giá sau"/></label>
          <button type="button" className="bas-primary" disabled={busy} onClick={saveAdjustment}><Save size={17}/> Lưu nhật ký điều chỉnh</button>
          {adjustments.length>0 && <div className="bas-log-list">{adjustments.map(a=><article key={a.id}><b>{a.finding}</b><p>{a.action_taken}</p><small>{a.status==='planned'?'Kế hoạch':a.status==='implemented'?'Đã thực hiện':'Đã đánh giá lại'} · {fmtDate(a.implementation_date || a.created_at)}</small>{a.evidence_note?<p>Minh chứng: {a.evidence_note}</p>:null}{a.followup_result?<p>Kết quả sau: {a.followup_result}</p>:null}{a.followup_assessment_id?<p>Bài đánh giá lại đã liên kết: {items.find(i=>i.id===a.followup_assessment_id)?.title || a.followup_assessment_id}</p>:null}</article>)}</div>}
        </section>
      </div>}
      <footer className="bas-footer">BRIAN Assessment Studio · Chấm điểm theo đáp án và rubric · Không sử dụng AI · Dữ liệu minh chứng do giáo viên chịu trách nhiệm xác nhận.</footer>
    </main>
  );
}
