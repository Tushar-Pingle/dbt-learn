/* sandbox/testing.js — real SQLite (sql.js) test runner. "0 rows returned = pass".
   DBT.sandbox.testing.mount(container, spec, opts) */
window.DBT = window.DBT || {};
DBT.sandbox = DBT.sandbox || {};

DBT.sandbox.testing = (function () {
  const ui = DBT.ui, icon = ui.icon, esc = ui.esc;

  const SEED = `
CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, email TEXT);
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT, status TEXT);
CREATE TABLE payments (payment_id INTEGER PRIMARY KEY, order_id INTEGER, payment_method TEXT, amount_cents INTEGER);

INSERT INTO customers VALUES
 (1,'Alice','Adams','alice@example.com'),
 (2,'Bob','Baker','bob@example.com'),
 (3,'Carol','Chen','carol@example.com');

INSERT INTO orders VALUES
 (101, 1, '2026-07-01', 'completed'),
 (102, 2, '2026-07-02', 'shipped'),
 (103, 2, '2026-07-03', 'placed'),
 (104, 99,'2026-07-04', 'returned'),   -- customer_id 99 has no customer row (orphan FK)
 (105, 3, '2026-07-05', 'refunded');   -- 'refunded' is not an accepted status

INSERT INTO payments VALUES
 (1001, 101, 'credit_card',   2500),
 (1002, 102, 'bank_transfer', 1800),
 (1003, 103, 'coupon',        -500),   -- negative amount
 (1004, 999, 'gift_card',      900);   -- order_id 999 has no order row (orphan FK)
`;

  let SQLModule = null;
  let loadErr = null;
  function ensureSQL() {
    if (SQLModule) return Promise.resolve(SQLModule);
    if (typeof initSqlJs !== "function") { loadErr = "sql.js failed to load."; return Promise.reject(new Error(loadErr)); }
    return initSqlJs({ locateFile: (f) => "./vendor/" + f }).then((SQL) => { SQLModule = SQL; return SQL; });
  }
  function freshDB(SQL) { const db = new SQL.Database(); db.run(SEED); return db; }

  function runQuery(sql) {
    return ensureSQL().then((SQL) => {
      const db = freshDB(SQL);
      try {
        const results = db.exec(sql);
        // take the last result set that has columns (the final SELECT)
        let last = null;
        for (const r of results) if (r && r.columns && r.columns.length) last = r;
        const cols = last ? last.columns : [];
        const rows = last ? last.values : [];
        return { cols, rows, count: rows.length, ran: true };
      } finally { db.close(); }
    });
  }

  function mount(container, spec, opts) {
    opts = opts || {};
    const expect = spec.expect || "zero"; // 'zero' | 'find' | 'free'
    container.innerHTML = `
    <div class="sandbox">
      <div class="sb-head">
        <h3>${icon("beaker")} SQL test sandbox</h3>
        <div class="sb-tools">
          <button class="btn btn-ghost btn-sm" data-schema>${icon("database")} Schema</button>
          <button class="btn btn-ghost btn-sm" data-reset>${icon("refresh")} Reset</button>
          <button class="btn btn-primary btn-sm" data-run>${icon("play")} Run test</button>
        </div>
      </div>
      <div class="sb-goal">${icon("target")}<div><b>Goal:</b> ${spec.goal}</div></div>
      ${spec.templates ? `<div class="sb-goal" style="background:transparent"><div style="width:100%"><div class="mono" style="font-size:.72rem;color:var(--text-faint);text-transform:uppercase;letter-spacing:.1em;margin-bottom:7px">Starter tests — click to load</div><div class="tpl-row" id="tpl-row">${spec.templates.map((t, i) => `<button class="tpl-btn" data-tpl="${i}">${esc(t.label)}</button>`).join("")}</div></div></div>` : ""}
      <div class="sb-body">
        <div class="sb-pane">
          <div class="sb-pane-head">${icon("code")} test query <span class="flex"><span class="mono" style="color:var(--text-faint);text-transform:none;letter-spacing:0">0 rows = pass</span></span></div>
          <div id="sql-ed"></div>
        </div>
        <div class="sb-pane">
          <div class="sb-pane-head">${icon("listChecks")} result</div>
          <div class="sb-result" id="sql-out"><div class="sb-empty">Write a query that returns the <strong>failing</strong> rows, then press <strong>Run test</strong>.<br>A passing dbt test returns zero rows.</div></div>
        </div>
      </div>
    </div>`;

    const ed = ui.makeEditor(container.querySelector("#sql-ed"), { value: spec.starter || "select 1;", label: "test SQL" });
    const out = container.querySelector("#sql-out");
    let solved = false;

    function setBusy(b) { const btn = container.querySelector("[data-run]"); btn.disabled = b; btn.innerHTML = b ? `${icon("refresh")} Running…` : `${icon("play")} Run test`; }

    function run() {
      const sql = ed.value.trim();
      if (!sql) return;
      setBusy(true);
      runQuery(sql).then((res) => {
        setBusy(false);
        render(sql, res);
      }).catch((e) => {
        setBusy(false);
        out.innerHTML = verdict("err", "octagon", "Query error", esc(String(e.message || e).replace(/^Error:\s*/, "")).split("\n")[0]) +
          `<div class="result-note">Check your SQL. Tip: the tables are <code>customers</code>, <code>orders</code>, <code>payments</code>.</div>`;
      });
    }

    function render(sql, res) {
      const n = res.count;
      const mustOk = !spec.mustContain || spec.mustContain.every((s) => sql.toLowerCase().indexOf(s.toLowerCase()) >= 0);
      let v, success = false, isBadDisplay = false;

      if (expect === "find") {
        const target = spec.findCount;
        const matches = (target == null || n === target) && mustOk && n > 0;
        if (matches) { v = verdict("pass", "check", `Caught ${n} failing row${n !== 1 ? "s" : ""} — the test works`, "Your test surfaces exactly the bad data. In dbt this test would <strong>fail the build</strong> until the data is fixed — which is the point."); success = true; isBadDisplay = true; }
        else if (!mustOk) v = verdict("warn", "alert", "Close — but query the right thing", "Make sure your query actually reads the table this test is about.");
        else if (n === 0) v = verdict("warn", "alert", "0 rows — nothing caught", "This exercise expects your test to <em>find</em> the planted bad rows. Loosen your condition.");
        else v = verdict("warn", "alert", `Returned ${n} rows — expected ${target}`, "Adjust the condition so it catches exactly the defective rows.");
        isBadDisplay = n > 0;
      } else { // 'zero' or 'free'
        if (n === 0) { v = verdict("pass", "check", "0 rows returned — test passes ✓", mustOk ? "That assertion holds on the seeded data, exactly like a green dbt test." : "It passed, but double-check you're testing the intended column/table."); success = mustOk; }
        else { v = verdict("fail", "x", `${n} failing row${n !== 1 ? "s" : ""} — test fails`, "These rows violate the assertion. In dbt, a data test that returns rows fails the run. Fix the test or the data."); isBadDisplay = true; }
      }

      out.innerHTML = v + resultTable(res, isBadDisplay);
      if (success && !solved) { solved = true; showContinue(); ui.toast({ kind: "badge", title: "Test cleared", msg: spec.short || "Nice" }); }
    }

    function showContinue() {
      const bar = document.createElement("div");
      bar.className = "q-actions"; bar.style.marginTop = "16px";
      bar.innerHTML = `<button class="btn btn-primary btn-lg" data-fin>${opts.boss ? "Claim victory" : "Complete practice"} ${icon("arrowRight")}</button>`;
      out.appendChild(bar);
      bar.querySelector("[data-fin]").addEventListener("click", () => { (opts.done ? opts.advance : opts.onSolved)(); });
    }

    container.querySelector("[data-run]").addEventListener("click", run);
    container.querySelector("[data-reset]").addEventListener("click", () => { ed.reset(spec.starter || "select 1;"); out.innerHTML = `<div class="sb-empty">Editor reset. Press <strong>Run test</strong>.</div>`; });
    container.querySelector("[data-schema]").addEventListener("click", showSchema);
    if (spec.templates) ui.$$("[data-tpl]", container).forEach((b) => b.addEventListener("click", () => { ed.value = spec.templates[+b.getAttribute("data-tpl")].sql; ed.focus(); }));
    if (spec.autorun) run();
  }

  function showSchema() {
    ui.modal({
      title: "Sandbox schema",
      html: `<div style="text-align:left">
        <p class="dim" style="margin-bottom:10px">Three jaffle-shop tables are pre-loaded. A few rows are deliberately broken so your tests have something to catch.</p>
        ${ui.codeblock({ code: SEED.trim(), lang: "sql", file: "seed.sql" })}
      </div>`,
      actions: [{ label: "Got it", primary: true }],
    });
  }

  function resultTable(res, badRows) {
    if (!res.cols.length && res.count === 0) return `<div class="result-note">${icon("check")} Query ran and returned <strong>0 rows</strong>.</div>`;
    const cap = 60;
    const rows = res.rows.slice(0, cap);
    const head = `<tr>${res.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
    const body = rows.map((r) => `<tr class="${badRows ? "bad-row" : ""}">${r.map((c) => `<td>${c === null ? '<span class="dim">null</span>' : esc(String(c))}</td>`).join("")}</tr>`).join("");
    return `<div class="result-note">${res.count} row${res.count !== 1 ? "s" : ""} returned${res.count > cap ? ` (showing ${cap})` : ""}</div>
      <div class="rtable-wrap"><table class="rtable"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  }

  function verdict(kind, ic, title, sub) {
    return `<div class="verdict ${kind}"><div class="v-ico">${icon(ic)}</div><div><h4>${title}</h4><p>${sub}</p></div></div>`;
  }

  return { mount, runQuery, SEED };
})();
