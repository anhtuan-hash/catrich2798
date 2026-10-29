import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeAudienceScreenUrl,DEFAULT_HALLOWEEN_SCREEN,HALLOWEEN_ALBUM_ID} from '../src/utils/photoAudienceScreen.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/PhotoSlideshow.jsx');
const audience=read('src/components/PhotoAudienceLive.jsx');
const css=read('src/components/PhotoAudienceLive.css');
const sql=read('supabase/migrations/20261030061500_photo_story_audience_screen_url.sql');
const valid=[
 'https://qrvote.org/c/halloween-showcase-ry29/screen',
 'https://qrvote.org/c/halloween-showcase-ry29',
 'qrvote.org/c/halloween-showcase-ry29/screen',
 'https://www.qrvote.org/c/halloween-showcase-ry29/screen'
];
for(const link of valid)assert.equal(normalizeAudienceScreenUrl(link),DEFAULT_HALLOWEEN_SCREEN);
for(const invalid of [
  'javascript:alert(1)',
  'https://evil.example/c/halloween-showcase-ry29/screen',
  'https://qrvote.org.evil.example/c/test/screen',
  'http://qrvote.org/c/test/screen',
  'https://qrvote.org/login',
  'https://qrvote.org@evil.example/c/test/screen',
  'https://qrvote.org:1234/c/test/screen',
  '',
])assert.throws(()=>normalizeAudienceScreenUrl(invalid),Error);
assert.match(page,/selected\.id === HALLOWEEN_ALBUM_ID/,'use real album ID instead of mistyped slug');
assert.ok(page.includes('audienceEnabled &&') && page.includes('<PhotoAudienceLive'),'viewer shows frame');
assert.ok(page.includes('canEdit={editorAllowed && isAdminRole(currentUser?.role)}'),'only admin sees edit controls');
assert.ok(audience.includes("from('bes_slideshow_albums')") && audience.includes('.update({audience_screen_url:normalized'),'saved for whole album');
assert.ok(audience.includes('onSaved?.()'),'update album data after save');
assert.ok(audience.includes('ref={viewportRef}') && audience.includes('<iframe') && audience.includes('src={currentUrl}'),'uses real iframe and saved url');
assert.ok(audience.includes('<form className="bss-audience-config"')&&audience.includes('Lưu & hiển thị'),'inline paste and save UI');
assert.ok(audience.includes('if(!canEdit||saving||!albumId)return'),'server save cannot be triggered in guest UI');
assert.ok(audience.includes('Nếu khung trắng hoặc bị chặn'),'honest fallback if QRvote refuses framing');
assert.ok(css.includes('.bss-audience-config-row'),'inline input styled');
assert.ok(sql.includes('add column if not exists audience_screen_url'),'non destructive persisted column');
assert.ok(sql.includes(HALLOWEEN_ALBUM_ID),'migration targets exact album UUID');
assert.ok(sql.includes('qrvote[.]org'),'database validates qrvote URLs');
assert.ok(!/drop table|delete from public\.bes_slideshow/i.test(sql),'no destructive changes');
console.log('BRIAN Photo Story audience paste-and-save URL QA PASS');
