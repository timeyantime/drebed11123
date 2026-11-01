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
  const VERSION = 1;

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
    try { localStorage.removeItem(KEY); } catch (_) {}
  }

  /* Инициализация: если в хранилище есть данные — подменяем mock.
     Вызывается ДО app.js (см. порядок <script> в index.html). */
  const saved = load();
  if (saved) window.DB = saved;

  window.Store = { load, save, reset, KEY, VERSION };
})();
