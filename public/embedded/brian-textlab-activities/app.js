/* Brian TextLab Activities - original implementation */
const TEMPLATES = [
  {id:"quiz", icon:"✅", name:"Quick Quiz", tag:"MCQ", desc:"Tạo bài trắc nghiệm tự chấm điểm.", hint:"Mỗi dòng: Câu hỏi | Đáp án đúng | Đáp án sai 1 | Đáp án sai 2 | Đáp án sai 3", sample:"What does meticulous mean? | very careful and detailed | careless | quick | ordinary\nWhich word means extremely useful? | invaluable | irrelevant | harmful | basic\nChoose the noun form of sustain. | sustainability | sustainable | sustainably | sustained"},
  {id:"truefalse", icon:"🔎", name:"True / False", tag:"Check", desc:"Học sinh chọn đúng/sai cho từng nhận định.", hint:"Mỗi dòng: Nhận định | true/false", sample:"Resilience means the ability to recover from difficulty. | true\nMeticulous means careless and messy. | false\nTransparency is related to openness and clarity. | true"},
  {id:"flashcards", icon:"🃏", name:"Flip Cards", tag:"Vocab", desc:"Tạo thẻ lật từ vựng, câu hỏi, định nghĩa.", hint:"Mỗi dòng: Mặt trước | Mặt sau", sample:"resilience | the ability to recover quickly\nmeticulous | very careful and precise\nplausible | seeming reasonable or likely"},
  {id:"wheel", icon:"🎡", name:"Spin Selector", tag:"Random", desc:"Vòng quay chọn ngẫu nhiên từ/câu hỏi/nhiệm vụ.", hint:"Mỗi dòng là một mục trên vòng quay.", sample:"Define resilience\nGive a sentence with meticulous\nExplain transparency\nUse sustainability in a sentence\nAsk a friend a question"},
  {id:"picker", icon:"🎲", name:"Random Picker", tag:"Random", desc:"Bốc thăm ngẫu nhiên nội dung từ danh sách.", hint:"Mỗi dòng là một mục để bốc thăm.", sample:"Student A answers question 1\nTeam B gets bonus 10 points\nChoose one word and create a sentence\nExplain one grammar rule"},
  {id:"matching", icon:"🔗", name:"Match Link", tag:"Pairs", desc:"Nối cặp từ và nghĩa/câu hỏi và đáp án.", hint:"Mỗi dòng: Mục A | Mục B", sample:"resilience | ability to recover\nmeticulous | careful and detailed\nplausible | reasonable or likely\nundermine | weaken gradually"},
  {id:"memory", icon:"🧠", name:"Memory Match", tag:"Pairs", desc:"Lật thẻ để tìm cặp tương ứng.", hint:"Mỗi dòng: Mục A | Mục B", sample:"transparent | transparency\nsustain | sustainability\naccountable | accountability\ncomprehend | comprehension"},
  {id:"fillblank", icon:"✍️", name:"Blank Builder", tag:"Cloze", desc:"Tạo bài điền chỗ trống từ đoạn văn.", hint:"Viết đoạn văn, đặt đáp án trong {ngoặc nhọn}. Ví dụ: The policy requires {transparency}.", sample:"The company needs more {transparency} in its decisions.\nHer {resilience} helped her overcome the setback.\nThis solution is {feasible} for a small school."},
  {id:"cloze", icon:"📄", name:"Cloze Passage", tag:"Reading", desc:"Tạo cloze test từ đoạn văn dài.", hint:"Dùng {answer} cho mỗi chỗ trống trong đoạn văn.", sample:"A successful school requires {accountability}, {transparency}, and long-term {sustainability}. Teachers should work {collaboratively} to support students."},
  {id:"unscramble", icon:"🔤", name:"Word Scramble", tag:"Spelling", desc:"Xáo chữ, học sinh nhập lại từ đúng.", hint:"Mỗi dòng: Từ đúng | Gợi ý", sample:"resilience | ability to recover\nmeticulous | very careful\ntransparency | openness\nsustainability | long-term support"},
  {id:"sentence", icon:"🧩", name:"Sentence Builder", tag:"Syntax", desc:"Xáo trật tự từ, học sinh bấm để ghép câu.", hint:"Mỗi dòng là một câu hoàn chỉnh.", sample:"The students were discussing the environmental issue.\nShe has become increasingly confident.\nTransparency can improve public trust."},
  {id:"ordering", icon:"↕️", name:"Order Race", tag:"Sequence", desc:"Sắp xếp các bước/sự kiện/câu theo đúng thứ tự.", hint:"Mỗi dòng là một mục theo thứ tự đúng.", sample:"Read the question carefully.\nUnderline the keywords.\nEliminate impossible answers.\nChoose the best option.\nReview your answer."},
  {id:"categories", icon:"🧺", name:"Category Sort", tag:"Sort", desc:"Phân loại item vào nhóm đúng.", hint:"Mỗi dòng: Tên nhóm | Item", sample:"Noun | resilience\nNoun | transparency\nAdjective | meticulous\nAdjective | plausible\nVerb | undermine\nAdverb | objectively"},
  {id:"bingo", icon:"▦", name:"Vocabulary Bingo", tag:"Board", desc:"Tạo bảng bingo từ danh sách từ/cụm từ.", hint:"Mỗi dòng là một ô bingo. Cần ít nhất 24 mục.", sample:"resilience\nmeticulous\nplausible\nundermine\ninvaluable\nunprecedented\ntransparency\nsustainability\naccountability\ncomprehensive\ninclusive\ndetrimental\nobjective\nfeasible\nirrelevant\nprofound\nreluctant\ncollaborative\ninnovative\nethical\ncredible\nvalid\nrepresentative\nmaturity\nstability"},
  {id:"wordsearch", icon:"🔍", name:"Word Search", tag:"Puzzle", desc:"Tạo ô chữ tìm từ đơn giản.", hint:"Mỗi dòng là một từ cần giấu. Nên dùng từ không dấu, không khoảng trắng.", sample:"resilience\nmeticulous\nplausible\nundermine\nvaluable\ntransparent\nsustain\naccountable"},
  {id:"crossword", icon:"🧱", name:"Crossword Lite", tag:"Puzzle", desc:"Tạo crossword dạng clue + ô nhập chữ.", hint:"Mỗi dòng: Đáp án | Gợi ý", sample:"resilience | ability to recover from difficulty\nmeticulous | very careful and detailed\nplausible | seeming reasonable\nundermine | to weaken gradually"},
  {id:"prompts", icon:"💬", name:"Prompt Cards", tag:"Speaking", desc:"Tạo thẻ câu hỏi/nhiệm vụ nói để bốc ngẫu nhiên.", hint:"Mỗi dòng là một câu hỏi hoặc nhiệm vụ.", sample:"Do you think resilience is more important than talent? Why?\nDescribe a meticulous person you know.\nGive an example of transparency in school.\nUse three target words in one answer."},
  {id:"table", icon:"📊", name:"Study Table", tag:"Reference", desc:"Tạo bảng học tập nhanh từ dữ liệu văn bản.", hint:"Mỗi dòng: Cột 1 | Cột 2 | Cột 3 ...", sample:"Word | Family | Meaning\nresilience | resilient / resiliently | ability to recover\nmeticulous | meticulously / meticulousness | very careful\nplausible | plausibly / plausibility | reasonable"}
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
function aiPromptForTemplate(template=selectedTemplate){
  return [
    `Template: ${template.name} (${template.id})`,
    `Mục tiêu: ${template.desc}`,
    `Định dạng bắt buộc: ${template.hint}`,
    `Yêu cầu đầu ra: chỉ trả về nội dung hoạt động theo đúng định dạng trên; không markdown; không giải thích; không đánh số nếu template không yêu cầu; không lặp ý.`
  ].join("\n");
}
function setAIStatus(text, state="idle"){
  const el=$("#aiStatus");
  if(!el) return;
  el.textContent=text;
  el.dataset.state=state;
}
function showAIAlert(message, type="error"){
  const box=$("#aiAlert");
  if(!box) return;
  box.textContent=message || "";
  box.classList.toggle("hidden", !message);
  box.dataset.type=type;
}
function updateAIPromptPreview(){
  const el=$("#aiPromptPreview");
  if(el) el.textContent=aiPromptForTemplate(selectedTemplate);
}
function requestAIGeneration(forceSelected=false){
  const request=$("#aiRequest")?.value?.trim() || "";
  if(!request){
    showAIAlert("Hãy nhập yêu cầu trước khi tạo bằng AI.");
    $("#aiRequest")?.focus();
    return;
  }
  const autoDetect = forceSelected ? false : Boolean($("#aiAutoDetect")?.checked);
  setAIStatus("Đang phân tích yêu cầu...", "loading");
  showAIAlert("");
  $("#btnAIGenerate").disabled=true;
  $("#btnAISelected").disabled=true;
  window.parent.postMessage({
    type:"BTL_AI_GENERATE",
    payload:{
      request,
      level:$("#aiLevel")?.value || "B2",
      itemCount:Number($("#aiItemCount")?.value || 10),
      autoDetect,
      selectedTemplateId:selectedTemplate.id,
      templates:TEMPLATES.map(({id,name,tag,desc,hint})=>({id,name,tag,desc,hint}))
    }
  }, "*");
}
function handleAIMessage(event){
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
    return;
  }
  if(data.type==="BTL_AI_RESULT"){
    const result=data.payload || {};
    if(result.templateId) selectTemplate(result.templateId, {loadSample:false});
    input.value=String(result.content || "").trim();
    renderPreview();
    const promptText=result.promptUsed || aiPromptForTemplate(selectedTemplate);
    if($("#aiPromptPreview")) $("#aiPromptPreview").textContent=promptText;
    setAIStatus(`Đã tạo bằng ${selectedTemplate.name}`, "success");
    showAIAlert(result.reason ? `AI chọn ${selectedTemplate.name}: ${result.reason}` : "Nội dung đã được tạo và đưa vào preview.", "success");
    $("#btnAIGenerate").disabled=false;
    $("#btnAISelected").disabled=false;
  }
  if(data.type==="BTL_AI_ERROR"){
    setAIStatus("AI chưa tạo được", "error");
    showAIAlert(data.message || "Không thể tạo nội dung bằng AI.");
    $("#btnAIGenerate").disabled=false;
    $("#btnAISelected").disabled=false;
  }
}
function setTheme(value){document.body.dataset.style=value; localStorage.setItem("btl-style", value)}
function init(){
  const params=new URLSearchParams(window.location.search);
  const initialScale=Number(params.get("fontScale") || 100);
  if(Number.isFinite(initialScale)) document.documentElement.style.fontSize=`${Math.min(130,Math.max(90,initialScale))}%`;
  const savedStyle = localStorage.getItem("btl-style") || "flat";
  $("#styleSelect").value=savedStyle; setTheme(savedStyle);
  renderTemplateGrid();
  selectTemplate("quiz", {loadSample:true});
  bindUI();
  updateAIPromptPreview();
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
  updateAIPromptPreview();
  renderPreview();
}
function bindUI(){
  $("#templateGrid").addEventListener("click", e=>{
    const card=e.target.closest("[data-template]");
    if(card) selectTemplate(card.dataset.template, {loadSample:true});
  });
  $("#searchTemplates").addEventListener("input", e=>renderTemplateGrid(e.target.value));
  $("#styleSelect").addEventListener("change", e=>setTheme(e.target.value));
  $("#btnSample").addEventListener("click", ()=>{input.value=selectedTemplate.sample; renderPreview(); setAIStatus(`Đã nạp sample ${selectedTemplate.name}`, "success")});
  $("#btnClear").addEventListener("click", ()=>{input.value=""; renderPreview()});
  $("#btnNormalize").addEventListener("click", ()=>{input.value=normalizeText(input.value); renderPreview()});
  $("#btnCopyPrompt").addEventListener("click", copyAIPrompt);
  $("#btnAIGenerate").addEventListener("click", ()=>requestAIGeneration(false));
  $("#btnAISelected").addEventListener("click", ()=>requestAIGeneration(true));
  $("#aiAutoDetect").addEventListener("change", e=>{
    $("#btnAIGenerate").textContent = e.target.checked ? "✨ AI nhận diện & tạo" : "✨ AI tạo theo mẫu đang chọn";
  });
  window.addEventListener("message", handleAIMessage);
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
function copyAIPrompt(){
  const prompt = `Bạn là chuyên gia thiết kế hoạt động dạy tiếng Anh.

${aiPromptForTemplate(selectedTemplate)}

Yêu cầu bổ sung: nội dung chính xác, tự nhiên, phù hợp trình độ người học và không trùng lặp.`;
  navigator.clipboard?.writeText(prompt);
  alert("Đã copy prompt đúng cấu trúc template.");
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
const EXPORT_CSS = `body{font-family:system-ui,Arial,sans-serif;background:#eaf4ff;margin:0;padding:24px;color:#0f2747}.standalone{max-width:1100px;margin:0 auto}.activity-stage{background:#fff;border-radius:24px;padding:22px;box-shadow:0 18px 40px rgba(15,39,71,.12)}button{font:inherit}.btn{border:0;border-radius:14px;padding:10px 14px;font-weight:800;cursor:pointer}.primary,.btn.primary{background:#1479ff;color:#fff}.ghost,.btn.ghost{background:#edf6ff;color:#1479ff}.q-card,.mini-card,.drop-box,.clue-card{border:2px solid #e6f0ff;border-radius:20px;padding:16px;background:#fff}.card-stack{display:grid;gap:14px}.option-btn,.chip,.match-btn,.cell-btn,.word-chip,.category-chip{border:2px solid #dbeafe;background:#f8fbff;border-radius:14px;padding:10px 12px;cursor:pointer;font-weight:800}.correct{background:#e8fff4!important;border-color:#65d6a2!important;color:#05603a}.wrong{background:#fff1f0!important;border-color:#fda29b!important;color:#b42318}.act-header{display:flex;justify-content:space-between;gap:12px;margin-bottom:14px}.act-title{margin:0;font-size:30px}.act-sub{color:#5f7694;font-weight:700}.score-pill{background:#eaf4ff;color:#1479ff;padding:9px 13px;border-radius:999px;font-weight:900}.q-options{display:grid;gap:8px;margin-top:12px}.flip-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}.flip-card{min-height:150px;display:grid;place-items:center;text-align:center;background:linear-gradient(135deg,#eff8ff,#fff);border:2px solid #dbeafe;border-radius:24px;padding:16px;cursor:pointer;font-size:20px;font-weight:900}.wheel-wrap{display:grid;place-items:center;gap:16px}.wheel{width:min(360px,80vw);aspect-ratio:1;border-radius:50%;border:12px solid #fff;box-shadow:0 16px 30px rgba(15,39,71,.15);transition:transform 3s cubic-bezier(.12,.8,.22,1);position:relative}.prompt-card{font-size:26px;font-weight:900;text-align:center;padding:36px;border-radius:24px;background:linear-gradient(135deg,#eaf4ff,#fff)}.grid-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}.match-list{display:grid;gap:8px}.memory-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}.memory-card{min-height:88px;border:2px solid #dbeafe;background:#eaf4ff;border-radius:16px;display:grid;place-items:center;text-align:center;cursor:pointer;font-weight:900;padding:8px}.memory-card.revealed,.memory-card.done{background:#fff}.blank-input{border:2px solid #dbeafe;border-radius:12px;padding:8px;min-width:120px;margin:0 4px}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.feedback{margin-top:10px;font-weight:900}.bingo-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.bingo-cell{aspect-ratio:1;border:2px solid #dbeafe;background:#fff;border-radius:14px;cursor:pointer;padding:6px;font-size:12px;font-weight:800;overflow:hidden}.bingo-cell.on{background:#dff7ff;border-color:#1479ff}.wordsearch{display:grid;gap:6px;width:max-content;max-width:100%;overflow:auto}.ws-row{display:flex;gap:6px}.ws-cell{width:34px;height:34px;border:1px solid #dbeafe;border-radius:8px;display:grid;place-items:center;font-weight:900;cursor:pointer;background:#fff}.ws-cell.sel{background:#eaf4ff}.ws-cell.found{background:#e8fff4;color:#05603a}.crossword-row{display:grid;grid-template-columns:140px 1fr;gap:10px;align-items:center;margin:8px 0}.letter-input{width:38px;height:38px;text-align:center;border:2px solid #dbeafe;border-radius:10px;margin:2px;font-weight:900;text-transform:uppercase}.sentence-board{min-height:62px;border:2px dashed #b8d7ff;border-radius:18px;padding:10px;display:flex;flex-wrap:wrap;gap:8px}.wheel-labels{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.table-wrap{overflow:auto}.act-table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden}.act-table th,.act-table td{border:1px solid #dbeafe;padding:10px;text-align:left}.act-table th{background:#eaf4ff}@media(max-width:700px){.grid-two{grid-template-columns:1fr}.crossword-row{grid-template-columns:1fr}.act-header{flex-direction:column}}`;
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
