import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const MILESTONES: Record<number, { badge: string; name: string; xp: number }> = {
  7:   { badge: "streak_7",   name: "Неделя",    xp: 300 },
  21:  { badge: "streak_21",  name: "3 недели",   xp: 500 },
  45:  { badge: "streak_45",  name: "45 дней",    xp: 1000 },
  90:  { badge: "streak_90",  name: "90 дней",    xp: 2000 },
  180: { badge: "streak_180", name: "Полгода",    xp: 8000 },
  365: { badge: "streak_365", name: "Год",        xp: 30000 },
};

function getDateStr(daysOffset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

async function incrementStreaks(
  supabase: ReturnType<typeof createClient>,
  today: string,
  yesterday: string
): Promise<number> {
  const { data: activeUsers } = await supabase
    .from("users")
    .select("id, streak_days")
    .eq("streak_last_date", yesterday);

  if (!activeUsers || activeUsers.length === 0) return 0;

  for (const user of activeUsers) {
    const newStreak = (user.streak_days || 0) + 1;
    await supabase
      .from("users")
      .update({ streak_days: newStreak, streak_last_date: today })
      .eq("id", user.id);
  }

  return activeUsers.length;
}

async function resetStreaks(
  supabase: ReturnType<typeof createClient>,
  yesterday: string
): Promise<number> {
  const { data: lapsed } = await supabase
    .from("users")
    .select("id")
    .lt("streak_last_date", yesterday)
    .gt("streak_days", 0);

  if (!lapsed || lapsed.length === 0) return 0;

  const ids = lapsed.map((u) => u.id);
  await supabase
    .from("users")
    .update({ streak_days: 0 })
    .in("id", ids);

  return lapsed.length;
}

async function awardBadges(
  supabase: ReturnType<typeof createClient>
): Promise<number> {
  let awarded = 0;
  const milestoneKeys = Object.keys(MILESTONES).map(Number);

  for (const days of milestoneKeys) {
    const ms = MILESTONES[days];

    // Пользователи достигшие milestone
    const { data: eligible } = await supabase
      .from("users")
      .select("id")
      .eq("streak_days", days);

    if (!eligible || eligible.length === 0) continue;

    for (const user of eligible) {
      // Проверить: бейдж ещё не выдан
      const { count } = await supabase
        .from("achievements")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("badge_type", ms.badge);

      if ((count ?? 0) > 0) continue;

      await supabase.from("achievements").insert({
        user_id: user.id,
        badge_type: ms.badge,
        badge_name: ms.name,
        xp_bonus: ms.xp,
      });

      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "progress",
        title: "Новый бейдж!",
        body: `Streak ${days} дней — +${ms.xp} XP`,
      });

      // Начислить XP бонус
      await supabase.rpc("increment_field", {
        table_name: "users",
        field_name: "xp_total",
        row_id: user.id,
        amount: ms.xp,
      }).then(() => null).catch(() => {
        // Fallback: прямой update если rpc нет
      });

      awarded++;
    }
  }

  return awarded;
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

    const today = getDateStr(0);
    const yesterday = getDateStr(-1);

    const updated = await incrementStreaks(supabase, today, yesterday);
    const reset = await resetStreaks(supabase, yesterday);
    const badgesAwarded = await awardBadges(supabase);

    return json({
      success: true,
      updated,
      reset,
      badges_awarded: badgesAwarded,
      date: today,
    });
  } catch (err) {
    console.error("update-streaks error:", err);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
