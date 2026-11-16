import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const invite=read('serverless-handlers/gallery-guest.js');
const auth=read('serverless-handlers/_galleryCreator.js');
const staff=read('serverless-handlers/gallery-staff.js');
const live=read('serverless-handlers/museum-live.js');
const student=read('src/features/immersive-gallery/v3/MuseumLabStudent.jsx');
const studentLive=read('src/features/immersive-gallery/v3/MuseumLiveStudent.jsx');
const teacherLive=read('src/features/immersive-gallery/v3/MuseumLiveTeacher.jsx');
const lessons=read('src/features/immersive-gallery/v3/MuseumLessonFlow.jsx');
const reviews=read('src/features/immersive-gallery/v3/MuseumReview.jsx');
const fullscreenDock=read('src/features/immersive-gallery/v3/MuseumFullscreenDock.jsx');
const videoLab=read('src/features/immersive-gallery/v3/MuseumVideoLab.jsx');
const swissLive=read('src/features/immersive-gallery/v2/screens/TeacherLiveScreen.jsx');
const toolbar=read('src/features/immersive-gallery/v2/controls/TeacherToolbar.jsx');
const migration=read('supabase/migrations/20261114013000_museum_completed_readonly.sql');

function hasAll(source,items,name){
 for(const token of items)assert.ok(source.includes(token),name+' is missing '+token);
}
hasAll(invite,[
 'content_frozen_at','readOnly:ctx.readOnly',
 'assignment.content_frozen_at?now+12*60*60*1000',
 'assignment.content_frozen_at||Date.parse(invite.expires_at)>now',
 '(!assignment.content_frozen_at&&',
 "operation==='logout'","ctx.session.csrf_token"
],'QR and original-passcode sign-in');
assert.ok(!invite.includes("Date.parse(assignment.deadline_at)<=now ||\n      ['rejected','published'].includes(group.state))"),'Published read-only groups must not be rejected');
hasAll(auth,['if(readOnly)throw fail(423',
 '!assignment.content_frozen_at && (!feature.enabled || invite.expires_at<=now)'],
 'guest authentication and denied writes');
hasAll(staff,["'quick-access-setting'","'regenerate-all-passcodes'","'grade-rubric'",
 "'admin-decision'","'archive-review'","'archive-assignment'","'rotate-invite'",
 "'publish'","'archive-exhibition'","content_frozen_at"],
 'staff review, passcode and publication guards');
hasAll(live,["if(!publicRead&&req.method!=='GET'&&assignment.content_frozen_at)",'throw fail(423',
 "'unlock-lesson'","admin.rpc('museum_set_lesson_completion'","p_actor:ctx.user.id"],
 'teacher live server protection');
hasAll(swissLive,["canManageLesson&&(historicalSession||contentFrozenAt)","transport('unlock-lesson'",
 "action:'end'","viewStage:String(browseIndex)"],'Swiss Teacher Live completion');
hasAll(toolbar,["'Kết thúc bài dạy'","'Mở khóa bài dạy'"],'teacher toolbar controls');
hasAll(student,['session.readOnly===true','readOnly={session.readOnly===true}',
 'Completed lesson · View only'],'student readonly display');
hasAll(studentLive,['readOnly=false','if(readOnly||busy||posted||!stageIsOpen||!canRespond)return',
 'disabled={readOnly||busy||posted','View only. Saved answers and exhibits are preserved.'],
 'student live controls');
hasAll(teacherLive,['const readOnly=Boolean(','viewStage:String(browseIndex)',
 "if(action==='next'||action==='previous')","setBrowseIndex(i=>",
 "else if(action==='reveal')setPreviewReveal","readOnly?'ARCHIVED · VIEW ONLY'",
 'onShareToggle={readOnly?null:shareNarration}','Completed lesson · View only'],
 'teacher live read-only playback and mutation guards');
assert.doesNotMatch(teacherLive,/disabled=\{readOnly\|\|busy\|\|currentIndex===0\}/);
hasAll(live,["const viewIndex=reviewOnly",
 "const viewing=reviewOnly",
 "readOnly:reviewOnly",
 "persistedStageIndex:session.stage_index",
 "eq('stage_index',viewIndex)"],
 'authorized GET-only historical browsing');
hasAll(fullscreenDock,['readOnly=false','(!readOnly&&ended)','disabled={readOnly||busy||ended}',
 "if(readOnly||!session.revealed)onAction('reveal')"],
 'fullscreen navigation and disabled write controls');
hasAll(videoLab,['readOnly=false','if(readOnly||busy)return;',
 'teacher&&readOnly','Watch NASA clip','teacher&&!readOnly'],
 'YouTube video playback without editing assigned videos');
hasAll(lessons,['const frozen=Boolean(a.content_frozen_at)',
 'disabled={frozen||busy||passcodeBusy}','disabled={busy||frozen}',
 'FINAL · VIEW ONLY'],'lesson admin controls');
hasAll(reviews,['const frozen=Boolean(assignment?.content_frozen_at)',
 'const canTeach=selected&&isAdmin&&!frozen','const canReview=selected&&isAdmin&&!frozen'],
 'rubric and moderation controls');
hasAll(migration,['ADD COLUMN IF NOT EXISTS content_frozen_at',
 'CREATE OR REPLACE FUNCTION public.museum_block_frozen_changes()',
 'CREATE TRIGGER museum_completed_readonly',
 "'museum-artwork-private'","'brian-gallery-private'",
 'museum_publication_asset_links','gallery_exhibits','gcp_drafts'],
 'database immutable-content guard');
assert.ok(!migration.includes('a68f848c-903c-4947-aa3b-da48222c8828'),
 'Migration must only install reusable guards, never freeze a lesson implicitly.');
console.log('PASS: Read-only lesson retains QR/private-passcode login, private media previews, logout and export, while client/server/DB block writes.');
