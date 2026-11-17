import { cpSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const root = fileURLToPath(new URL('./', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const publicDir = resolve(repoRoot, 'public');
const targetOrigin = 'https://btgxeaakwjtlfvgiexzp.supabase.co';

function isPublicSupabaseKey(key) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  try {
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon';
  } catch {
    return false;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, 'VITE_ATTENDANCE_');
  const url = String(env.VITE_ATTENDANCE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = String(env.VITE_ATTENDANCE_SUPABASE_ANON_KEY || '').trim();

  if (url && url !== targetOrigin) throw new Error('Attendance must use the designated Supabase project.');
  if (key && !isPublicSupabaseKey(key)) throw new Error('Attendance requires a Supabase publishable or anon key.');
  const configured = Boolean(url && key);

  return {
    root,
    publicDir,
    envDir: root,
    envPrefix: 'VITE_ATTENDANCE_',
    server: { fs: { allow: [repoRoot] } },
    define: {
      'import.meta.env.VITE_ATTENDANCE_BACKEND_CONFIGURED': JSON.stringify(configured),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(configured ? url : ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(configured ? key : ''),
    },
    build: { target: 'es2020', copyPublicDir: false },
    plugins: [
      {
        name: 'attendance-public-assets',
        apply: 'build',
        writeBundle({ dir }) {
          const attendanceAssets = readdirSync(publicDir).filter((name) => /^attendance-.*\.(css|js)$/.test(name));
          for (const asset of [...attendanceAssets, 'brian-english-brand-logo.png', 'assets/login-scrapbook']) {
            cpSync(resolve(publicDir, asset), resolve(dir, asset), { recursive: true });
          }
        },
      },
    ],
  };
});
