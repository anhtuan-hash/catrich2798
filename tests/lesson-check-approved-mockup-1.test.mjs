import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=load('src/pages/LessonCheckStudio.jsx');
const skin=load('src/pages/LessonCheckApprovedMockupOne.css');
const mascot=load('public/lesson-check-approved-mascot.svg');

test('approved mockup is isolated from global top navigation and footer',()=>{
  assert.ok(page.includes("import './LessonCheckApprovedMockupOne.css'"));
  assert.match(skin,/\.lcs-page--library\s*\{/);
  assert.doesNotMatch(skin,/(?:\.brian-nav|\.bes-top-chrome|\.app-footer|\.bes-footer|\bbody\s*\{|#root\s*\{)/i);
  assert.match(skin,/\/\* BRIAN Activity Arcade · approved mockup #1/);
});
test('Hero is composed of accessible real text, live stats, and functioning buttons',()=>{
  assert.match(page,/className="lcs-arcade-title-row"/);
  assert.match(page,/Fun<\/span>/);
  assert.match(page,/is-assessment">Assessment/);
  assert.match(page,/\{activities\.length\}/);
  assert.match(page,/\{focusCounts\.grammar\}/);
  assert.match(page,/\{focusCounts\.vocabulary\}/);
  assert.match(page,/\{focusCounts\.skills\}/);
  assert.match(page,/className="lcs-start-assessment"[\s\S]*?setAssessmentWorkspaceView\('session'\)/);
  assert.match(page,/className="lcs-open-reports"[\s\S]*?setAssessmentWorkspaceView\('reports'\)/);
  assert.match(page,/isLeader \? <button className="lcs-arcade-create"[\s\S]*?onClick=\{openNewActivity\}/);
  assert.match(page,/className="lcs-cta-copy"/);
});
test('Old full-bleed raster is replaced with a scalable decorative SVG',()=>{
  assert.match(page,/src="\/lesson-check-approved-mascot\.svg"/);
  assert.ok(!page.includes('src="/lesson-check-hero-fullwidth-v22.webp"'));
  assert.match(mascot,/<svg[^>]+viewBox="0 0 560 400"/);
  assert.match(mascot,/<linearGradient/);
  assert.ok(!mascot.includes('data:image/'));
  assert.match(skin,/\.lcs-page--library \.lcs-hero-art\s*\{/);
  assert.match(skin,/object-fit:contain!important/);
});
test('Gallery keeps actual cards, filters, permissions and data-backed actions',()=>{
  for(const name of ['lcs-arcade-grid','lcs-arcade-tabs','lcs-arcade-filterbar','lcs-arcade-card','lcs-arcade-pagination-controls'])
    assert.ok(page.includes(name),name);
  assert.match(page,/onClick=\{\(\) => removeActivity\(item\)\}/);
  assert.match(page,/onClick=\{\(\) => openTeachingMode\(item\)\}/);
  assert.match(skin,/\.lcs-page--library \.lcs-arcade-grid\s*\{/);
  assert.match(skin,/@media \(max-width:500px\)/);
});

test('Arcade cards have uniform heights regardless of one-line or two-line titles',()=>{
  const region=skin.slice(skin.indexOf('/* 2026-10-12 · Uniform-size Activity Arcade cards.'));
  assert.ok(region.length>500,'uniform card section exists');
  assert.match(region,/\.lcs-page--library \.lcs-arcade-grid\s*\{\s*align-items:stretch!important/);
  assert.match(region,/\.lcs-arcade-grid > \.lcs-arcade-card\s*\{[\s\S]*?display:flex!important[\s\S]*?height:100%!important/);
  assert.match(region,/\.lcs-arcade-grid > \.lcs-arcade-card > \.lcs-arcade-card-copy\s*\{[\s\S]*?height:124px!important[\s\S]*?min-height:124px!important/);
  assert.match(region,/\.lcs-arcade-titlecopy h3\s*\{[\s\S]*?min-height:calc\(2 \* 1\.22em\)!important[\s\S]*?-webkit-line-clamp:2!important/);
  assert.match(region,/\.lcs-arcade-card-copy \.lcs-arcade-card-tags\s*\{[\s\S]*?margin-top:auto!important[\s\S]*?flex-wrap:nowrap!important/);
  assert.doesNotMatch(region,/(?:\.brian-nav|\.bes-top-chrome|\.app-footer|\.bes-footer|\bbody\s*\{|#root\s*\{)/i);
  assert.match(page,/className="lcs-arcade-card-copy"/);
  assert.match(page,/className="lcs-arcade-card-tags"/);
});

test('Teacher granted-access tab filters by the current account and never exposes leader-only requests',()=>{
  assert.match(page,/const grantedCount = useMemo\(\(\) => activities\.filter\(\(item\) => item\.hasAccess === true\)\.length, \[activities\]\)/);
  assert.match(page,/if \(statusFilter === 'ready' && !open\) return false/);
  assert.match(page,/\{!isLeader \? \(\s*<button[\s\S]*?className=\{statusFilter === 'ready' \? 'is-active is-granted' : 'is-granted'\}/);
  assert.match(page,/aria-label=\{isVi \? 'Hoạt động đã được cấp quyền' : 'Activities with granted access'\}/);
  assert.match(page,/setStatusFilter\('ready'\); setShowAccessQueue\(false\)/);
  assert.match(page,/setStatusFilter\('all'\); setShowAccessQueue\(false\)/);
  assert.match(page,/Bạn chưa có hoạt động nào được cấp quyền/);
  assert.match(skin,/\.lcs-page--library \.lcs-arcade-tabs button\.is-granted\.is-active/);
});

test('Lesson Check thumbnail APIs share a Vercel function without breaking legacy endpoints', async()=>{
  const vercel=JSON.parse(load('vercel.json'));
  const alias=vercel.rewrites.findIndex(rule=>rule.source==='/api/lesson-check-thumbnail-upload');
  const catchall=vercel.rewrites.findIndex(rule=>rule.source==='/api/(.*)');
  assert.ok(alias >= 0 && alias < catchall, 'upload rewrite must precede wildcard');
  assert.equal(vercel.rewrites[alias].destination,'/api/lesson-check-thumbnail?mode=upload');

  const {default: handler}=await import('../api/lesson-check-thumbnail.js');
  const validId='12345678-1234-4123-8123-123456789abc';
  const originalFetch=globalThis.fetch;
  const forwarded=[];
  globalThis.fetch=async (url, options)=>{
    forwarded.push({url,options});
    return {status:201,headers:{get:()=> 'application/json'},text:async()=> '{"ok":true}'};
  };
  function invoke({mode,body,authorization='Bearer sample',method='POST'}={}) {
    const response={code:200,headers:{},body:'',status(code){this.code=code;return this;},
      setHeader(key,value){this.headers[key]=value;return this;},
      end(body){this.body=body;return this;}};
    return handler({method,headers:{authorization},body:body||{activityId:validId},query:{mode}},response)
      .then(()=>response);
  }
  try{
    const thumbnail=await invoke();
    assert.equal(thumbnail.code,201);
    assert.match(forwarded[0].url,/\/lesson-check-thumbnail$/);
    assert.deepEqual(JSON.parse(forwarded[0].options.body),{activityId:validId});

    const upload=await invoke({mode:'upload',body:{activityId:validId,action:'remove',dataUrl:''}});
    assert.equal(upload.code,201);
    assert.match(forwarded[1].url,/\/lesson-check-thumbnail-upload$/);
    assert.deepEqual(JSON.parse(forwarded[1].options.body),{activityId:validId,action:'remove',dataUrl:''});

    assert.equal((await invoke({mode:'upload',body:{activityId:validId,action:'invalid'}})).code,400);
    assert.equal((await invoke({authorization:''})).code,401);
    assert.equal((await invoke({method:'GET'})).code,405);
    assert.equal(forwarded.length,2,'rejected requests must not reach Supabase');
  } finally {
    globalThis.fetch=originalFetch;
  }
});

test('Quick activity-name search sits next to Unit/topic filters and is keyboard accessible',()=>{
  const filters=page.slice(page.indexOf('<div className="lcs-arcade-filterbar">'),page.indexOf('<div className="lcs-arcade-results-head">'));
  assert.ok(filters.length>200);
  assert.ok(filters.indexOf('aria-label="Unit"') < filters.indexOf('lcs-filter-quick-search'));
  assert.ok(filters.indexOf('Tất cả chuyên đề') < filters.indexOf('lcs-filter-quick-search'));
  assert.match(filters,/className="lcs-filter-quick-search lcs-search-always-visible" role="search"/);
  assert.match(filters,/aria-label=\{isVi \? 'Tìm nhanh theo tên hoạt động' : 'Quick search by activity name'\}/);
  assert.match(filters,/value=\{query\}/);
  assert.match(filters,/onChange=\{\(event\) => setQuery\(event\.target\.value\)\}/);
  assert.match(filters,/event\.key === 'Escape'\) setQuery\(''\)/);
  assert.match(filters,/aria-label=\{isVi \? 'Xóa từ khóa tìm kiếm' : 'Clear search'\}/);
  const nav=page.slice(page.indexOf('<div className="lcs-arcade-nav">'),page.indexOf('<div className="lcs-arcade-filterbar">'));
  assert.doesNotMatch(nav,/<input value=\{query\}/,'The previous search input should not be duplicated');
});
test('Quick search matches activity titles alone and is accent insensitive',()=>{
  assert.match(page,/const q = normalizeActivityTitle\(query\)/);
  assert.match(page,/return normalizeActivityTitle\(item\.title\)\.includes\(q\)/);
  const start=page.indexOf('function normalizeActivityTitle(');
  const end=page.indexOf('function blankDraft()',start);
  assert.ok(start>0&&end>start);
  const normalize=Function('return ('+page.slice(start,end).trim()+')')();
  assert.equal(normalize('ĐỔI MỚI SÁNG TẠO'),normalize('doi moi sang tao'));
  assert.equal(normalize('  Grammar Breach   '),'grammar breach');
  assert.equal(normalize('Phát minh').includes(normalize('phat')) ,true);
  assert.match(page,/setPage\(1\);\s*\}, \[cefrFilter, durationFilter, deliveryFilter, focusFilter, gradeFilter, query, sortMode, statusFilter, unitFilter\]\)/);
  assert.match(skin,/\.lcs-page--library \.lcs-arcade-filterbar \.lcs-filter-quick-search/);
  assert.match(skin,/@media\(max-width:850px\)/);
});
