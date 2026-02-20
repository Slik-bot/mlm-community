import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, email, password, name } = await req.json();

    // ═══ REGISTER ═══
    if (action === "register") {
      if (!email || !password || !name) {
        return json({ error: "email, password и name обязательны" }, 400);
      }

      // 1. Создать пользователя в Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
      if (authError) return json({ error: authError.message }, 400);

      const userId = authData.user.id;

      // 2. Сгенерировать уникальный referral_code
      let referralCode = generateReferralCode();
      for (let i = 0; i < 10; i++) {
        const { data: exists } = await supabase
          .from("users")
          .select("id")
          .eq("referral_code", referralCode)
          .maybeSingle();
        if (!exists) break;
        referralCode = generateReferralCode();
      }

      // 3. INSERT в users
      const { error: userError } = await supabase.from("users").insert({
        id: userId,
        email,
        name,
        auth_provider: "email",
        supabase_auth_id: userId,
        referral_code: referralCode,
      });

      if (userError) {
        await supabase.auth.admin.deleteUser(userId);
        return json({ error: userError.message }, 500);
      }

      // 4. INSERT в user_settings (дефолтные)
      await supabase.from("user_settings").insert({ user_id: userId });

      // 5. INSERT в user_stats (нули)
      await supabase.from("user_stats").insert({ user_id: userId });

      // 6. Авторизовать для получения session
      const { data: signIn, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (signInError) return json({ error: signInError.message }, 500);

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      return json({ user, session: signIn.session });
    }

    // ═══ LOGIN ═══
    if (action === "login") {
      if (!email || !password) {
        return json({ error: "email и password обязательны" }, 400);
      }

      // 1. Авторизация
      const { data: signIn, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (signInError) return json({ error: signInError.message }, 401);

      // 2. Загрузить профиль
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("supabase_auth_id", signIn.user.id)
        .single();
      if (userError) return json({ error: "Профиль не найден" }, 404);

      // 3. Обновить last_active_at
      await supabase
        .from("users")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", user.id);

      return json({ user, session: signIn.session });
    }

    return json({ error: "Неизвестный action. Используйте: register, login" }, 400);
  } catch (err) {
    console.error("auth-email error:", err);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
