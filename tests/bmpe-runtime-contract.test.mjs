// BMPE Wave 3/4 — factual source and pure-JS runtime contract tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { summarizeFrameIntervals } from '../src/performance/motionDiagnostics.js';

const read = (file) => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('frame diagnostic provides honest local, non-certified statistics', () => {
  const result = summarizeFrameIntervals([16,16.8,17,32,33,18],3000,[54,62],{routeGroup:'dashboard',longTaskSupported:true});
  assert.equal(result.certifiedFps,false);
  assert.equal(result.webVitalsCertified,false);
  assert.equal(result.visibleFrameSamples,6);
  assert.equal(result.longTaskCount,2);
  assert.equal(result.longTaskTotalMs,116);
  assert.equal(result.routeGroup,'dashboard');
  assert.ok(result.frameIntervalP95Ms>=result.frameIntervalP50Ms);
  assert.ok(result.missedFramesApprox>=0);
  assert.equal(Object.prototype.hasOwnProperty.call(result,'url'),false);
});

test('capturing frames is opt-in and always releases observers', () => {
  const source=read('src/performance/motionDiagnostics.js');
  assert.match(source,/export function startMotionDiagnosticCapture/);
  assert.match(source,/cancelAnimationFrame/);
  assert.match(source,/longTaskObserver\?\.disconnect\(\)/);
  assert.match(source,/removeEventListener\('visibilitychange'/);
  assert.doesNotMatch(source,/fetch\(|sendBeacon\(|localStorage|sessionStorage/);
  assert.doesNotMatch(source,/currentUser|studentName|studentId|emailAddress|location\.href/);
});

test('official v6 Core Web Vitals replace old approximate INP', () => {
  const source=read('src/utils/webVitals.js');
  const readiness=read('src/utils/platformReadiness.js');
  const pkg=JSON.parse(read('package.json'));
  const lock=JSON.parse(read('package-lock.json'));
  assert.equal(pkg.dependencies['web-vitals'],'6.2.3');
  assert.equal(lock.packages['node_modules/web-vitals'].version,'6.2.3');
  assert.equal(lock.packages[''].dependencies['web-vitals'],'6.2.3');
  assert.match(source,/import\('web-vitals'\)/);
  assert.match(source,/onLCP\(record\('lcp'\)/);
  assert.match(source,/onCLS\(record\('cls'\)/);
  assert.match(source,/onINP\(record\('inp'\)/);
  assert.doesNotMatch(source,/Math\.max\(metrics\.inp/);
  assert.doesNotMatch(source,/observe\('event'/);
  assert.match(readiness,/Single-page observation; not p75/);
});

test('only Admin Motion settings can lazy-mount the diagnostic monitor', () => {
  const settings=read('src/pages/Settings.jsx');
  const monitor=read('src/components/admin/BrianPerformanceMonitor.jsx');
  assert.match(settings,/const BrianPerformanceMonitor = lazy/);
  assert.match(settings,/appearanceTab === 'motion'/);
  assert.match(settings,/GlobalMotionAdminPanel[\s\S]{0,450}BrianPerformanceMonitor/);
  assert.match(settings,/\['admin','administrator'\]/);
  assert.match(monitor,/startMotionDiagnosticCapture/);
  assert.match(monitor,/onClick=\{start\}/);
  assert.match(monitor,/onClick=\{stop\}/);
  assert.match(monitor,/mounted\.current = false/);
  assert.doesNotMatch(monitor,/fetch\(|sendBeacon\(/);
});

test('dynamic motion observer ignores unrelated leaf nodes but retains real entrants', () => {
  const runtime=read('src/utils/globalMotionSystem.js');
  assert.match(runtime,/const MOTION_ENTRANT_SELECTOR/);
  assert.match(runtime,/function containsMotionEntrant\(/);
  assert.match(runtime,/if \(containsMotionEntrant\(node\)\) pending\.add\(node\)/);
  assert.match(runtime,/const LIST_SELECTOR/);
});
