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
            <div class="row-title">Экспорт данных</div>
            <div class="row-meta">Скачать JSON: ученики, операции, счета, платежи, цели</div>
          </div>
          <button class="secondary-btn" data-action="export-data">Скачать</button>
        </div>
        <div class="setting-row">
          <div class="row-main">
            <div class="row-title">Импорт данных</div>
            <div class="row-meta">Заменить текущие данные резервной копией</div>
          </div>
          <button class="secondary-btn" data-action="import-data">Загрузить</button>
        </div>
        <div class="setting-row">
          <div class="row-main">
            <div class="row-title">Учеников: ${students}</div>
            <div class="row-meta">Операций: ${txCount} • Счетов: ${ctx.DB.accounts.length} • Целей: ${ctx.DB.goals.length}</div>
          </div>
          <button class="secondary-btn danger" data-action="reset-demo">Сбросить демо</button>
        </div>
        <p class="row-meta" style="padding:8px 0 2px">Изменения сохраняются в браузере. Экспорт/импорт переносит данные между устройствами, «Сбросить демо» вернёт исходные.</p>
      </section>

      <section class="panel" style="margin-top:16px">
        <div class="panel-head"><h2>Категории и теги</h2><span class="note">для операций</span></div>
        <h3 class="dict-title">Категории</h3>
        <div class="dict-list">
          ${(ctx.DB.categories || []).map((c) => `
            <span class="dict-chip">
              <i class="cat-dot" style="--c:${c.color || "var(--muted)"}"></i>${u.esc(c.name)}
              <button type="button" class="dict-del" data-del-category="${u.esc(c.name)}" aria-label="Удалить категорию ${u.esc(c.name)}">×</button>
            </span>`).join("")}
        </div>
        <form class="dict-form" data-add-category>
          <input name="name" placeholder="Новая категория" maxlength="24" aria-label="Новая категория" />
          <button class="secondary-btn" type="submit">Добавить</button>
        </form>

        <h3 class="dict-title">Теги</h3>
        <div class="dict-list">
          ${(ctx.DB.tags || []).map((t) => `
            <span class="dict-chip tag">${u.esc(t)}
              <button type="button" class="dict-del" data-del-tag="${u.esc(t)}" aria-label="Удалить тег ${u.esc(t)}">×</button>
            </span>`).join("")}
        </div>
        <form class="dict-form" data-add-tag>
          <input name="name" placeholder="Новый тег" maxlength="20" aria-label="Новый тег" />
          <button class="secondary-btn" type="submit">Добавить</button>
        </form>
        <p class="row-meta" style="padding:8px 0 2px">Категории — в форме операции и фильтрах, теги — в форме и в таблице операций. Категорию с операциями удалить нельзя.</p>
      </section>

      <section class="panel" style="margin-top:16px">
        <div class="panel-head"><h2>О приложении</h2></div>
        <p class="row-meta" style="padding:4px 0">Mono — помощник репетитора: ученики, занятия, бюджет, налоги и цели в одном месте. Прототип v0.5 (демо-данные).</p>
      </section>
    `);
  };
})();
