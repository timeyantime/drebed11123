"""Этап 29: идемпотентность recalcBalances + переводы + сброс стора."""
import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context()).new_page()
        errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("http://localhost:8090/index.html")
        await pg.wait_for_timeout(1500)

        # 1. Идемпотентность: баланс после load == после первого save-пересчёта
        r = await pg.evaluate("""() => {
          const before = window.DB.accounts.map(a => a.balance);
          window.u.recalcBalances(window.DB);
          const after = window.DB.accounts.map(a => a.balance);
          return {before, after};
        }""")
        print("IDEMPOTENT CLEAN:", r["before"] == r["after"], r)

        # 2. Перевод: из карты на накопический
        r2 = await pg.evaluate("""() => {
          const db = window.DB;
          const bal0 = db.accounts.map(a => a.balance);
          db.transactions.unshift({id: 9999, date: "03.11.2026", time: "10:00",
            title: "Тест перевод", amount: 5000, type: "transfer", category: "Перевод",
            status: "paid", account: "Карта Т-Банк", toAccount: "Накопительный счёт"});
          window.u.recalcBalances(db);
          const bal1 = db.accounts.map(a => a.balance);
          const total0 = bal0.reduce((s,x)=>s+x,0), total1 = bal1.reduce((s,x)=>s+x,0);
          // удаление перевода -> возврат
          db.transactions = db.transactions.filter(t => t.id !== 9999);
          window.u.recalcBalances(db);
          const bal2 = db.accounts.map(a => a.balance);
          return {total0, total1, restored: JSON.stringify(bal2) === JSON.stringify(bal0)};
        }""")
        print("TRANSFER NEUTRAL:", r2["total0"] == r2["total1"], "| RESTORED AFTER DELETE:", r2["restored"])

        # 3. Pending не двигает деньги
        r3 = await pg.evaluate("""() => {
          const db = window.DB;
          const bal0 = db.accounts.map(a=>a.balance).join();
          db.transactions.unshift({id:9998, date:"03.11.2026", time:"10:00", title:"pend",
            amount: -1000, type:"expense", category:"Прочее", status:"pending", account:"Карта Т-Банк"});
          window.u.recalcBalances(db);
          const bal1 = db.accounts.map(a=>a.balance).join();
          db.transactions = db.transactions.filter(t=>t.id!==9998);
          window.u.recalcBalances(db);
          return bal0 === bal1;
        }""")
        print("PENDING NO MOVE:", r3)

        # 4. Сброс стора даёт deep-копию (эталон не мутируется)
        r4 = await pg.evaluate("""() => {
          window.DB.accounts[0].balance = 1;
          const defBal = window.__DB_DEFAULT__.accounts[0].balance;
          window.Store.reset();
          return {defUntouched: defBal === 71200, resetBalance: window.DB.accounts[0].balance,
                  notAlias: window.DB !== window.__DB_DEFAULT__};
        }""")
        print("RESET DEEP COPY:", r4)

        # 5. UI: фильтр «Переводы» существует
        await pg.evaluate('() => location.hash = "#/operations"')
        await pg.wait_for_timeout(600)
        chips = await pg.locator('[data-scope="operations"]').all_inner_texts()
        print("FILTER CHIPS:", chips)
        print("CONSOLE ERRORS:", errs if errs else "none")
        await b.close()

asyncio.run(main())
