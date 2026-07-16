/* content/capstone.js — final challenge combining all three chapters + graduation. */
window.DBT = window.DBT || {};
DBT.content = DBT.content || { chapters: [], specialBadges: [] };

DBT.content.capstone = {
  badge: { id: "graduate", name: "dbt Graduate", icon: "grad", hint: "Complete the capstone" },
};

DBT.content.mountCapstone = function (root, ctx) {
  const ui = DBT.ui, icon = ui.icon, state = DBT.state;

  const STEPS = [
    {
      key: "gov", label: "Govern", color: "#FF694A", icon: "shield",
      title: "Step 1 · Make it a public API",
      lead: "You're promoting <code>fct_orders</code> to <code>public</code> so other teams can build on it. Satisfy the governance audit: add an <strong>enforced contract</strong> and finish the <strong>documentation</strong>.",
      spec: {
        type: "sandbox-governance", mode: "audit",
        goal: "Make the audit clean — <code>fct_orders</code> must stay <code>public</code>, gain an enforced contract, and have a description on the model <em>and</em> every column.",
        starter: "models:\n  - name: stg_orders\n    config: {group: core, access: protected}\n\n  - name: fct_orders\n    description: One row per order, with total amount.\n    config:\n      group: core\n      access: public\n      # 👇 add: contract: {enforced: true}\n    columns:\n      - {name: order_id, data_type: int, description: Primary key}\n      - {name: amount_cents, data_type: int}   # 👈 needs a description\n    refs: [stg_orders]\n",
        requires: [
          { label: "<code>fct_orders</code> stays <code>public</code>", test: (r) => r.byName.fct_orders && r.byName.fct_orders.access === "public" },
          { label: "It has an <strong>enforced contract</strong>", test: (r) => r.byName.fct_orders && r.byName.fct_orders.contract === true },
        ],
      },
    },
    {
      key: "test", label: "Test", color: "#34C77B", icon: "beaker",
      title: "Step 2 · Guard it with a test",
      lead: "A public model needs guardrails. Write a test that catches the <strong>negative payment</strong> feeding this pipeline — return the one bad row.",
      spec: {
        type: "sandbox-testing", expect: "find", findCount: 1, mustContain: ["payments", "amount_cents"],
        goal: "Return every <code>payments</code> row with a negative <code>amount_cents</code>. Exactly one row is broken.",
        starter: "-- a public model deserves a not_negative guard\nselect payment_id, amount_cents\nfrom payments\nwhere /* your condition */ ;",
      },
    },
    {
      key: "cicd", label: "Ship", color: "#5AA9E6", icon: "gitBranch",
      title: "Step 3 · Ship it through Slim CI",
      lead: "Your change touches <code>fct_orders</code>. Configure the CI run to rebuild exactly its blast radius and defer the rest to prod.",
      spec: {
        type: "sandbox-dag",
        goal: "The PR modifies <code>fct_orders</code> (a leaf mart). Mark it modified, enable <code>--defer</code>, and check.",
        startModified: [], startDefer: false,
        target: { modified: ["fct_orders"], defer: true },
        successTitle: "Shipped the right way",
        successMsg: "fct_orders is a leaf — only it rebuilds, everything else defers to prod. Contract + tests + Slim CI: that's a production-grade model.",
      },
    },
  ];

  let step = 0;

  function render() {
    root.innerHTML = `
      <div class="chapter-hero reveal" style="--ch-color:#FFC24B">
        <div class="station-badge">${icon("grad")}</div>
        <div style="flex:1">
          <div class="station-num">CAPSTONE · combines all three chapters</div>
          <h1>Ship a public model the right way</h1>
          <p class="dim">Three steps, one model. Govern it, test it, and ship it through Slim CI — exactly what a senior analytics engineer does before promoting a model to <code>public</code>.</p>
        </div>
      </div>
      <div class="stepper reveal">${STEPS.map((s, i) => stepPill(s, i)).join("")}</div>
      <div class="reading" style="margin:22px 0 14px;max-width:none">
        <h2 style="color:var(--ch-color)">${STEPS[step].title}</h2>
        <p>${STEPS[step].lead}</p>
      </div>
      <div id="cap-mount"></div>`;
    ui.$$("[data-nav]", root).forEach((el) => el.addEventListener("click", (e) => { e.preventDefault(); ctx.navigate(el.getAttribute("data-nav")); }));
    if (window.Prism) Prism.highlightAllUnder(root);

    const s = STEPS[step];
    DBT.sandbox[sandboxKey(s.spec.type)].mount(document.getElementById("cap-mount"), s.spec, {
      done: false, boss: step === STEPS.length - 1,
      advance: next, onSolved: next,
    });
    window.scrollTo({ top: 0 });
  }

  function stepPill(s, i) {
    const done = i < step;
    const cur = i === step;
    return `<div class="cap-step ${done ? "done" : cur ? "cur" : ""}" style="--ch-color:${s.color}">
      <span class="cap-step-ico">${done ? icon("check") : icon(s.icon)}</span>
      <div><span class="cap-step-n">STEP ${i + 1}</span><br><strong>${s.label}</strong></div>
    </div>`;
  }

  function sandboxKey(type) { return type === "sandbox-governance" ? "governance" : type === "sandbox-testing" ? "testing" : "cicd"; }

  function next() {
    if (step < STEPS.length - 1) { step++; render(); }
    else graduate();
  }

  function graduate() {
    state.markStage("capstone", "final", "capstone");
    if (ctx.afterGraduate) ctx.afterGraduate();
    ui.modal({
      dismissable: false,
      medal: `<div class="badge-medal earned" style="width:88px;height:88px;margin:0 auto">${icon("grad")}</div>`,
      title: "🎓 You graduated!",
      html: `<p>You just governed, tested, and shipped a public model end-to-end. That's the full loop a trustworthy dbt project runs on.</p>
        <div class="chip pass" style="margin-top:14px">${icon("award")} Badge earned: dbt Graduate</div>`,
      actions: [{ label: "Back to the map", primary: true, onClick: () => ctx.navigate("#/") }],
    });
    ui.burst();
  }

  render();
};
