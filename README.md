# Mono — приложение репетитора (финансы + учитель)

Прототип одностраничного приложения на чистом HTML/CSS/JS (без сборки и зависимостей).
Открывать `index.html` (локальный сервер: `python3 -m http.server 8080`).

## Структура
```
index.html              — точка входа: layout-каркас + подключение css/js
developed_layout_readme.html — исходный layout-референс (не редактировать!)
Иконка.png              — favicon
Бюджеты/ дашборды/ Ученики/ Налоги/ Операции/ Цели/ Планируемые платежи/ Счета и транзакции/ Инвестиции/
                        — карточки-референсы «Домкнига» (эталон стилей, не редактировать)
src/css/tokens.css      — ДИЗАЙН-ТОКЕНЫ: палитра light/dark, семантика, chart-палитра
src/css/layout-base.css — стили каркаса из reференсного layout (токены вырезаны → tokens.css)
src/css/components.css  — переиспользуемые UI-компоненты (kpi, badge, progress, donut, bars…)
src/js/core.js          — window.u: иконки, money(), donutSVG(), legendHTML(), partials…
src/data/mock.js        — window.DB: мок-данные всех разделов (заменится на API)
src/js/views/home.js    — Главная: kpi, hub-плитки, donut расходов, ближайшие дела
src/js/views/teacher.js — Учитель: ученики/занятия, фильтры, сортировки
src/js/views/budget.js  — Бюджет: бюджеты по категориям, bars по месяцам, операции
src/js/views/finance.js — operations/accounts/planned/taxes/investments/goals/dashboards (MVP-каркасы)
src/js/app.js           — роутинг(hash), состояние, FAB-веер, быстрые формы, темы, скелетоны
docs/READMY_DEV.md      — ⚠ ПОДСКАЗКИ ДЛЯ СЛЕДУЮЩИХ ЭТАПОВ — читать и обновлять каждый раз!
```

## Статус этапов
- [x] Этап 1: каркас layout + дизайн-токены (light/dark)
- [x] Этап 2: IA — 10 маршрутов (hash-router), rail-навигация, home-hub
- [~] Этап 3: view-модули — home/teacher/budget готовые; finance — MVP-каркасы, нужна pixel-точная стилизация по карточкам Домкнига
- [x] Этап 4 (частично): FAB-веер + веерные формы (student/transaction/lesson/statement), мутация моков
- [ ] Этап 5: бэкенд (API + хранилище вместо mock.js)
- [ ] Этап 6: полировка, PWA, тесты

## Как добавить новый раздел
1. Данные → `src/data/mock.js`.
2. Иконку → `src/js/core.js` (`ic`).
3. View → файл в `src/js/views/` (функция `Views.<route>(ctx)` использует глобальный `page(html)`).
4. Маршрут → `routesMeta` в `src/js/app.js`; кнопку → rail в `index.html` (+ hub-плитку в home.js).
5. Стили — только через токены из `tokens.css`, новые компоненты в `components.css`.

Подробные заметки и план следующих шагов: **docs/READMY_DEV.md**
