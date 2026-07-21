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
  },
  {
    "id": "showdown",
    "icon": "🏆",
    "name": "Showdown Quiz",
    "tag": "Gameshow",
    "desc": "Trắc nghiệm sân khấu có đồng hồ, streak và điểm thưởng theo tốc độ.",
    "hint": "Mỗi dòng: Câu hỏi | Đáp án đúng | Sai 1 | Sai 2 | Sai 3 | Giải thích",
    "sample": "Which action best demonstrates responsible consumption? | repairing a usable device | replacing a phone every year | discarding clothes after one use | choosing excessive packaging | Repairing extends a product's useful life and reduces waste.\nWhat does the adjective resilient mean? | able to recover after difficulty | unwilling to accept evidence | likely to disappear immediately | impossible to measure accurately | Resilient people or systems can adapt and recover.\nWhich energy source is renewable? | solar power | coal | petroleum | natural gas | Sunlight is naturally replenished.\nWhat is the noun form of transparent? | transparency | transparently | transparentness | transparence | Transparency is the standard noun in this context.\nWhich policy is the most feasible for a school? | installing labelled recycling bins | banning all electricity use | replacing every building immediately | closing the campus permanently | A feasible policy is practical and achievable.\nWhy is biodiversity important? | it supports stable ecosystems | it eliminates every disease | it prevents all natural disasters | it makes every species identical | Diverse ecosystems are generally more stable and adaptable."
  },
  {
    "id": "guessword",
    "icon": "🔤",
    "name": "Guess the Word",
    "tag": "Word Game",
    "desc": "Đoán từ theo gợi ý với bàn phím chữ cái và sáu lượt sai.",
    "hint": "Mỗi dòng: TỪ HOẶC CỤM TỪ | Gợi ý",
    "sample": "BIODIVERSITY | the variety of living species in an area\nRESILIENT | able to recover after difficulty\nFEASIBLE | practical and possible to carry out\nACCOUNTABILITY | responsibility for decisions and actions\nTRANSPARENCY | openness and clarity in sharing information\nCONSERVATION | protection of nature and natural resources"
  },
  {
    "id": "exactanswer",
    "icon": "⌨️",
    "name": "Exact Answer",
    "tag": "Typed",
    "desc": "Học sinh tự nhập đáp án; hỗ trợ nhiều đáp án chấp nhận được.",
    "hint": "Mỗi dòng: Câu hỏi | Đáp án chính | Đáp án thay thế 1 | Đáp án thay thế 2",
    "sample": "What is the noun form of resilient? | resilience\nWhich verb means to protect natural resources? | conserve | preserve\nWhat is the opposite of renewable? | non-renewable | nonrenewable\nWhat do we call the natural home of an organism? | habitat\nWhich noun means openness in sharing information? | transparency\nWhat is the process of turning waste into reusable material? | recycling | recycle"
  },
  {
    "id": "spellsprint",
    "icon": "🎧",
    "name": "Spell Sprint",
    "tag": "Spelling",
    "desc": "Nghe hoặc đọc gợi ý rồi đánh vần từ trước khi hết giờ.",
    "hint": "Mỗi dòng: TỪ | Gợi ý | Câu ví dụ",
    "sample": "sustainable | able to continue without exhausting resources | The school adopted a sustainable transport plan.\nbiodiversity | variety of living organisms | The wetland supports remarkable biodiversity.\nresilient | able to recover after difficulty | The community remained resilient after the storm.\nfeasible | practical and possible | The committee selected the most feasible proposal.\naccountability | responsibility for actions | Public accountability improves trust.\nconservation | protection of natural resources | Wildlife conservation requires long-term planning."
  },
  {
    "id": "targetmatch",
    "icon": "🎯",
    "name": "Target Match",
    "tag": "Fast Match",
    "desc": "Chọn thật nhanh mục tương ứng với gợi ý đang xuất hiện.",
    "hint": "Mỗi dòng: Gợi ý | Mục đúng",
    "sample": "energy from sunlight | solar power\nthe natural home of an organism | habitat\ngas released into the atmosphere | emission\nthe protection of nature | conservation\nable to recover after difficulty | resilient\npossible and practical | feasible\nresponsibility for actions | accountability\nopenness in sharing information | transparency"
  },
  {
    "id": "mysteryboxes",
    "icon": "🎁",
    "name": "Mystery Boxes",
    "tag": "Reveal",
    "desc": "Mở hộp bí mật để nhận câu hỏi, nhiệm vụ hoặc điểm thưởng.",
    "hint": "Mỗi dòng: Tên hộp | Nội dung ẩn",
    "sample": "Box 1 | Define biodiversity in your own words.\nBox 2 | Give one example of renewable energy.\nBox 3 | BONUS: Your team receives 100 points.\nBox 4 | Use feasible in a complete sentence.\nBox 5 | Explain one benefit of public transport.\nBox 6 | Name two ways to reduce plastic waste.\nBox 7 | Challenge another team with an environmental question.\nBox 8 | Speak for thirty seconds about conservation.\nBox 9 | BONUS: Choose the next player."
  },
  {
    "id": "revealtiles",
    "icon": "🧩",
    "name": "Reveal Tiles",
    "tag": "Guess",
    "desc": "Mở dần các ô che và đoán hình hoặc từ bí mật.",
    "hint": "Mỗi dòng: ĐÁP ÁN | Gợi ý | Hình/emoji hoặc PLANT_DIAGRAM",
    "sample": "VOLCANO | a mountain that can erupt | 🌋\nRECYCLING | processing used material so it can be used again | ♻️\nBIODIVERSITY | the variety of living species | 🦋🌿🐝\nSOLAR ENERGY | renewable power from sunlight | ☀️🔋\nCONSERVATION | protecting nature and resources | 🌳🛡️\nPLANT | identify the living organism in the diagram | PLANT_DIAGRAM"
  },
  {
    "id": "memoryflash",
    "icon": "⚡",
    "name": "Memory Flash",
    "tag": "Memory",
    "desc": "Quan sát thông tin trong thời gian ngắn rồi trả lời câu hỏi ghi nhớ.",
    "hint": "Mỗi dòng: Mục | Chi tiết cần ghi nhớ",
    "sample": "Solar power | comes from sunlight\nWind power | uses moving air\nHydropower | uses flowing water\nHabitat | natural home of an organism\nLandfill | place where waste is buried\nResilient | able to recover after difficulty\nFeasible | possible and practical\nTransparency | openness in sharing information"
  },
  {
    "id": "labellab",
    "icon": "📍",
    "name": "Label Lab",
    "tag": "Diagram",
    "desc": "Đặt nhãn vào đúng vị trí trên sơ đồ tương tác.",
    "hint": "Mỗi dòng: SƠ ĐỒ | Nhãn | Tọa độ X% | Tọa độ Y%",
    "sample": "PLANT_DIAGRAM | flower | 51 | 13\nPLANT_DIAGRAM | leaf | 72 | 40\nPLANT_DIAGRAM | stem | 51 | 51\nPLANT_DIAGRAM | roots | 51 | 84\nPLANT_DIAGRAM | soil | 50 | 72"
  },
  {
    "id": "picturequiz",
    "icon": "🖼️",
    "name": "Picture Quiz",
    "tag": "Visual MCQ",
    "desc": "Trắc nghiệm có hình, emoji hoặc sơ đồ minh họa.",
    "hint": "Mỗi dòng: Hình/emoji | Câu hỏi | Đúng | Sai 1 | Sai 2 | Sai 3",
    "sample": "🌞 | Which renewable source is shown? | solar energy | wind energy | hydropower | geothermal energy\n🌬️ | Which source uses moving air? | wind power | coal power | nuclear power | tidal power\n♻️ | What action does this symbol represent? | recycling | mining | deforestation | landfilling\n🌳 | Which process removes this resource on a large scale? | deforestation | irrigation | urban gardening | conservation\n🐝🌼 | Which concept is illustrated by different living species? | biodiversity | uniformity | combustion | isolation\nPLANT_DIAGRAM | Which part absorbs water from the soil? | roots | flower | leaf | fruit"
  },
  {
    "id": "sortsprint",
    "icon": "🏁",
    "name": "Sort Sprint",
    "tag": "Speed Sort",
    "desc": "Phân loại liên tục dưới áp lực thời gian và tốc độ tăng dần.",
    "hint": "Mỗi dòng: Nhóm | Mục cần phân loại",
    "sample": "Renewable Energy | solar power\nRenewable Energy | wind power\nRenewable Energy | hydropower\nEnvironmental Problem | air pollution\nEnvironmental Problem | deforestation\nEnvironmental Problem | plastic waste\nSustainable Action | using public transport\nSustainable Action | carrying a reusable bottle\nSustainable Action | repairing old devices\nKey Quality | accountability\nKey Quality | transparency\nKey Quality | resilience"
  },
  {
    "id": "wordmagnets",
    "icon": "🧲",
    "name": "Word Magnets",
    "tag": "Sentence",
    "desc": "Kéo hoặc bấm các từ như nam châm để tạo câu hoàn chỉnh.",
    "hint": "Mỗi dòng là một câu hoàn chỉnh.",
    "sample": "Renewable energy can reduce greenhouse gas emissions.\nOur school has installed clearly labelled recycling bins.\nStudents should carry reusable bottles whenever possible.\nTransparent decisions can strengthen public trust.\nThe conservation project involves the whole community.\nA feasible solution must be both practical and affordable."
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

/* BRIAN_TEXTLAB_EXPANDED_12_GAMES_START
   Twelve original Brian gameplay implementations inspired by common classroom
   activity patterns. No Wordwall code, assets, branding or interface is copied. */

function isExpandedGame(id){
  return [
    "showdown","guessword","exactanswer","spellsprint","targetmatch",
    "mysteryboxes","revealtiles","memoryflash","labellab","picturequiz",
    "sortsprint","wordmagnets"
  ].includes(id);
}

function clampExpandedNumber(value,min,max,fallback){
  const parsed=Number(value);
  return Number.isFinite(parsed)?Math.min(max,Math.max(min,parsed)):fallback;
}

function expandedAnswerKey(value=""){
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu," ")
    .replace(/\s+/g," ")
    .trim();
}

