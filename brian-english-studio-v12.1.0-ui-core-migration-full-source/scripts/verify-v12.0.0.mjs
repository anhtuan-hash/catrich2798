import { spawnSync } from 'node:child_process';

const commands = [
  ['node', ['scripts/sync-version-v12.0.0.mjs']],
  ['node', ['scripts/ui-core-audit-v12.0.0.mjs']],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('Brian English Studio V12.0.0 foundation verification PASS.');
