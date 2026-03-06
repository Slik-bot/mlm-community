# PROJECT MAP — TRAFIQO

> Полная карта проекта. Обновлено: 6 марта 2026

---

## СТРУКТУРА ПРОЕКТА

```
trafiqo/
├── index.html              ← Главная точка входа (281 строк)
├── admin.html              ← Админ-панель (81 строка)
├── sw.js                   ← Service Worker (126 строк)
├── manifest.json           ← PWA-манифест (25 строк)
├── vercel.json             ← Конфиг деплоя (15 строк)
├── vite.config.js          ← Dev-сервер (19 строк)
├── package.json            ← Зависимости (13 строк)
├── supabase-config.js      ← Legacy-заглушка (2 строки)
├── supabase-client.js      ← Legacy Supabase init (12 строк)
├── CLAUDE.md               ← Инструкции для AI
├── MASTER_RULES.md         ← Свод правил разработки
├── ARCHITECTURE.md         ← Архитектура и паттерны
├── PROJECT_MAP.md          ← Эта карта
├── WORKFLOW.md             ← Процессы работы
│
├── templates/              ← HTML-экраны (49 файлов, ~2714 строк)
├── js/                     ← JavaScript (71 файл, ~15531 строк)
│   ├── api/                ← API-модули (5 файлов)
│   ├── core/               ← Ядро: events, state, push, splash, telegram (5 файлов)
│   ├── utils/              ← Утилиты: dna, format, gamification, xp-animations, legacy (5 файлов)
│   ├── screens/            ← Логика экранов (28 файлов)
│   └── (root js/)          ← Feed, DNA, auth, admin, router и др. (28 файлов)
├── css/                    ← Стили (29 файлов, ~9419 строк)
├── assets/                 ← Изображения
├── supabase/
│   ├── functions/          ← Edge Functions (15 функций + _shared)
│   └── migrations/         ← SQL-миграции (12 файлов)
└── node_modules/           ← НЕ ТРОГАТЬ
```

---

## TEMPLATES — HTML-экраны (49 файлов, ~2810 строк)

| Файл | Строк | Описание |
|------|-------|----------|
| `landing.html` | 381 | Лендинг — hero, экосистема, тарифы, ДНК-секция |
| `dna-result.html` | 248 | Результат ДНК-теста — luxury-карточка, 3 таба |
| `companies.html` | 146 | Каталог компаний — фильтры, карточки, сортировка |
| `profile.html` | 89 | Профиль пользователя — шахматная фигура, звёзды |
| `feed.html` | 77 | Лента постов — фильтры, карточки, импульс |
| `webinar-detail.html` | 74 | Детали вебинара — описание, регистрация |
| `dna-test.html` | 68 | ДНК-тест — вопросы с карточками выбора |
| `deal-detail.html` | 64 | Детали сделки |
| `product-create.html` | 62 | Создание товара |
| `deal-create.html` | 61 | Создание сделки |
| `task-detail.html` | 59 | Детали задания |
| `product-detail.html` | 55 | Детали товара |
| `contest-detail.html` | 55 | Детали конкурса |
| `wallet.html` | 52 | Кошелёк — баланс, транзакции, вывод |
| `profile-settings.html` | 52 | Настройки профиля |
| `experts.html` | 51 | Каталог экспертов |
| `expert-detail.html` | 51 | Профиль эксперта |
| `verification.html` | 49 | Верификация аккаунта |
| `tasks.html` | 48 | Список заданий |
| `shop.html` | 48 | Магазин |
| `my-dna.html` | 45 | Экран «Моё ДНК» — карточка, сильные стороны, квесты |
| `quest.html` | 43 | Ежедневные квесты «Импульс» |
| `forum.html` | 43 | Форум |
| `course.html` | 43 | Страница курса |
| `become-expert.html` | 42 | Стать экспертом |
| `forum-topic.html` | 41 | Тема форума |
| `deal-list.html` | 41 | Список сделок |
| `chat-info.html` | 41 | Информация о чате |
| `chat.html` | 123 | Экран чата |
| `chat-list.html` | 53 | Список чатов |
| `academy.html` | 39 | Академия |
| `welcome.html` | 37 | Экран приветствия после регистрации |
| `setup3.html` | 37 | Онбординг шаг 3 — выбор интересов |
| `forum-create.html` | 37 | Создание темы форума |
| `lesson.html` | 36 | Страница урока |
| `match.html` | 34 | Матч-система (свайпы) |
| `profile-edit.html` | 33 | Редактирование профиля |
| `webinars.html` | 29 | Список вебинаров |
| `setup1.html` | 29 | Онбординг шаг 1 — имя и фото |
| `contests.html` | 29 | Список конкурсов |
| `match-list.html` | 26 | Список матчей |
| `notifications.html` | 22 | Уведомления |
| `alliances.html` | 22 | Альянсы компаний |
| `create.html` | 18 | Создание поста — textarea, фото, публикация |
| `setup2.html` | 17 | Онбординг шаг 2 — выбор компании |
| `search.html` | 17 | Поиск — поле ввода, результаты |
| `done.html` | 17 | Финал онбординга — «Всё готово!» |
| `detail.html` | 14 | Детальная страница компании |
| `more.html` | 12 | Меню «Ещё» — плитки навигации |

