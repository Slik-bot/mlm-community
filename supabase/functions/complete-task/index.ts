import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ═══ XP ТАБЛИЦА (серверная копия gamification.js v1.0) ═══
const XP_TABLE = [
  { level: "pawn",   stars: 1, xpMin: 0 },
  { level: "pawn",   stars: 2, xpMin: 1000 },
  { level: "pawn",   stars: 3, xpMin: 3000 },
  { level: "pawn",   stars: 4, xpMin: 7000 },
  { level: "pawn",   stars: 5, xpMin: 15000 },
  { level: "knight", stars: 1, xpMin: 25000 },
  { level: "knight", stars: 2, xpMin: 60000 },
  { level: "knight", stars: 3, xpMin: 110000 },
  { level: "knight", stars: 4, xpMin: 180000 },
  { level: "knight", stars: 5, xpMin: 280000 },
  { level: "bishop", stars: 1, xpMin: 430000 },
  { level: "bishop", stars: 2, xpMin: 630000 },
  { level: "bishop", stars: 3, xpMin: 900000 },
  { level: "bishop", stars: 4, xpMin: 1250000 },
  { level: "bishop", stars: 5, xpMin: 1700000 },
  { level: "rook",   stars: 1, xpMin: 2300000 },
  { level: "rook",   stars: 2, xpMin: 3100000 },
  { level: "rook",   stars: 3, xpMin: 4000000 },
  { level: "rook",   stars: 4, xpMin: 5000000 },
  { level: "rook",   stars: 5, xpMin: 6000000 },
  { level: "queen",  stars: 1, xpMin: 7500000 },
  { level: "queen",  stars: 2, xpMin: 9000000 },
  { level: "queen",  stars: 3, xpMin: 11000000 },
  { level: "queen",  stars: 4, xpMin: 13000000 },
  { level: "queen",  stars: 5, xpMin: 15000000 },
  { level: "king",   stars: 1, xpMin: 25000000 },
];

const LEVEL_MULTS: Record<string, number> = {
  pawn: 1.0, knight: 1.0, bishop: 1.3,
  rook: 1.6, queen: 2.0, king: 2.5,
};

const STREAK_THRESHOLDS = [
  { days: 365, mult: 2.50 },
  { days: 270, mult: 2.00 },
  { days: 180, mult: 1.70 },
  { days: 150, mult: 1.50 },
  { days: 120, mult: 1.30 },
  { days: 90,  mult: 1.20 },
  { days: 45,  mult: 1.15 },
  { days: 21,  mult: 1.10 },
  { days: 7,   mult: 1.05 },
];

const LEVELS = ["pawn", "knight", "bishop", "rook", "queen", "king"];

function getLevelMultiplier(level: string): number {
  return LEVEL_MULTS[level] || 1.0;
}

function getStreakMultiplier(streakDays: number): number {
  for (const t of STREAK_THRESHOLDS) {
    if (streakDays >= t.days) return t.mult;
  }
  return 1.0;
}

function calculateLevel(xpTotal: number): { level: string; stars: number } {
  let found = XP_TABLE[0];
  for (const row of XP_TABLE) {
    if (xpTotal >= row.xpMin) found = row;
    else break;
  }
  return { level: found.level, stars: found.stars };
}

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
      .select("id, level, level_stars, xp_total, xp_balance, balance, streak_days")
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

    // 7. Если approved — начислить награды с множителями
    let baseXp = 0;
    let levelMult = 1;
    let streakMult = 1;
    let newXpTotal = user.xp_total || 0;
    let newLevel = user.level || "pawn";
    let newStars = user.level_stars || 1;
    const oldLevel = user.level || "pawn";
    const oldStars = user.level_stars || 1;

    if (status === "approved") {
      baseXp = Number(task.reward_xp) || 0;
      levelMult = getLevelMultiplier(user.level);
      streakMult = getStreakMultiplier(user.streak_days || 0);
      xpAwarded = Math.round(baseXp * levelMult * streakMult);
      const moneyReward = task.reward_money || 0;
      newXpTotal = (user.xp_total || 0) + xpAwarded;
      const newXpBalance = (user.xp_balance || 0) + xpAwarded;
      const newBalance = (user.balance || 0) + moneyReward;
      const calc = calculateLevel(newXpTotal);
      newLevel = calc.level;
      newStars = calc.stars;

      // Обновить XP, баланс, уровень и звёзды
      await supabase
        .from("users")
        .update({
          xp_total: newXpTotal,
          xp_balance: newXpBalance,
          balance: newBalance,
          level: newLevel,
          level_stars: newStars,
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
        body: `+${xpAwarded} XP за «${task.title}»` + (levelMult * streakMult > 1 ? ` (x${(levelMult * streakMult).toFixed(2)})` : ""),
        action_type: "open_screen",
        action_data: { screen: "scrTasks" },
      });
    }

    // 8. Вернуть результат
    return json({
      success: true,
      xp_awarded: xpAwarded,
      xp_total: newXpTotal,
      level: newLevel,
      level_stars: newStars,
      level_up: newLevel !== oldLevel,
      stars_up: newStars !== oldStars || newLevel !== oldLevel,
      status,
      completion_id: completion.id,
    });
  } catch (err) {
    console.error("complete-task error:", err);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
