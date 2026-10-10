import { createClient } from "npm:@supabase/supabase-js@2";

const THUMBNAIL_PROFILE = "fill-v3";

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

function text(value: unknown) {
  return String(value ?? "").trim();
}

function extractHttpUrl(raw: string) {
  const input = text(raw);
  if (!input) return "";
  try {
    const direct = new URL(input);
    if (direct.protocol === "http:" || direct.protocol === "https:") return direct.toString();
  } catch {
    // Try iframe/embed markup below.
  }
  const match = input.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)
    || input.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  if (!match?.[1]) return "";
  const decoded = match[1]
    .replace(/&amp;/gi, "&")
    .replace(/&#38;/gi, "&")
    .trim();
  try {
    const url = new URL(decoded);
    return (url.protocol === "http:" || url.protocol === "https:") ? url.toString() : "";
  } catch {
    return "";
  }
}

function isPublicWebUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (
      host === "localhost"
      || host === "::1"
      || host.endsWith(".local")
      || host.endsWith(".internal")
      || /^127\./.test(host)
      || /^10\./.test(host)
      || /^192\.168\./.test(host)
      || /^169\.254\./.test(host)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) return false;
    return true;
  } catch {
    return false;
  }
}

function sourceVersion(value: unknown) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? String(parsed) : String(Date.now());
}

function contentExtension(contentType: string) {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("webp")) return "webp";
  return "png";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  let serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!serviceKey) {
    try {
      const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
      serviceKey = String(keys.default || Object.values(keys)[0] || "");
    } catch {
      serviceKey = "";
    }
  }
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ ok: false, message: "Thumbnail service is not configured." }, 500);
  }

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization) return json({ ok: false, message: "Authentication required." }, 401);

  let body: { activityId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: "Invalid request body." }, 400);
  }

  const activityId = text(body?.activityId);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(activityId)) {
    return json({ ok: false, message: "Invalid activity id." }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) return json({ ok: false, message: "Authentication required." }, 401);

  const { data: hasAccess, error: accessError } = await userClient.rpc("lesson_check_has_activity_access", {
    target_activity: activityId,
  });
  if (accessError || hasAccess !== true) {
    return json({ ok: false, message: "You do not have access to this activity." }, 403);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: activity, error: activityError }, { data: content, error: contentError }] = await Promise.all([
    admin
      .from("lesson_check_activities")
      .select("id,title,updated_at,thumbnail_url,thumbnail_generated_at,thumbnail_source_updated_at,thumbnail_profile")
      .eq("id", activityId)
      .maybeSingle(),
    admin
      .from("lesson_check_activity_content")
      .select("embed_code,updated_at")
      .eq("activity_id", activityId)
      .maybeSingle(),
  ]);

  if (activityError || contentError || !activity || !content) {
    return json({ ok: false, message: "Activity content was not found." }, 404);
  }

  const contentUpdatedAt = content.updated_at || activity.updated_at || new Date().toISOString();
  const cachedSource = Date.parse(activity.thumbnail_source_updated_at || "");
  const currentSource = Date.parse(contentUpdatedAt || "");
  const cachedIsFresh = Boolean(
    activity.thumbnail_profile === THUMBNAIL_PROFILE
      && activity.thumbnail_url
      && Number.isFinite(cachedSource)
      && Number.isFinite(currentSource)
      && cachedSource >= currentSource,
  );

  if (cachedIsFresh) {
    return json({
      ok: true,
      cached: true,
      thumbnailUrl: activity.thumbnail_url,
      generatedAt: activity.thumbnail_generated_at,
      profile: THUMBNAIL_PROFILE,
    });
  }

  const sourceUrl = extractHttpUrl(content.embed_code || "");
  if (!sourceUrl || !isPublicWebUrl(sourceUrl)) {
    return json({
      ok: false,
      fallback: "live",
      message: "This activity cannot be converted to a persistent screenshot.",
    }, 422);
  }

  const screenshotUrl =
    `https://image.thum.io/get/noanimate/allowJPG/width/390/crop/264/?url=${encodeURIComponent(sourceUrl)}`;

  let screenshotResponse: Response;
  try {
    screenshotResponse = await fetch(screenshotUrl, {
      redirect: "follow",
      headers: {
        "Accept": "image/avif,image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8",
        "User-Agent": "BRIAN-Activity-Thumbnail/3.0",
      },
    });
  } catch {
    return json({ ok: false, fallback: "live", message: "Thumbnail provider is unavailable." }, 502);
  }

  const contentType = screenshotResponse.headers.get("content-type") || "";
  if (!screenshotResponse.ok || !contentType.toLowerCase().startsWith("image/")) {
    return json({ ok: false, fallback: "live", message: "Thumbnail generation failed." }, 502);
  }

  const bytes = await screenshotResponse.arrayBuffer();
  if (bytes.byteLength < 2048 || bytes.byteLength > 5 * 1024 * 1024) {
    return json({ ok: false, fallback: "live", message: "Generated thumbnail was invalid." }, 502);
  }

  const ext = contentExtension(contentType);
  const version = sourceVersion(contentUpdatedAt);
  const fileName = `${version}-${THUMBNAIL_PROFILE}.${ext}`;
  const filePath = `${activityId}/${fileName}`;

  const { error: uploadError } = await admin.storage
    .from("lesson-check-thumbnails")
    .upload(filePath, bytes, {
      contentType: contentType.split(";")[0] || "image/png",
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadError) {
    return json({ ok: false, fallback: "live", message: "Could not persist the thumbnail." }, 500);
  }

  const { data: publicData } = admin.storage
    .from("lesson-check-thumbnails")
    .getPublicUrl(filePath);
  const thumbnailUrl = publicData?.publicUrl || "";
  if (!thumbnailUrl) {
    return json({ ok: false, fallback: "live", message: "Could not resolve the thumbnail URL." }, 500);
  }

  const generatedAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from("lesson_check_activities")
    .update({
      thumbnail_url: thumbnailUrl,
      thumbnail_generated_at: generatedAt,
      thumbnail_source_updated_at: contentUpdatedAt,
      thumbnail_profile: THUMBNAIL_PROFILE,
    })
    .eq("id", activityId);

  if (updateError) {
    return json({ ok: false, fallback: "live", message: "Thumbnail was saved but metadata update failed." }, 500);
  }

  const { data: existingObjects } = await admin.storage
    .from("lesson-check-thumbnails")
    .list(activityId, { limit: 100 });
  const stalePaths = (existingObjects || [])
    .filter((item) => item.name && item.name !== fileName)
    .map((item) => `${activityId}/${item.name}`);
  if (stalePaths.length) {
    await admin.storage.from("lesson-check-thumbnails").remove(stalePaths);
  }

  return json({
    ok: true,
    cached: false,
    thumbnailUrl,
    generatedAt,
    profile: THUMBNAIL_PROFILE,
  });
});
