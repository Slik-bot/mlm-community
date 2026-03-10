# PROJECT MAP — TRAFIQO

> Полная карта проекта. Обновлено: 10 марта 2026
> Последний коммит: 802df1d chore: добавить PDF/DOCX/промты в .gitignore

---

## 📁 СТРУКТУРА ПРОЕКТА

```
trafiqo/
├── index.html              ← Главная точка входа (342 строки)
├── admin.html              ← Админ-панель (88 строк)
├── sw.js                   ← Service Worker (126 строк)
├── manifest.json           ← PWA-манифест
├── vercel.json             ← Конфиг деплоя
├── vite.config.js          ← Dev-сервер (20 строк)
├── package.json            ← Зависимости (13 строк)
├── supabase-config.js      ← Legacy-заглушка (2 строки)
├── supabase-client.js      ← Legacy Supabase init (12 строк)
├── CLAUDE.md               ← Инструкции для AI
├── MASTER_RULES.md         ← Свод правил разработки
├── ARCHITECTURE.md         ← Архитектура и паттерны
├── PROJECT_MAP.md          ← Эта карта
├── WORKFLOW.md             ← Процессы работы
│
├── templates/              ← HTML-экраны (63 файла, 4087 строк)
├── js/                     ← JavaScript (106 файлов, 24570 строк)
│   ├── api/                ← API-модули (7 файлов)
│   ├── core/               ← Ядро: events, state, push, splash, telegram (5 файлов)
│   ├── utils/              ← Утилиты: dna, format, gamification и др. (7 файлов)
│   ├── screens/            ← Логика экранов (50 файлов)
│   └── (root js/)          ← Feed, DNA, auth, admin, router и др. (37 файлов)
├── css/                    ← Стили (45 файлов, 14902 строк)
├── assets/                 ← Изображения (logo.png, trafiqo-logo.svg, trafiqo-logo-sm.svg)
├── supabase/
│   ├── functions/          ← Edge Functions (15 функций + _shared)
│   └── migrations/         ← SQL-миграции (12 файлов)
└── node_modules/           ← НЕ ТРОГАТЬ
```

---

## 📄 TEMPLATES — HTML-экраны (63 файла, 4087 строк)

| Файл | Строк | Описание |
|------|-------|----------|
| `academy.html` | 39 | Академия — список курсов |
| `achievements.html` | 46 | Достижения — список ачивок |
| `alliances.html` | 22 | Альянсы компаний |
| `become-expert.html` | 42 | Стать экспертом — заявка |
| `bizcard.html` | 42 | Визитка пользователя |
| `chat-info.html` | 41 | Информация о чате |
| `chat-list.html` | 53 | Список чатов |
| `chat.html` | 141 | Экран чата — диалог, ввод сообщений |
| `companies.html` | 82 | Каталог компаний — фильтры, сортировка |
| `company-card.html` | 105 | Карточка компании — детали, участники |
| `contest-detail.html` | 55 | Детали конкурса |
| `contests.html` | 29 | Список конкурсов |
| `course.html` | 43 | Страница курса |
| `create.html` | 18 | Создание поста — textarea, фото |
| `deal-create.html` | 98 | Создание сделки — форма |
| `deal-detail.html` | 64 | Детали сделки |
| `deal-list.html` | 41 | Список сделок |
| `deal.html` | 58 | Экран сделки |
| `detail.html` | 14 | Детальная страница компании |
| `dna-result.html` | 248 | Результат ДНК-теста — luxury-карточка, 3 таба |
| `dna-test.html` | 68 | ДНК-тест — вопросы с карточками выбора |
| `done.html` | 17 | Финал онбординга — «Всё готово!» |
| `expert-detail.html` | 51 | Профиль эксперта |
| `experts.html` | 51 | Каталог экспертов |
| `feed.html` | 84 | Лента постов — фильтры, карточки, импульс |
| `forum-create.html` | 37 | Создание темы форума |
| `forum-topic.html` | 47 | Тема форума |
| `forum.html` | 49 | Форум — список тем |
| `friends.html` | 35 | Друзья — список, поиск |
| `landing.html` | 381 | Лендинг — hero, экосистема, тарифы, ДНК-секция |
| `leaderboard.html` | 59 | Лидерборд — рейтинг пользователей |
| `lesson.html` | 36 | Страница урока |
| `match-list.html` | 26 | Список матчей |
| `match.html` | 34 | Матч-система (свайпы) |
| `more.html` | 12 | Меню «Ещё» — плитки навигации |
| `my-dna.html` | 45 | Экран «Моё ДНК» — карточка, сильные стороны |
| `notifications.html` | 58 | Уведомления |
| `product-create.html` | 62 | Создание товара |
| `product-detail.html` | 55 | Детали товара |
| `profile-edit.html` | 64 | Редактирование профиля |
| `profile-settings.html` | 75 | Настройки профиля |
| `profile-stats.html` | 27 | Статистика профиля |
| `profile.html` | 137 | Профиль пользователя |
| `quest.html` | 43 | Ежедневные квесты «Импульс» |
| `referrals.html` | 56 | Реферальная система |
| `roadmap.html` | 25 | Дорожная карта проекта |
| `search.html` | 81 | Поиск — поле ввода, результаты |
| `setup1.html` | 29 | Онбординг шаг 1 — имя и фото |
| `setup2.html` | 17 | Онбординг шаг 2 — выбор компании |
| `setup3.html` | 37 | Онбординг шаг 3 — выбор интересов |
| `shop.html` | 48 | Магазин |
| `story-create.html` | 39 | Создание сторис |
| `story-viewer.html` | 7 | Просмотр сторис |
| `subscription.html` | 128 | Подписки — тарифы FREE/PRO/BUSINESS |
| `task-detail.html` | 59 | Детали задания |
| `tasks.html` | 48 | Список заданий |
| `verification.html` | 49 | Верификация аккаунта |
| `verify-email.html` | 48 | Подтверждение email |
| `wallet.html` | 404 | Кошелёк — баланс, транзакции, вывод, депозит |
| `webinar-detail.html` | 74 | Детали вебинара |
| `webinars.html` | 29 | Список вебинаров |
| `weekly-report.html` | 38 | Еженедельный отчёт |
| `welcome.html` | 37 | Экран приветствия после регистрации |

