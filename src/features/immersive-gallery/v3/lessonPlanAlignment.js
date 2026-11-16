// Teaching materials for the next run of the plan. Saved class evidence remains in its original session.
export const PUBLIC_LESSON_GUIDE = '/museum-lesson-guide.html';
export const OFFLINE_LESSON_WORKSHEET = '/museum-lesson-worksheet.html';

export const EVIDENCE_WRITING = Object.freeze({
  before: 'In a classroom priority survey, 3 of 10 groups selected switching off unused lights. Write ONE sentence reporting the result with a percentage. Write ONE sentence explaining what the survey can tell us.',
  after: 'In a classroom priority survey, 7 of 10 groups selected using reusable bottles. Write ONE sentence reporting the result with a percentage. Write ONE sentence explaining what the survey can tell us.',
  scoring: 'One point each for the correct count, denominator and percentage together, an accurate limit on what the survey describes, and clear English. Match the same student code before and after, and report the number of pairs and missing responses.'
});

export const LISTENING_FALLBACKS = Object.freeze({
  'language-mini-lesson': 'Earth is surrounded by a layer of gases called the atmosphere. Sunlight warms Earth’s surface. The surface releases heat, and some gases in the atmosphere hold back part of that heat. Carbon dioxide is one of these gases. Burning fossil fuels such as coal and oil puts more carbon dioxide into the atmosphere. With more heat-trapping gases, more heat can be held near the surface, and Earth can become warmer.',
  'problem-evidence-solution': 'Global warming is a long-term rise in Earth’s average surface temperature. Climate change is broader. It includes long-term changes in typical conditions across regions and around the world. Examples include less ice in the Arctic and droughts. Changes in average surface temperature are one part of that wider picture.'
});

export const LESSON_WORD_BANK = 'atmosphere, greenhouse gases, fossil fuels, trap heat, emissions, priority, feasible, source, limitation, revise';
export const LESSON_LANGUAGE_FRAMES = '“According to NASA, …” · “Because …, …” · “In our survey, ___ out of ___ groups (___%) chose …” · “The data describe choices made by the groups in our class.” · “We recommend … because …” · “We changed … after visitors …”';

export const VISITOR_TASKS = Object.freeze([
  'What is the school problem?',
  'Which source supports one claim? Point to it.',
  'What should someone do? Who does it and when?'
]);

export const AFTER_CLASS_TASK = 'Track one approved action for a school week. Record the dates, what you counted and how often the action happened out of the total opportunities. Explain the result and one limitation in two or three English sentences. Submit D2 at the next English lesson after the observation week.';

export const VISITOR_TEST_GUIDANCE = 'On C2, the visitor answers all three questions in three minutes without coaching. Award one point for each correct answer after all three are written. For question 3, the action, person and time must all be present. On C3, repeat only the question for the part you revised. Keep the V1 total out of 3 and the paired scores out of 1. Mark the other V2 items N/T.';

export const CLASSROOM_SETUP = 'Prepare I1-A and I1-B separately for each student. Give each group B1–B3, C2–C3, D1–D2 and two A4 sheets for the exhibit versions. Set up groups of four or five. Use BRIAN, the offline HTML, or a board tally and folded A4 sheets. If groups cannot open drafts at the start of Stage 07, switch to paper. Keep the same three panels, source check and visitor questions.';

export const CLASSROOM_RECORDS = Object.freeze({
  date: '15 November 2026',
  confirmation: 'Nguyễn Anh Tuấn, the teacher responsible for class 11.4, confirms that the survey, feedback and saved versions are records of classroom activity.',
  sourceNote: 'The original BRIAN export describes the entries as prepared for presentation in Record_provenance.csv. This description of classroom activity follows the teacher’s confirmation.',
  example: 'The Last Light · EXH. 02 · G01',
  exhibitionUrl: 'https://esl-brian.vercel.app/#/tool/immersive-gallery?exhibition=gcp-087a5236534747fc9f714a332b26620c'
});