function expandedLevenshtein(a,b){
  const x=expandedAnswerKey(a),y=expandedAnswerKey(b);
  const row=Array.from({length:y.length+1},(_,i)=>i);
  for(let i=1;i<=x.length;i++){
    let previous=row[0];
    row[0]=i;
    for(let j=1;j<=y.length;j++){
      const old=row[j];
      row[j]=Math.min(
        row[j]+1,
        row[j-1]+1,
        previous+(x[i-1]===y[j-1]?0:1)
      );
      previous=old;
    }
  }
  return row[y.length];
}

function expandedAnswerAccepted(value,accepted){
  const key=expandedAnswerKey(value);
  return accepted.some(answer=>{
    const target=expandedAnswerKey(answer);
    if(key===target)return true;
    return target.length>=6&&key.length>=5&&expandedLevenshtein(key,target)<=1;
  });
}

function expandedVisualMarkup(source,alt=""){
  const value=String(source||"").trim();
  const safeAlt=escapeHtml(alt||"Visual");

  if(/^data:image\//i.test(value)||/^https?:\/\//i.test(value)){
    return `<img class="btl-expanded-image" src="${escapeHtml(value)}" alt="${safeAlt}">`;
  }

  if(value==="PLANT_DIAGRAM"){
    return `<svg class="btl-scene-svg" viewBox="0 0 520 360" role="img" aria-label="Sơ đồ cây">
      <rect width="520" height="360" rx="26" fill="#eef8ff"/>
      <circle cx="430" cy="64" r="36" fill="#ffd768"/>
      <path d="M0 270 C130 235 380 245 520 270 V360 H0Z" fill="#d8b27a"/>
      <path d="M260 280 C258 220 260 148 260 75" stroke="#388b55" stroke-width="18" stroke-linecap="round"/>
      <path d="M260 174 C214 139 180 136 148 158 C181 202 222 207 260 174Z" fill="#65b968"/>
      <path d="M260 138 C302 105 341 109 372 135 C340 174 299 178 260 138Z" fill="#52a95e"/>
      <g transform="translate(260 62)">
        <circle cx="0" cy="0" r="22" fill="#f6b934"/>
        <circle cx="-25" cy="-4" r="23" fill="#ff7e91"/>
        <circle cx="25" cy="-4" r="23" fill="#ff7e91"/>
        <circle cx="-12" cy="-27" r="23" fill="#ff91a2"/>
        <circle cx="12" cy="-27" r="23" fill="#ff91a2"/>
        <circle cx="0" cy="0" r="12" fill="#f4ca39"/>
      </g>
      <path d="M260 278 C220 303 207 329 197 352 M260 278 C244 315 245 333 244 360 M260 278 C288 310 309 332 322 356 M260 278 C296 292 345 301 372 327" stroke="#835c3d" stroke-width="8" stroke-linecap="round"/>
    </svg>`;
  }

  if(value==="WATER_CYCLE"){
    return `<svg class="btl-scene-svg" viewBox="0 0 520 360" role="img" aria-label="Sơ đồ vòng tuần hoàn nước">
      <rect width="520" height="360" rx="26" fill="#eaf7ff"/>
      <circle cx="425" cy="65" r="38" fill="#ffd15d"/>
      <path d="M0 255 C120 220 226 232 330 250 C400 264 460 244 520 224 V360 H0Z" fill="#48a8df"/>
      <path d="M0 240 L115 130 L225 244Z" fill="#7f9caf"/>
      <path d="M72 175 L115 130 L157 177Z" fill="#eef7ff"/>
      <g fill="#fff">
        <ellipse cx="260" cy="92" rx="58" ry="28"/>
        <ellipse cx="313" cy="96" rx="45" ry="24"/>
        <ellipse cx="215" cy="102" rx="42" ry="23"/>
      </g>
      <path d="M360 250 C392 214 398 176 383 134" fill="none" stroke="#318cc6" stroke-width="8" stroke-dasharray="12 9"/>
      <path d="M155 125 C183 95 214 87 247 88" fill="none" stroke="#318cc6" stroke-width="8" stroke-dasharray="12 9"/>
      <path d="M250 126 L235 204 M287 128 L273 210 M324 127 L310 203" stroke="#4aaee2" stroke-width="7" stroke-linecap="round"/>
    </svg>`;
  }

  if(value.length<=12&&!/\s/.test(value)){
    return `<div class="btl-expanded-emoji" role="img" aria-label="${safeAlt}">${escapeHtml(value)}</div>`;
  }

  return `<div class="btl-expanded-word-visual">${escapeHtml(value||alt||"Visual")}</div>`;
}

function parseExpandedData(id,raw){
  const lines=splitLines(raw);

  if(id==="showdown"){
    return lines.map((line,index)=>{
      const p=parts(line);
      const correct=p[1]||"";
      return {
        q:p[0]||`Question ${index+1}`,
        correct,
        choices:shuffle([correct,...p.slice(2,5).filter(Boolean)]),
        explanation:p[5]||""
      };
    }).filter(item=>item.q&&item.correct);
  }

  if(id==="guessword"){
    return lines.map(line=>{
      const p=parts(line);
      return {
        word:(p[0]||"").toUpperCase().replace(/\s+/g," ").trim(),
        clue:p[1]||""
      };
    }).filter(item=>item.word);
  }

  if(id==="exactanswer"){
    return lines.map((line,index)=>{
      const p=parts(line);
      return {
        q:p[0]||`Question ${index+1}`,
        answers:p.slice(1).filter(Boolean)
      };
    }).filter(item=>item.q&&item.answers.length);
  }

  if(id==="spellsprint"){
    return lines.map(line=>{
      const p=parts(line);
      return {word:p[0]||"",clue:p[1]||"",example:p[2]||""};
    }).filter(item=>item.word);
  }

  if(id==="targetmatch"){
    return lines.map((line,index)=>{
      const p=parts(line);
      return {id:index,prompt:p[0]||"",match:p[1]||""};
    }).filter(item=>item.prompt&&item.match);
  }

  if(id==="mysteryboxes"){
    return lines.map((line,index)=>{
      const p=parts(line);
      return {id:index,title:p[0]||`Box ${index+1}`,content:p.slice(1).join(" | ")||""};
    }).filter(item=>item.content);
  }

  if(id==="revealtiles"){
    return lines.map(line=>{
      const p=parts(line);
      return {answer:p[0]||"",clue:p[1]||"",visual:p[2]||p[0]||""};
    }).filter(item=>item.answer);
  }

  if(id==="memoryflash"){
    return lines.map((line,index)=>{
      const p=parts(line);
      return {id:index,item:p[0]||"",detail:p[1]||""};
    }).filter(item=>item.item&&item.detail);
  }

  if(id==="labellab"){
    const parsed=lines.map((line,index)=>{
      const p=parts(line);
      return {
        id:index,
        visual:p[0]||"PLANT_DIAGRAM",
        label:p[1]||`Label ${index+1}`,
        x:clampExpandedNumber(p[2],4,96,50),
        y:clampExpandedNumber(p[3],5,95,50)
      };
    }).filter(item=>item.label);
    return {visual:parsed[0]?.visual||"PLANT_DIAGRAM",items:parsed};
  }

  if(id==="picturequiz"){
    return lines.map((line,index)=>{
      const p=parts(line);
      const correct=p[2]||"";
      return {
        visual:p[0]||"",
        q:p[1]||`Question ${index+1}`,
        correct,
        choices:shuffle([correct,...p.slice(3,6).filter(Boolean)])
      };
    }).filter(item=>item.q&&item.correct);
  }

  if(id==="sortsprint"){
    return lines.map((line,index)=>{
      const p=parts(line);
      return {id:index,cat:p[0]||"Other",item:p[1]||""};
    }).filter(item=>item.item);
  }

  if(id==="wordmagnets"){
    return lines.map(line=>line.trim()).filter(Boolean);
  }

  return [];
}

const parseDataBeforeExpandedGames=parseData;
function parseDataExpandedGames(id,raw){
  return isExpandedGame(id)?parseExpandedData(id,raw):parseDataBeforeExpandedGames(id,raw);
}
parseData=parseDataExpandedGames;

function expandedRoundFrame(label,content=""){
  return `<div class="q-card btl-round btl-expanded-round">
    <div class="btl-round-number">${escapeHtml(label)}</div>
    ${content}
  </div>`;
}

