// The single source of truth for the contest lesson: Grade 11 English, 2 × 45 minutes.
// No student records or fabricated survey counts are bundled.
export const LIVE_STAGES=Object.freeze([
 {id:'climate-detective',period:1,minutes:5,title:'Climate Detective',vi:'Khởi động và đặt vấn đề',kind:'vote',question:'Which everyday school action could best reduce our environmental impact?',options:['Walking or cycling when possible','Switching off unused lights','Reducing food waste','I am not sure yet'],teaching:'Show two contrasting school situations. Ask students to predict which action is feasible and give one English reason.',sentence:'I think … because …',expected:'A feasible action must match the school situation. This is a warm-up vote, NOT research evidence.'},
 {id:'language-mini-lesson',period:1,minutes:10,title:'Language Mini-Lesson',vi:'Ngữ liệu và luyện diễn đạt',kind:'quiz',question:'Practise evidence, cause and recommendation language.',options:[],questions:[
  {q:'Which phrase introduces evidence?',choices:['According to our survey, …','My favourite colour is …','Long time no see.'],answer:0},
  {q:'Which connector expresses a result?',choices:['although','therefore','despite'],answer:1},
  {q:'Which sentence makes a recommendation?',choices:['The sky is blue.','We recommend reusing water bottles.','He went home yesterday.'],answer:1}
 ],teaching:'Model: According to… / This may lead to… / We recommend… Students answer three quick questions in groups.',sentence:'According to …, … . Therefore, we recommend … .',expected:'Answers: 1A, 2B, 3B. Reveal only after teacher clicks Show Explanation.'},
 {id:'classroom-survey',period:1,minutes:10,title:'Live Classroom Survey',vi:'Khảo sát trực tiếp',kind:'vote',question:'Which action do you currently take at least three days a week?',options:['Walk or cycle when possible','Switch off unused lights','Avoid food waste','None of these'],teaching:'Open the survey. Explain respondents are GROUP DEVICES when students share a pass. Freeze responses before interpreting the chart.',sentence:'In our class group survey, … out of N groups selected … .',expected:'Use real N and percentages. Do NOT generalise a class sample to the whole school.'},
 {id:'problem-evidence-solution',period:1,minutes:12,title:'Problem · Evidence · Solution',vi:'Phân tích và thiết kế giải pháp',kind:'group',question:'How can our school reduce one environmental problem?',options:[],teaching:'Assign roles: English editor, data checker, artwork designer and presenter. Ask for a verifiable problem, a cited observation, and one feasible response.',sentence:'One problem is … . Evidence from … suggests … . We recommend … because … .',expected:'Check source, English accuracy and feasibility.'},
 {id:'storyboard',period:1,minutes:8,title:'Storyboard Checkpoint',vi:'Phác thảo ba hiện vật',kind:'group',question:'Plan a three-exhibit museum: Problem, Evidence, Solution.',options:[],teaching:'Demonstrate the three cards and the success checklist. Have groups draw a poster plan and prepare captions.',sentence:'Our first exhibit shows … . Our second exhibit uses … .',expected:'At least three planned labels and their sources; no invented figures.'},
 {id:'recap',period:2,minutes:4,title:'Recap and Resume',vi:'Ôn tập và mở lại bài',kind:'recap',question:'What makes an English museum exhibit reliable and persuasive?',options:[],teaching:'Review source, English readability, feasibility and visitor experience. Unlock artwork production next.',sentence:'Our exhibits must be clear, sourced and useful.',expected:'Have learners reopen the previous version of their draft.'},
 {id:'artwork-studio',period:2,minutes:18,title:'Create the 3D Museum',vi:'Tải tranh ảnh và dựng triển lãm 3D',kind:'artwork',question:'Upload an original poster, caption it in English, and see it framed on the museum wall.',options:[],teaching:'Demonstrate one genuine image upload. Students photograph or export their own poster/infographic, add captions (25–40 English words suggested), and choose one of three rooms.',sentence:'This artwork illustrates … . We chose … because … .',expected:'At least one actual artwork with a source label, real 3D placement and accessible 2D fallback.'},
 {id:'peer-gallery-walk',period:2,minutes:8,title:'Peer Gallery Walk',vi:'Tham quan và góp ý chéo',kind:'peer',question:'What did you learn? What could make this exhibit clearer?',options:[],teaching:'Open a temporary class-only peer preview. Require constructive English feedback; do not publicly publish drafts.',sentence:'I learned … . The message would be clearer if … .',expected:'Use real visitor feedback, not fabricated claims.'},
 {id:'revise',period:2,minutes:6,title:'Improve the Exhibition',vi:'Cải tiến sau thử nghiệm',kind:'artwork',question:'Revise one caption or poster based on feedback.',options:[],teaching:'Compare before/after and ask teams to state why their change improves communication.',sentence:'We changed … because our visitors said … .',expected:'Preserve authentic revision evidence.'},
 {id:'present',period:2,minutes:6,title:'Present and Discuss',vi:'Báo cáo và thảo luận',kind:'present',question:'Explain your problem, one authentic figure with N, and one practical solution.',options:[],teaching:'Spotlight two or three group museums for 45–60-second pitches. Invite one peer question.',sentence:'According to our group survey (N=…), … . We propose … .',expected:'Teacher can tour a private group draft without giving it public visibility.'},
 {id:'exit-ticket',period:2,minutes:3,title:'Exit Ticket',vi:'Đánh giá và vận dụng',kind:'exit',question:'What environmental action will you take, and why?',options:[],teaching:'Summarise the English communication skills and release the exit ticket. Groups then submit their frozen museum draft.',sentence:'I will … because … .',expected:'This is a group/device exit ticket. TTCM approval happens after the lesson.'}
]);
export const LIVE_TOTAL_MINUTES=LIVE_STAGES.reduce((sum,stage)=>sum+stage.minutes,0);
export const LIVE_PERIOD_MINUTES=[1,2].map(p=>LIVE_STAGES.filter(s=>s.period===p).reduce((n,s)=>n+s.minutes,0));
export const liveStage=index=>Number.isInteger(index)&&index>=0&&index<LIVE_STAGES.length?LIVE_STAGES[index]:null;
export function validResponse(stageIndex,value){
 const stage=liveStage(stageIndex);if(!stage)return false;
 if(stage.kind==='vote')return Number.isInteger(value)&&value>=0&&value<stage.options.length;
 if(stage.kind==='quiz')return Array.isArray(value)&&value.length===stage.questions.length&&
  value.every((v,i)=>Number.isInteger(v)&&v>=0&&v<stage.questions[i].choices.length);
 if(stage.kind==='exit'||stage.kind==='peer')return typeof value==='string'&&value.trim().length>=10&&value.length<=800;
 return false;
}
export function summarizeResponses(stageIndex,items){
 const stage=liveStage(stageIndex),responses=items||[];
 if(!stage)return null;
 const n=responses.length;
 if(stage.kind==='vote')return {n,unit:'group devices',options:stage.options.map((label,i)=>{
  const count=responses.filter(x=>x.value===i).length;
  return {label,count,percent:n?Math.round(count*10000/n)/100:0};
 })};
 if(stage.kind==='quiz')return {n,unit:'group devices',questions:stage.questions.map((q,i)=>{
  const correct=responses.filter(x=>Array.isArray(x.value)&&x.value[i]===q.answer).length;
  return {question:q.q,correct,n,percent:n?Math.round(correct*10000/n)/100:0};
 })};
 return {n,unit:'group devices',answers:responses.slice(0,30).map(x=>typeof x.value==='string'?x.value.slice(0,800):'')};
}
