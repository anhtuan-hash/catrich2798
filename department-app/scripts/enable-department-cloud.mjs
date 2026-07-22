import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const envPath = path.join(root, '.env.local');
const departmentId = '00000000-0000-0000-0000-000000000001';

const original = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const lines = original.split(/\r?\n/).filter((line, index, all) => !(index === all.length - 1 && line === ''));

function readValue(key) {
  const line = lines.find((item) => item.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : '';
}

function upsert(key, value) {
  const index = lines.findIndex((item) => item.startsWith(`${key}=`));
  const next = `${key}=${value}`;
  if (index >= 0) lines[index] = next;
  else lines.push(next);
}

const url = readValue('VITE_SUPABASE_URL') || String(process.env.VITE_SUPABASE_URL || '').trim();
const anonKey = readValue('VITE_SUPABASE_ANON_KEY') || String(process.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!url || !anonKey) {
  console.error('Chưa có VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong .env.local/environment.');
  console.error('Không bật cloud để tránh đưa ứng dụng vào trạng thái cấu hình dở dang.');
  process.exit(1);
}

if (!readValue('VITE_SUPABASE_URL')) upsert('VITE_SUPABASE_URL', url);
if (!readValue('VITE_SUPABASE_ANON_KEY')) upsert('VITE_SUPABASE_ANON_KEY', anonKey);
upsert('VITE_DEPARTMENT_ID', departmentId);
upsert('VITE_DEPARTMENT_CLOUD_ENABLED', 'true');

fs.writeFileSync(envPath, `${lines.join('\n')}\n`, { mode: 0o600 });
console.log('Đã bật Department Cloud trong .env.local.');
console.log(`Department ID: ${departmentId}`);
console.log('Không hiển thị Supabase key. Hãy khởi động lại npm run dev.');