Object.assign(ACTIVITY_RENDERERS,{
  showdown(data,opt){
    return gameFrame(
      opt.title||"Showdown Quiz",
      "Trả lời nhanh để nhận điểm tốc độ và streak bonus.",
      data.length,
      `<div data-expanded-host></div>`,
      {scoreLabel:"Điểm",progressLabel:"Câu"}
    );
  },

  guessword(data,opt){
    return gameFrame(
      opt.title||"Guess the Word",
      "Đoán từ theo gợi ý. Bạn có sáu lượt sai cho mỗi từ.",
      data.length,
      `<div data-expanded-host></div>`,
      {scoreLabel:"Đã đoán",progressLabel:"Từ"}
    );
  },

  exactanswer(data,opt){
    return gameFrame(
      opt.title||"Exact Answer",
      "Tự nhập đáp án; hệ thống chấp nhận các phương án tương đương đã khai báo.",
      data.length,
      `<div data-expanded-host></div>`,
      {progressLabel:"Câu"}
    );
  },

  spellsprint(data,opt){
    return gameFrame(
      opt.title||"Spell Sprint",
      "Nghe hoặc đọc gợi ý rồi đánh vần trước khi hết giờ.",
      data.length,
      `<div data-expanded-host></div>`,
      {progressLabel:"Từ"}
    );
  },

  targetmatch(data,opt){
    return gameFrame(
      opt.title||"Target Match",
      "Chọn thật nhanh mục tương ứng với gợi ý.",
      data.length,
      `<div data-expanded-host></div>`,
      {progressLabel:"Cặp"}
    );
  },

  mysteryboxes(data,opt){
    return gameFrame(
      opt.title||"Mystery Boxes",
      "Mở từng hộp, hoàn thành nhiệm vụ và khám phá toàn bộ nội dung.",
      data.length,
      `<div class="btl-box-grid">
        ${data.map((box,index)=>`<button class="btl-mystery-box" type="button" data-box-index="${index}">
          <span>?</span><strong>${escapeHtml(box.title)}</strong>
        </button>`).join("")}
      </div>
      <div class="btl-box-stage" data-box-stage>
        <div class="btl-box-placeholder">Chọn một hộp để mở.</div>
      </div>`,
      {scoreLabel:"Đã mở",progressLabel:"Hộp"}
    );
  },

  revealtiles(data,opt){
    return gameFrame(
      opt.title||"Reveal Tiles",
      "Mở càng ít ô càng nhận được nhiều điểm.",
      data.length,
      `<div data-expanded-host></div>`,
      {scoreLabel:"Điểm",progressLabel:"Vòng"}
    );
  },

  memoryflash(data,opt){
    return gameFrame(
      opt.title||"Memory Flash",
      "Ghi nhớ bảng thông tin trước khi nó biến mất.",
      data.length,
      `<div data-expanded-host></div>`,
      {progressLabel:"Câu"}
    );
  },

  labellab(data,opt){
    return gameFrame(
      opt.title||"Label Lab",
      "Chọn một nhãn rồi đặt vào đúng điểm trên sơ đồ.",
      data.items.length,
      `<div class="btl-label-layout">
        <div class="btl-label-scene" data-label-scene>
          ${expandedVisualMarkup(data.visual,"Sơ đồ cần gắn nhãn")}
          ${data.items.map(item=>`<button
            class="btl-label-target"
            type="button"
            data-label-target="${item.id}"
            data-label="${escapeHtml(item.label)}"
            style="left:${item.x}%;top:${item.y}%"
            aria-label="Vị trí nhãn ${escapeHtml(item.label)}"
          ><span>${item.id+1}</span></button>`).join("")}
        </div>
        <div class="btl-label-bank" data-label-bank>
          ${shuffle(data.items).map(item=>`<button
            class="word-chip btl-label-chip"
            type="button"
            draggable="true"
            data-label-chip="${item.id}"
          >${escapeHtml(item.label)}</button>`).join("")}
        </div>
      </div>`,
      {scoreLabel:"Đúng",progressLabel:"Nhãn"}
    );
  },

  picturequiz(data,opt){
    return gameFrame(
      opt.title||"Picture Quiz",
      "Quan sát hình hoặc sơ đồ rồi chọn đáp án đúng.",
      data.length,
      `<div data-expanded-host></div>`,
      {progressLabel:"Câu"}
    );
  },

  sortsprint(data,opt){
    return gameFrame(
      opt.title||"Sort Sprint",
      "Phân loại liên tục; thời gian cho mỗi mục sẽ giảm dần.",
      data.length,
      `<div data-expanded-host></div>`,
      {progressLabel:"Mục"}
    );
  },

  wordmagnets(data,opt){
    return gameFrame(
      opt.title||"Word Magnets",
      "Bấm hoặc kéo các từ để tái tạo câu hoàn chỉnh.",
      data.length,
      `<div data-expanded-host></div>`,
      {progressLabel:"Câu"}
    );
  }
});

