import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
function read(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) { failures.push(`missing ${file}`); return ''; }
  return fs.readFileSync(full, 'utf8');
}
function expect(file, source, pattern, message) { if (!pattern.test(source)) failures.push(`${file}: ${message}`); }

const registryFile = 'src/heroTheme/heroRegistry.js';
const modelFile = 'src/heroTheme/heroThemeModel.js';
const clientFile = 'src/heroTheme/heroThemeClient.js';
const runtimeFile = 'src/components/HeroThemeRuntime.jsx';
const guardFile = 'src/components/GlobalRuntimeGuard.jsx';
const bridgeFile = 'src/components/admin/HeroThemeStudioBridge.jsx';
const studioFile = 'src/components/admin/HeroThemeStudio.jsx';
const runtimeCssFile = 'src/styles/HeroThemeRuntime.css';
const studioCssFile = 'src/styles/HeroThemeStudio.css';
const sharedApiFile = 'server/api/_heroTheme.js';
const manifestApiFile = 'api/hero-theme-manifest.js';
const adminApiFile = 'api/hero-theme-admin.js';
const uploadApiFile = 'api/hero-theme-upload.js';
const mediaApiFile = 'api/hero-theme-media.js';
const sqlFile = 'supabase/brian_hero_theme_studio.sql';

const registry = read(registryFile), model = read(modelFile), client = read(clientFile), runtime = read(runtimeFile);
const guard = read(guardFile), bridge = read(bridgeFile), studio = read(studioFile);
const runtimeCss = read(runtimeCssFile), studioCss = read(studioCssFile), sharedApi = read(sharedApiFile);
const manifestApi = read(manifestApiFile), adminApi = read(adminApiFile), uploadApi = read(uploadApiFile), mediaApi = read(mediaApiFile);
const sql = read(sqlFile), workflow = read('.github/workflows/frontend-build.yml');

