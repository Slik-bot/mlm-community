import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const PLANS: Record<string, { tariff: string; price: number }> = {
  basic: { tariff: "pro", price: 59900 },
  pro: { tariff: "business", price: 149000 },
  vip: { tariff: "academy", price: 299000 },
};

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
    const { plan_type } = await req.json();
    const plan = PLANS[plan_type];
    if (!plan) {
      return json({ error: "Неверный тип подписки (basic/pro/vip)" }, 400);
    }

    // 2. Проверить баланс
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, balance, tariff")
      .eq("id", userId)
      .single();

    if (userError || !user) return json({ error: "Пользователь не найден" }, 404);
    if ((user.balance || 0) < plan.price) {
      return json({ error: "Недостаточно средств" }, 400);
    }

    // 3. Списать баланс
    const newBalance = (user.balance || 0) - plan.price;
    await supabase
      .from("users")
      .update({ balance: newBalance, tariff: plan.tariff })
      .eq("id", userId);

    // 4. Создать подписку (30 дней)
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        tariff: plan.tariff,
        price: plan.price,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        expires_at: endsAt.toISOString(),
        is_active: true,
        status: "active",
      })
      .select("id")
      .single();

    if (subError) throw subError;

    // 5. Транзакция
    await supabase.from("transactions").insert({
      user_id: userId,
      type: "purchase",
      amount: -plan.price,
      balance_after: newBalance,
      reference_type: "subscription",
      reference_id: sub.id,
      description: `Подписка ${plan.tariff}`,
    });

    // 6. Уведомление
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "system",
      title: "Подписка оформлена",
      body: `Тариф ${plan.tariff.toUpperCase()} активен до ${endsAt.toLocaleDateString("ru-RU")}`,
      action_type: "none",
    });

    return json({
      success: true,
      tariff: plan.tariff,
      expires_at: endsAt.toISOString(),
      subscription_id: sub.id,
    });
  } catch (err) {
    console.error("purchase-subscription error:", err.message);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
