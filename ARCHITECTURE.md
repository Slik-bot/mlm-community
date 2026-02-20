# АРХИТЕКТУРА ПРОЕКТА MLM COMMUNITY

## СТРУКТУРА ПРОЕКТА

```
mlm-community/
├── index.html              — точка входа, подключает все скрипты и стили
├── templates/              — HTML-шаблоны экранов (загружаются динамически)
│   └── landing.html        — лендинг
├── js/                     — JavaScript модули
│   ├── router.js           — навигация, загрузка шаблонов
│   ├── landing.js          — логика лендинга (initLanding)
│   ├── dna-test.js         — ДНК-тест
│   ├── onboarding.js       — онбординг
│   ├── feed.js             — лента
│   ├── feed-data.js        — данные ленты
│   ├── comments.js         — комментарии
│   ├── animations.js       — анимации
│   ├── auth-core.js        — авторизация (логика)
│   ├── auth-ui.js          — авторизация (UI)
│   ├── supabase-config.js  — конфиг Supabase
│   └── supabase-api.js     — API Supabase
├── css/                    — стили
└── assets/                 — изображения, иконки
```

## ЛИМИТЫ РАЗМЕРА (СТРОГО)

| Тип    | Лимит     | Действие при превышении          |
|--------|-----------|----------------------------------|
| HTML   | < 500 строк | Разбить на компоненты           |
| JS     | < 500 строк | Вынести в отдельный файл        |
| CSS    | < 800 строк | Разбить по секциям              |

Функции: < 50 строк каждая.

## ИМЕНОВАНИЕ ФАЙЛОВ

- Экраны: `scr` + PascalCase (`scrLanding`, `scrChat`, `scrProfile`)
- HTML: kebab-case (`landing.html`, `chat-list.html`)
- JS: kebab-case (`chat.js`, `chat-data.js`)
- CSS: kebab-case (`chat.css`, `chat-mobile.css`)
- Init-функции: `init` + PascalCase (`initLanding`, `initChat`)

## ПАТТЕРН: НОВЫЙ ЭКРАН

Каждый экран состоит из:

1. `templates/[name].html` — разметка
2. `js/[name].js` — логика с `init[Name]()` + `window.init[Name] = init[Name]`
3. `css/[name].css` — стили
4. Обновить `router.js`: добавить в `TEMPLATES` + вызов init в `ensureTemplate`
5. Обновить `index.html`: подключить JS и CSS

## ПАТТЕРН: init-ФУНКЦИЯ

```javascript
// js/chat.js
function initChat() {
  // Все обработчики, привязки, инициализация
  // Вызывается ПОСЛЕ загрузки шаблона в DOM
}
window.initChat = initChat;
```

```javascript
// router.js — в ensureTemplate
if (id === 'scrChat') {
  if (window.initChat) window.initChat();
}
```

## ДИЗАЙН-СИСТЕМА (НЕ МЕНЯТЬ)

- Шрифт: Outfit (300-900)
- Фон: #06060b
- Primary: #8b5cf6
- Glass: rgba(255,255,255,0.035), border rgba(255,255,255,0.06)
- Радиусы: 14px карточки, 10px кнопки, 50% аватары
- Анимации: 200-400ms, cubic-bezier(0.16, 1, 0.3, 1)
- Mobile-first: max-width 420px
- ДНК: Стратег #3b82f6, Коммуникатор #22c55e, Креатор #f59e0b, Аналитик #a78bfa

## ЗАПРЕЩЕНО

- React, Vue, jQuery — только vanilla HTML/CSS/JS
- console.log в продакшн-коде
- TODO/FIXME без задачи
- Файлы > лимита
- Дублирование кода
- Emoji в UI (только SVG-иконки)

---

## ЖЕЛЕЗНЫЕ ПРАВИЛА РАБОТЫ (СТРОГО!)

### КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:

- Менять файлы без явного разрешения
- Превышать лимиты строк (HTML <500, JS <500, CSS <800)
- Удалять существующий код без подтверждения
- Создавать файлы вне структуры (templates/, js/, css/)
- Оставлять console.log (кроме error handlers)
- Оставлять TODO/FIXME без задачи
- Оставлять закомментированный код
- Дублировать функции
- Хардкодить значения (использовать константы)

### ОБЯЗАТЕЛЬНО ПЕРЕД ЛЮБЫМ ИЗМЕНЕНИЕМ:

1. Создать резервную копию: `cp файл файл.backup.[описание]`
2. Проверить что файл существует
3. Проверить текущий размер файла
4. Понять что меняешь и зачем

### ОБЯЗАТЕЛЬНО ПОСЛЕ ЛЮБОГО ИЗМЕНЕНИЯ:

1. Проверить размер: `wc -l файл` (< лимит!)
2. Проверить синтаксис: `node --check файл.js`
3. Показать diff: `diff файл.backup файл`
4. Проверить на console.log: `grep "console.log" файл`
5. Проверить на TODO: `grep "TODO\|FIXME" файл`

### ЕСЛИ ФАЙЛ ПРЕВЫСИЛ ЛИМИТ:

СТОП! НЕ ПРОДОЛЖАТЬ!

1. Откатить: `cp файл.backup файл`
2. Разбить на модули
3. Создать новые файлы
4. Распределить код
5. Проверить размеры снова

---

## ШКАЛА РАЗМЕРОВ

### HTML / JS файлы:
- 0-300 строк — отлично
- 300-400 строк — хорошо
- 400-500 строк — предел
- 500+ строк — СТОП! Разбить!

### CSS файлы:
- 0-400 строк — отлично
- 400-600 строк — хорошо
- 600-800 строк — предел
- 800+ строк — СТОП! Разбить!

---

## ОБЯЗАТЕЛЬНЫЕ ПРОВЕРКИ ПЕРЕД КОММИТОМ

```bash
# 1. Размеры всех файлов
find templates -name "*.html" -exec wc -l {} \; | awk '$1 > 500 {print "ПРЕВЫШЕН:", $2}'
find js -name "*.js" -exec wc -l {} \; | awk '$1 > 500 {print "ПРЕВЫШЕН:", $2}'
find css -name "*.css" -exec wc -l {} \; | awk '$1 > 800 {print "ПРЕВЫШЕН:", $2}'

# 2. Синтаксис всех JS
find js -name "*.js" -exec node --check {} \;

# 3. Мёртвый код
grep -r "console.log" js/ | grep -v "error" | grep -v "catch"
grep -r "TODO\|FIXME" .
grep -r "debugger" js/

# 4. Дубликаты функций
grep -r "^function " js/ | sort
```
