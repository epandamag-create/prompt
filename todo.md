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
- [x] `filter-service.js` — двойная фильтрация: удалён `getFiltered()`, `applyFilters()` теперь вызывает `clearPromptCache()` + `renderAll()`
- [x] `filter-service.js` — удалён дублирующий `updateTitle()`, игнорируемые параметры убраны; `updateContentTitle()` в `render.js` дополнена отображением поискового запроса

### Рефакторинг
- [x] `app-initializer.js` — пример-промпт теперь создаётся через `createPromptModel()`
- [x] `filter-service.js` / `prompt-service.js` — поисковый запрос хранится в `state.searchQuery` в оригинальном регистре; `.toLowerCase()` применяется только при сравнении в `getFilteredPrompts()`

### Хранилище
- [x] Внедрён Dexie.js (IndexedDB) вместо localStorage — лимит ~5 МБ → сотни МБ. Новые файлы: `js/services/db.js`, `js/vendor/dexie.mjs`. `storage-service.js` полностью переписан с async API. `state.js`, `app-initializer.js`, `events.js`, `variable-service.js` обновлены под async. Одноразовая миграция данных из localStorage при первом запуске. Синхронизация вкладок сохранена через `promptOrganizerSync` в localStorage.

### Новые функции
- [x] Синхронизация вкладок через `window.addEventListener('storage', ...)` — `app-initializer.js`, `state.js` (`reloadFromTabSync()`)
- [x] Полноценный стек undo/redo (Ctrl+Z / Ctrl+Shift+Z) — новый `history-service.js`, интегрирован в `prompt-service.js` (create/update/delete); `hotkey-manager.js` теперь поддерживает `shift` модификатор
- [x] Горячие клавиши на карточке: `e` — редактировать, `c` — копировать, `f` — избранное, `del` — удалить — `events.js`, `state.ui.hoveredCardId`, `setupCardHoverTracking()` в `event-setup-service.js`
- [x] Сортировка коллекций и категорий перетаскиванием (drag-and-drop) — `render.js` (drag handle + draggable), `setupSidebarDragHandlers()` в `event-setup-service.js`, CSS-стили
- [x] Экспорт только текущего отфильтрованного вида — `io-controller.js` (`showExportModal(scope)`, `_updateExportCount()`), счётчик в модале экспорта
- [x] Подтверждение массового удаления через `confirmModal` — уже реализовано в `bulk-controller.js`
- [ ] Toast-предупреждение при достижении 80% заполненности localStorage (сейчас только `console.warn`)