---

## ⚙️ JS — JavaScript (106 файлов, 24570 строк)

### js/core/ — Ядро (5 файлов, 358 строк)

| Файл | Строк | Описание |
|------|-------|----------|
| `core/splash.js` | 162 | Сплэш-скрин при загрузке |
| `core/push.js` | 155 | Push-уведомления: подписка, получение |
| `core/telegram.js` | 73 | Telegram WebApp SDK: initData, haptic |
| `core/state.js` | 40 | Глобальное состояние (setState/getState) |
| `core/events.js` | 28 | Шина событий (AppEvents) |

### js/api/ — API-модули (7 файлов, 1297 строк)

| Файл | Строк | Описание |
|------|-------|----------|
| `api/deals-api.js` | 413 | CRUD сделок, milestones, платежи |
| `api/wallet.js` | 319 | Баланс, транзакции, вывод, депозит |
| `api/posts.js` | 235 | CRUD постов, реакции |
| `api/auth.js` | 233 | Регистрация, вход, сессия, authTelegram |
| `api/users.js` | 224 | CRUD пользователей, профили, vw_public_profiles |
| `api/companies.js` | 155 | CRUD компаний, поиск, фильтры |
| `api/supabase-client.js` | 18 | Supabase клиент, хелперы |

### js/utils/ — Утилиты (7 файлов, 448 строк)

| Файл | Строк | Описание |
|------|-------|----------|
| `utils/gamification.js` | 111 | XP_TABLE (26 уровней), STREAK_MULTIPLIERS, getUserLevel |
| `utils/dna.js` | 89 | getDnaColor(), DNA_COLORS, applyDnaTheme → window |
| `utils/xp-animations.js` | 78 | showXpToast, showLevelUp, showStarUnlock |
| `utils/swipe-manager.js` | 71 | Менеджер свайп-жестов |
| `utils/legacy-compat.js` | 45 | Совместимость со старым API |
| `utils/format.js` | 31 | showToast() → window.showToast |
| `utils/haptic.js` | 23 | Haptic feedback (вибрация) |

### js/ (корень) — Навигация, Auth, ДНК, Лента (24 файла, 6130 строк)

