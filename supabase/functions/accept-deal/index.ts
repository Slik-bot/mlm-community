import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. JWT авторизация
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

    const userId = authUser.id;
    const { deal_id } = await req.json();
    if (!deal_id) return json({ error: "deal_id обязателен" }, 400);

    // 2. Загрузить сделку
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, client_id, executor_id, title, status")
      .eq("id", deal_id)
      .single();

    if (dealError || !deal) return json({ error: "Сделка не найдена" }, 404);
    if (deal.status !== "pending") {
      return json({ error: "Сделка не в статусе pending" }, 400);
    }
    if (deal.executor_id !== userId) {
      return json({ error: "Вы не являетесь исполнителем" }, 403);
    }

    // 3. Создать conversation для чата сделки
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({
        type: "deal",
        title: deal.title,
        deal_id: deal.id,
        created_by: userId,
      })
      .select("id")
      .single();

    if (convError) throw convError;

    // 4. Добавить участников
    await supabase.from("conversation_members").insert([
      { conversation_id: conv.id, user_id: deal.client_id, role: "member" },
      { conversation_id: conv.id, user_id: deal.executor_id, role: "member" },
    ]);

    // 5. Обновить статус сделки
    const { error: updateError } = await supabase
      .from("deals")
      .update({ status: "accepted", conversation_id: conv.id })
      .eq("id", deal.id);

    if (updateError) throw updateError;

    // 6. Уведомление клиенту
    await supabase.from("notifications").insert({
      user_id: deal.client_id,
      type: "deal",
      title: "Сделка принята",
      body: `Исполнитель принял сделку «${deal.title}»`,
      action_type: "open_screen",
      action_data: { screen: "scrDealDetail", deal_id: deal.id },
    });

    return json({ success: true, conversation_id: conv.id });
  } catch (err) {
    console.error("accept-deal error:", err.message);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
