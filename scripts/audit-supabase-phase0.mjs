import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'cloudflare-phase0');
const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.sql', '.json', '.jsonc', '.md', '.html', '.yml', '.yaml', '.toml', '.env',
]);
const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage', '.vercel', '.wrangler', 'artifacts',
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) || entry.name.startsWith('.env')) files.push(absolute);
  }
  return files;
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function add(map, name, file, line, kind = 'code') {
  const clean = String(name || '').trim();
  if (!clean || clean.length > 160) return;
  if (!map.has(clean)) map.set(clean, []);
  const ref = { file, line, kind };
  if (!map.get(clean).some((item) => item.file === file && item.line === line && item.kind === kind)) map.get(clean).push(ref);
}

function matches(text, regex, callback) {
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(text))) callback(match);
}

function refText(ref) {
  return `\`${ref.file}:${ref.line}\``;
}

function mapRows(map) {
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, refs]) => ({ name, references: refs.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line) }));
}

function markdownSection(title, rows, empty = 'Không phát hiện trong mã nguồn.') {
  const lines = [`## ${title}`, ''];
  if (!rows.length) return [...lines, empty, ''];
  lines.push('| Tên | Vị trí tham chiếu |', '|---|---|');
  for (const row of rows) {
    const refs = row.references.slice(0, 8).map(refText).join('<br>');
    const more = row.references.length > 8 ? `<br>… và ${row.references.length - 8} vị trí khác` : '';
    lines.push(`| \`${row.name.replaceAll('|', '\\|')}\` | ${refs}${more} |`);
  }
  lines.push('');
  return lines;
}

const inventory = {
  generatedAt: new Date().toISOString(),
  scannedFiles: 0,
  supabaseRelatedFiles: new Set(),
  tables: new Map(),
  views: new Map(),
  buckets: new Map(),
  edgeFunctions: new Map(),
  realtimeTables: new Map(),
  realtimeChannels: new Map(),
  authApis: new Map(),
  environmentVariables: new Map(),
  internalApis: new Map(),
  supabaseFiles: new Map(),
  sqlMigrations: new Map(),
  dynamicTableCalls: [],
};

