BEGIN;

-- ═══════════════════════════════════════════════════
-- MLM COMMUNITY — RLS POLICIES v1.0
-- 002_rls.sql
-- Включение RLS и политики доступа для всех 54 таблиц
-- НЕ содержит DROP, INSERT, изменения схемы
-- ═══════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════
-- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
-- ═══════════════════════════════════════════════════

-- Проверка участия в беседе (SECURITY DEFINER — обходит RLS, избегает рекурсии)
CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

-- Проверка участия в сделке (SECURITY DEFINER — обходит RLS, избегает рекурсии)
CREATE OR REPLACE FUNCTION public.is_deal_participant(d_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deals
    WHERE id = d_id AND (client_id = auth.uid() OR expert_id = auth.uid())
  );
$$;


-- ═══════════════════════════════════════════════════
-- ВКЛЮЧЕНИЕ RLS НА ВСЕХ 54 ТАБЛИЦАХ
-- ═══════════════════════════════════════════════════

-- Группа А: Админ (5)
ALTER TABLE platform_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_rates               ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log        ENABLE ROW LEVEL SECURITY;

-- Группа Б: Компании (3)
ALTER TABLE companies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliances              ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_promotions    ENABLE ROW LEVEL SECURITY;

-- Группа В: Пользователи (6)
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats             ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links           ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions     ENABLE ROW LEVEL SECURITY;

-- Группа Г: Контент (3)
ALTER TABLE posts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions              ENABLE ROW LEVEL SECURITY;

-- Группа Д: Эксперты (3)
ALTER TABLE expert_cards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_responses        ENABLE ROW LEVEL SECURITY;

-- Группа Е: Магазин (3)
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases              ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                ENABLE ROW LEVEL SECURITY;

-- Группа Ж: Коммуникация (3)
ALTER TABLE conversations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages               ENABLE ROW LEVEL SECURITY;

-- Группа З: Форум и Друзья (3)
ALTER TABLE forum_topics           ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends                ENABLE ROW LEVEL SECURITY;

-- Группа И: Сделки (2)
ALTER TABLE deals                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_milestones        ENABLE ROW LEVEL SECURITY;

-- Группа К: Финансы (4)
ALTER TABLE transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals            ENABLE ROW LEVEL SECURITY;

-- Группа Л: Задания (3)
ALTER TABLE ad_campaigns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions       ENABLE ROW LEVEL SECURITY;

-- Группа М: Конкурсы (3)
ALTER TABLE contests               ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_winners        ENABLE ROW LEVEL SECURITY;

-- Группа Н: Обучение (4)
ALTER TABLE courses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates           ENABLE ROW LEVEL SECURITY;

-- Группа О: Матчинг (2)
ALTER TABLE matches                ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorships            ENABLE ROW LEVEL SECURITY;

-- Группа П: Вебинары (2)
ALTER TABLE webinars               ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_registrations  ENABLE ROW LEVEL SECURITY;

-- Группа Р: Система (5)
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE strikes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports                ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue       ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests  ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════
-- ПОЛИТИКИ ДОСТУПА
-- ═══════════════════════════════════════════════════


-- ═══ ГРУППА А: АДМИН-ТАБЛИЦЫ ═══
-- platform_settings, xp_rates, admin_users, admin_sessions, admin_audit_log
-- RLS включён, политик НЕТ — доступ ТОЛЬКО через service_role (Edge Functions)


-- ═══ ГРУППА Б: КОМПАНИИ ═══

-- companies: SELECT для всех, INSERT authenticated, UPDATE/DELETE через service_role
CREATE POLICY "companies_select_all"
  ON companies FOR SELECT
  USING (true);

CREATE POLICY "companies_insert_authenticated"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- alliances: SELECT для всех, INSERT/UPDATE только создатель (created_by)
CREATE POLICY "alliances_select_all"
  ON alliances FOR SELECT
  USING (true);

CREATE POLICY "alliances_insert_own"
  ON alliances FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "alliances_update_own"
  ON alliances FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- alliance_promotions: SELECT для всех, INSERT через service_role
CREATE POLICY "alliance_promotions_select_all"
  ON alliance_promotions FOR SELECT
  USING (true);


-- ═══ ГРУППА В: ПОЛЬЗОВАТЕЛИ ═══

