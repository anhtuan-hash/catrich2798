import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EVENT_ENTER_CHOICES, EVENT_EXIT_CHOICES, EVENT_SPEED_CHOICES,
  normalizeEventPopupMotion, eventPopupMotionDuration, eventPopupMotionFrames, playEventPopupMotion } from '../src/features/events/utils/eventPopupMotion.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const config=read('src/utils/globalMotionSystem.js');
const admin=read('src/components/admin/GlobalMotionAdminPanel.jsx');
const settings=read('src/pages/Settings.jsx');
const host=read('src/features/events/dashboard/EventPopupHost.jsx');
const style=read('src/features/events/dashboard/EventPopupMotion.css');
const panel=read('src/components/admin/EventPopupMotionAdmin.jsx');
const sql=read('supabase/brian_global_motion_settings.sql');
const check=(label,ok)=>{assert.ok(ok,label);console.log('✓ '+label)};

assert.deepEqual(normalizeEventPopupMotion(null),{enter:'rise',exit:'shrink',speed:'balanced'});
assert.deepEqual(normalizeEventPopupMotion({enter:'invalid',exit:'random',speed:'slow'}),{enter:'rise',exit:'shrink',speed:'balanced'});
for(const {id} of EVENT_ENTER_CHOICES) assert.equal(normalizeEventPopupMotion({enter:id}).enter,id);
for(const {id} of EVENT_EXIT_CHOICES) assert.equal(normalizeEventPopupMotion({exit:id}).exit,id);
for(const {id} of EVENT_SPEED_CHOICES) {
  const m=normalizeEventPopupMotion({speed:id});
  assert.ok(eventPopupMotionDuration(m,'enter')>=eventPopupMotionDuration(m,'exit'));
}
assert.equal(eventPopupMotionDuration({},'exit',true),0);
assert.equal(eventPopupMotionDuration({exit:'none'},'exit'),0);
check('event-specific config uses existing normalized server-synced global JSON',
  config.includes('normalizeEventPopupMotion(source.eventPopup)') &&
  config.includes("SETTINGS_TABLE = 'brian_global_motion_settings'") &&
  config.includes("window.dispatchEvent(new CustomEvent(GLOBAL_EVENT"));
check('publish endpoint is protected by Admin-only Supabase RLS for insert and update',
  sql.includes('Admins can update global motion settings') &&
  sql.includes('Admins can insert global motion settings') &&
  sql.includes("('admin', 'administrator')"));
check('Admin Settings hides Motion editor from teacher and department leader',
  settings.includes("['motion', vi ? 'Hiệu ứng' : 'Motion']") &&
  settings.includes("['admin','administrator'].includes(String(currentUser?.role"));
check('Event transition controls only mounted in authenticated Admin Motion panel',
  admin.includes('EventPopupMotionAdmin') &&
  admin.includes('<EventPopupMotionAdmin value={draft.eventPopup}') &&
  panel.includes('onChange(next)') &&
  panel.includes('eventPopupMotionDuration'));
check('existing global quick presets preserve event-only settings',
  admin.includes('eventPopup: draft.eventPopup'));
check('popup listens to published motion config and is independent of generic modal slot',
  host.includes('GLOBAL_MOTION_EVENT') &&
  host.includes("getGlobalMotionConfig().eventPopup") &&
  host.includes('data-global-motion-isolate="true"'));
check('real popup animates entrance and exit with shared native timeline',
  host.includes("await recordEventInteraction(event,userId,action)") &&
  host.includes("playEventPopupMotion(dialogRef.current,eventMotion,'enter')") &&
  host.includes("playEventPopupMotion(dialogRef.current,eventMotion,'exit')") &&
  host.includes('await leaving.finished') &&
  host.indexOf('await leaving.finished') < host.indexOf('setEvent(null)') &&
  host.includes('loadingAction||closing') &&
  host.includes('data-event-driven="true"'));
check('all entry and exit effects have matching keyframes and are scoped to event portal',
  ['Rise','Scale','Slide','Flip','Fade'].every(v=>style.includes('beEventEnter'+v)) &&
  ['Shrink','Fade','Slide','Flip'].every(v=>style.includes('beEventExit'+v)) &&
  style.includes('.be-pop-overlay.is-leaving') &&
  style.includes('.be-pop-preview-stage.is-leaving'));
check('preview always runs same native timeline as live event and supports full-size popup',
  panel.includes("playEventPopupMotion(card,nextMotion,current)") &&
  panel.includes("playEventPopupMotion(dialogRef.current,motion,'enter')") &&
  panel.includes("playEventPopupMotion(dialogRef.current,motion,'exit')") &&
  panel.includes('ActualEventPreview') &&
  panel.includes("replay('both')") &&
  panel.includes("replay('enter')") &&
  panel.includes("replay('exit')") &&
  panel.includes('IntersectionObserver'));
check('reduced motion and CSS isolation do not break native animation runtime',
  style.includes('prefers-reduced-motion: reduce') &&
  style.includes('[data-event-driven="true"]') &&
  style.includes('animation: none !important') &&
  eventPopupMotionDuration({},'enter',true) === 0);
for(const {id} of EVENT_ENTER_CHOICES) {
  const frames=eventPopupMotionFrames({enter:id},'enter');
  assert.equal(id==='none'?frames.length===0:frames.length===2,true);
}
for(const {id} of EVENT_EXIT_CHOICES) {
  const frames=eventPopupMotionFrames({exit:id},'exit');
  assert.equal(id==='none'?frames.length===0:frames.length===2,true);
}
const nothing=playEventPopupMotion(null,{},'enter');
assert.equal(nothing.duration,0);
await nothing.finished;
console.log('PASS: Event announcement motion, Admin-only saved config, bidirectional exit, accessibility.');
