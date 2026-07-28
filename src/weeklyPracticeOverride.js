import './weeklyPracticeOverride.css';
import {
  createWeeklyPractice,
  getWeeklyPracticeAvailability,
  getWeeklyPracticeDeviceId,
  listPublicWeeklyPractices,
  logWeeklyPracticeEvent,
  readWeeklyPracticeProgress,
  uploadWeeklyPracticeProof,
  WEEKLY_PRACTICE_CLASSES,
  WEEKLY_PRACTICE_MAX_BYTES,
  WEEKLY_PRACTICE_MINIMUM_SECONDS,
  writeWeeklyPracticeProgress,
} from './utils/weeklyPractice.js';
import { supabase } from './utils/supabase.js';

const HOME_ROOT = '#bes-weekly-practice-root .bes-weekly-section';
const RUNNER_ROOT = '.bes-weekly-runner';
const MANAGER_FORM = '.bes-weekly-manager--simple form.bes-weekly-form--simple';
const GRADE_VALUES = ['10', '11', '12'];
const runnerStates = new WeakMap();
let cachedItems = [];
let itemsPromise = null;

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return cleanText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeObject(value, maxLength = 60000) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    const json = JSON.stringify(value);
    if (json.length > maxLength) return { truncated: true };
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  return hours
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function formatDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
}

function inferGrade(item) {
  const explicit = String(item?.grade || '').match(/(?:^|\D)(10|11|12)(?:\D|$)/)?.[1];
  if (explicit) return explicit;
  return String(item?.title || '').match(/(?:tiếng\s*anh|english)\s*(10|11|12)/i)?.[1] || '10';
}

function currentIsoWeek() {
  const date = new Date();
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function loadItems(force = false) {
  if (!force && cachedItems.length) return cachedItems;
  if (!force && itemsPromise) return itemsPromise;
  itemsPromise = listPublicWeeklyPractices()
    .then((items) => {
      cachedItems = [...items].sort((a, b) => {
        const rank = (item) => ({ open: 0, upcoming: 1, closed: 2 }[getWeeklyPracticeAvailability(item).state] ?? 3);
        return rank(a) - rank(b) || Number(b.is_featured) - Number(a.is_featured) || new Date(b.opens_at || 0) - new Date(a.opens_at || 0);
      });
      return cachedItems;
    })
    .finally(() => { itemsPromise = null; });
  return itemsPromise;
}

function findOriginalPracticeButton(section, item) {
  const articles = [...section.querySelectorAll('.bes-weekly-featured, .bes-weekly-list article')];
  const target = articles.find((article) => {
    const title = cleanText(article.querySelector('h3, strong')?.textContent);
    return title === cleanText(item.title);
  });
  return target?.querySelector('button:not([disabled])') || null;
}

function openOriginalPractice(section, item) {
  let button = findOriginalPracticeButton(section, item);
  if (button) {
    button.click();
    return;
  }
  const showAll = [...section.querySelectorAll('button')].find((candidate) => /Xem tất cả bài luyện tập/i.test(candidate.textContent || ''));
  showAll?.click();
  window.setTimeout(() => {
    button = findOriginalPracticeButton(section, item);
    button?.click();
  }, 120);
}

function renderGradeColumns(section, items) {
  let root = section.querySelector(':scope > .bes-weekly-grade-override-root');
  if (!root) {
    root = document.createElement('div');
    root.className = 'bes-weekly-grade-override-root';
    section.querySelector('.bes-weekly-heading')?.insertAdjacentElement('afterend', root);
  }

  root.innerHTML = `<div class="bes-weekly-grade-grid">${GRADE_VALUES.map((grade) => {
    const gradeItems = items.filter((item) => inferGrade(item) === grade);
    const cards = gradeItems.length
      ? gradeItems.map((item, index) => {
        const availability = getWeeklyPracticeAvailability(item);
        const progress = readWeeklyPracticeProgress(item.id) || {};
        const actionLabel = progress.submitted ? 'Xem lại' : progress.identity ? 'Tiếp tục' : 'Mở bài';
        return `<article class="bes-weekly-grade-card${index === 0 ? ' is-latest' : ''}" data-practice-id="${escapeHtml(item.id)}">
          <div class="bes-weekly-grade-card__top"><span class="bes-weekly-status is-${escapeHtml(availability.state)}">${escapeHtml(availability.label)}</span>${index === 0 ? '<span class="bes-weekly-grade-card__new">Mới nhất</span>' : ''}</div>
          <h4>${escapeHtml(item.title)}</h4>
          <div class="bes-weekly-grade-card__meta"><span>File HTML</span><span>${escapeHtml(formatBytes(item.file_size))}</span><span>Khuyến nghị 45 phút</span></div>
          <div class="bes-weekly-grade-card__action"><span>${progress.submitted ? '✓ Đã gửi TTCM' : escapeHtml(availability.label)}</span><button type="button" ${availability.canOpen ? '' : 'disabled'}>${escapeHtml(actionLabel)}</button></div>
        </article>`;
      }).join('')
      : `<div class="bes-weekly-grade-empty"><strong>Chưa có bài</strong><span>Bài tập Tiếng Anh ${grade} đang được chuẩn bị.</span></div>`;
    return `<section class="bes-weekly-grade-column is-grade-${grade}"><header><div><span>KHỐI ${grade}</span><h3>Tiếng Anh ${grade}</h3></div><strong>${gradeItems.length} bài</strong></header><div class="bes-weekly-grade-column__list">${cards}</div></section>`;
  }).join('')}</div>`;

  root.querySelectorAll('[data-practice-id] button').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('[data-practice-id]');
      const item = items.find((candidate) => candidate.id === card?.dataset.practiceId);
      if (item) openOriginalPractice(section, item);
    });
  });
}

