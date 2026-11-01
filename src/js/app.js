/* ============================================================
   MONO — APP: роутинг, состояние, события, FAB, модалки
   Зависимости: core.js (u), data/mock.js (DB), views/*.js (Views)
   Хелпер page(html) объявлен здесь глобально — вьюхи его используют.
   ============================================================ */
(function () {
  "use strict";

  const quickActions = [
    { key: "student", label: "Ученик", full: "Добавить ученика", sub: "Новый контакт", icon: "userPlus" },
    { key: "transaction", label: "Операция", full: "Новая операция", sub: "Доход или расход", icon: "card" },
    { key: "statement", label: "Выписка", full: "Загрузить выписку", sub: "Импорт из банка", icon: "upload" },
    { key: "lesson", label: "Занятие", full: "Запланировать занятие", sub: "Урок и время", icon: "calendar" }
  ];

  const routesMeta = {
    home: { title: "Домой", subtitle: "Сводка, ближайшие дела и быстрые действия" },
    teacher: { title: "Учитель", subtitle: "Ученики, занятия и статусы оплаты" },
    budget: { title: "Бюджет", subtitle: "Личные финансы, операции и выписки" },
    operations: { title: "Операции", subtitle: "Все транзакции по счетам" },
    accounts: { title: "Счета", subtitle: "Банковские счета и кошельки" },
    planned: { title: "Планируемые платежи", subtitle: "Что нужно оплатить и когда" },
    taxes: { title: "Налоги", subtitle: "Режим, расчёты и сроки уплаты" },
    investments: { title: "Инвестиции", subtitle: "Активы и структура портфеля" },
    goals: { title: "Цели", subtitle: "Накопления и финансовые цели" },
    dashboards: { title: "Дашборды", subtitle: "Аналитика доходов и расходов" },
    profile: { title: "Профиль", subtitle: "Настройки приложения и демо-данные" }
  };

  const state = {
    route: "home",
    teacher: { tab: "students", filter: "all", sort: "name" },
    budget: { filter: "month", sort: "date", limit: 5 },
    operations: { filter: "all", sort: "date", dir: "desc", limit: 8, query: "", account: "all" },
    dashboards: { period: "6" },
    detail: null // { kind: "student", id } — детальная страница (Этап 5B)
  };

  /* ---------- hash-парсинг с параметрами: #/teacher/student/2 ---------- */
  function parseHash() {
    const parts = decodeURIComponent(location.hash.replace(/^#\/?/, "")).split("/").filter(Boolean);
    const base = normalizeRoute(parts[0] || "home");
    return { route: base, params: parts.slice(1) };
  }

  /* ---------- DOM refs ---------- */
  const root = document.documentElement;
  const app = document.getElementById("app");
  const toolbar = document.getElementById("toolbar");
  const bottomNav = document.getElementById("bottomNav");
  const pageTitle = document.getElementById("page-title");
  const pageSubtitle = document.getElementById("page-subtitle");
  const pageBody = document.getElementById("page-body");
  const toast = document.getElementById("toast");
  const fanBackdrop = document.getElementById("fanBackdrop");
  const helpModal = document.getElementById("helpModal");
  const helpBackdrop = document.getElementById("helpBackdrop");
  const helpClose = document.getElementById("helpClose");
  const fabWraps = Array.from(document.querySelectorAll("[data-fab-wrap]"));
  const fabs = Array.from(document.querySelectorAll("[data-fab]"));

  let toastTimer = null;
  let renderTimer = null;

  /* глобальный хелпер для вьюх */
  window.page = function (html) {
    /* Этап 14c: скелетон показываем ТОЛЬКО при смене раздела.
       Перерисовка того же раздела (фильтры/сортировки/мутации/формы) —
       мгновенная, без fadeUp-анимаций, чтобы не было ощущения «переключения вкладки.» */
    const routeChanged = pageBody.dataset.route !== state.route;
    if (!routeChanged) {
      pageBody.innerHTML = html;
      u.fillIcons(pageBody);
      return;
    }
    pageBody.innerHTML = html;
    u.fillIcons(pageBody);
    animateIn();
  };

  function animateIn() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /* stagger только для верхнеуровневых блоков: вложенные элементы
       (KPI внутри panel, tiles внутри grid) анимируются вместе с родителем */
    const sel = ".panel, .kpi-grid, .hub-grid, .quick-grid, .detail-hero, .segmented.period, .ops-summary, .pl-group > .list";
    const nodes = Array.from(pageBody.querySelectorAll(sel));
    const top = nodes.filter((el) => !nodes.some((p) => p !== el && p.contains(el)));
    top.forEach((el, i) => {
      el.style.animation = "none";
      el.offsetHeight; // reflow
      el.style.animation = `fadeUp .35s ease ${Math.min(i * 40, 280)}ms both`;
    });
  }

  /* ---------- тосты: очередь + undo (Этап 6) ---------- */
  const toastQueue = [];
  let toastShowing = false;

  function nextToast() {
    if (!toastQueue.length) { toastShowing = false; return; }
    const item = toastQueue.shift();
    toastShowing = true;
    const iconKind = item.kind || (item.onUndo ? "undo" : "info");
    toast.className = "toast show toast--" + iconKind;
    toast.innerHTML =
      `<span class="toast-icon" data-icon="toast-${iconKind}"></span>` +
      `<span class="toast-msg">${u.esc(item.message)}</span>` +
      (item.onUndo ? `<button type="button" class="toast-undo" data-toast-undo>Отменить</button>` : "");
    toast._onUndo = item.onUndo || null;
    u.fillIcons(toast);
    clearTimeout(toastTimer);
    const ms = item.duration || (item.onUndo ? 5200 : 1900);
    toastTimer = setTimeout(hideToast, ms);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    toast.classList.remove("show");
    toastTimer = setTimeout(() => {
      if (!toast.classList.contains("show")) { toast.innerHTML = ""; toast._onUndo = null; nextToast(); }
    }, 220);
  }

  function pushToast(message, opts) {
    toastQueue.push(Object.assign({ message }, opts || {}));
    // если текущий тост с undo и новый — не undo, пусть undo-тост доживёт до конца очереди
    if (!toastShowing) nextToast();
  }

  /* showToast(msg) | showToast(msg, "success"|"error"|"info"|"undo") | showToast(msg, {kind, duration}) */
  function showToast(message, kindOrOpts) {
    const opts = typeof kindOrOpts === "string" ? { kind: kindOrOpts } : (kindOrOpts || {});
    pushToast(message, opts);
  }

  /* undo-обёртка: снимок DB до мутации → кнопка «Отменить» в тосте (Этап 6) */
  function snapshot() {
    try { return JSON.parse(JSON.stringify(window.DB)); } catch (_) { return null; }
  }

  function mutateWithUndo(fn, msg) {
    const prev = snapshot();
    fn(window.DB);
    window.Store.save();
    renderRoute(state.route);
    pushToast(msg, {
      kind: "success",
      onUndo: prev ? () => {
        window.DB = prev;
        window.Store.save();
        renderRoute(state.route);
        pushToast("Действие отменено", { kind: "info", duration: 1600 });
      } : null
    });
  }

  /* мутация с формой: снимок + «Отменить» (Этап 6) */
  function mutateForm(fn, msg) {
    const prev = snapshot();
    fn(window.DB);
    window.Store.save();
    renderRoute(state.route);
    pushToast(msg, {
      kind: "success",
      onUndo: prev ? () => {
        window.DB = prev;
        window.Store.save();
        renderRoute(state.route);
        pushToast("Действие отменено", { kind: "info", duration: 1600 });
      } : null
    });
  }

  function setTheme(theme, persist = true) {
    root.dataset.theme = theme;
    if (persist) { try { localStorage.setItem("mono-theme", theme); } catch (_) {} }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#090909" : "#f1f2f4");
    const toggle = document.querySelector(".theme-toggle");
    if (toggle) toggle.setAttribute("aria-label", theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему");
  }

  function normalizeRoute(route) { return routesMeta[route] ? route : "home"; }
  function routeFromHash() { return parseHash().route; }

  /* канонический вид параметра detail: "account:1" → ["account", "1"],
     иначе hash получается #accounts/account:1 и не парсится роутером */
  function normDetailParam(p) { return String(p).replace(":", "/"); }

  function goTo(route, params) {
    route = normalizeRoute(route);
    const clean = (params || []).map(normDetailParam);
    const target = "#" + [route, ...clean].join("/");
    if (location.hash !== target) location.hash = target;
    else renderWithSkeleton();
  }

  function setActiveRoute(route) {
    state.route = route;
    document.querySelectorAll("[data-route]").forEach((btn) => {
      const isActive = btn.dataset.route === route;
      btn.classList.toggle("is-active", isActive);
      if (isActive) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    const meta = routesMeta[route];
    pageTitle.textContent = meta.title;
    const isStudentDetail = route === "teacher" && state.detail && state.detail.kind === "student";
    const isAccountDetail = route === "accounts" && state.detail && state.detail.kind === "account";
    pageSubtitle.textContent = isStudentDetail ? "Карточка ученика" : isAccountDetail ? "Детали счёта" : meta.subtitle;
    document.title = `${meta.title} — Mono`;
  }

  function showSkeleton() {
    pageBody.dataset.route = ""; // сбрасываем флаг: следующая отрисовка — новая страница (с анимацией)
    pageBody.innerHTML = `
      <div class="skeleton sk-hero"></div>
      <div class="skeleton sk-card"></div>
      <div class="skeleton sk-row"></div>
      <div class="skeleton sk-row"></div>
      <div class="skeleton sk-row"></div>`;
  }

  /* Этап 14c: быстрая перерисовка без skeleton и fadeUp — для фильтров,
     сортировок, поиска, load-more. Skeleton+анимация входа остаются только
     при реальной СМЕНЕ раздела/страницы (renderWithSkeleton). */
  function softRender(route) {
    clearTimeout(renderTimer);
    pageBody.dataset.route = route; // не сбрасываем → view-анимация не перезапускается
    renderRoute(route);
  }

  function renderWithSkeleton() {
    const { route, params } = parseHash();
    clearTimeout(renderTimer);
    setActiveRoute(route);
    /* если тот же роут и те же params (например клик по активному табу или
       хеш-навигация back/forward на текущую запись) — не устраиваем «загрузку» */
    if (state.route === route && sameParams(params) && pageBody.dataset.route === route) {
      renderRoute(route, params);
      return;
    }
    showSkeleton();
    closeAllFans();
    scrollToTop(false); // при смене раздела — наверх (fixed-хедер остаётся видимым)
    lastY = 0;
    bottomNav.classList.remove("nav-hidden");
    renderTimer = setTimeout(() => renderRoute(route, params), 360);
  }

  function sameParams(params) {
    const cur = parseHash().params;
    return cur.length === params.length && cur.every((p, i) => p === params[i]);
  }

  function emptyHTML(title, text, quickKey, quickLabel) {
    return `
      <section class="panel empty">
        <div class="empty-icon" data-icon="inbox"></div>
        <h3>${title}</h3>
        <p>${text}</p>
        <button class="primary-btn" data-quick="${quickKey}">${quickLabel}</button>
      </section>`;
  }

  function renderRoute(route, params) {
    const view = window.Views[route] || window.Views.home;
    /* detail-контекст берём из ФАКТИЧЕСКОГО hash, а не из args:
       - renderRoute(route, params) из роутера → params есть всегда (возможно [])
       - renderRoute(route) из мутаций/фильтров → params undefined:
         если остаёмся на том же роуте — сохраняем state.detail (детальная страница
         не должна терять контекст и подзаголовок после tx-pay/planned-done),
         при смене роута — сбрасываем. */
    if (params !== undefined) {
      state.detail = params.length ? { kind: params[0], id: Number(params[1]) || params[1] } : null;
    } else if (state.route !== route) {
      state.detail = null;
    }
    view({ DB: window.DB, state, quickActions, emptyHTML, showToast, goTo, save: window.Store.save });
    pageBody.dataset.route = route; // запоминаем отрисованный раздел (для diff в window.page)
    setActiveRoute(route); // синхронизируем заголовок/подзаголовок с фактическим состоянием detail
  }

  /* ---------- сортировки / циклы ---------- */
  function cycleSort(scope) {
    if (scope === "teacher") {
      const arr = state.teacher.tab === "students" ? ["name", "next", "balance"] : ["date", "student"];
      state.teacher.sort = arr[(arr.indexOf(state.teacher.sort) + 1) % arr.length];
      softRender("teacher");
    } else if (scope === "budget") {
      const arr = ["date", "amount"];
      state.budget.sort = arr[(arr.indexOf(state.budget.sort) + 1) % arr.length];
      state.budget.limit = 5;
      softRender("budget");
    } else if (scope === "operations") {
      const seq = [["date","desc"],["date","asc"],["amount","desc"],["amount","asc"]];
      const cur = [state.operations.sort, state.operations.dir];
      const idx = seq.findIndex(([a,b]) => a===cur[0] && b===cur[1]);
      const nxt = seq[(idx+1) % seq.length];
      state.operations.sort = nxt[0]; state.operations.dir = nxt[1];
      softRender("operations");
    }
  }

  /* ---------- быстрые действия → формы (Этап 4) ---------- */
  function buildForms() { return {
    lesson: {
      title: "Запланировать занятие",
      fields: [
        { name: "student", label: "Ученик", type: "select", options: window.DB.students.map((s) => s.name), required: true },
        { name: "when", label: "Дата и время", type: "text", placeholder: "Напр.: Вт, 18:00", required: true },
        { name: "duration", label: "Длительность", type: "select", options: ["45 мин", "60 мин", "90 мин"] }
      ]
    },
    student: {
      title: "Добавить ученика",
      fields: [
        { name: "name", label: "Имя", type: "text", placeholder: "Имя и фамилия", required: true },
        { name: "subject", label: "Предмет", type: "select", options: ["Математика", "Английский", "Физика", "Информатика", "Русский"] },
        { name: "rate", label: "Ставка за занятие, ₽", type: "number", placeholder: "1200" }
      ]
    },
    transaction: {
      title: "Новая операция",
      fields: [
        { name: "title", label: "Название", type: "text", placeholder: "Напр.: Оплата: Анна К.", required: true },
        { name: "amount", label: "Сумма, ₽ (минус — расход)", type: "number", placeholder: "2400", required: true },
        { name: "category", label: "Категория", type: "select", options: ["Ученики", "Работа", "Личное", "Развитие"] },
        { name: "account", label: "Счёт", type: "select", options: window.DB.accounts.map((a) => a.name) }
      ]
    },
    contribute: {
      title: "Пополнить цель",
      fields: [
        { name: "sum", label: "Сумма взноса, ₽", type: "number", placeholder: "5000", required: true }
      ]
    },
    statement: {
      title: "Загрузить выписку",
      fields: [
        { name: "file", label: "Файл выписки", type: "text", placeholder: "CSV / PDF (пока демо)", required: true },
        { name: "account", label: "Счёт", type: "select", options: window.DB.accounts.map((a) => a.name) }
      ]
    }
  }; }

  const genericModal = document.getElementById("genericModal");
  const genericBackdrop = document.getElementById("genericBackdrop");
  const genericTitle = document.getElementById("genericTitle");
  const genericForm = document.getElementById("genericForm");
  let lastFocused = null;

  function openForm(key, extra) {
    const f = buildForms()[key];
    if (!f) return;
    genericTitle.textContent = f.title;
    genericForm.dataset.extra = extra ? JSON.stringify(extra) : "";
    genericForm.innerHTML = `
      ${f.fields.map((fl) => `
        <div class="field" data-field="${fl.name}">
          <label for="gf-${fl.name}">${fl.label}${fl.required ? ' <span class="req">*</span>' : ""}</label>
          ${fl.type === "select"
            ? `<select id="gf-${fl.name}" name="${fl.name}">${fl.options.map((o) => `<option>${u.esc(o)}</option>`).join("")}</select>`
            : `<input id="gf-${fl.name}" name="${fl.name}" type="${fl.type}" placeholder="${fl.placeholder || ""}" inputmode="${fl.type === "number" ? "decimal" : "text"}">`}
          <p class="field-error" role="alert"></p>
        </div>`).join("")}
      <div class="form-actions">
        <button type="button" class="secondary-btn" data-action="close-modal">Отмена</button>
        <button type="submit" class="primary-btn">Сохранить</button>
      </div>`;
    genericForm.dataset.key = key;
    lastFocused = document.activeElement;
    // модалки внутри рамки устройства (Этап 8): уменьшаем, чтобы влезали в экран рамки
    const mScale = frameOn() ? Math.min(1, (deviceFrame.clientHeight - 48) / 560) : 1;
    genericModal.style.setProperty("--modal-scale", String(mScale));
    genericModal.classList.add("open");
    genericBackdrop.classList.add("open");
    genericModal.dataset.form = key;
    const first = genericForm.querySelector("input, select");
    if (first) first.focus();
  }

  function closeForm() {
    genericModal.classList.remove("open");
    genericBackdrop.classList.remove("open");
    if (lastFocused) lastFocused.focus();
  }

  /* ---------- валидация формы (Этап 5D) ---------- */
  const validators = {
    required: (v) => (String(v).trim() ? "" : "Обязательное поле"),
    money: (v) => (v === "" || v === null || !isNaN(Number(String(v).replace(/\s/g, "").replace(",", "."))) ? "" : "Введите число"),
    amount: (v) => {
      if (!String(v).trim()) return "Укажите сумму";
      const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
      if (isNaN(n)) return "Введите число";
      if (n === 0) return "Сумма не может быть 0";
      return "";
    }
  };

  function setFieldError(name, msg) {
    const field = genericForm.querySelector(`[data-field="${name}"]`);
    if (!field) return;
    const err = field.querySelector(".field-error");
    const input = field.querySelector("input, select");
    if (err) err.textContent = msg || "";
    field.classList.toggle("invalid", !!msg);
    if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function validateForm(key, data) {
    const f = buildForms()[key];
    let ok = true, firstBad = null;
    f.fields.forEach((fl) => {
      const rules = [fl.required && "required", fl.type === "number" && (fl.name === "amount" ? "amount" : "money")].filter(Boolean);
      const msg = rules.map((r) => validators[r](data[fl.name])).find(Boolean) || "";
      setFieldError(fl.name, msg);
      if (msg && ok) { firstBad = fl.name; ok = false; }
    });
    if (!ok && firstBad) genericForm.querySelector(`[name="${firstBad}"]`)?.focus();
    return ok;
  }

  genericForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const key = genericModal.dataset.form;
    let extra = {}; try { extra = JSON.parse(genericForm.dataset.extra || "{}"); } catch (_) {}
    const data = Object.fromEntries(new FormData(genericForm).entries());
    if (!validateForm(key, data)) { showToast("Проверьте выделенные поля"); return; }
    // Мутации через mutateForm: снимок DB до изменения → тост с «Отменить» (Этап 6)
    if (key === "student" && data.name) {
      mutateForm((db) => db.students.push({ id: Date.now(), name: data.name.trim(), subject: data.subject, next: "Нет записи", balance: "Ожидает", status: "unpaid", debt: 0, rate: Number(data.rate) || 0, monthIncome: 0 }), `Ученик добавлен: ${data.name.trim()}`);
    } else if (key === "transaction" && data.title) {
      const amount = Number(String(data.amount).replace(/\s/g, "").replace(",", "."));
      /* тип операции определяем по знаку суммы; если пользователь ввёл положительную
         сумму и выбрал категорию-расход — считаем это расходом (Этап 14c: тосты теперь
         отражают реальное действие) */
      const isExpense = amount < 0 || /расход|покупк|платёж|налог/i.test(String(data.category || ""));
      const type = isExpense ? "expense" : "income";
      mutateForm((db) => db.transactions.unshift({ id: Date.now(), date: "сегодня", title: data.title.trim(), amount: isExpense ? -Math.abs(amount) : Math.abs(amount), type, category: data.category, status: "pending", account: data.account || "Карта" }), type === "expense" ? `Расход добавлен: ${data.title.trim()}` : `Доход добавлен: ${data.title.trim()}`);
    } else if (key === "lesson" && data.student) {
      mutateForm((db) => db.lessons.unshift({ id: Date.now(), student: data.student, subject: (db.students.find((s) => s.name === data.student) || {}).subject || "—", when: data.when || "—", duration: data.duration || "60 мин", status: "upcoming" }), `Занятие запланировано: ${data.student}`);
    } else if (key === "contribute" && extra.goalName) {
      mutateForm((db) => { const g = db.goals.find((x) => x.name === extra.goalName); if (g) g.saved = Math.min(g.target, g.saved + Number(data.sum)); }, `Цель пополнена на ${u.money(Number(data.sum))}`);
    } else if (key === "statement" && data.file) {
      // Демо-импорт выписки: добавляем «подтверждающую» операцию на выбранный счёт
      const accName = data.account || "Карта";
      mutateForm((db) => db.transactions.unshift({ id: Date.now(), date: "сегодня", title: `Импорт выписки: ${data.file}`, amount: 0.01, type: "income", category: "Личное", status: "paid", account: accName }), "Выписка импортирована");
    } else {
      window.Store.save();
      renderRoute(state.route);
      pushToast("Сохранено", { kind: "success" });
    }
    closeForm();
  });

  function runQuick(key) {
    const action = quickActions.find((a) => a.key === key);
    if (!action) return;
    try { localStorage.setItem("mono-last-quick", key); } catch (_) {}
    openForm(key);
    closeAllFans();
  }

  /* ---------- FAB-веер ---------- */
  function setFanState(wrap, open) {
    const fan = wrap.querySelector("[data-fan]");
    const fab = wrap.querySelector("[data-fab]") || wrap.querySelector(".fab");
    wrap.classList.toggle("open", open);
    fab?.setAttribute("aria-expanded", open ? "true" : "false");
    fan?.setAttribute("aria-hidden", open ? "false" : "true");
    wrap.querySelectorAll(".fan-item").forEach((b) => (b.tabIndex = open ? 0 : -1));
  }

  /* Этап 14a-fix2: rail-FAB удалён (дублировал нижний FAB) — positionRailFan больше не нужен */

  function closeAllFans() {
    if (!document.body.classList.contains("fan-open")) return;
    fabWraps.forEach((w) => setFanState(w, false));
    document.body.classList.remove("fan-open");
  }

  function openFan(wrap) {
    fabWraps.forEach((w) => setFanState(w, false));
    setFanState(wrap, true);
    document.body.classList.add("fan-open");
    try {
      if (!localStorage.getItem("mono-hint-long")) {
        localStorage.setItem("mono-hint-long", "1");
        setTimeout(() => showToast("Долгое нажатие на + повторит последнее действие"), 450);
      }
    } catch (_) {}
  }

  function toggleFan(wrap) {
    wrap.classList.contains("open") ? closeAllFans() : openFan(wrap);
  }

  function attachLongPress(el) {
    let timer = null, startX = 0, startY = 0;
    const clear = () => { clearTimeout(timer); timer = null; };
    el.addEventListener("pointerdown", (e) => {
      el._longPressed = false; startX = e.clientX; startY = e.clientY; clear();
      timer = setTimeout(() => {
        el._longPressed = true;
        const wrap = el.closest("[data-fab-wrap]");
        let last = null;
        try { last = localStorage.getItem("mono-last-quick"); } catch (_) {}
        if (last) { openForm(last); closeAllFans(); }
        else if (wrap) toggleFan(wrap);
      }, 520);
    });
    el.addEventListener("pointermove", (e) => { if (Math.hypot(e.clientX - startX, e.clientY - startY) > 10) clear(); });
    el.addEventListener("pointerup", clear);
    el.addEventListener("pointercancel", clear);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /* ---------- bottom sheet «Ещё» — мобильная IA (Этап 7) ---------- */
  const sheetBackdrop = document.getElementById("sheetBackdrop");
  const moreSheet = document.getElementById("moreSheet");
  const sheetGrid = document.getElementById("sheetGrid");

  function renderSheet() {
    if (!sheetGrid || !window.u.HUB) return;
    sheetGrid.innerHTML = window.u.HUB.map((h) => `
      <button class="sheet-item" data-go-route="${h.route}" style="--tone:${h.tone}; --tint:${h.tint}">
        <span class="ic-wrap" data-icon="${h.icon}"></span>
        <span class="title">${h.title}</span>
      </button>`).join("");
    u.fillIcons();
  }

  function openSheet() {
    renderSheet();
    sheetBackdrop.classList.add("open");
    moreSheet.classList.add("open");
    document.body.classList.add("sheet-open");
    const tab = document.querySelector('[data-action="more"]');
    if (tab) tab.setAttribute("aria-expanded", "true");
    const first = sheetGrid.querySelector(".sheet-item");
    if (first) first.focus({ preventScroll: true });
  }

  function closeSheet() {
    sheetBackdrop.classList.remove("open");
    moreSheet.classList.remove("open");
    document.body.classList.remove("sheet-open");
    const tab = document.querySelector('[data-action="more"]');
    if (tab) tab.setAttribute("aria-expanded", "false");
  }

  function isSheetOpen() { return moreSheet.classList.contains("open"); }

  sheetBackdrop.addEventListener("click", closeSheet);

  /* клик по плитке sheet: закрыть sheet и перейти (rowLink-делегат закроет сам) */
  sheetGrid?.addEventListener("click", (e) => {
    if (!e.target.closest("[data-go-route]")) return;
    closeSheet();
  });

  /* свайп вниз закрывает sheet */
  (function attachSheetSwipe() {
    let startY = null;
    moreSheet.addEventListener("touchstart", (e) => { startY = e.touches[0].clientY; }, { passive: true });
    moreSheet.addEventListener("touchmove", (e) => {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 60) { closeSheet(); startY = null; }
    }, { passive: true });
    moreSheet.addEventListener("touchend", () => { startY = null; });
  })();

  /* ---------- помощь ---------- */
  function openHelp() {
    const hScale = frameOn() ? Math.min(1, (deviceFrame.clientHeight - 48) / 560) : 1;
    helpModal.style.setProperty("--modal-scale", String(hScale));
    helpModal.classList.add("open"); helpBackdrop.classList.add("open"); helpClose.focus();
  }
  function closeHelp() { helpModal.classList.remove("open"); helpBackdrop.classList.remove("open"); }

  /* ---------- мутации данных из view-кнопок (Этап 5A/5B, undo — Этап 6) ---------- */
  function mutate(fn, msg) {
    mutateWithUndo(fn, msg);
  }

  /* Этап 14c-fix: глобальный реестр обработчиков data-action.
     Делегат кликов живёт в app.js, но кнопки рендерятся views-файлами,
     которые грузятся ПОСЛЕДНИМИ и не имеют доступа к локальным функциям
     ядра. window.AppActions позволяет любому view зарегистрировать свой
     обработчик без правки ядра. */
  window.AppActions = window.AppActions || {};

  /* мост ядро→views: mutate/openForm/pushToast/goTo доступны всем view-файлам
     через window.u (утилиты core.js). Views вызывают их лениво — в момент
     клика эти поля уже заполнены. */
  u.mutate = function (fn, msg) { mutate(fn, msg); };
  u.openForm = function (key, extra) { openForm(key, extra); };
  u.pushToast = function (msg, opts) { pushToast(msg, opts); };
  u.softRender = function (route) { softRender(route); };

  function markTxPaid(id) {
    mutate((db) => { const t = db.transactions.find((x) => x.id === id); if (t) t.status = "paid"; }, "Отмечено как оплачено");
  }

  function remindDebt(studentId) {
    const s = window.DB.students.find((x) => x.id === studentId);
    pushToast(s ? `Напоминание отправлено: ${s.name}` : "Напоминание отправлено", { kind: "info" });
  }

  function togglePlannedDone(title) {
    const p = (window.DB.planned || []).find((x) => x.title === title);
    const turningDone = p && !p.done;
    mutate((db) => {
      const pl = db.planned.find((x) => x.title === title);
      if (!pl) return;
      if (!pl.done) pl._prevStatus = pl.status;
      pl.done = !pl.done;
      if (pl.done) {
        pl.status = "done";
        db.transactions.unshift({ id: Date.now(), date: "сегодня", title: pl.title, amount: -pl.amount, type: "expense", category: "Личное", status: "paid", account: "Карта" });
        const acc = db.accounts.find((a) => a.name === "Карта");
        if (acc) acc.balance -= pl.amount;
      } else pl.status = pl._prevStatus || "upcoming";
    }, turningDone ? `Оплачено: ${title}` : `Вернули в расписание: ${title}`);
  }

  function contributeGoal(name) {
    const g = window.DB.goals.find((x) => x.name === name);
    if (!g) return;
    openForm("contribute", { goalName: name, max: g.target - g.saved });
  }

  /* ---------- навигационная история для кнопок «Назад/Вперёд» в хедере (Этап 14c) ---------- */
  const navHist = { stack: [], index: -1 };

  function recordNavHash(hash) {
    const target = "#" + String(hash || "").replace(/^#?\/?/, "");
    if (navHist.index >= 0 && navHist.stack[navHist.index] === target) return; // без дублей
    navHist.stack = navHist.stack.slice(0, navHist.index + 1);
    navHist.stack.push(target);
    navHist.index = navHist.stack.length - 1;
    if (navHist.stack.length > 60) { navHist.stack.shift(); navHist.index--; }
    updateNavButtons();
  }

  function updateNavButtons() {
    const backBtn = document.querySelector('[data-action="back"]');
    const fwdBtn = document.querySelector('[data-action="forward"]');
    if (backBtn) backBtn.disabled = navHist.index <= 0;
    if (fwdBtn) fwdBtn.disabled = navHist.index >= navHist.stack.length - 1;
  }

  function handleAction(name) {
    if (name === "help") return openHelp();
    if (name === "theme") return setTheme(root.dataset.theme === "dark" ? "light" : "dark");
    if (name === "profile") return goTo("profile");
    if (name === "load-more") { state.budget.limit += 5; return softRender("budget"); }
    if (name === "load-more-ops") { state.operations.limit += 8; return softRender("operations"); }
    /* Этап 14c: кнопки «Назад/Вперёд» в хедере. Свой стек истории НЕ переписывает
       hash напрямую (это ломало браузерную историю), а использует нативные
       history.back()/forward(). Если своей записи ещё нет — подсказка в тосте. */
    if (name === "back") {
      if (navHist.index <= 0) { showToast("Вы в начале истории", { kind: "info", duration: 1400 }); return; }
      window.history.back();
      return;
    }
    if (name === "forward") {
      if (navHist.index >= navHist.stack.length - 1) { showToast("Дальше истории нет", { kind: "info", duration: 1400 }); return; }
      window.history.forward();
      return;
    }
    if (name === "reset-ops-filters") {
      state.operations = { filter: "all", sort: "date", dir: "desc", limit: 8, query: "", account: "all" };
      return softRender("operations");
    }
    if (name === "close-modal") return closeForm();
    if (name === "more") { isDesktopLayout() ? openFan(document.querySelector(".desktop-fab") || fabWraps[0]) : openSheet(); return; }
    /* fan-toggle больше не нужен: rail-FAB удалён (дублировал нижний FAB, Этап 14a-fix2) */
    if (name === "frame-exit") { setFrame(false); return; }
    if (name === "reset-demo") {
      const prev = snapshot();
      window.Store.reset();
      renderRoute(state.route);
      pushToast("Демо-данные сброшены", {
        kind: "info",
        onUndo: prev ? () => {
          window.DB = prev;
          window.Store.save();
          renderRoute(state.route);
          pushToast("Сброс отменён", { kind: "info", duration: 1600 });
        } : null
      });
      return;
    }
    showToast(`Действие: ${name}`);
  }

  /* кнопка «Отменить» внутри тоста (Этап 6) */
  toast.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-toast-undo]");
    if (!btn || !toast._onUndo) return;
    const fn = toast._onUndo;
    hideToast();
    fn();
  });

  /* ---------- rail expand ---------- */
  /* ---------- dev-preview: телефон / планшет / веб (Этап 7) ---------- */
  const PREVIEW_KEY = "mono-preview";
  const FRAME_KEY = "mono-frame";
  const previewNames = { mobile: "Телефон", tablet: "Планшет", desktop: "Веб" };

  /* ---------- dev-frame: рамка устройства (Этап 8) ----------
     app переносится внутрь .device-frame; fixed-элементы (bottom-nav, toolbar,
     FAB, модалки) позиционируются относительно рамки (transform её «создаёт»
     containing block). Выход — кнопка ✕ над рамкой. */
  const deviceFrame = document.getElementById("deviceFrame");
  const frameCaption = document.getElementById("frameCaption");
  const frameToggleEl = document.getElementById("frameToggle");
  const FRAME_SIZES = {
    mobile:  { w: 390, h: 844, label: "Телефон · iPhone 14" },
    tablet:  { w: 820, h: 1180, label: "Планшет · iPad Air" }
  };
  let frameExitBtn = null;

  function frameOn() { return root.dataset.frame === "on"; }

  function ensureFrameExitBtn() {
    if (frameExitBtn) return frameExitBtn;
    frameExitBtn = document.createElement("button");
    frameExitBtn.className = "frame-exit-btn";
    frameExitBtn.type = "button";
    frameExitBtn.setAttribute("aria-label", "Выйти из рамки устройства");
    frameExitBtn.innerHTML = `<span data-icon="close"></span><span>Выйти из рамки</span>`;
    frameExitBtn.addEventListener("click", () => setFrame(false));
    document.body.appendChild(frameExitBtn);
    u.fillIcons();
    return frameExitBtn;
  }

  function applyFrame(mode) {
    const size = FRAME_SIZES[mode];
    if (!size) return false; // desktop не оборачиваем
    if (app.parentElement !== deviceFrame) deviceFrame.appendChild(app);
    deviceFrame.classList.add("active");
    deviceFrame.style.width = size.w + "px";
    deviceFrame.style.height = Math.min(size.h, window.innerHeight - 96) + "px";
    if (frameCaption) frameCaption.textContent = `${size.label} · ${size.w} × ${Math.round(deviceFrame.getBoundingClientRect().height)}`;
    ensureFrameExitBtn().style.display = "";
    document.body.classList.add("framed");
    return true;
  }

  function removeFrame() {
    if (app.parentElement !== document.body) document.body.insertBefore(app, deviceFrame);
    deviceFrame.classList.remove("active");
    deviceFrame.style.width = "";
    deviceFrame.style.height = "";
    if (frameExitBtn) frameExitBtn.style.display = "none";
    document.body.classList.remove("framed");
  }

  function setFrame(on, silent) {
    const mode = previewMode();
    const want = on && mode !== "desktop";
    if (want) {
      if (!applyFrame(mode)) { setFrameToggle(false); return; }
    } else {
      removeFrame();
    }
    root.dataset.frame = want ? "on" : "off";
    try { localStorage.setItem(FRAME_KEY, want ? "on" : "off"); } catch (_) {}
    setFrameToggle(want);
    if (!silent) showToast(want ? `Рамка: ${FRAME_SIZES[mode].label}` : "Рамка выключена", "info");
  }

  function setFrameToggle(on) {
    if (frameToggleEl) frameToggleEl.checked = !!on;
    const wrap = document.querySelector(".frame-toggle");
    if (wrap) {
      wrap.classList.toggle("disabled", previewMode() === "desktop");
      wrap.title = previewMode() === "desktop" ? "Недоступно в режиме «Веб»" : "Рамка устройства";
    }
  }

  function applyPreview(mode) {
    if (mode === "desktop") delete root.dataset.preview; else root.dataset.preview = mode;
    try { localStorage.setItem(PREVIEW_KEY, mode); } catch (_) {}
    document.querySelectorAll(".preview-btn").forEach((b) => {
      const on = b.dataset.preview === mode;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    collapseRail();
    if (mode !== "mobile") app.classList.add("rail-expanded"); // показать подпись пунктов в превью
    setFrameToggle(false);
    if (frameOn()) {
      // режим сменился — перестроить рамку под новый макет (или выйти из неё)
      const ok = mode !== "desktop" && applyFrame(mode);
      if (!ok) { removeFrame(); root.dataset.frame = "off"; try { localStorage.setItem(FRAME_KEY, "off"); } catch (_) {} }
      setFrameToggle(!!ok);
    }
    showToast(`Режим предпросмотра: ${previewNames[mode]}`, "info");
  }
  let savedPreview = "auto";
  try { savedPreview = localStorage.getItem(PREVIEW_KEY) || "auto"; } catch (_) {}
  const initialPreview = ["mobile", "tablet", "desktop"].includes(savedPreview)
    ? savedPreview
    : (window.innerWidth < 768 ? "mobile" : window.innerWidth < 1180 ? "tablet" : "desktop");

  function previewMode() { return root.dataset.preview || (window.innerWidth < 768 ? "mobile" : window.innerWidth < 1180 ? "tablet" : "desktop"); }
  function isDesktopLayout() { return previewMode() !== "mobile"; } // с учётом dev-preview
  function expandRail() { if (isDesktopLayout()) app.classList.add("rail-expanded"); }
  function collapseRail() { app.classList.remove("rail-expanded"); }

  /* ---------- events ---------- */
  try {
    const fsSaved = localStorage.getItem("mono-fontsize");
    if (fsSaved) root.dataset.fontsize = fsSaved;
  } catch (_) {}
  u.fillIcons();
  setTheme(root.dataset.theme || "dark", false);
  applyPreview(initialPreview);

  /* восстановление рамки устройства из localStorage (Этап 8) */
  let savedFrame = "off";
  try { savedFrame = localStorage.getItem(FRAME_KEY) || "off"; } catch (_) {}
  if (savedFrame === "on" && previewMode() !== "desktop") setFrame(true, true);
  else setFrameToggle(false);

  frameToggleEl?.addEventListener("change", () => setFrame(frameToggleEl.checked));

  window.addEventListener("resize", () => { if (frameOn()) applyFrame(previewMode()); });

  window.matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", (e) => {
    let saved = null; try { saved = localStorage.getItem("mono-theme"); } catch (_) {}
    if (!saved) setTheme(e.matches ? "light" : "dark", false);
  });

  fabs.forEach((fab) => {
    attachLongPress(fab);
    fab.addEventListener("click", (e) => {
      e.stopPropagation();
      if (fab._longPressed) { fab._longPressed = false; return; }
      const wrap = fab.closest("[data-fab-wrap]");
      if (wrap) toggleFan(wrap);
    });
  });

  fanBackdrop.addEventListener("click", closeAllFans);
  toolbar.addEventListener("mouseenter", expandRail);
  toolbar.addEventListener("mouseleave", collapseRail);
  toolbar.addEventListener("focusin", expandRail);
  toolbar.addEventListener("focusout", (e) => { if (!toolbar.contains(e.relatedTarget)) collapseRail(); });
  window.addEventListener("resize", () => { if (!isDesktopLayout()) collapseRail(); });

  helpBackdrop.addEventListener("click", closeHelp);
  helpClose.addEventListener("click", closeHelp);
  genericBackdrop.addEventListener("click", closeForm);

  document.addEventListener("click", (event) => {
    const quick = event.target.closest("[data-quick]");
    if (quick) { event.preventDefault(); runQuick(quick.dataset.quick); return; }

    const routeBtn = event.target.closest("[data-route]");
    if (routeBtn) { event.preventDefault(); goTo(routeBtn.dataset.route); return; }

    const tabBtn = event.target.closest("[data-tab]");
    if (tabBtn) {
      event.preventDefault();
      state.teacher.tab = tabBtn.dataset.tab;
      state.teacher.filter = "all";
      state.teacher.sort = state.teacher.tab === "students" ? "name" : "date";
      renderRoute("teacher");
      return;
    }

    const fsBtn = event.target.closest("[data-fontsize]");
    if (fsBtn) {
      event.preventDefault();
      root.dataset.fontsize = fsBtn.dataset.fontsize;
      try { localStorage.setItem("mono-fontsize", fsBtn.dataset.fontsize); } catch (_) {}
      renderRoute(state.route);
      return;
    }

    const filterBtn = event.target.closest("[data-filter]");
    if (filterBtn) {
      event.preventDefault();
      const scope = filterBtn.dataset.scope;
      if (scope === "teacher") { state.teacher.filter = filterBtn.dataset.filter; softRender("teacher"); }
      if (scope === "budget") { state.budget.filter = filterBtn.dataset.filter; state.budget.limit = 5; softRender("budget"); }
      if (scope === "operations") { state.operations.filter = filterBtn.dataset.filter; state.operations.limit = 8; softRender("operations"); }
      return;
    }

    const accChip = event.target.closest("[data-account-btn]");
    if (accChip) { event.preventDefault(); state.operations.account = accChip.dataset.accountBtn; softRender("operations"); return; }

    const sortBtn = event.target.closest("[data-sort]");
    if (sortBtn) { event.preventDefault(); cycleSort(sortBtn.dataset.sort); return; }

    const dashPeriodBtn = event.target.closest("[data-dash-period]");
    if (dashPeriodBtn) { state.dashboards.period = dashPeriodBtn.dataset.dashPeriod; renderRoute("dashboards"); return; }
    const actionBtn = event.target.closest("[data-action]");
    if (actionBtn) {
      /* клики ВНУТРИ открытой модалки не должны всплывать к глобальному
         «closeAllFans»-обработчику и другим делегатам — иначе кнопка
         «Сохранить/Отмена» могла срабатывать вполовину (Этап 14c) */
      const inModal = actionBtn.closest(".modal");
      event.preventDefault();
      const a = actionBtn.dataset.action;
      /* приоритет: реестр window.AppActions (views регистрируют свои хендлеры),
         затем ядро handleAction. Так любой новый view может добавлять кнопки,
         не трогая ядро (Этап 14c-fix) */
      const ext = window.AppActions && window.AppActions[a];
      if (ext) { ext(actionBtn); if (!inModal) closeAllFans(); return; }
      if (a === "tx-pay") return markTxPaid(Number(actionBtn.dataset.id));
      if (a === "remind") return remindDebt(Number(actionBtn.dataset.id));
      if (a === "planned-done") return togglePlannedDone(actionBtn.dataset.title);
      if (a === "goal-add") return contributeGoal(actionBtn.dataset.goal);
      handleAction(a);
      if (!inModal) closeAllFans();
      return;
    }

    const pvBtn = event.target.closest(".preview-btn");
    if (pvBtn) { event.preventDefault(); applyPreview(pvBtn.dataset.preview); return; }

    const rowLink = event.target.closest("[data-go-route]");
    if (rowLink) {
      event.preventDefault();
      const params = rowLink.dataset.goParams ? rowLink.dataset.goParams.split("/") : [];
      goTo(rowLink.dataset.goRoute, params);
      return;
    }

    /* переход «детали счёта → все операции по счёту» */
    const opsJump = event.target.closest('[data-go-route="operations"][data-go-params^="account:"]');
    if (opsJump) {
      event.preventDefault();
      state.operations.account = decodeURIComponent(opsJump.dataset.goParams.slice("account:".length));
      state.operations.limit = 8;
      goTo("operations", []);
      return;
    }

    if (document.body.classList.contains("fan-open") && !event.target.closest("[data-fab-wrap]")) closeAllFans();
  });

  document.addEventListener("keydown", (event) => {
    /* Enter/Space на кликабельной строке (row-link) — эквивалент клика */
    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      const link = event.target.closest && event.target.closest("[data-go-route]");
      if (link && (link.getAttribute("tabindex") !== null || link.getAttribute("role"))) {
        event.preventDefault();
        link.click();
        return;
      }
    }
    if (event.key !== "Escape") return;
    if (genericModal.classList.contains("open")) { closeForm(); return; }
    if (isSheetOpen()) { closeSheet(); document.querySelector('[data-action="more"]')?.focus(); return; }
    if (helpModal.classList.contains("open")) { closeHelp(); return; }
    if (document.body.classList.contains("fan-open")) {
      const activeWrap = fabWraps.find((w) => w.classList.contains("open"));
      closeAllFans();
      activeWrap?.querySelector("[data-fab]")?.focus();
    }
  });

  document.addEventListener("input", (event) => {
    const q = event.target.closest("[data-search]");
    if (q) {
      state.operations.query = q.value;
      state.operations.limit = 8;
      const pos = q.selectionStart;
      softRender("operations");
      const again = document.querySelector("[data-search]");
      if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (_) {} }
      return;
    }
    const acc = event.target.closest("[data-account-filter]");
    if (acc) { state.operations.account = acc.value; softRender("operations"); }
  });

  window.addEventListener("hashchange", () => { recordNavHash(location.hash); renderWithSkeleton(routeFromHash()); });

  /* ---------- hide header on scroll down (Этап 10) ---------- */
  let lastY = window.scrollY, ticking = false;

  function scrollRoot() { return frameOn() ? app : document.scrollingElement || document.documentElement; }

  function scrollToTop(smooth) {
    const s = scrollRoot();
    if (s === app) app.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
    else window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
  }

  function updateChrome(y) {
    /* хедер статичный (fixed): не прячем. Прячем нижнюю навигацию только на мобильных */
    document.body.classList.remove("header-hidden");
    if (isDesktopLayout() || document.body.classList.contains("fan-open")) {
      bottomNav.classList.remove("nav-hidden");
      return;
    }
    if (y > 160 && y > lastY + 14) bottomNav.classList.add("nav-hidden");
    else if (y < lastY - 8 || y < 120) bottomNav.classList.remove("nav-hidden");
  }

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      updateChrome(y);
      lastY = y; ticking = false;
    });
  }, { passive: true });

  /* в режиме рамки скроллится сам .app — вешаем отдельный слушатель */
  app.addEventListener("scroll", () => {
    if (ticking || !frameOn()) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = app.scrollTop;
      updateChrome(y);
      lastY = y; ticking = false;
    });
  }, { passive: true });

  fabWraps.forEach((w) => setFanState(w, false));
  renderWithSkeleton(routeFromHash());
})();
