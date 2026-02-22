import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

async function getActiveReferrals(
  supabase: ReturnType<typeof createClient>
) {
  const { data, error } = await supabase
    .from("referrals")
    .select("id, referrer_id, referred_id, monthly_rate")
    .eq("is_active", true)
    .eq("bonus_frozen", false);

  if (error) throw error;
  return data || [];
}

async function getActiveSubscription(
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  const { data } = await supabase
    .from("subscriptions")
    .select("id, price")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .single();

  return data;
}

async function payReferralBonus(
  supabase: ReturnType<typeof createClient>,
  referrerId: string,
  bonus: number,
  referralId: string
) {
  // Получить текущий баланс
  const { data: referrer } = await supabase
    .from("users")
    .select("balance")
    .eq("id", referrerId)
    .single();

  const newBalance = (referrer?.balance || 0) + bonus;

  await supabase
    .from("users")
    .update({ balance: newBalance })
    .eq("id", referrerId);

  await supabase.from("transactions").insert({
    user_id: referrerId,
    type: "referral_monthly",
    amount: bonus,
    balance_after: newBalance,
    reference_type: "referral",
    reference_id: referralId,
    description: `Реферальный бонус за месяц`,
  });

  await supabase.from("notifications").insert({
    user_id: referrerId,
    type: "money",
    title: "Реферальный бонус!",
    body: `Ваш реферал продлил подписку. +${bonus} руб.`,
  });
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

    const referrals = await getActiveReferrals(supabase);

    let processed = 0;
    let totalPaid = 0;

    for (const ref of referrals) {
      const sub = await getActiveSubscription(supabase, ref.referred_id);
      if (!sub) continue;

      const bonus = Math.round(sub.price * (ref.monthly_rate / 100));
      if (bonus <= 0) continue;

      await payReferralBonus(supabase, ref.referrer_id, bonus, ref.id);
      processed++;
      totalPaid += bonus;
    }

    return json({
      success: true,
      processed,
      total_paid: totalPaid,
      processed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("process-referral-monthly error:", err);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
