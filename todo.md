# Todo / Changelog

## Выполнено

### Code Review — исправление багов
- [x] `storage-service.js` — исправлен баг с `saveVariableValues`/`loadVariableValues`: метод принимал неверные аргументы, сохраняя ID промпта вместо значений переменных — персистентность переменных была полностью сломана
- [x] `import-export-service.js` — исправлен баг с `collectionMap`/`categoryMap`: карты индексировались по имени, но искались по ID — импортированные промпты теряли привязку к коллекциям и категориям
- [x] `import-export-service.js` — CSV-импорт не вызывал `renderAll()` после сохранения — UI не обновлялся после импорта из CSV
- [x] `import-export-service.js` — заменён сырой `JSON.parse()` на `safeJsonParse()` для проверки лимита 5 МБ при импорте

### Code Review — качество кода
- [x] `prompt-service.js` — `delete()` и `restore()` теперь делегируют в `stateManager` (убран дублирующий код, который также пропускал `stateVersion++`)
- [x] `prompt-service.js` — извлечён хелпер `commitAndRender()` вместо 7 одинаковых блоков `clearPromptCache(); save(); renderPrompts()`
- [x] `prompt-service.js` — извлечён хелпер `getPromptMap()` вместо 3 одинаковых `new Map(state.prompts.map(...))`
- [x] `prompt-service.js` — убраны лишние `variables` и `updatedAt` в `savePrompt()` — `update()` уже выставляет их сам
- [x] `prompt-service.js` — убрано мёртвое ручное присвоение `_searchIndex` в `update()` (геттер всегда пересчитывает сам)
- [x] `import-export-service.js` — извлечён хелпер `triggerDownload()` вместо 3 одинаковых блоков blob/anchor/click/revoke
- [x] `import-export-service.js` — двухпроходный upsert коллекций/категорий объединён в один проход
- [x] `render.js` — `updateCollectionDropdown` и `updateCategoryDropdown` объединены через общий `updateDropdown()`
- [x] `helpers.js` — удалён путь к файлу на Windows-машине разработчика из первой строки
- [x] `state.js` — удалена бесполезная обёртка `isValidArray()` (дублировала `Array.isArray`)
- [x] `render.js` — убрано мёртвое присвоение `const pagination = renderPagination(...)`
- [x] `models/prompt.js` — удалён мёртвый сеттер `_searchIndex` (писал в `_cachedSearchIndex`, который никто не читал)
- [x] `models/prompt.js` — удалена неиспользуемая экспортируемая функция `getSearchIndex()`
- [x] `validation.js` — убраны ложные сообщения об ошибках для авто-исправленных ID (ID исправлялся через `sanitizeId()`, но пользователю сообщалось об ошибке)
- [x] `render.js` — заменены сырые строки `'all'`/`'favorites'`/`'recent'` на константы `VIEWS.*`
- [x] `render.js` — `MAX_PREVIEW_CHARS` перенесена с уровня функции на уровень модуля
- [x] `render.js` — добавлены null-guard в `renderTags`, `renderCollections`, `renderCategories` (защита от `TypeError` при вызове с `undefined`)

### Code Review — производительность
- [x] `prompt-service.js` — ключ кэша: `JSON.stringify` заменён на конкатенацию строк
- [x] `render.js` — `generatePromptCardHTML` получает готовые Maps из `renderPrompts()` вместо O(n) `.find()` на каждую карточку
- [x] `render.js` — `updateSidebarHighlights` конвертирует массивы фильтров в Sets перед циклом → O(1) `.has()` вместо O(n) `.includes()`
- [x] `render.js` — `updateContentTitle` и `renderFilterBar` строят Maps один раз вместо O(n) `.find()` на каждый фильтр
- [x] `import-export-service.js` — `_convertToCSV` строит Maps перед циклом вместо O(n) `.find()` на каждую строку

### Документация
- [x] Создан `README.md` с описанием приложения, структурой файлов, архитектурой, моделью данных и инструкцией по запуску
- [x] Создан `todo.md` для отслеживания изменений

---

## В работе

_Нет активных задач_

---

## Планируется

### Баги
- [ ] `filter-service.js` — двойная фильтрация: `getFiltered()` повторно применяет фильтры, которые уже применил `getFilteredPrompts()`
- [ ] `filter-service.js` — `renderPrompts(filtered)` передаёт аргумент, который функция игнорирует; `updateContentTitle(title)` — аналогично

### Рефакторинг
- [ ] `app-initializer.js` — пример-промпт создаётся как сырой объект вместо `createPromptModel()`

### Новые функции
- [ ] Синхронизация вкладок через `window.addEventListener('storage', ...)`
- [ ] Полноценный стек undo/redo (сейчас только отмена удаления)
- [ ] Горячие клавиши на карточке: `e` — редактировать, `c` — копировать, `f` — избранное, `del` — удалить
- [ ] Подтверждение массового удаления через `confirmModal`
- [ ] Toast-предупреждение при достижении 80% заполненности localStorage (сейчас только `console.warn`)
- [ ] Экспорт только текущего отфильтрованного вида
