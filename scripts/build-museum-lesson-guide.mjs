import fs from 'node:fs';
import { LIVE_STAGES, LIVE_PERIOD_MINUTES, LIVE_TOTAL_MINUTES } from '../src/features/immersive-gallery/v3/liveLesson.js';
import { LESSON_RESOURCES, OFFLINE_GUIDE, CONCLUSION } from '../src/features/immersive-gallery/v3/lessonResources.js';
import { MUSEUM_CURRICULUM_VIDEOS } from '../src/features/immersive-gallery/v3/museumLiveExtensions.js';
import { LESSON_KITS, RUBRIC } from '../src/features/immersive-gallery/v3/museumData.js';
import {
  EVIDENCE_WRITING, LESSON_PLAN_NOTES, LESSON_RUBRIC_LEVELS, OFFLINE_LESSON_WORKSHEET,
  VISITOR_TASKS, VISITOR_TEST_GUIDANCE,
} from '../src/features/immersive-gallery/v3/lessonPlanAlignment.js';

const escape = value => String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const link = (url, label) => `<a href="${escape(url)}" rel="noreferrer">${escape(label)}</a>`;
const list = values => `<ol>${values.map(value => `<li>${escape(value)}</li>`).join('')}</ol>`;
const stageCard = (stage, index) => {
  const note = LESSON_PLAN_NOTES[stage.id];
  const video = MUSEUM_CURRICULUM_VIDEOS[index];
  const questions = stage.questions ?? stage.videoQuestions;
  const videoResources = video
    ? `<p><strong>NASA:</strong> ${link(video.officialSource, video.title)} · ${link(video.source, 'YouTube')} · ${link(video.transcript, 'Transcript')}</p><p>${escape(video.timing)}</p>`
    : '';
  const quiz = questions
    ? `<ol>${questions.map(q => `<li>${escape(q.q)}<ol type="A">${q.choices.map(choice => `<li>${escape(choice)}</li>`).join('')}</ol></li>`).join('')}</ol>
<details><summary>Teacher answer key</summary>${list(questions.map(q => `${'ABC'[q.answer]} · ${q.explanation}`))}</details>`
    : '';
  return `<details id="stage-${index + 1}"${index === 0 ? ' open' : ''}>
<summary>${index + 1}. ${escape(stage.title)} <span>Period ${stage.period} · ${stage.minutes} min · ${escape(note.phase)}</span></summary>
<p>${escape(stage.question)}</p><p class="sentence">${escape(stage.sentence)}</p>
<p>${escape(note.task)}</p>${note.extension ? `<p><strong>Next delivery:</strong> ${escape(note.extension)}</p>` : ''}
${videoResources}${quiz}
</details>`;
};
const stages = LIVE_STAGES.map(stageCard).join('\n');
const cards = LESSON_RESOURCES.map(card => `<article><h3>${escape(card.title)}</h3><p>${escape(card.text)}</p>
<p><strong>${escape(card.task)}</strong></p><small>${card.url ? link(card.url, card.source) : escape(card.source)}</small></article>`).join('\n');
const rubric = RUBRIC.map(criterion => `<article><h3>${escape(criterion.en)} · ${criterion.max}</h3>
${list(LESSON_RUBRIC_LEVELS[criterion.key])}</article>`).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BRIAN · Our Climate Action Museum · Lesson guide</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#f3f5ed;color:#213c36;font:17px/1.65 system-ui,sans-serif}
  main{max-width:1040px;margin:auto;padding:40px 24px}
  header{background:#e3ecd9;border-radius:26px;padding:32px;margin-bottom:24px}
  h1{font-size:clamp(30px,5vw,48px);line-height:1.15} h2{margin-top:38px} small{font-size:14px}
  a{color:#135c57} :focus-visible{outline:3px solid #986100;outline-offset:3px}
  details,article{background:white;border:1px solid #d3ddcf;padding:20px;border-radius:16px;margin:12px 0}
  summary{cursor:pointer;font-weight:750} summary span{display:block;font-size:14px;color:#52655c}
  .cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
  .sentence{padding:16px;background:#f7f2db;border-radius:10px}
  button,.button{display:inline-block;border:0;background:#225f50;color:white;padding:12px 18px;border-radius:9px;font:inherit;cursor:pointer;text-decoration:none;margin:4px}
  .note{border-left:4px solid #778944;padding:12px 18px;background:#fffdf4}
  nav ul{display:flex;flex-wrap:wrap;gap:8px 22px;padding-left:18px}
  @media(max-width:650px){.cards{grid-template-columns:1fr}main{padding:16px}header{padding:22px}}
  @media print{button,.button,nav{display:none}body{background:white}.cards{display:block}article{break-inside:avoid}}
</style>
</head>
<body><main>
<header>
  <small>ENGLISH 11 · GLOBAL SUCCESS · UNIT 5</small>
  <h1>Our Climate Action Museum</h1>
  <p>${escape(LESSON_KITS[0].challenge)}</p>
  <strong>2 periods · ${LIVE_PERIOD_MINUTES.join(' + ')} minutes · ${LIVE_STAGES.length} activities</strong>
  <p>Teaching guide for English teachers and competition reviewers.</p>
  <button type="button" id="print">Print / Save as PDF</button>
  <a class="button" href="/#/tool/immersive-gallery">Open Museum Lab</a>
  <a class="button" href="${OFFLINE_LESSON_WORKSHEET}" download="Our_Climate_Action_Museum_Hoc_lieu.html">Download offline worksheet</a>
</header>
<p class="note">The published classroom session is a record of the completed lesson. The individual writing checks and the three-question V1/V2 comparison below are tools for a new delivery. Judge recorded classroom evidence using the original work from that session.</p>
<nav aria-label="Lesson guide"><ul>
<li><a href="#sequence">Lesson sequence</a></li><li><a href="#materials">Learning materials</a></li>
<li><a href="#assessment">Assessment</a></li><li><a href="#evidence">Learning evidence</a></li>
</ul></nav>
<h2>Objectives and learning products</h2>
<ul>
<li>Listen for key ideas and details in two NASA videos. Aim for two correct answers out of three per video or explain a correction using a detail from the clip.</li>
<li>Read a scientific source and a classroom chart. Explain what each source can support.</li>
<li>Write three English labels of about 25–40 words each. Include a named source, x/N and percentage, a limit on the survey and a practical action.</li>
<li>Prepare a 45–60-second pitch. Two or three groups present and answer a visitor’s question.</li>
</ul>
<h2 id="sequence">${LIVE_TOTAL_MINUTES}-minute lesson sequence</h2>
${stages}
<h2 id="materials">Learning materials and tasks</h2>
<div class="cards">${cards}</div>
<h2>Group worksheet</h2>
<article>
<p>Roles: English editor · Data checker · Artwork designer · Presenter</p>
<p>Problem and audience: ____________________</p>
<p>Scientific finding and source: ____________________</p>
<p>Group-priority survey: ____ out of ____ groups (____%) · Date: ____ · Limit: ____</p>
<p>Option A: ____ · Option B: ____ · Compare clarity, feasibility and whether the source can be found.</p>
<p>Solution: ____ · Who acts? ____ · When? ____ · What can we track? ____</p>
<p>Image creator / method / usage rights / alt text: ____________________</p>
<p>Peer group: ____ · I learned ____ · Please clarify ____ · Clarity 1–4: ____</p>
<p>V1: ____ · V2: ____ · We changed ____ because ____ .</p>
</article>
<h2 id="assessment">Assessment for the next delivery</h2>
<article>
<h3>Individual writing · one minute at the start and end</h3>
<p>Use one code per student. The following numbers are exercise examples.</p>
<p><strong>A · Stage 01.</strong> ${escape(EVIDENCE_WRITING.before)}</p>
<p><strong>B · Stage 11.</strong> ${escape(EVIDENCE_WRITING.after)}</p>
<p>${escape(EVIDENCE_WRITING.scoring)}</p>
</article>
<article>
<h3>Visitor test · V1 and V2</h3>
${list(VISITOR_TASKS)}
<p>${escape(VISITOR_TEST_GUIDANCE)}</p>
<p>Record how many groups improved, stayed at the same score or fell, together with the number of groups with both scores. These scores describe exhibit comprehension.</p>
</article>
<h2>Group learning rubric · 100 points</h2>
<p>The four levels guide feedback. Use the original recorded score when reviewing a finalized session.</p>
<div class="cards">${rubric}</div>
<h2>Conclusion and application</h2><p>${escape(CONCLUSION)}</p>
<h2>Paper-based contingency</h2><p>${escape(OFFLINE_GUIDE)}</p>
<h2 id="evidence">How to preserve learning evidence</h2>
${list([
  'Freeze the stage 03 survey and record one choice per group. Keep the date and the number of valid group responses.',
  'Confirm the storyboard is saved at stage 05. Keep V1 at stage 07 before feedback, then save V2 and explain the change at stage 09.',
  'Attach the frozen chart to The Evidence and write an interpretation in English.',
  'Keep the original peer response. Credit the people, tools and sources behind each visual, including any AI-assisted production.',
  'Attach only evidence with verified origin and appropriate permission. Use Competition Dossier to export the available materials and check the 50 MB Part 2 limit.'
])}
</main>
<script>
  let previouslyClosed = [];
  window.addEventListener('beforeprint', () => {
    previouslyClosed = Array.from(document.querySelectorAll('details:not([open])'));
    previouslyClosed.forEach(panel => { panel.open = true; });
  });
  window.addEventListener('afterprint', () => {
    previouslyClosed.forEach(panel => { panel.open = false; });
    previouslyClosed = [];
  });
  document.getElementById('print').addEventListener('click', () => window.print());
</script>
</body></html>
`;
fs.writeFileSync(new URL('../public/museum-lesson-guide.html', import.meta.url), html);
