import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Требуется авторизация" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return json({ error: "Невалидный токен" }, 401);
    }

    const { endpoint, p256dh, auth } = await req.json();
    if (!endpoint || !p256dh || !auth) {
      return json({ error: "endpoint, p256dh, auth обязательны" }, 400);
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: authUser.id,
        endpoint,
        p256dh,
        auth,
      },
      { onConflict: "endpoint" }
    );

    if (error) throw error;

    return json({ success: true });
  } catch (err) {
    console.error("register-push-sub error:", err.message);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
