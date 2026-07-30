import fs from 'node:fs';

function replaceExact(path, before, after, label) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(before)) {
    if (source.includes(after)) {
      console.log(`${label}: already applied`);
      return;
    }
    throw new Error(`${label}: expected source block was not found`);
  }
  fs.writeFileSync(path, source.replace(before, after));
  console.log(`${label}: applied`);
}

replaceExact(
  'src/utils/weeklyPractice.js',
  `export async function uploadWeeklyPracticeProof(practiceId, proofBlob) {
  if (!proofBlob || proofBlob.type !== 'image/png') throw new Error('Ảnh xác nhận chưa hợp lệ.');
  const client = requireClient();
  const path = \`${'${practiceId}'}/${'${getWeeklyPracticeDeviceId()}'}/${'${Date.now()}'}-${'${randomId()}'}.png\`;
  const { error } = await client.storage
    .from(WEEKLY_PRACTICE_PROOF_BUCKET)
    .upload(path, proofBlob, {
      cacheControl: '31536000',
      contentType: 'image/png',
      upsert: false,
    });
  if (error) throw error;
  return path;
}`,
  `function canvasProofBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function optimizeWeeklyPracticeProof(proofBlob) {
  const originalType = cleanText(proofBlob?.type).toLowerCase();
  if (originalType === 'image/webp') return proofBlob;
  if (originalType !== 'image/png' || typeof document === 'undefined') return proofBlob;

  let source = null;
  let objectUrl = '';
  try {
    if (typeof createImageBitmap === 'function') {
      source = await createImageBitmap(proofBlob);
    } else {
      objectUrl = URL.createObjectURL(proofBlob);
      source = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Không thể đọc ảnh xác nhận.'));
        image.src = objectUrl;
      });
    }

    const width = Number(source?.width || source?.naturalWidth || 0);
    const height = Number(source?.height || source?.naturalHeight || 0);
    if (!width || !height) return proofBlob;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return proofBlob;
    context.drawImage(source, 0, 0, width, height);
    const webp = await canvasProofBlob(canvas, 'image/webp', 0.86);
    return webp?.type === 'image/webp' && webp.size > 0 && webp.size < proofBlob.size ? webp : proofBlob;
  } catch {
    return proofBlob;
  } finally {
    source?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadWeeklyPracticeProof(practiceId, proofBlob) {
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
}`,
  'weekly proof WebP optimization',
);

replaceExact(
  'src/utils/homeroomPhase2.js',
  `function normalizeCode(value) {
  return safeText(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}`,
  `function normalizeCode(value) {
  return safeText(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

function missingRpc(error, name) {
  const code = safeText(error?.code).toUpperCase();
  const message = safeText(error?.message || error).toLowerCase();
  return code === 'PGRST202'
    || code === '42883'
    || (message.includes(String(name || '').toLowerCase())
      && (message.includes('does not exist') || message.includes('schema cache') || message.includes('could not find')));
}`,
  'Homeroom missing-RPC detector',
);

replaceExact(
  'src/utils/homeroomPhase2.js',
  `export async function loadSchoolHomeroomStats(user, { force = false } = {}) {
  if (!isSupabaseConfigured || !supabase || user?.role !== 'admin') {
    return { ok: false, offline: true, message: 'Chỉ Admin có quyền xem thống kê toàn trường.', workspaces: [] };
  }

  const key = cacheKey('school-stats', user, 'all');
  return cachedRead(key, SCHOOL_STATS_CACHE_TTL, force, async () => {
    const { data, error } = await supabase
      .from('bes_homeroom_workspaces')
      .select('owner_id,owner_email,class_name,school_year,payload,updated_at')
      .order('class_name')
      .limit(200);
    if (error) return { ok: false, message: error.message, workspaces: [] };
    return { ok: true, workspaces: data || [] };
  });
}`,
  `export async function loadSchoolHomeroomStats(user, { force = false } = {}) {
  if (!isSupabaseConfigured || !supabase || user?.role !== 'admin') {
    return { ok: false, offline: true, message: 'Chỉ Admin có quyền xem thống kê toàn trường.', workspaces: [] };
  }

  const key = cacheKey('school-stats', user, 'all');
  return cachedRead(key, SCHOOL_STATS_CACHE_TTL, force, async () => {
    const rpcName = 'bes_homeroom_school_stats_v2';
    const compact = await supabase.rpc(rpcName);
    if (!compact.error) {
      return { ok: true, workspaces: compact.data || [], source: 'compact-rpc' };
    }
    if (!missingRpc(compact.error, rpcName)) {
      return { ok: false, message: compact.error.message, workspaces: [] };
    }

    // Temporary compatibility path before the compact RPC migration is applied.
    const { data, error } = await supabase
      .from('bes_homeroom_workspaces')
      .select('owner_id,owner_email,workspace_id,class_name,school_year,payload,updated_at')
      .order('class_name')
      .limit(200);
    if (error) return { ok: false, message: error.message, workspaces: [] };
    return { ok: true, workspaces: data || [], source: 'legacy-payload-fallback' };
  });
}`,
  'compact Homeroom school statistics',
);

replaceExact(
  'src/pages/HomeroomWorkspace.jsx',
  `  RecordsTab,
  SchoolStatsTab,
} from '../components/homeroom/HomeroomCommunicationTabs.jsx';`,
  `  RecordsTab,
} from '../components/homeroom/HomeroomCommunicationTabs.jsx';
import SchoolStatsTab from '../components/homeroom/SchoolStatsCompactTab.jsx';`,
  'Homeroom compact statistics route',
);
