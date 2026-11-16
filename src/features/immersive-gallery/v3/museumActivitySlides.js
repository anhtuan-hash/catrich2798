import {AFTER_CLASS_TASK, LESSON_PLAN_NOTES} from './lessonPlanAlignment.js';

const slides = {
  'climate-detective': ['Which action could our school realistically take, and why?', [
    ['I1-A · 1 minute', 'Write two English sentences on your own. Then agree on a group reason.'],
    ['A · After-class lights', 'The classroom is empty after the last lesson. The lights are still on. A class monitor could check the room with the teacher before leaving.'],
    ['B · Single-use cups', 'Students often buy drinks in disposable cups. The school could identify one refill point and ask students to bring reusable bottles.'],
  ]],
  'language-mini-lesson': ['What traps heat? What adds more CO₂?', [
    ['Listen', 'Note two key words from NASA video 1.'],
    ['Check · A1–A3', 'Agree on three answers. Cite something you heard when correcting an answer.'],
    ['Explain', 'Write one cause-and-effect sentence citing NASA.'],
  ]],
  'classroom-survey': ['As a group, choose ONE action you would prioritise at school.', [
    ['Vote once · B1', 'Send one response per group.'],
    ['Report', 'Write the date, x, N and the percentage from the frozen chart or tally.'],
    ['Explain the limit', 'Write what the group votes represent.'],
  ]],
  'problem-evidence-solution': ['Are global warming and climate change the same?', [
    ['NASA video 2', 'Answer its three questions and explain the distinction in one English sentence.'],
    ['Compare · B2', 'Record a NASA finding and a survey finding. Compare two ways to present the same action.'],
    ['Decide', 'Score clarity, feasibility and source traceability. Give a reason for your choice.'],
  ]],
  storyboard: ['What should a visitor see, read and do?', [
    ['Draft · B3', 'Write an opening sentence for each of the three panels.'],
    ['Plan', 'Choose the visuals and reading order. Mark where visitors will find the source and credits.'],
    ['Prepare the check', 'Write the expected answers to the three C2 questions.'],
  ]],
  recap: ['Can visitors name the problem, find the source and explain the action?', [
    ['Reopen', 'Reopen B3 and the frozen chart or paper tally.'],
    ['Check', 'Confirm roles and recall the three C2 questions.'],
    ['Get ready', 'Open your draft or fold A4 into three panels. Keep a copy before testing.'],
  ]],
  'artwork-studio': ['Build the first version of your museum.', [
    ['Start · 2 min', 'Open the template or folded A4 sheet. Locate The Evidence.'],
    ['Build · 12 min', 'Write three 25–40-word English labels and check the figures. Add the tally, sources, credited visuals and digital alt text.'],
    ['Check · 4 min', 'Check the panels, identify one correction and save or label V1. Save an English prompt only if you generate an image.'],
  ]],
  'peer-gallery-walk': ['Can visitors understand your V1 without help?', [
    ['Pair · 1 min', 'Visit one partner draft. The final three groups work in a circle if the number is odd.'],
    ['Read · 3 min', 'Record the three C2 answers in English. Authors stay silent.'],
    ['Check · 2 min', 'Compare the answers with B3. Score each one 0 or 1.'],
    ['Respond · 2 min', 'Write one specific suggestion in English. The authors choose one change.'],
  ]],
  revise: ['Which change will help the visitor understand the exhibit?', [
    ['Choose · 1 min', 'Choose one suggestion. If all answers were correct, help visitors find one answer more easily.'],
    ['Revise · 3 min', 'Keep V1. Save V2 and record what changed and why on C3.'],
    ['Retest · 2 min', 'Ask the same visitor group only the question for the changed part. Record both 0/1 scores and whether the reader changed.'],
  ]],
  present: ['Explain your problem, evidence and proposed action.', [
    ['Prepare · 1 min', 'Open V2. Divide the lines so everyone says a short sentence.'],
    ['Pitch in pairs · 2 min', 'Each group presents for 45 seconds and takes 15 seconds for a question and reply.'],
    ['Share and reflect · 3 min', 'Hear two class examples and a question. Use D1, then draft the group Exit Ticket.'],
  ]],
  'exit-ticket': ['What environmental action will your group take, and why?', [
    ['I1-B · 1 minute', 'Write two English sentences independently.'],
    ['Group Exit Ticket', 'Submit one “I will … because …” sentence and confirm V2.'],
    ['After class · D2', AFTER_CLASS_TASK],
  ]],
};

export const MUSEUM_ACTIVITY_SLIDES = Object.fromEntries(Object.entries(slides).map(
  ([id, [question, cards]]) => [id, {question, cards, output: LESSON_PLAN_NOTES[id].output}]
));

export const NEXT_DELIVERY_STAGES = ['climate-detective', 'peer-gallery-walk', 'revise', 'exit-ticket'];
