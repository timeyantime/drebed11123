"""Этап 14b: planned v2 (группы+чипы), dashboards v2 (сегмент периода, net-линия, db-twin), stagger."""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8090/index.html"
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={"width":1280,"height":900})
    errs=[]; pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
    pg.goto(BASE); pg.wait_for_timeout(700)

    # ---- planned v2 ----
    pg.evaluate("location.hash='#/planned'"); pg.wait_for_timeout(700)
    groups = pg.locator(".pl-group").count()
    chips = pg.locator(".due-chip").count()
    overdue_rows = pg.locator(".pl-overdue").count()
    assert groups >= 2, f"planned groups={groups}"
    assert chips >= 3, f"due chips={chips}"
    assert overdue_rows >= 1, "нет строки с просрочкой"
    print(f"planned v2 OK: groups={groups} chips={chips} overdue={overdue_rows}")

    # кнопка ✓ переводит в «Выполнено»
    before = pg.locator(".pl-group").count()
    pg.click(".mini-btn[data-action='planned-done']"); pg.wait_for_timeout(600)
    done_badge = pg.locator(".badge--paid").count()
    assert done_badge >= 1, "после ✓ нет бейджа Выполнен"
    toast = pg.locator(".toast").first.inner_text()
    assert "Отменить" in toast or "отменить" in toast.lower(), f"нет undo в тосте: {toast}"
    print("planned pay + undo toast OK")

    # ---- dashboards v2 ----
    pg.evaluate("location.hash='#/dashboards'"); pg.wait_for_timeout(700)
    assert pg.locator("[data-dash-period]").count() == 2, "нет сегмента периода"
    assert pg.locator(".db-net-line polyline").count() == 1, "нет net-линии"
    assert pg.locator(".db-twin-bar").count() >= 6, "нет twin-баров по месяцам"
    kpis = pg.locator(".kpi").count(); assert kpis >= 4, f"kpi={kpis}"
    bars6 = pg.locator(".bar-col").count()
    pg.click("[data-dash-period='3']"); pg.wait_for_timeout(600)
    bars3 = pg.locator(".bar-col").count()
    assert bars6 == 6 and bars3 == 3, f"period switch {bars6}->{bars3}"
    assert pg.locator(".delta").count() == 1, "нет дельты"
    donut_segs = pg.locator(".donut circle.seg").count(); assert donut_segs >= 3
    print(f"dashboards v2 OK: period {bars6}->{bars3}, segs={donut_segs}")

    # ---- stagger на home ----
    pg.evaluate("location.hash='#/home'"); pg.wait_for_timeout(500)
    anim = pg.eval_on_selector("#page-body > .kpi-grid", "el => getComputedStyle(el).animationName")
    delay = pg.eval_on_selector("#page-body > *:nth-child(2)", "el => getComputedStyle(el).animationDelay")
    assert anim == "fadeUp", f"stagger animation={anim}"
    print(f"stagger fadeUp+delay({delay}) OK")

    assert not errs, f"console errors: {errs}"
    print("ETAP14B TEST OK")
    b.close()
