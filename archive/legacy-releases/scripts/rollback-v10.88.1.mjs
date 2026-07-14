import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const backupDir = path.join(root, '.bes-backup', 'v10.88.1-resource-library');
const pairs = [
  [path.join(backupDir, 'package.json'), path.join(root, 'package.json')],
  [path.join(backupDir, 'version.json'), path.join(root, 'public', 'version.json')],
];
let restored = 0;
for (const [from, to] of pairs) {
  if (fs.existsSync(from)) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    restored += 1;
  }
}
console.log(`Restored ${restored} local project file(s).`);
console.log('Note: database policies are not automatically rolled back. Use a Supabase backup if database rollback is required.');
