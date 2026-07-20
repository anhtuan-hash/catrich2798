export async function handleLessonAiRequest(_req, res) {
  res.statusCode = 410;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: false, code: 'LEGACY_AI_ENDPOINT_REMOVED', error: 'Use the authenticated /api/ai OpenRouter server gateway.' }));
}

export default handleLessonAiRequest;
