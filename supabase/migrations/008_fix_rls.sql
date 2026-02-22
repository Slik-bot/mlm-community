BEGIN;

-- ═══════════════════════════════════════════════════
-- MLM COMMUNITY — RLS FIXES v1.0
-- 008_fix_rls.sql
-- Исправления критических проблем безопасности RLS
-- ═══════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════
-- FIX 1: users — утечка balance/email/telegram_id для анонимов
-- ═══════════════════════════════════════════════════
--
-- ПРОБЛЕМА: политика users_select_all использовала USING (true) без
-- TO authenticated. Любой анонимный пользователь мог прочитать ВСЕ
-- поля ВСЕХ пользователей, включая balance, email, telegram_id.
--
-- РЕШЕНИЕ: две политики + security_barrier view.
-- 1) users_select_own — полный доступ к своей строке (все поля)
-- 2) vw_public_profiles — view с только публичными полями для чтения
--    других пользователей (скрывает balance, email, telegram_id,
--    xp_balance, ban_reason, streak_days)
--
-- ВАЖНО: auth.uid() = users.id (подтверждено в auth-email и
-- auth-telegram Edge Functions — оба ставят id: authData.user.id)
-- ═══════════════════════════════════════════════════

-- 1a. Удалить старую небезопасную политику (анонимный SELECT)
DROP POLICY IF EXISTS "users_select_all" ON users;

-- 1b. Только авторизованный пользователь видит СВОЮ строку целиком
-- (balance, email, telegram_id, xp_balance, ban_reason, streak_days)
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 1c. View для публичных данных других пользователей
-- security_barrier = true предотвращает утечку данных через оптимизатор
-- Используется фронтендом для загрузки чужих профилей, списков, JOINов
CREATE OR REPLACE VIEW vw_public_profiles
  WITH (security_barrier = true)
AS
SELECT
  id,
  name,
  avatar_url,
  bio,
  dna_type,
  dna_profile,
  level,
  level_stars,
  xp_total,
  is_verified,
  company_id,
  specialization,
  referral_code,
  auth_provider,
  created_at,
  last_active_at
FROM users;

-- Доступ к view только для авторизованных (анонимы заблокированы)
GRANT SELECT ON vw_public_profiles TO authenticated;
REVOKE SELECT ON vw_public_profiles FROM anon;

-- 1d. Хелпер-функция для получения полного профиля текущего пользователя
-- SECURITY DEFINER — обходит RLS, поэтому проверяет auth.uid() явно
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF users
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT * FROM users WHERE id = auth.uid();
$$;


-- ═══════════════════════════════════════════════════
-- FIX 2: orders — SELECT без TO authenticated
-- ═══════════════════════════════════════════════════
--
-- ПРОБЛЕМА: политика orders_select_all использовала USING (true) без
-- TO authenticated. Анонимы видели все заказы с budget_min/budget_max.
-- ═══════════════════════════════════════════════════

DROP POLICY IF EXISTS "orders_select_all" ON orders;

CREATE POLICY "orders_select_authenticated"
  ON orders FOR SELECT
  TO authenticated
  USING (true);


-- ═══════════════════════════════════════════════════
-- FIX 3: order_responses — SELECT без TO authenticated
-- ═══════════════════════════════════════════════════
--
-- ПРОБЛЕМА: политика order_responses_select_all использовала USING (true)
-- без TO authenticated. Анонимы видели proposed_price откликов.
-- ═══════════════════════════════════════════════════

DROP POLICY IF EXISTS "order_responses_select_all" ON order_responses;

CREATE POLICY "order_responses_select_authenticated"
  ON order_responses FOR SELECT
  TO authenticated
  USING (true);


-- ═══════════════════════════════════════════════════
-- МИГРАЦИЯ ФРОНТЕНДА (справочная информация)
-- ═══════════════════════════════════════════════════
--
-- После применения этой миграции фронтенд должен:
--
-- 1. Загрузка СВОЕГО профиля (balance, email видны):
--    sb.from('users').select('*').eq('id', currentUser.id).single()
--    ИЛИ: sb.rpc('get_my_profile')
--
-- 2. Загрузка ЧУЖИХ профилей (только публичные поля):
--    sb.from('vw_public_profiles').select('*')
--
-- 3. JOINы к пользователям в других таблицах:
--    БЫЛО:  .select('*, user:users(id, name, avatar_url, dna_type)')
--    СТАЛО: .select('*, user:vw_public_profiles(id, name, avatar_url, dna_type)')
--
-- 4. Edge Functions (service_role) — БЕЗ ИЗМЕНЕНИЙ,
--    service_role обходит RLS полностью.
-- ═══════════════════════════════════════════════════

COMMIT;
