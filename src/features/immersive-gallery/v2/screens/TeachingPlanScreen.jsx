import React from 'react';
import {ArrowRight,Search,PenTool,Landmark} from 'lucide-react';
import {LESSON_KITS, RUBRIC} from '../../v3/museumData.js';
import {LIVE_STAGES,LIVE_TOTAL_MINUTES,LIVE_PERIOD_MINUTES} from '../../v3/liveLesson.js';
import {LESSON_PLAN_NOTES, PUBLIC_LESSON_GUIDE, OFFLINE_LESSON_WORKSHEET, VISITOR_TASKS} from '../../v3/lessonPlanAlignment.js';
import {MUSEUM_CURRICULUM_VIDEOS} from '../../v3/museumLiveExtensions.js';
import EditorialHeading from '../shell/EditorialHeading.jsx';
import MetricStrip from '../shell/MetricStrip.jsx';
import ActionTile from '../shell/ActionTile.jsx';
import ContentPanel from '../shell/ContentPanel.jsx';
import './TeachingPlanScreen.css';
const t=(lang,vi,en)=>lang==='en'?en:vi;
const kit=LESSON_KITS[0]||{};
const activityCount=LIVE_STAGES.length;
const periodMinutes=LIVE_PERIOD_MINUTES||[45,45];
const indexedStages = LIVE_STAGES.map((stage, index) => ({stage, index}));
const periods = [1, 2].map(period => indexedStages.filter(({stage}) => stage.period === period));
export default function TeachingPlanScreen({language='vi',data,onCreate,onBack,onNavigate}){
  const assignments=data?.assignments||[];
  const groups=data?.groups||[];
  const metrics=[
    {value:String(LIVE_TOTAL_MINUTES),label:t(language,'phút · 2 tiết','minutes · 2 periods'),highlight:true},
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
    {n:'03',title:t(language,'Sản phẩm & quá trình học','Artwork & learning process'),desc:t(language,'Poster có ghi công, bản xem 3D hoặc 2D, phản hồi chéo, V1/V2 và bài trình bày 45–60 giây.','Credited visual, 3D or 2D exhibit, peer feedback, V1/V2 and a 45–60-second pitch.')}
  ];
  const [firstTitleLine, secondTitleLine] = language === 'en' ? ['Teaching', 'plan'] : ['Kế hoạch', 'bài dạy'];
  return (
    <div className="igv2-screen swiss-teaching-plan" data-testid="igv2-teaching-plan-screen">
      <div className="plan-masthead">
        <EditorialHeading
          kicker={t(language,'TIẾNG ANH 11 · GLOBAL SUCCESS UNIT 5','ENGLISH 11 · GLOBAL SUCCESS UNIT 5')}
          title={<>{firstTitleLine}{' '}<span className="plan-title-line">{secondTitleLine}<span className="plan-title-dot">.</span></span></>}
          description={t(language,'Một bài học số hai tiết tập trung, bám sát Unit 5: Global Warming.','One focused two-period digital lesson aligned with Unit 5: Global Warming.')}
          aside={t(language,'2 × 45 min · ','2 × 45 min · ')+activityCount+t(language,' hoạt động',' activities')}/>
        <MetricStrip items={metrics}/>
      </div>

      <section className="plan-hero" aria-labelledby="plan-project-title">
        <div className="plan-visual">
          <div className="plan-unit-school">PÉTRUS KÝ / SCHOOL SYSTEM</div>
          <div className="plan-unit-number">{activityCount}<span>05.</span></div>
          <div className="plan-unit-caption">GLOBAL WARMING<br/>CLIMATE ACTION MUSEUM</div>
        </div>
        <div className="plan-copy">
          <div className="plan-label">OUR CLIMATE ACTION MUSEUM</div>
          <h2 id="plan-project-title">{kit.title||'Our Climate Action Museum'}</h2>
          <p>{kit.subtitle||'English 11 · Global Success · Unit 5: Global Warming'}</p>
          <div className="plan-label">{t(language,'CÂU HỎI ĐỊNH HƯỚNG','DRIVING QUESTION')}</div>
          <div className="plan-question">{kit.challenge||'How can our school reduce the impact of everyday activities on global warming?'}</div>
          <p>{kit.goal||''}</p>
          <div className="plan-chips">
            <span className="chip">English 11 · Unit 5</span>
            <span className="chip">2 × 45 min</span>
            <span className="chip">{activityCount} {t(language,'hoạt động','activities')}</span>
            <span className="chip">{LIVE_TOTAL_MINUTES} {t(language,'phút','min')}</span>
          </div>
          <div className="plan-hero-actions">
            {onCreate?(
              <button type="button" className="plan-button plan-button-primary" onClick={onCreate}
                aria-label={t(language,'Tạo bài học từ kế hoạch này — mở trình tạo bài học','Create lesson from this plan — opens the lesson wizard')}>
                {t(language,'Tạo bài học từ kế hoạch này','Create lesson from this plan')} <ArrowRight size={16} aria-hidden="true"/>
              </button>
            ):null}
            {onBack?<button type="button" className="plan-button" onClick={onBack}>{t(language,'← Quay lại','← Back')}</button>:null}
          </div>
        </div>
      </section>

      <div className="plan-note" role="note">{t(language,'Các nhóm thực hiện khảo sát ưu tiên thật, viết ba thuyết minh tiếng Anh, đưa hình có ghi công và biểu đồ đã chốt vào triển lãm, kiểm tra và cải tiến, sau đó tham quan phòng trưng bày 3D.','Groups conduct a real priority survey, write three English captions, add a credited visual and the frozen group-priority chart, test and revise, then visit the 3D gallery.')}</div>

      <div className="plan-pillars">
        {pillars.map(({icon:Icon,title,desc})=>(
          <div className="plan-pillar" key={title}>
            <Icon size={22} aria-hidden="true"/>
            <h2>{title}</h2>
            <p className="page-desc">{desc}</p>
          </div>
        ))}
      </div>

      <ContentPanel className="plan-section" ariaLabel={t(language,'Sản phẩm học sinh cần hoàn thành','Expected student work')}>
        <h2>{t(language,'Sản phẩm học sinh cần hoàn thành','Expected student work')}</h2>
        <div className="plan-outcomes">
          {outcomes.map(o=>(
            <div className="plan-outcome" key={o.n}>
              <b>{o.n} · {o.title}</b>
              <span>{o.desc}</span>
            </div>
          ))}
        </div>
      </ContentPanel>

      <ContentPanel className="plan-section plan-sequence" ariaLabel={t(language,'Tiến trình bài dạy','Lesson sequence')}>
        <h2>{t(language,'Tiến trình {{n}} hoạt động · {{m}} phút','{{n}}-activity lesson sequence · {{m}} min').replace('{{n}}',activityCount).replace('{{m}}',LIVE_TOTAL_MINUTES)}</h2>
        <div className="plan-periods">
          {periods.map((stages, periodIndex) => (
            <div className="plan-period" key={periodIndex}>
              <h3>{t(language,'Tiết','Period')} {periodIndex + 1} · {periodMinutes[periodIndex]||45} {t(language,'phút','minutes')}</h3>
              <ol className="plan-activities" role="list" start={(stages[0]?.index ?? 0) + 1}>
                {stages.map(({stage:a,index:i})=>(
                  <li className="plan-activity" key={a.id}>
                    <span className="plan-activity-number" aria-hidden="true">{String(i+1).padStart(2,'0')}</span>
                    <div>
                      <strong>{language==='en'?a.title:(a.vi||a.title)}</strong>
                      <small>{language==='en'?null:a.title+' · '}{LESSON_PLAN_NOTES[a.id].task}</small>
                      {MUSEUM_CURRICULUM_VIDEOS[i]?<small>
                        <a href={MUSEUM_CURRICULUM_VIDEOS[i].officialSource} target="_blank" rel="noreferrer">{t(language,'Video NASA và nguồn','NASA video and source')}</a>
                        {' · '}<a href={PUBLIC_LESSON_GUIDE+'#stage-'+(i+1)}>{t(language,'3 câu hỏi nghe hiểu','3 listening questions')}</a>
                      </small>:null}
                      <div className="plan-activity-meta">{a.minutes} {t(language,'phút','min')} · {a.kind}{a.sentence?` · “${a.sentence}”`:''}</div>
                      <small>{t(language,'Giai đoạn: ','Design phase: ')}{LESSON_PLAN_NOTES[a.id].phase}</small>
                      {LESSON_PLAN_NOTES[a.id].extension?<small><b>{t(language,'Khi dạy lại: ','Next delivery: ')}</b>{LESSON_PLAN_NOTES[a.id].extension}</small>:null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="plan-sequence-note">{t(language,'Tạo bài học mới không thay đổi các bài đã giao. Dữ liệu khảo sát, phản hồi và kết quả học sinh chỉ có khi lớp thực sự thực hiện.','Creating this lesson does not alter existing assignments. Survey responses, peer feedback and student results are recorded only after classroom activity.')}</p>
      </ContentPanel>

      <ContentPanel className="plan-section" ariaLabel={t(language,'Đánh giá và minh chứng','Assessment and evidence')}>
        <h2>{t(language,'Đánh giá và minh chứng','Assessment and evidence')}</h2>
        <div className="plan-assessment">
          <div>
            <p>{t(language,'Khi dạy lại, dùng phiếu cá nhân 1 phút ở chặng 01 và 11. Khách thử V1/V2 bằng cùng ba nhiệm vụ ở chặng 08 và 09. Hồ sơ phiên đã khóa được đối chiếu bằng minh chứng gốc của phiên đó.','For a new delivery, use the one-minute individual writing checks in stages 01 and 11, and the same three visitor tasks for V1/V2 in stages 08 and 09. Review a finalized session using the evidence recorded in that session.')}</p>
            <ol lang="en">{VISITOR_TASKS.map(task=><li key={task}>{task}</li>)}</ol>
          </div>
          <div className="plan-rubric">
            <p><b>{t(language,'Rubric học tập · 100 điểm','Group learning rubric · 100 points')}</b></p>
            <ul>{RUBRIC.map(item=><li key={item.key}>{t(language,item.label,item.en)} · {item.max}</li>)}</ul>
          </div>
          <p className="plan-resources">
            <a href={PUBLIC_LESSON_GUIDE}>{t(language,'Hướng dẫn 11 chặng và rubric bốn mức','11-stage guide and four-level rubric')}</a>
            {' · '}<a href={OFFLINE_LESSON_WORKSHEET} download>{t(language,'Tải phiếu thực hành ngoại tuyến','Download offline practice worksheet')}</a>
          </p>
        </div>
      </ContentPanel>

      <div className="plan-actions">
        {onCreate?<ActionTile title={t(language,'Tạo bài học từ kế hoạch','Create lesson from plan')} description={t(language,'Mở trình tạo bài học và phát hành mã nhóm.','Open the lesson wizard and issue group passes.')} variant="accent" onClick={onCreate}/>:null}
        {onNavigate?<ActionTile title={t(language,'Xem bài học đã giao','View assigned lessons')} description={t(language,'Quản lý mã nhóm và bài đã giao.','Manage group passes and assignments.')} onClick={()=>onNavigate('lessons')}/>:null}
      </div>
    </div>
  );
}
export {TeachingPlanScreen};