| Файл | Строк | Описание |
|------|-------|----------|
| `feed-data.js` | 404 | Данные ленты: загрузка постов, лайки, рендеринг |
| `dna-card.js` | 387 | ДНК-карточка: рендеринг, 3 таба, DNA_EXTRA → window |
| `comments.js` | 361 | Комментарии: загрузка, создание, вложенность |
| `router.js` | 355 | Навигация: goTo(), goBack(), ensureTemplate(), updateChrome() |
| `landing.js` | 343 | Лендинг: карусель, аккордеон, модалки, scroll-reveal |
| `feed-create.js` | 300 | Создание постов: UI, формы |
| `dna-test.js` | 295 | ДНК-тест: 7 вопросов, подсчёт, определение типа |
| `auth-core.js` | 268 | Аутентификация: login, register, session, Telegram |
| `feed-publish.js` | 260 | Публикация постов |
| `touch-gestures.js` | 251 | Жесты для мобильных |
| `feed-lightbox.js` | 246 | Лайтбокс просмотра медиа |
| `auth-forms.js` | 232 | Формы авторизации |
| `animations.js` | 228 | Анимации: 3D tilt, параллакс, gradient flow, magnetic |
| `feed-media.js` | 222 | Медиа в ленте: фото, видео |
| `onboarding.js` | 221 | Онбординг: setup1-3, выбор компании, фото |
| `feed-interactions.js` | 210 | Реакции, share, сохранение |
| `dna-reveal.js` | 194 | Reveal-анимация результата ДНК |
| `feed-polls.js` | 177 | Опросы в ленте |
| `my-dna.js` | 176 | Экран «Моё ДНК»: карточка, сильные стороны, квесты |
| `feed-render.js` | 167 | Рендер постов в ленте |
| `auth-ui.js` | 165 | UI авторизации: формы, валидация, модалки |
| `search-inline.js` | 148 | Инлайн-поиск |
| `feed.js` | 116 | Лента: FAB, поповеры, фильтры |
| `feed-cases.js` | 9 | Кейсы в ленте (заглушка) |

### js/screens/ — Экраны (50 файлов, 12959 строк)

#### Чат (12 файлов, 2826 строк)

| Файл | Строк | Описание |
|------|-------|----------|
| `screens/chat-messages.js` | 364 | loadMessages, renderMessages, destroyChat |
| `screens/chat-list-render.js` | 330 | buildClItem, buildClDealItem, хелперы рендеринга |
| `screens/chat-messages-render.js` | 313 | buildBubble, рендер пузырей |
| `screens/chat-realtime.js` | 295 | Подписки, обновления в реальном времени |
| `screens/chat-gestures.js` | 290 | Свайпы в чате, reply-жесты |
| `screens/chat-list-new.js` | 266 | initChatList, список чатов |
| `screens/chat-context.js` | 260 | Контекстное меню сообщений |
| `screens/chat-input.js` | 237 | chatSend, ввод, resize |
| `screens/chat.js` | 126 | Чат: точка входа, initChat, findOrCreateConversation |
| `screens/chat-messages-pagination.js` | 65 | loadOlderMessages |
| `screens/chat-info.js` | 56 | Экран информации о чате |
| `screens/chat-reactions.js` | 24 | Реакции на сообщения |

#### Кошелёк (4 файла, 982 строки)

| Файл | Строк | Описание |
|------|-------|----------|
| `screens/wallet.js` | 434 | Кошелёк: баланс, транзакции, вывод |
| `screens/wallet-transfer.js` | 230 | Переводы между пользователями |
| `screens/wallet-deposit.js` | 228 | Депозит / пополнение |
| `screens/wallet-helpers.js` | 90 | Вспомогательные функции кошелька |

#### Сделки (3 файла, 1056 строк)

| Файл | Строк | Описание |
|------|-------|----------|
| `screens/deal-create-new.js` | 374 | Создание сделки (новая версия) |
| `screens/deal-screen.js` | 366 | Экран сделки |
| `screens/deals.js` | 316 | Сделки: список, детали |

#### Сторис (3 файла, 809 строк)

| Файл | Строк | Описание |
|------|-------|----------|
| `screens/story-viewer.js` | 384 | Просмотр сторис |
| `screens/story-create.js` | 281 | Создание сторис |
| `screens/story-gestures.js` | 144 | Жесты просмотра сторис |

#### Компании (2 файла, 513 строк)

| Файл | Строк | Описание |
|------|-------|----------|
| `screens/companies-card.js` | 309 | Карточка компании |
| `screens/companies.js` | 204 | Каталог компаний |