expect(registryFile, registry, /home:\s*\[['"]Trang chủ['"],\s*['"]Home['"]\]/, 'registry must declare the home route');
expect(registryFile, registry, /heroKey:\s*`\$\{route\}\.main`/, 'route registry entries must resolve stable <route>.main keys');
expect(registryFile, registry, /validateHeroRegistry|assertUniqueHeroKeys/, 'registry must validate unique hero keys');
expect(registryFile, registry, /selectors\s*:/, 'registry must attach to existing Hero roots through declared selectors');
expect(modelFile, model, /mode\s*[:=].*original|mode === ['"]original['"]/, 'model must support explicit original mode');
expect(modelFile, model, /mode\s*[:=].*custom|mode === ['"]custom['"]/, 'model must support explicit custom mode');
expect(modelFile, model, /applyThemeToSelected|applyToSelected/, 'model must implement selected-only copy');
expect(modelFile, model, /positionX/, 'model must normalize position');
expect(modelFile, model, /brightness/, 'model must normalize brightness');
expect(modelFile, model, /overlayOpacity/, 'model must normalize overlay');
if (/globalFallback|fallbackTheme|inheritTheme/i.test(model + registry)) failures.push('model/registry: hidden global inheritance is forbidden');

expect(clientFile, client, /hero-theme-manifest/, 'client must load public published manifest endpoint');
expect(runtimeFile, runtime, /requestAnimationFrame|setTimeout|useEffect/, 'runtime must attach after the existing Hero can render');
expect(runtimeFile, runtime, /data-hero-key|dataset\.heroKey/, 'runtime must mark the resolved Hero with the stable key');
expect(runtimeFile, runtime, /original Hero preserved|media error|onerror/i, 'runtime must fail open when themed media fails');
expect(runtimeFile, runtime, /startsWith\(['"]tool\//, 'runtime must resolve tool/slug hash routes');
expect(runtimeCssFile, runtimeCss, /pointer-events:\s*none/, 'theme layer must not intercept Hero interactions');
expect(runtimeCssFile, runtimeCss, /z-index/, 'runtime must place the layer behind existing Hero content');
expect(guardFile, guard, /HeroThemeRuntime/, 'global runtime guard must mount the public Theme Runtime');
expect(guardFile, guard, /HeroThemeStudioBridge/, 'admin route must mount the Theme Studio bridge');
expect(bridgeFile, bridge, /isAdminRole/, 'Studio bridge must enforce the Admin UI gate');
expect(bridgeFile, bridge, /createPortal/, 'Studio must render inside the existing main Admin content surface');

expect(sharedApiFile, sharedApi, /normalizeHeroTheme/, 'server must independently normalize theme configuration');
expect(sharedApiFile, sharedApi, /requireApprovedUser/, 'admin API helper must use verified server auth');
expect(manifestApiFile, manifestApi, /loadPublicManifest/, 'manifest endpoint must delegate to the published-only manifest loader');
expect(sharedApiFile, sharedApi, /rpc\(['"]hero_theme_public_manifest['"]\)/, 'published manifest loader must read only the active public manifest RPC');
if (/requireApprovedUser\s*\(/.test(manifestApi)) failures.push('public manifest must stay readable by anonymous visitors');
expect(adminApiFile, adminApi, /roles:\s*\[['"]admin['"]\]/, 'theme mutations must be admin-only');
expect(adminApiFile, adminApi, /publish|restore|saveDraft/, 'admin endpoint must support draft/publish/restore operations');
expect(uploadApiFile, uploadApi, /10\s*\*\s*1024\s*\*\s*1024/, 'Hero image upload limit must be 10 MB');
expect(uploadApiFile, uploadApi, /image\/png/, 'upload must accept PNG');
expect(uploadApiFile, uploadApi, /image\/jpeg/, 'upload must accept JPEG');
expect(uploadApiFile, uploadApi, /image\/webp/, 'upload must accept WebP');
expect(uploadApiFile, uploadApi, /width|dimensions/i, 'server upload must validate actual image dimensions');
expect(uploadApiFile, uploadApi, /Hero Themes/, 'Hero images must use a dedicated Drive hierarchy');
expect(mediaApiFile, mediaApi, /active|revision/i, 'public media proxy must verify the active published revision');
expect(mediaApiFile, mediaApi, /Cache-Control/, 'public media proxy must be cacheable');
expect(mediaApiFile, mediaApi, /X-Content-Type-Options|nosniff/i, 'public media proxy must disable MIME sniffing');

for (const table of ['hero_theme_sets','hero_theme_drafts','hero_theme_revisions','hero_theme_active','hero_theme_media']) {
  expect(sqlFile, sql, new RegExp(`create table if not exists public\\.${table}`), `SQL must create ${table}`);
}
expect(sqlFile, sql, /enable row level security/ig, 'Hero theme tables must use RLS');
expect(sqlFile, sql, /hero_theme_publish_draft/, 'SQL must define transactional publish RPC');
expect(sqlFile, sql, /hero_theme_restore_revision/, 'SQL must define restore-as-new-revision RPC');
expect(sqlFile, sql, /hero_theme_public_manifest/, 'SQL must expose a published-only public manifest function');
expect(sqlFile, sql, /anon/, 'published state must be readable by anonymous users');
expect(sqlFile, sql, /admin|administrator/, 'database write policies must be admin-gated');

expect(studioFile, studio, /Save draft|Lưu bản nháp|saveDraft/i, 'Studio must save drafts');
expect(studioFile, studio, /Publish|Xuất bản/i, 'Studio must publish');
expect(studioFile, studio, /Restore|Khôi phục/i, 'Studio must restore revisions');
expect(studioFile, studio, /Apply.*selected|Áp dụng.*đã chọn/i, 'Studio must explicitly apply to selected Heros');
expect(studioFile, studio, /Apply.*all|Áp dụng.*tất cả/i, 'Studio must explicitly apply to all Heros');
expect(studioFile, studio, /image\/webp|toBlob/, 'Studio must optimize image uploads to WebP when supported');
expect(studioCssFile, studioCss, /hero-theme-studio/, 'Studio must have isolated styles');
expect(workflow, workflow, /test-hero-theme-studio\.mjs/, 'frontend CI must run the Hero Theme Studio contract');

if (failures.length) {
  console.error(`Hero Theme Studio contract FAILED (${failures.length})`);
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
console.log('Hero Theme Studio contract passed.');