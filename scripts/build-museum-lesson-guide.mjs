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
  const number = index + 1;
  return `<details class="stage" id="stage-${number}"${index === 0 ? ' open' : ''}>
<summary>
  <span class="stage-number">${String(number).padStart(2, '0')}</span>
  <span class="stage-label"><strong>${escape(stage.title)}</strong><small>${escape(note.phase)}</small></span>
  <span class="stage-time">${stage.minutes} min</span>
</summary>
<div class="stage-body">
<p class="stage-question">${escape(stage.question)}</p><p class="sentence">${escape(stage.sentence)}</p>
<p>${escape(note.task)}</p>${note.extension ? `<p><strong>Next delivery:</strong> ${escape(note.extension)}</p>` : ''}
${videoResources}${quiz}
</div>
</details>`;
};
const stages = LIVE_PERIOD_MINUTES.map((minutes, index) => {
  const period = index + 1;
  return `<section class="period" aria-labelledby="period-${period}">
<h3 id="period-${period}"><span>Period ${period}</span><small>${minutes} minutes</small></h3>
${LIVE_STAGES.map((stage, stageIndex) => stage.period === period ? stageCard(stage, stageIndex) : '').filter(Boolean).join('\n')}
</section>`;
}).join('\n');
const cards = LESSON_RESOURCES.map(card => `<article><h3>${escape(card.title)}</h3><p>${escape(card.text)}</p>
<p><strong>${escape(card.task)}</strong></p><small>${card.url ? link(card.url, card.source) : escape(card.source)}</small></article>`).join('\n');
const rubric = RUBRIC.map(criterion => `<tr><th scope="row">${escape(criterion.en)}</th>
<td class="rubric-score">${criterion.max}</td><td>${list(LESSON_RUBRIC_LEVELS[criterion.key])}</td></tr>`).join('\n');

const css = fs.readFileSync(new URL('./museum-lesson-guide.css', import.meta.url), 'utf8');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BRIAN · Our Climate Action Museum · Lesson guide</title>
<style>
${css.trimEnd()}
</style>
</head>
<body>
<div class="guide">
<header class="masthead">
  <div class="brand">Brian English<br>Teaching Guide</div>
  <p>English 11 / Global Success / Unit 5</p>
</header>
<nav aria-label="Lesson guide"><ul>
<li><a href="#sequence">Lesson sequence</a></li><li><a href="#materials">Learning materials</a></li>
<li><a href="#assessment">Assessment</a></li><li><a href="#evidence">Learning evidence</a></li>
</ul></nav>
<main>
<header class="hero">
  <div class="hero-copy">
    <h1><span>Our Climate</span> <span>Action</span> <span>Museum</span></h1>
    <p class="challenge">${escape(LESSON_KITS[0].challenge)}</p>
    <p class="hero-meta"><strong>${LIVE_PERIOD_MINUTES.length} periods × ${LIVE_PERIOD_MINUTES[0]} minutes</strong><strong>${LIVE_STAGES.length} activities</strong></p>
    <p class="audience">Teaching guide for English teachers and competition reviewers.</p>
    <div class="hero-actions">
      <button class="button button-primary" type="button" id="print">Print / Save as PDF</button>
      <a class="button" href="/#/tool/immersive-gallery">Open Museum Lab</a>
      <a class="button" href="${OFFLINE_LESSON_WORKSHEET}" download="Our_Climate_Action_Museum_Hoc_lieu.html">Download offline worksheet</a>
    </div>
  </div>
  <img class="hero-art" src="/museum/branding/lesson-guide-editorial.webp" width="960" height="960" alt="">