export const LESSON_PLAN_NOTES = Object.freeze({
  "climate-detective": {
    "phase": "Define the problem",
    "reference": "Appendix A · I1-A",
    "title": "Climate Detective",
    "time": "00–05",
    "task": "Complete I1-A independently in one minute. Compare an empty classroom with the lights on and a school using disposable cups. Agree on one problem and one reason in English.",
    "procedure": "Set the task (1 min). Show the two cards and the driving question. Work (2 min). In a new class, students complete I1-A independently for 1 minute, then agree on a problem and reason. Report (1 min). Two groups share. Review (1 min). Introduce the museum brief and distinguish the scenario cards from school observations.",
    "output": "One problem and one supporting reason, such as “Lights left on in an empty room could waste electricity.”",
    "extension": "Use one minute for I1-A independently and one minute for the group to agree on a reason. Use the same student code in I1-A and I1-B."
  },
  "language-mini-lesson": {
    "phase": "Investigate",
    "reference": "Appendix A · A1–A3",
    "title": "Language Mini-Lesson",
    "time": "05–15",
    "task": "Watch NASA video 1. Note two key words and answer A1–A3 as a group. Cite NASA in one English sentence explaining cause and effect.",
    "procedure": "Set the task (1 min). Ask “What traps heat? What adds more CO₂?” Work (5 min). Students note two key words, replay the relevant passage or consult the source card, and agree on three answers. Report (2 min). Ask two groups which words helped them, then reveal and explain the answers. Review (2 min). Students write a sentence citing NASA. Groups scoring below 2/3 correct one answer and identify the detail that supports it.",
    "output": "Three group answers and one cause-and-effect sentence with a source. For example, “According to NASA, burning fossil fuels adds carbon dioxide to the atmosphere, so more heat can be trapped.”"
  },
  "classroom-survey": {
    "phase": "Investigate",
    "reference": "B1",
    "title": "Live Classroom Survey",
    "time": "15–25",
    "task": "Cast one priority vote per group. Read the frozen count x, total valid group votes N, percentage and date. In B1, write one sentence reporting the result and one explaining what the votes represent.",
    "procedure": "Explain one vote per group (1 min). Collect one choice and a group code from each team (4 min). Show the completed BRIAN chart or tally on the board (3 min). Have teams write a result and its limit in B1 (2 min). On paper, add the valid votes and use 100 × x/N for each share.",
    "output": "An automatically generated chart or frequency table. Each group records the date, x, N and the displayed percentage and writes two English sentences reporting the result and its limit."
  },
  "problem-evidence-solution": {
    "phase": "Design a solution",
    "reference": "Appendix A · B1–B3 and Worksheet B2",
    "title": "Problem–Evidence–Solution",
    "time": "25–37",
    "task": "Watch NASA video 2 and answer its three questions. Use B2 to compare two ways of presenting the same action. Score clarity, feasibility and source traceability from 0 to 2. Explain the choice.",
    "procedure": "Pose the question “Are global warming and climate change the same?” (1 min). Play the clip, collect three answers and have teams state the distinction in one English sentence (3 min). Teams enter one NASA fact, one survey finding and two design ideas in B2 (4 min). Ask a neighbouring group which is clearer and why (2 min). Score the designs, choose one and write the reason (2 min).",
    "output": "Three answers, one sentence linking the two concepts and a canvas comparing two options and justifying the selected one."
  },
  "storyboard": {
    "phase": "Design a solution",
    "reference": "B3",
    "title": "Storyboard Checkpoint",
    "time": "37–45",
    "task": "Use B3 to write one opening sentence per panel. Plan visuals, credits and reading order. Mark the source location and write the expected answers to the three C2 questions.",
    "procedure": "Show a three-panel layout (1 min). Each team writes one opening sentence per panel, marks where the source goes and enters its expected C2 answers on B3 (5 min). Ask two teams to point to the planned source (1 min). Check for missing sources and keep B3 for Period 2 (1 min).",
    "output": "A three-panel storyboard with draft opening lines, poster ideas, sources, assigned roles and a visitor test plan."
  },
  "recap": {
    "phase": "Prepare to build",
    "reference": "B3 · C2",
    "title": "Recap and Resume",
    "time": "00–04",
    "task": "Reopen B3 and the class chart or paper tally. Confirm roles, recall the three C2 questions and practise keeping a copy of V1.",
    "procedure": "Return B3 and show the class chart or tally (1 min). Teams check their roles and open a draft or fold a blank sheet in thirds (1 min). Ask one group to recall the three C2 questions (1 min). Show how to keep a copy of the first draft before testing (1 min).",
    "output": "An open storyboard, confirmed roles and an 18-minute target for producing V1."
  },
  "artwork-studio": {
    "phase": "Build V1",
    "reference": "B3 · C1 · Appendix K when using image generation",
    "title": "Create the Museum",
    "time": "04–22",
    "task": "Build three English labels of 25–40 words. Place the chart or tally beside The Evidence. Link the source next to the claim. Credit each visual, add alt text to digital images, and save V1 with one sentence about a check.",
    "procedure": "Start · 2 min. Open the template or use the folded sheet. Show where the source and tally go.\nBuild · 12 min. Write the labels and check the figures in the first 5 minutes. Use the next 7 minutes to add visuals, credits and the class tally. Use a drawing or a credited visual if the digital image is unfinished.\nCheck · 4 min. In 3 minutes, have groups check all three panels and name one correction. In the last minute, save a copy or write V1 on the sheet.",
    "output": "One saved or paper copy of V1 and a one-sentence note on what the team checked. If using image generation, keep the English prompt and check the output against the label."
  },
  "peer-gallery-walk": {
    "phase": "Test V1",
    "reference": "C2",
    "title": "Peer Gallery Walk",
    "time": "22–30",
    "task": "Visit one group’s V1. Without help from the authors, answer the three C2 questions in English. Authors check against B3 and mark each answer 0 or 1. The visitors write one specific suggestion.",
    "procedure": "Pair · 1 min. Pair neighbouring teams. With an odd number, have the last three exchange drafts in a circle.\nRead · 3 min. Each team views one draft and records its three answers on C2. Authors stay silent.\nCheck · 2 min. Return each card to its authors. Check the answers against B3 and mark 0 or 1 for each.\nRespond · 2 min. Visitors write one suggestion in English, such as “Name who checks the lights.” Authors choose what to change.",
    "output": "One C2 card for each exhibit, with three scored answers and one specific suggestion in English.",
    "extension": "Pair neighbouring groups. If the number is odd, the last three exchange drafts in a circle. Use 1 minute to pair, 3 to read and write, 2 to score and 2 to give a suggestion."
  },
  "revise": {
    "phase": "Revise and retest",
    "reference": "C3",
    "title": "Improve the Exhibition",
    "time": "30–36",
    "task": "Keep V1 and save one reasoned change as V2. Use C3 to repeat only the question for the part that changed. Ask the same visitor group, preferably a different reader. Record the answer and both scores for that question.",
    "procedure": "Choose · 1 min. Choose one suggestion. If all answers were correct, make one answer easier to find.\nRevise · 3 min. Keep V1 and save the changed copy as V2. Note what you changed and why on C3.\nRetest · 2 min. Return V2 to the team that tested your draft. If possible, ask a different reader to answer the same question without help. Record both scores for that question and who read V2.",
    "output": "V1, V2 and the matched 0/1 result for the revised criterion. Explain the change in English.",
    "extension": "Choose for 1 minute, revise for 3 and retest for 2. In C3 mark the other questions N/T under V2. Record whether the reader changed."
  },
  "present": {
    "phase": "Evaluate and present",
    "reference": "D1 · E3",
    "title": "Present and Discuss",
    "time": "36–42",
    "task": "Every group gives a 45-second pitch to a partner. Everyone says one short sentence. Allow 15 seconds for a question and reply. Hear two examples for the whole class. Record on D1 and prepare the group Exit Ticket.",
    "procedure": "Have teams open V2 and assign lines (1 min). Partners take turns, with 45 seconds to present and 15 seconds for a question and reply per group (2 min). Hear any unpaired team while the pairs present. Then hear two 45-second examples and one class question and reply (2 min). Give feedback and ask each group to draft its Exit Ticket sentence (1 min). Use D1 for the peer record and E3 for contributions you hear.",
    "output": "One pitch per group in pairs, two plenary examples and a recorded question and answer."
  },
  "exit-ticket": {
    "phase": "Apply",
    "reference": "I1-B · D2",
    "title": "Exit Ticket",
    "time": "42–45",
    "task": "Write I1-B independently for one minute. The reporter submits one group sentence beginning “I will … because …” and confirms V2. Track the action in D2 after class.",
    "procedure": "Hand out I1-B and cue the group ticket (30 sec). Students write alone (60 sec). The reporter copies the prepared sentence and confirms V2 (30 sec). Hear one action and its reason (30 sec). Collect the forms and assign D2 (30 sec).",
    "output": "Individual I1-B responses, one group Exit Ticket and the final museum version.",
    "extension": "Hand out I1-B (30 seconds). Write individually (60 seconds). Copy the prepared group sentence and confirm V2 (30 seconds). Hear one action (30 seconds). Collect I1-B and assign D2 (30 seconds)."
  }
});

