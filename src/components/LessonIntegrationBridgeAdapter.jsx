import { useEffect } from 'react';
import { createTransfer } from '../utils/contentTransfer.js';

const TARGETS = {
  lesson: 'lesson-plan-ai',
  worksheet: 'worksheet-factory',
  exam: 'exam-studio',
  activity: 'textlab-activities',
  speaking: 'speaking-studio',
  reading: 'reading-studio',
  wordgraph: 'word2graph',
};

function payloadToText(payload) {
  const lesson = payload?.lesson || {};
  const sections = Array.isArray(payload?.sections) ? payload.sections : [];
  const integrations = Array.isArray(payload?.acceptedIntegrations) ? payload.acceptedIntegrations : [];
  const resources = Array.isArray(payload?.resources) ? payload.resources : [];
  const output = [
    'ENGLISH LESSON INTEGRATION PACKAGE',
    '',
    `Grade: ${lesson.grade || ''}`,
    `Book: ${lesson.book || ''}`,
    `Unit: ${lesson.unit || ''}`,
    `Lesson: ${lesson.lesson || ''}`,
    `Title: ${lesson.title || ''}`,
    `Lesson type: ${lesson.lessonType || ''}`,
    `CEFR: ${lesson.cefr || ''}`,
    '',
    'LESSON SECTIONS',
  ];
  sections.forEach((section) => output.push('', String(section.title || 'Lesson section').toUpperCase(), String(section.content || '')));
  if (integrations.length) {
    output.push('', 'ACCEPTED INTEGRATIONS');
    integrations.forEach((item, index) => output.push(
      '', `${index + 1}. ${item.title || item.type || 'Integration'}`,
      item.sectionTitle ? `Section: ${item.sectionTitle}` : '',
      item.frameworkCode ? `Framework: ${item.frameworkCode}` : '',
      item.expectedProduct ? `Expected product: ${item.expectedProduct}` : '',
      item.assessmentEvidence ? `Assessment evidence: ${item.assessmentEvidence}` : '',
      item.safetyNote ? `Safety: ${item.safetyNote}` : '',
      String(item.content || ''),
    ));
  }
  if (resources.length) {
    output.push('', 'GENERATED RESOURCES');
    resources.forEach((resource, index) => output.push('', `${index + 1}. ${resource.title || resource.type || 'Resource'}`, String(resource.content || '')));
  }
  return output.filter((line) => line !== null && line !== undefined).join('\n').slice(0, 180000);
}

export default function LessonIntegrationBridgeAdapter({ currentUser }) {
  useEffect(() => {
    if (!currentUser) return undefined;
    const receive = (event) => {
      const payload = event?.detail;
      if (payload?.schema !== 'brian-studio-transfer/2.1' || !payload?.transferId) return;
      const target = TARGETS[payload.target];
      if (!target) return;
      createTransfer(currentUser, {
        id: payload.transferId,
        type: payload.payloadType || 'lesson-integration',
        title: payload?.lesson?.title || payload?.lesson?.lesson || 'Integrated English lesson',
        sourceApp: 'english-lesson-integration',
        sourceTitle: 'AI Lesson Integration Studio',
        target,
        content: payloadToText(payload),
        metadata: {
          schema: payload.schema,
          structuredPayload: payload,
          sourceVersion: payload.sourceVersion || '',
        },
      });
    };
    window.addEventListener('bes-elis-bridge-payload', receive);
    try {
      const pending = JSON.parse(window.sessionStorage.getItem('bes-elis-latest-transfer') || 'null');
      if (pending) receive({ detail: pending });
    } catch { /* optional */ }
    return () => window.removeEventListener('bes-elis-bridge-payload', receive);
  }, [currentUser?.id, currentUser?.email]);
  return null;
}
