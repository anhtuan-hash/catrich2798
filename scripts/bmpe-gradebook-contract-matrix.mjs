/**
 * Execute every historical Gradebook contract independently rather than
 * stopping at the first assertion. This diagnostic NEVER masks failures:
 * the process exits nonzero if any contract fails.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const checks=[
 ['Focus V5','node',['tests/gradebook-focus-v5.test.mjs']],
 ['Roster Hotfix','node',['tests/gradebook-roster-layout-hotfix.test.mjs']],
 ['Command Deck V3','node',['scripts/test-gradebook-command-deck-v3.mjs']],
 ['Mock Exams','node',['scripts/test-gradebook-mock-exams.mjs']],
 ['Mock Exams V2','node',['scripts/test-gradebook-mock-exams-v2.mjs']],
 ['Spectrum V4','node',['--test','tests/gradebook-spectrum-v4.test.mjs']],
 ['Permanent Palette','node',['--test','tests/gradebook-permanent-palette.test.mjs']],
 ['Workbench Two','node',['--test','tests/gradebook-workbench-two.test.mjs']],
 ['Material3 Colorful','node',['--test','tests/gradebook-material3-colorful.test.mjs']],
];
const records=checks.map(([name,cmd,args])=>{
 const result=spawnSync(cmd,args,{encoding:'utf8',timeout:25000,maxBuffer:512*1024});
 const combined=((result.stdout||'')+'\n'+(result.stderr||'')).slice(-18000);
 const status=result.status===0&&!result.error?'PASS':'FAIL';
 console.log('\n=== '+name+' : '+status+' ===\n'+combined.slice(-3500));
 return {name,command:[cmd,...args].join(' '),status,exitCode:result.status,error:result.error?.message||null,output:combined};
});
const summary={schema:'bmpe-gradebook-compat-matrix-v1',commit:process.env.GITHUB_SHA||null,ranAt:new Date().toISOString(),results:records};
mkdirSync('reports/performance',{recursive:true});
writeFileSync('reports/performance/BMPE_gradebook_compat_matrix.json',JSON.stringify(summary,null,2));
console.log('\nBMPE Gradebook compatibility: '+records.filter(x=>x.status==='PASS').length+'/'+records.length+' PASS');
if(records.some(x=>x.status!=='PASS'))process.exitCode=1;
