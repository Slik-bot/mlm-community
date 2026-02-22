import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ═══ HMAC-SHA256 (Web Crypto API) ═══

async function hmacSHA256(
  key: ArrayBuffer | Uint8Array,
  data: string
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(data)
  );
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ═══ Telegram initData signature validation ═══

async function validateTelegramData(
  initData: string,
  botToken: string
): Promise<boolean> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  // data-check-string: all params except hash, sorted by key
  const entries: string[] = [];
  params.forEach((value, key) => {
    if (key !== "hash") entries.push(`${key}=${value}`);
  });
  entries.sort();
  const dataCheckString = entries.join("\n");

  // secret_key = HMAC-SHA256(key="WebAppData", msg=botToken)
  const secretKey = await hmacSHA256(
    new TextEncoder().encode("WebAppData"),
    botToken
  );

  // computed = HMAC-SHA256(key=secretKey, msg=dataCheckString)
  const computed = bufferToHex(await hmacSHA256(secretKey, dataCheckString));

  return computed === hash;
}

// ═══ Deterministic internal password for Telegram users ═══

async function derivePassword(
  telegramId: string,
  botToken: string
): Promise<string> {
  const raw = await hmacSHA256(
    new TextEncoder().encode(botToken),
    "tg_auth:" + telegramId
  );
  return "tg_" + bufferToHex(raw);
}

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
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return json({ error: "TELEGRAM_BOT_TOKEN not configured" }, 500);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { initData } = await req.json();
    if (!initData) {
      return json({ error: "initData is required" }, 400);
    }

    // ═══ 1. Validate Telegram signature ═══
    const isValid = await validateTelegramData(initData, botToken);
    if (!isValid) {
      return json({ error: "Invalid signature" }, 401);
    }

    // ═══ 2. Extract user data ═══
    const params = new URLSearchParams(initData);
    const userRaw = params.get("user");
    if (!userRaw) {
      return json({ error: "user not found in initData" }, 400);
    }

    const tgUser = JSON.parse(userRaw);
    const telegramId = String(tgUser.id);
    const firstName = tgUser.first_name || "";
    const lastName = tgUser.last_name || "";
    const username = tgUser.username || "";
    const photoUrl = tgUser.photo_url || "";
    const fullName =
      (firstName + " " + lastName).trim() || username || "Telegram User";

    const internalEmail = `tg_${telegramId}@telegram.mlm`;
    const internalPassword = await derivePassword(telegramId, botToken);

    // ═══ 3. Find existing user ═══
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (existingUser) {
      // ═══ LOGIN existing Telegram user ═══
      const { data: signIn, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: internalEmail,
          password: internalPassword,
        });
      if (signInError) return json({ error: signInError.message }, 401);

      // Update last_active_at and avatar
      await supabase
        .from("users")
        .update({
          last_active_at: new Date().toISOString(),
          ...(photoUrl && { avatar_url: photoUrl }),
        })
        .eq("id", existingUser.id);

      return json({ user: existingUser, session: signIn.session });
    }

    // ═══ 4. REGISTER new Telegram user ═══
    try {
      // 4a. Create Supabase Auth user
      let authData, authError;
      try {
        const result = await supabase.auth.admin.createUser({
          email: internalEmail,
          password: internalPassword,
          email_confirm: true,
        });
        authData = result.data;
        authError = result.error;
      } catch (e) {
        console.error('createUser EXCEPTION:', e.message);
        return json({ error: 'createUser exception: ' + e.message }, 500);
      }
      if (authError) return json({ error: authError.message }, 400);

      const userId = authData.user.id;

      // 4b. Generate unique referral_code (8 chars)
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

      // 4c. INSERT into users
      const { error: userError } = await supabase.from("users").insert({
        id: userId,
        telegram_id: telegramId,
        name: fullName,
        telegram_username: username,
        avatar_url: photoUrl,
        auth_provider: "telegram",
        supabase_auth_id: userId,
        referral_code: referralCode,
      });

      if (userError) {
        await supabase.auth.admin.deleteUser(userId);
        return json({ error: userError.message }, 500);
      }

      // 4d. Default user_settings
      const { error: settingsError } = await supabase.from("user_settings").insert({ user_id: userId });

      // 4e. Default user_stats
      const { error: statsError } = await supabase.from("user_stats").insert({ user_id: userId });

      // 4f. Sign in for session
      const { data: signIn, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: internalEmail,
          password: internalPassword,
        });
      if (signInError) return json({ error: signInError.message }, 500);

      const { data: fullUser } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      return json({ user: fullUser, session: signIn.session });
    } catch (createErr) {
      console.error('CREATE USER BLOCK ERROR:', createErr.message, createErr.stack);
      return json({ error: createErr.message }, 500);
    }
  } catch (err) {
    console.error("auth-telegram error:", err.message);
    return json({ error: "Internal server error" }, 500);
  }
});
