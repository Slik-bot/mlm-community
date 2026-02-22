-- ═══════════════════════════════════════
-- 009: Admin functions (SECURITY DEFINER)
-- Полный доступ к users для админки
-- Вызов только через service_role
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_get_users(
  tariff_filter text DEFAULT NULL,
  search_filter text DEFAULT NULL,
  dna_filter text DEFAULT NULL,
  page_num int DEFAULT 1,
  page_size int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  avatar_url text,
  dna_type text,
  level text,
  xp_total int,
  tariff text,
  balance numeric,
  telegram_id text,
  referral_code text,
  company_id uuid,
  last_active_at timestamptz,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.name,
    u.avatar_url,
    u.dna_type,
    u.level,
    u.xp_total,
    u.tariff,
    u.balance,
    u.telegram_id,
    u.referral_code,
    u.company_id,
    u.last_active_at,
    u.created_at,
    count(*) OVER() AS total_count
  FROM users u
  WHERE
    (tariff_filter IS NULL OR u.tariff = tariff_filter)
    AND (dna_filter IS NULL OR u.dna_type = dna_filter)
    AND (search_filter IS NULL OR u.name ILIKE '%' || search_filter || '%')
  ORDER BY u.created_at DESC
  LIMIT page_size
  OFFSET (page_num - 1) * page_size;
END;
$$;

-- Запретить вызов анонимным пользователям
REVOKE EXECUTE ON FUNCTION admin_get_users FROM anon;
REVOKE EXECUTE ON FUNCTION admin_get_users FROM authenticated;