-- users: SELECT для всех (публичные профили), UPDATE только свой
-- INSERT/DELETE через service_role (Edge Functions)
CREATE POLICY "users_select_all"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- user_settings: все операции только свои
CREATE POLICY "user_settings_select_own"
  ON user_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_settings_insert_own"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings_update_own"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_settings_delete_own"
  ON user_settings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- user_stats: SELECT для всех (публичная статистика), UPDATE через service_role
CREATE POLICY "user_stats_select_all"
  ON user_stats FOR SELECT
  USING (true);

-- social_links: SELECT для всех, INSERT/UPDATE/DELETE свои
CREATE POLICY "social_links_select_all"
  ON social_links FOR SELECT
  USING (true);

CREATE POLICY "social_links_insert_own"
  ON social_links FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "social_links_update_own"
  ON social_links FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "social_links_delete_own"
  ON social_links FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- achievements: SELECT для всех, INSERT через service_role
CREATE POLICY "achievements_select_all"
  ON achievements FOR SELECT
  USING (true);

-- push_subscriptions: все операции только свои
CREATE POLICY "push_subscriptions_select_own"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_insert_own"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_update_own"
  ON push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_delete_own"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ═══ ГРУППА Г: КОНТЕНТ ═══

-- posts: SELECT одобренные + свои, INSERT/UPDATE/DELETE свои
CREATE POLICY "posts_select_visible"
  ON posts FOR SELECT
  USING (moderation_status = 'approved' OR author_id = auth.uid());

CREATE POLICY "posts_insert_authenticated"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "posts_update_own"
  ON posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "posts_delete_own"
  ON posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- comments: SELECT для всех, INSERT authenticated, UPDATE/DELETE свои
CREATE POLICY "comments_select_all"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "comments_insert_authenticated"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "comments_update_own"
  ON comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "comments_delete_own"
  ON comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- reactions: SELECT для всех, INSERT authenticated, DELETE свои
CREATE POLICY "reactions_select_all"
  ON reactions FOR SELECT
  USING (true);

CREATE POLICY "reactions_insert_authenticated"
  ON reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reactions_delete_own"
  ON reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ═══ ГРУППА Д: ЭКСПЕРТЫ ═══

-- expert_cards: SELECT активные + свои, INSERT/UPDATE свои
CREATE POLICY "expert_cards_select_visible"
  ON expert_cards FOR SELECT
  USING (is_active = true OR user_id = auth.uid());

CREATE POLICY "expert_cards_insert_own"
  ON expert_cards FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "expert_cards_update_own"
  ON expert_cards FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- orders: SELECT для всех, INSERT authenticated, UPDATE/DELETE свои (client_id)
CREATE POLICY "orders_select_all"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "orders_insert_authenticated"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "orders_update_own"
  ON orders FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "orders_delete_own"
  ON orders FOR DELETE
  TO authenticated
  USING (client_id = auth.uid());

-- order_responses: SELECT для всех, INSERT authenticated, UPDATE/DELETE свои (expert_id)
CREATE POLICY "order_responses_select_all"
  ON order_responses FOR SELECT
  USING (true);

CREATE POLICY "order_responses_insert_authenticated"
  ON order_responses FOR INSERT
  TO authenticated
  WITH CHECK (expert_id = auth.uid());

CREATE POLICY "order_responses_update_own"
  ON order_responses FOR UPDATE
  TO authenticated
  USING (expert_id = auth.uid());

CREATE POLICY "order_responses_delete_own"
  ON order_responses FOR DELETE
  TO authenticated
  USING (expert_id = auth.uid());


-- ═══ ГРУППА Е: МАГАЗИН ═══

-- products: SELECT активные + свои (author_id), INSERT/UPDATE свои
CREATE POLICY "products_select_visible"
  ON products FOR SELECT
  USING (is_active = true OR author_id = auth.uid());

CREATE POLICY "products_insert_own"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "products_update_own"
  ON products FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

-- purchases: SELECT/INSERT свои (buyer_id)
CREATE POLICY "purchases_select_own"
  ON purchases FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "purchases_insert_own"
  ON purchases FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

