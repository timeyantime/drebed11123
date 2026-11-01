from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={"width":1280,"height":900})
    pg.goto("http://localhost:8090/index.html#/dashboards"); pg.wait_for_timeout(1500)
    pg.screenshot(path="docs/shot-dashboards.png", full_page=False)
    pg.evaluate("location.hash='#/planned'"); pg.wait_for_timeout(1200)
    pg.screenshot(path="docs/shot-planned.png")
    b.close()
print("shots ok")
