import React from 'react';
import {ArrowRight,Search,PenTool,Landmark} from 'lucide-react';
import {LESSON_KITS, RUBRIC} from '../../v3/museumData.js';
import {LIVE_STAGES,LIVE_TOTAL_MINUTES,LIVE_PERIOD_MINUTES} from '../../v3/liveLesson.js';
import {LESSON_PLAN_NOTES, PUBLIC_LESSON_GUIDE, OFFLINE_LESSON_WORKSHEET, VISITOR_TASKS, CLASSROOM_SETUP, CLASSROOM_RECORDS, VISITOR_TEST_GUIDANCE, LESSON_RUBRIC_LEVELS} from '../../v3/lessonPlanAlignment.js';
import {MUSEUM_CURRICULUM_VIDEOS} from '../../v3/museumLiveExtensions.js';
import {ASEAN_TITLE,ASEAN_TOPIC,ASEAN_SUBTITLE,ASEAN_CHALLENGE,ASEAN_BRIEF,ASEAN_STAGES,ASEAN_RUBRIC,ASEAN_FRAMES,isAsean} from '../../v3/aseanLesson.js';
import {ASEAN_ACTIVITY_DESIGN} from '../../v3/aseanActivityDesign.js';
import EditorialHeading from '../shell/EditorialHeading.jsx';
import MetricStrip from '../shell/MetricStrip.jsx';
import ActionTile from '../shell/ActionTile.jsx';
import ContentPanel from '../shell/ContentPanel.jsx';
import './TeachingPlanScreen.css';
const t=(lang,vi,en)=>lang==='en'?en:vi;
const kit=LESSON_KITS[0]||{};
const ASEAN_PLAN_DOWNLOAD='/museum/asean/asean-group-lesson.docx';
const ASEAN_FRAME_LABELS=['Địa điểm','Trải nghiệm','Lời khuyên cho khách'];

function AseanActivityNotes({stage,index,language}){
  const {steps,output}=ASEAN_ACTIVITY_DESIGN[index];
  return <>
    <small lang="en">{stage.question}</small>
    <div className="plan-activity-meta">{stage.minutes} {t(language,'phút','min')}</div>
    <details>
      <summary>{t(language,'Cách tổ chức và sản phẩm','Procedure and deliverable')}</summary>
      <small>{steps.map(([minutes,vi,en])=>`${minutes} ${t(language,'phút','min')} · ${t(language,vi,en)}`).join(' / ')}</small>
      <small>{t(language,output[0],stage.expected)}</small>
    </details>
  </>;
}

