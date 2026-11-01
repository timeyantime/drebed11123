from playwright.sync_api import sync_playwright

routes = ["home","teacher","budget","operations","accounts","planned","taxes","investments","goals","dashboards"]
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width":1280,"height":900})
    pg.on("console", lambda m: errors.append(m.text) if m.type=="error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto("http://localhost:8090/index.html")
    pg.wait_for_timeout(700)
    # home content
    assert "Быстрые действия" in pg.inner_text("#page-body") or pg.locator(".quick-card").count()>0, "no quick cards"
    print("home kpi:", pg.locator(".kpi").count(), "hub tiles:", pg.locator(".hub-tile").count())
    for r in routes:
        pg.evaluate(f"location.hash='#{r}'")
        pg.wait_for_timeout(500)
        n = pg.evaluate("document.querySelectorAll('#page-body *').length")
        title = pg.inner_text("#page-title")
        print(f"{r}: nodes={n} title={title}")
        assert n > 20, f"{r} empty"
    # interactions: tab switch + filter + sort on teacher
    pg.evaluate("location.hash='#teacher'"); pg.wait_for_timeout(500)
    pg.click("[data-tab='lessons']"); pg.wait_for_timeout(100)
    assert "Занятия" in pg.inner_text("#page-body")
    pg.click("[data-filter='upcoming']"); pg.wait_for_timeout(100)
    pg.click("[data-sort='teacher']"); pg.wait_for_timeout(100)
    # FAB fan + form submit (десктопный веер: мобильный fab-wrap скрыт, берём видимый элемент)
    pg.click(".desktop-fab [data-fab]"); pg.wait_for_timeout(300)
    assert pg.locator(".desktop-fab.open .fan-item").count()==4
    pg.click(".desktop-fab [data-quick='transaction']"); pg.wait_for_timeout(200)
    pg.fill("#gf-title", "Тест оплата")
    pg.fill("#gf-amount", "1000")
    pg.click("#genericForm button[type=submit]"); pg.wait_for_timeout(200)
    # проверка мутации — на странице «Операции» (ученик-деталь/список занятий не показывают транзакции)
    pg.evaluate("location.hash='#operations'"); pg.wait_for_timeout(700)
    assert "Тест оплата" in pg.inner_text("#page-body"), "form mutation failed"
    print("form+fan OK")
    # theme toggle
    before = pg.evaluate("document.documentElement.dataset.theme")
    pg.click("[data-action='theme']"); pg.wait_for_timeout(100)
    after = pg.evaluate("document.documentElement.dataset.theme")
    print("theme", before, "->", after)
    # light theme render check on budget
    pg.evaluate("location.hash='#budget'"); pg.wait_for_timeout(600)
    assert pg.locator(".progress").count()>0
    # mobile viewport
    pm = b.new_page(viewport={"width":390,"height":844}, is_mobile=True)
    pm.on("pageerror", lambda e: errors.append(str(e)))
    pm.goto("http://localhost:8090/index.html")
    pm.wait_for_timeout(700)
    print("mobile bottom tabs:", pm.locator(".tab").count(), "rail visible:", pm.is_visible("#toolbar"))
    pm.screenshot(path="docs/shot-mobile-home.png")
    pg.screenshot(path="docs/shot-desktop-budget-light.png")
    b.close()
print("CONSOLE ERRORS:", errors if errors else "none")
assert not errors, f"console/page errors: {errors}"
print("SMOKE OK")


# --- Этап 6: undo через формы (отдельный скрипт, тот же сервер) ---
import subprocess, sys
r = subprocess.run([sys.executable, "docs/undotest.py"], capture_output=True, text=True)
print(r.stdout[-400:])
if r.returncode != 0:
    print(r.stderr[-800:]); raise SystemExit("UNDO TEST FAILED")
print("UNDO TEST OK")
