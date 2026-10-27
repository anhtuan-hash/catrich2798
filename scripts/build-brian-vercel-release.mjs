import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

// Vercel builds the app with a short, auditable command; the legacy full
// regression suite remains in GitHub Actions instead of blocking static bundling.
const checks=[
  ['node',['scripts/test-editorial-app-heroes.mjs']],
  ['npm',['run','version:sync']],
  ['npm',['run','audit:inactive-modules']],
  ['npm',['run','audit:i18n']],
  ['npm',['run','test:i18n']],
  ['node',['scripts/test-learning-reports-contract.mjs']],
  ['node',['scripts/test-learning-report-instructor-scoping.mjs']],
  ['node',['scripts/test-learning-report-attendance-contract.mjs']],
  ['node',['scripts/test-learning-reports-unified-workspace.mjs']],
  ['node',['scripts/test-auth-security-hardening.mjs']],
  ['npm',['exec','--','vite','build']],
];
for(const [command,args] of checks){
  process.stdout.write('\\n[release-build] '+command+' '+args.join(' ')+'\\n');
  const result=spawnSync(command,args,{cwd:resolve('.'),stdio:'inherit',
    env:process.env,shell:process.platform==='win32'});
  if(result.error){console.error(result.error);process.exit(1);}
  if(result.status!==0){console.error('[release-build] Failed step: '+command+' '+args.join(' '));process.exit(result.status||1);}
}
console.log('[release-build] All release gates and Vite bundling passed.');
