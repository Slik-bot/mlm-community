BEGIN;

-- ═══════════════════════════════════════════════════
-- MLM COMMUNITY — DATABASE SCHEMA v5.1
-- 001_schema.sql
-- Создание всех таблиц новой схемы
-- НЕ содержит DROP TABLE, RLS, INSERT
-- ═══════════════════════════════════════════════════


-- ═══ ГРУППА А: БЕЗ ЗАВИСИМОСТЕЙ ═══

CREATE TABLE platform_settings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key         text UNIQUE NOT NULL,
    value       jsonb NOT NULL DEFAULT '{}',
    description text,
    updated_at  timestamptz DEFAULT now(),
    updated_by  uuid
);

CREATE TABLE xp_rates (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type text UNIQUE NOT NULL,
    base_amount bigint NOT NULL DEFAULT 0,
    multiplier  decimal(4,2) DEFAULT 1.00,
    max_per_day int,
    is_active   boolean DEFAULT true,
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE admin_users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    name          text NOT NULL,
    role          text NOT NULL DEFAULT 'moderator'
                  CHECK (role IN ('super_admin','admin','moderator')),
    is_active     boolean DEFAULT true,
    last_login_at timestamptz,
    created_at    timestamptz DEFAULT now()
);

CREATE TABLE admin_sessions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id   uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token      text UNIQUE NOT NULL,
    ip_address inet,
    user_agent text,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE admin_audit_log (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id    uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    action      text NOT NULL,
    target_type text,
    target_id   uuid,
    details     jsonb DEFAULT '{}',
    ip_address  inet,
    created_at  timestamptz DEFAULT now()
);


-- ═══ ГРУППА Б: КОМПАНИИ (до users, т.к. users ссылается на companies) ═══

CREATE TABLE companies (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text NOT NULL,
    slug          text UNIQUE NOT NULL,
    logo_url      text,
    description   text,
    category      text,
    website       text,
    rating        decimal(3,2) DEFAULT 0,
    members_count int DEFAULT 0,
    reviews_count int DEFAULT 0,
    is_verified   boolean DEFAULT false,
    is_active     boolean DEFAULT true,
    meta          jsonb DEFAULT '{}',
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now()
);

CREATE TABLE alliances (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text NOT NULL,
    description   text,
    logo_url      text,
    created_by    uuid,  -- FK to users добавляется ниже (после CREATE TABLE users)
    members_count int DEFAULT 0,
    is_active     boolean DEFAULT true,
    created_at    timestamptz DEFAULT now()
);

CREATE TABLE alliance_promotions (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alliance_id      uuid NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    title            text NOT NULL,
    description      text,
    discount_percent smallint DEFAULT 0,
    starts_at        timestamptz,
    ends_at          timestamptz,
    is_active        boolean DEFAULT true,
    created_at       timestamptz DEFAULT now()
);


-- ═══ ГРУППА В: ПОЛЬЗОВАТЕЛИ ═══

CREATE TABLE users (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id        bigint UNIQUE,
    telegram_username  text,
    email              text UNIQUE,
    auth_provider      text DEFAULT 'telegram'
                       CHECK (auth_provider IN ('telegram','telegram_oauth','email')),
    supabase_auth_id   uuid UNIQUE,
    name               text NOT NULL,
    avatar_url         text,
    bio                text,
    dna_type           text CHECK (dna_type IN ('strategist','communicator','creator','analyst')),
    dna_profile        jsonb DEFAULT '{}',
    level              text DEFAULT 'pawn'
                       CHECK (level IN ('pawn','knight','bishop','rook','queen','king')),
    level_stars        smallint DEFAULT 0 CHECK (level_stars BETWEEN 0 AND 5),
    xp_total           bigint DEFAULT 0,
    balance            bigint DEFAULT 0,
    xp_balance         bigint DEFAULT 0,
    tariff             text DEFAULT 'free'
                       CHECK (tariff IN ('free','pro','business','academy')),
    streak_days        int DEFAULT 0,
    streak_last_date   date,
    referral_code      text UNIQUE NOT NULL,
    referred_by        uuid REFERENCES users(id),
    is_verified        boolean DEFAULT false,
    verification_level smallint DEFAULT 0,
    is_banned          boolean DEFAULT false,
    ban_reason         text,
    strikes_count      smallint DEFAULT 0,
    company_id         uuid REFERENCES companies(id),
    specialization     text[] DEFAULT '{}',
    last_active_at     timestamptz,
    created_at         timestamptz DEFAULT now()
);

