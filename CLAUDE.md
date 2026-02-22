# CLAUDE.md — MLM COMMUNITY

Ты — senior-разработчик проекта MLM Community.
Читай этот файл перед любой задачей.
Также читай: MASTER_RULES.md, ARCHITECTURE.md, PROJECT_MAP.md, WORKFLOW.md

## СТЕК
Vanilla HTML/CSS/JS, Supabase, Deno Edge Functions, Telegram WebApp SDK, Vercel, Vite

## СТАТУС ПРОЕКТА
- Фронт: https://mlm-community.vercel.app
- Supabase: tydavmiamwdrfjbcgwny
- Telegram бот: @mlm_community_bot
- БД схема: v5.1 (44 таблицы)

## ЗАДЕПЛОЕННЫЕ EDGE FUNCTIONS
- auth-email, auth-telegram, complete-task, telegram-webhook

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

## АКТУАЛЬНЫЕ ТАБЛИЦЫ БД v5.1
users, user_settings, user_stats, posts, comments, reactions, companies, company_members, orders, order_responses, products, purchases, expert_cards, tasks, task_completions, contests, contest_entries, transactions, wallets, chats, messages, match_requests, match_connections, courses, lessons, enrollments, forum_topics, forum_posts, push_subscriptions, notifications, referral_links, alliance_promotions

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

## КЛЮЧЕВЫЕ ПОЛЯ users
id, supabase_auth_id, email, name, telegram_id, auth_provider, dna_type, level, xp_total, referral_code, avatar_url, last_active_at

## XP ТОЛЬКО ЧЕРЕЗ EDGE FUNCTION complete-task!

## СЛЕДУЮЩИЕ ЗАДАЧИ
1. Исправить admin-core.js (устаревшие таблицы)
2. Исправить comments.js (post_comments → comments)
3. Удалить supabase-config.js и supabase-api.js (LEGACY)
4. Исправить дубли функций (escapeHtml, showToast, loadExperts)
5. Edge Functions: send-push, process-deal-payment, purchase-product
6. PWA: manifest.json, sw.js