---

## JS — JavaScript (71 файл, ~15531 строк)

### Core — Ядро (js/core/, 5 файлов)

| Файл | Строк | Описание |
|------|-------|----------|
| `core/splash.js` | 188 | Сплэш-скрин при загрузке |
| `core/push.js` | 155 | Push-уведомления: подписка, получение |
| `core/telegram.js` | 84 | Telegram WebApp SDK: initData, haptic |
| `core/state.js` | 40 | Глобальное состояние (setState/getState) |
| `core/events.js` | 28 | Шина событий (AppEvents) |

### API — Модули данных (js/api/, 5 файлов)

| Файл | Строк | Описание |
|------|-------|----------|
| `api/auth.js` | 229 | Регистрация, вход, сессия, authTelegram, detectPlatform |
| `api/users.js` | 191 | CRUD пользователей, профили, vw_public_profiles |
| `api/posts.js` | 134 | CRUD постов, реакции |
| `api/companies.js` | 52 | CRUD компаний |
| `api/supabase-client.js` | 18 | Supabase клиент, хелперы |

### Utils — Утилиты (js/utils/, 5 файлов)

| Файл | Строк | Описание |
|------|-------|----------|
| `utils/gamification.js` | 111 | XP_TABLE (26 уровней), STREAK_MULTIPLIERS, getUserLevel, getMultiplier |
| `utils/dna.js` | 89 | getDnaColor(), DNA_COLORS, applyDnaTheme → window |
| `utils/xp-animations.js` | 78 | showXpToast, showLevelUp, showStarUnlock |
| `utils/legacy-compat.js` | 45 | Совместимость со старым API |
| `utils/format.js` | 17 | showToast() → window.showToast |

### Auth — Авторизация (js/, 2 файла)

| Файл | Строк | Описание |
|------|-------|----------|
| `auth-core.js` | 467 | Аутентификация: login, register, session, Telegram auto-login |
| `auth-ui.js` | 165 | UI авторизации: формы, валидация, модалки |

### DNA — ДНК-система (js/, 4 файла)

| Файл | Строк | Описание |
|------|-------|----------|
| `dna-card.js` | 387 | ДНК-карточка: рендеринг, 3 таба, DNA_EXTRA → window |
| `dna-test.js` | 293 | ДНК-тест: 7 вопросов, подсчёт, определение типа |
| `dna-reveal.js` | 194 | Reveal-анимация результата ДНК |
| `my-dna.js` | 176 | Экран «Моё ДНК»: карточка, сильные стороны, квесты |

### Feed — Лента (js/, 10 файлов)

