import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function readBearerToken(request) {
  const header = String(request.headers.authorization || request.headers.Authorization || '');
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const hmacSecret = String(process.env.CHATWOOT_HMAC_SECRET || '').trim();
  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!hmacSecret || !supabaseUrl || !supabaseAnonKey) {
    return response.status(503).json({ error: 'Chatwoot identity validation is not configured.' });
  }

  const accessToken = readBearerToken(request);
  if (!accessToken) return response.status(401).json({ error: 'Missing access token.' });

  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data?.user?.id) return response.status(401).json({ error: 'Invalid access token.' });

    const identifier = String(request.body?.identifier || '').trim();
    if (!identifier || identifier !== String(data.user.id)) {
      return response.status(403).json({ error: 'Identifier does not match the authenticated user.' });
    }

    const identifierHash = crypto.createHmac('sha256', hmacSecret).update(identifier).digest('hex');
    return response.status(200).json({ identifier_hash: identifierHash });
  } catch (error) {
    console.error('[ChatwootIdentity] request failed', error);
    return response.status(500).json({ error: 'Could not create identity hash.' });
  }
}