-- Обратная FK: alliances.created_by → users
ALTER TABLE alliances
    ADD CONSTRAINT alliances_created_by_fk
    FOREIGN KEY (created_by) REFERENCES users(id);

-- Обратная FK: platform_settings.updated_by → users
ALTER TABLE platform_settings
    ADD CONSTRAINT platform_settings_updated_by_fk
    FOREIGN KEY (updated_by) REFERENCES users(id);

CREATE TABLE user_settings (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_telegram    boolean DEFAULT true,
    push_web         boolean DEFAULT true,
    push_native      boolean DEFAULT true,
    quiet_hours_from time DEFAULT '23:00',
    quiet_hours_to   time DEFAULT '07:00',
    language         text DEFAULT 'ru',
    theme            text DEFAULT 'dark',
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

CREATE TABLE user_stats (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    posts_count      int DEFAULT 0,
    comments_count   int DEFAULT 0,
    likes_given      int DEFAULT 0,
    likes_received   int DEFAULT 0,
    friends_count    int DEFAULT 0,
    deals_completed  int DEFAULT 0,
    tasks_completed  int DEFAULT 0,
    referrals_count  int DEFAULT 0,
    updated_at       timestamptz DEFAULT now()
);

CREATE TABLE social_links (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform    text NOT NULL,
    url         text NOT NULL,
    is_verified boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE achievements (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_type text NOT NULL,
    title            text NOT NULL,
    description      text,
    icon_url         text,
    xp_reward        bigint DEFAULT 0,
    unlocked_at      timestamptz DEFAULT now()
);

CREATE TABLE push_subscriptions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform   text NOT NULL CHECK (platform IN ('web','android','ios')),
    endpoint   text,
    p256dh     text,
    auth_key   text,
    fcm_token  text,
    is_active  boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);


-- ═══ ГРУППА Г: КОНТЕНТ ═══

CREATE TABLE posts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type              text NOT NULL DEFAULT 'post'
                      CHECK (type IN ('post','case','news','ad')),
    content           text NOT NULL,
    images            text[] DEFAULT '{}',
    poll_data         jsonb,
    likes_count       int DEFAULT 0,
    comments_count    int DEFAULT 0,
    views_count       int DEFAULT 0,
    shares_count      int DEFAULT 0,
    bookmarks_count   int DEFAULT 0,
    is_pinned         boolean DEFAULT false,
    is_published      boolean DEFAULT true,
    moderation_status text DEFAULT 'pending'
                      CHECK (moderation_status IN ('pending','approved','rejected')),
    moderated_by      uuid REFERENCES users(id),
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

CREATE TABLE comments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id   uuid REFERENCES comments(id) ON DELETE CASCADE,
    content     text NOT NULL,
    likes_count int DEFAULT 0,
    is_deleted  boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE reactions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type   text NOT NULL,
    target_id     uuid NOT NULL,
    reaction_type text NOT NULL DEFAULT 'like',
    created_at    timestamptz DEFAULT now(),
    UNIQUE (user_id, target_type, target_id)
);


-- ═══ ГРУППА Д: ЭКСПЕРТЫ ═══

