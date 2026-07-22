import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const envPath = path.join(root, '.env.local');
const departmentId = '00000000-0000-0000-0000-000000000001';

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return new Map();
  const entries = new Map();
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    entries.set(key, value);
  }
  return entries;
}

const original = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const lines = original.split(/\r?\n/).filter((line, index, all) => !(index === all.length - 1 && line === ''));
const localValues = readEnvFile(envPath);
const parentValues = [
  path.join(root, '..', '.env.local'),
  path.join(root, '..', '.env'),
].map(readEnvFile);

function findValue(key) {
  return localValues.get(key)
    || parentValues.find((entries) => entries.get(key))?.get(key)
    || String(process.env[key] || '').trim();
}

function upsert(key, value) {
  const index = lines.findIndex((item) => item.startsWith(`${key}=`));
  const next = `${key}=${value}`;
  if (index >= 0) lines[index] = next;
  else lines.push(next);
}

const url = findValue('VITE_SUPABASE_URL');
const anonKey = findValue('VITE_SUPABASE_ANON_KEY');

if (!url || !anonKey) {
  console.error('Không tìm thấy VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong department-app, thư mục Brian cha hoặc environment.');
  console.error('Không bật cloud để tránh đưa ứng dụng vào trạng thái cấu hình dở dang.');
  process.exit(1);
}

upsert('VITE_SUPABASE_URL', url);
upsert('VITE_SUPABASE_ANON_KEY', anonKey);
upsert('VITE_DEPARTMENT_ID', departmentId);
upsert('VITE_DEPARTMENT_CLOUD_ENABLED', 'true');

fs.writeFileSync(envPath, `${lines.join('\n')}\n`, { mode: 0o600 });
console.log('Đã bật Department Cloud trong department-app/.env.local.');
console.log(`Department ID: ${departmentId}`);
console.log('Đã tái sử dụng cấu hình Supabase công khai của Brian mà không hiển thị key.');
console.log('Hãy khởi động lại npm run dev.');