| Файл | Строк | Описание |
|------|-------|----------|
| `feed-data.js` | 420 | Данные ленты: загрузка постов, лайки, рендеринг |
| `comments.js` | 360 | Комментарии: загрузка, создание, вложенность |
| `feed-create.js` | 300 | Создание постов: UI, формы |
| `feed-publish.js` | 260 | Публикация постов |
| `feed-lightbox.js` | 246 | Лайтбокс просмотра медиа |
| `feed-media.js` | 222 | Медиа в ленте: фото, видео |
| `feed-interactions.js` | 210 | Реакции, share, сохранение |
| `feed-polls.js` | 177 | Опросы в ленте |
| `feed.js` | 116 | Лента: FAB, поповеры, фильтры |
| `feed-cases.js` | 9 | Кейсы в ленте (заглушка) |

### Screens — Экраны (js/screens/, 28 файлов)

| Файл | Строк | Описание |
|------|-------|----------|
| `screens/match.js` | 402 | Матч-система: свайпы, подключения |
| `screens/chat.js` | 127 | Чат: точка входа, initChat, findOrCreateConversation |
| `screens/chat-context.js` | 145 | Контекстное меню сообщений |
| `screens/chat-info.js` | 56 | Экран информации о чате |
| `screens/chat-realtime.js` | 281 | Подписки, обновления в реальном времени |
| `screens/chat-list-render.js` | 330 | buildClItem, buildClDealItem, хелперы рендеринга |
| `screens/chat-list-new.js` | 250 | initChatList, список чатов |
| `screens/chat-messages.js` | 255 | loadMessages, renderMessages, destroyChat |
| `screens/chat-messages-pagination.js` | 65 | loadOlderMessages |
| `screens/chat-messages-render.js` | 260 | buildBubble, рендер пузырей |
| `screens/chat-input.js` | 186 | chatSend, ввод, resize |
| `screens/chat-reactions.js` | 24 | Реакции на сообщения |
| `screens/chat-gestures.js` | 58 | Свайпы |
| `screens/deals.js` | 388 | Сделки: список, создание, детали |
| `screens/shop.js` | 373 | Магазин: товары, покупки |
| `screens/academy.js` | 364 | Академия: курсы, уроки |
| `screens/webinars.js` | 336 | Вебинары: список, детали, регистрация |
| `screens/tasks.js` | 313 | Задания: список, детали, выполнение, XP-анимации |
| `screens/experts.js` | 298 | Эксперты: каталог, профиль, заявка |
| `screens/forum.js` | 297 | Форум: темы, создание, обсуждение |
| `screens/profile.js` | 289 | Профиль: просмотр, редактирование, настройки, звёзды |
| `screens/quest.js` | 275 | Ежедневные квесты «Импульс» |
| `screens/contests.js` | 267 | Конкурсы: список, детали, участие |
| `screens/wallet.js` | 180 | Кошелёк: баланс, транзакции, вывод |
| `screens/verification.js` | 160 | Верификация аккаунта |
| `screens/notifications.js` | 118 | Уведомления: список, mark as read |
| `screens/alliances.js` | 106 | Альянсы компаний |
| `screens/more.js` | 99 | Меню «Ещё»: плитки навигации, «Моё ДНК» |

### Остальные (js/, 5 файлов)

| Файл | Строк | Описание |
|------|-------|----------|
| `landing.js` | 343 | Лендинг: карусель, аккордеон, модалки, scroll-reveal |
| `router.js` | 291 | Навигация: goTo(), goBack(), ensureTemplate(), updateChrome() |
| `touch-gestures.js` | 251 | Жесты для мобильных |
| `animations.js` | 228 | Анимации: 3D tilt, параллакс, gradient flow, magnetic |
| `onboarding.js` | 221 | Онбординг: setup1-3, выбор компании, фото |

### Admin — Админ-панель (js/, 7 файлов, только admin.html)