async function installHomeOverride(section) {
  if (!section || section.dataset.gradeOverrideReady === '1') return;
  section.dataset.gradeOverrideReady = '1';
  section.classList.add('bes-weekly-override-active');
  const description = section.querySelector('.bes-weekly-heading p');
  if (description) description.textContent = 'Chọn đúng khối, khai báo họ tên và lớp, làm bài rồi xác nhận chắc chắn trước khi gửi cho TTCM.';
  try {
    const items = await loadItems(true);
    renderGradeColumns(section, items);
    const showAll = [...section.querySelectorAll('button')].find((candidate) => /Xem tất cả bài luyện tập/i.test(candidate.textContent || ''));
    showAll?.click();
  } catch (error) {
    let root = section.querySelector(':scope > .bes-weekly-grade-override-root');
    if (!root) {
      root = document.createElement('div');
      root.className = 'bes-weekly-grade-override-root';
      section.querySelector('.bes-weekly-heading')?.insertAdjacentElement('afterend', root);
    }
    root.innerHTML = `<div class="bes-weekly-override-error">${escapeHtml(error?.message || 'Không thể tải danh sách bài.')}</div>`;
  }
}

function managerMessage(form, text, isError = false) {
  const manager = form.closest('.bes-weekly-manager--simple');
  let message = manager?.querySelector('.bes-weekly-manager__message');
  if (!message && manager?.querySelector('header')) {
    message = document.createElement('div');
    message.className = 'bes-weekly-manager__message';
    manager.querySelector('header').insertAdjacentElement('afterend', message);
  }
  if (message) {
    message.textContent = text;
    message.classList.toggle('is-error', isError);
  }
}

