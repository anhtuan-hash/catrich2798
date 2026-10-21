import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const run = (command, args) => {
  console.log(`\n> ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
};

if (process.platform !== 'darwin') {
  console.warn('Cảnh báo: Có thể chuẩn bị Capacitor trên hệ điều hành này, nhưng cần macOS + Xcode để mở và chạy dự án iOS.');
}

const packagePath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));

pkg.scripts = {
  ...pkg.scripts,
  'ios:setup': 'node scripts/setup-ios-capacitor.mjs',
  'ios:sync': 'npm run build && npx cap sync ios',
  'ios:open': 'npx cap open ios',
  'ios:run': 'npm run build && npx cap run ios',
};

writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

run('npm', ['install', '@capacitor/core']);
run('npm', ['install', '--save-dev', '@capacitor/cli', '@capacitor/ios']);
run('npm', ['run', 'build']);

if (!existsSync(new URL('../ios', import.meta.url))) {
  run('npx', ['cap', 'add', 'ios']);
} else {
  run('npx', ['cap', 'sync', 'ios']);
}

console.log('\nHoàn tất. Trên máy Mac, chạy: npm run ios:open');
