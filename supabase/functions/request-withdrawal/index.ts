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
    const { amount, requisites } = await req.json();

    if (!amount || amount <= 0) {
      return json({ error: "Укажите корректную сумму" }, 400);
    }
    if (!requisites || !requisites.trim()) {
      return json({ error: "Укажите реквизиты" }, 400);
    }

    const amountCents = Math.round(amount * 100);

    // 2. Проверить баланс
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, balance")
      .eq("id", userId)
      .single();

    if (userError || !user) return json({ error: "Пользователь не найден" }, 404);
    if ((user.balance || 0) < amountCents) {
      return json({ error: "Недостаточно средств" }, 400);
    }

    // 3. Уменьшить баланс
    const newBalance = (user.balance || 0) - amountCents;
    await supabase
      .from("users")
      .update({ balance: newBalance })
      .eq("id", userId);

    // 4. Создать заявку на вывод
    const { data: withdrawal, error: wdError } = await supabase
      .from("withdrawals")
      .insert({
        user_id: userId,
        amount: amountCents,
        requisites_encrypted: requisites.trim(),
        status: "pending",
      })
      .select("id")
      .single();

    if (wdError) throw wdError;

    // 5. Транзакция
    await supabase.from("transactions").insert({
      user_id: userId,
      type: "withdrawal",
      amount: -amountCents,
      balance_after: newBalance,
      reference_type: "withdrawal",
      reference_id: withdrawal.id,
      description: "Заявка на вывод средств",
    });

    return json({ success: true, withdrawal_id: withdrawal.id });
  } catch (err) {
    console.error("request-withdrawal error:", err.message);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
