export const DEFAULT_GEMINI_MODEL = '';
export const DEFAULT_MAX_OUTPUT_TOKENS = 0;
export const ACTIVITY_OUTPUT_FORMATS = {};
export const AI_TOOL_PRESETS = {};

function removedError() {
  const error = new Error('Các tính năng AI đã được gỡ khỏi Brian English Studio.');
  error.code = 'AI_FEATURE_REMOVED';
  return error;
}

export async function callAI() { throw removedError(); }
export async function callGemini() { throw removedError(); }
export async function generateActivityWithGemini() { throw removedError(); }
export async function generateGenericToolOutput() { throw removedError(); }
export function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
