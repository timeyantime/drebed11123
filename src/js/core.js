/* ============================================================
   MONO — ЯДРО (u = shared utils, доступно всем модулям window.Views)
   ============================================================ */
(function () {
  "use strict";

  const ic = {
    briefcase: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>`,
    "arrow-up": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`,
    "arrow-down": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`,
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>`,
    teacher: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><path d="M17 7v6"/><path d="M14 10h6"/></svg>`,
    budget: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1.4"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
    sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
    moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    help: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4"/><path d="M12 17h.01"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/></svg>`,
    userPlus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="8" r="3"/><path d="M4 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><path d="M18 8v6"/><path d="M15 11h6"/></svg>`,
    card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></svg>`,
    upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/><path d="M9 15h2"/><path d="M14 15h1"/></svg>`,
    book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h7v15H4z"/><path d="M13 5h7v15h-7z"/></svg>`,
    back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`,
    forward: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    inbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13h4l2 3h4l2-3h4"/><path d="M5 6h14l2 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"/></svg>`,
    // --- новые иконки модулей (Этап 2) ---
    operations: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h13"/><path d="m14 4 3 3-3 3"/><path d="M20 17H7"/><path d="m10 14-3 3 3 3"/></svg>`,
    accounts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M3 12h18"/><path d="M7 4h10"/><path d="M12 4v4"/></svg>`,
    payments: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    taxes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6"/><path d="M9 12h6"/></svg>`,
    investments: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16"/><path d="m5 15 4-5 4 3 5-7"/><path d="M15 6h3v3"/></svg>`,
    goals: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/></svg>`,
    phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/></svg>`,
    tablet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="3" width="15" height="18" rx="2.5"/><path d="M11 18h2"/></svg>`,
    monitor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6"/><path d="M12 16v4"/></svg>`,
    dashboards: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>`,
    chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
    wallet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="16.5" cy="13" r="1.2"/></svg>`,
    // --- категории из референса «Домкнига» (Этап 27) ---
    cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M3 4h2l2.4 11h11.2L21 7H6"/></svg>`,
    car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l1.6-4.6A2 2 0 0 1 8.5 6h7a2 2 0 0 1 1.9 1.4L19 12"/><rect x="4" y="12" width="16" height="5" rx="2"/><circle cx="8" cy="17.5" r="1.3"/><circle cx="16" cy="17.5" r="1.3"/></svg>`,
    zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14-4L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14 4l2-2"/><path d="M20 20v-5h-5"/></svg>`,
    pill: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5-7-7a3.5 3.5 0 0 1 5-5l7 7a3.5 3.5 0 0 1-5 5z"/><path d="m8 12 4-4"/></svg>`,
    gamepad: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="9" rx="4"/><path d="M8 11v3"/><path d="M6.5 12.5h3"/><circle cx="16" cy="12" r="1"/><circle cx="18" cy="14" r="1"/></svg>`,
    bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`,
    ellipsis: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>`,
    banknote: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.4"/><path d="M6 10v4"/><path d="M18 10v4"/></svg>`,
    gift: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9"/><path d="M12 8v13"/><path d="M12 8C10 4 6 4 6 6.5S9 8 12 8s6-1.5 6-4-4-2-6 4"/></svg>`,
    transfer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13"/><path d="m14 5 3 3-3 3"/><path d="M20 16H7"/><path d="m10 13-3 3 3 3"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6 7l1 13h10l1-13"/></svg>`,
    pencil: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
    // --- иконки тостов (Этап 6) ---
    "toast-success": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>`,
    "toast-error": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/></svg>`,
    "toast-info": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/></svg>`,
    "toast-undo": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>`
  };

  const moneyFormatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  });

  function money(value) {
    const abs = moneyFormatter.format(Math.abs(value));
    return value < 0 ? `− ${abs}` : abs;
  }

  function pct(part, total) {
    if (!total) return "0%";
    return Math.round((part / total) * 100) + "%";
  }

  function fillIcons(scope) {
    (scope || document).querySelectorAll("[data-icon]").forEach((el) => {
      const name = el.dataset.icon;
      el.innerHTML = ic[name] || "";
    });
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function chartColor(i) {
    return `var(--chart-${(i % 8) + 1})`;
  }

  /* Этап 27: метаданные категории (цвет, иконка, тип) из справочника */
  function catMeta(name) {
    const list = (window.DB && window.DB.categories) || [];
    return list.find((c) => c.name === name) || { name, kind: "expense", color: "var(--chart-6)", icon: "ellipsis" };
  }

  /* SVG donut по массиву [{label, value}] */
  function donutSVG(data, opts = {}) {
    const total = data.reduce((s, d) => s + Math.abs(d.value), 0);
    const R = 42, C = 2 * Math.PI * R;
    let offset = 0, segs = "";
    data.forEach((d, i) => {
      const v = Math.abs(d.value);
      if (!total || !v) return;
      const frac = v / total;
      /* Этап 23: data-атрибуты для наведения — сегмент подсвечивает строку
         легенды и наоборот (как в референсе «Домкнига» D1) */
      segs += `<circle class="seg" data-seg="${i}" data-label="${esc(d.label)}" data-value="${esc(money(v))}"
        r="${R}" cx="50" cy="50" stroke="${d.color || chartColor(i)}"
        stroke-dasharray="${(frac * C - 1.5).toFixed(2)} ${(C - frac * C + 1.5).toFixed(2)}"
        stroke-dashoffset="${(-offset * C).toFixed(2)}"/>`;
      offset += frac;
    });
    const center = opts.centerText
      ? `<text x="50" y="49" text-anchor="middle" class="donut-center">${esc(opts.centerText)}</text>
         <text x="50" y="59" text-anchor="middle" class="donut-caption">${esc(opts.caption || "")}</text>`
      : "";
    return `<svg class="donut" viewBox="0 0 100 100" role="img" aria-label="${esc(opts.aria || "Диаграмма")}"
      data-center="${esc(opts.centerText || "")}" data-caption="${esc(opts.caption || "")}">${segs}${center}</svg>`;
  }

  /* Легенда donut (Этап 28 — референс D1): иконки категорий из справочника,
     «+N ещё» для длинных списков (клик разворачивает остальные строки). */
  function legendHTML(data, opts = {}) {
    const total = data.reduce((s, d) => s + Math.abs(d.value), 0);
    const max = opts.maxVisible || 0;
    const iconOf = (d, i) => {
      if (!d.icon) return "";
      return `<span class="legend-ic" style="--c:${d.color || chartColor(i)}" data-icon="${d.icon}"></span>`;
    };
    const row = (d, i) => `
      <div class="legend-item${max && i >= max ? " legend-hidden" : ""}" data-legend="${i}">
        ${d.icon ? iconOf(d, i) : `<span class="cat-dot" style="--c:${d.color || chartColor(i)}"></span>`}
        <span class="name">${esc(d.label)}</span>
        <span class="val">${opts.raw ? esc(d.text || money(d.value)) : money(d.value)}</span>
        <span class="pct">${pct(Math.abs(d.value), total)}</span>
      </div>`;
    const rows = data.map(row).join("");
    const more = max && data.length > max
      ? `<button type="button" class="legend-more" data-action="legend-more">+${data.length - max} ещё ↓</button>`
      : "";
    return `<div class="legend">${rows}${more}</div>`;
  }

  /* Столбчатая диаграмма «доходы/расходы по месяцам» (Этап 23).
     Референс: «Домкнига» TrendBarCard — сетка, выбранный месяц,
     цифры выбранного месяца под графиком, переключение по клику. */
  function trendBars(months, opts = {}) {
    if (!months || !months.length) return `<div class="muted">Нет данных</div>`;
    const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
    const sel = months.length - 1;
    const val = (i, key) => money(months[i][key]);
    const net = (i) => months[i].income - months[i].expense;
    return `<div class="trend" data-trend>
      <div class="trend-plot">
        <span class="trend-grid" style="bottom:66%"></span>
        <span class="trend-grid" style="bottom:33%"></span>
        <div class="trend-cols">
          ${months.map((m, i) => {
            const tip = `${m.m} · Доходы ${money(m.income)} · Расходы ${money(m.expense)}`;
            return `<button type="button" class="trend-col${i === sel ? " is-sel" : ""}" data-trend-col="${i}"
              data-income="${money(m.income)}" data-expense="${money(m.expense)}" data-net="${money(net(i))}" data-net-neg="${net(i) < 0 ? 1 : 0}"
              aria-pressed="${i === sel}" aria-label="${esc(tip)}">
              <span class="trend-pair">
                <i class="trend-bar in" style="height:${Math.round((m.income / max) * 100)}%"></i>
                <i class="trend-bar ex" style="height:${Math.round((m.expense / max) * 100)}%"></i>
              </span>
              <span class="trend-label">${m.m}</span>
            </button>`;
          }).join("")}
        </div>
      </div>
      <div class="trend-summary">
        <div class="trend-sum"><span>Доход</span><b class="t-income" data-trend-income>${val(sel, "income")}</b><i class="trend-under in"></i></div>
        <div class="trend-sum"><span>Расход</span><b class="t-expense" data-trend-expense>${val(sel, "expense")}</b><i class="trend-under ex"></i></div>
        <div class="trend-sum"><span>Итог</span><b class="${net(sel) < 0 ? "t-expense" : "t-income"}" data-trend-net data-net-neg="${net(sel) < 0 ? 1 : 0}">${money(net(sel))}</b></div>
      </div>
      <div class="trend-legend">
        <span><i class="swatch in"></i>Доходы</span>
        <span><i class="swatch ex"></i>Расходы</span>
        <span class="trend-hint">${esc(opts.hint || "")}</span>
      </div>
    </div>`;
  }

  /* Кольцевой прогресс (цели) — Этап 11. ratio 0..1 */
  function ringSVG(ratio, label, size = 72) {
    const r = 30, c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(1, ratio));
    const kind = clamped >= 1 ? "" : clamped > 0.5 ? "" : "warn";
    return `<svg class="ring ${kind}" viewBox="0 0 72 72" width="${size}" height="${size}" role="img" aria-label="${esc(label || "")}">
      <circle class="ring-bg" cx="36" cy="36" r="${r}"></circle>
      <circle class="ring-fg" cx="36" cy="36" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - clamped)).toFixed(1)}"></circle>
      <text x="36" y="40" text-anchor="middle" class="donut-center">${Math.round(clamped * 100)}%</text>
    </svg>`;
  }

  window.u = {
    ic, money, pct, fillIcons, esc, chartColor, donutSVG, legendHTML, ringSVG, trendBars, catMeta,
    moneyFormatter
  };
})();


