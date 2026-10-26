import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BUILTIN_POSTER_TEMPLATES, POSTER_GROUPS, choosePosterTemplate,
  posterTemplatePath, decodePosterTemplatePath,
} from '../src/features/events/utils/posterTemplateRules.mjs';

const select=(title,category)=>choosePosterTemplate({title,category});
assert.equal(POSTER_GROUPS.length,7);
assert.equal(BUILTIN_POSTER_TEMPLATES.length,7);
assert.equal(select('Sinh hoạt chuyên đề Halloween lớp 11','Sinh hoạt chuyên đề').group,'halloween');
assert.equal(select('Họp TTCM triển khai công tác tháng 11','Họp tổ chuyên môn').group,'meeting');
assert.equal(select('Thao giảng tiếng Anh lớp 11.3','Thao giảng').group,'teaching');
assert.equal(select('Hội thảo phát triển chuyên môn','Hội thảo / tập huấn').group,'training');
assert.equal(select('Sinh hoạt chuyên đề môn tiếng Anh','Sinh hoạt chuyên đề').group,'seminar');
assert.equal(select('Ngày hội học sinh','Ngoại khóa').group,'extracurricular');
assert.equal(select('Nội dung chưa phân loại','Khác').group,'general');
const upload={id:'custom-halloween',name:'Moonlit',group:'halloween',tone:'dark',side:'left',source:'uploaded'};
assert.equal(choosePosterTemplate({title:'Halloween',category:'Sinh hoạt chuyên đề'},[...BUILTIN_POSTER_TEMPLATES,upload]).id,upload.id);
assert.equal(choosePosterTemplate({title:'Họp hội đồng',category:'Họp tổ chuyên môn'},[...BUILTIN_POSTER_TEMPLATES,upload],upload.id).id,upload.id);
assert.equal(choosePosterTemplate({title:'Unknown',category:'Other'},[]),null);

const path=posterTemplatePath({name:'Mẫu Halloween Ánh trăng',group:'halloween',tone:'dark',side:'right',stamp:'abc123',extension:'webp'});
assert.equal(path,'templates/halloween/mau-halloween-anh-trang--dark--right--abc123.webp');
const parsed=decodePosterTemplatePath(path);
assert.equal(parsed?.group,'halloween');
assert.equal(parsed?.source,'uploaded');
assert.equal(parsed?.side,'right');
assert.equal(decodePosterTemplatePath('other/photos/private.png'),null);
assert.equal(decodePosterTemplatePath('templates/../../escape.png'),null);
assert.throws(()=>posterTemplatePath({name:'bad',group:'../../secret'}),/Invalid poster category/);
assert.throws(()=>posterTemplatePath({name:'bad',group:'general',extension:'svg'}),/Unsupported/);

// Static cross-module safety: uploaded template is rendered, not substituted
// for a published event poster. Poster creation stays draft-only.
const service=fs.readFileSync('src/features/events/services/eventPosterTemplates.js','utf8');
const drafts=fs.readFileSync('src/features/events/services/scheduleEventDrafts.js','utf8');
const manager=fs.readFileSync('src/features/events/admin/EventManagerPage.jsx','utf8');
assert.match(service,/event.status!=='draft'/);
assert.match(service,/if\(event.poster_path\)return/);
assert.match(service,/uploadEventPoster\(event.id,file\)/);
assert.match(drafts,/autoAttachPosterToDraft\(record\)/);
assert.match(manager,/EventPosterTemplatePanel/);
assert.doesNotMatch(service,/bes_publish_event|bes_event_recipients/);
const canvas=fs.readFileSync('src/features/events/services/posterCanvasRenderer.js','utf8');
assert.match(canvas,/canvas.width=W;canvas.height=H/);
assert.match(canvas,/canvas.toBlob/);
console.log('Event poster templates: seven classifications, user overrides, safe paths, draft-only attachment passed.');