| Файл | Строк | Описание |
|------|-------|----------|
| `admin-core.js` | 410 | Ядро админки: auth, sidebar, модалки, пользователи |
| `admin-data.js` | 399 | Данные админки: загрузка, кеш, rpc admin_get_users |
| `admin-pages.js` | 369 | Страницы: дашборд, пользователи |
| `admin-pages4.js` | 360 | Страницы: финансы, настройки |
| `admin-pages5.js` | 315 | Страницы: расширенные |
| `admin-pages3.js` | 193 | Страницы: магазин, геймификация |
| `admin-pages2.js` | 188 | Страницы: контент, компании |

---

## CSS — Стили (29 файлов, ~9419 строк)

| Файл | Строк | Описание |
|------|-------|----------|
| `landing.css` | 754 | Лендинг: hero, секции, карусель, тарифы, адаптив |
| `dna-card.css` | 684 | ДНК-карточка: luxury-стиль, табы, анимации |
| `dna.css` | 621 | ДНК-тест + результат + экран «Моё ДНК» |
| `feed.css` | 530 | Лента: посты, FAB, поповеры, создание, компании |
| `shop.css` | 460 | Магазин: товары, карточки, создание |
| `chat-list.css` | 335 | Список чатов |
| `chat-dialog.css` | 594 | Экран диалога |
| `profile.css` | 458 | Профиль: карточка, звёзды, редактирование, настройки |
| `deals.css` | 390 | Сделки: список, создание, детали |
| `tasks.css` | 381 | Задания: список, детали |
| `academy.css` | 372 | Академия: курсы, уроки |
| `forum.css` | 352 | Форум: темы, создание |
| `dna-card-animations.css` | 343 | ДНК-карточка: keyframes, 3D, reveal |
| `match.css` | 342 | Матч-система: свайпы, список |
| `admin.css` | 329 | Админ-панель: sidebar, таблицы, формы, графики |
| `experts.css` | 322 | Эксперты: каталог, профиль |
| `contests.css` | 315 | Конкурсы: список, детали |
| `lightbox.css` | 303 | Лайтбокс просмотра медиа |
| `webinars.css` | 269 | Вебинары: список, детали |
| `wallet.css` | 219 | Кошелёк: баланс, транзакции |
| `onboarding.css` | 211 | Онбординг: welcome, setup1-3, done |
| `gamification.css` | 207 | Геймификация: XP-тост, level-up, star-unlock |
| `base.css` | 148 | Базовые стили: reset, шрифты, переменные, утилиты |
| `alliances.css` | 125 | Альянсы компаний |
| `quest.css` | 100 | Квесты «Импульс» |
| `notifications.css` | 84 | Уведомления |
| `splash.css` | 82 | Сплэш-скрин при загрузке |
| `more.css` | 50 | Меню «Ещё» |
| `platform.css` | 39 | Платформенные стили (iOS/Android) |

---

## EDGE FUNCTIONS — Supabase (15 функций + _shared, ~2163 строк)

| Функция | Строк | Описание | Статус |
|---------|-------|----------|--------|
| `complete-task` | 264 | Выполнение задания: XP формула, level/stars, streak множитель | ✅ Deployed |
| `auth-telegram` | 243 | Авторизация через Telegram Mini App | ✅ Deployed |
| `purchase-product` | 203 | Покупка товара в магазине | ✅ Deployed |
| `draw-contest` | 189 | Розыгрыш конкурса: выбор победителей | ✅ Deployed |
| `process-deal-payment` | 176 | Оплата сделки между пользователями | ✅ Deployed |
| `send-push` | 162 | Отправка push-уведомлений | ✅ Deployed |
| `update-streaks` | 160 | Обновление streak-серий (cron ежедневно 3:00 UTC) | ✅ Deployed |
| `auth-email` | 133 | Авторизация по email + пароль | ✅ Deployed |
| `purchase-subscription` | 120 | Покупка подписки (FREE/PRO/BUSINESS) | ✅ Deployed |
| `process-referral-monthly` | 118 | Ежемесячные реферальные бонусы | ✅ Deployed |
| `accept-deal` | 99 | Принятие сделки продавцом | ✅ Deployed |
| `request-withdrawal` | 98 | Запрос на вывод средств | ✅ Deployed |
| `expire-subscriptions` | 77 | Истечение подписок (cron ежедневно) | ✅ Deployed |
| `register-push-sub` | 58 | Регистрация push-подписки | ✅ Deployed |
| `telegram-webhook` | 41 | Вебхук Telegram бота | ✅ Deployed |
| `_shared/cors.ts` | 22 | Общие CORS-заголовки | — |

