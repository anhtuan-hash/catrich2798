import fs from 'node:fs';
import path from 'node:path';
import { lookupLegacyUiEnglish } from '../src/utils/globalI18n.js';

// Source audit, not a substitute for authenticated UI testing.
// Reports literal Vietnamese UI labels left to translate in any React module.
const walk = root => fs.readdirSync(root,{withFileTypes:true}).flatMap(entry => {
  const file=path.join(root,entry.name);
  if (entry.isDirectory()) return walk(file);
  return /\.(?:jsx|tsx)$/.test(entry.name) ? [file] : [];
});
const results=[];
for(const file of walk('src')) {
  const source=fs.readFileSync(file,'utf8');
  const literal = [
    ...[...source.matchAll(/>([^<>{}\n]{2,110})</g)].map(m=>m[1].trim()),
    ...[...source.matchAll(/\b(?:placeholder|title|aria-label)="([^"]{2,110})"/g)].map(m=>m[1].trim()),
  ].filter(v=>/[À-ỹĐđĂăÂâÊêÔôƠơƯư]/.test(v));
  if (!literal.length) continue;
  const uncovered=literal.filter(v=>lookupLegacyUiEnglish(v)==null);
  results.push({file,all:literal.length,uncovered:uncovered.length,examples:[...new Set(uncovered)].slice(0,4)});
}
results.sort((a,b)=>b.uncovered-a.uncovered);
const total=results.reduce((n,x)=>n+x.all,0),missing=results.reduce((n,x)=>n+x.uncovered,0);
console.log('Site i18n source audit: '+(total-missing)+'/'+total+' literal Vietnamese UI occurrences mapped ('+(total?((total-missing)/total*100).toFixed(1):'100')+'%).');
console.log('Potential gaps by active source file (first 15):');
for (const entry of results.filter(x=>x.uncovered).slice(0,15)) {
  console.log(' - '+entry.file+': '+entry.uncovered+'/'+entry.all+' unmapped; '+entry.examples.join(' | ').slice(0,180));
}
console.log('Note: static source scanning cannot inspect dynamic strings, database content, CSS pseudo-elements, or authenticated route behavior.');
