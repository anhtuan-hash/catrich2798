import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function leaderRole(role: string) {
  return new Set([
    "admin","ttcm","to_truong","tổ trưởng",
    "department_head","department-head","department head",
    "department_leader","department leader",
    "subject_leader","subject leader","leader",
  ]).has(role.toLocaleLowerCase("vi").trim());
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return null;
  const mime = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const binary = atob(match[2]);
  if (!binary || binary.length > 4 * 1024 * 1024) return null;
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return { mime, bytes, ext };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  let serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!serviceKey) {
    try {
      const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
      serviceKey = String(keys.default || Object.values(keys)[0] || "");
    } catch {
      serviceKey = "";
    }
  }
  if (!supabaseUrl || !serviceKey) return json({ ok: false, message: "Service is not configured." }, 500);

  const authorization = req.headers.get("Authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return json({ ok: false, message: "Authentication required." }, 401);

  let body: { activityId?: string; dataUrl?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: "Invalid request body." }, 400);
  }

  const activityId = clean(body?.activityId);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(activityId)) {
    return json({ ok: false, message: "Invalid activity id." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  const userId = userData?.user?.id || "";
  if (userError || !userId) return json({ ok: false, message: "Authentication required." }, 401);

  const { data: profile } = await admin
    .from("profiles")
    .select("approved,role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.approved !== true || !leaderRole(String(profile?.role || ""))) {
    return json({ ok: false, message: "Only authorized leaders can edit thumbnails." }, 403);
  }

  const { data: activity } = await admin
    .from("lesson_check_activities")
    .select("id,thumbnail_url")
    .eq("id", activityId)
    .maybeSingle();
  if (!activity) return json({ ok: false, message: "Activity not found." }, 404);

  const action = clean(body?.action || "upload").toLowerCase();
  const bucket = admin.storage.from("lesson-check-thumbnails");

  if (action === "remove") {
    const { data: existing } = await bucket.list(activityId, { limit: 100 });
    const paths = (existing || []).map((item) => item.name).filter(Boolean).map((name) => `${activityId}/${name}`);
    if (paths.length) await bucket.remove(paths);
    const { error: clearError } = await admin
      .from("lesson_check_activities")
      .update({
        thumbnail_url: null,
        thumbnail_generated_at: null,
        thumbnail_source_updated_at: null,
        thumbnail_profile: null,
      })
      .eq("id", activityId);
    if (clearError) return json({ ok: false, message: "Could not remove thumbnail." }, 500);
    return json({ ok: true, thumbnailUrl: "" });
  }

  const parsed = parseDataUrl(clean(body?.dataUrl));
  if (!parsed) {
    return json({ ok: false, message: "Thumbnail must be a PNG, JPEG, or WebP image under 4 MB." }, 400);
  }

  const fileName = `manual-${Date.now()}.${parsed.ext}`;
  const filePath = `${activityId}/${fileName}`;
  const { error: uploadError } = await bucket.upload(filePath, parsed.bytes, {
    contentType: parsed.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) return json({ ok: false, message: "Could not upload thumbnail." }, 500);

  const { data: publicData } = bucket.getPublicUrl(filePath);
  const thumbnailUrl = publicData?.publicUrl || "";
  if (!thumbnailUrl) return json({ ok: false, message: "Could not resolve thumbnail URL." }, 500);

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("lesson_check_activities")
    .update({
      thumbnail_url: thumbnailUrl,
      thumbnail_generated_at: now,
      thumbnail_source_updated_at: now,
      thumbnail_profile: "manual-v1",
    })
    .eq("id", activityId);
  if (updateError) return json({ ok: false, message: "Thumbnail uploaded but activity metadata could not be updated." }, 500);

  const { data: existing } = await bucket.list(activityId, { limit: 100 });
  const stalePaths = (existing || [])
    .filter((item) => item.name && item.name !== fileName)
    .map((item) => `${activityId}/${item.name}`);
  if (stalePaths.length) await bucket.remove(stalePaths);

  return json({ ok: true, thumbnailUrl, generatedAt: now, profile: "manual-v1" });
});
