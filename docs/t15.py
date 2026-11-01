from playwright.sync_api import sync_playwright
BASE="http://localhost:8099/index.html"
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
    pg.goto(BASE+"#/investments"); pg.wait_for_timeout(600)
    assert pg.locator(".pf-line").count()==1, "no portfolio line chart"
    assert pg.locator(".inv-row").count()==4, "positions rows != 4"
    assert pg.locator(".inv-share span").count()==4, "share bars missing"
    # налоги v2
    pg.goto(BASE+"#/taxes"); pg.wait_for_timeout(600)
    assert pg.locator(".tax-save-card").count()==1, "no tax save card"
    assert pg.locator(".decl-chip").count()>=2, "declaration chips missing"
    # уплата декларации -> тост + badge
    btn = pg.locator("[data-action='tax-decl-pay']").first
    if btn.count():
        btn.click(); pg.wait_for_timeout(300)
        pg.wait_for_selector(".toast.show:has-text('Уплачено')", timeout=5000)
        assert pg.locator(".badge--paid").count()>=1
    else:
        print("note: no pending declarations in current state (ok if paid)")
    # отложить остаток если есть
    pay = pg.locator("[data-action='tax-pay']")
    if pay.count():
        pay.first.click(); pg.wait_for_timeout(300)
        pg.wait_for_selector(".toast.show:has-text('Отложено')", timeout=5000)
    # undo
    u = pg.locator(".toast .toast-undo").last
    if u.count(): u.click(); pg.wait_for_timeout(400)
    assert not [e for e in errs if 'favicon' not in e], f"console errors: {errs}"
    print("ETAP15 TEST OK"); b.close()

# --- Этап 15: тост кликабелен в режиме рамки (regression) ---
from playwright.sync_api import sync_playwright
BASE2 = "http://localhost:8099/index.html"
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1280, "height": 800}); errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(BASE2 + "#/operations"); pg.wait_for_timeout(600)
    # включаем превью mobile + рамку
    pg.click(".preview-btn[data-preview='mobile']"); pg.wait_for_timeout(300)
    ft = pg.locator("#frameToggle")
    if ft.count():
        try: ft.check(timeout=2000)
        except Exception: pg.evaluate("document.getElementById('frameToggle').click()")
        pg.wait_for_timeout(400)
    assert pg.evaluate("document.body.classList.contains('framed')"), "frame not active"
    btn = pg.locator("[data-action='tx-pay']").first
    btn.scroll_into_view_if_needed(); btn.click(force=True); pg.wait_for_timeout(500)
    pg.wait_for_selector(".toast.show .toast-undo", timeout=5000)
    # тост должен быть ребёнком body и кликабельным
    assert pg.evaluate("document.getElementById('toast').parentElement === document.body"), "toast inside frame!"
    n_before = pg.evaluate("window.__t15n || 0")
    pg.locator(".toast .toast-undo").last.click(timeout=5000)
    pg.wait_for_timeout(500)
    print("frame toast undo OK")
    assert not [e for e in errs if 'favicon' not in e], f"console errors: {errs}"
    b.close()
print("ETAP15 FRAME TOAST OK")