---

## SQL MIGRATIONS (12 файлов, ~2326 строк)

| Файл | Строк | Описание |
|------|-------|----------|
| `001_schema.sql` | 987 | Схема БД: 54 таблицы, индексы, триггеры |
| `002_rls.sql` | 790 | RLS-политики для всех таблиц |
| `003_storage.sql` | 172 | Storage buckets: avatars, posts, products |
| `008_fix_rls.sql` | 130 | Исправления RLS-политик |
| `009_admin_functions.sql` | 66 | SECURITY DEFINER: admin_get_users |
| `011_fix_cron.sql` | 60 | Исправления cron-задач |
| `007_alter_tables.sql` | 60 | ALTER: новые колонки, индексы |
| `004_cron_schedules.sql` | 44 | Расписания cron-задач |
| `005_verify_cron.sql` | 8 | Проверка cron |
| `010_rls_service_role.sql` | 4 | RLS для service_role |
| `012_quest_completed.sql` | 3 | Поле quest_completed |
| `006_drop_verify_cron.sql` | 2 | Удаление verify_cron |

---

## ROOT FILES

| Файл | Строк | Описание |
|------|-------|----------|
| `index.html` | 281 | Главная точка входа, подключает все скрипты и стили |
| `admin.html` | 81 | Админ-панель — login, sidebar, страницы |
| `sw.js` | 126 | Service Worker — кеширование, offline |
| `manifest.json` | 25 | PWA-манифест: иконки, цвета, display |
| `vercel.json` | 15 | Конфиг деплоя: rewrites для SPA |
| `vite.config.js` | 19 | Dev-сервер: порт, proxy |
| `package.json` | 13 | Зависимости: Vite |
| `supabase-config.js` | 2 | Legacy-заглушка (пустой) |
| `supabase-client.js` | 12 | Legacy Supabase init |

---

## ASSETS — Изображения

| Файл | Описание |
|------|----------|
| `logo.png` | Логотип TRAFIQO |

---

## СТАТИСТИКА

| Категория | Файлов | Строк |
|-----------|--------|-------|
| HTML шаблоны | 49 | ~2810 |
| JavaScript | 71 | ~15531 |
| CSS стили | 29 | ~9419 |
| Root HTML + конфиги | 9 | ~574 |
| Edge Functions | 16 | ~2163 |
| SQL миграции | 12 | ~2326 |
| **ИТОГО свой код** | **186** | **~32823** |
| node_modules | 1000+ | НЕ СЧИТАЕМ |

---

## БЫСТРАЯ НАВИГАЦИЯ

### Хочу изменить...

