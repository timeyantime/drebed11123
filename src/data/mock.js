/* ============================================================
   MONO — МОРК ДАННЫХ (заменится на API на этапе бэкенда)
   Формат записей расширяем по мере подключения карточек Домкнига.
   ============================================================ */
window.DB = {
  students: [
    { id: 1, name: "Анна К.", subject: "Математика", next: "Сегодня, 18:00", balance: "Оплачено", status: "active", debt: 0, rate: 1200, monthIncome: 4800 },
    { id: 2, name: "Иван П.", subject: "Английский", next: "Завтра, 10:30", balance: "Ожидает", status: "unpaid", debt: 2000, rate: 1000, monthIncome: 2000 },
    { id: 3, name: "Мария С.", subject: "Физика", next: "Нет записи", balance: "Оплачено", status: "idle", debt: 0, rate: 1300, monthIncome: 0 },
    { id: 4, name: "Олег Д.", subject: "Информатика", next: "Чт, 19:00", balance: "Ожидает", status: "unpaid", debt: 2400, rate: 1200, monthIncome: 2400 },
    { id: 5, name: "Дарья Л.", subject: "Русский", next: "Пт, 16:00", balance: "Оплачено", status: "active", debt: 0, rate: 1100, monthIncome: 4400 }
  ],

  lessons: [
    { id: 1, student: "Анна К.", subject: "Математика", when: "Сегодня, 18:00", duration: "60 мин", status: "upcoming" },
    { id: 2, student: "Иван П.", subject: "Английский", when: "Завтра, 10:30", duration: "45 мин", status: "upcoming" },
    { id: 3, student: "Дарья Л.", subject: "Русский", when: "Пт, 16:00", duration: "60 мин", status: "upcoming" },
    { id: 4, student: "Олег Д.", subject: "Информатика", when: "Вчера, 19:00", duration: "60 мин", status: "done" },
    { id: 5, student: "Мария С.", subject: "Физика", when: "Пн, 17:00", duration: "60 мин", status: "canceled" }
  ],

  transactions: [
    /* Этап 28: у операций появилось время (HH:MM), как в референсе «Домкнига» */
    { id: 1, date: "01.11.2026", time: "12:40", title: "Оплата: Анна К.", amount: 2400, type: "income", category: "Ученики", status: "paid", account: "Карта Т-Банк" },
    { id: 2, date: "31.10.2026", time: "18:15", title: "Аренда кабинета", amount: -15000, type: "expense", category: "Работа", tags: ["кабинет"], status: "paid", account: "Карта Т-Банк" },
    { id: 3, date: "30.10.2026", time: "19:00", title: "Оплата: Иван П.", amount: 2000, type: "income", category: "Ученики", status: "pending", account: "Карта Т-Банк" },
    { id: 4, date: "29.10.2026", time: "10:22", title: "Продукты", amount: -3200, type: "expense", category: "Продукты", tags: ["семья"], status: "paid", account: "Наличные" },
    { id: 5, date: "28.10.2026", time: "17:30", title: "Оплата: Олег Д.", amount: 2400, type: "income", category: "Ученики", status: "paid", account: "Карта Т-Банк" },
    { id: 6, date: "27.10.2026", time: "09:05", title: "Интернет", amount: -700, type: "expense", category: "Работа", tags: ["кабинет"], status: "paid", account: "Карта Т-Банк" },
    { id: 7, date: "26.10.2026", time: "16:44", title: "Учебники", amount: -1800, type: "expense", category: "Развитие", status: "paid", account: "Карта Т-Банк" },
    { id: 8, date: "25.10.2026", time: "11:10", title: "Оплата: Дарья Л.", amount: 2200, type: "income", category: "Ученики", status: "paid", account: "Наличные" },
    { id: 9, date: "31.10.2026", time: "08:35", title: "Метро", amount: -300, type: "expense", category: "Транспорт", status: "paid", account: "Карта Т-Банк" },
    { id: 10, date: "28.10.2026", time: "20:10", title: "Кино", amount: -800, type: "expense", category: "Развлечения", status: "paid", account: "Наличные" }
  ],

  budgets: [
    { name: "Продукты", plan: 15000, fact: 12400, limit: 18000 },
    { name: "Транспорт", plan: 5000, fact: 5850, limit: 7000 },
    { name: "Работа / кабинет", plan: 18000, fact: 15700, limit: 22000 },
    { name: "Развлечения", plan: 8000, fact: 3200, limit: 10000 },
    { name: "Развитие", plan: 6000, fact: 6000, limit: 8000 }
  ],

  months: [
    { m: "Июн", income: 48000, expense: 39000 },
    { m: "Июл", income: 52500, expense: 41200 },
    { m: "Авг", income: 44000, expense: 46800 },
    { m: "Сен", income: 61000, expense: 42300 },
    { m: "Окт", income: 55400, expense: 43900 },
    { m: "Ноя", income: 38600, expense: 28100 }
  ],

  /* Этап 29: у счетов появились mask (номер для карточки) и openingBalance —
     базовый баланс, от которого U.recalcBalances считает текущий по операциям.
     Поле balance теперь ПРОИЗВОДНОЕ: пересчитывается при каждой мутации,
     чтобы не рассинхронизироваться после undo/редактирования/удаления.
     appliedTxs — журнал дельт операций, которые УЖЕ были учтены в balance
     на этапе формирования mock (paid-транзакции). recalcBalances вычитает
     их из суммы дельт — поэтому повторный пересчёт идемпотентен. */
  accounts: [
    { id: 1, name: "Карта Т-Банк", balance: 84200, openingBalance: 84200, kind: "card", mask: "•• 4276", color: "var(--blue)", history: [72000, 78500, 69000, 81200, 76400, 84200] },
    { id: 2, name: "Накопительный счёт", balance: 210000, openingBalance: 210000, kind: "savings", mask: "•• 0119", color: "var(--green)", history: [150000, 162000, 175000, 188000, 199000, 210000] },
    { id: 3, name: "Наличные", balance: 6500, openingBalance: 6500, kind: "cash", mask: "", color: "var(--amber)", history: [9000, 7200, 8400, 5100, 7800, 6500] }
  ],

  /* Этап 29: заполняется ниже IIFE'ом — все paid tx из mock уже отражены
     в balance счетов выше. pending (id 3, 10) намеренно отсутствуют. */
  appliedTxs: {},

  planned: [
    { title: "Налог УСН 6%", date: "25.11.2026", amount: 8400, status: "upcoming", account: "Карта Т-Банк" },
    { title: "Аренда кабинета", date: "01.12.2026", amount: 15000, status: "upcoming", account: "Карта Т-Банк" },
    { title: "Подписка на сервис", date: "05.12.2026", amount: 990, status: "upcoming", account: "Карта Т-Банк" },
    { title: "Кредит (просрочен)", date: "20.10.2026", amount: 12000, status: "overdue", account: "Карта Т-Банк" }
  ],

  taxes: {
    regime: "УСН 6%",
    incomeQuarter: 114000,
    due: 6840,
    paid: 6840,
    nextDate: "25.12",
    declarations: [
      { name: "УСН за III кв.", status: "paid", due: "25.10", sum: 6840 },
      { name: "УСН за IV кв.", status: "pending", due: "25.12", sum: 6840 }
    ]
  },

  investments: [
    { label: "Облигации ОФЗ", value: 180000, color: "#3b82f6", growth: 8.2, history: [168000, 170500, 172000, 174800, 177200, 180000] },
    { label: "Вклады", value: 210000, color: "#22c55e", growth: 6.1, history: [196000, 199000, 201500, 204000, 207000, 210000] },
    { label: "Акции", value: 95000, color: "#f59e0b", growth: -3.4, history: [102000, 99500, 97000, 98800, 96200, 95000] },
    { label: "Фонды (БПИФ)", value: 40000, color: "#a855f7", growth: 12.7, history: [34000, 35200, 36800, 37500, 38900, 40000] }
  ],
  portfolioHistory: [472000, 481000, 489500, 501000, 514500, 525000],

  goals: [
    { name: "Подушка безопасности", target: 300000, saved: 214000, deadline: "Март 2027", history: [120000, 150000, 172000, 190000, 205000, 214000] },
    { name: "Ноутбук для работы", target: 120000, saved: 45000, deadline: "Декабрь 2026", history: [5000, 12000, 21000, 30000, 38000, 45000] },
    { name: "Отпуск", target: 90000, saved: 9000, deadline: "Июнь 2027", history: [0, 1500, 3000, 5000, 7000, 9000] }
  ],

  /* Этап 26–27: справочник категорий (имена/цвета/иконки — из референса «Домкнига») */
  categories: [
    { name: "Ученики", kind: "income", color: "var(--chart-2)", icon: "teacher" },
    { name: "Работа", kind: "expense", color: "var(--chart-3)", icon: "briefcase" },
    { name: "Продукты", kind: "expense", color: "#00b894", icon: "cart" },
    { name: "Транспорт", kind: "expense", color: "#74b9ff", icon: "car" },
    { name: "Жильё", kind: "expense", color: "#fdcb6e", icon: "home" },
    { name: "Коммуналка", kind: "expense", color: "#0984e3", icon: "zap" },
    { name: "Связь", kind: "expense", color: "#636e72", icon: "phone" },
    { name: "Подписки", kind: "expense", color: "#a29bfe", icon: "refresh" },
    { name: "Здоровье", kind: "expense", color: "#ff7675", icon: "pill" },
    { name: "Развлечения", kind: "expense", color: "#fd79a8", icon: "gamepad" },
    { name: "Покупки", kind: "expense", color: "#6c5ce7", icon: "bag" },
    { name: "Образование", kind: "expense", color: "#00cec9", icon: "book" },
    { name: "Развитие", kind: "expense", color: "var(--chart-7)", icon: "bulb" },
    { name: "Личное", kind: "expense", color: "var(--chart-6)", icon: "wallet" },
    { name: "Прочее", kind: "expense", color: "#b2bec3", icon: "ellipsis" },
    { name: "Зарплата", kind: "income", color: "#00b894", icon: "banknote" },
    { name: "Бонус", kind: "income", color: "#fdcb6e", icon: "gift" },
    { name: "Кэшбэк", kind: "income", color: "#74b9ff", icon: "refresh" },
    { name: "Инвестиции", kind: "income", color: "#6c5ce7", icon: "investments" },
    { name: "Подарок", kind: "income", color: "#ff9f7f", icon: "gift" },
    { name: "Прочий доход", kind: "income", color: "#b2bec3", icon: "plus" },
    { name: "Перевод", kind: "transfer", color: "#94a3b8", icon: "transfer" }
  ],
  tags: ["налог", "кабинет", "семья", "здоровье", "подписки"]
};

/* Этап 29: seed appliedTxs — все paid/non-transfer операции из mock уже
   отражены в balance счетов. recalcBalances при первом вызове вычтет эти
   дельты из суммы всех tx → баланс не изменится (идемпотентность). */
(function seedApplied() {
  const byName = {};
  window.DB.accounts.forEach((a) => { byName[a.name] = a; });
  window.DB.transactions.forEach((t) => {
    if (!t || t.status === "pending" || t.type === "transfer") return;
    if (typeof t.amount !== "number" || !byName[t.account]) return;
    window.DB.appliedTxs[String(t.id)] = { [t.account]: t.amount };
  });
})();

/* Эталонная копия mock-данных для мгновенного сброса демо (Store.reset). */
window.__DB_DEFAULT__ = JSON.parse(JSON.stringify(window.DB));