const files = walk(ROOT);
for (const absolute of files) {
  const file = relative(absolute);
  let text;
  try { text = fs.readFileSync(absolute, 'utf8'); } catch { continue; }
  inventory.scannedFiles += 1;

  const related = /supabase|postgres_changes|storage\.from|functions\.invoke|VITE_SUPABASE|SUPABASE_/i.test(text)
    || file.startsWith('supabase/');
  if (related) inventory.supabaseRelatedFiles.add(file);

  if (file.startsWith('supabase/')) add(inventory.supabaseFiles, file, file, 1, 'file');
  if (/^supabase\/.*\.sql$/i.test(file)) add(inventory.sqlMigrations, file, file, 1, 'sql');

  matches(text, /\.storage\s*\.from\(\s*['"`]([^'"`]+)['"`]\s*\)/g, (m) => add(inventory.buckets, m[1], file, lineNumber(text, m.index)));
  matches(text, /(?:supabase|client|getRuntimeClient\(\)|runtimeClient)\s*\.from\(\s*['"`]([^'"`]+)['"`]\s*\)/g, (m) => add(inventory.tables, m[1], file, lineNumber(text, m.index)));
  matches(text, /\b(?:queryTable|insertRows|updateRows|upsertRows|deleteRows)\(\s*['"`]([^'"`]+)['"`]/g, (m) => add(inventory.tables, m[1], file, lineNumber(text, m.index)));
  matches(text, /\bsafeTable\(\s*[^,]+,\s*['"`]([^'"`]+)['"`]/g, (m) => add(inventory.tables, m[1], file, lineNumber(text, m.index)));
  matches(text, /\b(?:TABLE|SETTINGS_TABLE|TABLE_NAME|PROFILE_TABLE|RESOURCE_TABLE|NOTIFICATION_TABLE)\s*=\s*['"`]([^'"`]+)['"`]/g, (m) => add(inventory.tables, m[1], file, lineNumber(text, m.index), 'constant'));
  matches(text, /\b[A-Z][A-Z0-9_]*_TABLE\s*=\s*['"`]([^'"`]+)['"`]/g, (m) => add(inventory.tables, m[1], file, lineNumber(text, m.index), 'constant'));

  matches(text, /subscribeTable\s*\(\s*\{[\s\S]{0,500}?\btable\s*:\s*['"`]([^'"`]+)['"`]/g, (m) => {
    add(inventory.realtimeTables, m[1], file, lineNumber(text, m.index));
    add(inventory.tables, m[1], file, lineNumber(text, m.index), 'realtime');
  });
  matches(text, /\.on\(\s*['"`]postgres_changes['"`]\s*,\s*\{[\s\S]{0,500}?\btable\s*:\s*['"`]([^'"`]+)['"`]/g, (m) => {
    add(inventory.realtimeTables, m[1], file, lineNumber(text, m.index));
    add(inventory.tables, m[1], file, lineNumber(text, m.index), 'realtime');
  });
  matches(text, /\.channel\(\s*['"`]([^'"`]+)['"`]\s*\)/g, (m) => add(inventory.realtimeChannels, m[1], file, lineNumber(text, m.index)));

  matches(text, /\.functions\s*\.invoke\(\s*['"`]([^'"`]+)['"`]/g, (m) => add(inventory.edgeFunctions, m[1], file, lineNumber(text, m.index)));
  matches(text, /\binvokeFunction\(\s*['"`]([^'"`]+)['"`]/g, (m) => add(inventory.edgeFunctions, m[1], file, lineNumber(text, m.index)));

  matches(text, /\.(auth\.[a-zA-Z0-9_]+)\s*\(/g, (m) => add(inventory.authApis, m[1], file, lineNumber(text, m.index)));
  matches(text, /\bauth\s*\.\s*([a-zA-Z0-9_]+)\s*\(/g, (m) => add(inventory.authApis, `auth.${m[1]}`, file, lineNumber(text, m.index)));

  matches(text, /\b(?:import\.meta\.env|process\.env)\.([A-Z][A-Z0-9_]+)/g, (m) => {
    if (/SUPABASE|DATABASE|POSTGRES|SERVICE_ROLE|BRIAN_API|DATA_BACKEND/i.test(m[1])) add(inventory.environmentVariables, m[1], file, lineNumber(text, m.index));
  });
  matches(text, /['"`]((?:VITE_)?SUPABASE_[A-Z0-9_]+|SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|POSTGRES_URL|DATABASE_URL)['"`]/g, (m) => add(inventory.environmentVariables, m[1], file, lineNumber(text, m.index)));

  matches(text, /(?:fetch|requestApi)\(\s*['"`]([^'"`]*\/api\/[^'"`?]*)/g, (m) => add(inventory.internalApis, m[1], file, lineNumber(text, m.index)));

  matches(text, /CREATE\s+(?:TABLE|VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["`]?([a-zA-Z0-9_]+)["`]?/gi, (m) => {
    const target = /^CREATE\s+VIEW/i.test(m[0]) ? inventory.views : inventory.tables;
    add(target, m[1], file, lineNumber(text, m.index), 'sql');
  });
  matches(text, /INSERT\s+INTO\s+storage\.buckets[\s\S]{0,500}?VALUES\s*\(\s*['"`]([^'"`]+)['"`]/gi, (m) => add(inventory.buckets, m[1], file, lineNumber(text, m.index), 'sql'));
  matches(text, /bucket_id\s*=\s*['"`]([^'"`]+)['"`]/gi, (m) => add(inventory.buckets, m[1], file, lineNumber(text, m.index), 'sql'));

  const functionMatch = file.match(/^supabase\/functions\/([^/]+)\//);
  if (functionMatch) add(inventory.edgeFunctions, functionMatch[1], file, 1, 'directory');

  matches(text, /\.from\(\s*([^'"`][^)]+)\)/g, (m) => {
    const expression = m[1].replace(/\s+/g, ' ').trim();
    if (expression && expression.length < 120) inventory.dynamicTableCalls.push({ expression, file, line: lineNumber(text, m.index) });
  });
}

for (const bucket of inventory.buckets.keys()) inventory.tables.delete(bucket);

const json = {
  generatedAt: inventory.generatedAt,
  scannedFiles: inventory.scannedFiles,
  supabaseRelatedFileCount: inventory.supabaseRelatedFiles.size,
  supabaseRelatedFiles: [...inventory.supabaseRelatedFiles].sort(),
  tables: mapRows(inventory.tables),
  views: mapRows(inventory.views),
  buckets: mapRows(inventory.buckets),
  edgeFunctions: mapRows(inventory.edgeFunctions),
  realtimeTables: mapRows(inventory.realtimeTables),
  realtimeChannels: mapRows(inventory.realtimeChannels),
  authApis: mapRows(inventory.authApis),
  environmentVariables: mapRows(inventory.environmentVariables),
  internalApis: mapRows(inventory.internalApis),
  supabaseFiles: mapRows(inventory.supabaseFiles),
  sqlMigrations: mapRows(inventory.sqlMigrations),
  dynamicTableCalls: inventory.dynamicTableCalls,
};

const markdown = [
  '# Giai đoạn 0 — Kiểm kê phụ thuộc Supabase của Brian',
  '',
  `- Thời điểm quét: **${inventory.generatedAt}**`,
  `- Số tệp văn bản đã quét: **${inventory.scannedFiles}**`,
  `- Số tệp có dấu hiệu phụ thuộc Supabase: **${inventory.supabaseRelatedFiles.size}**`,
  `- Bảng/đối tượng dữ liệu phát hiện: **${json.tables.length}**`,
  `- Bucket phát hiện: **${json.buckets.length}**`,
  `- Edge Function phát hiện: **${json.edgeFunctions.length}**`,
  `- Bảng có Realtime phát hiện: **${json.realtimeTables.length}**`,
  '',
  '> Báo cáo này là quét tĩnh, chỉ đọc mã nguồn. Các bảng hoặc bucket tồn tại trong Supabase nhưng không còn được mã nguồn tham chiếu cần được xác nhận thêm bằng ảnh chụp Dashboard Supabase.',
  '',
  ...markdownSection('Bảng và view được mã nguồn tham chiếu', json.tables),
  ...markdownSection('View SQL phát hiện', json.views),
  ...markdownSection('Storage bucket', json.buckets),
  ...markdownSection('Supabase Edge Functions', json.edgeFunctions),
  ...markdownSection('Bảng đang dùng Realtime', json.realtimeTables),
  ...markdownSection('Realtime channel đặt tên tĩnh', json.realtimeChannels),
  ...markdownSection('Supabase Auth API', json.authApis),
  ...markdownSection('Biến môi trường nhạy cảm/liên quan backend', json.environmentVariables),
  ...markdownSection('API nội bộ/Vercel liên quan', json.internalApis),
  ...markdownSection('Tệp cấu hình và migration trong thư mục supabase', json.supabaseFiles),
  '## Lời gọi bảng động cần rà soát thủ công',
  '',
  ...(json.dynamicTableCalls.length
    ? json.dynamicTableCalls.slice(0, 100).map((item) => `- \`${item.expression}\` tại \`${item.file}:${item.line}\``)
    : ['Không phát hiện.']),
  '',
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUTPUT_DIR, 'supabase-inventory.json'), `${JSON.stringify(json, null, 2)}\n`);
fs.writeFileSync(path.join(OUTPUT_DIR, 'supabase-inventory.md'), `${markdown.join('\n')}\n`);

console.log(`PHASE0_SUMMARY scanned=${json.scannedFiles} related=${json.supabaseRelatedFileCount} tables=${json.tables.length} buckets=${json.buckets.length} functions=${json.edgeFunctions.length} realtimeTables=${json.realtimeTables.length}`);
console.log('--- PHASE0_REPORT_BEGIN ---');
console.log(markdown.join('\n'));
console.log('--- PHASE0_REPORT_END ---');
