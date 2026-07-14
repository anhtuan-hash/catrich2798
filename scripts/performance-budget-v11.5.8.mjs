import fs from 'node:fs';
if (!fs.existsSync('dist/index.html')) throw new Error('Run build first.');
const utility = fs.statSync('src/utils/providerHubInputGuard.js').size;
const css = fs.statSync('src/styles/v1158.css').size;
if (utility > 18000) throw new Error(`Provider input guard too large: ${utility}`);
if (css > 6000) throw new Error(`Provider input CSS too large: ${css}`);
console.log(`V11.5.8 performance budget PASS (${utility} B JS, ${css} B CSS)`);
