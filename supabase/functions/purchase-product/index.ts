import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const PLATFORM_FEE_RATE = 0.20;

async function validateProduct(
  supabase: ReturnType<typeof createClient>,
  productId: string
) {
  const { data, error } = await supabase
    .from("products")
    .select("id, title, price, seller_id, moderation_status, is_active, sales_count")
    .eq("id", productId)
    .single();

  if (error || !data) return { error: "Товар не найден" };
  if (data.moderation_status !== "approved") return { error: "Товар не прошёл модерацию" };
  if (!data.is_active) return { error: "Товар неактивен" };
  return { product: data };
}

async function checkAlreadyPurchased(
  supabase: ReturnType<typeof createClient>,
  buyerId: string,
  productId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("purchases")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", buyerId)
    .eq("product_id", productId);
  return (count ?? 0) > 0;
}

async function processPayment(
  supabase: ReturnType<typeof createClient>,
  buyerId: string,
  product: { id: string; price: number; seller_id: string; sales_count: number }
) {
  const platformFee = Math.round(product.price * PLATFORM_FEE_RATE);
  const sellerReceived = product.price - platformFee;

  // Списать с покупателя
  const { data: buyer } = await supabase
    .from("users")
    .select("balance")
    .eq("id", buyerId)
    .single();

  const buyerNewBalance = (buyer?.balance || 0) - product.price;

  await supabase
    .from("users")
    .update({ balance: buyerNewBalance })
    .eq("id", buyerId);

  // Начислить продавцу
  const { data: seller } = await supabase
    .from("users")
    .select("balance")
    .eq("id", product.seller_id)
    .single();

  const sellerNewBalance = (seller?.balance || 0) + sellerReceived;

  await supabase
    .from("users")
    .update({ balance: sellerNewBalance })
    .eq("id", product.seller_id);

  // Запись покупки
  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      buyer_id: buyerId,
      product_id: product.id,
      price_paid: product.price,
      platform_fee: platformFee,
      seller_received: sellerReceived,
    })
    .select("id")
    .single();

  if (purchaseError) throw purchaseError;

  // Транзакция покупателя
  await supabase.from("transactions").insert({
    user_id: buyerId,
    type: "product_purchase",
    amount: -product.price,
    balance_after: buyerNewBalance,
    reference_type: "product",
    reference_id: product.id,
    description: `Покупка: ${product.id}`,
  });

  // Транзакция продавца
  await supabase.from("transactions").insert({
    user_id: product.seller_id,
    type: "product_sale",
    amount: sellerReceived,
    balance_after: sellerNewBalance,
    reference_type: "product",
    reference_id: product.id,
    description: `Продажа: ${product.id}`,
  });

  // Обновить счётчик продаж
  await supabase
    .from("products")
    .update({ sales_count: (product.sales_count || 0) + 1 })
    .eq("id", product.id);

  return { purchaseId: purchase.id, platformFee, sellerReceived };
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

    const user_id = authUser.id;

    // 2. Валидация входных данных
    const { product_id } = await req.json();
    if (!product_id) {
      return json({ error: "product_id обязателен" }, 400);
    }

    // 3. Проверить товар
    const productResult = await validateProduct(supabase, product_id);
    if (productResult.error) return json({ error: productResult.error }, 404);
    const product = productResult.product!;

    // 4. Покупатель != продавец
    if (product.seller_id === user_id) {
      return json({ error: "Нельзя купить свой товар" }, 400);
    }

    // 5. Не куплено ранее
    if (await checkAlreadyPurchased(supabase, user_id, product_id)) {
      return json({ error: "Товар уже куплен" }, 400);
    }

    // 6. Проверить баланс покупателя
    const { data: buyer, error: buyerError } = await supabase
      .from("users")
      .select("id, balance")
      .eq("id", user_id)
      .single();

    if (buyerError || !buyer) {
      return json({ error: "Покупатель не найден" }, 404);
    }
    if ((buyer.balance || 0) < product.price) {
      return json({ error: "Недостаточно средств" }, 400);
    }

    // 7. Провести оплату
    const result = await processPayment(supabase, user_id, product);

    // 8. Результат
    return json({
      success: true,
      purchase_id: result.purchaseId,
      price_paid: product.price,
      seller_received: result.sellerReceived,
      platform_fee: result.platformFee,
    });
  } catch (err) {
    console.error("purchase-product error:", err);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
