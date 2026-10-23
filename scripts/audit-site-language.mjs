import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { lookupLegacyUiEnglish } from '../src/utils/globalI18n.js';

// Deliberately preserve official Vietnamese document text, personal identities,
// font-glyph samples, sample student names and scanner false positives.
// These are NOT interface labels and must not be reworded just to inflate metrics.
const PRESERVE = Object.freeze({
  'src/pages/TextCareCompactStudio.jsx': [
    'Kính gửi:', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    'Độc lập - Tự do - Hạnh phúc','Nơi nhận:','(Ký, ghi rõ họ tên)',
  ],
  'src/components/homeroom/HomeroomCommunicationTabs.jsx': [
    'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 'Độc lập – Tự do – Hạnh phúc',
  ],
  'src/components/Footer.jsx': [
    'Portfolio · Nguyễn Anh Tuấn','Nguyễn Anh Tuấn',
    'English Hub, Pétrus Ký and Cambridge Assessment English',
  ],
  'src/components/admin/GlobalFontAdminPanel.jsx': [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789 · Ă Â Ê Ô Ơ Ư Đ',
  ],
  'src/components/homeroom/StudentRecordsTab.jsx': [
    ",'Hồ sơ giấy'],['vnedu'", ",'Đối chiếu'],['history'",
  ],
  'src/pages/ClassroomJoin.jsx': ['Nguyễn Văn A'],
  'src/pages/QuestionBank.jsx': [
    '5 Arrangement · 5 Discourse Cloze · 10 Reading · 8 Reading · 2 × 6 Functional Cloze.',
  ],
});
const exclusions = new Map(Object.entries(PRESERVE).map(([k,v])=>[k,new Set(v)]));
const walk = root => fs.readdirSync(root,{withFileTypes:true}).flatMap(entry => {
  const file = path.join(root, entry.name);
  if (entry.isDirectory()) return walk(file);
  return /\.(?:jsx|tsx)$/.test(entry.name) ? [file] : [];
});
const results=[];
for (const file of walk('src')) {
  const source=fs.readFileSync(file,'utf8');
  const literal=[
    ...[...source.matchAll(/>([^<>{}\n]{2,110})</g)].map(m=>m[1].trim()),
    ...[...source.matchAll(/\b(?:placeholder|title|aria-label)="([^"]{2,110})"/g)].map(m=>m[1].trim()),
  ].filter(v=>/[À-ỹĐđĂăÂâÊêÔôƠơƯư]/.test(v));
  let translated=0, preserved=0;
  const missing=[];
  for (const candidate of literal) {
    if (lookupLegacyUiEnglish(candidate) != null) translated++;
    else if (exclusions.get(file)?.has(candidate)) preserved++;
    else missing.push(candidate);
  }
  if (literal.length) results.push({
    file, all: literal.length, translated, preserved,
    missing: [...new Set(missing)],
  });
}
results.sort((a,b)=>b.missing.length-a.missing.length);
const total=results.reduce((n,x)=>n+x.all,0);
const translated=results.reduce((n,x)=>n+x.translated,0);
const preserved=results.reduce((n,x)=>n+x.preserved,0);
const missing=results.reduce((n,x)=>n+x.all-x.translated-x.preserved,0);
console.log('Full-site JSX i18n audit: '+translated+'/'+total+' static occurrences translated; '+preserved+' intentionally preserved; '+missing+' actionable unmapped.');
for (const entry of results.filter(x=>x.missing.length)) {
  console.log(' - '+entry.file+': '+entry.missing.join(' | ').slice(0,1600));
}
console.log('Scope: literal JSX nodes, title, placeholder and aria-label only. Dynamic strings, embedded sites, CSS, authored content and authenticated UI require separate runtime checks.');
assert.equal(missing,0,'Untranslated static UI labels need an English key or an explicitly reviewed preservation exception.');
