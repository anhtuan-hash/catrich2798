import React from 'react';
import {ArrowRight,Search,PenTool,Landmark} from 'lucide-react';
import {LESSON_KITS} from '../../v3/museumData.js';
import {LIVE_STAGES,LIVE_TOTAL_MINUTES,LIVE_PERIOD_MINUTES} from '../../v3/liveLesson.js';
import EditorialHeading from '../shell/EditorialHeading.jsx';
import MetricStrip from '../shell/MetricStrip.jsx';
import ActionTile from '../shell/ActionTile.jsx';
import ContentPanel from '../shell/ContentPanel.jsx';
import '../advanced.css';
const t=(lang,vi,en)=>lang==='en'?en:vi;
const kit=LESSON_KITS[0]||{};
const activityCount=LIVE_STAGES.length;
const periodMinutes=LIVE_PERIOD_MINUTES||[45,45];
/**
 * 04 Teaching plan — Swiss Editorial V2.
 * Driving question, 2×45-minute plan, 11 activities (counted from LIVE_STAGES, never hard-coded),
 * create-from-plan CTA wired to props.onCreate (shell opens the existing LessonWizard).
 * Detailed curriculum plan preserved (per-activity minutes, Vietnamese title, facilitation,
 * sentence frame, expected outcome). No fabricated records.
 */
