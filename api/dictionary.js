const CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_QUERY_BYTES = 480;
const DICTIONARY_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const TRANSLATION_BASE = 'https://api.mymemory.translated.net/get';

function normalizeQuery(value = '') {
  return String(Array.isArray(value) ? value[0] : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function hasVietnameseMarks(value = '') {
  return /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(value);
}

function decodeEntities(value = '') {
  return String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

async function fetchJson(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'accept-language': 'vi-VN,vi;q=0.9,en;q=0.8',
        'user-agent': 'BrianEnglishQuickDictionary/1.0 (+https://esl-pek.vercel.app)',
      },
    });
    const payload = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, payload };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeAudio(value = '') {
  const source = String(value || '').trim();
  if (!source) return '';
  return source.startsWith('//') ? `https:${source}` : source;
}

function compactDictionary(entries) {
  if (!Array.isArray(entries) || !entries.length) return null;
  const first = entries[0] || {};
  const phonetics = entries.flatMap((entry) => Array.isArray(entry?.phonetics) ? entry.phonetics : []);
  const phonetic = String(first.phonetic || phonetics.find((item) => item?.text)?.text || '').trim();
  const audio = normalizeAudio(phonetics.find((item) => item?.audio)?.audio || '');
  const meanings = [];

  for (const entry of entries) {
    for (const meaning of Array.isArray(entry?.meanings) ? entry.meanings : []) {
      const definitions = (Array.isArray(meaning?.definitions) ? meaning.definitions : [])
        .map((item) => ({
          definition: String(item?.definition || '').trim(),
          example: String(item?.example || '').trim(),
        }))
        .filter((item) => item.definition)
        .slice(0, 3);
      if (!definitions.length) continue;
      meanings.push({
        partOfSpeech: String(meaning?.partOfSpeech || '').trim(),
        definitions,
        synonyms: unique([
          ...(Array.isArray(meaning?.synonyms) ? meaning.synonyms : []),
          ...definitions.flatMap((_, index) => {
            const original = meaning?.definitions?.[index];
            return Array.isArray(original?.synonyms) ? original.synonyms : [];
          }),
        ]).slice(0, 8),
      });
      if (meanings.length >= 4) break;
    }
    if (meanings.length >= 4) break;
  }

  return {
    word: String(first.word || '').trim(),
    phonetic,
    audio,
    meanings,
  };
}

async function lookupEnglish(term) {
  const result = await fetchJson(`${DICTIONARY_BASE}${encodeURIComponent(term)}`);
  if (!result.ok || !Array.isArray(result.payload)) return null;
  return compactDictionary(result.payload);
}

function validTranslation(value = '') {
  const translation = decodeEntities(value);
  if (!translation) return '';
  if (/^mymemory warning:/i.test(translation)) return '';
  return translation;
}

async function translate(term, from, to) {
  const url = `${TRANSLATION_BASE}?q=${encodeURIComponent(term)}&langpair=${encodeURIComponent(`${from}|${to}`)}&mt=1`;
  const result = await fetchJson(url);
  if (!result.ok || !result.payload) throw new Error('Translation service unavailable');
  const status = Number(result.payload.responseStatus || result.status || 0);
  if (status >= 400) throw new Error(String(result.payload.responseDetails || 'Translation failed'));

  const primary = validTranslation(result.payload?.responseData?.translatedText);
  const alternatives = unique((Array.isArray(result.payload?.matches) ? result.payload.matches : [])
    .map((item) => validTranslation(item?.translation))
    .filter((value) => value && value.toLocaleLowerCase() !== primary.toLocaleLowerCase()))
    .slice(0, 4);

  if (!primary) throw new Error('Translation was empty');
  return { primary, alternatives };
}

function inferLanguage(query, dictionary, requested) {
  if (requested === 'en' || requested === 'vi') return requested;
  if (hasVietnameseMarks(query)) return 'vi';
  if (dictionary) return 'en';
  if (/\s/.test(query)) return 'en';
  return 'vi';
}

function dictionaryCandidate(value = '') {
  return String(value)
    .replace(/[()[\]{}]/g, ' ')
    .split(/[;,/]|\s+-\s+/)[0]
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function getCache() {
  if (!globalThis.__brianDictionaryCache) globalThis.__brianDictionaryCache = new Map();
  return globalThis.__brianDictionaryCache;
}

function readCache(key) {
  const cache = getCache();
  const record = cache.get(key);
  if (!record) return null;
  if (Date.now() - record.time > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return record.data;
}

function writeCache(key, data) {
  const cache = getCache();
  cache.set(key, { time: Date.now(), data });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
}

async function buildLookup(query, requestedLanguage) {
  let originalDictionary = null;
  if (requestedLanguage !== 'vi' && !hasVietnameseMarks(query)) {
    try { originalDictionary = await lookupEnglish(query); } catch { /* translation can still work */ }
  }

  const detectedLanguage = inferLanguage(query, originalDictionary, requestedLanguage);
  let translation = null;
  let dictionary = originalDictionary;
  let lookupWord = query;
  const warnings = [];

  if (detectedLanguage === 'en') {
    if (!dictionary) {
      try { dictionary = await lookupEnglish(query); } catch { /* translation can still work */ }
    }
    try {
      translation = await translate(query, 'en', 'vi');
    } catch {
      warnings.push('Không thể tải nghĩa tiếng Việt ở thời điểm này.');
    }
  } else {
    try {
      translation = await translate(query, 'vi', 'en');
      lookupWord = dictionaryCandidate(translation.primary) || translation.primary;
    } catch {
      throw new Error('Không thể dịch từ tiếng Việt sang tiếng Anh ở thời điểm này.');
    }
    try { dictionary = await lookupEnglish(lookupWord); } catch { /* translation is sufficient */ }
  }

  if (!translation?.primary && !dictionary) {
    throw new Error('Không tìm thấy dữ liệu cho từ hoặc cụm từ này.');
  }

  return {
    ok: true,
    query,
    requestedLanguage,
    detectedLanguage,
    dictionaryLanguage: dictionary ? 'en' : detectedLanguage,
    lookupWord: dictionary?.word || lookupWord,
    translation: translation?.primary || '',
    alternatives: translation?.alternatives || [],
    phonetic: dictionary?.phonetic || '',
    audio: dictionary?.audio || '',
    meanings: dictionary?.meanings || [],
    warnings,
    fetchedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Method not allowed' });

  const query = normalizeQuery(req.query?.q);
  const requestedLanguage = ['en', 'vi'].includes(String(req.query?.lang || '').toLowerCase())
    ? String(req.query.lang).toLowerCase()
    : 'auto';

  if (!query) return res.status(400).json({ ok: false, message: 'Vui lòng nhập từ hoặc cụm từ cần tra cứu.' });
  if (Buffer.byteLength(query, 'utf8') > MAX_QUERY_BYTES) {
    return res.status(400).json({ ok: false, message: 'Nội dung tra cứu quá dài.' });
  }

  const cacheKey = `${requestedLanguage}:${query.toLocaleLowerCase()}`;
  const cached = readCache(cacheKey);
  if (cached) return res.status(200).json({ ...cached, cached: true });

  try {
    const data = await buildLookup(query, requestedLanguage);
    writeCache(cacheKey, data);
    return res.status(200).json({ ...data, cached: false });
  } catch (error) {
    const message = String(error?.message || 'Không thể tra cứu từ điển lúc này.');
    return res.status(502).json({ ok: false, message });
  }
}
