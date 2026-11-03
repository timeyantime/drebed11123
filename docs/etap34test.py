"""Этап 34: чекбоксы строки, bulk-панель, полноширинная таблица."""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8090/index.html"
errors = []

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 1000})
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE + "#/operations")
    pg.evaluate("localStorage.setItem('mono-preview','desktop')")
    pg.reload()
    pg.wait_for_selector(".ops-table")

    # 1. чекбокс «выбрать все» -> все строки выбраны, bulk-bar виден
    pg.click("[data-action='ops-check-all']")
    pg.wait_for_timeout(250)
    n_rows = pg.locator(".ops-table tbody tr").count()
    n_checked = pg.locator(".ops-table tbody [data-action='ops-check-row']:checked").count()
    print("ROWS:", n_rows, "| CHECKED:", n_checked)
    assert n_checked == n_rows and n_rows > 0, "check-all failed"
    assert pg.locator(".bulk-bar").is_visible(), "bulk bar missing"
    assert "Выбрано" in pg.locator(".bulk-count").inner_text()

    # 2. клик по чекбоксу НЕ открывает панель деталей
    pg.click("[data-action='ops-check-all']")  # снять всё
    pg.wait_for_timeout(200)
    assert pg.locator(".bulk-bar").count() == 0, "bulk bar stayed after uncheck"
    first_id = pg.locator("[data-action='ops-check-row']").first.get_attribute("data-id")
    pg.locator(f"[data-action='ops-check-row'][data-id='{first_id}']").click()
    pg.wait_for_timeout(250)
    assert pg.locator(".tx-detail").count() == 0, "checkbox click opened details panel"
    assert pg.locator(".row--tx.is-selected").count() == 0, "checkbox click selected row"
    assert pg.locator(".bulk-bar").count() == 1, "bulk bar missing after single check"

    # 3. индетерминированное состояние шапки при частичном выделении
    indet = pg.eval_on_selector("[data-action='ops-check-all']", "e => e.indeterminate")
    print("HEADER INDETERMINATE:", indet)
    assert indet is True, "header checkbox not indeterminate"

    # 4. удаление выбранной (confirm -> OK), счётчик транзакций уменьшается
    total_before = pg.evaluate("window.DB.transactions.length")
    bal_before = pg.evaluate("JSON.stringify(window.DB.accounts.map(a => a.balance))")
    pg.click('[data-action="ops-del-selected"]')
    pg.wait_for_timeout(250)
    assert pg.locator(".modal--confirm").count() == 1, "confirm modal missing"
    pg.click("#confirmOkBtn")
    pg.wait_for_timeout(400)
    total_after = pg.evaluate("window.DB.transactions.length")
    print("TX BEFORE:", total_before, "AFTER:", total_after)
    assert total_after == total_before - 1, "bulk delete removed wrong count"
    assert pg.locator(".bulk-bar").count() == 0, "bulk bar stayed after delete"
    # Этап 34 fix: appliedTxs чистится при удалении → баланс не «прыгает»
    bal_after = pg.evaluate("JSON.stringify(window.DB.accounts.map(a => a.balance))")
    print("BALANCES UNCHANGED AFTER DELETE:", bal_before == bal_after)
    assert bal_before == bal_after, "balances changed after bulk delete (appliedTxs leak)"

    # 5. undo возвращает удалённую операцию
    pg.wait_for_selector(".toast.show .toast-undo", timeout=3000)
    pg.eval_on_selector(".toast.show [data-toast-undo]", "el => el.click()")
    pg.wait_for_timeout(400)
    total_undo = pg.evaluate("window.DB.transactions.length")
    print("TX AFTER UNDO:", total_undo)
    assert total_undo == total_before, "undo did not restore"

    # 6. полноширинная таблица на десктопе (data-frame=off): content-inner без 1320px
    mw = pg.eval_on_selector(".content-inner", "e => getComputedStyle(e).maxWidth")
    w = pg.evaluate("document.querySelector('.content-inner').getBoundingClientRect().width")
    print("CONTENT max-width:", mw, "| actual width:", round(w))
    assert mw == "none", "wide mode not applied on desktop operations route"
    assert w > 1400, f"table window too narrow: {w}"

    # 7. имена заголовков над своими колонками (нет colspan-съезда)
    heads = pg.eval_on_selector_all(
        ".ops-table thead th",
        "els => els.map(e => ({cls: e.className, x: Math.round(e.getBoundingClientRect().x)}))",
    )
    by_cls = {}
    for h in heads:
        key = (h["cls"] or "").split()[0] if h["cls"] else ""
        by_cls[key] = h
    print("HEADS:", [(h["cls"], h["x"]) for h in heads])
    op_head = by_cls.get("c-op")
    assert op_head, "no c-op header found"
    op_cell = pg.locator(".ops-table tbody tr td.c-op").bounding_box()
    assert abs(op_head["x"] - op_cell["x"]) < 4, "header 'Операция' offset from its column"

    # 8. в tablet-режиме ограничение 1320px остаётся
    pg.evaluate("localStorage.setItem('mono-preview','tablet')")
    pg.reload()
    pg.wait_for_selector(".ops-table")
    mw2 = pg.eval_on_selector(".content-inner", "e => getComputedStyle(e).maxWidth")
    print("TABLET CONTENT max-width:", mw2)
    assert mw2 == "1320px", "1320 cap lost outside wide desktop mode"

    b.close()

real = [e for e in errors if "favicon" not in e and "manifest" not in e]
print("CONSOLE ERRORS:", real or "none")
assert not real, "console errors present"
print("ETAP34 TEST OK")
