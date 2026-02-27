import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const RATE_LIMIT = 5;
const CODE_TTL_MS = 600000; // 10 минут
const MAX_ATTEMPTS = 3;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function buildEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#06060b;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#06060b;padding:40px 0;">
<tr><td align="center">
<table width="420" cellpadding="0" cellspacing="0" style="background:#0f0f17;border-radius:16px;border:1px solid rgba(255,255,255,0.06);padding:40px;">
  <tr><td align="center" style="padding-bottom:32px;">
    <span style="font-size:28px;font-weight:700;color:#fff;letter-spacing:2px;">TRAFIQO</span>
  </td></tr>
  <tr><td align="center" style="padding-bottom:12px;">
    <span style="font-size:16px;color:rgba(255,255,255,0.6);">Ваш код подтверждения:</span>
  </td></tr>
  <tr><td align="center" style="padding-bottom:24px;">
    <div style="display:inline-block;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.3);border-radius:12px;padding:16px 32px;">
      <span style="font-size:32px;font-weight:700;color:#8b5cf6;letter-spacing:8px;">${code}</span>
    </div>
  </td></tr>
  <tr><td align="center" style="padding-bottom:24px;">
    <span style="font-size:14px;color:rgba(255,255,255,0.4);">Код действителен 10 минут</span>
  </td></tr>
  <tr><td align="center" style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;">
    <span style="font-size:12px;color:rgba(255,255,255,0.3);">Если вы не регистрировались — проигнорируйте это письмо</span>
  </td></tr>
  <tr><td align="center" style="padding-top:16px;">
    <span style="font-size:12px;color:rgba(255,255,255,0.2);">&copy; 2026 TRAFIQO</span>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

async function sendCode(
  supabase: ReturnType<typeof createClient>,
  email: string,
  userId: string
): Promise<{ data?: unknown; error?: string; status: number }> {
  const { count } = await supabase
    .from("email_verification_codes")
    .select("*", { count: "exact", head: true })
    .eq("email", email)
    .gt("created_at", new Date(Date.now() - 3600000).toISOString());

  if ((count ?? 0) >= RATE_LIMIT) {
    return { error: "Слишком много попыток. Подождите час.", status: 429 };
  }

  const code = generateCode();

  const { error: insertError } = await supabase
    .from("email_verification_codes")
    .insert({
      user_id: userId,
      email,
      code,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });
  if (insertError) return { error: insertError.message, status: 500 };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "TRAFIQO <onboarding@resend.dev>",
      to: email,
      subject: "Код подтверждения TRAFIQO",
      html: buildEmailHtml(code),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Resend API error:", errText);
    return { error: "Ошибка отправки письма", status: 500 };
  }

  return { data: { success: true, message: "Код отправлен" }, status: 200 };
}

async function verifyCode(
  supabase: ReturnType<typeof createClient>,
  email: string,
  userId: string,
  code: string
): Promise<{ data?: unknown; error?: string; status: number }> {
  const { data: record, error: selectError } = await supabase
    .from("email_verification_codes")
    .select("*")
    .eq("user_id", userId)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) return { error: selectError.message, status: 500 };
  if (!record) return { error: "Код не найден. Запросите новый.", status: 400 };

  if (new Date(record.expires_at) < new Date()) {
    return { error: "Код истёк. Запросите новый.", status: 400 };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { error: "Превышено количество попыток. Запросите новый код.", status: 400 };
  }

  const newAttempts = record.attempts + 1;
  await supabase
    .from("email_verification_codes")
    .update({ attempts: newAttempts })
    .eq("id", record.id);

  if (record.code !== code) {
    return {
      error: "Неверный код",
      data: { attempts_left: MAX_ATTEMPTS - newAttempts },
      status: 400,
    };
  }

  await supabase
    .from("email_verification_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", record.id);

  await supabase
    .from("users")
    .update({ email_verified: true })
    .eq("id", userId);

  return {
    data: { success: true, verified: true },
    status: 200,
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
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

    const body = await req.json();
    const { action, email, user_id, code } = body;

    if (action === "send-code") {
      if (!email || !user_id) {
        return json({ error: "email и user_id обязательны" }, 400);
      }
      const result = await sendCode(supabase, email, user_id);
      return json(result.error ? { error: result.error } : result.data, result.status);
    }

    if (action === "verify-code") {
      if (!email || !user_id || !code) {
        return json({ error: "email, user_id и code обязательны" }, 400);
      }
      const result = await verifyCode(supabase, email, user_id, code);
      if (result.error) {
        const errBody: Record<string, unknown> = { error: result.error };
        if (result.data && typeof result.data === "object" && "attempts_left" in result.data) {
          errBody.attempts_left = (result.data as { attempts_left: number }).attempts_left;
        }
        return json(errBody, result.status);
      }
      return json(result.data, result.status);
    }

    return json({ error: "Неизвестный action. Используйте: send-code, verify-code" }, 400);
  } catch (err) {
    console.error("verify-email error:", err);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