| Что | Куда идти |
|-----|-----------|
| Ленту постов (логика) | `js/feed.js` + `js/feed-data.js` + `js/feed-*.js` |
| Ленту постов (стили) | `css/feed.css` |
| Ленту постов (HTML) | `templates/feed.html` |
| Лендинг (логика) | `js/landing.js` |
| Лендинг (стили) | `css/landing.css` |
| Лендинг (HTML) | `templates/landing.html` |
| ДНК-тест | `js/dna-test.js` + `css/dna.css` |
| ДНК-карточку | `js/dna-card.js` + `js/dna-reveal.js` + `css/dna-card.css` + `css/dna-card-animations.css` |
| Экран «Моё ДНК» | `js/my-dna.js` + `templates/my-dna.html` + `css/dna.css` |
| Онбординг | `js/onboarding.js` + `css/onboarding.css` |
| Компании | `templates/companies.html` + `js/api/companies.js` + `css/feed.css` |
| Профиль | `js/screens/profile.js` + `css/profile.css` |
| Чат | `js/screens/chat*.js` (12 файлов) + `css/chat-list.css` + `css/chat-dialog.css` |
| Сделки | `js/screens/deals.js` + `css/deals.css` |
| Магазин | `js/screens/shop.js` + `css/shop.css` |
| Форум | `js/screens/forum.js` + `css/forum.css` |
| Задания | `js/screens/tasks.js` + `css/tasks.css` |
| Квесты «Импульс» | `js/screens/quest.js` + `css/quest.css` |
| Конкурсы | `js/screens/contests.js` + `css/contests.css` |
| Эксперты | `js/screens/experts.js` + `css/experts.css` |
| Матч-система | `js/screens/match.js` + `css/match.css` |
| Академия | `js/screens/academy.js` + `css/academy.css` |
| Вебинары | `js/screens/webinars.js` + `css/webinars.css` |
| Кошелёк | `js/screens/wallet.js` + `css/wallet.css` |
| Уведомления | `js/screens/notifications.js` + `css/notifications.css` |
| Альянсы | `js/screens/alliances.js` + `css/alliances.css` |
| Верификация | `js/screens/verification.js` + `templates/verification.html` |
| Меню «Ещё» | `js/screens/more.js` + `css/more.css` |
| Навигацию между экранами | `js/router.js` |
| Авторизацию (логика) | `js/auth-core.js` + `js/api/auth.js` |
| Авторизацию (UI) | `js/auth-ui.js` |
| Геймификацию (уровни, XP) | `js/utils/gamification.js` |
| XP-анимации | `js/utils/xp-animations.js` + `css/gamification.css` |
| Push-уведомления | `js/core/push.js` |
| Telegram SDK | `js/core/telegram.js` |
| Сплэш-скрин | `js/core/splash.js` + `css/splash.css` |
| Состояние/события | `js/core/state.js` + `js/core/events.js` |
| Комментарии | `js/comments.js` |
| Анимации лендинга | `js/animations.js` |
| Жесты | `js/touch-gestures.js` |
| Админ-панель | `admin.html` + `js/admin-*.js` + `css/admin.css` |
| Базовые стили / шрифты | `css/base.css` |
| Платформенные стили | `css/platform.css` |
| Добавить картинку | `assets/` |
| Edge Functions | `supabase/functions/` |
| SQL-миграции | `supabase/migrations/` |
| Правила проекта | `ARCHITECTURE.md` + `MASTER_RULES.md` |

---

## ПОРЯДОК ЗАГРУЗКИ СКРИПТОВ

### index.html (основное приложение — 67 скриптов)

