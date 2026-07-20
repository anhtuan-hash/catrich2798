
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

export const TEXTLAB_SAMPLE_DATA = {
  "quiz": "TITLE: Healthy Lifestyle Quiz\n\nWhich habit is most likely to improve sleep quality? | Exercising regularly | Using a phone in bed | Drinking coffee late at night | Skipping dinner | A\nWhich drink is generally the best choice for daily hydration? | Water | Energy drink | Soft drink | Sweetened tea | A\nWhat should students do before an important test? | Review key ideas | Stay awake all night | Skip breakfast | Avoid all breaks | A",
  "true-false": "TITLE: Healthy Habits\n\nRegular physical activity can improve sleep quality. | TRUE | —\nSkipping breakfast always improves concentration. | FALSE | A balanced breakfast can support concentration.\nWater is essential for normal body functions. | TRUE | —\nUsing digital devices immediately before sleep always helps people relax. | FALSE | Screen light may make it harder to fall asleep.",
  "match-up": "TITLE: Environmental Vocabulary\n\nrenewable energy | energy from sources that can naturally be replaced\ncarbon footprint | the amount of greenhouse gases produced by an activity\nbiodiversity | the variety of living species in an ecosystem\nconservation | the protection of natural resources and wildlife",
  "matching-pairs": "TITLE: Academic Word Pairs\n\nanalyse | examine something carefully\nevaluate | judge the quality or value of something\njustify | give reasons or evidence\nsummarise | present the main points briefly",
  "memory-match": "TITLE: Synonym Memory Match\n\nrapid | fast\nassist | help\naccurate | correct\nreliable | dependable\nsignificant | important\npurchase | buy",
  "find-match": "TITLE: Find the Correct Collocation\n\nmake | a decision\ntake | responsibility\nconduct | research\nraise | awareness\nreach | a conclusion\nmeet | a deadline",
  "category-sort": "TITLE: Sort the Word Classes\n\nNOUNS: decision, achievement, pollution, confidence\nVERBS: decide, achieve, pollute, encourage\nADJECTIVES: decisive, achievable, polluted, confident\nADVERBS: decisively, successfully, seriously, confidently",
  "rank-order": "TITLE: Steps for Writing an Email\n\nWrite a clear subject line.\nOpen with an appropriate greeting.\nState the purpose of the email.\nProvide the necessary details.\nClose politely and add your name.",
  "sentence-builder": "TITLE: Sentence Builder\n\nStudents should develop healthy study habits.\nTechnology can support independent learning.\nRegular practice helps learners improve accuracy.\nSchools should encourage responsible use of social media.",
  "paragraph-builder": "TITLE: Build a Cause-and-Effect Paragraph\n\nMany students do not get enough sleep on school nights.\nOne major reason is the excessive use of digital devices before bedtime.\nAs a result, they may feel tired and lose concentration in class.\nSchools and families should therefore promote healthier evening routines.",
  "missing-word": "TITLE: Complete the Sentences\n\nRegular [exercise] can improve both physical and mental health.\nA balanced [diet] provides the body with essential nutrients.\nStudents need enough [sleep] to maintain concentration.\nDrinking sufficient [water] helps prevent dehydration.",
  "cloze-passage": "TITLE: Sustainable Schools\n\nA sustainable school tries to reduce its environmental [impact]. Students can save [energy] by switching off lights and electrical devices when they are not needed. They can also reduce [waste] by using reusable bottles and separating materials for [recycling].",
  "word-scramble": "TITLE: Unscramble the Academic Words\n\nEDUCATION | the process of teaching and learning\nSUSTAINABLE | able to continue without damaging resources\nCOMMUNICATION | the exchange of information\nRESPONSIBILITY | a duty to deal with something properly\nDEVELOPMENT | the process of growth or improvement",
  "word-search": "TITLE: Environment Word Search\n\nCLIMATE, ENERGY, FOREST, OCEAN, RECYCLE, SOLAR, WATER, WILDLIFE, CARBON, HABITAT",
  "crossword": "TITLE: Environmental Crossword\n\nCLIMATE | the usual weather conditions of a place\nRECYCLE | process used materials so they can be used again\nHABITAT | the natural home of a plant or animal\nSOLAR | relating to energy from the sun\nFOREST | a large area covered with trees",
  "hangman": "TITLE: Guess the Academic Word\n\nBIODIVERSITY | the variety of living species\nEDUCATION | the process of teaching and learning\nTECHNOLOGY | tools and systems based on scientific knowledge\nCONSERVATION | protection of nature and resources\nCOMMUNICATION | exchange of information and ideas",
  "bingo": "TITLE: Environmental Vocabulary Bingo\n\nclimate, energy, recycle, forest, ocean, solar, wind, water, habitat, species, carbon, plastic, pollution, wildlife, conserve, sustainable",
  "flashcards": "TITLE: Study Skills Flashcards\n\nactive recall | remembering information without looking at notes\nspaced practice | reviewing content at increasing intervals\nnote-taking | recording key information in an organised way\nself-assessment | checking your own understanding and progress\ngoal setting | deciding what you want to achieve",
  "spin-selector": "TITLE: Speaking Question Wheel\n\nDescribe one habit that helps you stay healthy.\nExplain how students can reduce plastic waste.\nTalk about a person who has influenced you.\nDescribe an invention that has changed daily life.\nExplain one advantage of learning online.\nSuggest one improvement for your school.",
  "open-box": "TITLE: Mystery Speaking Boxes\n\nDescribe a memorable lesson.\nGive three practical ways to save energy.\nExplain why teamwork matters.\nCreate a question for a classmate.\nName one challenge students face and suggest a solution.\nDescribe a place you would like to visit.",
  "flip-tiles": "TITLE: Grammar Flip Tiles\n\npresent perfect | have or has plus past participle\npassive voice | be plus past participle\nrelative clause | a clause beginning with who, which, that, whose, where, or when\nconditional sentence | a sentence expressing a condition and its result\nreported speech | reporting what another person said",
  "random-cards": "TITLE: Random Discussion Cards\n\nShould homework be reduced? | Give one argument and one example.\nIs social media more helpful than harmful? | Present both sides briefly.\nShould schools ban single-use plastic? | Suggest an alternative.\nIs online learning suitable for every student? | Explain your opinion.\nShould students wear uniforms? | Give two reasons.",
  "speaking-cards": "TITLE: One-Minute Speaking Cards\n\nA healthy daily routine | Mention sleep, food, exercise, and study.\nAn environmental problem in your area | Describe causes, effects, and a solution.\nA useful piece of technology | Explain its purpose and benefits.\nA person you admire | Describe the person and explain why.\nYour ideal school | Describe facilities, subjects, and activities.",
  "evidence-hunt": "TITLE: Evidence Hunt\n\nWhich sentence best supports the idea that exercise improves mental health? | Exercise can reduce stress and improve mood. | Many people enjoy team sports. | Gyms offer different equipment. | Some students walk to school. | A\nWhich detail shows that reusable bottles reduce waste? | They can be used many times. | They come in different colours. | They are sold in many shops. | They may be made of metal. | A",
  "reference-chain": "TITLE: Reference Words\n\nIn “The school installed solar panels. They now provide part of its electricity,” what does “They” refer to? | the solar panels | the school | the students | the electricity | A\nIn “Plastic waste harms marine animals, and this is becoming a global concern,” what does “this” refer to? | harm caused by plastic waste | marine animals | a global meeting | recycling bins | A",
  "heading-match": "TITLE: Match Headings to Paragraphs\n\nBenefits of Daily Exercise | Regular movement strengthens the body, reduces stress, and can improve sleep.\nReducing Plastic Waste | Reusable containers and careful recycling can lower the amount of rubbish produced.\nLearning Through Technology | Digital tools provide flexible access to lessons, practice, and feedback.\nThe Importance of Sleep | Adequate rest supports memory, mood, and concentration.",
  "main-idea": "TITLE: Main Idea Practice\n\nA paragraph explains that regular exercise improves physical health, reduces stress, and supports better sleep. What is its main idea? | Exercise has several health benefits. | Sleep is more important than exercise. | Stress cannot be reduced. | Only athletes need exercise. | A\nA paragraph describes how reusable bottles, bags, and containers reduce rubbish. What is its main idea? | Reusable products help reduce waste. | Plastic is always inexpensive. | Shops sell many containers. | Recycling is impossible. | A",
  "sentence-insertion": "TITLE: Sentence Insertion\n\nChoose the sentence that best follows: “Many schools are trying to reduce their environmental impact.” | They install energy-saving lights and provide recycling bins. | Students enjoy many different subjects. | Examinations usually take place in classrooms. | School uniforms vary in colour. | A\nChoose the sentence that best follows: “Adequate sleep is essential for teenagers.” | It supports concentration, memory, and emotional health. | Teenagers often use different social media platforms. | Many schools begin lessons in the morning. | Some bedrooms have large windows. | A",
  "error-correction": "TITLE: Error Correction\n\nShe go to school by bus every day. | FALSE | She goes to school by bus every day.\nThe students have finished their project. | TRUE | —\nIf I had more time, I will join the club. | FALSE | If I had more time, I would join the club.\nThe new library was opened last month. | TRUE | —\nHe suggested to take a short break. | FALSE | He suggested taking a short break.",
  "summary-builder": "TITLE: Summary Writing\n\nWrite a 60–80 word summary of a text about healthy lifestyles. Include the main idea and the most important supporting points. Do not add personal opinions or minor examples.",
  "retelling": "TITLE: Retell the Story\n\nRetell a story in chronological order. Include the setting, the main event, the characters’ reactions, the result, and the lesson learned.",
  "creative-ending": "TITLE: Creative Ending\n\nContinue the story from the moment the main character discovers the unexpected message. Write 120–150 words and create a logical, engaging ending.",
  "debate-cards": "TITLE: Classroom Debate Cards\n\nSchools should replace printed textbooks with digital materials. | Consider cost, access, health, and learning effectiveness.\nStudents should have less homework. | Discuss practice, free time, stress, and responsibility.\nSocial media does more harm than good. | Consider communication, privacy, misinformation, and wellbeing.\nSchool uniforms should be optional. | Discuss equality, identity, cost, and discipline.",
  "one-minute-speaking": "TITLE: One-Minute Speaking\n\nSpeak for one minute about a skill you would like to learn. Explain what the skill is, why it matters to you, how you would learn it, and how it could help you in the future.",
  "whack-answer": "TITLE: Whack the Correct Answer\n\nWhich word is closest in meaning to “essential”? | necessary | unusual | temporary | harmful | A\nWhich phrase is a correct collocation? | make a decision | do a decision | create a decision | build a decision | A\nWhich sentence is grammatically correct? | She has lived here for five years. | She lives here since five years. | She has live here for five years. | She lived here since five years. | A",
  "conveyor-memory": "TITLE: Conveyor Memory Challenge\n\nrenewable energy | clean power from naturally replaced sources\ncarbon footprint | greenhouse gases linked to an activity\nbiodiversity | variety of living species\nconservation | protection of nature\nsustainable | able to continue without exhausting resources"
};

