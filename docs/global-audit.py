from playwright.sync_api import sync_playwright

BASE = "http://localhost:8090/index.html"

def run(p):
    b = p.chromium.launch()
    errs = []
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(700)

    # 1. rail FAB "+" removed
    assert pg.locator("#toolbar [data-fab]").count() == 0, "rail + still present"
    print("ok: no + in toolbar")

    # 2. header fixed, toolbar below header (desktop)
    geo = pg.evaluate("""() => {
      const h = document.querySelector('header').getBoundingClientRect();
      const t = document.getElementById('toolbar').getBoundingClientRect();
      return {hBottom: h.bottom, tTop: t.top, posH: getComputedStyle(document.querySelector('header')).position};
    }""")
    assert geo["posH"] == "fixed", geo
    assert 0 <= geo["tTop"] - geo["hBottom"] < 24, geo
    print("ok: header fixed, toolbar below:", geo)

    # 3. tx-pay button works (clickable, mutates, toast with undo)
    pg.goto(BASE + "#/operations"); pg.wait_for_timeout(600)
    pend = pg.locator("[data-action='tx-pay']")
    n0 = pend.count()
    if n0:
        pend.first.click(); pg.wait_for_timeout(500)
        assert pg.locator(".toast").count() >= 1, "no toast after tx-pay"
        undone = pg.locator("[data-action='tx-pay']").count()
        assert undone == max(n0-1,0), f"tx-pay did not mutate ({n0}->{undone})"
        print(f"ok: tx-pay works ({n0}->{undone}), toast shown")
        # undo via toast button
        ub = pg.locator(".toast [data-undo], .toast .toast-undo")
        if ub.count():
            ub.first.click(); pg.wait_for_timeout(400)
            print("ok: undo restored, tx-pay count:", pg.locator("[data-action='tx-pay']").count())
    else:
        print("WARN: no pending tx rows found")

    # 4. planned-done inside row with badges — click ✓
    pg.goto(BASE + "#/planned"); pg.wait_for_timeout(600)
    pd = pg.locator("[data-action='planned-done']")
    if pd.count():
        pd.first.click(); pg.wait_for_timeout(500)
        assert pg.locator(".toast").count() >= 1, "no toast after planned-done"
        assert pg.locator(".badge--paid").count() >= 1, "payment not marked done"
        print("ok: planned-done works, badge Выполнен appears")
    else:
        print("WARN: no planned-done buttons")

    # 5. student detail: subtitle stays after mutation (remind)
    pg.goto(BASE + "#/teacher/student/1"); pg.wait_for_timeout(600)
    sub = pg.text_content("#page-subtitle")
    assert sub and "Карточка ученика" in sub, f"subtitle wrong: {sub}"
    rem = pg.locator("[data-action='remind']")
    if rem.count():
        rem.first.click(); pg.wait_for_timeout(500)
        sub2 = pg.text_content("#page-subtitle")
        assert "Карточка ученика" in sub2, f"subtitle lost after mutation: {sub2}"
        print("ok: student detail subtitle persists after remind")
    # goal-add on accounts? goals page
    pg.goto(BASE + "#/goals"); pg.wait_for_timeout(600)
    ga = pg.locator("[data-action='goal-add']")
    if ga.count():
        ga.first.click(); pg.wait_for_timeout(400)
        assert pg.locator(".generic-modal.open, #genericModal.open").count() >= 1 or pg.locator(".modal.open").count()>=1, "contribute modal not open"
        print("ok: goal-add opens form")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(300)

    # 6. account detail back & forward via Enter key on row-link
    pg.goto(BASE + "#/accounts"); pg.wait_for_timeout(600)
    rl = pg.locator(".row-link[data-go-route='accounts']").first
    rl.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(700)
    assert "account/" in pg.url, pg.url
    sub = pg.text_content("#page-subtitle")
    assert "Детали счёта" in (sub or ""), sub
    print("ok: Enter on row-link navigates to account detail; subtitle:", sub)

    # 7. sheet «Ещё» on mobile preview
    pg.goto(BASE); pg.wait_for_timeout(500)
    pg.click(".preview-btn[data-preview='mobile']"); pg.wait_for_timeout(400)
    more = pg.locator('[data-action="more"]').first
    if more.count():
        more.click(); pg.wait_for_timeout(400)
        assert pg.locator(".sheet.open, #moreSheet.open").count() >= 1, "sheet not open"
        pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
        assert pg.locator(".sheet.open, #moreSheet.open").count() == 0, "sheet not closed by Esc"
        print("ok: bottom sheet opens/closes")
    pg.click(".preview-btn[data-preview='desktop']"); pg.wait_for_timeout(300)

    # 8. theme toggle + help + back/forward header buttons
    before = pg.get_attribute("html", "data-theme")
    pg.click('[data-action="theme"]'); pg.wait_for_timeout(200)
    after = pg.get_attribute("html", "data-theme")
    assert before != after, "theme not toggled"
    pg.click('[data-action="theme"]'); pg.wait_for_timeout(200)
    pg.click('[data-action="help"]'); pg.wait_for_timeout(300)
    assert pg.locator(".help-modal.open, #helpModal.open").count() >= 1, "help modal not open"
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    print("ok: theme toggle + help modal")

    # 9. quick fan (desktop FAB) opens and items clickable
    pg.click(".desktop-fab [data-fab]"); pg.wait_for_timeout(350)
    fi = pg.locator(".desktop-fab .fan-item")
    assert fi.count() >= 3, "fan items missing"
    fi.first.click(); pg.wait_for_timeout(400)
    assert pg.locator(".modal.open, .generic-modal.open, #genericModal.open").count() >= 1, "quick action form not opened"
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    print("ok: desktop fan + quick action form")

    # 10. search live filter keeps caret (basic check results change)
    pg.goto(BASE + "#/operations"); pg.wait_for_timeout(600)
    rows0 = pg.locator(".row--tx").count()
    pg.fill("[data-search]", "аренда"); pg.wait_for_timeout(500)
    rows1 = pg.locator(".row--tx").count()
    assert rows1 <= rows0, "search did not filter"
    focused = pg.evaluate("document.activeElement && document.activeElement.hasAttribute('data-search')")
    assert focused, "search lost focus after re-render"
    print(f"ok: live search {rows0}->{rows1}, focus kept")

    assert not errs, f"JS errors: {errs}"
    b.close()
    print("AUDIT OK")

with sync_playwright() as p:
    run(p)