```
1.  supabase-js (CDN)
2.  supabase-config.js         ← Legacy Supabase URL/key
3.  supabase-client.js         ← Legacy Supabase init
4.  js/core/splash.js          ← сплэш-скрин
5.  js/core/events.js          ← шина событий
6.  js/core/telegram.js        ← Telegram WebApp SDK
7.  js/core/state.js           ← глобальное состояние
8.  js/core/push.js            ← push-уведомления
9.  js/api/supabase-client.js  ← Supabase клиент
10. js/api/auth.js             ← API авторизации
11. js/auth-core.js            ← авторизация (логика)
12. js/auth-ui.js              ← авторизация (UI)
13. js/api/users.js            ← API пользователей
14. js/api/posts.js            ← API постов
15. js/api/companies.js        ← API компаний
16. js/utils/legacy-compat.js  ← совместимость
17. js/utils/dna.js            ← DNA_COLORS, getDnaColor
18. js/utils/format.js         ← showToast
19. js/utils/gamification.js   ← XP_TABLE, getUserLevel
20. js/utils/xp-animations.js  ← showXpToast, showLevelUp
21. js/router.js               ← навигация
22. js/landing.js              ← лендинг
23. js/dna-test.js             ← ДНК-тест
24. js/dna-card.js             ← ДНК-карточка
25. js/dna-reveal.js           ← ДНК reveal-анимация
26. js/my-dna.js               ← экран «Моё ДНК»
27. js/onboarding.js           ← онбординг
28. js/touch-gestures.js       ← жесты
29. js/feed.js                 ← лента (FAB, поповеры)
30. js/feed-create.js          ← создание постов
31. js/feed-interactions.js    ← реакции, share
32. js/feed-publish.js         ← публикация
33. js/animations.js           ← анимации
34. js/feed-data.js            ← данные ленты
35. js/feed-lightbox.js        ← лайтбокс
36. js/comments.js             ← комментарии
37. js/feed-media.js           ← медиа
38. js/feed-polls.js           ← опросы
39. js/feed-cases.js           ← кейсы
40. js/screens/profile.js      ← профиль
41. js/screens/chat.js              ← чат (точка входа)
42. js/screens/chat-context.js      ← контекстное меню
43. js/screens/chat-info.js         ← инфо о чате
44. js/screens/chat-realtime.js     ← realtime-подписки
45. js/screens/chat-list-render.js  ← рендер списка чатов
46. js/screens/chat-list-new.js     ← initChatList
47. js/screens/chat-messages.js     ← загрузка/рендер сообщений
48. js/screens/chat-messages-pagination.js ← пагинация
49. js/screens/chat-messages-render.js     ← buildBubble
50. js/screens/chat-input.js        ← ввод и отправка
51. js/screens/chat-reactions.js    ← реакции
52. js/screens/chat-gestures.js     ← свайпы
53. js/screens/deals.js             ← сделки
54. js/screens/shop.js              ← магазин
55. js/screens/forum.js             ← форум
56. js/screens/tasks.js             ← задания
57. js/screens/contests.js          ← конкурсы
58. js/screens/experts.js           ← эксперты
59. js/screens/match.js             ← матч
60. js/screens/academy.js           ← академия
61. js/screens/webinars.js          ← вебинары
62. js/screens/alliances.js         ← альянсы
63. js/screens/wallet.js            ← кошелёк
64. js/screens/verification.js      ← верификация
65. js/screens/notifications.js     ← уведомления
66. js/screens/quest.js             ← квесты
67. js/screens/more.js              ← меню «Ещё»
```

### admin.html (админ-панель — 8 скриптов)

```
1. supabase-js (CDN)
2. js/admin-core.js
3. js/admin-data.js
4. js/admin-pages.js
5. js/admin-pages2.js
6. js/admin-pages3.js
7. js/admin-pages4.js
8. js/admin-pages5.js
```

---

## КАРТА ЭКРАНОВ (SPA-навигация)

```
scrLanding (лендинг)
  ├── scrDnaTest (ДНК-тест)
  │     └── scrDnaResult (результат ДНК)
  │           ├── [Регистрация] → scrWelcome
  │           └── [Пройти заново] → scrDnaTest
  └── [Регистрация/Вход]
        └── scrWelcome (приветствие)
              └── scrDnaTest ИЛИ scrSetup1
                    └── scrSetup1 (имя, фото)
                          └── scrSetup2 (компания)
                                └── scrSetup3 (интересы)
                                      └── scrDone (готово!)
                                            └── scrFeed (лента)

scrFeed (лента) ← Bottom Nav
  ├── scrSearch (поиск)
  ├── scrCreate (создание поста)
  ├── scrCompanies (компании) ← Bottom Nav
  │     └── scrDetail (детали компании)
  ├── scrShop (магазин) ← Bottom Nav
  │     ├── scrProductDetail (детали товара)
  │     └── scrProductCreate (создание товара)
  ├── scrChatList (список чатов) ← Bottom Nav
  │     ├── scrChat (чат)
  │     │     └── scrChatInfo (инфо о чате)
  │     └── scrChat
  ├── scrProfile (профиль) ← Bottom Nav
  │     ├── scrProfileEdit (редактирование)
  │     └── scrProfileSettings (настройки)
  └── scrMore (меню «Ещё») ← Bottom Nav
        ├── scrMyDna (моё ДНК)
        ├── scrWallet (кошелёк)
        ├── scrNotifications (уведомления)
        ├── scrVerification (верификация)
        └── scrAlliances (альянсы)

scrDealList (сделки)
  ├── scrDealCreate (создание сделки)
  └── scrDealDetail (детали сделки)

scrForum (форум)
  ├── scrForumCreate (создание темы)
  └── scrForumTopic (тема)

scrTasks (задания)
  ├── scrTaskDetail (детали задания)
  └── scrQuest (квесты «Импульс»)

scrContests (конкурсы)
  └── scrContestDetail (детали конкурса)

scrExperts (эксперты)
  ├── scrExpertDetail (профиль эксперта)
  └── scrBecomeExpert (стать экспертом)

scrMatch (матч-система)
  └── scrMatchList (список матчей)

scrAcademy (академия)
  ├── scrCourse (курс)
  ├── scrLesson (урок)
  └── scrWebinars (вебинары)
        └── scrWebinarDetail (детали вебинара)
```

