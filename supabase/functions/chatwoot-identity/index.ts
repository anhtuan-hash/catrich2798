const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function readBearerToken(request: Request) {
  const header = String(request.headers.get('authorization') || '');
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

async function createIdentifierHash(identifier: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(identifier));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = String(Deno.env.get('SUPABASE_URL') || '').trim().replace(/\/+$/, '');
  const supabaseAnonKey = String(Deno.env.get('SUPABASE_ANON_KEY') || '').trim();
  const hmacSecret = String(Deno.env.get('CHATWOOT_HMAC_SECRET') || '').trim();
  if (!supabaseUrl || !supabaseAnonKey || !hmacSecret) {
    return jsonResponse({ error: 'Chatwoot identity validation is not configured.' }, 503);
  }

  const accessToken = readBearerToken(request);
  if (!accessToken) return jsonResponse({ error: 'Missing access token.' }, 401);

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!userResponse.ok) return jsonResponse({ error: 'Invalid access token.' }, 401);
    const authenticatedUser = await userResponse.json();

    const payload = await request.json().catch(() => ({}));
    const identifier = String(payload?.identifier || '').trim();
    if (!identifier || identifier !== String(authenticatedUser?.id || '')) {
      return jsonResponse({ error: 'Identifier does not match the authenticated user.' }, 403);
    }

    return jsonResponse({ identifier_hash: await createIdentifierHash(identifier, hmacSecret) });
  } catch (error) {
    console.error('[ChatwootIdentity] request failed', error);
    return jsonResponse({ error: 'Could not create identity hash.' }, 500);
  }
});
