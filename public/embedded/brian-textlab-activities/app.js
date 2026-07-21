/* Brian TextLab Activities - original implementation */
const TEMPLATES = [
  {
    "id": "quiz",
    "icon": "✅",
    "name": "Quick Quiz",
    "tag": "MCQ",
    "desc": "Tạo bài trắc nghiệm tự chấm điểm.",
    "hint": "Mỗi dòng: Câu hỏi | Đáp án đúng | Đáp án sai 1 | Đáp án sai 2 | Đáp án sai 3",
    "sample": "Which habit most effectively reduces single-use plastic? | carrying a reusable bottle | buying bottled water daily | using a new straw each time | wrapping fruit in plastic\nWhat does resilient mean? | able to recover from difficulty | unwilling to change | extremely expensive | impossible to measure\nWhich noun is formed from the adjective sustainable? | sustainability | sustain | sustainably | sustained\nWhich sentence uses meticulous correctly? | The researcher kept meticulous records of every trial. | The storm became meticulous overnight. | We arrived meticulous at noon. | The machine ran meticulous.\nWhat is the closest meaning of feasible? | practical and possible | harmful and permanent | unclear and doubtful | rare and accidental\nWhich action demonstrates transparency? | publishing clear decision-making criteria | hiding the final report | deleting all feedback | refusing to explain a change"
  },
  {
    "id": "truefalse",
    "icon": "🔎",
    "name": "True / False",
    "tag": "Check",
    "desc": "Học sinh chọn đúng/sai cho từng nhận định.",
    "hint": "Mỗi dòng: Nhận định | true/false",
    "sample": "Renewable energy comes from sources that can be naturally replenished. | true\nA carbon footprint measures only the amount of water a person drinks. | false\nRecycling can reduce the volume of waste sent to landfill. | true\nBiodiversity refers to a single species living in one habitat. | false\nPublic transport can help reduce traffic-related emissions. | true\nSustainable development ignores the needs of future generations. | false"
  },
  {
    "id": "flashcards",
    "icon": "🃏",
    "name": "Flip Cards",
    "tag": "Vocab",
    "desc": "Tạo thẻ lật từ vựng, câu hỏi, định nghĩa.",
    "hint": "Mỗi dòng: Mặt trước | Mặt sau",
    "sample": "biodiversity | the variety of living organisms in an area\ncarbon footprint | the total greenhouse gases caused by an activity\nrenewable energy | energy from sources that are naturally replaced\nconservation | the protection of nature and natural resources\nresilient | able to recover or adapt after difficulty\nfeasible | possible and practical to carry out\naccountability | responsibility for decisions and actions\ntransparency | openness and clarity in sharing information"
  },
  {
    "id": "wheel",
    "icon": "🎡",
    "name": "Spin Selector",
    "tag": "Random",
    "desc": "Vòng quay chọn ngẫu nhiên từ/câu hỏi/nhiệm vụ.",
    "hint": "Mỗi dòng là một mục trên vòng quay.",
    "sample": "Define biodiversity in your own words.\nGive one example of renewable energy.\nName one way to reduce household waste.\nUse sustainable in a complete sentence.\nExplain why public transport benefits cities.\nDescribe an environmental problem in your community.\nAsk a classmate a question about conservation.\nGive a 30-second solution to plastic pollution."
  },
  {
    "id": "picker",
    "icon": "🎲",
    "name": "Random Picker",
    "tag": "Random",
    "desc": "Bốc thăm ngẫu nhiên nội dung từ danh sách.",
    "hint": "Mỗi dòng là một mục để bốc thăm.",
    "sample": "Team Green answers the next question.\nTeam Blue receives a ten-point bonus.\nStudent A gives an example sentence.\nStudent B explains one key term.\nPair 1 has thirty seconds to discuss.\nPair 2 chooses the next speaker.\nThe class votes for the clearest explanation.\nEveryone writes one exit-ticket sentence."
  },
  {
    "id": "matching",
    "icon": "🔗",
    "name": "Match Link",
    "tag": "Pairs",
    "desc": "Nối cặp từ và nghĩa/câu hỏi và đáp án.",
    "hint": "Mỗi dòng: Mục A | Mục B",
    "sample": "renewable | able to be naturally replaced\nconserve | protect something from loss or damage\nemission | gas released into the atmosphere\nhabitat | the natural home of an organism\nlandfill | a place where waste is buried\nefficient | working well without wasting resources\nrecycle | process material so it can be used again\necosystem | organisms and their physical environment"
  },
  {
    "id": "memory",
    "icon": "🧠",
    "name": "Memory Match",
    "tag": "Pairs",
    "desc": "Lật thẻ để tìm cặp tương ứng.",
    "hint": "Mỗi dòng: Mục A | Mục B",
    "sample": "sustain | sustainability\nconserve | conservation\npollute | pollution\nprotect | protection\nefficient | efficiency\nresponsible | responsibility\ntransparent | transparency\nresilient | resilience"
  },
  {
    "id": "fillblank",
    "icon": "✍️",
    "name": "Blank Builder",
    "tag": "Cloze",
    "desc": "Tạo bài điền chỗ trống từ đoạn văn.",
    "hint": "Viết nội dung và đặt mỗi đáp án trong {ngoặc nhọn}.",
    "sample": "Solar and wind power are forms of {renewable} energy.\nStudents can reduce waste by using a {reusable} bottle.\nA healthy forest supports rich {biodiversity}.\nThe council published the report to improve {transparency}.\nThe proposed recycling plan is both affordable and {feasible}.\nCommunities need long-term {resilience} after natural disasters."
  },
  {
    "id": "cloze",
    "icon": "📄",
    "name": "Cloze Passage",
    "tag": "Reading",
    "desc": "Tạo cloze test từ đoạn văn dài.",
    "hint": "Dùng {answer} cho từng chỗ trống trong một đoạn văn hoàn chỉnh.",
    "sample": "Many schools are trying to become more {sustainable}. They install energy-efficient lights, reduce paper {waste}, and encourage students to carry {reusable} containers. Some schools also create gardens that support local {biodiversity}. These projects are most successful when students work {collaboratively}, teachers explain each goal clearly, and leaders show {accountability}. By measuring progress and sharing results with {transparency}, a school can build lasting environmental {awareness}."
  },
  {
    "id": "unscramble",
    "icon": "🔤",
    "name": "Word Scramble",
    "tag": "Spelling",
    "desc": "Xáo chữ, học sinh nhập lại từ đúng.",
    "hint": "Mỗi dòng: Từ đúng | Gợi ý",
    "sample": "recycle | process used materials again\nhabitat | natural home of an animal or plant\nemission | gas released into the air\nresilient | able to recover from difficulty\nfeasible | practical and possible\nconserve | protect and avoid waste\nlandfill | place where rubbish is buried\necosystem | living things and their environment"
  },
  {
    "id": "sentence",
    "icon": "🧩",
    "name": "Sentence Builder",
    "tag": "Syntax",
    "desc": "Xáo trật tự từ, học sinh bấm để ghép câu.",
    "hint": "Mỗi dòng là một câu hoàn chỉnh, không thêm số thứ tự.",
    "sample": "Our school has reduced its use of single-use plastic.\nRenewable energy can lower greenhouse-gas emissions.\nStudents should separate recyclable materials carefully.\nThe new conservation project involves the whole community.\nPublic transport is becoming increasingly reliable.\nTransparent decisions can strengthen public trust."
  },
  {
    "id": "ordering",
    "icon": "↕️",
    "name": "Order Race",
    "tag": "Sequence",
    "desc": "Sắp xếp các bước, sự kiện hoặc câu theo đúng thứ tự.",
    "hint": "Mỗi dòng là một bước theo thứ tự đúng từ trên xuống dưới.",
    "sample": "Identify the environmental problem.\nCollect reliable information about its causes.\nDiscuss possible solutions with the group.\nChoose the most feasible solution.\nCreate a clear action plan.\nEvaluate the results and make improvements."
  },
  {
    "id": "categories",
    "icon": "🧺",
    "name": "Category Sort",
    "tag": "Sort",
    "desc": "Phân loại mục vào nhóm đúng.",
    "hint": "Mỗi dòng: Tên nhóm | Mục cần phân loại",
    "sample": "Renewable source | solar power\nRenewable source | wind power\nRenewable source | hydropower\nEnvironmental problem | air pollution\nEnvironmental problem | deforestation\nEnvironmental problem | plastic waste\nSustainable action | using public transport\nSustainable action | carrying a reusable bottle\nSustainable action | repairing old devices\nKey quality | accountability\nKey quality | transparency\nKey quality | resilience"
  },
  {
    "id": "bingo",
    "icon": "▦",
    "name": "Vocabulary Bingo",
    "tag": "Board",
    "desc": "Tạo bảng bingo từ danh sách từ hoặc cụm từ.",
    "hint": "Mỗi dòng là một ô. Sample có đúng 24 mục; ô FREE được tạo tự động.",
    "sample": "biodiversity\nrenewable\nrecycle\nhabitat\nemission\nlandfill\necosystem\nconservation\nsustainable\nreusable\nefficient\nresilient\nfeasible\ntransparent\naccountability\nawareness\ndeforestation\npollution\nclimate\nresources\ncommunity\nresponsibility\nwildlife\nenergy"
  },
  {
    "id": "wordsearch",
    "icon": "🔍",
    "name": "Word Search",
    "tag": "Puzzle",
    "desc": "Tạo bảng tìm từ tương tác.",
    "hint": "Mỗi dòng là một từ không dấu và không có khoảng trắng.",
    "sample": "RECYCLE\nHABITAT\nEMISSION\nLANDFILL\nECOSYSTEM\nRENEWABLE\nRESILIENT\nFEASIBLE\nWILDLIFE\nCLIMATE"
  },
  {
    "id": "crossword",
    "icon": "🧱",
    "name": "Crossword Lite",
    "tag": "Puzzle",
    "desc": "Tạo câu đố chữ từ đáp án và gợi ý.",
    "hint": "Mỗi dòng: Đáp án một từ | Gợi ý",
    "sample": "RECYCLE | use waste material to make something new\nHABITAT | the natural home of an organism\nEMISSION | gas or substance released into the air\nLANDFILL | place where rubbish is buried\nECOSYSTEM | organisms interacting with their environment\nRESILIENT | able to recover after difficulty\nFEASIBLE | possible and practical\nCLIMATE | typical weather conditions of a region"
  },
  {
    "id": "prompts",
    "icon": "💬",
    "name": "Prompt Cards",
    "tag": "Speaking",
    "desc": "Tạo thẻ câu hỏi hoặc nhiệm vụ nói.",
    "hint": "Mỗi dòng là một câu hỏi hoặc nhiệm vụ nói hoàn chỉnh.",
    "sample": "Describe one environmental problem in your local area.\nExplain two benefits of renewable energy.\nSuggest three ways students can reduce plastic waste.\nDo individual actions really help the environment? Explain.\nCompare recycling with reusing an item.\nDescribe a school project that could improve biodiversity.\nUse the words feasible and sustainable in one response.\nGive a one-minute speech about responsible consumption."
  },
  {
    "id": "table",
    "icon": "📊",
    "name": "Study Table",
    "tag": "Reference",
    "desc": "Tạo bảng học tập có tìm kiếm và che đáp án.",
    "hint": "Mỗi dòng có cùng số cột, ngăn cách bằng dấu |; dòng đầu là tiêu đề.",
    "sample": "Word | Part of speech | Meaning\nbiodiversity | noun | variety of living organisms\nrenewable | adjective | able to be naturally replaced\nconserve | verb | protect from loss or waste\nemission | noun | substance released into the air\nresilient | adjective | able to recover after difficulty\nfeasible | adjective | possible and practical\naccountability | noun | responsibility for actions\ntransparency | noun | openness and clarity"
  }
];

let selectedTemplate = TEMPLATES[0];
let zoom = 1;
let currentData = null;
let finished = false;

const $ = sel => document.querySelector(sel);
const preview = $("#activityPreview");
const ready = $("#activityReady");
const input = $("#contentInput");

