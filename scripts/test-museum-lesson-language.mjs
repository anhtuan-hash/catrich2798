import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {ASEAN_ACTIVITY_DESIGN} from '../src/features/immersive-gallery/v3/aseanActivityDesign.js';
import {getAseanPaperPlan} from '../src/features/immersive-gallery/v3/aseanPaperPlan.js';
import {ASEAN_STAGES, ASEAN_TEMPLATE, aseanPhase} from '../src/features/immersive-gallery/v3/aseanLesson.js';

const server = await createServer({
  configFile: false,
  optimizeDeps: {noDiscovery: true, include: []},
  server: {middlewareMode: true, hmr: false, watch: null},
});
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const load = async path => (await server.ssrLoadModule('/src/features/immersive-gallery/' + path)).default;
const noop = () => {};

try {
  const TeacherLiveStage = await load('v2/controls/TeacherLiveStage.jsx');
  const TeachingPlan = await load('v2/screens/TeachingPlanScreen.jsx');
  const StudentLesson = await load('v3/AseanStudentLesson.jsx');
  const content = [
    /<h2 class="asean-slide-heading">.*?<\/h2>/s,
    /<ol class="asean-slide-student-actions">.*?<\/ol>/s,
    /<ol class="asean-slide-timing".*?<\/ol>/s,
    /<div class="asean-slide-output">.*?<\/div>/s,
  ];

  ASEAN_STAGES.forEach((stage, currentIndex) => {
    const props = {stage, currentIndex, onAssignment: noop, onAseanJoin: noop, revealed: true};
    const vi = render(TeacherLiveStage, {...props, language: 'vi'});
    const en = render(TeacherLiveStage, {...props, language: 'en'});
    for (const selector of content) {
      assert.match(vi, selector);
      assert.equal(vi.match(selector)[0], en.match(selector)?.[0]);
    }
    assert.ok(vi.includes(aseanPhase(currentIndex).en));
    assert.ok(!vi.includes(ASEAN_ACTIVITY_DESIGN[currentIndex].title[0]));
    assert.match(vi, /Hướng dẫn chi tiết cho học sinh/);
    assert.match(en, /Student instructions/);
    if (currentIndex === 0) {
      assert.match(vi, /What does a visitor need to know\?/);
      assert.match(vi, /Where is it\?/);
      assert.match(vi, /Write and submit two sentences from your card/);
      assert.match(vi, /Trắc nghiệm thảo luận/);
    }
  });

  for (const language of ['vi', 'en']) {
    const vi = language === 'vi';
    const plan = render(TeachingPlan, {lessonTemplate: ASEAN_TEMPLATE, language, onBack: noop});
    assert.match(plan, /I\. Learning Objectives/);
    assert.match(plan, /Period 1 · 45 minutes/);
    assert.ok(plan.includes(vi ? 'Quay lại' : 'Back'));
    assert.ok(plan.includes(getAseanPaperPlan(language).href));
    assert.ok(!plan.includes(getAseanPaperPlan(vi ? 'en' : 'vi').href));

    const student = render(StudentLesson, {
      language,
      publicWorkshop: {},
      session: {groupLabel: 'Group 1', readOnly: true, assignment: {lesson_template: ASEAN_TEMPLATE}},
    });
    assert.match(student, /What would you tell a friend visiting for the first time\?/);
    assert.match(student, /Which visitor question still needs a clearer answer\?/);
    assert.ok(student.includes(vi ? 'Đến phần trắc nghiệm' : 'Go to the quiz'));
  }

  console.log('PASS: ASEAN lesson content stays English while VI/EN controls switch.');
} finally {
  await server.close();
}