#### Профиль (3 файла, 632 строки)

| Файл | Строк | Описание |
|------|-------|----------|
| `screens/profile.js` | 242 | Профиль: просмотр, настройки, звёзды |
| `screens/profile-edit.js` | 219 | Редактирование профиля |
| `screens/profile-stats.js` | 171 | Статистика профиля |

#### Остальные экраны (23 файла, 6141 строка)

| Файл | Строк | Описание |
|------|-------|----------|
| `screens/search.js` | 440 | Поиск: ввод, результаты, фильтры |
| `screens/forum.js` | 427 | Форум: темы, создание, обсуждение |
| `screens/match.js` | 402 | Матч-система: свайпы, подключения |
| `screens/shop.js` | 374 | Магазин: товары, покупки |
| `screens/academy.js` | 364 | Академия: курсы, уроки |
| `screens/webinars.js` | 336 | Вебинары: список, детали, регистрация |
| `screens/tasks.js` | 313 | Задания: список, детали, выполнение, XP |
| `screens/experts.js` | 298 | Эксперты: каталог, профиль, заявка |
| `screens/leaderboard.js` | 297 | Лидерборд: рейтинг, фильтры |
| `screens/referrals.js` | 280 | Реферальная система |
| `screens/quest.js` | 275 | Ежедневные квесты «Импульс» |
| `screens/contests.js` | 267 | Конкурсы: список, детали, участие |
| `screens/friends.js` | 246 | Друзья: список, добавление |
| `screens/notifications.js` | 241 | Уведомления: список, mark as read |
| `screens/weekly-report.js` | 195 | Еженедельный отчёт |
| `screens/verify-email.js` | 183 | Подтверждение email |
| `screens/subscription.js` | 176 | Подписки: тарифы, покупка |
| `screens/verification.js` | 160 | Верификация аккаунта |
| `screens/bizcard.js` | 158 | Визитка пользователя |
| `screens/achievements.js` | 139 | Достижения |
| `screens/roadmap.js` | 125 | Дорожная карта |
| `screens/more.js` | 114 | Меню «Ещё»: плитки навигации |
| `screens/alliances.js` | 106 | Альянсы компаний |

### js/ (корень) — Админ-панель (13 файлов, 3378 строк)

| Файл | Строк | Описание |
|------|-------|----------|
| `admin-pages3.js` | 413 | Страницы: магазин, задания, геймификация |
| `admin-moderation.js` | 399 | Модерация: жалобы, страйки, очередь |
| `admin-pages.js` | 369 | Страницы: дашборд, пользователи |
| `admin-pages4.js` | 360 | Страницы: финансы, настройки |
| `admin-user-card.js` | 330 | Карточка пользователя в админке |
| `admin-users.js` | 297 | Управление пользователями |
| `admin-tasks.js` | 290 | Управление заданиями |
| `admin-data.js` | 269 | Данные админки: загрузка, кеш, rpc admin_get_users |
| `admin-withdrawals.js` | 250 | Управление выводами |
| `admin-core.js` | 248 | Ядро админки: auth, sidebar, модалки |
| `admin-pages5.js` | 239 | Страницы: расширенные |
| `admin-tasks-monitor.js` | 219 | Мониторинг заданий |
| `admin-pages2.js` | 115 | Страницы: контент, компании |

---

## 🎨 CSS — Стили (45 файлов, 14902 строк)

