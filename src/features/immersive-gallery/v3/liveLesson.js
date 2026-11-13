import {SURVEY_QUESTION,SURVEY_OPTIONS} from './learningEvidence.js';
// The single source of truth for the contest lesson: Grade 11 English, 2 × 45 minutes.
// No student records or fabricated survey counts are bundled.
export const LIVE_STAGES=Object.freeze([
 {id:'climate-detective',period:1,minutes:5,title:'Climate Detective',vi:'Khởi động và đặt vấn đề',kind:'vote',question:'Which everyday school action could best reduce our environmental impact?',options:['Walking or cycling when possible','Switching off unused lights','Reducing food waste','I am not sure yet'],teaching:'Show two contrasting school situations. Ask students to predict which action is feasible and give one English reason.',sentence:'I think … because …',expected:'A feasible action must match the school situation. This is a warm-up vote, NOT research evidence.'},
 {id:'language-mini-lesson',period:1,minutes:10,title:'Language Mini-Lesson',vi:'Ngữ liệu và luyện diễn đạt',kind:'quiz',question:'After watching NASA, identify the science and report a cause and result in English.',options:[],questions:[
  {q:'What surrounds Earth and contains heat-trapping gases?',choices:['A glass roof','The atmosphere','A layer of ice'],answer:1,explanation:'NASA describes the atmosphere as a jacket of gases around Earth.'},
  {q:'Which human activity releases extra carbon dioxide?',choices:['Burning coal and oil','Watching the weather','Turning off unused lights'],answer:0,explanation:'The NASA video identifies burning fossil fuels as a source of extra carbon dioxide.'},
  {q:'Which sentence correctly reports NASA’s explanation?',choices:['According to NASA, every school survey measures emissions.','According to NASA, burning fossil fuels adds CO₂; therefore, more heat can be trapped.','NASA says that greenhouse gases stop all sunlight.'],answer:1,explanation:'This sentence identifies NASA as the source and connects the cause to the possible result without overstating the evidence.'}
 ],teaching:'Play the NASA Space Place clip. Ask groups to identify the atmosphere, fossil fuel emissions and a source-based cause–result sentence. Groups submit three video-check answers before reviewing their language.',sentence:'According to NASA, … . Therefore, … . We recommend … .',expected:'Video check answers: 1B, 2A, 3B. Reveal only after teacher clicks Show Explanation. Keep the survey distinct from NASA evidence.'},
 {id:'classroom-survey',period:1,minutes:10,title:'Live Classroom Survey',vi:'Khảo sát trực tiếp',kind:'vote',question:SURVEY_QUESTION,options:SURVEY_OPTIONS,teaching:'Open the survey. Each group discusses and chooses ONE priority. N counts groups, never individual habits. Freeze the survey before interpreting or pinning its chart.',sentence:'In our group-priority survey, … out of N groups selected … . This does not measure individual habits.',expected:'Use real N and percentages. Do NOT generalise a class sample to the whole school.'},
 {id:'problem-evidence-solution',period:1,minutes:12,title:'Problem · Evidence · Solution',vi:'Phân tích và thiết kế giải pháp',kind:'group',question:'How can our school reduce one environmental problem?',options:[],videoQuestions:[
  {q:'What does global warming mean in NASA’s video?',choices:['A long-term rise in Earth’s average surface temperature','A single unusually hot day','The temperature inside one classroom'],answer:0,explanation:'NASA defines global warming as the long-term rise in average surface temperature across Earth.'},
  {q:'Which example is mentioned as an effect of broader climate change?',choices:['More sea ice in the Arctic','Decreasing Arctic ice and droughts','A vote about school recycling'],answer:1,explanation:'NASA mentions decreasing Arctic ice, droughts and wildfires among observed signs of climate change.'},
  {q:'Which statement responsibly connects NASA evidence to our museum project?',choices:['Our classroom vote proves that global warming has stopped.','Global warming and climate change have exactly the same meaning.','According to NASA, global warming is one part of climate change; our group survey only records group priorities.'],answer:2,explanation:'This distinguishes the scientific source from a limited classroom group-priority survey.'}
 ],teaching:'Show the NASA Expert video. Groups answer the three video comprehension questions, then complete the Problem–Evidence–Solution canvas using a verifiable source and one feasible school action.',sentence:'According to NASA, … . Our group survey shows … . We recommend … because … .',expected:'Video check answers: 1A, 2B, 3C. Then check each group’s source, English accuracy and feasibility. A class vote is not scientific climate evidence.'},
 {id:'storyboard',period:1,minutes:8,title:'Storyboard Checkpoint',vi:'Phác thảo ba hiện vật',kind:'group',question:'Plan a three-exhibit museum: Problem, Evidence, Solution.',options:[],teaching:'Demonstrate the three cards and the success checklist. Have groups draw a poster plan and prepare captions.',sentence:'Our first exhibit shows … . Our second exhibit uses … .',expected:'At least three planned labels and their sources; no invented figures.'},
 {id:'recap',period:2,minutes:4,title:'Recap and Resume',vi:'Ôn tập và mở lại bài',kind:'recap',question:'What makes an English museum exhibit reliable and persuasive?',options:[],teaching:'Review source, English readability, feasibility and visitor experience. Unlock artwork production next.',sentence:'Our exhibits must be clear, sourced and useful.',expected:'Have learners reopen the previous version of their draft.'},
 {id:'artwork-studio',period:2,minutes:18,title:'Create the 3D Museum',vi:'Tải tranh ảnh và dựng triển lãm 3D',kind:'artwork',question:'Upload an original poster, caption it in English, and see it framed on the museum wall.',options:[],teaching:'Demonstrate one genuine image upload. Students photograph or export their own poster/infographic, add captions (25–40 English words suggested), and choose one of three rooms.',sentence:'This artwork illustrates … . We chose … because … .',expected:'At least one actual artwork with a source label, real 3D placement and accessible 2D fallback.'},
 {id:'peer-gallery-walk',period:2,minutes:8,title:'Peer Gallery Walk',vi:'Tham quan và góp ý chéo',kind:'peer',question:'What did you learn? What could make this exhibit clearer?',options:[],teaching:'Open a temporary class-only peer preview. Require constructive English feedback; do not publicly publish drafts.',sentence:'I learned … . The message would be clearer if … .',expected:'Use real visitor feedback, not fabricated claims.'},
 {id:'revise',period:2,minutes:6,title:'Improve the Exhibition',vi:'Cải tiến sau thử nghiệm',kind:'artwork',question:'Revise one caption or poster based on feedback.',options:[],teaching:'Compare before/after and ask teams to state why their change improves communication.',sentence:'We changed … because our visitors said … .',expected:'Preserve authentic revision evidence.'},
 {id:'present',period:2,minutes:6,title:'Present and Discuss',vi:'Báo cáo và thảo luận',kind:'present',question:'Explain your problem, one authentic figure with N, and one practical solution.',options:[],teaching:'Spotlight two or three group museums for 45–60-second pitches. Invite one peer question.',sentence:'According to our group survey (N=…), … . We propose … .',expected:'Teacher can tour a private group draft without giving it public visibility.'},
 {id:'exit-ticket',period:2,minutes:3,title:'Exit Ticket',vi:'Đánh giá và vận dụng',kind:'exit',question:'What environmental action will you take, and why?',options:[],teaching:'Summarise the English communication skills and release the exit ticket. Groups then submit their frozen museum draft.',sentence:'I will … because … .',expected:'This is a group/device exit ticket. TTCM approval happens after the lesson.'}
]);
// Old sessions retain their original Activity 2 answer key; never re-grade their saved votes
// against the revised video-linked quiz. New sessions opt into VIDEO_QUESTION_VERSION.
export const VIDEO_QUESTION_VERSION=2;
export const LEGACY_LANGUAGE_MINI_LESSON=Object.freeze({...LIVE_STAGES[1],
 question:'Practise evidence, cause and recommendation language.',
 questions:[
  {q:'Which phrase introduces evidence?',choices:['According to our survey, …','My favourite colour is …','Long time no see.'],answer:0,explanation:'According to introduces the source of information.'},
  {q:'Which connector expresses a result?',choices:['although','therefore','despite'],answer:1,explanation:'Therefore signals a result; although and despite signal contrast.'},
  {q:'Which sentence makes a recommendation?',choices:['The sky is blue.','We recommend reusing water bottles.','He went home yesterday.'],answer:1,explanation:'We recommend states a suggested action; the other sentences only describe facts.'}
 ],
 teaching:'Model according to, therefore and we recommend; three short group questions.',
 expected:'Legacy quiz answers: 1A, 2B, 3B. Preserved for already-started sessions.'
});
export const sessionStage=(session,index=session?.stage_index)=>{
 const original=liveStage(index);
 if(index===1&&Number(session?.media_board?.lessonQuestionVersion||0)<VIDEO_QUESTION_VERSION)
  return LEGACY_LANGUAGE_MINI_LESSON;
 return original;
};
export const LIVE_TOTAL_MINUTES=LIVE_STAGES.reduce((sum,stage)=>sum+stage.minutes,0);
export const LIVE_PERIOD_MINUTES=[1,2].map(p=>LIVE_STAGES.filter(s=>s.period===p).reduce((n,s)=>n+s.minutes,0));
export const liveStage=index=>Number.isInteger(index)&&index>=0&&index<LIVE_STAGES.length?LIVE_STAGES[index]:null;
export function validResponse(stageIndex,value,stageOverride=null){
 const stage=stageOverride||liveStage(stageIndex);if(!stage)return false;
 if(stage.kind==='vote')return Number.isInteger(value)&&value>=0&&value<stage.options.length;
 const questions=stage.kind==='quiz'?stage.questions:stage.kind==='group'?stage.videoQuestions:null;
 if(questions)return Array.isArray(value)&&value.length===questions.length&&
  value.every((v,i)=>Number.isInteger(v)&&v>=0&&v<questions[i].choices.length);
 if(stage.kind==='exit'||stage.kind==='peer')return typeof value==='string'&&value.trim().length>=10&&value.length<=800;
 return false;
}
export function summarizeResponses(stageIndex,items,stageOverride=null){
 const stage=stageOverride||liveStage(stageIndex),responses=items||[];
 if(!stage)return null;
 const n=responses.length;
 if(stage.kind==='vote')return {n,unit:'group devices',options:stage.options.map((label,i)=>{
  const count=responses.filter(x=>x.value===i).length;
  return {label,count,percent:n?Math.round(count*10000/n)/100:0};
 })};
 const questions=stage.kind==='quiz'?stage.questions:stage.kind==='group'?stage.videoQuestions:null;
 if(questions)return {n,unit:'group devices',questions:questions.map((q,i)=>{
  const correct=responses.filter(x=>Array.isArray(x.value)&&x.value[i]===q.answer).length;
  return {question:q.q,correct,n,percent:n?Math.round(correct*10000/n)/100:0};
 })};
 return {n,unit:'group devices',answers:responses.slice(0,30).map(x=>typeof x.value==='string'?x.value.slice(0,800):'')};
}
