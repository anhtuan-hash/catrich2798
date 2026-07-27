import React, { useState } from 'react';
import { ClassroomWidget } from '../../types';
import { playWinnerFanfare, playTickSound, playChimeSound } from '../../services/audio';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Sparkles,
  Heart,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Flame,
  Zap,
  Gamepad2,
  Swords,
  Eye,
  FileText,
  ListPlus,
  Play,
  Copy,
} from 'lucide-react';

interface WidgetProps {
  widget: ClassroomWidget;
  onUpdate: (partial: Partial<ClassroomWidget>) => void;
}

// ==========================================
// 1. WORD PUZZLE WIDGET (Ô chữ bí mật)
// ==========================================
export const WordPuzzleWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const wordList: Array<{ word: string; hint: string }> = widget.settings.wordList || [
    { word: 'VIETNAM', hint: 'Tên đất nước thân yêu của chúng ta' },
    { word: 'HANOI', hint: 'Thủ đô ngàn năm văn hiến' },
    { word: 'DINHDUONG', hint: 'Năng lượng và chất cần thiết cho cơ thể' },
  ];

  const currentWordIndex = Math.min(widget.settings.currentWordIndex || 0, wordList.length - 1);
  const currentItem = wordList[currentWordIndex] || { word: 'VIETNAM', hint: 'Quốc gia' };

  const secretWord = currentItem.word.toUpperCase();
  const hint = currentItem.hint;
  const guessedLetters: string[] = widget.settings.guessedLetters || [];
  const maxLives = 6;

  const [isEditing, setIsEditing] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const wordLetters = secretWord.split('');
  const wrongLetters = guessedLetters.filter((l) => !wordLetters.includes(l));
  const remainingLives = Math.max(0, maxLives - wrongLetters.length);
  const isWon = wordLetters.every((l) => l === ' ' || guessedLetters.includes(l));
  const isLost = remainingLives <= 0;

  const handleGuessLetter = (letter: string) => {
    if (guessedLetters.includes(letter) || isWon || isLost) return;

    const newGuessed = [...guessedLetters, letter];
    onUpdate({
      settings: { ...widget.settings, guessedLetters: newGuessed },
    });

    if (wordLetters.includes(letter)) {
      playChimeSound(0.5);
      const willWin = wordLetters.every((l) => l === ' ' || newGuessed.includes(l));
      if (willWin) {
        playWinnerFanfare(0.8);
        confetti({ particleCount: 80, spread: 80 });
      }
    } else {
      playTickSound(0.4);
    }
  };

  const handleReset = () => {
    onUpdate({
      settings: { ...widget.settings, guessedLetters: [] },
    });
  };

  const handleNextWord = () => {
    const nextIdx = (currentWordIndex + 1) % wordList.length;
    onUpdate({
      settings: { ...widget.settings, currentWordIndex: nextIdx, guessedLetters: [] },
    });
  };

  const handleApplyPasteTemplate = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split('\n').filter((l) => l.trim());
    const parsed = lines
      .map((line) => {
        const parts = line.split(/[|:-]/);
        if (parts.length >= 2) {
          return { word: parts[0].trim().toUpperCase().replace(/\s+/g, ''), hint: parts[1].trim() };
        } else if (parts.length === 1) {
          return { word: parts[0].trim().toUpperCase().replace(/\s+/g, ''), hint: 'Gợi ý bài học' };
        }
        return null;
      })
      .filter(Boolean) as Array<{ word: string; hint: string }>;

    if (parsed.length > 0) {
      onUpdate({
        settings: {
          ...widget.settings,
          wordList: parsed,
          currentWordIndex: 0,
          guessedLetters: [],
        },
      });
      setIsEditing(false);
      setPasteText('');
    }
  };

  const loadPreset = (presetName: string) => {
    let list: Array<{ word: string; hint: string }> = [];
    if (presetName === 'geography') {
      list = [
        { word: 'VIETNAM', hint: 'Đất nước có đường bờ biển hình chữ S' },
        { word: 'THAIBINH', hint: 'Tỉnh nổi tiếng với cánh đồng lúa quê hương' },
        { word: 'PHANXIPANG', hint: 'Đỉnh núi cao nhất Đông Dương' },
      ];
    } else if (presetName === 'english') {
      list = [
        { word: 'TEACHER', hint: 'Người thầy, người cô truyền đạt kiến thức' },
        { word: 'STUDENT', hint: 'Học sinh chăm ngoan học giỏi' },
        { word: 'CLASSROOM', hint: 'Phòng học thân thương nơi có bảng đen' },
      ];
    } else {
      list = [
        { word: 'QUANGHOP', hint: 'Quá trình cây xanh chế tạo chất dinh dưỡng' },
        { word: 'OXY', hint: 'Khí cần thiết cho sự hô hấp của con người' },
        { word: 'TRAIDAT', hint: 'Hành tinh xanh nơi chúng ta đang sống' },
      ];
    }
    onUpdate({
      settings: {
        ...widget.settings,
        wordList: list,
        currentWordIndex: 0,
        guessedLetters: [],
      },
    });
    setIsEditing(false);
  };

  const alphabet = 'AĂÂBCDĐEÊGHIKLMNOÔƠPQRSTUƯVXY'.split('');

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-1.5">
        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Gamepad2 className="w-4 h-4 text-[#1A73E8]" /> Ô CHỮ BÍ MẬT ({currentWordIndex + 1}/{wordList.length})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-2 py-0.5 text-[10px] bg-[#E8F0FE] text-[#1A73E8] font-bold rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
          >
            <FileText className="w-3 h-3" /> {isEditing ? 'Đóng' : 'Nhập mẫu dán'}
          </button>
          <button
            onClick={handleReset}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Chơi lại từ này"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="my-auto space-y-2 p-2.5 bg-gray-50 dark:bg-slate-800 rounded-2xl border overflow-y-auto max-h-[260px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-gray-700 dark:text-slate-200 uppercase flex items-center gap-1">
              <ListPlus className="w-3.5 h-3.5 text-[#1A73E8]" /> Dán danh sách từ & gợi ý
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => loadPreset('geography')}
                className="px-2 py-0.5 text-[9px] bg-emerald-100 text-emerald-700 rounded-md font-bold"
              >
                Mẫu Địa lý
              </button>
              <button
                onClick={() => loadPreset('english')}
                className="px-2 py-0.5 text-[9px] bg-purple-100 text-purple-700 rounded-md font-bold"
              >
                Mẫu Tiếng Anh
              </button>
            </div>
          </div>

          <p className="text-[10px] text-gray-500">
            Cấu trúc: <code>TỪ_BÍ_MẬT | Gợi ý cho học sinh</code> (mỗi dòng 1 từ)
          </p>

          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`VIETNAM | Tên đất nước thân yêu\nHANOI | Thủ đô ngàn năm văn hiến\nDINHDUONG | Chất dinh dưỡng`}
            className="w-full h-24 p-2 text-xs bg-white dark:bg-slate-900 rounded-xl border font-mono resize-none"
          />

          <button
            onClick={handleApplyPasteTemplate}
            className="w-full py-1.5 bg-[#1A73E8] hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-sm flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" /> Nạp danh sách & Bắt đầu
          </button>
        </div>
      ) : (
        <>
          {/* Hint & Lives */}
          <div className="flex items-center justify-between text-xs my-1 bg-blue-50/70 dark:bg-slate-800/70 p-1.5 rounded-xl border">
            <span className="text-[11px] text-gray-700 dark:text-slate-200 font-bold truncate max-w-[200px]">
              💡 {hint}
            </span>
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-0.5 mr-1">
                {Array.from({ length: maxLives }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-3.5 h-3.5 transition-transform ${
                      i < remainingLives
                        ? 'text-rose-500 fill-rose-500 scale-110'
                        : 'text-gray-300 dark:text-slate-700'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleNextWord}
                className="p-1 text-[#1A73E8] hover:bg-blue-100 rounded-lg text-[10px] font-bold flex items-center gap-0.5 border"
                title="Chuyển từ tiếp theo"
              >
                Từ tiếp <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Secret Word Tiles */}
          <div className="flex items-center justify-center gap-1.5 my-auto flex-wrap">
            {wordLetters.map((char, idx) => {
              if (char === ' ') {
                return <div key={idx} className="w-3 h-8" />;
              }
              const isRevealed = guessedLetters.includes(char) || isLost;
              return (
                <div
                  key={idx}
                  className={`w-9 h-11 rounded-xl border-2 flex items-center justify-center text-lg font-black font-mono transition-all duration-300 transform shadow-md ${
                    isRevealed
                      ? 'bg-gradient-to-b from-[#1A73E8] to-blue-700 border-blue-400 text-white scale-105 shadow-blue-500/20'
                      : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-transparent'
                  }`}
                >
                  {isRevealed ? char : ''}
                </div>
              );
            })}
          </div>

          {/* Status banner */}
          {isWon && (
            <div className="p-1.5 bg-emerald-500 text-white text-center font-black text-xs rounded-xl shadow-md animate-bounce flex items-center justify-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-300" /> CHIẾN THẮNG! TỪ LÀ: {secretWord}
            </div>
          )}
          {isLost && (
            <div className="p-1.5 bg-rose-600 text-white text-center font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5">
              💔 HẾT LƯỢT! TỪ BÍ MẬT LÀ: {secretWord}
            </div>
          )}

          {/* Alphabet Keyboard */}
          <div className="grid grid-cols-10 gap-1 mt-1">
            {alphabet.map((letter) => {
              const isUsed = guessedLetters.includes(letter);
              const isCorrect = isUsed && wordLetters.includes(letter);
              return (
                <button
                  key={letter}
                  disabled={isUsed || isWon || isLost}
                  onClick={() => handleGuessLetter(letter)}
                  className={`h-7 rounded-lg text-[11px] font-black transition-all flex items-center justify-center transform active:scale-90 ${
                    isCorrect
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isUsed
                      ? 'bg-gray-200 dark:bg-slate-800 text-gray-400'
                      : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 hover:bg-[#1A73E8] hover:text-white border shadow-xs'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// ==========================================
// 2. FLASHCARD WIDGET (Thẻ ghi nhớ Flashcard)
// ==========================================
export const FlashcardWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const cards: Array<{ question: string; answer: string }> = widget.settings.cards || [
    { question: 'Thủ đô của Việt Nam là gì?', answer: 'Hà Nội' },
    { question: 'Công thức hóa học của Nước?', answer: 'H2O' },
    { question: '3 x 8 bằng bao nhiêu?', answer: '24' },
    { question: 'Hành tinh nào gần Mặt Trời nhất?', answer: 'Sao Thủy (Mercury)' },
  ];

  const currentIndex = widget.settings.currentIndex || 0;
  const isFlipped = widget.settings.isFlipped || false;
  const learnedCount = widget.settings.learnedCount || 0;

  const [isEditing, setIsEditing] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const currentCard = cards[currentIndex] || cards[0];

  const handleFlip = () => {
    playTickSound(0.3);
    onUpdate({
      settings: { ...widget.settings, isFlipped: !isFlipped },
    });
  };

  const handleNext = (delta: number) => {
    const nextIdx = (currentIndex + delta + cards.length) % cards.length;
    onUpdate({
      settings: { ...widget.settings, currentIndex: nextIdx, isFlipped: false },
    });
  };

  const handleMarkLearned = () => {
    playChimeSound(0.5);
    onUpdate({
      settings: { ...widget.settings, learnedCount: learnedCount + 1 },
    });
    handleNext(1);
  };

  const handleApplyPasteTemplate = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split('\n').filter((l) => l.trim());
    const parsed = lines
      .map((line) => {
        const parts = line.split(/[|:-]/);
        if (parts.length >= 2) {
          return { question: parts[0].trim(), answer: parts[1].trim() };
        }
        return null;
      })
      .filter(Boolean) as Array<{ question: string; answer: string }>;

    if (parsed.length > 0) {
      onUpdate({
        settings: {
          ...widget.settings,
          cards: parsed,
          currentIndex: 0,
          isFlipped: false,
          learnedCount: 0,
        },
      });
      setIsEditing(false);
      setPasteText('');
    }
  };

  const loadPreset = (presetName: string) => {
    let list: Array<{ question: string; answer: string }> = [];
    if (presetName === 'math') {
      list = [
        { question: '5 x 9 = ?', answer: '45' },
        { question: '100 - 37 = ?', answer: '63' },
        { question: 'Căn bậc hai của 64?', answer: '8' },
        { question: 'Góc vuông bằng bao nhiêu độ?', answer: '90 độ' },
      ];
    } else {
      list = [
        { question: 'Apple nghĩa là gì?', answer: 'Quả Táo' },
        { question: 'Butterfly nghĩa là gì?', answer: 'Con Bướm' },
        { question: 'Library nghĩa là gì?', answer: 'Thư viện' },
      ];
    }
    onUpdate({
      settings: {
        ...widget.settings,
        cards: list,
        currentIndex: 0,
        isFlipped: false,
        learnedCount: 0,
      },
    });
    setIsEditing(false);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-1.5">
        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#1A73E8]" /> FLASHCARD ({currentIndex + 1}/{cards.length})
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-2 py-0.5 text-[10px] bg-[#E8F0FE] text-[#1A73E8] font-bold rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
          >
            <FileText className="w-3 h-3" /> {isEditing ? 'Đóng' : 'Dán thẻ mới'}
          </button>
          <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200">
            Thuộc: {learnedCount}
          </span>
        </div>
      </div>

      {isEditing ? (
        <div className="my-auto space-y-2 p-2.5 bg-gray-50 dark:bg-slate-800 rounded-2xl border overflow-y-auto max-h-[260px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-gray-700 dark:text-slate-200 uppercase flex items-center gap-1">
              <ListPlus className="w-3.5 h-3.5 text-[#1A73E8]" /> Dán danh sách Câu hỏi | Đáp án
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => loadPreset('math')}
                className="px-2 py-0.5 text-[9px] bg-amber-100 text-amber-800 rounded-md font-bold"
              >
                Mẫu Toán
              </button>
              <button
                onClick={() => loadPreset('english')}
                className="px-2 py-0.5 text-[9px] bg-purple-100 text-purple-700 rounded-md font-bold"
              >
                Mẫu Tiếng Anh
              </button>
            </div>
          </div>

          <p className="text-[10px] text-gray-500">
            Cấu trúc: <code>Câu hỏi | Đáp án</code> (mỗi dòng 1 thẻ)
          </p>

          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Thủ đô Việt Nam | Hà Nội\nCông thức của Nước | H2O\n5 x 9 | 45`}
            className="w-full h-24 p-2 text-xs bg-white dark:bg-slate-900 rounded-xl border font-mono resize-none"
          />

          <button
            onClick={handleApplyPasteTemplate}
            className="w-full py-1.5 bg-[#1A73E8] hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-sm flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" /> Tạo bộ Flashcard
          </button>
        </div>
      ) : (
        <>
          {/* 3D Flip Card Container */}
          <div onClick={handleFlip} className="my-auto w-full h-36 relative cursor-pointer group">
            <div
              className={`w-full h-full rounded-2xl border-2 transition-all duration-500 p-5 flex flex-col items-center justify-center text-center shadow-lg transform ${
                isFlipped
                  ? 'bg-gradient-to-br from-[#1A73E8] via-blue-600 to-indigo-700 text-white border-blue-400 rotate-y-180'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-100 hover:border-[#1A73E8]'
              }`}
            >
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-2 ${
                  isFlipped ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#1A73E8]'
                }`}
              >
                {isFlipped ? 'ĐÁP ÁN' : 'CÂU HỎI'}
              </span>
              <p className="text-sm font-bold leading-relaxed px-2">
                {isFlipped ? currentCard.answer : currentCard.question}
              </p>
              <span className="text-[10px] mt-2 opacity-60 underline flex items-center gap-1">
                <Eye className="w-3 h-3" /> Nhấp để lật mặt thẻ
              </span>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleNext(-1)}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 rounded-xl text-gray-700 dark:text-slate-200 shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-gray-500">
                {currentIndex + 1} / {cards.length}
              </span>
              <button
                onClick={() => handleNext(1)}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 rounded-xl text-gray-700 dark:text-slate-200 shadow-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleMarkLearned}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md active:scale-95 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã thuộc thẻ này
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ==========================================
// 3. TRUE OR FALSE RACE WIDGET (Đúng / Sai)
// ==========================================
export const TrueFalseRaceWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const questions: Array<{ text: string; isTrue: boolean }> = widget.settings.questions || [
    { text: 'Trái Đất là hành tinh thứ 3 tính từ Mặt Trời?', isTrue: true },
    { text: 'Nước đóng băng ở 100 độ C?', isTrue: false },
    { text: 'Hình vuông có 4 cạnh bằng nhau?', isTrue: true },
    { text: 'Nước Việt Nam nằm ở châu Âu?', isTrue: false },
  ];

  const currentIndex = widget.settings.currentIndex || 0;
  const score = widget.settings.score || 0;
  const streak = widget.settings.streak || 0;

  const [isEditing, setIsEditing] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const currentQ = questions[currentIndex] || questions[0];

  const handleAnswer = (userAnswer: boolean) => {
    const isCorrect = userAnswer === currentQ.isTrue;
    if (isCorrect) {
      playChimeSound(0.6);
      setFeedback('correct');
      const newScore = score + 10;
      const newStreak = streak + 1;
      if (newStreak % 3 === 0) {
        playWinnerFanfare(0.6);
        confetti({ particleCount: 40, spread: 50 });
      }
      onUpdate({
        settings: {
          ...widget.settings,
          score: newScore,
          streak: newStreak,
        },
      });
    } else {
      playTickSound(0.5);
      setFeedback('wrong');
      onUpdate({
        settings: { ...widget.settings, streak: 0 },
      });
    }

    setTimeout(() => {
      setFeedback(null);
      const nextIdx = (currentIndex + 1) % questions.length;
      onUpdate({
        settings: { ...widget.settings, currentIndex: nextIdx },
      });
    }, 1100);
  };

  const handleApplyPasteTemplate = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split('\n').filter((l) => l.trim());
    const parsed = lines
      .map((line) => {
        const parts = line.split(/[|:-]/);
        if (parts.length >= 2) {
          const text = parts[0].trim();
          const ansStr = parts[1].trim().toLowerCase();
          const isTrue = ansStr.includes('đúng') || ansStr.includes('true') || ansStr === 't' || ansStr === '1';
          return { text, isTrue };
        }
        return null;
      })
      .filter(Boolean) as Array<{ text: string; isTrue: boolean }>;

    if (parsed.length > 0) {
      onUpdate({
        settings: {
          ...widget.settings,
          questions: parsed,
          currentIndex: 0,
          score: 0,
          streak: 0,
        },
      });
      setIsEditing(false);
      setPasteText('');
    }
  };

  const loadPreset = (presetName: string) => {
    let list: Array<{ text: string; isTrue: boolean }> = [];
    if (presetName === 'science') {
      list = [
        { text: 'Mặt Trời tự phát ra ánh sáng và nhiệt?', isTrue: true },
        { text: 'Con người hít thở khí Cacbonic để sống?', isTrue: false },
        { text: 'Cây xanh chế tạo chất dinh dưỡng nhờ ánh sáng?', isTrue: true },
      ];
    } else {
      list = [
        { text: 'Một tuần có 7 ngày?', isTrue: true },
        { text: 'Tháng 2 luôn luôn có 31 ngày?', isTrue: false },
        { text: 'Tam giác có 3 đỉnh và 3 cạnh?', isTrue: true },
      ];
    }
    onUpdate({
      settings: {
        ...widget.settings,
        questions: list,
        currentIndex: 0,
        score: 0,
        streak: 0,
      },
    });
    setIsEditing(false);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-1.5">
        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-[#1A73E8]" /> THÁCH THỨC ĐÚNG / SAI
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-2 py-0.5 text-[10px] bg-[#E8F0FE] text-[#1A73E8] font-bold rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
          >
            <FileText className="w-3 h-3" /> {isEditing ? 'Đóng' : 'Dán câu hỏi'}
          </button>
          <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
            <Flame className="w-3 h-3 fill-amber-500 text-amber-500 animate-pulse" /> {streak} Chuỗi
          </span>
        </div>
      </div>

      {isEditing ? (
        <div className="my-auto space-y-2 p-2.5 bg-gray-50 dark:bg-slate-800 rounded-2xl border overflow-y-auto max-h-[260px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-gray-700 dark:text-slate-200 uppercase flex items-center gap-1">
              <ListPlus className="w-3.5 h-3.5 text-[#1A73E8]" /> Dán danh sách Câu hỏi | Đáp án
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => loadPreset('science')}
                className="px-2 py-0.5 text-[9px] bg-emerald-100 text-emerald-800 rounded-md font-bold"
              >
                Mẫu Khoa Học
              </button>
            </div>
          </div>

          <p className="text-[10px] text-gray-500">
            Cấu trúc: <code>Nội dung câu hỏi | ĐÚNG (hoặc SAI)</code>
          </p>

          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Trái Đất là hành tinh thứ 3 | ĐÚNG\nNước sôi ở 50 độ C | SAI\nMột tuần có 7 ngày | ĐÚNG`}
            className="w-full h-24 p-2 text-xs bg-white dark:bg-slate-900 rounded-xl border font-mono resize-none"
          />

          <button
            onClick={handleApplyPasteTemplate}
            className="w-full py-1.5 bg-[#1A73E8] hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-sm flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" /> Nạp danh sách câu hỏi
          </button>
        </div>
      ) : (
        <>
          {/* Question Card */}
          <div className="my-auto p-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl border flex flex-col items-center justify-center text-center shadow-inner">
            <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">
              CÂU {currentIndex + 1} / {questions.length} (Điểm: {score})
            </span>
            <p className="text-sm font-extrabold text-gray-800 dark:text-slate-100 leading-snug">
              "{currentQ.text}"
            </p>

            {feedback === 'correct' && (
              <span className="mt-2 text-xs font-black text-emerald-600 flex items-center gap-1 animate-bounce">
                <CheckCircle2 className="w-4 h-4" /> CHÍNH XÁC! (+10 ĐIỂM)
              </span>
            )}
            {feedback === 'wrong' && (
              <span className="mt-2 text-xs font-black text-rose-600 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> CHƯA ĐÚNG RỒI!
              </span>
            )}
          </div>

          {/* Big Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleAnswer(true)}
              disabled={feedback !== null}
              className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md transition transform active:scale-95 flex items-center justify-center gap-2 border-b-4 border-emerald-800"
            >
              <CheckCircle2 className="w-5 h-5" /> ĐÚNG
            </button>
            <button
              onClick={() => handleAnswer(false)}
              disabled={feedback !== null}
              className="py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-2xl shadow-md transition transform active:scale-95 flex items-center justify-center gap-2 border-b-4 border-rose-800"
            >
              <XCircle className="w-5 h-5" /> SAI
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ==========================================
// 4. TIC-TAC-TOE WIDGET (Caro Lớp Học 3x3)
// ==========================================
export const TicTacToeWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const board: Array<string | null> = widget.settings.board || Array(9).fill(null);
  const xIsNext: boolean = widget.settings.xIsNext ?? true;
  const scoreX: number = widget.settings.scoreX || 0;
  const scoreO: number = widget.settings.scoreO || 0;
  const teamXName: string = widget.settings.teamXName || 'Đội X';
  const teamOName: string = widget.settings.teamOName || 'Đội O';

  const [isEditing, setIsEditing] = useState(false);
  const [inputTeamX, setInputTeamX] = useState(teamXName);
  const [inputTeamO, setInputTeamO] = useState(teamOName);

  const calculateWinner = (squares: Array<string | null>) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: [a, b, c] };
      }
    }
    return null;
  };

  const winInfo = calculateWinner(board);
  const winner = winInfo?.winner;
  const isDraw = !winner && board.every((cell) => cell !== null);

  const handleClickCell = (index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = xIsNext ? 'X' : 'O';

    playTickSound(0.4);

    const nextWin = calculateWinner(newBoard);
    if (nextWin) {
      playWinnerFanfare(0.8);
      confetti({ particleCount: 70, spread: 70 });
      if (nextWin.winner === 'X') {
        onUpdate({ settings: { ...widget.settings, board: newBoard, scoreX: scoreX + 1 } });
      } else {
        onUpdate({ settings: { ...widget.settings, board: newBoard, scoreO: scoreO + 1 } });
      }
    } else {
      onUpdate({
        settings: { ...widget.settings, board: newBoard, xIsNext: !xIsNext },
      });
    }
  };

  const handleResetBoard = () => {
    onUpdate({
      settings: { ...widget.settings, board: Array(9).fill(null), xIsNext: true },
    });
  };

  const handleSaveTeams = () => {
    onUpdate({
      settings: {
        ...widget.settings,
        teamXName: inputTeamX.trim() || 'Đội X',
        teamOName: inputTeamO.trim() || 'Đội O',
      },
    });
    setIsEditing(false);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-1.5">
        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Swords className="w-4 h-4 text-[#1A73E8]" /> CARO LỚP HỌC (3X3)
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-2 py-0.5 text-[10px] bg-[#E8F0FE] text-[#1A73E8] font-bold rounded-lg hover:bg-blue-100 transition"
          >
            {isEditing ? 'Đóng' : 'Tên 2 Đội'}
          </button>
          <button
            onClick={handleResetBoard}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Ván mới"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="my-auto space-y-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl border">
          <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block">ĐỔI TÊN 2 ĐỘI THI ĐẤU</span>
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-500 font-bold block">Đội X (Chơi trước)</label>
            <input
              type="text"
              value={inputTeamX}
              onChange={(e) => setInputTeamX(e.target.value)}
              className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 rounded-lg border font-bold text-[#1A73E8]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-500 font-bold block">Đội O</label>
            <input
              type="text"
              value={inputTeamO}
              onChange={(e) => setInputTeamO(e.target.value)}
              className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 rounded-lg border font-bold text-rose-600"
            />
          </div>
          <button
            onClick={handleSaveTeams}
            className="w-full py-1.5 bg-[#1A73E8] text-white text-xs font-bold rounded-xl"
          >
            Lưu tên đội
          </button>
        </div>
      ) : (
        <>
          {/* Scoreboard */}
          <div className="flex items-center justify-around bg-gray-100 dark:bg-slate-800 p-2 rounded-xl text-xs font-bold my-1">
            <span className={`flex items-center gap-1 ${xIsNext && !winner ? 'text-[#1A73E8]' : 'text-gray-600'}`}>
              🟦 {teamXName}: {scoreX}
            </span>
            <span className="text-gray-300">|</span>
            <span className={`flex items-center gap-1 ${!xIsNext && !winner ? 'text-rose-600' : 'text-gray-600'}`}>
              🟥 {teamOName}: {scoreO}
            </span>
          </div>

          {/* Status banner */}
          <div className="text-center text-xs font-black my-1">
            {winner ? (
              <span className="text-emerald-600 animate-bounce flex items-center justify-center gap-1">
                <Trophy className="w-4 h-4 text-amber-500" /> {winner === 'X' ? teamXName : teamOName} CHIẾN THẮNG!
              </span>
            ) : isDraw ? (
              <span className="text-amber-600">🤝 HÒA NHAU!</span>
            ) : (
              <span className="text-gray-500">
                Lượt tiếp theo: <strong className={xIsNext ? 'text-[#1A73E8]' : 'text-rose-600'}>{xIsNext ? teamXName : teamOName}</strong>
              </span>
            )}
          </div>

          {/* 3x3 Grid */}
          <div className="grid grid-cols-3 gap-2 my-auto aspect-square max-w-[210px] mx-auto">
            {board.map((cell, idx) => {
              const isWinningCell = winInfo?.line.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => handleClickCell(idx)}
                  className={`w-full h-full rounded-2xl border-2 font-black text-2xl flex items-center justify-center transition transform active:scale-90 shadow-sm ${
                    isWinningCell
                      ? 'bg-emerald-500 border-emerald-600 text-white shadow-xl animate-bounce'
                      : cell === 'X'
                      ? 'bg-[#E8F0FE] border-[#1A73E8] text-[#1A73E8]'
                      : cell === 'O'
                      ? 'bg-rose-50 border-rose-500 text-rose-600'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-[#1A73E8]'
                  }`}
                >
                  {cell}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
