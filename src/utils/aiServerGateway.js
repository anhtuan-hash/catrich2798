import { supabase } from './supabase.js';

export const AI_SERVER_CONTRACT = 'bes-ai-core/1.3';
export const AI_SERVER_ENDPOINT = '/api/ai';

async function getAccessToken() {
  if (!supabase) return '';
  try {
    const { data } = await supabase.auth.getSession();
    return String(data?.session?.access_token || '');
  } catch {
    return '';
  }
}

function createGatewayError(payload, status) {
  const message = String(payload?.error || payload?.message || `AI gateway failed with status ${status}.`);
  const error = new Error(message);
  error.status = Number(status || 0);
  error.code = String(payload?.code || 'AI_GATEWAY_ERROR');
  error.requestId = String(payload?.requestId || '');
  error.retryAfterMs = Math.max(0, Number(payload?.retryAfterMs || 0));
  error.details = payload?.details || null;
  return error;
}

async function parseSseResponse(response, { onToken, onStatus } = {}) {
  if (!response.body?.getReader) {
    const fallback = await response.json().catch(() => ({}));
    if (!response.ok || fallback?.ok === false) throw createGatewayError(fallback, response.status);
    return fallback;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let aggregate = '';
  let meta = {};
  const consumeEvent = (block) => {
    const lines = block.split(/\r?\n/);
    let eventName = 'message';
    const dataLines = [];
    lines.forEach((line) => {
      if (line.startsWith('event:')) eventName = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    });
    if (!dataLines.length) return;
    let payload;
    try { payload = JSON.parse(dataLines.join('\n')); }
    catch { payload = { text: dataLines.join('\n') }; }
    if (eventName === 'token') {
      const delta = String(payload?.delta || payload?.text || '');
      if (delta) {
        aggregate += delta;
        onToken?.(delta, aggregate);
      }
    } else if (eventName === 'status' || eventName === 'meta') {
      meta = { ...meta, ...(payload || {}) };
      onStatus?.(payload || {});
    } else if (eventName === 'done') {
      meta = { ...meta, ...(payload || {}) };
      if (typeof payload?.text === 'string' && payload.text && !aggregate) aggregate = payload.text;
    } else if (eventName === 'error') {
      throw createGatewayError(payload, payload?.status || response.status || 500);
    }
  };
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (block.trim()) consumeEvent(block);
      boundary = buffer.indexOf('\n\n');
    }
    if (done) break;
  }
  if (buffer.trim()) consumeEvent(buffer);
  if (!response.ok) throw createGatewayError(meta, response.status);
  return { ok: true, text: aggregate, ...meta };
}

export async function callAiServerGateway({
  prompt = '',
  systemInstruction = '',
  attachments = [],
  responseMimeType = '',
  maxOutputTokens = 1600,
  temperature = 0.5,
  taskId = 'default',
  routingHint = 'smart',
  requestedModel = '',
  operationId = '',
  sessionId = '',
  stream = false,
  signal,
  onToken,
  onStatus,
} = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(AI_SERVER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: stream ? 'text/event-stream' : 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    signal,
    body: JSON.stringify({
      contract: AI_SERVER_CONTRACT,
      operation: 'chat',
      prompt: String(prompt || ''),
      systemInstruction: String(systemInstruction || ''),
      attachments: (Array.isArray(attachments) ? attachments : []).slice(0, 4).map((item) => ({
        name: String(item?.name || 'attachment').slice(0, 160),
        mimeType: String(item?.mimeType || item?.type || '').slice(0, 120),
        dataUrl: String(item?.dataUrl || (item?.base64 && item?.mimeType ? `data:${item.mimeType};base64,${item.base64}` : '') || ''),
      })),
      responseMimeType,
      maxOutputTokens,
      temperature,
      taskId,
      routingHint,
      requestedModel,
      operationId,
      sessionId,
      stream: Boolean(stream),
    }),
  });
  if (stream && /text\/event-stream/i.test(String(response.headers.get('content-type') || ''))) {
    const result = await parseSseResponse(response, { onToken, onStatus });
    if (!String(result.text || '').trim()) throw createGatewayError({ error: 'OpenRouter returned an empty streamed response.', code: 'OPENROUTER_EMPTY_RESPONSE', requestId: result.requestId }, 502);
    return result;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw createGatewayError(payload, response.status);
  return payload;
}

export async function callAiImageGateway({ prompt = '', imageDataUrl = '', taskId = 'image-edit', operationId = '', signal } = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(AI_SERVER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    signal,
    body: JSON.stringify({ contract: AI_SERVER_CONTRACT, operation: 'image', prompt, imageDataUrl, taskId, operationId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw createGatewayError(payload, response.status);
  return payload;
}

export async function getAiServerHealth({ signal } = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(AI_SERVER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    signal,
    body: JSON.stringify({ contract: AI_SERVER_CONTRACT, operation: 'health' }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw createGatewayError(payload, response.status);
  return payload;
}
