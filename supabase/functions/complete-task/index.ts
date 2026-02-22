import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const LEVELS = ["pawn", "knight", "bishop", "rook", "queen", "king"];

serve(async (req) => {
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

    // 1. Проверить авторизацию
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
    const { task_id, screenshot_url } = await req.json();
    if (!task_id) return json({ error: "task_id обязателен" }, 400);

    // 2. Загрузить задание
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", task_id)
      .single();
    if (taskError || !task) return json({ error: "Задание не найдено" }, 404);

    if (!task.is_active) return json({ error: "Задание неактивно" }, 400);
    if (task.ends_at && new Date(task.ends_at) < new Date()) {
      return json({ error: "Задание истекло" }, 400);
    }

    // 3. Проверить дневной лимит выполнений
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("task_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("task_id", task_id)
      .gte("taken_at", `${today}T00:00:00`)
      .lt("taken_at", `${today}T23:59:59.999`);

    if ((count ?? 0) >= (task.max_per_user_day ?? 1)) {
      return json({ error: "Лимит выполнений на сегодня исчерпан" }, 400);
    }

    // 4. Проверить уровень пользователя
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, level, xp_total, xp_balance, balance")
      .eq("id", userId)
      .single();
    if (userError || !user) {
      return json({ error: "Пользователь не найден" }, 404);
    }

    if (LEVELS.indexOf(user.level) < LEVELS.indexOf(task.level_min)) {
      return json({ error: `Требуется уровень: ${task.level_min}` }, 403);
    }

    // 5. Определить статус: скриншот → pending (ручная проверка), иначе → approved
    const status = screenshot_url ? "pending" : "approved";

    // 6. Создать запись выполнения
    const { data: completion, error: completionError } = await supabase
      .from("task_completions")
      .insert({
        task_id,
        user_id: userId,
        status,
        proof_url: screenshot_url || null,
        verified_by: screenshot_url ? "manual" : "auto",
      })
      .select("id")
      .single();

    if (completionError) {
      return json({ error: completionError.message }, 500);
    }

    let xpAwarded = 0;

    // 7. Если approved — начислить награды
    if (status === "approved") {
      xpAwarded = Number(task.reward_xp) || 0;
      const moneyReward = task.reward_money || 0;
      const newXpTotal = (user.xp_total || 0) + xpAwarded;
      const newXpBalance = (user.xp_balance || 0) + xpAwarded;
      const newBalance = (user.balance || 0) + moneyReward;

      // Обновить XP и баланс пользователя
      await supabase
        .from("users")
        .update({
          xp_total: newXpTotal,
          xp_balance: newXpBalance,
          balance: newBalance,
        })
        .eq("id", userId);

      // Обновить статистику
      const { data: stats } = await supabase
        .from("user_stats")
        .select("tasks_completed")
        .eq("user_id", userId)
        .single();

      await supabase
        .from("user_stats")
        .update({
          tasks_completed: (stats?.tasks_completed || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      // Записать транзакцию
      await supabase.from("transactions").insert({
        user_id: userId,
        type: "task_reward",
        amount: moneyReward,
        xp_amount: xpAwarded,
        balance_after: newBalance,
        xp_after: newXpBalance,
        reference_type: "task",
        reference_id: task_id,
        description: `Задание: ${task.title}`,
      });

      // Отправить уведомление
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "progress",
        title: "Задание выполнено!",
        body: `+${xpAwarded} XP за «${task.title}»`,
        action_type: "open_screen",
        action_data: { screen: "scrTasks" },
      });
    }

    // 8. Вернуть результат
    return json({
      success: true,
      xp_awarded: xpAwarded,
      status,
      completion_id: completion.id,
    });
  } catch (err) {
    console.error("complete-task error:", err);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
