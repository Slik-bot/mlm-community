import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

async function validateDeal(
  supabase: ReturnType<typeof createClient>,
  dealId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from("deals")
    .select("id, client_id, executor_id, total, prepayment, escrow, status, conversation_id")
    .eq("id", dealId)
    .single();

  if (error || !data) return { error: "Сделка не найдена" };
  if (data.status !== "accepted") return { error: "Сделка не в статусе accepted" };
  if (data.client_id !== clientId) return { error: "Вы не являетесь клиентом этой сделки" };
  return { deal: data };
}

async function processPayment(
  supabase: ReturnType<typeof createClient>,
  deal: {
    id: string;
    client_id: string;
    executor_id: string;
    total: number;
    prepayment: number;
    escrow: number;
    conversation_id: string;
  }
) {
  // Списать с клиента
  const { data: client } = await supabase
    .from("users")
    .select("balance")
    .eq("id", deal.client_id)
    .single();

  const clientNewBalance = (client?.balance || 0) - deal.total;

  await supabase
    .from("users")
    .update({ balance: clientNewBalance })
    .eq("id", deal.client_id);

  // Начислить предоплату исполнителю
  const { data: executor } = await supabase
    .from("users")
    .select("balance")
    .eq("id", deal.executor_id)
    .single();

  const executorNewBalance = (executor?.balance || 0) + deal.prepayment;

  await supabase
    .from("users")
    .update({ balance: executorNewBalance })
    .eq("id", deal.executor_id);

  // Обновить статус сделки
  await supabase
    .from("deals")
    .update({ status: "paid" })
    .eq("id", deal.id);

  // Транзакция клиента
  await supabase.from("transactions").insert({
    user_id: deal.client_id,
    type: "deal_prepayment",
    amount: -deal.total,
    balance_after: clientNewBalance,
    reference_type: "deal",
    reference_id: deal.id,
    description: `Оплата сделки: ${deal.id}`,
  });

  // Транзакция исполнителя
  await supabase.from("transactions").insert({
    user_id: deal.executor_id,
    type: "deal_prepayment",
    amount: deal.prepayment,
    balance_after: executorNewBalance,
    reference_type: "deal",
    reference_id: deal.id,
    description: `Предоплата по сделке: ${deal.id}`,
  });

  // Системное сообщение в чат сделки
  if (deal.conversation_id) {
    await supabase.from("messages").insert({
      conversation_id: deal.conversation_id,
      sender_id: deal.client_id,
      type: "system",
      content: "Сделка оплачена. Предоплата зачислена исполнителю.",
    });
  }
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

    const client_id = authUser.id;

    // 2. Валидация входных данных
    const { deal_id } = await req.json();
    if (!deal_id) {
      return json({ error: "deal_id обязателен" }, 400);
    }

    // 3. Проверить сделку
    const dealResult = await validateDeal(supabase, deal_id, client_id);
    if (dealResult.error) return json({ error: dealResult.error }, 400);
    const deal = dealResult.deal!;

    // 4. Проверить баланс клиента
    const { data: client, error: clientError } = await supabase
      .from("users")
      .select("id, balance")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      return json({ error: "Клиент не найден" }, 404);
    }
    if ((client.balance || 0) < deal.total) {
      return json({ error: "Недостаточно средств" }, 400);
    }

    // 5. Провести оплату
    await processPayment(supabase, deal);

    // 6. Результат
    return json({
      success: true,
      deal_id: deal.id,
      prepayment_sent: deal.prepayment,
      escrow_held: deal.escrow,
      status: "paid",
    });
  } catch (err) {
    console.error("process-deal-payment error:", err);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