</header>
<section class="objectives" aria-labelledby="objectives">
<h2 id="objectives">Objectives and learning products</h2>
<ul>
<li>Listen for key ideas and details in two NASA videos. Aim for two correct answers out of three per video or explain a correction using a detail from the clip.</li>
<li>Read a scientific source and a classroom chart. Explain what each source can support.</li>
<li>Write three English labels of about 25–40 words each. Include a named source, x/N and percentage, a limit on the survey and a practical action.</li>
<li>Prepare a 45–60-second pitch. Two or three groups present and answer a visitor’s question.</li>
</ul>
</section>
<p class="note">The published classroom session is a record of the completed lesson. The individual writing checks and the three-question V1/V2 comparison below are tools for a new delivery. Judge recorded classroom evidence using the original work from that session.</p>
<div class="lesson-grid">
<section aria-labelledby="sequence">
<h2 id="sequence">${LIVE_TOTAL_MINUTES}-minute lesson sequence</h2>
${stages}
</section>
<div class="editorial-rail">
<section aria-labelledby="materials">
<h2 id="materials">Learning materials and tasks</h2>
<div class="materials">${cards}</div>
</section>
<section class="worksheet" aria-labelledby="worksheet">
<h2 id="worksheet">Group worksheet</h2>
<p>Roles: English editor · Data checker · Artwork designer · Presenter</p>
<p>Problem and audience: ____________________</p>
<p>Scientific finding and source: ____________________</p>
<p>Group-priority survey: ____ out of ____ groups (____%) · Date: ____ · Limit: ____</p>
<p>Option A: ____ · Option B: ____ · Compare clarity, feasibility and whether the source can be found.</p>
<p>Solution: ____ · Who acts? ____ · When? ____ · What can we track? ____</p>
<p>Image creator / method / usage rights / alt text: ____________________</p>
<p>Peer group: ____ · I learned ____ · Please clarify ____ · Clarity 1–4: ____</p>
<p>V1: ____ · V2: ____ · We changed ____ because ____ .</p>
</section>
</div>
</div>
<div class="assessment-grid">
<section class="assessment" aria-labelledby="assessment">
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
</section>
<section class="editorial-rail" aria-labelledby="rubric">
<h2 id="rubric">Group learning rubric · 100 points</h2>
<p>The four levels guide feedback. Use the original recorded score when reviewing a finalized session.</p>
<table class="rubric" aria-labelledby="rubric">
<thead><tr><th scope="col">Criterion</th><th scope="col">Max</th><th scope="col">Performance levels</th></tr></thead>
<tbody>${rubric}</tbody>
</table>
</section>
</div>
<div class="closing-grid">
<section><h2>Conclusion and application</h2><p>${escape(CONCLUSION)}</p></section>
<section><h2>Paper-based contingency</h2><p>${escape(OFFLINE_GUIDE)}</p></section>
<section aria-labelledby="evidence">
<h2 id="evidence">How to preserve learning evidence</h2>
${list([
  'Freeze the stage 03 survey and record one choice per group. Keep the date and the number of valid group responses.',
  'Confirm the storyboard is saved at stage 05. Keep V1 at stage 07 before feedback, then save V2 and explain the change at stage 09.',
  'Attach the frozen chart to The Evidence and write an interpretation in English.',
  'Keep the original peer response. Credit the people, tools and sources behind each visual, including any AI-assisted production.',
  'Attach only evidence with verified origin and appropriate permission. Use Competition Dossier to export the available materials and check the 50 MB Part 2 limit.'
])}
</section>
</div>
</main>
</div>
<script>
  let previouslyClosed = null;
  window.addEventListener('beforeprint', () => {
    if (previouslyClosed) return;
    previouslyClosed = Array.from(document.querySelectorAll('details:not([open])'));
    previouslyClosed.forEach(panel => { panel.open = true; });
  });
  window.addEventListener('afterprint', () => {
    previouslyClosed?.forEach(panel => { panel.open = false; });
    previouslyClosed = null;
  });
  document.getElementById('print').addEventListener('click', () => window.print());
</script>
</body></html>
`;
fs.writeFileSync(new URL('../public/museum-lesson-guide.html', import.meta.url), html);