CREATE TABLE expert_cards (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               text NOT NULL,
    description         text,
    hourly_rate         int DEFAULT 0,
    skills              text[] DEFAULT '{}',
    portfolio_pdfs      text[] DEFAULT '{}',
    portfolio_links     jsonb DEFAULT '[]',
    skill_tree          jsonb DEFAULT '{}',
    connectivity_score  decimal(5,2) DEFAULT 0,
    rating              decimal(3,2) DEFAULT 0,
    reviews_count       int DEFAULT 0,
    orders_completed    int DEFAULT 0,
    is_verified         boolean DEFAULT false,
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

CREATE TABLE orders (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             text NOT NULL,
    description       text,
    budget_min        int DEFAULT 0,
    budget_max        int DEFAULT 0,
    deadline          timestamptz,
    category          text,
    skills_required   text[] DEFAULT '{}',
    status            text DEFAULT 'open'
                      CHECK (status IN ('open','in_progress','completed','cancelled')),
    selected_expert_id uuid REFERENCES users(id),
    responses_count   int DEFAULT 0,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

CREATE TABLE order_responses (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id          uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    expert_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message           text,
    proposed_price    int DEFAULT 0,
    proposed_deadline timestamptz,
    status            text DEFAULT 'pending'
                      CHECK (status IN ('pending','accepted','rejected')),
    created_at        timestamptz DEFAULT now(),
    UNIQUE (order_id, expert_id)
);


-- ═══ ГРУППА Е: МАГАЗИН ═══

CREATE TABLE products (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         text NOT NULL,
    description   text,
    price         int NOT NULL DEFAULT 0,
    category      text,
    type          text DEFAULT 'digital',
    file_url      text,
    preview_url   text,
    cover_url     text,
    dna_match     text[] DEFAULT '{}',
    level_min     text DEFAULT 'pawn',
    rating        decimal(3,2) DEFAULT 0,
    reviews_count int DEFAULT 0,
    sales_count   int DEFAULT 0,
    is_active     boolean DEFAULT true,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now()
);

CREATE TABLE purchases (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price_paid int NOT NULL,
    status     text DEFAULT 'completed',
    created_at timestamptz DEFAULT now(),
    UNIQUE (buyer_id, product_id)
);

CREATE TABLE reviews (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type text NOT NULL
                CHECK (target_type IN ('product','deal','expert','webinar')),
    target_id   uuid NOT NULL,
    rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content     text,
    created_at  timestamptz DEFAULT now(),
    UNIQUE (author_id, target_type, target_id)
);


-- ═══ ГРУППА Ж: КОММУНИКАЦИЯ ═══

CREATE TABLE conversations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type            text NOT NULL CHECK (type IN ('personal','group','deal')),
    title           text,
    avatar_url      text,
    deal_id         uuid,  -- FK к deals добавляется ниже (после CREATE TABLE deals)
    last_message_at timestamptz,
    created_by      uuid REFERENCES users(id),
    created_at      timestamptz DEFAULT now()
);

CREATE TABLE conversation_members (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            text DEFAULT 'member',
    last_read_at    timestamptz,
    is_muted        boolean DEFAULT false,
    joined_at       timestamptz DEFAULT now(),
    UNIQUE (conversation_id, user_id)
);

CREATE TABLE messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            text NOT NULL DEFAULT 'text'
                    CHECK (type IN ('text','file','system','deal_action')),
    content         text,
    file_url        text,
    file_name       text,
    reply_to_id     uuid REFERENCES messages(id),
    is_edited       boolean DEFAULT false,
    is_deleted      boolean DEFAULT false,
    created_at      timestamptz DEFAULT now()
);


-- ═══ ГРУППА З: ФОРУМ И ДРУЗЬЯ ═══

CREATE TABLE forum_topics (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category      text NOT NULL
                  CHECK (category IN ('business','marketing','tools','education','newbies','cases','offtopic')),
    title         text NOT NULL,
    content       text NOT NULL,
    views_count   int DEFAULT 0,
    replies_count int DEFAULT 0,
    is_pinned     boolean DEFAULT false,
    is_locked     boolean DEFAULT false,
    last_reply_at timestamptz,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now()
);

CREATE TABLE forum_replies (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id    uuid NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
    author_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     text NOT NULL,
    likes_count int DEFAULT 0,
    is_best     boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE friends (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','blocked')),
    compatibility_score decimal(5,2),
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    UNIQUE (user_a_id, user_b_id)
);


-- ═══ ГРУППА И: СДЕЛКИ ═══

CREATE TABLE deals (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id        uuid NOT NULL REFERENCES users(id),
    expert_id        uuid NOT NULL REFERENCES users(id),
    order_id         uuid REFERENCES orders(id),
    title            text NOT NULL,
    description      text,
    total            int NOT NULL DEFAULT 0,
    prepayment       int DEFAULT 0,
    escrow           int DEFAULT 0,
    platform_fee     int DEFAULT 0,
    expert_payout    int DEFAULT 0,
    status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','accepted','paid','in_progress',
                            'submitted','revision','completed','disputed','cancelled')),
    max_revisions    smallint DEFAULT 3,
    current_revision smallint DEFAULT 0,
    deadline         timestamptz,
    completed_at     timestamptz,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

CREATE TABLE deal_milestones (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id      uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    title        text NOT NULL,
    description  text,
    amount       int DEFAULT 0,
    order_index  int NOT NULL DEFAULT 0,
    status       text DEFAULT 'pending'
                 CHECK (status IN ('pending','in_progress','submitted','approved','rejected')),
    due_date     timestamptz,
    completed_at timestamptz,
    created_at   timestamptz DEFAULT now()
);

