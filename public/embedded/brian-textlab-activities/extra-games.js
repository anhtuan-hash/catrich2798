/* Brian TextLab Extra Games Pack: eight English-learning templates */
(() => {
  "use strict";

  const EXTRA_TEMPLATES = [
    {
      id: "grammarauction",
      icon: "💰",
      name: "Grammar Auction",
      tag: "Grammar Bet",
      desc: "Đấu giá câu đúng/sai bằng mức cược để luyện ngữ pháp có chiến thuật.",
      hint: "Mỗi dòng: Câu | correct/incorrect | Giải thích",
      sample: "Neither of the proposals has been approved yet. | correct | Neither is singular, so it takes has.\nThe information were updated yesterday. | incorrect | Information is uncountable and takes was.\nHardly had the meeting begun when the fire alarm rang. | correct | Hardly requires inversion and is followed by when.\nShe suggested to postpone the launch. | incorrect | Suggest is followed by a gerund or a that-clause.\nNot only did the policy reduce waste, but it also saved money. | correct | The negative fronted phrase triggers inversion.\nIf I would have known, I would have called you. | incorrect | The third conditional uses had known in the if-clause."
    },
    {
      id: "errordetective",
      icon: "🕵️",
      name: "Error Detective",
      tag: "Editing",
      desc: "Phát hiện và viết lại câu sai, sau đó xem giải thích lỗi.",
      hint: "Mỗi dòng: Câu sai | Câu đúng | Giải thích",
      sample: "The committee have reached its decision. | The committee has reached its decision. | Committee is treated as a singular unit here.\nShe is used to work under pressure. | She is used to working under pressure. | Be used to is followed by a noun or gerund.\nNo sooner I had arrived than the lesson began. | No sooner had I arrived than the lesson began. | No sooner requires subject-auxiliary inversion.\nThe report, that was published yesterday, contains new data. | The report, which was published yesterday, contains new data. | That is not used in a non-defining relative clause.\nDespite he was tired, he completed the task. | Despite being tired, he completed the task. | Despite is followed by a noun phrase or gerund.\nEach of the students have submitted their reflection. | Each of the students has submitted their reflection. | Each takes a singular verb."
    },
    {
      id: "wordforge",
      icon: "⚒️",
      name: "Word Formation Forge",
      tag: "Word Form",
      desc: "Biến đổi từ gốc để hoàn thành câu trong ngữ cảnh học thuật.",
      hint: "Mỗi dòng: Từ gốc | Câu có _____ | Đáp án | Gợi ý",
      sample: "rely | The findings are not sufficiently _____ to support the claim. | reliable | adjective\ninnovate | The company rewards employees for their _____. | innovation | abstract noun\naccess | The archive should be freely _____ to researchers. | accessible | adjective\njustify | The sudden price increase is difficult to _____. | justify | verb\nresist | The material has impressive heat _____. | resistance | noun\ninterpret | The results were widely _____ by the media. | misinterpreted | negative past participle"
    },
    {
      id: "collocationclash",
      icon: "⚔️",
      name: "Collocation Clash",
      tag: "Collocation",
      desc: "Chọn từ kết hợp tự nhiên nhất dưới áp lực thời gian.",
      hint: "Mỗi dòng: Cụm còn thiếu | Đáp án đúng | Sai 1 | Sai 2 | Sai 3",
      sample: "_____ a conclusion | draw | pull | create | carry\n_____ responsibility | take | make | hold | perform\n_____ attention to detail | pay | spend | give | offer\n_____ an issue | address | speak | answer | touch\n_____ evidence | compelling | forceful | heavy | powerful\n_____ a deadline | meet | reach | catch | arrive"
    },
    {
      id: "dictationdash",
      icon: "🎙️",
      name: "Dictation Dash",
      tag: "Listening",
      desc: "Nghe câu bằng giọng đọc của trình duyệt rồi gõ lại chính xác.",
      hint: "Mỗi dòng: Câu đọc | Gợi ý tùy chọn",
      sample: "Renewable energy can reduce dependence on fossil fuels. | environment\nThe committee has postponed the final decision until Friday. | meeting\nStudents should evaluate online sources critically. | digital literacy\nHad the warning been issued earlier, the damage might have been reduced. | conditional\nPublic trust depends on transparency and accountability. | governance\nThe research findings were more significant than expected. | academic English"
    },
    {
      id: "tensetimeline",
      icon: "🕰️",
      name: "Tense Timeline",
      tag: "Tenses",
      desc: "Đọc câu và đặt vào đúng mốc thời gian hoặc nhóm thì.",
      hint: "Mỗi dòng: Nhóm thì/mốc thời gian | Câu",
      sample: "Past Simple | The team submitted the proposal last Monday.\nPast Perfect | The guests had left before the storm began.\nPresent Perfect | Scientists have identified several new species.\nPresent Continuous | The council is reviewing the transport plan.\nFuture Continuous | This time tomorrow, we will be presenting our findings.\nFuture Perfect | By 2030, the city will have cut emissions by forty percent."
    },
    {
      id: "oddoneout",
      icon: "🧿",
      name: "Odd One Out",
      tag: "Vocabulary",
      desc: "Chọn mục không cùng nhóm và đọc lời giải thích sau mỗi lượt.",
      hint: "Mỗi dòng: Mục 1 | Mục 2 | Mục 3 | Mục khác nhóm | Giải thích",
      sample: "solar | wind | hydro | coal | Coal is non-renewable.\nmeticulous | thorough | precise | careless | Careless has the opposite meaning.\nalthough | whereas | while | therefore | Therefore expresses result, not contrast.\nanalysis | evidence | methodology | delicious | Delicious is unrelated to research.\nrecycle | reuse | repair | discard | Discard does not extend an item's life.\nfeasible | practical | achievable | impossible | Impossible contradicts the other adjectives."
    },
    {
      id: "keywordtransform",
      icon: "🔁",
      name: "Keyword Transformation",
      tag: "Exam Practice",
      desc: "Viết lại câu bằng từ khóa bắt buộc mà không đổi nghĩa.",
      hint: "Mỗi dòng: Câu gốc | Từ khóa | Đáp án | Đáp án thay thế 1 | Đáp án thay thế 2",
      sample: "I last visited Hue three years ago. | FOR | I have not visited Hue for three years.\nThe project was so expensive that the school cancelled it. | SUCH | It was such an expensive project that the school cancelled it.\nPeople believe that the painting is authentic. | BELIEVED | The painting is believed to be authentic.\nShe started teaching here in 2021. | SINCE | She has taught here since 2021. | She has been teaching here since 2021.\nThe weather prevented us from holding the event outdoors. | BECAUSE | We could not hold the event outdoors because of the weather.\nHe regretted not checking the figures carefully. | WISHED | He wished he had checked the figures carefully."
    }
  ];

  const EXTRA_IDS = new Set(EXTRA_TEMPLATES.map((template) => template.id));
  EXTRA_TEMPLATES.forEach((template) => {
    if (!TEMPLATES.some((existing) => existing.id === template.id)) TEMPLATES.push(template);
  });

  const normalizeLoose = (value) => {
    if (typeof expandedAnswerKey === "function") return expandedAnswerKey(value);
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const accepts = (value, answers) => {
    const list = answers.filter(Boolean);
    if (typeof expandedAnswerAccepted === "function") return expandedAnswerAccepted(value, list);
    return list.some((answer) => normalizeLoose(value) === normalizeLoose(answer));
  };

  const parseBeforeExtraGames = parseData;
  parseData = function parseExtraGames(id, raw) {
    if (!EXTRA_IDS.has(id)) return parseBeforeExtraGames(id, raw);
    const lines = splitLines(raw);

    if (id === "grammarauction") {
      return lines.map((line) => {
        const p = parts(line);
        return {
          statement: p[0] || "",
          correct: /^(correct|true|right|đúng|dung|1)$/i.test(p[1] || ""),
          explanation: p[2] || ""
        };
      }).filter((item) => item.statement);
    }

    if (id === "errordetective") {
      return lines.map((line) => {
        const p = parts(line);
        return { wrong: p[0] || "", correct: p[1] || "", explanation: p[2] || "" };
      }).filter((item) => item.wrong && item.correct);
    }

    if (id === "wordforge") {
      return lines.map((line) => {
        const p = parts(line);
        return { base: p[0] || "", sentence: p[1] || "", answer: p[2] || "", hint: p[3] || "" };
      }).filter((item) => item.sentence && item.answer);
    }

    if (id === "collocationclash") {
      return lines.map((line) => {
        const p = parts(line);
        const correct = p[1] || "";
        return { prompt: p[0] || "", correct, choices: shuffle([correct, ...p.slice(2).filter(Boolean)]) };
      }).filter((item) => item.prompt && item.correct);
    }

    if (id === "dictationdash") {
      return lines.map((line) => {
        const p = parts(line);
        return { sentence: p[0] || "", hint: p[1] || "" };
      }).filter((item) => item.sentence);
    }

    if (id === "tensetimeline") {
      return lines.map((line, index) => {
        const p = parts(line);
        return { id: index, group: p[0] || "Other", sentence: p[1] || "" };
      }).filter((item) => item.sentence);
    }

    if (id === "oddoneout") {
      return lines.map((line) => {
        const p = parts(line);
        const odd = p[3] || "";
        return { items: shuffle([p[0], p[1], p[2], odd].filter(Boolean)), odd, explanation: p[4] || "" };
      }).filter((item) => item.items.length >= 3 && item.odd);
    }

    if (id === "keywordtransform") {
      return lines.map((line) => {
        const p = parts(line);
        return { source: p[0] || "", keyword: p[1] || "", answers: p.slice(2).filter(Boolean) };
      }).filter((item) => item.source && item.keyword && item.answers.length);
    }

    return [];
  };

  const extraFrame = (title, subtitle, total, options = {}) => gameFrame(
    title,
    subtitle,
    total,
    '<div class="btl-extra-host" data-extra-host></div>',
    options
  );

  Object.assign(ACTIVITY_RENDERERS, {
    grammarauction(data, opt) {
      return extraFrame(opt.title || "Grammar Auction", "Chọn mức cược rồi quyết định câu đúng hay sai.", data.length, { scoreLabel: "Điểm", progressLabel: "Câu" });
    },
    errordetective(data, opt) {
      return extraFrame(opt.title || "Error Detective", "Viết lại câu đúng để sửa lỗi ngữ pháp.", data.length, { progressLabel: "Vụ án" });
    },
    wordforge(data, opt) {
      return extraFrame(opt.title || "Word Formation Forge", "Tạo đúng dạng từ phù hợp với ngữ cảnh.", data.length, { progressLabel: "Từ" });
    },
    collocationclash(data, opt) {
      return extraFrame(opt.title || "Collocation Clash", "Chọn collocation tự nhiên nhất trước khi hết giờ.", data.length, { progressLabel: "Cụm" });
    },
    dictationdash(data, opt) {
      return extraFrame(opt.title || "Dictation Dash", "Nghe câu rồi gõ lại; có thể phát lại nhiều lần.", data.length, { progressLabel: "Câu" });
    },
    tensetimeline(data, opt) {
      return extraFrame(opt.title || "Tense Timeline", "Đặt mỗi câu vào đúng nhóm thì hoặc mốc thời gian.", data.length, { progressLabel: "Câu" });
    },
    oddoneout(data, opt) {
      return extraFrame(opt.title || "Odd One Out", "Chọn mục không cùng nhóm với các mục còn lại.", data.length, { progressLabel: "Bộ" });
    },
    keywordtransform(data, opt) {
      return extraFrame(opt.title || "Keyword Transformation", "Viết lại câu bằng từ khóa bắt buộc mà không đổi nghĩa.", data.length, { progressLabel: "Câu" });
    }
  });

  const bindBeforeExtraGames = bindInteractiveActivity;

  function bindExtraGames(container, id, data, options = {}) {
    if (!EXTRA_IDS.has(id)) return bindBeforeExtraGames(container, id, data, options);

    const state = createGameRuntime(container, id, data, {
      title: options.title || selectedTemplate?.name || "Activity",
      total: data.length
    });
    const host = container.querySelector("[data-extra-host]");

    if (!data.length) {
      announceGame(state, "Chưa có đủ dữ liệu để chơi.", "error");
      return;
    }

    const finishStandard = (title) => finishGame(state, { title, score: state.score, total: data.length });

    if (id === "grammarauction") {
      let index = 0;
      const draw = () => {
        if (index >= data.length) {
          finishGame(state, { title: "Phiên đấu giá hoàn tất!", score: state.score, total: data.length * 3, detail: `Chuỗi đúng tốt nhất: ${state.bestStreak}` });
          return;
        }
        const item = data[index];
        host.innerHTML = `<div class="q-card btl-round btl-auction-card">
          <div class="btl-round-number">Câu ${index + 1}/${data.length}</div>
          <h3>${escapeHtml(item.statement)}</h3>
          <div class="btl-stake-row" role="group" aria-label="Mức cược">
            <button class="word-chip selected" type="button" data-stake="1">1 điểm</button>
            <button class="word-chip" type="button" data-stake="2">2 điểm</button>
            <button class="word-chip" type="button" data-stake="3">3 điểm</button>
          </div>
          <div class="q-options">
            <button class="option-btn" type="button" data-auction-answer="true">Câu đúng</button>
            <button class="option-btn" type="button" data-auction-answer="false">Câu sai</button>
          </div>
          <div class="feedback" data-extra-feedback></div>
        </div>`;
        let stake = 1;
        host.querySelectorAll("[data-stake]").forEach((button) => button.addEventListener("click", () => {
          stake = Number(button.dataset.stake) || 1;
          host.querySelectorAll("[data-stake]").forEach((itemButton) => itemButton.classList.toggle("selected", itemButton === button));
        }));
        host.querySelectorAll("[data-auction-answer]").forEach((button) => button.addEventListener("click", () => {
          const choice = button.dataset.auctionAnswer === "true";
          const correct = choice === item.correct;
          host.querySelectorAll("button").forEach((control) => control.disabled = true);
          state.progress++;
          if (correct) {
            state.score += stake;
            state.streak++;
            state.bestStreak = Math.max(state.bestStreak, state.streak);
            button.classList.add("correct");
          } else {
            state.mistakes++;
            state.streak = 0;
            button.classList.add("wrong");
            host.querySelector(`[data-auction-answer="${item.correct}"]`)?.classList.add("correct");
          }
          syncGameRuntime(state);
          host.querySelector("[data-extra-feedback]").textContent = item.explanation || (item.correct ? "Câu này đúng." : "Câu này sai.");
          announceGame(state, correct ? `Chính xác! +${stake} điểm` : "Mất lượt cược.", correct ? "success" : "error");
          index++;
          setTimeout(draw, 1100);
        }));
      };
      draw();
      return;
    }

    if (id === "errordetective") {
      let index = 0;
      const draw = () => {
        if (index >= data.length) return finishStandard("Đã phá xong tất cả lỗi!");
        const item = data[index];
        host.innerHTML = `<div class="q-card btl-round btl-detective-card">
          <div class="btl-round-number">Vụ án ${index + 1}/${data.length}</div>
          <div class="btl-error-sentence">${escapeHtml(item.wrong)}</div>
          <textarea class="btl-extra-textarea" data-extra-input placeholder="Viết lại câu đúng..."></textarea>
          <div class="toolbar"><button class="btn primary" type="button" data-extra-check>Kiểm tra</button></div>
          <div class="feedback" data-extra-feedback></div>
        </div>`;
        const inputEl = host.querySelector("[data-extra-input]");
        const check = () => {
          if (!inputEl.value.trim()) return;
          const correct = accepts(inputEl.value, [item.correct]);
          inputEl.disabled = true;
          host.querySelector("[data-extra-check]").disabled = true;
          recordGame(state, correct);
          inputEl.classList.add(correct ? "correct" : "wrong");
          host.querySelector("[data-extra-feedback]").textContent = correct ? (item.explanation || "Sửa chính xác.") : `Đáp án: ${item.correct}${item.explanation ? ` — ${item.explanation}` : ""}`;
          index++;
          setTimeout(draw, 1250);
        };
        host.querySelector("[data-extra-check]").addEventListener("click", check);
        inputEl.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); check(); } });
        inputEl.focus();
      };
      draw();
      return;
    }

    if (id === "wordforge") {
      let index = 0;
      const draw = () => {
        if (index >= data.length) return finishStandard("Word Formation Forge hoàn tất!");
        const item = data[index];
        host.innerHTML = `<div class="q-card btl-round btl-forge-card">
          <div class="btl-round-number">Từ ${index + 1}/${data.length}</div>
          <div class="btl-base-word">Từ gốc: <strong>${escapeHtml(item.base)}</strong></div>
          <h3>${escapeHtml(item.sentence)}</h3>
          ${item.hint ? `<p class="btl-extra-hint">Gợi ý: ${escapeHtml(item.hint)}</p>` : ""}
          <div class="btl-typed-answer"><input class="blank-input" data-extra-input autocomplete="off" placeholder="Nhập dạng từ"><button class="btn primary" type="button" data-extra-check>Rèn từ</button></div>
          <div class="feedback" data-extra-feedback></div>
        </div>`;
        const inputEl = host.querySelector("[data-extra-input]");
        const check = () => {
          if (!inputEl.value.trim()) return;
          const correct = sameGameAnswer(inputEl.value, item.answer);
          inputEl.disabled = true;
          host.querySelector("[data-extra-check]").disabled = true;
          recordGame(state, correct);
          inputEl.classList.add(correct ? "correct" : "wrong");
          host.querySelector("[data-extra-feedback]").textContent = correct ? "Dạng từ chính xác!" : `Đáp án: ${item.answer}`;
          index++;
          setTimeout(draw, 950);
        };
        host.querySelector("[data-extra-check]").addEventListener("click", check);
        inputEl.addEventListener("keydown", (event) => { if (event.key === "Enter") check(); });
        inputEl.focus();
      };
      draw();
      return;
    }

    if (id === "collocationclash") {
      let index = 0;
      let seconds = 10;
      const draw = () => {
        clearInterval(container.__btlRoundTimer);
        if (index >= data.length) return finishStandard("Collocation Clash hoàn tất!");
        const item = data[index];
        seconds = 10;
        host.innerHTML = `<div class="q-card btl-round btl-collocation-card">
          <div class="btl-round-number">Cụm ${index + 1}/${data.length}</div>
          <div class="btl-extra-clock"><b data-extra-seconds>${seconds}</b>s</div>
          <h3>${escapeHtml(item.prompt)}</h3>
          <div class="q-options">${item.choices.map((choice) => `<button class="option-btn" type="button" data-extra-choice="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`).join("")}</div>
        </div>`;
        let resolved = false;
        const resolve = (choice, button, expired = false) => {
          if (resolved) return;
          resolved = true;
          clearInterval(container.__btlRoundTimer);
          const correct = !expired && sameGameAnswer(choice, item.correct);
          host.querySelectorAll("[data-extra-choice]").forEach((choiceButton) => {
            choiceButton.disabled = true;
            if (sameGameAnswer(choiceButton.dataset.extraChoice, item.correct)) choiceButton.classList.add("correct");
          });
          if (button && !correct) button.classList.add("wrong");
          recordGame(state, correct);
          announceGame(state, correct ? "Collocation chính xác!" : `Đáp án: ${item.correct}`, correct ? "success" : "error");
          index++;
          setTimeout(draw, 800);
        };
        host.querySelectorAll("[data-extra-choice]").forEach((button) => button.addEventListener("click", () => resolve(button.dataset.extraChoice, button)));
        const secondsEl = host.querySelector("[data-extra-seconds]");
        container.__btlRoundTimer = setInterval(() => {
          seconds--;
          secondsEl.textContent = String(Math.max(0, seconds));
          if (seconds <= 0) resolve("", null, true);
        }, 1000);
      };
      draw();
      return;
    }

    if (id === "dictationdash") {
      let index = 0;
      const speak = (sentence) => {
        if (!("speechSynthesis" in window)) {
          announceGame(state, "Trình duyệt này không hỗ trợ giọng đọc.", "error");
          return;
        }
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.lang = "en-US";
        utterance.rate = 0.82;
        speechSynthesis.speak(utterance);
      };
      const draw = () => {
        if (index >= data.length) return finishStandard("Dictation Dash hoàn tất!");
        const item = data[index];
        host.innerHTML = `<div class="q-card btl-round btl-dictation-card">
          <div class="btl-round-number">Câu ${index + 1}/${data.length}</div>
          <button class="btl-listen-button" type="button" data-extra-listen>🔊 Phát câu</button>
          ${item.hint ? `<p class="btl-extra-hint">Chủ đề: ${escapeHtml(item.hint)}</p>` : ""}
          <textarea class="btl-extra-textarea" data-extra-input placeholder="Gõ lại câu vừa nghe..."></textarea>
          <div class="toolbar"><button class="btn ghost" type="button" data-extra-replay>Nghe lại</button><button class="btn primary" type="button" data-extra-check>Kiểm tra</button></div>
          <div class="feedback" data-extra-feedback></div>
        </div>`;
        const inputEl = host.querySelector("[data-extra-input]");
        host.querySelector("[data-extra-listen]").addEventListener("click", () => speak(item.sentence));
        host.querySelector("[data-extra-replay]").addEventListener("click", () => speak(item.sentence));
        const check = () => {
          if (!inputEl.value.trim()) return;
          const correct = normalizeLoose(inputEl.value) === normalizeLoose(item.sentence);
          inputEl.disabled = true;
          host.querySelectorAll("button").forEach((button) => button.disabled = true);
          recordGame(state, correct);
          inputEl.classList.add(correct ? "correct" : "wrong");
          host.querySelector("[data-extra-feedback]").textContent = correct ? "Nghe và viết chính xác!" : `Câu đúng: ${item.sentence}`;
          index++;
          setTimeout(draw, 1200);
        };
        host.querySelector("[data-extra-check]").addEventListener("click", check);
        inputEl.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); check(); } });
      };
      draw();
      return;
    }

    if (id === "tensetimeline") {
      const deck = shuffle(data);
      const groups = [...new Set(data.map((item) => item.group))];
      let index = 0;
      const draw = () => {
        if (index >= deck.length) return finishStandard("Đã hoàn thành Tense Timeline!");
        const item = deck[index];
        host.innerHTML = `<div class="q-card btl-round btl-timeline-card">
          <div class="btl-round-number">Câu ${index + 1}/${deck.length}</div>
          <h3>${escapeHtml(item.sentence)}</h3>
          <div class="btl-timeline-track">${groups.map((group) => `<button class="btl-time-stop" type="button" data-extra-group="${escapeHtml(group)}"><span></span><strong>${escapeHtml(group)}</strong></button>`).join("")}</div>
        </div>`;
        host.querySelectorAll("[data-extra-group]").forEach((button) => button.addEventListener("click", () => {
          const correct = sameGameAnswer(button.dataset.extraGroup, item.group);
          if (!correct) {
            state.mistakes++;
            syncGameRuntime(state);
            flashGame(button, false);
            announceGame(state, "Chưa đúng, hãy thử mốc khác.", "error");
            return;
          }
          button.classList.add("correct");
          host.querySelectorAll("button").forEach((control) => control.disabled = true);
          recordGame(state, true);
          announceGame(state, `Đúng nhóm: ${item.group}`, "success");
          index++;
          setTimeout(draw, 650);
        }));
      };
      draw();
      return;
    }

    if (id === "oddoneout") {
      let index = 0;
      const draw = () => {
        if (index >= data.length) return finishStandard("Odd One Out hoàn tất!");
        const item = data[index];
        host.innerHTML = `<div class="q-card btl-round btl-odd-card">
          <div class="btl-round-number">Bộ ${index + 1}/${data.length}</div>
          <p>Chọn mục không cùng nhóm:</p>
          <div class="btl-odd-grid">${item.items.map((choice) => `<button class="btl-odd-choice" type="button" data-extra-choice="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`).join("")}</div>
          <div class="feedback" data-extra-feedback></div>
        </div>`;
        host.querySelectorAll("[data-extra-choice]").forEach((button) => button.addEventListener("click", () => {
          const correct = sameGameAnswer(button.dataset.extraChoice, item.odd);
          host.querySelectorAll("button").forEach((control) => control.disabled = true);
          host.querySelectorAll("[data-extra-choice]").forEach((choiceButton) => {
            if (sameGameAnswer(choiceButton.dataset.extraChoice, item.odd)) choiceButton.classList.add("correct");
          });
          if (!correct) button.classList.add("wrong");
          recordGame(state, correct);
          host.querySelector("[data-extra-feedback]").textContent = item.explanation || `Mục khác nhóm: ${item.odd}`;
          index++;
          setTimeout(draw, 1100);
        }));
      };
      draw();
      return;
    }

    if (id === "keywordtransform") {
      let index = 0;
      const draw = () => {
        if (index >= data.length) return finishStandard("Keyword Transformation hoàn tất!");
        const item = data[index];
        host.innerHTML = `<div class="q-card btl-round btl-transform-card">
          <div class="btl-round-number">Câu ${index + 1}/${data.length}</div>
          <p class="btl-source-sentence">${escapeHtml(item.source)}</p>
          <div class="btl-keyword-badge">Từ khóa: <strong>${escapeHtml(item.keyword)}</strong></div>
          <textarea class="btl-extra-textarea" data-extra-input placeholder="Viết câu mới..."></textarea>
          <div class="toolbar"><button class="btn primary" type="button" data-extra-check>Kiểm tra</button></div>
          <div class="feedback" data-extra-feedback></div>
        </div>`;
        const inputEl = host.querySelector("[data-extra-input]");
        const check = () => {
          if (!inputEl.value.trim()) return;
          const usedKeyword = normalizeLoose(inputEl.value).includes(normalizeLoose(item.keyword));
          const correct = usedKeyword && accepts(inputEl.value, item.answers);
          inputEl.disabled = true;
          host.querySelector("[data-extra-check]").disabled = true;
          recordGame(state, correct);
          inputEl.classList.add(correct ? "correct" : "wrong");
          host.querySelector("[data-extra-feedback]").textContent = correct ? "Viết lại chính xác!" : `Đáp án mẫu: ${item.answers.join(" / ")}`;
          index++;
          setTimeout(draw, 1300);
        };
        host.querySelector("[data-extra-check]").addEventListener("click", check);
        inputEl.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); check(); } });
        inputEl.focus();
      };
      draw();
    }
  }

  bindInteractiveActivity = bindExtraGames;
  bindActivity = bindExtraGames;

  const extraStyle = document.createElement("style");
  extraStyle.id = "btl-extra-games-style";
  extraStyle.textContent = `
    .btl-extra-host{min-height:360px}.btl-extra-host h3{font-size:clamp(1.15rem,2vw,1.55rem);line-height:1.45}
    .btl-extra-textarea{width:100%;min-height:96px;box-sizing:border-box;border:2px solid #dbeafe;border-radius:16px;padding:14px;font:inherit;resize:vertical;background:#fff}
    .btl-error-sentence,.btl-source-sentence{padding:18px;border-radius:18px;background:#fff4f5;border:1px solid #f4c9cf;font-weight:800;line-height:1.5}
    .btl-base-word,.btl-keyword-badge,.btl-extra-hint{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;background:#eef7f3;color:#0e624d;font-weight:800}
    .btl-stake-row,.btl-odd-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0}.btl-odd-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    .btl-odd-choice,.btl-time-stop,.btl-listen-button{border:2px solid #dbeafe;background:#fff;border-radius:18px;padding:18px;font:inherit;font-weight:850;cursor:pointer}
    .btl-listen-button{display:block;margin:18px auto;font-size:1.15rem;background:#eef6ff;color:#145a9c}
    .btl-extra-clock{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;margin-left:auto;background:#fff0d9;color:#8a4f00;font-weight:900}
    .btl-timeline-track{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px;margin-top:24px;position:relative}.btl-time-stop{display:grid;gap:8px;place-items:center}.btl-time-stop span{width:18px;height:18px;border-radius:50%;background:#68c6a8;box-shadow:0 0 0 6px #e2f5ef}
    .btl-detective-card,.btl-forge-card,.btl-dictation-card,.btl-transform-card{display:grid;gap:14px}
    @media(max-width:640px){.btl-stake-row,.btl-odd-grid{grid-template-columns:1fr}.btl-timeline-track{grid-template-columns:1fr}}
  `;
  document.head.appendChild(extraStyle);

  const initBeforeExtraGames = init;
  init = function initWithExtraGames() {
    initBeforeExtraGames();
    const count = document.querySelector(".preview-rail-title span");
    if (count) count.textContent = `${TEMPLATES.length} hoạt động`;
  };
})();
