import { LIVE_STAGES } from './liveLesson.js';
import { NEXT_DELIVERY_STAGES } from './museumActivitySlides.js';
import { MUSEUM_CURRICULUM_VIDEOS } from './museumLiveExtensions.js';

export function presentationFor(stageIndex, saved) {
  const initial = { view: MUSEUM_CURRICULUM_VIDEOS[stageIndex] ? 'video' : 'task', questionIndex: 0 };
  return saved?.stageIndex === stageIndex ? { view: saved.view, questionIndex: saved.questionIndex } : initial;
}

export function validPresentation(stageIndex, stage, view, questionIndex) {
  if (!stage || !LIVE_STAGES[stageIndex]) return false;
  const views = ['task'];
  if (stage.id === 'climate-detective') views.push('vote');
  if (NEXT_DELIVERY_STAGES.includes(stage.id)) views.push('next');
  if (MUSEUM_CURRICULUM_VIDEOS[stageIndex]) views.push('video', 'check');
  const questions = stage.questions ?? stage.videoQuestions;
  return views.includes(view) && Number.isInteger(questionIndex) && questionIndex >= 0
    && (view === 'check' ? questionIndex < (questions?.length ?? 0) : questionIndex === 0);
}

export function liveReadAudience(req, op) {
  if (String(req.headers?.authorization || '').startsWith('Bearer ')) return 'staff';
  const publicOperations = ['state', 'evidence', 'checkpoint-compare', 'group-gallery'];
  return req.method === 'GET' && req.headers?.['x-museum-public'] === '1' && publicOperations.includes(op)
    ? 'public' : 'guest';
}

export function responseMatchesActivity(body, session) {
  // Older loaded tabs may not send activity identity yet.
  return (body.sessionId === undefined || body.sessionId === session.id)
    && (body.stageIndex === undefined || body.stageIndex === session.stage_index);
}