export default function TeachingPlanScreen({language='vi',data,lessonTemplate,onCreate,onBack,onNavigate}){
  const asean=isAsean(lessonTemplate);
  const unit=asean ? 4 : 5;
  const stages=asean ? ASEAN_STAGES : LIVE_STAGES;
  const activityCount=stages.length;
  const indexedStages=stages.map((stage,index)=>({stage,index}));
  const periods=[1,2].map(period=>indexedStages.filter(({stage})=>stage.period===period));
  const periodMinutes=asean ? periods.map(period=>period.reduce((sum,{stage})=>sum+stage.minutes,0)) : LIVE_PERIOD_MINUTES;
  const totalMinutes=asean ? periodMinutes.reduce((sum,minutes)=>sum+minutes,0) : LIVE_TOTAL_MINUTES;
  const duration=`${periodMinutes.length} × ${periodMinutes[0]} ${asean?t(language,'phút','min'):'min'}`;
  const assignments=data?.assignments||[];
  const groups=data?.groups||[];
  const metrics=[
    {value:String(totalMinutes),label:t(language,'phút · 2 tiết','minutes · 2 periods'),highlight:true},
    {value:String(activityCount),label:t(language,'hoạt động','activities')},
    {value:String(assignments.length),label:t(language,'bài học đã giao','lessons assigned')},
    {value:String(groups.length),label:t(language,'nhóm tham gia','groups participating')}
  ];
  const pillars=asean ? [
    {icon:Search,title:t(language,'Điều tra','Investigate'),desc:t(language,'Xác định điều khách cần biết, chọn ảnh phù hợp và kiểm chứng một dữ kiện về điểm đến.','Identify what visitors need to know, choose photos and verify one fact about the destination.')},
    {icon:PenTool,title:t(language,'Tạo & cải tiến','Create & revise'),desc:t(language,'Viết ba chú thích tiếng Anh, dựng phòng 3D và cải tiến một khung dựa trên góp ý.','Write three English captions, build a 3D room and revise one frame in response to feedback.')},
    {icon:Landmark,title:t(language,'Triển lãm & phản ánh','Exhibit & reflect'),desc:t(language,'Mời nhóm khách mới thử lại, báo cáo thay đổi và viết vận dụng về một điểm đến khác.','Ask a fresh visitor group to retest, report the change and write about another destination.')}
  ] : [
    {icon:Search,title:t(language,'Điều tra','Investigate'),desc:t(language,'Đặt câu hỏi rõ ràng và thu thập bằng chứng địa phương đáng tin cậy.','Ask a clear question and collect trustworthy local evidence.')},
    {icon:PenTool,title:t(language,'Tạo & cải tiến','Create & revise'),desc:t(language,'Viết thuyết minh, làm hình ảnh và kiểm tra tính rõ ràng của mỗi hiện vật.','Write captions, build visuals and test each exhibit for clarity.')},
    {icon:Landmark,title:t(language,'Triển lãm & phản ánh','Exhibit & reflect'),desc:t(language,'Công bố sản phẩm học sinh và xem lại các quyết định đằng sau nó.','Publish student work and revisit the decisions behind it.')}
  ];
  const outcomes=asean ? ASEAN_FRAMES.map((frame,index)=>({
    n:String(index+1).padStart(2,'0'),title:t(language,ASEAN_FRAME_LABELS[index],frame.label),desc:frame.question
  })) : [
    {n:'01',title:'The Problem – The Evidence – Our Solution',desc:t(language,'Ba lời thuyết minh tiếng Anh, mỗi phần khoảng 25–40 từ.','Three English exhibit captions, approximately 25–40 words each.')},
    {n:'02',title:t(language,'Khảo sát ưu tiên nhóm','Group-priority survey'),desc:t(language,'Biểu đồ từ phiếu lớp thật, số nhóm N, số đếm, phần trăm và giới hạn.','A genuine group-vote chart with N, counts, percentages and limitations.')},
    {n:'03',title:t(language,'Sản phẩm & quá trình học','Artwork & learning process'),desc:t(language,'Hình có ghi công, hồ sơ C2/C3 và V1/V2. Mỗi nhóm trình bày 45 giây theo cặp, thêm 15 giây hỏi đáp.','Credited visuals, C2/C3 and V1/V2. Every group has 45 seconds to present to a partner and 15 seconds for a question and reply.')}
  ];
  const [firstTitleLine, secondTitleLine] = language === 'en' ? ['Teaching', 'plan'] : ['Kế hoạch', 'bài dạy'];
  const title=asean ? ASEAN_TITLE : kit.title||'Our Climate Action Museum';
  const downloadLabel=t(language,'Tải kế hoạch tiếng Anh và phiếu nhóm','Download the English lesson plan and group worksheets');
  return (
    <div className="igv2-screen swiss-teaching-plan" data-testid="igv2-teaching-plan-screen">
      <div className="plan-masthead">
        <EditorialHeading
          kicker={t(language,'TIẾNG ANH 11','ENGLISH 11')+' · GLOBAL SUCCESS UNIT '+unit}
          title={<>{firstTitleLine}{' '}<span className="plan-title-line">{secondTitleLine}<span className="plan-title-dot">.</span></span></>}
          description={asean
            ? t(language,'Bài học số hai tiết theo Unit 4 – ASEAN and Viet Nam.','A two-period digital lesson aligned with Unit 4 – ASEAN and Viet Nam.')
            : t(language,'Một bài học số hai tiết tập trung, bám sát Unit 5: Global Warming.','One focused two-period digital lesson aligned with Unit 5: Global Warming.')}
          aside={duration+' · '+activityCount+t(language,' hoạt động',' activities')}/>
        <MetricStrip items={metrics}/>
      </div>

      <section className="plan-hero" aria-labelledby="plan-project-title">
        <div className="plan-visual">
          <div className="plan-unit-school">PÉTRUS KÝ / SCHOOL SYSTEM</div>
          <div className="plan-unit-number">{activityCount}<span>{String(unit).padStart(2,'0')}.</span></div>
          <div className="plan-unit-caption">{asean?ASEAN_TOPIC.toUpperCase():'GLOBAL WARMING'}<br/>{asean?ASEAN_TITLE.toUpperCase():'CLIMATE ACTION MUSEUM'}</div>
        </div>
        <div className="plan-copy">
          <div className="plan-label">{asean?t(language,'DỰ ÁN TRIỂN LÃM 3D','3D EXHIBITION PROJECT'):'OUR CLIMATE ACTION MUSEUM'}</div>
          <h2 id="plan-project-title" lang="en">{title}</h2>
          <p lang="en">{asean?ASEAN_SUBTITLE:kit.subtitle||'English 11 · Global Success · Unit 5: Global Warming'}</p>
          <div className="plan-label">{t(language,'CÂU HỎI ĐỊNH HƯỚNG','DRIVING QUESTION')}</div>
          <div className="plan-question" lang="en">{asean?ASEAN_CHALLENGE:kit.challenge||'How can our school reduce the impact of everyday activities on global warming?'}</div>
          <p>{asean?t(language,'Mỗi nhóm dựng một phòng 3D về một điểm đến, với ba ảnh và ba chú thích tiếng Anh dài 20–30 từ. Các nhóm ghi nguồn dữ kiện, ghi công ảnh, kiểm tra V1 và mời nhóm khác thử lại V2.',ASEAN_BRIEF):kit.goal||''}</p>
          <div className="plan-chips">
            <span className="chip">English 11 · Unit {unit}</span>
            <span className="chip">{duration}</span>
            <span className="chip">{activityCount} {t(language,'hoạt động','activities')}</span>
            <span className="chip">{totalMinutes} {t(language,'phút','min')}</span>
          </div>
          <div className="plan-hero-actions">
            {onCreate?(
              <button type="button" className="plan-button plan-button-primary" onClick={onCreate}
                aria-label={t(language,'Tạo bài học từ kế hoạch này — mở trình tạo bài học','Create lesson from this plan — opens the lesson wizard')}>
                {t(language,'Tạo bài học từ kế hoạch này','Create lesson from this plan')} <ArrowRight size={16} aria-hidden="true"/>
              </button>
            ):null}
            {asean?<a className="plan-button" href={ASEAN_PLAN_DOWNLOAD} download="ASEAN_Group_Lesson.docx">{downloadLabel}</a>:null}
            {onBack?<button type="button" className="plan-button" onClick={onBack}>{t(language,'← Quay lại','← Back')}</button>:null}
          </div>
        </div>
      </section>

      <div className="plan-note" role="note">{asean
        ? t(language,'Mỗi lượt có một đề viết riêng cho từng nhóm. Ở lượt vận dụng, đề được xoay vòng để mỗi nhóm viết về địa điểm mới. Giữa hai lượt viết, nhóm chọn và ghi công ảnh, kiểm tra V1, rồi ghi lại một thay đổi và kết quả thử lại V2.','Each group has its own prompt in each round. For the transfer round, rotate the cards so every group writes about a new destination. Between the two rounds, groups select and credit photographs, test V1, then record one change and the result of the V2 retest.')
        : t(language,'Các nhóm thực hiện khảo sát ưu tiên thật, viết ba thuyết minh tiếng Anh, đưa hình có ghi công và biểu đồ đã chốt vào triển lãm, kiểm tra và cải tiến, sau đó trình bày theo cặp.','Groups conduct a real priority survey, write three English captions, add a credited visual and the frozen group-priority chart, test and revise, then present in pairs.')}</div>

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
              <span lang={asean?'en':undefined}>{o.desc}</span>
            </div>
          ))}
        </div>
      </ContentPanel>

      <ContentPanel className="plan-section" ariaLabel={t(language,'Chuẩn bị','Before the lesson')}>
        <h2>{t(language,'Chuẩn bị','Before the lesson')}</h2>
        {asean
          ? <p>{t(language,'Chuẩn bị link hoặc QR vào xưởng, phiếu viết đầu giờ và vận dụng, nguồn ảnh được phép sử dụng và một thiết bị cho mỗi nhóm để xem phòng 3D.','Prepare the studio join link or QR code, baseline and transfer writing cards, image sources with permission, and a device per group to preview the 3D room.')}</p>
          : <p lang="en">{CLASSROOM_SETUP}</p>}
      </ContentPanel>

      <ContentPanel className="plan-section plan-sequence" ariaLabel={t(language,'Tiến trình bài dạy','Lesson sequence')}>
        <h2>{t(language,'Tiến trình {{n}} hoạt động · {{m}} phút','{{n}}-activity lesson sequence · {{m}} min').replace('{{n}}',activityCount).replace('{{m}}',totalMinutes)}</h2>
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
                      {asean?<AseanActivityNotes stage={a} index={i} language={language}/>:<>
                        <small>{language==='en'?null:a.title+' · '}{LESSON_PLAN_NOTES[a.id].task}</small>
                        {MUSEUM_CURRICULUM_VIDEOS[i]?<small>
                          <a href={MUSEUM_CURRICULUM_VIDEOS[i].officialSource} target="_blank" rel="noreferrer">{t(language,'Video NASA và nguồn','NASA video and source')}</a>
                          {' · '}<a href={PUBLIC_LESSON_GUIDE+'#stage-'+(i+1)}>{t(language,'3 câu hỏi và bản đọc thay video','3 listening questions and read-aloud')}</a>
                        </small>:null}
                        <div className="plan-activity-meta">{a.minutes} {t(language,'phút','min')} · {LESSON_PLAN_NOTES[a.id].time} · {LESSON_PLAN_NOTES[a.id].reference}{a.sentence?` · “${a.sentence}”`:''}</div>
                        <small>{t(language,'Giai đoạn: ','Design phase: ')}{LESSON_PLAN_NOTES[a.id].phase}</small>
                        <details><summary>{t(language,'Cách tổ chức và sản phẩm','Procedure and deliverable')}</summary><small lang="en" style={{whiteSpace:'pre-line'}}>{LESSON_PLAN_NOTES[a.id].procedure}</small><small lang="en">{LESSON_PLAN_NOTES[a.id].output}</small></details>
                      </>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        {!asean&&<p className="plan-sequence-note">{t(language,'Tạo bài học mới không thay đổi các bài đã giao. Dữ liệu khảo sát, phản hồi và kết quả học sinh chỉ có khi lớp thực sự thực hiện.','Creating this lesson does not alter existing assignments. Survey responses, peer feedback and student results are recorded only after classroom activity.')}</p>}
      </ContentPanel>

      <ContentPanel className="plan-section" ariaLabel={t(language,'Đánh giá và minh chứng','Assessment and evidence')}>
        <h2>{t(language,'Đánh giá và minh chứng','Assessment and evidence')}</h2>
        <div className="plan-assessment">
          {asean ? <>
            <div>
              <p>{t(language,'Dùng phiếu viết đầu giờ và phiếu viết vận dụng để đối chiếu cách nhóm viết về trải nghiệm và lời khuyên cho khách.','Compare the baseline and transfer writing cards to see how each group writes about a visitor experience and gives advice.')}</p>
              <ul>
                <li>{t(language,'Phiếu kiểm tra V1 · 3 điểm','V1 visitor check · 3 points')}</li>
                <li>{t(language,'Phiếu thử lại V2 · một câu hỏi đã chọn','V2 visitor retest · one selected question')}</li>
                <li>{t(language,'Mỗi lượt viết nhóm · 2 điểm','Each group writing round · 2 points')}</li>
              </ul>
            </div>
            <div className="plan-rubric">
              <p><b>{t(language,'Rubric triển lãm nhóm · 10 điểm','Group exhibit rubric · 10 points')}</b></p>
              <ul>{ASEAN_RUBRIC.map(item=><li key={item.key}><details><summary>{t(language,item.label,item.en)} · {item.max}</summary><p lang="en">{item.help}</p></details></li>)}</ul>
            </div>
          </> : <>
            <div>
              <p>{t(language,'Khi dạy lại, dùng phiếu cá nhân 1 phút ở chặng 01 và 11. Dùng C2 để chấm ba câu ở V1 và C3 để hỏi lại câu liên quan đến phần đã sửa. Hồ sơ phiên đã khóa được đối chiếu bằng minh chứng gốc của phiên đó.','For a new delivery, use the one-minute individual writing checks in stages 01 and 11, the C2 three-question check in Stage 08, and a C3 retest of the revised item in Stage 09. Review a finalized session using the evidence recorded in that session.')}</p>
              <p lang="en">{VISITOR_TEST_GUIDANCE}</p>
              <ol lang="en">{VISITOR_TASKS.map(task=><li key={task}>{task}</li>)}</ol>
            </div>
            <div className="plan-rubric">
              <p><b>{t(language,'Rubric học tập · 100 điểm','Group learning rubric · 100 points')}</b></p>
              <ul>{RUBRIC.map(item=><li key={item.key}><details><summary>{t(language,item.label,item.en)} · {item.max}</summary><ul lang="en">{LESSON_RUBRIC_LEVELS[item.key].map(level=><li key={level}>{level}</li>)}</ul></details></li>)}</ul>
            </div>
            <p className="plan-resources">
              <a href={PUBLIC_LESSON_GUIDE}>{t(language,'Hướng dẫn 11 chặng và rubric bốn mức','11-stage guide and four-level rubric')}</a>
              {' · '}<a href={OFFLINE_LESSON_WORKSHEET} download>{t(language,'Tải phiếu thực hành ngoại tuyến','Download offline practice worksheet')}</a>
            </p>
          </>}
        </div>
      </ContentPanel>

      {!asean&&<ContentPanel className="plan-section" ariaLabel="Class 11.4 classroom records">
        <h2>{t(language,'Ghi nhận thực tế lớp 11.4 do giáo viên xác nhận','Teacher-Confirmed Classroom Records · 11.4')}</h2>
        <p lang="en">{CLASSROOM_RECORDS.confirmation}</p>
        <p><a href={PUBLIC_LESSON_GUIDE+'#classroom-records'}>{CLASSROOM_RECORDS.example}</a></p>
        <small lang="en">{CLASSROOM_RECORDS.sourceNote}</small>
      </ContentPanel>}

      <div className="plan-actions">
        {onCreate?<ActionTile title={t(language,'Tạo bài học từ kế hoạch','Create lesson from plan')} description={t(language,'Mở trình tạo bài học và phát hành mã nhóm.','Open the lesson wizard and issue group passes.')} variant="accent" onClick={onCreate}/>:null}
        {onNavigate?<ActionTile title={t(language,'Xem bài học đã giao','View assigned lessons')} description={t(language,'Quản lý mã nhóm và bài đã giao.','Manage group passes and assignments.')} onClick={()=>onNavigate('lessons')}/>:null}
      </div>
    </div>
  );
}
export {TeachingPlanScreen};