function bindExpandedGame(container,id,data,options={}){
  const total=id==="labellab"?(data.items?.length||0):(Array.isArray(data)?data.length:0);
  const state=createGameRuntime(container,id,data,{
    title:options.title||selectedTemplate?.name||"Activity",
    total
  });
  const host=container.querySelector("[data-expanded-host]");

  if(!total){
    announceGame(state,"Chưa có đủ dữ liệu để chơi.","error");
    return;
  }

  if(id==="showdown"){
    let index=0;
    let remaining=20;

    const draw=()=>{
      clearInterval(container.__btlRoundTimer);
      if(index>=data.length){
        finishGame(state,{
          title:"Showdown hoàn tất!",
          score:state.score,
          total:data.length*1000,
          message:`Tổng điểm: ${state.score}`,
          detail:`Chuỗi đúng tốt nhất: ${state.bestStreak}`
        });
        return;
      }

      const item=data[index];
      remaining=20;
      host.innerHTML=expandedRoundFrame(
        `Câu ${index+1}/${data.length}`,
        `<div class="btl-showdown-timer"><b data-showdown-seconds>${remaining}</b><span>giây</span></div>
         <h3>${escapeHtml(item.q)}</h3>
         <div class="q-options">
           ${item.choices.map(choice=>`<button class="option-btn" type="button" data-showdown-choice="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`).join("")}
         </div>
         <div class="feedback" data-expanded-feedback></div>`
      );

      const secondsEl=host.querySelector("[data-showdown-seconds]");
      const resolve=(choice,button,expired=false)=>{
        clearInterval(container.__btlRoundTimer);
        host.querySelectorAll("[data-showdown-choice]").forEach(itemButton=>itemButton.disabled=true);
        const correct=!expired&&sameGameAnswer(choice,item.correct);
        state.progress++;
        if(correct){
          state.streak++;
          state.bestStreak=Math.max(state.bestStreak,state.streak);
          const points=Math.min(1000,450+remaining*25+state.streak*25);
          state.score+=points;
          button?.classList.add("correct");
          announceGame(state,`Chính xác! +${points} điểm`,"success");
        }else{
          state.mistakes++;
          state.streak=0;
          button?.classList.add("wrong");
          host.querySelectorAll("[data-showdown-choice]").forEach(itemButton=>{
            if(sameGameAnswer(itemButton.dataset.showdownChoice,item.correct))itemButton.classList.add("correct");
          });
          announceGame(state,expired?"Hết giờ!":"Chưa đúng.","error");
        }
        syncGameRuntime(state);
        const feedback=host.querySelector("[data-expanded-feedback]");
        if(feedback)feedback.textContent=item.explanation||`Đáp án: ${item.correct}`;
        index++;
        setTimeout(draw,1050);
      };

      host.querySelectorAll("[data-showdown-choice]").forEach(button=>{
        button.addEventListener("click",()=>resolve(button.dataset.showdownChoice,button));
      });

      container.__btlRoundTimer=setInterval(()=>{
        remaining--;
        if(secondsEl)secondsEl.textContent=String(Math.max(0,remaining));
        if(remaining<=0)resolve("",null,true);
      },1000);
    };

    draw();
    return;
  }

  if(id==="guessword"){
    let index=0;
    let guessed=new Set();
    let wrong=0;
    let keyHandler=null;

    const cleanLetters=value=>String(value).toUpperCase().replace(/[^A-Z]/g,"");
    const uniqueLetters=value=>[...new Set(cleanLetters(value).split(""))];

    const setKeyboardHandler=handler=>{
      if(keyHandler)document.removeEventListener("keydown",keyHandler);
      keyHandler=handler;
      document.addEventListener("keydown",keyHandler);
      const baseCleanup=container.__btlGameCleanup;
      container.__btlGameCleanup=()=>{
        baseCleanup?.();
        if(keyHandler)document.removeEventListener("keydown",keyHandler);
      };
    };

    const draw=()=>{
      if(index>=data.length){
        finishGame(state,{title:"Đã hoàn thành Guess the Word"});
        return;
      }

      guessed=new Set();
      wrong=0;
      const item=data[index];
      host.innerHTML=expandedRoundFrame(
        `Từ ${index+1}/${data.length}`,
        `<div class="btl-hangman-layout">
          <svg class="btl-hangman-svg" viewBox="0 0 250 250" role="img" aria-label="Tiến độ đoán từ">
            <path d="M35 220 H215 M70 220 V30 H165 V58" class="gallows"/>
            <circle cx="165" cy="82" r="23" data-hang-part="1"/>
            <path d="M165 105 V158" data-hang-part="2"/>
            <path d="M165 120 L130 145" data-hang-part="3"/>
            <path d="M165 120 L200 145" data-hang-part="4"/>
            <path d="M165 158 L135 202" data-hang-part="5"/>
            <path d="M165 158 L195 202" data-hang-part="6"/>
          </svg>
          <div>
            <div class="btl-word-mask" data-word-mask></div>
            <p class="btl-word-clue">${escapeHtml(item.clue)}</p>
            <p>Còn lại: <b data-wrong-left>6</b> lượt sai</p>
            <div class="btl-alpha-keyboard">
              ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(letter=>`<button type="button" class="btl-alpha-key" data-letter="${letter}">${letter}</button>`).join("")}
            </div>
            <div class="toolbar">
              <button class="btn ghost" type="button" data-reveal-letter>Gợi ý một chữ</button>
            </div>
          </div>
        </div>`
      );

      const word=item.word;
      const letters=uniqueLetters(word);
      const mask=host.querySelector("[data-word-mask]");
      const update=()=>{
        mask.innerHTML=[...word].map(char=>{
          if(char===" ")return `<span class="space"> </span>`;
          const visible=guessed.has(char);
          return `<span class="${visible?"visible":""}">${visible?escapeHtml(char):"_"}</span>`;
        }).join("");
        host.querySelector("[data-wrong-left]").textContent=String(Math.max(0,6-wrong));
        host.querySelectorAll("[data-hang-part]").forEach(part=>{
          part.classList.toggle("shown",Number(part.dataset.hangPart)<=wrong);
        });
      };

      const finishRound=won=>{
        host.querySelectorAll("[data-letter], [data-reveal-letter]").forEach(button=>button.disabled=true);
        state.progress++;
        if(won){
          state.score++;
          state.streak++;
          state.bestStreak=Math.max(state.bestStreak,state.streak);
          announceGame(state,`Chính xác: ${word}`,"success");
        }else{
          state.mistakes++;
          state.streak=0;
          letters.forEach(letter=>guessed.add(letter));
          update();
          announceGame(state,`Đáp án là ${word}`,"error");
        }
        syncGameRuntime(state);
        index++;
        setTimeout(draw,950);
      };

      const choose=letter=>{
        if(!letter||guessed.has(letter))return;
        guessed.add(letter);
        const button=host.querySelector(`[data-letter="${letter}"]`);
        if(button)button.disabled=true;
        if(!letters.includes(letter)){
          wrong++;
          flashGame(button,false);
        }
        update();
        if(letters.every(letterItem=>guessed.has(letterItem)))finishRound(true);
        else if(wrong>=6)finishRound(false);
      };

      host.querySelectorAll("[data-letter]").forEach(button=>{
        button.addEventListener("click",()=>choose(button.dataset.letter));
      });

      host.querySelector("[data-reveal-letter]")?.addEventListener("click",event=>{
        const available=letters.filter(letter=>!guessed.has(letter));
        if(!available.length)return;
        state.mistakes++;
        choose(available[Math.floor(Math.random()*available.length)]);
        event.currentTarget.disabled=true;
      });

      setKeyboardHandler(event=>{
        const letter=String(event.key||"").toUpperCase();
        if(/^[A-Z]$/.test(letter))choose(letter);
      });

      update();
    };

    draw();
    return;
  }

  if(id==="exactanswer"){
    let index=0;
    const draw=()=>{
      if(index>=data.length){
        finishGame(state,{title:"Exact Answer hoàn tất!"});
        return;
      }
      const item=data[index];
      host.innerHTML=expandedRoundFrame(
        `Câu ${index+1}/${data.length}`,
        `<h3>${escapeHtml(item.q)}</h3>
         <div class="btl-typed-answer">
           <input class="blank-input" data-exact-input autocomplete="off" placeholder="Nhập đáp án...">
           <button class="btn primary" type="button" data-check-exact>Kiểm tra</button>
         </div>
         <div class="feedback" data-expanded-feedback></div>`
      );

      const inputEl=host.querySelector("[data-exact-input]");
      const check=()=>{
        const value=inputEl.value;
        if(!value.trim())return;
        const correct=expandedAnswerAccepted(value,item.answers);
        inputEl.disabled=true;
        host.querySelector("[data-check-exact]").disabled=true;
        recordGame(state,correct);
        flashGame(inputEl,correct);
        host.querySelector("[data-expanded-feedback]").textContent=correct
          ?"Chính xác!"
          :`Đáp án chấp nhận: ${item.answers.join(" / ")}`;
        announceGame(state,correct?"Chính xác!":"Chưa đúng.",correct?"success":"error");
        index++;
        setTimeout(draw,850);
      };
      host.querySelector("[data-check-exact]").addEventListener("click",check);
      inputEl.addEventListener("keydown",event=>{if(event.key==="Enter")check()});
      inputEl.focus();
    };
    draw();
    return;
  }

  if(id==="spellsprint"){
    let index=0;
    let remaining=30;

    const speak=word=>{
      if(!("speechSynthesis" in window))return;
      speechSynthesis.cancel();
      const utterance=new SpeechSynthesisUtterance(word);
      utterance.lang="en-US";
      utterance.rate=.82;
      speechSynthesis.speak(utterance);
    };

    const draw=()=>{
      clearInterval(container.__btlRoundTimer);
      if(index>=data.length){
        finishGame(state,{title:"Spell Sprint hoàn tất!"});
        return;
      }

      const item=data[index];
      remaining=30;
      host.innerHTML=expandedRoundFrame(
        `Từ ${index+1}/${data.length}`,
        `<div class="btl-spell-clue">${escapeHtml(item.clue)}</div>
         ${item.example?`<p class="btl-spell-example">${escapeHtml(item.example.replace(new RegExp(item.word,"ig"),"_____"))}</p>`:""}
         <div class="btl-spell-clock"><b data-spell-seconds>${remaining}</b>s</div>
         <div class="btl-typed-answer">
           <button class="btn ghost" type="button" data-speak-word>🔊 Nghe từ</button>
           <input class="blank-input" data-spell-input autocomplete="off" placeholder="Đánh vần từ...">
           <button class="btn primary" type="button" data-check-spell>Kiểm tra</button>
         </div>`
      );

      const inputEl=host.querySelector("[data-spell-input]");
      const secondsEl=host.querySelector("[data-spell-seconds]");
      let resolved=false;

      const resolve=(expired=false)=>{
        if(resolved)return;
        if(!expired&&!inputEl.value.trim())return;
        resolved=true;
        clearInterval(container.__btlRoundTimer);
        const correct=!expired&&sameGameAnswer(inputEl.value,item.word);
        recordGame(state,correct);
        inputEl.disabled=true;
        host.querySelectorAll("button").forEach(button=>button.disabled=true);
        announceGame(
          state,
          correct?`Chính xác: ${item.word}`:`Đáp án: ${item.word}`,
          correct?"success":"error"
        );
        index++;
        setTimeout(draw,900);
      };

      host.querySelector("[data-speak-word]").addEventListener("click",()=>speak(item.word));
      host.querySelector("[data-check-spell]").addEventListener("click",()=>resolve(false));
      inputEl.addEventListener("keydown",event=>{if(event.key==="Enter")resolve(false)});

      container.__btlRoundTimer=setInterval(()=>{
        remaining--;
        secondsEl.textContent=String(Math.max(0,remaining));
        if(remaining<=0)resolve(true);
      },1000);

      inputEl.focus();
    };

    draw();
    return;
  }

  if(id==="targetmatch"){
    const deck=shuffle(data);
    let index=0;
    const available=new Set(data.map(item=>item.id));

    const draw=()=>{
      if(index>=deck.length){
        finishGame(state,{title:"Đã tìm đủ tất cả mục!"});
        return;
      }
      const item=deck[index];
      const choices=shuffle(data.filter(choice=>available.has(choice.id)));
      host.innerHTML=expandedRoundFrame(
        `Cặp ${index+1}/${deck.length}`,
        `<div class="btl-target-prompt">${escapeHtml(item.prompt)}</div>
         <div class="btl-target-grid">
           ${choices.map(choice=>`<button class="btl-target-option" type="button" data-target-id="${choice.id}">${escapeHtml(choice.match)}</button>`).join("")}
         </div>`
      );

      host.querySelectorAll("[data-target-id]").forEach(button=>{
        button.addEventListener("click",()=>{
          const correct=Number(button.dataset.targetId)===item.id;
          if(!correct){
            state.mistakes++;
            syncGameRuntime(state);
            flashGame(button,false);
            announceGame(state,"Chưa đúng, hãy thử lại.","error");
            return;
          }
          button.classList.add("correct");
          available.delete(item.id);
          recordGame(state,true);
          announceGame(state,"Tìm đúng mục!","success");
          index++;
          setTimeout(draw,620);
        });
      });
    };

    draw();
    return;
  }

  if(id==="mysteryboxes"){
    const stage=container.querySelector("[data-box-stage]");
    const completed=new Set();

    const openBox=index=>{
      const item=data[index];
      if(!item||completed.has(index))return;
      stage.innerHTML=`<article class="btl-open-box">
        <span class="btl-open-box-icon">🎁</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.content)}</p>
        <div class="toolbar btl-center">
          <button class="btn primary" type="button" data-complete-box>Đã hoàn thành</button>
          <button class="btn ghost" type="button" data-close-box>Đóng</button>
        </div>
      </article>`;

      stage.querySelector("[data-close-box]").addEventListener("click",()=>{
        stage.innerHTML=`<div class="btl-box-placeholder">Chọn một hộp khác.</div>`;
      });

      stage.querySelector("[data-complete-box]").addEventListener("click",()=>{
        completed.add(index);
        const box=container.querySelector(`[data-box-index="${index}"]`);
        box.disabled=true;
        box.classList.add("opened");
        box.querySelector("span").textContent="✓";
        recordGame(state,true);
        stage.innerHTML=`<div class="btl-box-placeholder success">Đã hoàn thành ${escapeHtml(item.title)}.</div>`;
        if(completed.size===data.length){
          setTimeout(()=>finishGame(state,{title:"Đã mở tất cả Mystery Boxes!"}),400);
        }
      });
    };

    container.querySelectorAll("[data-box-index]").forEach(button=>{
      button.addEventListener("click",()=>openBox(Number(button.dataset.boxIndex)));
    });
    return;
  }

  if(id==="revealtiles"){
    let index=0;

    const draw=()=>{
      if(index>=data.length){
        finishGame(state,{
          title:"Reveal Tiles hoàn tất!",
          score:state.score,
          total:data.length*1000,
          message:`Tổng điểm: ${state.score}`
        });
        return;
      }

      const item=data[index];
      let opened=0;
      host.innerHTML=expandedRoundFrame(
        `Vòng ${index+1}/${data.length}`,
        `<p class="btl-reveal-clue">${escapeHtml(item.clue)}</p>
         <div class="btl-reveal-board">
           <div class="btl-reveal-visual">${expandedVisualMarkup(item.visual,item.answer)}</div>
           <div class="btl-reveal-grid">
             ${Array.from({length:16},(_,tileIndex)=>`<button type="button" class="btl-reveal-tile" data-tile="${tileIndex}">${tileIndex+1}</button>`).join("")}
           </div>
         </div>
         <div class="btl-typed-answer">
           <input class="blank-input" data-reveal-input autocomplete="off" placeholder="Đoán đáp án...">
           <button class="btn primary" type="button" data-check-reveal>Đoán</button>
           <button class="btn ghost" type="button" data-give-reveal>Hiện đáp án</button>
         </div>`
      );

      host.querySelectorAll("[data-tile]").forEach(tile=>{
        tile.addEventListener("click",()=>{
          if(tile.classList.contains("opened"))return;
          tile.classList.add("opened");
          tile.textContent="";
          opened++;
        });
      });

      const finishRound=correct=>{
        state.progress++;
        if(correct){
          const points=Math.max(200,1000-opened*50);
          state.score+=points;
          state.streak++;
          state.bestStreak=Math.max(state.bestStreak,state.streak);
          announceGame(state,`Chính xác! +${points} điểm`,"success");
        }else{
          state.mistakes++;
          state.streak=0;
          announceGame(state,`Đáp án: ${item.answer}`,"error");
        }
        syncGameRuntime(state);
        host.querySelectorAll("[data-tile]").forEach(tile=>{
          tile.classList.add("opened");
          tile.textContent="";
          tile.disabled=true;
        });
        host.querySelectorAll("button,input").forEach(control=>control.disabled=true);
        index++;
        setTimeout(draw,1000);
      };

      const inputEl=host.querySelector("[data-reveal-input]");
      host.querySelector("[data-check-reveal]").addEventListener("click",()=>{
        if(!inputEl.value.trim())return;
        if(sameGameAnswer(inputEl.value,item.answer))finishRound(true);
        else{
          state.mistakes++;
          syncGameRuntime(state);
          flashGame(inputEl,false);
          announceGame(state,"Chưa đúng; hãy mở thêm ô hoặc thử lại.","error");
        }
      });
      host.querySelector("[data-give-reveal]").addEventListener("click",()=>finishRound(false));
      inputEl.addEventListener("keydown",event=>{
        if(event.key==="Enter")host.querySelector("[data-check-reveal]").click();
      });
    };

    draw();
    return;
  }

  if(id==="memoryflash"){
    let index=0;
    let phase="memorize";
    const shuffledItems=shuffle(data);

    const ask=()=>{
      if(index>=shuffledItems.length){
        finishGame(state,{title:"Memory Flash hoàn tất!"});
        return;
      }

      phase="question";
      const current=shuffledItems[index];
      const wrongPool=shuffle(data.filter(item=>item.id!==current.id)).slice(0,3);
      const choices=shuffle([current,...wrongPool]);
      host.innerHTML=expandedRoundFrame(
        `Câu ${index+1}/${data.length}`,
        `<p>Chi tiết nào thuộc về mục sau?</p>
         <div class="btl-memory-question">${escapeHtml(current.item)}</div>
         <div class="q-options">
           ${choices.map(choice=>`<button class="option-btn" type="button" data-memory-id="${choice.id}">${escapeHtml(choice.detail)}</button>`).join("")}
         </div>`
      );

      host.querySelectorAll("[data-memory-id]").forEach(button=>{
        button.addEventListener("click",()=>{
          const correct=Number(button.dataset.memoryId)===current.id;
          host.querySelectorAll("[data-memory-id]").forEach(choice=>{
            choice.disabled=true;
            if(Number(choice.dataset.memoryId)===current.id)choice.classList.add("correct");
          });
          if(!correct)button.classList.add("wrong");
          recordGame(state,correct);
          announceGame(state,correct?"Ghi nhớ chính xác!":"Chưa đúng.",correct?"success":"error");
          index++;
          setTimeout(ask,720);
        });
      });
    };

    host.innerHTML=expandedRoundFrame(
      "Ghi nhớ trong 8 giây",
      `<div class="btl-memory-countdown"><b data-memory-seconds>8</b></div>
       <div class="btl-memory-board">
         ${data.map(item=>`<article><strong>${escapeHtml(item.item)}</strong><span>${escapeHtml(item.detail)}</span></article>`).join("")}
       </div>`
    );

    let seconds=8;
    const secondsEl=host.querySelector("[data-memory-seconds]");
    container.__btlRoundTimer=setInterval(()=>{
      seconds--;
      secondsEl.textContent=String(Math.max(0,seconds));
      if(seconds<=0){
        clearInterval(container.__btlRoundTimer);
        ask();
      }
    },1000);
    return;
  }

  if(id==="labellab"){
    const items=data.items;
    let selected=null;
    let dragged=null;

    const chooseChip=chip=>{
      if(!chip||chip.disabled)return;
      selected=Number(chip.dataset.labelChip);
      container.querySelectorAll("[data-label-chip]").forEach(item=>item.classList.remove("selected"));
      chip.classList.add("selected");
    };

    const attempt=(target,chipId)=>{
      const expected=Number(target.dataset.labelTarget);
      const chip=container.querySelector(`[data-label-chip="${chipId}"]`);
      if(!chip||chip.disabled||target.classList.contains("placed"))return;
      const correct=expected===chipId;

      if(!correct){
        state.mistakes++;
        syncGameRuntime(state);
        flashGame(target,false);
        announceGame(state,"Nhãn chưa đúng vị trí.","error");
        return;
      }

      target.classList.add("placed");
      target.innerHTML=`<span>${escapeHtml(target.dataset.label)}</span>`;
      chip.disabled=true;
      chip.classList.add("done");
      selected=null;
      recordGame(state,true);
      announceGame(state,"Đặt nhãn chính xác!","success");
      if(state.progress===state.total){
        setTimeout(()=>finishGame(state,{title:"Đã hoàn thành Label Lab!"}),450);
      }
    };

    container.querySelectorAll("[data-label-chip]").forEach(chip=>{
      chip.addEventListener("click",()=>chooseChip(chip));
      chip.addEventListener("dragstart",event=>{
        dragged=Number(chip.dataset.labelChip);
        event.dataTransfer?.setData("text/plain",String(dragged));
      });
    });

    container.querySelectorAll("[data-label-target]").forEach(target=>{
      target.addEventListener("click",()=>{
        if(selected!==null)attempt(target,selected);
      });
      target.addEventListener("dragover",event=>event.preventDefault());
      target.addEventListener("drop",event=>{
        event.preventDefault();
        const idFromTransfer=Number(event.dataTransfer?.getData("text/plain"));
        attempt(target,Number.isFinite(idFromTransfer)?idFromTransfer:dragged);
      });
    });
    return;
  }

  if(id==="picturequiz"){
    let index=0;

    const draw=()=>{
      if(index>=data.length){
        finishGame(state,{title:"Picture Quiz hoàn tất!"});
        return;
      }
      const item=data[index];
      host.innerHTML=expandedRoundFrame(
        `Câu ${index+1}/${data.length}`,
        `<div class="btl-picture-visual">${expandedVisualMarkup(item.visual,item.q)}</div>
         <h3>${escapeHtml(item.q)}</h3>
         <div class="q-options">
           ${item.choices.map(choice=>`<button class="option-btn" type="button" data-picture-choice="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`).join("")}
         </div>`
      );

      host.querySelectorAll("[data-picture-choice]").forEach(button=>{
        button.addEventListener("click",()=>{
          const correct=sameGameAnswer(button.dataset.pictureChoice,item.correct);
          host.querySelectorAll("[data-picture-choice]").forEach(choice=>{
            choice.disabled=true;
            if(sameGameAnswer(choice.dataset.pictureChoice,item.correct))choice.classList.add("correct");
          });
          if(!correct)button.classList.add("wrong");
          recordGame(state,correct);
          announceGame(state,correct?"Chính xác!":`Đáp án: ${item.correct}`,correct?"success":"error");
          index++;
          setTimeout(draw,780);
        });
      });
    };

    draw();
    return;
  }

  if(id==="sortsprint"){
    const deck=shuffle(data);
    const categories=[...new Set(data.map(item=>item.cat))];
    let index=0;
    let seconds=6;

    const draw=()=>{
      clearInterval(container.__btlRoundTimer);
      if(index>=deck.length){
        finishGame(state,{
          title:"Sort Sprint hoàn tất!",
          detail:`Chuỗi đúng tốt nhất: ${state.bestStreak}`
        });
        return;
      }

      const item=deck[index];
      seconds=Math.max(3,6-Math.floor(index/4));
      host.innerHTML=expandedRoundFrame(
        `Mục ${index+1}/${deck.length}`,
        `<div class="btl-sprint-clock"><b data-sprint-seconds>${seconds}</b>s</div>
         <div class="btl-sprint-item">${escapeHtml(item.item)}</div>
         <div class="btl-sprint-categories">
           ${categories.map(category=>`<button class="btl-sprint-category" type="button" data-sprint-cat="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}
         </div>`
      );

      let resolved=false;
      const resolve=(choice,button,expired=false)=>{
        if(resolved)return;
        resolved=true;
        clearInterval(container.__btlRoundTimer);
        const correct=!expired&&sameGameAnswer(choice,item.cat);
        host.querySelectorAll("[data-sprint-cat]").forEach(categoryButton=>{
          categoryButton.disabled=true;
          if(sameGameAnswer(categoryButton.dataset.sprintCat,item.cat))categoryButton.classList.add("correct");
        });
        if(button&&!correct)button.classList.add("wrong");
        recordGame(state,correct);
        announceGame(
          state,
          correct?"Phân loại chính xác!":expired?`Hết giờ: ${item.cat}`:`Nhóm đúng: ${item.cat}`,
          correct?"success":"error"
        );
        index++;
        setTimeout(draw,620);
      };

      host.querySelectorAll("[data-sprint-cat]").forEach(button=>{
        button.addEventListener("click",()=>resolve(button.dataset.sprintCat,button,false));
      });

      const secondsEl=host.querySelector("[data-sprint-seconds]");
      container.__btlRoundTimer=setInterval(()=>{
        seconds--;
        secondsEl.textContent=String(Math.max(0,seconds));
        if(seconds<=0)resolve("",null,true);
      },1000);
    };

    draw();
    return;
  }

  if(id==="wordmagnets"){
    let index=0;

    const draw=()=>{
      if(index>=data.length){
        finishGame(state,{title:"Word Magnets hoàn tất!"});
        return;
      }

      const sentence=data[index];
      const words=sentence.split(/\s+/).filter(Boolean);
      host.innerHTML=expandedRoundFrame(
        `Câu ${index+1}/${data.length}`,
        `<div class="btl-magnet-board" data-magnet-board></div>
         <div class="btl-magnet-pool" data-magnet-pool>
           ${shuffle(words.map((word,wordIndex)=>({word,wordIndex}))).map(item=>`<button
             class="btl-magnet"
             type="button"
             draggable="true"
             data-magnet-word="${escapeHtml(item.word)}"
             data-magnet-id="${item.wordIndex}"
           >${escapeHtml(item.word)}</button>`).join("")}
         </div>
         <div class="toolbar">
           <button class="btn primary" type="button" data-check-magnets>Kiểm tra</button>
           <button class="btn ghost" type="button" data-reset-magnets>Làm lại</button>
         </div>`
      );

      const board=host.querySelector("[data-magnet-board]");
      const pool=host.querySelector("[data-magnet-pool]");
      let dragged=null;

      const moveToBoard=magnet=>{
        if(!magnet)return;
        board.appendChild(magnet);
        magnet.classList.add("on-board");
      };
      const moveToPool=magnet=>{
        if(!magnet)return;
        pool.appendChild(magnet);
        magnet.classList.remove("on-board");
      };

      host.querySelectorAll("[data-magnet-word]").forEach(magnet=>{
        magnet.addEventListener("click",()=>{
          if(magnet.parentElement===board)moveToPool(magnet);
          else moveToBoard(magnet);
        });
        magnet.addEventListener("dragstart",()=>{dragged=magnet});
      });

      [board,pool].forEach(zone=>{
        zone.addEventListener("dragover",event=>event.preventDefault());
        zone.addEventListener("drop",event=>{
          event.preventDefault();
          if(zone===board)moveToBoard(dragged);
          else moveToPool(dragged);
        });
      });

      board.addEventListener("dragover",event=>{
        event.preventDefault();
        if(!dragged||dragged.parentElement!==board)return;
        const after=[...board.children].find(child=>{
          if(child===dragged)return false;
          const rect=child.getBoundingClientRect();
          return event.clientX<rect.left+rect.width/2;
        });
        if(after)board.insertBefore(dragged,after);
        else board.appendChild(dragged);
      });

      host.querySelector("[data-reset-magnets]").addEventListener("click",()=>{
        [...board.children].forEach(moveToPool);
      });

      host.querySelector("[data-check-magnets]").addEventListener("click",()=>{
        const built=[...board.children].map(item=>item.dataset.magnetWord).join(" ");
        const correct=sameGameAnswer(built,sentence);
        if(!correct){
          state.mistakes++;
          syncGameRuntime(state);
          flashGame(board,false);
          announceGame(state,"Thứ tự chưa đúng.","error");
          return;
        }
        recordGame(state,true);
        board.classList.add("correct");
        announceGame(state,"Câu hoàn chỉnh!","success");
        index++;
        setTimeout(draw,720);
      });
    };

    draw();
  }
}

