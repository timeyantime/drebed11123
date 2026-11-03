/* ============================================================
   MONO — STORE (Этап 5A: персистентность)
   Обёртка над localStorage для window.DB. Схема версионируется:
   при несовпадении версии хранилище сбрасывается на mock-дефолты.
   Позже (этап бэкенда) Store.save/load заменяются на fetch API,
   интерфейс для вьюх остаётся тем же.
   ============================================================ */
(function () {
  "use strict";

  const KEY = "mono-db";

  /* ЭТАП 26: версия схемы 3 — появились справочники categories/tags.
     Снимки v2 не сбрасываем: недостающие справочники добираем из mock. */
  const VERSION = 3;

  function withDefaults(data) {
    if (!data || typeof data !== "object") return data;
    if (!Array.isArray(data.categories)) {
      data.categories = JSON.parse(JSON.stringify((window.DB && window.DB.categories) || []));
    }
    if (!Array.isArray(data.tags)) {
      data.tags = ((window.DB && window.DB.tags) || []).slice();
    }
    /* Этап 28: у старых снимков нет поля time — добираем из mock по id,
       иначе колонка «Время» осталась бы пустой до первой новой операции. */
    if (Array.isArray(data.transactions)) {
      const defaults = ((window.DB && window.DB.transactions) || []);
      data.transactions.forEach((t) => {
        if (t && t.time === undefined) {
          const src = defaults.find((x) => x.id === t.id);
          t.time = src ? src.time : "";
        }
      });
    }
    /* Этап 29: старым снимкам не хватает mask/openingBalance — добираем из
       mock-дефолтов по id/name. Без openingBalance recalcBalances отсчитывал
       бы баланс от текущего (уже изменённого) значения и удваивал дельты. */
    if (Array.isArray(data.accounts)) {
      const defAcc = ((window.__DB_DEFAULT__ && window.__DB_DEFAULT__.accounts) || (window.DB && window.DB.accounts) || []);
      data.accounts.forEach((a) => {
        if (!a) return;
        const src = defAcc.find((x) => x.id === a.id || x.name === a.name);
        if (a.mask === undefined) a.mask = src ? (src.mask || "") : "";
        if (a.openingBalance == null) a.openingBalance = Number(a.balance) || (src ? src.balance : 0) || 0;
      });
    }
    return data;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data && parsed.__v >= 2) return withDefaults(parsed.data);
    } catch (_) {}
    return null;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ __v: VERSION, data: window.DB }));
    } catch (_) {}
  }

  function reset() {
    try {
      localStorage.removeItem(KEY);
      /* Этап 29: обязательно deep-копия! Раньше window.DB = __DB_DEFAULT__
       делал DB алиасом эталона — mutateForm/редактирования портили сам
       эталон, и второй сброс показывал «изменённые дефолты». */
      if (window.__DB_DEFAULT__) {
        window.DB = structuredClone(window.__DB_DEFAULT__);
      }
    } catch (_) {}
  }

  /* ---------- Этап 22: экспорт/импорт JSON ---------- */
  function dump() {
    return {
      app: "mono",
      __v: VERSION,
      exportedAt: new Date().toISOString(),
      data: window.DB
    };
  }

  function importData(obj) {
    if (!obj || typeof obj !== "object") {
      return { ok: false, error: "Файл не похож на резервную копию Mono" };
    }
    const data = obj.data && typeof obj.data === "object" ? obj.data : obj;
    const required = ["students", "transactions", "accounts", "lessons", "goals"];
    const missing = required.filter((k) => !Array.isArray(data[k]));
    if (missing.length) {
      return { ok: false, error: "В файле нет разделов: " + missing.join(", ") };
    }
    window.DB = withDefaults(data);
    save();
    return { ok: true };
  }

  /* Инициализация: если в хранилище есть данные — подменяем mock.
     Вызывается ДО app.js (см. порядок <script> в index.html). */
  const saved = load();
  if (saved) window.DB = saved;

  window.Store = { load, save, reset, dump, importData, KEY, VERSION };
})();
