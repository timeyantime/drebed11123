/* ============================================================
   MONO — VIEW: ФИНАНСОВЫЕ РАЗДЕЛЫ (Этап 2/3, MVP-каркасы)
   operations / accounts / planned / taxes / investments / goals / dashboards
   Полная стилизация по карточкам Домкнига — следующими итерациями.
   ============================================================ */
window.Views = window.Views || {};

(function () {
  const { money, donutSVG, legendHTML, esc } = u;
  const P = () => u.partials;

  /* иконка по категории (Домкнига-стиль: цветной кружок слева) */
  const CAT_ICON = { "Ученики": "teacher", "Работа": "briefcase", "Личное": "wallet", "Развитие": "book" };
  const CAT_HUE = { "Ученики": 158, "Работа": 24, "Личное": 268, "Развитие": 210 };
  function catIcon(t) {
    const icon = CAT_ICON[t.category] || "operations";
    const hue = CAT_HUE[t.category] != null ? CAT_HUE[t.category] : ((t.id || 1) * 67) % 360;
    return `<span class="cat-icon" style="--c:hsl(${hue} 62% 52%)"><span data-icon="${icon}"></span></span>`;
  }

  /* строка операции с кнопкой «Отметить оплаченным» для pending */
  function txRowPayable(t) {
    const cls = t.amount < 0 ? "expense" : "income";
    const pendingBadge = t.status === "pending"
      ? `<span class="badge badge--pending"><span class="dot"></span>Ожидает</span>
         <button class="mini-btn" data-action="tx-pay" data-id="${t.id}" aria-label="Отметить оплаченным: ${esc(t.title)}">✓</button>`
      : "";
    return `
      <div class="row row--tx">
        ${catIcon(t)}
        <div class="row-main">
          <div class="row-title">${esc(t.title)}</div>
          <div class="row-meta">${esc(t.category)} • ${esc(t.account || "Карта")}</div>
        </div>
        <div class="amount ${cls}">${money(t.amount)}</div>
        ${pendingBadge}
      </div>`;
  }

  /* группировка «dd MMMM» по строке даты "DD.MM" (год — текущий демо) */
  const MONTHS_RU = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  function dateGroup(dateStr) {
    const m = /^(\d{2})\.(\d{2})/.exec(dateStr || "");
    if (!m) return esc(dateStr || "Без даты");
    return `${Number(m[1])} ${MONTHS_RU[Number(m[2]) - 1] || ""}`.trim();
  }

  /* ---------- Операции ---------- */
  Views.operations = function (ctx) {
    const st = ctx.state.operations;
    let items = [...ctx.DB.transactions];
    if (st.filter === "income") items = items.filter((t) => t.amount > 0);
    if (st.filter === "expense") items = items.filter((t) => t.amount < 0);
    if (st.filter === "pending") items = items.filter((t) => t.status === "pending");
    if (st.query) {
      const q = st.query.toLowerCase();
      items = items.filter((t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    if (st.account && st.account !== "all") items = items.filter((t) => t.account === st.account);
    // сортировка: date — по дате (DD.MM парсим в число), amount — по модулю суммы; dir — направление
    const dnum = (d) => { const m = /^(\d{2})\.(\d{2})/.exec(d || ""); return m ? Number(m[2]) * 100 + Number(m[1]) : 0; };
    const dir = st.dir === "asc" ? 1 : -1;
    if (st.sort === "amount") items.sort((a, b) => (Math.abs(b.amount) - Math.abs(a.amount)) * dir);
    else items.sort((a, b) => (dnum(b.date) - dnum(a.date)) * dir);
    const visible = items.slice(0, st.limit);
    const accounts = [...new Set(ctx.DB.transactions.map((t) => t.account).filter(Boolean))];
    const sumIn = items.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const sumOut = items.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);

    // группировка видимых по дню ("31 октября")
    const groups = [];
    let curKey = null;
    for (const t of visible) {
      const key = dateGroup(t.date);
      if (key !== curKey) { groups.push({ key, rows: [] }); curKey = key; }
      groups[groups.length - 1].rows.push(t);
    }

    const sortLabel = st.sort === "date" ? "Дата" : "Сумма";
    page(`
      <div class="ops-summary">
        <div class="ops-sum"><span class="ops-sum-label">Доходы</span><span class="ops-sum-val t-income">+${money(sumIn).replace("−", "")}</span></div>
        <div class="ops-sum-sep"></div>
        <div class="ops-sum"><span class="ops-sum-label">Расходы</span><span class="ops-sum-val t-expense">${money(sumOut)}</span></div>
        <div class="ops-sum-sep"></div>
        <div class="ops-sum"><span class="ops-sum-label">Итог</span><span class="ops-sum-val ${sumIn + sumOut >= 0 ? "t-income" : "t-expense"}">${money(sumIn + sumOut)}</span></div>
      </div>
      <label class="search-box">
        <span class="search-icon" data-icon="search"></span>
        <input type="search" placeholder="Поиск по названию или категории…" value="${u.esc(st.query || "")}" data-search aria-label="Поиск операций" />
      </label>
      <div class="page-tools">
        <div class="chips">
          ${[["all", "Все"], ["income", "Доходы"], ["expense", "Расходы"], ["pending", "Ожидает"]].map(([k, l]) => `
            <button class="chip ${st.filter === k ? "is-active" : ""}" data-filter="${k}" data-scope="operations">${l}</button>`).join("")}
        </div>
        <button class="chip chip--sort" data-sort="operations" title="Дата ↓ → Дата ↑ → Сумма ↓ → Сумма ↑">
          ${sortLabel} <span data-icon="${st.dir === "asc" ? "arrow-up" : "arrow-down"}"></span>
        </button>
      </div>
      <div class="chips" aria-label="Фильтр по счетам">
        <button class="chip ${!st.account || st.account === "all" ? "is-active" : ""}" data-account-btn="all">Все счета</button>
        ${accounts.map((a) => `<button class="chip ${st.account === a ? "is-active" : ""}" data-account-btn="${u.esc(a)}">${u.esc(a)}</button>`).join("")}
      </div>
      ${items.length === 0 ? `
        <div class="empty-state">
          <span class="empty-icon" data-icon="search"></span>
          <h3>Ничего не найдено</h3>
          <p>Измените запрос или сбросьте фильтры.</p>
          <button class="secondary-btn" data-action="reset-ops-filters">Сбросить фильтры</button>
        </div>` : groups.map((g) => `
        <section class="ops-group" aria-label="${esc(g.key)}">
          <h3 class="group-head">${esc(g.key)}</h3>
          <div class="list">${g.rows.map(txRowPayable).join("")}</div>
        </section>`).join("")}
      ${items.length > visible.length ? `<div style="margin-top:10px;display:flex;justify-content:center;"><button class="primary-btn" data-action="load-more-ops">Загрузить ещё (${items.length - visible.length})</button></div>` : ""}
    `);
  };

  /* ---------- Счета ---------- */
  Views.accounts = function (ctx) {
    const total = ctx.DB.accounts.reduce((s, a) => s + a.balance, 0);
    page(`
      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">Всего на счетах</span><span class="kpi-value">${money(total)}</span></div>
        <div class="kpi"><span class="kpi-label">Счетов</span><span class="kpi-value">${ctx.DB.accounts.length}</span></div>
      </div>
      <div class="list">
        ${ctx.DB.accounts.map((a, i) => `
          <div class="row">
            <span class="avatar" style="--c:${u.chartColor(i)}"><span data-icon="${a.kind === "cash" ? "wallet" : "accounts"}"></span></span>
            <div class="row-main">
              <div class="row-title">${esc(a.name)}</div>
              <div class="row-meta">${a.kind === "card" ? "Дебетовая карта" : a.kind === "savings" ? "Накопительный счёт" : "Наличные"}</div>
            </div>
            <div class="amount">${money(a.balance)}</div>
          </div>`).join("")}
      </div>
      <section class="panel import-panel" style="margin-top:16px">
        <div class="import-row">
          <span class="quick-icon" data-icon="upload"></span>
          <div class="import-copy"><h3>Подключить банк</h3><p>Автоматическая загрузка выписок — следующий этап.</p></div>
          <button class="secondary-btn" data-quick="statement">Загрузить выписку</button>
        </div>
      </section>
    `);
  };

  /* ---------- Планируемые платежи ---------- */
  Views.planned = function (ctx) {
    const soon = ctx.DB.planned.filter((p) => p.status === "upcoming");
    const overdue = ctx.DB.planned.filter((p) => p.status === "overdue");
    const ordered = [...overdue, ...soon, ...ctx.DB.planned.filter((p) => p.status === "done")];
    const sumSoon = soon.reduce((s, p) => s + p.amount, 0);
    page(`
      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">К оплате в ближайшие 30 дней</span><span class="kpi-value t-pending">${money(sumSoon)}</span><span class="kpi-sub">${soon.length} платежа</span></div>
        <div class="kpi"><span class="kpi-label">Просрочено</span><span class="kpi-value ${overdue.length ? "t-expense" : ""}">${money(overdue.reduce((s, p) => s + p.amount, 0))}</span></div>
      </div>
      <div class="list">
        ${ordered.map((p) => `
          <div class="row">
            <div class="row-main">
              <div class="row-title">${esc(p.title)}</div>
              <div class="row-meta">${p.date}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="amount expense">${money(-p.amount)}</div>
              ${p.status === "done"
                ? `<span class="badge badge--paid">Выполнен</span>`
                : `<button class="mini-btn" data-action="planned-done" data-title="${esc(p.title)}" title="Отметить выполненным — спишется со счёта">✓</button>
                   <span class="badge ${p.status === "overdue" ? "badge--overdue" : "badge--pending"}"><span class="dot"></span>${p.status === "overdue" ? "Просрочен" : "Запланирован"}</span>`}
            </div>
          </div>`).join("")}
      </div>
    `);
  };

  /* ---------- Налоги ---------- */
  Views.taxes = function (ctx) {
    const t = ctx.DB.taxes;
    const rest = t.due - t.paid;
    page(`
      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">Режим</span><span class="kpi-value" style="font-size:16px">${esc(t.regime)}</span></div>
        <div class="kpi"><span class="kpi-label">Доход за квартал</span><span class="kpi-value">${money(t.incomeQuarter)}</span></div>
        <div class="kpi"><span class="kpi-label">Налог к уплате</span><span class="kpi-value ${rest ? "t-expense" : "t-income"}">${money(rest)}</span><span class="kpi-sub">следующий срок: ${t.nextDate}</span></div>
      </div>
      <section class="panel">
        <div class="panel-head"><h2>Декларации и платежи</h2></div>
        <div class="list">
          ${t.declarations.map((d) => `
            <div class="row">
              <div class="row-main">
                <div class="row-title">${esc(d.name)}</div>
                <div class="row-meta">срок ${d.due}</div>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <div class="amount">${money(d.sum)}</div>
                <span class="badge ${d.status === "paid" ? "badge--paid" : "badge--pending"}">${d.status === "paid" ? "Уплачено" : "Ожидает"}</span>
              </div>
            </div>`).join("")}
        </div>
      </section>
      <section class="panel" style="margin-top:16px">
        <div class="panel-head"><h2>Расчёт налога</h2><span class="note">автоматически по доходу «Ученики»</span></div>
        <div class="budget-row" style="border:0;padding-top:0">
          <div class="head"><span class="name">Уплачено за квартал</span><span class="sum">${money(t.paid)} / ${money(t.due)}</span></div>
          <div class="progress ${t.paid >= t.due ? "ok" : "warn"}"><span style="width:${Math.min(Math.round((t.paid / t.due) * 100), 100)}%"></span></div>
        </div>
      </section>
    `);
  };

  /* ---------- Инвестиции ---------- */
  Views.investments = function (ctx) {
    const total = ctx.DB.investments.reduce((s, a) => s + a.value, 0);
    page(`
      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">Стоимость портфеля</span><span class="kpi-value">${money(total)}</span></div>
        <div class="kpi"><span class="kpi-label">Дивидендная доходность</span><span class="kpi-value t-income">+7,4%</span><span class="kpi-sub">за год</span></div>
      </div>
      <section class="panel">
        <div class="panel-head"><h2>Структура активов</h2></div>
        <div class="donut-wrap">
          ${donutSVG(ctx.DB.investments, { centerText: money(total), caption: "портфель" }) + legendHTML(ctx.DB.investments)}
        </div>
      </section>
    `);
  };

  /* ---------- Цели ---------- */
  Views.goals = function (ctx) {
    page(`
      <div class="dash-grid">
        ${ctx.DB.goals.map((g, i) => {
          const ratio = Math.min(g.saved / g.target, 1);
          return `
            <section class="panel">
              <div class="panel-head">
                <h2>${esc(g.name)}</h2>
                <span class="note">до ${esc(g.deadline)}</span>
              </div>
              <div class="budget-row" style="border:0;padding:0;display:flex;gap:var(--sp-4);align-items:center">
                ${u.ringSVG(ratio, g.name)}
                <div style="flex:1;min-width:0">
                  <div class="head">
                    <span class="name"><span class="cat-dot" style="--c:${u.chartColor(i)}"></span>${money(g.saved)} из ${money(g.target)}</span>
                  </div>
                  <div class="foot">
                    <span>${g.saved >= g.target ? "Цель достигнута 🎉" : "не хватает " + money(g.target - g.saved)}</span>
                    ${g.saved < g.target ? `<button class="mini-btn" data-action="goal-add" data-goal="${esc(g.name)}" title="Пополнить цель">+ взнос</button>` : ""}
                  </div>
                </div>
              </div>
            </section>`;
        }).join("")}
      </div>
    `);
  };

  /* ---------- Дашборды (аналитика) ---------- */
  Views.dashboards = function (ctx) {
    const m = ctx.DB.months;
    const net = m.map((x) => x.income - x.expense);
    const best = m[net.indexOf(Math.max(...net))];
    const avg = Math.round(m.reduce((s, x) => s + (x.income - x.expense), 0) / m.length);
    page(`
      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">Лучший месяц</span><span class="kpi-value">${esc(best.m)}</span><span class="kpi-sub">+${money(best.income - best.expense)}</span></div>
        <div class="kpi"><span class="kpi-label">Средний итог</span><span class="kpi-value ${avg >= 0 ? "t-income" : "t-expense"}">${money(avg)}</span><span class="kpi-sub">за 6 месяцев</span></div>
      </div>
      <section class="panel">
        <div class="panel-head"><h2>Динамика (6 мес.)</h2><span class="note">июнь — ноябрь</span></div>
        ${(() => {
          const max = Math.max(...m.flatMap((x) => [x.income, x.expense]));
          return `<div class="bars">${m.map((x) => `
            <div class="bar-col">
              <div class="bar-pair">
                <span class="bar income" style="height:${Math.round((x.income / max) * 100)}%"></span>
                <span class="bar expense" style="height:${Math.round((x.expense / max) * 100)}%"></span>
              </div>
              <span class="bar-label">${x.m}</span>
            </div>`).join("")}</div>`;
        })()}
      </section>
      <section class="panel" style="margin-top:16px">
        <div class="panel-head"><h2>Топ категорий расходов</h2></div>
        ${(() => {
          const by = {};
          ctx.DB.budgets.forEach((b) => { by[b.name] = b.fact; });
          const data = Object.entries(by).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
          return `<div class="donut-wrap">${donutSVG(data, { centerText: money(data.reduce((s, d) => s + d.value, 0)), caption: "всего" }) + legendHTML(data)}</div>`;
        })()}
      </section>
    `);
  };
})();