| Файл | Строк | Лимит% | Описание |
|------|-------|--------|----------|
| `landing.css` | 754 | 94% ⚠️ | Лендинг: hero, секции, карусель, тарифы |
| `wallet.css` | 749 | 94% ⚠️ | Кошелёк: баланс, транзакции, депозит |
| `dna-card.css` | 684 | 86% ⚠️ | ДНК-карточка: luxury-стиль, табы |
| `stories.css` | 677 | 85% ⚠️ | Сторис: создание, просмотр, жесты |
| `dna.css` | 621 | 78% | ДНК-тест + результат + «Моё ДНК» |
| `profile.css` | 573 | 72% | Профиль: карточка, звёзды, редактирование |
| `feed.css` | 522 | 65% | Лента: посты, FAB, поповеры, создание |
| `search.css` | 483 | 60% | Поиск: поле, результаты, фильтры |
| `shop.css` | 460 | 58% | Магазин: товары, карточки |
| `forum.css` | 444 | 56% | Форум: темы, создание |
| `deals.css` | 419 | 52% | Сделки: список, детали |
| `chat-dialog-extras.css` | 413 | 52% | Чат-диалог: доп. стили |
| `admin.css` | 413 | 52% | Админ-панель: sidebar, таблицы |
| `leaderboard.css` | 405 | 51% | Лидерборд: рейтинг |
| `referrals.css` | 389 | 49% | Реферальная система |
| `chat-dialog.css` | 382 | 48% | Экран диалога |
| `tasks.css` | 381 | 48% | Задания: список, детали |
| `academy.css` | 372 | 47% | Академия: курсы, уроки |
| `chat-list.css` | 356 | 45% | Список чатов |
| `dna-card-animations.css` | 343 | 43% | ДНК-карточка: keyframes, 3D |
| `match.css` | 342 | 43% | Матч-система: свайпы |
| `experts.css` | 322 | 40% | Эксперты: каталог, профиль |
| `contests.css` | 315 | 39% | Конкурсы: список, детали |
| `lightbox.css` | 303 | 38% | Лайтбокс просмотра медиа |
| `weekly-report.css` | 278 | 35% | Еженедельный отчёт |
| `bizcard.css` | 270 | 34% | Визитка |
| `webinars.css` | 269 | 34% | Вебинары: список, детали |
| `roadmap.css` | 262 | 33% | Дорожная карта |
| `profile-stats.css` | 256 | 32% | Статистика профиля |
| `friends.css` | 227 | 28% | Друзья |
| `subscription.css` | 224 | 28% | Подписки |
| `deals-create.css` | 215 | 27% | Создание сделки |
| `onboarding.css` | 211 | 26% | Онбординг: welcome, setup1-3 |
| `gamification.css` | 207 | 26% | Геймификация: XP-тост, level-up |
| `notifications.css` | 192 | 24% | Уведомления |
| `verify-email.css` | 182 | 23% | Подтверждение email |
| `achievements.css` | 181 | 23% | Достижения |
| `companies.css` | 169 | 21% | Компании |
| `base.css` | 162 | 20% | Базовые стили: reset, шрифты, переменные |
| `alliances.css` | 125 | 16% | Альянсы |
| `quest.css` | 100 | 13% | Квесты «Импульс» |
| `splash.css` | 82 | 10% | Сплэш-скрин |
| `wallet-deposit.css` | 79 | 10% | Депозит |
| `more.css` | 50 | 6% | Меню «Ещё» |
| `platform.css` | 39 | 5% | Платформенные стили (iOS/Android) |

---

## 🗺 НАВИГАЦИЯ — МАРШРУТЫ (63 экрана в router.js)

```
scrLanding, scrWelcome, scrDone, scrSearch, scrCompanies, scrCompanyCard,
scrDetail, scrCreate, scrDnaResult, scrSetup1, scrSetup2, scrSetup3,
scrDnaTest, scrFeed, scrProfile, scrProfileEdit, scrProfileSettings,
scrChatList, scrChat, scrChatInfo, scrDealList, scrDealCreate,
scrDealDetail, scrShop, scrProductDetail, scrProductCreate, scrForum,
scrForumTopic, scrForumCreate, scrTasks, scrTaskDetail, scrContests,
scrContestDetail, scrExperts, scrExpertDetail, scrBecomeExpert, scrMatch,
scrMatchList, scrAcademy, scrCourse, scrLesson, scrWebinars,
scrWebinarDetail, scrAlliances, scrWallet, scrVerification,
scrNotifications, scrMore, scrQuest, scrMyDna, scrLeaderboard,
scrReferrals, scrSubscription, scrVerifyEmail, scrAchievements,
scrRoadmap, scrFriends, scrProfileStats, scrBizcard, scrWeeklyReport,
scrStoryCreate, scrStoryViewer, scrDealScreen
```

---

## 📊 СТАТИСТИКА

| Категория | Файлов | Строк |
|-----------|--------|-------|
| HTML шаблоны | 63 | 4087 |
| JavaScript | 106 | 24570 |
| CSS стили | 45 | 14902 |
| Root (HTML + конфиги) | 9 | ~601 |
| Edge Functions | 16 | ~2163 |
| SQL миграции | 12 | ~2326 |
| **ИТОГО свой код** | **251** | **~44649** |