export const LESSON_RUBRIC_LEVELS = Object.freeze({
  "english": [
    "40. At least 2/3 per video or corrections with evidence. Three coherent labels and a complete pitch with a reasoned answer.",
    "32. Understands both main ideas. Readable labels with sources and a proposal. Clear pitch and basic answer.",
    "24. Partial understanding. Labels lack content or contain errors that obscure meaning. The pitch or answer needs support.",
    "12. Isolated words or sentences, or the pitch and labels fail to convey the main message."
  ],
  "evidence": [
    "20. Verifiable NASA claim, correct x, N and percentage, and a clear limit. Conclusion stays within scope.",
    "16. Both sources are clear and the conclusion is sound. One minor detail needs clarification, such as a unit or rounding note.",
    "12. Evidence is present, but N or the limitation is missing, or the source is hard to locate.",
    "6. Unsupported evidence or conclusions outside the scope of the data."
  ],
  "reasoning": [
    "15. Specific problem and comparison of two options. The proposal specifies who acts, what they do, when and how to track it.",
    "12. Two options considered. One implementation detail is missing from an otherwise clear proposal.",
    "9. Only one option or a general reason. The action needs detail.",
    "4. The problem or action is vague or poorly connected to evidence."
  ],
  "design": [
    "15. Three readable panels with easy-to-find sources, credited visuals and alt text for digital images.",
    "12. Three readable panels with visuals. One detail about layout, sources, credit or digital alt text needs attention.",
    "9. A preview exists but an exhibit, poster or source cue is missing.",
    "4. The preview is disjointed and visitors struggle to follow it."
  ],
  "revision": [
    "10. C2 shows a specific barrier or suggestion. V1, V2 and C3 show a reasoned change and a recorded retest of the same item.",
    "8. A peer check and a reasoned change are documented. The matched retest is missing or incomplete.",
    "6. Feedback and a revision exist, but the connection is hard to verify.",
    "3. Only a draft or isolated comment. No documented change based on feedback."
  ]
});