-- reviews: SELECT для всех, INSERT/UPDATE/DELETE свои (author_id)
CREATE POLICY "reviews_select_all"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "reviews_insert_own"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "reviews_update_own"
  ON reviews FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "reviews_delete_own"
  ON reviews FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());


-- ═══ ГРУППА Ж: КОММУНИКАЦИЯ ═══

-- conversations: SELECT участники (через helper-функцию), INSERT authenticated
CREATE POLICY "conversations_select_participant"
  ON conversations FOR SELECT
  TO authenticated
  USING (public.is_conversation_member(id));

CREATE POLICY "conversations_insert_authenticated"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- conversation_members: SELECT участник беседы или свой, UPDATE свои
CREATE POLICY "conversation_members_select_member"
  ON conversation_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_conversation_member(conversation_id));

CREATE POLICY "conversation_members_update_own"
  ON conversation_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- messages: SELECT/INSERT участник беседы, UPDATE/DELETE свои (sender_id)
CREATE POLICY "messages_select_participant"
  ON messages FOR SELECT
  TO authenticated
  USING (public.is_conversation_member(conversation_id));

CREATE POLICY "messages_insert_participant"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_member(conversation_id)
  );

CREATE POLICY "messages_update_own"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "messages_delete_own"
  ON messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());


-- ═══ ГРУППА З: ФОРУМ И ДРУЗЬЯ ═══

-- forum_topics: SELECT для всех, INSERT authenticated, UPDATE/DELETE свои
CREATE POLICY "forum_topics_select_all"
  ON forum_topics FOR SELECT
  USING (true);

CREATE POLICY "forum_topics_insert_authenticated"
  ON forum_topics FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "forum_topics_update_own"
  ON forum_topics FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "forum_topics_delete_own"
  ON forum_topics FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- forum_replies: SELECT для всех, INSERT authenticated, UPDATE/DELETE свои
CREATE POLICY "forum_replies_select_all"
  ON forum_replies FOR SELECT
  USING (true);

CREATE POLICY "forum_replies_insert_authenticated"
  ON forum_replies FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "forum_replies_update_own"
  ON forum_replies FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "forum_replies_delete_own"
  ON forum_replies FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- friends: SELECT свои (обе стороны), INSERT/UPDATE инициатор (user_a_id)
CREATE POLICY "friends_select_own"
  ON friends FOR SELECT
  TO authenticated
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

CREATE POLICY "friends_insert_own"
  ON friends FOR INSERT
  TO authenticated
  WITH CHECK (user_a_id = auth.uid());

CREATE POLICY "friends_update_own"
  ON friends FOR UPDATE
  TO authenticated
  USING (user_a_id = auth.uid());


-- ═══ ГРУППА И: СДЕЛКИ ═══

-- deals: SELECT/UPDATE участники, INSERT authenticated (клиент)
CREATE POLICY "deals_select_participant"
  ON deals FOR SELECT
  TO authenticated
  USING (client_id = auth.uid() OR expert_id = auth.uid());

CREATE POLICY "deals_insert_authenticated"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "deals_update_participant"
  ON deals FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid() OR expert_id = auth.uid());

-- deal_milestones: SELECT/UPDATE участники сделки (через helper-функцию)
CREATE POLICY "deal_milestones_select_participant"
  ON deal_milestones FOR SELECT
  TO authenticated
  USING (public.is_deal_participant(deal_id));

CREATE POLICY "deal_milestones_update_participant"
  ON deal_milestones FOR UPDATE
  TO authenticated
  USING (public.is_deal_participant(deal_id));


-- ═══ ГРУППА К: ФИНАНСЫ ═══

-- transactions: SELECT свои, INSERT через service_role
CREATE POLICY "transactions_select_own"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- referrals: SELECT свои (обе стороны)
CREATE POLICY "referrals_select_own"
  ON referrals FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- subscriptions: SELECT свои
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- withdrawals: SELECT свои, INSERT authenticated
CREATE POLICY "withdrawals_select_own"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "withdrawals_insert_own"
  ON withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ═══ ГРУППА Л: ЗАДАНИЯ ═══

-- ad_campaigns: SELECT одобрённые + свои, INSERT authenticated, UPDATE свои
CREATE POLICY "ad_campaigns_select_public"
  ON ad_campaigns FOR SELECT
  USING (
    status IN ('approved', 'active', 'completed')
    OR advertiser_id = auth.uid()
  );

