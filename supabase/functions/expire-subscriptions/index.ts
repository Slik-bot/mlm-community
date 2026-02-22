import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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

async function findExpired(
  supabase: ReturnType<typeof createClient>
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, user_id")
    .eq("is_active", true)
    .lt("expires_at", new Date().toISOString());

  if (error) throw error;
  return data || [];
}

async function deactivateSubscription(
  supabase: ReturnType<typeof createClient>,
  sub: { id: string; user_id: string }
) {
  await supabase
    .from("subscriptions")
    .update({ is_active: false })
    .eq("id", sub.id);

  await supabase
    .from("users")
    .update({ tariff: "free" })
    .eq("id", sub.user_id);

  await supabase.from("notifications").insert({
    user_id: sub.user_id,
    type: "system",
    title: "Подписка истекла",
    body: "Твои данные в безопасности. Возобновить подписку?",
    action_type: "open_screen",
    action_data: { screen: "scrSubscription" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expired = await findExpired(supabase);

    for (const sub of expired) {
      await deactivateSubscription(supabase, sub);
    }

    return json({
      success: true,
      expired: expired.length,
      processed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("expire-subscriptions error:", err);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
