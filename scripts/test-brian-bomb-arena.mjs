import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createArena,arenaReducer,rankTeams,ARENA_MODES,generateTileEvents,pointsForEvent,TILE_ICONS} from '../src/components/BrianBombArena/arenaEngine.js';
import {SAMPLE_PACKS,getSamplePack,packToText,parseArenaQuestions,toArenaCSV,EMPTY_CSV_TEMPLATE} from '../src/components/BrianBombArena/arenaSamplePacks.js';
import {createArenaSound,BOMB_SOUND_STYLES} from '../src/components/BrianBombArena/arenaSound.js';

const check=(label,run)=>{run();console.log('✓ '+label);};
const apply=(game,action)=>arenaReducer(game,action);
const running=(mode='luck')=>apply(createArena({mode,size:5,teamCount:2}),{type:'START'});

check('Every generated tile in 4x4/5x5/6x6 is a number or a bomb across four modes',()=>{
  for(const mode of ARENA_MODES)for(const size of [4,5,6]){
    const s=createArena({mode,size,teamCount:8,ownerId:'teacher-1'},()=>0.25);
    assert.equal(s.ruleVersion,4);
    assert.equal(s.tiles.length,size*size);
    assert.equal(new Set(s.tiles.map(t=>t.label)).size,size*size);
    assert.equal(s.teams.length,8);assert.equal(s.ownerId,'teacher-1');
    assert.equal(s.questionGate,mode==='challenge');
    assert.ok(s.tiles.every(t=>t.event==='bomb'||t.event==='blocked'||[10,20,30,50,100].includes(pointsForEvent(t.event))));
    const bombs=s.tiles.filter(t=>t.event==='bomb').length;
    const scores=s.tiles.filter(t=>pointsForEvent(t.event)>0).length;
    assert.equal(bombs,scores);
    assert.equal(bombs,size===4?8:size===5?12:18);
    assert.equal(s.tiles.filter(t=>t.event==='blocked').length,size===5?1:0);
    if(size===5){
      assert.equal(s.tiles[12].event,'blocked');
      assert.equal(s.tiles[12].opened,true);
    }
    assert.ok(s.tiles.some(t=>t.event==='bomb'));
    assert.equal(s.tiles.filter(t=>t.event==='bomb').length,
      generateTileEvents(mode,size*size,()=>0.1).filter(k=>k==='bomb').length);
  }
});
check('All modes have exact 1:1 bomb/score balance, including odd 5x5 locked centre',()=>{
  for(const size of [4,5,6]){
    const count=size*size;
    const target=(count-(count%2))/2;
    for(const mode of ARENA_MODES){
      const values=generateTileEvents(mode,count,()=>.5);
      assert.equal(values.filter(x=>x==='bomb').length,target);
      assert.equal(values.filter(x=>pointsForEvent(x)>0).length,target);
      assert.equal(values.filter(x=>x==='blocked').length,count%2);
      if(size===5)assert.equal(values[12],'blocked');
    }
  }
  assert.equal(TILE_ICONS.points10,'10');assert.equal(TILE_ICONS.points100,'100');
});
check('Classic adds points to secured score, advances and never reopens an exposed tile',()=>{
  const s=running('classic');s.tiles[0].event='points20';
  const result=apply(s,{type:'SELECT',index:0});
  assert.equal(result.tiles[0].opened,true);assert.equal(result.teams[0].score,20);
  assert.equal(result.turn,1);
  assert.equal(apply(result,{type:'SELECT',index:0}),result);
});
check('Classic bomb ends turn without destroying previously banked scores',()=>{
  const s=running('classic');s.teams[0].score=150;s.tiles[0].event='bomb';
  const next=apply(s,{type:'SELECT',index:0});
  assert.equal(next.teams[0].score,150);assert.equal(next.turn,1);
  assert.equal(next.last.event,'bomb');
});
check('Chaos bomb deducts 50 but never makes secured score negative',()=>{
  const s=running('chaos');s.teams[0].score=20;s.tiles[0].event='bomb';
  const next=apply(s,{type:'SELECT',index:0});
  assert.equal(next.teams[0].score,0);assert.equal(next.turn,1);
});
check('Press Your Luck adds numeric tiles to POT and not to secured score',()=>{
  const s=running('luck');s.tiles[0].event='points10';s.tiles[1].event='points30';
  const first=apply(s,{type:'SELECT',index:0});
  assert.equal(first.teams[0].bank,10);assert.equal(first.teams[0].score,0);assert.equal(first.turn,0);
  const second=apply(first,{type:'SELECT',index:1});
  assert.equal(second.teams[0].bank,40);assert.equal(second.turn,0);
});
check('Bank moves POT into score exactly once and transfers turn',()=>{
  const s=running('luck');s.tiles[0].event='points50';
  const earned=apply(s,{type:'SELECT',index:0});
  const banked=apply(earned,{type:'BANK'});
  assert.equal(banked.teams[0].score,50);assert.equal(banked.teams[0].bank,0);
  assert.equal(banked.turn,1);assert.equal(banked.last.event,'bank');assert.equal(banked.last.points,50);
  assert.equal(apply(banked,{type:'BANK'}),banked);
});
check('Bomb wipes only unbanked POT, keeps past BANK and ends turn',()=>{
  const s=running('luck');s.teams[0].score=70;s.tiles[0].event='points30';s.tiles[1].event='bomb';
  const earned=apply(s,{type:'SELECT',index:0});
  const bombed=apply(earned,{type:'SELECT',index:1});
  assert.equal(bombed.teams[0].bank,0);assert.equal(bombed.teams[0].score,70);
  assert.equal(bombed.turn,1);assert.equal(bombed.last.event,'bomb');
  assert.equal(bombed.last.potBefore,30);
});
check('Undo and Redo restore an exploded POT, the tile and current team',()=>{
  const s=running('luck');s.tiles[0].event='points20';s.tiles[1].event='bomb';
  const earned=apply(s,{type:'SELECT',index:0});
  const bombed=apply(earned,{type:'SELECT',index:1});
  const undone=apply(bombed,{type:'UNDO'});
  assert.equal(undone.teams[0].bank,20);assert.equal(undone.tiles[1].opened,false);
  assert.equal(undone.turn,0);
  const redone=apply(undone,{type:'REDO'});
  assert.equal(redone.teams[0].bank,0);assert.equal(redone.tiles[1].opened,true);
  assert.equal(redone.turn,1);
});
check('A teacher cannot swap teams or advance while POT is unbanked',()=>{
  const s=running('luck');s.tiles[0].event='points100';
  const earned=apply(s,{type:'SELECT',index:0});
  assert.equal(apply(earned,{type:'TEAM',index:1}),earned);
  assert.equal(apply(earned,{type:'NEXT'}),earned);
});
check('Question Gate requires teacher confirmation and wrong answer loses pending POT',()=>{
  const s=apply(createArena({mode:'challenge',teamCount:2}),{type:'START'});
  const selected=apply(s,{type:'SELECT',index:0});
  assert.equal(selected.selectedTile,0);assert.equal(selected.tiles[0].opened,false);
  assert.equal(apply(selected,{type:'ANSWER',correct:false}).turn,1);
  assert.equal(apply(selected,{type:'ANSWER',correct:true}).tiles[0].opened,true);
  const luck=running('luck');luck.questionGate=true;luck.teams[0].bank=80;
  const pick=apply(luck,{type:'SELECT',index:0});
  const failed=apply(pick,{type:'ANSWER',correct:false});
  assert.equal(failed.teams[0].bank,0);assert.equal(failed.turn,1);
});
check('Final tile and manual finish secure outstanding POTs',()=>{
  const s=running('luck');s.tiles.forEach((cell,i)=>{cell.opened=i!==0;});
  s.tiles[0].event='points10';s.teams[1].bank=200;
  const final=apply(s,{type:'SELECT',index:0});
  assert.equal(final.phase,'finished');assert.equal(final.teams[1].score,200);
  assert.equal(final.teams[1].bank,0);assert.equal(final.teams[0].score,10);
  const manual=running('luck');manual.teams[0].bank=40;
  assert.equal(apply(manual,{type:'FINISH'}).teams[0].score,40);
});
check('Existing v1 special tiles still load and work without new-board generation',()=>{
  const s=running('luck');s.tiles[0].event='shield';
  assert.equal(apply(s,{type:'SELECT',index:0}).teams[0].shields,1);
});
check('Ranking is stable and non-mutating',()=>{
  const teams=[{id:'a',name:'Alpha',score:25},{id:'b',name:'Beta',score:40}];
  assert.equal(rankTeams(teams)[0].id,'b');assert.equal(teams[0].id,'a');
});
check('Portal, audio, FX and existing Focus/Board are wired, with reduced-motion support',()=>{
  const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
  const main=read('src/main.jsx');
  const bubble=read('src/components/BrianBombArena/BrianBombArena.jsx');
  const css=read('src/components/BrianBombArena/BrianBombArena.css');
  const sound=read('src/components/BrianBombArena/arenaSound.js');
  const effect=read('src/components/BrianBombArena/ArenaEffects.jsx');
  assert.match(main,/<BrianBombArena currentUser=\{currentUser\} language=\{language\}/);
  assert.match(main,/<BrianFocus currentUser=\{currentUser\} language=\{language\} performance=\{resolvedPerformance\}/);
  assert.match(main,/<BrianBoard currentUser=\{currentUser\} language=\{language\}/);
  assert.match(bubble,/onClick=\{bankTurn\}/);assert.match(bubble,/revealFx\(tile\)/);
  assert.match(bubble,/ArenaEffects fx=\{fx\}/);assert.match(bubble,/useState\('luck'\)/);
  assert.match(css,/bba-fx-shock/);assert.match(css,/bba-fx-spark/);
  assert.match(css,/prefers-reduced-motion/);assert.match(css,/safe-area-inset/);
  assert.match(css,/body:not\(:has\(\.bes-approval-root\)\) \.bba-bubble/);
  assert.match(sound,/createArenaSound/);assert.match(sound,/createBufferSource/);
  assert.match(effect,/bba-fx-shockwave/);assert.match(effect,/bba-fx-confetti/);
});
console.log('PASS: Bomb Arena v2 numbers/POT/BANK, explosions, fireworks and Focus/Board contract.');