CREATE POLICY "ad_campaigns_insert_authenticated"
  ON ad_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (advertiser_id = auth.uid());

CREATE POLICY "ad_campaigns_update_own"
  ON ad_campaigns FOR UPDATE
  TO authenticated
  USING (advertiser_id = auth.uid());

-- tasks: SELECT активные, INSERT/UPDATE через service_role
CREATE POLICY "tasks_select_active"
  ON tasks FOR SELECT
  USING (is_active = true);

-- task_completions: SELECT свои, INSERT authenticated
CREATE POLICY "task_completions_select_own"
  ON task_completions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "task_completions_insert_authenticated"
  ON task_completions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ═══ ГРУППА М: КОНКУРСЫ ═══

-- contests: SELECT для всех, INSERT/UPDATE через service_role
CREATE POLICY "contests_select_all"
  ON contests FOR SELECT
  USING (true);

-- contest_entries: SELECT свои, INSERT authenticated
CREATE POLICY "contest_entries_select_own"
  ON contest_entries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "contest_entries_insert_authenticated"
  ON contest_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- contest_winners: SELECT для всех, INSERT через service_role
CREATE POLICY "contest_winners_select_all"
  ON contest_winners FOR SELECT
  USING (true);


-- ═══ ГРУППА Н: ОБУЧЕНИЕ ═══

-- courses: SELECT для всех, INSERT/UPDATE через service_role
CREATE POLICY "courses_select_all"
  ON courses FOR SELECT
  USING (true);

-- lessons: SELECT для всех, INSERT/UPDATE через service_role
CREATE POLICY "lessons_select_all"
  ON lessons FOR SELECT
  USING (true);

-- user_courses: SELECT/INSERT/UPDATE свои
CREATE POLICY "user_courses_select_own"
  ON user_courses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_courses_insert_own"
  ON user_courses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_courses_update_own"
  ON user_courses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- certificates: SELECT для всех, INSERT через service_role
CREATE POLICY "certificates_select_all"
  ON certificates FOR SELECT
  USING (true);


-- ═══ ГРУППА О: МАТЧИНГ ═══

-- matches: SELECT свои, INSERT authenticated, UPDATE участники
CREATE POLICY "matches_select_own"
  ON matches FOR SELECT
  TO authenticated
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

CREATE POLICY "matches_insert_authenticated"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (user_a_id = auth.uid());

CREATE POLICY "matches_update_participant"
  ON matches FOR UPDATE
  TO authenticated
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- mentorships: SELECT свои (обе стороны)
CREATE POLICY "mentorships_select_own"
  ON mentorships FOR SELECT
  TO authenticated
  USING (mentor_id = auth.uid() OR mentee_id = auth.uid());


-- ═══ ГРУППА П: ВЕБИНАРЫ ═══

-- webinars: SELECT для всех, INSERT свои (host_id)
CREATE POLICY "webinars_select_all"
  ON webinars FOR SELECT
  USING (true);

CREATE POLICY "webinars_insert_own"
  ON webinars FOR INSERT
  TO authenticated
  WITH CHECK (host_id = auth.uid());

-- webinar_registrations: SELECT/INSERT/DELETE свои
CREATE POLICY "webinar_registrations_select_own"
  ON webinar_registrations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "webinar_registrations_insert_own"
  ON webinar_registrations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "webinar_registrations_delete_own"
  ON webinar_registrations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ═══ ГРУППА Р: СИСТЕМА ═══

-- notifications: SELECT/UPDATE свои, INSERT через service_role
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- strikes: SELECT свои, INSERT через service_role
CREATE POLICY "strikes_select_own"
  ON strikes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- reports: SELECT свои, INSERT authenticated
CREATE POLICY "reports_select_own"
  ON reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "reports_insert_authenticated"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- moderation_queue: RLS включён, политик НЕТ — доступ ТОЛЬКО через service_role

-- verification_requests: SELECT свои, INSERT authenticated
CREATE POLICY "verification_requests_select_own"
  ON verification_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "verification_requests_insert_authenticated"
  ON verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ═══ ПРОВЕРКА ═══
-- SELECT count(*) FROM pg_policies WHERE schemaname = 'public';
-- Ожидается: 114 политик

COMMIT;
