# MASTER RULES — MLM COMMUNITY
Полный свод правил разработки проекта

ВЕРСИЯ: 1.0
ДАТА: 18 февраля 2026
ОБЯЗАТЕЛЬНО К ПРОЧТЕНИЮ перед началом любой задачи!

═══════════════════════════════════════════════════
ОГЛАВЛЕНИЕ
═══════════════════════════════════════════════════

1. REFACTORING — Разбиение файлов
2. SECURITY — Безопасность
3. ERROR HANDLING — Обработка ошибок
4. MODULE ORGANIZATION — Организация модулей
5. CODE QUALITY — Качество кода
6. NAMING CONVENTIONS — Соглашения об именовании
7. PERFORMANCE — Производительность
8. ERROR MESSAGES — Сообщения об ошибках
9. UI PATTERNS — Паттерны интерфейса
10. SUPABASE — Работа с базой данных
11. STATE MANAGEMENT — Управление состоянием
12. ANIMATIONS — Анимации

═══════════════════════════════════════════════════
1. REFACTORING
═══════════════════════════════════════════════════

КОГДА РАЗБИВАТЬ ФАЙЛ:
Файл >450 строк И нужно добавить код → ОБЯЗАТЕЛЬНО РАЗБИТЬ

Проверка: wc -l js/file.js

Если >450 строк:
1. ОСТАНОВИТЬСЯ
2. Прочитать раздел "Как разбивать"
3. Разбить файл
4. Только потом добавлять код

КАК РАЗБИВАТЬ:

ШАГ 1 - Группировка функций:
Для feed.js:
- ГРУППА 1: UI управление (initFeed, openCreate)
- ГРУППА 2: Интерактивность → feed-interactions.js
- ГРУППА 3: Публикация → feed-publish.js
- ГРУППА 4: Stories → feed-stories.js

Приоритет выноса:
1. Самая большая группа
2. Самая независимая
3. Легко выделяемая

НЕ ВЫНОСИТЬ:
- init*() функции
- Главные функции модуля

ШАГ 2 - Создание нового файла:

Именование: feed.js → feed-[функционал].js

Примеры:
- feed-interactions.js (реакции, share)
- feed-stories.js (stories)
- auth-social.js (соцсети)

Структура нового файла:
// ═══════════════════════════════════════
// [НАЗВАНИЕ МОДУЛЯ]
// Отделено от [исходный файл]
// ═══════════════════════════════════════

function myFunction() {
  // код
}

// ЭКСПОРТЫ (ОБЯЗАТЕЛЬНО!)
window.myFunction = myFunction;

ШАГ 3 - Удаление из исходного:

Оставить комментарий:
// ═══════════════════════════════════════
// РЕАКЦИИ И SHARE — см. feed-interactions.js
// ═══════════════════════════════════════

ШАГ 4 - Подключение в index.html:

<script type="module" src="js/feed.js"></script>
<script type="module" src="js/feed-interactions.js"></script>

ВАЖНО: Новый файл ПОСЛЕ исходного!

ШАГ 5 - Проверки:
wc -l js/feed.js js/feed-interactions.js
node --check js/feed.js
node --check js/feed-interactions.js
grep "window\." js/feed-interactions.js

ЧАСТЫЕ ОШИБКИ:

ОШИБКА 1 - Забыли экспортировать:
НЕПРАВИЛЬНО: function myFunc() { ... }
ПРАВИЛЬНО: function myFunc() { ... }; window.myFunc = myFunc;

ОШИБКА 2 - Неправильный порядок подключения:
НЕПРАВИЛЬНО: interactions.js до feed.js
ПРАВИЛЬНО: feed.js потом interactions.js

═══════════════════════════════════════════════════
2. SECURITY
═══════════════════════════════════════════════════

ПРАВИЛО 1: Никогда innerHTML для пользовательского контента

УЯЗВИМОСТЬ:
postCard.innerHTML = post.content; // XSS атака!

БЕЗОПАСНО:
postCard.textContent = post.content;

ПРАВИЛО 2: Валидация ВСЕХ input'ов

Email:
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) throw new Error('Некорректный email');
  return email.toLowerCase().trim();
}