async function submitManagedPractice(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const form = event.currentTarget;
  if (form.dataset.overrideSaving === '1') return;

  const title = cleanText(form.querySelector('input:not([type="file"])')?.value);
  const grade = form.querySelector('#bes-weekly-grade-classification')?.value || '10';
  const file = form.querySelector('input[type="file"]')?.files?.[0] || null;
  if (!title) return managerMessage(form, 'Hãy nhập tên bài luyện tập.', true);
  if (!GRADE_VALUES.includes(grade)) return managerMessage(form, 'Hãy chọn đúng phân loại Tiếng Anh 10, 11 hoặc 12.', true);
  if (!file) return managerMessage(form, 'Hãy chọn file HTML.', true);
  if (file.size > WEEKLY_PRACTICE_MAX_BYTES) return managerMessage(form, 'File HTML vượt quá giới hạn 10 MB.', true);

  const button = form.querySelector('button[type="submit"]');
  form.dataset.overrideSaving = '1';
  if (button) {
    button.disabled = true;
    button.textContent = 'Đang tải lên…';
  }
  managerMessage(form, 'Đang tải bài lên hệ thống…');

  try {
    const { data } = await supabase.auth.getUser();
    const now = new Date();
    const year = now.getFullYear();
    await createWeeklyPractice({
      form: {
        title,
        description: '',
        week_key: currentIsoWeek(),
        school_year: `${year}-${year + 1}`,
        grade,
        category: 'HTML tương tác',
        cefr: '',
        question_count: 0,
        duration_minutes: 45,
        opens_at: now.toISOString(),
        closes_at: '',
        status: 'published',
        allow_retake: true,
        collect_results: true,
        show_answers: true,
        is_featured: true,
      },
      file,
      currentUser: data?.user || null,
    });
    managerMessage(form, `Đã công bố bài trong cột Tiếng Anh ${grade}. Đang làm mới trang…`);
    cachedItems = [];
    window.setTimeout(() => window.location.reload(), 700);
  } catch (error) {
    managerMessage(form, error?.message || 'Không thể tải bài lên.', true);
    form.dataset.overrideSaving = '0';
    if (button) {
      button.disabled = false;
      button.textContent = 'Tải lên và công bố';
    }
  }
}

function installManagerOverride(form) {
  if (!form || form.dataset.gradeOverrideReady === '1') return;
  form.dataset.gradeOverrideReady = '1';
  const fileLabel = form.querySelector('.bes-weekly-file');
  const gradeLabel = document.createElement('label');
  gradeLabel.className = 'bes-weekly-grade-field';
  gradeLabel.innerHTML = '<span>Phân loại</span><select id="bes-weekly-grade-classification" required><option value="10">Tiếng Anh 10</option><option value="11">Tiếng Anh 11</option><option value="12">Tiếng Anh 12</option></select>';
  fileLabel?.insertAdjacentElement('beforebegin', gradeLabel);
  const note = form.querySelector('.bes-weekly-simple-note span');
  if (note) note.textContent = 'Bắt buộc họ tên · Chọn lớp trong danh sách · Được nộp sớm sau bước xác nhận chắc chắn · Tạo ảnh xác nhận · Gửi TTCM';
  form.addEventListener('submit', submitManagedPractice, true);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = cleanText(text).split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (!line || ctx.measureText(next).width <= maxWidth) line = next;
    else {
      lines.push(line);
      line = word;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight));
}

