// ═══════════════════════════════════════
// SHARED CORS — MLM Community Edge Functions
// ═══════════════════════════════════════

const ALLOWED_ORIGINS = [
  "https://mlm-community.vercel.app",
  "https://tydavmiamwdrfjbcgwny.supabase.co",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
