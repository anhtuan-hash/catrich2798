import fs from 'node:fs';

const path = 'src/utils/weeklyPractice.js';
const source = fs.readFileSync(path, 'utf8');
const before = `export async function uploadWeeklyPracticeProof(practiceId, proofBlob) {
  const inputType = cleanText(proofBlob?.type).toLowerCase();
  if (!proofBlob || !['image/webp', 'image/png'].includes(inputType)) {
    throw new Error('Ảnh xác nhận chưa hợp lệ.');
  }
  const optimizedBlob = await optimizeWeeklyPracticeProof(proofBlob);
  const mimeType = cleanText(optimizedBlob?.type, inputType).toLowerCase();
  const client = requireClient();
  const extension = mimeType === 'image/webp' ? 'webp' : 'png';
  const path = \`${'${practiceId}'}/${'${getWeeklyPracticeDeviceId()}'}/${'${Date.now()}'}-${'${randomId()}'}.${'${extension}'}\`;
  const { error } = await client.storage
    .from(WEEKLY_PRACTICE_PROOF_BUCKET)
    .upload(path, optimizedBlob, {
      cacheControl: '31536000',
      contentType: mimeType,
      upsert: false,
    });
  if (error) throw error;
  return path;
}`;
const after = `async function uploadWeeklyPracticeProofBlob(practiceId, blob, mimeType, extension) {
  const client = requireClient();
  const path = \`${'${practiceId}'}/${'${getWeeklyPracticeDeviceId()}'}/${'${Date.now()}'}-${'${randomId()}'}.${'${extension}'}\`;
  const { error } = await client.storage
    .from(WEEKLY_PRACTICE_PROOF_BUCKET)
    .upload(path, blob, {
      cacheControl: '31536000',
      contentType: mimeType,
      upsert: false,
    });
  return { path, error };
}

export async function uploadWeeklyPracticeProof(practiceId, proofBlob) {
  const inputType = cleanText(proofBlob?.type).toLowerCase();
  if (!proofBlob || !['image/webp', 'image/png'].includes(inputType)) {
    throw new Error('Ảnh xác nhận chưa hợp lệ.');
  }

  const optimizedBlob = await optimizeWeeklyPracticeProof(proofBlob);
  const mimeType = cleanText(optimizedBlob?.type, inputType).toLowerCase();
  const extension = mimeType === 'image/webp' ? 'webp' : 'png';
  const preferred = await uploadWeeklyPracticeProofBlob(practiceId, optimizedBlob, mimeType, extension);
  if (!preferred.error) return preferred.path;

  // During staged rollout an older bucket policy may still accept only PNG.
  // Retry the original proof so student submission is never blocked by migration timing.
  if (mimeType === 'image/webp' && inputType === 'image/png') {
    const fallback = await uploadWeeklyPracticeProofBlob(practiceId, proofBlob, 'image/png', 'png');
    if (!fallback.error) return fallback.path;
    throw fallback.error;
  }

  throw preferred.error;
}`;

if (!source.includes(before)) {
  if (source.includes(after)) process.exit(0);
  throw new Error('Expected weekly proof upload block was not found.');
}
fs.writeFileSync(path, source.replace(before, after));
