"""Этап 32: сортировка по клику в заголовке, панель деталей, sticky-шапка."""
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

    # 1. клик по «Сумма» — сортировка по убыванию модуля
    first_title = pg.locator(".ops-table tbody tr .op-name").first.inner_text()
    pg.click('.th-sort[data-col="amount"]')
    pg.wait_for_timeout(250)
    sums = pg.eval_on_selector_all("tbody .c-sum", "els => els.slice(0,4).map(e => e.textContent)")
    print("AFTER AMOUNT SORT:", sums[:3])
    assert pg.locator("th.is-sorted .th-sort[data-col='amount']").count() == 1, "no active col highlight"
    # обратный порядок
    pg.click('.th-sort[data-col="amount"]')
    pg.wait_for_timeout(250)
    sums_asc = pg.eval_on_selector_all("tbody .c-sum", "els => els.slice(0,1).map(e => e.textContent)")
    print("ASC FIRST:", sums_asc)
    assert sums[0] != sums_asc[0], "dir toggle did nothing"

    # 2. клик по строке -> панель деталей
    pg.click('.th-sort[data-col="date"]')  # вернём дату
    pg.wait_for_timeout(200)
    row = pg.locator(".ops-table tbody tr").first
    title = row.locator(".op-name").inner_text()
    row.locator(".c-op").click()  # Этап 34: клик именно по ячейке (не чекбоксу)
    pg.wait_for_timeout(250)
    det = pg.locator(".tx-detail").is_visible()
    det_title = pg.locator(".tx-detail-title").inner_text()
    print("DETAIL VISIBLE:", det, "| TITLE MATCH:", det_title == title)
    assert det and det_title == title
    assert pg.locator(".row--tx.is-selected").count() == 1

    # 3. клик по кнопке внутри строки НЕ выделяет/не сбрасывает выделение
    edit_before = pg.locator(".row--tx.is-selected").count()
    pg.locator(".ops-table tbody tr").nth(1).locator(".row-btn").first.click()
    pg.wait_for_timeout(300)
    modal_open = pg.locator("#genericForm.open, .modal.open, form.open").count() > 0 or pg.locator("[id*=form][class*=open]").count() > 0
    sel_after = pg.locator(".row--tx.is-selected").count()
    print("EDIT MODAL OPENED:", modal_open, "| SELECTION KEPT:", sel_after == edit_before)
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(200)

    # 4. закрытие панели (крестик)
    pg.click('[data-action="ops-deselect"]')
    pg.wait_for_timeout(200)
    print("PANEL CLOSED:", pg.locator(".tx-detail").count() == 0)

    # 5. sticky thead
    pos = pg.eval_on_selector(".ops-table th", "e => getComputedStyle(e).position")
    print("THEAD POSITION:", pos)
    assert pos == "sticky"

    # 6. Enter на строке (доступность)
    pg.locator(".ops-table tbody tr").first.focus()
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(250)
    print("ENTER SELECTS ROW:", pg.locator(".tx-detail").count() == 1)

    pg.screenshot(path="docs/shot-etap32-desktop.png", full_page=False)
    b.close()

print("CONSOLE ERRORS:", errors if errors else "none")
assert not errors, errors
print("ETAP32 TEST OK")
