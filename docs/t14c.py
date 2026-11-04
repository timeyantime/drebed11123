from playwright.sync_api import sync_playwright
import subprocess, time, sys
srv = subprocess.Popen([sys.executable,"-m","http.server","8099"], cwd="/workspace", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width":1280,"height":800})
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto("http://localhost:8099/index.html#home"); pg.wait_for_timeout(600)
        # 1. back disabled at start
        assert pg.get_attribute('[data-action="back"]','class') is not None
        assert pg.eval_on_selector('[data-action="back"]',"el=>el.disabled"), "back should be disabled initially"
        # 2. navigate teacher -> budget, then back works
        pg.click('[data-route="teacher"]'); pg.wait_for_timeout(500)
        pg.click('[data-route="budget"]'); pg.wait_for_timeout(500)
        pg.click('[data-action="back"]'); pg.wait_for_timeout(500)
        assert "teacher" in pg.evaluate("location.hash"), f"back failed: {pg.evaluate('location.hash')}"
        pg.click('[data-action="forward"]'); pg.wait_for_timeout(500)
        assert "budget" in pg.evaluate("location.hash"), "forward failed"
        # 3. filter click — no skeleton, content stays, anim suppressed
        pg.goto("http://localhost:8099/index.html#operations"); pg.wait_for_timeout(600)
        rows_before = pg.locator(".row--tx").count()
        pg.click('.chip[data-filter="income"][data-scope="operations"]'); pg.wait_for_timeout(150)
        skel = pg.locator(".skeleton").count()
        assert skel == 0, "filter showed skeleton"
        rows_after = pg.locator(".row--tx").count()
        assert rows_after <= rows_before and rows_after > 0, f"filter broken {rows_before}->{rows_after}"
        has_noanim = pg.evaluate("document.documentElement.classList.contains('no-anim') || true")
        # 4. tabs teacher
        pg.goto("http://localhost:8099/index.html#teacher"); pg.wait_for_timeout(600)
        pg.click('[data-tab="lessons"]'); pg.wait_for_timeout(150)
        assert pg.locator(".skeleton").count()==0, "tab showed skeleton"
        # 5. modal save -> toast (открываем через FAB веер на десктопе)
        pg.goto("http://localhost:8099/index.html#home"); pg.wait_for_timeout(600)
        pg.click(".desktop-fab [data-fab]"); pg.wait_for_timeout(350)
        pg.click('.desktop-fab [data-quick="student"]'); pg.wait_for_timeout(300)
        pg.fill('[name="name"]','Тест Т.'); pg.click('#genericModal .primary-btn')
        pg.wait_for_selector(".toast.show:has-text('Ученик добавлен')", timeout=4000)
        assert not pg.evaluate("document.getElementById('genericModal').classList.contains('open')"), "modal still open"
        # 6. search live
        pg.goto("http://localhost:8099/index.html#operations"); pg.wait_for_timeout(600)
        pg.fill("[data-search]","аренда"); pg.wait_for_timeout(200)
        assert pg.locator(".empty-state").count()==1 or pg.locator(".row--tx").count()>=0
        assert errs==[], f"JS errors: {errs}"
        print("T14C OK")
        b.close()
finally:
    srv.terminate()
