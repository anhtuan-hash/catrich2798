// Teaching materials for the next run of the plan. Saved class evidence remains in its original session.
export const PUBLIC_LESSON_GUIDE = '/museum-lesson-guide.html';
export const OFFLINE_LESSON_WORKSHEET = '/museum-lesson-worksheet.html';

export const EVIDENCE_WRITING = Object.freeze({
  before: 'In a classroom priority survey, 3 of 10 groups selected switching off unused lights. Write ONE sentence reporting the result with a percentage. Write ONE sentence explaining what the survey can tell us.',
  after: 'In a classroom priority survey, 7 of 10 groups selected using reusable bottles. Write ONE sentence reporting the result with a percentage. Write ONE sentence explaining what the survey can tell us.',
  scoring: 'One point each for the correct count, denominator and percentage together, an accurate limit on what the survey describes, and clear English. Match the same student code before and after, and report the number of pairs and missing responses.'
});

export const VISITOR_TASKS = Object.freeze([
  'What is the school problem?',
  'Which source supports one claim? Point to it.',
  'What should someone do? Who does it and when?'
]);

const VISITOR_TEST = 'Give the visitor up to two minutes without explaining the answers. Record one point per correct response, plus the visitor group, time and format. Repeat the same three tasks on V2. Use another group if practical, and record when the same visitor may remember V1.';

export const LESSON_PLAN_NOTES = Object.freeze({
  'climate-detective': {
    phase: 'Define the problem',
    task: 'Compare an empty classroom with the lights on and a school that uses disposable cups. Choose one feasible action and give one reason in English. Keep the warm-up vote separate from the class survey.',
    extension: 'At the start of a new run, use the first of the two practice minutes for the independent writing check A, then use the other minute to agree on the group’s reason.'
  },
  'language-mini-lesson': {
    phase: 'Investigate',
    task: 'Watch the NASA excerpt, note two key words, and submit one set of three answers per group. Explain the link between fossil fuels, carbon dioxide and heat using according to, because or therefore.',
    extension: 'Aim for 2/3 or correct a response using something you heard. Show explanations after groups have answered.'
  },
  'classroom-survey': {
    phase: 'Investigate',
    task: 'Cast one priority vote per group. Freeze the chart before using it. Record the date, the count x, valid group votes N, x ÷ N × 100, and one limit on what the data show.',
    extension: 'Use a paper tally only when no online votes exist. A group-priority vote gives neither individual habits nor an estimate of electricity use or emissions.',
  },
  'problem-evidence-solution': {
    phase: 'Design a solution',
    task: 'Watch the second NASA clip and answer its three questions. Fill the canvas with a school problem, a linked NASA finding, the group-priority evidence and one feasible action.',
    extension: 'For a new run, compare two ways to communicate the same action. Score each 0–2 for clarity, feasibility and traceable evidence. Explain your choice and name who acts, when, and what could be tracked.'
  },
  'storyboard': {
    phase: 'Design a solution',
    task: 'Draft The Problem, The Evidence and Our Solution. Sketch the image, identify the caption writer and plan where the visitor will find the source and next action. Save the storyboard.',
    extension: 'Write the expected answers to the three visitor questions before building V1.'
  },
  'recap': {
    phase: 'Prepare to build',
    task: 'Reopen the storyboard and the frozen chart. Check roles, sources and what the visitor must be able to explain.'
  },
  'artwork-studio': {
    phase: 'Build V1',
    task: 'Build three exhibits with English labels of about 25–40 words each. In a five-minute parallel task, draft one English prompt per poster, check each generated visual against the group’s text and record the prompt and one check or revision. Attach the frozen chart alongside The Evidence poster and link the source. Credit the actual creator and tool, add alt text, preview and save V1.'
  },
  'peer-gallery-walk': {
    phase: 'Test V1',
    task: 'Visit the other groups in the private gallery. Draft one review per group with a specific learning point, a suggestion and a clarity rating from 1 to 4. Send the reviews together once all drafts are ready.',
    extension: 'For a new run, use the first two minutes of the visitor turn for the three V1 questions. Record the visitor’s answers before discussing how to improve the exhibit.'
  },
  'revise': {
    phase: 'Revise and retest',
    task: 'Choose one recorded comment and change one caption, source placement, image or instruction. Save V2 and describe the change and its reason. Keep V1 and the original feedback.',
    extension: 'For a new run, reserve the last two minutes to repeat the same three visitor tasks on V2. Record the result and any difference in visitor or conditions.'
  },
  'present': {
    phase: 'Evaluate and present',
    task: 'Show two or three 45–60-second pitches. Include a school problem, a NASA source, a class group-priority count and its limitation, a feasible action and one revision. Ask one question. Prepare the group’s Exit Ticket response.'
  },
  'exit-ticket': {
    phase: 'Apply',
    task: 'Submit one Exit Ticket per group or device: “I will … because …”. Check that the final museum is submitted. Agree on one way to track the action over the next week.',
    extension: 'For a new run, use one minute of task time for independent writing check B. Use the remaining 30 seconds to submit the group response prepared during the pitch stage.'
  }
});

export const VISITOR_TEST_GUIDANCE = VISITOR_TEST;

export const LESSON_RUBRIC_LEVELS = Object.freeze({
  english: ['40: accurate video responses, clear labels and a reasoned pitch', '32: main ideas, clear labels and a basic response to a question', '24: partial understanding or language that needs support', '12: fragments that do not yet communicate the main point'],
  evidence: ['20: traceable NASA source, accurate x/N/%, explicit limits', '16: appropriate conclusions with one small reporting gap', '12: missing denominator, limitation or direct source', '6: insufficient evidence or an unsupported interpretation'],
  reasoning: ['15: compares two approaches and gives a feasible action with role, time and a way to track it', '12: considers two approaches and misses one implementation detail', '9: gives one approach or a general justification', '4: vague problem or action with little connection to evidence'],
  design: ['15: three readable exhibits, credited visual, alt text and an easy-to-find source', '12: three exhibits with one usability or credit detail to improve', '9: the viewer is missing an exhibit, visual or source direction', '4: the viewer cannot easily follow the exhibit sequence'],
  revision: ['10: V1/V2, specific peer feedback and a documented change with a reason', '8: peer feedback and a reasoned change with one documentation gap', '6: the link between the feedback and the change is hard to verify', '3: a draft or comment with no traceable change']
});
