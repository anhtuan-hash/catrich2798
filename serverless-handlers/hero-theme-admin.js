import { requireApprovedUser } from '../server/api/_security.js';
import {
  assertThemeDocumentSize,
  auditHeroTheme,
  createRequestId,
  loadHeroThemeStudioState,
  normalizeThemeDocument,
  sendJson,
} from '../server/api/_heroTheme.js';

function cleanName(value, fallback = 'New Hero Theme') {
  const name = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  return name || fallback;
}

function cleanDescription(value) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, 500);
}

async function freshState(context) {
  return loadHeroThemeStudioState(context);
}

export default async function handler(req, res) {
  const requestId = createRequestId();
  try {
    const context = await requireApprovedUser(req, { roles: ['admin'] });
    const client = context.userClient || context.client;

    if (req.method === 'GET') {
      const state = await freshState(context);
      return sendJson(res, 200, { ...state, requestId });
    }
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed', requestId });

    const action = String(req.body?.action || '').trim();
    let result = null;

    if (action === 'createTheme') {
      const name = cleanName(req.body?.name);
      const description = cleanDescription(req.body?.description);
      const { data: setRow, error: setError } = await client
        .from('hero_theme_sets')
        .insert({ name, description, created_by: context.user.id, updated_at: new Date().toISOString() })
        .select('id,name,description,created_at,updated_at')
        .single();
      if (setError) throw setError;
      const config = normalizeThemeDocument(req.body?.config);
      const { error: draftError } = await client.from('hero_theme_drafts').insert({
        theme_set_id: setRow.id,
        config,
        updated_by: context.user.id,
        updated_at: new Date().toISOString(),
      });
      if (draftError) throw draftError;
      result = { themeSetId: setRow.id };
    } else if (action === 'saveDraft') {
      const themeSetId = String(req.body?.themeSetId || '').trim();
      assertThemeDocumentSize(req.body?.config);
      const config = normalizeThemeDocument(req.body?.config);
      const { error } = await client.from('hero_theme_drafts').upsert({
        theme_set_id: themeSetId,
        config,
        updated_by: context.user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'theme_set_id' });
      if (error) throw error;
      const { error: touchError } = await client.from('hero_theme_sets').update({ updated_at: new Date().toISOString() }).eq('id', themeSetId);
      if (touchError) throw touchError;
      result = { themeSetId };
    } else if (action === 'publish') {
      const themeSetId = String(req.body?.themeSetId || '').trim();
      const { data: revisionId, error } = await client.rpc('hero_theme_publish_draft', { p_theme_set_id: themeSetId });
      if (error) throw error;
      result = { themeSetId, revisionId };
    } else if (action === 'restore') {
      const revisionId = String(req.body?.revisionId || '').trim();
      const { data: newRevisionId, error } = await client.rpc('hero_theme_restore_revision', { p_revision_id: revisionId });
      if (error) throw error;
      result = { sourceRevisionId: revisionId, revisionId: newRevisionId };
    } else {
      return sendJson(res, 400, { error: 'Unknown Hero Theme action', requestId });
    }

    await auditHeroTheme(context, {
      endpoint: '/api/hero-theme-admin',
      action: `hero_theme_${action}`,
      status: 'ok',
      requestId,
      details: result || {},
    });
    const state = await freshState(context);
    return sendJson(res, 200, { ok: true, result, ...state, requestId });
  } catch (error) {
    const status = Number(error?.status || (/permission|row-level security|42501/i.test(String(error?.message || '')) ? 403 : 400));
    return sendJson(res, status, { error: error?.message || 'Hero Theme Studio request failed.', requestId });
  }
}
