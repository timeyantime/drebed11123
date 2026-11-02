/* ============================================================
   MONO — VIEW: БЮДЖЕТ (по мотивам Домкнига B2 + D1/D2)
   Карточки: бюджеты по категориям (линейки план/факт),
   доходы-расходы по месяцам (bars), структура расходов (donut).
   ============================================================ */
window.Views = window.Views || {};

(function () {
  const { money, donutSVG, legendHTML, esc } = u;

  function budgetRows(DB) {
    return DB.budgets.map((b, i) => {
      const limit = b.limit || Math.round(b.plan * 1.25);
      const denom = Math.max(limit, b.fact, 1);
      const planW = Math.min((b.plan / denom) * 100, 100);
      const factW = Math.min((b.fact / denom) * 100, 100);
      const cls = b.fact > limit ? "over" : b.fact > b.plan ? "warn" : "ok";
      const rest = b.plan - b.fact;
      const status = b.fact > limit
        ? `<span class="budget-flag over">превышен лимит на ${money(b.fact - limit)}</span>`
        : b.fact > b.plan
          ? `<span class="budget-flag warn">план исчерпан, резерв ${money(limit - b.fact)}</span>`
          : `<span class="budget-flag ok">осталось ${money(rest)} из плана</span>`;
      return `
        <div class="budget-row" tabindex="0" role="button" aria-label="${esc(b.name)}: ${money(b.fact)} из ${money(b.plan)}">
          <div class="head">
            <span class="name"><span class="cat-dot" style="--c:${u.chartColor(i)}"></span>${b.name}</span>
            <span class="sum ${rest < 0 ? "t-expense" : ""}">${money(b.fact)} <span class="of">/ ${money(b.plan)}</span></span>
          </div>
          <div class="dual-bar ${cls}">
            <span class="db-fill" style="width:${factW}%"></span>
            <span class="db-plan-mark" style="left:${planW}%" title="План: ${money(b.plan)}"></span>
          </div>
          <div class="foot">
            ${status}
            <span class="muted-num">${u.pct(b.fact, b.plan)}</span>
          </div>
        </div>`;
    }).join("");
  }

  function budgetSummary(DB) {
    const plan = DB.budgets.reduce((s, b) => s + b.plan, 0);
    const fact = DB.budgets.reduce((s, b) => s + b.fact, 0);
    const left = plan - fact;
    const pctv = plan ? Math.round((fact / plan) * 100) : 0;
    const dayOfMonth = 2; // ноябрь, демо-режим: 2-е число
    const expected = Math.round((plan / 30) * dayOfMonth);
    const pace = fact <= expected * 3 ? "ahead" : fact > plan ? "over" : "behind";
    const paceText = pace === "ahead" ? "Темп в норме — расходуете медленнее календаря бюджета."
      : pace === "over" ? "Перерасход месячного плана. Проверьте категории с флагом."
      : "Расход быстрее плана месяца — следите за категориями «в резерве».";
    return `
      <div class="budget-summary panel">
        <div class="bs-ring">${u.ringSVG(pctv / 100, pctv + "%", 78)}</div>
        <div class="bs-copy">
          <h3>Бюджет ноября</h3>
          <p>${money(fact)} из ${money(plan)} · ${left >= 0 ? "свободно " + money(left) : "перерасход " + money(-left)}</p>
          <span class="bs-pace ${pace}">${paceText}</span>
        </div>
        <div class="bs-stats">
          <div class="bs-stat"><span class="bs-stat-label">План</span><span class="bs-stat-value">${money(plan)}</span></div>
          <div class="bs-stat"><span class="bs-stat-label">Факт</span><span class="bs-stat-value">${money(fact)}</span></div>
          <div class="bs-stat"><span class="bs-stat-label">${left >= 0 ? "Свободно" : "Перерасход"}</span><span class="bs-stat-value ${left >= 0 ? "t-income" : "t-expense"}">${money(Math.abs(left))}</span></div>
        </div>
      </div>`;
  }

  function monthBars(months) {
    const max = Math.max(...months.flatMap((m) => [m.income, m.expense]));
    return `
      <div class="bars">
        ${months.map((m) => {
          const tip = `${m.m} · Доходы ${money(m.income)} · Расходы ${money(m.expense)}`;
          return `
          <div class="bar-col" tabindex="0" role="img" aria-label="${tip}" data-tip="${tip}">
            <div class="bar-pair">
              <span class="bar income" style="height:${Math.round((m.income / max) * 100)}%"></span>
              <span class="bar expense" style="height:${Math.round((m.expense / max) * 100)}%"></span>
            </div>
            <span class="bar-label">${m.m}</span>
          </div>`;
        }).join("")}
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
    const savings = income ? Math.round((balance / income) * 100) : 0;

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
        <div class="kpi"><span class="kpi-label">Итог</span><span class="kpi-value ${balance < 0 ? "t-expense" : ""}">${money(balance)}</span></div>
        <div class="kpi"><span class="kpi-label">Норма сбережений</span><span class="kpi-value ${savings < 0 ? "t-expense" : ""}">${savings}%</span><span class="kpi-sub">цель ≥ 20%</span></div>
      </div>

      ${budgetSummary(DB)}

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
