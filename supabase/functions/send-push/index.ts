import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_TYPES = ["money", "social", "deal", "progress", "system"];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isQuietHours(from: string | null, to: string | null): boolean {
  if (!from || !to) return false;

  const now = new Date();
  // UTC+3 (Moscow)
  const mskHour = (now.getUTCHours() + 3) % 24;
  const mskMinute = now.getUTCMinutes();
  const currentMinutes = mskHour * 60 + mskMinute;

  const [fromH, fromM] = from.split(":").map(Number);
  const [toH, toM] = to.split(":").map(Number);
  const fromMinutes = fromH * 60 + fromM;
  const toMinutes = toH * 60 + toM;

  // Handles overnight ranges (e.g. 23:00 - 08:00)
  if (fromMinutes <= toMinutes) {
    return currentMinutes >= fromMinutes && currentMinutes < toMinutes;
  }
  return currentMinutes >= fromMinutes || currentMinutes < toMinutes;
}

async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
): Promise<boolean> {
  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    }
  );
  return res.ok;
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

    // 1. Валидация входных данных
    const { user_id, title, body, type } = await req.json();

    if (!user_id || !title || !body || !type) {
      return json({ error: "user_id, title, body, type обязательны" }, 400);
    }
    if (!VALID_TYPES.includes(type)) {
      return json({ error: `type должен быть: ${VALID_TYPES.join(", ")}` }, 400);
    }

    // 2. Получить telegram_id пользователя
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("telegram_id")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return json({ error: "Пользователь не найден" }, 404);
    }

    // 3. Получить настройки push
    const { data: settings } = await supabase
      .from("user_settings")
      .select("push_telegram, quiet_hours_from, quiet_hours_to")
      .eq("user_id", user_id)
      .single();

    // 4. Проверить: push отключён?
    if (settings && settings.push_telegram === false) {
      return json({ sent: false, reason: "disabled" });
    }

    // 5. Проверить тихие часы
    if (settings && isQuietHours(settings.quiet_hours_from, settings.quiet_hours_to)) {
      return json({ sent: false, reason: "quiet_hours" });
    }

    // 6. Отправить через Telegram
    if (!user.telegram_id) {
      return json({ sent: false, reason: "no_telegram_id" });
    }

    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) {
      return json({ error: "TELEGRAM_BOT_TOKEN не настроен" }, 500);
    }

    const text = `${title}\n${body}`;
    const sent = await sendTelegramMessage(token, user.telegram_id, text);

    if (!sent) {
      return json({ sent: false, reason: "telegram_api_error" });
    }

    // 7. Обновить is_pushed у последнего непрочитанного уведомления
    const { data: notif } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", user_id)
      .eq("is_read", false)
      .eq("is_pushed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (notif) {
      await supabase
        .from("notifications")
        .update({ is_pushed: true })
        .eq("id", notif.id);
    }

    // 8. Результат
    return json({ sent: true, channel: "telegram" });
  } catch (err) {
    console.error("send-push error:", err);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
