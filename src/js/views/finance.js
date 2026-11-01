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
  /* ---------- Счета (с детальной страницей #/accounts/account/:id) ---------- */
  function sparkline(values, color) {
    if (!values || values.length < 2) return "";
    const w = 72, h = 26, min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`).join(" ");
    return `<svg class="acct-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
      <polyline points="${pts}" fill="none" stroke="${color || "var(--blue)"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
    </svg>`;
  }

  Views.accounts = function (ctx) {
    const det = ctx.state.detail && ctx.state.detail.kind === "account";
    if (det) {
      const acc = ctx.DB.accounts.find((a) => a.id === Number(ctx.state.detail.id));
      if (!acc) { page(`<div class="panel"><h2>Счёт не найден</h2><p class="muted">Вернитесь к списку счетов.</p><button class="secondary-btn" data-go-route="accounts" style="margin-top:10px">← Все счета</button></div>`); return; }
      const txs = ctx.DB.transactions.filter((t) => t.account === acc.name);
      const income = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
      const hist = acc.history || [];
      const maxH = Math.max(...hist, 1);
      page(`
        <button class="link-btn back-link" data-go-route="accounts">← Все счета</button>
        <section class="detail-hero acct-hero" style="--hero-c:${acc.color || "var(--blue)"}">
          <span class="quick-icon hero-icon" data-icon="${acc.kind === "cash" ? "wallet" : "accounts"}"></span>
          <div class="hero-copy">
            <h2>${esc(acc.name)}</h2>
            <p class="hero-sub">${acc.kind === "card" ? "Дебетовая карта" : acc.kind === "savings" ? "Накопительный счёт" : "Наличные"}</p>
            <div class="hero-balance">${money(acc.balance)}</div>
          </div>
        </section>
        <div class="kpi-grid">
          <div class="kpi"><span class="kpi-label">Поступления</span><span class="kpi-value t-income">${money(income)}</span></div>
          <div class="kpi"><span class="kpi-label">Расходы</span><span class="kpi-value t-expense">${money(expense)}</span></div>
          <div class="kpi"><span class="kpi-label">Операций</span><span class="kpi-value">${txs.length}</span></div>
        </div>
        <section class="panel">
          <div class="panel-head"><h2>Баланс за 6 месяцев</h2><span class="note">июнь — ноябрь</span></div>
          ${hist.length >= 2 ? `
          <div class="area-chart" role="img" aria-label="График баланса">
            <svg viewBox="0 0 300 90" preserveAspectRatio="none">
              ${(() => {
                const min = Math.min(...hist), max = Math.max(...hist), span = max - min || 1;
                const pts = hist.map((v, i) => [ (i / (hist.length - 1)) * 300, 86 - ((v - min) / span) * 76 ]);
                const line = pts.map((p) => p.join(",")).join(" ");
                return `<polygon points="0,90 ${line} 300,90" class="area-fill"></polygon>
                        <polyline points="${line}" class="area-line" fill="none"></polyline>`;
              })()}
            </svg>
            <div class="area-labels"><span>мин. ${money(Math.min(...hist))}</span><span>макс. ${money(maxH)}</span></div>
          </div>` : `<div class="muted">Недостаточно данных для графика.</div>`}
        </section>
        <section class="panel" style="margin-top:16px">
          <div class="panel-head"><h2>Операции по счёту</h2><button class="link-btn" data-go-route="operations" data-go-params="account:${encodeURIComponent(acc.name)}">Все операции →</button></div>
          ${txs.length ? `<div class="list">${txs.map(u.partials.transactionRow).join("")}</div>` : `<div class="muted" style="padding:12px">Пока нет операций на этом счёте.</div>`}
        </section>
      `);
      return;
    }

    const total = ctx.DB.accounts.reduce((s, a) => s + a.balance, 0);
    page(`
      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">Всего на счетах</span><span class="kpi-value">${money(total)}</span></div>
        <div class="kpi"><span class="kpi-label">Счетов</span><span class="kpi-value">${ctx.DB.accounts.length}</span></div>
      </div>
      <div class="list">
        ${ctx.DB.accounts.map((a, i) => `
          <div class="row row-link" tabindex="0" role="button" data-go-route="accounts" data-go-params="account:${a.id}" aria-label="${esc(a.name)}, открыть детали">
            <span class="avatar" style="--c:${a.color || u.chartColor(i)}"><span data-icon="${a.kind === "cash" ? "wallet" : "accounts"}"></span></span>
            <div class="row-main">
              <div class="row-title">${esc(a.name)}</div>
              <div class="row-meta">${a.kind === "card" ? "Дебетовая карта" : a.kind === "savings" ? "Накопительный счёт" : "Наличные"}</div>
            </div>
            ${sparkline(a.history, a.color)}
            <div class="amount">${money(a.balance)}</div>
            <span class="chev" data-icon="chevron"></span>
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

  /* ---------- Планируемые платежи (v2: группы по срокам) ---------- */
  Views.planned = function (ctx) {
    const MONTHS = { "Янв":0,"Фев":1,"Мар":2,"Апр":3,"Май":4,"Июн":5,"Июл":6,"Авг":7,"Сен":8,"Окт":9,"Ноя":10,"Дек":11 };
    // демо-«сегодня»: начало ноября 2026 (данные мока привязаны к этому месяцу)
    const today = new Date(2026, 10, 2);
    function toDate(dstr) {
      const m = dstr.match(/^(\d{1,2})\.(\d{2})$/);
      if (!m) return null;
      let month = Number(m[2]) - 1;
      // если дата «из прошлого» относительно ноября — считаем следующий год (январь...)
      let year = 2026;
      if (month > today.getMonth()) year = 2026; // noop, но оставляем явно
      return new Date(year, month, Number(m[1]));
    }
    function daysLeft(dstr) { const t = toDate(dstr); return t ? Math.round((t - today) / 86400000) : null; }
    function dueLabel(dstr) {
      const n = daysLeft(dstr);
      if (n === null) return esc(dstr);
      if (n < 0) return `<span class="due-chip overdue">просрочено на ${Math.abs(n)} дн.</span>`;
      if (n === 0) return `<span class="due-chip today">сегодня</span>`;
      if (n === 1) return `<span class="due-chip soon">завтра</span>`;
      if (n <= 7) return `<span class="due-chip soon">через ${n} дн.</span>`;
      return `<span class="due-chip">${esc(dstr)}</span>`;
    }
    const rows = ctx.DB.planned.map((p) => ({ ...p, _left: daysLeft(p.date) }));
    const overdue = rows.filter((p) => p.status !== "done" && p._left < 0);
    const week = rows.filter((p) => p.status !== "done" && p._left >= 0 && p._left <= 7);
    const later = rows.filter((p) => p.status !== "done" && p._left > 7);
    const done = rows.filter((p) => p.status === "done");
    const sumDue = [...overdue, ...week].reduce((s, p) => s + p.amount, 0);
    const sumLater = later.reduce((s, p) => s + p.amount, 0);

    function payRow(p) {
      return `
        <div class="row pl-row${p.status === "overdue" || (p._left < 0 && p.status !== "done") ? " pl-overdue" : ""}">
          <div class="row-main">
            <div class="row-title">${esc(p.title)}</div>
            <div class="row-meta">${dueLabel(p.date)}${p.account ? ` · ${esc(p.account)}` : ""}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="amount expense">${money(-p.amount)}</div>
            ${p.status === "done"
              ? `<span class="badge badge--paid">Выполнен</span>`
              : `<button class="mini-btn" data-action="planned-done" data-title="${esc(p.title)}" title="Отметить выполненным — спишется со счёта">✓</button>`}
          </div>
        </div>`;
    }
    function group(title, list, tone) {
      if (!list.length) return "";
      return `
      <section class="panel pl-group">
        <div class="panel-head"><h2>${title}</h2><span class="note ${tone || ""}">${money(list.reduce((s, p) => s + p.amount, 0))}</span></div>
        <div class="list">${list.map(payRow).join("")}</div>
      </section>`;
    }
    page(`
      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">К оплате сейчас</span><span class="kpi-value t-expense">${money(sumDue)}</span><span class="kpi-sub">${overdue.length + week.length} платежа(ев) — просрочено и на неделе</span></div>
        <div class="kpi"><span class="kpi-label">Потом (после 7 дней)</span><span class="kpi-value">${money(sumLater)}</span><span class="kpi-sub">${later.length} платежа</span></div>
      </div>
      ${group("⚠ Просрочено", overdue, "t-expense")}
      ${group("На этой неделе", week, "t-pending")}
      ${group("Позже", later)}
      ${group("Выполнено", done)}
      ${!done.length && !overdue.length && !week.length && !later.length ? emptyHTML("Пусто", "Нет запланированных платежей — добавьте платёж через «+».", "transaction", "Добавить операцию") : ""}
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
    const all = ctx.DB.months;
    const period = ctx.state.dashboards.period || "6";
    const m = period === "3" ? all.slice(-3) : all;
    const net = m.map((x) => x.income - x.expense);
    const bestIdx = net.indexOf(Math.max(...net));
    const best = m[bestIdx];
    const avg = Math.round(net.reduce((a, b) => a + b, 0) / m.length);
    const totalIncome = m.reduce((a, x) => a + x.income, 0);
    const totalExpense = m.reduce((a, x) => a + x.expense, 0);
    const margin = totalIncome ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
    // дельта последнего месяца к предыдущему (по итогу)
    const dlt = net.length > 1 ? net[net.length - 1] - net[net.length - 2] : 0;
    const dltPct = net.length > 1 && net[net.length - 2] !== 0 ? Math.round((dlt / Math.abs(net[net.length - 2])) * 100) : null;

    // D1: bar-chart с линией нетто-итога поверх
    const maxV = Math.max(...m.flatMap((x) => [x.income, x.expense]));
    const barsHTML = (() => {
      const W = 320, H = 150, pad = 8;
      const step = W / m.length;
      const pts = net.map((v, i) => `${(i * step + step / 2).toFixed(1)},${(H - pad - (Math.max(0, v) / maxV) * (H - pad * 2)).toFixed(1)}`).join(" ");
      return `
      <div class="db-chart">
        <svg viewBox="0 0 ${W} ${H}" class="db-net-line" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          ${net.map((v, i) => `<circle cx="${(i * step + step / 2).toFixed(1)}" cy="${(H - pad - (Math.max(0, v) / maxV) * (H - pad * 2)).toFixed(1)}" r="3" fill="var(--accent)"/>`).join("")}
        </svg>
        <div class="bars">${m.map((x, i) => `
          <div class="bar-col" style="animation-delay:${i * 45}ms">
            <div class="bar-pair">
              <span class="bar income" style="height:${Math.round((x.income / maxV) * 100)}%"></span>
              <span class="bar expense" style="height:${Math.round((x.expense / maxV) * 100)}%"></span>
            </div>
            <span class="bar-label">${x.m}</span>
          </div>`).join("")}</div>
      </div>`;
    })();

    page(`
      <div class="segmented period" role="tablist" aria-label="Период аналитики">
        <button class="seg-btn ${period === "3" ? "is-active" : ""}" data-dash-period="3" role="tab" aria-selected="${period === "3"}">3 мес.</button>
        <button class="seg-btn ${period === "6" ? "is-active" : ""}" data-dash-period="6" role="tab" aria-selected="${period === "6"}">6 мес.</button>
      </div>
      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">Итог за период</span><span class="kpi-value ${totalIncome - totalExpense >= 0 ? "t-income" : "t-expense"}">${money(totalIncome - totalExpense)}</span>
          <span class="kpi-sub">${dltPct !== null ? `<span class="delta ${dlt >= 0 ? "up" : "down"}">${dlt >= 0 ? "▲" : "▼"} ${Math.abs(dltPct)}%</span> к прошлому месяцу` : ""}</span></div>
        <div class="kpi"><span class="kpi-label">Норма сбережений</span><span class="kpi-value">${margin}%</span><span class="kpi-sub">доля дохода, ушедшая в накопления</span></div>
        <div class="kpi"><span class="kpi-label">Лучший месяц</span><span class="kpi-value">${esc(best.m)}</span><span class="kpi-sub t-income">+${money(best.income - best.expense)}</span></div>
        <div class="kpi"><span class="kpi-label">Средний итог</span><span class="kpi-value ${avg >= 0 ? "t-income" : "t-expense"}">${money(avg)}</span><span class="kpi-sub">за ${m.length} мес.</span></div>
      </div>
      <section class="panel">
        <div class="panel-head"><h2>Доходы и расходы</h2><span class="note"><i class="lg-dot income"></i>доход&nbsp;&nbsp;<i class="lg-dot expense"></i>расход&nbsp;&nbsp;<i class="lg-dot net"></i>итог</span></div>
        ${barsHTML}
      </section>
      <section class="panel" style="margin-top:16px">
        <div class="panel-head"><h2>Структура расходов</h2><span class="note">${money(totalExpense)}</span></div>
        ${(() => {
          const by = {};
          ctx.DB.budgets.forEach((b) => { by[b.name] = b.fact; });
          const data = Object.entries(by).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
          return `<div class="donut-wrap">${donutSVG(data, { centerText: money(data.reduce((s, d) => s + d.value, 0)), caption: "всего" }) + legendHTML(data)}</div>`;
        })()}
      </section>
      <section class="panel" style="margin-top:16px">
        <div class="panel-head"><h2>Доходы vs расходы по месяцам</h2></div>
        <div class="list">
          ${m.map((x) => {
            const n = x.income - x.expense;
            const wIn = Math.round((x.income / maxV) * 100), wEx = Math.round((x.expense / maxV) * 100);
            return `
            <div class="row db-row">
              <div class="row-main">
                <div class="row-title">${x.m}</div>
                <div class="db-twin"><span class="db-twin-bar income" style="width:${wIn}%"></span><span class="db-twin-bar expense" style="width:${wEx}%"></span></div>
              </div>
              <div class="amount ${n >= 0 ? "income" : "expense"}">${n >= 0 ? "+" : ""}${money(n)}</div>
            </div>`;
          }).join("")}
        </div>
      </section>
    `);
  }

})();