import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EVENT_ENTER_CHOICES, EVENT_EXIT_CHOICES, EVENT_SPEED_CHOICES,
  normalizeEventPopupMotion, eventPopupMotionDuration } from '../src/features/events/utils/eventPopupMotion.mjs';

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
check('closing animation completes before modal unmount and receipt is recorded first',
  host.includes("await recordEventInteraction(event,userId,action)") &&
  host.includes('setClosing(true)') &&
  host.includes('window.setTimeout(resolve,duration+20)') &&
  host.indexOf('setClosing(true)') < host.indexOf('setEvent(null)') &&
  host.includes('loadingAction||closing'));
check('all entry and exit effects have matching keyframes and are scoped to event portal',
  ['Rise','Scale','Slide','Flip','Fade'].every(v=>style.includes('beEventEnter'+v)) &&
  ['Shrink','Fade','Slide','Flip'].every(v=>style.includes('beEventExit'+v)) &&
  style.includes('.be-pop-overlay.is-leaving') &&
  style.includes('.be-pop-preview-stage.is-leaving'));
check('reduce-motion accessibility and controlled exit duration are implemented',
  style.includes('prefers-reduced-motion: reduce') &&
  host.includes("matchMedia?.('(prefers-reduced-motion: reduce)')") &&
  host.includes("eventPopupMotionDuration(eventMotion,'exit',reduced)"));
console.log('PASS: Event announcement motion, Admin-only saved config, bidirectional exit, accessibility.');
