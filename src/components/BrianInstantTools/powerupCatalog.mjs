// Brian Classroom Power-Ups V1 — 50 predefined safe classroom game cards.
// All effects require explicit teacher approval; never change formal grades.
// Types: 25 rewards + 25 learning challenges / light game penalties.
export const POWERUP_CARDS=Object.freeze([
 [
  "reward",
  "bonus1",
  "+1 Điểm",
  "Game +1",
  "Cộng 1 điểm trò chơi cho đội.",
  "Award 1 game point.",
  "score",
  1
 ],
 [
  "reward",
  "bonus2",
  "+2 Điểm",
  "Game +2",
  "Cộng 2 điểm trò chơi cho đội.",
  "Award 2 game points.",
  "score",
  2
 ],
 [
  "reward",
  "bonus3",
  "+3 Điểm",
  "Game +3",
  "Cộng 3 điểm trò chơi cho đội.",
  "Award 3 game points.",
  "score",
  3
 ],
 [
  "reward",
  "bonus5",
  "Kho Báu +5",
  "Treasure +5",
  "Cộng 5 điểm trò chơi cho đội.",
  "Award 5 game points.",
  "score",
  5
 ],
 [
  "reward",
  "extraTry",
  "Cơ Hội Thứ Hai",
  "Second Chance",
  "Được làm lại một câu vừa trả lời sai.",
  "Retry one incorrect answer.",
  "retry",
  0
 ],
 [
  "reward",
  "freeHint",
  "Gợi Ý Miễn Phí",
  "Free Hint",
  "Giáo viên cho một gợi ý ở câu kế tiếp.",
  "Receive one teacher hint on the next question.",
  "hint",
  0
 ],
 [
  "reward",
  "bonus10",
  "Thêm 10 Giây",
  "Extra 10 Seconds",
  "Thêm 10 giây cho lượt trả lời tiếp theo.",
  "Get 10 extra seconds on the next turn.",
  "time",
  10
 ],
 [
  "reward",
  "bonus20",
  "Thêm 20 Giây",
  "Extra 20 Seconds",
  "Thêm 20 giây cho lượt trả lời tiếp theo.",
  "Get 20 extra seconds on the next turn.",
  "time",
  20
 ],
 [
  "reward",
  "shield",
  "Khiên Bảo Vệ",
  "Protection Shield",
  "Miễn một thẻ trừ điểm trò chơi ở lượt sau.",
  "Block one future game-point deduction.",
  "shield",
  0
 ],
 [
  "reward",
  "doubleNext",
  "Nhân Đôi Điểm",
  "Double Next Score",
  "Nhân đôi điểm trò chơi của câu trả lời đúng tiếp theo (tối đa +4).",
  "Double next correct game score (maximum +4).",
  "score",
  0
 ],
 [
  "reward",
  "chooseQuestion",
  "Tự Chọn Câu",
  "Pick a Question",
  "Chọn một trong hai câu hỏi giáo viên đưa ra.",
  "Choose between two teacher-offered questions.",
  "choice",
  0
 ],
 [
  "reward",
  "easyQuestion",
  "Đổi Câu Dễ Hơn",
  "Easier Question",
  "Đổi một câu khó thành câu cùng mục tiêu nhưng dễ hơn.",
  "Swap one question for an easier equivalent.",
  "choice",
  0
 ],
 [
  "reward",
  "teamHelp",
  "Hội Ý Đồng Đội",
  "Team Huddle",
  "Được hội ý cùng đội thêm 20 giây.",
  "Discuss with your team for 20 more seconds.",
  "time",
  20
 ],
 [
  "reward",
  "friendHelp",
  "Người Bạn Trợ Giúp",
  "Ask a Friend",
  "Nhờ một bạn cùng lớp trợ giúp một lượt.",
  "Ask one classmate to assist for one turn.",
  "hint",
  0
 ],
 [
  "reward",
  "chooseSpeaker",
  "Chọn Đại Diện",
  "Pick the Speaker",
  "Đội tự chọn người trình bày câu trả lời tiếp theo.",
  "Choose who presents the next answer.",
  "choice",
  0
 ],
 [
  "reward",
  "vocabPass",
  "Tấm Vé Từ Vựng",
  "Vocab Pass",
  "Chọn 1 trong 3 từ vựng để giải nghĩa.",
  "Choose one of three vocabulary prompts.",
  "choice",
  0
 ],
 [
  "reward",
  "grammarPass",
  "Tấm Vé Ngữ Pháp",
  "Grammar Pass",
  "Chọn 1 trong 2 câu ngữ pháp.",
  "Choose one of two grammar questions.",
  "choice",
  0
 ],
 [
  "reward",
  "passQuestion",
  "Đổi Câu Hỏi",
  "Swap a Question",
  "Đổi câu hiện tại lấy một câu tương đương.",
  "Replace the current question with an equivalent.",
  "choice",
  0
 ],
 [
  "reward",
  "freezeTimer",
  "Đóng Băng Đồng Hồ",
  "Freeze the Timer",
  "Tạm dừng đồng hồ trả lời 10 giây để suy nghĩ.",
  "Pause the turn timer for 10 seconds.",
  "time",
  10
 ],
 [
  "reward",
  "luckyDraw",
  "Rút Thẻ May Mắn",
  "Lucky Draw",
  "Giáo viên cho chọn một thẻ nhiệm vụ bổ sung.",
  "Choose one additional teacher-provided task card.",
  "choice",
  0
 ],
 [
  "reward",
  "teamPlus",
  "Phần Quà Đồng Đội",
  "Team Gift",
  "Tặng 1 điểm trò chơi cho một đội khác.",
  "Give 1 game point to another team.",
  "score",
  1
 ],
 [
  "reward",
  "firstTurn",
  "Ưu Tiên Trả Lời",
  "First Turn",
  "Được quyền trả lời đầu tiên ở vòng kế tiếp.",
  "Answer first in the next round.",
  "turn",
  0
 ],
 [
  "reward",
  "skipChallenge",
  "Lá Bài Bỏ Qua",
  "Challenge Skip",
  "Bỏ qua một thử thách không trừ điểm.",
  "Skip one task without a game-point penalty.",
  "shield",
  0
 ],
 [
  "reward",
  "rapidBonus",
  "Cú Chốt Nhanh",
  "Speed Bonus",
  "Nếu trả lời đúng trong 15 giây, nhận thêm 2 điểm.",
  "Earn 2 bonus game points if correct within 15 seconds.",
  "score",
  2
 ],
 [
  "reward",
  "teamChoice",
  "Quyền Chọn Chủ Đề",
  "Choose the Topic",
  "Chọn chủ đề từ vựng hoặc ngữ pháp của câu sau.",
  "Choose vocabulary or grammar for the next question.",
  "choice",
  0
 ],
 [
  "challenge",
  "minus1",
  "Mất 1 Điểm",
  "Lose 1 Point",
  "Trừ 1 điểm trò chơi (không ảnh hưởng điểm học tập).",
  "Deduct 1 game point (never an academic grade).",
  "score",
  -1
 ],
 [
  "challenge",
  "minus2",
  "Mất 2 Điểm",
  "Lose 2 Points",
  "Trừ tối đa 2 điểm trò chơi, không xuống dưới 0.",
  "Deduct up to 2 game points, not below zero.",
  "score",
  -2
 ],
 [
  "challenge",
  "quick15",
  "15 Giây Trả Lời",
  "15-Second Answer",
  "Trả lời một câu phù hợp trong 15 giây.",
  "Answer one suitable question within 15 seconds.",
  "time",
  -10
 ],
 [
  "challenge",
  "noHint",
  "Không Dùng Gợi Ý",
  "No Hint This Turn",
  "Trả lời câu tiếp theo mà không dùng gợi ý.",
  "Answer the next question without hints.",
  "challenge",
  0
 ],
 [
  "challenge",
  "englishOnly",
  "Chỉ Nói Tiếng Anh",
  "English Only",
  "Dùng tiếng Anh khi trình bày lượt kế tiếp.",
  "Present your next response in English.",
  "challenge",
  0
 ],
 [
  "challenge",
  "explainWhy",
  "Giải Thích Vì Sao",
  "Explain Why",
  "Nêu một lý do cho đáp án của đội.",
  "Give one reason supporting your team's answer.",
  "challenge",
  0
 ],
 [
  "challenge",
  "spellWord",
  "Thử Thách Đánh Vần",
  "Spelling Sprint",
  "Đánh vần một từ phù hợp với bài học.",
  "Spell one lesson-level word.",
  "challenge",
  0
 ],
 [
  "challenge",
  "synonym",
  "Tìm Từ Đồng Nghĩa",
  "Find a Synonym",
  "Nêu từ đồng nghĩa với từ giáo viên chọn.",
  "Give a synonym for a teacher-chosen word.",
  "challenge",
  0
 ],
 [
  "challenge",
  "antonym",
  "Tìm Từ Trái Nghĩa",
  "Find an Antonym",
  "Nêu từ trái nghĩa với từ giáo viên chọn.",
  "Give an antonym for a teacher-chosen word.",
  "challenge",
  0
 ],
 [
  "challenge",
  "sentence",
  "Tạo Một Câu",
  "Make a Sentence",
  "Đặt một câu có nghĩa bằng từ vừa học.",
  "Make a meaningful sentence using a target word.",
  "challenge",
  0
 ],
 [
  "challenge",
  "translate",
  "Dịch Nhanh",
  "Quick Translation",
  "Dịch một câu ngắn của bài học.",
  "Translate one short lesson sentence.",
  "challenge",
  0
 ],
 [
  "challenge",
  "findError",
  "Thám Tử Lỗi Sai",
  "Error Detective",
  "Phát hiện lỗi trong một câu tiếng Anh.",
  "Find an error in an English sentence.",
  "challenge",
  0
 ],
 [
  "challenge",
  "describe",
  "Miêu Tả Tranh",
  "Describe a Picture",
  "Nói 2 câu mô tả ảnh do giáo viên chọn.",
  "Say two sentences about a teacher-chosen image.",
  "challenge",
  0
 ],
 [
  "challenge",
  "speak20",
  "Nói 20 Giây",
  "Speak for 20 Seconds",
  "Nói tiếng Anh về chủ đề bài học trong 20 giây.",
  "Speak about the lesson topic for 20 seconds.",
  "challenge",
  0
 ],
 [
  "challenge",
  "switchSpeaker",
  "Đổi Người Đại Diện",
  "New Speaker",
  "Một thành viên khác của đội trình bày câu sau.",
  "Have a different teammate present next.",
  "challenge",
  0
 ],
 [
  "challenge",
  "twoReasons",
  "Hai Lý Do",
  "Two Reasons",
  "Đưa ra 2 lý do bảo vệ lựa chọn.",
  "Give two reasons supporting your answer.",
  "challenge",
  0
 ],
 [
  "challenge",
  "relay",
  "Câu Trả Lời Tiếp Sức",
  "Relay Response",
  "Hai thành viên mỗi người nói một ý ngắn.",
  "Two teammates each contribute one short idea.",
  "challenge",
  0
 ],
 [
  "challenge",
  "paraphrase",
  "Thử Thách Paraphrase",
  "Paraphrase It",
  "Diễn đạt lại một câu bằng cách khác.",
  "Restate one sentence in different words.",
  "challenge",
  0
 ],
 [
  "challenge",
  "newWord",
  "Từ Mới Bắt Buộc",
  "Use a New Word",
  "Dùng một từ mới của bài trong câu trả lời.",
  "Include one new lesson word in your response.",
  "challenge",
  0
 ],
 [
  "challenge",
  "harder",
  "Câu Hỏi Nâng Cao",
  "Challenge Question",
  "Làm thêm một câu khó hơn ở mức phù hợp.",
  "Complete one appropriately harder question.",
  "challenge",
  0
 ],
 [
  "challenge",
  "drawIdea",
  "Vẽ Ý Tưởng",
  "Sketch an Idea",
  "Vẽ một biểu tượng để đội khác đoán từ.",
  "Sketch one clue icon for others to guess.",
  "challenge",
  0
 ],
 [
  "challenge",
  "collocations",
  "Ba Cụm Từ",
  "Three Collocations",
  "Nêu 3 cụm từ liên quan đến chủ điểm.",
  "Name three topic-related collocations.",
  "challenge",
  0
 ],
 [
  "challenge",
  "complexSentence",
  "Câu Ghép Thử Thách",
  "Complex Sentence",
  "Nói một câu dùng because, although hoặc if.",
  "Say one sentence using because, although, or if.",
  "challenge",
  0
 ],
 [
  "challenge",
  "questionForPeer",
  "Đặt Câu Hỏi",
  "Ask a Question",
  "Đặt một câu hỏi tiếng Anh phù hợp cho đội khác.",
  "Ask another team one appropriate English question.",
  "challenge",
  0
 ],
 [
  "challenge",
  "summary10",
  "Tóm Tắt 10 Từ",
  "Ten-Word Summary",
  "Tóm tắt ý chính bằng khoảng 10 từ tiếng Anh.",
  "Summarize an idea using about ten English words.",
  "challenge",
  0
 ]
].map(
 ([type,id,vi,en,descriptionVi,descriptionEn,effect,value])=>Object.freeze({
  id,type,vi,en,descriptionVi,descriptionEn,effect,value
 })));
