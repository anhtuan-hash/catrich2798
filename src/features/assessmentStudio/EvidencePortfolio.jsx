import React,{useMemo,useRef,useState} from 'react';
import {ArrowLeft,BookOpenCheck,CheckCircle2,ClipboardCheck,Download,FileCheck2,FileJson,FileUp,Info,Printer,ShieldCheck,Trash2} from 'lucide-react';
import {PORTFOLIO_TYPES,validatePortfolioFile,portfolioReadiness} from './portfolioCore.js';
import './EvidencePortfolio.css';
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const pct=x=>x==null?'—':Number(x).toFixed(1)+'%';
const label={speaking:'SpeakScale',diagnostic:'DiagnosticScan',exit:'ExitTicket','two-tier':'Two-Tier'};
function reportHtml(items,meta,ready){
 const good=ready.qualified;
 const cell=(arr)=>'<tr>'+arr.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>';
 const table='<table><thead><tr><th>Loại công cụ</th><th>Lớp</th><th>Nội dung</th><th>Ban đầu (HS)</th><th>Ghép cặp (HS)</th><th>Trước</th><th>Sau</th></tr></thead><tbody>'+
 (items.length?items.map(i=>cell([label[i.type],i.className,i.title,i.preCount,i.pairedCount,pct(i.preAverage),pct(i.postAverage)])).join(''):'<tr><td colspan="7">Chưa có công cụ nào được nhập</td></tr>')+'</tbody></table>';
 return '<!doctype html><html lang="vi"><meta charset="UTF-8"><title>BRIAN – Minh chứng đổi mới kiểm tra đánh giá</title>'+
 '<style>body{font:14px/1.6 Arial,sans-serif;color:#263b56;max-width:1000px;margin:25px auto;padding:0 20px}h1{font-size:23px;margin-bottom:7px}h2{font-size:17px;margin-top:26px;border-bottom:1px solid #d8e2ee;padding-bottom:8px}table{border-collapse:collapse;width:100%;font-size:11px}td,th{border:1px solid #cbd6e3;padding:9px;text-align:left;vertical-align:top}th{background:#eaf2fa}tr{break-inside:avoid}.quiet{color:#667b93}.warn{color:#9a3840}.print{padding:9px 14px;margin:20px 0;color:white;background:#275da1;border:none;border-radius:9px}@media print{.print{display:none}body{margin:0;padding:0}}</style>'+
 '<h1>HỒ SƠ ĐỔI MỚI KIỂM TRA, ĐÁNH GIÁ</h1>'+
 '<p><b>Giáo viên:</b> '+esc(meta.teacher)+' · <b>Học kỳ:</b> '+esc(meta.term)+' · <b>Năm học:</b> '+esc(meta.year)+'</p>'+
 '<p><b>Nguyên tắc:</b> Hồ sơ tổng hợp công cụ, kết quả và hoạt động điều chỉnh. Không phải quyết định chấm điểm thi đua.</p>'+
 '<h2>I. Sản phẩm/công cụ đánh giá</h2>'+table+
 '<h2>II. Kết quả và biện pháp điều chỉnh dạy học</h2>'+
 (items.length?items.map((i,idx)=>'<h3>'+(idx+1)+'. '+esc(i.name)+' – '+esc(i.title)+'</h3>'+
 '<p><b>Đánh giá:</b> '+i.preCount+' HS lần đầu; '+i.postCount+' HS lần sau; '+i.pairedCount+' HS được ghép cặp; thay đổi TB '+pct(i.delta)+' (điểm phần trăm).</p>'+
 '<p><b>Vấn đề:</b> '+esc(i.adjustment.finding||'Chưa ghi')+'</p>'+
 '<p><b>Điều chỉnh:</b> '+esc(i.adjustment.action||'Chưa ghi')+'</p>'+
 '<p><b>Thực hiện:</b> '+esc(i.adjustment.date||'Chưa ghi')+' · <b>Nguồn:</b> '+esc(i.adjustment.evidence||'Chưa ghi')+'</p>'+
 '<p><b>Nhận xét:</b> '+esc(i.adjustment.reflection||'Chưa ghi')+'</p>'+
 '<p><b>Tình trạng minh chứng:</b> '+(i.demo?'DEMO / KHÔNG TÍNH':i.complete?'Đã có trường dữ liệu':'Chưa đủ')+' ('+i.readyCount+'/'+i.readyTotal+')</p>').join(''):'<p>Chưa có kết quả.</p>')+
 '<h2>III. Bảng kiểm đối chiếu Phụ lục 1</h2><ul>'+ready.checks.map(x=>'<li>'+(x.ok?'☑ ':'☐ ')+esc(x.label)+'</li>').join('')+'</ul>'+
 '<p><b>Công cụ hợp lệ theo bảng kiểm:</b> '+ready.eligibleCount+' · <b>Loại công cụ khác nhau:</b> '+ready.distinctTypes+'.</p>'+
 '<p class="warn">TRẠNG THÁI: '+(ready.complete?'ĐÃ CÓ CÁC TRƯỜNG MINH CHỨNG DỰ KIẾN; CHỜ KIỂM TRA BẢN GỐC.':'CHƯA ĐỦ CÁC TRƯỜNG MINH CHỨNG DỰ KIẾN.')+'</p>'+
 '<h2>IV. Ghi chú xác nhận</h2><p><b>Ý kiến tổ chuyên môn:</b> ...........................................................................................</p>'+
 '<p><b>Ngày xác nhận:</b> ........................... <b>Chữ ký:</b> ......................................</p>'+
 '<p class="quiet">Hồ sơ được tổng hợp từ các file sao lưu do giáo viên tự cung cấp, đã xác minh cấu trúc và tính nhất quán điểm theo khóa đáp án/rubric. Phần mềm không thể xác minh việc tổ chức tiết dạy thực tế, không kết luận mức tiến bộ do can thiệp và không tự công nhận 3,0 điểm. Không AI. Để lưu trữ, hãy giữ lại bản gốc và tài liệu minh chứng tương ứng.</p>'+
 '<button class="print" onclick="window.print()">In / Lưu PDF</button></html>';
}
function downloadSummary(meta,items,ready){
 const safeItems=items.map(({id,name,title,className,teacher,date,demo,complete,checks,readyCount,readyTotal,type,preCount,postCount,pairedCount,preAverage,postAverage,delta,adjustment})=>
 ({id,name,title,className,teacher,date,demo,complete,checks,readyCount,readyTotal,type,preCount,postCount,pairedCount,preAverage,postAverage,delta,adjustment}));
 const blob=new Blob([JSON.stringify({format:'BRIAN_EVIDENCE_PORTFOLIO',version:1,meta,items:safeItems,
  checks:ready.checks,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download='BRIAN-Evidence-Portfolio-summary.json';document.body.append(link);link.click();link.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1200);
}
export default function EvidencePortfolio({onBack}){
 const [items,setItems]=useState([]);
 const [meta,setMeta]=useState({teacher:'',term:'Học kỳ I',year:'2026–2027'});
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const fileRef=useRef();
 const readiness=useMemo(()=>portfolioReadiness(items,meta),[items,meta]);
 const onFiles=async files=>{
  if(!files?.length)return;
  const next=[],issues=[];
  for(const file of files){
   try{
    if(file.size>3_000_000)throw new Error('Tệp quá lớn (tối đa 3 MB).');
    const data=JSON.parse(await file.text());
    const row=validatePortfolioFile(data);
    next.push({...row,filename:file.name.slice(0,150)});
   }catch(e){issues.push(file.name+': '+e.message)}
  }
  setItems(previous=>{
   const map=new Map(previous.map(item=>[item.id,item]));
   next.forEach(item=>map.set(item.id,item));
   return [...map.values()].slice(0,30);
  });
  setNotice(next.length?'Đã đọc và đối chiếu '+next.length+' file theo khóa đáp án/rubric. Không lưu file lên máy chủ.':'');
  setError(issues.join('\n'));
  if(fileRef.current)fileRef.current.value='';
 };
 const print=()=>{
  const win=window.open('','_blank');
  if(!win){setError('Trình duyệt chặn cửa sổ in. Hãy cho phép mở pop-up.');return;}
  win.opener=null;
  win.document.open();win.document.write(reportHtml(items,meta,readiness));win.document.close();
 };
 return <main className="ep-root">
  <div className="ep-header">
   <div><div className="ep-kicker"><ShieldCheck size={17}/> BRIAN ASSESSMENT STUDIO · NO AI</div>
   <h2>Evidence <span>Portfolio</span></h2>
   <p>Hồ sơ minh chứng tổng hợp · Đổi mới kiểm tra, đánh giá môn Tiếng Anh</p></div>
   <div className="ep-actions"><button type="button" onClick={onBack}><ArrowLeft size={17}/> Danh mục</button>
    <button type="button" onClick={()=>fileRef.current?.click()}><FileUp size={17}/> Nhập file JSON</button>
    <input type="file" ref={fileRef} hidden multiple accept=".json,application/json" onChange={e=>onFiles(e.target.files)}/></div>
  </div>
  <div className="ep-disclosure"><Info size={18}/> Sử dụng file <b>Sao lưu JSON</b> từ SpeakScale, DiagnosticScan, ExitTicket hoặc Two-Tier. Ứng dụng chỉ giữ phần tóm tắt trong phiên trình duyệt, không lưu dữ liệu HS hoặc tải tệp lên máy chủ.</div>
  {error&&<div role="alert" className="ep-error" style={{whiteSpace:'pre-wrap'}}>{error}</div>}
  {notice&&<div role="status" className="ep-notice">{notice}</div>}
  <div className="ep-kpis">
   <div><span>Loại công cụ đủ dữ liệu</span><strong>{readiness.distinctTypes}/2</strong></div>
   <div><span>Bộ kết quả đủ dữ liệu</span><strong>{readiness.eligibleCount}</strong></div>
   <div><span>Có điều chỉnh & đánh giá lại</span><strong>{readiness.hasInterventions}</strong></div>
   <div><span>Bảng kiểm minh chứng</span><strong>{readiness.checks.filter(c=>c.ok).length}/{readiness.checks.length}</strong></div>
  </div>
  <div className="ep-columns">
   <section className="ep-card"><h3><BookOpenCheck size={20}/> Thông tin hồ sơ</h3>
    <div className="ep-form">
     <label>Giáo viên<input value={meta.teacher} onChange={e=>setMeta(s=>({...s,teacher:e.target.value}))} placeholder="Họ và tên giáo viên"/></label>
     <label>Học kỳ<select value={meta.term} onChange={e=>setMeta(s=>({...s,term:e.target.value}))}><option>Học kỳ I</option><option>Học kỳ II</option></select></label>
     <label>Năm học<input value={meta.year} onChange={e=>setMeta(s=>({...s,year:e.target.value}))} placeholder="2026–2027"/></label>
    </div>
    <h3><ClipboardCheck size={20}/> Các file minh chứng đã nhập</h3>
    <div className="ep-items">
     {items.length?items.map(item=><div key={item.id} className="ep-item">
      <div><strong>{item.name}</strong><span>{item.className||'Chưa khai báo lớp'} · {item.title||'Chưa có tên nội dung'}</span>
       <small>{item.preCount} lượt đầu · {item.pairedCount} ghép cặp · {item.readyCount}/{item.readyTotal} tiêu chí · {item.demo?'DEMO':item.complete?'Đã có dữ liệu':'Chưa đủ dữ liệu'}</small></div>
      <button type="button" title="Bỏ file khỏi danh sách" aria-label={'Bỏ '+item.name} onClick={()=>setItems(old=>old.filter(x=>x.id!==item.id))}><Trash2 size={18}/></button>
     </div>):<div className="ep-empty"><FileJson size={30}/><strong>Chưa nhập bộ minh chứng nào</strong>
      <span>Xuất file JSON từ tối thiểu hai công cụ khác nhau, sau đó nhập vào đây.</span></div>}
    </div>
   </section>
   <section className="ep-card"><h3><FileCheck2 size={20}/> Đối chiếu Tiêu chí 2</h3>
    <p className="ep-muted">Kiểm tra thành phần hồ sơ theo yêu cầu từ Phụ lục 1; không thay tổ chuyên môn xác minh hoạt động thực tế.</p>
    <div className="ep-checks">{readiness.checks.map((item,i)=><div key={i}><span className={item.ok?'pass':'wait'}>{item.ok?<CheckCircle2 size={18}/>:<span>○</span>}</span><span>{item.label}</span></div>)}</div>
    <p className="ep-verdict">{readiness.complete?'Đã có các trường minh chứng dự kiến; chờ xác minh tài liệu gốc.':'Hồ sơ đang thiếu thành phần; cần bổ sung.'}</p>
    <h3><Printer size={20}/> Xuất báo cáo</h3>
    <p className="ep-muted">PDF chỉ có thống kê theo công cụ và biện pháp điều chỉnh, không hiển thị tên học sinh. Bản tổng hợp JSON không thay thế các file nguồn.</p>
    <div className="ep-actions"><button type="button" disabled={!items.length} className="ep-primary" onClick={print}><Printer size={16}/> In / Lưu PDF</button>
     <button type="button" disabled={!items.length} onClick={()=>downloadSummary(meta,items,readiness)}><Download size={16}/> JSON tổng hợp</button>
    </div>
   </section>
  </div>
  <p className="ep-footer">BRIAN Evidence Portfolio v1.0 · No AI · No server storage · Evidence fields only · Teacher verification required</p>
 </main>;
}