Телефон:
function validatePhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10 || cleaned.length > 15) {
    throw new Error('Некорректный номер');
  }
  return '+' + cleaned;
}

Текст поста:
function validatePostContent(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new Error('Пост не может быть пустым');
  if (trimmed.length > 2000) throw new Error('Максимум 2000 символов');
  return trimmed;
}

ПРАВИЛО 3: Безопасная загрузка файлов

async function uploadImage(file) {
  // 1. Проверка типа
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Только JPEG, PNG, WEBP');
  }

  // 2. Проверка размера (5MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Максимум 5MB');
  }

  // 3. Переименовать (не использовать имя от пользователя!)
  const ext = file.type.split('/')[1];
  const randomName = Date.now() + '-' + Math.random().toString(36) + '.' + ext;

  // 4. Upload в Supabase Storage
  const { data, error } = await supabase.storage.from('posts').upload(randomName, file);
  if (error) throw error;
  return data;
}

ПРАВИЛО 4: Supabase Row Level Security (RLS)

В Supabase Dashboard ОБЯЗАТЕЛЬНО включить RLS для всех таблиц!

БЕЗ RLS = ЛЮБОЙ может удалить чужие посты!

═══════════════════════════════════════════════════
3. ERROR HANDLING
═══════════════════════════════════════════════════

ПРАВИЛО 1: Всегда try-catch для async

ПЛОХО:
async function loadPosts() {
  const { data } = await supabase.from('posts').select();
  return data; // Может упасть!
}

ХОРОШО:
async function loadPosts() {
  try {
    const { data, error } = await supabase.from('posts').select();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Load posts error:', err);
    showToast('Ошибка загрузки постов');
    return [];
  }
}

ПРАВИЛО 2: Graceful degradation

async function initFeed() {
  try {
    const posts = await loadPosts();
    renderPosts(posts);
  } catch (err) {
    showEmptyState('Не удалось загрузить ленту. Попробуйте позже.');
  }
}

ПРАВИЛО 3: Retry для сетевых запросов

async function fetchWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}

ПРАВИЛО 4: Понятные сообщения пользователю

function handleError(error) {
  let message = 'Что-то пошло не так';

  if (error.message?.includes('network')) {
    message = 'Проверьте интернет-соединение';
  } else if (error.message?.includes('auth')) {
    message = 'Требуется авторизация';
  } else if (error.message?.includes('permission')) {
    message = 'Недостаточно прав';
  }

  showToast(message);
}

═══════════════════════════════════════════════════
4. MODULE ORGANIZATION
═══════════════════════════════════════════════════

СТРУКТУРА ПРОЕКТА:

js/
├── router.js          — Навигация
├── animations.js      — Общие анимации
├── auth-core.js       — Авторизация
├── auth-ui.js         — UI авторизации
├── supabase-config.js — Подключение
├── supabase-api.js    — API функции
├── feed.js            — Лента (UI, фильтры)
├── feed-data.js       — Данные ленты
├── comments.js        — Комментарии
└── admin-*.js         — Админка (6 файлов)

КУДА ДОБАВЛЯТЬ КОД:

НОВЫЙ ЭКРАН → Новый файл

Пример: Экран "Матч" (свайпы)

Создать:
- templates/match.html
- js/match.js
- css/match.css

В match.js:
function initMatch() {
  // инициализация
}
window.initMatch = initMatch;

В index.html:
<script type="module" src="js/match.js"></script>

В router.js:
case 'scrMatch':
  await ensureTemplate('match');
  initMatch?.();
  break;

НОВЫЙ ФУНКЦИОНАЛ для существующего экрана:
- Файл <400 строк → добавить В ЭТОТ ФАЙЛ
- Файл >450 строк → СОЗДАТЬ ОТДЕЛЬНЫЙ

ОБЩАЯ ФУНКЦИЯ (используется везде):
- Анимация → animations.js
- Форматирование → supabase-api.js
- UI компонент → создать components.js

НЕ ДУБЛИРОВАТЬ!

АНТИПАТТЕРНЫ:

Дублирование кода:
ПЛОХО: function formatTime() в feed.js И в comments.js
ХОРОШО: Вынести в общий файл

