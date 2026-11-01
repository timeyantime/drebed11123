# READMY_DEV — подсказки для следующих этапов (обновлять каждый этап!)

Дата: 2026-11-02. Прогресс: этапы 1–2 готовы, этап 3 частично, этап 4 частично.

## Что уже сделано
### Этап 1 — каркас + токены
- `index.html` собран из `developed_layout_readme.html`: head с FOUC-скриптом темы,
  CSS подключены в порядке tokens → layout-base → components.
- Из layout-base.css ВЫРЕЗАНЫ блоки `:root{}` и `[data-theme=light]{}` — теперь они в tokens.css.
  ВНИМАНИЕ: layout-base.css начинается с `<style>`? — нет, теги удалены, файл чистый CSS.
- Токены объединяют монохром Mono (bg/surface/text/muted/hover/selected/active-bg)
  и палитру Домкниги (accent #6c5ce7/#8b7cff, green/amber/red/blue + *-bg + chart-1..8).
- Классы-помощники: .t-income/.t-expense/.t-pending, .badge--paid/pending/overdue/info/neutral/accent.

### Этап 2 — навигация и структура
- routesMeta (app.js): home, teacher, budget, operations, accounts, planned, taxes, investments, goals, dashboards.
- Rail (desktop/tablet): 3 core + rail-sep + 7 доп. пунктов. Bottom-nav (mobile): 4 таба (последний «Ещё» → data-action="more" открывает веер FAB).
- Home = hub: quick-grid + 4 KPI + hub-grid (7 плиток) + dash-grid (donut/списки/import).
- Новые SVG-иконки в core.js: operations, accounts, payments, taxes, investments, goals, dashboards, chevron, search, wallet.

### Этап 3 — view-модули
- ctx = { DB, state, quickActions, emptyHTML, showToast, goTo }; вьюхи пишут HTML через глобальный `page()` (авто-fillIcons + fadeUp-анимация).
- Общие partials в u.partials: lessonRow/studentRow/transactionRow/statPanel; avatar-инициалы с hsl-цветом.
- Компоненты: .kpi-grid/.kpi, .progress(.ok/.warn/.over)+.budget-row, .donut(SVG)+.legend, .bars, .hub-tile, .panel-head, .link-btn, .secondary-btn, .segmented.period.
- DONUT: u.donutSVG(data,{centerText,caption}) — circle stroke-dasharray, R=42, C≈263.9, сегменты с зазором 1.5.
- finance.js — МВП-КАРКАСЫ: полная pixel-точная стилизация по папкам Домкнига ЕЩЁ НЕ сделана (см. план).

### Этап 4 — взаимодействия
- Быстрые действия открывают genericModal (#genericForm) — форма строится из buildForms() (лениво, списки учеников/счетов актуальны).
- Submit мутирует window.DB и перерисовывает текущий route («Сохранено (демо)»).
- Долгое нажатие на FAB повторяет последнюю форму (localStorage mono-last-quick). Escape/backdrop закрывают.
- theme-color meta обновляется при переключении темы.

## ⚠ Известные упрощения / техдолг
1. Mock-данные правятся in-memory — после перезагрузки сбрасываются (нужен localStorage-слой или API).
2. Формы без валидации (novalidate) и без датпикеров.
3. Импорт выписки — заглушка.
4. Нет экранов: профиль, помощь по разделам, расписание-неделя, карточка ученика (детали).
5. .row кликабельна только визуально (cursor:pointer), переходов в детали нет.
6. Skeleton показывается 360мс при каждой смене hash — при живых данных заменить реальным fetch-pending.

## 📋 План следующего этапа (приоритеты)
A. Pixel-портing карточек Домкнига в разделы (по одной папке за итерацию, сверять с reференсом):
   1) «Операции/операции.html» → Views.operations (виртуальный список, поиск, фильтр по счетам);
   2) «Бюджеты/Дашборд_B2…» → детально: категории-подбюджеты, копилки;
   3) «дашборды/Дашборд_D1/D2…» → динамика+прогноз; «Дашборд_C1…» → цели (pie+doughnut, целевые взносы);
   4) «Налоги/налоги.html» → календарь налогов, доли от дохода, авто-накопление;
   5) «Планируемые платежи…» → recurring, статусы; «Счета и транзакции/E1…» → тренд баланса;
   6) «Инвестиции/Дашборд_I1…» → портфель donut, дивиденды; «Ученики/UX/*» → карточка ученика, журнал занятий, генерация занятий, напоминания об оплате.
B. Детальная страница ученика (route teacher/student/:id?) — пока один route, параметры hash не парсятся (routeFromHash normalize).
C. Персистентность: src/js/store.js — обёртка над localStorage (DB.load/save), затем замена на fetch API (backend: см. ветку/папку api/? — ещё нет).
D. Формы: валидация, type=date/time, mask денег.
E. A11y: aria-current для hub-плиток, live-region для skeleton→content, contrast-check badges в light.
F. PWA: manifest.json + service worker (offline shell), иконки из Иконка.png.

## Конвенции (соблюдать!)
- Никаких хардкод-цветов в компонентах — только var(--token).
- Тексты/лейблы на русском, формат денег Intl ru-RU RUB через u.money().
- Каждый новый CSS-блок комментировать «Этап N».
- После изменений: node --check всех js, открыть index.html, проверить dark/light + mobile(rail hidden)/tablet/desktop, reduced-motion.
- Тест-маршруты: #home #teacher #budget #operations #accounts #planned #taxes #investments #goals #dashboards (несуществующий → home).
