# ПРОЦЕСС РАБОТЫ

## ДОБАВИТЬ НОВЫЙ ЭКРАН

### Шаг 1: Подготовка
- Определить ID экрана: `scr[Name]`
- Определить файлы: `[name].html`, `[name].js`, `[name].css`
- Оценить размер (HTML <500, JS <500, CSS <800)

### Шаг 2: HTML шаблон
- Создать `templates/[name].html`
- Обернуть в `<div class="scr hidden" id="scr[Name]">`
- Добавить секции экрана

### Шаг 3: JavaScript
- Создать `js/[name].js`
- Написать `function init[Name]() { ... }`
- Экспортировать: `window.init[Name] = init[Name];`
- Все обработчики внутри init-функции

### Шаг 4: CSS
- Создать `css/[name].css`
- Использовать дизайн-систему из ARCHITECTURE.md
- Mobile-first, max-width 420px

### Шаг 5: Интеграция
- `router.js`: добавить в TEMPLATES + вызов init в ensureTemplate
- `index.html`: подключить `<script src="js/[name].js"></script>` и `<link rel="stylesheet" href="css/[name].css">`

### Шаг 6: Проверки
```bash
wc -l templates/[name].html js/[name].js css/[name].css
node --check js/[name].js
grep "window.init" js/[name].js
```

### Шаг 7: Тестирование
- Cmd+Shift+R в браузере
- Переход на экран работает
- Обработчики привязаны
- Нет ошибок в консоли

---

## ИЗМЕНИТЬ СУЩЕСТВУЮЩИЙ ФАЙЛ

1. Резервная копия: `cp файл файл.backup.[описание]`
2. Прочитать файл, найти нужные строки
3. Внести точечные изменения (REPLACE, не дублировать)
4. Проверить размер < лимита
5. Проверить синтаксис: `node --check`
6. Показать diff
7. Тестировать в браузере

---

## ЕСЛИ ФАЙЛ ПРЕВЫСИЛ ЛИМИТ

Разбить на модули:

| Было                  | Стало                           |
|-----------------------|---------------------------------|
| chat.js (600 строк)  | chat.js (300) + chat-ui.js (300)|
| feed.css (900 строк)  | feed.css (500) + feed-cards.css (400)|

Правило: каждый модуль должен иметь одну ответственность.

---

## ПРОГРЕСС ПРОЕКТА

### Готово (12/51 экранов)
- Phase 1: Onboarding (экраны 1-7)
- Phase 2: Feed (экраны 8-12)

### Следующий: Phase 3 — Companies (экраны 13-18)
- scrCompanies — каталог компаний
- scrCompanyProfile — профиль компании
- scrCompanyMembers — участники компании
- scrCompanyCreate — создание компании
- scrCompanyEdit — редактирование
- scrCompanyStats — статистика

---

## КРИТИЧЕСКИЕ ПРАВИЛА

### ВСЕГДА ДЕЛАТЬ:

1. Резервная копия перед любым изменением: `cp файл файл.backup.[описание]`
2. Проверить размер после изменения: `wc -l файл`
3. Проверить синтаксис: `node --check файл.js`
4. Показать diff: `diff файл.backup файл`
5. Проверить на мусор: `grep "console.log\|TODO\|FIXME" файл`

### НИКОГДА НЕ ДЕЛАТЬ:

- Менять без backup
- Превышать лимиты строк
- Оставлять console.log
- Дублировать код
- Удалять без разрешения

---

## ЕСЛИ ПРЕВЫСИЛ ЛИМИТ

1. Откатить: `cp файл.backup файл`
2. Разбить на модули:
   - `feed.js` (600 строк) -> `feed.js` (300) + `feed-ui.js` (200) + `feed-data.js` (100)
   - `chat.css` (900 строк) -> `chat.css` (500) + `chat-mobile.css` (400)
3. Проверить снова: `wc -l` все части < лимита
4. Продолжить

---

## ЕЖЕНЕДЕЛЬНАЯ ПРОВЕРКА

```bash
# Найти большие файлы
find templates -name "*.html" -exec wc -l {} \; | awk '$1 > 500'
find js -name "*.js" -exec wc -l {} \; | awk '$1 > 500'
find css -name "*.css" -exec wc -l {} \; | awk '$1 > 800'

# Найти мусор
grep -r "console.log" js/ | grep -v "error" | grep -v "catch"
grep -r "TODO\|FIXME" .
grep -r "debugger" js/

# Дубликаты функций
grep -r "^function " js/ | sort
```

Если что-то найдено — исправить на следующей неделе.