Смешивание ответственности:
ПЛОХО: async function sbLoadPosts() в feed.js
ХОРОШО: API только в supabase-api.js

═══════════════════════════════════════════════════
5. CODE QUALITY
═══════════════════════════════════════════════════

ПРАВИЛО 1: Функции <50 строк

ПЛОХО:
function createPost() {
  // ... 80 строк
}

ХОРОШО:
function createPost() {
  validatePost();
  uploadMedia();
  saveToDatabase();
  updateUI();
}

ПРАВИЛО 2: DRY (Don't Repeat Yourself)

Если функция нужна в 2+ местах → вынести в общий файл

ПРАВИЛО 3: Понятные названия

ПЛОХО: function doIt() { ... }; const x = 5;
ХОРОШО: function createPost() { ... }; const MAX_FILE_SIZE = 5000000;

ПРАВИЛО 4: Минимум console.log

Можно: console.error('API error:', err);
Нельзя: console.log('test');

ПРАВИЛО 5: Комментарии = ЗАЧЕМ, НЕ ЧТО

ПЛОХО: // Создаём переменную
ХОРОШО: // Лимит API: максимум 5 запросов

ПРАВИЛО 6: Нет мёртвого кода

Удалять закомментированный код! Git хранит историю.

ПРАВИЛО 7: const > let > var

const MAX = 5;      // Неизменяемое
let counter = 0;    // Изменяемое
// var - НЕ ИСПОЛЬЗУЕМ!

═══════════════════════════════════════════════════
6. NAMING CONVENTIONS
═══════════════════════════════════════════════════

Функции: camelCase
function createPost() { }
async function loadUserData() { }

Файлы: kebab-case
feed-interactions.js
auth-social.js
supabase-config.js

Константы: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 5000000;
const API_TIMEOUT = 30000;

Переменные: camelCase, говорящие
ПЛОХО: const x = getUserId();
ХОРОШО: const userId = getUserId();

CSS классы: BEM
.post-card { }
.post-card__title { }
.post-card__title--highlighted { }

Булевы переменные: is/has/should
const isLoading = true;
const hasPermission = false;

Event handlers: handle/on
function handleClick() { }
function onSubmit() { }

═══════════════════════════════════════════════════
7. PERFORMANCE
═══════════════════════════════════════════════════

ПРАВИЛО 1: Lazy loading картинок

<img src="placeholder.jpg" data-src="real.jpg" loading="lazy" class="lazy-img" />

document.querySelectorAll('.lazy-img').forEach(img => {
  img.src = img.dataset.src;
});

ПРАВИЛО 2: Debounce для поиска

ПЛОХО: запрос на каждую букву
input.addEventListener('input', (e) => {
  search(e.target.value);
});

ХОРОШО: запрос через 300ms после остановки печати
let timeout;
input.addEventListener('input', (e) => {
  clearTimeout(timeout);
  timeout = setTimeout(() => search(e.target.value), 300);
});

ПРАВИЛО 3: Pagination вместо "загрузить всё"

ПЛОХО: const { data } = await supabase.from('posts').select();
ХОРОШО: const { data } = await supabase.from('posts').select().range(0, 19);

ПРАВИЛО 4: Image compression перед upload

async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > 1200) {
          height = (height * 1200) / width;
          width = 1200;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', 0.85);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

═══════════════════════════════════════════════════
8. ERROR MESSAGES
═══════════════════════════════════════════════════

ПРАВИЛО: Дружелюбно, не технично

ПЛОХО:
"ERR_NETWORK_TIMEOUT"
"Invalid input format"
"403 Forbidden"

ХОРОШО:
"Проверьте интернет-соединение"
"Некорректный email"
"Недостаточно прав для этого действия"

ПРИМЕРЫ ХОРОШИХ СООБЩЕНИЙ:

Сеть:
- "Нет интернета. Проверьте соединение"
- "Сервер временно недоступен. Попробуйте через минуту"

Валидация:
- "Email должен содержать @"
- "Пароль минимум 8 символов"
- "Слишком большое фото (макс 5MB)"

Загрузка:
- "Загрузка..."
- "Почти готово..."

Успех:
- "Пост опубликован! +15 XP"
- "Настройки сохранены"

Пустое состояние:
- "Здесь пока пусто. Создайте первый пост!"
- "Нет новых уведомлений"

═══════════════════════════════════════════════════
9. UI PATTERNS
═══════════════════════════════════════════════════

ПРАВИЛО 1: Модалки — единая функция showModal()
ПРАВИЛО 2: Toast — единая функция showToast()
ПРАВИЛО 3: Loader — showLoader() / hideLoader()
ПРАВИЛО 4: Skeleton — плейсхолдеры при загрузке

Всегда использовать ОДНИ И ТЕ ЖЕ функции для одних элементов!

═══════════════════════════════════════════════════
10. SUPABASE
═══════════════════════════════════════════════════

ПРАВИЛО 1: RLS (Row Level Security) — ОБЯЗАТЕЛЬНО включить!

ПРАВИЛО 2: Retry при ошибке сети (3 попытки)

ПРАВИЛО 3: Batch операции вместо циклов

ПЛОХО: for (let id of ids) await update(id);
ХОРОШО: await supabase.rpc('batch_update', { ids });

ПРАВИЛО 4: Оптимистичные обновления

async function likePost(postId) {
  updateLikeUI(postId, true); // Сразу
  try {
    await supabase.from('post_likes').insert({ post_id: postId });
  } catch (err) {
    updateLikeUI(postId, false); // Откат
  }
}

ПРАВИЛО 5: SELECT только нужные поля

ПЛОХО: .select() // все поля
ХОРОШО: .select('id, content, created_at')

═══════════════════════════════════════════════════
11. STATE MANAGEMENT
═══════════════════════════════════════════════════

localStorage — что хранить:
ХРАНИТЬ: user, token, theme
НЕ ХРАНИТЬ: пароли, чувствительные данные

currentProfile — глобальное состояние:
window.currentProfile = null;

Очистка при logout:
localStorage.removeItem('mlm_user');
localStorage.removeItem('mlm_token');
window.currentProfile = null;

═══════════════════════════════════════════════════
12. ANIMATIONS
═══════════════════════════════════════════════════

ПРАВИЛО 1: Duration 150-300ms (НЕ ДОЛЬШЕ!)

ПРАВИЛО 2: Easing cubic-bezier

ПЛОХО: transition: all 0.2s linear;
ХОРОШО: transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

ПРАВИЛО 3: GPU acceleration

ПЛОХО: transition: left 0.2s;
ХОРОШО: transition: transform 0.2s; transform: translateX(10px);

Использовать: transform, opacity
НЕ использовать: left, top, width, height

ПРАВИЛО 4: 60 FPS обязательно

ПРАВИЛО 5: Когда НЕ анимировать
- Первую загрузку страницы
- При слабом устройстве

═══════════════════════════════════════════════════
ЧЕКЛИСТ ПЕРЕД НАЧАЛОМ РАБОТЫ
═══════════════════════════════════════════════════

СТРУКТУРА:
- Прочитал MASTER_RULES.md
- Прочитал ARCHITECTURE.md
- Понял куда добавлять код

РАЗМЕР:
- Проверил размер файла: wc -l
- Если >450 строк → применил REFACTORING

КАЧЕСТВО:
- Функции <50 строк
- Нет дублирования
- Понятные названия
- try-catch для async

БЕЗОПАСНОСТЬ:
- textContent, НЕ innerHTML
- Валидация input'ов
- RLS включен в Supabase

ПРОИЗВОДИТЕЛЬНОСТЬ:
- Lazy loading картинок
- Debounce для поиска
- Pagination для списков

ПОСЛЕ ИЗМЕНЕНИЙ:
- Проверил синтаксис: node --check
- Протестировал в браузере
- Нет ошибок в F12 Console

═══════════════════════════════════════════════════
ИТОГ
═══════════════════════════════════════════════════

Эти правила = ЗАКОН проекта!

Следуя им:
✅ Код безопасный
✅ Код быстрый
✅ Код читаемый
✅ Код поддерживаемый на 10+ лет

Удачи в разработке!
