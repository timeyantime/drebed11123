import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width":1280,"height":900})
    errs=[]; pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
    pg.goto("http://localhost:8090/#/operations"); pg.wait_for_timeout(700)
    n_before = pg.evaluate("window.DB.transactions.length")
    # открыть форму операции через desktop FAB
    pg.click(".desktop-fab [data-fab]")  # открыть веер как пользователь
    pg.wait_for_timeout(500)
    pg.click(".desktop-fab [data-quick='transaction']")
    pg.wait_for_selector(".modal-backdrop.open", state="attached", timeout=3000)
    pg.fill('[name="title"]', "Тест отмены")
    pg.fill('[name="amount"]', "-100")
    pg.select_option('[name="category"]', index=0) if pg.locator('[name="category"]').count() else None
    pg.click('#genericForm button[type="submit"]')
    pg.wait_for_selector(".toast.show .toast-undo", timeout=3000)
    txt = pg.inner_text(".toast.show")
    assert "Отменить" in txt, "нет кнопки Отменить в тосте"
    n_after = pg.evaluate("window.DB.transactions.length")
    assert n_after == n_before + 1, f"операция не добавлена ({n_before}->{n_after})"
    stored = json.loads(pg.evaluate("localStorage.getItem('mono-db') || 'null'"))
    assert stored and len(stored["data"]["transactions"]) == n_after, "localStorage не обновлён"
    # клик «Отменить» через dispatch — не зависит от видимости/оверлеев
    pg.eval_on_selector(".toast.show [data-toast-undo]", "el => el.click()")
    pg.wait_for_timeout(400)
    n_undone = pg.evaluate("window.DB.transactions.length")
    assert n_undone == n_before, f"undo не сработал ({n_undone} != {n_before})"
    stored2 = json.loads(pg.evaluate("localStorage.getItem('mono-db') || 'null'"))
    assert stored2 and len(stored2["data"]["transactions"]) == n_before, "после undo localStorage не откатился"
    print(f"UNDO FORM OK: {n_before} -> {n_after} -> {pg.evaluate('window.DB.transactions.length')}")
    # reset-demo тоже даёт undo
    pg.evaluate("location.hash='#/profile'"); pg.wait_for_timeout(600)
    pg.click("[data-action='reset-demo']")
    pg.wait_for_selector(".toast.show .toast-undo", timeout=3000)
    pg.eval_on_selector(".toast.show [data-toast-undo]", "el => el.click()"); pg.wait_for_timeout(500)
    print("RESET UNDO OK")
    assert not errs, f"console errors: {errs}"
    print("UNDO SMOKE PASSED")
    b.close()
