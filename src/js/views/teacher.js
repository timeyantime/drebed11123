/* ============================================================
   MONO — VIEW: УЧИТЕЛЬ (ученики + занятия)
   ============================================================ */
window.Views = window.Views || {};

(function () {
  const { money, esc } = u;
  const P = () => u.partials;

  function getTeacherItems(state, DB) {
    const { tab, filter, sort } = state.teacher;

    if (tab === "students") {
      let items = [...DB.students];
      if (filter !== "all") items = items.filter((s) => s.status === filter);
      if (sort === "name") items.sort((a, b) => a.name.localeCompare(b.name, "ru"));
      if (sort === "next") items.sort((a, b) => a.next.localeCompare(b.next, "ru"));
      if (sort === "balance") {
        const weight = { "Ожидает": 0, "Оплачено": 1 };
        items.sort((a, b) => (weight[a.balance] ?? 2) - (weight[b.balance] ?? 2));
      }
      return { type: "students", items };
    }

    let items = [...DB.lessons];
    if (filter !== "all") items = items.filter((l) => l.status === filter);
    if (sort === "student") items.sort((a, b) => a.student.localeCompare(b.student, "ru"));
    else items.sort((a, b) => a.when.localeCompare(b.when, "ru"));
    return { type: "lessons", items };
  }

  function sortLabel(state) {
    const { tab, sort } = state.teacher;
    if (tab === "students") {
      return { name: "По имени", next: "По записи", balance: "По оплате" }[sort] || "Сортировка";
    }
    return { date: "По дате", student: "По ученику" }[sort] || "Сортировка";
  }

  /* ---------- Детальная страница ученика: #/teacher/student/:id (Этап 5B) ---------- */
  function studentDetail(ctx, id) {
    const s = ctx.DB.students.find((x) => String(x.id) === String(id));
    if (!s) {
      page(`
        ${ctx.emptyHTML("Ученик не найден", "Возможно, запись была удалена.", "student", "Добавить ученика")}
        <div style="display:flex;justify-content:center;margin-top:12px">
          <button class="secondary-btn" data-go-route="teacher">← К списку учеников</button>
        </div>`);
      return;
    }
    const lessons = ctx.DB.lessons.filter((l) => l.student === s.name);
    const done = lessons.filter((l) => l.status === "done").length;
    const upcoming = lessons.filter((l) => l.status === "upcoming").length;
    const income = ctx.DB.transactions.filter((t) => t.type === "income" && t.title.includes(s.name.split(" ")[0]));
    const paidSum = income.filter((t) => t.status === "paid").reduce((a, t) => a + t.amount, 0);
    const hue = u.partials.avatarHue(s.id);

    page(`
      <div style="margin-bottom:12px">
        <button class="link-btn" data-go-route="teacher">← Все ученики</button>
      </div>

      <section class="panel detail-hero">
        <span class="avatar avatar--xl" style="--c:hsl(${hue} 62% 52%)">${u.esc(s.name[0])}</span>
        <div class="detail-id">
          <h2>${u.esc(s.name)}</h2>
          <p>${u.esc(s.subject)} • ставка ${money(s.rate)}/занятие • ${u.esc(s.next)}</p>
        </div>
        <span class="badge ${s.status === "unpaid" ? "badge--pending" : s.status === "active" ? "badge--paid" : "badge--neutral"}">
          ${s.status === "unpaid" ? "Есть долг" : s.status === "active" ? "Активный" : "Без занятий"}
        </span>
      </section>

      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">Занятий проведено</span><span class="kpi-value">${done}</span></div>
        <div class="kpi"><span class="kpi-label">Предстоит</span><span class="kpi-value">${upcoming}</span></div>
        <div class="kpi"><span class="kpi-label">Получено оплат</span><span class="kpi-value t-income">${money(paidSum)}</span></div>
        <div class="kpi"><span class="kpi-label">Долг</span><span class="kpi-value ${s.debt ? "t-expense" : ""}">${money(s.debt)}</span></div>
      </div>

      <section class="panel">
        <div class="panel-head"><h2>Журнал занятий</h2><span class="note">${lessons.length} записей</span></div>
        ${lessons.length ? `<div class="list">${lessons.map(u.partials.lessonRow).join("")}</div>`
          : `<p class="t-muted" style="padding:10px 0;font-size:13px">Занятий пока нет.</p>`}
      </section>

      ${income.length ? `
      <section class="panel" style="margin-top:16px">
        <div class="panel-head"><h2>Оплаты</h2></div>
        <div class="list">${income.map(u.partials.transactionRow).join("")}</div>
      </section>` : ""}

      <div class="detail-actions">
        ${s.debt > 0 ? `<button class="primary-btn" data-action="remind" data-id="${s.id}">Напомнить об оплате (${money(s.debt)})</button>` : ""}
        <button class="secondary-btn" data-quick="lesson">Запланировать занятие</button>
      </div>
    `);
  }

  Views.teacher = function (ctx) {
    if (ctx.state.detail && ctx.state.detail.kind === "student") {
      return studentDetail(ctx, ctx.state.detail.id);
    }
    const { tab, filter } = ctx.state.teacher;
    const { type, items } = getTeacherItems(ctx.state, ctx.DB);

    const studentChips = [
      { key: "all", label: "Все" },
      { key: "active", label: "Активные" },
      { key: "unpaid", label: "Не оплаченные" },
      { key: "idle", label: "Без занятий" }
    ];
    const lessonChips = [
      { key: "all", label: "Все" },
      { key: "upcoming", label: "Предстоящие" },
      { key: "done", label: "Проведённые" },
      { key: "canceled", label: "Отменённые" }
    ];
    const chips = type === "students" ? studentChips : lessonChips;

    const totalDebt = ctx.DB.students.reduce((s, x) => s + (x.debt || 0), 0);
    const monthIncome = ctx.DB.students.reduce((s, x) => s + (x.monthIncome || 0), 0);

    /* ---------- ЭТАП 16: секции учеников при фильтре «Все» ----------
       Долги всегда сверху (как просрочки в planned), далее активные,
       затем «без занятий». Внутри секции — текущая сортировка. */
    const STUDENT_SECTIONS = [
      { key: "unpaid", label: "С долгами", tone: "t-expense", sumOf: (rows) => rows.reduce((s, x) => s + (x.debt || 0), 0), sumLabel: "долг" },
      { key: "active", label: "Активные", tone: "t-income", sumOf: (rows) => rows.reduce((s, x) => s + (x.monthIncome || 0), 0), sumLabel: "выручка" },
      { key: "idle", label: "Без занятий", tone: "", sumOf: null, sumLabel: "" }
    ];
    function studentSectionsHTML() {
      const known = STUDENT_SECTIONS.map((g) => Object.assign({}, g, { rows: items.filter((s) => s.status === g.key) }));
      const rest = items.filter((s) => !STUDENT_SECTIONS.some((g) => g.key === s.status));
      const sections = known.filter((g) => g.rows.length);
      if (rest.length) sections.push({ key: "other", label: "Прочие", tone: "", sumOf: null, sumLabel: "", rows: rest });
      return sections.map((g) => `
        <section class="ops-group st-group" aria-label="${esc(g.label)}">
          <h3 class="group-head">${esc(g.label)}<span class="st-count">${g.rows.length}</span>${g.sumOf ? `<span class="st-sum ${g.tone}">${money(g.sumOf(g.rows))} · ${esc(g.sumLabel)}</span>` : ""}</h3>
          <div class="list">${g.rows.map((it) => P().studentRow(it)).join("")}</div>
        </section>`).join("");
    }

    const grouped = type === "students" && filter === "all" && items.length > 0;
    const listHTML = !items.length
      ? ctx.emptyHTML(
          "Ничего не найдено",
          type === "students"
            ? "Под текущий фильтр не попал ни один ученик."
            : "Под текущий фильтр не попало ни одно занятие.",
          type === "students" ? "student" : "lesson",
          type === "students" ? "Добавить ученика" : "Запланировать занятие"
        )
      : grouped
      ? studentSectionsHTML()
      : `
        <h2 class="sticky-title">${type === "students" ? "Ученики" : "Занятия"}</h2>
        <div class="list">
          ${items.map((it) => (type === "students" ? P().studentRow(it) : P().lessonRow(it))).join("")}
        </div>`;

    page(`
      <div class="kpi-grid">
        <div class="kpi"><span class="kpi-label">Учеников</span><span class="kpi-value">${ctx.DB.students.length}</span><span class="kpi-sub">${ctx.DB.students.filter((s) => s.status === "active").length} активных</span></div>
        <div class="kpi"><span class="kpi-label">Выручка за месяц</span><span class="kpi-value t-income">${money(monthIncome)}</span><span class="kpi-sub">по ученикам</span></div>
        <div class="kpi"><span class="kpi-label">Долги</span><span class="kpi-value ${totalDebt ? "t-expense" : ""}">${money(totalDebt)}</span><span class="kpi-sub">${ctx.DB.students.filter((s) => s.debt > 0).length} должников</span></div>
      </div>

      <div class="page-tools">
        <div class="segmented" role="tablist" aria-label="Разделы учителя">
          <button class="seg-btn ${tab === "students" ? "is-active" : ""}" data-tab="students" data-scope="teacher" role="tab" aria-selected="${tab === "students"}">Ученики</button>
          <button class="seg-btn ${tab === "lessons" ? "is-active" : ""}" data-tab="lessons" data-scope="teacher" role="tab" aria-selected="${tab === "lessons"}">Занятия</button>
        </div>
        <button class="chip" data-sort="teacher">${sortLabel(ctx.state)}</button>
      </div>

      <div class="chips" aria-label="Быстрые фильтры">
        ${chips.map((c) => `
          <button class="chip ${filter === c.key ? "is-active" : ""}" data-filter="${c.key}" data-scope="teacher">${c.label}</button>`).join("")}
      </div>

      ${listHTML}
    `);
  };

  u.getTeacherItems = getTeacherItems;
})();
