import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Распределение призов по местам (% от prize_pool)
const PRIZE_SPLIT = [0.50, 0.30, 0.20];

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

    // 2. Проверить admin role
    const { data: admin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", authUser.email)
      .eq("is_active", true)
      .maybeSingle();

    if (!admin) return json({ error: "Доступ только для администратора" }, 403);

    const { contest_id } = await req.json();
    if (!contest_id) return json({ error: "contest_id обязателен" }, 400);

    // 3. Загрузить конкурс
    const { data: contest, error: contestError } = await supabase
      .from("contests")
      .select("id, status, prize_pool, entries_count")
      .eq("id", contest_id)
      .single();

    if (contestError || !contest) {
      return json({ error: "Конкурс не найден" }, 404);
    }
    if (contest.status !== "closed") {
      return json({ error: "Конкурс должен быть в статусе closed" }, 400);
    }

    // 4. Загрузить участников
    const { data: entries, error: entriesError } = await supabase
      .from("contest_entries")
      .select("id, user_id, ticket_number, multiplier")
      .eq("contest_id", contest_id);

    if (entriesError) throw entriesError;
    if (!entries || entries.length === 0) {
      return json({ error: "Нет участников" }, 400);
    }

    // 5. Случайный розыгрыш с учётом multiplier
    const pool: typeof entries = [];
    for (const entry of entries) {
      const tickets = Math.max(1, Math.round(entry.multiplier || 1));
      for (let i = 0; i < tickets; i++) {
        pool.push(entry);
      }
    }

    // Перемешать (Fisher-Yates)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Выбрать уникальных победителей (до 3)
    const winnersCount = Math.min(3, entries.length);
    const selectedIds = new Set<string>();
    const winners: Array<{ entry: typeof entries[0]; place: number }> = [];

    for (const candidate of pool) {
      if (selectedIds.has(candidate.user_id)) continue;
      selectedIds.add(candidate.user_id);
      winners.push({ entry: candidate, place: winners.length + 1 });
      if (winners.length >= winnersCount) break;
    }

    // 6. Обновить статус конкурса → drawing
    await supabase
      .from("contests")
      .update({ status: "drawing" })
      .eq("id", contest_id);

    // 7. Записать победителей и начислить призы
    const prizePool = contest.prize_pool || 0;
    const results = [];

    for (const w of winners) {
      const share = PRIZE_SPLIT[w.place - 1] || 0;
      const prizeMoney = Math.round(prizePool * share);
      const prizeXp = Math.round(prizeMoney * 0.1);

      // Записать победителя
      await supabase.from("contest_winners").insert({
        contest_id,
        user_id: w.entry.user_id,
        entry_id: w.entry.id,
        place: w.place,
        prize_xp: prizeXp,
        prize_money: prizeMoney,
      });

      // Начислить приз пользователю
      const { data: user } = await supabase
        .from("users")
        .select("balance, xp_total, xp_balance")
        .eq("id", w.entry.user_id)
        .single();

      if (user) {
        await supabase
          .from("users")
          .update({
            balance: (user.balance || 0) + prizeMoney,
            xp_total: (user.xp_total || 0) + prizeXp,
            xp_balance: (user.xp_balance || 0) + prizeXp,
          })
          .eq("id", w.entry.user_id);

        // Транзакция
        await supabase.from("transactions").insert({
          user_id: w.entry.user_id,
          type: "reward",
          amount: prizeMoney,
          xp_amount: prizeXp,
          balance_after: (user.balance || 0) + prizeMoney,
          reference_type: "contest",
          reference_id: contest_id,
          description: `Приз за ${w.place}-е место в конкурсе`,
        });

        // Уведомление
        await supabase.from("notifications").insert({
          user_id: w.entry.user_id,
          type: "progress",
          title: `${w.place}-е место в конкурсе!`,
          body: `Вы выиграли ${(prizeMoney / 100).toLocaleString("ru-RU")} руб. и ${prizeXp} XP`,
          action_type: "open_screen",
          action_data: { screen: "scrContestDetail", contest_id },
        });
      }

      results.push({
        place: w.place,
        user_id: w.entry.user_id,
        prize_money: prizeMoney,
        prize_xp: prizeXp,
      });
    }

    // 8. Финализировать конкурс
    await supabase
      .from("contests")
      .update({ status: "completed", drawn_at: new Date().toISOString() })
      .eq("id", contest_id);

    return json({ success: true, winners: results });
  } catch (err) {
    console.error("draw-contest error:", err.message);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