-- Обратная FK: conversations.deal_id → deals
ALTER TABLE conversations
    ADD CONSTRAINT conversations_deal_id_fk
    FOREIGN KEY (deal_id) REFERENCES deals(id);


-- ═══ ГРУППА К: ФИНАНСЫ ═══

CREATE TABLE transactions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users(id),
    type           text NOT NULL
                   CHECK (type IN (
                       'deposit','withdrawal',
                       'deal_payment','deal_payout','deal_refund',
                       'platform_fee','referral_bonus','referral_monthly',
                       'task_reward','contest_prize',
                       'subscription_payment',
                       'product_purchase','product_sale',
                       'webinar_payment','webinar_payout',
                       'xp_purchase',
                       'mentor_payment','mentor_payout',
                       'ad_payment'
                   )),
    amount         bigint NOT NULL,
    xp_amount      bigint DEFAULT 0,
    balance_after  bigint NOT NULL,
    xp_after       bigint NOT NULL,
    currency       text DEFAULT 'RUB',
    reference_type text,
    reference_id   uuid,
    description    text,
    meta           jsonb DEFAULT '{}',
    created_at     timestamptz DEFAULT now()
);

CREATE TABLE referrals (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id      uuid NOT NULL REFERENCES users(id),
    referred_id      uuid NOT NULL REFERENCES users(id),
    bonus_amount     int DEFAULT 0,
    bonus_frozen     boolean DEFAULT true,
    bonus_expires_at timestamptz,
    monthly_rate     decimal(4,2) DEFAULT 15.00,
    is_active        boolean DEFAULT true,
    created_at       timestamptz DEFAULT now()
);

CREATE TABLE subscriptions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users(id),
    tariff         text NOT NULL
                   CHECK (tariff IN ('free','pro','business','academy')),
    price          int NOT NULL DEFAULT 0,
    is_trial       boolean DEFAULT false,
    auto_renew     boolean DEFAULT true,
    payment_method text,
    starts_at      timestamptz NOT NULL,
    ends_at        timestamptz NOT NULL,
    cancelled_at   timestamptz,
    status         text DEFAULT 'active'
                   CHECK (status IN ('active','cancelled','expired','past_due')),
    created_at     timestamptz DEFAULT now()
);

CREATE TABLE withdrawals (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              uuid NOT NULL REFERENCES users(id),
    amount               int NOT NULL,
    requisites_encrypted text NOT NULL,
    payment_method       text,
    status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','processing','completed','rejected')),
    processed_at         timestamptz,
    reject_reason        text,
    created_at           timestamptz DEFAULT now()
);


-- ═══ ГРУППА Л: ЗАДАНИЯ ═══

CREATE TABLE ad_campaigns (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id uuid NOT NULL REFERENCES users(id),
    title         text NOT NULL,
    description   text,
    package       text NOT NULL
                  CHECK (package IN ('starter','basic','advanced','maximum')),
    budget        int NOT NULL DEFAULT 0,
    spent         int DEFAULT 0,
    status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','active','completed','rejected')),
    starts_at     timestamptz,
    ends_at       timestamptz,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now()
);

CREATE TABLE tasks (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type             text NOT NULL CHECK (type IN ('platform','ad','business')),
    title            text NOT NULL,
    description      text,
    reward_xp        bigint NOT NULL,
    reward_money     int DEFAULT 0,
    dna_types        text[] DEFAULT '{}',
    required_socials text[] DEFAULT '{}',
    level_min        text DEFAULT 'pawn',
    max_completions  int,
    max_per_user_day smallint DEFAULT 1,
    advertiser_id    uuid REFERENCES users(id),
    ad_campaign_id   uuid REFERENCES ad_campaigns(id),
    is_active        boolean DEFAULT true,
    starts_at        timestamptz,
    ends_at          timestamptz,
    created_at       timestamptz DEFAULT now()
);

CREATE TABLE task_completions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','expired')),
    proof_url   text,
    proof_text  text,
    verified_by text DEFAULT 'auto',
    reviewed_at timestamptz,
    taken_at    timestamptz DEFAULT now()
);


-- ═══ ГРУППА М: КОНКУРСЫ ═══

