/* ============================================================
   MONO — VIEW: БЮДЖЕТ (по мотивам Домкнига B2 + D1/D2)
   Карточки: бюджеты по категориям (линейки план/факт),
   доходы-расходы по месяцам (bars), структура расходов (donut).
   ============================================================ */
window.Views = window.Views || {};

(function () {
  const { money, donutSVG, legendHTML } = u;

  function budgetRows(DB) {
    return DB.budgets.map((b, i) => {
      const ratio = b.plan ? Math.min(b.fact / b.plan, 1.35) : 0;
      const cls = b.fact > b.plan ? "over" : ratio > 0.8 ? "warn" : "ok";
      const rest = b.plan - b.fact;
      return `
        <div class="budget-row">
          <div class="head">
            <span class="name"><span class="cat-dot" style="--c:${u.chartColor(i)}"></span>${b.name}</span>
            <span class="sum ${rest < 0 ? "t-expense" : ""}">${money(b.fact)} / ${money(b.plan)}</span>
          </div>
          <div class="progress ${cls}"><span style="width:${Math.min(ratio * 100, 100)}%"></span></div>
          <div class="foot">
            <span>${rest >= 0 ? "осталось " + money(rest) : "перерасход " + money(-rest)}</span>
            <span>${u.pct(b.fact, b.plan)}</span>
          </div>
        </div>`;
    }).join("");
  }

  function monthBars(months) {
    const max = Math.max(...months.flatMap((m) => [m.income, m.expense]));
    return `
      <div class="bars">
        ${months.map((m) => `
          <div class="bar-col" title="${m.m}: ${money(m.income)} / ${money(-m.expense)}">
            <div class="bar-pair">
              <span class="bar income" style="height:${Math.round((m.income / max) * 100)}%"></span>
              <span class="bar expense" style="height:${Math.round((m.expense / max) * 100)}%"></span>
            </div>
            <span class="bar-label">${m.m}</span>
          </div>`).join("")}
      </div>
      <div class="legend" style="margin-top:10px">
        <div class="legend-item"><span class="cat-dot" style="--c:var(--green)"></span><span class="name">Доходы</span></div>
        <div class="legend-item"><span class="cat-dot" style="--c:var(--red)"></span><span class="name">Расходы</span></div>
      </div>`;
  }

  Views.budget = function (ctx) {
    const DB = ctx.DB;
    const state = ctx.state.budget;

    const income = DB.transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expense = DB.transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
    const balance = income + expense;

    let items = [...DB.transactions];
    if (state.filter === "income") items = items.filter((t) => t.amount > 0);
    if (state.filter === "expense") items = items.filter((t) => t.amount < 0);
    if (state.filter === "students") items = items.filter((t) => t.category === "Ученики");
    if (state.filter === "pending") items = items.filter((t) => t.status === "pending");
    if (state.sort === "amount") items.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    const visible = items.slice(0, state.limit);

    const spendByCat = {};
    DB.transactions.filter((t) => t.amount < 0).forEach((t) => {
      spendByCat[t.category] = (spendByCat[t.category] || 0) + Math.abs(t.amount);
    });
    const catData = Object.entries(spendByCat).map(([label, value]) => ({ label, value }));

    const chips = [
      { key: "month", label: "Период" },
      { key: "income", label: "Доходы" },
      { key: "expense", label: "Расходы" },
      { key: "students", label: "Ученики" },
      { key: "pending", label: "Ожидает" }
    ];

    const sortLabel = { date: "По дате", amount: "По сумме" }[state.sort] || "Сортировка";

    const listHTML = items.length
      ? `
        <h2 class="sticky-title">Операции</h2>
        <div class="list">${visible.map(u.partials.transactionRow).join("")}</div>
        ${items.length > visible.length
          ? `<div style="margin-top:10px;display:flex;justify-content:center;"><button class="primary-btn" data-action="load-more">Загрузить ещё</button></div>`
          : `<div class="end-note">Показаны все операции</div>`}`
      : ctx.emptyHTML("Нет операций", "Под текущий фильтр не нашлось транзакций.", "transaction", "Новая операция");

    page(`
      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">Доходы</span><span class="kpi-value t-income">${money(income)}</span></div>
        <div class="kpi"><span class="kpi-label">Расходы</span><span class="kpi-value t-expense">${money(expense)}</span></div>
        <div class="kpi"><span class="kpi-label">Итог</span><span class="kpi-value">${money(balance)}</span></div>
        <div class="kpi"><span class="kpi-label">Норма сбережений</span><span class="kpi-value">${income ? Math.round((balance / income) * 100) : 0}%</span><span class="kpi-sub">цель ≥ 20%</span></div>
      </div>

      <div class="dash-grid">
        <section class="panel">
          <div class="panel-head">
            <h2>Бюджеты по категориям</h2>
            <span class="note">ноябрь</span>
          </div>
          ${budgetRows(DB)}
        </section>

        <section class="panel">
          <div class="panel-head">
            <h2>Доходы и расходы по месяцам</h2>
            <button class="link-btn" data-route="dashboards">Дашборды →</button>
          </div>
          ${monthBars(DB.months)}
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Структура расходов</h2></div>
          <div class="donut-wrap">
            ${catData.length ? donutSVG(catData, { centerText: money(Math.abs(expense)), caption: "за период" }) + legendHTML(catData) : `<div class="muted">Нет данных</div>`}
          </div>
        </section>
      </div>

      <section class="panel import-panel">
        <div class="import-row">
          <span class="quick-icon" data-icon="upload"></span>
          <div class="import-copy">
            <h3>Импорт выписки</h3>
            <p>CSV / PDF / ручное подтверждение операций — в следующей версии.</p>
          </div>
          <button class="primary-btn" data-quick="statement">Загрузить</button>
        </div>
      </section>

      <div class="page-tools">
        <div class="chips" aria-label="Фильтры бюджета">
          ${chips.map((c) => `
            <button class="chip ${state.filter === c.key ? "is-active" : ""}" data-filter="${c.key}" data-scope="budget">${c.label}</button>`).join("")}
        </div>
        <button class="chip" data-sort="budget">${sortLabel}</button>
      </div>

      ${listHTML}
    `);
  };
})();
