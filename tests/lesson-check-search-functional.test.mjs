import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeActivityTitle,matchesActivityTitle} from '../src/utils/lessonCheckSearch.js';

const cards=[
 {id:'a',title:'Artificial Intelligence: Neural Nexus Tower'},
 {id:'b',title:'Cyber Hacker: Grammar Breach'},
 {id:'c',title:'Space Inventors: The Galaxy Mission'},
];
const search=query=>cards.filter(item=>matchesActivityTitle(item.title,query));

test('real library search filters 3 → 1 → 0 → 3 without case or word order sensitivity',()=>{
 assert.equal(search('').length,3);
 assert.deepEqual(search('neural tower').map(x=>x.id),['a']);
 assert.deepEqual(search('TOWER NEURAL').map(x=>x.id),['a']);
 assert.deepEqual(search('grammar breach').map(x=>x.id),['b']);
 assert.deepEqual(search('this activity does not exist'),[]);
 assert.equal(search('').length,3);
});

test('Vietnamese diacritics and punctuation normalize consistently',()=>{
 assert.equal(normalizeActivityTitle('ĐỔI MỚI - SÁNG TẠO'), 'doi moi sang tao');
 assert.equal(matchesActivityTitle('Trò chơi sáng tạo', 'tro choi'),true);
 assert.equal(matchesActivityTitle('Artificial Intelligence: Neural Nexus Tower','intelligence neural'),true);
 assert.equal(matchesActivityTitle('Robot Arena: Code & Combat','Code Combat'),true);
 assert.equal(matchesActivityTitle('Grammar Breach','invention'),false);
 assert.equal(matchesActivityTitle('Nothing','   '),true);
});

test('Search UI is wired to controlled React state, focusable across the entire field and shows live result counts',()=>{
 const page=fs.readFileSync(new URL('../src/pages/LessonCheckStudio.jsx',import.meta.url),'utf8');
 assert.match(page,/ref=\{searchInputRef\}/);
 assert.match(page,/onClick=\{event => \{ if \(!event\.target\.closest\('button'\)\) searchInputRef\.current\?\.focus\(\); \}\}/);
 assert.match(page,/onChange=\{\(event\) => setQuery\(event\.target\.value\)\}/);
 assert.match(page,/return matchesActivityTitle\(item\.title, q\)/);
 assert.match(page,/filteredActivities\.length\} kết quả/);
 assert.match(page,/input.*search|type="search"/);
 assert.match(page,/aria-live="polite"/);
});
