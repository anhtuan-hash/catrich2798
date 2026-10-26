import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,sanitizeState,storageKey} from '../src/components/BrianInstantTools/instantToolsCore.mjs';
import {normalizeQuickUrl,textStats,transformText,calculate,sanitizeWave3} from '../src/components/BrianInstantTools/instantToolsWave3Core.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const start=initialState();
assert.equal(start.notes.items.length,0);
assert.equal(start.quickLinks.items.length,0);
assert.equal(start.checklist.items.length,0);
assert.equal(start.calculator.expression,'');
assert.equal(start.textTools.text,'');
assert.equal(storageKey('teacher-1'),'bes:instant-tools:v1:teacher-1');
assert.notEqual(storageKey('teacher-1'),storageKey('teacher-2'));
assert.equal(normalizeQuickUrl('https://example.com/test'),'https://example.com/test');
assert.equal(normalizeQuickUrl('http://example.com'),'http://example.com/');
for(const unsafe of ['javascript:alert(1)','data:text/html,<svg>','file:///tmp/a','ftp://example.com','https://user:pass@example.com','https://','', 'x'.repeat(501)])
  assert.equal(normalizeQuickUrl(unsafe),null,unsafe);
assert.equal(calculate('(5+7)*2'),24);
assert.equal(calculate('25%'),.25);
assert.equal(calculate('200*15%'),30);
assert.equal(calculate('10-(-3)'),13);
assert.equal(calculate('9÷3'),3);
assert.equal(calculate('1.2 + 3.4'),4.6);
assert.equal(calculate('5×(-2)'),-10);
assert.equal(calculate('3 + 4 * 2'),11);
assert.equal(calculate('0.1+0.2'),.3);
for(const syntax of ['alert(1)','2**3','3//2','(',')','1+','a+5','1;console.log(2)']){
  assert.throws(()=>calculate(syntax),/SYNTAX/);
}
assert.throws(()=>calculate('4/0'),/DIV_ZERO/);
assert.throws(()=>calculate('2/(3-3)'),/DIV_ZERO/);
assert.throws(()=>calculate('1e20'),/SYNTAX/);
assert.deepEqual(textStats('One two. Three!'),{words:3,chars:15,charsNoSpaces:13,sentences:2,paragraphs:1});
assert.equal(transformText(' hello   world  ','trim'),'hello world');
assert.equal(transformText('Hello WoRLD','lower'),'hello world');
assert.equal(transformText('abc xyz','upper'),'ABC XYZ');
assert.equal(transformText('hELLO wORLD','title'),'Hello World');
assert.equal(sanitizeWave3({notes:{items:[{id:'a',title:'A',body:'body',color:'mint'}]}}).notes.items[0].color,'mint');
const raw={
 notes:{items:Array.from({length:44},(_,i)=>({id:'id'+i,title:'T'.repeat(100),body:'A'.repeat(5000),color:'unknown'}))},
 textTools:{text:'a'.repeat(21000)},calculator:{expression:'1'.repeat(130),history:Array.from({length:15},()=>({expression:'1+1',result:'2'}))},
 quickLinks:{items:[{id:'bad',title:'bad',url:'javascript:alert(1)'},{id:'okay',title:'good',url:'https://example.com'}]},
 checklist:{items:Array.from({length:66},(_,i)=>({id:'t'+i,text:'X'.repeat(175),done:1}))}
};
const safe=sanitizeWave3(raw);
assert.equal(safe.notes.items.length,35);
assert.equal(safe.notes.items[0].body.length,4000);
assert.equal(safe.notes.items[0].title.length,80);
assert.equal(safe.notes.items[0].color,'sun');
assert.equal(safe.textTools.text.length,20000);
assert.equal(safe.calculator.expression.length,120);
assert.equal(safe.calculator.history.length,10);
assert.equal(safe.quickLinks.items.length,1);
assert.equal(safe.checklist.items.length,60);
assert.equal(safe.checklist.items[0].done,false);
const old={version:1,state:{dice:{count:4,values:[3,4],history:[]},bigText:{text:'Wave2 title',fontSize:140},teleprompter:{script:'Wave2 script'},scoreboard:{teams:[{name:'A',score:15},{name:'B',score:0}]}}};
const upgraded=sanitizeState(old);
assert.equal(upgraded.dice.count,4);
assert.equal(upgraded.bigText.text,'Wave2 title');
assert.equal(upgraded.scoreboard.teams[0].score,15);
assert.equal(upgraded.notes.items.length,0);
const restored=sanitizeState({version:1,state:{notes:{items:[{id:'a',title:'Note',body:'Private',color:'rose'}]},quickLinks:{items:[{id:'x',title:'site',url:'https://example.com'}]}}});
assert.equal(restored.notes.items[0].body,'Private');
assert.equal(restored.quickLinks.items[0].url,'https://example.com/');
const ui=read('src/components/BrianInstantTools/BrianInstantTools.jsx');
const w3=read('src/components/BrianInstantTools/BrianInstantToolsWave3.jsx');
const css=read('src/components/BrianInstantTools/BrianInstantToolsWave3.css');
const main=read('src/main.jsx');
assert.ok(ui.includes('...WAVE3_LIBRARY'));
assert.ok(ui.includes("subtitle:'15 công cụ"));
assert.ok(ui.includes('bit-w3-pinned'));
for(const part of ['Notes','TextTools','CalculatorTool','QuickLinks','Checklist'])assert.ok(w3.includes('function '+part+'('),part);
assert.match(w3,/rel="noopener noreferrer"/);
assert.match(w3,/aria-pressed/);
assert.match(css,/@media\(max-width:650px\)/);
assert.doesNotMatch(w3,/eval\(|new Function|dangerouslySetInnerHTML|supabase\.|fetch\(/);
for(const id of ['global-brian-focus','global-brian-teaching-board','shared-chatbot-drawer','ttcm-approval-inbox'])assert.ok(main.includes(id));
console.log('PASS Wave 3: arithmetic security, text statistics, URL filtering, bounded storage, notes/checklists, Wave1&2 migration.');
