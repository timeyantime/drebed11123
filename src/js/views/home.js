/* ============================================================
   MONO — VIEW: ГЛАВНАЯ (hub) + общие row-хелперы
   ============================================================ */
window.Views = window.Views || {};

(function () {
  const { money, donutSVG, legendHTML, esc } = u;

  /* ---- общие partials (переиспользуются другими view) ---- */
  function lessonRow(l) {
    const statusText = { upcoming: "Предстоит", done: "Проведено", canceled: "Отменён" }[l.status] || l.status;
    const tone = { upcoming: "badge--accent", done: "badge--paid", canceled: "badge--neutral" }[l.status] || "badge--neutral";
    return `
      <div class="row">
        <div class="row-main">
          <div class="row-title">${esc(l.student)}</div>
          <div class="row-meta">${esc(l.subject)} • ${esc(l.when)} • ${esc(l.duration)}</div>
        </div>
        <span class="badge ${tone}"><span class="dot"></span>${statusText}</span>
      </div>`;
  }

  function avatarHue(id) { return ((id || 1) * 47) % 360; }

  function studentRow(s) {
    const tone = s.status === "unpaid" ? "badge--pending" : s.status === "active" ? "badge--paid" : "badge--neutral";
    return `
      <div class="row row-link" data-go-route="teacher" data-go-params="student/${s.id}" role="link" tabindex="0" aria-label="Открыть карточку: ${esc(s.name)}">
        <span class="avatar" style="--c:hsl(${avatarHue(s.id)} 62% 52%)" >${esc(s.name[0])}</span>
        <div class="row-main">
          <div class="row-title">${esc(s.name)}</div>
          <div class="row-meta">${esc(s.subject)} • ${esc(s.next)}</div>
        </div>
        <span class="badge ${tone}">${esc(s.balance)}</span>
        <span class="chev" data-icon="chevron"></span>
      </div>`;
  }

  function transactionRow(t) {
    const cls = t.amount < 0 ? "expense" : "income";
    const pending = t.status === "pending" ? " • ожидает" : "";
    return `
      <div class="row">
        <div class="row-main">
          <div class="row-title">${esc(t.title)}</div>
          <div class="row-meta">${esc(t.date)} • ${esc(t.category)} • ${esc(t.account || "Карта")}${pending}</div>
        </div>
        <div class="amount ${cls}">${money(t.amount)}</div>
      </div>`;
  }

  function statPanel(title, stats) {
    return `
      <section class="panel">
        <h2 class="panel-title">${title}</h2>
        <div class="stats-grid">
          ${stats.map((s) => `
            <div class="stat">
              <span class="stat-label">${s.label}</span>
              <span class="stat-value ${s.cls || ""}">${s.value}</span>
            </div>`).join("")}
        </div>
      </section>`;
  }

  u.partials = { lessonRow, studentRow, transactionRow, statPanel, avatarHue };

  /* ---- hub-плитки разделов (Этап 2 — IA). Экспортировано для sheet «Ещё» ---- */
  const HUB = [
    { route: "operations", icon: "operations", title: "Операции", sub: "Все транзакции", tone: "var(--accent)", tint: "var(--accent-soft)" },
    { route: "accounts", icon: "accounts", title: "Счета", sub: "Банки и кошельки", tone: "var(--blue)", tint: "var(--blue-bg)" },
    { route: "planned", icon: "payments", title: "Платежи", sub: "Планируемые", tone: "var(--amber)", tint: "var(--amber-bg)" },
    { route: "taxes", icon: "taxes", title: "Налоги", sub: "УСН и декларации", tone: "var(--red)", tint: "var(--red-bg)" },
    { route: "investments", icon: "investments", title: "Инвестиции", sub: "Активы", tone: "var(--green)", tint: "var(--green-bg)" },
    { route: "goals", icon: "goals", title: "Цели", sub: "Накопления", tone: "var(--accent)", tint: "var(--accent-soft)" },
    { route: "dashboards", icon: "dashboards", title: "Дашборды", sub: "Аналитика", tone: "var(--blue)", tint: "var(--blue-bg)" }
  ];
  u.HUB = HUB; // sheet «Ещё» (Этап 7) строит сетку из этого же списка — единый источник IA

  function quickCardHTML(a) {
    return `
      <button class="quick-card" data-quick="${a.key}" aria-label="${a.full}">
        <span class="quick-icon" data-icon="${a.icon}"></span>
        <span>
          <span class="quick-title">${a.label}</span>
          <span class="quick-sub">${a.sub}</span>
        </span>
      </button>`;
  }

  /* ---- ЭТАП 16: onboarding при первом визите (localStorage mono-onboarded) ----
     Панель в потоке home, а НЕ модалка: не блокирует клики и не ломает
     первый запуск (и CI) оверлеем. Кнопка «Начать работу» ставит флаг
     и перерисовывает home без панели. */
  let lastCtx = null;
  if (!window.__monoOnboardBound) {
    window.__monoOnboardBound = true;
    document.addEventListener("click", (e) => {
      if (!e.target.closest("[data-onboard-done]")) return;
      try { localStorage.setItem("mono-onboarded", "1"); } catch (_) {}
      if (lastCtx && window.Views && window.Views.home) {
        window.Views.home(lastCtx); // перерисовка home без панели
        lastCtx.showToast("Добро пожаловать в Mono!", { kind: "success" });
      }
    });
  }

  function onboardHTML() {
    let seen = false;
    try { seen = !!localStorage.getItem("mono-onboarded"); } catch (_) {}
    if (seen) return "";
    return `
      <section class="panel onboard-panel" aria-label="Знакомство с приложением">
        <div class="onboard-head">
          <div>
            <h3>Mono — финансы и ученики репетитора в одном месте</h3>
            <p class="onboard-sub">Три вещи, которые собраны в одном приложении.</p>
          </div>
          <button class="primary-btn" data-onboard-done>Начать работу</button>
        </div>
        <ul class="onboard-list">
          <li><span class="onboard-ico" data-icon="teacher"></span><span class="onboard-txt"><b>Ученики</b>Занятия и статусы оплат</span></li>
          <li><span class="onboard-ico" data-icon="wallet"></span><span class="onboard-txt"><b>Бюджет</b>Счета и планируемые платежи</span></li>
          <li><span class="onboard-ico" data-icon="taxes"></span><span class="onboard-txt"><b>Налоги</b>УСН, инвестиции и цели</span></li>
        </ul>
      </section>`;
  }

  Views.home = function (ctx) {
    lastCtx = ctx;
    const DB = ctx.DB;
    const upcoming = DB.lessons.filter((l) => l.status === "upcoming").slice(0, 3);
    const debtors = DB.students.filter((s) => s.status === "unpaid");
    const recent = DB.transactions.slice(0, 4);

    const income = DB.transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expense = DB.transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
    const balance = income + expense;
    const accountsTotal = DB.accounts.reduce((s, a) => s + a.balance, 0);

    const spendByCat = {};
    DB.transactions.filter((t) => t.amount < 0).forEach((t) => {
      spendByCat[t.category] = (spendByCat[t.category] || 0) + Math.abs(t.amount);
    });
    const catData = Object.entries(spendByCat).map(([label, value]) => ({ label, value }));

    page(`
      ${onboardHTML()}

      <div class="quick-grid">
        ${ctx.quickActions.map(quickCardHTML).join("")}
      </div>

      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">Баланс счетов</span><span class="kpi-value">${money(accountsTotal)}</span><span class="kpi-sub">${DB.accounts.length} счёта</span></div>
        <div class="kpi"><span class="kpi-label">Доходы (мес.)</span><span class="kpi-value t-income">${money(income)}</span><span class="kpi-sub">${debtors.length ? "есть должники" : "все оплаты пришли"}</span></div>
        <div class="kpi"><span class="kpi-label">Расходы (мес.)</span><span class="kpi-value t-expense">${money(expense)}</span><span class="kpi-sub">${pctSpend(Math.abs(expense), income)}</span></div>
        <div class="kpi"><span class="kpi-label">Свободно</span><span class="kpi-value">${money(balance)}</span><span class="kpi-sub">за период</span></div>
      </div>

      <div class="hub-grid">
        ${HUB.map((h) => `
          <button class="hub-tile" data-route="${h.route}" style="--tone:${h.tone}; --tint:${h.tint}">
            <span class="ic-wrap" data-icon="${h.icon}"></span>
            <span class="title">${h.title}</span>
            <span class="sub">${h.sub}</span>
          </button>`).join("")}
      </div>

      <div class="dash-grid">
        <section class="panel">
          <div class="panel-head">
            <h2>Структура расходов</h2>
            <button class="link-btn" data-route="budget">Бюджет →</button>
          </div>
          <div class="donut-wrap">
            ${catData.length ? donutSVG(catData, { centerText: money(Math.abs(expense)).replace(/\u00a0/g, " "), caption: "расходы" }) + legendHTML(catData) : `<div class="muted">Нет расходов за период</div>`}
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <h2>Ближайшие занятия</h2>
            <button class="link-btn" data-route="teacher">Все →</button>
          </div>
          <div class="list">
            ${upcoming.length ? upcoming.map(lessonRow).join("") : `<div class="muted" style="padding:8px 2px;">Нет предстоящих занятий.</div>`}
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <h2>Требуют внимания</h2>
            <span class="note">${debtors.length ? "долг " + money(debtors.reduce((s, x) => s + x.debt, 0)) : "нет долгов"}</span>
          </div>
          <div class="list">
            ${debtors.length ? debtors.map(studentRow).join("") : `<div class="muted" style="padding:8px 2px;">Все оплачено 🎉</div>`}
          </div>
        </section>

        <section class="panel panel-wide">
          <div class="panel-head">
            <h2>Последние операции</h2>
            <button class="link-btn" data-route="operations">Все →</button>
          </div>
          <div class="list">${recent.map(transactionRow).join("")}</div>
        </section>
      </div>
    `);
  };

  function pctSpend(expense, income) {
    if (!income) return "—";
    return Math.round((expense / income) * 100) + "% от доходов";
  }
})();
