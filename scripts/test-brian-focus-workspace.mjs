import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FOCUS_TIMER_PRESETS, formatFocusDuration, remainingFocusMs, focusTimerStoreKey,
} from '../src/components/BrianFocus/useFocusTimer.js';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const check = (name, pass) => { assert.ok(pass,name); console.log('✓ ' + name); };
assert.equal(formatFocusDuration(25*60_000), '25:00');
assert.equal(formatFocusDuration(1_001), '00:02');
assert.equal(formatFocusDuration(0), '00:00');
assert.equal(remainingFocusMs({ running:true, deadline:60_000,remainingMs:1 }, 20_000),40_000);
assert.equal(remainingFocusMs({ running:true, deadline:1_000,remainingMs:60_000 },20_000),0);
assert.equal(remainingFocusMs({ running:false,deadline:100,remainingMs:40_000 },20_000),40_000);
assert.notEqual(focusTimerStoreKey('teacher-1'),focusTimerStoreKey('teacher-2'));
assert.deepEqual([FOCUS_TIMER_PRESETS.pomodoro,FOCUS_TIMER_PRESETS.short,FOCUS_TIMER_PRESETS.long,FOCUS_TIMER_PRESETS.deep], [25,5,15,50]);

const main = read('src/components/BrianFocus/BrianFocus.jsx');
const overlay = read('src/components/BrianFocus/FocusOverlay.jsx');
const workspace = read('src/components/BrianFocus/FocusWorkspace.jsx');
const notes = read('src/components/BrianFocus/FocusNotes.jsx');
const sound = read('src/components/BrianFocus/useFocusSoundscape.js');
const css = read('src/components/BrianFocus/BrianFocusWorkspace.css');
const migration = read('supabase/migrations/20261024125900_brian_focus_private_notes.sql');

check('workspace mounts once within the existing Focus modal',
  overlay.includes('<FocusWorkspace currentUser={currentUser}') &&
  main.includes("import './BrianFocusWorkspace.css'") &&
  main.includes('<FocusOverlay'));
check('no duplicate overlay background renders and scene remains managed',
  overlay.includes('personalDim === null ? scene') && overlay.includes('FocusSceneBackground scene={displayScene}') &&
  overlay.includes('FocusYoutubeBackground scene={displayScene}'));
check('all four real utility actions present', ['timer','notes','soundscape','brightness'].every(id => workspace.includes("id:'"+id+"'")));
check('notes are authenticated and ownership-scoped', notes.includes(".eq('user_id', currentUser.id)") &&
  notes.includes("supabase.from('brian_focus_notes')") &&
  migration.includes('enable row level security') &&
  migration.includes('with check ((select auth.uid())=user_id)'));
check('quiet mode and brightness are personal, not global scene settings',
  workspace.includes("STORAGE_PREFIX + currentUser.id") &&
  workspace.includes("onBrightnessChange?.(next.brightness)") &&
  workspace.includes("onDndChange?.(next.dnd)"));
check('sound is locally synthesized with lifecycle cleanup and browser gesture',sound.includes('createBuffer') &&
  sound.includes('new AudioContextClass()') &&
  sound.includes('await context.resume()') &&
  sound.includes('context.close()'));
check('soundscape and YouTube playback do not compete',
  workspace.includes("addEventListener('bfc-youtube-unmute'") &&
  overlay.includes('soundscapeActive={soundscapeActive}'));
check('mobile docks and sheet defined and no scroll lock for panels',
  css.includes('@media(max-width:850px)') &&
  css.includes('.bfc-tool-panel__content') &&
  css.includes('overscroll-y:auto') === false &&
  css.includes('overflow-y:auto'));
console.log('PASS: Brian Focus 4.0 timer, private notes, utilities, layering and mobile contracts.');
