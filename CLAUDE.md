# CLAUDE.md — TRAFIQO

Ты — senior-разработчик проекта TRAFIQO.
Читай этот файл перед любой задачей.
Также читай: MASTER_RULES.md, ARCHITECTURE.md, PROJECT_MAP.md, WORKFLOW.md

## СТЕК
Vanilla HTML/CSS/JS, Supabase, Deno Edge Functions, Telegram WebApp SDK, Vercel, Vite

## СТАТУС ПРОЕКТА
- Фронт: https://mlm-community.vercel.app
- Supabase: tydavmiamwdrfjbcgwny
- Telegram бот: @trafiqo_bot
- БД схема: v5.1 (54 таблицы)

## ЗАДЕПЛОЕННЫЕ EDGE FUNCTIONS (все 15 — ACTIVE)
- auth-email, auth-telegram, complete-task, telegram-webhook
- send-push, purchase-product, process-deal-payment
- update-streaks, expire-subscriptions, process-referral-monthly
- accept-deal, draw-contest, purchase-subscription, register-push-sub, request-withdrawal

## ЛИМИТЫ (ЖЕЛЕЗНЫЙ ЗАКОН)
- HTML: < 500 строк
- JS: < 500 строк
- CSS: < 800 строк
- Функция: < 50 строк

## ЗАПРЕЩЕНО
- React/Vue/jQuery
- console.log (только console.error в catch)
- innerHTML для пользовательского контента
- Emoji в UI (только SVG)
- var (только const/let)
- Дублировать функции
- Устаревшие таблицы БД

## АКТУАЛЬНЫЕ ТАБЛИЦЫ БД v5.1 (54 таблицы)
platform_settings, xp_rates, admin_users, admin_sessions, admin_audit_log, companies, alliances, alliance_promotions, users, user_settings, user_stats, social_links, achievements, push_subscriptions, posts, comments, reactions, expert_cards, orders, order_responses, products, purchases, reviews, conversations, conversation_members, messages, forum_topics, forum_replies, friends, deals, deal_milestones, transactions, referrals, subscriptions, withdrawals, ad_campaigns, tasks, task_completions, contests, contest_entries, contest_winners, courses, lessons, user_courses, certificates, matches, mentorships, webinars, webinar_registrations, notifications, strikes, reports, moderation_queue, verification_requests

## УСТАРЕВШИЕ ТАБЛИЦЫ (НЕ ИСПОЛЬЗОВАТЬ!)
profiles → users
post_comments → comments
post_likes → reactions
stories → posts
applications → order_responses
experts → expert_cards
tools → products
daily_quests → tasks
user_xp_log → transactions
wallets → users.balance
chats → conversations
match_requests → matches
match_connections → matches
enrollments → user_courses
forum_posts → forum_replies
referral_links → referrals
company_members → users.company_id

## КЛЮЧЕВЫЕ ПОЛЯ users
id, supabase_auth_id, email, name, telegram_id, auth_provider, dna_type, level, xp_total, referral_code, avatar_url, last_active_at

## XP ТОЛЬКО ЧЕРЕЗ EDGE FUNCTION complete-task!

## УТИЛИТЫ
- js/utils/dna.js — getDnaColor(), DNA_COLORS → window.getDnaColor, window.DNA_COLORS
- js/utils/format.js — showToast() → window.showToast

## ДОСТУП К ДАННЫМ ПОЛЬЗОВАТЕЛЕЙ
- Свой профиль: прямой запрос к таблице `users` (через RLS, auth.uid())
- Чужие профили: `vw_public_profiles` (публичный view, без email/tariff/balance)
- Админка: `sb.rpc('admin_get_users', {...})` — SECURITY DEFINER функция, только service_role

## СЛЕДУЮЩИЕ ЗАДАЧИ

### Выполнено
1. ✅ Исправить admin-core.js (поля: plan→tariff, xp→xp_total, streak→streak_days, karma удалён, reason→reason_category)
2. ✅ Исправить comments.js (поля: user_id→author_id, parent_comment_id→parent_id, reactions comment_id→target_type/target_id)
3. ✅ Исправить admin-data.js (plan→tariff, post_type→type, resolved_by→reviewed_by, action_type→description, xp_conversion→deposit)
4. ✅ supabase-config.js и supabase-api.js удалены (комментарий в index.html оставлен)
5. ✅ getDnaColor дедуплицирован → js/utils/dna.js (удалён из onboarding.js и profile.js)
6. ✅ DNA_COLORS дедуплицирован — локальная копия удалена из match.js, используется window.DNA_COLORS из dna.js
7. ✅ showToast вынесен из admin-core.js → js/utils/format.js, экспортирован как window.showToast
8. ✅ RLS политики проверены, создана SECURITY DEFINER функция admin_get_users (009_admin_functions.sql)
9. ✅ match.js: is_active → last_active_at (фильтр за 30 дней)
10. ✅ admin-data.js: loadUsers переведён на rpc('admin_get_users') вместо vw_public_profiles
11. ✅ Auth через Telegram Mini App — authTelegram() в js/api/auth.js, автовход в auth-core.js, заглушка удалена
12. ✅ Edge Functions: все 10 написаны и задеплоены (send-push, purchase-product, process-deal-payment, update-streaks, expire-subscriptions, process-referral-monthly)

### Приоритеты
1. Оптимизировать sw.js — убрать var, добавить все шаблоны в кеш
2. Настроить Supabase cron для: update-streaks (ежедневно), expire-subscriptions (ежедневно), process-referral-monthly (1-е число месяца)
3. Phase 3 — Companies (экраны 13-18)
4. Интеграция Edge Functions в UI: purchase-product (маркетплейс), process-deal-payment (сделки)