**Всего: 49 экранов зарегистрировано в router.js**
**Не реализовано: 2 экрана (leaderboard, referrals)**

---

## ПРОГРЕСС ПРОЕКТА

**Выполнено: 49 / 51 экран**

- [x] Phase 1 — Онбординг (экраны 1-6) ✅
- [x] Phase 2 — Лента (экраны 7-12) ✅
- [x] Phase 3 — Компании ✅
- [x] Phase 4 — Профиль и чат ✅
- [x] Phase 5 — Магазин и геймификация ✅
- [x] Phase 6 — Экраны: сделки, форум, задания, конкурсы, эксперты, матч, академия, вебинары ✅
- [x] Phase 7 — Кошелёк, уведомления, альянсы, квесты, верификация, «Моё ДНК», «Ещё» ✅
- [ ] P2 — Лидерборд + Реферальная система 🟡

**Блоки задач:**
- P0: ✅ Закрыт (auth баги, streak, хардкод уровней, complete-task)
- P1: ✅ Закрыт (Моё ДНК, XP-анимации, cron, звёзды)
- P2: 🟡 В работе (лидерборд, рефералы, PROJECT_MAP)
- P3: Позже (streak recovery, ачивки, штрафы)

---

## ДИЗАЙН-СИСТЕМА (краткая справка)

| Параметр | Значение |
|----------|----------|
| Шрифт | Outfit (300-900) |
| Фон | `#06060b` |
| Основной цвет | `#8b5cf6` (фиолетовый) |
| Glass-эффект | `rgba(255,255,255,0.035)` + border `rgba(255,255,255,0.06)` |
| Радиус карточек | 14px |
| Радиус кнопок | 10px |
| Радиус аватаров | 50% |
| Анимации | 200-400ms, `cubic-bezier(0.16, 1, 0.3, 1)` |
| Макет | Mobile-first, max-width 420px |

### ДНК-типы

| Тип | Цвет | Hex |
|-----|------|-----|
| Стратег | Синий | `#3b82f6` |
| Коммуникатор | Зелёный | `#22c55e` |
| Креатор | Оранжевый | `#f59e0b` |
| Аналитик | Фиолетовый | `#a78bfa` |

---

## СЛУЖЕБНЫЕ ПАПКИ — НЕ ТРОГАТЬ!

| Папка | Что это | Зачем |
|-------|---------|-------|
| `node_modules/` | Библиотеки | Управляется npm автоматически |
| `@esbuild/` | Компилятор | Часть Vite |
| `@rollup/` | Сборщик | Часть Vite |
| `@types/` | TypeScript типы | Для IDE |
| `.vercel/` | Конфиг Vercel | Автогенерируемый |
| `supabase/.temp/` | Temp Supabase CLI | Автогенерируемый |

**НИКОГДА не редактировать, не удалять, не открывать!**
Установка: `npm install` — восстановит всё автоматически.
