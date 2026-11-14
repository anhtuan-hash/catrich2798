import React,{useEffect,useMemo,useState} from 'react';
import {Users,CheckCircle2,MessageSquareText,Hand,MonitorPlay,ArrowLeftRight,ShieldCheck,AlertTriangle,X,RefreshCw} from 'lucide-react';
import MuseumBeforeAfter from '../../v3/MuseumBeforeAfter.jsx';
import {englishSystemGroupLabel} from '../../v3/museumApi.js';
import {classroomSummary} from '../../v3/museumCommandCenter.js';
const t=(lang,vi,en)=>lang==='en'?en:vi;
const safeLabel=value=>englishSystemGroupLabel(value||'Group');
const prettyState=(state,lang='vi')=>({
  issued:t(lang,'Đã phát phiếu','Invitation issued'),editing:t(lang,'Đang chỉnh sửa','Editing'),
  changes_requested:t(lang,'Cần sửa lại','Changes requested'),submitted:t(lang,'Đã nộp','Submitted'),
  ttcm_review:t(lang,'Đang duyệt','Under review'),approved_locked:t(lang,'Đã duyệt','Approved'),
  published:t(lang,'Đã công bố','Published')
})[state]||t(lang,'Đang làm','Working');
/**
 * CommandCenter — editorial Classroom Command Center.
 * Reuses v3 classroomSummary() data model and the same onSpotlight/onCompare handlers;
 * group feedback tabs, before/after compare overlay, help alerts and quality warnings preserved.
 */
