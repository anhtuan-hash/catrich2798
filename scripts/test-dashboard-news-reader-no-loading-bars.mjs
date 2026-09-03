import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/components/DashboardNewsHub.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/components/DashboardNewsHub.css', import.meta.url), 'utf8');

assert.ok(
  source.includes('dnh-reader-fetch-state'),
  'Focused Dashboard news reader must use a neutral fetch-state class while the article is fetched.',
);
assert.ok(
  !source.includes('dnh-reader-loading'),
  'Focused Dashboard news reader must not expose a generic *-loading class that the global WP8 loader decorates.',
);
assert.ok(
  !source.includes('<span className="dnh-loader" />{t.fullLoading}'),
  'Focused Dashboard news reader must not render its spinner inside the article fetch state.',
);
assert.ok(
  !source.includes('dnh-loader'),
  'Dashboard News Hub must not render the legacy dnh-loader anywhere because the global WP8 loader decorates it into loading bars.',
);
assert.ok(
  styles.includes('.dnh-reader-fetch-state'),
  'Focused Dashboard news reader fetch state must keep its static layout styling.',
);
assert.ok(
  !styles.includes('.dnh-reader-loading{'),
  'Retired focused-reader loading selector must not return.',
);
assert.ok(
  !styles.includes('.dnh-loader'),
  'Dashboard News Hub must not keep the legacy dnh-loader styling after the loader is retired.',
);

console.log('PASS: Dashboard News Hub has no loading/spinner bars.');
