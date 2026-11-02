import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';

const source = readFileSync('src/utils/dashboardScrapbookTheme.js', 'utf8')
  .replace(/^import .*;\n/gm, '').replace(/export /g, '');
const row = (enabled, day = 2) => ({ dashboard_scrapbook_enabled: enabled, updated_at: `2026-11-0${day}T08:00:00Z` });
function harness(cached = null) {
  let serverRow = row(false), error = null, read = null, response = null, realtime;
  let requests = 0, subscriptions = 0, cleanups = 0;
  const timers = new Set(), unsubs = [], storage = new Map();
  if (cached) storage.set('bes-dashboard-scrapbook-v1', JSON.stringify(cached));
  const window = new EventTarget(), document = new EventTarget();
  document.hidden = false;
  window.localStorage = { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) };
  window.setInterval = fn => { timers.add(fn); return fn; };
  window.clearInterval = fn => timers.delete(fn);
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => {
      requests++; return read ? read() : Promise.resolve({ data: serverRow });
    } }) }) }),
    rpc: async (_name, args) => {
      if (error) return { error: { message: error } };
      serverRow = row(args.p_enabled, 5);
      return response || { data: [serverRow] };
    },
  };
  const context = vm.createContext({
    window, document, getRuntimeClient: () => client,
    subscribeTable: options => { subscriptions++; realtime = options.onChange; return () => cleanups++; },
    useSyncExternalStore: (subscribe, get) => { unsubs.push(subscribe(() => {})); return get(); },
  });
  const api = vm.runInContext(source + '\n({getDashboardScrapbookTheme,loadDashboardScrapbookTheme,saveDashboardScrapbookTheme,useDashboardScrapbookTheme})', context);
  return { api, window, document, unsubs, timers,
    setRead: fn => { read = fn; }, setError: value => { error = value; },
    setResponse: value => { response = value; }, setRow: value => { serverRow = value; },
    realtime: value => realtime({ new: value }),
    stats: () => ({ requests, subscriptions, cleanups, timers: timers.size }),
  };
}

test('starts OFF; a stale browser cache cannot enable a server-controlled skin', () => {
  const h = harness({ enabled: true, verified: true });
  assert.equal(h.api.getDashboardScrapbookTheme().enabled, false);
  assert.equal(h.api.getDashboardScrapbookTheme().verified, false);
});
test('confirmed ON/OFF and failed admin saves preserve the last confirmed appearance', async () => {
  const h = harness();
  await h.api.loadDashboardScrapbookTheme();
  assert.equal(h.api.getDashboardScrapbookTheme().verified, true);
  assert.equal((await h.api.saveDashboardScrapbookTheme(true)).ok, true);
  assert.equal(h.api.getDashboardScrapbookTheme().enabled, true);
  h.setError('Only an approved administrator can change the Dashboard theme.');
  assert.equal((await h.api.saveDashboardScrapbookTheme(false)).ok, false);
  assert.equal(h.api.getDashboardScrapbookTheme().enabled, true);
  h.setError(null);
  assert.equal((await h.api.saveDashboardScrapbookTheme(false)).ok, true);
  assert.equal(h.api.getDashboardScrapbookTheme().enabled, false);
});
test('a slow read cannot undo a confirmed switch', async () => {
  const h = harness(); let resolve;
  h.setRead(() => new Promise(r => { resolve = r; }));
  const pending = h.api.loadDashboardScrapbookTheme();
  await h.api.saveDashboardScrapbookTheme(true);
  resolve({ data: row(false) }); await pending;
  assert.equal(h.api.getDashboardScrapbookTheme().enabled, true);
});
test('realtime OFF reaches every consumer; an older event cannot re-enable it', async () => {
  const h = harness();
  h.api.useDashboardScrapbookTheme(); await h.api.loadDashboardScrapbookTheme();
  h.realtime(row(true, 3)); assert.equal(h.api.getDashboardScrapbookTheme().enabled, true);
  h.realtime(row(false, 6)); assert.equal(h.api.getDashboardScrapbookTheme().enabled, false);
  h.realtime(row(true, 4)); assert.equal(h.api.getDashboardScrapbookTheme().enabled, false);
  h.unsubs.forEach(fn => fn());
});
test('one shared subscription and timer for navigation, footer and settings; final unmount cleans up', async () => {
  const h = harness();
  for (let i = 0; i < 3; i++) h.api.useDashboardScrapbookTheme();
  await h.api.loadDashboardScrapbookTheme();
  assert.deepEqual(h.stats(), { requests: 1, subscriptions: 1, cleanups: 0, timers: 1 });
  h.unsubs[0](); h.unsubs[1](); assert.equal(h.stats().cleanups, 0);
  h.unsubs[2](); assert.equal(h.stats().cleanups, 1); assert.equal(h.stats().timers, 0);
});
test('cross-tab storage changes re-read server state instead of trusting local values', async () => {
  const h = harness(); h.api.useDashboardScrapbookTheme(); await h.api.loadDashboardScrapbookTheme();
  h.setRow(row(true, 3));
  const event = new Event('storage'); Object.defineProperty(event, 'key', { value: 'bes-dashboard-scrapbook-v1' });
  h.window.dispatchEvent(event); await h.api.loadDashboardScrapbookTheme();
  assert.equal(h.api.getDashboardScrapbookTheme().enabled, true);
  h.unsubs.forEach(fn => fn());
});
test('polling pauses in hidden tabs and resumes on visibility change', async () => {
  const h = harness(); h.api.useDashboardScrapbookTheme(); await h.api.loadDashboardScrapbookTheme();
  h.document.hidden = true; h.timers.forEach(fn => fn()); assert.equal(h.stats().requests, 1);
  h.setRow(row(true, 3)); h.document.hidden = false; h.document.dispatchEvent(new Event('visibilitychange'));
  await h.api.loadDashboardScrapbookTheme(); assert.equal(h.api.getDashboardScrapbookTheme().enabled, true);
  h.unsubs.forEach(fn => fn());
});
test('missing migration, unavailable database and malformed RPC never claim success', async () => {
  const h = harness();
  h.setRead(async () => ({ error: { message: 'column dashboard_scrapbook_enabled does not exist' } }));
  assert.equal((await h.api.loadDashboardScrapbookTheme()).ok, false);
  assert.equal(h.api.getDashboardScrapbookTheme().verified, false);
  h.setResponse({ data: [{ dashboard_scrapbook_enabled: false }] });
  assert.equal((await h.api.saveDashboardScrapbookTheme(true)).ok, false);
  assert.equal(h.api.getDashboardScrapbookTheme().enabled, false);
  assert.equal((await h.api.saveDashboardScrapbookTheme('true')).ok, false);
});
test('denied browser storage does not prevent confirmed switches', async () => {
  const h = harness(); h.window.localStorage.setItem = () => { throw new Error('denied'); };
  assert.equal((await h.api.saveDashboardScrapbookTheme(true)).ok, true);
  assert.equal(h.api.getDashboardScrapbookTheme().enabled, true);
});
test('every presentation selector is opt-in, and all local artwork is present', async () => {
  const { default: postcss } = await import('postcss');
  const css = readFileSync('src/features/dashboard-scrapbook/dashboard-scrapbook.css', 'utf8');
  postcss.parse(css).walkRules(rule => {
    for (const selector of rule.selectors) assert.ok(selector.includes('[data-dashboard-scrapbook="on"]'), `unscoped selector: ${selector}`);
  });
  for (const [,url] of css.matchAll(/url\('([^']+)'\)/g)) assert.ok(existsSync('public' + url), url);
});
