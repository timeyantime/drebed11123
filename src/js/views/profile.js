/* ============================================================
   MONO — VIEW: ПРОФИЛЬ (Этап 5E)
   Настройки демо-приложения: тема, размер шрифта, сброс данных.
   ============================================================ */
window.Views = window.Views || {};

(function () {
  Views.profile = function (ctx) {
    const root = document.documentElement;
    const theme = root.dataset.theme === "light" ? "light" : "dark";
    const fs = root.dataset.fontsize || "m";
    const students = ctx.DB.students.length;
    const txCount = ctx.DB.transactions.length;

    page(`
      <section class="panel">
        <div class="panel-head"><h2>Внешний вид</h2></div>
        <div class="setting-row">
          <div class="row-main">
            <div class="row-title">Тема оформления</div>
            <div class="row-meta">Сейчас: ${theme === "light" ? "светлая" : "тёмная"}</div>
          </div>
          <button class="secondary-btn" data-action="theme">${theme === "light" ? "Тёмная" : "Светлая"}</button>
        </div>
        <div class="setting-row">
          <div class="row-main">
            <div class="row-title">Размер шрифта</div>
            <div class="row-meta">Крупный текст удобнее на телефоне</div>
          </div>
          <div class="segmented" role="group" aria-label="Размер шрифта">
            <button class="seg-btn ${fs === "s" ? "is-active" : ""}" data-fontsize="s">A−</button>
            <button class="seg-btn ${fs === "m" ? "is-active" : ""}" data-fontsize="m">A</button>
            <button class="seg-btn ${fs === "l" ? "is-active" : ""}" data-fontsize="l">A+</button>
          </div>
        </div>
      </section>

      <section class="panel" style="margin-top:16px">
        <div class="panel-head"><h2>Данные</h2><span class="note">хранятся локально (localStorage)</span></div>
        <div class="setting-row">
          <div class="row-main">
            <div class="row-title">Учеников: ${students}</div>
            <div class="row-meta">Операций: ${txCount} • Счетов: ${ctx.DB.accounts.length} • Целей: ${ctx.DB.goals.length}</div>
          </div>
          <button class="secondary-btn danger" data-action="reset-demo">Сбросить демо</button>
        </div>
        <p class="row-meta" style="padding:8px 0 2px">Изменения (новые ученики, операции, взносы в цели) сохраняются в браузере. «Сбросить демо» вернёт исходные данные.</p>
      </section>

      <section class="panel" style="margin-top:16px">
        <div class="panel-head"><h2>О приложении</h2></div>
        <p class="row-meta" style="padding:4px 0">Mono — помощник репетитора: ученики, занятия, бюджет, налоги и цели в одном месте. Прототип v0.5 (демо-данные).</p>
      </section>
    `);
  };
})();
