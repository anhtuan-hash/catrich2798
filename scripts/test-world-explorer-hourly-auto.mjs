import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const handler = read('supabase/functions/world-explorer-hourly/index.ts');
const schema = read('supabase/migrations/20261031004515_world_explorer_hourly_auto.sql');
const cron = read('supabase/migrations/20261031004852_world_explorer_hourly_schedule.sql');
const home = read('src/features/world-explorer/WorldExplorer.jsx');
const admin = read('src/features/world-explorer/WorldExplorerAdmin.jsx');

assert.match(cron, /'world-explorer-auto-hourly'\s*,\s*'0 \* \* \* \*'/);
assert.match(schema, /cron\.unschedule\('world-explorer-publish-0700-vn'\)/);
assert.match(schema, /world_explorer_publications_hour_unique/);
assert.match(schema, /world_explorer_publications_wikimedia_source_unique/);
assert.match(schema, /world_explorer_verify_cron_token/);
assert.match(schema, /world_explorer_auto_ingest/);
assert.match(schema, /grant execute on function public\.world_explorer_auto_ingest\(jsonb\) to service_role/);
assert.match(schema, /revoke all on function public\.world_explorer_auto_ingest\(jsonb\) from public,anon,authenticated/);
assert.match(schema, /length\(p_payload->>'body_en'\)<350/);
assert.match(schema, /length\(p_payload->>'body_vi'\)<260/);
assert.match(schema, /photo !~ '\^https:\/\/upload/);
assert.match(schema, /source_vi !~ '\^https:\/\/vi/);

assert.match(handler, /x-world-explorer-cron-token/);
assert.match(handler, /world_explorer_verify_cron_token/);
assert.match(handler, /world_explorer_auto_ingest/);
assert.match(handler, /new Set\(\(previous/);
assert.match(handler, /commons\.wikimedia\.org/);
assert.match(handler, /getImage\(en\.pageimage\)/);
assert.match(handler, /wikiApi\('vi\.wikipedia\.org'/);
assert.match(handler, /image_license: image\.license/);
assert.match(handler, /source_url_vi: article_vi/);
assert.match(handler, /no_qualified_content/);
assert.doesNotMatch(handler, /Math\.random\(\)/);

assert.match(home, /order\('published_at', \{ ascending: false \}\)/);
assert.match(home, /HOURLY DISCOVERY/);
assert.match(home, /source_url_vi/);
assert.match(home, /image_license/);
assert.match(home, /content_license/);
assert.match(home, /data-world-explorer-inline-reader/);
assert.match(admin, /auto_publish_hourly/);
assert.match(admin, /we-admin-drawer/);
assert.doesNotMatch(admin, />\s*Duyệt\s*</);
assert.doesNotMatch(admin, /world_explorer_publish_today/);

console.log('World Explorer hourly automatic bilingual & licensed image contracts PASS.');
