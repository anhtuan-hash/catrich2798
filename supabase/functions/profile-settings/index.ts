import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SAFE_COLUMNS = 'id,email,full_name,school,role,username,contact_email,auth_mode,must_change_password,job_title,phone,bio,avatar_url';

function response(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function cleanText(value: unknown, max: number) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanMultiline(value: unknown, max: number) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);
}

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return response(405, { ok: false, message: 'Method not allowed.' });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !anonKey || !serviceKey) return response(503, { ok: false, message: 'Dịch vụ hồ sơ chưa được cấu hình.' });

    const authorization = req.headers.get('Authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!token) return response(401, { ok: false, message: 'Phiên đăng nhập không hợp lệ.' });

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData?.user) return response(401, { ok: false, message: 'Phiên đăng nhập đã hết hạn.' });

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const body = await req.json().catch(() => ({}));
    const action = cleanText(body?.action, 20) || 'get';

    if (action === 'get') {
      const { data, error } = await db.from('profiles').select(SAFE_COLUMNS).eq('id', authData.user.id).maybeSingle();
      if (error) return response(400, { ok: false, message: error.message });
      const fallback = {
        id: authData.user.id,
        email: authData.user.email || '',
        full_name: authData.user.user_metadata?.full_name || '',
        school: authData.user.user_metadata?.school || '',
        username: authData.user.user_metadata?.username || '',
        contact_email: authData.user.user_metadata?.contact_email || '',
        auth_mode: authData.user.user_metadata?.auth_mode || 'email',
        must_change_password: authData.user.user_metadata?.must_change_password === true,
        job_title: authData.user.user_metadata?.job_title || '',
        phone: authData.user.user_metadata?.phone || '',
        bio: authData.user.user_metadata?.bio || '',
        avatar_url: authData.user.user_metadata?.avatar_url || '',
      };
      return response(200, { ok: true, profile: data || fallback });
    }

    if (action !== 'update') return response(400, { ok: false, message: 'Thao tác hồ sơ không hợp lệ.' });

    const incoming = body?.profile && typeof body.profile === 'object' ? body.profile : {};
    const fullName = cleanText(incoming.fullName, 120);
    const school = cleanText(incoming.school, 160);
    const contactEmail = cleanText(incoming.contactEmail, 254).toLowerCase();
    const jobTitle = cleanText(incoming.jobTitle, 120);
    const phone = cleanText(incoming.phone, 40);
    const bio = cleanMultiline(incoming.bio, 320);
    const avatarUrl = cleanText(incoming.avatarUrl, 1000);

    if (!validEmail(contactEmail)) return response(400, { ok: false, message: 'Email liên hệ không hợp lệ.' });
    if (contactEmail) {
      const duplicate = await db.from('profiles').select('id').ilike('contact_email', contactEmail).neq('id', authData.user.id).maybeSingle();
      if (duplicate.error) return response(400, { ok: false, message: duplicate.error.message });
      if (duplicate.data?.id) return response(409, { ok: false, message: 'Email này đã được dùng cho tài khoản khác.' });
    }

    const allowedAvatarPrefix = `${supabaseUrl}/storage/v1/object/public/profile-avatars/${authData.user.id}/`;
    if (avatarUrl && !avatarUrl.startsWith(allowedAvatarPrefix)) {
      return response(400, { ok: false, message: 'Đường dẫn ảnh hồ sơ không hợp lệ.' });
    }

    const updatePayload = {
      full_name: fullName,
      school,
      contact_email: contactEmail || null,
      job_title: jobTitle,
      phone,
      bio,
      avatar_url: avatarUrl || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await db.from('profiles').update(updatePayload).eq('id', authData.user.id).select(SAFE_COLUMNS).single();
    if (error) return response(400, { ok: false, message: error.message });

    const metadata = {
      ...(authData.user.user_metadata || {}),
      full_name: fullName,
      school,
      contact_email: contactEmail,
      job_title: jobTitle,
      phone,
      bio,
      avatar_url: avatarUrl,
    };
    const { error: metadataError } = await db.auth.admin.updateUserById(authData.user.id, { user_metadata: metadata });
    if (metadataError) return response(400, { ok: false, message: metadataError.message });

    return response(200, { ok: true, profile: data });
  } catch (error) {
    return response(500, { ok: false, message: String(error?.message || 'Không thể cập nhật hồ sơ.') });
  }
});
