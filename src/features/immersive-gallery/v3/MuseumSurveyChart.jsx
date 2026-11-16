import React from 'react';
import './museumSurveyChart.css';

export default function MuseumSurveyChart({survey,language='en',pending=false,loading=false,testId='museum-survey-chart'}){
 const en=language==='en';
 const title=en?'Class group-priority survey':'Khảo sát ưu tiên của các nhóm';
 if(!survey?.n||!survey.options?.length)return <section className="museum-survey-chart" aria-label={title} data-testid={testId}>
  <strong>{title}</strong>
  <p>{loading?(en?'Loading the saved survey…':'Đang tải khảo sát đã lưu…'):pending
   ?(en?'The chart will appear here after the teacher finalises the survey.':'Biểu đồ sẽ hiện ở đây sau khi giáo viên chốt khảo sát.')
   :(en?'No saved survey results are available.':'Chưa có kết quả khảo sát đã lưu.')}</p>
 </section>;
 const locale=en?'en-GB':'vi-VN';
 const date=Date.parse(survey.created_at);
 const dateLabel=Number.isFinite(date)?new Intl.DateTimeFormat(locale,{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'medium'}).format(date):'';
 const format=new Intl.NumberFormat(locale,{maximumFractionDigits:2});
 return <section className="museum-survey-chart" aria-label={title} data-testid={testId}>
  <header>
   <strong>{title}</strong>
   <span>{en?'Frozen survey':'Đã chốt khảo sát'}{dateLabel?' · '+dateLabel:''}</span>
  </header>
  <p className="museum-survey-denominator">{en?'Valid group responses':'Số nhóm trả lời hợp lệ'} <b>N = {survey.n}</b></p>
  <ul>{survey.options.map(({label,count,percent})=><li key={label}>
   <div><span>{label}</span><b>{count}/{survey.n} ({format.format(percent)}%)</b></div>
   <div className="museum-survey-bar" aria-hidden="true"><i style={{width:percent+'%'}}/></div>
  </li>)}</ul>
  <p>{en?'The chart records group priorities. Individual habits and emissions require separate measurements.':'Biểu đồ ghi nhận ưu tiên của các nhóm. Thói quen cá nhân và phát thải cần dữ liệu đo riêng.'}</p>
 </section>;
}
