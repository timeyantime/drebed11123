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

## Этап 11 (2026-11-02) — анимации, тонкая настройка, синхронизация превью-режимов
Сделано:
- layout-base.css: добавлен блок «ЭТАП 11» — правила :root[data-preview="desktop"] (.nav-history grid, .toolbar flex, .bottom-nav none, .desktop-fab block), синхронизирующие принудительный режим с реальными @media ≥1180px; глобальный prefers-reduced-motion блок продублирован в конец файла (раньше не покрывал компоненты).
- components.css: блок «ЭТАП 11» — shimmer-пульс .skeleton, классы .ring (кольцевой прогресс, stroke-dashoffset transition), .chip.is-active, .hub-tile[aria-current], hover-shadow для .panel, active-scale для табов/rail-кнопок.
- app.js animateIn(): stagger теперь считается только для верхнеуровневых блоков (.panel/.kpi-grid/.hub-grid/.quick-grid/.detail-hero; вложенные не дублируют анимацию), шаг 40мс, потолок 280мс.
- docs/smoke.py: добавлены проверки переключения data-preview и существования таба «Ещё»; SMOKE OK + UNDO TEST OK локально (python http.server 8090 + Playwright).

Не сделано / продолжить:
- ✅ u.ringSVG(ratio,label,size) добавлен в core.js и применён в Views.goals (finance.js) вместо linear progress — проверено smoke.
- Pixel-портинг карточек Домкнига (план A выше) — по-прежнему главный долг дизайна. Следующий шаг: «Операции/операции.html» → виртуальный список + rich-строки; затем B2 бюджеты.
- Чипы фильтров в operations используют is-active ✓ (совпадает с CSS).
- Перед релизом удалить dev-preview/dev-frame (см. этап 7/8 заметки).
- .ring-fg transform rotate(-90deg) через CSS — проверить в браузере корректность старта дуги (Safari иногда игнорирует transform-origin на SVG circle; при проблемах — повернуть через viewBox transform).

## Этап 12 — Операции v2 (Домкнига-порт) ✅ (2026-11-02)
Сделано:
- Сводка «Доходы / Расходы / Итог» над списком (.ops-summary, считается по отфильтрованным).
- Группировка списка по дням («31 октября», .ops-group + .group-head), даты DD.MM парсятся в порядок.
- Иконки категорий слева у строк (.cat-icon: Ученики/Работа/Личное/Развитие → teacher/briefcase/wallet/book; hue по категории).
- Сортировка: цикл Дата↓ → Дата↑ → Сумма↓ → Сумма↑ (state.operations.dir), чип с arrow-up/down (новые иконки в core.js ic).
- Empty-state поиска + кнопка «Сбросить фильтры» (action reset-ops-filters).
- smoke.py расширен блоком «operations v2 OK»; SMOKE OK + UNDO TEST OK локально.
Заметки:
- txRowPayable больше не печатает дату в row-meta (она в заголовке группы); home-виджет transactionRow не трогали.
- state.operations теперь содержит dir ("desc"|"asc"); mock-даты только окт-нояб 2026 — группировка завязана на формат /^\d{2}\.\d{2}/.
Дальше (Этап 13):
- Тонкая настройка: карточки Бюджета (B2 plan/fact двойная шкала), Дашборды (D1/D2 layout из Домкниги), кольцевые диаграммы с анимацией прорисовки.
- Анимация появления групп (.ops-group fade/slide stagger), hover-состояния строк в dark/light.
- Раздел «Счета»: детальные карточки счетов + мини-график баланса.
- Полировка mobile: safe-area у .ops-summary, горизонтальный скролл чипов.

## Как перенести мои коммиты к тебе (песочница без доступа к GitHub)
Я не могу пушить и создавать PR. Все изменения закоммичены в локальную ветку `main`
(HEAD = Этап 12, a472fec). Экспортирован портативный пакет: **`mono-etap12.bundle`**
(содержит все коммиты от f9f370a до HEAD, требует наличие f9f370a в твоём репо — оно есть).

На своей машине в клоне drebed11123:
```bash
git fetch mono-etap12.bundle main:mono-agent   # или скачанный файл bundle
git checkout -b feature/etap-12-ui mono-agent
git push -u origin feature/etap-12-ui          # затем создать PR feature/etap-12-ui → main на GitHub
# либо просто: git merge mono-agent && git push origin main
```
Альтернатива без bundle: скачать файлы из /workspace (src/, docs/, index.html и т.д.) и закоммитить самому.