CREATE TABLE contests (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title         text NOT NULL,
    description   text,
    category      text NOT NULL CHECK (category IN ('bronze','silver','gold')),
    entry_price   int DEFAULT 0,
    prize_pool    int DEFAULT 0,
    week_number   int NOT NULL,
    draw_seed     text,
    entries_count int DEFAULT 0,
    status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','closed','drawing','completed','cancelled')),
    starts_at     timestamptz,
    ends_at       timestamptz,
    drawn_at      timestamptz,
    created_at    timestamptz DEFAULT now()
);

CREATE TABLE contest_entries (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id    uuid NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_number int NOT NULL,
    multiplier    decimal(3,1) DEFAULT 1.0,
    created_at    timestamptz DEFAULT now(),
    UNIQUE (contest_id, user_id)
);

CREATE TABLE contest_winners (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id  uuid NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id),
    entry_id    uuid NOT NULL REFERENCES contest_entries(id),
    place       int NOT NULL,
    prize_xp    bigint NOT NULL,
    prize_money int NOT NULL,
    paid        boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
);


-- ═══ ГРУППА Н: ОБУЧЕНИЕ ═══

CREATE TABLE courses (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id      uuid NOT NULL REFERENCES users(id),
    title          text NOT NULL,
    description    text,
    cover_url      text,
    price          int DEFAULT 0,
    level          text DEFAULT 'beginner',
    dna_types      text[] DEFAULT '{}',
    lessons_count  int DEFAULT 0,
    students_count int DEFAULT 0,
    rating         decimal(3,2) DEFAULT 0,
    is_published   boolean DEFAULT false,
    created_at     timestamptz DEFAULT now(),
    updated_at     timestamptz DEFAULT now()
);

CREATE TABLE lessons (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id        uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title            text NOT NULL,
    content_type     text NOT NULL
                     CHECK (content_type IN ('text','video','quiz','practice')),
    content          jsonb NOT NULL,
    order_index      int NOT NULL,
    duration_minutes int DEFAULT 0,
    is_free_preview  boolean DEFAULT false,
    created_at       timestamptz DEFAULT now()
);

CREATE TABLE user_courses (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id         uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    progress_percent  decimal(5,2) DEFAULT 0,
    current_lesson_id uuid REFERENCES lessons(id),
    certificate_level text CHECK (certificate_level IN ('intern','specialist','pro')),
    started_at        timestamptz DEFAULT now(),
    completed_at      timestamptz,
    UNIQUE (user_id, course_id)
);

CREATE TABLE certificates (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id        uuid NOT NULL REFERENCES courses(id),
    certificate_hash text UNIQUE NOT NULL,
    level            text NOT NULL CHECK (level IN ('intern','specialist','pro')),
    issued_at        timestamptz DEFAULT now()
);


-- ═══ ГРУППА О: МАТЧИНГ И МЕНТОРСТВО ═══

CREATE TABLE matches (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_a_action         text NOT NULL
                          CHECK (user_a_action IN ('like','pass','superlike')),
    user_b_action         text DEFAULT 'pending'
                          CHECK (user_b_action IN ('pending','like','pass','superlike')),
    compatibility_score   decimal(5,2),
    compatibility_reasons jsonb,
    status                text DEFAULT 'pending'
                          CHECK (status IN ('pending','matched','expired')),
    created_at            timestamptz DEFAULT now(),
    matched_at            timestamptz,
    UNIQUE (user_a_id, user_b_id)
);

CREATE TABLE mentorships (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id     uuid NOT NULL REFERENCES users(id),
    mentee_id     uuid NOT NULL REFERENCES users(id),
    price         int DEFAULT 0,
    mentor_share  int DEFAULT 0,
    platform_fee  int DEFAULT 0,
    duration_months smallint DEFAULT 1,
    status        text DEFAULT 'pending'
                  CHECK (status IN ('pending','active','completed','cancelled')),
    renewed_count int DEFAULT 0,
    starts_at     timestamptz,
    ends_at       timestamptz,
    created_at    timestamptz DEFAULT now()
);


-- ═══ ГРУППА П: ВЕБИНАРЫ ═══

