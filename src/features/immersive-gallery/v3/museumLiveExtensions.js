// Contest-grade instructional metadata for the existing 2 × 45-minute lesson.
// This module does not invent learner data or replace the locked curriculum sequence.
export const VOICEOVER_SCRIPTS=Object.freeze({
 'climate-detective':'Welcome to our Climate Action Museum. Look at these everyday school choices. Which action could best reduce our environmental impact? Choose one idea and explain why it is feasible.',
 'language-mini-lesson':'Good evidence needs a source. We use according to when naming a source, because when giving a reason, and therefore when describing a result. Now answer the three language questions in your group.',
 'classroom-survey':'Each group must choose exactly one action it will prioritise. We are measuring group priorities, not individual habits. After voting, we will report the number of groups and the limits of our class survey.',
 'problem-evidence-solution':'You are now climate detectives and designers. Identify one school issue, find relevant evidence, and propose a feasible solution. Write in English and explain how reliable your source is.',
 'storyboard':'Plan three museum exhibits: The Problem, The Evidence, and Our Solution. Sketch what a visitor will see, write a draft English caption, and check that each claim has support.',
 'recap':'Welcome back. What makes an exhibit trustworthy? We need clear English, authentic evidence, an honest limitation, and a practical recommendation. Reopen your group draft and prepare to create.',
 'artwork-studio':'Now build your museum. Upload your own poster or a properly licensed image. Add alternative text, a source, and a clear English label. Visit the 3D gallery to check its readability.',
 'peer-gallery-walk':'Visit another group’s private exhibition. What did you learn? Which message needs clarification? Give constructive feedback in English and rate its clarity. Be specific and respectful.',
 'revise':'Read the feedback your group received. Make one real change to your poster or caption. Record what changed, the feedback that led to it, and why the revision improves communication.',
 'present':'Present your museum in English. Explain one problem, cite one authentic figure with its sample size and limitation, and recommend a feasible action. Invite a question from another group.',
 'exit-ticket':'Before leaving, choose one environmental action you can take. Explain your reason in English. Submit your exit ticket and check that your museum draft is saved and ready for review.'
});
export const VIDEO_TASK_SUGGESTIONS=Object.freeze({
 'climate-detective':'school climate actions reducing carbon footprint',
 'language-mini-lesson':'NASA climate change greenhouse effect explained',
 'classroom-survey':'school sustainability student action survey',
 'problem-evidence-solution':'NASA climate change causes solutions schools',
 'storyboard':'how to storyboard an educational exhibition',
 'recap':'climate change science evidence explained',
 'artwork-studio':'create an educational poster infographic climate action',
 'peer-gallery-walk':'museum exhibit visitor feedback design',
 'revise':'how to revise clear evidence based writing',
 'present':'student presentation climate solution English',
 'exit-ticket':'one climate action students can take today'
});
// Curriculum-backed clips from official NASA channels; concise excerpts belong
// in the language/evidence phases, not in the gallery building or peer feedback phase.
// Never add videos to all 11 activities: the 90-minute teaching schedule is fixed.
export const MUSEUM_CURRICULUM_VIDEOS=Object.freeze({
 1:Object.freeze({
  id:'SN5-DnOHQmE',title:'What Is the Greenhouse Effect?',channel:'NASA Space Place',
  source:'https://www.youtube.com/watch?v=SN5-DnOHQmE',
  prompt:'Watch a selected segment. Name one greenhouse gas and explain its effect using because / therefore.',
  timing:'Play a short teacher-selected excerpt during Activity 2, not the entire video if time is limited.'
 }),
 3:Object.freeze({
  id:'TUinL0C_zgE',title:'Is Climate Change the Same as Global Warming? — We Asked a NASA Expert',channel:'NASA',
  source:'https://www.youtube.com/watch?v=TUinL0C_zgE',
  prompt:'Distinguish a scientific explanation from the group-priority class survey. Cite NASA accurately.',
  timing:'Show a brief teacher-selected excerpt at the start of Activity 4 for source verification.'
 })
});
export const curriculumMediaBoard=()=>Object.fromEntries(Object.entries(MUSEUM_CURRICULUM_VIDEOS).map(([index,v])=>[
 index,{query:'',instruction:v.prompt,videos:[{id:v.id,title:v.title,channel:v.channel}],voiceEnabled:false}
]));
// Each formative challenge requires a group choice AND an English explanation.
// The choices are teaching examples, never purported observations from the class.
export const MICRO_CHALLENGES=Object.freeze({
 3:{id:'evidence-sort',title:'Evidence Detective',prompt:'Which item is usable evidence in an English museum?',options:[
  'A dated observation with its source and method',
  'Everyone already knows this is true',
  'An anonymous picture with no context'
 ],answer:0,explain:'Give one reason why a named, checkable source matters.'},
 4:{id:'storyboard-order',title:'Storyboard Builder',prompt:'Choose the sequence that gives visitors a clear argument.',options:[
  'Solution → Problem → Evidence',
  'Problem → Evidence → Solution',
  'Evidence → Solution → Problem'
 ],answer:1,explain:'Explain why the order makes the story easier to follow.'},
 5:{id:'source-check',title:'Source Detective',prompt:'Which source would you check first when explaining global warming?',options:[
  'An unattributed social-media claim',
  'A meme with no author or date',
  'A named scientific organisation with a linked explanation'
 ],answer:2,explain:'Explain which details help you verify the information.'},
 6:{id:'caption-check',title:'Exhibit Caption Lab',prompt:'What makes your English exhibit ready for visitors?',options:[
  'A short label, sourced claim and an image description',
  'A large image with no explanation',
  'A strong claim without a source'
 ],answer:0,explain:'Explain one improvement your group will make to the label.'},
 8:{id:'revision-check',title:'Revision Detective',prompt:'Which record demonstrates that your group improved the exhibition?',options:[
  'We improved it, without showing a change',
  'Before and after versions plus a reason linked to feedback',
  'A second copy of the same poster'
 ],answer:1,explain:'Write what evidence would show the revision is genuine.'},
 9:{id:'pitch-check',title:'Evidence-Based Pitch',prompt:'Which presentation makes a responsible claim?',options:[
  'Our class vote proves emissions fell by half',
  'Everybody at our school agrees with us',
  'Our group survey shows a priority choice, with N and limits'
 ],answer:2,explain:'Explain why the other claims go beyond the available data.'}
});
export const MICRO_STAGE_INDEXES=Object.freeze(Object.keys(MICRO_CHALLENGES).map(Number));
export function validMicroAnswer(stageIndex,answer){
 const task=MICRO_CHALLENGES[stageIndex];
 return Boolean(task&&answer&&Number.isInteger(answer.choice)&&answer.choice>=0&&answer.choice<task.options.length&&
  typeof answer.reason==='string'&&answer.reason.trim().length>=12&&answer.reason.trim().length<=450);
}
export function extractYouTubeVideoId(input){
 const raw=String(input||'').trim();
 if(/^[A-Za-z0-9_-]{11}$/.test(raw))return raw;
 try{
  const u=new URL(raw);
  const host=u.hostname.toLowerCase();
  if(host==='youtu.be'||host==='www.youtu.be')return /^[A-Za-z0-9_-]{11}$/.test(u.pathname.slice(1))?u.pathname.slice(1):null;
  if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com','youtube-nocookie.com'].includes(host)){
   const rawId=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
   return /^[A-Za-z0-9_-]{11}$/.test(rawId||'')?rawId:null;
  }
 }catch{}
 return null;
}
export function videoTaskFor(board,stageIndex){
 const stage=board&&typeof board==='object'&&!Array.isArray(board)?board[String(stageIndex)]:null;
 const allowed=stage&&typeof stage==='object'?stage:{};
 return {
  query:typeof allowed.query==='string'?allowed.query.slice(0,120):'',
  instruction:typeof allowed.instruction==='string'?allowed.instruction.slice(0,350):'',
  voiceEnabled:allowed.voiceEnabled===true,
  videos:Array.isArray(allowed.videos)?allowed.videos.slice(0,6).filter(v=>extractYouTubeVideoId(v?.id)).map(v=>({
   id:extractYouTubeVideoId(v.id),title:String(v.title||'YouTube research video').slice(0,160),
   channel:String(v.channel||'').slice(0,120)
  })):[]
 };
}
export function stageMediaTools(session){
 const media=session?.media||{};
 const open=session?.status==='active'&&session?.stageOpen===true;
 return {
  video:open&&(Boolean(media.query?.trim())||(Array.isArray(media.videos)&&media.videos.length>0)),
  voice:open&&media.voiceEnabled===true
 };
}
export function teacherVoiceover(stage){return VOICEOVER_SCRIPTS[stage?.id]||[stage?.title,stage?.question,stage?.sentence].filter(Boolean).join('. ');}
