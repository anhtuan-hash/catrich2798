import {LESSON_PLAN_NOTES} from './lessonPlanAlignment.js';
import {MUSEUM_ACTIVITY_SLIDES} from './museumActivitySlides.js';
import {SURVEY_QUESTION,SURVEY_OPTIONS} from './learningEvidence.js';
// The single source of truth for the contest lesson: Grade 11 English, 2 × 45 minutes.
// No student records or fabricated survey counts are bundled.
const stages=[
 {id:'climate-detective',period:1,minutes:5,title:'Climate Detective',vi:'Khởi động và đặt vấn đề',kind:'vote',question:'Which everyday school action could best reduce our environmental impact?',options:['Walking or cycling when possible','Switching off unused lights','Reducing food waste','I am not sure yet'],sentence:'I think … because …'},
 {id:'language-mini-lesson',period:1,minutes:10,title:'Language Mini-Lesson',vi:'Ngữ liệu và luyện diễn đạt',kind:'quiz',question:'After watching NASA, identify the science and report a cause and result in English.',options:[],questions:[
  {q:'What surrounds Earth and contains heat-trapping gases?',choices:['A glass roof','The atmosphere','A layer of ice'],answer:1,explanation:'NASA describes the atmosphere as a jacket of gases around Earth.'},
  {q:'Which human activity releases extra carbon dioxide?',choices:['Burning coal and oil','Watching the weather','Turning off unused lights'],answer:0,explanation:'The NASA video identifies burning fossil fuels as a source of extra carbon dioxide.'},
  {q:'Which sentence correctly reports NASA’s explanation?',choices:['Our school survey measures emissions.','Burning fossil fuels adds CO₂, so more heat can be trapped.','Greenhouse gases stop all sunlight.'],answer:1,explanation:'This sentence identifies NASA as the source and connects the cause to the possible result without overstating the evidence.'}
 ],sentence:'According to NASA, … . Therefore, … . We recommend … .'},
 {id:'classroom-survey',period:1,minutes:10,title:'Live Classroom Survey',vi:'Khảo sát trực tiếp',kind:'vote',question:SURVEY_QUESTION,options:SURVEY_OPTIONS,sentence:'In our group-priority survey, … out of N groups selected … . This does not measure individual habits.'},
 {id:'problem-evidence-solution',period:1,minutes:12,title:'Problem · Evidence · Solution',vi:'Phân tích và thiết kế giải pháp',kind:'group',question:'How can our school reduce one environmental problem?',options:[],videoQuestions:[
  {q:'What does global warming refer to?',choices:['A long-term rise in Earth’s average surface temperature','One unusually hot day','The temperature inside a classroom'],answer:0,explanation:'NASA defines global warming as the long-term rise in average surface temperature across Earth.'},
  {q:'Which example is mentioned as an effect of broader climate change?',choices:['More sea ice in the Arctic','Decreasing Arctic ice and droughts','A vote about school recycling'],answer:1,explanation:'NASA mentions decreasing Arctic ice, droughts and wildfires among observed signs of climate change.'},
  {q:'Which statement responsibly connects NASA evidence to our museum project?',choices:['Our classroom vote proves warming has stopped.','The two terms mean exactly the same thing.','Global warming is part of climate change. The survey records group priorities.'],answer:2,explanation:'This distinguishes the scientific source from a limited classroom group-priority survey.'}
 ],sentence:'According to NASA, … . Our group survey shows … . We recommend … because … .'},
 {id:'storyboard',period:1,minutes:8,title:'Storyboard Checkpoint',vi:'Phác thảo ba hiện vật',kind:'group',question:'Plan a three-exhibit museum: Problem, Evidence, Solution.',options:[],sentence:'Our first exhibit shows … . Our second exhibit uses … .'},
 {id:'recap',period:2,minutes:4,title:'Recap and Resume',vi:'Ôn tập và mở lại bài',kind:'recap',question:'What makes an English museum exhibit reliable and persuasive?',options:[],sentence:'Our exhibits must be clear, sourced and useful.'},
 {id:'artwork-studio',period:2,minutes:18,title:'Create the Museum',vi:'Tạo bảo tàng',kind:'artwork',question:'Write and check three English poster prompts, then build your first museum version.',options:[],sentence:'This artwork illustrates … . We chose … because … .'},
 {id:'peer-gallery-walk',period:2,minutes:8,title:'Peer Gallery Walk',vi:'Tham quan và góp ý chéo',kind:'peer',question:'What did you learn? What could make this exhibit clearer?',options:[],sentence:'I learned … . The message would be clearer if … .'},
 {id:'revise',period:2,minutes:6,title:'Improve the Exhibition',vi:'Cải tiến sau thử nghiệm',kind:'artwork',question:'Revise one caption or poster based on feedback.',options:[],sentence:'We changed … because our visitors said … .'},
 {id:'present',period:2,minutes:6,title:'Present and Discuss',vi:'Báo cáo và thảo luận',kind:'present',question:'Explain your problem, one authentic figure with N, and one practical solution.',options:[],sentence:'According to our group survey (N=…), … . We propose … .'},
 {id:'exit-ticket',period:2,minutes:3,title:'Exit Ticket',vi:'Đánh giá và vận dụng',kind:'exit',question:'What environmental action will you take, and why?',options:[],sentence:'I will … because … .'}
];
export const LIVE_STAGES=Object.freeze(stages.map(stage=>({
 ...stage, title:LESSON_PLAN_NOTES[stage.id].title, question:stage.kind==='vote'?stage.question:MUSEUM_ACTIVITY_SLIDES[stage.id].question,
 teaching:LESSON_PLAN_NOTES[stage.id].procedure, expected:LESSON_PLAN_NOTES[stage.id].output
})));
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