export const sampleFor = (templateOrId) => {
  const id = typeof templateOrId === 'string'
    ? templateOrId
    : templateOrId?.id;
  return TEXTLAB_SAMPLE_DATA[id] || `TITLE: My Activity

ITEM 1
ITEM 2`;
};

export const normalizedSampleFor = (templateOrId) =>
  String(sampleFor(templateOrId) || '').replace(/\\n/g, '\n');

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

.wordsearch-grid{display:grid;grid-template-columns:repeat(var(--ws-size),minmax(26px,1fr));gap:4px;touch-action:none;user-select:none}
.ws-cell{aspect-ratio:1;border:2px solid #9ab8d0;border-radius:8px;padding:0;display:grid;place-items:center;font-weight:900;background:#f7fbff}
.ws-cell.selecting{background:#fff4a8;border-color:#d79a00;transform:scale(1.06)}
.ws-cell.found{background:#dcf8e8;border-color:#16834d;color:#0c5a34}
.word-chip{display:inline-flex;align-items:center;border:2px solid #9ab8d0;border-radius:999px;padding:9px 13px;background:#fff;font-weight:850}
.word-chip.found{background:#dcf8e8;border-color:#16834d;color:#0c5a34;text-decoration:line-through}
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


function gameSummaryScript(totalExpr, label = 'mục') {
  return `
const GAME_TOTAL=${totalExpr};
let gameDone=0,gameScore=0;
const gameHud=()=>{
  const el=document.getElementById('gameHud');
  const bar=document.getElementById('gameProgress');
  if(el)el.textContent='Hoàn thành '+gameDone+'/'+GAME_TOTAL+' · Điểm '+gameScore;
  if(bar)bar.style.width=(GAME_TOTAL?gameDone/GAME_TOTAL*100:0)+'%';
};
const gameFinish=()=>{
  const percent=GAME_TOTAL?Math.round(gameScore/GAME_TOTAL*100):100;
  const wrap=document.createElement('div');
  wrap.className='finish-overlay';
  wrap.innerHTML='<section class="finish-card"><div class="finish-icon">'+(percent>=80?'🏆':percent>=60?'🌟':'💪')+'</div><h2>'+(percent>=80?'Hoàn thành xuất sắc!':percent>=60?'Hoàn thành tốt!':'Đã hoàn thành!')+'</h2><div class="result-grid"><div class="result-box"><b>'+gameScore+'/'+GAME_TOTAL+'</b><span>Điểm</span></div><div class="result-box"><b>'+percent+'%</b><span>Tỷ lệ</span></div><div class="result-box"><b>'+GAME_TOTAL+'</b><span>${label}</span></div></div><div class="finish-actions"><button class="primary" onclick="location.reload()">↻ Chơi lại</button><button onclick="this.closest(\\'.finish-overlay\\').remove()">Xem lại</button></div></section>';
  document.body.appendChild(wrap);
};
gameHud();
`;
}

function gameHudHtml(note='Hoàn thành hoạt động để xem tổng kết'){
  return `<section class="panel"><div class="hud"><strong id="gameHud"></strong><span>${esc(note)}</span></div><div class="progress-shell"><div id="gameProgress" class="progress-bar"></div></div></section>`;
}

function categorySortGame(data){
  const groups=data.groups||[];
  const items=[];
  groups.forEach(group=>group.items.forEach(item=>items.push({item,group:group.name})));
  items.sort(()=>Math.random()-.5);
  const html=gameHudHtml('Chọn đúng nhóm cho từng từ')+`<section class="panel"><div class="grid">${items.map(entry=>`<article class="card sort-card"><b>${esc(entry.item)}</b><select data-answer="${esc(entry.group)}"><option value="">Chọn nhóm</option>${groups.map(group=>`<option value="${esc(group.name)}">${esc(group.name)}</option>`).join('')}</select><p class="feedback"></p></article>`).join('')}</div><div class="toolbar"><button class="primary" id="checkSort">Kiểm tra</button></div></section>`;
  const script=gameSummaryScript(items.length,'mục')+`
document.getElementById('checkSort').onclick=()=>{
  gameDone=0;gameScore=0;
  document.querySelectorAll('.sort-card').forEach(card=>{
    const select=card.querySelector('select');
    const ok=select.value===select.dataset.answer;
    card.classList.remove('correct','wrong');card.classList.add(ok?'correct':'wrong');
    const fb=card.querySelector('.feedback');fb.className='feedback '+(ok?'ok':'no');fb.textContent=ok?'✓ Chính xác':'✗ Đúng: '+select.dataset.answer;
    if(select.value)gameDone++;if(ok)gameScore++;
  });
  gameHud();if(gameDone===GAME_TOTAL)setTimeout(gameFinish,500);
};`;
  return shell(data,html,script);
}

function reorderGame(data,sentenceMode=false){
  const original=sentenceMode?(data.items||[]).flatMap(sentence=>sentence.split(/\\s+/).filter(Boolean)):[...(data.items||[])];
  const shuffled=[...original].sort(()=>Math.random()-.5);
  const html=gameHudHtml('Dùng nút lên/xuống để sắp xếp')+`<section class="panel"><div id="orderList">${shuffled.map(item=>`<div class="order-item"><button data-dir="up">↑</button><button data-dir="down">↓</button><span>${esc(item)}</span></div>`).join('')}</div><div class="toolbar"><button class="primary" id="checkOrder">Kiểm tra</button><span id="orderResult" class="score"></span></div></section>`;
  const script=gameSummaryScript(original.length,sentenceMode?'từ':'câu')+`
const correctOrder=${JSON.stringify(original)};
document.querySelectorAll('[data-dir]').forEach(button=>button.onclick=()=>{
  const row=button.parentElement,list=row.parentElement;
  if(button.dataset.dir==='up'&&row.previousElementSibling)list.insertBefore(row,row.previousElementSibling);
  if(button.dataset.dir==='down'&&row.nextElementSibling)list.insertBefore(row.nextElementSibling,row);
});
document.getElementById('checkOrder').onclick=()=>{
  const current=[...document.querySelectorAll('.order-item span')].map(x=>x.textContent);
  gameDone=GAME_TOTAL;gameScore=current.reduce((sum,item,index)=>sum+(item===correctOrder[index]?1:0),0);
  document.querySelectorAll('.order-item').forEach((row,index)=>row.classList.add(current[index]===correctOrder[index]?'correct':'wrong'));
  document.getElementById('orderResult').textContent=gameScore===GAME_TOTAL?'✓ Chính xác!':'Đúng vị trí '+gameScore+'/'+GAME_TOTAL;
  gameHud();setTimeout(gameFinish,650);
};`;
  return shell(data,html,script);
}

function wordScrambleGame(data){
  const items=data.items||[];
  const html=gameHudHtml('Giải từng từ rồi kiểm tra')+items.map((entry,index)=>{
    const shuffled=[...entry.word.toUpperCase()].sort(()=>Math.random()-.5).join(' ');
    return `<section class="panel scramble-row" data-answer="${esc(entry.word.toUpperCase())}"><h2>${index+1}. ${shuffled}</h2><p>${esc(entry.clue)}</p><input class="blank"><button>Kiểm tra</button><p class="feedback"></p></section>`;
  }).join('');
  const script=gameSummaryScript(items.length,'từ')+`
document.querySelectorAll('.scramble-row').forEach(row=>row.querySelector('button').onclick=()=>{
  if(row.dataset.done)return;row.dataset.done='1';gameDone++;
  const ok=row.querySelector('input').value.trim().toUpperCase()===row.dataset.answer;
  if(ok)gameScore++;row.classList.add(ok?'correct':'wrong');
  const fb=row.querySelector('.feedback');fb.className='feedback '+(ok?'ok':'no');fb.textContent=ok?'✓ Chính xác':'✗ Đáp án: '+row.dataset.answer;
  gameHud();if(gameDone===GAME_TOTAL)setTimeout(gameFinish,500);
});`;
  return shell(data,html,script);
}

function buildWordSearch(words){
  const size=Math.max(10,Math.min(16,Math.max(...words.map(w=>w.length),10)));
  const grid=Array.from({length:size},()=>Array(size).fill(''));
  words.forEach(word=>{
    const clean=word.toUpperCase().replace(/[^A-Z]/g,'');
    let placed=false;
    for(let tries=0;tries<100&&!placed;tries++){
      const horizontal=Math.random()>.5;
      const row=Math.floor(Math.random()*(horizontal?size:size-clean.length+1));
      const col=Math.floor(Math.random()*(horizontal?size-clean.length+1:size));
      let ok=true;
      for(let i=0;i<clean.length;i++){const r=row+(horizontal?0:i),c=col+(horizontal?i:0);if(grid[r][c]&&grid[r][c]!==clean[i])ok=false;}
      if(ok){for(let i=0;i<clean.length;i++){const r=row+(horizontal?0:i),c=col+(horizontal?i:0);grid[r][c]=clean[i];}placed=true;}
    }
  });
  const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  grid.forEach(row=>row.forEach((cell,index)=>{if(!cell)row[index]=letters[Math.floor(Math.random()*letters.length)]}));
  return grid;
}

function wordSearchGame(data){
  const words=(data.items||[]).map(item=>String(item).toUpperCase().replace(/[^A-Z]/g,'')).filter(Boolean);
  const size=Math.max(10,Math.min(16,Math.max(...words.map(word=>word.length),10)));
  const grid=Array.from({length:size},()=>Array(size).fill(''));
  const placements=[];

  const directions=[
    [0,1],[1,0],[1,1],[-1,1],
    [0,-1],[-1,0],[-1,-1],[1,-1]
  ];

  words.forEach(word=>{
    let placed=false;
    for(let tries=0;tries<400&&!placed;tries++){
      const [dr,dc]=directions[Math.floor(Math.random()*directions.length)];
      const startRow=Math.floor(Math.random()*size);
      const startCol=Math.floor(Math.random()*size);
      const endRow=startRow+dr*(word.length-1);
      const endCol=startCol+dc*(word.length-1);
      if(endRow<0||endRow>=size||endCol<0||endCol>=size)continue;

      let ok=true;
      for(let i=0;i<word.length;i++){
        const r=startRow+dr*i,c=startCol+dc*i;
        if(grid[r][c]&&grid[r][c]!==word[i]){ok=false;break;}
      }
      if(!ok)continue;

      const cells=[];
      for(let i=0;i<word.length;i++){
        const r=startRow+dr*i,c=startCol+dc*i;
        grid[r][c]=word[i];
        cells.push([r,c]);
      }
      placements.push({word,cells});
      placed=true;
    }
  });

  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  grid.forEach(row=>row.forEach((cell,index)=>{
    if(!cell)row[index]=alphabet[Math.floor(Math.random()*alphabet.length)];
  }));

  const cellsHtml=grid.flatMap((row,r)=>row.map((letter,c)=>
    `<button class="ws-cell" data-r="${r}" data-c="${c}" aria-label="Hàng ${r+1}, cột ${c+1}: ${letter}">${letter}</button>`
  )).join('');

  const html=gameHudHtml('Kéo từ chữ đầu đến chữ cuối để tìm từ')+
    `<section class="panel">
      <div id="wordGrid" class="wordsearch-grid" style="--ws-size:${size}">${cellsHtml}</div>
      <h3>Danh sách từ</h3>
      <div class="toolbar">${words.map(word=>`<span class="word-chip" data-word="${word}">${esc(word)}</span>`).join('')}</div>
      <p id="wsMessage" class="feedback" aria-live="polite"></p>
    </section>`;

  const script=gameSummaryScript(words.length,'từ')+`
const WORDS=${JSON.stringify(words)};
const SIZE=${size};
let selecting=false,startCell=null,currentCells=[];

const allCells=[...document.querySelectorAll('.ws-cell')];
const getCell=(r,c)=>document.querySelector('.ws-cell[data-r="'+r+'"][data-c="'+c+'"]');
const clearSelecting=()=>allCells.forEach(cell=>cell.classList.remove('selecting'));

const lineCells=(start,end)=>{
  const sr=Number(start.dataset.r),sc=Number(start.dataset.c);
  const er=Number(end.dataset.r),ec=Number(end.dataset.c);
  const dr=Math.sign(er-sr),dc=Math.sign(ec-sc);
  const rowDistance=Math.abs(er-sr),colDistance=Math.abs(ec-sc);
  const valid=rowDistance===0||colDistance===0||rowDistance===colDistance;
  if(!valid)return [];
  const length=Math.max(rowDistance,colDistance)+1;
  const result=[];
  for(let i=0;i<length;i++){
    const r=sr+dr*i,c=sc+dc*i;
    const cell=getCell(r,c);
    if(!cell)return [];
    result.push(cell);
  }
  return result;
};

const previewLine=end=>{
  clearSelecting();
  currentCells=lineCells(startCell,end);
  currentCells.forEach(cell=>cell.classList.add('selecting'));
};

const finishSelection=()=>{
  if(!selecting)return;
  selecting=false;
  const letters=currentCells.map(cell=>cell.textContent).join('');
  const reversed=[...letters].reverse().join('');
  const match=WORDS.find(word=>word===letters||word===reversed);
  const message=document.getElementById('wsMessage');

  if(match){
    const chip=document.querySelector('.word-chip[data-word="'+match+'"]');
    if(chip&&!chip.classList.contains('found')){
      currentCells.forEach(cell=>{cell.classList.remove('selecting');cell.classList.add('found');});
      chip.classList.add('found');
      chip.textContent='✓ '+chip.textContent;
      gameDone++;gameScore++;
      message.className='feedback ok';
      message.textContent='✓ Tìm thấy: '+match;
      gameHud();
      if(gameDone===GAME_TOTAL)setTimeout(gameFinish,550);
    }else{
      clearSelecting();
      message.className='feedback';
      message.textContent='Từ này đã được tìm thấy.';
    }
  }else{
    clearSelecting();
    message.className='feedback no';
    message.textContent='Chưa đúng. Hãy kéo theo hàng ngang, dọc hoặc đường chéo.';
  }
  startCell=null;
  currentCells=[];
};

allCells.forEach(cell=>{
  cell.addEventListener('pointerdown',event=>{
    event.preventDefault();
    selecting=true;
    startCell=cell;
    currentCells=[cell];
    clearSelecting();
    cell.classList.add('selecting');
    cell.setPointerCapture?.(event.pointerId);
  });

  cell.addEventListener('pointerenter',()=>{
    if(selecting&&startCell)previewLine(cell);
  });

  cell.addEventListener('pointerup',finishSelection);
});

document.addEventListener('pointerup',finishSelection);
`;
  return shell(data,html,script);
}

function crosswordGame(data){
  const items=data.items||[];
  const html=gameHudHtml('Đọc gợi ý và nhập từ khóa')+items.map((entry,index)=>`<section class="panel crossword-row" data-answer="${esc(entry.word.toUpperCase())}"><h2>${index+1}. ${esc(entry.clue)}</h2><p class="score">${'_ '.repeat(entry.word.length)}</p><input class="blank"><button>Kiểm tra</button><p class="feedback"></p></section>`).join('');
  const script=gameSummaryScript(items.length,'từ')+`
document.querySelectorAll('.crossword-row').forEach(row=>row.querySelector('button').onclick=()=>{
  if(row.dataset.done)return;row.dataset.done='1';gameDone++;
  const ok=row.querySelector('input').value.trim().toUpperCase()===row.dataset.answer;if(ok)gameScore++;
  row.classList.add(ok?'correct':'wrong');const fb=row.querySelector('.feedback');fb.className='feedback '+(ok?'ok':'no');fb.textContent=ok?'✓ Chính xác':'✗ Đáp án: '+row.dataset.answer;
  gameHud();if(gameDone===GAME_TOTAL)setTimeout(gameFinish,500);
});`;
  return shell(data,html,script);
}

function hangmanGame(data){
  const items=data.items||[];
  const html=`<section class="panel"><div class="hud"><strong id="hangStatus"></strong><span id="hangScore"></span></div></section><section class="panel"><h2 id="hangClue"></h2><div id="hangMask" style="font-size:38px;letter-spacing:.18em;font-weight:900;margin:20px 0"></div><p id="hangLives" class="score"></p><div id="hangLetters" class="toolbar"></div></section>`;
  const script=`
const words=${JSON.stringify(items.map(x=>({word:x.word.toUpperCase(),clue:x.clue})))};
let index=0,totalScore=0,lives=6,found=new Set();const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const renderHang=()=>{const current=words[index];document.getElementById('hangClue').textContent=current.clue;document.getElementById('hangMask').textContent=[...current.word].map(c=>c===' '?' ':found.has(c)?c:'_').join(' ');document.getElementById('hangLives').textContent='Lượt sai còn lại: '+lives;document.getElementById('hangStatus').textContent='Từ '+(index+1)+'/'+words.length;document.getElementById('hangScore').textContent='Điểm '+totalScore;const area=document.getElementById('hangLetters');area.innerHTML='';letters.forEach(letter=>{const b=document.createElement('button');b.textContent=letter;b.onclick=()=>guess(letter,b);area.appendChild(b);});};
const nextHang=()=>{index++;if(index>=words.length){document.body.insertAdjacentHTML('beforeend','<div class="finish-overlay"><section class="finish-card"><div class="finish-icon">🏆</div><h2>Hoàn thành!</h2><div class="result-grid"><div class="result-box"><b>'+totalScore+'/'+words.length+'</b><span>Từ đoán đúng</span></div></div><button class="primary" onclick="location.reload()">Chơi lại</button></section></div>');return;}lives=6;found=new Set();renderHang();};
const guess=(letter,button)=>{button.disabled=true;const word=words[index].word;if(word.includes(letter)){found.add(letter);button.classList.add('correct');}else{lives--;button.classList.add('wrong');}document.getElementById('hangMask').textContent=[...word].map(c=>c===' '?' ':found.has(c)?c:'_').join(' ');document.getElementById('hangLives').textContent='Lượt sai còn lại: '+lives;if([...word].every(c=>c===' '||found.has(c))){totalScore++;setTimeout(nextHang,500);}else if(lives<=0){setTimeout(nextHang,700);}};
renderHang();`;
  return shell(data,html,script);
}

function bingoGame(data){
  const items=(data.items||[]).slice(0,25);
  const html=`<section class="panel"><div class="hud"><strong id="bingoStatus">Đã đánh dấu 0 ô</strong><span>Tạo một hàng, cột hoặc đường chéo</span></div></section><section class="panel"><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">${items.map((item,index)=>`<button class="tile bingo-cell" data-index="${index}">${esc(item)}</button>`).join('')}</div></section>`;
  const script=`
const cells=[...document.querySelectorAll('.bingo-cell')],lines=[];
for(let r=0;r<5;r++)lines.push([0,1,2,3,4].map(c=>r*5+c));
for(let c=0;c<5;c++)lines.push([0,1,2,3,4].map(r=>r*5+c));
lines.push([0,6,12,18,24],[4,8,12,16,20]);
const checkBingo=()=>lines.some(line=>line.every(i=>cells[i]&&cells[i].classList.contains('correct')));
cells.forEach(cell=>cell.onclick=()=>{cell.classList.toggle('correct');document.getElementById('bingoStatus').textContent='Đã đánh dấu '+document.querySelectorAll('.bingo-cell.correct').length+' ô';if(checkBingo())setTimeout(()=>document.body.insertAdjacentHTML('beforeend','<div class="finish-overlay"><section class="finish-card"><div class="finish-icon">🎉</div><h2>BINGO!</h2><p>Bạn đã hoàn thành một hàng hợp lệ.</p><button class="primary" onclick="location.reload()">Chơi lại</button></section></div>'),300);});`;
  return shell(data,html,script);
}

function writingGame(data,mode){
  const prompt=data.prompt||'Write your response.';
  const settings={summary:{min:60,max:80,seconds:600,instruction:'Viết tóm tắt ngắn gọn.'},retelling:{min:90,max:180,seconds:600,instruction:'Kể lại theo trình tự.'},creative:{min:120,max:150,seconds:900,instruction:'Viết phần kết sáng tạo.'},speaking:{min:1,max:300,seconds:60,instruction:'Chuẩn bị rồi nói trong một phút.'}}[mode];
  const html=`<section class="panel"><div class="hud"><strong id="timer">${settings.seconds}s</strong><span>${esc(settings.instruction)}</span></div><div class="progress-shell"><div id="timeBar" class="progress-bar"></div></div></section><section class="panel"><h2>${esc(prompt)}</h2><textarea id="response" class="open-answer"></textarea><div class="hud"><strong id="wordCount">0 từ</strong><span>Mục tiêu ${settings.min}–${settings.max} từ</span></div><div class="toolbar"><button class="primary" id="startTimer">${mode==='speaking'?'Bắt đầu nói':'Bắt đầu làm bài'}</button><button id="finishWriting">Hoàn thành</button><button id="saveWriting">Lưu trên thiết bị</button></div></section>`;
  const script=`
const TOTAL_TIME=${settings.seconds};let remaining=TOTAL_TIME,timerId=null;const area=document.getElementById('response');
const countWords=()=>area.value.trim()?area.value.trim().split(/\\s+/).length:0;
const updateWords=()=>document.getElementById('wordCount').textContent=countWords()+' từ';area.oninput=updateWords;
document.getElementById('startTimer').onclick=()=>{if(timerId)return;timerId=setInterval(()=>{remaining--;document.getElementById('timer').textContent=remaining+'s';document.getElementById('timeBar').style.width=((TOTAL_TIME-remaining)/TOTAL_TIME*100)+'%';if(remaining<=0){clearInterval(timerId);timerId=null;finishWriting();}},1000);};
document.getElementById('saveWriting').onclick=()=>{localStorage.setItem('textlab-${mode}',area.value);alert('Đã lưu trên thiết bị.');};area.value=localStorage.getItem('textlab-${mode}')||'';updateWords();
const finishWriting=()=>{const words=countWords(),ok=words>=${settings.min}&&words<=${settings.max};document.body.insertAdjacentHTML('beforeend','<div class="finish-overlay"><section class="finish-card"><div class="finish-icon">'+(ok?'🏆':'📝')+'</div><h2>Đã hoàn thành</h2><div class="result-grid"><div class="result-box"><b>'+words+'</b><span>Số từ</span></div><div class="result-box"><b>${settings.min}–${settings.max}</b><span>Mục tiêu</span></div><div class="result-box"><b>'+remaining+'s</b><span>Thời gian còn lại</span></div></div><p>'+(ok?'Nội dung đạt độ dài đề xuất.':'Hãy điều chỉnh độ dài để đạt mục tiêu.')+'</p><div class="finish-actions"><button class="primary" onclick="location.reload()">Làm lại</button><button onclick="this.closest(\\'.finish-overlay\\').remove()">Xem lại</button></div></section></div>');};
document.getElementById('finishWriting').onclick=finishWriting;`;
  return shell(data,html,script);
}

export function buildInteractiveHtml(template, raw) {
  const data = parse(raw, template.kind);
  switch (template.id) {
    case 'category-sort': return categorySortGame(data);
    case 'rank-order': return reorderGame(data, false);
    case 'sentence-builder': return reorderGame(data, true);
    case 'paragraph-builder': return reorderGame(data, false);
    case 'word-scramble': return wordScrambleGame(data);
    case 'word-search': return wordSearchGame(data);
    case 'crossword': return crosswordGame(data);
    case 'hangman': return hangmanGame(data);
    case 'bingo': return bingoGame(data);
    case 'summary-builder': return writingGame(data, 'summary');
    case 'retelling': return writingGame(data, 'retelling');
    case 'creative-ending': return writingGame(data, 'creative');
    case 'one-minute-speaking': return writingGame(data, 'speaking');
  }
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
