// ═══════════════════════════════════════
// SHARED CORS — MLM Community Edge Functions
// ═══════════════════════════════════════

const ALLOWED_ORIGINS = [
  "https://mlm-community.vercel.app",
  "https://tydavmiamwdrfjbcgwny.supabase.co",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".vercel.app") ||
    origin.startsWith("http://localhost:");
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