export default function TeachingPlanScreen({language='vi',data,onCreate,onBack,onNavigate}){
  const assignments=data?.assignments||[];
  const groups=data?.groups||[];
  const metrics=[
    {value:'2 × 45',label:t(language,'phút mỗi tiết','min per period'),highlight:true},
    {value:String(activityCount),label:t(language,'hoạt động','activities')},
    {value:String(assignments.length),label:t(language,'bài học đã giao','lessons assigned')},
    {value:String(groups.length),label:t(language,'nhóm tham gia','groups participating')}
  ];
  const pillars=[
    {icon:Search,title:t(language,'Điều tra','Investigate'),desc:t(language,'Đặt câu hỏi rõ ràng và thu thập bằng chứng địa phương đáng tin cậy.','Ask a clear question and collect trustworthy local evidence.')},
    {icon:PenTool,title:t(language,'Tạo & cải tiến','Create & revise'),desc:t(language,'Viết thuyết minh, làm hình ảnh và kiểm tra tính rõ ràng của mỗi hiện vật.','Write captions, build visuals and test each exhibit for clarity.')},
    {icon:Landmark,title:t(language,'Triển lãm & phản ánh','Exhibit & reflect'),desc:t(language,'Công bố sản phẩm học sinh và xem lại các quyết định đằng sau nó.','Publish student work and revisit the decisions behind it.')}
  ];
  const outcomes=[
    {n:'01',title:'The Problem – The Evidence – Our Solution',desc:t(language,'Ba lời thuyết minh tiếng Anh, mỗi phần khoảng 25–40 từ.','Three English exhibit captions, approximately 25–40 words each.')},
    {n:'02',title:t(language,'Khảo sát ưu tiên nhóm','Group-priority survey'),desc:t(language,'Biểu đồ từ phiếu lớp thật, số nhóm N, số đếm, phần trăm và giới hạn.','A genuine group-vote chart with N, counts, percentages and limitations.')},
    {n:'03',title:t(language,'Sản phẩm & quá trình học','Artwork & learning process'),desc:t(language,'Poster/ảnh gốc, phòng 3D, phản hồi chéo, bản cải tiến và phần trình bày 45–60 giây.','Original poster, 3D gallery, peer feedback, documented revision and a 45–60-second pitch.')}
  ];
  return (
    <div className="igv2 igv2-screen" data-testid="igv2-teaching-plan-screen">
      <EditorialHeading
        kicker={t(language,'TIẾNG ANH 11 · GLOBAL SUCCESS UNIT 5','ENGLISH 11 · GLOBAL SUCCESS UNIT 5')}
        title={t(language,'Kế hoạch bài dạy.','Teaching plan.')}
        description={t(language,'Một bài học số hai tiết tập trung, bám sát Unit 5: Global Warming.','One focused two-period digital lesson aligned with Unit 5: Global Warming.')}
        aside={t(language,'2 × 45 min · ','2 × 45 min · ')+activityCount+t(language,' hoạt động',' activities')}/>
      <MetricStrip items={metrics}/>

      <div className="plan-hero" style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:24,alignItems:'stretch',marginTop:20}}>
        <div className="plan-visual" style={{background:'var(--igv2-navy,#112339)',color:'#fff',padding:22,display:'flex',flexDirection:'column',justifyContent:'space-between',minHeight:220}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:'.14em',color:'var(--igv2-warm-yellow,#f4ca4b)'}}>BRIAN / PROJECT-BASED ENGLISH</div>
          <div style={{fontSize:72,fontWeight:900,lineHeight:.9,margin:'12px 0'}}>{activityCount}<br/><span style={{fontSize:28,color:'var(--igv2-warm-yellow,#f4ca4b)'}}>05.</span></div>
          <div style={{fontSize:13,fontWeight:800,lineHeight:1.3}}>GLOBAL WARMING<br/>CLIMATE ACTION MUSEUM</div>
        </div>
        <div className="plan-copy" style={{background:'#fff',border:'1px solid var(--igv2-divider,#d9d4c9)',padding:'20px 24px'}}>
          <div style={{fontSize:11,fontWeight:850,letterSpacing:'.14em',color:'var(--igv2-muted,#6b7782)'}}>OUR CLIMATE ACTION MUSEUM</div>
          <h2 style={{margin:'6px 0 4px',fontSize:26,fontWeight:850}}>{kit.title||'Our Climate Action Museum'}</h2>
          <p style={{margin:0,fontSize:13,color:'var(--igv2-muted,#6b7782)'}}>{kit.subtitle||'English 11 · Global Success · Unit 5: Global Warming'}</p>
          <div style={{fontSize:11,fontWeight:850,letterSpacing:'.14em',color:'var(--igv2-muted,#6b7782)',marginTop:16}}>{t(language,'CÂU HỎI ĐỊNH HƯỚNG','DRIVING QUESTION')}</div>
          <div className="question" style={{fontSize:18,fontWeight:800,lineHeight:1.3,margin:'6px 0',color:'var(--igv2-ink,#152033)'}}>{kit.challenge||'How can our school reduce the impact of everyday activities on global warming?'}</div>
          <p style={{fontSize:13,lineHeight:1.55,color:'#3d4a57'}}>{kit.goal||''}</p>
          <div className="chips" style={{display:'flex',flexWrap:'wrap',gap:8,margin:'12px 0'}}>
            <span className="chip">English 11 · Unit 5</span>
            <span className="chip">2 × 45 min</span>
            <span className="chip">{activityCount} {t(language,'hoạt động','activities')}</span>
            <span className="chip">{LIVE_TOTAL_MINUTES} {t(language,'phút','min')}</span>
          </div>
          {onCreate?(
            <button type="button" className="cta adv-toolbtn adv-toolbtn--primary" onClick={onCreate}
              aria-label={t(language,'Tạo bài học từ kế hoạch này — mở trình tạo bài học','Create lesson from this plan — opens the lesson wizard')}
              style={{marginTop:6}}>
              {t(language,'Tạo bài học từ kế hoạch này','Create lesson from this plan')} <ArrowRight size={16}/>
            </button>
          ):null}
          {onBack?<button type="button" className="adv-toolbtn" style={{marginLeft:8,marginTop:6}} onClick={onBack}>{t(language,'← Quay lại','← Back')}</button>:null}
        </div>
      </div>

      <div className="info-strip mt16" role="note">{t(language,'Các nhóm thực hiện khảo sát ưu tiên thật, viết ba thuyết minh tiếng Anh, tải poster và biểu đồ gốc, kiểm tra và cải tiến, sau đó tham quan phòng trưng bày 3D.','Groups conduct a real priority survey, write three English captions, upload an original poster and chart, test and revise, then visit the 3D gallery.')}</div>

      <div className="three-col mt20" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {pillars.map(({icon:Icon,title,desc})=>(
          <div className="panel" key={title} style={{padding:18}}>
            <Icon size={26} color="var(--igv2-red,#ca2431)" aria-hidden="true"/>
            <h3 style={{margin:'10px 0 6px',fontSize:15}}>{title}</h3>
            <p className="page-desc" style={{fontSize:12,margin:0}}>{desc}</p>
          </div>
        ))}
      </div>

      <ContentPanel variant="default" className="mt20" ariaLabel={t(language,'Sản phẩm học sinh cần hoàn thành','Expected student work')}>
        <h3 style={{margin:'0 0 12px',fontSize:15,borderBottom:'2px solid var(--igv2-ink,#152033)',paddingBottom:8}}>{t(language,'Sản phẩm học sinh cần hoàn thành','Expected student work')}</h3>
        <div className="adv-outcomes">
          {outcomes.map(o=>(
            <div className="adv-outcome" key={o.n}>
              <b>{o.n} · {o.title}</b>
              <span>{o.desc}</span>
            </div>
          ))}
        </div>
      </ContentPanel>

      <ContentPanel variant="default" className="mt20" ariaLabel={t(language,'Tiến trình bài dạy','Lesson sequence')}>
        <h3 style={{margin:'0 0 12px',fontSize:15,borderBottom:'2px solid var(--igv2-ink,#152033)',paddingBottom:8}}>{t(language,'Tiến trình {{n}} hoạt động · {{m}} phút','{{n}}-activity lesson sequence · {{m}} min').replace('{{n}}',activityCount).replace('{{m}}',LIVE_TOTAL_MINUTES)}</h3>
        <div className="adv-plan-periods">
          {[1,2].map(period=>(
            <div className="adv-plan-period" key={period}>
              <h3>{t(language,'Tiết','Period')} {period} · {periodMinutes[period-1]||45} {t(language,'phút','minutes')}</h3>
              <ol className="adv-activity-list">
                {LIVE_STAGES.map((a,i)=>({a,i})).filter(x=>x.a.period===period).map(({a,i})=>(
                  <li className="adv-activity-row" key={a.id}>
                    <span className="adv-activity-num">{String(i+1).padStart(2,'0')}</span>
                    <div>
                      <strong>{language==='en'?a.title:(a.vi||a.title)}</strong>
                      <small>{language==='en'?null:a.title} · {a.teaching}</small>
                      <div className="adv-activity-meta">{a.minutes} {t(language,'phút','min')} · {a.kind}{a.sentence?` · “${a.sentence}”`:''}</div>
                      <small style={{color:'#8a97a3'}}>{t(language,'Mong đợi: ','Expected: ')}{a.expected}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p style={{fontSize:11,color:'var(--igv2-muted,#6b7782)',marginTop:14}}>{t(language,'Tạo bài học mới không thay đổi các bài đã giao. Dữ liệu khảo sát, phản hồi và kết quả học sinh chỉ có khi lớp thực sự thực hiện.','Creating this lesson does not alter existing assignments. Survey responses, peer feedback and student results are recorded only after classroom activity.')}</p>
      </ContentPanel>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14,marginTop:20}}>
        {onCreate?<ActionTile title={t(language,'Tạo bài học từ kế hoạch','Create lesson from plan')} description={t(language,'Mở trình tạo bài học và phát hành mã nhóm.','Open the lesson wizard and issue group passes.')} variant="accent" onClick={onCreate}/>:null}
        {onNavigate?<ActionTile title={t(language,'Xem bài học đã giao','View assigned lessons')} description={t(language,'Quản lý mã nhóm và bài đã giao.','Manage group passes and assignments.')} onClick={()=>onNavigate('lessons')}/>:null}
      </div>
      <style>{`@media(max-width:860px){.igv2 .plan-hero{grid-template-columns:1fr !important}.igv2 .three-col{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}
export {TeachingPlanScreen};