check('Three grade-focused sample banks contain 36 complete, unique questions each',()=>{
  assert.equal(SAMPLE_PACKS.length,3);
  assert.equal(SAMPLE_PACKS.reduce((n,p)=>n+p.count,0),108);
  for(const pack of SAMPLE_PACKS){
    assert.equal(pack.count,36);
    assert.ok(pack.items.every(q=>q.prompt.length>10&&q.answer.length>0));
    assert.equal(new Set(pack.items.map(q=>q.prompt.toLowerCase())).size,36);
    assert.equal(getSamplePack(pack.id).id,pack.id);
  }
});
check('One-click sample pack text parses all answers without dropping any question',()=>{
  for(const pack of SAMPLE_PACKS){
    const parsed=parseArenaQuestions(packToText(pack));
    assert.equal(parsed.length,pack.count);
    assert.equal(parsed[0].answer,pack.items[0].answer);
    assert.equal(parsed[parsed.length-1].prompt,pack.items[pack.items.length-1].prompt);
  }
});
check('Exported UTF-8 CSV round trips punctuation, quotes and commas correctly',()=>{
  const questions=[
    {prompt:'What does "reduce, reuse, recycle" mean?',answer:'Reduce waste, reuse materials'},
    {prompt:'Complete: I have lived here ___ 2020.',answer:'since'},
  ];
  const csv=toArenaCSV(questions);
  const parsed=parseArenaQuestions(csv);
  assert.equal(parsed.length,2);
  assert.equal(parsed[0].prompt,questions[0].prompt);
  assert.equal(parsed[0].answer,questions[0].answer);
  assert.equal(parsed[1].answer,'since');
  assert.equal(parseArenaQuestions(EMPTY_CSV_TEMPLATE).length,0);
});
check('Audio engine defines three classroom-safe profiles and a callable preview',()=>{
  assert.equal(BOMB_SOUND_STYLES.length,4);
  assert.equal(BOMB_SOUND_STYLES[0].id,'recorded');
  assert.ok(BOMB_SOUND_STYLES.some(x=>x.id==='cinematic'));
  assert.ok(BOMB_SOUND_STYLES.some(x=>x.id==='arcade'));
  assert.ok(BOMB_SOUND_STYLES.some(x=>x.id==='gentle'));
  const source=readFileSync(new URL('../src/components/BrianBombArena/arenaSound.js',import.meta.url),'utf8');
  assert.match(source,/createDynamicsCompressor/);
  assert.match(source,/function cinematic/);
  assert.match(source,/function arcade/);
  assert.match(source,/function gentle/);
  assert.match(source,/createBufferSource/);
  assert.match(source,/RECORDED_EXPLOSION_URL/);
  assert.match(source,/new Audio\(\)/);
  assert.match(source,/media\.play\(\)/);
  const service=createArenaSound();
  assert.equal(typeof service.play,'function');
  assert.equal(typeof service.close,'function');
});
check('UI exposes quick sample import, CSV template, sound preview and loudness',()=>{
  const ui=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.css',import.meta.url),'utf8');
  assert.match(ui,/onClick=\{importSamplePack\}/);
  assert.match(ui,/onClick=\{\(\)=>exportQuestionCSV\('pack'\)\}/);
  assert.match(ui,/onClick=\{\(\)=>exportQuestionCSV\('template'\)\}/);
  assert.match(ui,/onClick=\{\(\)=>playSound\('bomb'\)\}/);
  assert.match(ui,/BOMB_SOUND_STYLES\.map/);
  assert.match(ui,/parseArenaQuestions\(questionText\)/);
  assert.match(css,/bba-sample-actions/);
  assert.match(css,/bba-sound-settings/);
  assert.match(css,/bba-hover-tremble/);
  assert.match(css,/not\(:disabled\):hover/);
  assert.match(css,/animation:bba-hover-tremble \.13s linear infinite/);
  assert.match(css,/pointer:fine/);
  assert.match(ui,/tile\.event==='blocked'/);
  assert.match(ui,/ruleVersion!==4/);
});
check('Locked centre tile is not actionable or counted as a scoring question',()=>{
  const s=apply(createArena({mode:'luck',size:5}),{type:'START'});
  const originalBank=s.teams[0].bank;
  const next=apply(s,{type:'SELECT',index:12});
  assert.equal(next,s);
  assert.equal(next.teams[0].bank,originalBank);
  assert.equal(next.tiles.filter(tile=>!tile.opened).length,24);
});
console.log('PASS: Bomb Arena v3 sound presets and 108 quick-import sample questions.');
check('V5 shake uses nonmoving button hitbox, WAAPI and immediate mouseleave cleanup',()=>{
  const ui=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.css',import.meta.url),'utf8');
  assert.match(ui,/hoverAnimations=useRef\(new Map\(\)\)/);
  assert.match(ui,/onMouseEnter=\{event=>startTileShake\(event,tile.id\)\}/);
  assert.match(ui,/onMouseLeave=\{event=>stopTileShake\(tile.id,event\)\}/);
  assert.match(ui,/surface\.animate\(\[/);
  assert.match(ui,/iterations:Infinity/);
  assert.match(ui,/current\.cancel\(\)/);
  assert.match(ui,/className="bba-tile-visual"/);
  assert.match(ui,/aria-pressed=\{shakeEnabled\}/);
  assert.match(css,/\.bba-shell \.bba-tile\.is-hidden:hover\{/);
  assert.match(css,/transform:none!important/);
  assert.match(css,/\.bba-tile-visual\{/);
  assert.match(css,/pointer-events:none!important/);
  assert.match(css,/bba-shake-face \.19s linear infinite/);
  assert.match(css,/bba-shake-toggle/);
  assert.match(css,/\.bba-tile\.is-hover-shaking\.is-hidden:not\(:disabled\):hover \.bba-tile-visual/);
});
console.log('PASS: Bomb Arena v5 pointer-safe continuous tile shake regression checks.');