---

## ⚠️ ФАЙЛЫ В ЗОНЕ РИСКА (>80% лимита)

### CSS (лимит 800 строк)

| Файл | Строк | Лимит% | Действие |
|------|-------|--------|----------|
| `landing.css` | 754 | 94% | Разбить при следующем изменении |
| `wallet.css` | 749 | 94% | Разбить при следующем изменении |
| `dna-card.css` | 684 | 86% | Мониторить |
| `stories.css` | 677 | 85% | Мониторить |

### JS (лимит 500 строк)

| Файл | Строк | Лимит% | Действие |
|------|-------|--------|----------|
| `screens/search.js` | 440 | 88% | Разбить при следующем изменении |
| `screens/wallet.js` | 434 | 87% | Разбить при следующем изменении |
| `screens/forum.js` | 427 | 85% | Мониторить |
| `api/deals-api.js` | 413 | 83% | Мониторить |
| `admin-pages3.js` | 413 | 83% | Мониторить |
| `feed-data.js` | 404 | 81% | Мониторить |
| `screens/match.js` | 402 | 80% | Мониторить |

### HTML (лимит 500 строк)

| Файл | Строк | Лимит% | Действие |
|------|-------|--------|----------|
| `wallet.html` | 404 | 81% | Мониторить |

---

## 🏗 ПРОГРЕСС ПРОЕКТА

**Реализовано: 63 / 63 зарегистрированных экрана**

- [x] Phase 1 — Онбординг (landing, welcome, setup1-3, done, dna-test, dna-result) ✅
- [x] Phase 2 — Лента (feed, create, search, companies, detail) ✅
- [x] Phase 3 — Компании (companies, company-card, detail) ✅
- [x] Phase 4 — Профиль и чат (profile, chat, chat-list, chat-info) ✅
- [x] Phase 5 — Магазин и геймификация (shop, tasks, quest, my-dna) ✅
- [x] Phase 6 — Сделки, форум, эксперты, матч, академия, вебинары ✅
- [x] Phase 7 — Кошелёк, уведомления, альянсы, верификация, «Ещё» ✅
- [x] Phase 8 — Лидерборд, рефералы, подписки, сторис, визитка, друзья ✅
- [x] Phase 9 — Достижения, roadmap, weekly-report, verify-email, profile-stats ✅

**Edge Functions: 15/15 deployed ✅**

**Остаётся:**
- Полировка UI и интеграция Edge Functions в экраны
- Supabase cron: update-streaks, expire-subscriptions, process-referral-monthly
- Тестирование всех экранов на реальных данных

---

## EDGE FUNCTIONS — Supabase (15 функций + _shared, ~2163 строк)

| Функция | Строк | Описание | Статус |
|---------|-------|----------|--------|
| `complete-task` | 264 | Выполнение задания: XP, level/stars, streak | ✅ Deployed |
| `auth-telegram` | 243 | Авторизация через Telegram Mini App | ✅ Deployed |
| `purchase-product` | 203 | Покупка товара в магазине | ✅ Deployed |
| `draw-contest` | 189 | Розыгрыш конкурса: выбор победителей | ✅ Deployed |
| `process-deal-payment` | 176 | Оплата сделки между пользователями | ✅ Deployed |
| `send-push` | 162 | Отправка push-уведомлений | ✅ Deployed |
| `update-streaks` | 160 | Обновление streak-серий (cron) | ✅ Deployed |
| `auth-email` | 133 | Авторизация по email + пароль | ✅ Deployed |
| `purchase-subscription` | 120 | Покупка подписки (FREE/PRO/BUSINESS) | ✅ Deployed |
| `process-referral-monthly` | 118 | Ежемесячные реферальные бонусы | ✅ Deployed |
| `accept-deal` | 99 | Принятие сделки продавцом | ✅ Deployed |
| `request-withdrawal` | 98 | Запрос на вывод средств | ✅ Deployed |
| `expire-subscriptions` | 77 | Истечение подписок (cron) | ✅ Deployed |
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

## СЛУЖЕБНЫЕ ПАПКИ — НЕ ТРОГАТЬ!

| Папка | Что это |
|-------|---------|
| `node_modules/` | Библиотеки (npm install) |
| `.vercel/` | Конфиг Vercel |
| `supabase/.temp/` | Temp Supabase CLI |
