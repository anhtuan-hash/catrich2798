import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const INTERNAL_DOMAIN = 'accounts.brianenglish.studio';
const MAX_BATCH = 50;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function cleanText(value: unknown, max = 160) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeUsername(value: unknown) {
  return cleanText(value, 64)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .slice(0, 32);
}

function internalEmail(username: string) {
  return `${username}@${INTERNAL_DOMAIN}`;
}

function validUsername(username: string) {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username);
}

function validPassword(value: unknown) {
  const password = String(value ?? '');
  return password.length >= 8 && password.length <= 128;
}

function validContactEmail(value: unknown) {
  const email = cleanText(value, 254).toLowerCase();
  if (!email) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, message: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || '';
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ ok: false, message: 'Supabase function secrets are not configured.' }, 500);
  }

  const authorization = req.headers.get('Authorization') || '';
  if (!authorization) return json({ ok: false, message: 'Missing authorization token.' }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  const caller = userData?.user;
  if (userError || !caller?.id) return json({ ok: false, message: 'Phiên đăng nhập không hợp lệ.' }, 401);

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, message: 'Dữ liệu gửi lên không hợp lệ.' }, 400);
  }

  const action = cleanText(payload.action, 40) || 'get_self';
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('id,email,username,contact_email,full_name,school,role,approved,auth_mode,must_change_password')
    .eq('id', caller.id)
    .maybeSingle();
  const isAdmin = callerProfile?.role === 'admin' && callerProfile?.approved === true;

  if (action === 'get_self') {
    return json({
      ok: true,
      profile: {
        id: caller.id,
        username: callerProfile?.username || caller.user_metadata?.username || '',
        contactEmail: callerProfile?.contact_email || caller.user_metadata?.contact_email || '',
        authMode: callerProfile?.auth_mode || caller.user_metadata?.auth_mode || 'email',
        mustChangePassword: callerProfile?.must_change_password === true || caller.user_metadata?.must_change_password === true,
        fullName: callerProfile?.full_name || caller.user_metadata?.full_name || '',
      },
    });
  }

  if (action === 'update_contact_email') {
    const contactEmail = validContactEmail(payload.contactEmail);
    if (!contactEmail) return json({ ok: false, message: 'Email liên hệ không hợp lệ.' }, 400);

    const { data: duplicate } = await adminClient
      .from('profiles')
      .select('id')
      .ilike('contact_email', contactEmail)
      .neq('id', caller.id)
      .maybeSingle();
    if (duplicate?.id) return json({ ok: false, message: 'Email này đã được dùng cho tài khoản khác.' }, 409);

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ contact_email: contactEmail, updated_at: new Date().toISOString() })
      .eq('id', caller.id);
    if (profileError) return json({ ok: false, message: profileError.message }, 400);

    const metadata = { ...(caller.user_metadata || {}), contact_email: contactEmail };
    const { error: metadataError } = await adminClient.auth.admin.updateUserById(caller.id, { user_metadata: metadata });
    if (metadataError) return json({ ok: false, message: metadataError.message }, 400);
    return json({ ok: true, contactEmail });
  }

  if (action === 'password_changed') {
    const metadata = { ...(caller.user_metadata || {}), must_change_password: false };
    const { error: authError } = await adminClient.auth.admin.updateUserById(caller.id, { user_metadata: metadata });
    if (authError) return json({ ok: false, message: authError.message }, 400);
    await adminClient
      .from('profiles')
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', caller.id);
    return json({ ok: true });
  }

  if (!isAdmin) return json({ ok: false, message: 'Chỉ Admin được quản lý tài khoản giáo viên.' }, 403);

  if (action === 'reset_password') {
    const username = normalizeUsername(payload.username);
    const password = String(payload.password ?? '');
    if (!validUsername(username)) return json({ ok: false, message: 'Tên đăng nhập không hợp lệ.' }, 400);
    if (!validPassword(password)) return json({ ok: false, message: 'Mật khẩu cần từ 8 đến 128 ký tự.' }, 400);

    const { data: target, error: targetError } = await adminClient
      .from('profiles')
      .select('id,username')
      .ilike('username', username)
      .maybeSingle();
    if (targetError || !target?.id) return json({ ok: false, message: 'Không tìm thấy tài khoản giáo viên.' }, 404);

    const { data: authTarget } = await adminClient.auth.admin.getUserById(target.id);
    const metadata = { ...(authTarget?.user?.user_metadata || {}), must_change_password: true };
    const { error: resetError } = await adminClient.auth.admin.updateUserById(target.id, {
      password,
      user_metadata: metadata,
    });
    if (resetError) return json({ ok: false, message: resetError.message }, 400);
    await adminClient
      .from('profiles')
      .update({ must_change_password: true, updated_at: new Date().toISOString() })
      .eq('id', target.id);
    return json({ ok: true, username });
  }

  if (action !== 'bulk_create') return json({ ok: false, message: 'Unknown action.' }, 400);

  const accounts = Array.isArray(payload.accounts) ? payload.accounts.slice(0, MAX_BATCH) : [];
  if (!accounts.length) return json({ ok: false, message: 'Danh sách tài khoản đang trống.' }, 400);
  if (Array.isArray(payload.accounts) && payload.accounts.length > MAX_BATCH) {
    return json({ ok: false, message: `Mỗi lần chỉ tạo tối đa ${MAX_BATCH} tài khoản.` }, 400);
  }

  const seen = new Set<string>();
  const results: Array<Record<string, unknown>> = [];

  for (let index = 0; index < accounts.length; index += 1) {
    const item = (accounts[index] || {}) as Record<string, unknown>;
    const username = normalizeUsername(item.username);
    const password = String(item.password ?? '');
    const fullName = cleanText(item.fullName || item.full_name, 120) || username;
    const school = cleanText(item.school, 160);

    if (!validUsername(username)) {
      results.push({ index, username, ok: false, message: 'Tên đăng nhập cần 3–32 ký tự, chỉ gồm chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.' });
      continue;
    }
    if (seen.has(username)) {
      results.push({ index, username, ok: false, message: 'Tên đăng nhập bị trùng trong danh sách.' });
      continue;
    }
    seen.add(username);
    if (!validPassword(password)) {
      results.push({ index, username, ok: false, message: 'Mật khẩu cần từ 8 đến 128 ký tự.' });
      continue;
    }

    const email = internalEmail(username);
    const userMetadata = {
      full_name: fullName,
      school,
      username,
      auth_mode: 'username',
      must_change_password: true,
      contact_email: '',
    };

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });
    if (createError || !created?.user?.id) {
      results.push({ index, username, internalEmail: email, ok: false, message: createError?.message || 'Không thể tạo tài khoản Auth.' });
      continue;
    }

    const userId = created.user.id;
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userId,
      email,
      username,
      contact_email: null,
      full_name: fullName,
      school,
      role: 'teacher',
      approved: true,
      auth_mode: 'username',
      must_change_password: true,
      permissions: { mode: 'all', allowed: [] },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId).catch(() => null);
      results.push({ index, username, internalEmail: email, ok: false, message: profileError.message });
      continue;
    }

    results.push({ index, username, fullName, internalEmail: email, ok: true });
  }

  const createdCount = results.filter((item) => item.ok === true).length;
  return json({
    ok: createdCount > 0,
    createdCount,
    failedCount: results.length - createdCount,
    results,
    message: createdCount ? `Đã tạo ${createdCount} tài khoản.` : 'Không tạo được tài khoản nào.',
  }, createdCount ? 200 : 400);
});