const bindInteractiveActivityBeforeExpandedGames=bindInteractiveActivity;
function bindInteractiveActivityExpandedGames(container,id,data,options={}){
  if(isExpandedGame(id))return bindExpandedGame(container,id,data,options);
  return bindInteractiveActivityBeforeExpandedGames(container,id,data,options);
}
bindInteractiveActivity=bindInteractiveActivityExpandedGames;
bindActivity=bindInteractiveActivity;

standaloneJs=function expandedThirtyGameStandaloneJs(){
  const id=selectedTemplate.id;
  const raw=input.value.trim();
  const title=selectedTemplate.name;

  const baseFunctions=[
    escapeHtml,splitLines,parts,shuffle,
    normalizeGameAnswer,sameGameAnswer,safeJsonAttr,formatGameTime,
    gameFrame,syncGameRuntime,cleanupGame,createGameRuntime,announceGame,
    flashGame,emitGameConfetti,finishGame,recordGame,setGameTotals,
    renderTypedBlankGame,renderClozeGame,makeWordSearchGame,
    straightSelectionPath,bingoWin,renderInteractiveActivity
  ];

  const expandedFunctions=[
    isExpandedGame,clampExpandedNumber,expandedAnswerKey,expandedLevenshtein,
    expandedAnswerAccepted,expandedVisualMarkup,parseExpandedData,
    parseDataExpandedGames,expandedRoundFrame,bindExpandedGame,
    bindInteractiveActivityExpandedGames
  ];

  return `const __ACTIVITY_ID__=${JSON.stringify(id)};
const __RAW__=${JSON.stringify(raw)};
const __TITLE__=${JSON.stringify(title)};
const parseDataBeforeExpandedGames=${parseDataBeforeExpandedGames.toString()};
const bindInteractiveActivityBeforeExpandedGames=${bindInteractiveActivityBeforeExpandedGames.toString()};
${baseFunctions.map(fn=>fn.toString()).join("\n")}
${expandedFunctions.map(fn=>fn.toString()).join("\n")}
let parseData=parseDataExpandedGames;
const ACTIVITY_RENDERERS=${objectToSource(ACTIVITY_RENDERERS)};
let bindInteractiveActivity=bindInteractiveActivityExpandedGames;
let bindActivity=bindInteractiveActivity;
let renderActivity=renderInteractiveActivity;
const selectedTemplate={name:__TITLE__};
const data=parseData(__ACTIVITY_ID__,__RAW__);
renderActivity(document.getElementById("stage"),__ACTIVITY_ID__,data,{title:__TITLE__});`;
};