function escapeHtml(str=""){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function splitLines(raw){return String(raw||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}
function parts(line){return line.split("|").map(x=>x.trim())}
function shuffle(arr){let a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]} return a}
function uid(){return Math.random().toString(36).slice(2,9)}
function normalizeText(text){
  return text.replace(/\t/g," | ").replace(/[ ]+\|[ ]+/g," | ").replace(/[ ]{2,}/g," ").trim();
}
function handleHostMessage(event){
  const data=event?.data || {};

  if(data.type==="BTL_FONT_SCALE"){
    const raw=Number(data.scale || 100);
    const scale=Math.min(130,Math.max(90,Number.isFinite(raw)?raw:100));
    document.documentElement.style.fontSize=`${scale}%`;
    document.documentElement.dataset.fontScale=String(scale);
    return;
  }

  if(data.type==="BTL_LOAD_SAVED_ACTIVITY"){
    const saved=data.payload || {};
    selectTemplate(saved.templateId || "quiz", {loadSample:false});
    input.value=String(saved.content || "").trim();
    renderPreview();
    if(input.value) finishActivity();
  }
}
function setTheme(value){document.body.dataset.style=value; localStorage.setItem("btl-style", value)}
function init(){
  verifyAllTemplateSamples();
  const params=new URLSearchParams(window.location.search);
  const initialScale=Number(params.get("fontScale") || 100);
  if(Number.isFinite(initialScale)) document.documentElement.style.fontSize=`${Math.min(130,Math.max(90,initialScale))}%`;
  const savedStyle = localStorage.getItem("btl-style") || "flat";
  $("#styleSelect").value=savedStyle; setTheme(savedStyle);
  renderTemplateGrid();
  selectTemplate("quiz", {loadSample:true});
  bindUI();

  renderPreview();
}
function renderTemplateGrid(filter=""){
  const grid=$("#templateGrid");
  const q=filter.toLowerCase();
  grid.innerHTML = TEMPLATES.filter(t => (t.name+t.tag+t.desc).toLowerCase().includes(q)).map(t=>`
    <button class="template-card ${t.id===selectedTemplate?.id?'active':''}" data-template="${t.id}">
      <div class="icon">${t.icon}</div>
      <h4>${escapeHtml(t.name)}</h4>
      <span>${escapeHtml(t.tag)}</span>
    </button>
  `).join("");
}
function selectTemplate(id, options={}){
  selectedTemplate = TEMPLATES.find(t=>t.id===id) || TEMPLATES[0];
  $("#templateTitle").textContent = `${selectedTemplate.icon} ${selectedTemplate.name}`;
  $("#templateDescription").textContent = selectedTemplate.desc;
  $("#templateHint").textContent = selectedTemplate.hint;
  input.placeholder = selectedTemplate.hint;
  if(options.loadSample !== false) input.value = selectedTemplate.sample;
  renderTemplateGrid($("#searchTemplates").value || "");

  renderPreview();
}
function bindUI(){
  $("#templateGrid").addEventListener("click", e=>{
    const card=e.target.closest("[data-template]");
    if(card) selectTemplate(card.dataset.template, {loadSample:true});
  });
  $("#searchTemplates").addEventListener("input", e=>renderTemplateGrid(e.target.value));
  $("#styleSelect").addEventListener("change", e=>setTheme(e.target.value));
  $("#btnSample").addEventListener("click", ()=>{ input.value=selectedTemplate.sample; renderPreview(); });
  $("#btnClear").addEventListener("click", ()=>{input.value=""; renderPreview()});
  $("#btnNormalize").addEventListener("click", ()=>{input.value=normalizeText(input.value); renderPreview()});

  window.addEventListener("message", handleHostMessage);
  $("#fileInput").addEventListener("change", handleUpload);
  input.addEventListener("input", debounce(renderPreview, 250));
  $("#zoomIn").addEventListener("click", ()=>setZoom(zoom+.1));
  $("#zoomOut").addEventListener("click", ()=>setZoom(zoom-.1));
  $("#btnFinish").addEventListener("click", finishActivity);
  $("#btnSaveLibrary").addEventListener("click", saveToLibrary);
  $("#btnAddBank").addEventListener("click", addToQuestionBank);
  $("#btnDownload").addEventListener("click", downloadWork);
  $("#btnNew").addEventListener("click", resetAll);
  $("#btnGuideVi").addEventListener("click", ()=>$("#modalVi").showModal());
  $("#btnGuideEn").addEventListener("click", ()=>$("#modalEn").showModal());
  $("#btnOnlineGuide").addEventListener("click", ()=>$("#modalOnline").showModal());
  document.body.addEventListener("click", e=>{ if(e.target.matches("[data-close]")) e.target.closest("dialog").close(); });
}
function debounce(fn,ms){let t; return (...args)=>{clearTimeout(t); t=setTimeout(()=>fn(...args),ms)}}
function setZoom(v){
  zoom = Math.min(1.6, Math.max(.6, Number(v.toFixed(1))));
  preview.style.transform = `scale(${zoom})`;
  $("#zoomLevel").textContent = `${Math.round(zoom*100)}%`;
}
function parseData(id, raw){
  const lines = splitLines(raw);
  if(!lines.length) return [];
  switch(id){
    case "quiz": return lines.map((l,i)=>{const p=parts(l); const correct=p[1]||""; return {q:p[0]||`Question ${i+1}`, correct, choices:shuffle([correct,...p.slice(2).filter(Boolean)])}});
    case "truefalse": return lines.map(l=>{const p=parts(l); return {statement:p[0]||"", answer:/^(true|t|đúng|dung|yes|y|1)$/i.test(p[1]||"")}});
    case "flashcards": return lines.map(l=>{const p=parts(l); return {front:p[0]||"", back:p[1]||""}});
    case "matching":
    case "memory": return lines.map((l,i)=>{const p=parts(l); return {id:i,a:p[0]||"",b:p[1]||""}});
    case "fillblank":
    case "cloze": return {text: raw, answers: [...raw.matchAll(/\{([^}]+)\}/g)].map(m=>m[1].trim())};
    case "unscramble": return lines.map(l=>{const p=parts(l); return {word:p[0]||"", hint:p[1]||""}});
    case "sentence": return lines.map(l=>l.trim()).filter(Boolean);
    case "ordering": return lines.map((text,i)=>({text, order:i}));
    case "categories": return lines.map(l=>{const p=parts(l); return {cat:p[0]||"Other", item:p[1]||""}}).filter(x=>x.item);
    case "bingo": return lines;
    case "wordsearch": return lines.map(w=>w.replace(/\s+/g,"").toUpperCase()).filter(Boolean);
    case "crossword": return lines.map(l=>{const p=parts(l); return {word:(p[0]||"").replace(/\s+/g,"").toUpperCase(), clue:p[1]||""}}).filter(x=>x.word);
    case "prompts": return lines;
    case "table": return lines.map(l=>parts(l));
    case "wheel":
    case "picker":
    default: return lines;
  }
}
const TEMPLATE_SAMPLE_MINIMUMS = Object.freeze({
  quiz:4,truefalse:4,flashcards:6,wheel:6,picker:6,matching:6,memory:6,
  fillblank:4,cloze:6,unscramble:6,sentence:5,ordering:5,categories:8,
  bingo:24,wordsearch:8,crossword:6,prompts:6,table:6
});

function sampleItemCount(template){
  const parsed=parseData(template.id,template.sample);
  if(template.id==="fillblank" || template.id==="cloze") return parsed.answers?.length || 0;
  return Array.isArray(parsed) ? parsed.length : 0;
}

function verifyAllTemplateSamples(){
  const problems=TEMPLATES
    .map(template=>({
      id:template.id,
      count:sampleItemCount(template),
      minimum:TEMPLATE_SAMPLE_MINIMUMS[template.id] || 1
    }))
    .filter(item=>item.count<item.minimum);

  if(problems.length){
    console.error("Brian TextLab sample audit failed",problems);
    return false;
  }
  return true;
}

function renderPreview(){
  const raw = input.value.trim();
  finished = false;
  $("#inputAlert").classList.toggle("hidden", !!raw);
  if(!raw){
    preview.className="activity-stage empty";
    preview.innerHTML="Activity preview appears here...";
    return;
  }
  try{
    currentData = parseData(selectedTemplate.id, raw);
    preview.className="activity-stage";
    renderActivity(preview, selectedTemplate.id, currentData, {title:selectedTemplate.name, mode:"preview"});
  }catch(err){
    preview.className="activity-stage empty";
    preview.innerHTML=`Không thể tạo preview. Kiểm tra format nhập liệu.<br><small>${escapeHtml(err.message)}</small>`;
  }
}
function finishActivity(){
  if(!input.value.trim()){
    $("#inputAlert").classList.remove("hidden");
    return;
  }
  currentData = parseData(selectedTemplate.id, input.value.trim());
  ready.className="activity-stage";
  renderActivity(ready, selectedTemplate.id, currentData, {title:selectedTemplate.name, mode:"ready"});
  finished = true;
  document.getElementById("readyPanel").scrollIntoView({behavior:"smooth", block:"start"});
}
function resetAll(){
  input.value="";
  ready.className="activity-stage empty";
  ready.innerHTML="Sau khi hoàn tất, hoạt động sẽ xuất hiện tại đây.";
  renderPreview();
}
function handleUpload(e){
  const file = e.target.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {input.value = String(reader.result||""); renderPreview()};
  reader.readAsText(file);
}
function renderActivity(container, id, data, options={}){
  container.innerHTML = ACTIVITY_RENDERERS[id]?.(data, options) || `<p>Unsupported activity.</p>`;
  bindActivity(container, id, data);
}