async function createProofImage(item, progress, activeSeconds, proofCode, confirmedAt) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không thể tạo ảnh xác nhận.');

  const gradient = ctx.createLinearGradient(0, 0, 1200, 675);
  gradient.addColorStop(0, '#f8fbe8');
  gradient.addColorStop(.58, '#ffffff');
  gradient.addColorStop(1, '#e5edb5');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 675);
  ctx.fillStyle = '#b2c248';
  ctx.fillRect(0, 0, 34, 675);
  ctx.fillRect(34, 0, 1166, 18);
  drawRoundedRect(ctx, 74, 58, 1052, 559, 36);
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(67,83,25,.16)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#718220';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('BRIAN ENGLISH STUDIO', 120, 112);
  ctx.fillStyle = '#203016';
  ctx.font = '900 50px system-ui, sans-serif';
  ctx.fillText('XÁC NHẬN ĐÃ HOÀN THÀNH', 120, 176);
  ctx.fillStyle = '#506044';
  ctx.font = '700 25px system-ui, sans-serif';
  wrapCanvasText(ctx, item.title, 120, 225, 910, 34, 2);

  const rows = [
    ['Học sinh', progress.identity?.student_name || ''],
    ['Lớp', progress.identity?.class_code || ''],
    ['Bắt đầu', formatDate(progress.startedAt)],
    ['Xác nhận', formatDate(confirmedAt)],
    ['Thời lượng hoạt động', formatDuration(activeSeconds)],
    ['Mã minh chứng', proofCode],
  ];
  rows.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = column === 0 ? 120 : 625;
    const y = 316 + row * 90;
    ctx.fillStyle = '#7a856f';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText(label.toUpperCase(), x, y);
    ctx.fillStyle = '#25321e';
    ctx.font = '800 27px system-ui, sans-serif';
    wrapCanvasText(ctx, value, x, y + 34, 430, 31, 2);
  });
  ctx.fillStyle = '#68755c';
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillText('Ảnh được tạo khi học sinh xác nhận chắc chắn đã hoàn thành.', 120, 601);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Không thể xuất ảnh xác nhận.')), 'image/png', .95));
}

function findRunnerItem(runner) {
  const title = cleanText(runner.querySelector('.bes-weekly-runner__bar strong')?.textContent);
  return cachedItems.find((item) => cleanText(item.title) === title) || null;
}

async function submitResultDirect(item, progress, activeSeconds, proofPath, proofCode, proofGeneratedAt) {
  const htmlResult = progress.htmlResult || {};
  const payload = {
    practice_id: item.id,
    device_id: getWeeklyPracticeDeviceId(),
    student_name: cleanText(progress.identity?.student_name).slice(0, 120),
    class_code: cleanText(progress.identity?.class_code).slice(0, 80),
    student_code: cleanText(progress.identity?.student_code).slice(0, 80),
    score: Number.isFinite(Number(htmlResult.score)) ? Number(htmlResult.score) : null,
    max_score: Number.isFinite(Number(htmlResult.maxScore ?? htmlResult.max_score)) ? Number(htmlResult.maxScore ?? htmlResult.max_score) : null,
    correct_count: Number.isFinite(Number(htmlResult.correctCount ?? htmlResult.correct_count)) ? Number.parseInt(htmlResult.correctCount ?? htmlResult.correct_count, 10) : null,
    question_count: Number.isFinite(Number(htmlResult.questionCount ?? htmlResult.question_count)) ? Number.parseInt(htmlResult.questionCount ?? htmlResult.question_count, 10) : null,
    duration_seconds: Math.max(0, Math.floor(activeSeconds)),
    proof_path: proofPath,
    answers: safeObject(htmlResult.answers),
    metadata: safeObject({
      ...(htmlResult.metadata || {}),
      proofCode,
      startedAt: progress.startedAt,
      proofGeneratedAt,
      submittedAt: new Date().toISOString(),
      submittedBefore45Minutes: activeSeconds < WEEKLY_PRACTICE_MINIMUM_SECONDS,
      source: 'weekly-practice-early-submit-override',
    }, 12000),
  };
  const { data, error } = await supabase.from('weekly_practice_results').insert(payload).select('id,created_at').single();
  if (error) throw error;
  return data;
}