CREATE TABLE webinars (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id            uuid NOT NULL REFERENCES users(id),
    title              text NOT NULL,
    description        text,
    cover_url          text,
    price              int DEFAULT 0,
    max_participants   int,
    participants_count int DEFAULT 0,
    status             text NOT NULL DEFAULT 'scheduled'
                       CHECK (status IN ('scheduled','live','completed','cancelled')),
    promotion_tier     text DEFAULT 'free'
                       CHECK (promotion_tier IN ('free','basic','maximum')),
    stream_url         text,
    recording_url      text,
    starts_at          timestamptz NOT NULL,
    ends_at            timestamptz,
    created_at         timestamptz DEFAULT now()
);

CREATE TABLE webinar_registrations (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webinar_id   uuid NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminded     boolean DEFAULT false,
    attended     boolean DEFAULT false,
    registered_at timestamptz DEFAULT now(),
    UNIQUE (webinar_id, user_id)
);


-- ═══ ГРУППА Р: СИСТЕМА ═══

CREATE TABLE notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        text NOT NULL
                CHECK (type IN ('money','social','deal','progress','system')),
    title       text NOT NULL,
    body        text,
    action_type text DEFAULT 'none'
                CHECK (action_type IN ('open_screen','open_url','none')),
    action_data jsonb DEFAULT '{}',
    is_read     boolean DEFAULT false,
    is_pushed   boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE strikes (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       text NOT NULL CHECK (type IN ('warning','restrict_24h','restrict_7d','ban')),
    reason     text NOT NULL,
    issued_by  uuid REFERENCES admin_users(id),
    expires_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE reports (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id     uuid NOT NULL REFERENCES users(id),
    target_type     text NOT NULL
                    CHECK (target_type IN ('user','post','comment','product','deal','forum_topic')),
    target_id       uuid NOT NULL,
    reason_category text NOT NULL
                    CHECK (reason_category IN ('spam','fraud','abuse','inappropriate','other')),
    description     text,
    status          text DEFAULT 'pending'
                    CHECK (status IN ('pending','reviewed','resolved','dismissed')),
    reviewed_by     uuid REFERENCES admin_users(id),
    reviewed_at     timestamptz,
    created_at      timestamptz DEFAULT now()
);

CREATE TABLE moderation_queue (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type    text NOT NULL
                 CHECK (item_type IN ('expert_card','case','product','webinar','company','post')),
    item_id      uuid NOT NULL,
    submitted_by uuid NOT NULL REFERENCES users(id),
    priority     smallint DEFAULT 5,
    status       text DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','revision')),
    reviewer_id  uuid REFERENCES admin_users(id),
    review_note  text,
    created_at   timestamptz DEFAULT now(),
    reviewed_at  timestamptz
);

CREATE TABLE verification_requests (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type  text NOT NULL
                   CHECK (document_type IN ('passport','driver_license')),
    document_hash  text NOT NULL,
    document_url   text,
    selfie_url     text,
    ai_confidence  smallint CHECK (ai_confidence BETWEEN 0 AND 100),
    status         text DEFAULT 'pending'
                   CHECK (status IN ('pending','auto_approved','manual_review','approved','rejected')),
    reviewed_by    uuid REFERENCES admin_users(id),
    reject_reason  text,
    created_at     timestamptz DEFAULT now(),
    reviewed_at    timestamptz
);


-- ═══════════════════════════════════════════════════
-- ИНДЕКСЫ
-- ═══════════════════════════════════════════════════

-- users
CREATE INDEX idx_users_telegram_id     ON users (telegram_id);
CREATE INDEX idx_users_email           ON users (email);
CREATE INDEX idx_users_supabase_auth   ON users (supabase_auth_id);
CREATE INDEX idx_users_referral_code   ON users (referral_code);
CREATE INDEX idx_users_level           ON users (level);
CREATE INDEX idx_users_tariff          ON users (tariff);
CREATE INDEX idx_users_dna_type        ON users (dna_type);
CREATE INDEX idx_users_created_at      ON users (created_at);
CREATE INDEX idx_users_referred_by     ON users (referred_by);
CREATE INDEX idx_users_last_active     ON users (last_active_at);
CREATE INDEX idx_users_company_id      ON users (company_id);

-- posts
CREATE INDEX idx_posts_author_id       ON posts (author_id);
CREATE INDEX idx_posts_created_desc    ON posts (created_at DESC);
CREATE INDEX idx_posts_type            ON posts (type);
CREATE INDEX idx_posts_moderation      ON posts (moderation_status);

-- comments
CREATE INDEX idx_comments_post_id      ON comments (post_id);
CREATE INDEX idx_comments_author_id    ON comments (author_id);
CREATE INDEX idx_comments_parent_id    ON comments (parent_id);

-- reactions
CREATE INDEX idx_reactions_target      ON reactions (target_type, target_id);

-- expert_cards
CREATE INDEX idx_expert_cards_user     ON expert_cards (user_id);
CREATE INDEX idx_expert_cards_active   ON expert_cards (is_active) WHERE is_active = true;

-- orders
CREATE INDEX idx_orders_client_id      ON orders (client_id);
CREATE INDEX idx_orders_status         ON orders (status);

-- messages
CREATE INDEX idx_messages_conv_created ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender       ON messages (sender_id);

-- conversations
CREATE INDEX idx_conv_members_user     ON conversation_members (user_id);
CREATE INDEX idx_conv_members_conv     ON conversation_members (conversation_id);

-- forum
CREATE INDEX idx_forum_topics_category ON forum_topics (category);
CREATE INDEX idx_forum_topics_created  ON forum_topics (created_at DESC);
CREATE INDEX idx_forum_replies_topic   ON forum_replies (topic_id);

-- friends
CREATE INDEX idx_friends_user_a        ON friends (user_a_id);
CREATE INDEX idx_friends_user_b        ON friends (user_b_id);
CREATE INDEX idx_friends_status        ON friends (status);

-- deals
CREATE INDEX idx_deals_client_id       ON deals (client_id);
CREATE INDEX idx_deals_expert_id       ON deals (expert_id);
CREATE INDEX idx_deals_status          ON deals (status);

-- transactions
CREATE INDEX idx_tx_user_created       ON transactions (user_id, created_at DESC);
CREATE INDEX idx_tx_type               ON transactions (type);

-- referrals
CREATE INDEX idx_referrals_referrer    ON referrals (referrer_id);
CREATE INDEX idx_referrals_referred    ON referrals (referred_id);

-- subscriptions
CREATE INDEX idx_subs_user             ON subscriptions (user_id);
CREATE INDEX idx_subs_status           ON subscriptions (status);

-- tasks & completions
CREATE INDEX idx_tasks_type            ON tasks (type);
CREATE INDEX idx_tasks_campaign        ON tasks (ad_campaign_id);
CREATE INDEX idx_tasks_active          ON tasks (is_active) WHERE is_active = true;
CREATE INDEX idx_tc_user_taken         ON task_completions (user_id, taken_at DESC);
CREATE INDEX idx_tc_pending            ON task_completions (status) WHERE status = 'pending';

-- contests
CREATE INDEX idx_ce_contest            ON contest_entries (contest_id);
CREATE INDEX idx_ce_user               ON contest_entries (user_id);
CREATE INDEX idx_cw_contest            ON contest_winners (contest_id);

-- courses & lessons
CREATE INDEX idx_lessons_course_order  ON lessons (course_id, order_index);
CREATE INDEX idx_uc_user               ON user_courses (user_id);
CREATE INDEX idx_uc_course             ON user_courses (course_id);
CREATE INDEX idx_certs_user            ON certificates (user_id);

-- matches
CREATE INDEX idx_matches_user_a        ON matches (user_a_id);
CREATE INDEX idx_matches_user_b        ON matches (user_b_id);
CREATE INDEX idx_matches_status        ON matches (status);

-- webinars
CREATE INDEX idx_webinars_host         ON webinars (host_id);
CREATE INDEX idx_webinars_status       ON webinars (status);
CREATE INDEX idx_wr_webinar            ON webinar_registrations (webinar_id);
CREATE INDEX idx_wr_user               ON webinar_registrations (user_id);

-- notifications
CREATE INDEX idx_notif_user_created    ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notif_unread          ON notifications (user_id) WHERE is_read = false;

-- strikes
CREATE INDEX idx_strikes_user          ON strikes (user_id);

-- reports
CREATE INDEX idx_reports_status        ON reports (status);
CREATE INDEX idx_reports_target        ON reports (target_type, target_id);

-- moderation
CREATE INDEX idx_modq_status           ON moderation_queue (status);
CREATE INDEX idx_modq_type             ON moderation_queue (item_type);

-- verification
CREATE INDEX idx_verif_doc_hash        ON verification_requests (document_hash);
CREATE INDEX idx_verif_pending         ON verification_requests (status)
    WHERE status IN ('pending','manual_review');


-- ═══ ПРОВЕРКА ═══
-- SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Ожидается: 54

COMMIT;
