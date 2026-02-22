BEGIN;

-- ═══════════════════════════════════════════════════
-- MLM COMMUNITY — ALTER TABLES
-- 007_alter_tables.sql
-- Приведение subscriptions и referrals к актуальной схеме
-- Edge Functions используют is_active + expires_at
-- ═══════════════════════════════════════════════════


-- ═══ 1. SUBSCRIPTIONS — добавить недостающие столбцы ═══

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text;

-- Перенести данные ends_at → expires_at (если есть)
UPDATE subscriptions
  SET expires_at = ends_at
  WHERE expires_at IS NULL AND ends_at IS NOT NULL;


-- ═══ 2. REFERRALS — добавить недостающие столбцы ═══

ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS bonus_xp bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_frozen boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS bonus_expires_at timestamptz;


-- ═══ 3. ИНДЕКСЫ для новых столбцов ═══

CREATE INDEX IF NOT EXISTS idx_subscriptions_active
  ON subscriptions(expires_at) WHERE is_active = true;


-- ═══ 4. RLS-ПОЛИТИКИ для Edge Functions (INSERT/UPDATE) ═══

DROP POLICY IF EXISTS "subscriptions_insert_ef" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_ef" ON subscriptions;
DROP POLICY IF EXISTS "referrals_insert_ef" ON referrals;
DROP POLICY IF EXISTS "referrals_update_ef" ON referrals;

CREATE POLICY "subscriptions_insert_ef" ON subscriptions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "subscriptions_update_ef" ON subscriptions
  FOR UPDATE USING (true);

CREATE POLICY "referrals_insert_ef" ON referrals
  FOR INSERT WITH CHECK (true);
CREATE POLICY "referrals_update_ef" ON referrals
  FOR UPDATE USING (true);


-- ═══ ПРОВЕРКА ═══
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name IN ('subscriptions','referrals') ORDER BY table_name, ordinal_position;

COMMIT;