function renderRunnerFooter(runner, state) {
  const footer = state.footer;
  const item = state.item || findRunnerItem(runner);
  if (item) state.item = item;
  if (!item) {
    footer.innerHTML = '<div class="bes-weekly-override-footer__copy"><strong>Đang nhận diện bài luyện tập…</strong><span>Vui lòng chờ trong giây lát.</span></div>';
    return;
  }

  const progress = readWeeklyPracticeProgress(item.id) || {};
  const activeSeconds = Math.max(0, Number(progress.activeSeconds || 0));
  const remaining = Math.max(0, WEEKLY_PRACTICE_MINIMUM_SECONDS - activeSeconds);
  const timerNote = runner.querySelector('.bes-weekly-timer span');
  if (timerNote) timerNote.textContent = remaining ? `Khuyến nghị thêm ${formatDuration(remaining)}` : 'Đã làm đủ 45 phút khuyến nghị';

  if (!progress.identity) {
    footer.innerHTML = '<div class="bes-weekly-override-footer__copy"><strong>Nhập thông tin để bắt đầu</strong><span>Họ tên và lớp là bắt buộc.</span></div>';
    return;
  }

  if (progress.submitted) {
    footer.innerHTML = `<div class="bes-weekly-override-footer__copy"><strong>✓ Đã gửi cho TTCM</strong><span>${escapeHtml(progress.identity.student_name)} · Lớp ${escapeHtml(progress.identity.class_code)} · ${escapeHtml(formatDuration(activeSeconds))}</span></div><button type="button" disabled>✓ Đã gửi thành công</button>`;
    return;
  }

  const earlyMessage = remaining
    ? `Em được phép nộp sớm. Thời gian hiện tại: ${formatDuration(activeSeconds)}.`
    : 'Em đã làm đủ 45 phút khuyến nghị.';

  if (!state.proofBlob) {
    footer.innerHTML = `<div class="bes-weekly-override-footer__copy"><strong>Có thể xác nhận hoàn thành</strong><span>${escapeHtml(earlyMessage)} Hệ thống sẽ hỏi lại trước khi gửi.</span></div><button class="bes-weekly-override-primary" type="button">Xác nhận đã hoàn thành</button>`;
    footer.querySelector('button')?.addEventListener('click', async () => {
      const latest = readWeeklyPracticeProgress(item.id) || progress;
      const seconds = Math.max(0, Number(latest.activeSeconds || 0));
      const message = seconds < WEEKLY_PRACTICE_MINIMUM_SECONDS
        ? `Em mới làm ${formatDuration(seconds)}, chưa đủ 45 phút. Em có chắc chắn đã hoàn thành và muốn tạo ảnh xác nhận không?`
        : 'Em có chắc chắn đã hoàn thành và muốn tạo ảnh xác nhận không?';
      if (!window.confirm(message)) return;
      const button = footer.querySelector('button');
      if (button) {
        button.disabled = true;
        button.textContent = 'Đang tạo ảnh…';
      }
      try {
        const confirmedAt = new Date().toISOString();
        const proofCode = `BES-${item.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        state.proofBlob = await createProofImage(item, latest, seconds, proofCode, confirmedAt);
        state.proofCode = proofCode;
        state.proofGeneratedAt = confirmedAt;
        if (state.proofUrl) URL.revokeObjectURL(state.proofUrl);
        state.proofUrl = URL.createObjectURL(state.proofBlob);
        writeWeeklyPracticeProgress(item.id, { proofCode, proofGeneratedAt: confirmedAt, activeSeconds: seconds });
      } catch (error) {
        window.alert(error?.message || 'Không thể tạo ảnh xác nhận.');
      }
      renderRunnerFooter(runner, state);
    });
    return;
  }

  footer.innerHTML = `<div class="bes-weekly-override-footer__copy"><strong>Ảnh xác nhận đã sẵn sàng</strong><span>Kiểm tra ảnh, sau đó xác nhận chắc chắn trước khi gửi cho TTCM.</span></div><button class="bes-weekly-override-proof" type="button"><img src="${state.proofUrl}" alt="Ảnh xác nhận"><span>Xem ảnh</span></button><div class="bes-weekly-override-actions"><button class="is-secondary" type="button">Tạo lại ảnh</button><button class="bes-weekly-override-primary" type="button">Gửi cho TTCM</button></div>`;
  footer.querySelector('.bes-weekly-override-proof')?.addEventListener('click', () => window.open(state.proofUrl, '_blank', 'noopener,noreferrer'));
  footer.querySelector('.is-secondary')?.addEventListener('click', () => {
    if (state.proofUrl) URL.revokeObjectURL(state.proofUrl);
    state.proofBlob = null;
    state.proofUrl = '';
    state.proofCode = '';
    state.proofGeneratedAt = '';
    renderRunnerFooter(runner, state);
  });
  footer.querySelector('.bes-weekly-override-actions .bes-weekly-override-primary')?.addEventListener('click', async () => {
    if (state.sending) return;
    const latest = readWeeklyPracticeProgress(item.id) || progress;
    const seconds = Math.max(0, Number(latest.activeSeconds || 0));
    const message = seconds < WEEKLY_PRACTICE_MINIMUM_SECONDS
      ? `Em mới làm ${formatDuration(seconds)}, chưa đủ 45 phút. Em có chắc chắn đã hoàn thành và vẫn muốn gửi bài cho TTCM không?`
      : 'Em xác nhận chắc chắn đã hoàn thành và muốn gửi bài cho TTCM?';
    if (!window.confirm(message)) return;
    state.sending = true;
    const sendButton = footer.querySelector('.bes-weekly-override-actions .bes-weekly-override-primary');
    if (sendButton) {
      sendButton.disabled = true;
      sendButton.textContent = 'Đang gửi…';
    }
    try {
      const uploadedPath = state.proofPath || await uploadWeeklyPracticeProof(item.id, state.proofBlob);
      state.proofPath = uploadedPath;
      const result = await submitResultDirect(item, latest, seconds, uploadedPath, state.proofCode, state.proofGeneratedAt);
      writeWeeklyPracticeProgress(item.id, {
        activeSeconds: seconds,
        completed: true,
        submitted: true,
        submittedAt: result?.created_at || new Date().toISOString(),
        resultId: result?.id || null,
        proofPath: uploadedPath,
      });
      await logWeeklyPracticeEvent(item.id, 'complete', {
        source: 'student-submission-confirmed',
        class_code: latest.identity?.class_code,
        duration_seconds: seconds,
        submitted_before_45_minutes: seconds < WEEKLY_PRACTICE_MINIMUM_SECONDS,
      });
    } catch (error) {
      window.alert(error?.message || 'Chưa gửi được cho TTCM. Hãy thử lại.');
    } finally {
      state.sending = false;
      renderRunnerFooter(runner, state);
    }
  });
}

async function installRunnerOverride(runner) {
  if (!runner || runnerStates.has(runner)) return;
  await loadItems().catch(() => []);
  runner.classList.add('bes-weekly-runner--early-submit');
  const footer = document.createElement('footer');
  footer.className = 'bes-weekly-override-footer';
  runner.appendChild(footer);
  const state = { footer, item: null, proofBlob: null, proofUrl: '', proofCode: '', proofGeneratedAt: '', proofPath: '', sending: false, interval: 0 };
  runnerStates.set(runner, state);
  renderRunnerFooter(runner, state);
  state.interval = window.setInterval(() => {
    if (!document.body.contains(runner)) {
      window.clearInterval(state.interval);
      if (state.proofUrl) URL.revokeObjectURL(state.proofUrl);
      return;
    }
    renderRunnerFooter(runner, state);
  }, 1000);
}

function scan() {
  document.querySelectorAll(HOME_ROOT).forEach((section) => installHomeOverride(section));
  document.querySelectorAll(MANAGER_FORM).forEach((form) => installManagerOverride(form));
  document.querySelectorAll(RUNNER_ROOT).forEach((runner) => installRunnerOverride(runner));
}

const observer = new MutationObserver(() => scan());
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', scan, { once: true });
scan();
