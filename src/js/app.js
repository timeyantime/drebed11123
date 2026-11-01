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
    dashboards: { title: "Дашборды", subtitle: "Аналитика доходов и расходов" }
  };

  const state = {
    route: "home",
    teacher: { tab: "students", filter: "all", sort: "name" },
    budget: { filter: "month", sort: "date", limit: 5 },
    operations: { filter: "all", sort: "date", limit: 8, query: "" }
  };

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
    pageBody.innerHTML = html;
    u.fillIcons(pageBody);
    animateIn();
  };

  function animateIn() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    pageBody.querySelectorAll(".panel, .kpi, .hub-tile, .quick-card").forEach((el, i) => {
      el.style.animation = "none";
      el.offsetHeight; // reflow
      el.style.animation = `fadeUp .35s ease ${Math.min(i * 24, 240)}ms both`;
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1900);
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
  function routeFromHash() { return normalizeRoute(decodeURIComponent(location.hash.replace(/^#\/?/, ""))); }

  function goTo(route) {
    route = normalizeRoute(route);
    const target = "#" + route;
    if (location.hash !== target) location.hash = target;
    else renderWithSkeleton(route);
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
    pageSubtitle.textContent = meta.subtitle;
    document.title = `${meta.title} — Mono`;
  }

  function showSkeleton() {
    pageBody.innerHTML = `
      <div class="skeleton sk-hero"></div>
      <div class="skeleton sk-card"></div>
      <div class="skeleton sk-row"></div>
      <div class="skeleton sk-row"></div>
      <div class="skeleton sk-row"></div>`;
  }

  function renderWithSkeleton(route) {
    route = normalizeRoute(route);
    clearTimeout(renderTimer);
    setActiveRoute(route);
    showSkeleton();
    closeAllFans();
    renderTimer = setTimeout(() => renderRoute(route), 360);
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

  function renderRoute(route) {
    const view = window.Views[route] || window.Views.home;
    view({ DB: window.DB, state, quickActions, emptyHTML, showToast, goTo });
  }

  /* ---------- сортировки / циклы ---------- */
  function cycleSort(scope) {
    if (scope === "teacher") {
      const arr = state.teacher.tab === "students" ? ["name", "next", "balance"] : ["date", "student"];
      state.teacher.sort = arr[(arr.indexOf(state.teacher.sort) + 1) % arr.length];
      renderRoute("teacher");
    } else if (scope === "budget") {
      const arr = ["date", "amount"];
      state.budget.sort = arr[(arr.indexOf(state.budget.sort) + 1) % arr.length];
      state.budget.limit = 5;
      renderRoute("budget");
    } else if (scope === "operations") {
      const arr = ["date", "amount"];
      state.operations.sort = arr[(arr.indexOf(state.operations.sort) + 1) % arr.length];
      renderRoute("operations");
    }
  }

  /* ---------- быстрые действия → формы (Этап 4) ---------- */
  function buildForms() { return {
    lesson: {
      title: "Запланировать занятие",
      fields: [
        { name: "student", label: "Ученик", type: "select", options: window.DB.students.map((s) => s.name) },
        { name: "when", label: "Дата и время", type: "text", placeholder: "Напр.: Вт, 18:00" },
        { name: "duration", label: "Длительность", type: "select", options: ["45 мин", "60 мин", "90 мин"] }
      ]
    },
    student: {
      title: "Добавить ученика",
      fields: [
        { name: "name", label: "Имя", type: "text", placeholder: "Имя и фамилия" },
        { name: "subject", label: "Предмет", type: "select", options: ["Математика", "Английский", "Физика", "Информатика", "Русский"] },
        { name: "rate", label: "Ставка за занятие, ₽", type: "number", placeholder: "1200" }
      ]
    },
    transaction: {
      title: "Новая операция",
      fields: [
        { name: "title", label: "Название", type: "text", placeholder: "Напр.: Оплата: Анна К." },
        { name: "amount", label: "Сумма, ₽ (минус — расход)", type: "number", placeholder: "2400" },
        { name: "category", label: "Категория", type: "select", options: ["Ученики", "Работа", "Личное", "Развитие"] }
      ]
    },
    statement: {
      title: "Загрузить выписку",
      fields: [
        { name: "file", label: "Файл выписки", type: "text", placeholder: "CSV / PDF (пока демо)" },
        { name: "account", label: "Счёт", type: "select", options: window.DB.accounts.map((a) => a.name) }
      ]
    }
  }; }

  const genericModal = document.getElementById("genericModal");
  const genericBackdrop = document.getElementById("genericBackdrop");
  const genericTitle = document.getElementById("genericTitle");
  const genericForm = document.getElementById("genericForm");
  let lastFocused = null;

  function openForm(key) {
    const f = buildForms()[key];
    if (!f) return;
    genericTitle.textContent = f.title;
    genericForm.innerHTML = `
      ${f.fields.map((fl) => `
        <div class="field">
          <label for="gf-${fl.name}">${fl.label}</label>
          ${fl.type === "select"
            ? `<select id="gf-${fl.name}" name="${fl.name}">${fl.options.map((o) => `<option>${u.esc(o)}</option>`).join("")}</select>`
            : `<input id="gf-${fl.name}" name="${fl.name}" type="${fl.type}" placeholder="${fl.placeholder || ""}">`}
        </div>`).join("")}
      <div class="form-actions">
        <button type="button" class="secondary-btn" data-action="close-modal">Отмена</button>
        <button type="submit" class="primary-btn">Сохранить</button>
      </div>`;
    genericForm.dataset.key = key;
    lastFocused = document.activeElement;
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

  genericForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const key = genericModal.dataset.form;
    const data = Object.fromEntries(new FormData(genericForm).entries());
    // Демо: мутация мок-данных, чтобы UX был «живым» до бэкенда
    if (key === "student" && data.name) {
      window.DB.students.push({ id: Date.now(), name: data.name, subject: data.subject, next: "Нет записи", balance: "Ожидает", status: "unpaid", debt: 0, rate: Number(data.rate) || 0, monthIncome: 0 });
    }
    if (key === "transaction" && data.title) {
      window.DB.transactions.unshift({ id: Date.now(), date: "сегодня", title: data.title, amount: Number(data.amount) || 0, type: Number(data.amount) < 0 ? "expense" : "income", category: data.category, status: "pending", account: "Карта" });
    }
    if (key === "lesson" && data.student) {
      window.DB.lessons.unshift({ id: Date.now(), student: data.student, subject: (window.DB.students.find((s) => s.name === data.student) || {}).subject || "—", when: data.when || "—", duration: data.duration || "60 мин", status: "upcoming" });
    }
    closeForm();
    showToast("Сохранено (демо)");
    renderRoute(state.route);
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
    const fab = wrap.querySelector("[data-fab]");
    wrap.classList.toggle("open", open);
    fab?.setAttribute("aria-expanded", open ? "true" : "false");
    fan?.setAttribute("aria-hidden", open ? "false" : "true");
    wrap.querySelectorAll(".fan-item").forEach((b) => (b.tabIndex = open ? 0 : -1));
  }

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

  /* ---------- помощь ---------- */
  function openHelp() { helpModal.classList.add("open"); helpBackdrop.classList.add("open"); helpClose.focus(); }
  function closeHelp() { helpModal.classList.remove("open"); helpBackdrop.classList.remove("open"); }

  function handleAction(name) {
    if (name === "help") return openHelp();
    if (name === "theme") return setTheme(root.dataset.theme === "dark" ? "light" : "dark");
    if (name === "profile") return showToast("Профиль — раздел в разработке");
    if (name === "back") return history.back();
    if (name === "forward") return history.forward();
    if (name === "load-more") { state.budget.limit += 5; return renderRoute("budget"); }
    if (name === "load-more-ops") { state.operations.limit += 8; return renderRoute("operations"); }
    if (name === "close-modal") return closeForm();
    if (name === "more") { openFan(document.querySelector(".desktop-fab") || fabWraps[0]); return; }
    showToast(`Действие: ${name}`);
  }

  /* ---------- rail expand ---------- */
  function expandRail() { if (window.innerWidth >= 768) app.classList.add("rail-expanded"); }
  function collapseRail() { app.classList.remove("rail-expanded"); }

  /* ---------- events ---------- */
  u.fillIcons();
  setTheme(root.dataset.theme || "dark", false);

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
  window.addEventListener("resize", () => { if (window.innerWidth < 768) collapseRail(); });

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

    const filterBtn = event.target.closest("[data-filter]");
    if (filterBtn) {
      event.preventDefault();
      const scope = filterBtn.dataset.scope;
      if (scope === "teacher") { state.teacher.filter = filterBtn.dataset.filter; renderRoute("teacher"); }
      if (scope === "budget") { state.budget.filter = filterBtn.dataset.filter; state.budget.limit = 5; renderRoute("budget"); }
      if (scope === "operations") { state.operations.filter = filterBtn.dataset.filter; state.operations.limit = 8; renderRoute("operations"); }
      return;
    }

    const sortBtn = event.target.closest("[data-sort]");
    if (sortBtn) { event.preventDefault(); cycleSort(sortBtn.dataset.sort); return; }

    const actionBtn = event.target.closest("[data-action]");
    if (actionBtn) { event.preventDefault(); handleAction(actionBtn.dataset.action); closeAllFans(); return; }

    if (document.body.classList.contains("fan-open") && !event.target.closest("[data-fab-wrap]")) closeAllFans();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (genericModal.classList.contains("open")) { closeForm(); return; }
    if (helpModal.classList.contains("open")) { closeHelp(); return; }
    if (document.body.classList.contains("fan-open")) {
      const activeWrap = fabWraps.find((w) => w.classList.contains("open"));
      closeAllFans();
      activeWrap?.querySelector("[data-fab]")?.focus();
    }
  });

  window.addEventListener("hashchange", () => renderWithSkeleton(routeFromHash()));

  /* ---------- hide bottom nav on scroll down ---------- */
  let lastY = window.scrollY, ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (window.innerWidth >= 768 || document.body.classList.contains("fan-open")) {
        bottomNav.classList.remove("nav-hidden"); lastY = y; ticking = false; return;
      }
      if (y > 160 && y > lastY + 14) bottomNav.classList.add("nav-hidden");
      else if (y < lastY - 8 || y < 120) bottomNav.classList.remove("nav-hidden");
      lastY = y; ticking = false;
    });
  }, { passive: true });

  fabWraps.forEach((w) => setFanState(w, false));
  renderWithSkeleton(routeFromHash());
})();
