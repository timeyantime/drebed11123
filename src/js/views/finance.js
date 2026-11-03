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

  /* строка операции с кнопкой «Отметить оплаченным» для pending.
     Этап 25: на десктопе строка раскладывается в таблицу (grid),
     на мобиле остаётся карточкой — колонки скрыты. */
  function txRowPayable(t) {
    /* Этап 29: переводы — отдельный нейтральный стиль и подпись «Перевод» */
    const isTr = t.type === "transfer";
    const cls = isTr ? "transfer" : (t.amount < 0 ? "expense" : "income");
    const hue = CAT_HUE[t.category] != null ? CAT_HUE[t.category] : ((t.id || 1) * 67) % 360;
    const pending = t.status === "pending";
    const accLabel = isTr && t.toAccount
      ? `${esc(t.account || "Карта Т-Банк")} → ${esc(t.toAccount)}`
      : esc(t.account || "Карта Т-Банк");
    return `
      <div class="row row--tx">
        ${catIcon(t)}
        <div class="row-main">
          <div class="row-title">${esc(t.title)}${Array.isArray(t.tags) && t.tags.length
            ? `<span class="tx-tags">${t.tags.slice(0, 3).map((x) => `<span>${esc(x)}</span>`).join("")}</span>`
            : ""}</div>
          <div class="row-meta">${[esc(t.date), esc(t.time || ""), esc(t.category), accLabel].filter(Boolean).join(" • ")}</div>
        </div>
        <span class="tx-cat"><span class="cat-dot" style="--c:hsl(${hue} 62% 52%)"></span>${esc(t.category)}</span>
        <span class="tx-acc">${accLabel}</span>
        <span class="tx-type ${isTr ? "t-info" : (t.amount < 0 ? "t-expense" : "t-income")}">${isTr ? "Перевод" : (t.amount < 0 ? "Расход" : "Доход")}</span>
        <div class="amount ${cls}">${isTr ? "↔" : (t.amount > 0 ? "+" : "")}${money(isTr ? Math.abs(t.amount) : t.amount)}</div>
        <span class="tx-status">${pending
          ? `<span class="badge badge--pending">Ожидает</span>`
          : `<span class="badge badge--paid">Оплачено</span>`}</span>
        <span class="tx-act">${pending
          ? `<button class="mini-btn" data-action="tx-pay" data-id="${t.id}" aria-label="Отметить оплаченным: ${esc(t.title)}">✓</button>`
          : ""}</span>
      </div>`;
  }

  /* группировка «dd MMMM» по строке даты "DD.MM" (год восстанавливает u.parseDM) */
  const MONTHS_RU = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  function dateGroup(dateStr) {
    const p = u.parseDM(dateStr);
    if (!p) return esc(dateStr || "Без даты");
    return `${p.d} ${MONTHS_RU[p.m - 1] || ""}`.trim();
  }

  /* ---------- Операции ---------- */
  Views.operations = function (ctx) {
    const st = ctx.state.operations;
    let items = [...ctx.DB.transactions];
    /* Этап 29: переводы — отдельный фильтр; «Доходы/Расходы» их не считают
       (иначе перевод выглядел бы как доход, а деньги лишь переехали). */
    if (st.filter === "income") items = items.filter((t) => t.type !== "transfer" && t.amount > 0);
    if (st.filter === "expense") items = items.filter((t) => t.type !== "transfer" && t.amount < 0);
    if (st.filter === "transfer") items = items.filter((t) => t.type === "transfer");
    if (st.filter === "pending") items = items.filter((t) => t.status === "pending");
    if (st.query) {
      const q = st.query.toLowerCase();
      items = items.filter((t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    /* Этап 29: по счёту показываем и переводы, где счёт — приёмник */
    if (st.account && st.account !== "all") items = items.filter((t) => t.account === st.account || t.toAccount === st.account);
    if (st.category && st.category !== "all") items = items.filter((t) => t.category === st.category);
    // сортировка: date — по дате, amount — по модулю суммы; dir — направление.
    /* Этап 28: год в дате не хранится — восстанавливаем единым хелпером
       u.parseDM (core.js): даты позже сегодняшнего дня считаются прошлым
       годом (демо-набор), «сегодня» и будущие даты текущего месяца —
       самыми свежими. Раньше кольцевая шкала ломала порядок на стыке
       месяцев, а maxMd-эвристика уводила новую ноябрьскую операцию в
       прошлый год (03.11 < 31.10). */
    const _now = new Date();
    _now.setHours(0, 0, 0, 0);
    const toDia = (d) => {
      if (!/^\d{2}\.\d{2}/.test(d || "")) return Infinity; // «сегодня» и т.п. — всегда самые свежие
      const p = u.parseDM(d, _now);
      return p ? new Date(p.y, p.m - 1, p.d).getTime() : Infinity;
    };
    const dnum = toDia;
    /* Этап 28: период по референсу (1М/3М/6М/Всё): последние N календарных
       месяцев вместе с текущим (для 1М — с первого числа этого месяца). */
    const periodMonths = st.period === "1m" ? 1 : st.period === "3m" ? 3 : st.period === "6m" ? 6 : 0;
    if (periodMonths) {
      const from = new Date(_now.getFullYear(), _now.getMonth() - (periodMonths - 1), 1);
      items = items.filter((t) => {
        const ms = toDia(t.date);
        return ms === Infinity || ms >= from.getTime();
      });
    }
    const dir = st.dir === "asc" ? 1 : -1;
    if (st.sort === "amount") items.sort((a, b) => (Math.abs(b.amount) - Math.abs(a.amount)) * dir);
    else items.sort((a, b) => (dnum(b.date) - dnum(a.date)) * dir);
    const visible = items.slice(0, st.limit);
    const accounts = [...new Set(ctx.DB.transactions.map((t) => t.account).filter(Boolean))];
    /* Этап 29: агрегаты не включают переводы (нейтральная операция) */
    const sumIn = items.filter((t) => t.type !== "transfer" && t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const sumOut = items.filter((t) => t.type !== "transfer" && t.amount < 0).reduce((s, t) => s + t.amount, 0);

    // группировка видимых по дню ("31 октября")
    const groups = [];
    let curKey = null;
    for (const t of visible) {
      const key = dateGroup(t.date, _now);
      if (key !== curKey) { groups.push({ key, rows: [] }); curKey = key; }
      groups[groups.length - 1].rows.push(t);
    }

    /* Этап 27: десктоп — настоящая таблица по референсу /operations;
       мобиле — прежние карточки с группами по дням. */
    const isDesktop = (() => {
      const pv = document.documentElement.dataset.preview;
      if (pv) return pv === "desktop";
      return window.innerWidth >= 1024;
    })();
    const tagChips = (t) => (Array.isArray(t.tags) && t.tags.length
      ? `<span class="tx-tags">${t.tags.slice(0, 2).map((x) => `<span>${esc(x)}</span>`).join("")}</span>`
      : "");
    /* Этап 32: сортировка кликом по заголовку колонки (референс
       «операции.html»): активная колонка подсвечена, стрелка показывает
       направление; клик по другой колонке — сброс на убывание. */
    const thSort = (col, label, extraCls = "") => {
      const active = st.sort === col;
      const arrow = active ? (st.dir === "asc" ? " ↑" : " ↓") : "";
      return `<th class="${extraCls}${active ? " is-sorted" : ""}">` +
        `<button type="button" class="th-sort" data-col="${col}" aria-label="Сортировать по: ${label}">${label}${arrow}</button></th>`;
    };
    /* Этап 32: выделенная строка (клик по строке) — панель деталей под таблицей */
    const selId = st.selected != null ? st.selected : null;
    const selTx = selId != null ? items.find((t) => t.id === selId) : null;
    const detailHTML = !selTx ? "" : (() => {
      const cat = u.catMeta(selTx.category);
      const isTr = selTx.type === "transfer";
      const sumCls = isTr ? "t-info" : (selTx.amount < 0 ? "t-expense" : "t-income");
      const rows = [
        ["Дата", `${esc(selTx.date)}${selTx.time ? " · " + esc(selTx.time) : ""}`],
        ["Категория", esc(selTx.category)],
        ["Счёт", isTr ? `${esc(selTx.account || "—")} → ${esc(selTx.toAccount || "—")}` : esc(selTx.account || "Карта Т-Банк")],
        ["Тип", isTr ? "Перевод между счетами" : (selTx.amount < 0 ? "Расход" : "Доход")],
        ["Статус", selTx.status === "pending" ? "Ожидает оплаты" : "Оплачено"],
      ];
      if (Array.isArray(selTx.tags) && selTx.tags.length) rows.push(["Теги", selTx.tags.map(esc).join(", ")]);
      if (selTx.note) rows.push(["Заметка", esc(selTx.note)]);
      return `
        <aside class="tx-detail" aria-label="Детали операции">
          <div class="tx-detail-head">
            <span class="cat-pill" style="--c:${cat.color}"><span class="cat-ico" data-icon="${cat.icon}"></span>${esc(selTx.category)}</span>
            <button class="mini-btn mini-btn--ghost" data-action="ops-deselect" aria-label="Закрыть детали операции"><span data-icon="close"></span></button>
          </div>
          <h3 class="tx-detail-title">${esc(selTx.title)}</h3>
          <div class="tx-detail-sum ${sumCls}">${isTr ? "↔ " + money(Math.abs(selTx.amount)) : (selTx.amount > 0 ? "+" : "") + money(selTx.amount)}</div>
          <dl class="tx-detail-list">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
          <div class="tx-detail-actions">
            ${selTx.status === "pending" ? `<button class="secondary-btn" data-action="tx-pay" data-id="${selTx.id}">Отметить оплаченным</button>` : ""}
            <button class="secondary-btn" data-action="tx-edit" data-id="${selTx.id}"><span data-icon="pencil"></span> Редактировать</button>
            <button class="secondary-btn secondary-btn--danger" data-action="tx-del" data-id="${selTx.id}"><span data-icon="trash"></span> Удалить</button>
          </div>
        </aside>`;
    })();
    const tableHTML = `
      <div class="ops-desktop-grid">
        <div class="ops-table-wrap">
          <table class="ops-table" aria-label="Таблица операций">
            <thead><tr>
              ${thSort("date", "Дата", "c-date")}
              <th class="c-time">Время</th>
              <th class="c-op">Операция</th>
              <th class="c-cat">Категория</th>
              <th class="c-acc">Счёт</th>
              <th class="c-type">Тип</th>
              <th class="c-tags">Теги</th>
              ${thSort("amount", "Сумма", "c-sum")}
              <th class="c-act" aria-label="Действия"></th>
            </tr></thead>
            <tbody class="ops-group">
              ${visible.map((t) => {
                const cat = u.catMeta(t.category);
                const acc = ctx.DB.accounts.find((a) => a.name === (t.account || "Карта Т-Банк"));
                /* Этап 29: перевод — нейтральный стиль в таблице тоже */
                const isTrT = t.type === "transfer";
                const cls = isTrT ? "t-info" : (t.amount < 0 ? "t-expense" : "t-income");
                const pending = t.status === "pending";
                return `<tr class="row row--tx${t.id === selId ? " is-selected" : ""}" tabindex="0" role="button" data-action="tx-select" data-id="${t.id}" aria-label="Детали операции: ${esc(t.title)}">
                  <td class="c-date">${esc(t.date)}</td>
                  <td class="c-time">${esc(t.time || "")}</td>
                  <td class="c-op"><span class="cat-ico cat-ico--inline" style="--c:${cat.color}" data-icon="${cat.icon}"></span><span class="tx-title">${esc(t.title)}</span>${pending ? '<span class="badge badge--pending">Ожидает</span>' : ""}</td>
                  <td class="c-cat"><span class="cat-pill" style="--c:${cat.color}"><span class="cat-ico" data-icon="${cat.icon}"></span>${esc(t.category)}</span></td>
                  <td class="c-acc"><span class="acc-dot" style="--c:${(acc && acc.color) || "var(--muted)"}"></span>${esc(t.account || "Карта Т-Банк")}</td>
                  <td class="c-type ${cls}">${isTrT ? "Перевод" : (t.amount < 0 ? "Расход" : "Доход")}</td>
                  <td class="c-tags">${tagChips(t)}</td>
                  <td class="c-sum ${cls}">${isTrT ? "↔ " + money(Math.abs(t.amount)) : (t.amount > 0 ? "+" : "") + money(t.amount)}</td>
                  <td class="c-act">${pending
                    ? `<button class="mini-btn" data-action="tx-pay" data-id="${t.id}" aria-label="Отметить оплаченным: ${esc(t.title)}">✓</button>`
                    : ""}<button class="mini-btn mini-btn--ghost" data-action="tx-edit" data-id="${t.id}" aria-label="Редактировать операцию: ${esc(t.title)}"><span data-icon="pencil"></span></button><button class="mini-btn mini-btn--ghost" data-action="tx-del" data-id="${t.id}" aria-label="Удалить операцию: ${esc(t.title)}"><span data-icon="trash"></span></button></td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
        ${detailHTML}
      </div>
      <div class="ops-foot">
        <span>1–${visible.length} из ${items.length}</span>
        <span>стр. 1/${Math.max(1, Math.ceil(items.length / st.limit))}</span>
      </div>`;
    const cardsHTML = groups.map((g) => {
      // итог дня в заголовке группы (референс «Счета и транзакции»);
      /* Этап 29: переводы нейтральны — не двигают итог дня */
      const daySum = g.rows.reduce((s, t) => s + (t.type === "transfer" ? 0 : t.amount), 0);
      return `
        <section class="ops-group" aria-label="${esc(g.key)}">
          <h3 class="group-head"><span>${esc(g.key)}</span><span class="group-sum ${daySum < 0 ? "t-expense" : "t-income"}">${daySum < 0 ? "−" : "+"}${money(Math.abs(daySum))}</span></h3>
          <div class="list">${g.rows.map(txRowPayable).join("")}</div>
        </section>`;
    }).join("");

    const sortLabel = st.sort === "date" ? "Дата" : "Сумма";
    /* Этап 28: тулбар по референсу «Домкнига / Операции»:
       строка 1 — поиск + кнопки действий справа; строка 2 — сегменты и селекты. */
    const categories = [...new Set(ctx.DB.transactions.map((t) => t.category).filter(Boolean))];
    const periodDefs = [["1m", "1М"], ["3m", "3М"], ["6m", "6М"], ["all", "Всё"]];
    const toolbarHTML = `
      <div class="ops-toolbar">
        <div class="ops-toolbar-top">
          <label class="search-box">
            <span class="ic-wrap" data-icon="search"></span>
            <input type="search" placeholder="Поиск по названию или категории…" value="${u.esc(st.query || "")}" data-search aria-label="Поиск операций" />
          </label>
          <div class="ops-toolbar-actions">
            <button class="chip chip--sort" data-sort="operations" title="Дата ↓ → Дата ↑ → Сумма ↓ → Сумма ↑">
              ${sortLabel} <span data-icon="${st.dir === "asc" ? "arrow-up" : "arrow-down"}"></span>
            </button>
            <button class="chip" data-action="reset-ops-filters">Сбросить</button>
          </div>
        </div>
        <div class="ops-toolbar-filters">
          <div class="seg" role="group" aria-label="Тип операций">
            ${[["all", "Все"], ["income", "Доходы"], ["expense", "Расходы"], ["transfer", "Переводы"], ["pending", "Ожидает"]].map(([k, l]) => `
              <button class="chip ${st.filter === k ? "is-active" : ""}" data-filter="${k}" data-scope="operations">${l}</button>`).join("")}
          </div>
          <div class="seg" role="group" aria-label="Период">
            ${periodDefs.map(([k, l]) => `
              <button class="chip ${(st.period || "all") === k ? "is-active" : ""}" data-period-btn="${k}">${l}</button>`).join("")}
          </div>
          <select class="ops-select" data-account-select aria-label="Счёт">
            <option value="all">Все счета</option>
            ${accounts.map((a) => `<option value="${u.esc(a)}" ${st.account === a ? "selected" : ""}>${u.esc(a)}</option>`).join("")}
          </select>
          <select class="ops-select" data-category-select aria-label="Категория">
            <option value="all">Все категории</option>
            ${categories.map((c) => `<option value="${u.esc(c)}" ${st.category === c ? "selected" : ""}>${u.esc(c)}</option>`).join("")}
          </select>
        </div>
      </div>`;
    page(`
      <div class="ops-summary">
        <div class="ops-sum"><span class="ops-sum-label">Доходы</span><span class="ops-sum-val t-income">+${money(sumIn).replace("−", "")}</span></div>
        <div class="ops-sum-sep"></div>
        <div class="ops-sum"><span class="ops-sum-label">Расходы</span><span class="ops-sum-val t-expense">${money(sumOut)}</span></div>
        <div class="ops-sum-sep"></div>
        <div class="ops-sum"><span class="ops-sum-label">Итог</span><span class="ops-sum-val ${sumIn + sumOut >= 0 ? "t-income" : "t-expense"}">${money(sumIn + sumOut)}</span></div>
      </div>
      ${toolbarHTML}
      ${items.length === 0 ? `
        <div class="empty-state">
          <span class="empty-icon" data-icon="search"></span>
          <h3>Ничего не найдено</h3>
          <p>Измените запрос или сбросьте фильтры.</p>
          <button class="secondary-btn" data-action="reset-ops-filters">Сбросить фильтры</button>
        </div>` : (isDesktop ? tableHTML : cardsHTML)}
      ${items.length > visible.length ? `<div style="margin-top:10px;display:flex;justify-content:center;"><button class="primary-btn" data-action="load-more-ops">Загрузить ещё (${items.length - visible.length})</button></div>` : ""}
    `);
  };

  /* ---------- Счета ---------- */
  /* ---------- Этап 30: карусель банковских карт (по референсу
     «Счета и транзакции.html») ---------- */

  /* Визуальные пресеты карт: градиент, цвет текста, логотип-марка.
     bankId в mock.accounts — ключ; неизвестный id → «other». */
  const BANK_META = {
    tbank: {
      name: "Т-Банк",
      bg: "linear-gradient(135deg, #FFE95A 0%, #FFC300 100%)",
      fg: "#151515",
      mark: '<svg viewBox="0 0 44 44" aria-hidden="true"><rect x="7" y="7" width="30" height="30" rx="10" fill="#151515"/><rect x="14" y="14" width="16" height="5" rx="2.5" fill="#FFDD2D"/><rect x="19.5" y="14" width="5" height="18" rx="2.5" fill="#FFDD2D"/></svg>',
    },
    alfa: {
      name: "Альфа-Банк",
      bg: "linear-gradient(135deg, #FF5A50 0%, #D80C00 100%)",
      fg: "#ffffff",
      mark: '<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="14" fill="none" stroke="#fff" stroke-width="3"/><path d="M22 11 L30 31 H26 L22 21 L18 31 H14 Z" fill="#fff"/><rect x="18" y="24" width="8" height="3" rx="1.5" fill="#fff"/></svg>',
    },
    sber: {
      name: "Сбер",
      bg: "linear-gradient(135deg, #2FC44D 0%, #128C2A 100%)",
      fg: "#ffffff",
      mark: '<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M30 14c0-4.5-4.2-7-9-7s-9 2.5-9 7 4.2 7 9 7 9 2.5 9 7-4.2 7-9 7-9-2.5-9-7" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/></svg>',
    },
    vtb: {
      name: "ВТБ",
      bg: "linear-gradient(135deg, #2596D8 0%, #005BAA 100%)",
      fg: "#ffffff",
      mark: '<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M9 13h6l7 14 7-14h6L23 35h-2Z" fill="#fff"/><rect x="12" y="8" width="20" height="3" rx="1.5" fill="#fff" opacity=".75"/><rect x="15" y="38" width="14" height="3" rx="1.5" fill="#fff" opacity=".75"/></svg>',
    },
    ozon: {
      name: "Ozon Банк",
      bg: "linear-gradient(135deg, #FF6B00 0%, #F24236 100%)",
      fg: "#ffffff",
      mark: '<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M17.5 9C11.7 9 7 13.4 7 18.8c0 5.4 4.7 9.8 10.5 9.8 1.6 0 3-.3 4.3-.9L20 23a8.6 8.6 0 0 1-2.5.4c-3.4 0-6.1-2.6-6.1-5.7S14.1 12 17.5 12c1.7 0 3.2.8 4.3 2l3.4-3A11 11 0 0 0 17.5 9Z" fill="#fff"/><path d="M28.5 35c5.8 0 10.5-4.4 10.5-9.8 0-5.4-4.7-9.8-10.5-9.8-1.6 0-3 .3-4.3.9l1.8 4.7c.8-.3 1.6-.4 2.5-.4 3.4 0 6.1 2.6 6.1 5.7s-2.7 5.7-6.1 5.7c-1.7 0-3.2-.8-4.3-2l-3.4 3A11 11 0 0 0 28.5 35Z" fill="#fff"/></svg>',
    },
    yandexpay: {
      name: "Яндекс Пэй",
      bg: "linear-gradient(135deg, #FC3F1D 0%, #FA1414 55%, #111111 100%)",
      fg: "#ffffff",
      mark: '<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="13" fill="none" stroke="#fff" stroke-width="3.4"/><path d="M22 9v26" stroke="#fff" stroke-width="3.4"/><path d="M22 22c4-6 8-8 11-8" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/></svg>',
    },
    otp: {
      name: "ОТП Банк",
      bg: "linear-gradient(135deg, #E4002B 0%, #8E0019 100%)",
      fg: "#ffffff",
      mark: '<svg viewBox="0 0 44 44" aria-hidden="true"><rect x="8" y="10" width="28" height="24" rx="6" fill="none" stroke="#fff" stroke-width="3"/><path d="M15 18h4v10h-4zM23 18h3.5l3 4 3-4H36v10h-3.5l-1.5-2.5-1.5 2.5H26zM11 23h3v2h-3z" fill="#fff"/></svg>',
    },
    cash: {
      name: "Наличные",
      bg: "linear-gradient(135deg, #A8B3C5 0%, #64748B 100%)",
      fg: "#ffffff",
      mark: '<svg viewBox="0 0 44 44" aria-hidden="true"><rect x="7" y="13" width="30" height="18" rx="4" fill="none" stroke="#fff" stroke-width="3"/><circle cx="22" cy="22" r="4" fill="#fff"/><path d="M12 18h4M28 26h4" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>',
    },
    other: {
      name: "Счёт",
      bg: "linear-gradient(135deg, #8B9BB4 0%, #5F6C85 100%)",
      fg: "#ffffff",
      mark: '<svg viewBox="0 0 44 44" aria-hidden="true"><rect x="8" y="12" width="28" height="20" rx="5" fill="none" stroke="#fff" stroke-width="3"/><path d="M8 19h28" stroke="#fff" stroke-width="3"/><circle cx="30" cy="26" r="2" fill="#fff"/></svg>',
    },
  };

  const CONTACTLESS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8a8 8 0 0 1 0 8M11 6a12 12 0 0 1 0 12M15 4a16 16 0 0 1 0 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  const ACCT_TYPE_LABEL = { card: "Дебетовая", savings: "Накопительный", cash: "Наличные", credit: "Кредитная" };

  /* Этап 31: шеврон как в навигации («вперёд/назад»), вместо текстовых ‹ › */
  const CHEV_LEFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
  const CHEV_RIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';

  /* маска номера: видны только последние 4 цифры, остальные группы «••••» */
  function cardNumber(acc) {
    const last4 = String(acc.mask || "").match(/\d{4}$/);
    if (acc.number) {
      const groups = String(acc.number).trim().split(/\s+/);
      const tail = last4 ? last4[0] : groups[groups.length - 1];
      return groups.slice(0, -1).map(() => "••••").concat(tail).join(" ");
    }
    return last4 ? `•••• ${last4[0]}` : "";
  }

  function bankCardInnerHTML(acc) {
    const meta = BANK_META[acc.bankId] || BANK_META.other;
    const num = acc.kind === "cash" ? "" : cardNumber(acc);
    return `
      <span class="bc-shine"></span>
      <span class="bc-top">
        <span class="bc-logo">${meta.mark}</span>
        <span class="bc-titles">
          <span class="bc-bank">${esc(meta.name)}</span>
          <span class="bc-name">${esc(acc.name)}</span>
        </span>
        <span class="bc-type">${esc(ACCT_TYPE_LABEL[acc.kind] || "Счёт")}</span>
      </span>
      <span class="bc-middle">
        ${acc.kind === "cash" ? "" : `<span class="bc-chip"></span><span class="bc-contactless">${CONTACTLESS_SVG}</span>`}
      </span>
      <span class="bc-bottom">
        <span class="bc-number">${esc(num)}</span>
        <span class="bc-balance"><span>Баланс</span><strong>${money(acc.balance)}</strong></span>
      </span>`;
  }

  function bankCardHTML(acc, index) {
    const meta = BANK_META[acc.bankId] || BANK_META.other;
    return `
      <button type="button" role="listitem" class="bank-card"
        data-go-route="accounts" data-go-params="account:${acc.id}"
        style="--i:${index}; --card-bg:${meta.bg}; --card-fg:${meta.fg}"
        aria-label="${esc(`${acc.name}, баланс ${money(acc.balance)}`)}">
        ${bankCardInnerHTML(acc)}
      </button>`;
  }

  /* ---- управление каруселью (стрелки/точки/drag) ---- */
  let carouselAnimated = false;   /* fadeUp-анимация появления — только при первом рендере */
  let carouselDragged = false;    /* подавить клик после перетаскивания */
  let carPointer = { active: false, x: 0, moved: false };

  function getCardStep(el) {
    const card = el && el.querySelector(".bank-card");
    if (!el || !card) return 300;
    const st = getComputedStyle(el);
    const gap = parseFloat(st.columnGap || st.gap || "12") || 12;
    return card.offsetWidth + gap;
  }

  /* Этап 31: индекс карточки, ближайшей к центру вьюпорта (общий для точек и панели) */
  function activeCardIndex(el) {
    const cards = Array.from(el.querySelectorAll(".bank-card"));
    if (!cards.length) return 0;
    const rect = el.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    let page = 0, best = Infinity;
    cards.forEach((c, i) => {
      const d = Math.abs(c.getBoundingClientRect().left + c.offsetWidth / 2 - center);
      if (d < best) { best = d; page = i; }
    });
    return page;
  }

  function updateCarouselState() {
    const el = document.getElementById("accountsCarousel");
    if (!el) return;
    const dots = document.getElementById("accountsDots");
    let page = 0;
    if (dots) {
      const cards = Array.from(el.querySelectorAll(".bank-card"));
      /* Этап 30: активная точка — ближайшая к центру вьюпорта карточка
         (корректно и для full-page snap на мобиле, и для proximity-скролла на десктопе) */
      page = activeCardIndex(el);
      dots.innerHTML = Array.from({ length: cards.length }, (_, i) =>
        `<button type="button" class="${i === page ? "on" : ""}" data-page="${i}" aria-label="Счёт ${i + 1}"></button>`).join("");
    }
    const prev = document.getElementById("accountsPrev");
    const next = document.getElementById("accountsNext");
    if (prev && next) {
      const maxScroll = el.scrollWidth - el.clientWidth - 2;
      prev.disabled = el.scrollLeft <= 2;
      next.disabled = el.scrollLeft >= maxScroll;
    }
    /* Этап 31: панель «последние операции» следует за активной карточкой */
    const accRecent = document.getElementById("acctRecent");
    if (accRecent && window.DB && window.DB.accounts) renderActiveAccountPanel(window.DB, page);
  }

  /* единократная привязка слушателей к документу (делегирование) */
  let carouselBound = false;
  function bindCarousel() {
    if (carouselBound) return;
    carouselBound = true;

    document.addEventListener("pointerdown", (e) => {
      const car = e.target.closest("#accountsCarousel");
      if (!car) return;
      carPointer = { active: true, x: e.clientX, moved: false };
    });
    window.addEventListener("pointermove", (e) => {
      if (!carPointer.active) return;
      if (Math.abs(e.clientX - carPointer.x) > 10) carPointer.moved = true;
    });
    window.addEventListener("pointerup", () => {
      if (!carPointer.active) return;
      if (carPointer.moved) {
        carouselDragged = true;
        setTimeout(() => { carouselDragged = false; }, 220);
      }
      carPointer.active = false;
      carPointer.moved = false;
    });
    document.addEventListener("scroll", (e) => {
      if (e.target && e.target.id === "accountsCarousel") updateCarouselState();
    }, { passive: true, capture: true });

    document.addEventListener("click", (e) => {
      const arrow = e.target.closest("[data-carousel-scroll]");
      if (arrow) {
        const el = document.getElementById("accountsCarousel");
        if (!el) return;
        const delta = Number(arrow.dataset.carouselScroll);
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollBy({ left: delta * getCardStep(el), behavior: reduced ? "auto" : "smooth" });
        return;
      }
      const dot = e.target.closest("#accountsDots [data-page]");
      if (dot) {
        const el = document.getElementById("accountsCarousel");
        if (!el) return;
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollTo({ left: Number(dot.dataset.page) * getCardStep(el), behavior: reduced ? "auto" : "smooth" });
        return;
      }
      /* drag по карусели не должен открывать детальную страницу счёта */
      const card = e.target.closest("#accountsCarousel .bank-card");
      if (card && carouselDragged) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    window.addEventListener("resize", updateCarouselState);
  }

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

  /* Этап 31: последние операции активной карточки (учитывает входящие переводы).
     tx в mock хранятся в хронологическом порядке сверху вниз; новые операции
     добавляются через unshift, но редактирование дату менять не обязано —
     поэтому сортировка стабильная: существующий порядок сохраняется внутри
     одинаковых дат. */
  function recentTxHTML(db, acc, limit = 4) {
    const parseDate = (d) => { const p = window.u && u.toDate ? u.toDate(String(d)) : null; return p ? p.getTime() : 0; };
    const txs = db.transactions
      .filter((t) => t.account === acc.name || (t.type === "transfer" && t.toAccount === acc.name))
      .map((t, i) => ({ t, i }))
      .sort((a, b) => parseDate(b.t.date) - parseDate(a.t.date) || a.i - b.i)
      .slice(0, limit)
      .map((x) => x.t);
    if (!txs.length) return `<div class="muted" style="padding:10px 12px">Пока нет операций по этому счёту.</div>`;
    return `<div class="list">${txs.map((t) => {
      const isTransfer = t.type === "transfer";
      const incoming = t.type === "income" || (isTransfer && t.toAccount === acc.name && t.account !== acc.name);
      const sumCls = isTransfer ? "transfer" : (incoming ? "income" : "expense");
      const sign = isTransfer ? "↔ " : (incoming ? "+ " : "− ");
      /* Этап 31: fmtDM ждёт Date — дата уже каноническая «DD.MM.YYYY»,
         String() сюда вызывал d.getDate на строке (TypeError). */
      const meta = [t.date, t.category].filter(Boolean).join(" · ");
      return `<button type="button" class="recent-row" data-go-route="accounts" data-go-params="account:${esc(acc.id)}">
        <span class="recent-main">
          <span class="recent-title">${esc(t.title)}</span>
          <span class="recent-meta">${esc(meta)}</span>
        </span>
        <span class="recent-sum ${sumCls}">${sign}${money(Math.abs(Number(t.amount) || 0))}</span>
      </button>`;
    }).join("")}</div>`;
  }

  /* панель под каруселью: заголовок + последние N операций активной карты */
  function renderActiveAccountPanel(db, idx) {
    const panel = document.getElementById("acctRecent");
    if (!panel) return;
    const acc = db.accounts[idx] || db.accounts[0];
    if (!acc) return;
    panel.innerHTML = `
      <div class="acct-recent-head">
        <h3>${esc(acc.name)} — последние операции</h3>
        <button class="link-btn" data-go-route="accounts" data-go-params="account:${esc(acc.id)}">Все операции →</button>
      </div>
      ${recentTxHTML(db, acc)}`;
  }

  Views.accounts = function (ctx) {
    const det = ctx.state.detail && ctx.state.detail.kind === "account";
    if (det) {
      const acc = ctx.DB.accounts.find((a) => a.id === Number(ctx.state.detail.id));
      if (!acc) { page(`<div class="panel"><h2>Счёт не найден</h2><p class="muted">Вернитесь к списку счетов.</p><button class="secondary-btn" data-go-route="accounts" style="margin-top:10px">← Все счета</button></div>`); return; }
      /* Этап 29: на счёте видны и его переводы (источник и приёмник);
         поступления/расходы считают переводы отдельной строкой KPI */
      const txs = ctx.DB.transactions.filter((t) => t.account === acc.name || t.toAccount === acc.name);
      const trIn = txs.filter((t) => t.type === "transfer" && t.toAccount === acc.name).reduce((s, t) => s + Math.abs(t.amount), 0);
      const trOut = txs.filter((t) => t.type === "transfer" && t.account === acc.name).reduce((s, t) => s + Math.abs(t.amount), 0);
      const income = txs.filter((t) => t.type !== "transfer" && t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter((t) => t.type !== "transfer" && t.amount < 0).reduce((s, t) => s + t.amount, 0);
      const hist = acc.history || [];
      const maxH = Math.max(...hist, 1);
      page(`
        <button class="link-btn back-link" data-go-route="accounts">← Все счета</button>
        <section class="detail-hero acct-hero" style="--hero-c:${acc.color || "var(--blue)"}">
          <span class="quick-icon hero-icon" data-icon="${acc.kind === "cash" ? "wallet" : "accounts"}"></span>
          <div class="hero-copy">
            <h2>${esc(acc.name)}</h2>
            <p class="hero-sub">${ACCT_TYPE_LABEL[acc.kind] ? ACCT_TYPE_LABEL[acc.kind] + (acc.kind === "credit" || acc.kind === "card" ? " карта" : "") : "Счёт"}</p>
            <div class="hero-balance">${money(acc.balance)}</div>
          </div>
        </section>
        <div class="kpi-grid">
          <div class="kpi"><span class="kpi-label">Поступления</span><span class="kpi-value t-income">${money(income)}</span></div>
          <div class="kpi"><span class="kpi-label">Расходы</span><span class="kpi-value t-expense">${money(expense)}</span></div>
          ${(trIn || trOut) ? `<div class="kpi"><span class="kpi-label">Переводы</span><span class="kpi-value t-info">+${money(trIn).replace("−", "")} / −${money(Math.abs(trOut)).replace("−", "")}</span><span class="kpi-sub">входящие / исходящие</span></div>` : ""}
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
    /* Этап 29: KPI по референсу «Счета и транзакции» — плюс/минус/итог.
       Прирост за месяц = сумма небалансовых операций (переводы вне счёта). */
    const monthIn = ctx.DB.transactions.filter((t) => t.type !== "transfer" && t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const monthOut = ctx.DB.transactions.filter((t) => t.type !== "transfer" && t.amount < 0).reduce((s, t) => s + t.amount, 0);
    page(`
      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">Всего на счетах</span><span class="kpi-value">${money(total)}</span></div>
        <div class="kpi"><span class="kpi-label">Плюс (мес.)</span><span class="kpi-value t-income">+${money(monthIn).replace("−", "")}</span></div>
        <div class="kpi"><span class="kpi-label">Минус (мес.)</span><span class="kpi-value t-expense">${money(monthOut)}</span></div>
        <div class="kpi"><span class="kpi-label">Итог</span><span class="kpi-value ${monthIn + monthOut >= 0 ? "t-income" : "t-expense"}">${money(monthIn + monthOut)}</span><span class="kpi-sub">${ctx.DB.accounts.length} счёта(ов)</span></div>
      </div>
      <div class="carousel-wrap">
        <button class="carousel-arrow left" id="accountsPrev" type="button" aria-label="Предыдущий счёт" data-carousel-scroll="-1">${CHEV_LEFT}</button>
        <div class="accounts-carousel${carouselAnimated ? "" : " animated"}" id="accountsCarousel" role="list" aria-label="Счета">
          ${ctx.DB.accounts.map((a, i) => bankCardHTML(a, i)).join("")}
        </div>
        <button class="carousel-arrow right" id="accountsNext" type="button" aria-label="Следующий счёт" data-carousel-scroll="1">${CHEV_RIGHT}</button>
      </div>
      <div class="carousel-dots" id="accountsDots" aria-label="Навигация по счетам"></div>
      <!-- Этап 31: действия над счетами + последние операции активной карты -->
      <div class="accounts-actions">
        <button class="secondary-btn" data-action="add-account" type="button"><span data-icon="plus"></span>Добавить счёт</button>
        <button class="secondary-btn" data-action="transfer-between" type="button"><span data-icon="transfer"></span>Перевести между счетами</button>
      </div>
      <section class="panel acct-recent" id="acctRecent" aria-live="polite"></section>
      <section class="panel import-panel" style="margin-top:16px">
        <div class="import-row">
          <span class="quick-icon" data-icon="upload"></span>
          <div class="import-copy"><h3>Подключить банк</h3><p>Автоматическая загрузка выписок — следующий этап.</p></div>
          <button class="secondary-btn" data-quick="statement">Загрузить выписку</button>
        </div>
      </section>
    `);
    /* Этап 30: инициализация карусели после вставки DOM */
    bindCarousel();
    carouselAnimated = true;
    requestAnimationFrame(updateCarouselState);
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

  /* ---------- Налоги v2 ---------- */
  Views.taxes = function (ctx) {
    const t = ctx.DB.taxes;
    const rest = Math.max(t.due - t.paid, 0);
    const ratio = t.due ? Math.min(t.paid / t.due, 1) : 0;
    const pendingSum = t.declarations.filter((d) => d.status !== "paid").reduce((s, d) => s + d.sum, 0);
    page(`
      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">Режим</span><span class="kpi-value" style="font-size:16px">${esc(t.regime)}</span><span class="kpi-sub">доход за квартал: ${money(t.incomeQuarter)}</span></div>
        <div class="kpi"><span class="kpi-label">Налог к уплате</span><span class="kpi-value ${rest ? "t-expense" : "t-income"}">${money(rest)}</span><span class="kpi-sub">следующий срок: ${t.nextDate}</span></div>
        <div class="kpi"><span class="kpi-label">Всего неплаченных</span><span class="kpi-value ${pendingSum ? "t-expense" : "t-income"}">${money(pendingSum)}</span><span class="kpi-sub">${t.declarations.filter((d) => d.status !== "paid").length} деклараци(ий)</span></div>
      </div>
      <section class="panel tax-save-card">
        <div class="panel-head"><h2>Накопление к платежу</h2><span class="note">${esc(t.regime)} · срок ${t.nextDate}</span></div>
        <div class="tax-save-body">
          ${u.ringSVG(ratio, "оплачено", 92)}
          <div class="tax-save-info">
            <div class="tax-save-sums"><strong>${money(t.paid)}</strong> <span>/ ${money(t.due)}</span></div>
            <div class="row-meta">${ratio >= 1 ? "Налог за квартал закрыт полностью" : `Осталось отложить ${money(rest)}`}</div>
            ${rest ? `<button class="mini-btn" data-action="tax-pay" data-extra="${rest}">Отложить ${money(rest)}</button>` : `<span class="badge badge--paid">Закрыто</span>`}
          </div>
        </div>
      </section>
      <section class="panel" style="margin-top:16px">
        <div class="panel-head"><h2>Календарь деклараций</h2><span class="note">горизонтальный скролл</span></div>
        <div class="chip-scroll">
          ${t.declarations.map((d) => `
            <div class="decl-chip ${d.status === "paid" ? "is-paid" : "is-pending"}">
              <span class="decl-date">${esc(d.due)}</span>
              <span class="decl-name">${esc(d.name)}</span>
              <span class="decl-sum">${money(d.sum)}</span>
            </div>`).join("")}
        </div>
      </section>
      <section class="panel" style="margin-top:16px">
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
                ${d.status === "paid"
                  ? `<span class="badge badge--paid">Уплачено</span>`
                  : `<button class="mini-btn" data-action="tax-decl-pay" data-extra="${esc(d.name)}">Уплатить</button>`}
              </div>
            </div>`).join("")}
        </div>
      </section>
    `);
  };

  /* ---------- Инвестиции v2 ---------- */
  function lineChartSVG(values, color, opts = {}) {
    if (!values || values.length < 2) return "";
    const w = 320, h = 96, pad = 6;
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (w - pad * 2), h - pad - ((v - min) / span) * (h - pad * 2)]);
    const line = pts.map((p) => p.join(",")).join(" ");
    const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
    const last = pts[pts.length - 1];
    return `<svg class="pf-line" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <polygon points="${area}" fill="${color}" opacity="0.12"></polygon>
      <polyline class="pf-grow" points="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline>
      <circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="${color}"></circle>
    </svg>`;
  }

  Views.investments = function (ctx) {
    const assets = ctx.DB.investments;
    const total = assets.reduce((s, a) => s + a.value, 0);
    const hist = ctx.DB.portfolioHistory || [];
    const change = hist.length >= 2 ? ((hist[hist.length - 1] - hist[hist.length - 2]) / hist[hist.length - 2]) * 100 : 0;
    const weightedGrowth = assets.reduce((s, a) => s + (a.growth || 0) * (a.value / total), 0);
    page(`
      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">Стоимость портфеля</span><span class="kpi-value">${money(total)}</span><span class="kpi-sub ${change >= 0 ? "t-income" : "t-expense"}">${change >= 0 ? "+" : ""}${change.toFixed(1).replace(".", ",")}% за месяц</span></div>
        <div class="kpi"><span class="kpi-label">Доходность за год</span><span class="kpi-value ${weightedGrowth >= 0 ? "t-income" : "t-expense"}">${weightedGrowth >= 0 ? "+" : ""}${weightedGrowth.toFixed(1).replace(".", ",")}% (${money(Math.round(weightedGrowth / 100 * total))})</span><span class="kpi-sub">взвешенная по активам</span></div>
        <div class="kpi"><span class="kpi-label">Активов</span><span class="kpi-value">${assets.length}</span><span class="kpi-sub">облигации · вклады · акции · фонды</span></div>
      </div>
      <section class="panel">
        <div class="panel-head"><h2>Динамика портфеля</h2><span class="note">последние 6 месяцев</span></div>
        ${lineChartSVG(hist, "var(--blue)")}
        <div class="pf-months">${["май", "июн", "июл", "авг", "сен", "окт"].map((m) => `<span>${m}</span>`).join("")}</div>
      </section>
      <section class="panel" style="margin-top:16px">
        <div class="panel-head"><h2>Структура активов</h2></div>
        <div class="donut-wrap">
          ${donutSVG(assets, { centerText: money(total), caption: "портфель" }) + legendHTML(assets)}
        </div>
      </section>
      <section class="panel" style="margin-top:16px">
        <div class="panel-head"><h2>Позиции</h2></div>
        <div class="list">
          ${assets.map((a) => {
            const share = a.value / total;
            return `<div class="row inv-row">
              <div class="cat-icon" style="--ci:${a.color}">${`<span data-icon="investments"></span>`}</div>
              <div class="row-main">
                <div class="row-title">${esc(a.label)}</div>
                <div class="inv-share"><span style="width:${Math.round(share * 100)}%;background:${a.color}"></span></div>
                <div class="row-meta">${(share * 100).toFixed(1).replace(".", ",")}% портфеля · ${money(a.value)}</div>
              </div>
              <div class="amount ${a.growth >= 0 ? "t-income" : "t-expense"}">${a.growth >= 0 ? "+" : ""}${a.growth.toFixed(1).replace(".", ",")}%</div>
              ${sparkline(a.history, a.color)}
            </div>`;
          }).join("")}
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

    // D1: тот же компонент trendBars, что и в «Бюджете» (сетка + выбранный месяц)
    const barsHTML = u.trendBars(m, { hint: "нажмите на столбец — цифры месяца обновятся" });
    // шкала для мини-баров в списке «Доходы vs расходы по месяцам»
    const maxV = Math.max(1, ...m.flatMap((x) => [x.income, x.expense]));

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
        <div class="panel-head"><h2>Доходы и расходы</h2><span class="note">${m.length} мес.</span></div>
        ${barsHTML}
      </section>
      <section class="panel" style="margin-top:16px">
        <div class="panel-head"><h2>Структура расходов</h2><span class="note">${money(totalExpense)}</span></div>
        ${(() => {
          const by = {};
          ctx.DB.budgets.forEach((b) => { by[b.name] = b.fact; });
          /* Этап 28: иконка/цвет категории из справочника, сортировка по сумме */
          const data = Object.entries(by)
            .map(([label, value]) => ({ label, value, ...u.catMeta(label) }))
            .sort((a, b) => b.value - a.value);
          return `<div class="donut-wrap">${donutSVG(data, { centerText: money(data.reduce((s, d) => s + d.value, 0)), caption: "всего" }) + legendHTML(data, { maxVisible: 6 })}</div>`;
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