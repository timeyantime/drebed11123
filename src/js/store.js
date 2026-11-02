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

  /* ЭТАП 16: версия схемы 2 — с 14b/15 в planned появились account/_prevStatus/done,
     в taxes — расширения (paid/due/nextDate/declarations), у accounts — history.
     Старые v1-снимки несовместимы → сбрасываются на свежие mock-дефолты. */
  const VERSION = 2;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.__v === VERSION && parsed.data) return parsed.data;
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
      // мгновенный возврат к mock-дефолтам без перезагрузки (см. mock.js: window.__DB_DEFAULT__)
      if (window.__DB_DEFAULT__) window.DB = window.__DB_DEFAULT__;
    } catch (_) {}
  }

  /* Инициализация: если в хранилище есть данные — подменяем mock.
     Вызывается ДО app.js (см. порядок <script> в index.html). */
  const saved = load();
  if (saved) window.DB = saved;

  window.Store = { load, save, reset, KEY, VERSION };
})();
