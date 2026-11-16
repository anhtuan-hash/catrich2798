import {AFTER_CLASS_TASK} from './lessonPlanAlignment.js';

// Projector copy for the P2 lesson. Historical question/response data comes from the live session.
export const MUSEUM_ACTIVITY_SLIDES = {
  'climate-detective': {
    question: 'Which of these actions could our school realistically take, and why?',
    cards: [
      ['A · After-class lights', 'The classroom is empty after the last lesson. The lights are still on. A class monitor could check the room with the teacher before leaving.'],
      ['B · Single-use cups', 'Students often buy drinks in disposable cups. The school could identify one refill point and ask students to bring reusable bottles.'],
    ],
    output: 'Discuss one feasible action in English. The warm-up vote records an initial idea.',
  },
  'language-mini-lesson': {
    question: 'What traps heat? What adds more CO₂?',
    cards: [
      ['Watch', 'Listen for atmosphere, greenhouse gases, fossil fuels and carbon dioxide.'],
      ['Check', 'Answer three questions as a group. Cite a detail from the video.'],
      ['Explain', 'Use “According to NASA” to connect a cause and its result.'],
    ],
    output: 'Three group answers and one correctly sourced cause-and-effect sentence.',
  },
  'classroom-survey': {
    question: 'As a group, choose ONE action you would prioritise at school.',
    cards: [
      ['Vote once', 'Agree on one choice and send one response per group.'],
      ['Report your result', 'Read the date, number of votes x, valid group total N, and percentage shown by BRIAN.'],
      ['State the limit', 'The chart describes group priorities in this class. It cannot measure habits or emissions.'],
    ],
    output: 'One dated count and percentage, and one sentence stating the survey’s limit.',
  },
  'problem-evidence-solution': {
    question: 'Which feasible action should our exhibit recommend, and how should we present it?',
    cards: [
      ['Problem', 'Name the issue at school and the audience.'],
      ['Evidence', 'Cite a NASA finding. Then report the class priority with x/N and its limitation.'],
      ['Solution', 'Compare two ways to communicate the action. Give your reason, name who acts and when, and decide what to track.'],
    ],
    output: 'A completed Problem–Evidence–Solution canvas and a reasoned choice.',
  },
  storyboard: {
    question: 'What should a visitor see, read and do?',
    cards: [
      ['The Problem', 'Draft the opening line and choose a visual that explains the issue.'],
      ['The Evidence', 'Plan where to place the NASA source and the group-priority chart.'],
      ['Our Solution', 'Write who does what and when. Sketch the three labels and plan how visitors will find the source and action.'],
    ],
    output: 'Save the three-part storyboard with draft labels, source locations and group roles.',
  },
  recap: {
    question: 'Can a visitor name the problem, find the source and explain the action?',
    cards: [
      ['Reopen', 'Open the saved storyboard and the frozen survey chart.'],
      ['Check', 'Confirm the sources, language and actions match the plan.'],
      ['Assign roles', 'Agree who writes, checks data, builds the visual and prepares the pitch.'],
    ],
    output: 'The group is ready to build V1 with the same evidence and agreed roles.',
  },
  'artwork-studio': {
    question: 'Build the first version of your museum.',
    cards: [
      ['Write', 'Create three English labels of about 25–40 words each.'],
      ['Prompt and check', 'Draft one English prompt for each poster. Check that the images match your text and contain only backed claims. Save the prompts and a check note.'],
      ['Upload and save V1', 'Credit the actual creator, add alt text and attach the frozen chart to The Evidence. Check the 2D or 3D view.'],
    ],
    output: 'A saved V1 with three exhibits, a traceable source and a concrete action.',
  },
  'peer-gallery-walk': {
    question: 'What did you learn? What could make this exhibit clearer?',
    cards: [
      ['Visit', 'Use the three posters to identify the problem, the evidence and the proposed action.'],
      ['Respond', 'Save a separate draft explaining what you learned and what could be clearer.'],
      ['Rate and send', 'Give each reviewed group one clarity rating from 1 to 4. In a ten-group class, send nine reviews together in one submission.'],
    ],
    output: 'One submission containing a separate review and clarity rating for each other group.',
  },
  revise: {
    question: 'Which change would help the visitor understand the exhibit?',
    cards: [
      ['Compare', 'Read the original comment and find the part of V1 that caused confusion.'],
      ['Improve', 'Change a caption, a source location, a visual or an action instruction.'],
      ['Save V2', 'Keep V1 and the feedback. Explain what changed and why.'],
    ],
    output: 'A saved V2 and a reason that refers to the visitor’s feedback.',
  },
  present: {
    question: 'Explain your school problem, evidence, action and one improvement.',
    cards: [
      ['Pitch · 45–60 seconds', 'Two or three groups present. Cite a NASA source and report x/N, its percentage and one limitation.'],
      ['Defend the action', 'Say who acts and when. Answer one question about the evidence or revision.'],
      ['Prepare the exit response', 'Agree on one school action and why it is feasible.'],
    ],
    output: 'A brief evidence-based pitch and one question from the audience.',
  },
  'exit-ticket': {
    question: 'What environmental action will your group take, and why?',
    cards: [
      ['Write', 'Use “I will … because …”. Give one concrete action and one reason.'],
      ['Submit', 'Send one Exit Ticket per group or device. Check that the museum is submitted.'],
      ['After class · D2', AFTER_CLASS_TASK],
    ],
    output: 'One group Exit Ticket and a submitted museum. The team reviews exhibits after class.',
  },
};

export const NEXT_DELIVERY_STAGES = ['climate-detective', 'peer-gallery-walk', 'revise', 'exit-ticket'];
