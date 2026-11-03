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
    operations: { filter: "all", sort: "date", dir: "desc", limit: 8, query: "", account: "all", category: "all", period: "all", selected: null, checked: [] },
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
  /* Этап 28-fix: отложенное скрытие — если за время выхода уже пришёл новый
     тост, не затираем его и НЕ чистим _onUndo (иначе «Отменить» пропадало). */
  let toastSeq = 0;

  function nextToast() {
    if (!toastQueue.length) { toastShowing = false; return; }
    const item = toastQueue.shift();
    toastShowing = true;
    const mySeq = ++toastSeq;
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
    const seqAtHide = toastSeq;
    toast.classList.remove("show");
    toastTimer = setTimeout(() => {
      /* Если за время выхода появился новый тост (seq изменился) или текущий
         всё ещё .show — ничего не трогаем: иначе затирался следующий тост и
         терялся _onUndo («Отменить» исчезало, undo был недоступен). */
      if (toastSeq === seqAtHide && !toast.classList.contains("show")) {
        toast.innerHTML = ""; toast._onUndo = null; nextToast();
      }
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

  /* ---------- Этап 19: общий тултип графиков (hover / focus / tap) ----------
     Бары и точки диаграмм помечаются data-tip. На тач-устройствах title
     не работает вовсе, поэтому подсказка живёт отдельным fixed-элементом
     на body (вне transform-контекста рамки устройства). */
  const chartTip = document.createElement("div");
  chartTip.className = "chart-tip";
  chartTip.setAttribute("role", "tooltip");
  document.body.appendChild(chartTip);
  let chartTipTimer = 0;

  function placeChartTip(el) {
    const text = el.getAttribute("data-tip");
    if (!text) return;
    chartTip.textContent = text;
    chartTip.classList.add("show");
    const r = el.getBoundingClientRect();
    const tw = chartTip.offsetWidth;
    const th = chartTip.offsetHeight;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), window.innerWidth - tw - 8);
    const top = Math.max(8, r.top - th - 8);
    chartTip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  function hideChartTip() {
    chartTip.classList.remove("show");
    clearTimeout(chartTipTimer);
  }

  document.addEventListener("pointerover", (e) => {
    const el = e.target.closest("[data-tip]");
    if (!el || e.pointerType === "touch") return;
    placeChartTip(el);
  });
  document.addEventListener("pointerout", (e) => {
    const el = e.target.closest("[data-tip]");
    if (!el || el.contains(e.relatedTarget)) return;
    if (e.pointerType !== "touch") hideChartTip();
  });
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    const el = e.target.closest("[data-tip]");
    if (!el) return;
    placeChartTip(el);
    clearTimeout(chartTipTimer);
    chartTipTimer = setTimeout(hideChartTip, 2600);
  });
  document.addEventListener("focusin", (e) => {
    const el = e.target.closest("[data-tip]");
    if (el) placeChartTip(el);
  });
  document.addEventListener("focusout", hideChartTip);
  window.addEventListener("scroll", hideChartTip, { passive: true });

  /* ---------- Этап 23: выбор месяца на TrendBars (референс D2) ---------- */
  document.addEventListener("click", (e) => {
    const col = e.target.closest("[data-trend-col]");
    if (!col) return;
    const root = col.closest("[data-trend]");
    if (!root) return;
    root.querySelectorAll("[data-trend-col]").forEach((c) => {
      const on = c === col;
      c.classList.toggle("is-sel", on);
      c.setAttribute("aria-pressed", String(on));
    });
    const inc = root.querySelector("[data-trend-income]");
    const exp = root.querySelector("[data-trend-expense]");
    const net = root.querySelector("[data-trend-net]");
    if (inc) inc.textContent = col.dataset.income || "";
    if (exp) exp.textContent = col.dataset.expense || "";
    if (net) {
      net.textContent = col.dataset.net || "";
      const neg = col.dataset.netNeg === "1";
      net.classList.toggle("t-expense", neg);
      net.classList.toggle("t-income", !neg);
    }
  });

  /* ---------- Этап 23: donut ↔ легенда (референс D1) ---------- */
  function setDonutFocus(wrap, idx) {
    const svg = wrap.querySelector(".donut");
    if (!svg) return;
    const off = idx === null || idx === undefined;
    svg.classList.toggle("is-dim", !off);
    svg.querySelectorAll(".seg").forEach((s, i) => s.classList.toggle("is-active", i === idx));
    wrap.querySelectorAll("[data-legend]").forEach((r) => r.classList.toggle("is-active", Number(r.dataset.legend) === idx));
    const center = svg.querySelector(".donut-center");
    const caption = svg.querySelector(".donut-caption");
    if (!center) return;
    if (off) {
      center.textContent = svg.dataset.center || center.textContent;
      if (caption) caption.textContent = svg.dataset.caption || "";
    } else {
      const seg = svg.querySelector(`.seg[data-seg="${idx}"]`);
      if (seg) {
        center.textContent = seg.dataset.value || "";
        if (caption) caption.textContent = seg.dataset.label || "";
      }
    }
  }

  document.addEventListener("pointerover", (e) => {
    const hit = e.target.closest("[data-seg], [data-legend]");
    if (!hit) return;
    const wrap = hit.closest(".donut-wrap");
    if (!wrap) return;
    const idx = hit.dataset.seg != null ? Number(hit.dataset.seg) : Number(hit.dataset.legend);
    setDonutFocus(wrap, idx);
  });

  document.addEventListener("pointerout", (e) => {
    const hit = e.target.closest("[data-seg], [data-legend]");
    if (!hit) return;
    const wrap = hit.closest(".donut-wrap");
    if (!wrap) return;
    if (e.relatedTarget && wrap.contains(e.relatedTarget)) return;
    setDonutFocus(wrap, null);
  });

  /* undo-обёртка: снимок DB до мутации → кнопка «Отменить» в тосте (Этап 6) */
  function snapshot() {
    try { return structuredClone(window.DB); } catch (_) { return null; }
  }

  /* Этап 29: единая точка записи — перед сохранением пересчитываем
     балансы счетов по операциям (включая переводы). Все мутации идут
     через mutateWithUndo/mutateForm, поэтому balance всегда производная.

     appliedTxs: после recalc все дельты «применены» (balance уже включает
     их) — фиксируем состояние журнала, чтобы planned-done и другие места,
     которые руками меняют acc.balance, не создали двойного учёта при
     следующем пересчёте. */
  const _origSave = window.Store.save.bind(window.Store);
  window.Store.save = function () {
    try {
      window.u.recalcBalances(window.DB);
      // нормализуем appliedTxs = сумма дельт всех непending tx текущего среза
      const db = window.DB;
      if (db && Array.isArray(db.accounts)) {
        const byName = {};
        db.accounts.forEach((a) => { byName[a.name] = a; });
        const next = {};
        (db.transactions || []).forEach((t) => {
          if (!t || t.id == null) return;
          if (t.type === "transfer") {
            const amt = Math.abs(Number(t.amount) || 0);
            const fromKey = t.account || t.fromAccount;
            const e = {};
            if (byName[fromKey]) e[fromKey] = -amt;
            if (byName[t.toAccount]) e[t.toAccount] = (e[t.toAccount] || 0) + amt;
            if (Object.keys(e).length) next[String(t.id)] = e;
          } else if (t.status !== "pending" && typeof t.amount === "number" && byName[t.account]) {
            next[String(t.id)] = { [t.account]: t.amount };
          }
        });
        db.appliedTxs = next;
      }
    } catch (_) {}
    _origSave();
  };

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
    /* Этап 34: роут на <html data-route> — CSS-правило полноширинной
       таблицы операций (:root[data-route="operations"][data-frame="off"]) */
    root.dataset.route = route;
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
    pageBody.innerHTML = `
      <div class="skeleton sk-card"></div>
      <div class="skeleton sk-row"></div>
      <div class="skeleton sk-row"></div>
      <div class="skeleton sk-row"></div>`;
  }

  function renderWithSkeleton() {
    const { route, params } = parseHash();
    clearTimeout(renderTimer);
    setActiveRoute(route);
    showSkeleton();
    closeAllFans();
    scrollToTop(false); // при смене раздела — наверх (fixed-хедер остаётся видимым)
    lastY = 0;
    bottomNav.classList.remove("nav-hidden");
    renderTimer = setTimeout(() => renderRoute(route, params), 360);
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

  /* softRender: true — без скелетона и без перезапуска fadeUp-анимаций
     (используется для фильтров/табов/сортировок в пределах одного раздела). */
  function renderRoute(route, params, opts) {
    opts = opts || {};
    if (opts.soft) root.classList.add("no-anim");
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
    setActiveRoute(route); // синхронизируем заголовок/подзаголовок с фактическим состоянием detail
    if (opts.soft) requestAnimationFrame(() => root.classList.remove("no-anim"));
  }

  /* быстрый мягкий перерендер текущего раздела (фильтры/табы/сортировки) */
  function softRender(route) {
    renderRoute(route || state.route, undefined, { soft: true });
    markIndeterminate(); // Этап 34: select-all «полувыбрано» — нативное свойство, ставим после рендера
  }

  /* Этап 34: после мягкого ререндера таблицы — состояние «полувыбрано»
     у чекбокса select-all (нативное свойство, в HTML-атрибуте не выражается). */
  function markIndeterminate() {
    const all = document.querySelector("[data-action='ops-check-all']");
    if (all) all.indeterminate = all.dataset.indeterminate === "1" && !all.checked;
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
        { name: "when", label: "Дата и время", type: "datetime", required: true },
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
        { name: "kind", label: "Тип операции", type: "segmented", options: [["expense", "Расход"], ["income", "Доход"], ["transfer", "Перевод"]] },
        { name: "title", label: "Название", type: "text", placeholder: "Напр.: Оплата: Анна К.", required: true },
        { name: "amount", label: "Сумма, ₽", type: "number", placeholder: "2400", required: true },
        /* Этап 28: у операции есть дата и время (колонка «Время» в таблице) */
        { name: "when", label: "Дата и время", type: "datetime" },
        { name: "category", label: "Категория", type: "select", options: (window.DB.categories || []).map((c) => c.name) },
        { name: "tags", label: "Теги", type: "tags" },
        { name: "account", label: "Счёт", type: "select", options: window.DB.accounts.map((a) => a.name) },
        /* Этап 29: приёмник перевода; поле скрыто, пока тип != «Перевод» */
        { name: "toAccount", label: "Счёт-приёмник", type: "select", options: window.DB.accounts.map((a) => a.name), transferOnly: true }
      ]
    },
    contribute: {
      title: "Пополнить цель",
      fields: [
        { name: "sum", label: "Сумма взноса, ₽", type: "number", placeholder: "5000", required: true }
      ]
    },
    /* Этап 31: создание счёта (кнопка «Добавить счёт» под каруселью) */
    account: {
      title: "Добавить счёт",
      fields: [
        { name: "name", label: "Название", type: "text", placeholder: "Напр.: Дебетовая ВТБ", required: true },
        { name: "kind", label: "Тип счёта", type: "select", options: ["Дебетовая карта", "Кредитная карта", "Накопительный счёт", "Наличные"] },
        { name: "balance", label: "Начальный баланс, ₽", type: "number", placeholder: "0" }
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
    /* Этап 28: редактирование операции — та же форма с предзаполнением */
    let editTx = null;
    if (key === "transaction" && extra && extra.txId) {
      editTx = (window.DB.transactions || []).find((t) => t.id === Number(extra.txId)) || null;
      if (editTx) genericTitle.textContent = "Редактирование операции";
    }
    const todayISO = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    /* «DD.MM.YYYY» (канон) → ISO; для старых коротких дат год восстанавливает
       u.parseDM. Без фолбэка на todayISO редкая дата («01.12») из локального
      снимка уезжала в прошлый год и терялась при редактировании. */
    const ddmmToISO = (d) => {
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(d || "")) return `${d.slice(6, 10)}-${d.slice(3, 5)}-${d.slice(0, 2)}`;
      return u.dateToISO(d) || todayISO;
    };
    let savedKind = "income";
    try { savedKind = localStorage.getItem("mono-tx-kind") || "income"; } catch (_) {}
    const pre = (name) => (editTx ? editTx[name] : undefined);
    const control = (fl) => {
      if (fl.type === "select") {
        const cur = pre(fl.name);
        const opts = fl.options.includes(cur) ? fl.options : (cur ? [cur, ...fl.options] : fl.options);
        return `<select id="gf-${fl.name}" name="${fl.name}">${opts.map((o) => `<option ${o === cur ? "selected" : ""}>${u.esc(o)}</option>`).join("")}</select>`;
      }
      if (fl.type === "segmented") {
        const curSeg = pre(fl.name) || savedKind;
        return `<div class="form-seg" role="radiogroup" aria-label="${fl.label}">
          ${fl.options.map(([val, txt]) => `
            <label class="form-seg-opt">
              <input type="radio" name="${fl.name}" value="${val}" ${val === curSeg ? "checked" : ""}>
              <span>${txt}</span>
            </label>`).join("")}
        </div>`;
      }
      if (fl.type === "datetime") {
        /* Этап 28: у занятий время по умолчанию 18:00, у операций — пустое поле времени */
        const isTx = key === "transaction";
        const dVal = editTx ? ddmmToISO(editTx.date) : todayISO;
        const tVal = editTx ? (editTx.time || "") : (isTx ? "" : "18:00");
        return `<div class="field-row">
          <input id="gf-${fl.name}-date" name="${fl.name}_date" type="date" ${isTx ? "" : `min="${todayISO}"`} value="${dVal}" required aria-label="Дата${isTx ? " операции" : " занятия"}">
          <input id="gf-${fl.name}-time" name="${fl.name}_time" type="time" value="${tVal}" step="900" aria-label="Время${isTx ? " операции" : " занятия"}">
        </div>`;
      }
      if (fl.type === "tags") {
        const list = window.DB.tags || [];
        if (!list.length) return `<p class="tag-empty">Тегов пока нет — добавьте их в профиле.</p>`;
        const curTags = Array.isArray(pre("tags")) ? pre("tags") : [];
        return `<div class="tag-pick">${list.map((t) => `
          <label class="tag-opt"><input type="checkbox" name="${fl.name}" value="${u.esc(t)}" ${curTags.includes(t) ? "checked" : ""}><span>${u.esc(t)}</span></label>`).join("")}</div>`;
      }
      const preVal = pre(fl.name);
      /* Этап 28-fix: Math.abs применялся к строке «Тест оплата» → NaN в поле title.
         Модуль нужен только для amount (в БД хранение со знаком), для остальных полей — как есть. */
      const dispVal = fl.name === "amount" ? Math.abs(Number(preVal) || 0) : preVal;
      const valAttr = (preVal !== undefined && preVal !== null && fl.type !== "file") ? ` value="${u.esc(String(dispVal))}"` : "";
      return `<input id="gf-${fl.name}" name="${fl.name}" type="${fl.type}" placeholder="${fl.placeholder || ""}" inputmode="${fl.type === "number" ? "decimal" : "text"}"${valAttr}>`;
    };
    genericForm.innerHTML = `
      ${f.fields.map((fl) => `
        <div class="field" data-field="${fl.name}"${fl.transferOnly ? ' data-transfer-only hidden' : ""}>
          <label${fl.type === "segmented" || fl.type === "tags" ? "" : ` for="gf-${fl.name}${fl.type === "datetime" ? "-date" : ""}"`}>${fl.label}${fl.required ? ' <span class="req">*</span>' : ""}</label>
          ${control(fl)}
          <p class="field-error" role="alert"></p>
        </div>`).join("")}
      <div class="form-actions">
        <button type="button" class="secondary-btn" data-action="close-modal">Отмена</button>
        <button type="submit" class="primary-btn">Сохранить</button>
      </div>`;
    /* Этап 29: поле «Счёт-приёмник» показываем только при типе «Перевод»;
       label счёта переименовываем в «Откуда», чтобы форма читалась однозначно */
    if (key === "transaction") {
      const syncTransferUI = () => {
        const kindSel = genericForm.querySelector('input[name="kind"]:checked');
        const kind = kindSel ? kindSel.value : "expense";
        const toField = genericForm.querySelector('[data-field="toAccount"]');
        if (toField) toField.hidden = kind !== "transfer";
        const accLabel = genericForm.querySelector('[data-field="account"] label');
        if (accLabel) accLabel.textContent = kind === "transfer" ? "Откуда (счёт)" : "Счёт";
      };
      genericForm.querySelectorAll('input[name="kind"]').forEach((r) => r.addEventListener("change", syncTransferUI));
      syncTransferUI();
    }
    /* Этап 20: ошибка поля снимается, как только пользователь начал править */
    genericForm.querySelectorAll("input, select").forEach((el) => {
      const ev = el.type === "radio" ? "change" : "input";
      el.addEventListener(ev, () => { if (el.name) setFieldError(el.name, ""); });
    });
    genericForm.dataset.key = key;
    lastFocused = document.activeElement;
    // модалки внутри рамки устройства (Этап 8): уменьшаем, чтобы влезали в экран рамки
    const mScale = frameOn() ? Math.min(1, (deviceFrame.clientHeight - 48) / 560) : 1;
    genericModal.style.setProperty("--modal-scale", String(mScale));
    genericModal.classList.add("open");
    genericBackdrop.classList.add("open");
    genericModal.dataset.form = key;
    const first = genericForm.querySelector("input:not([type=radio]), select");
    if (first) first.focus();
  }

  function closeForm() {
    genericModal.classList.remove("open");
    genericBackdrop.classList.remove("open");
    if (lastFocused) lastFocused.focus();
  }

  /* Этап 20: значение нативных date/time → «Сегодня, 18:00» / «05.11, 18:00» */
  function formatWhen(value) {
    if (!value) return "—";
    const [d, t] = String(value).split("T");
    const time = (t || "18:00").slice(0, 5);
    const dt = new Date(`${d}T${time}`);
    if (isNaN(dt)) return value;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const diff = Math.round((day - today) / 86400000);
    if (diff === 0) return `Сегодня, ${time}`;
    if (diff === 1) return `Завтра, ${time}`;
    return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}, ${time}`;
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
    if (!field) return;    const err = field.querySelector(".field-error");
    const input = field.querySelector("input, select");
    if (err) err.textContent = msg || "";
    field.classList.toggle("invalid", !!msg);
    if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function validateForm(key, data) {
    const f = buildForms()[key];
    let ok = true, firstBad = null;
    f.fields.forEach((fl) => {
      /* Этап 29: скрытые поля перевода не валидируем (required у них нет,
         но и пустой toAccount при expense/income — норма) */
      if (fl.transferOnly && data.kind !== "transfer") return;
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
    const fd = new FormData(genericForm);
    const data = Object.fromEntries(fd.entries());
    const formTags = fd.getAll("tags");
    // дата+время занятия приходят двумя полями — склеиваем в одно значение
    if (key === "lesson") data.when = data.when_date ? `${data.when_date}T${data.when_time || "18:00"}` : "";
    /* Этап 28: у операции дата+время тоже приходят парой полей */
    if (key === "transaction") {
      /* Этап 28-fix: канонический формат даты — «DD.MM.YYYY».
         Раньше сохранялось «DD.MM» без года: u.parseDM восстанавливал год
         эвристикой и свежая ноябрьская операция уезжала в прошлый год —
         фильтр периода её отсекал, сортировка «по дате» прятала вниз,
         smoke-тест падал на «form mutation failed». */
      const m = data.when_date ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(data.when_date) : null;
      data.txDate = m ? `${m[3]}.${m[2]}.${m[1]}` : "сегодня";
      data.txTime = (data.when_time || "").slice(0, 5);
    }
    if (!validateForm(key, data)) { showToast("Проверьте выделенные поля"); return; }
    // Мутации через mutateForm: снимок DB до изменения → тост с «Отменить» (Этап 6)
    if (key === "student" && data.name) {
      mutateForm((db) => db.students.push({ id: Date.now(), name: data.name.trim(), subject: data.subject, next: "Нет записи", balance: "Ожидает", status: "unpaid", debt: 0, rate: Number(data.rate) || 0, monthIncome: 0 }), `Ученик добавлен: ${data.name.trim()}`);
    } else if (key === "transaction" && data.title) {
      const raw = Number(String(data.amount).replace(/\s/g, "").replace(",", ".")) || 0;
      /* Этап 29: добавился тип «Перевод» — сумма всегда положительная,
         деньги двигаются между счетами (recalcBalances учтёт обе стороны) */
      const isTransfer = data.kind === "transfer";
      // минус в поле суммы по-прежнему означает расход, даже если выбран «Доход»
      const kind = isTransfer ? "transfer" : (raw < 0 ? "expense" : (data.kind === "income" ? "income" : "expense"));
      const amount = isTransfer ? Math.abs(raw) : (kind === "income" ? 1 : -1) * Math.abs(raw);
      /* перевод «самому себе» запрещён */
      if (isTransfer && data.toAccount && data.toAccount === data.account) {
        setFieldError("toAccount", "Счёт-приёмник должен отличаться от источника");
        genericForm.querySelector('[name="toAccount"]')?.focus();
        return;
      }
      try { localStorage.setItem("mono-tx-kind", kind); } catch (_) {}
      if (extra.txId) {
        /* Этап 28: редактирование — обновляем существующую запись на месте */
        mutateForm((db) => {
          const t = db.transactions.find((x) => x.id === Number(extra.txId));
          if (!t) return;
          t.title = data.title.trim();
          t.amount = amount;
          t.type = kind === "transfer" ? "transfer" : (amount < 0 ? "expense" : "income");
          t.date = data.txDate === "сегодня" ? u.fmtDM(new Date()) : data.txDate;
          t.time = data.txTime;
          t.category = data.category;
          t.account = data.account || "Карта Т-Банк";
          if (kind === "transfer") t.toAccount = data.toAccount; else delete t.toAccount;
          t.tags = formTags;
        }, "Операция обновлена");
      } else {
        mutateForm((db) => db.transactions.unshift({ id: Date.now(), date: data.txDate, time: data.txTime, title: data.title.trim(), amount, type: kind === "transfer" ? "transfer" : (amount < 0 ? "expense" : "income"), category: data.category, tags: formTags, status: "pending", account: data.account || "Карта Т-Банк", ...(kind === "transfer" ? { toAccount: data.toAccount } : {}) }), "Операция добавлена");
      }
    } else if (key === "lesson" && data.student) {
      mutateForm((db) => db.lessons.unshift({ id: Date.now(), student: data.student, subject: (db.students.find((s) => s.name === data.student) || {}).subject || "—", when: formatWhen(data.when), duration: data.duration || "60 мин", status: "upcoming" }), `Занятие запланировано: ${data.student}`);
    } else if (key === "contribute" && extra.goalName) {
      mutateForm((db) => { const g = db.goals.find((x) => x.name === extra.goalName); if (g) g.saved = Math.min(g.target, g.saved + Number(data.sum)); }, `Цель пополнена на ${u.money(Number(data.sum))}`);
    } else if (key === "account" && data.name) {
      /* Этап 31: создание счёта. balance — «открывающий»: recalcBalances
         хранит appliedTxs и не пересчитывает заново, поэтому прибавляем сразу. */
      const KIND_MAP = { "Дебетовая карта": "card", "Кредитная карта": "credit", "Накопительный счёт": "savings", "Наличные": "cash" };
      const kindKey = KIND_MAP[data.kind] || "card";
      const openBal = Math.abs(Number(String(data.balance).replace(/\s/g, "")) || 0);
      mutateForm((db) => {
        db.accounts.push({ id: Date.now(), name: data.name.trim(), kind: kindKey, bankId: kindKey === "cash" ? "cash" : "other", balance: openBal, openingBalance: openBal });
        if (openBal) db.transactions.unshift({ id: Date.now() - 1, date: u.fmtDM(new Date()), time: "", title: "Открытие счёта", amount: openBal, type: "income", category: "Личное", tags: [], status: "done", account: data.name.trim() });
      }, `Счёт добавлен: ${data.name.trim()}`);
    } else {
      window.Store.save();
      renderRoute(state.route);
      pushToast("Сохранено", { kind: "success" });
    }
    closeForm();
  });

  /* ---------- Этап 21: импорт выписки (демо-разбор) ----------
     Вместо фиктивной операции на 0,01 ₽: dropzone → предпросмотр
     правдоподобных строк → выбор галочками → импорт с undo. */
  const importModal = document.getElementById("importModal");
  const importBackdrop = document.getElementById("importBackdrop");
  const importDrop = document.getElementById("importDrop");
  const importFile = document.getElementById("importFile");
  const importPick = document.getElementById("importPick");
  const importPreview = document.getElementById("importPreview");
  const importList = document.getElementById("importList");
  const importCount = document.getElementById("importCount");
  const importFileName = document.getElementById("importFileName");
  const importSubmit = document.getElementById("importSubmit");
  const importAgain = document.getElementById("importAgain");
  let importRows = [];

  function demoStatementRows() {
    const fmt = (d) => u.fmtDM(d);
    const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
    return [
      { date: day(0), title: "Оплата: Анна К.", category: "Ученики", amount: 2400 },
      { date: day(0), title: "Кофе", category: "Личное", amount: -350 },
      { date: day(1), title: "Продукты", category: "Личное", amount: -3200 },
      { date: day(1), title: "Аренда кабинета", category: "Работа", amount: -15000 },
      { date: day(2), title: "Оплата: Олег Д.", category: "Ученики", amount: 2400 }
    ];
  }

  function updateImportCount() {
    const n = importList.querySelectorAll("[data-imp-check]:checked").length;
    importCount.textContent = String(n);
    importSubmit.disabled = n === 0;
    importSubmit.textContent = n ? `Импортировать (${n})` : "Импортировать";
  }

  function renderImportRows() {
    importList.innerHTML = importRows.map((r, i) => `
      <label class="imp-row">
        <input type="checkbox" checked data-imp-check="${i}">
        <span class="imp-main">
          <span class="imp-title">${u.esc(r.title)}</span>
          <span class="imp-meta">${r.date} · ${u.esc(r.category)}</span>
        </span>
        <span class="imp-amount ${r.amount < 0 ? "t-expense" : "t-income"}">${r.amount < 0 ? "−" : "+"}${u.money(Math.abs(r.amount))}</span>
      </label>`).join("");
    updateImportCount();
  }

  function handleImportFile(file) {
    if (!file) return;
    importRows = demoStatementRows();
    importFileName.textContent = file.name || "выписка.csv";
    importDrop.hidden = true;
    importPreview.hidden = false;
    renderImportRows();
  }

  function openImport() {
    importDrop.hidden = false;
    importPreview.hidden = true;
    importRows = [];
    importFile.value = "";
    importSubmit.disabled = true;
    importSubmit.textContent = "Импортировать";
    const mScale = frameOn() ? Math.min(1, (deviceFrame.clientHeight - 48) / 560) : 1;
    importModal.style.setProperty("--modal-scale", String(mScale));
    importModal.classList.add("open");
    importBackdrop.classList.add("open");
    importPick.focus();
  }

  function closeImport() {
    importModal.classList.remove("open");
    importBackdrop.classList.remove("open");
  }

  importPick.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", () => handleImportFile(importFile.files[0]));
  importAgain.addEventListener("click", () => {
    importDrop.hidden = false;
    importPreview.hidden = true;
    importRows = [];
    importFile.value = "";
    importSubmit.disabled = true;
    importSubmit.textContent = "Импортировать";
  });
  importList.addEventListener("change", updateImportCount);
  importModal.querySelectorAll('[data-action="close-import"]').forEach((b) => b.addEventListener("click", closeImport));
  importBackdrop.addEventListener("click", closeImport);
  ["dragenter", "dragover"].forEach((ev) => importDrop.addEventListener(ev, (e) => {
    e.preventDefault();
    importDrop.classList.add("drag");
  }));
  ["dragleave", "dragend", "drop"].forEach((ev) => importDrop.addEventListener(ev, () => importDrop.classList.remove("drag")));
  importDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    handleImportFile(e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : null);
  });
  importSubmit.addEventListener("click", () => {
    const picked = [...importList.querySelectorAll("[data-imp-check]:checked")]
      .map((cb) => importRows[Number(cb.dataset.impCheck)]);
    if (!picked.length) return;
    const account = (window.DB.accounts[0] || {}).name || "Карта Т-Банк";
    mutateWithUndo((db) => {
      picked.forEach((r, i) => db.transactions.unshift({
        id: Date.now() + i,
        date: r.date,
        title: r.title,
        amount: r.amount,
        type: r.amount < 0 ? "expense" : "income",
        category: r.category,
        status: "paid",
        account
      }));
    }, `Импортировано операций: ${picked.length} (демо)`);
    closeImport();
  });

  /* ---------- Этап 22: экспорт/импорт JSON (профиль) ---------- */
  const dataImportFile = document.getElementById("dataImportFile");

  function exportData() {
    const payload = window.Store.dump();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    a.href = url;
    a.download = `mono-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast("Данные выгружены в JSON", "success");
  }

  function importDataFromFile(file) {
    if (!file) return;
    const prev = snapshot();
    const reader = new FileReader();
    reader.onload = () => {
      let parsed = null;
      try { parsed = JSON.parse(String(reader.result)); } catch (_) {}
      if (!parsed) { showToast("Не удалось прочитать JSON", "error"); return; }
      const res = window.Store.importData(parsed);
      if (!res.ok) { showToast(res.error, "error"); return; }
      renderRoute(state.route);
      pushToast(`Импортировано: ${window.DB.transactions.length} операций, ${window.DB.students.length} учеников`, {
        kind: "success",
        duration: 4200,
        onUndo: prev ? () => {
          window.DB = prev;
          window.Store.save();
          renderRoute(state.route);
          pushToast("Импорт отменён", { kind: "info", duration: 1600 });
        } : null
      });
    };
    reader.onerror = () => showToast("Не удалось прочитать файл", "error");
    reader.readAsText(file);
  }

  dataImportFile.addEventListener("change", () => {
    importDataFromFile(dataImportFile.files && dataImportFile.files[0]);
    dataImportFile.value = "";
  });

  /* ---------- Этап 24: детали бюджета категории (референс B2) ---------- */
  const budgetModal = document.getElementById("budgetModal");
  const budgetBackdrop = document.getElementById("budgetBackdrop");
  const budgetDetail = document.getElementById("budgetDetail");
  const budgetTitle = document.getElementById("budgetTitle");
  let budgetCurrent = null;

  function budgetDetailRow(t) {
    return `<div class="bd-row">
      <span class="bd-row-main"><b>${u.esc(t.title)}</b><span>${u.esc(t.date)}</span></span>
      <span class="bd-row-amt ${t.amount < 0 ? "t-expense" : "t-income"}">${u.money(t.amount)}</span>
    </div>`;
  }

  function renderBudgetDetail(b) {
    const limit = b.limit || Math.round(b.plan * 1.25);
    const pc = b.plan ? Math.round((b.fact / b.plan) * 100) : 0;
    const cls = b.fact > limit ? "over" : b.fact > b.plan ? "warn" : "ok";
    const denom = Math.max(limit, b.fact, 1);
    const txs = window.DB.transactions
      .filter((t) => t.category === b.name || (b.name === "Работа / кабинет" && t.category === "Работа"))
      .slice(0, 6);
    budgetTitle.textContent = b.name;
    const statusLabel = cls === "over" ? "превышен" : cls === "warn" ? "на грани" : "в норме";
    const statusClass = cls === "over" ? "badge--overdue" : cls === "warn" ? "badge--pending" : "badge--paid";
    budgetDetail.innerHTML = `
      <div class="bd-hero">
        <div class="bd-head">
          <div class="bd-amount ${b.fact > b.plan ? "t-expense" : ""}">${u.money(b.fact)}</div>
          <span class="badge ${statusClass}">${statusLabel}</span>
        </div>
        <div class="bd-sub">из ${u.money(b.plan)} · ${pc}%${b.fact > limit ? " · лимит превышен" : ""}</div>
        <div class="dual-bar ${cls}">
          <span class="db-fill" style="width:${Math.min(100, (b.fact / denom) * 100)}%"></span>
          <span class="db-plan-mark" style="left:${Math.min(100, (b.plan / denom) * 100)}%"></span>
        </div>
      </div>
      <h3 class="bd-title">Операции категории</h3>
      ${txs.length
        ? `<div class="bd-rows">${txs.map(budgetDetailRow).join("")}</div>`
        : `<p class="bd-empty">Пока нет операций в этой категории.</p>`}
      <form class="bd-form" data-budget-limit>
        <label for="bdLimit">Лимит на месяц, ₽</label>
        <div class="bd-form-row">
          <input id="bdLimit" name="limit" type="number" min="0" step="100" inputmode="numeric" value="${b.plan}">
          <button class="primary-btn" type="submit">Сохранить</button>
        </div>
      </form>`;
  }

  function openBudget(name) {
    const b = window.DB.budgets.find((x) => x.name === name);
    if (!b) return;
    budgetCurrent = b;
    renderBudgetDetail(b);
    const mScale = frameOn() ? Math.min(1, (deviceFrame.clientHeight - 48) / 560) : 1;
    budgetModal.style.setProperty("--modal-scale", String(mScale));
    budgetModal.classList.add("open");
    budgetBackdrop.classList.add("open");
  }

  function closeBudget() {
    budgetModal.classList.remove("open");
    budgetBackdrop.classList.remove("open");
  }

  budgetDetail.addEventListener("submit", (e) => {
    if (!e.target.matches("[data-budget-limit]")) return;
    e.preventDefault();
    const val = Number(new FormData(e.target).get("limit"));
    if (!isFinite(val) || val < 0) return;
    const name = budgetCurrent ? budgetCurrent.name : "";
    closeBudget();
    mutateWithUndo((db) => {
      const b = db.budgets.find((x) => x.name === name);
      if (b) b.plan = Math.round(val);
    }, `Лимит «${name}»: ${u.money(Math.round(val))}`);
  });

  budgetModal.querySelectorAll('[data-action="close-budget"]').forEach((btn) => btn.addEventListener("click", closeBudget));
  budgetBackdrop.addEventListener("click", closeBudget);
  document.addEventListener("click", (e) => {
    const row = e.target.closest("[data-budget]");
    if (row) openBudget(row.dataset.budget);
  });

  /* ---------- Этап 26: конструктор категорий и тегов ---------- */
  document.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-add-category], [data-add-tag]");
    if (!form) return;
    e.preventDefault();
    const name = String(new FormData(form).get("name") || "").trim();
    if (!name) return;
    const isCat = form.hasAttribute("data-add-category");
    const list = isCat ? (window.DB.categories = window.DB.categories || []) : (window.DB.tags = window.DB.tags || []);
    const exists = list.some((x) => (typeof x === "string" ? x : x.name).toLowerCase() === name.toLowerCase());
    if (exists) {
      showToast(isCat ? "Такая категория уже есть" : "Такой тег уже есть", "error");
      return;
    }
    mutateWithUndo((db) => {
      if (isCat) db.categories.push({ name, color: u.chartColor((db.categories.length + 1) % 8) });
      else db.tags.push(name);
    }, isCat ? `Категория добавлена: ${name}` : `Тег добавлен: ${name}`);
  });

  document.addEventListener("click", (e) => {
    const delCat = e.target.closest("[data-del-category]");
    if (delCat) {
      const name = delCat.dataset.delCategory;
      const used = (window.DB.transactions || []).filter((t) => t.category === name).length;
      if (used) {
        showToast(`Категория используется в ${used} операциях`, "error");
        return;
      }
      mutateWithUndo((db) => {
        db.categories = (db.categories || []).filter((c) => c.name !== name);
      }, `Категория удалена: ${name}`);
      return;
    }
    const delTag = e.target.closest("[data-del-tag]");
    if (delTag) {
      const tag = delTag.dataset.delTag;
      mutateWithUndo((db) => {
        db.tags = (db.tags || []).filter((t) => t !== tag);
        (db.transactions || []).forEach((t) => {
          if (Array.isArray(t.tags)) t.tags = t.tags.filter((x) => x !== tag);
        });
      }, `Тег удалён: ${tag}`);
    }
  });

  function runQuick(key) {
    const action = quickActions.find((a) => a.key === key);
    if (!action) return;
    try { localStorage.setItem("mono-last-quick", key); } catch (_) {}
    if (key === "statement") openImport(); else openForm(key);
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
        setTimeout(() => {
          // не перекрываем открытую форму подсказкой про долгое нажатие
          if (genericModal.classList.contains("open")) return;
          showToast("Долгое нажатие на + повторит последнее действие");
        }, 450);
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

  function markTxPaid(id) {
    mutate((db) => { const t = db.transactions.find((x) => x.id === id); if (t) t.status = "paid"; }, "Отмечено как оплачено");
  }

  function deleteTx(id) {
    mutateWithUndo((db) => {
      db.transactions = db.transactions.filter((t) => t.id !== id);
    }, "Операция удалена");
  }

  /* Этап 28: подтверждение удаления (референс «Домкнига / Операции» —
     перед удалением спрашивает уверенность, чтобы не терять данные кликом). */
  const confirmModal = document.getElementById("confirmModal");
  const confirmBackdrop = document.getElementById("confirmBackdrop");
  const confirmTitleEl = document.getElementById("confirmTitle");
  const confirmTextEl = document.getElementById("confirmText");
  const confirmOkBtn = document.getElementById("confirmOk");
  let confirmAction = null;

  function openConfirm(title, text, okLabel, onOk) {
    confirmTitleEl.textContent = title;
    confirmTextEl.textContent = text;
    confirmOkBtn.textContent = okLabel;
    confirmAction = onOk;
    confirmModal.classList.add("open");
    confirmBackdrop.classList.add("open");
    confirmOkBtn.focus();
  }
  function closeConfirm() {
    confirmModal.classList.remove("open");
    confirmBackdrop.classList.remove("open");
    confirmAction = null;
  }
  function confirmDeleteTx(id) {
    const t = (window.DB.transactions || []).find((x) => x.id === id);
    if (!t) return;
    openConfirm(
      "Удалить операцию?",
      `«${t.title}» (${t.date}${t.time ? ", " + t.time : ""}, ${u.money(t.amount)}) будет удалена. Действие можно отменить.`,
      "Удалить",
      () => deleteTx(id)
    );
  }
  /* Этап 34: массовое удаление выбранных чекбоксами операций
     (референс «операции.html» — bulk-bar с кнопкой «Удалить выбранное»). */
  function pluralOpsRu(n) {
    return n % 10 === 1 && n % 100 !== 11 ? "операция" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "операции" : "операций";
  }
  function confirmDeleteSelectedTx() {
    const ids = state.operations.checked || [];
    if (!ids.length) return;
    openConfirm(
      "Удалить выбранные операции?",
      `${ids.length} ${pluralOpsRu(ids.length)} будут удалены. Действие можно отменить одним нажатием «Отменить» в уведомлении.`,
      "Удалить",
      () => mutateWithUndo((db) => { db.transactions = db.transactions.filter((t) => !ids.includes(t.id)); },
        `Удалено ${ids.length} ${pluralOpsRu(ids.length)}`)
    );
    state.operations.checked = [];
  }
  if (confirmOkBtn) confirmOkBtn.addEventListener("click", () => {
    const fn = confirmAction;
    closeConfirm();
    if (fn) fn();
  });
  if (confirmBackdrop) confirmBackdrop.addEventListener("click", closeConfirm);

  /* Этап 28: редактирование операции — та же форма с предзаполнением */
  function openEditTx(id) {
    const t = (window.DB.transactions || []).find((x) => x.id === id);
    if (!t) return;
    openForm("transaction", { txId: id });
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
        db.transactions.unshift({ id: Date.now(), date: u.fmtDM(new Date()), title: pl.title, amount: -pl.amount, type: "expense", category: "Личное", status: "paid", account: "Карта Т-Банк" });
        /* Этап 29: ручное acc.balance -= убрано — созданная tx будет
           учтена recalcBalances в единой точке Store.save (иначе двойное списание) */
      } else pl.status = pl._prevStatus || "upcoming";
    }, turningDone ? `Оплачено: ${title}` : `Вернули в расписание: ${title}`);
  }

  function contributeGoal(name) {
    const g = window.DB.goals.find((x) => x.name === name);
    if (!g) return;
    openForm("contribute", { goalName: name, max: g.target - g.saved });
  }

  /* Налоги v2 (Этап 15): «отложить остаток» и уплата декларации */
  function taxPayRest(amount) {
    const t = window.DB.taxes;
    const add = Math.min(Number(amount) || (t.due - t.paid), t.due - t.paid);
    if (add <= 0) return pushToast("Налог уже закрыт", { kind: "info" });
    mutateWithUndo((db) => { db.taxes.paid += add; }, `Отложено на налог: ${u.money(add)}`);
  }
  function taxDeclPay(name) {
    const d = window.DB.taxes.declarations.find((x) => x.name === name);
    if (!d || d.status === "paid") return;
    mutateWithUndo((db) => {
      d.status = "paid";
      const t = db.taxes;
      t.paid = Math.min(t.paid + d.sum, t.due);
    }, `Уплачено: ${name}`);
  }

  function handleAction(name) {
    if (name === "help") return openHelp();
    if (name === "theme") return setTheme(root.dataset.theme === "dark" ? "light" : "dark");
    if (name === "profile") return goTo("profile");
    if (name === "back") return navBack();
    if (name === "forward") return navForward();
    if (name === "load-more") { state.budget.limit += 5; return softRender("budget"); }
    if (name === "load-more-ops") { state.operations.limit += 8; return softRender("operations"); }
    if (name === "reset-ops-filters") {
      state.operations = { filter: "all", sort: "date", dir: "desc", limit: 8, query: "", account: "all", category: "all", period: "all", selected: null, checked: [] };
      return softRender("operations");
    }
    if (name === "close-modal") return closeForm();
    if (name === "close-confirm") return closeConfirm();
    /* Этап 31: кнопки под каруселью счетов */
    if (name === "add-account") { openForm("account"); return; }
    if (name === "transfer-between") {
      openForm("transaction");
      const radio = genericForm.querySelector('[name="kind"][value="transfer"]');
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event("change", { bubbles: true })); }
      return;
    }
    if (name === "export-data") return exportData();
    if (name === "import-data") return dataImportFile.click();
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
    /* Этап 15: тост живёт ВНЕ рамки — иначе transform/overflow рамки
       делают его position:fixed относительно телефона и он перекрывается. */
    if (toast && toast.parentElement !== document.body) document.body.appendChild(toast);
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
    /* Этап 15: тост всегда остаётся прямым ребёнком body (вне transform-контекста рамки) */
    if (toast && toast.parentElement !== document.body) document.body.appendChild(toast);
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

  function applyPreview(mode, silent) {
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
    // Этап 17: при старте режим восстанавливается молча — тост «Режим
    // предпросмотра» на каждой загрузке перекрывал контент.
    if (!silent) showToast(`Режим предпросмотра: ${previewNames[mode]}`, "info");
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
  applyPreview(initialPreview, true);

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
      softRender("teacher");
      return;
    }

    const fsBtn = event.target.closest("[data-fontsize]");
    if (fsBtn) {
      event.preventDefault();
      root.dataset.fontsize = fsBtn.dataset.fontsize;
      try { localStorage.setItem("mono-fontsize", fsBtn.dataset.fontsize); } catch (_) {}
      softRender();
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

    /* Этап 28: сегмент периода в тулбаре операций */
    const periodChip = event.target.closest("[data-period-btn]");
    if (periodChip) {
      event.preventDefault();
      state.operations.period = periodChip.dataset.periodBtn;
      state.operations.limit = 8;
      softRender("operations");
      return;
    }

    const sortBtn = event.target.closest("[data-sort]");
    if (sortBtn) { event.preventDefault(); cycleSort(sortBtn.dataset.sort); return; }

    const dashPeriodBtn = event.target.closest("[data-dash-period]");
    if (dashPeriodBtn) { state.dashboards.period = dashPeriodBtn.dataset.dashPeriod; softRender("dashboards"); return; }

    /* Этап 28: «+N ещё» в легенде donut — разворачивает скрытые строки на месте */
    const legendMoreBtn = event.target.closest('[data-action="legend-more"]');
    if (legendMoreBtn) {
      event.preventDefault();
      const legend = legendMoreBtn.closest(".legend");
      if (legend) {
        legend.classList.add("is-expanded");
        legend.querySelectorAll(".legend-hidden").forEach((r) => r.classList.remove("legend-hidden"));
        legendMoreBtn.remove();
      }
      return;
    }

    /* Этап 32: клик по заголовку колонки таблицы — сортировка */
    const thBtn = event.target.closest(".th-sort");
    if (thBtn) {
      event.preventDefault();
      const col = thBtn.dataset.col;
      const stOps = state.operations;
      if (stOps.sort === col) stOps.dir = stOps.dir === "desc" ? "asc" : "desc";
      else { stOps.sort = col; stOps.dir = "desc"; }
      softRender("operations");
      return;
    }

    const actionBtn = event.target.closest("[data-action]");
    if (actionBtn) {
      event.preventDefault();
      const a = actionBtn.dataset.action;
      /* Этап 32: выделение строки таблицы → панель деталей операции.
         Клики по кнопкам внутри строки не должны её выделять. */
      if (a === "tx-select") {
        if (event.target.closest(".mini-btn, .row-btn, .primary-btn, .secondary-btn")) return;
        /* Этап 34: клик по чекбоксу строки — только выделение, без деталей.
           Флаг ставится в change-обработчике раньше click-всплытия; на
           всякий случай проверяем и сам target (label/checkbox). */
        if (window.__opsChkTx || event.target.matches("input[type='checkbox']")) return;
        const id = Number(actionBtn.dataset.id);
        state.operations.selected = state.operations.selected === id ? null : id;
        softRender("operations");
        return;
      }
      if (a === "ops-deselect") { state.operations.selected = null; softRender("operations"); return; }
      /* Этап 34: множественное удаление выбранных чекбоксами */
      if (a === "ops-check-all-off") { state.operations.checked = []; softRender("operations"); return; }
      if (a === "ops-del-selected") return confirmDeleteSelectedTx();
      if (a === "tx-pay") return markTxPaid(Number(actionBtn.dataset.id));
      if (a === "tx-del") return confirmDeleteTx(Number(actionBtn.dataset.id));
      if (a === "tx-edit") return openEditTx(Number(actionBtn.dataset.id));
      if (a === "remind") return remindDebt(Number(actionBtn.dataset.id));
      if (a === "planned-done") return togglePlannedDone(actionBtn.dataset.title);
      if (a === "goal-add") return contributeGoal(actionBtn.dataset.goal);
      if (a === "tax-pay") return taxPayRest(actionBtn.dataset.extra);
      if (a === "tax-decl-pay") return taxDeclPay(actionBtn.dataset.extra);
      handleAction(a);
      closeAllFans();
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
      const brow = event.target.closest && event.target.closest("[data-budget]");
      if (brow) {
        event.preventDefault();
        brow.click();
        return;
      }
      /* Этап 32: Enter/Space по строке таблицы операций — выделить */
      const trow = event.target.closest && event.target.closest("tr.row--tx[data-action='tx-select']");
      if (trow) {
        event.preventDefault();
        trow.click();
        return;
      }
    }
    if (event.key !== "Escape") return;
    if (confirmModal.classList.contains("open")) { closeConfirm(); return; }
    if (budgetModal.classList.contains("open")) { closeBudget(); return; }
    if (importModal.classList.contains("open")) { closeImport(); return; }
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

  /* Этап 28: селекты счёта/категории в тулбаре операций */
  document.addEventListener("change", (event) => {
    const accSel = event.target.closest("[data-account-select]");
    if (accSel) { state.operations.account = accSel.value; state.operations.limit = 8; softRender("operations"); return; }
    const catSel = event.target.closest("[data-category-select]");
    if (catSel) { state.operations.category = catSel.value; state.operations.limit = 8; softRender("operations"); return; }
    /* Этап 34: чекбоксы таблицы операций — множественное выделение.
       Флаг __opsChkTx гасит click-всплытие к строке (не открывать детали). */
    const chkRow = event.target.closest("[data-action='ops-check-row']");
    if (chkRow) {
      window.__opsChkTx = true;
      setTimeout(() => { window.__opsChkTx = false; }, 0);
      const id = Number(chkRow.dataset.id);
      const arr = state.operations.checked || [];
      state.operations.checked = chkRow.checked ? [...new Set([...arr, id])] : arr.filter((x) => x !== id);
      softRender("operations");
      return;
    }
    const chkAll = event.target.closest("[data-action='ops-check-all']");
    if (chkAll) {
      window.__opsChkTx = true;
      setTimeout(() => { window.__opsChkTx = false; }, 0);
      const ids = [...document.querySelectorAll("[data-action='ops-check-row']")].map((el) => Number(el.dataset.id));
      state.operations.checked = chkAll.checked ? [...new Set(ids)] : [];
      softRender("operations");
    }
  });

  /* ---------- собственная история навигации (Этап 14c) ---------- */
  const navHist = { stack: [location.hash || "#home"], idx: 0 };

  function updateNavBtns() {
    const back = document.querySelector('[data-action="back"]');
    const fwd = document.querySelector('[data-action="forward"]');
    if (back) { back.disabled = navHist.idx <= 0; back.classList.toggle("is-disabled", navHist.idx <= 0); }
    if (fwd) { fwd.disabled = navHist.idx >= navHist.stack.length - 1; fwd.classList.toggle("is-disabled", navHist.idx >= navHist.stack.length - 1); }
  }

  function navBack() {
    if (navHist.idx > 0) { navHist.idx -= 1; location.hash = navHist.stack[navHist.idx]; }
  }
  function navForward() {
    if (navHist.idx < navHist.stack.length - 1) { navHist.idx += 1; location.hash = navHist.stack[navHist.idx]; }
  }

  window.addEventListener("hashchange", () => {
    const h = location.hash || "#home";
    if (navHist.stack[navHist.idx] !== h) {
      navHist.stack = navHist.stack.slice(0, navHist.idx + 1);
      navHist.stack.push(h);
      navHist.idx = navHist.stack.length - 1;
    }
    updateNavBtns();
    renderWithSkeleton(routeFromHash());
  });

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
  updateNavBtns();
  renderWithSkeleton(routeFromHash());

  /* ---------- Этап 22: PWA — офлайн-оболочка ----------
     На file:// сервис-воркер недоступен, поэтому только http(s). */
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
