
const esc = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const TEXTLAB_TEMPLATES = [
  ['quiz','Quiz Show','Trắc nghiệm','quiz','QUESTION | A | B | C | D | ANSWER'],
  ['true-false','True / False','Đúng hoặc sai','truefalse','STATEMENT | TRUE/FALSE | CORRECTION'],
  ['match-up','Match Up','Nối thuật ngữ','pairs','LEFT | RIGHT'],
  ['matching-pairs','Matching Pairs','Ghép cặp','memory','LEFT | RIGHT'],
  ['memory-match','Memory Match','Ghép cặp ghi nhớ','memory','LEFT | RIGHT'],
  ['find-match','Find the Match','Tìm cặp đúng','pairs','LEFT | RIGHT'],
  ['category-sort','Category Sort','Phân loại theo nhóm','sort','GROUP: item, item, item'],
  ['rank-order','Rank Order','Sắp xếp thứ tự','order','ITEM 1\\nITEM 2\\nITEM 3'],
  ['sentence-builder','Sentence Builder','Ghép câu','sentence','Complete sentence here.'],
  ['paragraph-builder','Paragraph Builder','Sắp xếp đoạn','order','Sentence 1\\nSentence 2\\nSentence 3'],
  ['missing-word','Missing Word','Điền từ','cloze','Sentence with [answer].'],
  ['cloze-passage','Cloze Passage','Đoạn văn điền khuyết','cloze','Passage with [answer] gaps.'],
  ['word-scramble','Word Scramble','Xáo chữ','scramble','WORD | CLUE'],
  ['word-search','Word Search','Tìm từ','wordsearch','WORD, WORD, WORD'],
  ['crossword','Crossword Lite','Ô chữ đơn giản','scramble','WORD | CLUE'],
  ['hangman','Hangman','Đoán từ','hangman','WORD | CLUE'],
  ['bingo','Vocabulary Bingo','Bingo từ vựng','bingo','ITEM, ITEM, ITEM'],
  ['flashcards','Flashcards','Thẻ học','cards','FRONT | BACK'],
  ['spin-selector','Spin Selector','Vòng quay lựa chọn','wheel','ITEM\\nITEM\\nITEM'],
  ['open-box','Open the Box','Mở hộp bí mật','boxes','ITEM\\nITEM\\nITEM'],
  ['flip-tiles','Flip Tiles','Lật ô khám phá','cards','FRONT | BACK'],
  ['random-cards','Random Cards','Thẻ ngẫu nhiên','cards','FRONT | BACK'],
  ['speaking-cards','Speaking Cards','Thẻ nói','cards','PROMPT | SUPPORT'],
  ['evidence-hunt','Evidence Hunt','Tìm bằng chứng','quiz','QUESTION | A | B | C | D | ANSWER'],
  ['reference-chain','Reference Chain','Từ quy chiếu','quiz','QUESTION | A | B | C | D | ANSWER'],
  ['heading-match','Heading Match','Ghép tiêu đề','pairs','HEADING | PARAGRAPH'],
  ['main-idea','Main Idea','Ý chính','quiz','QUESTION | A | B | C | D | ANSWER'],
  ['sentence-insertion','Sentence Insertion','Chèn câu','quiz','QUESTION | A | B | C | D | ANSWER'],
  ['error-correction','Error Correction','Sửa lỗi','truefalse','SENTENCE | FALSE | CORRECTION'],
  ['summary-builder','Summary Builder','Viết tóm tắt','open','PROMPT'],
  ['retelling','Retelling','Kể lại','open','PROMPT'],
  ['creative-ending','Creative Ending','Viết kết thúc','open','PROMPT'],
  ['debate-cards','Debate Cards','Thẻ tranh luận','cards','STATEMENT | SUPPORT'],
  ['one-minute-speaking','One-minute Speaking','Nói một phút','open','PROMPT'],
  ['whack-answer','Whack the Answer','Chọn nhanh đáp án','quiz','QUESTION | A | B | C | D | ANSWER'],
  ['conveyor-memory','Conveyor Memory','Ghi nhớ băng chuyền','cards','FRONT | BACK'],
].map(([id,title,titleVi,kind,format], index) => ({ id,title,titleVi,kind,format,index:index+1 }));