/* Renderers */
const ACTIVITY_RENDERERS = {
 quiz(data,opt){return `<div class="act" data-act="quiz"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Quiz")}</h2><div class="act-sub">Choose the best answer.</div></div><div class="score-pill">Score: <span data-score>0</span>/${data.length}</div></div><div class="card-stack">${data.map((q,i)=>`<div class="q-card" data-q="${i}" data-correct="${escapeHtml(q.correct)}"><b>${i+1}. ${escapeHtml(q.q)}</b><div class="q-options">${q.choices.map(c=>`<button class="option-btn" data-answer="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}</div></div>`).join("")}</div><div class="toolbar"><button class="btn ghost" data-reset-activity>Reset</button></div></div>`},
 truefalse(data,opt){return `<div class="act" data-act="tf"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"True / False")}</h2><div class="act-sub">Decide whether each statement is true or false.</div></div><div class="score-pill">Score: <span data-score>0</span>/${data.length}</div></div><div class="card-stack">${data.map((q,i)=>`<div class="q-card" data-q="${i}" data-answer="${q.answer}"><b>${i+1}. ${escapeHtml(q.statement)}</b><div class="q-options"><button class="option-btn" data-tf="true">True</button><button class="option-btn" data-tf="false">False</button></div></div>`).join("")}</div><div class="toolbar"><button class="btn ghost" data-reset-activity>Reset</button></div></div>`},
 flashcards(data,opt){return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Flashcards")}</h2><div class="act-sub">Click a card to flip.</div></div></div><div class="flip-grid">${data.map((c,i)=>`<div class="flip-card" data-front="${escapeHtml(c.front)}" data-back="${escapeHtml(c.back)}">${escapeHtml(c.front)}<small>click to flip</small></div>`).join("")}</div></div>`},
 wheel(data,opt){const n=Math.max(data.length,1); const colors=["#1479ff","#2fd2ff","#7c3aed","#17b26a","#f59e0b","#f04438","#38bdf8","#6366f1"]; const grad=data.map((_,i)=>`${colors[i%colors.length]} ${i*100/n}% ${(i+1)*100/n}%`).join(","); return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Spin Selector")}</h2><div class="act-sub">Spin to choose a random item.</div></div></div><div class="wheel-wrap"><div class="wheel" style="background:conic-gradient(${grad})" data-rotation="0"></div><button class="btn primary" data-spin>Spin</button><div class="prompt-card" data-spin-result>Ready?</div><div class="wheel-labels">${data.map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join("")}</div></div></div>`},
 picker(data,opt){return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Random Picker")}</h2><div class="act-sub">Pick one item from your list.</div></div></div><div class="prompt-card" data-pick-result>Click Pick</div><div class="toolbar"><button class="btn primary" data-pick>Pick</button></div><div class="wheel-labels">${data.map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join("")}</div></div>`},
 matching(data,opt){const left=shuffle(data), right=shuffle(data); return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Matching")}</h2><div class="act-sub">Click one item from each column to match.</div></div><div class="score-pill">Matched: <span data-matched>0</span>/${data.length}</div></div><div class="grid-two"><div class="match-list">${left.map(x=>`<button class="match-btn" data-side="a" data-id="${x.id}">${escapeHtml(x.a)}</button>`).join("")}</div><div class="match-list">${right.map(x=>`<button class="match-btn" data-side="b" data-id="${x.id}">${escapeHtml(x.b)}</button>`).join("")}</div></div></div>`},
 memory(data,opt){const cards=shuffle(data.flatMap(x=>[{pid:x.id,text:x.a},{pid:x.id,text:x.b}])); return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Memory Match")}</h2><div class="act-sub">Flip cards and find pairs.</div></div><div class="score-pill">Pairs: <span data-pairs>0</span>/${data.length}</div></div><div class="memory-grid">${cards.map((c,i)=>`<button class="memory-card" data-pid="${c.pid}" data-text="${escapeHtml(c.text)}" data-index="${i}">?</button>`).join("")}</div></div>`},
 fillblank(data,opt){return renderBlanks(data,opt,"Blank Builder")},
 cloze(data,opt){return renderBlanks(data,opt,"Cloze Passage")},
 unscramble(data,opt){return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Word Scramble")}</h2><div class="act-sub">Unscramble each word.</div></div></div><div class="card-stack">${data.map((x,i)=>{const scrambled=shuffle(x.word.toUpperCase().split("")).join(" ");return `<div class="q-card"><b>${i+1}. ${escapeHtml(scrambled)}</b><p>${escapeHtml(x.hint)}</p><input class="blank-input" data-unscramble="${escapeHtml(x.word.toLowerCase())}" placeholder="Your answer"></div>`}).join("")}</div><div class="toolbar"><button class="btn primary" data-check-unscramble>Check Answers</button></div><div class="feedback" data-feedback></div></div>`},
 sentence(data,opt){return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Sentence Builder")}</h2><div class="act-sub">Click words to rebuild each sentence.</div></div></div><div class="card-stack">${data.map((s,i)=>{const words=s.split(/\s+/); return `<div class="q-card" data-sentence="${escapeHtml(s)}"><b>${i+1}.</b><div class="sentence-board" data-board></div><div class="toolbar">${shuffle(words).map(w=>`<button class="word-chip" data-word="${escapeHtml(w)}">${escapeHtml(w)}</button>`).join("")}</div><button class="btn ghost" data-check-sentence>Check</button><div class="feedback"></div></div>`}).join("")}</div></div>`},
 ordering(data,opt){const items=shuffle(data); return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Order Race")}</h2><div class="act-sub">Move items into the correct order.</div></div></div><div class="match-list" data-order-list>${items.map(x=>`<div class="q-card" data-order="${x.order}"><b>${escapeHtml(x.text)}</b><div class="toolbar"><button class="btn ghost" data-up>↑</button><button class="btn ghost" data-down>↓</button></div></div>`).join("")}</div><div class="toolbar"><button class="btn primary" data-check-order>Check Order</button></div><div class="feedback" data-feedback></div></div>`},
 categories(data,opt){const cats=[...new Set(data.map(x=>x.cat))]; const items=shuffle(data); return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Category Sort")}</h2><div class="act-sub">Select an item, then click its category.</div></div><div class="score-pill">Placed: <span data-placed>0</span>/${items.length}</div></div><div class="toolbar" data-cat-items>${items.map(x=>`<button class="chip" data-item="${escapeHtml(x.item)}" data-cat="${escapeHtml(x.cat)}">${escapeHtml(x.item)}</button>`).join("")}</div><div class="grid-two">${cats.map(c=>`<div class="drop-box" data-catbox="${escapeHtml(c)}"><h3>${escapeHtml(c)}</h3><div class="match-list"></div></div>`).join("")}</div></div>`},
 bingo(data,opt){let cells=shuffle(data).slice(0,24); cells.splice(12,0,"FREE"); return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Vocabulary Bingo")}</h2><div class="act-sub">Click cells as items are called.</div></div><div class="score-pill" data-bingo-status>Ready</div></div><div class="bingo-grid">${cells.map((x,i)=>`<button class="bingo-cell ${x==="FREE"?"on":""}" data-bingo="${i}">${escapeHtml(x)}</button>`).join("")}</div></div>`},
 wordsearch(data,opt){const grid=makeWordSearch(data); return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Word Search")}</h2><div class="act-sub">Click letters in a straight line to find words.</div></div></div><div class="toolbar">Words: ${data.map(w=>`<span class="chip" data-ws-word="${w}">${escapeHtml(w)}</span>`).join("")}</div><div class="wordsearch">${grid.map((row,r)=>`<div class="ws-row">${row.map((ch,c)=>`<button class="ws-cell" data-r="${r}" data-c="${c}">${ch}</button>`).join("")}</div>`).join("")}</div><div class="toolbar"><button class="btn ghost" data-clear-ws>Clear selection</button></div><div class="feedback" data-feedback></div></div>`},
 crossword(data,opt){return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Crossword Lite")}</h2><div class="act-sub">Type each answer using the clues.</div></div></div>${data.map((x,i)=>`<div class="crossword-row" data-word="${x.word}"><div><b>${i+1}.</b> ${escapeHtml(x.clue)}</div><div>${x.word.split("").map((_,j)=>`<input maxlength="1" class="letter-input" data-letter="${j}">`).join("")}</div></div>`).join("")}<div class="toolbar"><button class="btn primary" data-check-crossword>Check Answers</button><button class="btn ghost" data-show-crossword>Show Answers</button></div><div class="feedback" data-feedback></div></div>`},
 prompts(data,opt){return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Prompt Cards")}</h2><div class="act-sub">Draw a random speaking prompt.</div></div></div><div class="prompt-card" data-prompt-result>${escapeHtml(data[0]||"Prompt")}</div><div class="toolbar"><button class="btn primary" data-next-prompt>Next Prompt</button></div></div>`},
 table(data,opt){const head=data[0]||[]; const rows=data.slice(1); return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||"Study Table")}</h2><div class="act-sub">Reference table generated from your text.</div></div></div><div class="table-wrap"><table class="act-table"><thead><tr>${head.map(h=>`<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${head.map((_,i)=>`<td>${escapeHtml(r[i]||"")}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`}
};
function renderBlanks(data,opt,title){
  let i=0;
  const html = escapeHtml(data.text).replace(/\{([^}]+)\}/g,()=>`<input class="blank-input" data-blank="${i++}" placeholder="answer">`);
  return `<div class="act"><div class="act-header"><div><h2 class="act-title">${escapeHtml(opt.title||title)}</h2><div class="act-sub">Fill in the blanks, then check.</div></div></div><div class="q-card" data-answers="${escapeHtml(JSON.stringify(data.answers))}">${html.replace(/\n/g,"<br>")}</div><div class="toolbar"><button class="btn primary" data-check-blanks>Check Answers</button><button class="btn ghost" data-show-blanks>Show Answers</button></div><div class="feedback" data-feedback></div></div>`;
}
function makeWordSearch(words){
  const size=Math.max(12, Math.min(18, Math.max(...words.map(w=>w.length), 8)+4));
  const grid=Array.from({length:size},()=>Array.from({length:size},()=>null));
  words.forEach((word,idx)=>{
    let placed=false;
    for(let tries=0; tries<100 && !placed; tries++){
      const horizontal = Math.random()>.35;
      const r=Math.floor(Math.random()*(horizontal?size:size-word.length));
      const c=Math.floor(Math.random()*(horizontal?size-word.length:size));
      let ok=true;
      for(let i=0;i<word.length;i++){
        const rr=r+(horizontal?0:i), cc=c+(horizontal?i:0);
        if(grid[rr][cc] && grid[rr][cc]!==word[i]) ok=false;
      }
      if(ok){for(let i=0;i<word.length;i++){const rr=r+(horizontal?0:i), cc=c+(horizontal?i:0); grid[rr][cc]=word[i]} placed=true;}
    }
  });
  const letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return grid.map(row=>row.map(ch=>ch || letters[Math.floor(Math.random()*letters.length)]));
}

/* Binders */
function bindActivity(container,id,data){
  container.querySelectorAll("[data-reset-activity]").forEach(b=>b.onclick=()=>renderActivity(container,id,data,{title:selectedTemplate?.name||"Activity"}));
  if(id==="quiz"){
    container.addEventListener("click", function onQuiz(e){
      const btn=e.target.closest(".option-btn"); if(!btn || !container.contains(btn)) return;
      const card=btn.closest(".q-card"); if(card.dataset.done) return;
      const correct=card.dataset.correct; card.dataset.done="1";
      card.querySelectorAll(".option-btn").forEach(x=>{ if(x.dataset.answer===correct) x.classList.add("correct")});
      if(btn.dataset.answer!==correct) btn.classList.add("wrong");
      updateScore(container,".q-card",".option-btn.correct");
    }, {once:false});
  }
  if(id==="truefalse"){
    container.addEventListener("click", e=>{
      const btn=e.target.closest("[data-tf]"); if(!btn) return;
      const card=btn.closest(".q-card"); if(card.dataset.done) return; card.dataset.done="1";
      const ok=String(card.dataset.answer)===String(btn.dataset.tf);
      btn.classList.add(ok?"correct":"wrong");
      card.querySelector(`[data-tf="${card.dataset.answer}"]`)?.classList.add("correct");
      updateScoreTF(container);
    });
  }
  if(id==="flashcards"){
    container.querySelectorAll(".flip-card").forEach(card=>card.onclick=()=>{
      const showingBack=card.dataset.state==="back"; card.dataset.state=showingBack?"front":"back";
      card.innerHTML=escapeHtml(showingBack?card.dataset.front:card.dataset.back)+`<small>click to flip</small>`;
    });
  }
  if(id==="wheel"){
    container.querySelector("[data-spin]")?.addEventListener("click",()=>{
      const wheel=container.querySelector(".wheel");
      const result=container.querySelector("[data-spin-result]");
      const index=Math.floor(Math.random()*data.length);
      const old=Number(wheel.dataset.rotation||0);
      const rot=old+1440+(360-(index*360/data.length));
      wheel.dataset.rotation=rot; wheel.style.transform=`rotate(${rot}deg)`;
      setTimeout(()=>{result.textContent=data[index]}, 2800);
    });
  }
  if(id==="picker"){
    container.querySelector("[data-pick]")?.addEventListener("click",()=>{container.querySelector("[data-pick-result]").textContent=data[Math.floor(Math.random()*data.length)]});
  }
  if(id==="matching"){
    let sel=null, matched=0;
    container.querySelectorAll(".match-btn").forEach(btn=>btn.onclick=()=>{
      if(btn.classList.contains("correct")) return;
      if(!sel){sel=btn; btn.classList.add("selected"); return;}
      if(sel===btn){sel.classList.remove("selected"); sel=null; return;}
      const ok=sel.dataset.id===btn.dataset.id && sel.dataset.side!==btn.dataset.side;
      if(ok){sel.classList.add("correct"); btn.classList.add("correct"); matched++; container.querySelector("[data-matched]").textContent=matched}
      else{btn.classList.add("wrong"); setTimeout(()=>btn.classList.remove("wrong"),600)}
      sel.classList.remove("selected"); sel=null;
    });
  }
  if(id==="memory"){
    let open=[]; let pairs=0;
    container.querySelectorAll(".memory-card").forEach(card=>card.onclick=()=>{
      if(card.classList.contains("done") || open.includes(card)) return;
      card.textContent=card.dataset.text; card.classList.add("revealed"); open.push(card);
      if(open.length===2){
        if(open[0].dataset.pid===open[1].dataset.pid){open.forEach(c=>c.classList.add("done")); pairs++; container.querySelector("[data-pairs]").textContent=pairs; open=[]}
        else{setTimeout(()=>{open.forEach(c=>{c.textContent="?"; c.classList.remove("revealed")}); open=[]},750)}
      }
    });
  }
  if(id==="fillblank" || id==="cloze"){
    bindBlanks(container);
  }
  if(id==="unscramble"){
    container.querySelector("[data-check-unscramble]")?.addEventListener("click",()=>{
      let ok=0, total=0;
      container.querySelectorAll("[data-unscramble]").forEach(inp=>{total++; const good=inp.value.trim().toLowerCase()===inp.dataset.unscramble.toLowerCase(); inp.classList.toggle("correct",good); inp.classList.toggle("wrong",!good); if(good) ok++;});
      container.querySelector("[data-feedback]").textContent=`${ok}/${total} correct.`;
    });
  }
  if(id==="sentence"){
    container.querySelectorAll(".word-chip").forEach(chip=>chip.onclick=()=>{
      if(chip.disabled) return; const card=chip.closest(".q-card"); const b=card.querySelector("[data-board]");
      const clone=document.createElement("button"); clone.className="word-chip"; clone.textContent=chip.dataset.word; clone.onclick=()=>{chip.disabled=false; clone.remove()};
      b.appendChild(clone); chip.disabled=true;
    });
    container.querySelectorAll("[data-check-sentence]").forEach(btn=>btn.onclick=()=>{
      const card=btn.closest(".q-card"); const built=[...card.querySelector("[data-board]").children].map(x=>x.textContent).join(" ");
      const ok=built===card.dataset.sentence; card.querySelector(".feedback").textContent=ok?"Correct!":"Try again."; card.querySelector(".feedback").style.color=ok?"#05603a":"#b42318";
    });
  }
  if(id==="ordering"){
    container.querySelectorAll("[data-up]").forEach(btn=>btn.onclick=()=>{const item=btn.closest(".q-card"); if(item.previousElementSibling)item.parentNode.insertBefore(item,item.previousElementSibling)});
    container.querySelectorAll("[data-down]").forEach(btn=>btn.onclick=()=>{const item=btn.closest(".q-card"); if(item.nextElementSibling)item.parentNode.insertBefore(item.nextElementSibling,item)});
    container.querySelector("[data-check-order]")?.addEventListener("click",()=>{const arr=[...container.querySelectorAll("[data-order]")].map(x=>Number(x.dataset.order)); const ok=arr.every((v,i)=>v===i); container.querySelector("[data-feedback]").textContent=ok?"Correct order!":"Not yet. Move the items again.";});
  }
  if(id==="categories"){
    let picked=null; let placed=0;
    container.querySelectorAll("[data-item]").forEach(btn=>btn.onclick=()=>{picked=btn; container.querySelectorAll("[data-item]").forEach(x=>x.classList.remove("selected")); btn.classList.add("selected")});
    container.querySelectorAll("[data-catbox]").forEach(box=>box.onclick=()=>{
      if(!picked) return;
      const ok=picked.dataset.cat===box.dataset.catbox;
      if(ok){const span=document.createElement("span"); span.className="chip correct"; span.textContent=picked.dataset.item; box.querySelector(".match-list").appendChild(span); picked.remove(); picked=null; placed++; container.querySelector("[data-placed]").textContent=placed}
      else{box.classList.add("wrong"); setTimeout(()=>box.classList.remove("wrong"),500)}
    });
  }
  if(id==="bingo"){
    container.querySelectorAll(".bingo-cell").forEach(cell=>cell.onclick=()=>{cell.classList.toggle("on"); checkBingo(container)});
  }
  if(id==="wordsearch"){
    let selected=[];
    container.querySelectorAll(".ws-cell").forEach(cell=>cell.onclick=()=>{cell.classList.toggle("sel"); selected=[...container.querySelectorAll(".ws-cell.sel")]; checkWordSelection(container,selected)});
    container.querySelector("[data-clear-ws]")?.addEventListener("click",()=>{container.querySelectorAll(".ws-cell.sel").forEach(c=>c.classList.remove("sel")); selected=[]});
  }
  if(id==="crossword"){
    container.querySelector("[data-check-crossword]")?.addEventListener("click",()=>{
      let ok=0,total=0;
      container.querySelectorAll("[data-word]").forEach(row=>{total++; const val=[...row.querySelectorAll(".letter-input")].map(i=>i.value.toUpperCase()).join(""); const good=val===row.dataset.word; row.classList.toggle("correct",good); row.classList.toggle("wrong",!good); if(good) ok++;});
      container.querySelector("[data-feedback]").textContent=`${ok}/${total} correct.`;
    });
    container.querySelector("[data-show-crossword]")?.addEventListener("click",()=>{container.querySelectorAll("[data-word]").forEach(row=>{row.dataset.word.split("").forEach((ch,i)=>row.querySelectorAll(".letter-input")[i].value=ch)})});
  }
  if(id==="prompts"){
    container.querySelector("[data-next-prompt]")?.addEventListener("click",()=>{container.querySelector("[data-prompt-result]").textContent=data[Math.floor(Math.random()*data.length)]});
  }
}
function updateScore(container){
  let score=0; container.querySelectorAll(".q-card").forEach(card=>{const chosen=[...card.querySelectorAll(".option-btn")].find(b=>b.classList.contains("correct") && b.dataset.answer===card.dataset.correct && card.dataset.done); const wrong=[...card.querySelectorAll(".option-btn")].some(b=>b.classList.contains("wrong")); if(chosen && !wrong) score++;});
  container.querySelector("[data-score]").textContent=score;
}
function updateScoreTF(container){
  let score=0; container.querySelectorAll(".q-card").forEach(card=>{const btn=card.querySelector(".option-btn.correct"); if(btn && btn.dataset.tf===card.dataset.answer) score++;});
  container.querySelector("[data-score]").textContent=score;
}
function bindBlanks(container){
  const card=container.querySelector("[data-answers]");
  const answers=JSON.parse(card.dataset.answers||"[]");
  container.querySelector("[data-check-blanks]")?.addEventListener("click",()=>{
    let ok=0;
    container.querySelectorAll("[data-blank]").forEach(inp=>{const idx=Number(inp.dataset.blank); const good=inp.value.trim().toLowerCase()===String(answers[idx]).toLowerCase(); inp.classList.toggle("correct",good); inp.classList.toggle("wrong",!good); if(good)ok++;});
    container.querySelector("[data-feedback]").textContent=`${ok}/${answers.length} correct.`;
  });
  container.querySelector("[data-show-blanks]")?.addEventListener("click",()=>container.querySelectorAll("[data-blank]").forEach(inp=>inp.value=answers[Number(inp.dataset.blank)]||""));
}
function checkBingo(container){
  const on=[...container.querySelectorAll(".bingo-cell")].map(c=>c.classList.contains("on"));
  const wins=[];
  for(let r=0;r<5;r++) wins.push([0,1,2,3,4].every(c=>on[r*5+c]));
  for(let c=0;c<5;c++) wins.push([0,1,2,3,4].every(r=>on[r*5+c]));
  wins.push([0,6,12,18,24].every(i=>on[i])); wins.push([4,8,12,16,20].every(i=>on[i]));
  container.querySelector("[data-bingo-status]").textContent=wins.some(Boolean)?"BINGO!":"Keep going";
}
function checkWordSelection(container,selected){
  const text=selected.map(c=>c.textContent).join("");
  const rev=text.split("").reverse().join("");
  const word=[...container.querySelectorAll("[data-ws-word]")].find(w=>w.dataset.wsWord===text || w.dataset.wsWord===rev);
  if(word){selected.forEach(c=>{c.classList.add("found"); c.classList.remove("sel")}); word.classList.add("correct"); container.querySelector("[data-feedback]").textContent=`Found: ${word.dataset.wsWord}`;}
}

/* BRIAN_TEXTLAB_GAME_ENGINE_V2_START
   Direct interactive HTML engine for all 18 existing templates. */

function normalizeGameAnswer(value=""){
  return String(value).normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase();
}
function sameGameAnswer(a,b){return normalizeGameAnswer(a)===normalizeGameAnswer(b)}
function safeJsonAttr(value){return escapeHtml(JSON.stringify(value))}
function formatGameTime(seconds){
  const total=Math.max(0,Math.floor(Number(seconds)||0));
  return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}
function gameFrame(title,subtitle,total,body,options={}){
  const scoreLabel=options.scoreLabel||"Điểm";
  const progressLabel=options.progressLabel||"Tiến độ";
  return `<div class="act btl-game" data-btl-game>
    <div class="btl-game-head">
      <div><h2 class="act-title">${escapeHtml(title||"Activity")}</h2><div class="act-sub">${escapeHtml(subtitle||"")}</div></div>
      <div class="btl-game-metrics">
        <span>${escapeHtml(scoreLabel)} <b data-game-score>0</b></span>
        <span>${escapeHtml(progressLabel)} <b data-game-progress>0</b>/<b data-game-total>${Number(total)||0}</b></span>
        <span>⏱ <b data-game-time>00:00</b></span>
      </div>
    </div>
    <div class="btl-progress"><i data-game-bar></i></div>
    <div class="btl-game-body">${body||""}</div>
    <div class="btl-game-live" data-game-live aria-live="polite"></div>
    <div data-game-summary-host></div>
  </div>`;
}
function syncGameRuntime(state){
  const root=state.container;
  root.querySelector("[data-game-score]")?.replaceChildren(document.createTextNode(String(state.score)));
  root.querySelector("[data-game-progress]")?.replaceChildren(document.createTextNode(String(state.progress)));
  root.querySelector("[data-game-total]")?.replaceChildren(document.createTextNode(String(state.total)));
  const pct=state.total?Math.min(100,Math.round(state.progress/state.total*100)):0;
  const bar=root.querySelector("[data-game-bar]"); if(bar) bar.style.width=`${pct}%`;
  const time=root.querySelector("[data-game-time]"); if(time) time.textContent=formatGameTime((Date.now()-state.startedAt)/1000);
}
function cleanupGame(container){
  if(container?.__btlGameCleanup){try{container.__btlGameCleanup()}catch{} container.__btlGameCleanup=null}
}
function createGameRuntime(container,id,data,options={}){
  cleanupGame(container);
  const state={
    container,id,data,title:options.title||selectedTemplate?.name||"Activity",
    total:Math.max(0,Number(options.total??(Array.isArray(data)?data.length:0))||0),
    score:0,progress:0,mistakes:0,streak:0,bestStreak:0,
    startedAt:Date.now(),finished:false,meta:{},timer:null
  };
  state.timer=setInterval(()=>syncGameRuntime(state),500);
  container.__btlGameState=state;
  container.__btlGameCleanup=()=>{
    clearInterval(state.timer);
    clearInterval(container.__btlRoundTimer);
    document.removeEventListener("pointerup",container.__btlPointerUp||(()=>{}));
  };
  syncGameRuntime(state);
  return state;
}
function announceGame(state,message,type="info"){
  const live=state.container.querySelector("[data-game-live]");
  if(live){live.textContent=message||""; live.dataset.type=type}
}
function flashGame(target,correct){
  if(!target)return;
  target.classList.remove("btl-answer-correct","btl-answer-wrong");
  void target.offsetWidth;
  target.classList.add(correct?"btl-answer-correct":"btl-answer-wrong");
  setTimeout(()=>target.classList.remove("btl-answer-correct","btl-answer-wrong"),650);
}
function emitGameConfetti(container){
  const host=container.querySelector("[data-game-summary-host]")||container;
  for(let i=0;i<34;i++){
    const bit=document.createElement("i"); bit.className="btl-confetti";
    bit.style.left=`${5+Math.random()*90}%`;
    bit.style.setProperty("--delay",`${Math.random()*.45}s`);
    bit.style.setProperty("--drift",`${-70+Math.random()*140}px`);
    host.appendChild(bit); setTimeout(()=>bit.remove(),2200);
  }
}
function finishGame(state,options={}){
  if(state.finished)return;
  state.finished=true; clearInterval(state.timer); syncGameRuntime(state);
  const elapsed=Math.max(1,Math.round((Date.now()-state.startedAt)/1000));
  const denominator=Math.max(1,Number(options.total??state.total)||1);
  const score=Number(options.score??state.score)||0;
  const percent=Math.max(0,Math.min(100,Math.round(score/denominator*100)));
  const title=options.title||"Hoàn thành!";
  const message=options.message||`${score}/${denominator} mục chính xác`;
  const host=state.container.querySelector("[data-game-summary-host]");
  if(!host)return;
  host.innerHTML=`<div class="btl-summary-backdrop"><section class="btl-summary" role="dialog" aria-modal="true" aria-label="Tổng kết hoạt động">
    <div class="btl-summary-icon">${percent>=80?"🏆":percent>=50?"⭐":"👏"}</div>
    <h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p>
    <div class="btl-summary-grid">
      <div><b>${score}</b><span>Điểm</span></div><div><b>${percent}%</b><span>Kết quả</span></div>
      <div><b>${state.mistakes}</b><span>Lượt sai</span></div><div><b>${formatGameTime(elapsed)}</b><span>Thời gian</span></div>
    </div>
    ${options.detail?`<div class="btl-summary-detail">${escapeHtml(options.detail)}</div>`:""}
    <div class="toolbar"><button class="btn primary" data-game-replay>Chơi lại</button><button class="btn ghost" data-game-close>Đóng tổng kết</button></div>
  </section></div>`;
  host.querySelector("[data-game-replay]")?.addEventListener("click",()=>renderActivity(state.container,state.id,state.data,{title:state.title}));
  host.querySelector("[data-game-close]")?.addEventListener("click",()=>host.replaceChildren());
  emitGameConfetti(state.container);
}
function recordGame(state,correct,progress=1){
  state.progress=Math.min(state.total,state.progress+Math.max(0,progress));
  if(correct){state.score+=Math.max(0,progress);state.streak++;state.bestStreak=Math.max(state.bestStreak,state.streak)}
  else{state.mistakes++;state.streak=0}
  syncGameRuntime(state);
}
function setGameTotals(state,{score,progress,mistakes}={}){
  if(Number.isFinite(score))state.score=score;
  if(Number.isFinite(progress))state.progress=progress;
  if(Number.isFinite(mistakes))state.mistakes=mistakes;
  syncGameRuntime(state);
}
function renderTypedBlankGame(data,opt,title){
  let i=0;
  const html=escapeHtml(data.text).replace(/\{([^}]+)\}/g,()=>`<input class="blank-input btl-blank" data-blank="${i++}" autocomplete="off" placeholder="answer">`);
  return gameFrame(opt.title||title,"Điền đáp án rồi kiểm tra một lần.",data.answers.length,
    `<div class="q-card btl-passage" data-answers="${safeJsonAttr(data.answers)}">${html.replace(/\n/g,"<br>")}</div>
     <div class="toolbar"><button class="btn primary" data-check-typed-blanks>Kiểm tra</button><button class="btn ghost" data-show-typed-blanks>Xem đáp án</button></div>`,
    {progressLabel:"Câu"});
}
function renderClozeGame(data,opt){
  let i=0;
  const passage=escapeHtml(data.text).replace(/\{([^}]+)\}/g,()=>`<button class="btl-cloze-slot" type="button" data-cloze-slot="${i++}">_____</button>`);
  const bank=shuffle(data.answers.map((text,index)=>({text,index})));
  return gameFrame(opt.title||"Cloze Passage","Chọn từ trong ngân hàng rồi đặt vào chỗ trống.",data.answers.length,
    `<div class="btl-word-bank">${bank.map(x=>`<button class="word-chip" type="button" data-cloze-chip="${x.index}" data-word="${escapeHtml(x.text)}">${escapeHtml(x.text)}</button>`).join("")}</div>
     <div class="q-card btl-passage" data-answers="${safeJsonAttr(data.answers)}">${passage.replace(/\n/g,"<br>")}</div>
     <div class="toolbar"><button class="btn primary" data-check-cloze>Kiểm tra</button><button class="btn ghost" data-reset-cloze>Làm lại</button></div>`,
    {progressLabel:"Ô"});
}
function makeWordSearchGame(words){
  const clean=words.map(w=>String(w).replace(/[^A-Z]/gi,"").toUpperCase()).filter(Boolean);
  const size=Math.max(12,Math.min(20,Math.max(8,...clean.map(w=>w.length))+5));
  const grid=Array.from({length:size},()=>Array(size).fill(""));
  const dirs=[[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]];
  const placed=[];
  clean.forEach(word=>{
    let success=false;
    for(let tries=0;tries<350&&!success;tries++){
      const [dr,dc]=dirs[Math.floor(Math.random()*dirs.length)];
      const r=Math.floor(Math.random()*size),c=Math.floor(Math.random()*size);
      const er=r+dr*(word.length-1),ec=c+dc*(word.length-1);
      if(er<0||er>=size||ec<0||ec>=size)continue;
      let ok=true;
      for(let i=0;i<word.length;i++){const old=grid[r+dr*i][c+dc*i];if(old&&old!==word[i]){ok=false;break}}
      if(!ok)continue;
      const cells=[];
      for(let i=0;i<word.length;i++){const rr=r+dr*i,cc=c+dc*i;grid[rr][cc]=word[i];cells.push([rr,cc])}
      placed.push({word,cells});success=true;
    }
  });
  const letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  grid.forEach(row=>row.forEach((v,i)=>{if(!v)row[i]=letters[Math.floor(Math.random()*letters.length)]}));
  return {grid,words:placed.map(x=>x.word)};
}
function straightSelectionPath(start,end){
  if(!start||!end)return[];
  const dr=end.r-start.r,dc=end.c-start.c;
  if(!(dr===0||dc===0||Math.abs(dr)===Math.abs(dc)))return[];
  const steps=Math.max(Math.abs(dr),Math.abs(dc));
  const sr=steps?dr/steps:0,sc=steps?dc/steps:0;
  return Array.from({length:steps+1},(_,i)=>({r:start.r+sr*i,c:start.c+sc*i}));
}
function bingoWin(cells){
  const on=cells.map(c=>c.classList.contains("on"));
  for(let r=0;r<5;r++)if([0,1,2,3,4].every(c=>on[r*5+c]))return true;
  for(let c=0;c<5;c++)if([0,1,2,3,4].every(r=>on[r*5+c]))return true;
  return [0,6,12,18,24].every(i=>on[i])||[4,8,12,16,20].every(i=>on[i]);
}

Object.assign(ACTIVITY_RENDERERS,{
  quiz(data,opt){return gameFrame(opt.title||"Quick Quiz","Chọn một đáp án. Mỗi câu chỉ được trả lời một lần.",data.length,`<div data-round-host></div>`,{progressLabel:"Câu"})},
  truefalse(data,opt){return gameFrame(opt.title||"True / False","Chọn Đúng hoặc Sai cho từng nhận định.",data.length,`<div data-round-host></div>`,{progressLabel:"Câu"})},
  flashcards(data,opt){return gameFrame(opt.title||"Flip Cards","Lật thẻ rồi tự đánh giá: Đã nhớ hoặc Cần ôn.",data.length,`<div class="btl-study-card" data-flash-card></div><div class="toolbar btl-center"><button class="btn ghost" data-flash-flip>Lật thẻ</button><button class="btn primary" data-flash-know disabled>Đã nhớ</button><button class="btn ghost" data-flash-review disabled>Cần ôn</button></div>`,{scoreLabel:"Đã nhớ",progressLabel:"Thẻ"})},
  wheel(data,opt){const n=Math.max(data.length,1),colors=["#1479ff","#2fd2ff","#7c3aed","#17b26a","#f59e0b","#f04438","#38bdf8","#6366f1"],grad=data.map((_,i)=>`${colors[i%colors.length]} ${i*100/n}% ${(i+1)*100/n}%`).join(",");return gameFrame(opt.title||"Spin Selector","Quay ngẫu nhiên, có thể loại mục đã xuất hiện.",data.length,`<div class="wheel-wrap"><div class="btl-wheel-pointer">▼</div><div class="wheel" style="background:conic-gradient(${grad})" data-rotation="0"></div><label class="btl-check"><input type="checkbox" data-no-repeat checked> Không lặp mục đã quay</label><button class="btn primary" data-spin-game>Quay</button><div class="prompt-card" data-spin-result>Sẵn sàng?</div><div class="btl-history" data-spin-history></div></div>`,{scoreLabel:"Đã chọn",progressLabel:"Mục"})},
  picker(data,opt){return gameFrame(opt.title||"Random Picker","Bốc ngẫu nhiên không lặp và lưu lịch sử.",data.length,`<div class="btl-picker-box" data-picker-box>?</div><div class="toolbar btl-center"><button class="btn primary" data-picker-next>Bốc một mục</button><button class="btn ghost" data-picker-reset>Làm mới túi</button></div><div class="btl-history" data-picker-history></div>`,{scoreLabel:"Đã bốc",progressLabel:"Mục"})},
  matching(data,opt){const left=shuffle(data),right=shuffle(data);return gameFrame(opt.title||"Match Link","Chọn một mục ở mỗi cột để nối cặp.",data.length,`<div class="grid-two"><div class="match-list">${left.map(x=>`<button class="match-btn" data-side="a" data-id="${x.id}">${escapeHtml(x.a)}</button>`).join("")}</div><div class="match-list">${right.map(x=>`<button class="match-btn" data-side="b" data-id="${x.id}">${escapeHtml(x.b)}</button>`).join("")}</div></div>`,{scoreLabel:"Đúng",progressLabel:"Cặp"})},
  memory(data,opt){const cards=shuffle(data.flatMap(x=>[{pid:x.id,text:x.a},{pid:x.id,text:x.b}]));return gameFrame(opt.title||"Memory Match","Lật hai thẻ để tìm cặp tương ứng.",data.length,`<div class="memory-grid">${cards.map((c,i)=>`<button class="memory-card" data-pid="${c.pid}" data-text="${escapeHtml(c.text)}" data-index="${i}">?</button>`).join("")}</div>`,{scoreLabel:"Cặp",progressLabel:"Đã tìm"})},
  fillblank(data,opt){return renderTypedBlankGame(data,opt,"Blank Builder")},
  cloze(data,opt){return renderClozeGame(data,opt)},
  unscramble(data,opt){return gameFrame(opt.title||"Word Scramble","Sắp xếp chữ và nhập từ đúng.",data.length,`<div data-round-host></div>`,{progressLabel:"Từ"})},
  sentence(data,opt){return gameFrame(opt.title||"Sentence Builder","Bấm các từ theo đúng thứ tự để tạo câu.",data.length,`<div data-round-host></div>`,{progressLabel:"Câu"})},
  ordering(data,opt){const items=shuffle(data);return gameFrame(opt.title||"Order Race","Kéo thả hoặc dùng mũi tên để sắp xếp đúng thứ tự.",data.length,`<div class="btl-order-list" data-order-list>${items.map((x,i)=>`<div class="q-card btl-order-item" draggable="true" data-order="${x.order}"><span class="btl-drag">⠿</span><b>${escapeHtml(x.text)}</b><span class="btl-order-actions"><button class="btn ghost" data-up>↑</button><button class="btn ghost" data-down>↓</button></span></div>`).join("")}</div><div class="toolbar"><button class="btn primary" data-check-order-game>Kiểm tra thứ tự</button></div>`,{scoreLabel:"Đúng vị trí",progressLabel:"Mục"})},
  categories(data,opt){const cats=[...new Set(data.map(x=>x.cat))],items=shuffle(data);return gameFrame(opt.title||"Category Sort","Kéo mục vào nhóm hoặc chọn mục rồi chọn nhóm.",items.length,`<div class="btl-sort-bank" data-sort-bank>${items.map((x,i)=>`<button class="chip btl-sort-item" draggable="true" data-sort-index="${i}" data-item="${escapeHtml(x.item)}" data-cat="${escapeHtml(x.cat)}">${escapeHtml(x.item)}</button>`).join("")}</div><div class="btl-category-grid">${cats.map(c=>`<section class="drop-box" data-catbox="${escapeHtml(c)}"><h3>${escapeHtml(c)}</h3><div class="match-list"></div></section>`).join("")}</div>`,{scoreLabel:"Đã xếp",progressLabel:"Mục"})},
  bingo(data,opt){let cells=shuffle(data).slice(0,24);while(cells.length<24)cells.push(`Item ${cells.length+1}`);cells.splice(12,0,"FREE");return gameFrame(opt.title||"Vocabulary Bingo","Gọi từ ngẫu nhiên, chỉ đánh dấu các ô đã được gọi.",24,`<div class="btl-bingo-caller"><button class="btn primary" data-call-bingo>Gọi từ tiếp theo</button><div class="prompt-card" data-called-word>Nhấn để bắt đầu</div><div class="btl-history" data-called-history></div></div><div class="bingo-grid">${cells.map((x,i)=>`<button class="bingo-cell ${x==="FREE"?"on":""}" data-bingo-word="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join("")}</div>`,{scoreLabel:"Đã đánh dấu",progressLabel:"Ô"})},
  wordsearch(data,opt){const built=makeWordSearchGame(data);return gameFrame(opt.title||"Word Search","Kéo từ chữ đầu đến chữ cuối theo hàng, cột hoặc đường chéo.",built.words.length,`<div class="btl-word-list">${built.words.map(w=>`<span class="chip" data-ws-word="${w}">${escapeHtml(w)}</span>`).join("")}</div><div class="wordsearch btl-wordsearch" data-ws-grid>${built.grid.map((row,r)=>`<div class="ws-row">${row.map((ch,c)=>`<button class="ws-cell" data-r="${r}" data-c="${c}">${ch}</button>`).join("")}</div>`).join("")}</div><div class="toolbar"><button class="btn ghost" data-clear-ws-game>Xóa vùng chọn</button></div>`,{scoreLabel:"Đã tìm",progressLabel:"Từ"})},
  crossword(data,opt){return gameFrame(opt.title||"Crossword Lite","Nhập đáp án theo gợi ý; phím mũi tên và Backspace được hỗ trợ.",data.length,`<div class="card-stack">${data.map((x,i)=>`<div class="crossword-row q-card" data-word="${x.word}"><div><b>${i+1}.</b> ${escapeHtml(x.clue)}</div><div class="btl-letter-row">${x.word.split("").map((_,j)=>`<input maxlength="1" inputmode="text" class="letter-input" data-letter="${j}" aria-label="Chữ ${j+1}">`).join("")}</div></div>`).join("")}</div><div class="toolbar"><button class="btn primary" data-check-crossword-game>Kiểm tra một lần</button><button class="btn ghost" data-show-crossword-game>Xem đáp án</button></div>`,{progressLabel:"Từ"})},
  prompts(data,opt){return gameFrame(opt.title||"Prompt Cards","Mỗi thẻ có 60 giây. Hoàn thành hoặc bỏ qua để sang thẻ tiếp theo.",data.length,`<div class="btl-prompt-timer"><b data-prompt-seconds>60</b>s</div><div class="prompt-card" data-prompt-card></div><div class="toolbar btl-center"><button class="btn primary" data-prompt-done>Đã hoàn thành</button><button class="btn ghost" data-prompt-skip>Bỏ qua</button></div>`,{scoreLabel:"Hoàn thành",progressLabel:"Thẻ"})},
  table(data,opt){const head=data[0]||[],rows=data.slice(1);return gameFrame(opt.title||"Study Table","Tìm kiếm, ẩn đáp án và bấm từng ô để tự học.",rows.length,`<div class="btl-table-tools"><input class="search" data-table-search placeholder="Tìm trong bảng..."><label class="btl-check"><input type="checkbox" data-hide-table> Ẩn các cột đáp án</label></div><div class="table-wrap"><table class="act-table"><thead><tr>${head.map(h=>`<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r,ri)=>`<tr data-table-row="${ri}">${head.map((_,ci)=>`<td><button class="btl-table-cell" data-table-cell data-col="${ci}">${escapeHtml(r[ci]||"")}</button></td>`).join("")}</tr>`).join("")}</tbody></table></div>`,{scoreLabel:"Đã ôn",progressLabel:"Dòng"})}
});

function renderInteractiveActivity(container,id,data,options={}){
  cleanupGame(container);
  container.innerHTML=ACTIVITY_RENDERERS[id]?.(data,options)||`<p>Unsupported activity.</p>`;
  bindActivity(container,id,data,options);
}
function bindInteractiveActivity(container,id,data,options={}){
  const total=id==="fillblank"||id==="cloze"?(data?.answers?.length||0):id==="bingo"?24:Array.isArray(data)?data.length:0;
  const state=createGameRuntime(container,id,data,{title:options.title||selectedTemplate?.name||"Activity",total});
  if(!total&&id!=="table"){announceGame(state,"Chưa có dữ liệu để chơi.","error");return}

  if(id==="quiz"||id==="truefalse"){
    let index=0; const host=container.querySelector("[data-round-host]");
    const draw=()=>{
      if(index>=data.length){finishGame(state,{title:"Hoàn thành bài kiểm tra",detail:`Chuỗi đúng tốt nhất: ${state.bestStreak}`});return}
      const item=data[index];
      if(id==="quiz") host.innerHTML=`<div class="q-card btl-round"><div class="btl-round-number">Câu ${index+1}/${data.length}</div><h3>${escapeHtml(item.q)}</h3><div class="q-options">${item.choices.map(c=>`<button class="option-btn" data-choice="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}</div><div class="feedback" data-round-feedback></div></div>`;
      else host.innerHTML=`<div class="q-card btl-round"><div class="btl-round-number">Câu ${index+1}/${data.length}</div><h3>${escapeHtml(item.statement)}</h3><div class="q-options"><button class="option-btn" data-tf-choice="true">Đúng</button><button class="option-btn" data-tf-choice="false">Sai</button></div><div class="feedback" data-round-feedback></div></div>`;
      host.querySelectorAll(id==="quiz"?"[data-choice]":"[data-tf-choice]").forEach(btn=>btn.addEventListener("click",()=>{
        const ok=id==="quiz"?sameGameAnswer(btn.dataset.choice,item.correct):String(item.answer)===btn.dataset.tfChoice;
        host.querySelectorAll("button").forEach(x=>x.disabled=true);
        btn.classList.add(ok?"correct":"wrong");
        if(id==="quiz")host.querySelector(`[data-choice="${CSS.escape(item.correct)}"]`)?.classList.add("correct");
        else host.querySelector(`[data-tf-choice="${item.answer}"]`)?.classList.add("correct");
        recordGame(state,ok); flashGame(host.querySelector(".q-card"),ok);
        host.querySelector("[data-round-feedback]").textContent=ok?"✓ Chính xác":"✗ Đáp án chưa đúng";
        setTimeout(()=>{index++;draw()},850);
      },{once:true}));
    }; draw(); return;
  }

  if(id==="flashcards"){
    const deck=shuffle(data),card=container.querySelector("[data-flash-card]"); let index=0,back=false;
    const know=container.querySelector("[data-flash-know]"),review=container.querySelector("[data-flash-review]");
    const draw=()=>{if(index>=deck.length){finishGame(state,{title:"Hoàn thành bộ thẻ",message:`Đã nhớ ${state.score}/${state.total} thẻ`});return} back=false;card.classList.remove("flipped");card.innerHTML=`<span>${escapeHtml(deck[index].front)}</span><small>Nhấn Lật thẻ để xem đáp án</small>`;know.disabled=review.disabled=true};
    container.querySelector("[data-flash-flip]")?.addEventListener("click",()=>{back=!back;card.classList.toggle("flipped",back);card.innerHTML=`<span>${escapeHtml(back?deck[index].back:deck[index].front)}</span><small>${back?"Tự đánh giá mức độ ghi nhớ":"Nhấn Lật thẻ để xem đáp án"}</small>`;know.disabled=review.disabled=!back});
    know?.addEventListener("click",()=>{recordGame(state,true);index++;draw()}); review?.addEventListener("click",()=>{recordGame(state,false);index++;draw()}); draw(); return;
  }

  if(id==="wheel"){
    let remaining=data.map((_,i)=>i),history=[]; const wheel=container.querySelector(".wheel"),result=container.querySelector("[data-spin-result]"),button=container.querySelector("[data-spin-game]");
    button?.addEventListener("click",()=>{if(button.disabled)return;if(!remaining.length){finishGame(state,{title:"Đã quay hết danh sách",score:state.progress,total:state.total,message:`Đã chọn ${state.progress} mục`});return}button.disabled=true;const pool=container.querySelector("[data-no-repeat]")?.checked?remaining:data.map((_,i)=>i);const pick=pool[Math.floor(Math.random()*pool.length)];const old=Number(wheel.dataset.rotation||0),rot=old+1440+Math.random()*360;wheel.dataset.rotation=rot;wheel.style.transform=`rotate(${rot}deg)`;setTimeout(()=>{result.textContent=data[pick];history.unshift(data[pick]);container.querySelector("[data-spin-history]").innerHTML=history.map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join("");if(container.querySelector("[data-no-repeat]")?.checked){remaining=remaining.filter(i=>i!==pick);recordGame(state,true)}button.disabled=false;if(!remaining.length)setTimeout(()=>finishGame(state,{title:"Đã quay hết danh sách",score:state.progress,total:state.total,message:`Đã chọn đủ ${state.total} mục`}),450)},2850)}); return;
  }

  if(id==="picker"){
    let bag=shuffle(data.map((_,i)=>i)),history=[];const box=container.querySelector("[data-picker-box]");
    const reset=()=>{bag=shuffle(data.map((_,i)=>i));history=[];setGameTotals(state,{score:0,progress:0,mistakes:0});box.textContent="?";container.querySelector("[data-picker-history]").replaceChildren()};
    container.querySelector("[data-picker-next]")?.addEventListener("click",()=>{if(!bag.length){finishGame(state,{title:"Đã bốc hết danh sách",score:state.progress,total:state.total,message:`Đã bốc ${state.total} mục không lặp`});return}box.classList.add("rolling");setTimeout(()=>{const i=bag.pop();box.textContent=data[i];box.classList.remove("rolling");history.unshift(data[i]);container.querySelector("[data-picker-history]").innerHTML=history.map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join("");recordGame(state,true);if(!bag.length)setTimeout(()=>finishGame(state,{title:"Đã bốc hết danh sách",score:state.total,total:state.total,message:`Đã bốc ${state.total} mục không lặp`}),350)},420)});container.querySelector("[data-picker-reset]")?.addEventListener("click",reset);return;
  }

  if(id==="matching"){
    let selected=null,matched=0;container.querySelectorAll(".match-btn").forEach(btn=>btn.addEventListener("click",()=>{if(btn.classList.contains("correct"))return;if(!selected){selected=btn;btn.classList.add("selected");return}if(selected===btn){btn.classList.remove("selected");selected=null;return}const ok=selected.dataset.id===btn.dataset.id&&selected.dataset.side!==btn.dataset.side;if(ok){selected.classList.add("correct");btn.classList.add("correct");matched++;recordGame(state,true);announceGame(state,"Nối đúng một cặp!","success");if(matched===data.length)setTimeout(()=>finishGame(state,{title:"Đã nối tất cả các cặp"}),350)}else{recordGame(state,false,0);flashGame(btn,false);announceGame(state,"Hai mục này không khớp.","error")}selected.classList.remove("selected");selected=null}));return;
  }

  if(id==="memory"){
    let open=[],pairs=0,moves=0;container.querySelectorAll(".memory-card").forEach(card=>card.addEventListener("click",()=>{if(card.classList.contains("done")||open.includes(card)||open.length===2)return;card.textContent=card.dataset.text;card.classList.add("revealed");open.push(card);if(open.length===2){moves++;if(open[0].dataset.pid===open[1].dataset.pid){open.forEach(c=>c.classList.add("done"));pairs++;recordGame(state,true);open=[];if(pairs===data.length)setTimeout(()=>finishGame(state,{title:"Đã tìm đủ các cặp",detail:`Số lượt lật đôi: ${moves}`}),300)}else{recordGame(state,false,0);setTimeout(()=>{open.forEach(c=>{c.textContent="?";c.classList.remove("revealed")});open=[]},700)}}}));return;
  }

  if(id==="fillblank"){
    const answers=data.answers;container.querySelector("[data-check-typed-blanks]")?.addEventListener("click",e=>{let ok=0;container.querySelectorAll("[data-blank]").forEach(inp=>{const good=sameGameAnswer(inp.value,answers[Number(inp.dataset.blank)]);inp.classList.add(good?"correct":"wrong");inp.disabled=true;if(good)ok++});e.currentTarget.disabled=true;setGameTotals(state,{score:ok,progress:answers.length,mistakes:answers.length-ok});finishGame(state,{title:"Hoàn thành bài điền từ",score:ok,total:answers.length})},{once:true});container.querySelector("[data-show-typed-blanks]")?.addEventListener("click",()=>container.querySelectorAll("[data-blank]").forEach(inp=>{inp.value=answers[Number(inp.dataset.blank)]||""}));return;
  }

  if(id==="cloze"){
    let selected=null;const chips=[...container.querySelectorAll("[data-cloze-chip]")],slots=[...container.querySelectorAll("[data-cloze-slot]")];chips.forEach(chip=>chip.addEventListener("click",()=>{if(chip.disabled)return;chips.forEach(x=>x.classList.remove("selected"));selected=chip;chip.classList.add("selected")}));slots.forEach(slot=>slot.addEventListener("click",()=>{if(!selected)return;const old=slot.dataset.chip;if(old!==undefined&&old!==""){const oldChip=container.querySelector(`[data-cloze-chip="${old}"]`);if(oldChip)oldChip.disabled=false}slot.dataset.chip=selected.dataset.clozeChip;slot.textContent=selected.dataset.word;selected.disabled=true;selected.classList.remove("selected");selected=null}));container.querySelector("[data-reset-cloze]")?.addEventListener("click",()=>{slots.forEach(s=>{s.textContent="_____";s.dataset.chip="";s.classList.remove("correct","wrong")});chips.forEach(c=>{c.disabled=false;c.classList.remove("selected")});selected=null});container.querySelector("[data-check-cloze]")?.addEventListener("click",e=>{let ok=0;slots.forEach((slot,i)=>{const good=sameGameAnswer(slot.textContent,data.answers[i]);slot.classList.add(good?"correct":"wrong");if(good)ok++});chips.forEach(c=>c.disabled=true);e.currentTarget.disabled=true;setGameTotals(state,{score:ok,progress:data.answers.length,mistakes:data.answers.length-ok});finishGame(state,{title:"Hoàn thành Cloze Passage",score:ok,total:data.answers.length})},{once:true});return;
  }

  if(id==="unscramble"){
    let index=0;const host=container.querySelector("[data-round-host]");const draw=()=>{if(index>=data.length){finishGame(state,{title:"Hoàn thành Word Scramble"});return}const item=data[index],scrambled=shuffle(item.word.toUpperCase().split("")).join(" ");host.innerHTML=`<div class="q-card btl-round"><div class="btl-round-number">Từ ${index+1}/${data.length}</div><div class="btl-scramble">${escapeHtml(scrambled)}</div><p>${escapeHtml(item.hint)}</p><input class="blank-input" data-word-input autocomplete="off" placeholder="Nhập từ đúng"><button class="btn primary" data-word-check>Kiểm tra</button><div class="feedback" data-round-feedback></div></div>`;const inputEl=host.querySelector("[data-word-input]"),check=host.querySelector("[data-word-check]");const submit=()=>{if(check.disabled)return;const ok=sameGameAnswer(inputEl.value,item.word);check.disabled=inputEl.disabled=true;inputEl.classList.add(ok?"correct":"wrong");host.querySelector("[data-round-feedback]").textContent=ok?"✓ Chính xác":`✗ Đáp án: ${item.word}`;recordGame(state,ok);setTimeout(()=>{index++;draw()},900)};check.addEventListener("click",submit);inputEl.addEventListener("keydown",e=>{if(e.key==="Enter")submit()});inputEl.focus()};draw();return;
  }

  if(id==="sentence"){
    let index=0;const host=container.querySelector("[data-round-host]");const draw=()=>{if(index>=data.length){finishGame(state,{title:"Hoàn thành Sentence Builder"});return}const sentence=data[index],words=sentence.split(/\s+/);host.innerHTML=`<div class="q-card btl-round"><div class="btl-round-number">Câu ${index+1}/${data.length}</div><div class="sentence-board" data-board></div><div class="btl-word-bank">${shuffle(words.map((word,i)=>({word,i}))).map(x=>`<button class="word-chip" data-source-word="${x.i}" data-word="${escapeHtml(x.word)}">${escapeHtml(x.word)}</button>`).join("")}</div><div class="toolbar"><button class="btn ghost" data-clear-sentence>Xóa</button><button class="btn primary" data-check-sentence-game>Kiểm tra</button></div><div class="feedback" data-round-feedback></div></div>`;const board=host.querySelector("[data-board]");host.querySelectorAll("[data-source-word]").forEach(chip=>chip.addEventListener("click",()=>{if(chip.disabled)return;chip.disabled=true;const out=document.createElement("button");out.className="word-chip";out.textContent=chip.dataset.word;out.dataset.origin=chip.dataset.sourceWord;out.addEventListener("click",()=>{chip.disabled=false;out.remove()});board.appendChild(out)}));host.querySelector("[data-clear-sentence]").addEventListener("click",()=>{board.querySelectorAll("[data-origin]").forEach(x=>host.querySelector(`[data-source-word="${x.dataset.origin}"]`).disabled=false);board.replaceChildren()});host.querySelector("[data-check-sentence-game]").addEventListener("click",e=>{const built=[...board.children].map(x=>x.textContent).join(" ");const ok=sameGameAnswer(built,sentence);e.currentTarget.disabled=true;host.querySelectorAll("button").forEach(x=>x.disabled=true);host.querySelector("[data-round-feedback]").textContent=ok?"✓ Câu chính xác":`✗ Đáp án: ${sentence}`;recordGame(state,ok);setTimeout(()=>{index++;draw()},1000)},{once:true})};draw();return;
  }

  if(id==="ordering"){
    const list=container.querySelector("[data-order-list]");let drag=null;list.querySelectorAll("[draggable]").forEach(item=>{item.addEventListener("dragstart",()=>{drag=item;item.classList.add("dragging")});item.addEventListener("dragend",()=>{item.classList.remove("dragging");drag=null});item.addEventListener("dragover",e=>{e.preventDefault();if(!drag||drag===item)return;const box=item.getBoundingClientRect();list.insertBefore(drag,e.clientY<box.top+box.height/2?item:item.nextSibling)})});list.querySelectorAll("[data-up]").forEach(btn=>btn.addEventListener("click",()=>{const item=btn.closest("[data-order]");if(item.previousElementSibling)list.insertBefore(item,item.previousElementSibling)}));list.querySelectorAll("[data-down]").forEach(btn=>btn.addEventListener("click",()=>{const item=btn.closest("[data-order]");if(item.nextElementSibling)list.insertBefore(item.nextElementSibling,item)}));container.querySelector("[data-check-order-game]")?.addEventListener("click",()=>{const items=[...list.querySelectorAll("[data-order]")];let correct=0;items.forEach((item,i)=>{const ok=Number(item.dataset.order)===i;item.classList.toggle("correct",ok);item.classList.toggle("wrong",!ok);if(ok)correct++});setGameTotals(state,{score:correct,progress:correct});if(correct===items.length)finishGame(state,{title:"Thứ tự hoàn toàn chính xác",score:correct,total:items.length});else{state.mistakes++;syncGameRuntime(state);announceGame(state,`${correct}/${items.length} mục đúng vị trí. Tiếp tục sắp xếp.`,"error")}});return;
  }

  if(id==="categories"){
    let selected=null;const place=(item,box)=>{if(!item||!box)return;const ok=item.dataset.cat===box.dataset.catbox;if(ok){item.classList.add("correct");item.draggable=false;box.querySelector(".match-list").appendChild(item);selected=null;recordGame(state,true);if(state.progress===state.total)setTimeout(()=>finishGame(state,{title:"Đã phân loại tất cả mục"}),300)}else{recordGame(state,false,0);flashGame(box,false)}};container.querySelectorAll("[data-sort-index]").forEach(item=>{item.addEventListener("click",()=>{container.querySelectorAll("[data-sort-index]").forEach(x=>x.classList.remove("selected"));selected=item;item.classList.add("selected")});item.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",item.dataset.sortIndex))});container.querySelectorAll("[data-catbox]").forEach(box=>{box.addEventListener("click",()=>place(selected,box));box.addEventListener("dragover",e=>e.preventDefault());box.addEventListener("drop",e=>{e.preventDefault();place(container.querySelector(`[data-sort-index="${e.dataTransfer.getData("text/plain")}"]`),box)})});return;
  }

  if(id==="bingo"){
    const source=shuffle(data),called=new Set(),cells=[...container.querySelectorAll(".bingo-cell")];const call=container.querySelector("[data-call-bingo]");call?.addEventListener("click",()=>{const left=source.filter(x=>!called.has(x));if(!left.length){announceGame(state,"Đã gọi hết danh sách.","info");call.disabled=true;return}const word=left[Math.floor(Math.random()*left.length)];called.add(word);container.querySelector("[data-called-word]").textContent=word;container.querySelector("[data-called-history]").innerHTML=[...called].reverse().map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join("")});cells.forEach(cell=>cell.addEventListener("click",()=>{const word=cell.dataset.bingoWord;if(word!=="FREE"&&!called.has(word)){flashGame(cell,false);state.mistakes++;syncGameRuntime(state);announceGame(state,"Ô này chưa được gọi.","error");return}cell.classList.toggle("on");const marked=cells.filter(x=>x.classList.contains("on")&&x.dataset.bingoWord!=="FREE").length;setGameTotals(state,{score:marked,progress:marked});if(bingoWin(cells))finishGame(state,{title:"BINGO!",score:marked,total:24,message:`Hoàn thành một hàng với ${marked} ô đã đánh dấu`})}));return;
  }

  if(id==="wordsearch"){
    const grid=container.querySelector("[data-ws-grid]");let start=null,current=[],dragging=false;const cellAt=(r,c)=>grid.querySelector(`[data-r="${r}"][data-c="${c}"]`);const paint=path=>{grid.querySelectorAll(".ws-cell.selecting").forEach(x=>x.classList.remove("selecting"));path.forEach(p=>cellAt(p.r,p.c)?.classList.add("selecting"));current=path};const finishSelection=()=>{if(!dragging)return;dragging=false;const text=current.map(p=>cellAt(p.r,p.c)?.textContent||"").join("");const rev=text.split("").reverse().join("");const chip=[...container.querySelectorAll("[data-ws-word]")].find(x=>!x.classList.contains("correct")&&(x.dataset.wsWord===text||x.dataset.wsWord===rev));if(chip){current.forEach(p=>{const c=cellAt(p.r,p.c);c.classList.remove("selecting");c.classList.add("found")});chip.classList.add("correct");recordGame(state,true);announceGame(state,`Đã tìm thấy ${chip.dataset.wsWord}`,"success");if(state.progress===state.total)setTimeout(()=>finishGame(state,{title:"Đã tìm đủ tất cả từ"}),250)}else{current.forEach(p=>cellAt(p.r,p.c)?.classList.remove("selecting"));if(current.length>1){recordGame(state,false,0);announceGame(state,"Chuỗi chữ này không có trong danh sách.","error")}}start=null;current=[]};grid.addEventListener("pointerdown",e=>{const cell=e.target.closest(".ws-cell");if(!cell||cell.classList.contains("found"))return;e.preventDefault();dragging=true;start={r:Number(cell.dataset.r),c:Number(cell.dataset.c)};paint([start])});grid.addEventListener("pointerover",e=>{if(!dragging)return;const cell=e.target.closest(".ws-cell");if(!cell)return;paint(straightSelectionPath(start,{r:Number(cell.dataset.r),c:Number(cell.dataset.c)}))});container.__btlPointerUp=finishSelection;document.addEventListener("pointerup",finishSelection);container.querySelector("[data-clear-ws-game]")?.addEventListener("click",()=>{grid.querySelectorAll(".selecting").forEach(x=>x.classList.remove("selecting"));start=null;current=[]});return;
  }

  if(id==="crossword"){
    container.querySelectorAll(".letter-input").forEach(inputEl=>{inputEl.addEventListener("input",()=>{inputEl.value=inputEl.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,1);if(inputEl.value)inputEl.nextElementSibling?.focus()});inputEl.addEventListener("keydown",e=>{if(e.key==="Backspace"&&!inputEl.value)inputEl.previousElementSibling?.focus();if(e.key==="ArrowRight")inputEl.nextElementSibling?.focus();if(e.key==="ArrowLeft")inputEl.previousElementSibling?.focus()})});container.querySelector("[data-check-crossword-game]")?.addEventListener("click",e=>{let ok=0;container.querySelectorAll("[data-word]").forEach(row=>{const val=[...row.querySelectorAll(".letter-input")].map(x=>x.value).join("");const good=sameGameAnswer(val,row.dataset.word);row.classList.add(good?"correct":"wrong");row.querySelectorAll("input").forEach(x=>x.disabled=true);if(good)ok++});e.currentTarget.disabled=true;setGameTotals(state,{score:ok,progress:data.length,mistakes:data.length-ok});finishGame(state,{title:"Hoàn thành Crossword Lite",score:ok,total:data.length})},{once:true});container.querySelector("[data-show-crossword-game]")?.addEventListener("click",()=>container.querySelectorAll("[data-word]").forEach(row=>row.dataset.word.split("").forEach((ch,i)=>row.querySelectorAll("input")[i].value=ch)));return;
  }

  if(id==="prompts"){
    const deck=shuffle(data),card=container.querySelector("[data-prompt-card]"),secondsEl=container.querySelector("[data-prompt-seconds]");let index=0,seconds=60;const draw=()=>{clearInterval(container.__btlRoundTimer);if(index>=deck.length){finishGame(state,{title:"Hoàn thành Prompt Cards",message:`Đã hoàn thành ${state.score}/${state.total} thẻ`});return}card.textContent=deck[index];seconds=60;secondsEl.textContent=seconds;container.__btlRoundTimer=setInterval(()=>{seconds--;secondsEl.textContent=seconds;if(seconds<=0){clearInterval(container.__btlRoundTimer);recordGame(state,false);index++;draw()}},1000)};container.querySelector("[data-prompt-done]")?.addEventListener("click",()=>{recordGame(state,true);index++;draw()});container.querySelector("[data-prompt-skip]")?.addEventListener("click",()=>{recordGame(state,false);index++;draw()});draw();return;
  }

  if(id==="table"){
    const rows=[...container.querySelectorAll("[data-table-row]")],revealed=new Set();state.total=rows.length;syncGameRuntime(state);container.querySelector("[data-table-search]")?.addEventListener("input",e=>{const q=normalizeGameAnswer(e.target.value);rows.forEach(row=>row.hidden=q&&!normalizeGameAnswer(row.textContent).includes(q))});const applyHidden=()=>{const hide=container.querySelector("[data-hide-table]")?.checked;container.querySelectorAll("[data-table-cell]").forEach(cell=>{if(Number(cell.dataset.col)===0)return;cell.classList.toggle("masked",hide&&!cell.classList.contains("revealed"));cell.textContent=hide&&!cell.classList.contains("revealed")?"Bấm để xem":cell.dataset.original||cell.textContent})};container.querySelectorAll("[data-table-cell]").forEach(cell=>{cell.dataset.original=cell.textContent;cell.addEventListener("click",()=>{if(Number(cell.dataset.col)===0)return;cell.classList.add("revealed");cell.classList.remove("masked");cell.textContent=cell.dataset.original;const row=cell.closest("[data-table-row]");const ri=Number(row.dataset.tableRow);if(!revealed.has(ri)){revealed.add(ri);recordGame(state,true);if(revealed.size===rows.length)setTimeout(()=>finishGame(state,{title:"Đã ôn toàn bộ bảng",score:rows.length,total:rows.length}),300)}})});container.querySelector("[data-hide-table]")?.addEventListener("change",applyHidden);return;
  }
}

renderActivity=renderInteractiveActivity;
bindActivity=bindInteractiveActivity;

standaloneJs=function enhancedStandaloneJs(){
  const id=selectedTemplate.id,raw=input.value.trim(),title=selectedTemplate.name;
  const functions=[escapeHtml,splitLines,parts,shuffle,parseData,normalizeGameAnswer,sameGameAnswer,safeJsonAttr,formatGameTime,gameFrame,syncGameRuntime,cleanupGame,createGameRuntime,announceGame,flashGame,emitGameConfetti,finishGame,recordGame,setGameTotals,renderTypedBlankGame,renderClozeGame,makeWordSearchGame,straightSelectionPath,bingoWin,renderInteractiveActivity,bindInteractiveActivity];
  return `const __ACTIVITY_ID__=${JSON.stringify(id)};\nconst __RAW__=${JSON.stringify(raw)};\nconst __TITLE__=${JSON.stringify(title)};\n`+
    functions.map(fn=>fn.toString()).join("\n")+
    `\nconst ACTIVITY_RENDERERS=${objectToSource(ACTIVITY_RENDERERS)};\nlet bindActivity=bindInteractiveActivity;let renderActivity=renderInteractiveActivity;const selectedTemplate={name:__TITLE__};const data=parseData(__ACTIVITY_ID__,__RAW__);renderActivity(document.getElementById("stage"),__ACTIVITY_ID__,data,{title:__TITLE__});`;
};

/* BRIAN_TEXTLAB_GAME_ENGINE_V2_END */

/* Export ZIP without external libraries */
function crc32(str){
  const table = crc32.table || (crc32.table = (()=>{let c, table=[]; for(let n=0;n<256;n++){c=n; for(let k=0;k<8;k++) c=((c&1)?(0xEDB88320^(c>>>1)):(c>>>1)); table[n]=c>>>0;} return table})());
  let crc=0^(-1); for(let i=0;i<str.length;i++) crc=(crc>>>8)^table[(crc^str.charCodeAt(i))&0xFF]; return (crc^(-1))>>>0;
}
function strToU8(str){return new TextEncoder().encode(str)}
function dosDateTime(date=new Date()){
  const time=(date.getHours()<<11)|(date.getMinutes()<<5)|(Math.floor(date.getSeconds()/2));
  const dosdate=((date.getFullYear()-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
  return {time,dosdate};
}
function u16(n){return [n&255,(n>>8)&255]}
function u32(n){return [n&255,(n>>8)&255,(n>>16)&255,(n>>24)&255]}
function makeZip(files){
  let localParts=[], centralParts=[], offset=0; const dt=dosDateTime();
  files.forEach(file=>{
    const nameBytes=strToU8(file.name), dataBytes=strToU8(file.content), crc=crc32(file.content), size=dataBytes.length;
    const local=new Uint8Array([0x50,0x4b,0x03,0x04,20,0,0,0,0,0,...u16(dt.time),...u16(dt.dosdate),...u32(crc),...u32(size),...u32(size),...u16(nameBytes.length),0,0]);
    localParts.push(local,nameBytes,dataBytes);
    const central=new Uint8Array([0x50,0x4b,0x01,0x02,20,0,20,0,0,0,0,0,...u16(dt.time),...u16(dt.dosdate),...u32(crc),...u32(size),...u32(size),...u16(nameBytes.length),0,0,0,0,0,0,0,0,0,0,...u32(offset)]);
    centralParts.push(central,nameBytes);
    offset += local.length + nameBytes.length + dataBytes.length;
  });
  const centralSize=centralParts.reduce((s,p)=>s+p.length,0);
  const end=new Uint8Array([0x50,0x4b,0x05,0x06,0,0,0,0,...u16(files.length),...u16(files.length),...u32(centralSize),...u32(offset),0,0]);
  return new Blob([...localParts,...centralParts,end], {type:"application/zip"});
}
function standaloneIndex(){
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(selectedTemplate.name)} - Brian Activity</title><link rel="stylesheet" href="style.css"></head><body><main class="standalone"><section class="activity-stage" id="stage"></section></main><script src="activity.js"><\/script></body></html>`;
}
function standaloneJs(){
  const id=selectedTemplate.id, raw=input.value.trim(), title=selectedTemplate.name;
  const core = document.querySelector("script[src='app.js']") ? "" : "";
  return `const __ACTIVITY_ID__=${JSON.stringify(id)};\nconst __RAW__=${JSON.stringify(raw)};\nconst __TITLE__=${JSON.stringify(title)};\n` + STANDALONE_CORE + `\nconst selectedTemplate={name:__TITLE__}; const data=parseData(__ACTIVITY_ID__,__RAW__); renderActivity(document.getElementById("stage"),__ACTIVITY_ID__,data,{title:__TITLE__});`;
}
function standaloneSingleHtml(){
  const css=(document.querySelector("style")?.textContent || EXPORT_CSS).replace(/<\/style/gi,"<\\/style");
  const js=standaloneJs().replace(/<\/script/gi,"<\\/script");
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(selectedTemplate.name)} - Brian Activity</title><style>${css}</style></head><body><main class="standalone"><section class="activity-stage" id="stage"></section></main><script>${js}<\/script></body></html>`;
}
function showLibraryAlert(message,type="success"){
  const box=$("#libraryAlert");
  if(!box) return;
  box.textContent=message;
  box.dataset.type=type;
  box.classList.remove("hidden");
  setTimeout(()=>box.classList.add("hidden"),2600);
}
function saveToLibrary(){
  if(!input.value.trim()) return showLibraryAlert("Hãy nhập nội dung trước khi lưu.","error");
  if(!finished) finishActivity();
  currentData=parseData(selectedTemplate.id,input.value.trim());
  window.parent.postMessage({
    type:"BTL_SAVE_LIBRARY",
    payload:{
      title:selectedTemplate.name,
      templateId:selectedTemplate.id,
      templateName:selectedTemplate.name,
      content:input.value.trim(),
      activity:currentData,
      standaloneHtml:standaloneSingleHtml(),
      itemCount:Array.isArray(currentData)?currentData.length:(currentData?.answers?.length||0)
    }
  },"*");
  showLibraryAlert("Đã gửi hoạt động vào Thư viện.");
}
function addToQuestionBank(){
  if(!input.value.trim()) return showLibraryAlert("Hãy nhập nội dung trước khi thêm vào ngân hàng.","error");
  currentData=parseData(selectedTemplate.id,input.value.trim());
  let items=[];
  if(selectedTemplate.id==="quiz"){
    items=currentData.map((q)=>({question:q.q,options:q.choices,answer:q.correct,source:`TextLab · ${selectedTemplate.name}`,sourceApp:"textlab-activities"}));
  }else if(selectedTemplate.id==="truefalse"){
    items=currentData.map((q)=>({question:q.statement,options:["True","False"],answer:q.answer?"A":"B",source:`TextLab · ${selectedTemplate.name}`,sourceApp:"textlab-activities"}));
  }
  if(!items.length) return showLibraryAlert("Template này không phải dạng câu hỏi có đáp án. Hãy lưu vào Thư viện để chơi trực tiếp.","error");
  window.parent.postMessage({type:"BTL_ADD_BANK",payload:{items}},"*");
  showLibraryAlert(`Đã gửi ${items.length} câu vào Ngân hàng câu hỏi.`);
}

function downloadWork(){
  if(!finished) finishActivity();
  const files=[
    {name:"index.html", content:standaloneIndex()},
    {name:"style.css", content:document.querySelector("style")?.textContent || EXPORT_CSS},
    {name:"activity.js", content:standaloneJs()},
    {name:"README.txt", content:"Open index.html to use the activity offline, or upload this folder to a static host such as Netlify/Vercel/GitHub Pages."}
  ];
  if(!files[1].content.trim()) files[1].content = EXPORT_CSS;
  const blob=makeZip(files);
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`brian-activity-${selectedTemplate.id}.zip`; a.click(); URL.revokeObjectURL(a.href);
}
const EXPORT_CSS = `body{font-family:system-ui,Arial,sans-serif;background:#eaf4ff;margin:0;padding:24px;color:#0f2747}.standalone{max-width:1100px;margin:0 auto}.activity-stage{background:#fff;border-radius:24px;padding:22px;box-shadow:0 18px 40px rgba(15,39,71,.12)}button{font:inherit}.btn{border:0;border-radius:14px;padding:10px 14px;font-weight:800;cursor:pointer}.primary,.btn.primary{background:#1479ff;color:#fff}.ghost,.btn.ghost{background:#edf6ff;color:#1479ff}.q-card,.mini-card,.drop-box,.clue-card{border:2px solid #e6f0ff;border-radius:20px;padding:16px;background:#fff}.card-stack{display:grid;gap:14px}.option-btn,.chip,.match-btn,.cell-btn,.word-chip,.category-chip{border:2px solid #dbeafe;background:#f8fbff;border-radius:14px;padding:10px 12px;cursor:pointer;font-weight:800}.correct{background:#e8fff4!important;border-color:#65d6a2!important;color:#05603a}.wrong{background:#fff1f0!important;border-color:#fda29b!important;color:#b42318}.act-header{display:flex;justify-content:space-between;gap:12px;margin-bottom:14px}.act-title{margin:0;font-size:30px}.act-sub{color:#5f7694;font-weight:700}.score-pill{background:#eaf4ff;color:#1479ff;padding:9px 13px;border-radius:999px;font-weight:900}.q-options{display:grid;gap:8px;margin-top:12px}.flip-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}.flip-card{min-height:150px;display:grid;place-items:center;text-align:center;background:linear-gradient(135deg,#eff8ff,#fff);border:2px solid #dbeafe;border-radius:24px;padding:16px;cursor:pointer;font-size:20px;font-weight:900}.wheel-wrap{display:grid;place-items:center;gap:16px}.wheel{width:min(360px,80vw);aspect-ratio:1;border-radius:50%;border:12px solid #fff;box-shadow:0 16px 30px rgba(15,39,71,.15);transition:transform 3s cubic-bezier(.12,.8,.22,1);position:relative}.prompt-card{font-size:26px;font-weight:900;text-align:center;padding:36px;border-radius:24px;background:linear-gradient(135deg,#eaf4ff,#fff)}.grid-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}.match-list{display:grid;gap:8px}.memory-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}.memory-card{min-height:88px;border:2px solid #dbeafe;background:#eaf4ff;border-radius:16px;display:grid;place-items:center;text-align:center;cursor:pointer;font-weight:900;padding:8px}.memory-card.revealed,.memory-card.done{background:#fff}.blank-input{border:2px solid #dbeafe;border-radius:12px;padding:8px;min-width:120px;margin:0 4px}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.feedback{margin-top:10px;font-weight:900}.bingo-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.bingo-cell{aspect-ratio:1;border:2px solid #dbeafe;background:#fff;border-radius:14px;cursor:pointer;padding:6px;font-size:12px;font-weight:800;overflow:hidden}.bingo-cell.on{background:#dff7ff;border-color:#1479ff}.wordsearch{display:grid;gap:6px;width:max-content;max-width:100%;overflow:auto}.ws-row{display:flex;gap:6px}.ws-cell{width:34px;height:34px;border:1px solid #dbeafe;border-radius:8px;display:grid;place-items:center;font-weight:900;cursor:pointer;background:#fff}.ws-cell.sel{background:#eaf4ff}.ws-cell.found{background:#e8fff4;color:#05603a}.crossword-row{display:grid;grid-template-columns:140px 1fr;gap:10px;align-items:center;margin:8px 0}.letter-input{width:38px;height:38px;text-align:center;border:2px solid #dbeafe;border-radius:10px;margin:2px;font-weight:900;text-transform:uppercase}.sentence-board{min-height:62px;border:2px dashed #b8d7ff;border-radius:18px;padding:10px;display:flex;flex-wrap:wrap;gap:8px}.wheel-labels{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.table-wrap{overflow:auto}.act-table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden}.act-table th,.act-table td{border:1px solid #dbeafe;padding:10px;text-align:left}.act-table th{background:#eaf4ff}@media(max-width:700px){.grid-two{grid-template-columns:1fr}.crossword-row{grid-template-columns:1fr}.act-header{flex-direction:column}}
/* BRIAN_TEXTLAB_GAME_ENGINE_V2_CSS_START */
.btl-game{position:relative;min-height:420px}.btl-game-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:10px}.btl-game-metrics{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.btl-game-metrics span{background:#eef6ff;border:1px solid #cfe2ff;border-radius:999px;padding:8px 11px;font-weight:800;color:#184c8d}.btl-progress{height:10px;border-radius:999px;background:#e7edf5;overflow:hidden;margin:10px 0 20px}.btl-progress i{display:block;height:100%;width:0;background:#1479ff;transition:width .3s ease}.btl-game-live{min-height:26px;font-weight:800;text-align:center;margin-top:12px}.btl-game-live[data-type="success"]{color:#067647}.btl-game-live[data-type="error"]{color:#b42318}.btl-round{max-width:820px;margin:0 auto}.btl-round h3{font-size:clamp(22px,3vw,34px);margin:12px 0 20px}.btl-round-number{font-size:13px;font-weight:900;color:#1479ff;text-transform:uppercase;letter-spacing:.08em}.btl-answer-correct{animation:btlCorrect .62s ease}.btl-answer-wrong{animation:btlWrong .5s ease}.btl-study-card{min-height:290px;display:grid;place-items:center;text-align:center;padding:30px;border:2px solid #cfe2ff;border-radius:28px;background:#fff;font-size:clamp(26px,4vw,46px);font-weight:900;transition:transform .35s,background .35s}.btl-study-card.flipped{transform:rotateX(8deg);background:#eef8ff}.btl-study-card small{display:block;font-size:14px;color:#657b98;margin-top:16px}.btl-center{justify-content:center}.btl-wheel-pointer{font-size:30px;color:#123a6b;margin-bottom:-22px;z-index:2}.btl-check{display:inline-flex;gap:8px;align-items:center;font-weight:800}.btl-history{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px}.btl-picker-box{min-height:210px;border-radius:28px;background:#eef6ff;border:2px solid #cfe2ff;display:grid;place-items:center;text-align:center;padding:28px;font-size:clamp(28px,5vw,56px);font-weight:900}.btl-picker-box.rolling{animation:btlRoll .42s linear}.btl-passage{font-size:18px;line-height:2}.btl-word-bank,.btl-sort-bank,.btl-word-list{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}.btl-cloze-slot{min-width:100px;border:0;border-bottom:3px solid #1479ff;background:#eef6ff;color:#123a6b;border-radius:10px 10px 3px 3px;padding:7px 10px;font-weight:900;cursor:pointer}.btl-cloze-slot.correct{background:#e8fff4}.btl-cloze-slot.wrong{background:#fff1f0}.btl-scramble{font-size:clamp(30px,6vw,56px);font-weight:950;letter-spacing:.16em;text-align:center;padding:24px;background:#eef6ff;border-radius:22px}.btl-order-list{display:grid;gap:10px}.btl-order-item{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center}.btl-order-item.dragging{opacity:.45}.btl-drag{font-size:24px;cursor:grab}.btl-order-actions{display:flex;gap:6px}.btl-category-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.drop-box{min-height:150px}.btl-sort-item{cursor:grab}.btl-bingo-caller{display:grid;place-items:center;gap:10px;margin-bottom:18px}.btl-wordsearch{touch-action:none;user-select:none}.ws-cell.selecting{background:#dbeafe;outline:2px solid #1479ff}.btl-letter-row{display:flex;flex-wrap:wrap}.btl-prompt-timer{width:82px;height:82px;border-radius:50%;display:grid;place-items:center;margin:0 auto 12px;background:#eef6ff;border:5px solid #1479ff;color:#123a6b;font-size:22px}.btl-table-tools{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.btl-table-cell{width:100%;border:0;background:transparent;text-align:left;padding:8px;cursor:pointer;font:inherit}.btl-table-cell.masked{background:#eaf4ff;color:#1479ff;font-weight:900;text-align:center}.btl-summary-backdrop{position:absolute;inset:0;z-index:30;background:rgba(13,36,65,.58);display:grid;place-items:center;padding:18px;border-radius:24px}.btl-summary{width:min(620px,100%);background:#fff;border-radius:28px;padding:28px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.25)}.btl-summary h3{font-size:32px;margin:8px 0}.btl-summary-icon{font-size:58px}.btl-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0}.btl-summary-grid div{background:#eef6ff;border-radius:18px;padding:14px 8px}.btl-summary-grid b{display:block;font-size:24px;color:#1479ff}.btl-summary-grid span{font-size:12px;font-weight:800;color:#607895}.btl-summary-detail{font-weight:800;color:#405a78}.btl-confetti{position:absolute;top:5%;width:9px;height:16px;background:#1479ff;z-index:35;animation:btlConfetti 1.8s var(--delay) ease-in forwards}.btl-confetti:nth-child(3n){background:#f59e0b}.btl-confetti:nth-child(3n+1){background:#17b26a}@keyframes btlCorrect{50%{transform:scale(1.02);box-shadow:0 0 0 8px rgba(23,178,106,.15)}}@keyframes btlWrong{20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}@keyframes btlRoll{25%{transform:rotate(-2deg) scale(.98)}50%{transform:rotate(2deg) scale(1.02)}75%{transform:rotate(-1deg)}}@keyframes btlConfetti{to{transform:translate(var(--drift),520px) rotate(720deg);opacity:0}}@media(max-width:720px){.btl-game-head{flex-direction:column}.btl-game-metrics{justify-content:flex-start}.btl-summary-grid{grid-template-columns:repeat(2,1fr)}.btl-order-item{grid-template-columns:auto 1fr}.btl-order-actions{grid-column:1/-1}.btl-game{min-height:360px}}
/* BRIAN_TEXTLAB_GAME_ENGINE_V2_CSS_END */`;
/* Standalone core is a trimmed copy of the parser/renderer/binder engine. */
const STANDALONE_CORE = `
${escapeHtml.toString()}
${splitLines.toString()}
${parts.toString()}
${shuffle.toString()}
${parseData.toString()}
${renderActivity.toString()}
const ACTIVITY_RENDERERS = ${objectToSource(ACTIVITY_RENDERERS)};
${renderBlanks.toString()}
${makeWordSearch.toString()}
${bindActivity.toString()}
${updateScore.toString()}
${updateScoreTF.toString()}
${bindBlanks.toString()}
${checkBingo.toString()}
${checkWordSelection.toString()}
`;
function objectToSource(obj){
  return "{\n"+Object.entries(obj).map(([k,v])=>`${JSON.stringify(k)}:${v.toString()}`).join(",\n")+"\n}";
}
document.addEventListener("DOMContentLoaded", () => {
  const embeddedMode = new URLSearchParams(window.location.search).get("embedded") === "1";
  if (embeddedMode) document.body.classList.add("embedded-mode");
  init();

  if (embeddedMode && window.parent !== window) {
    let rafId = 0;
    const reportHeight = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const height = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
          document.documentElement.offsetHeight,
          document.body.offsetHeight
        );
        window.parent.postMessage({ type: "BTL_RESIZE", height }, "*");
      });
    };
    const resizeObserver = new ResizeObserver(reportHeight);
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);
    window.addEventListener("load", reportHeight);
    window.addEventListener("resize", reportHeight);
    document.addEventListener("click", () => setTimeout(reportHeight, 80), true);
    document.addEventListener("input", () => setTimeout(reportHeight, 40), true);
    reportHeight();
    setTimeout(reportHeight, 250);
    setTimeout(reportHeight, 900);
  }
});