export default function CommandCenter({
  groups=[],responses=[],feedback=[],microResults=[],helpGroups=[],
  session=null,compact=false,busy=false,onRefresh,onSpotlight,onCompare,language='vi'
}){
  const model=useMemo(()=>classroomSummary({groups,responses,feedback,microResults,helpGroups}),
    [groups,responses,feedback,microResults,helpGroups]);
  const [selectedId,setSelectedId]=useState(null);
  const [tab,setTab]=useState('received');
  const [qualityOpen,setQualityOpen]=useState(false);
  const [compareData,setCompareData]=useState(null);
  const [compareBusy,setCompareBusy]=useState(false);
  const [compareError,setCompareError]=useState('');
  useEffect(()=>{if(!model.groups.some(g=>g.id===selectedId))setSelectedId(model.groups[0]?.id||null);},[selectedId,model.groups]);
  const selected=model.groups.find(g=>g.id===selectedId)||model.groups[0];
  const names=new Map(model.groups.map(g=>[g.id,safeLabel(g.label)]));
  const reviews=selected?(tab==='received'?selected.reviewsReceived:selected.reviewsGiven):[];
  const reviewLabel=r=>tab==='received'?names.get(r.from_group):names.get(r.to_group);
  const openComparison=async groupId=>{
    if(compareBusy||!onCompare)return;
    setCompareBusy(true);setCompareError('');
    try{setCompareData(await onCompare(groupId));}
    catch(error){setCompareError(error.message||t(language,'Không tải được các phiên bản đã lưu.','Unable to load saved checkpoints.'));}
    finally{setCompareBusy(false);}
  };
  const kpis=[
    {icon:Users,value:model.metrics.groups,label:t(language,'Nhóm','Groups')},
    {icon:CheckCircle2,value:model.metrics.responded,label:t(language,'Phản hồi hoạt động','Activity responses')},
    {icon:MessageSquareText,value:model.metrics.reviewed,label:t(language,'Nhóm đã góp ý','Groups reviewed')},
    {icon:Hand,value:model.metrics.needHelp,label:t(language,'Cần hỗ trợ','Need help')}
  ];
  const activityNum=String((session?.stageIndex??-1)+1).padStart(2,'0');
  return (
    <section aria-label={t(language,'Trung tâm điều khiển lớp học trực tiếp','Classroom Live Command Center')} data-testid="igv2-command-center">
      <div className="section-title"><span>{t(language,'TRUNG TÂM ĐIỀU KHIỂN LỚP HỌC','CLASSROOM COMMAND CENTER')}</span>
        <span className="right">{model.metrics.responded}/{model.metrics.groups} {t(language,'phản hồi · ','responses · ')}{model.metrics.reviewed} {t(language,'đã xem xét','reviewed')}
          {onRefresh?<button type="button" onClick={onRefresh} disabled={busy} style={{marginLeft:10,background:'none',border:'1px solid var(--adv-divider)',padding:'4px 8px',fontSize:11,cursor:'pointer',borderRadius:2}} aria-label={t(language,'Làm mới tổng quan lớp','Refresh classroom overview')}><RefreshCw size={12}/> {t(language,'Làm mới','Refresh')}</button>:null}
        </span></div>
      <div className="kpi-grid" aria-label={t(language,'Tổng quan lớp học','Classroom summary')}>
        {kpis.map(({icon:Icon,value,label})=><div key={label} className="kpi" style={{display:'flex',flexDirection:'column',gap:2}}><span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,color:'var(--adv-mute)'}}><Icon size={13} aria-hidden="true"/>{label}</span><strong style={{fontSize:26,fontWeight:850}}>{value}</strong></div>)}
      </div>
      <p style={{fontSize:11,color:'var(--adv-mute)',margin:'8px 0 12px'}}>{t(language,'Hoạt động','Activity')} {activityNum}/11 · {session?.stage?.title||t(language,'Bài học','Lesson')} · <b>{session?.stageOpen?t(language,'Đang mở','Task open'):t(language,'Đã đóng','Task closed')}</b></p>
      <div className="command-grid" style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:16}}>
        <div className="panel">
          <div className="section-title" style={{borderTop:0,marginTop:0}}><span>{t(language,'Chọn một nhóm','Select a group')}</span><span className="right">{model.groups.length} {t(language,'nhóm','groups')}</span></div>
          {model.groups.length?(
            <div className="adv-cc-groups" role="group" aria-label={t(language,'Các nhóm lớp','Class groups')}>
              {model.groups.map((group,i)=>(
                <button key={group.id} type="button" className="adv-cc-group" aria-pressed={selected?.id===group.id}
                  aria-label={safeLabel(group.label)+' — '+prettyState(group.state,language)}
                  onClick={()=>{setSelectedId(group.id);setTab('received');}}>
                  <span style={{display:'flex',justifyContent:'space-between'}}><strong>{safeLabel(group.label)}</strong><small>{String(i+1).padStart(2,'0')}</small></span>
                  <small>{prettyState(group.state,language)}</small>
                  <span style={{display:'inline-flex',gap:4,flexWrap:'wrap',marginTop:2}}>
                    <span style={{fontSize:10,padding:'1px 6px',borderRadius:8,background:(group.responded||group.thinkingAnswered)?'#dff3e8':'#fdecec',color:(group.responded||group.thinkingAnswered)?'#14532d':'#7f1d1d'}}>{(group.responded||group.thinkingAnswered)?t(language,'Đã trả lời','Responded'):t(language,'Chưa','Not yet')}</span>
                    <span style={{fontSize:10,color:'var(--adv-mute)'}}>{group.reviewCount} {t(language,'góp ý','reviews')}</span>
                    {group.askingHelp?<span style={{fontSize:10,color:'#b45309'}}><Hand size={10}/> {t(language,'Hỗ trợ','Help')}</span>:null}
                  </span>
                </button>
              ))}
            </div>
          ):<p style={{fontSize:12,color:'var(--adv-mute)'}}>{t(language,'Chưa có nhóm nào được giao cho bài học này.','No groups have been assigned to this lesson yet.')}</p>}
          <p style={{fontSize:11,color:'var(--adv-mute)',marginTop:12,display:'inline-flex',alignItems:'center',gap:6}}><ShieldCheck size={13}/>{t(language,'Câu trả lời và trạng thái nhóm không phải là điểm số.','Activity answers and group states are not grades.')}</p>
        </div>
        <div className="panel warm" style={{background:'#fff8ec'}}>
          {selected?(
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                <div>
                  <div style={{fontSize:10,fontWeight:850,letterSpacing:'.1em',color:'var(--adv-mute)',textTransform:'uppercase'}}>{t(language,'Nhóm được chọn','Selected group')}</div>
                  <h3 style={{margin:'2px 0 4px'}}>{safeLabel(selected.label)}</h3>
                  <p style={{fontSize:12,color:'var(--adv-mute)',margin:0}}>{prettyState(selected.state,language)} · {selected.thinkingAnswered?t(language,'Hoàn thành nhiệm vụ tư duy','Thinking task completed'):selected.responded?t(language,'Đã nộp phản hồi','Response submitted'):t(language,'Chờ phản hồi hoạt động hiện tại','Awaiting current activity response')}</p>
                </div>
                <span className="status" style={{background:'#dff3e8',color:'#14532d',padding:'3px 8px',fontSize:10,fontWeight:800}}>{prettyState(selected.state,language)}</span>
              </div>
              {onSpotlight?<button type="button" className="adv-toolbtn" style={{marginTop:10,fontSize:11}} onClick={()=>onSpotlight(selected.id)} disabled={busy} aria-label={t(language,'Trình chiếu triển lãm riêng của ','Spotlight private museum of ')+safeLabel(selected.label)}><MonitorPlay size={13}/>{t(language,'Trình chiếu nhóm','Spotlight')}</button>:null}
              {' '}
              {onCompare?<button type="button" className="adv-toolbtn" style={{marginTop:10,fontSize:11}} disabled={compareBusy} onClick={()=>openComparison(selected.id)}><ArrowLeftRight size={13}/>{compareBusy?t(language,'Đang mở các phiên bản…','Opening saved versions…'):t(language,'So sánh Trước / Sau','Compare Before / After')}</button>:null}
              {compareError?<p role="alert" style={{fontSize:11,color:'#7f1d1d',margin:'8px 0 0'}}>{compareError}</p>:null}
              <div role="tablist" aria-label={t(language,'Phản hồi chéo nhóm','Group peer feedback')} style={{display:'flex',gap:4,marginTop:12,borderBottom:'1px solid var(--adv-divider)'}}>
                <button type="button" role="tab" aria-selected={tab==='received'} onClick={()=>setTab('received')} style={{background:'none',border:0,borderBottom:tab==='received'?'2px solid var(--adv-red)':'2px solid transparent',padding:'6px 8px',fontSize:12,fontWeight:700,cursor:'pointer'}}>{t(language,'Nhận được','Received')} ({selected.reviewsReceived.length})</button>
                <button type="button" role="tab" aria-selected={tab==='sent'} onClick={()=>setTab('sent')} style={{background:'none',border:0,borderBottom:tab==='sent'?'2px solid var(--adv-red)':'2px solid transparent',padding:'6px 8px',fontSize:12,fontWeight:700,cursor:'pointer'}}>{t(language,'Đã gửi','Sent')} ({selected.reviewsGiven.length})</button>
              </div>
              <div role="tabpanel" aria-label={tab==='received'?t(language,'Phản hồi nhận được','Feedback received'):t(language,'Phản hồi đã gửi','Feedback sent')} style={{marginTop:8}}>
                {reviews.length?reviews.map((review,i)=>(
                  <article key={review.id||review.from_group+'-'+i} className="adv-cc-feedback">
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,fontWeight:800,marginBottom:4}}><span>{reviewLabel(review)||t(language,'Nhóm lớp','Class group')}</span><span>{review.rating||0}/4</span></div>
                    <p style={{margin:'2px 0',fontSize:12}}><b>{t(language,'Điều chúng em học được:','What we learned:')}</b> {review.learned}</p>
                    {review.clarify?<p style={{margin:'2px 0',fontSize:12}}><b>{t(language,'Nên cải thiện:','What to improve:')}</b> {review.clarify}</p>:null}
                  </article>
                )):(
                  <p style={{fontSize:12,color:'var(--adv-mute)',display:'inline-flex',alignItems:'center',gap:6}}><MessageSquareText size={15}/>{t(language,'Chưa có góp ý nào trong bài học này.','No feedback in this lesson yet.')}</p>
                )}
              </div>
              {selected.askingHelp?<div style={{marginTop:10,background:'#fef3c7',borderLeft:'3px solid #f59e0b',padding:'8px 10px',fontSize:12}} role="status"><Hand size={13}/> {t(language,'Nhóm này yêu cầu hỗ trợ ở hoạt động hiện tại.','This group requested help in the current activity.')}</div>:null}
            </>
          ):<p style={{fontSize:12,color:'var(--adv-mute)'}}>{t(language,'Chọn một nhóm để xem tiến độ và góp ý chéo.','Choose a group to view its progress and peer feedback.')}</p>}
        </div>
      </div>
      <footer style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginTop:12,fontSize:11,color:'var(--adv-mute)'}}>
        <span style={{display:'inline-flex',alignItems:'center',gap:6}}><ShieldCheck size={13}/>{t(language,'Chỉ giáo viên xem · Công việc nhóm được bảo mật','Teacher-only view · Group work stays private')}</span>
        {model.warnings.length?<button type="button" aria-expanded={qualityOpen} onClick={()=>setQualityOpen(v=>!v)} style={{background:'none',border:'1px solid var(--adv-divider)',padding:'5px 10px',fontSize:11,cursor:'pointer',borderRadius:2,display:'inline-flex',alignItems:'center',gap:6}}><AlertTriangle size={13}/>{t(language,'Kiểm tra chất lượng · ','Quality review · ')}{model.warnings.length} {t(language,'vấn đề','issue')}{model.warnings.length===1?'':'s'}</button>
          :<span style={{display:'inline-flex',alignItems:'center',gap:6}}><ShieldCheck size={13}/>{t(language,'Không phát hiện góp ý lặp lại','No repeated feedback detected')}</span>}
      </footer>
      {qualityOpen&&model.warnings.length?(
        <div role="status" aria-label={t(language,'Kiểm tra chất lượng nội dung (chỉ giáo viên)','Teacher-only content quality review')} style={{marginTop:8,background:'#fff8e6',borderLeft:'3px solid var(--adv-warm-yellow)',padding:'10px 12px',fontSize:12}}>
          {model.warnings.map((w,i)=><p key={w.type+'-'+i} style={{margin:'2px 0'}}><b>{w.type==='repeated-comment'?t(language,'Góp ý lặp lại','Repeated feedback'):t(language,'Góp ý ngắn','Brief feedback')}</b> · {w.count} {t(language,'lần','instance')}{w.count===1?'':'s'}. {w.excerpt}</p>)}
          <small style={{color:'var(--adv-mute)'}}>{t(language,'Chỉ là gợi ý: xem xét ngữ cảnh trước khi sửa. Không thay đổi điểm hay bài nộp.','Advisory only: review context before editing. No student grade or submission is changed.')}</small>
        </div>
      ):null}
      {compareData?(
        <div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCompareData(null);}} style={{position:'fixed',inset:0,background:'rgba(17,35,57,.55)',zIndex:80,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <section role="dialog" aria-modal="true" aria-label={t(language,'So sánh các phiên bản triển lãm đã lưu','Compare saved exhibit revisions')} style={{background:'var(--adv-paper)',maxWidth:900,width:'100%',maxHeight:'90vh',overflow:'auto',padding:18,borderRadius:4}}>
            <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><strong>{t(language,'Quá trình phát triển triển lãm nhóm','Group exhibit development')}</strong>
              <button type="button" onClick={()=>setCompareData(null)} aria-label={t(language,'Đóng so sánh','Close comparison')} className="adv-toolbtn" style={{fontSize:11}}><X size={13}/>{t(language,'Đóng','Close')}</button></header>
            <MuseumBeforeAfter before={compareData.before} after={compareData.after} groupLabel={safeLabel(compareData.groupLabel)}/>
          </section>
        </div>
      ):null}
      <style>{`.igv2 .command-grid{grid-template-columns:1.2fr 1fr}@media(max-width:860px){.igv2 .command-grid{grid-template-columns:1fr}}`}</style>
    </section>
  );
}
export {CommandCenter};