export const POWERUP_MAX=50;
const validIds=new Set(POWERUP_CARDS.map(card=>card.id));
export const getPowerup=id=>POWERUP_CARDS.find(p=>p.id===id)||null;
export const powerupColor=card=>card?.type==='reward'?'#18a990':'#f3994f';
export const powerupEligible=(settings,filter='all')=>POWERUP_CARDS.filter(p=>
  (filter==='all'||p.type===filter)&&settings.enabledIds.includes(p.id)&&
  (!settings.noRepeat||!settings.usedIds.includes(p.id)));
export function sanitizePowerups(raw){
 const source=raw&&typeof raw==='object'?raw:{};
 const enabledIds=Array.isArray(source.enabledIds)?[...new Set(source.enabledIds.filter(id=>validIds.has(id)))].slice(0,50):POWERUP_CARDS.map(c=>c.id);
 const usedIds=Array.isArray(source.usedIds)?[...new Set(source.usedIds.filter(id=>validIds.has(id)))].slice(0,50):[];
 const history=(Array.isArray(source.history)?source.history:[]).slice(0,100).filter(r=>validIds.has(r?.cardId)).map(r=>({
  cardId:r.cardId,team:String(r?.team||'').slice(0,36),status:r?.status==='applied'?'applied':'skipped',
  time:Number.isFinite(r?.time)?r.time:0
 }));
 const pending=validIds.has(source.pending?.cardId)?{
  cardId:source.pending.cardId,team:String(source.pending.team||'').slice(0,36)
 }:null;
 return {
  enabledIds,usedIds,history,pending,
  filter:['all','reward','challenge'].includes(source.filter)?source.filter:'all',
  noRepeat:source.noRepeat!==false,rotation:Number.isFinite(source.rotation)?((source.rotation%360)+360)%360:0,
  team:String(source.team||'').slice(0,36),spins:Math.min(100000,Math.max(0,Math.trunc(Number(source.spins)||0)))
 };
}
export function drawPowerup(cards,random){
 if(!Array.isArray(cards)||!cards.length)return null;
 const max=cards.length;
 // A caller can inject a deterministic RNG in tests; production uses crypto.
 const choose=random||((n)=>{
  if(!globalThis.crypto?.getRandomValues)return Math.floor(Math.random()*n);
  const a=new Uint32Array(1),limit=0x100000000-0x100000000%n;
  do{globalThis.crypto.getRandomValues(a);}while(a[0]>=limit);
  return a[0]%n;
 });
 return cards[choose(max)]||null;
}
export function decidePowerup(current,status,now=Date.now()){
 const state=sanitizePowerups(current),pending=state.pending;
 if(!pending)return state;
 const history=[{cardId:pending.cardId,team:pending.team,status:status==='applied'?'applied':'skipped',time:now},...state.history].slice(0,100);
 return {...state,pending:null,history,usedIds:state.noRepeat?[...new Set([...state.usedIds,pending.cardId])]:state.usedIds};
}
