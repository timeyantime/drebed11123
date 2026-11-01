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

  Views.teacher = function (ctx) {
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

    const listHTML = items.length
      ? `
        <h2 class="sticky-title">${type === "students" ? "Ученики" : "Занятия"}</h2>
        <div class="list">
          ${items.map((it) => (type === "students" ? P().studentRow(it) : P().lessonRow(it))).join("")}
        </div>`
      : ctx.emptyHTML(
          "Ничего не найдено",
          type === "students"
            ? "Под текущий фильтр не попал ни один ученик."
            : "Под текущий фильтр не попало ни одно занятие.",
          type === "students" ? "student" : "lesson",
          type === "students" ? "Добавить ученика" : "Запланировать занятие"
        );

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