export const sampleFor = (kind) => ({
  quiz: 'TITLE: Healthy Habits\\n\\nWhich habit supports better sleep? | Regular exercise | Late-night gaming | Skipping meals | Excess caffeine | A\\nWhich drink is usually the healthiest choice? | Water | Energy drink | Soda | Syrup | A',
  truefalse: 'TITLE: Healthy Habits\\n\\nRegular physical activity can improve sleep quality. | TRUE | —\\nSkipping breakfast always improves concentration. | FALSE | A balanced breakfast can support concentration.\\nWater is essential for the human body. | TRUE | —',
  pairs: 'TITLE: Environmental Vocabulary\\n\\nrenewable energy | energy from sources that can naturally be replaced\\ncarbon footprint | greenhouse gases produced by a person or activity\\nbiodiversity | variety of living species in an ecosystem',
  memory: 'TITLE: Word Pairs\\n\\nrapid | fast\\nassist | help\\naccurate | correct\\nreliable | dependable',
  sort: 'TITLE: Word Classes\\n\\nNOUNS: decision, achievement, pollution\\nVERBS: decide, achieve, pollute\\nADJECTIVES: decisive, achievable, polluted',
  order: 'TITLE: Making Tea\\n\\nBoil the water.\\nPut tea in the cup.\\nPour in the hot water.\\nWait for three minutes.',
  sentence: 'TITLE: Sentence Builder\\n\\nStudents should develop healthy study habits.',
  cloze: 'TITLE: Complete the Text\\n\\nRegular [exercise] can improve both physical and mental health. A balanced [diet] also provides essential nutrients.',
  scramble: 'TITLE: Word Scramble\\n\\nEDUCATION | the process of teaching and learning\\nSUSTAINABLE | able to continue without harming resources',
  wordsearch: 'TITLE: Environment\\n\\nCLIMATE, ENERGY, FOREST, OCEAN, RECYCLE, SOLAR',
  bingo: 'TITLE: Vocabulary Bingo\\n\\nclimate, energy, recycle, forest, ocean, solar, wind, water, habitat, species, carbon, plastic',
  cards: 'TITLE: Discussion Cards\\n\\nWhat is one healthy habit? | Give a reason and an example.\\nHow can schools reduce waste? | Suggest two practical actions.',
  wheel: 'TITLE: Speaking Wheel\\n\\nDescribe your ideal school.\\nName one environmental problem.\\nExplain a healthy daily routine.\\nTalk about a person you admire.',
  boxes: 'TITLE: Mystery Questions\\n\\nDescribe a memorable lesson.\\nGive three ways to save energy.\\nExplain why teamwork matters.',
  hangman: 'TITLE: Guess the Word\\n\\nBIODIVERSITY | variety of living species\\nEDUCATION | teaching and learning process',
  open: 'TITLE: Writing Task\\n\\nWrite a short response using at least three details from the lesson.'
}[kind] || 'TITLE: My Activity\\n\\nITEM 1\\nITEM 2');