/* BRIAN_TEXTLAB_EXPANDED_12_GAMES_END */

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
/* BRIAN_TEXTLAB_GAME_ENGINE_V2_CSS_END */
/* BRIAN_TEXTLAB_EXPANDED_12_GAMES_CSS_START */
.btl-expanded-round{min-height:310px}
.btl-showdown-timer,.btl-spell-clock,.btl-sprint-clock,.btl-memory-countdown{
  width:78px;height:78px;margin:0 auto 12px;display:grid;place-items:center;
  border:6px solid #1479ff;border-radius:50%;background:#eef6ff;color:#123a6b
}
.btl-showdown-timer b,.btl-spell-clock b,.btl-sprint-clock b,.btl-memory-countdown b{
  display:block;font-size:27px;line-height:1
}
.btl-showdown-timer span{font-size:10px;font-weight:900;text-transform:uppercase}
.btl-hangman-layout{display:grid;grid-template-columns:minmax(220px,320px) 1fr;gap:24px;align-items:center}
.btl-hangman-svg{width:100%;max-height:290px}
.btl-hangman-svg path,.btl-hangman-svg circle{
  fill:none;stroke:#123a6b;stroke-width:8;stroke-linecap:round;opacity:0
}
.btl-hangman-svg .gallows{opacity:1;stroke:#55708f}
.btl-hangman-svg [data-hang-part].shown{opacity:1;animation:btlDrawPart .3s ease}
.btl-word-mask{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0 18px}
.btl-word-mask span{min-width:27px;padding:2px 3px;border-bottom:3px solid #123a6b;text-align:center;font-size:29px;font-weight:950}
.btl-word-mask span.space{min-width:16px;border:0}
.btl-word-clue{text-align:center;color:#48627f;font-weight:800}
.btl-alpha-keyboard{display:flex;flex-wrap:wrap;gap:7px;justify-content:center}
.btl-alpha-key{width:38px;height:38px;border:2px solid #cfe2ff;border-radius:10px;background:#fff;color:#123a6b;font-weight:900;cursor:pointer}
.btl-alpha-key:hover{background:#eaf4ff}
.btl-alpha-key:disabled{opacity:.35;cursor:not-allowed}
.btl-typed-answer{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;margin:18px 0}
.btl-typed-answer .blank-input{min-width:min(380px,100%);font-size:17px}
.btl-spell-clue,.btl-target-prompt,.btl-memory-question,.btl-sprint-item{
  padding:24px;border:2px solid #dbeafe;border-radius:22px;background:#eef6ff;
  color:#123a6b;text-align:center;font-size:clamp(22px,4vw,38px);font-weight:950
}
.btl-spell-example{text-align:center;color:#607895;font-style:italic}
.btl-target-grid,.btl-sprint-categories{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:18px
}
.btl-target-option,.btl-sprint-category{
  min-height:58px;border:2px solid #dbeafe;border-radius:15px;background:#fff;
  color:#123a6b;padding:10px;font-weight:850;cursor:pointer
}
.btl-box-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:12px}
.btl-mystery-box{
  min-height:120px;display:grid;place-items:center;gap:5px;border:2px solid #dbeafe;
  border-radius:20px;background:linear-gradient(145deg,#eef6ff,#fff);color:#123a6b;
  cursor:pointer;transition:.2s ease
}
.btl-mystery-box span{font-size:35px;font-weight:950}
.btl-mystery-box:hover{transform:translateY(-3px);border-color:#1479ff}
.btl-mystery-box.opened{background:#e8fff4;border-color:#65d6a2;color:#05603a}
.btl-box-stage{margin-top:16px;min-height:180px;display:grid;place-items:center}
.btl-box-placeholder,.btl-open-box{
  width:min(680px,100%);padding:26px;border:2px dashed #cfe2ff;border-radius:22px;
  background:#f8fbff;text-align:center;color:#48627f
}
.btl-box-placeholder.success{border-style:solid;border-color:#65d6a2;background:#e8fff4;color:#05603a}
.btl-open-box{border-style:solid;background:#fff}
.btl-open-box-icon{font-size:48px}
.btl-open-box h3{font-size:27px;margin:8px 0}
.btl-open-box p{font-size:19px;line-height:1.55}
.btl-reveal-clue{text-align:center;color:#48627f;font-weight:850}
.btl-reveal-board{position:relative;width:min(520px,100%);aspect-ratio:4/3;margin:14px auto;overflow:hidden;border:2px solid #dbeafe;border-radius:24px;background:#eef6ff}
.btl-reveal-visual{position:absolute;inset:0;display:grid;place-items:center;padding:18px}
.btl-reveal-grid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr)}
.btl-reveal-tile{border:1px solid rgba(255,255,255,.55);background:linear-gradient(145deg,#166fe8,#0e57c9);color:#fff;font-weight:900;cursor:pointer;transition:transform .38s,opacity .38s}
.btl-reveal-tile:hover{background:#2a82f5}
.btl-reveal-tile.opened{opacity:0;transform:scale(.55) rotate(7deg);pointer-events:none}
.btl-expanded-image,.btl-scene-svg{width:100%;height:100%;max-height:330px;object-fit:contain}
.btl-expanded-emoji{font-size:clamp(72px,16vw,150px);line-height:1.1;text-align:center}
.btl-expanded-word-visual{font-size:clamp(36px,8vw,82px);font-weight:950;text-align:center;color:#123a6b}
.btl-memory-board{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
.btl-memory-board article{padding:15px;border:2px solid #dbeafe;border-radius:16px;background:#fff}
.btl-memory-board strong,.btl-memory-board span{display:block}
.btl-memory-board strong{color:#1479ff;font-size:17px}
.btl-memory-board span{margin-top:5px;color:#48627f}
.btl-label-layout{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:18px}
.btl-label-scene{position:relative;min-height:390px;border:2px solid #dbeafe;border-radius:24px;overflow:hidden;background:#eef6ff}
.btl-label-scene>.btl-scene-svg,.btl-label-scene>.btl-expanded-image{position:absolute;inset:0;width:100%;height:100%}
.btl-label-target{
  position:absolute;transform:translate(-50%,-50%);min-width:34px;min-height:34px;
  display:grid;place-items:center;border:3px solid #fff;border-radius:999px;background:#1479ff;
  color:#fff;box-shadow:0 6px 18px rgba(15,39,71,.22);cursor:pointer;z-index:3
}
.btl-label-target.placed{min-width:88px;padding:7px 10px;border-radius:12px;background:#e8fff4;color:#05603a;border-color:#65d6a2}
.btl-label-target.placed span{font-size:12px}
.btl-label-bank{align-content:start;display:flex;flex-direction:column;gap:9px;padding:14px;border:2px solid #dbeafe;border-radius:20px;background:#fff}
.btl-label-chip{width:100%;text-align:left}
.btl-label-chip.selected{outline:3px solid rgba(20,121,255,.22);background:#eaf4ff}
.btl-label-chip.done{opacity:.35;text-decoration:line-through}
.btl-picture-visual{width:min(520px,100%);height:260px;margin:0 auto 18px;display:grid;place-items:center;border:2px solid #dbeafe;border-radius:24px;background:#eef6ff;overflow:hidden}
.btl-sprint-item{margin:16px auto;max-width:680px}
.btl-sprint-clock{border-color:#f59e0b;background:#fff7e6}
.btl-magnet-board,.btl-magnet-pool{
  min-height:88px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:9px;
  padding:14px;border:2px dashed #b8d7ff;border-radius:18px;background:#f8fbff
}
.btl-magnet-board{margin-bottom:14px;background:#eef6ff}
.btl-magnet-pool{border-style:solid;background:#fff}
.btl-magnet{
  border:2px solid #d2b48c;border-radius:8px;background:#fff8dc;color:#553c1f;
  padding:10px 13px;font-weight:900;cursor:grab;box-shadow:0 4px 0 #d8bd8d
}
.btl-magnet.on-board{background:#eaf4ff;border-color:#93c5fd;color:#123a6b;box-shadow:0 4px 0 #93b9e9}
@keyframes btlDrawPart{from{stroke-dasharray:90;stroke-dashoffset:90}to{stroke-dashoffset:0}}
@media(max-width:760px){
  .btl-hangman-layout,.btl-label-layout{grid-template-columns:1fr}
  .btl-label-bank{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
  .btl-label-scene{min-height:330px}
  .btl-target-grid,.btl-sprint-categories{grid-template-columns:1fr 1fr}
}
@media(max-width:480px){
  .btl-target-grid,.btl-sprint-categories,.btl-label-bank{grid-template-columns:1fr}
  .btl-alpha-key{width:34px;height:34px}
  .btl-box-grid{grid-template-columns:repeat(2,1fr)}
}
/* BRIAN_TEXTLAB_EXPANDED_12_GAMES_CSS_END */`;
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
/* BRIAN_TEXTLAB_APPROVED_MODERN_SCROLL_START */
(() => {
  const GUIDE_RULES = {
    quiz: [
      "Chọn đáp án đúng nhất cho từng câu.",
      "Mỗi câu chỉ được trả lời một lần.",
      "Hoàn thành để xem điểm và tổng kết."
    ],
    truefalse: [
      "Đọc kỹ từng nhận định.",
      "Chọn Đúng hoặc Sai một lần duy nhất.",
      "Hệ thống phản hồi và tổng kết tự động."
    ],
    flashcards: [
      "Bấm vào thẻ để lật mặt sau.",
      "Đánh dấu Đã nhớ hoặc Cần ôn.",
      "Hoàn thành toàn bộ bộ thẻ để xem kết quả."
    ],
    wheel: [
      "Bấm Spin để quay vòng chọn.",
      "Các mục đã chọn được lưu trong lịch sử.",
      "Có thể quay lại cho đến khi hết danh sách."
    ],
    picker: [
      "Bấm Pick để bốc một mục ngẫu nhiên.",
      "Kết quả không lặp cho đến khi hết lượt.",
      "Chơi lại để tạo một vòng bốc mới."
    ],
    matching: [
      "Chọn một mục ở cột trái.",
      "Chọn mục tương ứng ở cột phải.",
      "Ghép hết các cặp để hoàn thành."
    ],
    memory: [
      "Lật hai thẻ trong mỗi lượt.",
      "Cặp đúng sẽ được giữ lại.",
      "Tìm đủ tất cả các cặp để kết thúc."
    ],
    fillblank: [
      "Nhập đáp án vào từng chỗ trống.",
      "Kiểm tra chính tả trước khi nộp.",
      "Nộp bài để xem phản hồi và tổng kết."
    ],
    cloze: [
      "Chọn từ trong ngân hàng từ.",
      "Đặt từ vào đúng chỗ trống.",
      "Hoàn thành đoạn văn để xem kết quả."
    ],
    unscramble: [
      "Sắp xếp lại các chữ cái.",
      "Nhập từ đúng theo gợi ý.",
      "Nhấn Enter để kiểm tra nhanh."
    ],
    sentence: [
      "Bấm các từ theo đúng thứ tự.",
      "Dùng Hoàn tác khi cần sửa.",
      "Kiểm tra từng câu trước khi chuyển tiếp."
    ],
    ordering: [
      "Kéo các mục lên hoặc xuống.",
      "Có thể dùng nút mũi tên để sắp xếp.",
      "Kiểm tra khi tất cả mục đã đúng vị trí."
    ],
    categories: [
      "Kéo từng mục vào nhóm phù hợp.",
      "Có thể chọn mục rồi chọn nhóm.",
      "Phân loại hết để hoàn thành."
    ],
    bingo: [
      "Bấm Gọi từ để nhận một mục ngẫu nhiên.",
      "Chỉ đánh dấu những từ đã được gọi.",
      "Hoàn thành một hàng để nhận Bingo."
    ],
    wordsearch: [
      "Kéo từ chữ đầu đến chữ cuối.",
      "Hỗ trợ ngang, dọc và đường chéo.",
      "Tìm đủ danh sách từ để kết thúc."
    ],
    crossword: [
      "Đọc gợi ý và nhập từng chữ cái.",
      "Dùng phím mũi tên để di chuyển ô.",
      "Kiểm tra khi hoàn thành toàn bộ đáp án."
    ],
    prompts: [
      "Đọc nhiệm vụ nói trên thẻ.",
      "Hoàn thành trong thời gian quy định.",
      "Đánh dấu Hoàn thành hoặc Bỏ qua."
    ],
    table: [
      "Tìm kiếm nhanh trong bảng.",
      "Bật chế độ che đáp án để tự học.",
      "Bấm vào ô để xem hoặc ẩn nội dung."
    ]
  };

  const iconFor = (template) => template?.icon || "□";

  function renderPreviewRail() {
    const rail = document.querySelector("#previewTemplateNav");
    if (!rail || !Array.isArray(TEMPLATES)) return;

    rail.innerHTML = TEMPLATES.map((template) => `
      <button
        type="button"
        class="preview-template-item ${template.id === selectedTemplate?.id ? "active" : ""}"
        data-preview-template="${escapeHtml(template.id)}"
        aria-pressed="${template.id === selectedTemplate?.id ? "true" : "false"}"
      >
        <span aria-hidden="true">${iconFor(template)}</span>
        <strong>${escapeHtml(template.name)}</strong>
      </button>
    `).join("");
  }

  function updateEditorMetrics() {
    const value = String(input?.value || "");
    const logicalLines = value.length ? value.split(/\r?\n/) : [""];
    const lineNumbers = document.querySelector("#contentLineNumbers");
    const lineCount = document.querySelector("#contentLineCount");
    const charCount = document.querySelector("#contentCharCount");

    if (lineNumbers) {
      lineNumbers.textContent = logicalLines.map((_, index) => index + 1).join("\n");
    }
    if (lineCount) lineCount.textContent = String(logicalLines.length);
    if (charCount) charCount.textContent = String(value.length);
  }

  function updateGuide() {
    const name = document.querySelector("#guideTemplateName");
    const list = document.querySelector("#guideList");
    if (name) name.textContent = selectedTemplate?.name || "Activity";
    if (!list) return;

    const rules = GUIDE_RULES[selectedTemplate?.id] || [
      selectedTemplate?.desc || "Tương tác trực tiếp với hoạt động.",
      selectedTemplate?.hint || "Chỉnh sửa nội dung theo đúng định dạng.",
      "Hoàn thành để xem kết quả và tổng kết."
    ];

    list.innerHTML = rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("");
  }

  function syncTemplateCards() {
    document.querySelectorAll("#templateGrid .template-card").forEach((card) => {
      const active = card.dataset.template === selectedTemplate?.id;
      card.classList.toggle("active", active);
      card.setAttribute("aria-pressed", active ? "true" : "false");
      card.setAttribute(
        "title",
        TEMPLATES.find((template) => template.id === card.dataset.template)?.desc || ""
      );
    });
  }

  function scrollSelectedTemplateIntoView() {
    const active = document.querySelector(
      `#templateGrid .template-card[data-template="${CSS.escape(selectedTemplate?.id || "")}"]`
    );
    active?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center"
    });
  }

  function syncApprovedWorkspace({ scrollCard = false } = {}) {
    renderPreviewRail();
    updateEditorMetrics();
    updateGuide();
    syncTemplateCards();

    if (scrollCard) {
      requestAnimationFrame(scrollSelectedTemplateIntoView);
    }
  }

  function showDeviceStatus(message, type = "success") {
    if (typeof showLibraryAlert === "function") {
      showLibraryAlert(message, type);
      return;
    }

    const alert = document.querySelector("#libraryAlert");
    if (!alert) return;
    alert.textContent = message;
    alert.classList.remove("hidden");
    setTimeout(() => alert.classList.add("hidden"), 2600);
  }

  function saveDraftToDevice() {
    const payload = {
      version: 1,
      templateId: selectedTemplate?.id || "quiz",
      content: String(input?.value || ""),
      savedAt: new Date().toISOString()
    };

    localStorage.setItem("brian-textlab-local-draft", JSON.stringify(payload));
    showDeviceStatus("Đã lưu bản nháp trên thiết bị.");
  }

  function downloadCurrentSample() {
    const sample = String(selectedTemplate?.sample || "");
    const blob = new Blob([sample], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `brian-textlab-${selectedTemplate?.id || "sample"}-sample.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
    showDeviceStatus("Đã tải sample đúng định dạng.");
  }

  function initApprovedWorkspace() {
    const grid = document.querySelector("#templateGrid");
    const previous = document.querySelector("#templatePrev");
    const next = document.querySelector("#templateNext");
    const previewRail = document.querySelector("#previewTemplateNav");
    const lineNumbers = document.querySelector("#contentLineNumbers");
    const downloadSample = document.querySelector("#btnDownloadSample");
    const saveDevice = document.querySelector("#btnSaveDevice");

    previous?.addEventListener("click", () => {
      grid?.scrollBy({ left: -Math.max(420, grid.clientWidth * 0.72), behavior: "smooth" });
    });

    next?.addEventListener("click", () => {
      grid?.scrollBy({ left: Math.max(420, grid.clientWidth * 0.72), behavior: "smooth" });
    });

    previewRail?.addEventListener("click", (event) => {
      const item = event.target.closest("[data-preview-template]");
      if (!item) return;
      selectTemplate(item.dataset.previewTemplate, { loadSample: true });
    });

    input?.addEventListener("scroll", () => {
      if (lineNumbers) lineNumbers.scrollTop = input.scrollTop;
    });

    input?.addEventListener("input", updateEditorMetrics);
    downloadSample?.addEventListener("click", downloadCurrentSample);
    saveDevice?.addEventListener("click", saveDraftToDevice);

    document.querySelector("#templateGrid")?.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      grid?.scrollBy({
        left: event.key === "ArrowRight" ? 260 : -260,
        behavior: "smooth"
      });
    });

    syncApprovedWorkspace({ scrollCard: true });
  }

  const originalRenderTemplateGrid = renderTemplateGrid;
  renderTemplateGrid = function approvedRenderTemplateGrid(filter = "") {
    originalRenderTemplateGrid(filter);
    syncTemplateCards();
  };

  const originalSelectTemplate = selectTemplate;
  selectTemplate = function approvedSelectTemplate(id, options = {}) {
    originalSelectTemplate(id, options);
    syncApprovedWorkspace({ scrollCard: true });
  };

  const originalRenderPreview = renderPreview;
  renderPreview = function approvedRenderPreview() {
    originalRenderPreview();
    updateEditorMetrics();
    updateGuide();
  };

  finishActivity = function approvedFinishActivity() {
    if (!input.value.trim()) {
      document.querySelector("#inputAlert")?.classList.remove("hidden");
      return;
    }

    currentData = parseData(selectedTemplate.id, input.value.trim());
    preview.className = "activity-stage";
    renderActivity(preview, selectedTemplate.id, currentData, {
      title: selectedTemplate.name,
      mode: "ready"
    });
    finished = true;
    preview.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  resetAll = function approvedResetAll() {
    finished = false;
    if (ready) {
      ready.className = "activity-stage hidden";
      ready.innerHTML = "";
    }
    selectTemplate("quiz", { loadSample: true });
    document.querySelector(".templates-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
    showDeviceStatus("Đã tạo hoạt động mới.");
  };

  const originalInit = init;
  init = function approvedInit() {
    originalInit();
    initApprovedWorkspace();
  };
})();
/* BRIAN_TEXTLAB_APPROVED_MODERN_SCROLL_END */

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