function parse(raw, kind) {
  const lines = String(raw || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const titleLine = lines.find(line => /^title\s*:/i.test(line));
  const title = titleLine ? titleLine.replace(/^title\s*:/i, '').trim() : 'Brian TextLab Activity';
  const body = lines.filter(line => line !== titleLine);
  const splitPipe = line => line.split('|').map(part => part.trim());

  if (kind === 'quiz') {
    return {
      title,
      items: body.map(splitPipe).filter(parts => parts.length >= 3).map(parts => ({
        q: parts[0],
        options: parts.slice(1, -1),
        answer: String(parts[parts.length - 1] || '').toUpperCase()
      }))
    };
  }

  if (kind === 'truefalse') {
    return {
      title,
      items: body.map(splitPipe).filter(parts => parts.length >= 2).map(parts => ({
        q: parts[0],
        answer: /^(true|đúng|dung)$/i.test(parts[1]),
        correction: parts[2] && parts[2] !== '—' ? parts[2] : ''
      }))
    };
  }

  if (['pairs','memory','cards'].includes(kind)) {
    return {
      title,
      items: body.map(splitPipe).filter(parts => parts.length >= 2).map(parts => ({
        a: parts[0],
        b: parts.slice(1).join(' | ')
      }))
    };
  }

  if (kind === 'sort') {
    return {
      title,
      groups: body.map(line => {
        const parts = line.split(':');
        return {
          name: (parts.shift() || '').trim(),
          items: parts.join(':').split(',').map(item => item.trim()).filter(Boolean)
        };
      }).filter(group => group.name && group.items.length)
    };
  }

  if (['order','sentence'].includes(kind)) return { title, items: body };
  if (kind === 'cloze') return { title, text: body.join(' ') };

  if (['scramble','hangman'].includes(kind)) {
    return {
      title,
      items: body.map(splitPipe).map(parts => ({
        word: parts[0] || '',
        clue: parts[1] || ''
      })).filter(item => item.word)
    };
  }

  if (['wordsearch','bingo','wheel','boxes'].includes(kind)) {
    return { title, items: body.join(',').split(',').map(item => item.trim()).filter(Boolean) };
  }

  return { title, prompt: body.join('\n') };
}

const baseCss = `
*{box-sizing:border-box}
:root{--ink:#102235;--blue:#0a84d6;--green:#16834d;--green-bg:#dcf8e8;--red:#b7273e;--red-bg:#ffe1e5;--yellow:#ffd85a}
body{margin:0;background:#eef5fb;color:var(--ink);font:16px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.app{max-width:980px;margin:auto;padding:28px}
.hero,.panel{background:#fff;border:2px solid var(--ink);border-radius:24px;box-shadow:0 8px 0 var(--ink);margin-bottom:20px}
.hero{padding:26px}.eyebrow{font-weight:900;letter-spacing:.15em;color:var(--blue)}
.hero h1{font-size:clamp(30px,6vw,58px);line-height:1;margin:8px 0}
.panel{padding:22px;position:relative;overflow:hidden}
button{font:inherit;font-weight:850;border:2px solid var(--ink);border-radius:999px;padding:12px 18px;background:#fff;cursor:pointer;transition:transform .18s ease,background .18s ease,box-shadow .18s ease}
button:hover{transform:translateY(-2px)}button:disabled{cursor:default}
button.primary{background:var(--ink);color:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
.choice,.card,.tile{border:2px solid #9ab8d0;border-radius:18px;padding:16px;background:#f7fbff}
.choice.correct,.tf-btn.correct{background:var(--green-bg);border-color:var(--green);color:#0c5a34;animation:correctPop .55s ease}
.choice.wrong,.tf-btn.wrong{background:var(--red-bg);border-color:var(--red);color:#851a2c;animation:wrongShake .46s ease}
.choice.reveal,.tf-btn.reveal{box-shadow:0 0 0 4px rgba(22,131,77,.18)}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.score{font-size:22px;font-weight:900}
.feedback{min-height:52px;margin:14px 0 0;border-radius:15px;padding:12px 14px;font-weight:800;display:flex;align-items:center;gap:10px}
.feedback:empty{display:none}.feedback.ok{background:var(--green-bg);color:#0c5a34}.feedback.no{background:var(--red-bg);color:#851a2c}
.progress-shell{height:13px;background:#d8e4ee;border:2px solid var(--ink);border-radius:999px;overflow:hidden;margin:14px 0 22px}
.progress-bar{height:100%;width:0;background:var(--blue);transition:width .45s ease}
.hud{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.hud strong{font-size:20px}
.tf-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tf-btn{border-radius:18px;min-height:74px;font-size:20px}
.question-done{border-color:#85a2b8}
.particle{position:fixed;z-index:9999;width:11px;height:11px;border-radius:3px;pointer-events:none;animation:burst 850ms ease-out forwards}
.finish-overlay{position:fixed;inset:0;background:rgba(7,18,30,.72);display:grid;place-items:center;padding:18px;z-index:9998;animation:fadeIn .25s ease}
.finish-card{width:min(620px,100%);background:#fff;border:3px solid var(--ink);border-radius:28px;box-shadow:0 12px 0 var(--ink);padding:28px;text-align:center;animation:finishPop .45s cubic-bezier(.2,.8,.2,1)}
.finish-icon{font-size:64px;line-height:1}.finish-card h2{font-size:40px;margin:10px 0}
.result-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:22px 0}
.result-box{background:#eef5fb;border:2px solid #9ab8d0;border-radius:16px;padding:14px}
.result-box b{display:block;font-size:28px}.result-box span{color:#52677b;font-weight:700}
.finish-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}
.pair-selected{outline:4px solid #00a7ff}.pair-done{opacity:.35;pointer-events:none}
.order-item{display:flex;gap:10px;align-items:center;margin:8px 0}
.blank{min-width:100px;border:0;border-bottom:3px solid var(--blue);background:#eef7ff;font:inherit;padding:4px 8px}
.wheel{width:300px;height:300px;max-width:80vw;border-radius:50%;border:10px solid var(--ink);display:grid;place-items:center;margin:20px auto;background:conic-gradient(#f65 0 25%,#fc5 0 50%,#6cd 0 75%,#8db 0);font-size:22px;font-weight:900;text-align:center;padding:30px;transition:transform 2s cubic-bezier(.2,.8,.2,1)}
.box{min-height:120px}.memory{min-height:110px;display:grid;place-items:center;font-size:20px;font-weight:900}.memory.revealed{background:#fff4c8}
.open-answer{width:100%;min-height:180px;padding:14px;font:inherit;border:2px solid var(--ink);border-radius:16px}
@keyframes correctPop{0%{transform:scale(1)}45%{transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes wrongShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-9px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(4px)}}
@keyframes burst{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(540deg)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes finishPop{from{opacity:0;transform:scale(.78) translateY(30px)}to{opacity:1;transform:scale(1) translateY(0)}}
@media(max-width:600px){.app{padding:12px}.panel,.hero{border-radius:16px;padding:16px}.result-grid{grid-template-columns:1fr}.tf-actions{grid-template-columns:1fr}}
`;

const shell = (data, inner, script = '') => `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(data.title)}</title>
  <style>${baseCss}</style>
</head>
<body>
  <main class="app">
    <header class="hero">
      <div class="eyebrow">BRIAN TEXTLAB · OFFLINE HTML</div>
      <h1>${esc(data.title)}</h1>
      <p>Không AI · Hoạt động chạy trực tiếp trên trình duyệt</p>
    </header>
    ${inner}
  </main>
  <script>${script}<\/script>
</body>
</html>`;

function commonGameScript(total) {
  return `
const TOTAL=${total};
let answered=0,score=0,wrong=0;
const updateHud=()=>{
  const pct=TOTAL?Math.round(answered/TOTAL*100):0;
  const bar=document.getElementById('progressBar');
  const hud=document.getElementById('hudText');
  if(bar)bar.style.width=pct+'%';
  if(hud)hud.textContent='Đã trả lời '+answered+'/'+TOTAL+' · Điểm '+score;
};
const burst=(target,good)=>{
  const r=target.getBoundingClientRect();
  const colors=good?['#17a05d','#0a84d6','#ffd85a','#ff7a59']:['#b7273e','#ff8fa0','#102235'];
  for(let i=0;i<(good?28:12);i++){
    const p=document.createElement('i');
    p.className='particle';
    p.style.left=(r.left+r.width/2)+'px';
    p.style.top=(r.top+r.height/2)+'px';
    p.style.background=colors[i%colors.length];
    p.style.setProperty('--dx',((Math.random()-.5)*260)+'px');
    p.style.setProperty('--dy',((Math.random()-.65)*250)+'px');
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),900);
  }
};
const finish=()=>{
  const percent=TOTAL?Math.round(score/TOTAL*100):0;
  const icon=percent===100?'🏆':percent>=80?'🌟':percent>=60?'👍':'💪';
  const title=percent===100?'Xuất sắc!':percent>=80?'Rất tốt!':percent>=60?'Hoàn thành tốt':'Hãy thử lại nhé!';
  const overlay=document.createElement('div');
  overlay.className='finish-overlay';
  overlay.innerHTML='<section class="finish-card" role="dialog" aria-modal="true">'+
    '<div class="finish-icon">'+icon+'</div>'+
    '<h2>'+title+'</h2>'+
    '<p>Bạn đã hoàn thành toàn bộ hoạt động.</p>'+
    '<div class="result-grid">'+
      '<div class="result-box"><b>'+score+'/'+TOTAL+'</b><span>Điểm số</span></div>'+
      '<div class="result-box"><b>'+percent+'%</b><span>Tỷ lệ đúng</span></div>'+
      '<div class="result-box"><b>'+wrong+'</b><span>Câu chưa đúng</span></div>'+
    '</div>'+
    '<div class="finish-actions"><button class="primary" id="playAgain">↻ Chơi lại</button><button id="reviewGame">Xem lại bài</button></div>'+
  '</section>';
  document.body.appendChild(overlay);
  overlay.querySelector('#playAgain').onclick=()=>location.reload();
  overlay.querySelector('#reviewGame').onclick=()=>overlay.remove();
  if(percent>=80)burst(overlay.querySelector('.finish-card'),true);
};
updateHud();
`;
}

function quizHtml(data) {
  const items = data.items || [];
  const questions = items.map((item, index) => `
    <section class="panel q" data-answer="${esc(String(item.answer).toUpperCase())}">
      <h2>${index + 1}. ${esc(item.q)}</h2>
      <div class="grid">
        ${item.options.map((option, optionIndex) => {
          const key = String.fromCharCode(65 + optionIndex);
          return `<button class="choice" data-key="${key}">${key}. ${esc(option)}</button>`;
        }).join('')}
      </div>
      <p class="feedback" aria-live="polite"></p>
    </section>`).join('');

  const script = commonGameScript(items.length) + `
document.querySelectorAll('.q').forEach(question=>{
  question.querySelectorAll('.choice').forEach(button=>{
    button.onclick=()=>{
      if(question.dataset.done)return;
      question.dataset.done='1';
      answered++;
      const ok=button.dataset.key===question.dataset.answer;
      if(ok)score++;else wrong++;
      button.classList.add(ok?'correct':'wrong');
      question.classList.add('question-done');
      question.querySelectorAll('.choice').forEach(choice=>{
        choice.disabled=true;
        if(choice.dataset.key===question.dataset.answer)choice.classList.add('correct','reveal');
      });
      const feedback=question.querySelector('.feedback');
      feedback.className='feedback '+(ok?'ok':'no');
      feedback.textContent=ok?'✓ Chính xác!':'✗ Chưa đúng. Đáp án đúng là '+question.dataset.answer+'.';
      burst(button,ok);
      updateHud();
      if(answered===TOTAL)setTimeout(finish,700);
    };
  });
});`;

  return shell(data, `
    <section class="panel">
      <div class="hud"><strong id="hudText"></strong><span>Hoàn thành tất cả câu để xem tổng kết</span></div>
      <div class="progress-shell"><div id="progressBar" class="progress-bar"></div></div>
    </section>
    ${questions}`, script);
}

function trueFalseHtml(data) {
  const items = data.items || [];
  const questions = items.map((item, index) => `
    <section class="panel tf" data-answer="${item.answer ? 'true' : 'false'}" data-correction="${esc(item.correction)}">
      <h2>${index + 1}. ${esc(item.q)}</h2>
      <div class="tf-actions">
        <button class="tf-btn" data-v="true">✓ ĐÚNG</button>
        <button class="tf-btn" data-v="false">✕ SAI</button>
      </div>
      <p class="feedback" aria-live="polite"></p>
    </section>`).join('');

  const script = commonGameScript(items.length) + `
document.querySelectorAll('.tf').forEach(question=>{
  question.querySelectorAll('.tf-btn').forEach(button=>{
    button.onclick=()=>{
      if(question.dataset.done)return;
      question.dataset.done='1';
      answered++;
      const ok=button.dataset.v===question.dataset.answer;
      if(ok)score++;else wrong++;
      button.classList.add(ok?'correct':'wrong');
      question.classList.add('question-done');
      question.querySelectorAll('.tf-btn').forEach(choice=>{
        choice.disabled=true;
        if(choice.dataset.v===question.dataset.answer)choice.classList.add('correct','reveal');
      });
      const feedback=question.querySelector('.feedback');
      feedback.className='feedback '+(ok?'ok':'no');
      const correction=question.dataset.correction;
      feedback.textContent=ok
        ? '✓ Chính xác! Bạn đã chọn đúng.'
        : '✗ Chưa đúng.'+(correction?' Sửa lại: '+correction:' Đáp án đúng là '+(question.dataset.answer==='true'?'ĐÚNG':'SAI')+'.');
      burst(button,ok);
      updateHud();
      if(answered===TOTAL)setTimeout(finish,700);
    };
  });
});`;

  return shell(data, `
    <section class="panel">
      <div class="hud"><strong id="hudText"></strong><span>Chọn Đúng hoặc Sai cho từng nhận định</span></div>
      <div class="progress-shell"><div id="progressBar" class="progress-bar"></div></div>
    </section>
    ${questions}`, script);
}

function pairsHtml(data, memory = false) {
  const items = data.items || [];
  let cards = [];
  items.forEach((item, index) => {
    cards.push({ text:item.a, key:index, side:'a' });
    cards.push({ text:item.b, key:index, side:'b' });
  });
  cards.sort(() => Math.random() - 0.5);

  if (memory) {
    return shell(data, `
      <section class="panel">
        <div class="grid">${cards.map(card => `<button class="memory" data-k="${card.key}" data-t="${esc(card.text)}">?</button>`).join('')}</div>
        <p id="status" class="score"></p>
      </section>`, `
let first=null,lock=false,done=0;
document.querySelectorAll('.memory').forEach(card=>{
  card.onclick=()=>{
    if(lock||card.classList.contains('pair-done')||card===first)return;
    card.textContent=card.dataset.t;
    card.classList.add('revealed');
    if(!first){first=card;return;}
    if(first.dataset.k===card.dataset.k){
      first.classList.add('pair-done');card.classList.add('pair-done');
      done+=2;first=null;
      document.getElementById('status').textContent='Đã ghép '+(done/2)+'/${items.length} cặp';
      if(done===${cards.length})setTimeout(()=>alert('Hoàn thành! Bạn đã ghép đúng tất cả các cặp.'),250);
    }else{
      lock=true;
      setTimeout(()=>{first.textContent='?';card.textContent='?';first.classList.remove('revealed');card.classList.remove('revealed');first=null;lock=false;},800);
    }
  };
});`);
  }

  return shell(data, `
    <section class="panel">
      <div class="grid">${cards.map(card => `<button class="tile" data-k="${card.key}" data-s="${card.side}">${esc(card.text)}</button>`).join('')}</div>
      <p id="status" class="score">Chọn hai thẻ tương ứng.</p>
    </section>`, `
let first=null,done=0;
document.querySelectorAll('.tile').forEach(card=>{
  card.onclick=()=>{
    if(card.classList.contains('pair-done'))return;
    if(!first){first=card;card.classList.add('pair-selected');return;}
    if(first!==card&&first.dataset.k===card.dataset.k&&first.dataset.s!==card.dataset.s){
      first.classList.remove('pair-selected');first.classList.add('pair-done');card.classList.add('pair-done');
      done++;document.getElementById('status').textContent='Đúng! '+done+'/${items.length} cặp';first=null;
    }else{first.classList.remove('pair-selected');first=card;card.classList.add('pair-selected');}
  };
});`);
}

function genericHtml(data, kind) {
  if (kind === 'cloze') {
    let answers = [];
    const html = esc(data.text || '').replace(/\[([^\]]+)\]/g, (_, answer) => {
      answers.push(answer);
      return `<input class="blank" data-a="${esc(answer)}">`;
    });
    return shell(data, `<section class="panel"><p style="font-size:22px">${html}</p><div class="toolbar"><button class="primary" id="check">Kiểm tra</button><span id="score" class="score"></span></div></section>`, `
document.getElementById('check').onclick=()=>{
  let score=0;
  document.querySelectorAll('.blank').forEach(input=>{
    const ok=input.value.trim().toLowerCase()===input.dataset.a.toLowerCase();
    input.style.background=ok?'#dcf8e8':'#ffe1e5';
    if(ok)score++;
  });
  document.getElementById('score').textContent='Điểm: '+score+'/${answers.length}';
};`);
  }

  if (kind === 'wheel') {
    const items = data.items || [];
    return shell(data, `<section class="panel"><div id="wheel" class="wheel">Nhấn quay</div><div class="toolbar"><button class="primary" id="spin">QUAY</button></div></section>`, `
const items=${JSON.stringify(items)};
let rotation=0;
document.getElementById('spin').onclick=()=>{
  rotation+=720+Math.floor(Math.random()*720);
  const wheel=document.getElementById('wheel');
  wheel.style.transform='rotate('+rotation+'deg)';
  setTimeout(()=>wheel.textContent=items[Math.floor(Math.random()*items.length)]||'Không có mục',2000);
};`);
  }

  if (kind === 'cards' || kind === 'boxes') {
    const items = data.items || [];
    return shell(data, `<section class="panel"><div class="grid">${items.map((item, index) => `<button class="${kind==='boxes'?'box':'card'}" data-front="${esc(item.a || ('Hộp '+(index+1)))}" data-back="${esc(item.b || item)}">${esc(kind==='boxes' ? ('Hộp '+(index+1)) : (item.a || item))}</button>`).join('')}</div></section>`, `
document.querySelectorAll('[data-back]').forEach(card=>{
  card.onclick=()=>{
    const open=card.dataset.open==='1';
    card.dataset.open=open?'0':'1';
    card.textContent=open?card.dataset.front:card.dataset.back;
  };
});`);
  }

  const text = esc(data.prompt || (data.items || []).map(item => item.word || item).join('\n'));
  return shell(data, `<section class="panel"><pre style="white-space:pre-wrap;font:inherit">${text}</pre></section>`);
}

export function buildInteractiveHtml(template, raw) {
  const data = parse(raw, template.kind);
  switch (template.kind) {
    case 'quiz': return quizHtml(data);
    case 'truefalse': return trueFalseHtml(data);
    case 'pairs': return pairsHtml(data, false);
    case 'memory': return pairsHtml(data, true);
    default: return genericHtml(data, template.kind);
  }
}

export function downloadHtml(filename, html) {
  const blob = new Blob([html], { type:'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
